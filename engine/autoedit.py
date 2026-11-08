"""G-Green AutoEdit Pro: local, full-resolution Pull -> Process -> Push pipeline.
Install: pip install -r engine/requirements.txt
Run: python engine/autoedit.py --pull "D:/G-Green/PULL" --push "D:/G-Green/PUSH" --watch
Originals remain untouched. Processing occurs locally; no uploads.
"""
import argparse, json, logging, os, shutil, sqlite3, time
from pathlib import Path
from datetime import datetime, timezone
import cv2
import numpy as np
from PIL import Image, ImageOps

EXTENSIONS={".jpg",".jpeg",".png",".tif",".tiff"}
LOG=logging.getLogger("autoedit")

def smooth_mask(mask, radius=35):
    k=max(3, int(radius)//2*2+1)
    return cv2.GaussianBlur(mask.astype(np.float32),(k,k),0)

def analyse(rgb):
    h,w=rgb.shape[:2]
    scale=min(1.0, 1000/max(h,w))
    small=cv2.resize(rgb,(max(1,int(w*scale)),max(1,int(h*scale))),interpolation=cv2.INTER_AREA)
    lab=cv2.cvtColor(small,cv2.COLOR_RGB2LAB)
    light=lab[:,:,0].astype(np.float32)/255
    p=np.percentile(light,[5,20,50,80,95,99])
    bright=float(np.mean(light>.85)); dark=float(np.mean(light<.25))
    center=light[int(light.shape[0]*.15):int(light.shape[0]*.85),int(light.shape[1]*.2):int(light.shape[1]*.8)]
    center_mean=float(center.mean()) if center.size else float(light.mean())
    backlit=bright>.055 and center_mean<float(light.mean())-.065
    if backlit: scene="backlit"
    elif float(p[2])<.35: scene="low_light"
    elif bright>.16: scene="high_contrast"
    else: scene="balanced"
    return {"scene":scene,"percentiles":[round(float(x),4) for x in p],
            "dark_fraction":round(dark,4),"bright_fraction":round(bright,4),
            "center_luma":round(center_mean,4)}

def people_mask(rgb):
    """Offline OpenCV Haar face detection; not a general person detector."""
    h,w=rgb.shape[:2]
    gray=cv2.cvtColor(rgb,cv2.COLOR_RGB2GRAY)
    scale=min(1,900/max(w,h))
    tiny=cv2.resize(gray,(max(1,int(w*scale)),max(1,int(h*scale))))
    classifier=cv2.CascadeClassifier(cv2.data.haarcascades+"haarcascade_frontalface_default.xml")
    mask=np.zeros((h,w),np.float32)
    if classifier.empty(): return mask,0
    faces=classifier.detectMultiScale(tiny,scaleFactor=1.12,minNeighbors=5,minSize=(24,24))
    for fx,fy,fw,fh in faces:
        x,y,fw,fh=[int(v/scale) for v in (fx,fy,fw,fh)]
        # Soft elliptical region includes head, torso and clothing.
        center=(min(w-1,x+fw//2),min(h-1,y+int(fh*1.9)))
        axes=(max(10,int(fw*1.9)),max(10,int(fh*2.5)))
        cv2.ellipse(mask,center,axes,0,0,360,1,-1)
    return smooth_mask(mask,max(15,min(w,h)//60)),len(faces)

def correct(rgb,info,subject_strength=0.65):
    h,w=rgb.shape[:2]
    # LAB correction operates on luminance, leaving chromaticity mostly intact.
    lab=cv2.cvtColor(rgb,cv2.COLOR_RGB2LAB)
    l=lab[:,:,0].astype(np.float32)/255
    # Gentle denoising before local tone operations; avoid aggressive smoothing.
    if info["scene"]=="low_light":
        l=cv2.bilateralFilter(l,5,.065,9)
    # Edge-limited local contrast, tuned conservatively to prevent crunchy faces.
    clahe=cv2.createCLAHE(clipLimit=1.35,tileGridSize=(8,8))
    local=clahe.apply(np.uint8(np.clip(l*255,0,255))).astype(np.float32)/255
    l=.82*l+.18*local
    # Local illumination estimate, independent of original resolution.
    small=cv2.resize(l,(max(2,w//32),max(2,h//32)),interpolation=cv2.INTER_AREA)
    illumination=cv2.resize(cv2.GaussianBlur(small,(0,0),2),(w,h),interpolation=cv2.INTER_LINEAR)
    shadow=np.clip((.75-l)/.55,0,1)*np.clip((l-.025)/.14,0,1)
    shadow=np.power(shadow,1.2)
    local_dark=np.clip((.66-illumination)/.48,0,1)
    base={"balanced":.09,"high_contrast":.13,"low_light":.19,"backlit":.21}[info["scene"]]
    lift=base*shadow*(.40+.60*local_dark)
    faces,nfaces=people_mask(rgb)
    # When faces cannot be found, use conservative center-priority compensation
    # only on scenes independently classified as backlit.
    if nfaces==0 and info["scene"]=="backlit":
        yy,xx=np.ogrid[:h,:w]
        faces=np.exp(-(((xx/w-.5)/.37)**2+((yy/h-.5)/.47)**2)*1.6).astype(np.float32)*.48
    lift+=subject_strength*.24*faces*shadow
    out=l+lift
    # Anchor true blacks and protect white fabric, sky and windows.
    anchor=np.clip((l-.015)/.10,0,1)
    out=l+(out-l)*anchor
    highlight=np.clip((l-.72)/.22,0,1)
    out=out*(1-highlight*.9)+l*highlight*.9
    out=np.clip(out,0,1)
    lab[:,:,0]=np.uint8(np.round(out*255))
    result=cv2.cvtColor(lab,cv2.COLOR_LAB2RGB)
    # Mild edge-aware sharpening, attenuated for low light.
    strength=.13 if info["scene"]=="low_light" else .20
    blurred=cv2.GaussianBlur(result,(0,0),.8)
    detail=result.astype(np.float32)-blurred.astype(np.float32)
    detail=np.clip(detail,-12,12)
    result=np.uint8(np.clip(result.astype(np.float32)+detail*strength,0,255))
    return result,{"detected_faces":nfaces,"fallback_center_mask":nfaces==0 and info["scene"]=="backlit"}

def quality(original,edited,info,meta):
    a=cv2.cvtColor(original,cv2.COLOR_RGB2GRAY)
    b=cv2.cvtColor(edited,cv2.COLOR_RGB2GRAY)
    clipped=float(np.mean(b>=250)); crushed=float(np.mean(b<=5))
    changed=float(np.mean(np.abs(a.astype(np.float32)-b.astype(np.float32))))
    flags=[]
    if clipped>.13:flags.append("highlights_clipped")
    if crushed>.18:flags.append("shadows_crushed")
    if info["scene"]=="backlit" and meta["detected_faces"]==0:flags.append("subject_detection_unconfirmed")
    if changed>45:flags.append("strong_edit_review")
    if info["percentiles"][2]<.12:flags.append("severe_underexposure")
    return {"flags":flags,"clipped_fraction":round(clipped,4),"crushed_fraction":round(crushed,4),
            "mean_luma_change":round(changed,2)}

def connect(db):
    db.parent.mkdir(parents=True,exist_ok=True)
    c=sqlite3.connect(db)
    c.execute("CREATE TABLE IF NOT EXISTS jobs (source TEXT PRIMARY KEY, mtime_ns INTEGER, output TEXT, status TEXT, updated TEXT, report TEXT)")
    c.commit()
    return c

def process(path,pull,push,conn):
    rel=path.relative_to(pull)
    destination=push/rel.with_suffix(".jpg")
    stat=path.stat()
    row=conn.execute("SELECT mtime_ns,status FROM jobs WHERE source=?",(str(path),)).fetchone()
    if row and row[0]==stat.st_mtime_ns and row[1]=="done" and destination.exists():return "skipped"
    destination.parent.mkdir(parents=True,exist_ok=True)
    try:
        with Image.open(path) as im:
            im=ImageOps.exif_transpose(im)
            exif=im.getexif()
            rgb=np.asarray(im.convert("RGB"))
        info=analyse(rgb)
        edited,meta=correct(rgb,info)
        qa=quality(rgb,edited,info,meta)
        temp=destination.with_name(destination.stem+".partial.jpg")
        Image.fromarray(edited).save(temp,"JPEG",quality=94,subsampling=0,exif=exif.tobytes())
        os.replace(temp,destination)
        report={"source":str(path),"output":str(destination),"size":[int(rgb.shape[1]),int(rgb.shape[0])],
                "analysis":info,"subject":meta,"qa":qa,"timestamp":datetime.now(timezone.utc).isoformat()}
        report_path=destination.with_suffix(".qa.json")
        report_path.write_text(json.dumps(report,indent=2),encoding="utf-8")
        conn.execute("INSERT OR REPLACE INTO jobs VALUES (?,?,?,?,?,?)",
                     (str(path),stat.st_mtime_ns,str(destination),"done",report["timestamp"],json.dumps(report)))
        conn.commit()
        LOG.info("Edited %s -> %s (%s)",path.name,destination.name,",".join(qa["flags"]) or "QA OK")
        return "done"
    except Exception as e:
        LOG.exception("Failed: %s",path)
        conn.execute("INSERT OR REPLACE INTO jobs VALUES (?,?,?,?,?,?)",
                     (str(path),stat.st_mtime_ns,str(destination),"error",datetime.now(timezone.utc).isoformat(),str(e)))
        conn.commit()
        return "error"

def run(pull,push,watch,interval):
    pull.mkdir(parents=True,exist_ok=True);push.mkdir(parents=True,exist_ok=True)
    if pull.resolve()==push.resolve():raise ValueError("PULL and PUSH must be different folders")
    db=connect(push/".autoedit"/"jobs.sqlite")
    LOG.info("PULL=%s PUSH=%s",pull,push)
    try:
        while True:
            for p in sorted(pull.rglob("*")):
                if not p.is_file() or p.suffix.lower() not in EXTENSIONS:continue
                try:
                    # Ignore files still being copied into PULL.
                    size=p.stat().st_size
                    if time.time()-p.stat().st_mtime<3:continue
                    if watch:
                        time.sleep(.15)
                        if not p.exists() or p.stat().st_size!=size:continue
                    process(p,pull,push,db)
                except OSError:LOG.exception("File not ready: %s",p)
            if not watch:break
            time.sleep(interval)
    finally:db.close()

if __name__=="__main__":
    parser=argparse.ArgumentParser(description="G-Green AutoEdit Pro local engine")
    parser.add_argument("--pull",required=True,type=Path)
    parser.add_argument("--push",required=True,type=Path)
    parser.add_argument("--watch",action="store_true")
    parser.add_argument("--interval",type=int,default=5)
    args=parser.parse_args()
    logging.basicConfig(level=logging.INFO,format="%(asctime)s %(levelname)s %(message)s")
    run(args.pull,args.push,args.watch,args.interval)
