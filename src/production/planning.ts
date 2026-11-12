import type {ScriptDocument,Paragraph,ElementType,BeatCard,OutlineMarker} from '../types/script';
import {uid} from './model';
import {documentLayout} from './layout';
import {buildStoryIndex,anchorForPage} from '../story/model';
export interface PlanningSource {kind:'beat'|'marker';id:string;title:string;description:string}
export function sendPlanning(doc:ScriptDocument,source:PlanningSource,element:ElementType,location:{paragraphId?:string;where:'before'|'after'|'start'|'end'},includeDescription=true):ScriptDocument {
 const supported=doc.writingFormat?.supported;if(supported&&!supported.includes(element))throw Error('Choose an element supported by this format.');
 const link=source.kind==='beat'?{sourceBeatId:source.id}:{sourceMarkerId:source.id};
 const title:Paragraph={id:uid('p'),type:element,text:source.title,...link,sourcePlanningField:'title'};
 const content=[title,...(includeDescription&&source.description?[{id:uid('p'),type:(element.startsWith('Outline')?('Outline Level '+Math.min(3,Number(element.slice(-1))+1)):doc.writingFormat?.kind==='prose'?'General':'Action') as ElementType,text:source.description,...link,sourcePlanningField:'description' as const}]:[])];
 let at=location.where==='start'?0:doc.paragraphs.length;if(location.paragraphId&&['before','after'].includes(location.where)){const index=doc.paragraphs.findIndex(p=>p.id===location.paragraphId);if(index<0)throw Error('The insertion location changed. Choose a current paragraph.');at=index+(location.where==='after'?1:0);}
 let next={...doc,paragraphs:[...doc.paragraphs.slice(0,at),...content,...doc.paragraphs.slice(at)],beats:doc.beats.map(b=>source.kind==='beat'&&b.id===source.id?{...b,sceneId:title.id}:b)};
 const index=buildStoryIndex(next.paragraphs,next.lockedPages,documentLayout(next).pages),page=index.paragraphPage.get(title.id)||1;
 next={...next,outlineMarkers:doc.outlineMarkers.map(m=>(source.kind==='marker'&&m.id===source.id||source.kind==='beat'&&m.beatId===source.id)?{...m,anchor:{page,paragraphId:title.id},startPage:page}:m)};return next;
}
export function repairPlanningLinks(doc:ScriptDocument):ScriptDocument {
 const paragraphIds=new Set(doc.paragraphs.map(p=>p.id)),beatIds=new Set(doc.beats.map(b=>b.id)),markerIds=new Set(doc.outlineMarkers.map(m=>m.id));let changed=false;
 const paragraphs=doc.paragraphs.map(p=>{if(p.sourceBeatId&&!beatIds.has(p.sourceBeatId)||p.sourceMarkerId&&!markerIds.has(p.sourceMarkerId)){changed=true;return {...p,sourceBeatId:undefined,sourceMarkerId:undefined,sourcePlanningField:undefined};}return p;});
 const beats=doc.beats.map(b=>{if(b.sceneId&&!paragraphIds.has(b.sceneId)){changed=true;return {...b,sceneId:undefined};}return b;});
 const outlineMarkers=doc.outlineMarkers.map(m=>{const missingBeat=m.beatId&&!beatIds.has(m.beatId),missingStart=m.anchor?.paragraphId&&!paragraphIds.has(m.anchor.paragraphId),missingEnd=m.endAnchor?.paragraphId&&!paragraphIds.has(m.endAnchor.paragraphId);if(!missingBeat&&!missingStart&&!missingEnd)return m;changed=true;return {...m,...(missingBeat?{beatId:undefined}:{}),...(missingStart?{anchor:{...m.anchor!,paragraphId:undefined}}:{}),...(missingEnd?{endAnchor:{...m.endAnchor!,paragraphId:undefined}}:{})};});
 const flowLines=doc.flowLines.filter(l=>beatIds.has(l.fromId)&&beatIds.has(l.toId));
 return changed||flowLines.length!==doc.flowLines.length?{...doc,paragraphs,beats,outlineMarkers,flowLines}:doc;
}
export function synchronizePlanning(before:ScriptDocument,after:ScriptDocument):ScriptDocument {
 after=repairPlanningLinks(after);
 if(!after.paragraphs.some(p=>p.sourcePlanningField)&&!after.outlineMarkers.some(m=>m.laneId!==before.outlineMarkers.find(v=>v.id===m.id)?.laneId))return after;
 let beats=after.beats,markers=after.outlineMarkers;const previous=new Map(before.paragraphs.map(p=>[p.id,p]));
 const paragraphs=after.paragraphs.map(p=>{const field=p.sourcePlanningField;if(!field)return p;const record=p.sourceBeatId?beats.find(b=>b.id===p.sourceBeatId):markers.find(m=>m.id===p.sourceMarkerId);if(!record)return p;const old=previous.get(p.id),oldRecord=p.sourceBeatId?before.beats.find(b=>b.id===p.sourceBeatId):before.outlineMarkers.find(m=>m.id===p.sourceMarkerId);if(old&&old.text!==p.text){if(p.sourceBeatId)beats=beats.map(b=>b.id===p.sourceBeatId?{...b,[field]:p.text}:b);else markers=markers.map(m=>m.id===p.sourceMarkerId?{...m,[field]:p.text}:m);return p;}if(oldRecord&&record[field]!==oldRecord[field]&&record[field]!==p.text)return {...p,text:record[field],runs:undefined};return p;});
 for(const m of markers){const old=before.outlineMarkers.find(v=>v.id===m.id);if(old&&m.beatId&&m.laneId!==old.laneId)beats=beats.map(b=>b.id===m.beatId?{...b,sequenceId:m.laneId}:b);}
 return paragraphs.some((p,i)=>p!==after.paragraphs[i])||beats!==after.beats||markers!==after.outlineMarkers?{...after,paragraphs,beats,outlineMarkers:markers}:after;
}
export function outlineExport(doc:ScriptDocument,format:'markdown'|'json'){
 const lanes=doc.outlineLanes.map(l=>({...l,markers:doc.outlineMarkers.filter(m=>m.laneId===l.id).sort((a,b)=>a.startPage-b.startPage).map(m=>({...m,beat:doc.beats.find(b=>b.id===m.beatId)}))}));
 const orphaned=doc.outlineMarkers.filter(m=>!doc.outlineLanes.some(l=>l.id===m.laneId));if(orphaned.length)lanes.push({id:'export-unassigned',name:'Unassigned outline markers',type:'custom',color:'#888888',markers:orphaned.sort((a,b)=>a.startPage-b.startPage).map(m=>({...m,beat:doc.beats.find(b=>b.id===m.beatId)}))});
 const unlinked=doc.beats.filter(b=>!doc.outlineMarkers.some(m=>m.beatId===b.id)).sort((a,b)=>(a.stripOrder??0)-(b.stripOrder??0));
 if(format==='json')return JSON.stringify({format:'draftcraft-outline',version:1,title:doc.titlePage.title,lanes,unlinkedBeats:unlinked},null,2);
 return '# '+doc.titlePage.title+'\n\n'+lanes.map(l=>'## '+l.name+'\n\n'+l.markers.map(m=>'### '+m.title+'\n\n'+m.description+'\n\n').join('')).join('')+(unlinked.length?'## Unlinked Beats\n\n'+unlinked.map(b=>'### '+b.title+'\n\n'+b.description+'\n\n').join(''):'');
}
