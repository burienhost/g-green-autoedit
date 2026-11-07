# G-Green AutoEdit Pro v2 — local engine prototype

This is a **development prototype**, not a verified 9/10 production editor. It is deliberately separate from the Afrihost-hosted browser UI. No paid cloud services, remote upload, or model downloads.

## Install on Windows

Install Python 3.11 or 3.12 (64-bit), then from a terminal in the repository:

```powershell
py -m venv .venv
.venv\Scripts\python -m pip install -r engine\requirements.txt
.venv\Scripts\python engine\autoedit.py --pull "E:\G-Green\PULL" --push "E:\G-Green\PUSH" --watch
```

Replace E: with your external HDD or local drive. Stop with Ctrl+C. Without --watch it processes one batch and exits.

## Integrated processing stages

1. **Subject detection**: offline OpenCV frontal-face detector; a conservative center fallback for backlit scenes. This does **not** detect all people, profiles, or full bodies reliably.
2. **Exposure**: scene-dependent shadow recovery, soft face masks and local illumination estimates.
3. **Tone**: luminance-only LAB correction, black anchoring and highlight preservation.
4. **Colour**: largely preserve original chroma; does **not yet** implement calibrated white balance or skin-tone mapping.
5. **Detail**: mild bilateral smoothing in low light and bounded sharpening.
6. **Scene recognition**: balanced / backlit / low-light / high-contrast heuristic.
7. **Quality assurance**: clipped highlights, crushed blacks, excessive adjustment and uncertain face detection flags.

## Output and safety

Originals remain in PULL; edits go to PUSH as full-dimension quality-94 JPEGs. Each result has a matching `.qa.json` report. The processing database is `PUSH/.autoedit/jobs.sqlite`. Re-running skips unchanged completed inputs. No photos are stored on Afrihost. Do not put PULL inside PUSH or vice versa.

## Known gaps before commercial release

No automated tests or real-photo benchmarks have been run yet. Full-resolution processing can consume substantial RAM on an 8 GB laptop. A crash during a file copy may still require a retry. Face detection may miss dark or side-facing people. JPEG cannot reconstruct clipped or lost sensor detail. RAW files are not supported. The browser UI does not yet control the local engine. Quality targets of 9–9.5/10 and 300-photo unattended operation are **unverified**. Run a five-photo trial and inspect each output before using this for paid jobs.
