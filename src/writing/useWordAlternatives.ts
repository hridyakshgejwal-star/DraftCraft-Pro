import { useEffect,useRef } from 'react';
import type { WritingSettings } from './model';
import { sentenceAt,validateAdvancedAlternatives,type Alternative,type SynonymResult,type WordContext } from './wordSuggestions';
const empty=(context:WordContext,intended:string,note=''):SynonymResult=>({alternatives:[],meaning:'',note,pos:'',sentence:'',intended});
export function useWordAlternatives(settings:WritingSettings) {
  const worker=useRef<Worker|null>(null),sequence=useRef(0),pending=useRef(new Map<number,(value:SynonymResult)=>void>()),abort=useRef<AbortController|null>(null);
  const advancedCache=useRef(new Map<string,Alternative[]>());
  useEffect(()=>{
    if(!settings.synonyms)return;
    const instance=new Worker(new URL('./synonyms.worker.ts',import.meta.url),{type:'module'});worker.current=instance;
    instance.onmessage=e=>{pending.current.get(e.data.request)?.(e.data.result || empty({} as WordContext,'',e.data.error));pending.current.delete(e.data.request)};
    instance.onerror=()=>{for(const finish of pending.current.values())finish(empty({} as WordContext,'','Offline vocabulary unavailable. Spelling suggestions remain available.'));pending.current.clear()};
    return()=>{instance.terminate();worker.current=null;for(const finish of pending.current.values())finish(empty({} as WordContext,''));pending.current.clear();abort.current?.abort()};
  },[settings.synonyms]);
  const cancel=()=>{abort.current?.abort();worker.current?.postMessage({type:'cancel',request:++sequence.current});for(const finish of pending.current.values())finish(empty({} as WordContext,''));pending.current.clear()};
  const query=(context:WordContext,intended:string):Promise<SynonymResult>=>{
    if(!settings.synonyms || !worker.current)return Promise.resolve(empty(context,intended,context.protectedReason || 'Synonym suggestions are disabled.'));
    return new Promise(resolve=>{const request=++sequence.current;const timer=setTimeout(()=>{pending.current.delete(request);resolve(empty(context,intended,'The local dictionary took too long. Try this word again.'))},12000);pending.current.set(request,value=>{clearTimeout(timer);resolve(value)});worker.current!.postMessage({type:'query',request,context,intended,options:{contextualAnalysis:settings.contextualAnalysis,vocabularyStyle:settings.vocabularyStyle}})});
  };
  const advanced=async(context:WordContext,intended:string):Promise<{alternatives:Alternative[];note:string}>=>{
    if(!settings.advancedAnalysis || !settings.contextualAnalysis || !settings.synonyms || context.protectedReason)return {alternatives:[],note:''};
    const key=JSON.stringify([context,intended,settings.vocabularyStyle]);const cached=advancedCache.current.get(key);if(cached)return {alternatives:cached,note:'Advanced suggestions — review meaning and tone.'};
    abort.current?.abort();const controller=new AbortController();abort.current=controller;const timer=setTimeout(()=>controller.abort(),12000);
    try {
      const sentence=sentenceAt(context.text,context.start,context.end);
      const response=await fetch('/api/writing-suggestions',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({word:context.word,intended,text:sentence.text.slice(0,6000),start:context.start-sentence.start,end:context.end-sentence.start,nearby:context.nearby.slice(0,1000),type:context.type,style:settings.vocabularyStyle}),signal:controller.signal});
      if(!response.ok)return {alternatives:[],note:'Advanced analysis unavailable. Offline suggestions are shown.'};
      const alternatives=validateAdvancedAlternatives(await response.json(),context,intended);if(controller.signal.aborted)return {alternatives:[],note:''};
      if(advancedCache.current.size>=100)advancedCache.current.delete(advancedCache.current.keys().next().value!);advancedCache.current.set(key,alternatives);
      return {alternatives,note:alternatives.length?'Advanced suggestions — review meaning and tone.':'Advanced analysis found no additional safe alternatives.'};
    }catch{return {alternatives:[],note:controller.signal.aborted?'':'Advanced analysis unavailable. Offline suggestions are shown.'}}finally{clearTimeout(timer);}
  };
  return {query,advanced,cancel};
}
