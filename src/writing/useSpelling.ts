import { useEffect, useMemo, useRef, useState } from 'react';
import type { Paragraph } from '../types/script';
import { bundledLanguage, normalizeWord, type WritingSettings } from './model';
import { PlatformSpellingWorker, platformSpelling } from './platformSpelling';
import type { SpellingAnalysis, WordRange } from './spelling';

export function useSpelling(paragraphs: Paragraph[], settings: WritingSettings, vocabulary: Set<string>) {
  const [analyses, setAnalyses] = useState<Map<string,SpellingAnalysis>>(new Map());
  const [status, setStatus] = useState<'loading'|'ready'|'error'>('loading');
  const worker = useRef<Worker | null>(null);
  const latest = useRef(paragraphs); latest.current = paragraphs;
  const sent = useRef(new Map<string,string>());
  const requests = useRef(new Map<number,(words:string[],correct?:boolean)=>void>());
  const wordCache=useRef(new Map<string,{correct:boolean;corrections:string[]}>());
  const readyWaiters=useRef(new Set<(ready:boolean)=>void>());
  const readyRef=useRef(false);
  const counter = useRef(0);
  const suggestionCache = useRef(new Map<string,string[]>());
  const [ignoredOnce, setIgnoredOnce] = useState(new Set<string>());
  const enabled = settings.spellcheck || settings.autocorrect || settings.synonyms || settings.suggestions;

  useEffect(() => {
    if (!enabled) { setAnalyses(new Map()); return; }
    readyRef.current=false;wordCache.current.clear();setStatus('loading'); setAnalyses(new Map()); sent.current.clear(); suggestionCache.current.clear();
    // English: the bundled dictionaries in a worker. Other languages: the operating system's dictionaries (desktop app).
    const platform = bundledLanguage(settings.language) ? null : platformSpelling();
    if (!bundledLanguage(settings.language) && !platform) { setStatus('error'); return; }
    const instance = (platform ? new PlatformSpellingWorker(platform) : new Worker(new URL('./spelling.worker.ts', import.meta.url), { type:'module' })) as Worker;
    worker.current = instance;
    const results = new Map<string,SpellingAnalysis>();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const flush = () => {
      timer = undefined;
      const current = new Map(latest.current.map(p=>[p.id,p]));
      const completed = [...results.entries()];
      results.clear();
      setAnalyses(previous => {
        const next = new Map(previous);
        let changed=false;
        for (const [id,result] of completed) if (current.get(id)?.text === result.text) {
          const old=next.get(id);
          // Correct paragraphs need no underline state. Avoid repainting a
          // large editor just to store thousands of empty background results.
          if(!result.errors.length){if(next.delete(id))changed=true;}
          else if(old?.text!==result.text || old.errors.length!==result.errors.length || old.errors.some((e,i)=>e.word!==result.errors[i].word || e.start!==result.errors[i].start || e.end!==result.errors[i].end)){next.set(id,result);changed=true;}
        }
        for (const id of next.keys()) if (!current.has(id)){next.delete(id);changed=true;}
        return changed?next:previous;
      });
    };
    instance.onmessage = e => {
      const message = e.data;
      if (message.type==='ready') {readyRef.current=true;setStatus('ready');for(const finish of readyWaiters.current)finish(true);readyWaiters.current.clear();}
      if (message.type==='analysis' || message.type==='analysis-batch') {
        for(const result of message.type==='analysis-batch'?message.items:[message])results.set(result.id,{text:result.text,errors:result.errors});
        if (!timer) timer = setTimeout(flush,30);
      }
      if(message.type==='suggestions') {
        suggestionCache.current.set(normalizeWord(message.word),message.suggestions);
        requests.current.get(message.request)?.(message.suggestions); requests.current.delete(message.request);
      }
      if(message.type==='lookup'){if(wordCache.current.size>=1000)wordCache.current.delete(wordCache.current.keys().next().value!);wordCache.current.set(normalizeWord(message.word),{correct:message.correct,corrections:message.suggestions});requests.current.get(message.request)?.(message.suggestions,message.correct);requests.current.delete(message.request);}
      if(message.type==='error') {
        if(message.request) { requests.current.get(message.request)?.([]); requests.current.delete(message.request); }
        else setStatus('error');
      }
    };
    instance.onerror = () => setStatus('error');
    instance.postMessage({type:'configure',language:settings.language});
    return () => {
      if(timer) clearTimeout(timer);
      instance.terminate(); worker.current=null;readyRef.current=false;for(const finish of readyWaiters.current)finish(false);readyWaiters.current.clear();
      for(const finish of requests.current.values()) finish([]);
      requests.current.clear();
    };
  },[settings.language,enabled]);

  useEffect(() => {
    if(status!=='ready' || (!settings.spellcheck && !settings.autocorrect)) return;
    const timer = setTimeout(() => {
      const ids = new Set(paragraphs.map(p=>p.id));
      for(const id of sent.current.keys()) if(!ids.has(id)) sent.current.delete(id);
      const changed = paragraphs.filter(p=>sent.current.get(p.id)!==p.type+'\0'+p.text);
      const active = document.activeElement?.id.slice(6);
      changed.sort((a,b)=>Number(b.id===active)-Number(a.id===active));
      // Limit message size; dictionary lookup and tokenization stay entirely
      // in the worker. Results carry source text and cannot replace edits.
      for(let i=0;i<changed.length;i+=16) {
        const items=changed.slice(i,i+16).map(p=>({id:p.id,type:p.type,text:p.text}));
        items.forEach(p=>sent.current.set(p.id,p.type+'\0'+p.text));
        worker.current?.postMessage({type:'analyze',items});
      }
    },70);
    return () => clearTimeout(timer);
  },[paragraphs,status,enabled,settings.spellcheck,settings.autocorrect]);

  const errors = useMemo(() => {
    const result = new Map<string,WordRange[]>();
    if(!settings.spellcheck) return result;
    for(const p of paragraphs) {
      if(p.type==='Character')continue;
      const analysis = analyses.get(p.id);
      if(!analysis || analysis.text!==p.text) continue;
      const filtered = analysis.errors.filter(token => !vocabulary.has(normalizeWord(token.word)) && !vocabulary.has(normalizeWord(token.word).replace(/'s$/u,'')) && !ignoredOnce.has(p.id+'\0'+p.text+'\0'+token.start));
      if(filtered.length) result.set(p.id,filtered);
    }
    return result;
  },[paragraphs,analyses,vocabulary,ignoredOnce,settings.spellcheck]);

  const suggest = (word:string): Promise<string[]> => {
    const cached = suggestionCache.current.get(normalizeWord(word));
    if(cached) return Promise.resolve(cached);
    if(!worker.current || status!=='ready') return Promise.resolve([]);
    return new Promise(resolve => {
      const request = ++counter.current;
      requests.current.set(request,resolve);
      worker.current!.postMessage({type:'suggest',request,word});
    });
  };
  const lookup=async(word:string):Promise<{correct:boolean|null;corrections:string[]}>=>{
    const cached=wordCache.current.get(normalizeWord(word));if(cached)return cached;
    if(!worker.current)return {correct:null,corrections:[]};
    if(!readyRef.current){const ready=await new Promise<boolean>(resolve=>{const finish=(value:boolean)=>{clearTimeout(timer);readyWaiters.current.delete(finish);resolve(value)};const timer=setTimeout(()=>finish(false),5000);readyWaiters.current.add(finish)});if(!ready)return {correct:null,corrections:[]};}
    return new Promise(resolve=>{const request=++counter.current;requests.current.set(request,(words,correct)=>resolve({correct:correct??null,corrections:words}));worker.current!.postMessage({type:'lookup',request,word})});
  };
  const ignoreOnce = (id:string,text:string,start:number) => setIgnoredOnce(previous=>new Set([...previous,id+'\0'+text+'\0'+start]));
  return {errors,status,suggest,lookup,ignoreOnce,cachedSuggestions:(word:string)=>suggestionCache.current.get(normalizeWord(word))};
}
