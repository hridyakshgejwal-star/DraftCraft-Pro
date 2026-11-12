import { sliceRuns } from '../editor/crossParagraph';
import {FORMAT_ELEMENTS} from '../formats/model';
import type { ElementType, Paragraph, RevisionTier } from '../types/script';
import type { CharacterRecord } from '../writing/model';

export interface Shortcut { key: string; code?: string; meta: boolean; ctrl: boolean; alt: boolean; shift: boolean; primary?: boolean }
export interface Navigation { enter: Record<string, ElementType>; tab: Record<string, ElementType>; dialogueExit: 'legacy' | 'enter' | 'double-enter' | 'shortcut' }
export interface ShortcutProfile { id: string; name: string; bindings: Record<string, Shortcut | null>; modeKey: Shortcut | null; navigation: Navigation }
export interface ShortcutSettings { version: 1; activeId: string; profiles: ShortcutProfile[] }
export type CharacterShortcuts = Record<string, Shortcut | null>;
export interface ShortcutCommand { id: string; label: string; category: 'Elements' | 'Quick Inserts' | 'Characters' | 'Other'; type?: ElementType; text?: string; characterId?: string }
export const SHORTCUT_SETTINGS_KEY = 'draftcraft_keyboard_shortcuts_v1';
export const ELEMENTS: ElementType[] = FORMAT_ELEMENTS;
export const elementCommand = (type: ElementType) => 'element:' + type;
const inserts: [string, ElementType][] = [['INT.', 'Scene Heading'], ['EXT.', 'Scene Heading'], ['INT./EXT.', 'Scene Heading'], ['CUT TO:', 'Transition'], ['FADE IN:', 'Transition'], ['FADE OUT.', 'Transition'], ['DISSOLVE TO:', 'Transition'], ['SMASH CUT TO:', 'Transition'], ['MATCH CUT TO:', 'Transition'], ['CONTINUED:', 'Transition'], ['INTERCUT:', 'Shot'], ['MONTAGE', 'Shot'], ['SERIES OF SHOTS', 'Shot']];
export const COMMANDS: ShortcutCommand[] = [...ELEMENTS.map(type => ({ id: elementCommand(type), label: type === 'General' ? 'General Text' : type, category: 'Elements' as const, type })), ...inserts.map(([text, type]) => ({ id: 'insert:' + text, label: 'Insert ' + text, category: 'Quick Inserts' as const, text: text + (type === 'Scene Heading' ? ' ' : ''), type })), { id: 'note', label: 'Add Script Note', category: 'Other' }];
export const characterCommands = (records: CharacterRecord[]): ShortcutCommand[] => records.map(record => ({ id: 'character:' + record.id, label: 'Insert ' + record.name, category: 'Characters', characterId: record.id, type: 'Character', text: record.name }));
export const primary = (key: string): Shortcut => ({ key, meta: false, ctrl: false, alt: false, shift: false, primary: true });
export function defaultProfile(id = 'default', name = 'Default DraftCraft Pro'): ShortcutProfile {
  const bindings = Object.fromEntries(COMMANDS.map(c => [c.id, null])) as Record<string, Shortcut | null>;
  ['Scene Heading', 'Action', 'Character', 'Parenthetical', 'Dialogue', 'Transition', 'Shot', 'New Act', 'End of Act'].forEach((type, index) => { bindings['element:' + type] = primary(String(index + 1)); });
  bindings['element:General']=primary('0');
  const enter = Object.fromEntries(ELEMENTS.map(t => [t, 'Action'])) as Record<string, ElementType>;
  Object.assign(enter, { Character: 'Dialogue', Parenthetical: 'Dialogue', Dialogue: 'Character', Transition: 'Scene Heading', 'New Act': 'Scene Heading', 'End of Act': 'New Act' });
  const tab = { ...enter, Action: 'Character', Character: 'Transition', Dialogue: 'Parenthetical', Parenthetical: 'Dialogue', 'Outline Level 1': 'Outline Level 2', 'Outline Level 2': 'Outline Level 1' } as Record<string, ElementType>;
  return { id, name, bindings, modeKey: { ...primary(' '), shift: true }, navigation: { enter, tab, dialogueExit: 'legacy' } };
}
export function professionalProfile(): ShortcutProfile {const p=defaultProfile('final-draft-inspired','Final Draft-inspired');p.bindings['element:Cast List']=primary('8');p.bindings['element:New Act']=primary('9');p.bindings['element:End of Act']=null;p.navigation.enter.Dialogue='Action';p.navigation.enter.General='General';p.navigation.tab['Outline Level 2']='Outline Level 3';p.navigation.dialogueExit='enter';return p;}
export const defaultSettings = (): ShortcutSettings => ({ version: 1, activeId: 'default', profiles: [defaultProfile(), professionalProfile(), defaultProfile('custom', 'Custom')] });
export function activeProfile(settings: ShortcutSettings) { return settings.profiles.find(p => p.id === settings.activeId) || settings.profiles[0] || defaultProfile(); }
type KeyEvent = Pick<KeyboardEvent, 'key' | 'code' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'> & { isComposing?: boolean; getModifierState?: (key: string) => boolean };
export function captureShortcut(event: KeyEvent, modifierOnly = false): Shortcut | null {
  if (event.isComposing || event.key === 'Dead' || event.key === 'Process' || event.getModifierState?.('AltGraph')) return null;
  if (['Meta', 'Control', 'Alt', 'Shift'].includes(event.key)) return modifierOnly && event.key === 'Alt' ? { key: 'Alt', meta: false, ctrl: false, alt: false, shift: false } : null;
  let key = event.key.normalize('NFC');
  // Option emits a composed glyph on macOS; retain its physical key to match it.
  if (event.altKey && /^Key[A-Z]$/.test(event.code)) key = event.code.slice(3).toLowerCase();
  else if (event.altKey && /^Digit\d$/.test(event.code)) key = event.code.slice(5);
  else if (key.length === 1) key = key.toLocaleLowerCase();
  return { key, ...(event.altKey && event.code ? { code: event.code } : {}), meta: event.metaKey, ctrl: event.ctrlKey, alt: event.altKey, shift: event.shiftKey };
}
export const isLetterShortcut = (b: Shortcut) => !b.meta && !b.ctrl && !b.alt && !b.primary && /^\p{L}$/u.test(b.key);
export function matchesShortcut(binding: Shortcut, event: KeyEvent, letterMode = false) {
  if (event.isComposing || event.key === 'Dead' || event.getModifierState?.('AltGraph')) return false;
  if (binding.key === 'Alt') return event.key === 'Alt' && !event.metaKey && !event.ctrlKey && !event.shiftKey;
  if (binding.primary ? !(event.metaKey || event.ctrlKey) || (event.metaKey && event.ctrlKey) : binding.meta !== event.metaKey || binding.ctrl !== event.ctrlKey) return false;
  if (binding.alt !== event.altKey || binding.shift !== event.shiftKey) return false;
  if (isLetterShortcut(binding) && !letterMode) return false;
  return binding.code && event.code ? binding.code === event.code : binding.key.toLocaleLowerCase() === event.key.normalize('NFC').toLocaleLowerCase();
}
export function overlaps(a: Shortcut, b: Shortcut): boolean {
  const variants = (s: Shortcut) => s.primary ? [{ ...s, primary: false, meta: true }, { ...s, primary: false, ctrl: true }] : [s];
  return variants(a).some(x => variants(b).some(y => x.meta === y.meta && x.ctrl === y.ctrl && x.alt === y.alt && x.shift === y.shift && (x.code && y.code ? x.code === y.code : x.key.toLocaleLowerCase() === y.key.toLocaleLowerCase())));
}
export function displayShortcut(binding: Shortcut | null | undefined) {
  if (!binding) return 'Unassigned';
  if (binding.key === 'Alt') return 'Hold ⌥';
  const keys: Record<string, string> = { ' ': 'Space', Enter: 'Return', Tab: 'Tab', Escape: 'Esc', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Backspace: '⌫', Delete: '⌦' };
  return (binding.primary || binding.meta ? '⌘' : '') + (binding.ctrl ? '⌃' : '') + (binding.alt ? '⌥' : '') + (binding.shift ? '⇧' : '') + (keys[binding.key] || binding.key.toLocaleUpperCase());
}
export function validateShortcut(binding: Shortcut, mode = false): string | null {
  if (mode && binding.key === 'Alt') return null;
  if (!binding.key || binding.key.length > 30 || ['Dead', 'Process', 'Unidentified', 'Meta', 'Control', 'Shift', 'Alt'].includes(binding.key)) return 'Press a letter, function key, or a key combination.';
  if (!binding.meta && !binding.ctrl && !binding.alt && !binding.primary && !isLetterShortcut(binding) && !/^F([1-9]|1\d|2[0-4])$/.test(binding.key)) return 'Use a modifier for this key. Letters work only in Shortcut Mode.';
  if (mode && isLetterShortcut(binding)) return 'Shortcut Mode needs a modifier combination, function key, or held Option.';
  const primaryKey = binding.meta || binding.ctrl || binding.primary;
  // Preserve the native menu, editing, selection, accessibility, and OS actions.
  if (primaryKey && ['a', 'c', 'v', 'x', 'z', 'y', 's', 'p', 'f', 'e', 'n', 'o', 'q', 'w', 'h', 'm', ',', '.', 'Tab', ' '].includes(binding.key) && !(mode && binding.key === ' ' && binding.shift && !binding.alt)) return 'This combination is reserved for an application, editing, or system command.';
  if (primaryKey && binding.alt && ['g', 'r', 'c', 'f'].includes(binding.key)) return 'This combination is already used by an application panel.';
  if (primaryKey && binding.shift && ['[', ']', '{', '}'].includes(binding.key)) return 'This combination is already used for bookmark navigation.';
  if (binding.ctrl && [' ', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(binding.key)) return 'This combination is reserved for macOS navigation or input sources.';
  if (binding.meta && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Backspace'].includes(binding.key)) return 'This combination is reserved for text navigation.';
  if (binding.alt && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Backspace'].includes(binding.key)) return 'This combination is reserved for text navigation.';
  if (binding.key === 'Tab' || binding.key === 'Escape' || binding.key === 'Enter' || (binding.shift && binding.key === 'F10')) return 'Return, Tab, Escape, and the context-menu key retain editor navigation.';
  return null;
}
export function assignment(profile: ShortcutProfile, characters: CharacterShortcuts, id: string) { return id === 'mode' ? profile.modeKey : id.startsWith('character:') ? characters[id.slice(10)] || null : profile.bindings[id] || null; }
export function conflictFor(profile: ShortcutProfile, characters: CharacterShortcuts, id: string, candidate: Shortcut) {
  const entries: [string, Shortcut | null][] = [...Object.entries(profile.bindings), ...Object.entries(characters).map(([key, value]) => ['character:' + key, value] as [string, Shortcut | null]), ['mode', profile.modeKey]];
  return entries.find(([key, value]) => key !== id && value && overlaps(value, candidate))?.[0];
}
export function resolveCommand(profile: ShortcutProfile, characters: CharacterShortcuts, event: KeyEvent, letterMode: boolean): string | undefined {
  const regular = Object.entries(profile.bindings).find(([, b]) => b && matchesShortcut(b, event, letterMode));
  if (regular) return regular[0];
  const character = Object.entries(characters).find(([, b]) => b && matchesShortcut(b, event, letterMode));
  return character ? 'character:' + character[0] : undefined;
}
export function readBinding(raw: unknown): Shortcut | null {
  if (raw === null) return null;
  if (!raw || typeof raw !== 'object') throw new Error('Invalid shortcut.');
  const b = raw as Shortcut;
  if (typeof b.key !== 'string' || !['meta', 'ctrl', 'alt', 'shift'].every(k => typeof b[k as keyof Shortcut] === 'boolean')) throw new Error('Invalid shortcut keys.');
  return { key: b.key, ...(typeof b.code === 'string' && b.code.length < 40 ? { code: b.code } : {}), meta: b.meta, ctrl: b.ctrl, alt: b.alt, shift: b.shift, ...(b.primary === true ? { primary: true } : {}) };
}
export function importProfile(raw: unknown, id: string = crypto.randomUUID()): ShortcutProfile {
  if (!raw || typeof raw !== 'object') throw new Error('Choose a DraftCraft shortcut profile.');
  const input = raw as ShortcutProfile;
  if (typeof input.name !== 'string' || !input.name.trim() || input.name.length > 80 || !input.bindings || typeof input.bindings !== 'object') throw new Error('Invalid profile name or bindings.');
  const profile = defaultProfile(id, input.name.trim());
  for (const c of COMMANDS) if (Object.hasOwn(input.bindings, c.id)) profile.bindings[c.id] = readBinding(input.bindings[c.id]);
  if (Object.hasOwn(input, 'modeKey')) profile.modeKey = readBinding(input.modeKey);
  if (input.navigation && typeof input.navigation === 'object') {
    for (const rule of ['enter', 'tab'] as const) for (const type of ELEMENTS) { const target = input.navigation[rule]?.[type]; if (target !== undefined) { if (!ELEMENTS.includes(target)) throw new Error('Invalid navigation rule.'); profile.navigation[rule][type] = target; } }
    if (['legacy', 'enter', 'double-enter', 'shortcut'].includes(input.navigation.dialogueExit)) profile.navigation.dialogueExit = input.navigation.dialogueExit;
  }
  for (const [command, binding] of [...Object.entries(profile.bindings), ['mode', profile.modeKey] as [string, Shortcut | null]]) if (binding) { const invalid = validateShortcut(binding, command === 'mode'); if (invalid) throw new Error(invalid); if (conflictFor(profile, {}, command, binding)) throw new Error('Profile contains overlapping shortcuts.'); }
  return profile;
}
export function loadShortcutSettings(): ShortcutSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(SHORTCUT_SETTINGS_KEY) || 'null');
    if (raw?.version !== 1 || !Array.isArray(raw.profiles) || !raw.profiles.length || raw.profiles.length > 50) return defaultSettings();
    const seen = new Set<string>();
    const profiles = raw.profiles.map((p: ShortcutProfile) => { if (typeof p.id !== 'string' || seen.has(p.id)) throw new Error('Invalid profile identity.'); seen.add(p.id); return importProfile(p, p.id); });
    return { version: 1, activeId: seen.has(raw.activeId) ? raw.activeId : profiles[0].id, profiles };
  } catch { return defaultSettings(); }
}
export function insertCommand(paragraphs: Paragraph[], id: string, command: ShortcutCommand, revision?: RevisionTier) {
  const index = paragraphs.findIndex(p => p.id === id);
  if (index < 0 || !command.type || command.text === undefined) return null;
  const current = paragraphs[index];
  const inserted: Paragraph = current.text === '' ? { ...current, type: command.type, text: command.text } : { id: 'p-' + crypto.randomUUID(), type: command.type, text: command.text };
  if (revision) { inserted.revised = true; inserted.revision = revision; }
  const next = [...paragraphs];
  if (current.text === '') next[index] = inserted; else next.splice(index + 1, 0, inserted);
  return { paragraphs: next, paragraph: inserted };
}
export function enterParagraph(paragraphs: Paragraph[], id: string, start: number, end: number, navigation: Navigation, revision?: RevisionTier) {
  const index = paragraphs.findIndex(p => p.id === id); if (index < 0) return null;
  const current = paragraphs[index];
  let type = navigation.enter[current.type] || 'Action';
  if (current.type === 'Dialogue') {
    if (navigation.dialogueExit === 'enter') type = 'Action';
    if (navigation.dialogueExit === 'double-enter') type = current.text ? 'Dialogue' : 'Action';
    if (navigation.dialogueExit === 'shortcut') type = 'Dialogue';
  }
  if (!current.text && type !== current.type) { const next = [...paragraphs]; const paragraph = { ...current, type, ...(revision ? { revised: true, revision } : {}) }; next[index] = paragraph; return { paragraphs: next, paragraph }; }
  // Inline styles stay with the text they belong to on both sides of the split.
  const left = { ...current, text: current.text.slice(0, start), runs: sliceRuns(current, 0, start), ...(revision ? { revised: true, revision } : {}) };
  if (!left.runs) delete left.runs;
  const rightRuns = sliceRuns(current, end, current.text.length);
  const paragraph: Paragraph = { id: 'p-' + crypto.randomUUID(), type, text: current.text.slice(end), ...(rightRuns ? { runs: rightRuns } : {}), ...(revision ? { revised: true, revision } : {}) };
  const next = [...paragraphs]; next.splice(index, 1, left, paragraph); return { paragraphs: next, paragraph };
}
