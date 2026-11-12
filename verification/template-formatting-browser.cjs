// DraftCraft Pro 1.15.4 — screenplay formatting, template rules and Final Draft interchange, exercised in the built
// renderer with real keyboard input. Usage:
//   DRAFTCRAFT_DIST=<staged app>/dist BROWSER_EXE=<chrome> node --import tsx verification/template-formatting-browser.cjs
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {FORMAT_TEMPLATES,STANDARD_FORMAT}=require('../src/formats/catalog.ts'),{DEFAULT_WRITING_SETTINGS}=require('../src/writing/model.ts');
const dist=process.env.DRAFTCRAFT_DIST||path.resolve(__dirname,'../../desktop-build/app/dist'),KEY='draftcraft_screenplay_doc_v1',pause=ms=>new Promise(r=>setTimeout(r,ms)),results=[],failures=[],errors=[];
const out=path.join(__dirname,'template-formatting-results');fs.mkdirSync(out,{recursive:true});
let browser,server,context,page,origin;
const MOD=process.platform==='darwin'?'Meta':'Control';
const template=name=>{const t=FORMAT_TEMPLATES.find(t=>t.name===name);assert.ok(t,'template '+name);return structuredClone(t.format);};
const P=(id,type,text,extra={})=>({id,type,text,...extra});
const base=(format=STANDARD_FORMAT,paragraphs=[P('empty','Action','')])=>({id:'template-qa',titlePage:{title:'TEMPLATE QA',author:'QA',draftDate:'',contact:'',copyright:''},paragraphs,beats:[],flowLines:[],outlineLanes:[],outlineMarkers:[],characterHighlights:{},showStructureLines:false,showBookmarks:false,showScriptNotes:false,showSceneComments:false,writingFormat:structuredClone(format)});
async function seed(doc=base(),extra={}){if(!context)context=await browser.newContext({viewport:{width:1500,height:1100},acceptDownloads:true});const old=page;page=await context.newPage();if(old)await old.close();page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.addInitScript(({doc,key,settings,extra})=>{try{if(!window.sessionStorage)return;}catch{return;}if(!sessionStorage.getItem('template-seed')){localStorage.clear();localStorage.setItem(key,JSON.stringify(doc));localStorage.setItem('draftcraft_writing_assistance_v1',JSON.stringify(settings));for(const [k,v] of Object.entries(extra))localStorage.setItem(k,JSON.stringify(v));sessionStorage.setItem('template-seed','1')}window.draftcraftDesktop={windowAction:()=>{},onCommand:cb=>{window.__nativeCommand=cb;return()=>{}},nativeHistory:async()=>true,readClipboard:async()=>({text:'',html:''}),writeClipboard:async()=>true,saveProject:async()=>({saved:true}),autosaveProject:async()=>({saved:true}),finishClose:async()=>({closed:false})};},{doc,key:KEY,settings:{...DEFAULT_WRITING_SETTINGS,autocorrect:false,leftClickSuggestions:false},extra});
 await page.goto(origin);await page.locator('.script-page').first().waitFor();await page.evaluate(()=>document.fonts.ready);await pause(150);}
async function doc(){await pause(250);return page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);}
async function focus(id,at){const input=page.locator('#input-'+id);await input.scrollIntoViewIfNeeded();await input.evaluate((e,at)=>{e.focus();const p=at===undefined?e.value.length:at;e.setSelectionRange(p,p)},at);}
async function command(value){await page.evaluate(v=>window.__nativeCommand(v),value);await pause(90);}
async function last(){const d=await doc();return d.paragraphs.at(-1);}
async function typeLine(text){await page.keyboard.insertText(text);await pause(60);await page.keyboard.press('Escape');await pause(40);}
async function suggestion(){const s=page.locator('.dc-element-suggestion');return await s.count()?(await s.innerText()):'';}
async function check(name,fn){if(process.env.TPL_ONLY&&!name.includes(process.env.TPL_ONLY))return;try{await fn();results.push({name,passed:true});console.log('PASS '+name);}catch(e){results.push({name,passed:false,error:String(e.message||e).slice(0,600)});failures.push(name);console.log('FAIL '+name+' — '+String(e.message||e).split('\n')[0]);try{await page.screenshot({path:path.join(out,'failure-'+failures.length+'.png')});}catch{}}}
function geometry(ids){return page.evaluate(ids=>Object.fromEntries(ids.map(id=>{const t=document.getElementById('input-'+id),pg=t.closest('.script-page'),pr=pg.getBoundingClientRect(),r=t.getBoundingClientRect(),cs=getComputedStyle(t);return [id,{left:(r.left-pr.left)/96,right:(pr.right-r.right)/96,width:r.width/96,top:(r.top-pr.top)/96,bottom:(r.bottom-pr.top)/96,align:cs.textAlign,caps:cs.textTransform,font:cs.fontFamily,line:parseFloat(cs.lineHeight)*0.75,pageTop:pr.top}];})),ids);}
const near=(a,b,tol=0.011)=>Math.abs(a-b)<=tol;

(async()=>{
 server=http.createServer((req,res)=>{const pathname=decodeURIComponent(new URL(req.url,'http://local').pathname),file=path.join(dist,pathname==='/'?'index.html':pathname);if(!file.startsWith(path.resolve(dist)+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end()}res.setHeader('content-type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');fs.createReadStream(file).pipe(res)});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({executablePath:process.env.BROWSER_EXE||process.env.DRAFTCRAFT_CHROMIUM,headless:true,args:['--no-sandbox','--no-zygote',...(process.env.DRAFTCRAFT_MULTIPROCESS==='1'?[]:['--single-process'])]});

 await check('standard US template: margins 1.5/1/1/1, Character 3.7", Dialogue 2.5"–6.0", Parenthetical 3.1"–5.6", Transition flush right',async()=>{
  // The format the application itself gives a new screenplay (File > New), not the test's copy of the catalog.
  await seed();await command('new');await pause(400);const created=(await doc()).writingFormat;
  assert.equal(created.templateId,'standard-feature-screenplay');assert.deepEqual(created.page,{width:8.5,height:11,top:1,bottom:1,left:1.5,right:1});
  assert.equal(created.transitionPunctuation,'traditional','FADE OUT. keeps its period by default');
  await seed(base(created,[P('h','Scene Heading','INT. STATION - NIGHT'),P('a','Action','A traveler waits.'),P('c','Character','ALEX'),P('p','Parenthetical','(quietly)'),P('d','Dialogue','There is still time to change our plans.'),P('t','Transition','CUT TO:')]));
  const g=await geometry(['h','a','c','p','d','t']);
  assert.ok(near(g.h.left,1.5)&&near(g.h.right,1),'scene heading spans the 1.5" / 1" margins');assert.equal(g.h.caps,'uppercase');
  assert.ok(near(g.a.left,1.5)&&near(g.a.right,1),'action spans the margins');
  assert.ok(near(g.c.left,3.7),`character at 3.7" (got ${g.c.left.toFixed(3)})`);assert.equal(g.c.caps,'uppercase');
  assert.ok(near(g.d.left,2.5)&&near(8.5-g.d.right,6.0),`dialogue 2.5"–6.0" (got ${g.d.left.toFixed(3)}–${(8.5-g.d.right).toFixed(3)})`);
  assert.ok(near(g.p.left,3.1)&&near(g.p.right,2.9),`parenthetical 3.1" with a 2.9" right margin (got ${g.p.left.toFixed(3)}, ${g.p.right.toFixed(3)})`);
  assert.equal(g.t.align,'right');assert.ok(near(g.t.right,1),'transition ends at the right margin');
  assert.ok(near(g.h.top,1,0.02),'text starts at the 1" top margin');
  for(const k of Object.keys(g))assert.ok(near(g[k].line,12,0.05),'12 pt line pitch for '+k);
  const pageNumberOnFirst=await page.locator('.script-page').first().evaluate(el=>[...el.querySelectorAll('div,span')].some(n=>/^\s*1\.\s*$/.test(n.textContent)&&!n.querySelector('*')));
  assert.equal(pageNumberOnFirst,false,'no printed number on the first page');
 });

 await check('keyboard-only scene: heading, action, character, parenthetical, dialogue and transition',async()=>{
  await seed();await focus('empty');
  await typeLine('int. bedroom - night');await page.keyboard.press('Enter');
  let d=await doc();assert.equal(d.paragraphs.at(-2).type,'Scene Heading');assert.equal(d.paragraphs.at(-2).text,'INT. BEDROOM - NIGHT');assert.equal(d.paragraphs.at(-1).type,'Action','Scene Heading + Return → Action');
  await typeLine('John sits on the bed.');await page.keyboard.press('Enter');d=await doc();assert.equal(d.paragraphs.at(-2).type,'Action');assert.equal(d.paragraphs.at(-1).type,'Action');
  await page.keyboard.press('Tab');await typeLine('john');d=await doc();assert.equal(d.paragraphs.at(-1).type,'Character','Tab on an empty Action line → Character');assert.equal(d.paragraphs.at(-1).text,'JOHN','character cues are capitalized');
  await page.keyboard.press('Enter');d=await doc();assert.equal(d.paragraphs.at(-1).type,'Dialogue','Character + Return → Dialogue');
  await typeLine('Where is everyone?');await page.keyboard.press('Tab');d=await doc();
  const paren=d.paragraphs.at(-1);assert.equal(paren.type,'Parenthetical','Dialogue + Tab → Parenthetical');assert.equal(paren.text,'()');
  assert.deepEqual(await page.locator('#input-'+paren.id).evaluate(e=>[e.selectionStart,e.selectionEnd]),[1,1],'caret inside the parentheses');
  await page.keyboard.insertText('whispering');await page.keyboard.press('Enter');d=await doc();
  assert.equal(d.paragraphs.at(-2).text,'(whispering)','no duplicate parentheses');assert.equal(d.paragraphs.at(-1).type,'Dialogue','Parenthetical + Return → Dialogue');
  await typeLine('Hello?');await page.keyboard.press('Enter');d=await doc();assert.equal(d.paragraphs.at(-1).type,'Action','Dialogue + Return → Action');
  await typeLine('cut to');await page.keyboard.press('Enter');d=await doc();assert.equal(d.paragraphs.at(-2).type,'Transition');assert.equal(d.paragraphs.at(-2).text,'CUT TO:');assert.equal(d.paragraphs.at(-1).type,'Scene Heading','Transition + Return → Scene Heading');
 });

 await check('scene-heading prefixes INT., EXT., INT./EXT., INT/EXT., EXT./INT., EXT/INT. and I/E. are recognized; prose is not',async()=>{
  for(const [typed,want] of [['int. kitchen - day','INT. KITCHEN - DAY'],['ext. street - night','EXT. STREET - NIGHT'],['int./ext. car - day','INT./EXT. CAR - DAY'],['int/ext. car - day','INT./EXT. CAR - DAY'],['ext./int. car - day','EXT./INT. CAR - DAY'],['ext/int. car - day','EXT./INT. CAR - DAY'],['i/e. car - day','I/E. CAR - DAY'],['i/e car - day','I/E. CAR - DAY']]){
   await seed();await focus('empty');await typeLine(typed);await page.keyboard.press('Enter');const d=await doc();
   assert.equal(d.paragraphs.at(-2).type,'Scene Heading',typed);assert.equal(d.paragraphs.at(-2).text,want,typed);}
  for(const prose of ['Interior lights flicker on.','Extra chairs line the wall.','Inter-office mail arrives.']){await seed();await focus('empty');await typeLine(prose);await page.keyboard.press('Enter');const d=await doc();assert.equal(d.paragraphs.at(-2).type,'Action',prose);assert.equal(d.paragraphs.at(-2).text,prose,prose);}
 });

 await check('transitions get the template ending; FADE OUT./FADE TO BLACK. keep their period; no duplicate punctuation',async()=>{
  for(const [typed,want] of [['cut to','CUT TO:'],['cut to:','CUT TO:'],['dissolve to','DISSOLVE TO:'],['smash cut to:','SMASH CUT TO:'],['match cut to','MATCH CUT TO:'],['jump cut to:','JUMP CUT TO:'],['fade in:','FADE IN:'],['fade out.','FADE OUT.'],['fade out','FADE OUT.'],['fade to black.','FADE TO BLACK.'],['fade to black','FADE TO BLACK.']]){
   await seed();await focus('empty');await typeLine(typed);
   const offered=await suggestion();assert.ok(!/Character/.test(offered),`"${typed}" is not offered as a character cue (${offered})`);
   await page.keyboard.press('Enter');const d=await doc();assert.equal(d.paragraphs.at(-2).type,'Transition',typed);assert.equal(d.paragraphs.at(-2).text,want,typed);}
  const colon={...STANDARD_FORMAT,transitionPunctuation:'colon'};await seed(base(colon));await focus('empty');await typeLine('fade out');await page.keyboard.press('Enter');assert.equal((await doc()).paragraphs.at(-2).text,'FADE OUT:','an explicit colon rule is still honored');
 });

 await check('shot directions are offered as Shot, never as a character cue; ordinary action is not',async()=>{
  for(const typed of ['CLOSE ON THE CLOCK','close on: the clock','INSERT: THE LETTER','POV: SARAH','ANGLE ON SARAH','WIDE SHOT','TRACKING SHOT','EXTREME CLOSE UP']){
   await seed();await focus('empty');await page.keyboard.insertText(typed);await pause(80);const offered=await suggestion();
   assert.match(offered,/Use Shot$/,`"${typed}" offers Shot (got "${offered}")`);
   await page.locator('.dc-element-suggestion').click();const d=await doc();assert.equal(d.paragraphs.at(-1).type,'Shot');assert.equal(d.paragraphs.at(-1).text.toUpperCase(),typed.toUpperCase(),'text kept');}
  for(const prose of ['Close on the edge of panic, she runs.','Insert the key and turn it.']){await seed();await focus('empty');await page.keyboard.insertText(prose);await pause(80);assert.equal(await suggestion(),'',prose);}
  await seed(base(template('Standard Stageplay')));await focus('empty');await page.keyboard.insertText('CLOSE ON THE CLOCK');await pause(80);assert.ok(!/Use Shot/.test(await suggestion()),'templates without Shot do not offer it');
 });

 await check('a Final Draft-style FDX opens with its page layout, element positions and spacing',async()=>{
  await seed();const picker=page.locator('input[type=file][accept*=".fdx"]');const previous=(await doc()).id;
  await picker.setInputFiles(path.join(__dirname,'fixtures/final-draft-style/standard-layout.fdx'));
  await page.waitForFunction(({k,previous})=>{try{return JSON.parse(localStorage.getItem(k)).id!==previous}catch{return false}},{k:KEY,previous});await pause(400);
  const d=await doc(),f=d.writingFormat;
  assert.equal(d.paragraphs.length,10);assert.deepEqual(d.paragraphs.map(p=>p.type).slice(0,5),['Scene Heading','Action','Character','Parenthetical','Dialogue']);
  assert.deepEqual([f.page.top,f.page.bottom,f.page.left,f.page.right],[1,1,1.5,1],'points converted to inches; side margins from the body indents');
  assert.ok(near(f.elements.Character.left,2.2,1e-6)&&near(f.elements.Dialogue.left,1,1e-6)&&near(f.elements.Dialogue.right,1.5,1e-6)&&near(f.elements.Parenthetical.left,1.6,1e-6)&&near(f.elements.Parenthetical.right,1.9,1e-6),'element indents from the paper edge');
  assert.equal(f.elements.Parenthetical.first,-0.1);assert.equal(f.elements.Transition.align,'right');assert.equal(f.elements['Scene Heading'].caps,true);assert.equal(f.elements['New Act'].breakBefore,true);assert.equal(f.elements['New Act'].underline,true);
  assert.equal(f.elements['Scene Heading'].before,24);assert.equal(f.elements.Character.before,12);assert.equal(f.elements.Dialogue.line,12);assert.equal(f.elements['Scene Heading'].next,'Action');
  const g=await geometry(d.paragraphs.slice(0,5).map(p=>p.id));const [h,a,c,p,dl]=d.paragraphs.slice(0,5).map(p=>g[p.id]);
  assert.ok(near(c.left,3.7)&&near(dl.left,2.5)&&near(p.left,3.1),'cue, dialogue and parenthetical where Final Draft puts them');
  assert.ok(near((a.top-h.bottom)*72,12,1),'one blank line after the heading');assert.ok(near((c.top-a.bottom)*72,12,1),'one blank line before the cue');assert.ok(near((p.top-c.bottom)*72,0,1)&&near((dl.top-p.bottom)*72,0,1),'no gap inside the speech');
  assert.match(c.font,/Courier Final Draft.*Courier Prime/,'unavailable Courier faces fall back to the bundled Courier Prime');
 });

 await check('FDX export uses Final Draft units and conventions and reopens with the same layout',async()=>{
  await seed(base(STANDARD_FORMAT,[P('h','Scene Heading','INT. STATION - NIGHT'),P('a','Action','A traveler waits.'),P('c','Character','ALEX'),P('p','Parenthetical','(quietly)'),P('d','Dialogue','Go.'),P('t','Transition','CUT TO:')]));
  const download=page.waitForEvent('download');await command('export-fdx');const button=page.getByRole('button',{name:'Export With These Limits',exact:true});await pause(150);if(await button.count())await button.click();
  const file=await (await download).path();const xml=fs.readFileSync(file,'utf8');fs.writeFileSync(path.join(out,'exported-standard.fdx'),xml);
  const layout=xml.match(/<PageLayout[^>]*>/)[0];assert.match(layout,/TopMargin="72"/);assert.match(layout,/BottomMargin="72"/);assert.doesNotMatch(layout,/LeftMargin|Width=/);
  const spec=t=>xml.match(new RegExp('<ElementSettings Type="'+t+'">[\\s\\S]*?</ElementSettings>'))[0];
  assert.match(spec('Character'),/LeftIndent="3.70" RightIndent="7.10"/);assert.match(spec('Dialogue'),/LeftIndent="2.50" RightIndent="6.00"/);assert.match(spec('Parenthetical'),/LeftIndent="3.10" RightIndent="5.60"/);
  assert.match(spec('Transition'),/Alignment="Right"/);assert.match(spec('Scene Heading'),/Style="AllCaps"/);assert.match(spec('Scene Heading'),/SpaceBefore="24"/);assert.match(spec('Character'),/SpaceBefore="12"/);assert.match(spec('Dialogue'),/SpaceBefore="0"/);
  assert.match(spec('Action'),/Leading="Regular"[^>]*Spacing="1"/);assert.match(spec('Character'),/ReturnKey="Dialogue"/);assert.doesNotMatch(xml,/SpaceAfter=/);
  // Reopen without DraftCraft's private metadata, as another application would read it.
  const plain=xml.replace(/<DraftCraftMetadata[\s\S]*?<\/DraftCraftMetadata>\n?/,'');const previous=(await doc()).id;
  await page.locator('input[type=file][accept*=".fdx"]').setInputFiles({name:'plain.fdx',mimeType:'application/xml',buffer:Buffer.from(plain)});
  await page.waitForFunction(({k,previous})=>{try{return JSON.parse(localStorage.getItem(k)).id!==previous}catch{return false}},{k:KEY,previous});await pause(400);
  const d=await doc();const ids=d.paragraphs.map(p=>p.id);const g=await geometry(ids);const [h,a,c,p,dl,t]=ids.map(i=>g[i]);
  assert.ok(near(c.left,3.7)&&near(dl.left,2.5)&&near(8.5-dl.right,6)&&near(p.left,3.1)&&near(p.right,2.9)&&near(t.right,1),'same positions after the round trip');
  assert.ok(near((a.top-h.bottom)*72,12,1)&&near((c.top-a.bottom)*72,12,1)&&near((dl.top-p.bottom)*72,0,1)&&near((t.top-dl.bottom)*72,12,1),'same spacing after the round trip');
 });

 await check('switching the template changes the auto-formatting rules immediately and Undo restores the format',async()=>{
  await seed(base(STANDARD_FORMAT,[P('h','Scene Heading','INT. STATION - NIGHT'),P('c','Character','ALEX'),P('d','Dialogue','Hello.'),P('empty','Action','')]));
  await command('apply-template');await page.getByRole('dialog',{name:'Writing Formats',exact:true}).waitFor();
  await page.getByLabel('Search Templates',{exact:true}).fill('Standard Stageplay');await page.locator('.dc-template-list').getByRole('button',{name:/^Standard Stageplay /}).first().click();
  await page.getByRole('button',{name:'Apply to Current Document…',exact:true}).click();await page.getByRole('button',{name:'Confirm Apply Format',exact:true}).click();await page.getByRole('dialog',{name:'Writing Formats'}).waitFor({state:'hidden'});await pause(300);
  let d=await doc();assert.equal(d.writingFormat.kind,'stageplay');assert.deepEqual(d.paragraphs.filter(p=>p.type!=='Action'&&p.type!=='Stage Direction').map(p=>p.text),['INT. STATION - NIGHT','ALEX','Hello.'],'no content lost');
  const last=d.paragraphs.at(-1);await focus(last.id);await typeLine('scene two');await page.keyboard.press('Enter');d=await doc();
  assert.equal(d.paragraphs.at(-2).type,'Scene Heading','stage rules recognize SCENE headings');assert.equal(d.paragraphs.at(-1).type,'Stage Direction','stageplay: Scene Heading + Return → Stage Direction');
  const g=await geometry([d.paragraphs.find(p=>p.type==='Character').id]);assert.equal(Object.values(g)[0].align,'center','stageplay cues are centered');
  // Undo of the conversion itself (one transaction).
  await seed(base(STANDARD_FORMAT,[P('h','Scene Heading','INT. STATION - NIGHT'),P('c','Character','ALEX'),P('d','Dialogue','Hello.'),P('empty','Action','')]));
  await command('apply-template');await page.getByRole('dialog',{name:'Writing Formats',exact:true}).waitFor();
  await page.getByLabel('Search Templates',{exact:true}).fill('Standard Stageplay');await page.locator('.dc-template-list').getByRole('button',{name:/^Standard Stageplay /}).first().click();
  await page.getByRole('button',{name:'Apply to Current Document…',exact:true}).click();await page.getByRole('button',{name:'Confirm Apply Format',exact:true}).click();await page.getByRole('dialog',{name:'Writing Formats'}).waitFor({state:'hidden'});await pause(300);
  assert.equal((await doc()).writingFormat.kind,'stageplay');await focus('h');await page.keyboard.press(MOD+'+z');await pause(400);
  d=await doc();assert.equal(d.writingFormat.kind,'screenplay','Undo restores the previous template');assert.deepEqual(d.paragraphs.slice(0,3).map(p=>[p.type,p.text]),[['Scene Heading','INT. STATION - NIGHT'],['Character','ALEX'],['Dialogue','Hello.']]);
 });

 await check('multilingual text: Hindi and other Unicode script is not capitalized or reclassified',async()=>{
  await seed();await focus('empty');await typeLine('राम खिड़की की ओर देखता है।');await page.keyboard.press('Enter');let d=await doc();assert.equal(d.paragraphs.at(-2).type,'Action');assert.equal(d.paragraphs.at(-2).text,'राम खिड़की की ओर देखता है।');
  await page.keyboard.press('Tab');await typeLine('राम');await page.keyboard.press('Enter');d=await doc();assert.equal(d.paragraphs.at(-2).type,'Character');assert.equal(d.paragraphs.at(-2).text,'राम');assert.equal(d.paragraphs.at(-1).type,'Dialogue');
  await typeLine('तुम कहाँ थे?');await page.keyboard.press('Enter');d=await doc();assert.equal(d.paragraphs.at(-2).text,'तुम कहाँ थे?');
  await typeLine('int. मुंबई स्टेशन - night');await page.keyboard.press('Enter');d=await doc();assert.equal(d.paragraphs.at(-2).type,'Scene Heading');assert.equal(d.paragraphs.at(-2).text,'INT. मुंबई स्टेशन - NIGHT');
 });

 await check('Auto Formatting settings: every control exists, defaults on, persists, and changes behaviour',async()=>{
  await seed();await command('automatic-formatting');const panel=page.getByRole('region',{name:'Automatic Formatting Settings'}).or(page.locator('[aria-label="Automatic Formatting Settings"]'));await panel.first().waitFor();
  const labels=['Enable Intelligent Auto Formatting','Automatically Format Scene Headings','Detect Character Names','Automatic Dialogue Formatting','Automatically Insert Parenthetical Brackets','Automatically Format Transitions','SmartType Suggestions','Automatically Capitalize Sentences','Template-Specific Formatting','Show Suggestions for Ambiguous Elements'];
  for(const l of labels)assert.equal(await page.getByLabel(l,{exact:true}).isChecked(),true,l+' defaults on');
  await page.getByLabel('Detect Character Names',{exact:true}).uncheck();await page.getByLabel('Automatic Dialogue Formatting',{exact:true}).uncheck();await page.getByRole('button',{name:'Close Editor Settings'}).click();
  await focus('empty');await page.keyboard.insertText('MARCUS');await pause(100);assert.equal(await suggestion(),'','no character suggestion with detection off');
  await page.locator('#input-empty').fill('');await page.keyboard.press(MOD+'+3');await typeLine('MARCUS');await page.keyboard.press('Enter');let d=await doc();
  assert.equal(d.paragraphs.at(-2).type,'Character','manual element choice still works');assert.equal(d.paragraphs.at(-1).type,'Action','Automatic Dialogue Formatting off: Return after a cue starts Action');
  await page.reload();await page.locator('.script-page').first().waitFor();await command('automatic-formatting');
  assert.equal(await page.getByLabel('Detect Character Names',{exact:true}).isChecked(),false,'persists after restart');assert.equal(await page.getByLabel('Automatic Dialogue Formatting',{exact:true}).isChecked(),false);
  await page.getByLabel('Detect Character Names',{exact:true}).check();await page.getByLabel('Automatic Dialogue Formatting',{exact:true}).check();
  await page.getByLabel('Enable Intelligent Auto Formatting',{exact:true}).uncheck();assert.equal(await page.getByLabel('Detect Character Names',{exact:true}).isDisabled(),true,'dependent controls are disabled with the master switch off');
  await page.getByRole('button',{name:'Close Editor Settings'}).click();
  d=await doc();await focus(d.paragraphs.at(-1).id);await typeLine('int. kitchen - day');await page.keyboard.press('Enter');d=await doc();
  assert.equal(d.paragraphs.at(-2).type,'Action','master off: no scene-heading recognition');assert.equal(d.paragraphs.at(-2).text,'int. kitchen - day','master off: text is not changed');
  await page.keyboard.press(MOD+'+3');await typeLine('NORA');await page.keyboard.press('Enter');d=await doc();assert.equal(d.paragraphs.at(-2).type,'Character','shortcuts still set elements with the master switch off');
  await command('automatic-formatting');await page.getByLabel('Enable Intelligent Auto Formatting',{exact:true}).check();await page.getByRole('button',{name:'Close Editor Settings'}).click();
  d=await doc();await focus(d.paragraphs.at(-1).id);await page.keyboard.press('Enter');d=await doc();await focus(d.paragraphs.at(-1).id);await typeLine('ext. yard - night');await page.keyboard.press('Enter');d=await doc();assert.equal(d.paragraphs.at(-2).text,'EXT. YARD - NIGHT','recognition returns with the master switch on');
 });

 await check('radio drama: SFX and MUSIC cues, speakers at the margin, speeches indented, numbered scenes',async()=>{
  const f=template('Radio Drama');await seed(base(f,[P('empty','Scene Heading','')]));await focus('empty');
  await typeLine('int. kitchen. night.');await page.keyboard.press('Enter');let d=await doc();assert.equal(d.paragraphs.at(-1).type,'Sound Effect','Scene Heading + Return → Sound Effect');
  await page.keyboard.insertText('sfx: rain on the window.');await pause(60);await page.keyboard.press('Escape');await page.keyboard.press('Enter');d=await doc();
  assert.equal(d.paragraphs.at(-2).type,'Sound Effect');assert.equal(d.paragraphs.at(-1).type,'Character','Sound Effect + Return → speaker');
  await typeLine('maren');await page.keyboard.press('Enter');await typeLine('Did you hear that?');await page.keyboard.press('Enter');d=await doc();
  assert.deepEqual(d.paragraphs.slice(-3).map(p=>p.type),['Character','Dialogue','Character'],'Dialogue + Return → next speaker');
  await page.keyboard.insertText('MUSIC: A LOW DRONE');await pause(120);d=await doc();assert.equal(d.paragraphs.at(-1).type,'Sound Effect','MUSIC: typed on the new speaker line becomes an audio cue');
  await page.keyboard.press('Enter');await page.keyboard.press(MOD+'+2');await pause(120);d=await doc();await focus(d.paragraphs.at(-1).id);await page.keyboard.insertText('SFX: A DOOR');await pause(120);d=await doc();assert.equal(d.paragraphs.at(-1).type,'Action','an explicitly chosen Action element is not reclassified');
  const ids=d.paragraphs.map(p=>p.id),g=await geometry(ids);const by=type=>g[d.paragraphs.find(p=>p.type===type).id];
  assert.ok(near(by('Character').left,1.5),'speaker at the margin');assert.ok(near(by('Dialogue').left,3),'speech indented 1.5"');assert.ok(near(by('Sound Effect').left,3),'cue at the speech indent');
  assert.equal(await page.locator('#input-'+d.paragraphs.find(p=>p.type==='Sound Effect').id).evaluate(e=>getComputedStyle(e).textDecorationLine),'underline');
  assert.equal(d.writingFormat.numbering.scenes,true);
 });

 await check('documentary and commercial templates recognize captions; feature screenplays do not',async()=>{
  await seed(base(template('Documentary Script')));await focus('empty');await page.keyboard.insertText('LOWER THIRD: ANNA BERG, HARBORMASTER');await pause(80);let d=await doc();assert.equal(d.paragraphs.at(-1).type,'Caption');
  await seed(base(template('Commercial Script')));await focus('empty');await page.keyboard.insertText('SUPER: BREWED FRESH SINCE 1952');await pause(80);d=await doc();assert.equal(d.paragraphs.at(-1).type,'Caption');
  await seed();await focus('empty');await page.keyboard.insertText('SUPER: BREWED FRESH SINCE 1952');await pause(80);d=await doc();assert.equal(d.paragraphs.at(-1).type,'Action');
 });

 await check('an element whose type changes while writing keeps the template indents: text at 3.7" / 3.1" / 2.5", full width, no hidden lines',async()=>{
  // Measures where the TEXT starts (content box), not the textarea box: in 1.15.3 a paragraph converted in place
  // (Tab on an empty Action, Tab on an empty Dialogue, ⌘3 on an Action line) kept the old element's indents as
  // padding inside the new element's column, so a cue moved 2.2" right and a parenthetical wrapped one letter per line.
  await seed();await focus('empty');
  await page.keyboard.press('Tab');await typeLine('sarah');await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');await page.keyboard.insertText('barely audible, turning away from the window toward the door');await pause(80);await page.keyboard.press('Enter');
  await typeLine('We should go before the tide turns, before the harbor lights go out and the boats stop running for the night.');await page.keyboard.press('Enter');
  await typeLine('MAREN');await page.keyboard.press(MOD+'+3');await pause(150);
  const d=await doc(),ids=d.paragraphs.map(p=>p.id);
  const m=await page.evaluate(ids=>ids.map(id=>{const t=document.getElementById('input-'+id),pg=t.closest('.script-page'),pr=pg.getBoundingClientRect(),r=t.getBoundingClientRect(),cs=getComputedStyle(t),wrap=t.parentElement.getBoundingClientRect();
   return {id,padL:parseFloat(cs.paddingLeft),padR:parseFloat(cs.paddingRight),textLeft:(r.left+parseFloat(cs.paddingLeft)-pr.left)/96,textWidth:(r.width-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight))/96,overflow:Math.round(r.width-wrap.width),hidden:t.scrollHeight-t.clientHeight};}),ids);
  const by=(type,n=0)=>{const p=d.paragraphs.filter(p=>p.type===type)[n];assert.ok(p,type);return m.find(x=>x.id===p.id);};
  const expect=[[by('Character'),3.7,3.4],[by('Parenthetical'),3.1,2.5],[by('Dialogue'),2.5,3.5],[by('Character',1),3.7,3.4]];
  for(const [x,left,width] of expect){assert.equal(x.padL+x.padR,0,'no inherited indent padding');assert.ok(near(x.textLeft,left,0.02),`text starts at ${left}" (got ${x.textLeft.toFixed(3)}")`);assert.ok(near(x.textWidth,width,0.02),`text column ${width}" wide (got ${x.textWidth.toFixed(3)}")`);assert.equal(x.overflow,0,'textarea fits its column');assert.ok(x.hidden<=1,`no hidden lines (${x.hidden}px)`);}
  assert.deepEqual(d.paragraphs.map(p=>p.type),['Character','Parenthetical','Dialogue','Character']);
 });
 await check('Streaming Feature (Netflix-style) template (1.17 item 8): in the gallery with its rules and source; applying it numbers scenes left and right and keeps the US positions',async()=>{
  await seed(base(STANDARD_FORMAT,[P('h','Scene Heading','INT. STATION - NIGHT'),P('a','Action','Rain taps the window.'),P('c','Character','ALEX'),P('d','Dialogue','Hello.'),P('h2','Scene Heading','EXT. PLATFORM - NIGHT'),P('empty','Action','')]));
  await command('apply-template');const dlg=page.getByRole('dialog',{name:'Writing Formats',exact:true});await dlg.waitFor();
  await page.getByLabel('Search Templates',{exact:true}).fill('Netflix');const entry=page.locator('.dc-template-list').getByRole('button',{name:/^Streaming Feature \(Netflix-style\) /}).first();await entry.click();
  const text=await dlg.innerText();assert.match(text,/Not affiliated with, endorsed by or approved by Netflix/,'the source says it is not an official template');assert.match(text,/scene numbers on both sides/);
  const before=await geometry(['c','d']);
  await page.getByRole('button',{name:'Apply to Current Document…',exact:true}).click();await page.getByRole('button',{name:'Confirm Apply Format',exact:true}).click();await dlg.waitFor({state:'hidden'});await pause(400);
  const d=await doc();assert.equal(d.appliedTemplateId,'streaming-feature-netflix-style');assert.equal(d.sceneNumberPlacement,'both');assert.deepEqual(d.paragraphs.filter(p=>p.type==='Scene Heading').map(p=>p.sceneNumber),['1','2']);
  assert.equal(d.headerFooterConfig.header.right,'{PAGE}.');assert.equal(d.writingFormat.continuations.more,true);
  assert.deepEqual((await page.locator('.dc-scene-number-left').allInnerTexts()).map(t=>t.trim()),['1','2']);assert.deepEqual((await page.locator('.dc-scene-number-right').allInnerTexts()).map(t=>t.trim()),['1','2']);
  assert.deepEqual(await geometry(['c','d']),before,'Character and Dialogue keep the standard US positions');
 });

 assert.deepEqual(errors,[],'no renderer errors');
 fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify({passed:!failures.length,renderer:dist,results},null,2));
 if(failures.length){console.log(failures.length+' group(s) failed');process.exitCode=1;}
})().catch(e=>{console.error(e.stack);process.exitCode=1}).finally(async()=>{await browser?.close();server?.close()});
