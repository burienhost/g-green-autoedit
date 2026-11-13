// Optional browser-native face presence signals. No identity, emotion or biometric templates.
export async function facePresence(bitmap){
 if(typeof FaceDetector!=='function')return {available:false,reason:'FaceDetector not supported by this browser'};
 try{
  const detector=new FaceDetector({fastMode:true,maxDetectedFaces:20});
  const faces=await detector.detect(bitmap);
  const width=bitmap.width,height=bitmap.height;
  const boxes=faces.map(face=>{
   const r=face.boundingBox;
   if(!r||!width||!height)return null;
   return {x:+Math.max(0,Math.min(1,r.x/width)).toFixed(3),y:+Math.max(0,Math.min(1,r.y/height)).toFixed(3),w:+Math.max(0,Math.min(1,r.width/width)).toFixed(3),h:+Math.max(0,Math.min(1,r.height/height)).toFixed(3)};
  }).filter(Boolean);
  return {available:true,count:boxes.length,boxes,reason:'Face presence only; not identity, expression or quality'};
 }catch(e){return {available:false,reason:'Face detection unavailable'};}
}
export function faceChange(a,b){
 if(!a?.available||!b?.available)return {available:false,warning:false};
 const countChange=a.count!==b.count;
 // Count changes are a review safeguard, not proof that people differ.
 return {available:true,warning:countChange,countA:a.count,countB:b.count,reason:countChange?'Different face counts detected; inspect both moments':'Same face count does not prove same subjects or moment'};
}
