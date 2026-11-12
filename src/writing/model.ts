import type { Paragraph, ScriptDocument } from '../types/script';
import {DEFAULT_PUNCTUATION,normalizePunctuation,type PunctuationSettings} from './punctuationPreferences';

export interface CharacterRecord {
  id: string;
  projectId: string;
  name: string;
  normalized: string;
  aliases: string[];
  paragraphIds: string[];
  firstAppearance: string | null;
  appearances: number;
  firstUsedAt: string;
  lastUsedAt: string;
  saved?: boolean;
}
export interface DocumentAssistance {
  version: 1;
  ignoredWords: string[];
  disabledAutocorrectWords: string[];
}
export interface WritingSettings {
  punctuation:PunctuationSettings;
  synonyms: boolean;
  contextualAnalysis: boolean;
  leftClickSuggestions: boolean;
  suggestionExplanations: boolean;
  suggestionCount: number;
  vocabularyStyle: 'natural'|'simple'|'formal';
  advancedAnalysis: boolean;
  spellcheck: boolean;
  underlines: boolean;
  autocorrect: boolean;
  aggressive: boolean;
  suggestions: boolean;
  autocomplete: boolean;
  rememberCharacters: boolean;
  protectCharacters: boolean;
  language: SpellingLanguage;
  customWords: string[];
  /** 1.17 Custom Autocorrect (Final Draft 13.2): the writer's own "replace X with Y" pairs. Separate from spelling
   * autocorrect: they apply even when that is off. */
  customAutocorrect: boolean;
  replacements: Replacement[];
}
export interface Replacement { from: string; to: string }
/** 1.17 spelling languages. English (US/UK) uses the dictionaries bundled with DraftCraft; the others use the spelling
 * dictionaries of the operating system (on a Mac, the ones in macOS), through the desktop app. */
export const SPELLING_LANGUAGES = [
  ['en-US', 'English (United States)'], ['en-GB', 'English (United Kingdom)'], ['fr', 'French'], ['de', 'German'], ['es', 'Spanish'], ['it', 'Italian'],
  ['pt-BR', 'Portuguese (Brazil)'], ['pt-PT', 'Portuguese (Portugal)'], ['nl', 'Dutch'], ['sv', 'Swedish'], ['da', 'Danish'], ['nb', 'Norwegian (Bokmål)'], ['fi', 'Finnish'],
  ['pl', 'Polish'], ['cs', 'Czech'], ['hu', 'Hungarian'], ['ro', 'Romanian'], ['el', 'Greek'], ['ru', 'Russian'], ['uk', 'Ukrainian'], ['tr', 'Turkish'], ['he', 'Hebrew'], ['ar', 'Arabic'],
] as const;
export type SpellingLanguage = typeof SPELLING_LANGUAGES[number][0];
export const bundledLanguage = (language: string) => language === 'en-US' || language === 'en-GB';
export const REPLACEMENT_LIMITS = { from: 40, to: 200, count: 1000 };
/** A valid pair, trimmed, or null. "From" is one or more characters without line breaks; "to" may be empty (delete). */
export function cleanReplacement(value: unknown): Replacement | null {
  const v = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  if (typeof v.from !== 'string' || typeof v.to !== 'string') return null;
  const from = v.from.normalize('NFC').trim(), to = v.to.normalize('NFC').replace(/[\r\n]+/g, ' ');
  if (!from || from.length > REPLACEMENT_LIMITS.from || /[\r\n\t]/.test(from) || to.length > REPLACEMENT_LIMITS.to || from === to) return null;
  return { from, to };
}
/** Same "from" means the same pair (lowercase pairs match any case, so they compare without case). */
const replacementKey = (from: string) => from === from.toLocaleLowerCase() ? '~' + from : from;
export function cleanReplacements(value: unknown): Replacement[] {
  if (!Array.isArray(value)) return [];
  const seen = new Map<string, Replacement>();
  for (const item of value) { const r = cleanReplacement(item); if (r) seen.set(replacementKey(r.from), r); }
  return [...seen.values()].slice(0, REPLACEMENT_LIMITS.count);
}
/** Import: a JSON list of {from, to}, or one pair per line as "from<Tab>to", "from => to" or "from,to". */
export function parseReplacements(text: string): Replacement[] {
  const trimmed = text.replace(/^\uFEFF/, '').trim();
  if (trimmed.startsWith('[')) { try { return cleanReplacements(JSON.parse(trimmed)); } catch { return []; } }
  return cleanReplacements(trimmed.split(/\r?\n/).filter(line => line.trim() && !line.startsWith('#')).map(line => {
    const m = line.match(/^(.*?)\t(.*)$/) || line.match(/^(.*?)\s*=>\s*(.*)$/) || line.match(/^([^,]*),(.*)$/);
    return m ? { from: m[1], to: m[2].trim() } : null;
  }));
}
/** Export: one pair per line, tab separated (re-imports exactly). */
export function formatReplacements(pairs: Replacement[]) { return '# DraftCraft Pro custom autocorrect: replace<TAB>with\n' + pairs.map(p => p.from + '\t' + p.to).join('\n') + '\n'; }
export const DEFAULT_WRITING_SETTINGS: WritingSettings = {
  punctuation:{...DEFAULT_PUNCTUATION},
  synonyms:true, contextualAnalysis:true, leftClickSuggestions:true, suggestionExplanations:true, suggestionCount:6, vocabularyStyle:'natural', advancedAnalysis:false,
  spellcheck: true, underlines: true, autocorrect: true, aggressive: false,
  suggestions: true, autocomplete: true, rememberCharacters: true,
  protectCharacters: true, language: 'en-US', customWords: [], customAutocorrect: true, replacements: [],
};
export const WRITING_SETTINGS_KEY = 'draftcraft_writing_assistance_v1';
export class WordCountIndex {
  private entries = new Map<string,{text:string;count:number;seen:number}>();
  private total = 0;
  private pass = 0;
  count(paragraphs: Paragraph[]): number {
    // A pass number on each entry instead of a set of every id per call (1.17: no allocation per keystroke).
    const pass=++this.pass;
    for(const paragraph of paragraphs){
      const old=this.entries.get(paragraph.id);
      if(old){old.seen=pass;if(old.text===paragraph.text)continue;}
      const count=paragraph.text.trim().split(/\s+/).filter(Boolean).length;
      this.total+=count-(old?.count || 0);if(old){old.text=paragraph.text;old.count=count;}else this.entries.set(paragraph.id,{text:paragraph.text,count,seen:pass});
    }
    if(this.entries.size!==paragraphs.length)for(const [id,entry] of this.entries)if(entry.seen!==pass){this.total-=entry.count;this.entries.delete(id);}
    return this.total;
  }
}
export const normalizeWord = (word: string) => word.normalize('NFKC').replace(/’/g, "'").toLocaleLowerCase('en-US');
export function characterName(text: string): string {
  // Extensions describe delivery, not the character's identity. Use the
  // element model, never infer characters from uppercase prose.
  const name = text.replace(/(?:\s*\([^()]*\))+\s*$/u, '').normalize('NFC').trim().replace(/\s+/gu, ' ');
  return /\p{L}/u.test(name) && name.length <= 160 ? name.toLocaleUpperCase('en-US') : '';
}
export function sanitizeSettings(value: unknown): WritingSettings {
  const source = value && typeof value === 'object' ? value as Partial<WritingSettings> : {};
  const settings = { ...DEFAULT_WRITING_SETTINGS };
  settings.punctuation=normalizePunctuation(source.punctuation);
  for (const key of ['synonyms','contextualAnalysis','leftClickSuggestions','suggestionExplanations','advancedAnalysis','spellcheck','underlines','autocorrect','aggressive','suggestions','autocomplete','rememberCharacters','protectCharacters','customAutocorrect'] as const) {
    if (typeof source[key] === 'boolean') settings[key] = source[key];
  }
  if (typeof source.suggestionCount==='number' && Number.isFinite(source.suggestionCount))settings.suggestionCount=Math.max(3,Math.min(8,Math.round(source.suggestionCount)));
  if(['natural','simple','formal'].includes(source.vocabularyStyle || ''))settings.vocabularyStyle=source.vocabularyStyle!;
  if (SPELLING_LANGUAGES.some(([code]) => code === source.language)) settings.language = source.language as SpellingLanguage;
  settings.replacements = cleanReplacements(source.replacements);
  if (Array.isArray(source.customWords)) settings.customWords = [...new Set(source.customWords.filter((w): w is string => typeof w === 'string' && w.length > 0 && w.length <= 100))].slice(0, 10000);
  return settings;
}
export function loadWritingSettings(): WritingSettings {
  try { return sanitizeSettings(JSON.parse(localStorage.getItem(WRITING_SETTINGS_KEY) || 'null')); }
  catch { return { ...DEFAULT_WRITING_SETTINGS }; }
}

/** Maintains an index of CHARACTER elements. Ordinary prose changes do not
 * reparse names or rebuild records. Reference comparisons are cheap and use
 * the same canonical paragraph array as pagination and undo. */
export class CharacterIndex {
  private projectId = '';
  private elements = new Map<string, Paragraph>();
  private names = new Map<string, string>();
  /** The records last checked against the index (1.17): when no cue changed and the records are the same array,
   * checking them again (a normalization per cue, on every keystroke) gives the same answer. */
  private validated: CharacterRecord[] | null = null;
  reconcile(document: ScriptDocument, remember = true): ScriptDocument {
    const reset = this.projectId !== document.id;
    if (reset) { this.projectId = document.id; this.elements.clear(); this.names.clear(); this.validated = null; }
    let changed = reset || !document.characterMemory;
    const present = new Set<string>();
    for (const p of document.paragraphs) {
      if (p.type !== 'Character') continue;
      present.add(p.id);
      if (this.elements.get(p.id)?.text !== p.text) {
        const name = characterName(p.text);
        if (this.names.get(p.id) !== name) changed = true;
        this.names.set(p.id, name);
        this.elements.set(p.id, p);
      }
    }
    for (const id of this.names.keys()) if (!present.has(id)) {
      this.names.delete(id); this.elements.delete(id); changed = true;
    }
    if (!changed && remember && document.characterMemory && document.characterMemory === this.validated) return document;
    const previous = (document.characterMemory || []).filter(r => r.projectId === document.id);
    if (!remember) return document.characterMemory?.length
      ? { ...document, characterMemory: previous.filter(r => r.saved) } : document;
    // Persisted records may have changed independently (dictionary manager,
    // backup restoration), so validate even if element text did not change.
    const expectedIds = new Set(previous.flatMap(r => r.paragraphIds));
    if (expectedIds.size !== [...this.names.values()].filter(Boolean).length) changed = true;
    if (previous.some(r => r.paragraphIds.some(id => normalizeWord(this.names.get(id) || '') !== r.normalized))) changed = true;
    if (!changed && previous.length === document.characterMemory?.length) { this.validated = document.characterMemory || null; return document; }
    const grouped = new Map<string, { name: string; ids: string[] }>();
    for (const p of document.paragraphs) {
      const name = this.names.get(p.id);
      if (!name) continue;
      const key = normalizeWord(name);
      const group = grouped.get(key) || { name, ids: [] };
      group.ids.push(p.id); grouped.set(key, group);
    }
    const time = document.lastSavedAt || new Date().toISOString();
    const used = new Set<string>();
    const records: CharacterRecord[] = [];
    for (const [normalized, group] of grouped) {
      // The same first occurrence retains its ID on a rename; merging names
      // prefers the existing destination record. No transient prefix ghosts.
      const prior = previous.find(r => r.normalized === normalized)
        || previous.find(r => !r.saved && r.appearances === 1 && r.paragraphIds.some(id => group.ids.includes(id)) && !used.has(r.id));
      const added = !prior || prior.normalized !== normalized || group.ids.some(id => !prior.paragraphIds.includes(id));
      let id = prior?.id || `character-${document.id}-${group.ids[0]}-${normalized}`;
      if(used.has(id))id+='-'+group.ids[0];
      used.add(id);
      records.push({
        id, projectId: document.id, name: group.name, normalized,
        aliases: prior?.aliases || [], saved: Boolean(prior?.saved),
        paragraphIds: group.ids, firstAppearance: group.ids[0], appearances: group.ids.length,
        firstUsedAt: prior?.firstUsedAt || time, lastUsedAt: added ? time : prior.lastUsedAt,
      });
    }
    for (const r of previous) if ((r.saved || document.characterShortcuts?.[r.id]) && !records.some(v => v.normalized === r.normalized)) {
      records.push({ ...r, paragraphIds: [], firstAppearance: null, appearances: 0 });
    }
    this.validated = records;
    return { ...document, characterMemory: records };
  }
}

export function suggestCharacters(records: CharacterRecord[], input: string, excludeParagraphId?: string): string[] {
  const query = normalizeWord(characterName(input));
  if (!query || input.includes('(')) return [];
  const score = (r: CharacterRecord) => r.normalized.startsWith(query) ? 0 : r.normalized.split(' ').some(part => part.startsWith(query)) ? 1 : 2;
  return records.filter(r => (r.saved || r.paragraphIds.some(id => id !== excludeParagraphId)) && r.normalized !== query && score(r) < 2)
    .sort((a,b) => score(a)-score(b) || b.appearances-a.appearances || b.lastUsedAt.localeCompare(a.lastUsedAt) || a.name.localeCompare(b.name))
    .slice(0,8).map(r => r.name);
}

export function characterVocabulary(records: CharacterRecord[], paragraphs: Paragraph[]): Set<string> {
  const words = new Set<string>();
  const add = (name: string) => { for (const word of name.match(/[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)*/gu) || []) words.add(normalizeWord(word)); };
  records.forEach(r => { add(r.name); r.aliases.forEach(add); });
  // Even with automatic remembering disabled, names in CHARACTER elements
  // remain intentional screenplay vocabulary.
  paragraphs.filter(p => p.type === 'Character').forEach(p => add(characterName(p.text)));
  return words;
}
