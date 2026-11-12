import type {Paragraph,TextRun,ScriptDocument} from '../types/script';
/** Bounded RTF text reader. It retains character emphasis and colors; embedded
 * objects remain in the original input and are disclosed in the import report. */
export function importRichRtf(raw:string):Partial<ScriptDocument>{
 if(raw.length>20*1024*1024||!raw.startsWith('{\\rtf'))throw Error('Choose a valid RTF smaller than 20 MB.');
 const colorGroup=raw.match(/\{\\colortbl([^}]*)\}/)?.[1]||'',colors=colorGroup.split(';').map(c=>{const rgb=['red','green','blue'].map(k=>Number(c.match(new RegExp('\\\\'+k+'(\\d+)'))?.[1]||0));return '#'+rgb.map(v=>Math.max(0,Math.min(255,v)).toString(16).padStart(2,'0')).join('');});
 type State={skip:boolean;uc:number;style:NonNullable<TextRun['style']>};let state:State={skip:false,uc:1,style:{}},fallback=0;const stack:State[]=[],paragraphs:Paragraph[]=[];let text='',runs:TextRun[]=[];
 const emit=(value:string)=>{if(state.skip||!value)return;const last=runs.at(-1);if(last&&JSON.stringify(last.style)===JSON.stringify(state.style))last.text+=value;else runs.push({text:value,style:{...state.style}});text+=value;};
 const flush=()=>{paragraphs.push({id:'p-'+crypto.randomUUID(),type:'General',text,runs:runs.length?runs:undefined});text='';runs=[];};
 for(let i=0;i<raw.length;){const c=raw[i++];if(c==='{'){stack.push({...state,style:{...state.style}});continue;}if(c==='}'){const old=stack.pop();if(!old)throw Error('Invalid RTF group nesting.');state=old;continue;}if(c!=='\\'){if(!state.skip&&c!=='\r'&&c!=='\n'){if(fallback)fallback--;else emit(c);}continue;}
  const part=raw.slice(i);if(/^[\\{}]/.test(part)){if(fallback)fallback--;else emit(raw[i]);i++;continue;}if(part[0]==="'"){const hex=part.slice(1,3);if(!/^[0-9a-f]{2}$/i.test(hex))throw Error('Invalid RTF byte escape.');if(fallback)fallback--;else emit(new TextDecoder('windows-1252').decode(new Uint8Array([parseInt(hex,16)])));i+=3;continue;}if(part[0]==='*'){state.skip=true;i++;continue;}if(part[0]==='~'){emit('\u00a0');i++;continue;}
  const word=part.match(/^([a-z]+)(-?\d+)? ?/i);if(!word){i++;continue;}i+=word[0].length;const key=word[1].toLowerCase(),n=word[2]===undefined?1:Number(word[2]);if(['fonttbl','colortbl','stylesheet','info','pict','object','header','footer','filetbl','listtable','listoverridetable','generator'].includes(key)){state.skip=true;continue;}if(key==='bin'){if(!Number.isInteger(n)||n<0||i+n>raw.length)throw Error('Invalid binary RTF object.');i+=n;continue;}if(state.skip)continue;
  if(key==='uc'){state.uc=Math.min(10,Math.max(0,n));continue;}if(key==='u'){emit(String.fromCharCode(n<0?n+65536:n));fallback=state.uc;continue;}
  if(key==='b')state.style.bold=n!==0||undefined;else if(key==='i')state.style.italic=n!==0||undefined;else if(key==='ul')state.style.underline=n!==0||undefined;else if(key==='ulnone')state.style.underline=undefined;else if(key==='strike')state.style.strikethrough=n!==0||undefined;else if(key==='plain')state.style={};else if(key==='cf')state.style.color=n?colors[n]:undefined;
  else if(key==='par')flush();else if(key==='line')emit('\n');else if(key==='tab')emit('\t');else if(key==='emdash')emit('—');else if(key==='endash')emit('–');else if(key==='lquote')emit('‘');else if(key==='rquote')emit('’');else if(key==='ldblquote')emit('“');else if(key==='rdblquote')emit('”');
 }
 if(stack.length)throw Error('Unbalanced RTF groups.');if(text||!paragraphs.length)flush();
 const warnings=['RTF text, Unicode, bold, italic, underline, strikeout and colors are recovered. Font tables, mixed font sizes, embedded objects and page-specific semantics require review.'];return {paragraphs,importReport:{source:'RTF document',type:'rtf',warnings}};
}
