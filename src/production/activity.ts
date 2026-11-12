import type {ScriptDocument} from '../types/script';
import {WordCountIndex} from '../writing/model';
import {getTodayKey} from '../utils/productivityStorage';
export type ActivityOrigin='edit'|'undo'|'redo'|'ignored';
interface Credit {words:number;pages:number}
interface Snapshot {words:number;pages:number;credit:Record<string,Credit>}
export class WritingActivity {
 private projects=new Map<string,{current:Snapshot;history:Map<string,Snapshot>}>();private counts=new WordCountIndex();private hashes=new Map<string,{text:string;hash:string}>();
 private key(doc:ScriptDocument){return doc.paragraphs.map(p=>{let cached=this.hashes.get(p.id);if(cached?.text!==p.text){let hash=2166136261;for(let i=0;i<p.text.length;i++)hash=Math.imul(hash^p.text.charCodeAt(i),16777619);cached={text:p.text,hash:(hash>>>0).toString(36)+':'+p.text.length};this.hashes.set(p.id,cached);}return p.id+':'+cached.hash;}).join('|');}
 observe(doc:ScriptDocument,pages:number,origin:ActivityOrigin='edit',date=getTodayKey()){
  const key=this.key(doc),words=this.counts.count(doc.paragraphs);let project=this.projects.get(doc.id);
  if(!project){const initial={words,pages,credit:{}};project={current:initial,history:new Map([[key,initial]])};this.projects.set(doc.id,project);return [];}
  const previous=project.current,restored=(origin==='undo'||origin==='redo')?project.history.get(key):undefined;
  const next:Snapshot=restored?{...restored,credit:structuredClone(restored.credit)}:{words,pages,credit:structuredClone(previous.credit)};
  if(!restored&&origin==='edit')for(const metric of ['words','pages'] as const){let delta=(metric==='words'?words:pages)-previous[metric];if(delta>0){next.credit[date]||={words:0,pages:0};next.credit[date][metric]+=delta;}else if(delta<0){for(const day of Object.keys(next.credit).sort().reverse()){const taken=Math.min(next.credit[day][metric],-delta);next.credit[day][metric]-=taken;delta+=taken;if(delta>=0)break;}}}
  const days=new Set([...Object.keys(previous.credit),...Object.keys(next.credit)]);const changes=[...days].map(day=>({date:day,words:(next.credit[day]?.words||0)-(previous.credit[day]?.words||0),pages:(next.credit[day]?.pages||0)-(previous.credit[day]?.pages||0)})).filter(d=>d.words||d.pages);
  project.current=next;project.history.set(key,next);if(project.history.size>1500)project.history.delete(project.history.keys().next().value!);return changes;
 }
}
