// 1.18: emoji data and search, recently used emoji, Getting Started reflow, Start Window helpers.
import test from 'node:test';
import assert from 'node:assert/strict';
import {EMOJI,EMOJI_GROUPS} from '../src/emoji/emojiData';
import {searchEmoji,loadRecentEmoji,rememberEmoji,RECENT_EMOJI_LIMIT,RECENT_EMOJI_KEY,entryFor} from '../src/emoji/emoji';
import {reflowText,GUIDE} from '../src/help/guide';
import {normalizeWorkspace,DEFAULT_TOOLBAR_ITEMS} from '../src/workspace/preferences';
import {START_TEMPLATES,startTemplate,recentWhen,folderLabel} from '../src/start/startData';

test('emoji data: unique, named, grouped, and every entry is an emoji',()=>{
 assert.ok(EMOJI.length>1300,String(EMOJI.length));
 assert.equal(new Set(EMOJI.map(e=>e[0])).size,EMOJI.length,'no duplicates');
 const groups=new Set(EMOJI_GROUPS.map(g=>g.id));
 for(const [emoji,name,group,keys] of EMOJI){
  assert.ok(groups.has(group),group);assert.ok(name&&name===name.toLowerCase(),name);assert.ok(keys===undefined||typeof keys==='string');
  assert.match(emoji,/^(?:\p{Extended_Pictographic}️?(?:‍\p{Extended_Pictographic}️?)*|\p{Regional_Indicator}{2})$/u,name);
 }
 for(const g of EMOJI_GROUPS){assert.ok(EMOJI.some(e=>e[2]===g.id),g.id);assert.ok(EMOJI.find(e=>e[0]===g.icon),'the tab icon is an emoji in the list: '+g.icon);}
 assert.equal(EMOJI[0][0],'😀','faces first');
 assert.equal(entryFor('🇮🇳')?.[1],'flag: india');
});

test('emoji search: every word must match; names and keywords rank first; the emoji itself matches',()=>{
 assert.equal(searchEmoji('laugh')[0][0],'😂');
 assert.ok(searchEmoji('rain').some(e=>e[0]==='🌧️'));
 assert.equal(searchEmoji('clapper')[0][0],'🎬');
 assert.equal(searchEmoji('FIRE')[0][0],'🔥');
 assert.ok(searchEmoji('red heart').every(e=>/red/.test(e[1]+' '+(e[3]||''))&&/heart/.test(e[1]+' '+(e[3]||''))));
 assert.deepEqual(searchEmoji('🚀').map(e=>e[0]),['🚀']);
 assert.deepEqual(searchEmoji('zzqqxx'),[]);assert.deepEqual(searchEmoji('   '),[]);
 assert.ok(searchEmoji('flag india').some(e=>e[0]==='🇮🇳'));
 assert.ok(searchEmoji('face').length<=240,'results are capped');
});

test('recently used emoji: newest first, no repeats, capped, unknown values ignored, storage failures tolerated',()=>{
 const store=new Map<string,string>(),storage={getItem:(k:string)=>store.get(k)??null,setItem:(k:string,v:string)=>{store.set(k,v);}};
 assert.deepEqual(loadRecentEmoji(storage),[]);
 rememberEmoji('😂',storage);rememberEmoji('🔥',storage);assert.deepEqual(rememberEmoji('😂',storage),['😂','🔥']);
 for(const e of EMOJI.slice(0,40))rememberEmoji(e[0],storage);assert.equal(loadRecentEmoji(storage).length,RECENT_EMOJI_LIMIT);
 store.set(RECENT_EMOJI_KEY,JSON.stringify(['not-an-emoji',5,'🚀']));assert.deepEqual(loadRecentEmoji(storage),['🚀']);
 store.set(RECENT_EMOJI_KEY,'{broken');assert.deepEqual(loadRecentEmoji(storage),[]);
 const failing={getItem:()=>{throw Error('blocked');},setItem:()=>{throw Error('blocked');}};
 assert.deepEqual(loadRecentEmoji(failing),[]);assert.deepEqual(rememberEmoji('😀',failing),['😀']);
});

test('Getting Started reflow: wrapped lines join, paragraphs and list items stay separate',()=>{
 assert.equal(reflowText('one two\nthree four\n\nnext paragraph\ncontinues'),'one two three four\n\nnext paragraph continues');
 assert.equal(reflowText('Steps:\n1. Open it.\n2. Double-click.\n   Terminal opens.\n* bullet\n  more'),'Steps:\n1. Open it.\n2. Double-click. Terminal opens.\n* bullet more');
 assert.equal(reflowText('a\r\nb'),'a b');
 for(const s of GUIDE)assert.ok(!reflowText(s.body).match(/[a-z,;]\n[a-z]/),'no mid-sentence breaks in '+s.id);
});

test('Start Window: every quick-start format exists; recent dates read naturally',()=>{
 for(const t of START_TEMPLATES)assert.ok(startTemplate(t.name),t.name);
 const now=new Date(2026,9,31,21,0);
 assert.match(recentWhen(new Date(2026,9,31,9,5).toISOString(),now),/^Today, /);
 assert.match(recentWhen(new Date(2026,9,30,23,59).toISOString(),now),/^Yesterday, /);
 assert.doesNotMatch(recentWhen(new Date(2026,2,3).toISOString(),now),/2026/);
 assert.match(recentWhen(new Date(2025,2,3).toISOString(),now),/2025/);
 assert.equal(folderLabel('/Users/someone/Documents/Scripts'),'~/Documents/Scripts');assert.equal(folderLabel('/Volumes/Drive/x'),'/Volumes/Drive/x');
 assert.equal(recentWhen(null,now),'');assert.equal(recentWhen('not a date',now),'');
});

test('toolbar: a toolbar still on the 1.17 default gains the Emoji button; a customised one is kept',()=>{
 const old=DEFAULT_TOOLBAR_ITEMS.filter(id=>id!=='emoji');
 assert.deepEqual(normalizeWorkspace({version:1,toolbar:{items:old}}).toolbar.items,DEFAULT_TOOLBAR_ITEMS);
 const mine=old.filter(id=>id!=='print');assert.deepEqual(normalizeWorkspace({version:1,toolbar:{items:mine}}).toolbar.items,mine);
 assert.equal(DEFAULT_TOOLBAR_ITEMS.indexOf('emoji'),DEFAULT_TOOLBAR_ITEMS.indexOf('elements')+1);
});
