// Return key behaviour in the built renderer: full stops, spelling correction of the committed word, the next element,
// Shift+Return, undo of the whole Return transaction, and editor stability while typing and pressing Return quickly.
// Usage: DRAFTCRAFT_DIST=<stage>/app/dist BROWSER_EXE=<chromium> node --import tsx verification/enter-flow-browser.cjs
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http');
const {DEFAULT_WRITING_SETTINGS}=require('../src/writing/model.ts'),{STANDARD_FORMAT}=require('../src/formats/catalog.ts');
const dist=process.env.DRAFTCRAFT_DIST||process.env.DIST,KEY='draftcraft_screenplay_doc_v1',pause=ms=>new Promise(r=>setTimeout(r,ms));
const P=(id,type,text,extra={})=>({id,type,text,...extra});
let failures=0,passed=0;
function check(ok,label,detail=''){if(ok){passed++;console.log('  ok   '+label);}else{failures++;console.log('  FAIL '+label+(detail?' — '+detail:''));}}
(async()=>{
 const s=http.createServer((req,res)=>{const p=decodeURIComponent(new URL(req.url,'http://l').pathname),f=path.join(dist,p==='/'?'index.html':p);if(!fs.existsSync(f)){res.writeHead(404);return res.end()}res.setHeader('content-type',f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':f.endsWith('.wasm')?'application/wasm':'text/html');fs.createReadStream(f).pipe(res)});await new Promise(r=>s.listen(0,r));
 const b=await chromium.launch({executablePath:process.env.BROWSER_EXE,args:process.env.DRAFTCRAFT_MULTIPROCESS?['--no-sandbox']:['--no-sandbox']});
 const doc=(paragraphs,extra={})=>({id:'enter-flow',titlePage:{title:'ENTER FLOW',author:'',draftDate:'',contact:'',copyright:''},paragraphs,beats:[],flowLines:[],outlineLanes:[],outlineMarkers:[],characterHighlights:{},showStructureLines:false,showBookmarks:false,showScriptNotes:false,showSceneComments:false,writingFormat:structuredClone(STANDARD_FORMAT),...extra});
 async function fresh(paragraphs,extra){const ctx=await b.newContext({viewport:{width:1400,height:1000}});const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({d,key,settings})=>{if(!sessionStorage.getItem('s')){localStorage.clear();localStorage.setItem(key,JSON.stringify(d));localStorage.setItem('draftcraft_writing_assistance_v1',JSON.stringify(settings));sessionStorage.setItem('s','1')}},{d:doc(paragraphs,extra),key:KEY,settings:{...DEFAULT_WRITING_SETTINGS}});
  await page.goto('http://127.0.0.1:'+s.address().port);await page.locator('.script-page').first().waitFor();await pause(1800);return {page,ctx,errors};}
 const read=page=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)).paragraphs.map(p=>p.type+': '+p.text),KEY);
 const active=page=>page.evaluate(()=>({id:document.activeElement?.id,start:document.activeElement?.selectionStart,value:document.activeElement?.value}));
 async function typed(label,start,text,expectFirst,{type='Action',expectNextType}={}){
  const {page,ctx,errors}=await fresh([P('a',type,'')]);await page.locator('#input-a').focus();await page.keyboard.type(text,{delay:20});await pause(700);await page.keyboard.press('Enter');await pause(400);
  const r=await read(page);check(r[0]===expectFirst,label,JSON.stringify(r));if(expectNextType)check((r[1]||'').startsWith(expectNextType+':'),label+': next element is '+expectNextType,JSON.stringify(r));
  check(!errors.length,label+': no page errors',errors.join(' | '));await ctx.close();}
 console.log('Full stops');
 await typed('a complete action sentence gets a full stop','a','He opens the door','Action: He opens the door.',{expectNextType:'Action'});
 await typed('an exclamation is unchanged','a','Wait!','Action: Wait!');
 await typed('an existing full stop is not doubled','a','He opens the door.','Action: He opens the door.');
 await typed('an ellipsis is unchanged','a','He waits...','Action: He waits...');
 await typed('a trailing dash is unchanged','a','He waits --','Action: He waits --');
 await typed('a closing quote keeps the full stop inside','a','She says "go home"','Action: She says "go home."');
 await typed('an unfinished sentence gets no full stop','a','He walks toward the','Action: He walks toward the');
 await typed('dialogue gets a full stop','a','I came back for you','Dialogue: I came back for you.',{type:'Dialogue'});
 await typed('a scene heading gets none','a','INT. HOUSE - DAY','Scene Heading: INT. HOUSE - DAY',{type:'Scene Heading',expectNextType:'Action'});
 await typed('a transition gets none and is followed by a scene heading','a','CUT TO:','Transition: CUT TO:',{type:'Transition',expectNextType:'Scene Heading'});
 await typed('a parenthetical gets none and is followed by dialogue','a','(quietly)','Parenthetical: (quietly)',{type:'Parenthetical',expectNextType:'Dialogue'});
 console.log('Spelling on Return');
 await typed('a typo corrected at a word boundary','a','He reads teh letter slowly','Action: He reads the letter slowly.');
 await typed('a clear typo in the final word is corrected on Return','a','She smiles agian','Action: She smiles again.');
 await typed('a capitalized clear typo keeps its case','a','Teh','Action: The');
 await typed('a word without a confident replacement is unchanged','a','He reads the leter','Action: He reads the leter.');
 await typed('a final word with exactly one close dictionary match is corrected','a','He leaves quietyl','Action: He leaves quietly.');
 await typed('the same in dialogue','a','It happened suddnely','Dialogue: It happened suddenly.',{type:'Dialogue'});
 await typed('two equally close matches leave the word unchanged','a','She moves carefuly','Action: She moves carefuly.');
 await typed('another ambiguous word is unchanged','a','It happens sometimse','Action: It happens sometimse.');
 await typed('an unknown name is unchanged','a','Kjeldsen walks in','Action: Kjeldsen walks in.');
 await typed('informal dialogue is unchanged','a','Yeah I dunno','Dialogue: Yeah I dunno.',{type:'Dialogue'});
 {const {page,ctx}=await fresh([P('h','Scene Heading','INT. ROOM - DAY'),P('a','Action','Grizzwald enters.'),P('b','Action','')]);await page.locator('#input-b').focus();await page.keyboard.type('Everyone stares at grizzwald',{delay:15});await pause(700);await page.keyboard.press('Enter');await pause(300);
  const r=await read(page);check(r[2]==='Action: Everyone stares at grizzwald.','a word used elsewhere in the script is treated as intentional',JSON.stringify(r));await ctx.close();}
 {const {page,ctx}=await fresh([P('a','Action','')]);await page.locator('#input-a').focus();await page.keyboard.type('She smiles agian',{delay:15});await pause(500);await page.keyboard.press('Enter');await pause(300);
  await page.keyboard.press('Control+z');await pause(400);const r=await read(page),a=await active(page);
  check(r.length===1&&r[0]==='Action: She smiles agian','one Undo restores what was typed (word, full stop and new element together)',JSON.stringify(r));
  check(a.id==='input-a'&&a.start===16,'the caret returns to the end of the restored text',JSON.stringify(a));
  await page.keyboard.press('Control+Shift+z');await pause(400);check((await read(page))[0]==='Action: She smiles again.','Redo reapplies it',JSON.stringify(await read(page)));
  await page.keyboard.press('Control+z');await pause(300);await page.keyboard.press('Enter');await pause(300);
  check((await read(page))[0]==='Action: She smiles agian.','an undone correction is remembered and not repeated',JSON.stringify(await read(page)));await ctx.close();}
 console.log('Next element');
 {const {page,ctx}=await fresh([P('h','Scene Heading','INT. ROOM - DAY'),P('a','Action','Maren waits.'),P('c0','Character','MAREN'),P('d0','Dialogue','Hello.'),P('a0','Action','She leaves.'),P('x','Action','')]);
  await page.locator('#input-x').focus();await page.keyboard.type('MAREN',{delay:15});await pause(300);await page.keyboard.press('Enter');await pause(300);await page.keyboard.type('I came back for you',{delay:10});await page.keyboard.press('Enter');await pause(300);
  const r=(await read(page)).slice(5);check(r[0]==='Character: MAREN','an established name on its own line becomes a cue without a full stop',JSON.stringify(r));check(r[1]==='Dialogue: I came back for you.','Return after the cue starts Dialogue',JSON.stringify(r));check(r[2]==='Action: '&&r.length===3,'without a pattern in the scene, Return after a speech follows the template rule (Action)',JSON.stringify(r));await ctx.close();}
 {const {page,ctx}=await fresh([P('h','Scene Heading','INT. ROOM - DAY'),P('c','Character','')]);await page.locator('#input-c').focus();await page.keyboard.press('Enter');await pause(300);
  const r=await read(page);check(r.length===2&&r[1]==='Action: ','Return on an empty cue turns it into Action',JSON.stringify(r));await ctx.close();}
 {const scene=[P('h','Scene Heading','INT. ROOM - DAY'),P('c1','Character','ANNA'),P('d1','Dialogue','Hi.'),P('c2','Character','BEN'),P('d2','Dialogue','Hey.'),P('c3','Character','ANNA'),P('d3','Dialogue','')];
  const {page,ctx}=await fresh(scene,{characterMemory:[]});await page.locator('#input-d3').focus();await page.keyboard.type('I missed you',{delay:10});await page.keyboard.press('Enter');await pause(300);
  const r=await read(page);check(r[6]==='Dialogue: I missed you.'&&r[7]==='Character: ','in a running exchange, Return after a speech starts the next cue',JSON.stringify(r.slice(5)));await ctx.close();}
 {const {page,ctx}=await fresh([P('h','Scene Heading','INT. ROOM - DAY'),P('c1','Character','ANNA'),P('d1','Dialogue','Hi.'),P('c2','Character','BEN'),P('d2','Dialogue','')]);await page.locator('#input-d2').focus();await page.keyboard.type('Hello there',{delay:10});await page.keyboard.press('Enter');await pause(300);
  await page.keyboard.type('he turns away and',{delay:12});await pause(200);check((await read(page))[5]?.startsWith('Action: '),'one earlier exchange is not yet a pattern (the template rule applies)',JSON.stringify(await read(page)));await ctx.close();}
 {const scene=[P('h','Scene Heading','INT. ROOM - DAY'),P('c1','Character','ANNA'),P('d1','Dialogue','Hi.'),P('c2','Character','BEN'),P('d2','Dialogue','Hey.'),P('c3','Character','ANNA'),P('d3','Dialogue','')];
  const {page,ctx}=await fresh(scene,{characterMemory:[]});await page.locator('#input-d3').focus();await page.keyboard.type('Wait',{delay:10});await page.keyboard.press('Enter');await pause(300);
  await page.keyboard.type('she turns away and leaves',{delay:12});await pause(200);check((await read(page))[7]==='Character: SHE TURNS AWAY AND LEAVES','a short line stays a cue',JSON.stringify(await read(page)));
  await page.keyboard.type(' t',{delay:12});await pause(300);const r=await read(page);
  check(r[7]==='Action: She turns away and leaves t','prose typed into an automatic cue becomes Action in the typed case',JSON.stringify(r.slice(6)));
  await page.keyboard.press('Control+z');await pause(300);const u=await read(page);check(u[7]==='Character: SHE TURNS AWAY AND LEAVES ','Undo keeps it a cue',JSON.stringify(u.slice(6)));
  await page.keyboard.type('the room',{delay:12});await pause(300);check((await read(page))[7]==='Character: SHE TURNS AWAY AND LEAVES THE ROOM','after Undo it is not switched again',JSON.stringify((await read(page)).slice(6)));await ctx.close();}
 {const {page,ctx}=await fresh([P('h','Scene Heading','INT. ROOM - DAY'),P('c1','Character','ANNA'),P('d1','Dialogue','')]);await page.locator('#input-d1').focus();await page.keyboard.type('Hello there',{delay:10});await page.keyboard.press('Enter');await pause(300);
  await page.keyboard.press('Control+3');await pause(200);await page.keyboard.type('the old man from the bar downstairs',{delay:10});await pause(300);
  check((await read(page))[3]==='Character: THE OLD MAN FROM THE BAR DOWNSTAIRS','a cue chosen with the element shortcut is respected',JSON.stringify(await read(page)));await ctx.close();}
 {const {page,ctx}=await fresh([P('a','Action','')]);await page.locator('#input-a').focus();await page.keyboard.type('Line one',{delay:10});await page.keyboard.press('Shift+Enter');await page.keyboard.type('line two',{delay:10});await pause(300);
  const r=await read(page);check(r.length===1&&r[0].startsWith('Action: Line one\n'),'Shift+Return inserts a line break inside the element without a full stop',JSON.stringify(r));await ctx.close();}
 {const {page,ctx}=await fresh([P('a','Action','')]);await page.locator('#input-a').focus();await page.keyboard.type('He opens the door slowly',{delay:10});for(let i=0;i<7;i++)await page.keyboard.press('ArrowLeft');await page.keyboard.press('Enter');await pause(300);
  const r=await read(page);check(r[0]==='Action: He opens the door'&&r[1]==='Action:  slowly','splitting a sentence in the middle adds no full stop and keeps the text exactly',JSON.stringify(r));await ctx.close();}
 console.log('Stability');
 {const paras=[];for(let i=0;i<300;i++)paras.push(P('p'+i,i%4===0?'Scene Heading':i%4===1?'Action':i%4===2?'Character':'Dialogue',i%4===0?'INT. ROOM '+i+' - DAY':i%4===2?'MAREN':'Text of paragraph '+i+' that is long enough to wrap onto a second line on the page.'));paras.push(P('end','Action',''));
  const {page,ctx,errors}=await fresh(paras);await page.locator('#input-end').scrollIntoViewIfNeeded();await page.locator('#input-end').focus();await pause(600);
  await page.evaluate(()=>{window.__shifts=[];new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__shifts.push(e.value)}).observe({type:'layout-shift',buffered:false});window.__remounts=0;new MutationObserver(m=>{for(const r of m)for(const n of r.removedNodes)if(n.nodeType===1&&(n.matches?.('textarea')||n.querySelector?.('textarea')))window.__remounts++;}).observe(document.body,{childList:true,subtree:true});});
  const lines=[];for(let k=0;k<12;k++){lines.push(k%3===2?'MAREN':'Quick line number '+k+' typed fast');}
  const tops=[];for(const line of lines){await page.keyboard.type(line,{delay:0});await page.keyboard.press('Enter');tops.push(Math.round(await page.evaluate(()=>document.activeElement.getBoundingClientRect().top)));}
  await pause(900);const r=await page.evaluate(()=>({shifts:window.__shifts.length,shiftSum:+window.__shifts.reduce((a,b)=>a+b,0).toFixed(4),remounts:window.__remounts}));
  const tail=(await read(page)).slice(-13);
  check(r.remounts===0,'no editor element is remounted while typing and pressing Return',JSON.stringify(r));
  check(r.shiftSum<0.02,'no unexpected layout shift',JSON.stringify(r));
  check(tops.every(t=>t>0&&t<1000),'the caret stays inside the viewport after every Return',tops.join(','));
  const expected=lines.map(l=>l==='MAREN'?'Character: MAREN':l+'.');
  const typedTexts=tail.slice(0,12).map(x=>x.replace(/^[^:]+: /,'')),want=lines.map(l=>l==='MAREN'?'MAREN':l+'.');
  check(JSON.stringify(typedTexts)===JSON.stringify(want),'no characters are lost and no punctuation is duplicated when typing fast',JSON.stringify(tail));
  check(!errors.length,'no page errors',errors.join(' | '));await ctx.close();}
 await b.close();s.close();
 console.log(`\n${passed} passed, ${failures} failed`);process.exit(failures?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
