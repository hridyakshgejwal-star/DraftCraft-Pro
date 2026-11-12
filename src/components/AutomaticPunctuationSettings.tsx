import React from 'react';
import {DialogOverlay,useOverlayVisibility} from './ui/Presentation';
import type {PunctuationSettings} from '../writing/punctuationPreferences';

export function AutomaticPunctuationSettings({open,onClose,settings,onChange}:{open:boolean;onClose:()=>void;settings:PunctuationSettings;onChange:(settings:PunctuationSettings)=>void}){
  const visible=useOverlayVisibility(open);
  if(!visible)return null;
  const options:[Exclude<keyof PunctuationSettings,'enabled'>,string,string][]=[
    ['fullStops','Automatic Full Stops','Use periods for complete statements and ordinary commands.'],
    ['questions','Automatic Question Marks','Recognize direct questions and supported conversational question forms.'],
    ['conservativeExclamations','Conservative Exclamation Detection','Use an exclamation only with strong supporting context. Turn off to prevent automatic exclamation marks.'],
    ['incompleteSentences','Detect Incomplete Sentences','Leave unfinished phrases unchanged. Turning this off relaxes those checks.'],
    ['onEnter','Apply Punctuation on Enter/Return','Finish the current sentence and continue the normal screenplay element transition.'],
    ['whileTyping','Detect Sentence Boundaries While Typing','Optional: two spaces at the end of a complete sentence insert its ending mark. Single spaces never trigger this.'],
  ];
  return <DialogOverlay open={open} label="Intelligent Automatic Punctuation" className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
    <section onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();onClose();}}} className="dc-bg-panel rounded-2xl border border-white/15 shadow-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto text-neutral-200">
      <header className="flex items-center justify-between gap-4 border-b border-white/10 p-4"><h2 className="text-sm font-semibold">Intelligent Automatic Punctuation</h2><button aria-label="Close Automatic Punctuation Settings" onClick={onClose} className="text-xl leading-none px-1">×</button></header>
      <div className="p-4 space-y-5">
        <p className="text-xs leading-relaxed text-neutral-400">Finish an English sentence and press Return. Local sentence analysis adds a suitable ending when confident. Existing punctuation, interruptions, names and screenplay headings stay as written.</p>
        <label className="flex items-center justify-between gap-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm font-medium cursor-pointer"><span>Automatically Detect and Insert Sentence Punctuation</span><input type="checkbox" checked={settings.enabled} onChange={e=>onChange({...settings,enabled:e.target.checked})} className="accent-amber-500 shrink-0" /></label>
        <p role="status" className="text-xs text-neutral-400">{settings.enabled?'On · Changes take effect immediately.':'Off · Sentence endings are fully manual.'}</p>
        <fieldset disabled={!settings.enabled} className="space-y-4 disabled:opacity-50"><legend className="text-xs font-semibold mb-3">Advanced Settings</legend>
          {options.map(([key,label,hint])=><label key={key} className="flex items-start justify-between gap-4 cursor-pointer"><span className="min-w-0"><span className="block text-xs font-medium">{label}</span><span className="block text-xs leading-relaxed text-neutral-500 mt-1">{hint}</span></span><input type="checkbox" aria-label={label} checked={settings[key]} onChange={e=>onChange({...settings,[key]:e.target.checked})} className="accent-amber-500 shrink-0 mt-1" /></label>)}
        </fieldset>
        <p className="text-xs leading-relaxed text-neutral-500 border-t border-white/10 pt-3">Return and automatic punctuation share one Undo step. Removing or undoing an automatic ending is remembered for that unchanged sentence. Ambiguous wording can remain unpunctuated; you retain control.</p>
      </div>
      <footer className="border-t border-white/10 p-4 flex justify-end"><button onClick={onClose} className="px-4 py-1.5 bg-amber-500 text-black rounded-lg text-xs font-medium">Done</button></footer>
    </section>
  </DialogOverlay>;
}
