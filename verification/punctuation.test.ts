import test from 'node:test';
import assert from 'node:assert/strict';
import {punctuationEdit,punctuatedParagraph,DEFAULT_PUNCTUATION,normalizePunctuation,finalSentence,punctuationKey,removedPunctuation,addPunctuationOmission,classifySentence,type PunctuationContext} from '../src/writing/punctuation';
import {sanitizeSettings} from '../src/writing/model';
import {FORMAT_ELEMENTS} from '../src/formats/model';
import type {ElementType,Paragraph} from '../src/types/script';
const context:PunctuationContext={element:'Dialogue',language:'en-US'};
const settings={...DEFAULT_PUNCTUATION};
const result=(text:string,ctx=context,prefs=settings)=>punctuationEdit(text,text.length,text.length,ctx,prefs)?.text||text;

test('punctuation defaults migrate missing settings to On and retain explicit choices',()=>{
 assert.equal(normalizePunctuation(undefined).enabled,true);assert.equal(normalizePunctuation(false).enabled,false);
 assert.deepEqual(normalizePunctuation({enabled:false,questions:false,whileTyping:true}),{...settings,enabled:false,questions:false,whileTyping:true});
 const restored=sanitizeSettings(JSON.parse(JSON.stringify({autocorrect:false,punctuation:{enabled:false,onEnter:false}})));
 assert.equal(restored.punctuation.enabled,false);assert.equal(restored.punctuation.onEnter,false);assert.equal(restored.autocorrect,false);
 assert.deepEqual(normalizePunctuation({enabled:'false',fullStops:null}),settings);
});
test('ordinary complete descriptions, emotional statements and indirect questions receive periods',()=>{
 for(const text of ['He looks outside','He slowly walks toward the window','He closes the door','I wonder where he went','I wonder why he left','I know what happened',"I don't want to go",'I hate you',"I can't believe this",'You know where he went','The keys on the table are missing'])assert.equal(result(text),text+'.',text);
});
test('direct wh questions use their syntactic role rather than question-word presence',()=>{
 for(const text of ['Where is he','Where are you going','What happened','Who opened the door','Which door opens','Why did you leave me','Whose car is outside','Who are you talking to'])assert.equal(result(text),text+'?',text);
 for(const text of ['I remember who opened the door','He knows how it works','She understands why he left'])assert.equal(result(text),text+'.',text);
});
test('inverted auxiliary and copular questions require a completed predicate',()=>{
 for(const text of ['Do you remember me','Is the door open','Are you ready','Can she hear me','Did they leave','Would you close the door','Have you seen him'])assert.equal(result(text),text+'?',text);
 for(const text of ['Can you','Do you','Where is the','Have you'])assert.equal(result(text),text,text);
});
test('supported conversational and tag questions retain natural question endings',()=>{
 for(const text of ['You really think he is alive','You seriously believe this','You are coming, right',"You saw him, didn't you",'How about tomorrow','What about the keys','Why not'])assert.equal(result(text),text+'?',text);
 assert.equal(result('You can go'),'You can go.');assert.equal(result('You believe him'),'You believe him.');
});
test('ordinary positive and negative imperatives never imply exclamation',()=>{
 for(const text of ['Close the door','Leave me alone','Get out of the room','Please close the window',"Don't touch that",'Come in','Watch out'])assert.equal(result(text),text+'.',text);
});
test('urgent warnings require both a warning construction and supporting local context',()=>{
 const urgent={...context,previous:[{type:'Parenthetical' as const,text:'(shouting an urgent warning)'}]};
 assert.equal(result('Watch out',urgent),'Watch out!');assert.equal(result('Get down',urgent),'Get down!');
 for(const text of ['I hate you','I cannot believe this','Get out of the room','He closes the door'])assert.equal(result(text,urgent),text+'.',text);
 assert.equal(result('Watch out',{...context,previous:[{type:'Parenthetical',text:'(shouting)'}]}),'Watch out.');
 assert.equal(result('Watch out',urgent,{...settings,conservativeExclamations:false}),'Watch out.');
});
test('screenplay danger context remains scoped to the current scene and dialogue delivery',()=>{
 const previous:Pick<Paragraph,'type'|'text'>[]=[{type:'Action',text:'A truck hurtles toward the crossing.'},{type:'Character',text:'JOHN'},{type:'Parenthetical',text:'(shouting)'}];
 assert.equal(result('Watch out',{...context,previous}),'Watch out!');
 assert.equal(result('Watch out',{element:'Action',previous}),'Watch out.');
 assert.equal(result('Watch out',{...context,previous:[previous[0],{type:'Scene Heading',text:'INT. OFFICE - DAY'},previous[2]]}),'Watch out.');
});
test('exclamative syntax is not confused with an interrogative or automatic emotional intensity',()=>{
 assert.equal(result('What a beautiful day'),'What a beautiful day.');
 assert.equal(result('How beautiful the sky is'),'How beautiful the sky is.');
 assert.equal(result('What a beautiful day',{...context,previous:[{type:'Parenthetical',text:'(exclaims in delight)'}]}),'What a beautiful day!');
});
test('unfinished complements, conjunctions and dependent clauses remain unfinished',()=>{
 for(const text of ['He walks into the room and','He walks toward the','He was looking for','He wants to','I think she is','He is','He gave','Because he left','If he comes home','It was the boy who','I want to know whether','He runs because he','He waits and she','He does not','He is very','He seems'])assert.equal(result(text),text,text);
 assert.equal(result('If he comes home, we can leave'),'If he comes home, we can leave.');
 assert.equal(result('Because he left, I waited'),'Because he left, I waited.');
});
test('uncertain fragments and labels do not acquire speculative punctuation',()=>{
 for(const text of ['The abandoned house','A quiet room','Walking through the rain','UNTITLED','JOHN','Chapter One',''])assert.equal(result(text,{element:'Action'}),text,text);
 assert.equal(result('Yes'),'Yes.');assert.equal(result('Thank you'),'Thank you.');
});
test('existing marks, pauses, interruptions and deliberately open continuations remain exact',()=>{
 for(const text of ['He waits.','Where is he?','Stop!','He waits...','He waits…','I was going to—','I was going to--','Well,','He knows:','He pauses;','"Where is he?"','(He waits.)'])assert.equal(result(text),text,text);
});
test('all non-sentence screenplay elements are exempt',()=>{
 const allowed=new Set(['Action','Dialogue','Dual Dialogue','General','Stage Direction','Panel Description','Caption','Narration']);
 for(const element of FORMAT_ELEMENTS.filter(e=>!allowed.has(e)))assert.equal(result('He looks outside',{element}),'He looks outside',element);
 for(const [element,text]of [['Scene Heading','INT. HOUSE - DAY'],['Character','JOHN'],['Transition','CUT TO:'],['Parenthetical','(whispering)'],['Shot','WIDE SHOT']]as [ElementType,string][])assert.equal(result(text,{element}),text);
});
test('General prose and supported descriptive elements use their semantic types',()=>{
 for(const element of ['Action','Dialogue','Dual Dialogue','General','Stage Direction','Panel Description','Caption','Narration']as ElementType[])assert.equal(result('He looks outside',{element}),'He looks outside.',element);
});
test('balanced quotes place the mark inside while incidental brackets keep it outside',()=>{
 assert.equal(result('"Where are you going"'),'"Where are you going?"');
 assert.equal(result('“He looks outside”'),'“He looks outside.”');
 assert.equal(result('He asks, "Where is he"'),'He asks, "Where is he?"');
 assert.equal(result('He waits (quietly)'),'He waits (quietly).');
 for(const text of ['"He looks outside','He waits (quietly','He waits)'])assert.equal(result(text),text,text);
});
test('abbreviations and decimal tokens are retained without duplicate or internal punctuation',()=>{
 assert.equal(result('Dr. Smith waits'),'Dr. Smith waits.');
 assert.equal(result('Call Dr. Smith'),'Call Dr. Smith.');
 assert.equal(result('The value is 3.14'),'The value is 3.14.');
 assert.equal(result('He spoke to Mr.'),'He spoke to Mr.');
 assert.equal(result('Meet J. R. Smith'),'Meet J. R. Smith.');
});
test('terminal URLs, email addresses and file paths are protected',()=>{
 for(const text of ['Visit https://example.com','Visit example.com','Email alex@example.com','Open /Users/alex/file.txt','Open C:\\Drafts\\script.txt'])assert.equal(result(text),text,text);
 assert.equal(result('He opens the file tomorrow'),'He opens the file tomorrow.');
});
test('only the final sentence is classified and earlier sentences remain byte-identical',()=>{
 assert.equal(result('He waits. Where is he'),'He waits. Where is he?');
 assert.equal(result('He waits. He walks toward the'),'He waits. He walks toward the');
 assert.equal(result('Dr. Smith waits. He looks outside'),'Dr. Smith waits. He looks outside.');
 assert.equal(finalSentence('He waits. Where is he')?.text,'Where is he');
 const long='He waits. '.repeat(400)+'Where is he';assert.equal(result(long),long+'?');
});
test('selected text and mid-sentence splits do not cause punctuation changes',()=>{
 const text='He looks outside and waits';
 assert.equal(punctuationEdit(text,16,16,context,settings),null);
 assert.equal(punctuationEdit(text,0,text.length,context,settings),null);
 assert.equal(punctuationEdit(text,-1,-1,context,settings),null);
});
test('master, Return and individual punctuation switches gate actual insertions',()=>{
 assert.equal(result('He waits',context,{...settings,enabled:false}),'He waits');
 assert.equal(result('Where is he',context,{...settings,enabled:false}),'Where is he');
 assert.equal(result('He waits',context,{...settings,onEnter:false}),'He waits');
 assert.equal(result('He waits',context,{...settings,fullStops:false}),'He waits');
 assert.equal(result('Where is he',context,{...settings,questions:false}),'Where is he');
 assert.equal(result('He walks and',context,{...settings,incompleteSentences:false}),'He walks and.');
});
test('optional typing-boundary detection starts off and remains under the master switch',()=>{
 const text='He looks outside  ';
 assert.equal(punctuationEdit(text,text.length,text.length,context,settings,[],'typing'),null);
 assert.equal(punctuationEdit(text,text.length,text.length,context,{...settings,whileTyping:true},[],'typing')?.text,'He looks outside.  ');
 assert.equal(punctuationEdit(text,text.length,text.length,context,{...settings,whileTyping:true,enabled:false},[],'typing'),null);
});
test('punctuation insertions preserve inline styles, annotations and document identities',()=>{
 const p:Paragraph={id:'a',type:'Action',text:'He looks outside',runs:[{text:'He looks ',style:{bold:true}},{text:'outside',style:{italic:true}}],sceneNumber:'2A',sceneComment:'Keep this.',bookmark:'marked'};
 const edit=punctuationEdit(p.text,p.text.length,p.text.length,{element:p.type},settings)!;
 const next=punctuatedParagraph(p,edit);assert.equal(next.id,p.id);assert.equal(next.text,'He looks outside.');assert.equal(next.sceneComment,p.sceneComment);assert.equal(next.sceneNumber,'2A');assert.equal(next.bookmark,'marked');
 assert.equal(next.runs?.map(r=>r.text).join(''),next.text);assert.equal(next.runs?.at(-1)?.style?.italic,true);assert.equal(p.text,'He looks outside');
});
test('deliberate deletion is remembered only for the unchanged sentence and survives JSON persistence',()=>{
 const p:Paragraph={id:'a',type:'Action',text:'He looks outside.'};const key=removedPunctuation(p,'He looks outside','deleteContentBackward');assert.ok(key);
 const restored=JSON.parse(JSON.stringify(addPunctuationOmission({...p,text:'He looks outside'},key!))) as Paragraph;
 assert.equal(punctuationEdit(restored.text,restored.text.length,restored.text.length,{element:restored.type},settings,restored.punctuationOmissions),null);
 const revised='He looks outside again';assert.equal(punctuationEdit(revised,revised.length,revised.length,{element:p.type},settings,restored.punctuationOmissions)?.text,revised+'.');
 assert.equal(removedPunctuation(p,'He looks','deleteContentBackward'),null);assert.equal(removedPunctuation(p,'He looks outside','insertReplacementText'),null);
});
test('English analysis degrades conservatively for other languages and oversized sentences',()=>{
 assert.equal(result('He looks outside',{element:'General',language:'fr-FR'}),'He looks outside');
 assert.equal(result('वह बाहर देखता है',{element:'General'}),'वह बाहर देखता है');
 const long='He waits '+ 'patiently '.repeat(500);assert.equal(result(long),long);
 assert.equal(classifySentence('The abandoned house',context).mark,null);
 assert.equal(punctuationKey('  He looks outside  '),'he looks outside');
});
