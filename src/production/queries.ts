import type {ScriptDocument} from '../types/script';
import {documentLayout} from './layout';
import {sceneCast,studio,type NavigatorView} from './model';
import {characterName} from '../writing/model';
export interface ProductionScene {lines:number;id:string;index:number;number:string;heading:string;summary:string;pages:string[];eighths:number;characters:string[];notes:number;tags:string[];omitted:boolean}
const sceneCache=new WeakMap<ScriptDocument,{layout:ReturnType<typeof documentLayout>;scenes:ProductionScene[]}>();
export function productionScenes(doc:ScriptDocument):ProductionScene[]{
 const layout=documentLayout(doc),cached=sceneCache.get(doc);if(cached?.layout===layout)return cached.scenes;
 const height=(layout.format.page.height-layout.format.page.top-layout.format.page.bottom)*72,state=studio(doc),groups=new Map<string,{scene:ProductionScene;spoken:Set<string>;tags:Set<string>;bounds:Map<number,{label:string;top:number;bottom:number}>}>(),paragraphGroup=new Map<string,string>();let current='';
 for(const [index,p]of doc.paragraphs.entries()){if(p.type==='Scene Heading'){current=p.id;groups.set(current,{scene:{id:p.id,index,number:p.sceneNumber||String(groups.size+1),heading:p.text,summary:p.sceneSummary||'',pages:[],lines:0,eighths:0,characters:[],notes:0,tags:[],omitted:!!p.omitted},spoken:new Set(),tags:new Set(),bounds:new Map()});}paragraphGroup.set(p.id,current);const group=groups.get(current);if(!group)continue;group.scene.notes+=(p.notes?.length||0)+(p.sceneComment?1:0);if(p.type==='Character'&&!p.omitted)group.spoken.add(characterName(p.text));}
 for(const page of layout.pages)for(const fr of page.fragments){const group=groups.get(paragraphGroup.get(fr.paragraphId)||'');if(!group)continue;group.scene.lines+=fr.lines.length;const bound=group.bounds.get(page.pageNumber)||{label:page.pageLabel,top:Infinity,bottom:0};bound.top=Math.min(bound.top,fr.y);bound.bottom=Math.max(bound.bottom,fr.y+fr.height);group.bounds.set(page.pageNumber,bound);}
 for(const occurrence of state.occurrences){if(occurrence.deleted)continue;groups.get(paragraphGroup.get(occurrence.paragraphId)||'')?.tags.add(occurrence.tagId);}
 const result=[...groups.values()].map(group=>{const bounds=[...group.bounds.values()],extra=new Set(state.castMembership[group.scene.id]||[]),names=[...group.spoken],cast=(doc.characterMemory||[]).filter(c=>group.spoken.has(characterName(c.name))||extra.has(c.id));if(state.castOrder==='alphabetical')cast.sort((a,b)=>a.name.localeCompare(b.name));else if(state.castOrder==='custom')cast.sort((a,b)=>(state.customCastOrder.indexOf(a.id)<0?1e6:state.customCastOrder.indexOf(a.id))-(state.customCastOrder.indexOf(b.id)<0?1e6:state.customCastOrder.indexOf(b.id)));else cast.sort((a,b)=>(names.indexOf(characterName(a.name))<0?1e6:names.indexOf(characterName(a.name)))-(names.indexOf(characterName(b.name))<0?1e6:names.indexOf(characterName(b.name))));return {...group.scene,pages:bounds.map(b=>b.label),eighths:group.scene.omitted?0:Math.max(1,Math.ceil(bounds.reduce((n,b)=>n+(b.bottom-b.top)/height,0)*8)),characters:[...new Set([...cast.map(c=>c.name),...group.spoken])],tags:state.tags.filter(t=>group.tags.has(t.id)).map(t=>t.name)};});sceneCache.set(doc,{layout,scenes:result});return result;
}
export function navigatorRows(doc:ScriptDocument,view:NavigatorView):Record<string,string>[] {
 const layout=documentLayout(doc),scenes=productionScenes(doc),s=studio(doc);let rows:Record<string,string>[]=[];
 if(view.source==='scenes')rows=scenes.map(scene=>({id:scene.id,number:scene.number,title:scene.heading,pages:scene.pages.join(', '),summary:scene.summary,characters:scene.characters.join(', '),notes:String(scene.notes),tags:scene.tags.join(', '),length:`${Math.floor(scene.eighths/8)} ${scene.eighths%8}/8`,state:scene.omitted?'Omitted':''}));
 if(view.source==='characters')rows=(doc.characterMemory||[]).map(c=>{const present=scenes.filter(scene=>scene.characters.includes(c.name));const cues=doc.paragraphs.filter(p=>p.type==='Character'&&characterName(p.text)===characterName(c.name));return {id:c.id,title:c.name,pages:[...new Set(present.flatMap(v=>v.pages))].join(', '),scenes:present.map(v=>v.number).join(', '),count:String(cues.length),aliases:c.aliases.join(', ')};});
 if(view.source==='notes')rows=doc.paragraphs.flatMap(p=>(p.notes||[]).map(n=>({id:n.id,paragraphId:p.id,title:n.name||n.text,author:n.author,date:n.createdAt,pages:(layout.paragraphPages.get(p.id)||[]).join(', '),text:n.text})));
 if(view.source==='bookmarks')rows=doc.paragraphs.filter(p=>p.bookmark).map(p=>({id:p.id,title:typeof p.bookmark==='object'?p.bookmark.name:String(p.bookmark),pages:(layout.paragraphPages.get(p.id)||[]).join(', '),text:p.text}));
 if(view.source==='tags')rows=s.tags.map(t=>{const occurrences=s.occurrences.filter(o=>o.tagId===t.id&&!o.deleted),present=scenes.filter(scene=>scene.tags.includes(t.name));return {id:t.id,title:t.name,category:t.category,aliases:t.aliases.join(', '),count:String(new Set(occurrences.map(o=>o.rangeId||o.id)).size),pages:[...new Set(occurrences.flatMap(o=>layout.paragraphPages.get(o.paragraphId)||[]))].join(', '),scenes:present.map(v=>v.number).join(', '),character:doc.characterMemory?.find(c=>c.id===t.characterId)?.name||''};});
 const term=view.filter.trim().toLocaleLowerCase();rows=rows.filter(row=>!term||Object.values(row).some(v=>v.toLocaleLowerCase().includes(term)));rows.sort((a,b)=>(a[view.sort]||'').localeCompare(b[view.sort]||'',undefined,{numeric:true})*(view.descending?-1:1));return rows;
}
export function defaultNavigatorView(name='Scenes',source:NavigatorView['source']='scenes'):NavigatorView{return {id:crypto.randomUUID(),name,source,filter:'',sort:'title',descending:false,columns:['title','pages','summary','characters','tags','notes','length','category','scenes','count','author','date'].map((key,i)=>({key,width:i===0?240:120,visible:['title','pages','summary'].includes(key)}))};}
export function rowsCsv(rows:Record<string,string>[],columns:string[]){const quote=(value:string)=>'"'+String(value).replaceAll('"','""')+'"';return [columns.map(quote).join(','),...rows.map(row=>columns.map(c=>quote(row[c]||'')).join(','))].join('\n');}
export function updateCastLists(doc:ScriptDocument){let changed=false;const paragraphs=doc.paragraphs.map(p=>{if(!p.generatedCastSceneId)return p;const text=sceneCast(doc,p.generatedCastSceneId).map(c=>c.name).join(', ');if(p.text===text)return p;changed=true;return {...p,text,runs:undefined};});return changed?{...doc,paragraphs}:doc;}
/** Navigator Cast List (1.17; Final Draft 13 / 13.1): per character, the scenes, pages and eighths they appear in and an
 * estimate of their screen time. A character appears in a scene when they speak in it or are on its cast list; omitted
 * scenes are left out. Screen time uses the common rule of one page ≈ one minute: eighths ÷ 8 minutes. */
export interface CastEntry {name:string;firstSceneId:string;scenes:number;sceneNumbers:string[];pages:string[];eighths:number;screenSeconds:number;speeches:number;words:number;first:number}
export const CAST_SORT_FIELDS=['first','name','scenes','pages','eighths','screen','speeches','words'] as const;
export type CastSort=typeof CAST_SORT_FIELDS[number];
export function castList(doc:ScriptDocument):CastEntry[]{
 const entries=new Map<string,CastEntry>(),pageOrder=new Map<string,number>();let order=0;
 for(const scene of productionScenes(doc)){if(scene.omitted)continue;for(const page of scene.pages)if(!pageOrder.has(page))pageOrder.set(page,pageOrder.size);
  const seen=new Set<string>();for(const raw of scene.characters){const key=characterName(raw);if(!key||seen.has(key))continue;seen.add(key);let e=entries.get(key);if(!e){e={name:key,firstSceneId:scene.id,scenes:0,sceneNumbers:[],pages:[],eighths:0,screenSeconds:0,speeches:0,words:0,first:order++};entries.set(key,e);}
   e.scenes++;e.sceneNumbers.push(scene.number);e.eighths+=scene.eighths;for(const page of scene.pages)if(!e.pages.includes(page))e.pages.push(page);}}
 let speaker='',omitted=false;
 for(const p of doc.paragraphs){if(p.type==='Scene Heading'){omitted=!!p.omitted;speaker='';continue;}if(omitted||p.omitted)continue;
  if(p.type==='Character'){speaker=characterName(p.text);const e=entries.get(speaker);if(e)e.speeches++;continue;}
  if(p.type==='Dialogue'||p.type==='Dual Dialogue'){const e=entries.get(speaker);if(e)e.words+=p.text.trim().split(/\s+/).filter(Boolean).length;continue;}
  if(p.type!=='Parenthetical')speaker='';}
 for(const e of entries.values()){e.pages.sort((a,b)=>(pageOrder.get(a)??0)-(pageOrder.get(b)??0));e.screenSeconds=Math.round(e.eighths/8*60);}
 return [...entries.values()];
}
export function sortCast(entries:CastEntry[],field:CastSort,ascending=true){
 const value=(e:CastEntry)=>field==='name'?e.name:field==='pages'?e.pages.length:field==='screen'?e.screenSeconds:field==='first'?e.first:e[field];
 return [...entries].sort((a,b)=>{const x=value(a),y=value(b);const c=typeof x==='string'?x.localeCompare(y as string):(x as number)-(y as number);return (c||a.first-b.first)*(ascending?1:-1);});
}
/** "1:38" (minutes:seconds); "0:08" for one eighth. */
export function formatScreenTime(seconds:number){const m=Math.floor(seconds/60),s=seconds%60;return m+':'+String(s).padStart(2,'0');}
export function castListCsv(entries:CastEntry[]){return rowsCsv(entries.map(e=>({name:e.name,scenes:String(e.scenes),sceneNumbers:e.sceneNumbers.join(' '),pages:String(e.pages.length),pageList:e.pages.join(' '),eighths:String(e.eighths),length:`${Math.floor(e.eighths/8)} ${e.eighths%8}/8`,screen:formatScreenTime(e.screenSeconds),speeches:String(e.speeches),words:String(e.words)})),['name','scenes','sceneNumbers','pages','pageList','eighths','length','screen','speeches','words']).replace(/^[^\n]*/,'"Character","Scenes","Scene numbers","Pages","Page list","Eighths","Length (pages)","Screen time (est., m:ss)","Speeches","Words spoken"');}
