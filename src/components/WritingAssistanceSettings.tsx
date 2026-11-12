import React, { useState } from 'react';
import { DialogOverlay, useOverlayVisibility } from './ui/Presentation';
import { SPELLING_LANGUAGES, bundledLanguage, normalizeWord, cleanReplacement, cleanReplacements, parseReplacements, formatReplacements, type WritingSettings } from '../writing/model';
import { downloadText } from '../production/ProductionPanel';
import { platformSpelling } from '../writing/platformSpelling';

export function WritingAssistanceSettings({open,onClose,settings,onChange}:{open:boolean;onClose:()=>void;settings:WritingSettings;onChange:(settings:WritingSettings)=>void}) {
  const visible=useOverlayVisibility(open);
  const [word,setWord]=useState('');
  const [notice,setNotice]=useState('');
  const [from,setFrom]=useState('');const [to,setTo]=useState('');const [pairNotice,setPairNotice]=useState('');
  if(!visible)return null;
  const pairs=settings.replacements;
  const sameFrom=(a:string,b:string)=>a===b||a===a.toLocaleLowerCase()&&b===b.toLocaleLowerCase()&&a.toLocaleLowerCase()===b.toLocaleLowerCase();
  const addPair=()=>{const pair=cleanReplacement({from,to});if(!pair){setPairNotice('Enter what to replace (up to 40 characters, no line breaks) and something different to replace it with.');return;}
    const existing=pairs.some(p=>sameFrom(p.from,pair.from));onChange({...settings,replacements:cleanReplacements([...pairs.filter(p=>!sameFrom(p.from,pair.from)),pair])});
    setFrom('');setTo('');setPairNotice(existing?'Replacement updated.':'Replacement added.');};
  const importPairs=async(file:File)=>{const found=parseReplacements(await file.text());if(!found.length){setPairNotice('No replacements found in '+file.name+'. Use one pair per line: replace, a Tab, then the replacement.');return;}
    const merged=cleanReplacements([...pairs,...found]);onChange({...settings,replacements:merged});setPairNotice('Imported '+found.length+' replacement'+(found.length===1?'':'s')+' from '+file.name+'.');};
  const toggles: [keyof Pick<WritingSettings,'synonyms'|'contextualAnalysis'|'leftClickSuggestions'|'suggestionExplanations'|'advancedAnalysis'|'spellcheck'|'underlines'|'autocorrect'|'aggressive'|'suggestions'|'autocomplete'|'rememberCharacters'|'protectCharacters'>,string][]=[
    ['synonyms','Enable Synonym Suggestions'],['contextualAnalysis','Enable Contextual Analysis'],['leftClickSuggestions','Enable Left-Click Suggestions'],['suggestionExplanations','Show Suggestion Explanations'],['advancedAnalysis','Use Optional Advanced Analysis'],
    ['spellcheck','Enable Spell Checking'],['underlines','Show Red Underlines'],
    ['autocorrect','Enable Automatic Spelling Correction'],['aggressive','Enable Aggressive Autocorrect'],
    ['suggestions','Show Spelling Suggestions'],['autocomplete','Enable Character Name Autocomplete'],
    ['rememberCharacters','Automatically Remember Character Names'],['protectCharacters','Protect Character Names from Autocorrect'],
  ];
  const add=()=>{
    const value=word.normalize('NFC').trim();
    if(!value || /\s/u.test(value) || value.length>100){setNotice('Enter one word, up to 100 characters.');return;}
    if(!settings.customWords.some(w=>normalizeWord(w)===normalizeWord(value)))onChange({...settings,customWords:[...settings.customWords,value]});
    setWord('');setNotice('Word added.');
  };
  return <DialogOverlay open={open} label="Writing Assistance" className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
    <section onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();onClose();}}} className="dc-writing-settings dc-bg-panel rounded-2xl border border-white/15 shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto text-neutral-200" aria-label="Writing Assistance">
      <header className="flex items-center justify-between border-b border-white/10 p-4"><h2 className="text-sm font-semibold">Writing Assistance</h2><button aria-label="Close writing assistance" onClick={onClose}>×</button></header>
      <div className="p-4 space-y-4">
        <p className="text-xs text-neutral-400">Offline spelling (English bundled; other languages use your Mac’s dictionaries) and screenplay character suggestions. Standard autocorrect fixes established misspellings; aggressive mode also uses unambiguous nearby dictionary matches.</p>
        <div className="space-y-2.5">{toggles.map(([key,label])=><label key={key} className="flex items-center justify-between gap-3 text-xs cursor-pointer"><span>{label}</span><input type="checkbox" checked={settings[key]} onChange={e=>onChange({...settings,[key]:e.target.checked})} className="accent-amber-500" /></label>)}</div>
        <p className="text-xs text-neutral-400">Advanced analysis uses your configured Gemini key and sends the selected sentence and nearby screenplay text to that service. It is off by default. Offline alternatives remain available without a key.</p>
        <label className="flex justify-between items-center text-xs">Number of Suggestions<select aria-label="Number of Suggestions" value={settings.suggestionCount} onChange={e=>onChange({...settings,suggestionCount:Number(e.target.value)})} className="dc-bg-elevated rounded px-2 py-1 border border-white/15">{[3,4,5,6,7,8].map(n=><option key={n}>{n}</option>)}</select></label>
        <label className="flex justify-between items-center text-xs">Preferred Vocabulary Style<select aria-label="Preferred Vocabulary Style" value={settings.vocabularyStyle} onChange={e=>onChange({...settings,vocabularyStyle:e.target.value as WritingSettings['vocabularyStyle']})} className="dc-bg-elevated rounded px-2 py-1 border border-white/15"><option value="natural">Natural & Spoken</option><option value="simple">Simple & Direct</option><option value="formal">Formal</option></select></label>
        <label className="flex justify-between items-center text-xs">Select Spelling Language<select value={settings.language} onChange={e=>onChange({...settings,language:e.target.value as WritingSettings['language']})} className="dc-bg-elevated rounded px-2 py-1 border border-white/15">{SPELLING_LANGUAGES.map(([code,label])=><option key={code} value={code}>{label}</option>)}</select></label>
        {!bundledLanguage(settings.language)&&<p role="note" className="text-xs text-neutral-400">{platformSpelling()?'Checked with the spelling dictionaries of your Mac. macOS chooses among the languages in System Settings › General › Language & Region; add the language there if words are not checked.':'This language is checked in the DraftCraft Pro app with the spelling dictionaries of your Mac. It is not available here, so spelling is not checked.'}</p>}
        <fieldset className="dc-custom-autocorrect border-t border-white/10 pt-4" aria-label="Custom Autocorrect"><legend className="text-xs font-semibold">Custom Autocorrect</legend>
          <p className="text-xs text-neutral-400 mt-1">Your own replacements, applied when you type a space, punctuation or Return after them, in every element. They work even with spelling correction off. Undo (or Backspace straight away) restores what you typed.</p>
          <label className="flex items-center justify-between gap-3 text-xs cursor-pointer mt-2"><span>Use Custom Autocorrect</span><input type="checkbox" checked={settings.customAutocorrect} onChange={e=>onChange({...settings,customAutocorrect:e.target.checked})} className="accent-amber-500" /></label>
          <div className="flex gap-2 mt-2"><input aria-label="Replace" placeholder="Replace" value={from} onChange={e=>setFrom(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addPair();}}} className="dc-bg-elevated border border-white/15 rounded px-2 py-1 text-xs min-w-0 w-28" />
            <input aria-label="With" placeholder="With" value={to} onChange={e=>setTo(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addPair();}}} className="dc-bg-elevated border border-white/15 rounded px-2 py-1 text-xs min-w-0 flex-1" />
            <button onClick={addPair} className="px-3 py-1 bg-amber-500 text-black rounded text-xs">{pairs.some(p=>sameFrom(p.from,from.trim()))?'Update':'Add'}</button></div>
          <p role="status" className="text-xs text-neutral-400 mt-1">{pairNotice}</p>
          <ul aria-label="Custom replacements" className="max-h-40 overflow-y-auto mt-2 space-y-1">{pairs.map(pair=><li key={pair.from} className="flex justify-between items-center gap-2 text-xs"><span className="min-w-0 truncate"><b>{pair.from}</b> → {pair.to||<i>(delete)</i>}</span>
            <span className="flex gap-2 shrink-0"><button aria-label={'Edit replacement '+pair.from} onClick={()=>{setFrom(pair.from);setTo(pair.to);setPairNotice('Change the replacement, then choose Update.');}} className="text-neutral-400 hover:text-white">Edit</button>
            <button aria-label={'Delete replacement '+pair.from} onClick={()=>{onChange({...settings,replacements:pairs.filter(p=>p!==pair)});setPairNotice('Replacement deleted.');}} className="text-neutral-400 hover:text-red-400">Delete</button></span></li>)}</ul>
          <div className="flex gap-2 mt-2"><label className="px-3 py-1 border border-white/15 rounded text-xs cursor-pointer">Import…<input type="file" aria-label="Import replacements" accept=".txt,.tsv,.csv,.json,text/plain,application/json" className="sr-only" onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void importPairs(file);}} /></label>
            <button disabled={!pairs.length} onClick={()=>downloadText('DraftCraft-Autocorrect.txt',formatReplacements(pairs),'text/plain')} className="px-3 py-1 border border-white/15 rounded text-xs disabled:opacity-40">Export…</button></div>
        </fieldset>
        <fieldset className="border-t border-white/10 pt-4"><legend className="text-xs font-semibold">Manage Custom Dictionary</legend>
          <div className="flex gap-2 mt-2"><input aria-label="Custom dictionary word" value={word} onChange={e=>setWord(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();add();}}} className="dc-bg-elevated border border-white/15 rounded px-2 py-1 text-xs min-w-0 flex-1" /><button onClick={add} className="px-3 py-1 bg-amber-500 text-black rounded text-xs">Add Word</button></div>
          <p role="status" className="text-xs text-neutral-400 mt-1">{notice}</p>
          <ul className="max-h-32 overflow-y-auto mt-2 space-y-1">{settings.customWords.map(item=><li key={item} className="flex justify-between items-center text-xs"><span>{item}</span><button aria-label={'Remove '+item+' from dictionary'} onClick={()=>onChange({...settings,customWords:settings.customWords.filter(w=>w!==item)})} className="text-neutral-400 hover:text-red-400">Remove</button></li>)}</ul>
        </fieldset>
      </div>
    </section>
  </DialogOverlay>;
}
