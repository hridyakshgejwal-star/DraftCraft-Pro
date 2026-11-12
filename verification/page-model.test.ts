import assert from 'node:assert/strict';
import { test } from 'node:test';
import { capturePage, clonePageContent, decodePageClipboard, deletePageContent, insertPageContent, isPageCurrent, pageClipboardPayload } from '../src/utils/pageActions';
import { paginateScript } from '../src/utils/pagination';
import { beatHeight, beatWidth, resizedBeat } from '../src/utils/beatSizing';
import { Paragraph } from '../src/types/script';
const doc: Paragraph[] = Array.from({length:90}, (_,i) => ({id:`p-${i}`, type: i%9 === 0 ? 'Scene Heading' : 'Action', text: `${i}: ${'Distinct screenplay content. '.repeat(6)}`, sceneNumber: i%9 === 0 ? String(i) : undefined, lockedScene: i%9 === 0 ? true : undefined}));
test('first, middle and last deletion removes only measured source ranges and preserves untouched identities', () => {
 const pages=paginateScript(doc);
 for(const page of [pages[0],pages[Math.floor(pages.length/2)],pages.at(-1)!]){
  const target=capturePage(page,doc),next=deletePageContent(doc,target);
  for(const original of doc){const ranges=(target.ranges||[]).filter(r=>r.id===original.id).sort((a,b)=>b.start-a.start),retained=next.find(p=>p.id===original.id);if(!ranges.length){assert.equal(retained,original);continue;}let text=original.text;for(const r of ranges)text=text.slice(0,r.start)+text.slice(r.end);if(!text)assert.equal(retained,undefined);else assert.equal(retained?.text,text);}
 }
});
test('only page becomes a valid editable empty paragraph', () => {
 const only = doc.slice(0,1), next = deletePageContent(only,capturePage(paginateScript(only)[0],only));
 assert.equal(next.length,1); assert.equal(next[0].text,''); assert.equal(next[0].type,'Action');
 assert.notEqual(next[0].id,only[0].id); assert.equal(paginateScript(next).length,1);
});
test('target invalidation includes text, metadata, order and outside-page changes', () => {
 const t = capturePage(paginateScript(doc)[1],doc);
 for (const edited of [doc.map((p,i)=>i===0?{...p,text:'changed'}:p), doc.map((p,i)=>i===1?{...p,revision:'Blue' as const}:p), [...doc].reverse()]) {
  assert.equal(isPageCurrent(t,edited),false); assert.throws(()=>deletePageContent(edited,t)); assert.throws(()=>insertPageContent(edited,t,[],true));
 }
});
test('lossless clipboard preserves unicode, runs, notes, bookmarks and revision metadata', () => {
 const source: Paragraph[] = [{id:'source',type:'Scene Heading',text:'INT. माँ — CAFÉ - DAY',sceneNumber:'12A',lockedScene:true,revision:'Pink',revised:true,runs:[{text:'माँ',style:{bold:true},revisionId:'pink'}],notes:[{id:'n',paragraphId:'source',author:'Writer',text:'Story note',color:'blue',createdAt:'2026-10-11'}],bookmark:{id:'b',paragraphId:'source',name:'Scene',color:'#f00',createdAt:'2026-10-11'},dualGroupId:'pair',tags:['prop'],altDialogue:['one','two']}];
 const copied = decodePageClipboard(pageClipboardPayload(source)); assert.deepEqual(copied,source);
 const clone = clonePageContent(copied,false,'White');
 assert.notEqual(clone[0].id,source[0].id);assert.notEqual(clone[0].notes![0].id,source[0].notes![0].id);
 assert.equal(clone[0].notes![0].paragraphId,clone[0].id);assert.equal((clone[0].bookmark as any).paragraphId,clone[0].id);
 assert.equal(clone[0].sceneNumber,undefined);assert.equal(clone[0].lockedScene,undefined);assert.equal(clone[0].revision,'Pink');
 clone[0].notes![0].text='changed'; assert.equal(source[0].notes![0].text,'Story note');
 const production = clonePageContent(source,true,'Green'); assert.equal(production[0].revision,'Green'); assert.equal(production[0].revised,true);
});
test('paste uses the captured visible boundary and retains all original text and surrounding identities',()=>{
 const target=capturePage(paginateScript(doc)[2],doc),content=clonePageContent(doc.slice(target.start,target.end),false,'White');
 for(const after of [false,true]){const next=insertPageContent(doc,target,content,after),range=after?target.ranges!.at(-1)!:target.ranges![0],at=doc.findIndex(p=>p.id===range.id),offset=after?range.end:range.start;const before=doc.slice(0,at).map(p=>p.text).join('')+doc[at].text.slice(0,offset),rest=doc[at].text.slice(offset)+doc.slice(at+1).map(p=>p.text).join('');assert.equal(next.map(p=>p.text).join(''),before+content.map(p=>p.text).join('')+rest);assert.equal(new Set(next.map(p=>p.id)).size,next.length);for(const p of doc.slice(at+1))assert.equal(next.find(v=>v.id===p.id),p);}
});
test('plain text uses existing Fountain parsing and corrupt page data is rejected', () => {
 const pasted=decodePageClipboard({text:'INT. HOUSE - DAY\n\nShe opens a door.\n\nELENA'});
 assert.equal(pasted[0].type,'Scene Heading');assert.equal(pasted[1].type,'Action');assert.equal(pasted[2].type,'Character');
 assert.throws(()=>decodePageClipboard({text:'',html:'<img src="x">'}));
 assert.throws(()=>decodePageClipboard({text:'readable',html:'<meta name="draftcraft-page" content="e30=">'}));
});
test('size clamps retain compact cards, natural legacy height and grid units', () => {
 assert.equal(beatWidth(200),200); assert.equal(beatWidth(-9),200);assert.equal(beatWidth(Infinity),260);
 assert.equal(beatHeight(undefined),undefined);assert.equal(beatHeight(NaN),undefined);assert.equal(beatHeight(99999),1600);
 assert.deepEqual(resizedBeat(347,263,true),{width:340,height:260});assert.deepEqual(resizedBeat(347,263,false),{width:347,height:263});
});
