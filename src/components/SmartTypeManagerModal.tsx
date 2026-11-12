import { TextPrompt, type TextPromptRequest } from '../workspace/TextPrompt';
import { DialogOverlay, useOverlayVisibility } from './ui/Presentation';
import React, { useState } from 'react';
import { SmartTypeDictionary } from '../utils/smartType';
import {DEFAULT_SMART,type SmartTypePreferences} from '../formats/model';
import type {Paragraph} from '../types/script';
import {characterName} from '../writing/model';
import {
  Sparkles,
  RefreshCw,
  Plus,
  Trash2,
  Users,
  MapPin,
  Clock,
  ArrowRight,
  Layers,
} from 'lucide-react';

interface SmartTypeManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  dict: SmartTypeDictionary;
  onUpdateDict: (dict: SmartTypeDictionary) => void;
  onRebuildFromScript: () => void;
  preferences?:SmartTypePreferences;
  onPreferences?:(value:SmartTypePreferences)=>void;
  paragraphs?:Paragraph[];
  onRenameCharacter?:(from:string,to:string)=>void;
}

export const SmartTypeManagerModal: React.FC<SmartTypeManagerModalProps> = ({
  isOpen,
  onClose,
  dict,
  onUpdateDict,
  onRebuildFromScript,
  preferences=DEFAULT_SMART,onPreferences,paragraphs=[],onRenameCharacter,
}) => {
  const [textPrompt, setTextPrompt] = useState<TextPromptRequest | null>(null);
  const [activeTab, setActiveTab] = useState<keyof SmartTypeDictionary>('characters');
  const [newItemText, setNewItemText] = useState('');

  const showUI = useOverlayVisibility(isOpen);
  if (!showUI) return null;

  const excluded=new Set(preferences.excluded[activeTab]||[]);
  const currentList = [...new Set([...(dict[activeTab]||[]),...(preferences.entries[activeTab]||[])])].filter(v=>!excluded.has(v)).sort((a,b)=>preferences.sort==='alphabetical'?a.localeCompare(b):paragraphs.filter(p=>p.type==='Character'&&characterName(p.text)===b).length-paragraphs.filter(p=>p.type==='Character'&&characterName(p.text)===a).length||a.localeCompare(b));

  const handleAddItem = () => {
    const val = newItemText.trim().toUpperCase();
    if (!val || currentList.includes(val)) return;

    onUpdateDict({
      ...dict,
      [activeTab]: [...currentList, val].sort(),
    });
    setNewItemText('');
  };

  const handleDeleteItem = (item: string) => {
    onUpdateDict({
      ...dict,
      [activeTab]: currentList.filter((x) => x !== item),
    });
  };

  return (<>
      {textPrompt&&<TextPrompt key={textPrompt.title+textPrompt.value} request={textPrompt} onClose={()=>setTextPrompt(null)}/>}
    <DialogOverlay open={isOpen} onClose={onClose} className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1f1f28] dc-bg-panel border border-white/15 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col text-neutral-200">
        {/* Header */}
        <div className="p-4 bg-[#181820] dc-bg-sidebar border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>DraftCraft SmartType Manager</span>
                <span className="text-[10px] dc-meta font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Document lists
                </span>
              </h3>
              <p className="text-xs text-neutral-400">
                Manage learned characters, scene locations, times of day, and extensions.
              </p>
            </div>
          </div>
          <button aria-label="Close dialog" onClick={onClose} className="text-neutral-400 hover:text-white p-1 rounded-md">
            ✕
          </button>
        </div>

        {/* Tab selection */}
        <div className="px-5 pt-3 border-b border-white/10 flex items-center justify-between text-xs">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('characters')}
              className={`px-3 py-1.5 rounded-t-lg font-medium transition-colors ${
                activeTab === 'characters'
                  ? 'bg-neutral-800 text-white border-t border-x border-white/10'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Characters ({dict.characters.length})
            </button>
            <button
              onClick={() => setActiveTab('locations')}
              className={`px-3 py-1.5 rounded-t-lg font-medium transition-colors ${
                activeTab === 'locations'
                  ? 'bg-neutral-800 text-white border-t border-x border-white/10'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Locations ({dict.locations.length})
            </button>
            <button
              onClick={() => setActiveTab('timesOfDay')}
              className={`px-3 py-1.5 rounded-t-lg font-medium transition-colors ${
                activeTab === 'timesOfDay'
                  ? 'bg-neutral-800 text-white border-t border-x border-white/10'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Times of Day ({dict.timesOfDay.length})
            </button>
            <button
              onClick={() => setActiveTab('extensions')}
              className={`px-3 py-1.5 rounded-t-lg font-medium transition-colors ${
                activeTab === 'extensions'
                  ? 'bg-neutral-800 text-white border-t border-x border-white/10'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Extensions ({dict.extensions.length})
            </button>
            <button
              onClick={() => setActiveTab('transitions')}
              className={`px-3 py-1.5 rounded-t-lg font-medium transition-colors ${
                activeTab === 'transitions'
                  ? 'bg-neutral-800 text-white border-t border-x border-white/10'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Transitions ({dict.transitions.length})
            </button>
          </div>

          <button
            onClick={onRebuildFromScript}
            className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 pb-1 hover:underline"
            title="Scan current script and rebuild entries"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Rebuild from Script</span>
          </button>
        </div>

        <div className="px-4 py-3 flex flex-wrap gap-3 text-xs">
          <label>Category <select aria-label="SmartType Category" value={activeTab} onChange={e=>setActiveTab(e.target.value as keyof SmartTypeDictionary)} className="bg-neutral-800 p-1 rounded">{(['characters','locations','intros','timesOfDay','extensions','transitions'] as (keyof SmartTypeDictionary)[]).map(k=><option key={k}>{k}</option>)}</select></label>
          <label><input type="checkbox" checked={!preferences.disabled.includes(activeTab)} onChange={e=>onPreferences?.({...preferences,disabled:e.target.checked?preferences.disabled.filter(k=>k!==activeTab):[...preferences.disabled,activeTab]})}/> Enable category</label>
          <label>Accept with <select aria-label="SmartType Accept" className="bg-neutral-800" value={preferences.accept} onChange={e=>onPreferences?.({...preferences,accept:e.target.value as SmartTypePreferences['accept']})}><option value="both">Tab or Return</option><option value="tab">Tab</option><option value="enter">Return</option></select></label>
          <label>Sort <select aria-label="SmartType Sort" className="bg-neutral-800" value={preferences.sort} onChange={e=>onPreferences?.({...preferences,sort:e.target.value as SmartTypePreferences['sort']})}><option value="usage">By usage</option><option value="alphabetical">Alphabetical</option></select></label>
          <label><input type="checkbox" checked={preferences.predict} onChange={e=>onPreferences?.({...preferences,predict:e.target.checked})}/> Suggest next speaker</label>
        </div>
        {/* Add Entry input */}
        <div className="p-4 bg-black/20 border-b border-white/5 flex gap-2">
          <input
            type="text"
            placeholder={`Add new ${activeTab.slice(0, -1)} entry...`}
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
            className="flex-1 bg-black/40 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white font-screenplay uppercase focus:outline-none focus:border-amber-500/50"
          />
          <button
            onClick={handleAddItem}
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-lg flex items-center gap-1 shadow-md transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>

        {/* Entries list */}
        <div className="p-4 flex-1 overflow-y-auto max-h-72 grid grid-cols-2 gap-2 text-xs font-screenplay">
          {currentList.map((item) => (
            <div
              key={item}
              className="p-2 bg-black/30 border border-white/10 rounded-lg flex items-center justify-between group hover:border-amber-400/40 transition-colors"
            >
              <span className="font-semibold text-neutral-200 truncate pr-2">{item}</span>
              <button className="p-1 text-amber-300" aria-label={'Edit '+item} onClick={()=>setTextPrompt({title:'Edit '+item,value:item,apply:raw=>{const value=raw.trim().toUpperCase();if(!value||value===item)return;if(activeTab==='characters')onRenameCharacter?.(item,value);onUpdateDict({...dict,[activeTab]:[...new Set(currentList.map(v=>v===item?value:v))]});}})}>Edit</button>
              <button aria-label="Delete Entry"
                onClick={() => handleDeleteItem(item)}
                className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-red-400 p-0.5 transition-opacity"
                title="Delete Entry"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#181820] dc-bg-sidebar border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-medium text-xs rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </DialogOverlay>
  </>);
};
