import { normalizeWord, type WritingSettings, type CharacterRecord } from './model';
import { matchCase, wordsIn } from './spelling';
import type { ElementType, TextRun } from '../types/script';
export type Sense = ['n'|'v'|'a'|'r', string[], string, number, [string,string[],string,Record<string,string>?][]?,Record<string,string>?];
export interface WordContext { word:string; text:string; start:number; end:number; type:ElementType; nearby:string; protectedReason?:string }
export interface Alternative { text:string; explanation:string; source:'offline'|'advanced'; edits?:{start:number;end:number;text:string}[] }
export interface SynonymResult { alternatives:Alternative[]; meaning:string; note:string; pos:string; sentence:string; intended:string; protectedReason?:string }
export type SynonymOptions = Pick<WritingSettings,'contextualAnalysis'|'vocabularyStyle'>;
export type LexiconLoader = (word:string)=>Promise<Sense[]>;
type Term = {normal:string;tags:string[];offset:{start:number;length:number}};
export function sentenceAt(text:string,start:number,end:number) {
  // Decimal points and initials are kept; punctuation/newlines delimit prose.
  let left=start,right=end;
  while(left>0 && !/[!?\n]/.test(text[left-1]) && !(text[left-1]==='.' && /\s/.test(text[left] || '') && !/\b(?:Mr|Mrs|Ms|Dr|INT|EXT)$/i.test(text.slice(Math.max(0,left-6),left-1))))left--;
  while(right<text.length && !/[.!?\n]/.test(text[right]))right++;
  if(right<text.length && text[right]!=='\n')right++;
  return {text:text.slice(left,right),start:left,end:right};
}
const articleFor=(word:string)=>/^(?:honest|hour|heir)/i.test(word)?'an':/^(?:uni(?:vers|form)|use|user|one\b|euro)/i.test(word)?'a':/^[aeiou]/i.test(word)?'an':'a';
export function replacementEdits(context:WordContext,replacement:string) {
  const edits=[{start:context.start,end:context.end,text:replacement}];
  const prior=wordsIn(context.text.slice(0,context.start)).at(-1);
  if(prior && /^(a|an)$/i.test(prior.word) && /^\s+$/.test(context.text.slice(prior.end,context.start))) {
    const article=articleFor(replacement);if(article!==prior.word.toLowerCase())edits.unshift({start:prior.start,end:prior.end,text:matchCase(prior.word,article)});
  }
  return edits;
}
export function applyWordEdits(text:string,edits:{start:number;end:number;text:string}[]) {
  let out=text,previousEnd=text.length+1;
  for(const edit of [...edits].sort((a,b)=>b.start-a.start)) {
    if(edit.start<0 || edit.end<edit.start || edit.end>text.length || edit.end>previousEnd || edit.text.length>160)throw new Error('Invalid word replacement range.');
    out=out.slice(0,edit.start)+edit.text+out.slice(edit.end);previousEnd=edit.start;
  }
  return out;
}
export function validateAdvancedAlternatives(raw:unknown,context:WordContext,corrected:string):Alternative[] {
  if(!raw || typeof raw!=='object' || !Array.isArray((raw as {suggestions?:unknown}).suggestions))return [];
  const seen=new Set([normalizeWord(context.word),normalizeWord(corrected)]),out:Alternative[]=[];
  for(const item of (raw as {suggestions:unknown[]}).suggestions.slice(0,12)) {
    if(!item || typeof item!=='object')continue;const {word,explanation} = item as {word:unknown;explanation:unknown};
    if(typeof word!=='string' || word.trim()!==word || /[\r\n]/.test(word) || word.length>70 || !/^[\p{L}][\p{L}\p{M} '\-]*$/u.test(word) || seen.has(normalizeWord(word)))continue;
    seen.add(normalizeWord(word));const text=matchCase(context.word,word),edits=replacementEdits(context,text);
    out.push({text,explanation:typeof explanation==='string'?explanation.slice(0,200):'Advanced suggestion — review its meaning.',source:'advanced',...((edits.length>1 || /\s/.test(text))?{edits}:{})});
  }
  return out;
}

export function replaceRuns(runs:TextRun[]|undefined,text:string,edits:{start:number;end:number;text:string}[]) {
  if(!runs || runs.map(r=>r.text).join('')!==text)return runs;
  let output=runs;
  for(const edit of [...edits].sort((a,b)=>b.start-a.start)){
    let at=0,inserted=false;const next:TextRun[]=[];
    for(const run of output){const end=at+run.text.length;
      if(end<=edit.start || at>=edit.end){if(!inserted && at>=edit.end){next.push({...run,text:edit.text});inserted=true;}next.push(run);}
      else {if(at<edit.start)next.push({...run,text:run.text.slice(0,edit.start-at)});if(!inserted){next.push({...run,text:edit.text});inserted=true;}if(end>edit.end)next.push({...run,text:run.text.slice(edit.end-at)});}
      at=end;
    }
    if(!inserted)next.push({...output.at(-1),text:edit.text});output=next;
  }
  return output;
}

export function establishedCharacterWord(word:string,records:CharacterRecord[]) {
  const nameKey=(value:string)=>normalizeWord(value).normalize('NFD').replace(/\p{M}/gu,'').replace(/'s$/u,'');
  const normalized=nameKey(word);
  return records.some(record=>[record.name,...record.aliases].some(name=>wordsIn(name).some(part=>nameKey(part.word)===normalized)));
}
