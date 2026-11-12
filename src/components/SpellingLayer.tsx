import React, { useLayoutEffect, useRef } from 'react';
import type { WordRange } from '../writing/spelling';
import { wordsIn } from '../writing/spelling';

/** Transparent mirror paints decorations only. The original textarea owns
 * text, selection, IME, sizing, pagination, printing and the caret. */
export const SpellingLayer = React.memo(function SpellingLayer({id,text,errors,underline}:{id:string;text:string;errors:WordRange[];underline:boolean}) {
  const ref=useRef<HTMLDivElement>(null);
  useLayoutEffect(()=>{
    const input=document.getElementById('input-'+id) as HTMLTextAreaElement | null;
    const layer=ref.current;
    if(!input || !layer) return;
    const place=()=>{
      const css=getComputedStyle(input);
      for(const property of ['font-family','font-size','font-weight','font-style','font-variant','line-height','letter-spacing','word-spacing','text-align','text-indent','text-transform','direction','unicode-bidi','tab-size','padding-top','padding-bottom','padding-left','padding-right','box-sizing','word-break','overflow-wrap','border-top-width','border-bottom-width','border-left-width','border-right-width']) layer.style.setProperty(property,css.getPropertyValue(property));
      layer.style.width=input.offsetWidth+'px'; layer.style.height=input.offsetHeight+'px';
      layer.style.top=input.offsetTop+'px'; layer.style.left=input.offsetLeft+'px';
    };
    place(); const observer=new ResizeObserver(place);observer.observe(input);
    let alive=true;document.fonts.ready.then(()=>{if(alive)place()});
    return()=>{alive=false;observer.disconnect()};
  },[id,text,errors]);
  let position=0;
  const parts:React.ReactNode[]=[];
  for(const error of errors) {
    parts.push(text.slice(position,error.start));
    parts.push(<span key={error.start} data-spell-start={error.start} data-spell-end={error.end} className={underline?'dc-misspelled':''}>{text.slice(error.start,error.end)}</span>);
    position=error.end;
  }
  parts.push(text.slice(position));
  return <div ref={ref} data-spell-layer={id} className="dc-spelling-layer no-print" aria-hidden="true">{parts}</div>;
});

export function spellingWordAt(id:string,x:number,y:number) {
  const layer=document.querySelector<HTMLElement>(`[data-spell-layer="${CSS.escape(id)}"]`);
  if(!layer) return null;
  for(const span of layer.querySelectorAll<HTMLElement>('[data-spell-start]')) {
    const range=document.createRange();range.selectNodeContents(span);
    for(const rect of range.getClientRects()) if(x>=rect.left && x<=rect.right && y>=rect.top && y<=rect.bottom) {
      return {start:Number(span.dataset.spellStart),end:Number(span.dataset.spellEnd),word:span.textContent || '',rect};
    }
  }
  return null;
}

/** Measure only the clicked paragraph, without adding token spans to long scripts. */
export function editorWordAt(id:string,x?:number,y?:number,offset?:number) {
  const input=document.getElementById('input-'+id) as HTMLTextAreaElement|null;
  if(!input)return null;
  const ghost=document.createElement('div'),node=document.createTextNode(input.value);ghost.append(node);ghost.className='dc-spelling-layer no-print';ghost.setAttribute('aria-hidden','true');
  const css=getComputedStyle(input);
  for(const property of ['font-family','font-size','font-weight','font-style','line-height','letter-spacing','word-spacing','text-align','text-indent','text-transform','direction','unicode-bidi','tab-size','padding-top','padding-bottom','padding-left','padding-right','box-sizing','word-break','overflow-wrap','border-top-width','border-bottom-width','border-left-width','border-right-width'])ghost.style.setProperty(property,css.getPropertyValue(property));
  Object.assign(ghost.style,{width:input.offsetWidth+'px',height:input.offsetHeight+'px',top:input.offsetTop+'px',left:input.offsetLeft+'px'});input.parentElement!.append(ghost);
  try {
    const all=wordsIn(input.value),caret=offset ?? input.selectionStart;
    const nearby=all.filter(w=>w.start<=caret && w.end>=caret),tokens=offset!==undefined?nearby:[...nearby,...all.filter(w=>!nearby.includes(w))];
    for(const word of tokens){const range=document.createRange();range.setStart(node,word.start);range.setEnd(node,word.end);
      for(const rect of range.getClientRects())if(offset!==undefined || (x! >= rect.left && x! <= rect.right && y! >= rect.top && y! <= rect.bottom))return {...word,rect};
    }
    return null;
  }finally{ghost.remove();}
}
