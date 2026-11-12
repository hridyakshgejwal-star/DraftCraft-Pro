import React,{useMemo,useRef,useState,useEffect} from 'react';
import type {ScriptDocument,OutlineMarker,BeatCard} from '../types/script';
import {STORY_NAMES,STORY_FEATURES,storySettings,storyPoints,resolveAnchor,markerPosition,onStoryPage,orderedBeats,anchorForPage,type StoryFeature,type StoryIndex,type ArcPoint} from '../story/model';

export type StorySelection={kind:'marker'|'point'|'beat'|'lane';id:string};
export interface StoryToolsProps {document:ScriptDocument;index:StoryIndex;onUpdate:(doc:ScriptDocument)=>void;onEdit:(selection?:StorySelection,page?:number)=>void;onJump:(id:string)=>void}
type StoryPanelsProps=StoryToolsProps & {position:'above'|'below'|'panel';page?:number;pagePosition?:'above'|'below'};
export const StoryPanels=React.memo(function StoryPanels(props:StoryPanelsProps){
  if(!props.document.storyStructure || !STORY_FEATURES.some(f=>props.document.storyStructure!.displays?.[f]?.enabled && !props.document.storyStructure!.displays[f].hidden))return null;
  const s=storySettings(props.document.storyStructure);
  return <>{STORY_FEATURES.filter(f=>props.page!==undefined?onStoryPage(s.displays[f],props.page,props.index)&&s.displays[f].pagePosition===props.pagePosition:s.displays[f].enabled&&!s.displays[f].hidden&&s.displays[f].position===props.position).map(f=><StoryPanel key={f} feature={f} {...props}/>)}</>;
},(previous,next)=>previous.document.id===next.document.id
  && previous.document.storyStructure===next.document.storyStructure
  && previous.document.outlineLanes===next.document.outlineLanes
  && previous.document.outlineMarkers===next.document.outlineMarkers
  && previous.document.beats===next.document.beats
  && previous.document.flowLines===next.document.flowLines
  && previous.document.characterMemory===next.document.characterMemory
  && previous.index.geometry===next.index.geometry
  && previous.position===next.position && previous.page===next.page && previous.pagePosition===next.pagePosition
  && previous.onUpdate===next.onUpdate && previous.onEdit===next.onEdit && previous.onJump===next.onJump);
function StoryPanel(props:StoryToolsProps & {feature:StoryFeature;page?:number}){
  const {feature,document:doc,index,onUpdate,onEdit,page}=props,settings=storySettings(doc.storyStructure),d=settings.displays[feature];
  const panelRef=useRef<HTMLElement>(null),[visible,setVisible]=useState(page===undefined || page<=2);
  useEffect(()=>{if(page===undefined)return;const observer=new IntersectionObserver(entries=>setVisible(entries[0].isIntersecting),{root:document.querySelector('.dc-editor-workspace'),rootMargin:'600px'});if(panelRef.current)observer.observe(panelRef.current);return()=>observer.disconnect()},[page]);
  const updateDisplay=(patch:object)=>onUpdate({...doc,storyStructure:{...settings,displays:{...settings.displays,[feature]:{...d,...patch}}}});
  const view=!visible?null:feature==='map'?<StoryMap {...props}/>:feature==='arc'?<StoryArc {...props}/>:feature==='markers'?<MarkerList {...props}/>:<BeatStrip {...props}/>;
  return <section ref={panelRef} aria-label={`${STORY_NAMES[feature]}${page?' on Page '+page:''}`} data-story-feature={feature} className={'dc-story-panel no-print '+(d.compact?'dc-story-compact':'')} style={{width:d.width+'%',opacity:d.opacity,'--story-color':d.color} as React.CSSProperties}>
    <header><strong>{STORY_NAMES[feature]}</strong>{page && <span>Page {page}</span>}<span className="dc-story-spacer"/>
      <button aria-label={(d.collapsed?'Expand ':'Collapse ')+STORY_NAMES[feature]} onClick={()=>updateDisplay({collapsed:!d.collapsed})}>{d.collapsed?'Expand':'Collapse'}</button>
      <button aria-label={'Edit '+STORY_NAMES[feature]} onClick={()=>onEdit(undefined,page)}>Edit</button>
      <button aria-label={(page?'Remove ':'Hide ')+STORY_NAMES[feature]+(page?' from Page '+page:'')} onClick={()=>page?updateDisplay({pages:d.pages.filter(a=>Math.floor(resolveAnchor(a,index))+1!==page),excludedPages:[...(d.excludedPages || []),anchorForPage(page,index)]}):updateDisplay({hidden:true})}>{page?'Remove from page':'Hide'}</button>
    </header>
    {!d.collapsed && <div className="dc-story-content" style={{height:page?Math.min(180,d.height):d.height}} onPointerUp={e=>{if(e.target===e.currentTarget){const height=e.currentTarget.offsetHeight;if(height!==d.height && !page)updateDisplay({height:Math.max(80,Math.min(600,height))});}}}>{view}</div>}
  </section>;
}

function StoryMap({document:doc,index,onUpdate,onEdit,onJump}:StoryToolsProps){
  const s=storySettings(doc.storyStructure),d=s.displays.map,track=useRef<HTMLDivElement>(null);
  const [drag,setDrag]=useState<{id:string;position:number}|null>(null);const dragRef=useRef(drag);dragRef.current=drag;
  const width=Math.max(600,index.total*12*d.zoom);
  const move=(e:React.PointerEvent)=>{if(!dragRef.current || !track.current)return;const r=track.current.getBoundingClientRect();const position=Math.max(0,Math.min(index.total,(e.clientX-r.left)/r.width*index.total));setDrag({...dragRef.current,position});};
  const commit=()=>{const v=dragRef.current;if(!v)return;onUpdate({...doc,outlineMarkers:doc.outlineMarkers.map(m=>m.id===v.id?{...m,anchor:{page:1+v.position},startPage:1+v.position,endPage:Math.max(m.endPage,1+v.position)}:m)});setDrag(null);};
  const markers=doc.outlineMarkers.filter(m=>m.visible!==false),lanes=doc.outlineLanes;
  return <div className="dc-story-map">
    <div className="dc-story-actions"><label>Zoom <input aria-label="Story Map Zoom" type="range" min=".5" max="5" step=".25" value={d.zoom} onChange={e=>onUpdate({...doc,storyStructure:{...s,displays:{...s.displays,map:{...d,zoom:Number(e.target.value)}}}})}/></label><button onClick={()=>onEdit()}>Add section or marker</button><span>Actual pages · scene lengths follow the screenplay</span></div>
    <div className="dc-story-scroll"><div ref={track} className="dc-story-track" style={{width}}>
      <div className="dc-story-ruler">{Array.from({length:Math.min(100,Math.ceil(index.total/Math.max(1,Math.ceil(index.total/30))))+1},(_,i)=>{const p=i*Math.max(1,Math.ceil(index.total/30));return <span key={i} style={{left:p/index.total*100+'%'}}>p.{Math.min(index.total,p+1)}</span>})}</div>
      <div className="dc-story-scenes">{index.scenes.map(scene=><button key={scene.id} onClick={()=>onJump(scene.id)} style={{left:scene.start/index.total*100+'%',width:(scene.end-scene.start)/index.total*100+'%',background:scene.color}} title={`${scene.heading} · p.${scene.startPage}–${scene.endPage} · ${(scene.end-scene.start).toFixed(2)} pages`}>{scene.heading}</button>)}{!index.scenes.length && <p>Add a Scene Heading to populate the scene track.</p>}</div>
      {!d.compact && lanes.map(l=><div key={l.id} className="dc-story-lane"><button className="dc-story-lane-label" style={{color:l.color}} onClick={()=>onEdit({kind:'lane',id:l.id})}>{l.name}</button>{markers.filter(m=>m.laneId===l.id && (!m.kind || m.kind==='section')).map(m=>{const start=markerPosition(m,index),end=m.endAnchor?resolveAnchor(m.endAnchor,index):m.endPage;return <button className="dc-story-section" key={m.id} title={m.description} onClick={()=>onEdit({kind:'marker',id:m.id})} style={{left:start/index.total*100+'%',width:Math.max(1,(end-start)/index.total*100)+'%',background:m.color}}>{m.title}</button>})}</div>)}
      {s.displays.markers.enabled&&!s.displays.markers.hidden&&markers.filter(m=>m.kind && m.kind!=='section').map(m=>{const pos=drag?.id===m.id?drag.position:markerPosition(m,index);return <button key={m.id} className="dc-story-pin" aria-label={`Move marker ${m.title}`} style={{left:pos/index.total*100+'%',color:m.color}} title={`${m.title} · p.${(pos+1).toFixed(1)} · drag to move; Enter to edit`}
        onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);setDrag({id:m.id,position:pos});dragRef.current={id:m.id,position:pos}}} onPointerMove={move} onPointerUp={commit} onPointerCancel={()=>setDrag(null)} onDoubleClick={()=>onEdit({kind:'marker',id:m.id})} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.stopPropagation();onEdit({kind:'marker',id:m.id});}if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const p=Math.max(0,Math.min(index.total,pos+(e.key==='ArrowLeft'?-.25:.25)));onUpdate({...doc,outlineMarkers:doc.outlineMarkers.map(x=>x.id===m.id?{...x,anchor:{page:p+1},startPage:p+1}:x)})}}}><span>{m.title}</span></button>})}
    </div></div>
  </div>;
}

export function StoryArc({document:doc,index,onUpdate,onEdit,onJump}:StoryToolsProps){
  const s=storySettings(doc.storyStructure),svg=useRef<SVGSVGElement>(null),[drag,setDrag]=useState<{id:string;x:number;y:number}|null>(null),latest=useRef(drag);latest.current=drag;
  const points=storyPoints(s,index),sorted=points.slice().sort((a,b)=>resolveAnchor(a.anchor,index)-resolveAnchor(b.anchor,index));
  const xy=(p:ArcPoint)=>({x:drag?.id===p.id?drag.x:resolveAnchor(p.anchor,index),y:drag?.id===p.id?drag.y:p.intensity});
  const path=sorted.map((p,i)=>{const v=xy(p);return `${i?'L':'M'} ${55+v.x/index.total*900} ${200-v.y/s.intensityMax*170}`}).join(' ');
  const commit=()=>{const v=latest.current;if(!v)return;const point=points.find(p=>p.id===v.id)!;const linked=point.sceneId?index.positions.get(point.sceneId):undefined;onUpdate({...doc,storyStructure:{...s,points:points.map(p=>p.id===v.id?{...p,anchor:linked!==undefined?{page:v.x+1,paragraphId:point.sceneId,offset:v.x-linked}:{page:v.x+1},intensity:v.y,template:false}:p)}});setDrag(null)};
  const move=(e:React.PointerEvent)=>{if(!latest.current || !svg.current)return;const matrix=svg.current.getScreenCTM();if(!matrix)return;const at=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());const x=Math.max(0,Math.min(index.total,(at.x-55)/900*index.total)),y=Math.max(0,Math.min(s.intensityMax,(200-at.y)/170*s.intensityMax));setDrag({...latest.current,x,y})};
  return <div className="dc-story-arc"><div className="dc-story-actions"><strong>{s.arcModel==='Three Act'?'Three-Act Structure':s.arcModel==='Freytag'?"Freytag’s Pyramid":s.arcModel==='Syd Field'?"Syd Field’s Paradigm":s.arcModel==='Five Act'?'Five-Act Structure':'Custom structure'}</strong><span>{points.every(p=>p.template)?'Editable template · no assessed tension values':points.some(p=>p.template)?'Writer values and editable template points':'Writer-specified tension'}</span><button onClick={()=>onEdit()}>Edit graph</button></div>
    <svg ref={svg} viewBox="0 0 1000 245" className="dc-story-graph" role="img" aria-label="Narrative tension graph" onPointerMove={move} onPointerUp={commit} onPointerCancel={()=>setDrag(null)}>
      {[0,.25,.5,.75,1].map(n=><g key={n}><line x1="55" x2="955" y1={200-n*170} y2={200-n*170} className="dc-story-grid"/><text x="45" y={204-n*170} textAnchor="end">{Math.round(n*s.intensityMax)}</text></g>)}
      <text transform="translate(13 130) rotate(-90)" textAnchor="middle">Intensity</text><path d={path} fill="none" stroke={s.displays.arc.color} strokeWidth="3" strokeDasharray={points.every(p=>p.template)?'7 4':undefined}/>
      {[0,.25,.5,.75,1].map(n=><text key={n} x={55+n*900} y="221" textAnchor="middle">p.{Math.min(index.total,1+Math.floor(n*index.total))}</text>)}
      {index.scenes.filter((_,i)=>i%Math.max(1,Math.ceil(index.scenes.length/12))===0).map((scene,i)=><g key={scene.id}><line x1={55+scene.start/index.total*900} x2={55+scene.start/index.total*900} y1="200" y2="205" className="dc-story-grid"/><text x={55+scene.start/index.total*900} y="239" textAnchor="middle"><title>{scene.heading}</title>#{index.scenes.indexOf(scene)+1}</text></g>)}
      {sorted.map(p=>{const v=xy(p);return <circle key={p.id} data-arc-point={p.id} cx={55+v.x/index.total*900} cy={200-v.y/s.intensityMax*170} r="7" fill={p.color} stroke="currentColor" strokeWidth="1.5" tabIndex={0} role="button" aria-label={`${p.label}, page ${(v.x+1).toFixed(1)}, intensity ${v.y.toFixed(0)}${p.template?', template':''}`}
        onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);const next={id:p.id,x:v.x,y:v.y};setDrag(next);latest.current=next}} onDoubleClick={()=>onEdit({kind:'point',id:p.id})}
        onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.stopPropagation();onEdit({kind:'point',id:p.id});return;}if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const n={id:p.id,x:Math.max(0,Math.min(index.total,v.x+(e.key==='ArrowLeft'?-.25:e.key==='ArrowRight'?.25:0))),y:Math.max(0,Math.min(s.intensityMax,v.y+(e.key==='ArrowDown'?-1:e.key==='ArrowUp'?1:0)))};latest.current=n;commit();}}><title>{p.label}{p.sceneId?' · '+(index.scenes.find(x=>x.id===p.sceneId)?.heading || 'Linked scene removed'):''}</title></circle>})}
      {!points.length && <text x="500" y="115" textAnchor="middle">Add a point to start a custom arc.</text>}
    </svg>
    <div className="dc-story-legend">{sorted.map(p=><button key={p.id} onClick={()=>p.sceneId?onJump(p.sceneId):onEdit({kind:'point',id:p.id})}><i style={{background:p.color}}/>{p.label}{p.template?' (template)':''}</button>)}</div>
  </div>;
}

function MarkerList({document:doc,index,onEdit,onJump}:StoryToolsProps){
  const items=doc.outlineMarkers.filter(m=>m.kind && m.kind!=='section' && m.visible!==false).slice().sort((a,b)=>markerPosition(a,index)-markerPosition(b,index));
  return <div className="dc-story-markers"><div className="dc-story-actions"><button onClick={()=>onEdit()}>Add act break or plot point</button><span>Positions follow linked scenes and paragraphs.</span></div>{items.length?items.map(m=><div className="dc-story-marker" key={m.id} style={{borderColor:m.color}}><button onClick={()=>onEdit({kind:'marker',id:m.id})}>{m.title}</button><span>p.{(markerPosition(m,index)+1).toFixed(1)}{m.anchor?.paragraphId&&!index.positions.has(m.anchor.paragraphId)?' · detached anchor':''}</span>{m.anchor?.paragraphId&&index.positions.has(m.anchor.paragraphId)&&<button onClick={()=>onJump(m.anchor!.paragraphId!)}>Go to script</button>}</div>):<p>No markers yet. Add your own or insert the editable three-act template in Settings.</p>}</div>;
}

function BeatStrip({document:doc,index,onUpdate,onEdit,onJump}:StoryToolsProps){
  const s=storySettings(doc.storyStructure),[moving,setMoving]=useState<string|null>(null),beats=useMemo(()=>orderedBeats(doc.beats,index),[doc.beats,index]);
  const filter=s.beatFilter.toLowerCase(),shown=beats.filter(b=>!filter || [b.storyline,...b.tags,b.characterId,doc.characterMemory?.find(c=>c.id===b.characterId)?.name].some(v=>v?.toLowerCase().includes(filter)));
  const groups=new Map<string,BeatCard[]>();for(const b of shown){const key=b.act+'|'+(b.sequenceId || 'unsequenced');groups.set(key,[...(groups.get(key) || []),b])}
  const reorder=(target:string)=>{if(!moving || moving===target)return;const from=doc.beats.find(b=>b.id===moving),to=doc.beats.find(b=>b.id===target);if(from?.sceneId || to?.sceneId)return;const ids=beats.map(b=>b.id).filter(id=>id!==moving);ids.splice(ids.indexOf(target),0,moving);onUpdate({...doc,beats:doc.beats.map(b=>({...b,stripOrder:ids.indexOf(b.id)}))});setMoving(null)};
  return <div className="dc-story-beats"><div className="dc-story-actions"><button onClick={()=>onEdit()}>Add beat or sequence</button><label>Filter <input aria-label="Beat Sheet Filter" placeholder="Character or storyline" value={s.beatFilter} onChange={e=>onUpdate({...doc,storyStructure:{...s,beatFilter:e.target.value}})}/></label><span>Shared with Beat Board · dragging unlinked beats changes planning order.</span></div><div className="dc-story-beat-scroll">{[...groups].map(([key,items])=>{const sequenceId=key.slice(key.indexOf('|')+1),sequence=doc.outlineMarkers.find(m=>m.id===sequenceId),collapsed=s.collapsedSequences.includes(key),linked=items.flatMap(b=>{const scene=index.scenes.find(s=>s.id===b.sceneId);return scene?[scene]:[]});const length=linked.length?Math.max(...linked.map(x=>x.end))-Math.min(...linked.map(x=>x.start)):sequence?sequence.endPage-sequence.startPage+1:null;return <section key={key} className="dc-story-sequence"><header><button aria-label={`${collapsed?'Expand':'Collapse'} sequence ${sequence?.title || 'Unsequenced beats'}`} onClick={()=>onUpdate({...doc,storyStructure:{...s,collapsedSequences:collapsed?s.collapsedSequences.filter(id=>id!==key):[...s.collapsedSequences,key]}})}>{collapsed?'▸':'▾'} Act {items[0].act} · {sequence?.title || 'Unsequenced beats'}</button><span>{length===null?'Unlinked':length.toFixed(1)+' pages'}</span>{sequence && <button onClick={()=>onEdit({kind:'marker',id:key})}>Edit sequence</button>}</header>{!collapsed&&<div className="dc-story-beat-row">{items.map(b=>{const scene=index.scenes.find(s=>s.id===b.sceneId);return <article key={b.id} data-strip-beat={b.id} draggable={!b.sceneId} onDragStart={()=>setMoving(b.id)} onDragEnd={()=>setMoving(null)} onDragOver={e=>{if(moving && !b.sceneId)e.preventDefault()}} onDrop={()=>reorder(b.id)} style={{borderColor:b.color}}><div><span style={{color:b.color}}>Act {b.act}</span>{scene && <button onClick={()=>onJump(scene.id)}>p.{scene.startPage}–{scene.endPage}</button>}</div><button className="dc-story-beat-title" onClick={()=>onEdit({kind:'beat',id:b.id})}>{b.title}</button><p>{b.description}</p><small>{b.storyline || b.tags.join(', ')}{b.sceneId&&!scene?' · Linked scene removed':''}</small>{b.notes&&<p className="dc-story-beat-note">{b.notes}</p>}<button onClick={()=>onEdit({kind:'beat',id:b.id})}>Edit beat</button></article>})}</div>}</section>})}{!shown.length&&<p>{doc.beats.length?'No beats match this filter.':'Add beats here or on the existing Beat Board.'}</p>}</div></div>;
}
