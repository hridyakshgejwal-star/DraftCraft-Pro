import nlp from 'compromise';
import type {ElementType, Paragraph} from '../types/script';
import {replaceRuns} from './wordSuggestions';

import {type PunctuationSettings} from './punctuationPreferences';
export {DEFAULT_PUNCTUATION,normalizePunctuation,type PunctuationSettings} from './punctuationPreferences';
export type PunctuationMark='.'|'?'|'!';
export interface PunctuationContext {element:ElementType;language?:string;previous?:Pick<Paragraph,'type'|'text'>[]}
export interface SentenceDecision {mark:PunctuationMark|null;kind:'statement'|'question'|'command'|'exclamation'|'incomplete'|'fragment'|'protected'|'uncertain';reason:string}
export interface PunctuationEdit {text:string;at:number;mark:PunctuationMark;key:string;decision:SentenceDecision}
type Term={text:string;normal:string;tags:string[];offset?:{start:number;length:number}};
type Sentence={text:string;offset?:{start:number};terms:Term[]};
const MAX_SENTENCE=1500,MAX_TERMS=180,CACHE_SIZE=256;
const cache=new Map<string,SentenceDecision>();
let warmed=false;
export function warmPunctuationAnalysis(){if(warmed)return;warmed=true;try{nlp('A door opens.').json();}catch{warmed=false;}}
const eligible=new Set<ElementType>(['Action','Dialogue','Dual Dialogue','General','Stage Direction','Panel Description','Caption','Narration']);
const auxiliary=new Set('am is are was were do does did have has had can could will would shall should may might must'.split(' '));
const copula=new Set('am is are was were be been being'.split(' '));
const whWords=new Set('what which who whom whose where when why how'.split(' '));
const needsObject=new Set('put place give hand bring offer tell want need mean include contain become seem keep make take'.split(' '));
const subordinate=new Set('if unless although because while when whenever until before after since whereas once'.split(' '));
const shortResponses=new Set(['yes','no','okay','ok','thanks','thank you','all right','of course','not yet','not now','never mind','i do','i will','i can','i am','me too']);
const warnings=new Set(['watch out','look out','duck','run','get down','take cover','stop','fire','help']);
const has=(t:Term|undefined,tag:string)=>Boolean(t?.tags.includes(tag));
const none=(kind:SentenceDecision['kind'],reason:string):SentenceDecision=>({mark:null,kind,reason});

/** Tokenize only the active hard line, then select its final sentence. The
 * tokenizer recognizes abbreviations and decimals; no whole-script NLP occurs. */
export function finalSentence(prefix:string):{text:string;start:number}|null {
  const lineStart=prefix.lastIndexOf('\n')+1,start=Math.max(lineStart,prefix.length-MAX_SENTENCE),line=prefix.slice(start).trimEnd();
  if(!line.trim())return null;
  try {
    const last=(nlp.tokenize(line).json({offset:true}) as Sentence[]).at(-1);
    if(!last?.text)return null;
    const exact=line.lastIndexOf(last.text);
    const offset=exact>=0?exact:(last.offset?.start??-1);
    if(offset<0||start>lineStart&&offset===0)return null;
    return {text:line.slice(offset),start:start+offset};
  }catch{return null;}
}
export function punctuationKey(text:string):string {
  return (finalSentence(text)?.text||text.slice(-MAX_SENTENCE)).normalize('NFKC').trim().replace(/\s+/gu,' ').toLocaleLowerCase('en-US');
}

/** Find matched delimiters without confusing contractions/possessives with
 * quotations. An unfinished quote or bracket is a reason to leave text alone. */
function delimiters(text:string){
  const stack:{char:string;index:number}[]=[],pairs=new Map<number,number>();
  const matches:Record<string,string>={')':'(',']':'[','}':'{','”':'“','’':'‘'};
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if((c==="'"||c==='’')&&/\p{L}/u.test(text[i-1]||'')&&/\p{L}/u.test(text[i+1]||''))continue;
    if(c==='"'||c==="'"){
      if(stack.at(-1)?.char===c){pairs.set(i,stack.pop()!.index);continue;}
      if(c==="'"&&/\p{L}/u.test(text[i-1]||''))continue;
      stack.push({char:c,index:i});continue;
    }
    if('([{“‘'.includes(c)){stack.push({char:c,index:i});continue;}
    if(matches[c]){
      if(c==='’'&&stack.at(-1)?.char!=='‘')continue;
      if(stack.at(-1)?.char!==matches[c])return null;
      pairs.set(i,stack.pop()!.index);
    }
  }
  return stack.length?null:pairs;
}
function urgency(context:PunctuationContext){
  const previous=(context.previous||[]).slice(-4);
  let scene=-1;for(let i=previous.length-1;i>=0;i--)if(previous[i].type==='Scene Heading'){scene=i;break;}
  const local=previous.slice(scene+1);
  const direction=local.filter(p=>p.type==='Parenthetical').map(p=>p.text).join(' ').toLowerCase();
  const action=local.filter(p=>p.type==='Action'||p.type==='Stage Direction').map(p=>p.text).join(' ').toLowerCase();
  const explicitWarning=/\b(?:urgent warning|warning urgently|cries? (?:a )?warning|screams? (?:a )?warning|in panic|panicked|alarmed)\b/u.test(direction);
  const delivery=/\b(?:shout\w*|yell\w*|scream\w*|urgent\w*|warn\w*)\b/u.test(direction);
  const danger=/\b(?:truck|car|bus|train|vehicle)\b[^.!?]{0,90}\b(?:hurtl\w*|speed\w*|bear\w*|charg\w*|approach\w*)\b|\b(?:gunfire|explosion|collaps\w*|incoming|imminent|oncoming|swerves? toward)\b/u.test(action);
  return {warning:explicitWarning||(delivery&&danger),exclaim:/\b(?:exclaim\w*|cries? out in delight|ecstatic)\b/u.test(direction)};
}
function analyze(text:string,context:PunctuationContext,detectIncomplete:boolean):SentenceDecision {
  const doc=nlp(text.replace(/’/gu,"'"));doc.contractions().expand();
  const terms=(doc.json() as Sentence[]).flatMap(s=>s.terms).filter(t=>t.normal);
  if(!terms.length||terms.length>MAX_TERMS)return none('uncertain','Sentence exceeds the local analysis limit.');
  const first=terms[0],last=terms.at(-1)!,words=terms.map(t=>t.normal.toLowerCase()),plain=words.join(' ');
  const dialogue=context.element==='Dialogue'||context.element==='Dual Dialogue';
  const verbs=terms.filter(t=>has(t,'Verb')&&!has(t,'Particle'));
  const firstVerb=terms.findIndex(t=>has(t,'Verb')&&!has(t,'Particle'));
  const nounBefore=firstVerb>0&&terms.slice(0,firstVerb).some(t=>has(t,'Noun'));
  const finite=verbs.some(t=>has(t,'PastTense')||has(t,'PresentTense')||has(t,'Modal')||has(t,'Copula')||has(t,'Auxiliary'));
  const hasSubject=nounBefore||words[0]==='there'&&verbs.some(t=>has(t,'Copula'))&&terms.some(t=>has(t,'Noun'));
  const exclamative=(words[0]==='what'&&['a','an'].includes(words[1])&&terms.slice(2).some(t=>has(t,'Noun')))
    ||(words[0]==='how'&&has(terms[1],'Adjective')&&hasSubject&&copula.has(words.at(-1)!));
  const wh=whWords.has(first.normal);
  const auxIndex=terms.findIndex(t=>auxiliary.has(t.normal)&&has(t,'Verb'));
  const subjectAfterAux=auxIndex>=0?terms.findIndex((t,i)=>i>auxIndex&&has(t,'Noun')):-1;
  const inverted=auxIndex>=0&&(auxIndex===0||wh&&auxIndex>0&&!terms.slice(1,auxIndex).some(t=>has(t,'Pronoun')))&&subjectAfterAux>auxIndex;
  const subjectWh=wh&&((['who','what'].includes(words[0])&&firstVerb===1)
    ||(['which','whose'].includes(words[0])&&firstVerb>1&&!terms.slice(1,firstVerb).some(t=>has(t,'Pronoun'))));
  const whComplement=wh&&inverted;
  const lexicalAfterAux=terms.some((t,i)=>i>subjectAfterAux&&has(t,'Verb')&&!auxiliary.has(t.normal)&&!has(t,'Particle'));
  const complementAfterSubject=subjectAfterAux>=0&&terms.slice(subjectAfterAux+1).some(t=>has(t,'Adjective')||has(t,'Noun')||has(t,'Adverb')||has(t,'Gerund'));
  const invertedComplete=inverted&&(copula.has(words[auxIndex])?(whComplement||complementAfterSubject):lexicalAfterAux);
  const tagQuestion=hasSubject&&finite&&/,\s*(?:right|okay|ok|huh|yes|no)\s*$/iu.test(text)
    ||hasSubject&&finite&&/,\s*(?:isn['’]t|aren['’]t|wasn['’]t|weren['’]t|don['’]t|doesn['’]t|didn['’]t|can['’]t|won['’]t|wouldn['’]t|shouldn['’]t)\s+(?:i|you|he|she|it|we|they)\s*$/iu.test(text);
  const conversational=(dialogue||context.element==='General')&&words[0]==='you'&&['really','seriously'].includes(words[1])
    &&['think','believe','expect','mean'].includes(words[2])&&terms.length>=4&&has(terms[2],'Verb');
  const elliptical=(dialogue||context.element==='General')&&(/^(?:what|how) about\s+\S/iu.test(text)||['why not','what now','how come'].includes(plain));
  const negativeCommand=words[0]==='do'&&words[1]==='not'&&has(terms[2],'Verb')&&has(terms[2],'Infinitive');
  const imperativeHead=has(first,'Imperative')||negativeCommand;
  const question=!exclamative&&(invertedComplete||subjectWh||tagQuestion||conversational||elliptical);
  const stranded=question&&wh&&(lexicalAfterAux||inverted&&copula.has(words[auxIndex]))&&(has(last,'Preposition')||last.normal==='to');
  if(detectIncomplete&&!exclamative){
    const needsComplement=new Set('of for with toward towards into onto from at about by between among without within during until against after'.split(' '));
    if(has(last,'Negative')&&!question||['very','quite','rather','extremely','particularly'].includes(last.normal))return none('incomplete','A negative or degree phrase is unfinished.');
    let embedded=-1;for(let i=firstVerb+1;i<terms.length;i++)if(['because','although','unless','while','when','if','who','which','where','why','whether','and','but','or'].includes(words[i]))embedded=i;
    if(embedded>=0&&terms.slice(embedded+1).some(t=>has(t,'Pronoun'))&&!terms.slice(embedded+1).some(t=>has(t,'Verb')))return none('incomplete','The final embedded clause still needs a predicate.');
    if(has(last,'Determiner')||!stranded&&(has(last,'Conjunction')||has(last,'Preposition')&&!has(last,'Particle')||needsComplement.has(last.normal)))
      return none('incomplete','The final phrase still needs a complement.');
    if(whWords.has(last.normal)&&!question)return none('incomplete','An embedded clause is unfinished.');
    if(subordinate.has(first.normal)&&!question&&doc.clauses().length<2)
      return none('incomplete','A dependent clause has no completed main clause.');
    if((has(last,'Copula')||has(last,'Modal')||has(last,'Auxiliary'))&&!shortResponses.has(plain))
      return none('incomplete','The predicate is unfinished.');
    if(auxIndex===0&&!question&&!exclamative&&!imperativeHead)return none('incomplete','The inverted question still needs its predicate.');
    const tailVerb=(has(last,'Verb')&&!has(last,'Particle')&&!question?doc.verbs().last().json()[0]:undefined) as {verb?:{infinitive?:string}}|undefined;
    if(has(last,'Verb')&&!has(last,'Particle')&&needsObject.has(tailVerb?.verb?.infinitive||'')&&!question)
      return none('incomplete','The final verb normally needs another phrase.');
  }
  if(question)return {mark:'?',kind:'question',reason:conversational?'Conversational confirmation question.':'Direct question structure.'};
  const commandStart=terms.findIndex(t=>has(t,'Verb')&&!has(t,'Particle'));
  const imperative=negativeCommand||commandStart>=0&&terms.slice(0,commandStart).every(t=>has(t,'Adverb')||t.normal==='please'||t.normal==='not')
    &&(has(terms[commandStart],'Imperative')||has(terms[commandStart],'Infinitive'))&&!has(terms[commandStart],'Gerund');
  const warning=dialogue&&warnings.has(plain);
  const intent=urgency(context);
  if((warning&&intent.warning)||(dialogue&&exclamative&&intent.exclaim))
    return {mark:'!',kind:'exclamation',reason:'A warning or exclamative construction has explicit supporting delivery context.'};
  if(imperative||warning)return {mark:'.',kind:'command',reason:'An ordinary command does not imply shouted delivery.'};
  if(exclamative||dialogue&&shortResponses.has(plain))return {mark:'.',kind:'statement',reason:'A complete spoken construction; neutral punctuation is safest.'};
  if(hasSubject&&finite)return {mark:'.',kind:'statement',reason:'A subject and completed predicate form a statement.'};
  return none('fragment','No sufficiently certain complete clause was found.');
}

export function classifySentence(text:string,context:PunctuationContext,detectIncomplete=true):SentenceDecision {
  if(!eligible.has(context.element))return none('protected','This screenplay element does not take automatic sentence punctuation.');
  if(context.language&&!/^en(?:-|$)/iu.test(context.language))return none('protected','Local sentence analysis currently supports English.');
  if(!text.trim()||text.length>MAX_SENTENCE||/[\p{Script=Arabic}\p{Script=Devanagari}\p{Script=Han}\p{Script=Cyrillic}]/u.test(text))return none('uncertain','No confident English sentence analysis is available.');
  const key=JSON.stringify([text,context.element,context.language,detectIncomplete,(context.previous||[]).slice(-4)]);
  const old=cache.get(key);if(old){cache.delete(key);cache.set(key,old);return old;}
  let result:SentenceDecision;
  try{result=analyze(text,context,detectIncomplete);}catch{result=none('uncertain','Local analysis was unavailable.');}
  cache.set(key,result);if(cache.size>CACHE_SIZE)cache.delete(cache.keys().next().value!);
  return result;
}

/** Return a single insertion, never rewritten prose. Callers merge it with
 * their own Enter/input transaction so history, caret and revisions stay native. */
export function punctuationEdit(text:string,start:number,end:number,context:PunctuationContext,settings:PunctuationSettings,omissions:readonly string[]=[],trigger:'enter'|'typing'='enter'):PunctuationEdit|null {
  if(!eligible.has(context.element)||!settings.enabled||trigger==='enter'&&!settings.onEnter||trigger==='typing'&&!settings.whileTyping||start!==end||start<0||start>text.length||text.slice(end).trim())return null;
  const prefix=text.slice(0,start),sentence=finalSentence(prefix);
  if(!sentence)return null;
  const trimmed=sentence.text.trimEnd();
  if(!trimmed)return null;
  const pairs=delimiters(trimmed);if(!pairs)return null;
  let innerEnd=trimmed.length;
  while(innerEnd>0&&pairs.has(innerEnd-1))innerEnd--;
  const bare=trimmed.slice(0,innerEnd).trimEnd();
  if(/[.!?…—–,:;\-]$/u.test(bare)||/[.!?…—–,:;\-]$/u.test(trimmed))return null;
  const terminal=bare.match(/\S+$/u)?.[0]||'';
  if(/(?:https?:|www\.|@|[/\\]|\.[a-z]{2,8}(?:$|[?#]))/iu.test(terminal))return null;
  const key=punctuationKey(sentence.text);if(Array.isArray(omissions)&&omissions.slice(-16).includes(key))return null;
  // End quotes contain the sentence punctuation. A final incidental bracket
  // ("He waits (quietly)") keeps the punctuation outside that aside.
  let at=trimmed.length,analysis=sentence.text;
  if(innerEnd<trimmed.length){
    const finalChar=trimmed.at(-1)!,opening=pairs.get(trimmed.length-1)!;
    if('"\'”’'.includes(finalChar)||opening===0){
      at=innerEnd;
      const inside=trimmed.slice(opening+1,trimmed.length-1);
      if('"\'”’'.includes(finalChar)&&inside.trim())analysis=inside;
      else if(opening===0)analysis=trimmed.slice(opening+1,innerEnd);
    }
  }
  const decision=classifySentence(analysis,context,settings.incompleteSentences);
  let mark=decision.mark;
  if(mark==='!'&&!settings.conservativeExclamations)mark='.';
  if(!mark||mark==='.'&&!settings.fullStops||mark==='?'&&!settings.questions)return null;
  at+=sentence.start;
  return {text:text.slice(0,at)+mark+text.slice(at),at,mark,key,decision:{...decision,mark}};
}
export function punctuatedParagraph(paragraph:Paragraph,edit:PunctuationEdit):Paragraph {
  return {...paragraph,text:edit.text,runs:replaceRuns(paragraph.runs,paragraph.text,[{start:edit.at,end:edit.at,text:edit.mark}])};
}
export function addPunctuationOmission(paragraph:Paragraph,key:string):Paragraph {
  const current=Array.isArray(paragraph.punctuationOmissions)?paragraph.punctuationOmissions.slice(-16).filter(s=>typeof s==='string'):[];
  return current.includes(key)?paragraph:{...paragraph,punctuationOmissions:[...current.slice(-15),key]};
}
export function removedPunctuation(before:Paragraph,after:string,inputType?:string):string|null {
  if(!inputType?.startsWith('delete')||after.length>=before.text.length)return null;
  let start=0;while(start<after.length&&before.text[start]===after[start])start++;
  let oldEnd=before.text.length,newEnd=after.length;
  while(oldEnd>start&&newEnd>start&&before.text[oldEnd-1]===after[newEnd-1]){oldEnd--;newEnd--;}
  const removed=before.text.slice(start,oldEnd);
  if(newEnd!==start||!/[.!?]/u.test(removed)||!/^[.!?\s]+$/u.test(removed)||after.slice(start).replace(/["'”’)}\]\s]/gu,''))return null;
  return punctuationKey(after);
}
