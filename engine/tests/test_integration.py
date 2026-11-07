import json
import sqlite3
import tempfile
import unittest
from pathlib import Path
import sys
import numpy as np
from PIL import Image
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from autoedit import analyse,correct,quality,run

class EngineIntegration(unittest.TestCase):
    def test_all_stages_and_pull_push(self):
        with tempfile.TemporaryDirectory() as root:
            pull=Path(root)/"PULL";push=Path(root)/"PUSH";pull.mkdir()
            h,w=240,360
            img=np.zeros((h,w,3),dtype=np.uint8)
            img[:]=[40,43,47]
            img[:,:80]=[210,210,207]
            img[60:180,150:220]=[90,64,52]
            Image.fromarray(img).save(pull/"job.jpg",quality=95)
            info=analyse(img)
            self.assertIn(info["scene"],("balanced","backlit","low_light","high_contrast"))
            edited,subject=correct(img,info)
            self.assertEqual(edited.shape,img.shape)
            report=quality(img,edited,info,subject)
            self.assertIn("flags",report)
            run(pull,push,False,1)
            out=push/"job.jpg"
            self.assertTrue(out.exists())
            self.assertEqual(Image.open(out).size,(w,h))
            data=json.loads((push/"job.qa.json").read_text())
            self.assertIn("qa",data)
            self.assertIn("analysis",data)
            self.assertIn("subject",data)
            run(pull,push,False,1)
            with sqlite3.connect(push/".autoedit"/"jobs.sqlite") as conn:
                self.assertEqual(conn.execute("SELECT status FROM jobs").fetchone()[0],"done")
    def test_nearly_black_frame(self):
        img=np.full((128,128,3),3,dtype=np.uint8)
        info=analyse(img)
        out,_=correct(img,info)
        self.assertLess(float(out.mean()),30)
    def test_white_highlights(self):
        img=np.full((128,128,3),80,dtype=np.uint8)
        img[:,:32]=255
        info=analyse(img)
        out,_=correct(img,info)
        self.assertGreater(float(out[:,:32].mean()),240)
if __name__=="__main__":unittest.main()
