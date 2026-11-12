import type {Paragraph,ElementType} from '../types/script';
import type {PDFDocumentProxy} from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
export interface PdfLine {page:number;x:number;y:number;width:number;height:number;pageWidth:number;pageHeight:number;text:string}
export interface PdfReview {name:string;sha256:string;pages:number;lines:PdfLine[];headers:PdfLine[];paragraphs:(Paragraph&{sourcePdfPage?:number;conversionReview?:string})[];warnings:string[]}
function key(line:PdfLine){return /^\d+[A-Z]*[.]?$/u.test(line.text.trim())?'#PAGE#':line.text.trim().replace(/\s+/g,' ');}
export function reconstructPdf(lines:PdfLine[],includeHeaders=false){
 const pages=new Set(lines.map(l=>l.page)),candidates=new Map<string,Set<number>>();for(const l of lines)if(l.y<Math.max(45,l.height*3)||l.y>l.pageHeight-45){const k=key(l),set=candidates.get(k)||new Set();set.add(l.page);candidates.set(k,set);}
 const headers=lines.filter(l=>(l.y<Math.max(45,l.height*3)||l.y>l.pageHeight-45)&&((candidates.get(key(l))?.size||0)>=Math.max(2,Math.ceil(pages.size*.5))||key(l)==='#PAGE#'));
 const content=lines.filter(l=>includeHeaders||!headers.includes(l)),paragraphs:PdfReview['paragraphs']=[];let previous:PdfLine|undefined;
 for(let i=0;i<content.length;i++){const line=content[i],text=line.text.trimEnd();if(!text.trim())continue;const next=content[i+1],upper=text===text.toLocaleUpperCase()&&/\p{L}/u.test(text);let type:ElementType='Action',uncertain=false;
  if(/^(?:INT\.?\s*\/\s*EXT\.?|INT\.|EXT\.|I\/E\.)\s/iu.test(text.trim()))type='Scene Heading';
  else if(upper&&/^(?:CUT TO|DISSOLVE TO|SMASH CUT TO|MATCH CUT TO|FADE IN|FADE OUT|FADE TO BLACK|BACK TO|INTERCUT)[:.]?$/u.test(text.trim()))type='Transition';
  else if(/^\(.*\)$/u.test(text.trim())&&['Character','Dialogue','Parenthetical'].includes(paragraphs.at(-1)?.type||''))type='Parenthetical';
  else if(upper&&text.trim().length<70&&line.x>line.pageWidth*.33&&line.x<line.pageWidth*.67&&next&&next.page===line.page&&next.y-line.y<line.height*3&&next.x<line.x&&next.x>line.pageWidth*.2){type='Character';uncertain=true;}
  else if(['Character','Dialogue','Parenthetical'].includes(paragraphs.at(-1)?.type||'')&&line.x>line.pageWidth*.2&&line.x<line.pageWidth*.49)type='Dialogue';
  const prev=paragraphs.at(-1),joins=previous&&prev&&prev.type===type&&['Action','Dialogue'].includes(type)&&line.page===previous.page&&line.y-previous.y<Math.max(line.height,previous.height)*1.7&&Math.abs(line.x-previous.x)<12;
  if(joins)prev.text+='\n'+text;else paragraphs.push({id:'p-'+crypto.randomUUID(),type,text,sourcePdfPage:line.page,...(uncertain?{conversionReview:'Inferred character cue — verify speaker'}:{})});previous=line;
 }
 return {paragraphs,headers};
}
export async function extractPdf(file:File,signal?:AbortSignal,onProgress?:(page:number,total:number)=>void):Promise<PdfReview>{
 if(file.size>50*1024*1024)throw Error('Choose a PDF smaller than 50 MB.');const bytes=new Uint8Array(await file.arrayBuffer());if(new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')throw Error('The selected file is not a PDF.');const sha256=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
 const pdfjs=await import('pdfjs-dist');pdfjs.GlobalWorkerOptions.workerSrc=workerUrl;const task=pdfjs.getDocument({data:bytes,useSystemFonts:true});let pdf:PDFDocumentProxy|undefined;
 const abort=()=>void task.destroy();signal?.addEventListener('abort',abort,{once:true});try{pdf=await task.promise;if(pdf.numPages>500)throw Error('Import up to 500 PDF pages at a time.');const lines:PdfLine[]=[];
  for(let number=1;number<=pdf.numPages;number++){if(signal?.aborted)throw new DOMException('PDF import canceled','AbortError');const page=await pdf.getPage(number),view=page.getViewport({scale:1}),content=await page.getTextContent();const items=content.items.filter((i):i is Extract<typeof i,{str:string}>=>'str'in i).map(item=>{const point=pdfjs.Util.transform(view.transform,item.transform);return {text:item.str,x:point[4],y:point[5],width:item.width,height:Math.max(1,Math.hypot(point[2],point[3]))};}).sort((a,b)=>Math.abs(a.y-b.y)>3?a.y-b.y:a.x-b.x);
   const grouped:typeof items[]=[];for(const item of items){const last=grouped.at(-1);if(last&&Math.abs(last[0].y-item.y)<3)last.push(item);else grouped.push([item]);}
   for(const group of grouped){let text='',right=group[0].x;for(const item of group){const gap=item.x-right;if(text&&gap>Math.max(2,item.height*.2)&&!text.endsWith(' '))text+=' ';text+=item.text;right=item.x+item.width;}const first=group[0];if(text.trim())lines.push({page:number,x:first.x,y:first.y,width:Math.max(0,right-first.x),height:Math.max(...group.map(i=>i.height)),pageWidth:view.width,pageHeight:view.height,text});}
   page.cleanup();onProgress?.(number,pdf.numPages);await new Promise(resolve=>setTimeout(resolve,0));
  }
  if(!lines.some(l=>l.text.trim()))throw Error('This PDF has no extractable text. OCR is not included; supply a text-based PDF or import the original screenplay file.');const result=reconstructPdf(lines);return {name:file.name,sha256,pages:pdf.numPages,lines,...result,warnings:['PDF element types are inferred from text and placement. Review character cues, dialogue, columns, page headers and intentional spacing.','PDF fonts, images, revisions, alternate takes, notes and production locks cannot be recovered reliably. The original PDF is unchanged.',...(result.headers.length?[`${result.headers.length} likely header/footer lines were excluded; review or include them below.`]:[])]};
 }finally{signal?.removeEventListener('abort',abort);await task.destroy();}
}
