import type {Paragraph,ScriptDocument} from '../types/script';
import {baseFormat,styleFor,paragraphGap,fontStack,type WritingFormat,type ElementStyle} from '../formats/model';
import type {PageLock,StudioState,Anchor} from './model';

/** `trail`: whitespace at the end of the line that hangs past the right edge (as in the editor's pre-wrap textarea);
 * it belongs to this line's source range but is not drawn. */
export interface MeasuredLine {start:number;end:number;text:string;width:number;first:boolean;trail?:number}
export interface LayoutFragment {paragraphId:string;start:number;end:number;lines:MeasuredLine[];x:number;y:number;width:number;height:number;style:ElementStyle;column?:1|2;imageHeight:number;imageId?:string}
export interface GeneratedLabel {paragraphId?:string;text:string;x:number;y:number;width:number;align:'left'|'right'|'center';kind:'more'|'continued'|'scene'|'omitted'|'resumed'}
export interface LayoutPage {pageNumber:number;pageLabel:string;id:string;paragraphs:Paragraph[];fragments:LayoutFragment[];labels:GeneratedLabel[];lineCount:number;usedHeight:number;capacity:number;omitted?:boolean;revisionSetIds?:string[];continuedCharacter?:string;more?:boolean}
export interface LayoutResult {pages:LayoutPage[];format:WritingFormat;measured:boolean;paragraphPages:Map<string,string[]>}
export type MeasureText=(text:string,style:ElementStyle,paragraph:Paragraph,start:number)=>number;
const DEFAULT=baseFormat();
export const DEFAULT_LAYOUT_FORMAT=DEFAULT;
let context:CanvasRenderingContext2D|null|undefined;
let lastCanvasFont='';const styleIds=new WeakMap<ElementStyle,number>();let nextStyleId=0;const styleIdentity=(s:ElementStyle)=>{let id=styleIds.get(s);if(!id){id=++nextStyleId;styleIds.set(s,id);}return id;};const fragmentCache=new WeakMap<Paragraph,Map<string,LayoutFragment>>();
export function browserMeasure(text:string,s:ElementStyle,p:Paragraph,start:number):number {
 if(context===undefined)context=typeof document==='undefined'?null:document.createElement('canvas').getContext('2d');
 if(!context)return [...text].reduce((n,c)=>n+s.size*(/[\u2e80-\u9fff]/u.test(c)?1:.6),0);
 const measure=(value:string,bold:boolean,italic:boolean)=>{const font=`${italic?'italic ':''}${bold?'700':'400'} ${s.size*96/72}px ${fontStack(s.font)}`;if(font!==lastCanvasFont){context!.font=font;lastCanvasFont=font;}return context!.measureText(s.caps?value.toLocaleUpperCase():value).width*72/96;};
 if(!p.runs?.length)return measure(text,s.bold,s.italic);
 let offset=0,width=0;for(const run of p.runs){const end=offset+run.text.length,a=Math.max(start,offset),b=Math.min(start+text.length,end);if(b>a)width+=measure(text.slice(a-start,b-start),!!(s.bold||run.style?.bold),!!(s.italic||run.style?.italic));offset=end;}
 if(offset<start+text.length)width+=measure(text.slice(Math.max(0,offset-start)),s.bold,s.italic);
 return width;
}
// Emoji (1.17). Browsers may break a line before or after an emoji even when no space is there ("wow😀wow"), following
// the Unicode line-breaking rules. A word that contains emoji is therefore split at those break opportunities, using the
// same ICU line breaker the renderer uses (Intl.v8BreakIterator in Chromium/Electron). Without it (Node), the split
// falls back to: before and after each emoji, except before closing punctuation and after opening punctuation. Words
// without emoji are untouched, so documents without emoji paginate exactly as before.
const EMOJI=/[\p{Extended_Pictographic}\p{Regional_Indicator}]/u;
type LineBreaker={adoptText(text:string):void;first():number;next():number};
let lineBreaker:LineBreaker|null|undefined;
export function emojiBreakParts(token:string):string[]{
 if(lineBreaker===undefined){const B=(Intl as unknown as {v8BreakIterator?:new(locales:string[],options:{type:string})=>LineBreaker}).v8BreakIterator;try{lineBreaker=typeof B==='function'?new B(['en'],{type:'line'}):null;}catch{lineBreaker=null;}}
 if(lineBreaker){lineBreaker.adoptText(token);const parts:string[]=[];let from=lineBreaker.first(),to:number;while((to=lineBreaker.next())!==-1){if(to>from)parts.push(token.slice(from,to));from=to;}return parts.length?parts:[token];}
 const segmenter=typeof Intl.Segmenter==='function'?new Intl.Segmenter(undefined,{granularity:'grapheme'}):null;
 const glyphs=segmenter?[...segmenter.segment(token)].map(v=>v.segment):[...token],parts:string[]=[];let part='',wasEmoji=false;
 for(const g of glyphs){const emoji=EMOJI.test(g),closing=/^[)\]}.,!?;:…'"”’»%]/u.test(g),opening=/[(\[{“‘«$#]$/u.test(part);
  if(part&&(emoji||wasEmoji)&&!closing&&!opening){parts.push(part);part='';}part+=g;wasEmoji=emoji;}
 if(part)parts.push(part);return parts;
}
const hasEmoji=(token:string)=>{for(let i=0;i<token.length;i++)if(token.charCodeAt(i)>0x7f)return EMOJI.test(token);return false;};
const lineCache=new WeakMap<Paragraph,Map<string,MeasuredLine[]>>();
let fontEpoch=0;
export function invalidateLayoutFonts(){fontEpoch++;}
export function measureLines(p:Paragraph,s:ElementStyle,width:number,start=0,end=p.text.length,measure:MeasureText=browserMeasure):MeasuredLine[]{
 const key=`${styleIdentity(s)}|${width}|${start}|${end}|${fontEpoch}`;let cache=lineCache.get(p);if(!cache){cache=new Map();lineCache.set(p,cache);}if(measure===browserMeasure&&cache.has(key))return cache.get(key)!;
 const lines:MeasuredLine[]=[];let at=start,lineStart=start,line='',w=0,first=start===0,trail=0;const available=()=>Math.max(s.size,width-(first?s.first*72:0));
 const push=()=>{const text=line.replace(/\n$/u,'');lines.push({start:lineStart,end:at,text:trail?text.slice(0,text.length-trail):text,width:w,first,...(trail?{trail}:{})});lineStart=at;line='';w=0;first=false;trail=0;};
 const source=p.text.slice(start,end),words=source.match(/[^\S\n]+|\n|[^\s]+/gu)||[],tokens=words.some(hasEmoji)?words.flatMap(w=>hasEmoji(w)?emojiBreakParts(w):[w]):words;
 for(const token of tokens){if(token==='\n'){line+='\n';at++;push();continue;}let tw=measure(token,s,p,at);
  // Spaces that do not fit hang at the end of the line (CSS pre-wrap, which the editor uses), so the next line starts
  // with the next word instead of a space. 1.15.3 moved them to the next line: the printed line was indented by a
  // character and could wrap differently from the editor.
  const c=token.charCodeAt(0),space=c===32||c===9||(c<33||c>127)&&/^\s/u.test(token);/* tokens are whitespace runs or non-space runs; '\n' is handled above */if(space&&line&&(trail||w+tw>available()+.01)){line+=token;at+=token.length;trail+=token.length;continue;}
  if(trail){push();tw=measure(token,s,p,at);}
  if(line&&w+tw>available()+.01){push();tw=measure(token,s,p,at);}if(tw<=available()+.01){line+=token;at+=token.length;w+=tw;continue;}
  const segmenter=typeof Intl.Segmenter==='function'?new Intl.Segmenter(undefined,{granularity:'grapheme'}):null;
  const glyphs=segmenter?[...segmenter.segment(token)].map(v=>v.segment):[...token];
  for(const glyph of glyphs){let gw=measure(glyph,s,p,at);if(line&&w+gw>available()+.01)push();line+=glyph;at+=glyph.length;w+=gw;}
 }
 if(line||!lines.length)push();
 if(measure===browserMeasure){if(cache.size>12)cache.clear();cache.set(key,lines);}return lines;
}
function letters(n:number){let value='';for(n++;n>0;n=Math.floor((n-1)/26))value=String.fromCharCode(65+(n-1)%26)+value;return value;}
export function insertedLabel(base:string,n:number){return base+letters(n);}
// Incremental layout. Layout is a pure function of the paragraphs it reads, so:
// * a run can RESUME at a page that started before the first edited paragraph, provided nothing laid out before that
//   page looked at the edited paragraph (keep-with-next and dual dialogue look ahead: the run's read horizon);
// * a run can STOP early (converge) at a page whose starting state equals a page start of the previous run, when every
//   paragraph from there on is unchanged and nothing laid out from there looked back into the edited part (cue
//   lookups for (CONT'D) and resumed speakers look back: the per-paragraph lowest index read). The previous run's
//   remaining pages are then exactly what a full run would produce, and are reused as they are.
// Each run records a checkpoint when it first works on a page. Results equal a full run: verified by
// verification/layout-incremental.test.ts (random edits, dual dialogue, page locks).
interface LayoutCheckpoint {i:number;pageIndex:number;used:number;base:string;inserted:number;flowId:number;sceneOmitted:boolean;allocated:string[];horizon:number;cur:LayoutPage}
interface LayoutRun {paragraphs:Paragraph[];format:WritingFormat;stateKey:string;epoch:number;pages:LayoutPage[];checkpoints:LayoutCheckpoint[];minAt:number[];finalLabelSource?:string}
let lastRun:LayoutRun|null=null;
const SPOKEN=new Set<string>(['Dialogue','Dual Dialogue','Parenthetical']);
/** Forget the previous run (tests compare incremental and full layouts). */
export function resetLayoutReuse(){lastRun=null;}
/** Where the latest run started laying out (0 for a full run). */
export const layoutReuseStats={startIndex:0,reusedPages:0,reusedTail:0};
const copyPage=(pg:LayoutPage,keepOmitted=true):LayoutPage=>({...pg,fragments:pg.fragments.slice(),labels:keepOmitted?pg.labels.slice():pg.labels.filter(l=>l.kind!=='omitted'),paragraphs:pg.paragraphs.slice()});
export function layoutScript(paragraphs:Paragraph[],format:WritingFormat=DEFAULT,state?:StudioState,measure:MeasureText=browserMeasure):LayoutResult {
 const f=format||DEFAULT,capacity=Math.max(12,(f.page.height-f.page.top-f.page.bottom)*72),contentWidth=(f.page.width-f.page.left-f.page.right)*72,pages:LayoutPage[]=[];
 const locks=state?.pageLocks||[],byParagraph=new Map<string,PageLock[]>();for(const lock of locks)for(const anchor of [lock.anchor,...(lock.companionAnchors||[])]){const list=byParagraph.get(anchor.paragraphId)||[];list.push({...lock,anchor});byParagraph.set(anchor.paragraphId,list);}for(const list of byParagraph.values())list.sort((a,b)=>a.anchor.offset-b.anchor.offset||a.level-b.level);
 const continuation=state?.continuations||{more:'(MORE)',continued:"(CONT'D)",sceneTop:'CONTINUED:',sceneBottom:'(CONTINUED)',sceneEnabled:false};
 let current:LayoutPage,used=0,base='',inserted=0,flowId=0,labelSource:string|undefined;let allocatedLabels=new Set(locks.map(l=>l.label));
 const page=(label?:string,id?:string,omitted=false)=>{const number=pages.length+1;const result:LayoutPage={pageNumber:number,pageLabel:label||(!base?String(number):(()=>{let value;do{value=insertedLabel(base,inserted++);}while(allocatedLabels.has(value));allocatedLabels.add(value);return value;})()),id:id||'flow:'+(++flowId),paragraphs:[],fragments:[],labels:[],lineCount:0,usedHeight:0,capacity,omitted};pages.push(result);return result;};
 let sceneOmitted=false,startIndex=0,horizon=-1;const reuse=measure===browserMeasure,checkpoints:LayoutCheckpoint[]=[];
 // Layout reads only the page locks and continuation settings of the production state (which is rebuilt on every edit).
 const stateKey=reuse?JSON.stringify([state?.pageLocks||null,state?.continuations||null]):'';
 const prev=reuse&&lastRun&&lastRun.format===f&&lastRun.stateKey===stateKey&&lastRun.epoch===fontEpoch?lastRun:null;let resumed:LayoutCheckpoint|undefined;
 const minAt:number[]=new Array(paragraphs.length);let iterMin=0;
 // Unchanged tail of the script (new index suffixStart onward equals the previous run's paragraphs shifted by delta).
 const delta=prev?paragraphs.length-prev.paragraphs.length:0;let suffixStart=paragraphs.length;
 if(prev){let d=0;const n=Math.min(paragraphs.length,prev.paragraphs.length);while(d<n&&paragraphs[d]===prev.paragraphs[d])d++;
  for(let k=prev.checkpoints.length-1;k>=0;k--){const c=prev.checkpoints[k];if(c.i>0&&c.i<=d&&c.horizon<d){resumed=c;break;}}
  while(suffixStart>d&&suffixStart-1-delta>=0&&paragraphs[suffixStart-1]===prev.paragraphs[suffixStart-1-delta])suffixStart--;}
 let prevSuffixMin:Int32Array|null=null,prevByIndex:Map<number,LayoutCheckpoint>|null=null;
 const converges=(i:number):LayoutCheckpoint|undefined=>{
  if(!prev||i<suffixStart)return;if(!prevByIndex){prevByIndex=new Map(prev.checkpoints.map(c=>[c.i,c]));prevSuffixMin=new Int32Array(prev.paragraphs.length+1).fill(2147483647);for(let k=prev.paragraphs.length-1;k>=0;k--)prevSuffixMin[k]=Math.min(prev.minAt[k]??k,prevSuffixMin[k+1]);}
  const old=prevByIndex.get(i-delta);if(!old||old.pageIndex!==pages.length-1||prevSuffixMin![old.i]<suffixStart-delta)return;
  if(old.used!==used||old.base!==base||old.inserted!==inserted||old.flowId!==flowId||old.sceneOmitted!==sceneOmitted||old.allocated.length!==allocatedLabels.size||old.allocated.some(v=>!allocatedLabels.has(v)))return;
  const a=old.cur,b=current;if(a.pageLabel!==b.pageLabel||a.id!==b.id||!!a.omitted!==!!b.omitted||!!a.more!==!!b.more||a.continuedCharacter!==b.continuedCharacter||a.lineCount!==b.lineCount||a.usedHeight!==b.usedHeight||String(a.revisionSetIds)!==String(b.revisionSetIds))return;
  if(a.fragments.length!==b.fragments.length||a.fragments.some((x,n)=>x!==b.fragments[n])||a.paragraphs.length!==b.paragraphs.length||a.paragraphs.some((x,n)=>x!==b.paragraphs[n])||JSON.stringify(a.labels)!==JSON.stringify(b.labels))return;
  return old;
 };
 if(resumed){for(let k=0;k<resumed.pageIndex;k++){const pg=prev!.pages[k];pages.push(pg.omitted&&!pg.fragments.length?copyPage(pg,false):pg);}current=copyPage(resumed.cur);pages.push(current);
  for(let k=0;k<resumed.i;k++)minAt[k]=prev!.minAt[k];
  used=resumed.used;base=resumed.base;inserted=resumed.inserted;flowId=resumed.flowId;sceneOmitted=resumed.sceneOmitted;allocatedLabels=new Set(resumed.allocated);horizon=resumed.horizon;startIndex=resumed.i;
  for(const c of prev!.checkpoints){if(c.i>=resumed.i)break;checkpoints.push(c);}}
 else current=page();
 if(reuse){layoutReuseStats.startIndex=startIndex;layoutReuseStats.reusedPages=resumed?resumed.pageIndex:0;layoutReuseStats.reusedTail=0;}
 const nextPage=()=>{current=page();used=0;};
 const setLock=(lock:PageLock)=>{if(current.id==='lock:'+lock.id){base=lock.label;inserted=0;return;}if(current.fragments.length||current.id.startsWith('lock:')){if(!current.fragments.length&&current.id.startsWith('lock:'))current.omitted=true;current=page(lock.label,'lock:'+lock.id,lock.omitted);used=0;}else {current.pageLabel=lock.label;current.id='lock:'+lock.id;current.omitted=lock.omitted;}current.revisionSetIds=lock.revisionSetIds;base=lock.label;inserted=0;};
 const cueFor=(at:number)=>{for(let j=at-1;j>=0;j--){if(j<iterMin)iterMin=j;const p=paragraphs[j];if(p.type==='Character')return p.text;if(!['Dialogue','Dual Dialogue','Parenthetical'].includes(p.type))break;}return '';};
 const add=(p:Paragraph,lines:MeasuredLine[],x:number,y:number,width:number,s:ElementStyle,column?:1|2,imageHeight=0)=>{if(!current.paragraphs.includes(p))current.paragraphs.push(p);const fragment:LayoutFragment={paragraphId:p.id,start:lines[0]?.start||0,end:lines.at(-1)?.end||0,lines,x,y,width,height:lines.length*s.line+imageHeight,style:s,column,imageHeight};let retained=fragment;if(!imageHeight){let cache=fragmentCache.get(p);if(!cache){cache=new Map();fragmentCache.set(p,cache);}const key=`${fontEpoch}|${styleIdentity(s)}|${x}|${y}|${width}|${fragment.start}|${fragment.end}|${column}`;retained=cache.get(key)||fragment;if(cache.size>256)cache.clear();cache.set(key,retained);}current.fragments.push(retained);current.lineCount+=lines.length;current.usedHeight=Math.max(current.usedHeight,y+lines.length*s.line+imageHeight);};
 const label=(page:LayoutPage,text:string,x:number,y:number,width:number,kind:GeneratedLabel['kind'],align:GeneratedLabel['align']='right')=>{page.labels.push({text,x,y,width,kind,align,paragraphId:labelSource});if(kind==='more')page.more=true;if(kind==='continued')page.continuedCharacter=text;};
 // Continuation cues follow the Character element's position (Final Draft places
 // (MORE) and "NAME (CONT'D)" at the character indent, not over the dialogue).
 const cueStyle=styleFor(f,{id:'',type:'Character',text:''} as Paragraph),cueX=cueStyle.left*72,cueWidth=Math.max(cueStyle.size,contentWidth-cueStyle.left*72-cueStyle.right*72),cueAlign:GeneratedLabel['align']=cueStyle.align==='center'?'center':cueStyle.align==='right'?'right':'left';
 // Automatic character continueds: the same speaker resumes after action within a scene.
 const speaker=(text:string)=>text.replace(/\s*\([^)]*\)/gu,'').trim().toLocaleUpperCase();
 const resumes=(at:number)=>{const p=paragraphs[at];if(p.type!=='Character'||p.dualGroupId||/CONT['\u2019]?D|CONTINUED/iu.test(p.text))return false;const name=speaker(p.text);if(!name)return false;let interrupted=false;for(let j=at-1;j>=0;j--){if(j<iterMin)iterMin=j;const q=paragraphs[j];if(['Scene Heading','Transition','New Act','End of Act'].includes(q.type))return false;if(q.type==='Character')return interrupted&&!q.dualGroupId&&speaker(q.text)===name;if(['Dialogue','Dual Dialogue','Parenthetical'].includes(q.type)){if(q.dualGroupId)return false;continue;}if(q.text.trim()||q.images?.length)interrupted=true;}return false;};
 let checkpointPage:LayoutPage|null=null,converged:LayoutCheckpoint|undefined,convergedAt=-1,lastIteration=-1;
 for(let i=startIndex;i<paragraphs.length;i++){
  if(reuse&&current!==checkpointPage&&current===pages[pages.length-1]){checkpointPage=current;
   const old=converges(i);if(old){converged=old;convergedAt=i;break;}
   checkpoints.push({i,pageIndex:pages.length-1,used,base,inserted,flowId,sceneOmitted,allocated:[...allocatedLabels],horizon,cur:copyPage(current)});}
  if(lastIteration>=0)minAt[lastIteration]=Math.min(minAt[lastIteration]??lastIteration,iterMin);
  lastIteration=i;iterMin=i>0?i-1:0;
  if(i>horizon)horizon=i;
  const p=paragraphs[i];labelSource=p.id;if(p.type==='Scene Heading')sceneOmitted=!!p.omitted;
  if(sceneOmitted&&p.type!=='Scene Heading'){for(const lock of byParagraph.get(p.id)||[]){setLock(lock);if(!current.fragments.length)current.omitted=true;}continue;}
  if(p.dualGroupId&&p.dualColumn===1){
   let groupEnd=i;while(groupEnd<paragraphs.length&&paragraphs[groupEnd].dualGroupId===p.dualGroupId)groupEnd++;horizon=Math.max(horizon,Math.min(groupEnd,paragraphs.length-1));
   const group=paragraphs.slice(i,groupEnd);
   if(group.some(v=>v.dualColumn===2)){
    const gap=18,colWidth=(contentWidth-gap)/2;
    const groupLocks=group.flatMap(v=>byParagraph.get(v.id)||[]);
    for(const lock of byParagraph.get(p.id)||[])if(lock.anchor.offset===0)setLock(lock);
    const required=Math.max(...([1,2] as const).map(column=>{let height=0,previous=paragraphs[i-1];for(const v of group.filter(v=>v.dualColumn===column)){const st=styleFor(f,v);height+=paragraphGap(previous,v,f,!current.fragments.length)+st.line*Math.min(measureLines(v,{...st,first:0},colWidth,0,v.text.length,measure).length,['Dialogue','Dual Dialogue'].includes(v.type)?2:99);previous=v;if(['Dialogue','Dual Dialogue'].includes(v.type))break;}return height;}));
    if(current.fragments.length&&used+Math.min(capacity,required)>capacity)nextPage();
    const startingPage=current,startUsed=used;const endings:{page:LayoutPage;y:number}[]=[];
    const restoreBase=()=>{base='';inserted=0;for(let j=0;j<=pages.indexOf(current);j++)if(pages[j].id.startsWith('lock:'))base=pages[j].pageLabel;};
    const advance=()=>{
     const at=pages.indexOf(current),next=pages[at+1];restoreBase();
     if(next?.id.startsWith('lock:')){const extra=page();pages.pop();pages.splice(at+1,0,extra);pages.forEach((pg,n)=>pg.pageNumber=n+1);current=extra;}
     else current=next||page();
     used=0;
    };
    const activate=(lock:PageLock)=>{const existing=pages.find(pg=>pg.id==='lock:'+lock.id);if(existing){current=existing;used=0;base=lock.label;inserted=0;}else setLock(lock);};
    for(const column of [1,2] as const){
     current=startingPage;used=startUsed;restoreBase();
     const list=group.filter(v=>v.dualColumn===column),cue=list.find(v=>v.type==='Character')?.text||'',x=(column-1)*(colWidth+gap);
     let previous=paragraphs[i-1];const continued=()=>{if(cue&&f.continuations.continued){label(current,cue+' '+continuation.continued,x,used,colWidth,'continued','center');used+=styleFor(f,list[0]).line;}};
     for(const v of list){
      labelSource=v.id;const st=styleFor(f,v),s={...st,left:0,right:0,first:0,align:v.type==='Character'?'center' as const:'left' as const};
      const events=groupLocks.filter(l=>l.anchor.paragraphId===v.id),cuts=[...new Set([0,...events.map(l=>Math.max(0,Math.min(v.text.length,l.anchor.offset))),v.text.length])].sort((a,b)=>a-b);if(cuts.length===1)cuts.push(cuts[0]);
      for(let segment=0;segment<cuts.length-1;segment++){
       const start=cuts[segment],end=cuts[segment+1];
       for(const lock of events.filter(l=>l.anchor.offset===start)){activate(lock);if(start>0||v.type!=='Character')continued();}
       if(segment===0)used+=paragraphGap(previous,v,f,used===0);
       const lines=measureLines(v,s,colWidth,start,end,measure);let at=0;
       while(at<lines.length){
        const spoken=['Dialogue','Dual Dialogue','Parenthetical'].includes(v.type),reserve=spoken&&f.continuations.more?s.line:0;
        const room=Math.floor((capacity-used)/s.line),rest=lines.length-at;let count=room>=rest?rest:Math.floor((capacity-used-reserve)/s.line);
        if(count<1){advance();if(spoken)continued();count=Math.max(1,Math.floor((capacity-used-reserve)/s.line));}
        count=Math.min(count,lines.length-at);add(v,lines.slice(at,at+count),x,used,colWidth,s,column);used+=count*s.line;at+=count;
        if(at<lines.length){if(spoken&&f.continuations.more)label(current,continuation.more,x,capacity-s.line,colWidth,'more');advance();if(spoken)continued();}
       }
       if(segment<cuts.length-2&&['Dialogue','Dual Dialogue','Parenthetical'].includes(v.type)&&f.continuations.more)label(current,continuation.more,x,capacity-s.line,colWidth,'more');
      }
      for(const image of v.images||[]){const scale=Math.min(1,colWidth/image.width,capacity/image.height),h=image.height*scale;if(used+h>capacity)advance();add(v,[],x,used,colWidth,s,column,h);current.fragments.at(-1)!.imageId=image.id;used+=h;}
      previous=v;
     }
     endings.push({page:current,y:used});
    }
    const endIndex=Math.max(...endings.map(v=>pages.indexOf(v.page)));current=pages[endIndex];used=Math.max(...endings.filter(v=>v.page===current).map(v=>v.y));restoreBase();i=groupEnd-1;continue;
   }
  }
  const st=styleFor(f,p),s=sceneOmitted?{...st}:st,width=Math.max(s.size,(contentWidth-s.left*72-s.right*72)),locksHere=byParagraph.get(p.id)||[];
  const segments=locksHere.length?[0,...locksHere.map(l=>Math.max(0,Math.min(p.text.length,l.anchor.offset))),p.text.length].filter((v,n,a)=>n===0||v!==a[n-1]):[0,p.text.length];if(segments.length===1)segments.push(segments[0]);
  let started=false;const resumed=!sceneOmitted&&f.continuations.continued&&resumes(i);
  for(let seg=0;seg<segments.length-1;seg++){
   const start=segments[seg],end=segments[seg+1];if(locksHere.length)for(const lock of locksHere.filter(l=>l.anchor.offset===start))setLock(lock);
   const display=sceneOmitted?{...p,text:`SCENE ${p.sceneNumber||''} — OMITTED`,runs:undefined}:p;
   const measured=measureLines(display,s,width,start,sceneOmitted?display.text.length:end,measure);const lines=sceneOmitted?measured.map((line,index)=>({...line,start:index===0?0:line.start,end:index===measured.length-1?p.text.length:line.end})):measured;
   if(!started){let required=paragraphGap(paragraphs[i-1],p,f,!current.fragments.length)+s.line*Math.min(lines.length,2);
    if(s.keepNext){let j=i;while(j<paragraphs.length-1&&styleFor(f,paragraphs[j]).keepNext){j++;if(j>horizon)horizon=j;const q=paragraphs[j],qs=styleFor(f,q);const qLines=measureLines(q,qs,Math.max(qs.size,contentWidth-(qs.left+qs.right)*72),0,q.text.length,measure).length;required+=paragraphGap(paragraphs[j-1],q,f)+qs.line*Math.min(qLines,qs.keepNext?99:2)+(!qs.keepNext&&qLines>2&&f.continuations.more&&['Dialogue','Dual Dialogue','Parenthetical'].includes(q.type)?qs.line:0);}}
    if(current.fragments.length&&(p.pageBreakBefore||s.breakBefore||used+Math.min(capacity,required)>capacity))nextPage();
    used+=paragraphGap(paragraphs[i-1],p,f,!current.fragments.length);started=true;
   }
   let at=0;while(at<lines.length){const spoken=SPOKEN.has(p.type),reserve=spoken&&f.continuations.more?s.line:0;const room=Math.floor((capacity-used)/s.line),rest=lines.length-at;let count=room>=rest?rest:Math.floor((capacity-used-reserve)/s.line);
    if(count<1){nextPage();const cue=spoken?cueFor(i):'';if(cue&&f.continuations.continued){label(current,cue+' '+continuation.continued,cueX,0,cueWidth,'continued',cueAlign);used=s.line;}count=Math.max(1,Math.floor((capacity-used-reserve)/s.line));}
    count=Math.min(count,lines.length-at);
    // Widow control: never carry a single line of a split element to the next page.
    if(lines.length-at-count===1&&count>2)count--;
    if(resumed&&seg===0&&at===0&&s.align!=='right'){const first=lines[0],name=first.text.replace(/\s+$/u,''),nameWidth=measure(name,s,p,first.start),space=measure(' ',s,p,first.start),x=s.align==='center'?s.left*72+(width+nameWidth)/2+space:s.left*72+s.first*72+nameWidth+space;label(current,continuation.continued,x,used,Math.max(s.size,contentWidth-x),'resumed','left');}
    add(p,lines.slice(at,at+count),s.left*72,used,width,s);used+=count*s.line;at+=count;
    if(at<lines.length){if(spoken&&f.continuations.more)label(current,continuation.more,cueX,capacity-s.line,cueWidth,'more',cueAlign);else if(continuation.sceneEnabled)label(current,continuation.sceneBottom,0,capacity-s.line,contentWidth,'scene');nextPage();const cue=spoken?cueFor(i):'';if(cue&&f.continuations.continued){label(current,cue+' '+continuation.continued,cueX,0,cueWidth,'continued',cueAlign);used=s.line;}else if(continuation.sceneEnabled){label(current,continuation.sceneTop,0,0,contentWidth,'scene','left');used=s.line;}}
   }
  }
  for(const image of p.images||[]){const h=image.height*Math.min(1,contentWidth/image.width,capacity/image.height);if(used+h>capacity)nextPage();add(p,[],0,used,contentWidth,s,undefined,h);current.fragments.at(-1)!.imageId=image.id;used+=h;}
 }
 if(lastIteration>=0&&!converged)minAt[lastIteration]=Math.min(minAt[lastIteration]??lastIteration,iterMin);
 if(converged&&prev){
  // Stopped at a page start identical to the previous run's: its remaining pages are reused unchanged.
  if(lastIteration>=0)minAt[lastIteration]=Math.min(minAt[lastIteration]??lastIteration,iterMin);
  pages.length=converged.pageIndex;for(let k=converged.pageIndex;k<prev.pages.length;k++)pages.push(prev.pages[k]);
  for(const c of prev.checkpoints)if(c.i>=converged.i)checkpoints.push(delta?{...c,i:c.i+delta,horizon:c.horizon+delta}:c);
  for(let k=convergedAt;k<paragraphs.length;k++)minAt[k]=(prev.minAt[k-delta]??(k-delta))+delta;
  labelSource=prev.finalLabelSource;layoutReuseStats.reusedTail=prev.pages.length-converged.pageIndex;
 }
 for(const pg of pages){if(pg.omitted&&!pg.fragments.length&&!pg.labels.some(l=>l.kind==='omitted'))label(pg,'PAGE '+pg.pageLabel+' OMITTED',0,capacity/2,contentWidth,'omitted','center');}
 const paragraphPages=new Map<string,string[]>();for(const pg of pages)for(const p of pg.paragraphs){const list=paragraphPages.get(p.id)||[];list.push(pg.pageLabel);paragraphPages.set(p.id,list);}
 if(reuse)lastRun={paragraphs,format:f,stateKey,epoch:fontEpoch,pages,checkpoints,minAt,finalLabelSource:labelSource};
 return {pages,format:f,measured:measure!==browserMeasure||!!context,paragraphPages};
}
const documentCache=new WeakMap<ScriptDocument,{epoch:number;result:LayoutResult}>();
export function documentLayout(doc:ScriptDocument){const previous=documentCache.get(doc);if(previous?.epoch===fontEpoch)return previous.result;const result=layoutScript(doc.paragraphs,doc.writingFormat||DEFAULT,doc.studio);documentCache.set(doc,{epoch:fontEpoch,result});return result;}
export function lockLayout(doc:ScriptDocument,all=true):ScriptDocument {const result=documentLayout(doc),s=doc.studio;if(!s)throw Error('Initialize production metadata before locking.');const level=s.lockLevel+1;const existing=new Set(s.pageLocks.map(l=>l.label));const locks=result.pages.filter(p=>all||/[A-Z]$/u.test(p.pageLabel)).filter(p=>!existing.has(p.pageLabel)).map(p=>({id:crypto.randomUUID(),label:p.pageLabel,level,anchor:{paragraphId:p.fragments[0]?.paragraphId||doc.paragraphs[0]?.id,offset:p.fragments[0]?.start||0,bias:'after' as const},...(p.fragments[0]?.column?{companionAnchors:[1,2].filter(column=>column!==p.fragments[0].column).flatMap(column=>{const fr=p.fragments.find(fr=>fr.column===column);return fr?[{paragraphId:fr.paragraphId,offset:fr.start,bias:'after' as const}]:[];})}:{})}));return {...doc,lockedPages:true,studio:{...s,lockLevel:level,pageLocks:[...s.pageLocks,...locks]}};}
export function unlockLayout(doc:ScriptDocument,all=false):ScriptDocument {if(!doc.studio)return {...doc,lockedPages:false};const level=all?0:Math.max(0,doc.studio.lockLevel-1),locks=doc.studio.pageLocks.filter(l=>l.level<=level);return {...doc,lockedPages:locks.length>0,studio:{...doc.studio,lockLevel:level,pageLocks:locks}};}
export function pageAt(layout:LayoutResult,paragraphId:string,offset=0){return layout.pages.find(p=>p.fragments.some(f=>f.paragraphId===paragraphId&&offset>=f.start&&offset<=f.end));}
