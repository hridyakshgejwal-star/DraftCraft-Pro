import { bundledLanguage, normalizeWord, type WritingSettings } from './model';
export interface WordRange { word: string; start: number; end: number }
export interface SpellingAnalysis { text: string; errors: WordRange[] }
export interface Correction { text: string; cursor: number; start: number; original: string; replacement: string; delimiter: string; before: string; /** From the writer's own pairs: undoing it does not stop the pair. */ custom?: boolean }

// Only established misspellings are corrected by default. Dictionary
// suggestions remain manual: edit distance alone cannot identify intent.
export const COMMON_TYPOS: Record<string, string> = {
  recieve:'receive', recieved:'received', recieves:'receives', recieving:'receiving',
  definately:'definitely', becuase:'because', teh:'the', wierd:'weird', seperate:'separate',
  seperately:'separately', seperated:'separated', adress:'address', tomorow:'tomorrow',
  mesage:'message', walkng:'walking', adn:'and', thier:'their', dont:"don't", doesnt:"doesn't",
   couldnt:"couldn't", wouldnt:"wouldn't", shouldnt:"shouldn't", isnt:"isn't",
  wasnt:"wasn't", arent:"aren't", didnt:"didn't",  thats:"that's",
  acheive:'achieve', acheived:'achieved', acheivement:'achievement', belive:'believe',
  beleive:'believe', beleived:'believed', accross:'across', occured:'occurred',
  occuring:'occurring', untill:'until', begining:'beginning', comming:'coming',
  immediatly:'immediately', finaly:'finally', usualy:'usually', realy:'really',
  almsot:'almost', agian:'again', freind:'friend', freinds:'friends',
  goverment:'government', enviroment:'environment', apparantly:'apparently',
  surprize:'surprise', sucess:'success', sucessful:'successful', neccessary:'necessary',
  necesary:'necessary', occassion:'occasion', happend:'happened', happends:'happens',
  wiht:'with', whihc:'which', woudl:'would', shoudl:'should',
};
const TERMS = new Set(['int','ext','vo','os','oc','cont','prelap','slugline','screenplay','beatboard','montage','flashback','fade','dissolve','intercut','sfx','vfx','bts']);
export function wordsIn(text: string): WordRange[] {
  const urls = [...text.matchAll(/(?:https?:\/\/|www\.)\S+|[\w.+-]+@[\w.-]+\.[\p{L}]+/gu)].map(m => [m.index!, m.index!+m[0].length]);
  const result: WordRange[] = [];
  for (const match of text.matchAll(/[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)*/gu)) {
    const start = match.index!, end = start + match[0].length;
    if (/\d/u.test(text[start-1] || '') || /\d/u.test(text[end] || '') || urls.some(([a,b]) => start >= a && end <= b)) continue;
    result.push({ word: match[0], start, end });
  }
  return result;
}
export function isScreenplayWord(word: string): boolean {
  const normalized = normalizeWord(word);
  return TERMS.has(normalized) || (word.length <= 4 && /^[A-Z]{2,4}$/.test(word));
}
export function matchCase(source: string, replacement: string): string {
  if (source === source.toLocaleUpperCase('en-US')) return replacement.toLocaleUpperCase('en-US');
  if (/^\p{Lu}/u.test(source)) return replacement[0].toLocaleUpperCase('en-US') + replacement.slice(1);
  return replacement;
}
export function boundaryCorrection(text: string, start: number, end: number, delimiter: string, settings: WritingSettings, protectedWords: Set<string>, blocked: Set<string>, suggested?: string[]): Correction | null {
  if (!settings.autocorrect || start !== end || /[\p{L}\p{M}'’]/u.test(text[start] || '')) return null;
  const token = wordsIn(text.slice(0,start)).at(-1);
  if (!token || token.end !== start || token.word.length > 50) return null;
  if(/^[A-Z]{2,4}$/.test(token.word))return null;
  const normalized = normalizeWord(token.word);
  if (protectedWords.has(normalized) || blocked.has(normalized)) return null;
  // The list of established misspellings is English; other languages correct only from their dictionary (aggressive).
  let replacement = bundledLanguage(settings.language) ? COMMON_TYPOS[normalized] : undefined;
  // Aggressive mode may use a unique, nearby dictionary suggestion already
  // cached in the worker. Never guess at proper nouns or non-Latin names.
  if (!replacement && settings.aggressive && suggested?.length === 1 && /^[a-z]+$/.test(token.word) && distance(normalized, suggested[0]) <= 1) replacement = suggested[0];
  if (!replacement) return null;
  replacement = matchCase(token.word, replacement);
  return { before:text, start:token.start, original:token.word, replacement, delimiter,
    text:text.slice(0,token.start)+replacement+delimiter+text.slice(end+(delimiter===' ' && text[end]===' '?1:0)), cursor:token.start+replacement.length+delimiter.length };
}
/** Custom Autocorrect (1.17): the longest of the writer's pairs whose "from" ends just before the caret, as a whole word
 * (no letter or digit on either side). A lowercase "from" matches any case and the replacement follows the typed case
 * ("omw" → "on my way", "Omw" → "On my way", "OMW" → "ON MY WAY"); a "from" with capitals matches exactly and is
 * replaced as written. `delimiter` is the key that ended the word ('' at the end of an element on Return). */
export function customReplacement(text: string, start: number, end: number, delimiter: string, pairs: readonly {from:string;to:string}[], blocked: Set<string>): Correction | null {
  if (start !== end || !pairs.length || /[\p{L}\p{N}\p{M}]/u.test(text[start] || '')) return null;
  const before = text.slice(0, start);let best: Correction | null = null;
  for (const pair of pairs) {
    const from = pair.from;if (!from || from.length > before.length || (best && from.length <= best.original.length)) continue;
    const tail = before.slice(before.length - from.length), caseless = from === from.toLocaleLowerCase();
    if (caseless ? tail.toLocaleLowerCase() !== from : tail !== from) continue;
    const at = before.length - from.length, prev = before[at - 1] || '';
    if (/[\p{L}\p{N}]/u.test(from[0]) && /[\p{L}\p{N}\p{M}'’]/u.test(prev)) continue;
    if (blocked.has(normalizeWord(tail))) continue;
    const replacement = caseless && pair.to && /\p{L}/u.test(tail) ? (tail === tail.toLocaleUpperCase() && tail !== tail.toLocaleLowerCase() ? pair.to.toLocaleUpperCase() : /^\p{Lu}/u.test(tail) ? pair.to[0].toLocaleUpperCase() + pair.to.slice(1) : pair.to) : pair.to;
    const skip = delimiter === ' ' && text[end] === ' ' ? 1 : 0;
    best = { custom: true, before: text, start: at, original: tail, replacement, delimiter, text: text.slice(0, at) + replacement + delimiter + text.slice(end + skip), cursor: at + replacement.length + delimiter.length };
  }
  return best;
}
export function distance(a: string, b: string): number {
  const aa = Array.from(a), bb = Array.from(b);
  let previous = Array.from({length:bb.length+1},(_,i)=>i);
  for (let i=1;i<=aa.length;i++) {
    const row=[i];
    for(let j=1;j<=bb.length;j++) row[j]=Math.min(row[j-1]+1,previous[j]+1,previous[j-1]+(aa[i-1]===bb[j-1]?0:1));
    previous=row;
  }
  return previous[bb.length];
}
// Optimal-string-alignment distance: like `distance`, but an adjacent transposition ("teh", "form"/"from") is one edit.
export function editDistance(a: string, b: string): number {
  const x = Array.from(a), y = Array.from(b), d: number[][] = Array.from({length:x.length+1},(_,i)=>[i,...Array(y.length).fill(0)]);
  for (let j=0;j<=y.length;j++) d[0][j]=j;
  for (let i=1;i<=x.length;i++) for (let j=1;j<=y.length;j++) {
    const cost = x[i-1]===y[j-1]?0:1;
    d[i][j] = Math.min(d[i-1][j]+1, d[i][j-1]+1, d[i-1][j-1]+cost);
    if (i>1 && j>1 && x[i-1]===y[j-2] && x[i-2]===y[j-1]) d[i][j] = Math.min(d[i][j], d[i-2][j-2]+1);
  }
  return d[x.length][y.length];
}
// Informal and spoken spellings writers use on purpose, mostly in dialogue. Never corrected automatically.
export const INTENTIONAL_SPELLINGS = new Set(['gonna','wanna','gotta','kinda','sorta','dunno','lemme','gimme','outta','lotta','tryna','finna','gotcha','betcha','whatcha','gotchya','yall','ain','cuz','coz','hella','bruh','nah','yeah','yep','yup','nope','okay','ok','uh','uhh','um','umm','hmm','hmmm','mmm','shh','shhh','psst','ugh','argh','whoa','huh','oops','yo','ya','yer','dontcha','wassup','sup','gah','meh','eh','hey','ooh','aah','ahh','aww','phew','yikes','cmon','lotsa']);
export interface EnterContext { protectedWords: Set<string>; blocked: Set<string>; suggested?: string[]; occurrences: (normalized: string) => number }
// The word that ends the element being committed with Enter has not passed a word boundary yet, so it was never
// checked. It is corrected only when the replacement is unambiguous: an established misspelling, or (for a lowercase
// word of five letters or more that is not used elsewhere in the script) exactly one dictionary suggestion one edit
// away, which is also the dictionary's first choice. Protected words (character names, custom and ignored words,
// words restored by an undo) and informal spellings are left alone.
export function enterCorrection(text: string, settings: WritingSettings, context: EnterContext): Correction | null {
  if (!settings.autocorrect) return null;
  const token = wordsIn(text).at(-1);
  if (!token || token.end !== text.length || token.word.length > 50 || /^[A-Z]{2,4}$/.test(token.word)) return null;
  const normalized = normalizeWord(token.word);
  if (context.protectedWords.has(normalized) || context.blocked.has(normalized) || INTENTIONAL_SPELLINGS.has(normalized) || isScreenplayWord(token.word)) return null;
  // The list of established misspellings is English; other languages correct only from their dictionary (aggressive).
  let replacement = bundledLanguage(settings.language) ? COMMON_TYPOS[normalized] : undefined;
  if (!replacement && context.suggested?.length && /^[a-z]{5,}$/.test(token.word) && !/(.)\1\1/.test(token.word) && context.occurrences(normalized) <= 1) {
    const close = context.suggested.filter(c => !/[\s-]/.test(c) && editDistance(normalized, normalizeWord(c)) <= 1);
    if (close.length === 1 && close[0] === context.suggested[0] && /^[a-z]+$/.test(close[0])) replacement = close[0];
  }
  if (!replacement) return null;
  replacement = matchCase(token.word, replacement);
  return { before:text, start:token.start, original:token.word, replacement, delimiter:'', text:text.slice(0,token.start)+replacement, cursor:token.start+replacement.length };
}
