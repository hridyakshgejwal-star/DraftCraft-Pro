import assert from 'node:assert/strict';
import {test} from 'node:test';
import {blankDocument} from '../src/files/model';
import {migrateStudio,takeOperation,reconcileStudio,pairDialogue,literalRanges,renameCharacter,addTag,reviewChange,sceneCast} from '../src/production/model';
import {layoutScript,lockLayout,unlockLayout,documentLayout} from '../src/production/layout';
import {baseFormat} from '../src/formats/model';
import {capturePage,deletePageContent,pageContent} from '../src/utils/pageActions';
import type {Paragraph} from '../src/types/script';
const p=(id:string,type:Paragraph['type'],text:string):Paragraph=>({id,type,text});
const measure=(text:string)=>[...text].length*7.2;
const document=(paragraphs:Paragraph[])=>migrateStudio({...blankDocument(),paragraphs,writingFormat:baseFormat()});
test('alternate takes retain edited B across A/B selection, serialization, duplication and deletion',()=>{
 let a={...p('speech','Dialogue','Original A'),altDialogue:['Original A','Original B'],activeAltIndex:0};
 a=takeOperation(a,'select',1) as typeof a;a={...a,text:'Edited B — नमस्ते'};
 a=takeOperation(a,'select',0) as typeof a;assert.equal(a.text,'Original A');
 a=JSON.parse(JSON.stringify(takeOperation(a,'select',1)));assert.equal(a.text,'Edited B — नमस्ते');
 const duplicated=takeOperation(a,'duplicate');assert.equal(duplicated.text,a.text);assert.equal(duplicated.altDialogue?.length,3);
 assert.equal(takeOperation(duplicated,'delete').text,a.text);assert.equal(takeOperation(a,'add').text,'');
});
test('dual dialogue pairs selected adjacent blocks in the middle, retaining final paragraph',()=>{
 const ps=[p('a','Action','Opening.'),p('c1','Character','ANN'),p('d1','Dialogue','First.'),p('c2','Character','ANNA'),p('dir','Parenthetical','(quietly)'),p('d2','Dialogue','Second.'),p('end','Action','Untouched.')];
 const next=pairDialogue(ps,'d2');assert.equal(next.at(-1),ps.at(-1));assert.equal(next[1].dualColumn,1);assert.equal(next[3].dualColumn,2);assert.equal(new Set(next.slice(1,6).map(p=>p.dualGroupId)).size,1);assert.ok(!next[0].dualGroupId);
 const result=layoutScript(next,baseFormat(),undefined,measure);const left=result.pages[0].fragments.find(f=>f.paragraphId==='c1')!,right=result.pages[0].fragments.find(f=>f.paragraphId==='c2')!;assert.equal(left.y,right.y);assert.ok(left.x+left.width<right.x);
 assert.equal(pairDialogue(next,'d1')[2].type,'Dialogue');
});
test('measured fragments retain every source code unit of a multi-page speech without overflow',()=>{
 const text=('A long speech includes Unicode café and questions. '.repeat(500)).trim();const ps=[p('c','Character','ANN'),p('speech','Dialogue',text)];const f=baseFormat();const result=layoutScript(ps,f,undefined,measure);assert.ok(result.pages.length>5);
 const fragments=result.pages.flatMap(p=>p.fragments).filter(f=>f.paragraphId==='speech');assert.equal(fragments.map(f=>text.slice(f.start,f.end)).join(''),text);assert.ok(result.pages.every(p=>p.fragments.every(fr=>fr.y+fr.height<=(f.page.height-f.page.top-f.page.bottom)*72+.01)));assert.ok(result.pages[0].labels.some(l=>l.kind==='more'));assert.ok(result.pages[1].labels.some(l=>l.kind==='continued'));
});
test('heading and character cue do not orphan; page fragment deletion retains rest of speech',()=>{
 const ps=[p('h','Scene Heading','INT. ROOM - NIGHT'),p('a','Action','Action. '.repeat(200)),p('c','Character','ANN'),p('d','Dialogue','A speech. '.repeat(1000))];const result=layoutScript(ps,baseFormat(),undefined,measure);
 for(const pg of result.pages)if(pg.fragments.at(-1)?.paragraphId==='c')assert.fail('stranded cue');
 const pg=result.pages.find(p=>p.fragments[0]?.paragraphId==='d'&&p.fragments[0].start>0)!;const target=capturePage(pg,ps);const content=pageContent(ps,target);assert.ok(content[0].text.length<ps[3].text.length);const next=deletePageContent(ps,target);assert.equal(next.find(p=>p.id==='d')!.text.length,ps[3].text.length-content[0].text.length);
});
test('locked boundary anchors retain subsequent labels through overflow, deletion and reopen',()=>{
 let doc=document(Array.from({length:80},(_,i)=>p('p'+i,'Action','A measured paragraph. '.repeat(12))));doc=lockLayout(doc);const boundaries=doc.studio!.pageLocks;assert.ok(boundaries.length>2);const second=boundaries[1];const next=reconcileStudio(doc,{...doc,paragraphs:doc.paragraphs.map((p,i)=>i===0?{...p,text:p.text+' More text. '.repeat(500)}:p)});const layout=documentLayout(JSON.parse(JSON.stringify(next)));assert.ok(layout.pages.some(p=>p.pageLabel==='1A'));assert.equal(layout.pages.find(p=>p.pageLabel===second.label)!.fragments[0].paragraphId,second.anchor.paragraphId);
 const deleted=reconcileStudio(doc,{...doc,paragraphs:doc.paragraphs.filter(p=>p.id!==second.anchor.paragraphId)});assert.equal(deleted.studio!.pageLocks.length,boundaries.length);assert.ok(documentLayout(deleted).pages.some(p=>p.pageLabel===second.label));assert.equal(unlockLayout(next,true).studio!.pageLocks.length,0);
});
test('literal character names cannot match ANN inside ANNA or interpret regex punctuation',()=>{
 assert.deepEqual(literalRanges('ANN ANNA ANN.','ANN'),[{start:0,end:3},{start:9,end:12}]);assert.equal(literalRanges('A+B speaks. AAAB speaks.','A+B').length,1);
 const doc=document([p('c1','Character','ANN (V.O.)'),p('c2','Character','ANNA'),p('a','Action','ANN sees ANNA.')]);const next=renameCharacter(doc,'ANN','JUNE',true);assert.equal(next.paragraphs[0].text,'JUNE (V.O.)');assert.equal(next.paragraphs[1].text,'ANNA');assert.equal(next.paragraphs[2].text,'JUNE sees ANNA.');
});
test('tag all uses reusable range identities and anchors survive insertions, deletion and JSON',()=>{
 let doc=document([p('a','Action','A red key opens the lock.'),p('b','Action','The key falls.')]);doc=addTag(doc,'Key','Prop',{paragraphId:'a',start:6,end:9},true);assert.equal(doc.studio!.tags.length,1);assert.equal(doc.studio!.occurrences.length,2);
 const next=reconcileStudio(doc,{...doc,paragraphs:doc.paragraphs.map(p=>p.id==='a'?{...p,text:'Suddenly, '+p.text}:p)});assert.equal(next.studio!.occurrences[0].start,16);assert.equal(JSON.parse(JSON.stringify(next)).studio.tags[0].id,doc.studio!.tags[0].id);
 const removed=reconcileStudio(next,{...next,paragraphs:next.paragraphs.filter(p=>p.id!=='b')});assert.equal(removed.studio!.occurrences[1].deleted,true);
});
test('two authors track separate edits and rejecting one preserves unrelated text',()=>{
 let doc=document([p('a','Action','The door opens.'),p('b','Action','A light shines.')]);doc.studio!.track.enabled=true;doc.studio!.track.author='Writer One';
 let next=reconcileStudio(doc,{...doc,paragraphs:doc.paragraphs.map(p=>p.id==='a'?{...p,text:'The red door opens.'}:p)});next={...next,studio:{...next.studio!,track:{...next.studio!.track,author:'Writer Two'}}};next=reconcileStudio(next,{...next,paragraphs:next.paragraphs.map(p=>p.id==='b'?{...p,text:'A bright light shines.'}:p)});next=JSON.parse(JSON.stringify(next));assert.deepEqual(next.studio!.track.changes.map(c=>c.author),['Writer One','Writer Two']);next=reviewChange(next,next.studio!.track.changes[0].id,'reject');assert.equal(next.paragraphs[0].text,'The door opens.');assert.equal(next.paragraphs[1].text,'A bright light shines.');
});
import {fixDoctorIssues,runFormattingDoctor} from '../src/utils/formatDoctor';
import {WritingActivity} from '../src/production/activity';
import {loadProductivityStore,recordActivityDelta} from '../src/utils/productivityStorage';
test('Format Doctor composes fixes against current text and never invents slugline details',()=>{
 const f=baseFormat(),ps=[p('s','Scene Heading','kitchen  '),p('c','Character','ann  '),p('d','Dialogue','Words.')];const fixed=fixDoctorIssues(ps,f);assert.equal(fixed[0].text,'KITCHEN');assert.equal(fixed[1].text,'ANN');assert.ok(!fixed[0].text.includes('INT.'));assert.ok(!fixed[0].text.includes('DAY'));assert.ok(runFormattingDoctor(ps,baseFormat('prose')).every(i=>!['scene-prefix','scene-time','orphan-cue','dialogue-cue'].includes(i.rule)));
});
test('fresh productivity profiles are empty; ambiguous history is preserved with a separate backup',()=>{
 const values=new Map<string,string>();globalThis.localStorage={getItem:k=>values.get(k)||null,setItem:(k,v)=>{values.set(k,v);},removeItem:k=>values.delete(k),clear:()=>values.clear(),key:i=>[...values.keys()][i]||null,get length(){return values.size;}} as Storage;
 const fresh=loadProductivityStore();assert.deepEqual(fresh.history,{});assert.equal(fresh.longestStreak,0);
 const existing={...fresh,version:undefined,history:{'2026-01-01':{date:'2026-01-01',wordsAdded:37,pagesAdded:0,secondsSpent:90,goalMet:false}}};values.set('fd_writing_productivity_v1',JSON.stringify(existing));const migrated=loadProductivityStore();assert.deepEqual(migrated.history,existing.history);assert.equal(migrated.legacyStatus,'unverified');assert.ok(values.has(migrated.legacyBackupKey!));
 const actual=recordActivityDelta(3,0,4,'2026-10-16');assert.equal(actual.history['2026-10-16'].wordsAdded,3);assert.equal(actual.history['2026-10-16'].secondsSpent,4);
});
test('activity credits paste and net growth, reverses undo across midnight, ignores import/project switching',()=>{
 const meter=new WritingActivity(),a=document([p('a','Action','Original text.')]);assert.deepEqual(meter.observe(a,1,'ignored','2026-10-15'),[]);const b={...a,paragraphs:[{...a.paragraphs[0],text:'Original text. New writing here.'}]};assert.deepEqual(meter.observe(b,1,'edit','2026-10-15'),[{date:'2026-10-15',words:3,pages:0}]);assert.deepEqual(meter.observe(a,1,'undo','2026-10-16'),[{date:'2026-10-15',words:-3,pages:0}]);assert.deepEqual(meter.observe(b,1,'redo','2026-10-16'),[{date:'2026-10-15',words:3,pages:0}]);assert.deepEqual(meter.observe({...b,id:'imported'},12,'ignored','2026-10-16'),[]);assert.deepEqual(meter.observe(b,1,'ignored','2026-10-16'),[]);
});

test('structural Track Changes restores deleted paragraph identities and rejects inserted paragraphs',()=>{let original=migrateStudio(blankDocument());original.paragraphs=[{id:'one',type:'Action',text:'First.'},{id:'two',type:'Dialogue',text:'Keep my identity.'},{id:'three',type:'Action',text:'Last.'}];original.studio!.track.enabled=true;const deleted=reconcileStudio(original,{...original,paragraphs:original.paragraphs.filter(p=>p.id!=='two')});const change=deleted.studio!.track.changes.find(c=>c.structure?.kind==='delete')!;assert.ok(change);const restored=reviewChange(deleted,change.id,'reject');assert.deepEqual(restored.paragraphs,original.paragraphs);const added=reconcileStudio(original,{...original,paragraphs:[...original.paragraphs,{id:'added',type:'Action',text:'Inserted.'}]});const insertion=added.studio!.track.changes.find(c=>c.structure?.kind==='insert')!;assert.deepEqual(reviewChange(added,insertion.id,'reject').paragraphs,original.paragraphs);});

test('scene omission is reversible, hides body geometry and retains the original semantic heading range',()=>{const original=document([{id:'scene',type:'Scene Heading',text:'INT. A VERY LONG ORIGINAL LOCATION - NIGHT',sceneNumber:'12',omitted:true},{id:'body',type:'Action',text:'Original action remains in the saved project.'},{id:'next',type:'Scene Heading',text:'EXT. ROAD - DAY'}]);const result=documentLayout(original);assert.equal(result.pages.flatMap(p=>p.fragments).some(f=>f.paragraphId==='body'),false);const omitted=result.pages.flatMap(p=>p.fragments).find(f=>f.paragraphId==='scene')!;assert.equal(omitted.end,original.paragraphs[0].text.length);assert.match(omitted.lines.map(l=>l.text).join(' '),/OMITTED/);const restored={...original,paragraphs:original.paragraphs.map(p=>p.id==='scene'?{...p,omitted:false}:p)};assert.ok(documentLayout(restored).pages.flatMap(p=>p.fragments).some(f=>f.paragraphId==='body'));assert.equal(restored.paragraphs[0].text,original.paragraphs[0].text);});
