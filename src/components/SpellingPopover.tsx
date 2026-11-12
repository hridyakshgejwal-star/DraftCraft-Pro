import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { WritingSettings } from '../writing/model';
import { applyWordEdits, sentenceAt, type Alternative, type SynonymResult } from '../writing/wordSuggestions';
import { FloatingSurface } from './ui/Presentation';

export interface SpellingTarget {id:string;text:string;word:string;start:number;end:number;rect:{top:number;bottom:number;left:number;right:number};selection:{start:number;end:number};keyboard?:boolean;correct?:boolean|null;protectedReason?:string}
export function SpellingPopover({target,suggestions,loading,synonyms,synonymLoading,advancedLoading,advancedNote,settings,onReplace,onAction,onClose}:{target:SpellingTarget;suggestions:string[];loading:boolean;synonyms:SynonymResult|null;synonymLoading:boolean;advancedLoading:boolean;advancedNote:string;settings:WritingSettings;onReplace:(word:string|Alternative)=>void;onAction:(action:'once'|'document'|'dictionary'|'disable')=>void;onClose:()=>void}) {
  const ref=useRef<HTMLDivElement>(null);
  const [position,setPosition]=useState({left:target.rect.left,top:target.rect.bottom+8}),[count,setCount]=useState(settings.suggestionCount),[preview,setPreview]=useState<Alternative|null>(null);
  const misspelled=target.correct===false;
  useLayoutEffect(()=>{
    const popup=ref.current;if(!popup)return;
    const place=()=>{
      const width=popup.offsetWidth,height=popup.offsetHeight,anchor=target.rect;
      const input=document.getElementById('input-'+target.id),page=input?.closest('.script-page')?.getBoundingClientRect();
      let left=Math.max(8,Math.min(anchor.left,window.innerWidth-width-8)),top=anchor.bottom+8;
      if(page && page.right+12+width<=window.innerWidth-8){left=page.right+12;top=anchor.top;}
      else if(page && page.left-width-12>=8){left=page.left-width-12;top=anchor.top;}
      else if(top+height>window.innerHeight-8){top=anchor.top-height-8;if(top<8){if(anchor.right+12+width<=window.innerWidth-8)left=anchor.right+12;else if(anchor.left-width-12>=8)left=anchor.left-width-12;top=anchor.top;}}
      setPosition({left,top:Math.max(8,Math.min(top,window.innerHeight-height-8))});
    };
    place();const observer=new ResizeObserver(place);observer.observe(popup);
    if(target.keyboard && loading)popup.querySelector<HTMLButtonElement>('[data-word-close]')?.focus({preventScroll:true});
    else if(target.keyboard && (!popup.contains(document.activeElement) || (document.activeElement as HTMLElement)?.dataset.wordClose==='true'))(popup.querySelector<HTMLButtonElement>('.dc-spelling-choice') || popup.querySelector<HTMLButtonElement>('button'))?.focus({preventScroll:true});
    return()=>observer.disconnect();
  },[target,suggestions,synonyms,loading,preview,count]);
  const choose=(choice:Alternative)=>{if(choice.edits)setPreview(choice);else onReplace(choice);};
  const alternatives=synonyms?.alternatives || [];
  const actions=misspelled?[
    {label:'Ignore Once',action:()=>onAction('once')},
    {label:'Ignore All in Document',action:()=>onAction('document')},
    {label:'Add to Dictionary',action:()=>onAction('dictionary')},
    {label:'Disable Autocorrect for This Word',action:()=>onAction('disable')},
  ]:[];
  return createPortal(<FloatingSurface ref={ref} role="dialog" aria-label={misspelled?'Spelling Suggestions':'Word Suggestions'} className="dc-spelling-popup dc-bg-panel no-print" style={{...position,position:'fixed',zIndex:90,width:300,maxWidth:'calc(100vw - 16px)',maxHeight:'min(70vh, calc(100vh - 16px))',overflowY:'auto'}}
    onKeyDown={e=>{
      const buttons=Array.from(ref.current!.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')).filter(button=>!button.closest('[inert]'));
      const index=buttons.indexOf(document.activeElement as HTMLButtonElement);
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();if(preview)setPreview(null);else onClose();}
      if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?buttons.length-1:(index+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;buttons[next]?.focus({preventScroll:true});buttons[next]?.scrollIntoView({block:'nearest'});}
      if(e.key==='Tab'){e.preventDefault();buttons[(index+(e.shiftKey?-1:1)+buttons.length)%buttons.length]?.focus();}
    }}>
    <div className="dc-spelling-heading">{misspelled?'Spelling Suggestions':'Word Suggestions'} <button data-word-close="true" aria-label="Close spelling suggestions" title="Close word suggestions" onClick={onClose}>×</button></div>
    <div className="dc-spelling-word">{target.word}</div>
    {preview?<div role="group" aria-label="Replacement preview"><h3 className="dc-word-section">Replacement Preview</h3><p className="text-xs text-neutral-400">{sentenceAt(target.text,target.start,target.end).text}</p><p className="text-xs py-2 text-amber-400">{sentenceAt(applyWordEdits(target.text,preview.edits!),target.start,target.start+preview.text.length).text}</p><button autoFocus className="dc-spelling-choice" onClick={()=>onReplace(preview)}>Apply Replacement</button><button className="dc-spelling-choice" onClick={()=>setPreview(null)}>Cancel Replacement</button></div>:<>
      {loading&&<p role="status">Checking spelling…</p>}
      {misspelled&&settings.suggestions&&<div><h3 className="dc-word-section">Spelling Corrections</h3>{suggestions.length?suggestions.map(word=><button key={word} className="dc-spelling-choice" onClick={()=>onReplace(word)}>{word}</button>):!loading&&<p role="status">No dictionary corrections found.</p>}</div>}
      {!settings.synonyms&&!misspelled&&!loading&&<p role="status">Spelling is correct. Synonym suggestions are disabled.</p>}{settings.synonyms&&<div><h3 className="dc-word-section">Suggested Synonyms</h3>{misspelled&&synonyms?.intended&&<p className="dc-word-explanation">Alternatives for {synonyms.intended}</p>}{alternatives.slice(0,count).map(choice=><button key={choice.text} className="dc-spelling-choice" aria-label={choice.text} onClick={()=>choose(choice)}><span>{choice.text}</span>{settings.suggestionExplanations&&<span className="dc-word-explanation">{choice.explanation}</span>}</button>)}{synonymLoading&&<p role="status">Analyzing the sentence…</p>}{!synonymLoading&&!alternatives.length&&<p role="status">{synonyms?.note || target.protectedReason || 'No safe alternatives available.'}</p>}{alternatives.length>count&&<button className="dc-spelling-choice" onClick={()=>setCount(n=>Math.min(24,n+settings.suggestionCount))}>More Suggestions</button>}
      {settings.suggestionExplanations&&synonyms?.meaning&&<p className="dc-word-explanation"><strong>Meaning & Context:</strong> {synonyms.meaning}</p>}
      {settings.suggestionExplanations&&alternatives.length>0&&<p className="dc-word-explanation">{synonyms?.note}</p>}
      {advancedLoading&&<p role="status">Refining with advanced analysis…</p>}{advancedNote&&<p className="dc-word-explanation" role="status">{advancedNote}</p>}
      </div>}
      {!!actions.length&&<div role="separator" className="dc-spelling-separator" />}{actions.map(choice=><button key={choice.label} className="dc-spelling-choice" onClick={choice.action}>{choice.label}</button>)}
      {!target.keyboard&&<p className="dc-word-explanation">Keep typing, or use ⌥↓ to browse suggestions. Escape closes.</p>}
    </>}
  </FloatingSurface>,document.body);
}
