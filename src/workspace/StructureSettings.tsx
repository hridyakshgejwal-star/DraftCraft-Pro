// Structure Line settings (View › Show › Structure Line Settings…, the toolbar's Show/Hide menu, or right-click a
// line or script text): line width and opacity, which levels are drawn, and each level's default colour. These are
// the writer's drawing preferences, stored with the workspace; whether a screenplay shows its lines at all stays a
// per-document switch. Changes apply at once in the editor and are used by Print and PDF.
import React from 'react';
import { DialogOverlay } from '../components/ui/Presentation';
import { DEFAULT_STRUCTURE, type StructurePreferences } from './preferences';
import { STRUCTURE_NAMES, structureOpacity, structureWidth, type StructureLevel } from '../story/structure';

const PALETTE_SAMPLE = ['#8fc5b8', '#a99be6', '#e9b872', '#969fb9'];
const LEVEL_HINTS = ['New Act and Outline Level 1 regions', 'Sequence and Outline Level 2 regions', 'Outline Level 3 regions', 'One line per scene'];

export function StructureSettings({ value, onChange, shown, onShown, onClose }: {
  value: StructurePreferences; onChange: (value: StructurePreferences) => void;
  /** Whether this screenplay shows Structure Lines (the View › Show › Structure Lines switch). */ shown: boolean; onShown: (shown: boolean) => void;
  onClose: () => void;
}) {
  const set = (patch: Partial<StructurePreferences>) => onChange({ ...value, ...patch });
  const level = (i: number, on: boolean) => { const levels = [...value.levels] as StructurePreferences['levels']; levels[i] = on; set({ levels }); };
  const color = (i: number, c: string) => { const colors = [...value.colors] as StructurePreferences['colors']; colors[i] = c; set({ colors }); };
  return <DialogOverlay open label="Structure Line Settings" onClose={onClose} className="no-print fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
    <div className="dc-files-settings dc-structure-settings">
      <header><div><h2>Structure Lines</h2><p>Lines in the left margin for acts, sequences, outline elements and scenes. They never move text.</p></div><button type="button" onClick={onClose}>Done</button></header>
      <div className="dc-files-scroll">
        <label><input type="checkbox" checked={shown} onChange={e => onShown(e.target.checked)} /> Show Structure Lines in this screenplay</label>
        <fieldset><legend>Lines</legend>
          <label>Width <input type="range" aria-label="Line width" min={1} max={8} step={0.5} value={value.width} onChange={e => set({ width: Number(e.target.value) })} /><output aria-label="Line width value">{value.width} px</output></label>
          <label>Opacity <input type="range" aria-label="Line opacity" min={15} max={100} step={5} value={Math.round(value.opacity * 100)} onChange={e => set({ opacity: Number(e.target.value) / 100 })} /><output aria-label="Line opacity value">{Math.round(value.opacity * 100)} %</output></label>
          <p>Scene lines are drawn at two thirds of the width and 60 % of the opacity, so acts and sequences stand out.</p>
        </fieldset>
        <fieldset><legend>Levels</legend>
          <div className="dc-structure-levels" role="table" aria-label="Structure levels">
            {STRUCTURE_NAMES.map((name, i) => <div key={name} role="row" className="dc-structure-level-row">
              <label role="cell"><input type="checkbox" aria-label={'Show ' + name + ' lines'} checked={value.levels[i]} onChange={e => level(i, e.target.checked)} /> {name}</label>
              <span role="cell" className="dc-structure-hint">{LEVEL_HINTS[i]}</span>
              <span role="cell" className="dc-structure-color">
                <input type="color" aria-label={name + ' default colour'} value={value.colors[i] || PALETTE_SAMPLE[i]} onChange={e => color(i, e.target.value)} />
                <button type="button" aria-label={'Use automatic ' + name + ' colours'} aria-pressed={!value.colors[i]} onClick={() => color(i, '')}>{value.colors[i] ? 'Automatic' : 'Automatic ✓'}</button>
              </span>
              <span role="cell" aria-hidden="true" className="dc-structure-sample" style={{ width: structureWidth(i as StructureLevel, value) + 'px', opacity: value.levels[i] ? structureOpacity(i as StructureLevel, value) : .12, background: value.colors[i] || PALETTE_SAMPLE[i] }} />
            </div>)}
          </div>
          <p>A default colour is used for regions without a colour of their own. Colours set on a timeline element, a beat or a scene always win. Automatic uses the built-in palette.</p>
        </fieldset>
        <div className="dc-file-actions"><button type="button" onClick={() => onChange(structuredClone(DEFAULT_STRUCTURE))}>Restore Defaults</button></div>
      </div>
    </div>
  </DialogOverlay>;
}
