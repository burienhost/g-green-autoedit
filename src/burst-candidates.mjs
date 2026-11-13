// Browser-local burst candidate clustering. Candidate membership is advisory, not proof of duplication.
import {gridDistance} from './scene-candidates.mjs';
import {technicalScore} from './photo-ranking.mjs';
import {regionalChange} from './moment-signals.mjs';
export function buildBurstCandidates(rows,{threshold=.035,window=12,maxGroups=300,maxMembers=60}={}){
 if(!Array.isArray(rows)||![threshold,window,maxGroups,maxMembers].every(Number.isFinite)||threshold<0||threshold>1||window<1||maxGroups<0||maxMembers<2)throw new TypeError('Invalid burst candidate settings');
 const parent=rows.map((_,i)=>i),sizes=rows.map(()=>1);
 function find(i){while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i]}return i}
 function union(i,j){let a=find(i),b=find(j);if(a===b||sizes[a]+sizes[b]>maxMembers)return false;if(sizes[a]<sizes[b])[a,b]=[b,a];parent[b]=a;sizes[a]+=sizes[b];return true}
 let examined=0,links=0;
 for(let i=0;i<rows.length;i++){
  const g=rows[i]?.grid;if(!Array.isArray(g))continue;
  for(let j=i+1;j<Math.min(rows.length,i+window+1);j++){
   if(!Array.isArray(rows[j]?.grid))continue;
   let d;try{d=gridDistance(g,rows[j].grid)}catch{continue}
   examined++;
   if(d<=threshold){
    const change=regionalChange(rows[i]?.evidence?.regions,rows[j]?.evidence?.regions);
    if(change.available&&change.distinctMomentWarning)continue;
    if(union(i,j))links++;
   }
  }
 }
 const buckets=new Map();
 for(let i=0;i<rows.length;i++){const root=find(i);if(sizes[root]<2)continue;if(!buckets.has(root))buckets.set(root,[]);buckets.get(root).push(i)}
 const groups=[];
 for(const members of buckets.values()){
  const ranked=members.map(index=>({index,technical:technicalScore(rows[index].evidence)}));
  ranked.sort((a,b)=>(b.technical.score??-1)-(a.technical.score??-1)||a.index-b.index);
  const valid=ranked.filter(r=>r.technical.available);
  const regionalEvidence=members.every(index=>Array.isArray(rows[index]?.evidence?.regions));
  const clear=regionalEvidence&&valid.length===members.length&&valid.length>1&&valid[0].technical.score-valid[1].technical.score>=8;
  groups.push({id:'candidate-'+members[0],members,ranked,technicalLeader:clear?valid[0].index:null,regionalEvidence,automaticExclusion:false,reason:'Possible burst based on local visual similarity; preserve distinct moments and expressions'});
  if(groups.length>=maxGroups)break;
 }
 return {groups,examined,links,truncated:buckets.size>groups.length};
}
