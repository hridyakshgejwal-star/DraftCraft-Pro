import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import nspell from 'nspell';
import { CharacterIndex, WordCountIndex, characterName, characterVocabulary, DEFAULT_WRITING_SETTINGS, normalizeWord, sanitizeSettings, suggestCharacters } from '../src/writing/model';
import { boundaryCorrection, COMMON_TYPOS, wordsIn } from '../src/writing/spelling';
import { buildSmartTypeFromScript } from '../src/utils/smartType';
import { SAMPLE_SCRIPT } from '../src/data/sampleScript';
import { paginateScript } from '../src/utils/pagination';
import { saveDocumentWithBackup, getAllBackups, checkCrashRecoveryState } from '../src/utils/fileManagerStorage';
import type { Paragraph } from '../src/types/script';

const dictionary=(region:string)=>nspell(fs.readFileSync(new URL('../src/writing/dictionaries/'+region+'.aff',import.meta.url),'utf8'),fs.readFileSync(new URL('../src/writing/dictionaries/'+region+'.dic',import.meta.url),'utf8'));
const us=dictionary('en-US'),gb=dictionary('en-GB');
const empty=new Set<string>();
const p=(id:string,text:string,type:Paragraph['type']='Character'):Paragraph=>({id,text,type});
const document=(paragraphs:Paragraph[],id='writing-qa')=>({...structuredClone(SAMPLE_SCRIPT),id,paragraphs,lastSavedAt:'2026-10-13T12:00:00Z'});

test('both bundled Hunspell dictionaries validate common corrections and real words',()=>{
  for(const spell of [us,gb]) for(const [wrong,right] of Object.entries(COMMON_TYPOS)){
    assert.equal(spell.correct(right),true,right);
    assert.equal(spell.correct(wrong),false,'valid word must never be autocorrected: '+wrong);
  }
  assert.equal(us.correct('recieved'),false);assert.equal(us.correct('mesage'),false);
  assert.ok(us.suggest('walkng').includes('walking'));
  assert.equal(us.correct('color'),true);assert.equal(gb.correct('colour'),true);
});
test('space and punctuation correction preserve surrounding Unicode and a single delimiter',()=>{
  for(const word of ['recieve','definately','becuase','teh','wierd','seperate','adress','tomorow']){
    const text='🙂 Café '+word+' follows';const caret=text.indexOf(' follows');
    const result=boundaryCorrection(text,caret,caret,' ',DEFAULT_WRITING_SETTINGS,empty,empty)!;
    assert.equal(result.text,'🙂 Café '+COMMON_TYPOS[word]+' follows'); // reuse the existing separator exactly once
    assert.equal(result.text[result.cursor-1],' ');assert.equal(result.original,word);
  }
  const result=boundaryCorrection('Teh',3,3,',',DEFAULT_WRITING_SETTINGS,empty,empty)!;
  assert.equal(result.text,'The,');assert.equal(result.cursor,4);
});
test('ambiguous words, protected names, custom dictionary, selection, mid-word and settings are respected',()=>{
  for(const word of ['cant','wont','world','Zayvion','München','frend','throught','ADN','VFX'])assert.equal(boundaryCorrection(word,word.length,word.length,' ',DEFAULT_WRITING_SETTINGS,empty,empty),null);
  assert.equal(boundaryCorrection('teh',3,3,' ',DEFAULT_WRITING_SETTINGS,new Set(['teh']),empty),null);
  assert.equal(boundaryCorrection('teh',3,3,' ',DEFAULT_WRITING_SETTINGS,empty,new Set(['teh'])),null);
  assert.equal(boundaryCorrection('tehword',3,3,' ',DEFAULT_WRITING_SETTINGS,empty,empty),null);
  assert.equal(boundaryCorrection('teh',0,3,' ',DEFAULT_WRITING_SETTINGS,empty,empty),null);
  assert.equal(boundaryCorrection('teh',3,3,' ',{...DEFAULT_WRITING_SETTINGS,autocorrect:false},empty,empty),null);
  assert.equal(boundaryCorrection('accomodation',12,12,' ',{...DEFAULT_WRITING_SETTINGS,aggressive:true},empty,empty,['accommodation'])?.text,'accommodation ');
});
test('word ranges use textarea UTF-16 offsets and skip URLs and identifiers',()=>{
  const text='🙂 Zayvion’s café mesage. https://example.com/recieve name@example.com AB123';
  const words=wordsIn(text);
  assert.ok(words.some(w=>w.word==='Zayvion’s'));assert.ok(words.some(w=>w.word==='café'));
  for(const word of words)assert.equal(text.slice(word.start,word.end),word.word);
  assert.equal(words.some(w=>['https','recieve','example','AB'].includes(w.word)),false);
});
test('character parser handles Unicode, multiword names and multiple extensions',()=>{
  assert.equal(characterName("  DR. EMILY  CARTER (V.O.) (CONT’D)  "),'DR. EMILY CARTER');
  assert.equal(characterName('Élodie (O.S.)'),'ÉLODIE');assert.equal(characterName('张 伟 (O.C.)'),'张 伟');
  const dictionary=buildSmartTypeFromScript([p('custom','ÉLODIE (LIVE RADIO)')]);assert.ok(dictionary.characters.includes('ÉLODIE'));assert.ok(dictionary.extensions.includes('(LIVE RADIO)'));assert.ok(dictionary.extensions.includes('(O.C.)'));
});
test('registry is inferred from character elements, indexed incrementally, and ranks prefix/partial names',()=>{
  const index=new CharacterIndex();let doc=index.reconcile(document([p('a','JOHN (V.O.)'),p('b','JOHN'),p('c','JONATHAN'),p('d','DETECTIVE ROBERT'),p('e','JOSEPH'),p('f','JOHN','Action')]));
  assert.equal(doc.characterMemory!.length,4);assert.equal(doc.characterMemory![0].appearances,2);
  assert.deepEqual(suggestCharacters(doc.characterMemory!,'jo'),['JOHN','JONATHAN','JOSEPH']);
  assert.deepEqual(suggestCharacters(doc.characterMemory!,'rob'),['DETECTIVE ROBERT']);
  const records=doc.characterMemory;doc=index.reconcile({...doc,paragraphs:doc.paragraphs.map(q=>q.id==='f'?{...q,text:'New prose.'}:q)});
  assert.equal(doc.characterMemory,records,'prose does not rebuild character records');
});
test('rename, duplicate, deletion, undo, split and merge preserve consistent unique identities',()=>{
  const index=new CharacterIndex();let doc=index.reconcile(document([p('a','JOHN'),p('b','JOHN'),p('c','SARAH')]));
  const original=doc.paragraphs,id=doc.characterMemory!.find(r=>r.name==='SARAH')!.id;
  doc=index.reconcile({...doc,paragraphs:doc.paragraphs.map(q=>q.id==='c'?{...q,text:'SAMANTHA'}:q)});
  assert.equal(doc.characterMemory!.find(r=>r.name==='SAMANTHA')!.id,id);
  doc=index.reconcile({...doc,paragraphs:doc.paragraphs.map(q=>q.id==='a'?{...q,text:'JACK'}:q)});
  assert.equal(new Set(doc.characterMemory!.map(r=>r.id)).size,doc.characterMemory!.length);
  doc=index.reconcile({...doc,paragraphs:original});assert.deepEqual(doc.characterMemory!.map(r=>r.name),['JOHN','SARAH']);
  doc=index.reconcile({...doc,paragraphs:[original[0]]});assert.equal(doc.characterMemory!.length,1);
  doc=index.reconcile({...doc,paragraphs:[p('a','','Action')]});assert.equal(doc.characterMemory!.length,0);
});
test('saved definitions persist and project-specific vocabulary protects fictional names',()=>{
  const index=new CharacterIndex();let doc=index.reconcile(document([p('a','ZAYVION'),p('b','Zayvion entered.','Action')]));
  doc.characterMemory![0].saved=true;
  doc=index.reconcile({...doc,paragraphs:[doc.paragraphs[1]]});assert.equal(doc.characterMemory!.length,1);
  const vocabulary=characterVocabulary(doc.characterMemory!,doc.paragraphs);assert.ok(vocabulary.has('zayvion'));
  const other=index.reconcile(document([p('x','SARAH')],'other-project'));assert.equal(other.characterMemory!.some(r=>r.name==='ZAYVION'),false);
});
test('full project backup/crash-recovery round trip includes names and document preferences',()=>{
  const data=new Map<string,string>();globalThis.localStorage={getItem:k=>data.get(k)||null,setItem:(k,v)=>{data.set(k,String(v))},removeItem:k=>{data.delete(k)},clear:()=>data.clear(),key:i=>[...data.keys()][i]||null,get length(){return data.size}};
  const index=new CharacterIndex();const doc=index.reconcile({...document([p('a','ÉLODIE (V.O.)'),p('b','ZAYVION')]),writingAssistance:{version:1 as const,ignoredWords:['quux'],disabledAutocorrectWords:['teh']}});
  assert.equal(saveDocumentWithBackup(doc,false,false).success,true);
  const stored=getAllBackups()[0].document;assert.deepEqual(stored.characterMemory,doc.characterMemory);assert.deepEqual(stored.writingAssistance,doc.writingAssistance);
  const restored=new CharacterIndex().reconcile(JSON.parse(JSON.stringify(stored)));assert.deepEqual(restored.characterMemory,doc.characterMemory);
  assert.ok(checkCrashRecoveryState('2000-01-01T00:00:00Z')?.characterMemory?.length);
});
test('older documents reconstruct names and settings migrate safely without changing pagination',()=>{
  const before=document([p('a','JOHN'),p('b','A narrative paragraph.','Action')]);
  const after=new CharacterIndex().reconcile(before);
  assert.deepEqual(paginateScript(after.paragraphs),paginateScript(before.paragraphs));
  assert.equal(after.paragraphs,before.paragraphs);
  assert.equal(sanitizeSettings({autocorrect:false,language:'wrong',customWords:[3,'Zayvion']}).autocorrect,false);
  assert.deepEqual(sanitizeSettings({customWords:[3,'Zayvion']}).customWords,['Zayvion']);
});

test('incremental word counts match canonical text across edit, deletion, undo and document replacement',()=>{
 const index=new WordCountIndex();let paragraphs=[p('a','one two','Action'),p('b','three','Dialogue')];assert.equal(index.count(paragraphs),3);const original=paragraphs;paragraphs=[{...paragraphs[0],text:'one two three four'},paragraphs[1]];assert.equal(index.count(paragraphs),5);assert.equal(index.count([paragraphs[1]]),1);assert.equal(index.count(original),3);assert.equal(index.count([p('x','🙂 Café Zayvion','Action')]),3);
});
