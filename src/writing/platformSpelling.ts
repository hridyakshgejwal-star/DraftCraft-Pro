// 1.17: spelling in languages other than English with the operating system's dictionaries (macOS: the spelling
// dictionaries built into macOS, chosen automatically from the language of the text and the Language & Region
// settings). It answers the same messages as spelling.worker.ts, so the underlines, suggestions and autocorrect work the
// same way. Available only in the desktop app (window.draftcraftDesktop.spelling).
import { isScreenplayWord, wordsIn } from './spelling';
export interface PlatformSpelling { misspelled(words: string[]): string[]; suggestions(word: string): string[]; setLanguage?(language: string): Promise<unknown> }
export function platformSpelling(): PlatformSpelling | null {
  const bridge = (globalThis as { draftcraftDesktop?: { spelling?: PlatformSpelling } }).draftcraftDesktop?.spelling;
  return bridge && typeof bridge.misspelled === 'function' && typeof bridge.suggestions === 'function' ? bridge : null;
}
type Listener = ((event: { data: unknown }) => void) | null;
/** A Worker-shaped wrapper (postMessage / onmessage / terminate) around the platform spellchecker. */
export class PlatformSpellingWorker {
  onmessage: Listener = null; onerror: ((e: unknown) => void) | null = null;
  private cache = new Map<string, boolean>(); private alive = true;
  constructor(private bridge: PlatformSpelling) {}
  private send(data: unknown) { queueMicrotask(() => { if (this.alive) this.onmessage?.({ data }); }); }
  private wrong(words: string[]) {
    const unknown = [...new Set(words.filter(w => !isScreenplayWord(w) && !this.cache.has(w)))];
    if (unknown.length) { let bad: Set<string>; try { bad = new Set(this.bridge.misspelled(unknown)); } catch { bad = new Set(); } for (const w of unknown) { if (this.cache.size > 50000) this.cache.clear(); this.cache.set(w, !bad.has(w)); } }
    return new Set(words.filter(w => this.cache.get(w) === false));
  }
  private suggest(word: string) { try { return (this.bridge.suggestions(word) || []).filter(s => typeof s === 'string').slice(0, 6); } catch { return []; } }
  postMessage(message: { type: string; request?: number; language?: string; items?: { id: string; type: string; text: string }[]; word?: string }) {
    const { type, request, items, word } = message;
    if (type === 'configure') { this.cache.clear(); Promise.resolve(message.language ? this.bridge.setLanguage?.(message.language) : undefined).catch(() => {}).finally(() => this.send({ type: 'ready' })); }
    else if (type === 'analyze' && items) { const completed = items.map(item => { if (item.type === 'Character') return { id: item.id, text: item.text, errors: [] }; const tokens = wordsIn(item.text), bad = this.wrong(tokens.map(t => t.word)); return { id: item.id, text: item.text, errors: tokens.filter(t => bad.has(t.word)) }; }); this.send({ type: 'analysis-batch', items: completed }); }
    else if (type === 'lookup' && word) { const correct = !this.wrong([word]).has(word); this.send({ type: 'lookup', request, word, correct, suggestions: correct ? [] : this.suggest(word) }); }
    else if (type === 'suggest' && word) { const correct = !this.wrong([word]).has(word); this.send({ type: 'suggestions', request, word, suggestions: correct ? [] : this.suggest(word) }); }
  }
  terminate() { this.alive = false; }
}
