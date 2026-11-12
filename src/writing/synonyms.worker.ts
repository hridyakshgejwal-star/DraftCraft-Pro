import { contextualSynonyms } from './synonyms';
import type { Sense } from './wordSuggestions';
const shards=new Map<string,Promise<Record<string,Sense[]>>>();
let morphology:Promise<Record<string,Record<string,string[]>>>;
async function load(word:string):Promise<Sense[]> {
  if(!/^[a-z]/.test(word))return [];
  const letter=word[0];
  if(!shards.has(letter)){
    // At most six shards stay resident; eviction does not alter returned data.
    if(shards.size>=6)shards.delete(shards.keys().next().value!);
    const request=fetch('/synonyms/'+letter+'.json').then(r=>{if(!r.ok)throw new Error('Local lexicon unavailable');return r.json()});
    shards.set(letter,request);request.catch(()=>shards.delete(letter));
  }
  const data=await shards.get(letter)!;
  if(data[word])return data[word];
  morphology ||= fetch('/synonyms/morphology.json').then(r=>r.json());
  const bases=Object.values((await morphology)[word] || {}).flat();
  return (await Promise.all(bases.filter(w=>w!==word).map(load))).flat();
}
const cache=new Map<string,unknown>();let latest=0;
self.onmessage=async event=>{
  const {request,context,intended,options,type}=event.data;
  if(type==='cancel'){latest=request;return;}
  latest=request;
  try {
    const key=JSON.stringify([context,intended,options]);
    let result=cache.get(key);if(!result){result=await contextualSynonyms(context,intended,options,load);if(cache.size>=250)cache.delete(cache.keys().next().value!);cache.set(key,result);}
    if(latest===request)self.postMessage({request,result});
  }catch{if(latest===request)self.postMessage({request,error:'Offline vocabulary unavailable. Spelling suggestions remain available.'});}
};
