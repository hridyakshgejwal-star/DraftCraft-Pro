import nspell from 'nspell';
import usAff from './dictionaries/en-US.aff?raw';
import usDic from './dictionaries/en-US.dic?raw';
import gbAff from './dictionaries/en-GB.aff?raw';
import gbDic from './dictionaries/en-GB.dic?raw';
import { COMMON_TYPOS, isScreenplayWord, wordsIn } from './spelling';
import { normalizeWord } from './model';

let spell: ReturnType<typeof nspell>;
const LATIN = /^[\p{Script=Latin}\p{M}'’]+$/u;
const cache = new Map<string, boolean>();
const suggestions = new Map<string,string[]>();
function correct(word: string) {
  if (!cache.has(word)) {
    if(cache.size>50000) cache.clear();
    cache.set(word, isScreenplayWord(word) || spell.correct(word) || spell.correct(normalizeWord(word)));
  }
  return cache.get(word)!;
}
function suggest(word: string) {
  if (!suggestions.has(word)) {
    if(suggestions.size>1000) suggestions.clear();
    const common = COMMON_TYPOS[normalizeWord(word)];
    const all = spell.suggest(word);
    suggestions.set(word,[...new Set([...(common && spell.correct(common) ? [common] : []),...all])].slice(0,6));
  }
  return suggestions.get(word)!;
}
self.onmessage = event => {
  const { type, request, language, items, word } = event.data;
  try {
    if(type==='configure') {
      spell = language==='en-GB' ? nspell(gbAff,gbDic) : nspell(usAff,usDic);
      cache.clear(); suggestions.clear();
      self.postMessage({type:'ready'});
    } else if(type==='analyze') {
      const completed=[];
      for (const item of items) {
        // The bundled dictionaries are English: words in other scripts (Hebrew, Arabic, Cyrillic, Greek, Devanagari…) are
        // not checked rather than all reported as misspelled (1.17).
        const errors = item.type==='Character' ? [] : wordsIn(item.text).filter(token=>LATIN.test(token.word)&&!correct(token.word));
        completed.push({id:item.id,text:item.text,errors});
      }
      self.postMessage({type:'analysis-batch',items:completed});
    } else if(type==='lookup') {
      self.postMessage({type:'lookup',request,word,correct:correct(word),suggestions:correct(word)?[]:suggest(word)});
    } else if(type==='suggest') {
      self.postMessage({type:'suggestions',request,word,suggestions:correct(word) ? [] : suggest(word)});
    }
  } catch(error) { self.postMessage({type:'error',request,message:error instanceof Error ? error.message : 'Spelling dictionary unavailable'}); }
};
