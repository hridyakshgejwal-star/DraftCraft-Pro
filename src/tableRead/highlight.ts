import {useEffect,useRef} from 'react';
import type {Paragraph} from '../types/script';
import type {ReadHighlight} from '../components/AiTableReadModal';
import {scrollMotion} from '../components/ui/Presentation';
/** Decoration only: the textarea keeps focus, selection, input and document state. */
export function useReadingHighlight(value:ReadHighlight|undefined,paragraphs:Paragraph[]){
 const previous=useRef('');
 useEffect(()=>{if(!value){previous.current='';return;}const p=paragraphs.find(p=>p.id===value.paragraphId),input=document.getElementById('input-'+value.paragraphId) as HTMLTextAreaElement|null;if(!input||p?.text!==value.sourceText)return;
  const row=input.closest<HTMLElement>('[data-paragraph-id]')||input.parentElement!;row.classList.add('dc-table-speaking');row.dataset.tableReadActive='true';let layer:HTMLDivElement|undefined,observer:ResizeObserver|undefined;
  if(value.word&&value.word.start>=0&&value.word.end<=p.text.length){layer=document.createElement('div');layer.className='dc-table-word-layer no-print';layer.setAttribute('aria-hidden','true');const mark=document.createElement('mark');mark.textContent=p.text.slice(value.word.start,value.word.end);layer.append(document.createTextNode(p.text.slice(0,value.word.start)),mark,document.createTextNode(p.text.slice(value.word.end)));input.parentElement!.append(layer);const place=()=>{const css=getComputedStyle(input);for(const key of ['font-family','font-size','font-weight','font-style','font-variant','line-height','letter-spacing','word-spacing','text-align','text-indent','text-transform','direction','tab-size','padding-top','padding-bottom','padding-left','padding-right','box-sizing','word-break','overflow-wrap','border-top-width','border-bottom-width','border-left-width','border-right-width'])layer!.style.setProperty(key,css.getPropertyValue(key));Object.assign(layer!.style,{left:input.offsetLeft+'px',top:input.offsetTop+'px',width:input.offsetWidth+'px',height:input.offsetHeight+'px'});};place();observer=new ResizeObserver(place);observer.observe(input);}
  if(value.follow&&previous.current!==value.paragraphId){const rect=input.getBoundingClientRect(),workspace=input.closest('.dc-editor-workspace')?.getBoundingClientRect();if(workspace&&(rect.top<workspace.top+30||rect.bottom>workspace.bottom-30))input.scrollIntoView({block:'center',behavior:scrollMotion()});}previous.current=value.follow?value.paragraphId:'';
  return()=>{row.classList.remove('dc-table-speaking');delete row.dataset.tableReadActive;observer?.disconnect();layer?.remove();};
 },[value?.paragraphId,value?.sourceText,value?.start,value?.word?.start,value?.word?.end,value?.follow,paragraphs]);
}
