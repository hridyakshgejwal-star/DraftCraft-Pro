import type {Paragraph,ElementType,TextRun} from '../types/script';
import type {WritingFormat} from '../formats/model';
import type {EditorPreferences} from './preferences';
import {replaceRuns} from '../writing/wordSuggestions';

export type TextState={text:string;start:number;end:number;runs?:TextRun[]};
export type FormattingKind='heading'|'transition';
// Same vocabulary as inference.ts TRANSITION, so every recognized transition also gets its ending.
export const TRANSITIONS=['CUT TO','DISSOLVE TO','SMASH CUT TO','MATCH CUT TO','JUMP CUT TO','FLASH CUT TO','TIME CUT','WIPE TO','BACK TO','FADE IN','FADE OUT','FADE TO','FADE TO BLACK','INTERCUT'];
export const SCENE_TIMES=['MOMENTS LATER','SAME TIME','CONTINUOUS','AFTERNOON','MORNING','EVENING','NIGHT','DAWN','DUSK','LATER','DAY'];
const escape=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export function changedRange(before:string,after:string){
 let start=0;while(start<before.length&&start<after.length&&before[start]===after[start])start++;
 let end=before.length,to=after.length;while(end>start&&to>start&&before[end-1]===after[to-1]){end--;to--;}
 return {start,end,text:after.slice(start,to)};
}
export function typedState(p:Paragraph,text:string,start:number,end=start):TextState {
 const runs=p.runs?.map(r=>r.text).join('')===p.text?(p.text===text?p.runs:replaceRuns(p.runs,p.text,[changedRange(p.text,text)])):undefined;
 return {text,start,end,runs};
}
export function replaceState(s:TextState,start:number,end:number,text:string):TextState {
 const map=(n:number)=>n<start?n:n>end?n+text.length-(end-start):start+text.length;
 return {text:s.text.slice(0,start)+text+s.text.slice(end),start:map(s.start),end:map(s.end),runs:replaceRuns(s.runs,s.text,[{start,end,text}])};
}
export function upperState(s:TextState):TextState {
 return {...s,text:s.text.toLocaleUpperCase('en-US'),start:s.text.slice(0,s.start).toLocaleUpperCase('en-US').length,end:s.text.slice(0,s.end).toLocaleUpperCase('en-US').length,runs:s.runs?.map(r=>({...r,text:r.text.toLocaleUpperCase('en-US')}))};
}
export function formattingKey(kind:FormattingKind,text:string){return kind+':'+text.normalize('NFKC').toLocaleLowerCase('en-US').replace(/[^\p{L}\p{N}]+/gu,' ').trim().slice(0,400);}
export function formattingOmissions(p:Paragraph){return Array.isArray(p.automaticFormattingOmissions)?p.automaticFormattingOmissions.filter(v=>typeof v==='string').slice(-16):[];}
export function omitFormatting(p:Paragraph,key:string):Paragraph {return {...p,automaticFormattingOmissions:[...formattingOmissions(p).filter(v=>v!==key),key].slice(-16)};}
export function removedFormatting(p:Paragraph,text:string):string|null {
 const kind=p.type==='Scene Heading'?'heading':p.type==='Transition'?'transition':null;
 if(!kind||!text.trim()||formattingKey(kind,p.text)!==formattingKey(kind,text))return null;
 if((p.text.match(/[.\-–—:]/g)||[]).length>(text.match(/[.\-–—:]/g)||[]).length)return formattingKey(kind,text);
 return null;
}
// A bare prefix becomes structural only after its field delimiter or completion.
const INTRO=/^(INT\.?\s*\/\s*EXT\.?|EXT\.?\s*\/\s*INT\.?|I\s*\/\s*E\.?|INT\.?|EXT\.?)(?=\s|$)/i;
export function sceneIntro(text:string){const m=text.match(INTRO);return m?{raw:m[0],canonical:m[1].replace(/\s|\./g,'').toUpperCase().replace(/^INT\/EXT$/,'INT./EXT').replace(/^EXT\/INT$/,'EXT./INT')+'.',end:m[0].length}:null;}
export function headingCandidate(text:string){return !!sceneIntro(text)&&/\s/u.test(text);}
export function transitionName(text:string){const name=text.trim().replace(/[.:!?…—–]+$/u,'').trim().replace(/\s+/g,' ').toUpperCase();return TRANSITIONS.includes(name)?name:null;}
export function transitionEnding(f:WritingFormat,name:string){if(f.transitionPunctuation==='preserve')return '';return f.transitionPunctuation==='traditional'&&['FADE OUT','FADE TO BLACK'].includes(name)?'.':':';}
export function formatHeading(s:TextState,f:WritingFormat,commit:boolean,times:string[]=SCENE_TIMES):TextState {
 if(s.text.length>2048||s.text.includes('\n'))return s;
 const intro=sceneIntro(s.text);if(!intro)return s;
 if(commit||/\s/u.test(s.text.slice(intro.end))||/\s$/u.test(s.text.slice(0,intro.end+1))){
  const tail=s.text.slice(intro.end),space=tail.match(/^\s*/u)![0];
  if(tail||commit||space)s=replaceState(s,0,intro.end+space.length,intro.canonical+(tail.slice(space.length)||space?' ':''));
 }
 if(!commit&&!/\s$/u.test(s.text))return s;
 const prefix=sceneIntro(s.text);if(!prefix)return s;
 const restStart=prefix.end+(s.text.slice(prefix.end).match(/^\s*/u)?.[0].length||0),rest=s.text.slice(restStart);
 const labels=[...new Set([...SCENE_TIMES,...times].filter(t=>t.trim()&&t.length<80).map(t=>t.trim().toUpperCase()))].sort((a,b)=>b.length-a.length);
 const time=rest.match(new RegExp('(?:^|\\s)('+labels.map(escape).join('|')+')(\\s*)$','i'));if(!time||time.index===undefined)return s;
 const before=rest.slice(0,time.index),separator=f.sceneSeparator.trim();if(!separator)return s;
 let location=before.trimEnd();
 const suffix=new RegExp('(?:\\s*'+escape(separator)+'\\s*)+$');location=location.replace(suffix,'').trimEnd();
 // Avoid treating a location's unfinished conjunction as a finished field.
 if(!location||/\b(?:AND|OR|OF|THE|AT|IN|TO)$/i.test(location))return s;
 const sep=/^[-–—]$/.test(separator)?' '+separator+' ':f.sceneSeparator;
 return replaceState(s,restStart+location.length,restStart+time.index+time[0].length-time[2].length,sep+time[1]);
}
export function formatTransition(s:TextState,f:WritingFormat):TextState {
 const name=transitionName(s.text);if(!name||/[.:!?…—–]\s*$/u.test(s.text))return s;
 const mark=transitionEnding(f,name);if(!mark)return s;
 const end=s.text.trimEnd().length;return replaceState(s,end,end,mark);
}
export function completeElement(p:Paragraph,s:TextState,f:WritingFormat,prefs:EditorPreferences,commit:boolean,times?:string[],structure=true){
 const kind:FormattingKind|undefined=p.type==='Scene Heading'?'heading':p.type==='Transition'?'transition':undefined;
 const enabled=kind==='heading'?prefs.autoSceneHeadings:kind==='transition'?prefs.autoTransitions:false;
 if(!kind||!enabled)return {state:s,key:undefined};
 const before=s.text,key=formattingKey(kind,before),omitted=formattingOmissions(p).includes(key);
 if(!omitted&&structure)s=kind==='heading'?formatHeading(s,f,commit,times):commit||/\s$/u.test(s.text)?formatTransition(s,f):s;
 const structural=s.text!==before;
 if(f.elements[p.type].caps)s=upperState(s);
 return {state:s,key:structural?key:undefined};
}
export function parentheticalState(s:TextState):TextState {
 if(!s.text)return {...replaceState(s,0,0,'()'),start:1,end:1};
 let start=s.start,end=s.end;
 if(start===end){start=0;end=s.text.length;}
 const selected=s.text.slice(start,end);
 if(selected.startsWith('(')&&selected.endsWith(')'))return s.text==='()'?{...s,start:1,end:1}:s;
 const open=selected.startsWith('(')?'':'(',close=selected.endsWith(')')?'':')';
 let result=s;
 if(close)result=replaceState(result,end,end,close);
 if(open)result=replaceState(result,start,start,open);
 if(s.start!==s.end)return {...result,start:s.start+open.length,end:s.end+open.length};
 const caret=Math.max(start+1,Math.min(result.text.length-1,s.start+open.length));return {...result,start:caret,end:caret};
}
export function canSkipParentheticalClose(text:string,at:number){
 if(at!==text.length-1||text[at]!==')'||text[0]!=='(')return false;
 let depth=0;for(let i=0;i<at;i++){if(text[i]==='(')depth++;else if(text[i]===')')depth--;if(depth<1)return false;}return depth===1;
}
export function convertElement(p:Paragraph,type:ElementType,start:number,end:number,f:WritingFormat,prefs:EditorPreferences){
 let s:TextState={text:p.text,start,end,runs:p.runs};
 if(p.type==='Parenthetical'&&type!=='Parenthetical'&&prefs.autoParentheticals&&p.text==='()')s={...s,text:'',runs:undefined,start:0,end:0};
 const target={...p,type,elementSource:'manual' as const};
 if(type==='Parenthetical'&&p.type!==type&&prefs.autoParentheticals)s=parentheticalState(s);
 else if(type==='Scene Heading'||type==='Transition')s=completeElement(target,s,f,prefs,true).state;
 return {paragraph:{...target,text:s.text,runs:s.runs},start:s.start,end:s.end};
}
