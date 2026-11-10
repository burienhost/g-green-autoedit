"""G-Green AutoEdit local-first photo worker (JPEG/PNG/TIFF). No AI/cloud."""
from __future__ import annotations
import argparse
import json
import logging
import os
import sqlite3
import time
from pathlib import Path

import cv2
import numpy as np

EXTENSIONS = {".jpg", ".jpeg", ".png", ".tif", ".tiff"}
LOG = logging.getLogger("autoedit")


def analyze(bgr: np.ndarray) -> dict:
    sample = cv2.resize(bgr, (min(512, bgr.shape[1]), min(512, bgr.shape[0])))
    gray = cv2.cvtColor(sample, cv2.COLOR_BGR2GRAY)
    return {
        "mean_luminance": round(float(gray.mean()), 2),
        "shadow_fraction": round(float(np.mean(gray < 65)), 4),
        "highlight_fraction": round(float(np.mean(gray > 240)), 4),
        "sharpness_laplacian": round(float(cv2.Laplacian(gray, cv2.CV_64F).var()), 2),
    }


def edit(bgr: np.ndarray) -> np.ndarray:
    """Conservative, non-AI luminance recovery with protected blacks/highlights.

    Uses a smoothed local illumination estimate rather than global RGB offsets.
    This is a baseline, NOT a validated face-aware photographic correction.
    """
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    luminance = l.astype(np.float32) / 255.0

    # Large-scale illumination estimate allows different regions to be corrected.
    # Use a downsampled estimate to bound RAM usage on an 8 GB machine.
    height, width = l.shape
    factor = min(1.0, 640.0 / max(height, width))
    small = cv2.resize(luminance, (max(1, round(width * factor)),
                                    max(1, round(height * factor))),
                       interpolation=cv2.INTER_AREA)
    illumination = cv2.GaussianBlur(small, (0, 0), 22)
    illumination = cv2.resize(illumination, (width, height),
                              interpolation=cv2.INTER_LINEAR)

    # Exposure diagnosis uses robust percentiles, not just mean brightness.
    p10, p50, p90 = np.percentile(small, [10, 50, 90])
    darkness = np.clip((0.43 - p50) / 0.35, 0.0, 1.0)
    # Local lift prioritises dark regions, while retaining naturally dark blacks.
    local_dark = np.clip((0.53 - illumination) / 0.53, 0.0, 1.0)
    shadow_band = np.clip((luminance - 0.045) / 0.19, 0.0, 1.0)
    shadow_band *= np.clip((0.83 - luminance) / 0.36, 0.0, 1.0)
    lift = (0.055 + 0.14 * darkness) * local_dark * shadow_band
    corrected = luminance + lift

    # Restrained midtone gamma, scaled down for already bright frames.
    gamma = 1.0 - 0.16 * darkness
    corrected = np.power(np.clip(corrected, 0.0, 1.0), gamma)

    # Preserve black point and white point; never add a global grey offset.
    black_anchor = np.clip((corrected - 0.025) / 0.975, 0.0, 1.0)
    corrected = corrected * 0.85 + black_anchor * 0.15

    # Highlight shoulder protects light clothing and bright skies.
    shoulder = np.clip((corrected - 0.76) / 0.24, 0.0, 1.0)
    corrected -= 0.025 * shoulder * shoulder * (3 - 2 * shoulder)
    corrected = np.clip(corrected, 0.0, 1.0)

    # Subtle luminance detail enhancement, attenuated in dark noisy regions.
    # Avoid sharpening low-light noise and producing halos.
    out_l = (corrected * 255.0).astype(np.float32)
    blurred = cv2.GaussianBlur(out_l, (0, 0), 1.1)
    detail = np.clip(out_l - blurred, -7.0, 7.0)
    detail_weight = np.clip((corrected - 0.15) / 0.30, 0.0, 1.0)
    out_l = np.clip(out_l + 0.28 * detail * detail_weight, 0, 255)
    return cv2.cvtColor(
        cv2.merge((out_l.astype(np.uint8), a, b)), cv2.COLOR_LAB2BGR
    )


def stable(path: Path, delay: float = 0.6) -> bool:
    try:
        first = path.stat()
        time.sleep(delay)
        second = path.stat()
        return first.st_size > 0 and first.st_size == second.st_size and first.st_mtime_ns == second.st_mtime_ns
    except OSError:
        return False


def process(src: Path, dst: Path) -> dict:
    raw = np.fromfile(str(src), dtype=np.uint8)
    original = cv2.imdecode(raw, cv2.IMREAD_COLOR)
    if original is None:
        raise ValueError("Unsupported or corrupt image")
    before = analyze(original)
    output = edit(original)
    after = analyze(output)
    if output.shape != original.shape:
        raise ValueError("Output dimensions changed")
    ext = src.suffix.lower()
    if ext in (".jpg", ".jpeg"):
        params = [cv2.IMWRITE_JPEG_QUALITY, 95]
    elif ext == ".png":
        params = [cv2.IMWRITE_PNG_COMPRESSION, 3]
    else:
        params = []
    ok, encoded = cv2.imencode(ext, output, params)
    if not ok:
        raise ValueError("Could not encode output")
    dst.parent.mkdir(parents=True, exist_ok=True)
    temp = dst.with_name(dst.stem + ".partial" + dst.suffix)
    try:
        encoded.tofile(str(temp))
        verify = cv2.imdecode(np.fromfile(str(temp), dtype=np.uint8), cv2.IMREAD_COLOR)
        if verify is None or verify.shape != original.shape:
            raise ValueError("Output integrity check failed")
        os.replace(temp, dst)
    finally:
        if temp.exists():
            temp.unlink()
    return {"before": before, "after": after, "width": original.shape[1], "height": original.shape[0]}


def main() -> None:
    parser = argparse.ArgumentParser(description="G-Green AutoEdit: local Pull to Push processor")
    parser.add_argument("--pull", type=Path, required=True)
    parser.add_argument("--push", type=Path, required=True)
    parser.add_argument("--watch", action="store_true", help="Keep checking for new photos")
    parser.add_argument("--interval", type=int, default=5)
    args = parser.parse_args()
    pull, push = args.pull.resolve(), args.push.resolve()
    if not pull.is_dir():
        parser.error("Pull folder does not exist")
    if pull == push or pull in push.parents or push in pull.parents:
        parser.error("Pull and Push folders must be separate, non-nested folders")
    push.mkdir(parents=True, exist_ok=True)
    db_path = push / ".autoedit-jobs.sqlite3"
    connection = sqlite3.connect(db_path)
    connection.execute("CREATE TABLE IF NOT EXISTS jobs (source TEXT PRIMARY KEY, signature TEXT, status TEXT, report TEXT, updated_at REAL)")
    connection.commit()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    try:
        while True:
            for src in sorted(pull.iterdir()):
                if not src.is_file() or src.suffix.lower() not in EXTENSIONS or not stable(src):
                    continue
                stat = src.stat()
                signature = f"{stat.st_size}:{stat.st_mtime_ns}"
                row = connection.execute("SELECT signature,status FROM jobs WHERE source=?", (str(src),)).fetchone()
                dst = push / src.name
                if row == (signature, "complete") and dst.is_file():
                    continue
                try:
                    report = process(src, dst)
                    status = "complete"
                    LOG.info("Edited %s -> %s", src.name, dst)
                except Exception as exc:
                    status = "failed"
                    report = {"error": str(exc)}
                    LOG.exception("Failed %s", src.name)
                connection.execute("INSERT OR REPLACE INTO jobs VALUES (?,?,?,?,?)",
                                   (str(src), signature, status, json.dumps(report), time.time()))
                connection.commit()
            if not args.watch:
                break
            time.sleep(max(1, args.interval))
    finally:
        connection.close()


if __name__ == "__main__":
    main()
