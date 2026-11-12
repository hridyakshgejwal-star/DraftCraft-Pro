import React, { useRef, useState } from 'react';
import { DialogOverlay } from './ui/Presentation';
import { assignment, displayShortcut, resolveCommand, type CharacterShortcuts, type ShortcutCommand, type ShortcutProfile } from '../shortcuts/model';

export function ScreenplayCommandPalette({commands,profile,characters,onExecute,onClose}:{commands:ShortcutCommand[];profile:ShortcutProfile;characters:CharacterShortcuts;onExecute:(command:ShortcutCommand)=>void;onClose:()=>void}) {
  const [query,setQuery]=useState('');
  const list=useRef<HTMLDivElement>(null);
  const filtered=commands.filter(c=>c.label.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  return <DialogOverlay open label="Screenplay Commands" className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
    <section className="dc-bg-panel rounded-xl border border-white/15 p-4 w-full max-w-lg text-neutral-200" onKeyDown={e=>{
      if(e.nativeEvent.isComposing)return;
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();onClose();return;}
      const input=e.target instanceof HTMLInputElement;
      if(!input){const id=resolveCommand(profile,characters,e.nativeEvent,true),command=commands.find(c=>c.id===id);if(command){e.preventDefault();e.stopPropagation();if(!e.repeat)onExecute(command);return;}}
      if(e.key==='ArrowDown'||e.key==='ArrowUp'){
        const items=Array.from(list.current?.querySelectorAll<HTMLButtonElement>('button') || []);if(!items.length)return;
        const current=items.indexOf(document.activeElement as HTMLButtonElement),index=current<0?0:(current+(e.key==='ArrowDown'?1:-1)+items.length)%items.length;
        e.preventDefault();items[index].focus();items[index].scrollIntoView({block:'nearest'});
      }
    }}>
      <header className="flex justify-between items-center mb-3"><h2 className="font-semibold">Screenplay Commands</h2><button className="dc-shortcut-button" aria-label="Close screenplay commands" onClick={onClose}>×</button></header>
      <input className="dc-shortcut-input w-full mb-2" aria-label="Search screenplay commands" placeholder="Search elements, inserts, or characters…" value={query} onChange={e=>setQuery(e.target.value)} />
      <p className="text-xs text-neutral-400 mb-3">Arrow keys select a command. Return runs it. Assigned letters work while a command has focus; typing in Search filters the list.</p>
      <div ref={list} className="max-h-[50vh] overflow-y-auto space-y-1">{filtered.map((command,index)=><button key={command.id} autoFocus={index===0} className="dc-shortcut-button w-full flex justify-between items-center gap-3 text-left focus-visible:outline-amber-500" onClick={()=>onExecute(command)}><span>{command.label}</span><kbd className="text-neutral-400">{displayShortcut(assignment(profile,characters,command.id))}</kbd></button>)}{!filtered.length&&<p className="text-xs text-neutral-400 py-3">No matching commands.</p>}</div>
    </section>
  </DialogOverlay>;
}
