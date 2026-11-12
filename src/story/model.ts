import type { ScriptDocument, Paragraph, BeatCard, OutlineMarker } from '../types/script';
import { estimateParagraphLines, LINES_PER_PAGE, paginateScript, type PageChunk } from '../utils/pagination';

export type StoryFeature = 'map' | 'arc' | 'markers' | 'beats';
export const STORY_FEATURES: StoryFeature[] = ['map','arc','markers','beats'];
export const STORY_NAMES: Record<StoryFeature,string> = {map:'Story Map',arc:'Story Arc',markers:'Act Breaks',beats:'Beat Sheet'};
export type StoryPosition = 'above' | 'below' | 'panel' | 'pages';
export interface StoryAnchor { paragraphId?: string; page: number; offset?: number }
export interface StoryDisplay {
  enabled: boolean; hidden: boolean; collapsed: boolean; position: StoryPosition;
  allPages: boolean; pages: StoryAnchor[]; excludedPages: StoryAnchor[]; pagePosition: 'above' | 'below';
  height: number; width: number; opacity: number; color: string; zoom: number; compact: boolean;
}
export type ArcModel = 'Three Act' | 'Freytag' | 'Syd Field' | 'Five Act' | 'Custom';
export interface ArcPoint { id: string; label: string; anchor: StoryAnchor; intensity: number; color: string; sceneId?: string; template?: boolean }
export interface StoryStructure { version: 1; displays: Record<StoryFeature,StoryDisplay>; arcModel: ArcModel; points: ArcPoint[]; intensityMax: number; collapsedSequences: string[]; beatFilter: string }
export interface SceneSpan { id: string; index: number; heading: string; start: number; end: number; startPage: number; endPage: number; color: string }
export interface StoryIndex { pages: PageChunk[]; scenes: SceneSpan[]; paragraphPage: Map<string,number>; positions: Map<string,number>; total: number; geometry: string }

const clamp=(n:unknown,min:number,max:number,fallback:number)=>typeof n==='number' && Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback;
export const storyId=(kind:string)=>kind+'-'+crypto.randomUUID();
export function defaultDisplay(): StoryDisplay { return {enabled:false,hidden:false,collapsed:false,position:'above',allPages:false,pages:[],excludedPages:[],pagePosition:'above',height:190,width:100,opacity:1,color:'#8b7cf8',zoom:1,compact:false}; }
export function storySettings(value?: Partial<StoryStructure>): StoryStructure {
  const displays={} as Record<StoryFeature,StoryDisplay>;
  for(const key of STORY_FEATURES){ const old=value?.displays?.[key]; const base=defaultDisplay();
    displays[key]={...base,...old,enabled:old?.enabled===true,hidden:old?.hidden===true,position:['above','below','panel','pages'].includes(old?.position || '')?old!.position:'above',height:clamp(old?.height,80,600,190),width:clamp(old?.width,35,100,100),opacity:clamp(old?.opacity,.25,1,1),zoom:clamp(old?.zoom,.5,5,1),color:/^#[\da-f]{6}$/i.test(old?.color || '')?old!.color:base.color,pages:Array.isArray(old?.pages)?old!.pages.filter(a=>Number.isFinite(a.page)):[]};
  }
  return {version:1,displays,arcModel:['Three Act','Freytag','Syd Field','Five Act','Custom'].includes(value?.arcModel || '')?value!.arcModel!:'Three Act',points:Array.isArray(value?.points)?value!.points:[],intensityMax:clamp(value?.intensityMax,10,1000,100),collapsedSequences:value?.collapsedSequences || [],beatFilter:value?.beatFilter || ''};
}
let lastGeometry='';
export function buildStoryIndex(paragraphs:Paragraph[],locked=false,pages=paginateScript(paragraphs,locked)):StoryIndex {
  const paragraphPage=new Map<string,number>(),positions=new Map<string,number>();
  for(const page of pages){for(const fragment of page.fragments){if(paragraphPage.has(fragment.paragraphId))continue;paragraphPage.set(fragment.paragraphId,page.pageNumber);positions.set(fragment.paragraphId,page.pageNumber-1+fragment.y/page.capacity);}}

  const total=Math.max(1,pages.length),scenes:SceneSpan[]=[];
  paragraphs.forEach((p,index)=>{if(p.type==='Scene Heading'){scenes.push({id:p.id,index,heading:p.text,start:positions.get(p.id) || 0,end:total,startPage:paragraphPage.get(p.id) || 1,endPage:total,color:p.sceneColor || '#7193da'});}});
  scenes.forEach((s,i)=>{s.end=scenes[i+1]?.start ?? total;s.endPage=Math.max(s.startPage,Math.ceil(s.end));});
  // Planning views depend on layout and scene labels, rather than every prose
  // character. Keep current page text for export while allowing unchanged
  // geometry to skip hundreds of optional page-panel updates during typing.
  // Reuse the previous geometry string when it is unchanged, so the hundreds of per-page
  // memo comparisons compare one string object instead of re-reading tens of kilobytes each.
  let geometry=JSON.stringify([total,[...positions],scenes]);
  if(geometry===lastGeometry)geometry=lastGeometry;else lastGeometry=geometry;
  return {pages,scenes,paragraphPage,positions,total,geometry};
}
export function resolveAnchor(anchor:StoryAnchor,index:StoryIndex):number {
  const position=anchor.paragraphId?index.positions.get(anchor.paragraphId):undefined;
  return Math.max(0,Math.min(index.total, (position ?? Math.max(0,anchor.page-1))+(anchor.offset || 0)));
}
export function anchorForPage(page:number,index:StoryIndex):StoryAnchor {
  const p=index.pages.find(p=>p.pageNumber===page)?.paragraphs[0];return {page,paragraphId:p?.id};
}
export function onStoryPage(display:StoryDisplay,page:number,index:StoryIndex){return display.enabled && !display.hidden && !(display.excludedPages || []).some(a=>Math.min(index.total,Math.floor(resolveAnchor(a,index))+1)===page) && (display.allPages || display.pages.some(a=>Math.min(index.total,Math.floor(resolveAnchor(a,index))+1)===page));}
export function markerPosition(marker:OutlineMarker,index:StoryIndex){return marker.anchor?resolveAnchor(marker.anchor,index):Math.max(0,marker.startPage-1);}
export function templatePoints(model:ArcModel,total:number,max=100):ArcPoint[] {
  const entries: [string,number,number][] = model==='Freytag'?[['Exposition',0,10],['Inciting Incident',.15,28],['Rising Action',.35,55],['Climax',.5,100],['Falling Action',.72,45],['Resolution',1,10]]:model==='Five Act'?[['Act I — Exposition',0,10],['Act II — Rising Action',.2,40],['Act III — Climax',.5,100],['Act IV — Falling Action',.75,45],['Act V — Resolution',1,12]]:model==='Custom'?[]:[['Exposition',0,10],['Inciting Incident',.1,25],['Plot Point I',.25,45],['Midpoint',.5,65],['Major Reversal',.65,50],['Crisis / Plot Point II',.75,85],['Climax',.9,100],['Resolution',1,15]];
  return entries.map(([label,x,y],i)=>({id:'template-'+model+'-'+i,label,anchor:{page:1+x*total},intensity:y*max/100,color:'#8b7cf8',template:true}));
}
export function storyPoints(settings:StoryStructure,index:StoryIndex){return settings.points.length?settings.points:templatePoints(settings.arcModel,index.total,settings.intensityMax);}
export function insertStructureMarker(doc:ScriptDocument,index:StoryIndex,page:number,kind:'act'|'plot'|'marker'):ScriptDocument {
  const settings=storySettings(doc.storyStructure);settings.displays.markers={...settings.displays.markers,enabled:true,hidden:false,pages:[...settings.displays.markers.pages.filter(a=>Math.floor(resolveAnchor(a,index))+1!==page),anchorForPage(page,index)]};
  const lane=doc.outlineLanes.find(l=>l.type==='act');const laneId=lane?.id || storyId('lane');
  const marker:OutlineMarker={id:storyId('marker'),laneId,title:kind==='act'?'New Act':kind==='plot'?'New Plot Point':'New Structural Marker',description:'',startPage:page,endPage:page,color:'#8b7cf8',kind,anchor:anchorForPage(page,index),visible:true};
  return {...doc,storyStructure:settings,outlineLanes:lane?doc.outlineLanes:[...doc.outlineLanes,{id:laneId,name:'Act breaks and plot points',type:'act',color:'#8b7cf8'}],outlineMarkers:[...doc.outlineMarkers,marker]};
}
export function orderedBeats(beats:BeatCard[],index:StoryIndex):BeatCard[] {
  const rank=new Map(index.scenes.map((s,i)=>[s.id,i]));
  const planned=beats.map((b,i)=>({b,i})).sort((a,b)=>(a.b.stripOrder ?? a.i)-(b.b.stripOrder ?? b.i)).map(v=>v.b);
  const linked=planned.filter(b=>b.sceneId && rank.has(b.sceneId)).sort((a,b)=>rank.get(a.sceneId!)!-rank.get(b.sceneId!)!);
  let at=0;return planned.map(b=>b.sceneId&&rank.has(b.sceneId)?linked[at++]:b);
}
export function deleteBeat(doc:ScriptDocument,id:string):ScriptDocument {
  return {...doc,beats:doc.beats.filter(b=>b.id!==id),flowLines:doc.flowLines.filter(l=>l.fromId!==id && l.toId!==id),outlineMarkers:doc.outlineMarkers.map(m=>m.beatId===id?{...m,beatId:undefined}:m)};
}
