import React,{useRef,useLayoutEffect} from 'react';
import type {LayoutFragment} from './layout';

const positionCache=new Map<string,{value:string;style:string;tops:Map<number,number>}>();
/** Every page fragment textarea of one paragraph, in document order. An attribute
 * selector avoids materializing and filtering every editor textarea per keystroke. */
const fragmentInputs=(id:string)=>[...document.querySelectorAll<HTMLTextAreaElement>(`textarea[data-editor-paragraph="${CSS.escape(id)}"]`)];

// Fragment positioning (which part of the paragraph a page fragment shows) is batched per commit. Measuring each
// textarea as it rendered interleaved DOM writes and layout reads, so a change that moved every page (Return near the
// start of a long script) forced one full layout per fragment. Now every fragment that changed in a commit is read
// first (one style and layout pass), measured in one persistent hidden element that is its own layout root, and then
// scrolled. Fragments on pages the browser is skipping (content-visibility: auto, far from the viewport) are positioned
// when their page comes near the viewport instead of forcing layout of pages nobody is looking at.
interface PositionJob{paragraphId:string;start:number;value:string}
const pending=new Map<HTMLTextAreaElement,PositionJob>();let scheduled=false;
const skippedPages=new WeakSet<Element>(),parked=new Map<Element,Map<HTMLTextAreaElement,PositionJob>>(),parkedAt=new WeakMap<HTMLTextAreaElement,Element>();
let ghost:HTMLDivElement|null=null,listening=false;
/** Mounted fragments and their latest job, so every one can be measured again when the screenplay font finishes
 * loading (a measurement made with the fallback font has different line breaks, and nothing else changes then). */
const mounted=new Map<HTMLTextAreaElement,{current:PositionJob}>();
function remeasureAll(){positionCache.clear();for(const [input,job] of mounted)if(input.isConnected)pending.set(input,job.current);if(pending.size&&!scheduled){scheduled=true;queueMicrotask(()=>flushPositions(false));}}
const FONT_KEYS=['font-family','font-size','font-weight','font-style','line-height','letter-spacing','word-spacing','word-break','overflow-wrap','text-indent','text-transform','text-align','box-sizing'];
// Parked fragments are positioned (a) when their page comes near the window (the content-visibility event), (b) before
// the next paint when any scroll brings their page near the window (a jump to a scene, a bookmark or a search result),
// and (c) in idle time, nearest pages first, so none stays out of date for long.
let idleHandle=0;
function flushParked(pages:Element[]){let any=false;for(const page of pages){const jobs=parked.get(page);parked.delete(page);if(!jobs)continue;for(const [input,job] of jobs)if(input.isConnected&&!pending.has(input)){pending.set(input,job);any=true;}}if(any)flushPositions(true);}
function nearViewport(page:Element,margin:number){const r=page.getBoundingClientRect();return r.bottom>=-margin&&r.top<=innerHeight+margin;}
function onScroll(e:Event){if(!parked.size||isFieldScroll(e))return;const near=[...parked.keys()].filter(page=>page.isConnected&&nearViewport(page,innerHeight));if(near.length)flushParked(near);}
function scheduleIdle(){if(idleHandle||!parked.size||typeof window==='undefined')return;const ric=window.requestIdleCallback?.bind(window)||((cb:IdleRequestCallback)=>window.setTimeout(()=>cb({didTimeout:true,timeRemaining:()=>0}),60));idleHandle=ric(runIdle,{timeout:1500});}
function runIdle(deadline:IdleDeadline){idleHandle=0;for(const page of [...parked.keys()])if(!page.isConnected)parked.delete(page);
 const vh=innerHeight,ordered=[...parked.keys()].map(page=>{const r=page.getBoundingClientRect();return {page,d:r.bottom<0?-r.bottom:r.top>vh?r.top-vh:0};}).sort((a,b)=>a.d-b.d);
 // Short slices (about 8 ms), so a key pressed meanwhile is not held up.
 let done=0;const started=performance.now();for(const {page} of ordered){if(done>0&&(deadline.didTimeout?done>=4:deadline.timeRemaining()<3||performance.now()-started>8))break;flushParked([page]);done++;}
 scheduleIdle();}
function listen(){if(listening||typeof document==='undefined')return;listening=true;
 document.addEventListener('scroll',onScroll,true);
 document.fonts?.addEventListener?.('loadingdone',remeasureAll);void document.fonts?.ready?.then(remeasureAll);
 document.addEventListener('contentvisibilityautostatechange',(e:Event)=>{const page=e.target as Element,skipped=(e as Event&{skipped?:boolean}).skipped;if(skipped){skippedPages.add(page);return;}skippedPages.delete(page);const jobs=parked.get(page);if(jobs){parked.delete(page);for(const [input,job] of jobs)if(!pending.has(input))pending.set(input,job);flushPositions(true);}},true);}
function schedule(input:HTMLTextAreaElement,job:PositionJob){listen();pending.set(input,job);if(!scheduled){scheduled=true;queueMicrotask(()=>flushPositions(false));}}
function measureGhost(){if(!ghost||!ghost.isConnected){ghost=document.createElement('div');ghost.setAttribute('aria-hidden','true');ghost.dataset.fragmentMeasure='';document.body.append(ghost);}return ghost;}
/** Positions the fragments scheduled so far, now (code that moves the caret or measures text first). */
export function flushFragmentPositions(){flushPositions(false);}
/** Positions every scheduled fragment. `force` positions fragments on skipped pages too (an explicit request). */
function flushPositions(force:boolean){
 scheduled=false;if(!pending.size)return;const jobs=[...pending];pending.clear();
 // 1. Reads only: which fragments to position now, their computed font and width.
 const now:{input:HTMLTextAreaElement;job:PositionJob;signature:string;font?:CSSStyleDeclaration;width:number}[]=[];
 for(const [input,job] of jobs){if(!input.isConnected)continue;const page=input.closest('.script-page');
  if(!force&&page&&skippedPages.has(page)){let map=parked.get(page);if(!map)parked.set(page,map=new Map());map.set(input,job);parkedAt.set(input,page);continue;}
  const at=parkedAt.get(input);if(at){parked.get(at)?.delete(input);parkedAt.delete(input);}
  if(job.start===0){now.push({input,job,signature:'',width:0});continue;}
  const font=getComputedStyle(input),width=input.clientWidth;now.push({input,job,font,width,signature:[font.font,font.lineHeight,font.textIndent,font.textTransform,width].join('|')});}
 // 2. Measure what the cache does not know, one paragraph text at a time, in the hidden layout root.
 const groups=new Map<string,typeof now>();
 for(const item of now){if(item.job.start===0)continue;const cached=positionCache.get(item.job.paragraphId);if(cached&&cached.value===item.job.value&&cached.style===item.signature&&cached.tops.has(item.job.start))continue;const key=item.job.paragraphId+'\u0000'+item.signature+'\u0000'+item.job.value;const list=groups.get(key);if(list)list.push(item);else groups.set(key,[item]);}
 if(groups.size){const box=measureGhost();
  for(const list of groups.values()){const {font,width,signature,job}=list[0],value=job.value;
   for(const key of FONT_KEYS)box.style.setProperty(key,font!.getPropertyValue(key));
   Object.assign(box.style,{position:'absolute',visibility:'hidden',left:'-100000px',top:'0',width:width+'px',height:'1px',contain:'strict',whiteSpace:'pre-wrap',overflowWrap:'break-word',padding:'0',border:'0',pointerEvents:'none'});
   box.textContent=value||'\u200b';const node=box.firstChild as Text,top=box.getBoundingClientRect().top;
   const previous=positionCache.get(job.paragraphId),tops=previous&&previous.value===value&&previous.style===signature?previous.tops:new Map<number,number>();
   for(const item of list){const offset=item.job.start;if(tops.has(offset))continue;
    // A page break usually falls on the space between two words. Browsers keep that space at the end of the
    // previous visual line, so measuring it would scroll the fragment one line too early (showing the previous
    // page's last line and hiding this fragment's last line). Measure the first visible character instead.
    let at=Math.min(offset,node.length);while(at<node.length&&/\s/.test(value[at]))at++;if(at>=node.length)at=Math.min(offset,node.length);
    const range=document.createRange();range.setStart(node,at);range.setEnd(node,Math.min(at+1,node.length));const rect=range.getClientRects()[0];tops.set(offset,rect?rect.top-top:0);}
   positionCache.set(job.paragraphId,{value,style:signature,tops});if(positionCache.size>600)positionCache.delete(positionCache.keys().next().value!);}
  box.textContent='';}
 // 3. Writes only.
 for(const item of now)item.input.scrollTop=item.job.start===0?0:positionCache.get(item.job.paragraphId)?.tops.get(item.job.start)||0;
 if(parked.size)scheduleIdle();
}

/** A visual page fragment still edits the complete semantic paragraph. Native
 * UTF-16 selection, input composition and clipboard behavior remain intact. */
export function FragmentTextarea({fragment,paragraphId,...props}:React.TextareaHTMLAttributes<HTMLTextAreaElement>&{fragment:LayoutFragment;paragraphId:string}) {
 const ref=useRef<HTMLTextAreaElement>(null),composing=useRef(false);
 const activate=(input:HTMLTextAreaElement)=>{
  const current=document.getElementById('input-'+paragraphId);if(current&&current!==input)current.id='fragment-'+paragraphId+'-'+current.getAttribute('data-fragment-start');input.id='input-'+paragraphId;
 };
 /** Schedules this fragment's positioning; `now` positions it before returning (selection and composition). */
 const position=(now=false)=>{const input=ref.current;if(!input)return;schedule(input,{paragraphId,start:fragment.start,value:String(props.value||'')});if(now)flushPositions(true);};
 const job=useRef<PositionJob>({paragraphId,start:fragment.start,value:''});job.current={paragraphId,start:fragment.start,value:String(props.value||'')};
 useLayoutEffect(()=>{const input=ref.current!;listen();mounted.set(input,job);return()=>{mounted.delete(input);};},[]);
 useLayoutEffect(()=>{const input=ref.current!;if(!document.getElementById('input-'+paragraphId))input.id='input-'+paragraphId;position();},[props.value,fragment.start,fragment.height,fragment.width]);
 const follow=(input:HTMLTextAreaElement)=>{if(composing.current)return;const start=input.selectionStart,end=input.selectionEnd;if(document.activeElement!==input){position(true);return;}if(start!==end){position(true);return;}if(start>=fragment.start&&start<=fragment.end){position(true);return;}const candidates=fragmentInputs(paragraphId);const target=candidates.find(v=>start>=Number(v.dataset.fragmentStart)&&start<Number(v.dataset.fragmentEnd))||candidates.at(-1);if(target&&target!==input&&(start<fragment.start||start>fragment.end)){activate(target);target.focus({preventScroll:true});target.setSelectionRange(start,end);target.scrollIntoView({block:'nearest'});}else position(true);};
 return <textarea {...props} ref={ref} id={'fragment-'+paragraphId+'-'+fragment.start} data-editor-paragraph={paragraphId} data-fragment-start={fragment.start} data-fragment-end={fragment.end}
  style={{...props.style,display:'block',paddingTop:0,paddingRight:0,paddingBottom:0,paddingLeft:0,width:'100%',height:fragment.lines.length*fragment.style.line+'pt',minHeight:fragment.style.line+'pt',maxHeight:fragment.lines.length*fragment.style.line+'pt',fieldSizing:'fixed' as any,overflow:'hidden'}}
  onFocus={e=>{const input=e.currentTarget;activate(input);if(input.selectionStart<input.selectionEnd||input.selectionStart>=fragment.start&&input.selectionStart<=fragment.end){}else input.setSelectionRange(fragment.start,fragment.start);props.onFocus?.(e);}}
  onSelect={e=>{props.onSelect?.(e);follow(e.currentTarget);}}
  onCompositionStart={e=>{composing.current=true;props.onCompositionStart?.(e);}}
  onCompositionEnd={e=>{composing.current=false;props.onCompositionEnd?.(e);position(true);}}
 />;
}
/** A page fragment scrolled inside itself (positioning, often in the background) rather than the page moving. Popups
 * anchored in the script ignore these, except for the field being edited, whose text really moves. */
export function isFieldScroll(e:Event){const t=e.target;return t instanceof HTMLTextAreaElement&&!!t.dataset.editorParagraph&&t!==document.activeElement;}
export function inputForOffset(id:string,offset:number){const active=document.getElementById('input-'+id) as HTMLTextAreaElement|null;if(active?.dataset.editorParagraph===id&&offset>=Number(active.dataset.fragmentStart)&&offset<=Number(active.dataset.fragmentEnd))return active;/* The focused fragment also owns its end (the caret at the end of the text): no document-wide query while typing. */const all=fragmentInputs(id);return all.find(v=>offset>=Number(v.dataset.fragmentStart)&&offset<Number(v.dataset.fragmentEnd))||all.at(-1)||document.getElementById('input-'+id) as HTMLTextAreaElement|null;}
