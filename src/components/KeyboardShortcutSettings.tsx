import React, { useEffect, useRef, useState } from 'react';
import { DialogOverlay } from './ui/Presentation';
import type { CharacterRecord } from '../writing/model';
import { activeProfile, assignment, captureShortcut, characterCommands, COMMANDS, conflictFor, defaultProfile, displayShortcut, ELEMENTS, importProfile, validateShortcut, type CharacterShortcuts, type Shortcut, type ShortcutProfile, type ShortcutSettings } from '../shortcuts/model';

interface Props { settings: ShortcutSettings; characters: CharacterRecord[]; characterShortcuts: CharacterShortcuts; onChange: (settings: ShortcutSettings, characters: CharacterShortcuts) => void; onClose: () => void }
export function KeyboardShortcutSettings({ settings, characters, characterShortcuts, onChange, onClose }: Props) {
  const initial = useRef({ settings: structuredClone(settings), characters: structuredClone(characterShortcuts) });
  const [past, setPast] = useState<{ settings: ShortcutSettings; characters: CharacterShortcuts }[]>([]);
  const [query, setQuery] = useState(''), [category, setCategory] = useState('All'), [assigned, setAssigned] = useState('All');
  const [recording, setRecording] = useState<string | null>(null), [notice, setNotice] = useState('');
  const [conflict, setConflict] = useState<{ id: string; binding: Shortcut; previous: string } | null>(null);
  const [reset, setReset] = useState(false);
  const isRecording = !!recording && !conflict && !reset;
  useEffect(() => {
    // Route native menu accelerators into the recorder during capture only.
    void window.draftcraftDesktop?.setShortcutRecording?.(isRecording);
    return () => { void window.draftcraftDesktop?.setShortcutRecording?.(false); };
  }, [isRecording]);
  const importInput = useRef<HTMLInputElement>(null);
  const profile = activeProfile(settings);
  const commands = [...COMMANDS, ...characterCommands(characters), { id: 'mode', label: 'Activate Shortcut Mode', category: 'Other' as const }];
  const label = (id: string) => commands.find(c => c.id === id)?.label || 'a character in this project';
  const commit = (next: ShortcutSettings, names = characterShortcuts) => { setPast(p => [...p.slice(-19), { settings, characters: characterShortcuts }]); onChange(next, names); };
  const updateProfile = (next: ShortcutProfile, names = characterShortcuts) => commit({ ...settings, profiles: settings.profiles.map(p => p.id === next.id ? next : p) }, names);
  const setBinding = (id: string, binding: Shortcut | null, replace?: string) => {
    const next = structuredClone(profile), names = { ...characterShortcuts };
    const apply = (command: string, value: Shortcut | null) => { if (command === 'mode') next.modeKey = value; else if (command.startsWith('character:')) names[command.slice(10)] = value; else next.bindings[command] = value; };
    if (replace) apply(replace, null); apply(id, binding); updateProfile(next, names);
    setRecording(null); setConflict(null); setNotice(label(id) + (binding ? ' saved: ' + displayShortcut(binding) : ' shortcut cleared.'));
  };
  const record = (binding: Shortcut) => {
    if (!recording) return;
    const error = validateShortcut(binding, recording === 'mode'); if (error) { setNotice(error); return; }
    const previous = conflictFor(profile, characterShortcuts, recording, binding);
    if (previous) { setConflict({ id: recording, binding, previous }); return; }
    setBinding(recording, binding);
  };
  const switchProfile = (id: string) => {
    const target = settings.profiles.find(p => p.id === id); if (!target) return;
    for (const [command, binding] of Object.entries(target.bindings)) if (binding) { const overlap = conflictFor(target, characterShortcuts, command, binding); if (overlap) { setNotice('Cannot activate this profile: ' + label(command) + ' conflicts with ' + label(overlap) + '. Clear the project shortcut first.'); return; } }
    if (target.modeKey && conflictFor(target, characterShortcuts, 'mode', target.modeKey)) { setNotice('Shortcut Mode conflicts with a project shortcut. Clear it before switching profiles.'); return; }
    setRecording(null); commit({ ...settings, activeId: id }); setNotice('Profile activated.');
  };
  const duplicate = () => {
    if (settings.profiles.length >= 50) { setNotice('You can keep up to 50 profiles.'); return; }
    const next = structuredClone(profile); next.id = crypto.randomUUID(); next.name = profile.name.slice(0, 65) + ' Copy';
    commit({ ...settings, activeId: next.id, profiles: [...settings.profiles, next] }); setNotice('Profile duplicated. Edit its name below.');
  };
  const exportCurrent = () => {
    const blob = new Blob([JSON.stringify({ format: 'draftcraft-shortcuts', version: 1, profile }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = profile.name.replace(/[^\p{L}\p{N} _-]/gu, '') + '.shortcuts.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const importCurrent = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 256 * 1024 || settings.profiles.length >= 50) throw new Error('Use a profile smaller than 256 KB; keep up to 50 profiles.');
      const raw = JSON.parse(await file.text()); if (raw.format !== 'draftcraft-shortcuts' || raw.version !== 1) throw new Error('Choose an exported DraftCraft shortcut profile.');
      const next = importProfile(raw.profile);
      const overlap = Object.entries(next.bindings).find(([id, b]) => b && conflictFor(next, characterShortcuts, id, b));
      if (overlap || (next.modeKey && conflictFor(next, characterShortcuts, 'mode', next.modeKey))) throw new Error('Imported profile conflicts with a project character shortcut. Clear that shortcut before importing.');
      commit({ ...settings, activeId: next.id, profiles: [...settings.profiles, next] }); setNotice('Profile imported and activated.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not import this profile.'); }
    if (importInput.current) importInput.current.value = '';
  };
  const resetAll = () => {
    updateProfile(defaultProfile(profile.id, profile.name), Object.fromEntries(Object.keys(characterShortcuts).map(id => [id, null]))); setRecording(null); setReset(false); setNotice('Active profile and this project’s character shortcuts restored to defaults. Other profiles are preserved.');
  };
  const rows = commands.filter(c => (category === 'All' || c.category === category) && c.label.toLocaleLowerCase().includes(query.toLocaleLowerCase()) && (assigned === 'All' || (assigned === 'Assigned') === !!assignment(profile, characterShortcuts, c.id)));
  return <DialogOverlay open label="Keyboard Shortcuts" className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
    <section className="dc-shortcut-settings relative dc-bg-panel w-full max-w-3xl rounded-2xl border border-white/15 shadow-2xl flex flex-col max-h-[90vh] text-neutral-200" onKeyDownCapture={e => {
      // Record within the existing modal, never through a global keyboard listener.
      if (recording && !conflict && !reset) {
        e.preventDefault(); e.stopPropagation(); if (e.repeat || e.nativeEvent.isComposing) return;
        if (e.key === 'Escape') { setRecording(null); setNotice('Recording cancelled.'); return; }
        const binding = captureShortcut(e.nativeEvent); if (binding) record(binding);
      } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (conflict) setConflict(null); else if (reset) setReset(false); else onClose(); }
    }} onKeyUpCapture={e => { if (recording === 'mode' && !conflict && e.key === 'Alt') { e.preventDefault(); e.stopPropagation(); const binding = captureShortcut(e.nativeEvent, true); if (binding) record(binding); } }}>
      <header inert={!!conflict || reset || undefined} className="p-5 border-b border-white/10 flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">Keyboard Shortcuts</h2><p className="text-xs text-neutral-400 mt-1">Customize how you write your screenplay.</p></div><button aria-label="Close keyboard shortcuts" onClick={onClose} className="dc-shortcut-button">×</button></header>
      <div inert={!!conflict || reset || undefined} className="overflow-y-auto px-5 py-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2"><label className="text-xs">Profile <select aria-label="Shortcut profile" value={profile.id} onChange={e => switchProfile(e.target.value)} className="dc-shortcut-input ml-2">{settings.profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><button className="dc-shortcut-button" onClick={duplicate}>Duplicate Profile</button><button className="dc-shortcut-button" onClick={() => { const next = defaultProfile(crypto.randomUUID(), 'New Profile'); next.bindings = Object.fromEntries(COMMANDS.map(c => [c.id, null])); next.modeKey = null; if (settings.profiles.length < 50) commit({ ...settings, activeId: next.id, profiles: [...settings.profiles, next] }); }}>New Profile</button><button className="dc-shortcut-button" onClick={exportCurrent}>Export Profile</button><button className="dc-shortcut-button" onClick={() => importInput.current?.click()}>Import Profile</button><input ref={importInput} type="file" accept=".json" hidden onChange={e => void importCurrent(e.target.files?.[0])} /></div>
        <label className="text-xs flex items-center gap-3">Profile name <input aria-label="Profile name" className="dc-shortcut-input flex-1" maxLength={80} value={profile.name} onChange={e => { if (e.target.value.trim()) updateProfile({ ...profile, name: e.target.value }); }} /></label>
        <div className="flex flex-wrap gap-2"><input aria-label="Search shortcuts" placeholder="Search commands…" className="dc-shortcut-input flex-1 min-w-32" value={query} onChange={e => setQuery(e.target.value)} /><select aria-label="Shortcut category" className="dc-shortcut-input" value={category} onChange={e => setCategory(e.target.value)}>{['All', 'Elements', 'Quick Inserts', 'Characters', 'Other'].map(c => <option key={c}>{c}</option>)}</select><select aria-label="Shortcut assignment filter" className="dc-shortcut-input" value={assigned} onChange={e => setAssigned(e.target.value)}>{['All', 'Assigned', 'Unassigned'].map(c => <option key={c}>{c}</option>)}</select></div>
        <p className="text-xs text-neutral-400">Element commands preserve text. Insert commands add a new paragraph when the current one has text. Letter shortcuts require Shortcut Mode; character shortcuts belong to this screenplay.</p>
        <p role="status" aria-live="polite" className="text-xs text-amber-400 min-h-5">{notice || 'Changes save automatically. Click a shortcut to record keys; Escape cancels recording.'}</p>
        <div className="border border-white/10 rounded-lg overflow-hidden"><table className="w-full text-xs"><thead className="dc-bg-elevated"><tr><th className="text-left px-3 py-2">Command</th><th className="text-left px-3 py-2">Shortcut</th><th className="sr-only">Actions</th></tr></thead><tbody>{rows.map(c => <tr key={c.id} data-shortcut-command={c.id} className="border-t border-white/10"><td className="px-3 py-2"><span>{c.label}</span><span className="block text-[10px] text-neutral-500">{c.category === 'Characters' ? 'This screenplay' : c.category}</span></td><td className="px-3 py-2"><button className={'dc-shortcut-input min-w-28 text-left ' + (recording === c.id ? 'ring-2 ring-amber-500' : '')} aria-label={'Edit shortcut for ' + c.label} aria-pressed={recording === c.id} onClick={() => { setRecording(c.id); setNotice('Press your new shortcut…' + (c.id === 'mode' ? ' You can also press and release Option.' : '')); }}>{recording === c.id ? 'Press your new shortcut…' : displayShortcut(assignment(profile, characterShortcuts, c.id))}</button></td><td className="px-3 py-2"><div className="flex gap-2 justify-end"><button className="dc-shortcut-button" aria-label={'Clear shortcut for ' + c.label} onClick={() => setBinding(c.id, null)}>Clear</button><button className="dc-shortcut-button" aria-label={'Restore default for ' + c.label} onClick={() => { const b = assignment(defaultProfile(), {}, c.id); const overlap = b && conflictFor(profile, characterShortcuts, c.id, b); if (b && overlap) setConflict({ id: c.id, binding: b, previous: overlap }); else setBinding(c.id, b); }}>Default</button></div></td></tr>)}</tbody></table>{!rows.length && <p className="text-xs text-neutral-400 p-4">No matching commands. Characters appear after you use or save them in this screenplay.</p>}</div>
        <details className="border-t border-white/10 pt-3"><summary className="text-sm cursor-pointer">Enter and Tab behavior</summary><div className="mt-3 space-y-3"><label className="text-xs flex items-center justify-between gap-2">Dialogue exit<select aria-label="Dialogue exit behavior" className="dc-shortcut-input" value={profile.navigation.dialogueExit} onChange={e => updateProfile({ ...profile, navigation: { ...profile.navigation, dialogueExit: e.target.value as ShortcutProfile['navigation']['dialogueExit'] } })}><option value="legacy">Use Enter rule (current behavior)</option><option value="enter">Enter → Action</option><option value="double-enter">Repeated Enter → Action</option><option value="shortcut">Enter stays Dialogue; use Action shortcut</option></select></label><table className="w-full text-xs"><thead><tr><th className="text-left">Element</th><th className="text-left">Return →</th><th className="text-left">Tab →</th></tr></thead><tbody>{ELEMENTS.map(type => <tr key={type}><td className="py-1">{type}</td>{(['enter', 'tab'] as const).map(rule => <td key={rule} className="py-1"><select className="dc-shortcut-input" aria-label={(rule === 'enter' ? 'Enter' : 'Tab') + ' after ' + type} value={profile.navigation[rule][type]} onChange={e => updateProfile({ ...profile, navigation: { ...profile.navigation, [rule]: { ...profile.navigation[rule], [type]: e.target.value } } })}>{ELEMENTS.map(t => <option key={t}>{t}</option>)}</select></td>)}</tr>)}</tbody></table><p className="text-xs text-neutral-400">Return splits at the selection. Repeated Enter reuses the empty dialogue line as Action. Shift+Return inserts a line break; Shift+Tab keeps focus navigation.</p></div></details>
      </div>
      <footer inert={!!conflict || reset || undefined} className="p-4 border-t border-white/10 flex flex-wrap justify-between gap-2"><div className="flex gap-2"><button className="dc-shortcut-button" onClick={() => setReset(true)}>Reset All Shortcuts</button><button className="dc-shortcut-button" disabled={!past.length} onClick={() => { const previous = past.at(-1); if (previous) { onChange(previous.settings, previous.characters); setPast(p => p.slice(0, -1)); setRecording(null); setNotice('Last settings change undone.'); } }}>Undo Settings Change</button></div><div className="flex gap-2"><button className="dc-shortcut-button" onClick={() => { onChange(initial.current.settings, initial.current.characters); onClose(); }}>Cancel Changes</button><button className="dc-shortcut-button bg-amber-500 text-black" onClick={onClose}>Done</button></div></footer>
      {conflict && <div role="alertdialog" aria-modal="true" aria-labelledby="dc-conflict-title" className="absolute inset-0 z-10 bg-black/80 flex items-center justify-center p-5 rounded-2xl"><div className="dc-bg-panel border border-white/20 rounded-xl p-5 max-w-md shadow-xl"><h3 id="dc-conflict-title" className="font-semibold">Shortcut Already Assigned</h3><p className="text-sm mt-2">This shortcut is currently assigned to {label(conflict.previous)}. Would you like to replace it?</p><div className="flex flex-wrap gap-2 mt-4"><button autoFocus className="dc-shortcut-button" onClick={() => { setRecording(conflict.id); setConflict(null); setNotice('Press another shortcut…'); }}>Choose Another</button><button className="dc-shortcut-button bg-amber-500 text-black" onClick={() => setBinding(conflict.id, conflict.binding, conflict.previous)}>Replace Shortcut</button><button className="dc-shortcut-button" onClick={() => { setConflict(null); setRecording(null); setNotice('Assignment cancelled.'); }}>Cancel</button></div></div></div>}
      {reset && <div role="alertdialog" aria-modal="true" aria-labelledby="dc-reset-title" className="absolute inset-0 z-10 bg-black/80 flex items-center justify-center p-5 rounded-2xl"><div className="dc-bg-panel border border-white/20 rounded-xl p-5 max-w-md"><h3 id="dc-reset-title" className="font-semibold">Restore default shortcuts?</h3><p className="text-sm mt-2">Reset the active profile, its navigation rules, Shortcut Mode, and this screenplay’s character shortcuts.</p><div className="flex gap-2 mt-4"><button autoFocus className="dc-shortcut-button" onClick={() => setReset(false)}>Cancel</button><button className="dc-shortcut-button" onClick={resetAll}>Restore Defaults</button></div></div></div>}
    </section>
  </DialogOverlay>;
}
