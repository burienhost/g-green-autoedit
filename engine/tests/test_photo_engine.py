"""Synthetic regression checks; run with python -m unittest discover -s engine/tests."""
import sys
import unittest
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from autoedit import edit


class PhotoEngineTests(unittest.TestCase):
    def test_preserves_dimensions_and_type(self):
        img = np.full((480, 640, 3), 60, dtype=np.uint8)
        out = edit(img)
        self.assertEqual(out.shape, img.shape)
        self.assertEqual(out.dtype, np.uint8)

    def test_no_black_to_grey_haze(self):
        img = np.zeros((320, 480, 3), dtype=np.uint8)
        img[:, 240:] = 95
        out = edit(img)
        self.assertLess(float(out[:, :200].mean()), 12)

    def test_highlights_not_clipped_by_recovery(self):
        img = np.full((320, 480, 3), 45, dtype=np.uint8)
        img[:, 350:] = 235
        out = edit(img)
        self.assertLessEqual(int(out[:, 360:].max()), 250)

    def test_shadow_recovery_in_mixed_scene(self):
        img = np.full((320, 480, 3), 55, dtype=np.uint8)
        img[:, 350:] = 225
        out = edit(img)
        self.assertGreater(float(out[:, 60:300].mean()), float(img[:, 60:300].mean()))


if __name__ == "__main__":
    unittest.main()
