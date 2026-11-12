// Navigator views added in 1.16: Locations, Outline elements and character interactions. They read the same
// document and pagination as the rest of the app, and jump to the script with the Navigator's own scene navigation.
import React, { useMemo, useState } from 'react';
import type { ScriptDocument } from '../types/script';
import { characterName } from '../writing/model';
import { documentLayout } from '../production/layout';
import { buildStoryIndex } from '../story/model';
import { pageLabel, spanOf, DEFAULT_LANES } from './Timeline';

const INTRO = /^(INT\.?\s*\/\s*EXT\.?|EXT\.?\s*\/\s*INT\.?|I\s*\/\s*E\.?|INT\.|EXT\.|INT|EXT)\s*/i;
export interface LocationRow { name: string; intExt: string; scenes: { index: number; id: string; heading: string; time: string; pages: number }[]; pages: number; times: string[] }
/** Scene headings grouped by location ("INT. KITCHEN - NIGHT" → KITCHEN), with scene counts, page lengths and times. */
export function locationRows(doc: ScriptDocument): LocationRow[] {
  const index = buildStoryIndex(doc.paragraphs, doc.lockedPages, documentLayout(doc).pages), rows = new Map<string, LocationRow>();
  for (const scene of index.scenes) {
    const heading = scene.heading.trim(), intro = heading.match(INTRO)?.[1]?.toUpperCase().replace(/\s+/g, '') || '';
    const rest = heading.replace(INTRO, ''), parts = rest.split(/\s+[-–—]\s+/), name = (parts.length > 1 ? parts.slice(0, -1).join(' - ') : rest).trim().toUpperCase() || '(No location)';
    const time = parts.length > 1 ? parts.at(-1)!.trim().toUpperCase() : '';
    const row = rows.get(name) || { name, intExt: '', scenes: [], pages: 0, times: [] };
    row.scenes.push({ index: scene.index, id: scene.id, heading, time, pages: scene.end - scene.start }); row.pages += scene.end - scene.start;
    const ie = intro.startsWith('INT') && intro.includes('EXT') || intro.startsWith('EXT') && intro.includes('INT') || intro.startsWith('I/E') ? 'INT./EXT.' : intro.startsWith('EXT') ? 'EXT.' : intro.startsWith('INT') ? 'INT.' : '';
    row.intExt = !row.intExt ? ie : row.intExt === ie ? ie : 'INT./EXT.'; if (time && !row.times.includes(time)) row.times.push(time);
    rows.set(name, row);
  }
  return [...rows.values()];
}
export function LocationsTab({ doc, query, onSelectScene }: { doc: ScriptDocument; query: string; onSelectScene: (index: number) => void }) {
  const [sort, setSort] = useState<'first' | 'name' | 'scenes' | 'pages'>('first');
  const [open, setOpen] = useState<string | null>(null);
  const rows = useMemo(() => locationRows(doc), [doc.paragraphs, doc.writingFormat]);
  const shown = rows.filter(r => !query || r.name.toLowerCase().includes(query.toLowerCase())).sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : sort === 'scenes' ? b.scenes.length - a.scenes.length : sort === 'pages' ? b.pages - a.pages : a.scenes[0].index - b.scenes[0].index);
  return <div className="dc-nav-extra" role="region" aria-label="Locations">
    <label className="dc-nav-sort">Sort <select aria-label="Sort locations" value={sort} onChange={e => setSort(e.target.value as typeof sort)}><option value="first">Script order</option><option value="name">Name</option><option value="scenes">Most scenes</option><option value="pages">Most pages</option></select></label>
    {!shown.length && <p className="dc-nav-empty">{rows.length ? 'No locations match the filter.' : 'Locations appear here from scene headings.'}</p>}
    <table className="dc-nav-table"><thead><tr><th>Location</th><th>I/E</th><th title="Scenes">Sc.</th><th title="Pages">Pg.</th></tr></thead><tbody>
      {shown.map(r => <React.Fragment key={r.name}><tr className="dc-nav-row" onClick={() => setOpen(open === r.name ? null : r.name)} onDoubleClick={() => onSelectScene(r.scenes[0].index)} title={(r.times.join(', ') || 'No time of day') + ' — double-click for the first scene'}>
        <td><button type="button" className="dc-nav-link" aria-expanded={open === r.name} aria-label={r.name + ', ' + r.scenes.length + ' scenes'} onClick={e => { e.stopPropagation(); setOpen(open === r.name ? null : r.name); }}>{open === r.name ? '▾' : '▸'} {r.name}</button></td><td>{r.intExt}</td><td>{r.scenes.length}</td><td>{r.pages.toFixed(1)}</td></tr>
        {open === r.name && r.scenes.map(s => <tr key={s.id} className="dc-nav-subrow"><td colSpan={4}><button type="button" className="dc-nav-link" onClick={() => onSelectScene(s.index)}>{s.heading}</button><span>{s.pages.toFixed(2)} pg</span></td></tr>)}
      </React.Fragment>)}
    </tbody></table>
  </div>;
}
export function OutlineTab({ doc, query, onSelectScene, onPage }: { doc: ScriptDocument; query: string; onSelectScene: (index: number) => void; onPage: (page: number) => void }) {
  const index = useMemo(() => buildStoryIndex(doc.paragraphs, doc.lockedPages, documentLayout(doc).pages), [doc.paragraphs, doc.writingFormat, doc.lockedPages]);
  const lanes = doc.outlineLanes.length ? doc.outlineLanes : DEFAULT_LANES;
  const inScript = doc.paragraphs.map((p, i) => ({ p, i })).filter(({ p }) => ['Outline Level 1', 'Outline Level 2', 'Outline Level 3', 'New Act', 'Sequence'].includes(p.type) && (!query || p.text.toLowerCase().includes(query.toLowerCase())));
  return <div className="dc-nav-extra" role="region" aria-label="Outline elements">
    {lanes.map(lane => { const spans = doc.outlineMarkers.filter(m => m.laneId === lane.id && m.visible !== false).map(m => spanOf(m, index, doc.beats)).filter(s => !query || s.title.toLowerCase().includes(query.toLowerCase())).sort((a, b) => a.start - b.start); return <section key={lane.id}>
      <h4 style={{ color: lane.color }}>{lane.name}</h4>
      {!spans.length && <p className="dc-nav-empty">No elements. Double-click this lane on the timeline to add one.</p>}
      <ul>{spans.map(s => <li key={s.marker.id}><button type="button" className="dc-nav-link" onClick={() => { const at = s.marker.anchor?.paragraphId ? doc.paragraphs.findIndex(p => p.id === s.marker.anchor!.paragraphId) : -1; if (at >= 0) onSelectScene(at); else onPage(Math.floor(s.start) + 1); }}>
        <span className="dc-nav-swatch" style={{ background: s.color }} />{s.title}</button><span className="dc-nav-goal">{s.point ? 'p. ' + pageLabel(s.start) : pageLabel(s.start) + ' – ' + pageLabel(s.end)}</span></li>)}</ul>
    </section>; })}
    <section><h4>In the script</h4>{!inScript.length && <p className="dc-nav-empty">Outline elements sent to the script, acts and sequences appear here.</p>}
      <ul>{inScript.map(({ p, i }) => <li key={p.id} data-level={p.type}><button type="button" className="dc-nav-link" onClick={() => onSelectScene(i)}>{p.text || '(empty ' + p.type + ')'}</button><span className="dc-nav-goal">p. {index.paragraphPage.get(p.id) ?? '—'}</span></li>)}</ul></section>
  </div>;
}
/** Characters who share scenes with a character, most frequent first, and how many words that character speaks. */
export function characterInteractions(doc: ScriptDocument) {
  const scenes: Set<string>[] = []; let current: Set<string> | null = null; const words = new Map<string, number>(); let speaker = '';
  for (const p of doc.paragraphs) {
    if (p.type === 'Scene Heading') { current = new Set(); scenes.push(current); speaker = ''; continue; }
    if (p.type === 'Character') { speaker = characterName(p.text); if (speaker) { if (!current) { current = new Set(); scenes.push(current); } current.add(speaker); } }
    else if ((p.type === 'Dialogue' || p.type === 'Dual Dialogue') && speaker) words.set(speaker, (words.get(speaker) || 0) + (p.text.trim() ? p.text.trim().split(/\s+/).length : 0));
    else if (p.type !== 'Parenthetical') speaker = '';
  }
  const pairs = new Map<string, Map<string, number>>();
  for (const scene of scenes) for (const a of scene) for (const b of scene) if (a !== b) { const m = pairs.get(a) || new Map<string, number>(); m.set(b, (m.get(b) || 0) + 1); pairs.set(a, m); }
  return { words, partners: (name: string): [string, number][] => [...(pairs.get(name) || new Map<string, number>()).entries()].sort((a, b) => b[1] - a[1]) };
}
