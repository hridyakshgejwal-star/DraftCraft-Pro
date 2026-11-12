import test from 'node:test';
import assert from 'node:assert/strict';
import { CharacterIndex } from '../src/writing/model';
import { SAMPLE_SCRIPT } from '../src/data/sampleScript';
import { COMMANDS, ELEMENTS, captureShortcut, defaultProfile, defaultSettings, displayShortcut, enterParagraph, importProfile, insertCommand, loadShortcutSettings, matchesShortcut, overlaps, primary, resolveCommand, validateShortcut } from '../src/shortcuts/model';
import { exportToFountain, parseFountain } from '../src/utils/fountainCodec';

const event = (key: string, mods: Partial<KeyboardEvent> = {}) => ({ key, code: key.length === 1 ? /\d/.test(key) ? 'Digit' + key : 'Key' + key.toUpperCase() : key, metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, ...mods });
test('all elements and thirteen quick inserts are registrable; legacy numbers stay exact', () => {
  assert.equal(ELEMENTS.length,29);for(const type of ['Outline Level 3','Sequence','Note','Stage Direction','Song Title','Comic Page','Panel','Panel Description','Caption','Sound Effect','Narration'])assert.ok(ELEMENTS.includes(type as any)); assert.equal(COMMANDS.filter(c=>c.category==='Quick Inserts').length,13);
  const p=defaultProfile(); assert.equal(resolveCommand(p,{},event('4',{metaKey:true}),false),'element:Parenthetical'); assert.equal(resolveCommand(p,{},event('5',{ctrlKey:true}),false),'element:Dialogue');
  for(const c of COMMANDS){const custom=defaultProfile();custom.bindings=Object.fromEntries(COMMANDS.map(c=>[c.id,null]));custom.bindings[c.id]={...primary('l'),primary:false,alt:true};assert.equal(resolveCommand(custom,{},event('l',{altKey:true}),false),c.id);}
});
test('Option glyphs, separate Control and Command, Unicode letters, and composition guards', () => {
  const b=captureShortcut(event('å',{code:'KeyA',altKey:true}))!; assert.equal(b.key,'a');assert.ok(matchesShortcut(b,event('å',{code:'KeyA',altKey:true})));assert.equal(displayShortcut(b),'⌥A');
  assert.ok(!matchesShortcut(b,event('a',{metaKey:true})));assert.ok(!matchesShortcut(b,event('Dead',{code:'KeyA',altKey:true})));
  const control=captureShortcut(event('d',{ctrlKey:true}))!;assert.ok(matchesShortcut(control,event('d',{ctrlKey:true})));assert.ok(!matchesShortcut(control,event('d',{metaKey:true})));
  assert.equal(captureShortcut(event('Process',{isComposing:true})),null);
  const letter=captureShortcut(event('é'))!;assert.ok(!matchesShortcut(letter,event('é'),false));assert.ok(matchesShortcut(letter,event('é'),true));
});
test('plain letters require mode and modified keys never lose exact modifier matching', () => {
  const p=defaultProfile(), b=captureShortcut(event('a'))!;p.bindings['element:Action']=b;
  assert.equal(resolveCommand(p,{},event('a'),false),undefined); assert.equal(resolveCommand(p,{},event('a'),true),'element:Action');assert.equal(resolveCommand(p,{},event('A',{shiftKey:true}),true),undefined);
  assert.equal(resolveCommand(defaultProfile(),{},event('1',{metaKey:true,altKey:true}),false),undefined);
});
test('essential commands and text navigation are protected; real conflicts include primary variants', () => {
  for(const key of ['s','z','c','v','x','a','q','w','f','p','e','n','o'])assert.ok(validateShortcut(captureShortcut(event(key,{metaKey:true}))!));
  for(const key of ['ArrowLeft','ArrowRight','Backspace'])assert.ok(validateShortcut(captureShortcut(event(key,{altKey:true}))!));
  assert.ok(validateShortcut(captureShortcut(event(']',{metaKey:true,shiftKey:true}))!)); assert.equal(validateShortcut(captureShortcut(event('j',{altKey:true}))!),null);
  assert.ok(overlaps(primary('3'),captureShortcut(event('3',{metaKey:true}))!));assert.ok(overlaps(primary('3'),captureShortcut(event('3',{ctrlKey:true}))!));assert.ok(!overlaps(primary('3'),captureShortcut(event('3',{altKey:true}))!));
});
test('profile persistence preserves removed assignments, modifiers, navigation and active identity', () => {
  const state=defaultSettings();state.activeId='custom';state.profiles[1].bindings['element:Action']=null;state.profiles[1].navigation.dialogueExit='double-enter';
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>JSON.stringify(state)}});assert.deepEqual(loadShortcutSettings(),state);
  const p=importProfile({...state.profiles[1],name:'Personal'},'qa');assert.equal(p.name,'Personal');assert.equal(p.bindings['element:Action'],null);
  const bad=defaultProfile();bad.bindings['element:Action']=primary('3');assert.throws(()=>importProfile(bad),/overlapping/);
  assert.throws(()=>importProfile({...bad,bindings:{'element:Action':{key:'s',meta:true,ctrl:false,alt:false,shift:false}}}),/reserved/);
});
test('quick inserts do not overwrite text, metadata or adjacent paragraphs', () => {
  const paragraphs=[{id:'a',type:'Action' as const,text:'Preserve this line.',notes:[{id:'note',author:'A',text:'Keep',color:'blue' as const,createdAt:'today'}]},{id:'b',type:'Action' as const,text:'Next'}];
  for(const command of COMMANDS.filter(c=>c.category==='Quick Inserts')){const out=insertCommand(paragraphs,'a',command,'Pink')!;assert.deepEqual(out.paragraphs[0],paragraphs[0]);assert.equal(out.paragraphs[2],paragraphs[1]);assert.equal(out.paragraph.type,command.type);assert.equal(out.paragraph.text,command.text);assert.equal(out.paragraph.revision,'Pink');}
  const empty=insertCommand([{id:'a',type:'Action',text:''}],'a',COMMANDS.find(c=>c.id==='insert:CUT TO:')!)!;assert.equal(empty.paragraphs.length,1);assert.equal(empty.paragraph.id,'a');
});
test('Enter transitions, selection splitting, revision metadata and repeated Dialogue exit', () => {
  for(const [type,next]of [['Character','Dialogue'],['Parenthetical','Dialogue'],['Scene Heading','Action']] as const){const out=enterParagraph([{id:'a',type,text:'Existing'}],'a',8,8,defaultProfile().navigation)!;assert.equal(out.paragraph.type,next);assert.equal(out.paragraphs[0].text,'Existing');}
  const nav=defaultProfile().navigation;nav.dialogueExit='double-enter';const a=enterParagraph([{id:'a',type:'Dialogue',text:'Hello'}],'a',5,5,nav)!;assert.equal(a.paragraph.type,'Dialogue');const b=enterParagraph(a.paragraphs,a.paragraph.id,0,0,nav)!;assert.equal(b.paragraphs.length,2);assert.equal(b.paragraph.type,'Action');
  const split=enterParagraph([{id:'a',type:'Action',text:'beforeSELECTafter',bookmark:'Keep'}],'a',6,12,nav,'Blue')!;assert.equal(split.paragraphs[0].text,'before');assert.equal(split.paragraph.text,'after');assert.equal(split.paragraphs[0].bookmark,'Keep');assert.equal(split.paragraph.revision,'Blue');
});
test('project character assignment follows sole rename and survives removal and backups', () => {
  const index=new CharacterIndex();let doc=index.reconcile({...SAMPLE_SCRIPT,id:'project-qa',paragraphs:[{id:'name',type:'Character',text:'JOHN'}]});const id=doc.characterMemory![0].id;
  doc=index.reconcile({...doc,characterShortcuts:{[id]:captureShortcut(event('j',{altKey:true}))},paragraphs:[{id:'name',type:'Character',text:'JAMES'}]});assert.equal(doc.characterMemory![0].id,id);assert.equal(doc.characterMemory![0].name,'JAMES');
  doc=index.reconcile({...doc,paragraphs:[{id:'a',type:'Action',text:'Keep character shortcut'}]});assert.equal(doc.characterMemory![0].id,id);assert.deepEqual(JSON.parse(JSON.stringify(doc)).characterShortcuts,doc.characterShortcuts);
});
test('new centered and lyric elements retain their explicit Fountain types', () => {
  const text=exportToFountain({...SAMPLE_SCRIPT,paragraphs:[{id:'c',type:'Centered Text',text:'The End'},{id:'l',type:'Lyrics',text:'Sing softly'}]});const out=parseFountain(text).paragraphs!;assert.equal(out[0].type,'Centered Text');assert.equal(out[0].text,'The End');assert.equal(out[1].type,'Lyrics');assert.equal(out[1].text,'Sing softly');
});
