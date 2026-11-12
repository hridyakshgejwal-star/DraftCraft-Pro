import {printHtml} from '../production/print';
import {importRichRtf} from '../production/rtf';
import type {ScriptDocument,Paragraph} from '../types/script';
import {baseFormat,styleFor,paragraphMeasure} from './model';
import {paginateScript} from '../utils/pagination';
const esc=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
export function formatHtml(doc:ScriptDocument):string{return printHtml(doc);}
export function parsePlainText(text:string):Partial<ScriptDocument>{if(text.length>50*1024*1024)throw Error('Choose a text file smaller than 50 MB.');return {paragraphs:text.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').split(/\n\s*\n/).map(text=>({id:'p-'+crypto.randomUUID(),type:'General',text}))};}
export function parseRtf(raw:string):Partial<ScriptDocument>{return importRichRtf(raw);}

function rtfText(text:string):string {
 return text.split('').map(c=>
  c==='\\'||c==='{'||c==='}'?'\\'+c:
  c==='\n'?'\\line ':
  c==='\t'?'\\tab ':
  c.charCodeAt(0)>126?'\\u'+(c.charCodeAt(0)>32767?c.charCodeAt(0)-65536:c.charCodeAt(0))+'?':c
 ).join('');
}
export function formatRtf(doc:ScriptDocument):string {
 const f=doc.writingFormat||baseFormat(),
 fonts=[...new Set([...Object.values(f.elements).map(s=>s.font),...f.customElements.map(e=>e.style.font)])],
 twips=(n:number)=>Math.round(n*1440);
 const colors=[...new Set(doc.paragraphs.flatMap(p=>(p.runs||[]).map(r=>r.style?.color)).filter((c):c is string=>!!c&&/^#[0-9a-f]{6}$/i.test(c)))];
 let out='{\\rtf1\\ansi\\ansicpg1252\\uc1\\deff0{\\fonttbl'
  +fonts.map((font,i)=>'{\\f'+i+'\\fnil '+rtfText(font.replace(/[;{}\\]/g,''))+';}').join('')+'}\n';
 out+='{\\colortbl;'+colors.map(color=>'\\red'+parseInt(color.slice(1,3),16)+'\\green'+parseInt(color.slice(3,5),16)+'\\blue'+parseInt(color.slice(5,7),16)+';').join('')+'}';
 out+='\\paperw'+twips(f.page.width)+'\\paperh'+twips(f.page.height)
  +'\\margl'+twips(f.page.left)+'\\margr'+twips(f.page.right)
  +'\\margt'+twips(f.page.top)+'\\margb'+twips(f.page.bottom)+'\n';
 if(doc.titlePage.includeInPdf??f.titlePage)
  out+='\\pard\\qc\\fs28 '+rtfText(doc.titlePage.title)
   +'\\par\\fs24 Written by\\par '+rtfText(doc.titlePage.author)
   +'\\par '+rtfText(doc.titlePage.basedOn)+'\\par\\ql '+rtfText(doc.titlePage.contact)+'\\page\n';
 for(const p of doc.paragraphs){
   if(p.pageBreakBefore)out+='\\page\n';
   const s=styleFor(f,p);
   out+='\\pard\\widctlpar'+(s.keepNext?'\\keepn':'')
    +'\\f'+fonts.indexOf(s.font)+'\\fs'+Math.round(s.size*2)
    +'\\li'+twips(s.left)+'\\ri'+twips(s.right)+'\\fi'+twips(s.first)
    +'\\sb'+Math.round(s.before*20)+'\\sa'+Math.round(s.after*20)
    +'\\sl'+Math.round(s.line*20)+'\\slmult0'
    +({left:'\\ql',right:'\\qr',center:'\\qc',justify:'\\qj'})[s.align]
    +(s.bold?'\\b':'\\b0')+(s.italic?'\\i':'\\i0')+(s.underline?'\\ul':'\\ul0')+' ';
   const runs=p.runs?.map(r=>r.text).join('')===p.text?p.runs:undefined;
   out+=runs?runs.map(r=>'{'
    +(r.style?.bold?'\\b ':'')+(r.style?.italic?'\\i ':'')+(r.style?.underline?'\\ul ':'')+(r.style?.strikethrough?'\\strike ':'')+(r.style?.color&&colors.includes(r.style.color)?'\\cf'+(colors.indexOf(r.style.color)+1)+' ':'')
    +rtfText(s.caps?r.text.toUpperCase():r.text)+'}').join('')
    :rtfText(s.caps?p.text.toUpperCase():p.text);
   out+='\\par\n';
 }
 return out+'}';
}
