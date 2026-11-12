// Emoji search, recently used emoji, and inserting text into the field the writer was typing in (1.18).
import { EMOJI, EMOJI_GROUPS, type EmojiEntry } from './emojiData';

const fold = (s: string) => s.toLocaleLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
const groupLabel = new Map(EMOJI_GROUPS.map(g => [g.id, fold(g.label)]));
const haystack = new Map<EmojiEntry, string>();
const textOf = (e: EmojiEntry) => { let t = haystack.get(e); if (t === undefined) { t = fold(e[1] + ' ' + (e[3] || '') + ' ' + (groupLabel.get(e[2]) || '')); haystack.set(e, t); } return t; };

/** Emoji whose name, keywords or category contain every word of the query; the emoji itself also matches.
 * Best first: an exact name or keyword, then a name or keyword starting with the first word, then the rest
 * (each in the picker's order). */
export function searchEmoji(query: string, list: EmojiEntry[] = EMOJI, limit = 240): EmojiEntry[] {
  const q = fold(query.trim()); if (!q) return [];
  const words = q.split(/\s+/).filter(Boolean), first = words[0];
  const scored: { e: EmojiEntry; score: number; i: number }[] = [];
  list.forEach((e, i) => {
    if (e[0] === query.trim()) { scored.push({ e, score: 1000, i }); return; }
    const text = textOf(e); if (!words.every(w => text.includes(w))) return;
    const name = fold(e[1]), keys = fold(e[3] || '').split(' ').filter(Boolean), nameWords = name.split(/[\s:,-]+/);
    const score = name === q || keys.includes(q) ? 100 : nameWords.includes(first) || keys.includes(first) ? 60 : name.startsWith(first) || keys.some(k => k.startsWith(first)) ? 40 : 10;
    scored.push({ e, score, i });
  });
  return scored.sort((a, b) => b.score - a.score || a.i - b.i).slice(0, limit).map(x => x.e);
}

export const RECENT_EMOJI_KEY = 'draftcraft_emoji_recent_v1';
export const RECENT_EMOJI_LIMIT = 24;
const known = new Set(EMOJI.map(e => e[0]));
export function loadRecentEmoji(storage: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage): string[] {
  try { const raw = JSON.parse(storage?.getItem(RECENT_EMOJI_KEY) || '[]'); return Array.isArray(raw) ? raw.filter((s): s is string => typeof s === 'string' && known.has(s)).slice(0, RECENT_EMOJI_LIMIT) : []; } catch { return []; }
}
export function rememberEmoji(emoji: string, storage: Pick<Storage, 'getItem' | 'setItem'> | undefined = globalThis.localStorage): string[] {
  const next = [emoji, ...loadRecentEmoji(storage).filter(e => e !== emoji)].slice(0, RECENT_EMOJI_LIMIT);
  try { storage?.setItem(RECENT_EMOJI_KEY, JSON.stringify(next)); } catch { /* a remembered list is a convenience */ }
  return next;
}
export const entryFor = (emoji: string) => EMOJI.find(e => e[0] === emoji);

export interface InsertTarget { element: HTMLElement | null; start?: number; end?: number }
const isTextField = (el: Element | null): el is HTMLInputElement | HTMLTextAreaElement =>
  !!el && (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement && ['text', 'search', ''].includes(el.type)) && !el.readOnly && !el.disabled;
export const isEditable = (el: Element | null) => isTextField(el) || !!(el as HTMLElement | null)?.isContentEditable;

/** Puts `text` into the field at the remembered selection the way typing does: the browser's own insertText
 * command, so the field's input handling (and the script's Undo) see an ordinary text insertion. */
export function insertIntoField(target: InsertTarget, text: string): boolean {
  const el = target.element; if (!el || !el.isConnected || !isEditable(el)) return false;
  el.focus({ preventScroll: true });
  if (isTextField(el) && target.start !== undefined) { const len = el.value.length, a = Math.max(0, Math.min(len, target.start)), b = Math.max(a, Math.min(len, target.end ?? target.start)); el.setSelectionRange(a, b); }
  let done = false;
  try { done = document.execCommand('insertText', false, text); } catch { done = false; }
  if (!done && isTextField(el)) {
    const a = el.selectionStart ?? el.value.length, b = el.selectionEnd ?? a;
    el.setRangeText(text, a, b, 'end');
    el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
    done = true;
  }
  return done;
}
