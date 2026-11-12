import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { contextualSynonyms } from '../src/writing/synonyms';
import { applyWordEdits, establishedCharacterWord, replacementEdits, replaceRuns, sentenceAt, validateAdvancedAlternatives, type Sense, type WordContext } from '../src/writing/wordSuggestions';
import { sanitizeSettings, DEFAULT_WRITING_SETTINGS } from '../src/writing/model';
const shards=new Map<string,Record<string,Sense[]>>();
const load=async(word:string)=>{if(!/^[a-z]/.test(word))return [];if(!shards.has(word[0]))shards.set(word[0],JSON.parse(fs.readFileSync(new URL('../public/synonyms/'+word[0]+'.json',import.meta.url),'utf8')));return shards.get(word[0])![word] || []};
const context=(text:string,word:string,type:WordContext['type']='Action'):WordContext=>({text,word,start:text.indexOf(word),end:text.indexOf(word)+word.length,type,nearby:''});
const analyze=(text:string,word:string,intended=word,type:WordContext['type']='Action')=>contextualSynonyms(context(text,word,type),intended,{contextualAnalysis:true,vocabularyStyle:'natural'},load);
test('correct words and corrected intended words produce grammatical contextual alternatives',async()=>{
 const slow=await analyze('He walked slowly towards the abandoned house.','slowly');assert.ok(slow.alternatives.some(a=>a.text==='cautiously'));assert.ok(slow.alternatives[0].text==='deliberately'||slow.alternatives[0].text==='cautiously');
 const angry=await analyze('I am very angry with you.','angry','angry','Dialogue');for(const word of ['furious','upset','irritated','enraged','frustrated'])assert.ok(angry.alternatives.some(a=>a.text===word));
 const typo=await analyze('She was extremly nervous.','extremly','extremely');for(const word of ['particularly','incredibly','exceptionally','remarkably'])assert.ok(typo.alternatives.some(a=>a.text===word));
});
test('sense ranking distinguishes river bank, financial bank, movement and management',async()=>{
 const river=await analyze('He sat on the bank of the river.','bank'),money=await analyze('The bank approved a loan.','bank');assert.ok(river.alternatives.some(a=>a.text==='shore'));assert.ok(!river.alternatives.some(a=>a.text==='depository'));assert.ok(money.alternatives.some(a=>a.text==='financial institution'));assert.ok(!money.alternatives.some(a=>a.text==='shore'));
 const manage=await analyze('They run the company and manage its business.','run'),race=await analyze('They run to escape the chase.','run');assert.ok(manage.alternatives.some(a=>a.text==='manage'));assert.ok(!manage.alternatives.some(a=>a.text==='sprint'));assert.ok(race.alternatives.some(a=>a.text==='sprint'));
});
test('the selected sentence outweighs nearby competing meanings',async()=>{
 const c={...context('The bank approved a loan.','bank'),nearby:'He sat on the bank of the river.'};const result=await contextualSynonyms(c,'bank',{contextualAnalysis:true,vocabularyStyle:'natural'},load);assert.ok(result.alternatives.some(a=>a.text==='financial institution'));assert.ok(!result.alternatives.some(a=>a.text==='shore'));
});
test('broad local lexicon, related adjectives, past tense, plurals and capitalization work',async()=>{
 const metadata=JSON.parse(fs.readFileSync(new URL('../public/synonyms/metadata.json',import.meta.url),'utf8'));assert.ok(metadata.single_word_lemmas>75000);
 const bright=await analyze('The bright lamp lit the room.','bright');assert.ok(bright.alternatives.length>=3);const past=await analyze('They walked into the room.','walked');assert.ok(past.alternatives.some(a=>a.text==='strolled'));assert.ok(!past.alternatives.some(a=>a.text==='stroll'));
 const caps=await analyze('She was ANGRY with him.','ANGRY');assert.ok(caps.alternatives.every(a=>a.text===a.text.toUpperCase()));const plural=await analyze('The cars blocked the road.','cars');assert.ok(plural.alternatives.length>0);assert.ok(plural.alternatives.every(a=>a.text.endsWith('s')));
});
test('names, screenplay identifiers, and function words do not acquire unsafe synonyms',async()=>{
 const protectedWord={...context('JOHN','JOHN','Character'),protectedReason:'Character names are protected.'};assert.equal((await contextualSynonyms(protectedWord,'JOHN',{contextualAnalysis:true,vocabularyStyle:'natural'},load)).alternatives.length,0);
 assert.equal((await analyze('He waited for John.','John')).alternatives.length,0);assert.equal((await analyze('He stood by the door.','the')).alternatives.length,0);
});
test('context ranking changes for risk and leisure while tone differences remain explicit',async()=>{
 const risk=await analyze('He walked slowly through the dark abandoned house.','slowly'),relax=await analyze('He walked slowly through the sunny park and smiled.','slowly');assert.notEqual(risk.alternatives[0].text,relax.alternatives[0].text);assert.equal(relax.alternatives[0].text,'leisurely');assert.ok(risk.alternatives.every(a=>a.explanation));
});
test('word edits preserve Unicode, punctuation, selection offsets and style runs',()=>{
 const text='🙂 He walked slowly, then stopped.',c=context(text,'slowly');assert.equal(applyWordEdits(text,replacementEdits(c,'cautiously')),'🙂 He walked cautiously, then stopped.');assert.throws(()=>applyWordEdits(text,[{start:-1,end:3,text:'bad'}]),/Invalid/);
 const runs=[{text:'He walked ',style:{bold:true}},{text:'slowly',style:{italic:true}},{text:'.',style:{underline:true}}],edits=[{start:10,end:16,text:'cautiously'}];const out=replaceRuns(runs,'He walked slowly.',edits)!;assert.equal(out.map(r=>r.text).join(''),'He walked cautiously.');assert.deepEqual(out[1].style,{italic:true});assert.deepEqual(out[2],runs[2]);
});
test('article agreement and phrases produce preview edits, and sentence boundaries stay local',()=>{
 const c=context('She was a nervous actor.','nervous'),edits=replacementEdits(c,'anxious');assert.equal(edits.length,2);assert.equal(applyWordEdits(c.text,edits),'She was an anxious actor.');const sentence=sentenceAt('First sentence. She was angry! Another sentence.',24,29);assert.match(sentence.text,/She was angry!/);assert.ok(!sentence.text.includes('Another'));
});
test('settings migrate safely and advanced results are bounded, literal and previewed',()=>{
 const old=sanitizeSettings({spellcheck:false,customWords:['Zayvion']});assert.equal(old.synonyms,true);assert.equal(old.advancedAnalysis,false);assert.equal(old.spellcheck,false);assert.deepEqual(old.customWords,['Zayvion']);assert.equal(sanitizeSettings({suggestionCount:500}).suggestionCount,8);
 const c=context('She was a nervous actor.','nervous'),items=validateAdvancedAlternatives({suggestions:[{word:'anxious',explanation:'Worried.'},{word:'<script>',explanation:'Bad'},{word:'nervous'},{word:'financial institution',explanation:'Phrase.'}]},c,'nervous');assert.equal(items.length,2);assert.ok(items[0].edits);assert.ok(items[1].edits);assert.equal(DEFAULT_WRITING_SETTINGS.advancedAnalysis,false);
});

test('established names protect Unicode, hyphens, lowercase mentions, aliases and possessives',()=>{
 const records=[{id:'name',projectId:'doc',name:'JEAN-PAUL',normalized:'jean-paul',aliases:['ΣΩΚΡΑΤΗΣ','अमन'],paragraphIds:['p'],firstAppearance:'p',appearances:1,firstUsedAt:'now',lastUsedAt:'now'}];
 for(const word of ['Jean','paul',"Paul's",'Σωκράτης','अमन'])assert.ok(establishedCharacterWord(word,records),word);assert.equal(establishedCharacterWord('angry',records),false);
});
