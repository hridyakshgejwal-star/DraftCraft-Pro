import nlp from 'compromise';
import { normalizeWord, type WritingSettings } from './model';
import { matchCase, wordsIn } from './spelling';
import type { ElementType } from '../types/script';

import { sentenceAt, replacementEdits, type Sense, type WordContext, type Alternative, type SynonymResult, type SynonymOptions, type LexiconLoader } from './wordSuggestions';
type Term = {normal:string;tags:string[];offset:{start:number;length:number}};
const POS_NAMES={n:'noun',v:'verb',a:'adjective',r:'adverb'};
const FUNCTION=new Set('a an the and or but if then than of to for from with on in at by as it he she they we i you this that these those his her their our my your is am are was were be been being have has had do does did not no yes will would shall should can could may might must'.split(' '));
const STOP=new Set([...FUNCTION,'very','really','just']);
const DOMAINS:[string[],RegExp][]=[
  [['river','shore','water','stream','lake','sea','ocean','flood'],/water|river|sloping land|shore|stream|sea|ocean|nautical/],
  [['loan','money','cash','account','deposit','credit','mortgage','finance','teller'],/financial|money|depository|banking|finance|loan|cash|credit/],
  [['company','business','organization','office','manager','team','department'],/manage|operate|direct|business|organization|control|administrat/],
  [['walk','walked','path','foot','feet','road','house','door','towards','toward'],/walk|foot|move|motion|pace|travel/],
  [['run','ran','race','sprint','chase','escape','pursue'],/run|move|speed|race|motion/],
  [['weight','weigh','heavy','lift','carry','box','feather'],/weight|heavy|burden|mass/],
  [['lamp','sun','room','bright','glow','dark','shine','illuminate'],/light|illumina|bright|radiat|shine/],
  [['angry','anger','furious','mad','irritate','argument','fight','upset'],/anger|angry|irritat|emotion|annoy/],
  [['cold','winter','snow','ice','freezing','temperature'],/temperature|cold|heat|freez|weather/],
];
const CURATED:Record<string,[string,string][]>={
  slowly:[['deliberately','Adds intention or control to the pace.'],['leisurely','Suggests a relaxed, unhurried pace.'],['gradually','Emphasizes progression over time.'],['cautiously','Adds caution or perceived risk.'],['hesitantly','Adds uncertainty or reluctance.'],['unhurriedly','Keeps the focus on pace.'],['gently','Adds softness; review the action.']],
  angry:[['upset','A softer, broader emotional reaction.'],['irritated','Milder anger or annoyance.'],['furious','Much stronger anger.'],['enraged','Extreme anger.'],['frustrated','Adds a sense of blocked effort.'],['annoyed','A milder, conversational choice.'],['indignant','Adds a sense of unfairness.']],
  extremely:[['particularly','Emphasizes this case; usually less intense.'],['incredibly','Strong, conversational emphasis.'],['exceptionally','Emphasizes an unusual degree.'],['remarkably','Suggests the degree is notable.'],['very','Simple, natural emphasis.'],['intensely','Emphasizes strength of feeling.'],['unusually','Emphasizes departure from normal.']],
  nervous:[['anxious','Emphasizes worry or anticipation.'],['uneasy','Suggests discomfort or uncertainty.'],['apprehensive','Emphasizes fear of what may happen.'],['tense','A visible or physical sign of stress.'],['jittery','Informal, physically restless.'],['worried','A plain, spoken-language choice.']],
  walk:[['stroll','A relaxed pace.'],['step','A precise, visual movement.'],['march','A firm or purposeful pace.'],['wander','Adds a lack of clear direction.'],['pace','Suggests repeated or restless movement.'],['trudge','Adds effort or fatigue.']],
  say:[['speak','Keeps attention on speech.'],['remark','A considered observation.'],['whisper','Changes the delivery to a low voice.'],['mutter','Adds quiet or indistinct delivery.'],['declare','Adds emphasis or certainty.']],
};
function baseForms(word:string,tags:string[]) {
  const forms=[normalizeWord(word)];
  if(tags.includes('Verb'))forms.push(normalizeWord(nlp('They '+word).verbs().toInfinitive().text()));
  if(tags.includes('Noun'))forms.push(normalizeWord(nlp(word).nouns().toSingular().text()));
  if(tags.includes('Adjective'))forms.push(normalizeWord(nlp(word).adjectives().toRoot().text()));
  return [...new Set(forms.filter(w=>w && !w.includes(' ')))];
}
function inflect(value:string,tags:string[],original:string):string|null {
  if(tags.includes('Verb')) {
    const doc=nlp('They '+value);
    if(tags.includes('PastTense') || tags.includes('PastParticiple')){doc.verbs().toPastTense();const next=doc.text().replace(/^They\s+/,'');return next===value && normalizeWord(original)!==value?null:next;}
    if(tags.includes('Gerund')){doc.verbs().toGerund();return doc.text().replace(/^They\s+/,'').replace(/^(?:are|is)\s+/,'');}
    if(tags.includes('PresentTense') && /s$/i.test(original)){const third=nlp('He '+value);third.verbs().toPresentTense();return third.text().replace(/^He\s+/,'');}
  }
  if(tags.includes('Plural')){const doc=nlp(value);doc.nouns().toPlural();return doc.text();}
  if(tags.includes('Comparative')){const doc=nlp(value);doc.adjectives().toComparative();return doc.text();}
  if(tags.includes('Superlative')){const doc=nlp(value);doc.adjectives().toSuperlative();return doc.text();}
  return value;
}
export async function contextualSynonyms(context:WordContext,intended:string,options:SynonymOptions,load:LexiconLoader):Promise<SynonymResult> {
  const sentence=sentenceAt(context.text,context.start,context.end);
  const corrected=sentence.text.slice(0,context.start-sentence.start)+intended+sentence.text.slice(context.end-sentence.start);
  const result:SynonymResult={alternatives:[],meaning:'',note:'',pos:'',sentence:sentence.text,intended};
  if(context.protectedReason){result.protectedReason=context.protectedReason;result.note=context.protectedReason;return result;}
  const parsed=nlp(corrected).json({offset:true}) as {terms:Term[]}[];
  const term=parsed.flatMap(s=>s.terms).find(t=>t.offset.start<=context.start-sentence.start && t.offset.start+t.offset.length>context.start-sentence.start);
  const tags=term?.tags || [];
  if(FUNCTION.has(normalizeWord(intended))){result.protectedReason='Grammatical word';result.note='This grammatical word has no safe interchangeable synonym in this sentence.';return result;}
  if(tags.some(t=>['Person','Place','Organization'].includes(t))){result.protectedReason='Name or location';result.note='This name or location is protected from word replacement.';return result;}
  const pos:Sense[0]=tags.includes('Adverb')?'r':tags.includes('Adjective')?'a':tags.includes('Verb')?'v':'n';result.pos=POS_NAMES[pos];
  const forms=baseForms(intended,tags),sets=(await Promise.all(forms.map(load))).flat();
  const relevant=sets.filter(s=>s[0]===pos);
  if(!relevant.length && !CURATED[forms[0]]){result.note='No safe local alternatives were found for this use. Try another word or optional advanced analysis.';return result;}
  const tokens=wordsIn(corrected).map(w=>normalizeWord(w.word)).filter(w=>!STOP.has(w)&&!forms.includes(w));
  const weights=new Map(tokens.map(w=>[w,1]));for(const token of wordsIn(context.nearby)){const w=normalizeWord(token.word);if(!STOP.has(w)&&!forms.includes(w)&&!weights.has(w))weights.set(w,.25);}
  const words=new Set(weights.keys()),score=(sense:Sense,index:number)=>{
    let value=-index*.02;
    if(!options.contextualAnalysis)return value;
    const gloss=sense[2].toLowerCase(),glossWords=new Set(wordsIn(gloss).map(w=>normalizeWord(w.word)));
    for(const word of words)if(glossWords.has(word))value+=3*(weights.get(word) || 0);
    for(const [cues,pattern]of DOMAINS)if(pattern.test(gloss))value+=cues.reduce((n,w)=>n+(weights.get(w) || 0),0)*4;
    return value;
  };
  const ranked=relevant.map((sense,index)=>({sense,score:score(sense,index)})).sort((a,b)=>b.score-a.score);
  const best=ranked[0];result.meaning=best?.sense[2].split(';')[0] || 'Contextual vocabulary alternatives.';
  const base=forms.find(w=>CURATED[w]) || forms[0];
  let choices:[string,string][]=(best?.sense[1] || []).filter(w=>!forms.includes(normalizeWord(w))).map(w=>[w,'Same dictionary sense: '+result.meaning]);
  const restrictions=new Map(Object.entries(best?.sense[5] || {}));
  if(best?.sense[4])for(const [,words,gloss,markers]of best.sense[4].slice(0,3)){for(const [word,marker]of Object.entries(markers || {}))restrictions.set(word,marker);choices.push(...words.filter(w=>!forms.includes(normalizeWord(w))).map(w=>[w,'Related shade of meaning: '+gloss.split(';')[0]] as [string,string]));}
  if(CURATED[base])choices=[...CURATED[base],...choices];
  if(base==='bright')choices=/intelligen|intellect|mental|quickness/.test(result.meaning)?[['clever','Emphasizes mental ability.'],['smart','A natural conversational choice.'],['sharp','Emphasizes quick understanding.'],['gifted','Suggests unusual ability.'],...choices]:[['luminous','Emphasizes emitted or reflected light.'],['radiant','Adds a warm, shining quality.'],['brilliant','Suggests strong brightness.'],['gleaming','Emphasizes reflected light.'],['dazzling','Adds overwhelming intensity.'],['glowing','A steady light or shine.'],...choices];
  if(base==='bank') {
    if(/river|shore|water/.test(result.meaning))choices=[['shore','Land beside the water.'],['riverbank','Specifically the edge of a river.'],['riverside','The area alongside the river; review the location.'],...choices];
    else if(/financial|depository/.test(result.meaning))choices=[['financial institution','A broader, formal description.'],['depository','A formal term; check the institution type.'],...choices];
  }
  if(base==='run')choices=/manage|operate|business|direct|control/.test(result.meaning)?[['manage','Emphasizes responsibility.'],['operate','Emphasizes day-to-day functioning.'],['direct','Emphasizes leadership.'],['lead','A simple leadership verb.'],...choices]:[['sprint','Adds high speed.'],['jog','A slower, steady pace.'],['race','Adds speed or competition.'],['dash','A short, rapid movement.'],...choices];
  if(base==='slowly' && options.contextualAnalysis){const risky=/abandoned|dark|danger|fear|afraid|nervous|gun|quiet|sneak/i.test(corrected);if(risky)choices.sort((a,b)=>Number(['cautiously','hesitantly','deliberately'].includes(b[0]))-Number(['cautiously','hesitantly','deliberately'].includes(a[0])));else if(/relax|sunny|park|smile|enjoy/i.test(corrected))choices.sort((a,b)=>Number(b[0]==='leisurely')-Number(a[0]==='leisurely'));}
  if(base==='angry' && context.type==='Dialogue' && options.vocabularyStyle==='natural')choices.sort((a,b)=>Number(['upset','annoyed','furious'].includes(b[0]))-Number(['upset','annoyed','furious'].includes(a[0])));
  if(options.vocabularyStyle==='simple')choices.sort((a,b)=>a[0].length-b[0].length);
  if(options.vocabularyStyle==='formal')choices.sort((a,b)=>b[0].length-a[0].length);
  const terms=parsed.flatMap(s=>s.terms),termIndex=term?terms.indexOf(term):-1;
  const attributive=terms.slice(termIndex+1,termIndex+4).some((t,i)=>t.tags.includes('Noun') && terms.slice(termIndex+1,termIndex+1+i).every(p=>p.tags.includes('Adjective') || p.tags.includes('Adverb')));
  const seen=new Set<string>([normalizeWord(context.word),normalizeWord(intended)]);
  for(const [word,explanation]of choices){
    const marker=restrictions.get(word);if((marker==='p' && attributive)||(marker==='a' && !attributive)||marker==='ip')continue;
    if(!CURATED[base] && pos==='a' && options.vocabularyStyle!=='formal' && !nlp(word).has('#Adjective'))continue;
    if(!/^[\p{L}][\p{L}\p{M} '\-]*$/u.test(word) || word.length>70 || ['passing','super','tardily','slow','easy'].includes(word))continue;
    const inflected=inflect(word,tags,intended);if(!inflected || seen.has(normalizeWord(inflected)))continue;
    seen.add(normalizeWord(inflected));const text=matchCase(context.word,inflected),edits=replacementEdits(context,text);
    result.alternatives.push({text,explanation,source:'offline',...((edits.length>1 || /\s/.test(text))?{edits}:{})});if(result.alternatives.length>=24)break;
  }
  result.note=ranked.length>1 && (!options.contextualAnalysis || Math.abs(ranked[0].score-ranked[1].score)<1)?'Several meanings are possible. Review the suggested sense before replacing.':'Alternatives can change tone, intensity, or intention; choose the meaning you want.';
  return result;
}

