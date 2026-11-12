// Workspace suite (1.16): toolbar actions and customization, the Outline Editor timeline, view modes, structure lines,
// inline styles, appearance, Navigator additions and Beat Board editing, in the built renderer with the default layout.
// Usage: DRAFTCRAFT_DIST=<stage>/app/dist BROWSER_EXE=<chromium> node --import tsx verification/workspace-browser.cjs
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {DEFAULT_WRITING_SETTINGS}=require('../src/writing/model.ts'),{STANDARD_FORMAT}=require('../src/formats/catalog.ts');
const root=path.resolve(__dirname,'..'),dist=process.env.DRAFTCRAFT_DIST||path.resolve(root,'../desktop-build/app/dist'),out=path.resolve(root,'../workspace-qa');fs.mkdirSync(out,{recursive:true});
const KEY='draftcraft_screenplay_doc_v1',WS='draftcraft_workspace_v1',pause=ms=>new Promise(r=>setTimeout(r,ms));
let server,browser,page,origin;const results=[],errors=[];
const P=(id,type,text,extra={})=>({id,type,text,...extra});
function script(scenes=6){const ps=[];for(let i=0;i<scenes;i++){ps.push(P('h'+i,'Scene Heading',['INT. KITCHEN - NIGHT','EXT. ROAD - DAY','INT. KITCHEN - DAY','EXT. FOREST - DUSK','INT. CAR - NIGHT','EXT. ROAD - NIGHT'][i%6]));for(let j=0;j<5;j++)ps.push(P('a'+i+'-'+j,'Action','Line '+j+' of scene '+i+' runs long enough to wrap across the action column of the page and fill space.'));if(i===0)ps.push(P('c0x','Character','ANNA'),P('d0x','Dialogue','A reply.'));ps.push(P('c'+i,'Character',i%2?'ANNA':'BEN'),P('d'+i,'Dialogue','Speech number '+i+' that is spoken here.'));}return ps;}
const doc=(paragraphs,extra={})=>({id:'workspace-qa',titlePage:{title:'WORKSPACE QA',author:'',draftDate:'',contact:'',copyright:''},paragraphs,beats:[],flowLines:[],outlineLanes:[],outlineMarkers:[],targetScriptPages:12,characterHighlights:{},showStructureLines:false,showBookmarks:false,showScriptNotes:false,showSceneComments:false,writingFormat:structuredClone(STANDARD_FORMAT),currentRevision:'White',productionMode:false,lockedPages:false,sceneNumberPlacement:'none',lastSavedAt:new Date().toISOString(),...extra});
async function seed(d=doc(script()),workspace,viewport={width:1440,height:1000}){
 if(page)await page.context().close();const ctx=await browser.newContext({viewport,acceptDownloads:true});page=await ctx.newPage();page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.addInitScript(({d,KEY,WS,workspace,settings})=>{if(!sessionStorage.getItem('ws-seed')){localStorage.clear();localStorage.setItem(KEY,JSON.stringify(d));localStorage.setItem('draftcraft_writing_assistance_v1',JSON.stringify(settings));if(workspace)localStorage.setItem(WS,JSON.stringify(workspace));sessionStorage.setItem('ws-seed','1');}
  window.draftcraftDesktop={windowAction:()=>{},nativeHistory:async()=>true,onCommand:cb=>{window.__command=cb;return()=>{}},readClipboard:async()=>({text:''}),writeClipboard:async()=>true,saveProject:async()=>({saved:false,canceled:true}),autosaveProject:async()=>({saved:false}),finishClose:async()=>({closed:false}),runtime:{platform:'darwin',arch:'arm64',electron:'test'}};},{d,KEY,WS,workspace,settings:{...DEFAULT_WRITING_SETTINGS,autocorrect:false,spellcheck:false}});
 await page.goto(origin);await page.locator('.script-page').first().waitFor();await page.evaluate(()=>document.fonts.ready);await pause(400);}
const seedLength=async()=>script().length;
const stored=async()=>{await pause(250);return page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);};
const prefs=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)||'{}'),WS);
const bar=()=>page.getByRole('toolbar',{name:'Main toolbar',exact:true});
const tl=()=>page.getByRole('region',{name:'Outline Editor timeline',exact:true});
async function check(name,fn){if(process.env.WS_ONLY&&!process.env.WS_ONLY.split('|').some(x=>name.includes(x)))return;try{await fn();results.push({name,passed:true});console.log('PASS',name);}catch(e){results.push({name,passed:false,error:String(e.message||e).split('\n')[0]});console.log('FAIL',name,String(e.message||e).split('\n').slice(0,process.env.WS_ONLY?14:3).join(' | '));try{await page.screenshot({path:path.join(out,'failure-'+results.length+'.png')});}catch{}}}
const menuPick=async(button,item)=>{await bar().getByRole('button',{name:button,exact:true}).click();await page.getByRole('menu').getByRole(/^menuitem/.test('')?'menuitem':'menuitem',{name:item}).or(page.getByRole('menu').getByRole('menuitemcheckbox',{name:item})).first().click();};
(async()=>{
 server=http.createServer((req,res)=>{const url=new URL(req.url,'http://l'),file=path.join(dist,url.pathname==='/'?'index.html':decodeURIComponent(url.pathname));if(!file.startsWith(dist)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.writeHead(200,{'content-type':{'.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.html':'text/html','.wasm':'application/wasm','.woff2':'font/woff2','.json':'application/json'}[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({executablePath:process.env.BROWSER_EXE,args:['--no-sandbox']});

 await check('toolbar: default items are labelled and each one runs its command',async()=>{
  await seed();const t=bar();for(const name of ['New','Open','Save','Undo','Redo','Script','Beat Board','Outline Map','Timeline','Navigator','Views','Title Page','Find','Writing Stats','Show/Hide','Reports','Print'])assert.equal(await t.getByRole('button',{name,exact:true}).count(),1,name);
  await t.getByRole('button',{name:'Beat Board',exact:true}).click();await page.locator('.dc-beatboard').waitFor();assert.equal(await t.getByRole('button',{name:'Beat Board',exact:true}).getAttribute('aria-pressed'),'true');
  await t.getByRole('button',{name:'Outline Map',exact:true}).click();await page.locator('.dc-outline').waitFor();
  await t.getByRole('button',{name:'Reports',exact:true}).click();await page.getByRole('button',{name:'Character Sides',exact:true}).waitFor();await page.keyboard.press('Escape');await pause(250);if(await page.getByRole('button',{name:'Character Sides',exact:true}).count())await page.getByRole('button',{name:/^Close/}).first().click();
  await t.getByRole('button',{name:'Script',exact:true}).click();await page.locator('.script-page').first().waitFor();
  await t.getByRole('button',{name:'Timeline',exact:true}).click();assert.equal(await tl().count(),0);await t.getByRole('button',{name:'Timeline',exact:true}).click();await tl().waitFor();
  await t.getByRole('button',{name:'Navigator',exact:true}).click();await page.getByRole('button',{name:'Open Final Draft Navigator 2.0'}).waitFor();await t.getByRole('button',{name:'Navigator',exact:true}).click();
  await t.getByRole('button',{name:'Find',exact:true}).click();await page.getByPlaceholder(/Find/i).first().waitFor();await page.keyboard.press('Escape');
  await t.getByRole('button',{name:'Title Page',exact:true}).click();await page.getByRole('dialog').first().waitFor();await page.keyboard.press('Escape');await pause(200);
  await t.getByRole('button',{name:'Writing Stats',exact:true}).click();await page.getByRole('dialog').first().waitFor();await page.keyboard.press('Escape');await pause(200);
  await t.getByRole('button',{name:'Print',exact:true}).click();await page.getByRole('dialog').first().waitFor();await page.keyboard.press('Escape');await pause(200);
  await page.locator('#input-a0-0').click();await page.locator('#input-a0-0').evaluate(e=>e.setSelectionRange(e.value.length,e.value.length));await page.keyboard.type(' Extra');await pause(200);assert.ok((await stored()).paragraphs.find(p=>p.id==='a0-0').text.endsWith('Extra'));
  await t.getByRole('button',{name:'Undo',exact:true}).click();await pause(300);assert.ok(!(await stored()).paragraphs.find(p=>p.id==='a0-0').text.endsWith('Extra'),'Undo from the toolbar');
  await t.getByRole('button',{name:'Redo',exact:true}).click();await pause(300);assert.ok((await stored()).paragraphs.find(p=>p.id==='a0-0').text.endsWith('Extra'),'Redo from the toolbar');
 });
 await check('every toolbar item is wired: each one changes the window, the document or opens its dialog (no inert buttons)',async()=>{
  await seed();const {TOOLBAR_ITEMS}=require('../src/workspace/commands.ts');let chooser=0;page.on('filechooser',()=>chooser++);
  const inert=[],hidden=[];let prev='';
  for(const item of TOOLBAR_ITEMS){if(['space','flex','new'].includes(item.id))continue;
   if(!(await page.locator('#input-a1-1').isVisible().catch(()=>false))){hidden.push(prev);await seed();}prev=item.id;
   await page.locator('#input-a1-1').click();await page.locator('#input-a1-1').evaluate(e=>e.setSelectionRange(0,4));
   const before=await page.evaluate(k=>({doc:localStorage.getItem(k),ws:localStorage.getItem('draftcraft_workspace_v1')}),KEY);const c0=chooser;
   const mutated=await page.evaluate(async id=>{let n=0;const o=new MutationObserver(m=>{n+=m.length;});o.observe(document.body,{subtree:true,childList:true,attributes:true,characterData:true});window.__command('ws:'+id);/* wait for an effect, up to 3 s on a busy machine */for(let t=0;t<30&&!n;t++)await new Promise(r=>setTimeout(r,100));await new Promise(r=>setTimeout(r,250));o.disconnect();return n;},item.id);
   const after=await page.evaluate(k=>({doc:localStorage.getItem(k),ws:localStorage.getItem('draftcraft_workspace_v1')}),KEY);
   if(!mutated&&after.doc===before.doc&&after.ws===before.ws&&chooser===c0)inert.push(item.id);
   for(let i=0;i<3;i++){if(await page.locator('[role=dialog],[role=menu],[role=alertdialog]').count()){await page.keyboard.press('Escape');await pause(150);}}
   if(await page.locator('[role=dialog]').count())await page.getByRole('button',{name:/^(Close|Cancel|Done)/}).first().click().catch(()=>{});
   if(!(await page.locator('.script-page').count()))await page.evaluate(()=>window.__command('ws:script'));
   if(!(await bar().count()))await page.evaluate(()=>window.__command('ws:focus'));
  }
  if(hidden.length)console.log('NOTE commands that leave the script hidden until undone:',hidden.join(', '));assert.deepEqual(inert,[],'toolbar items with no effect: '+inert.join(', '));assert.deepEqual(errors,[]);
 });
 await check('toolbar: the caret stays in the script when a button is clicked, and Elements shows and changes the element',async()=>{
  await seed();await page.locator('#input-a1-2').click();const sel=bar().getByRole('combobox',{name:'Script element'});assert.equal(await sel.inputValue(),'Action');
  await bar().getByRole('button',{name:'Show/Hide',exact:true}).dispatchEvent('mousedown');assert.equal(await page.evaluate(()=>document.activeElement.id),'input-a1-2');
  await sel.selectOption('Character');await pause(300);assert.equal((await stored()).paragraphs.find(p=>p.id==='a1-2').type,'Character');assert.equal(await sel.inputValue(),'Character');
 });
 await check('toolbar customization: add, remove, reorder, icon-only, small size, reset and persistence',async()=>{
  await seed();await bar().click({button:'right',position:{x:700,y:20}});await page.getByRole('menuitem',{name:'Customize Toolbar…'}).click();const sheet=page.getByRole('dialog',{name:'Customize Toolbar',exact:true});await sheet.waitFor();
  await sheet.getByRole('button',{name:'Add to toolbar: Bold',exact:true}).dblclick();await sheet.getByRole('button',{name:'Remove Print from the toolbar',exact:true}).click();
  await sheet.getByRole('button',{name:'Move Bold left',exact:true}).click();await sheet.getByLabel('Toolbar display').selectOption('icon');await sheet.getByLabel('Use small size').check();await sheet.getByRole('button',{name:'Done',exact:true}).click();
  let p=await prefs();assert.ok(p.toolbar.items.includes('bold')&&!p.toolbar.items.includes('print'));assert.equal(p.toolbar.items.indexOf('bold'),p.toolbar.items.length-2);assert.equal(await bar().getAttribute('data-display'),'icon');assert.equal(await bar().getAttribute('data-size'),'compact');
  await page.reload();await page.locator('.script-page').first().waitFor();assert.equal(await bar().getAttribute('data-display'),'icon');assert.equal(await bar().getByRole('button',{name:'Bold',exact:true}).count(),1);assert.equal(await bar().getByRole('button',{name:'Print',exact:true}).count(),0);
  await page.evaluate(()=>window.__command('ws:customize'));await sheet.getByRole('button',{name:'Reset to Default',exact:true}).click();await sheet.getByRole('button',{name:'Done',exact:true}).click();p=await prefs();assert.equal(p.toolbar.display,'icon-text');assert.ok(p.toolbar.items.includes('print'));
 });
 await check('toolbar customization by real drag and drop: list → toolbar at the drop point, reorder, drag out, Default Set',async()=>{
  // Real pointer drags (not the Move buttons): the list offers a copy and the toolbar strip must accept it. The window is
  // tall enough to show the whole sheet, so the pointer never has to scroll to reach the toolbar strip.
  await seed(undefined,undefined,{width:1440,height:1500});await bar().click({button:'right',position:{x:700,y:20}});await page.getByRole('menuitem',{name:'Customize Toolbar…'}).click();
  const sheet=page.getByRole('dialog',{name:'Customize Toolbar',exact:true});await sheet.waitFor();const strip=sheet.getByRole('list',{name:'Toolbar items'});
  const toolbarItems=async()=>(await prefs()).toolbar?.items||[];const slots=()=>strip.getByRole('listitem').allInnerTexts().then(t=>t.map(x=>x.replace(/[‹›×]/g,'').trim()));
  const before=await slots(),undo=strip.getByRole('listitem').filter({hasText:/^Undo/}).first(),ub=await undo.boundingBox();
  const boldSource=sheet.getByRole('button',{name:'Add to toolbar: Bold',exact:true});await boldSource.scrollIntoViewIfNeeded();await pause(300);
  await boldSource.dragTo(strip,{targetPosition:{x:ub.x-(await strip.boundingBox()).x+4,y:ub.height/2}});await pause(200);
  let items=(await toolbarItems());assert.ok(items.includes('bold'),'dragging from the list adds the item: '+items.join(','));assert.equal(items[items.indexOf('bold')+1],'undo','it lands where it was dropped (before Undo): '+items.join(','));
  assert.equal(await sheet.getByRole('button',{name:'In toolbar: Bold',exact:true}).count(),1,'the list marks it as in the toolbar');
  // Reorder by dragging within the strip: Bold to the end.
  const bold=strip.getByRole('listitem').filter({hasText:/^Bold/}).first(),sb=await strip.boundingBox();await bold.dragTo(strip,{targetPosition:{x:sb.width-6,y:sb.height/2}});await pause(200);
  items=(await toolbarItems());assert.equal(items.at(-1),'bold','dragged to the end: '+items.join(','));
  // Drag out to the list removes it.
  await strip.getByRole('listitem').filter({hasText:/^Bold/}).first().dragTo(sheet.locator('.dc-wpalette'));await pause(200);assert.ok(!(await toolbarItems()).includes('bold'),'dragging out removes it');
  // A space can be dragged in more than once; the Default Set can be dragged onto the toolbar.
  for(let i=0;i<2;i++)await sheet.getByRole('button',{name:'Add to toolbar: Space',exact:true}).dragTo(strip,{targetPosition:{x:6,y:sb.height/2}});await pause(200);
  items=(await toolbarItems());assert.deepEqual(items.slice(0,2),['space','space'],'two spaces at the start: '+items.join(','));
  await sheet.getByRole('button',{name:'Restore the default toolbar',exact:true}).dragTo(strip);await pause(200);assert.deepEqual((await toolbarItems()),require('../src/workspace/preferences.ts').DEFAULT_TOOLBAR_ITEMS,'dragging the Default Set restores the default toolbar');assert.equal(before.length,(await slots()).length);
  await sheet.getByRole('button',{name:'Done',exact:true}).click();
 });
 await check('toolbar: items that do not fit move into an overflow menu that still runs them',async()=>{
  await seed(undefined,undefined,{width:1024,height:800});const more=bar().getByRole('button',{name:'More toolbar items',exact:true});await more.waitFor();await more.click();
  const menu=page.getByRole('menu');await menu.waitFor();const items=await menu.getByRole('menuitem').allInnerTexts();assert.ok(items.some(t=>/Print/.test(t)),items.join(','));
  await menu.getByRole('menuitem',{name:/Print/}).click();await page.getByRole('dialog').first().waitFor();
  const box=await bar().boundingBox(),editor=await page.locator('.dc-editor-workspace').boundingBox();assert.ok(box.y+box.height<=editor.y+1,'toolbar never overlaps the editor');
 });
 await check('styles: ⌘B/⌘I/⌘U and the Format items store runs, draw them and report the state',async()=>{
  await seed();const input=page.locator('#input-a0-1');await input.click();await input.evaluate(e=>e.setSelectionRange(0,4));await page.keyboard.press('Control+b');await pause(300);
  let p=(await stored()).paragraphs.find(x=>x.id==='a0-1');assert.deepEqual(p.runs[0],{text:'Line',style:{bold:true}});assert.equal(await page.locator('[data-paragraph-id="a0-1"] .dc-text-mirror-styled span').first().evaluate(e=>getComputedStyle(e).fontWeight),'700');
  await input.evaluate(e=>e.setSelectionRange(0,4));await page.keyboard.press('Control+i');await pause(250);p=(await stored()).paragraphs.find(x=>x.id==='a0-1');assert.deepEqual(p.runs[0].style,{bold:true,italic:true});
  await input.evaluate(e=>e.setSelectionRange(0,4));await page.keyboard.press('Control+b');await page.keyboard.press('Control+i');await pause(250);p=(await stored()).paragraphs.find(x=>x.id==='a0-1');assert.equal(p.runs,undefined,'all styles off drops the runs');
  const before=await input.evaluate(e=>({h:e.offsetHeight,w:e.offsetWidth}));await input.evaluate(e=>e.setSelectionRange(5,6));await page.evaluate(()=>window.__command('ws:underline'));await pause(250);assert.deepEqual(await input.evaluate(e=>({h:e.offsetHeight,w:e.offsetWidth})),before,'emphasis never changes wrapping');
  await page.evaluate(()=>window.__command('ws:align-center'));await pause(300);p=(await stored()).paragraphs.find(x=>x.id==='a0-1');assert.equal(p.align,'center');assert.equal(await input.evaluate(e=>getComputedStyle(e).textAlign),'center');
  await page.evaluate(()=>window.__command('ws:align-left'));await pause(300);assert.equal((await stored()).paragraphs.find(x=>x.id==='a0-1').align,undefined,'the element alignment again');
  await page.keyboard.press('Control+z');await pause(250);assert.equal((await stored()).paragraphs.find(x=>x.id==='a0-1').align,'center','alignment is undoable');
 });
 await check('views: Normal and Speed View change only the drawing; Focus Mode and Typewriter work',async()=>{
  await seed();const pages=await page.locator('.script-page').count(),charLeft=async()=>page.locator('[data-paragraph-id="c0"]').evaluate(e=>e.offsetLeft),actionLeft=await page.locator('[data-paragraph-id="a0-0"]').evaluate(e=>e.offsetLeft),cue=await charLeft();assert.ok(cue>actionLeft+50);
  await page.evaluate(()=>window.__command('ws:view-normal'));await pause(400);assert.equal(await page.locator('[data-script-view="normal"]').count(),1);assert.ok(await page.locator('.dc-page-break').count()>0);assert.equal(await page.locator('.script-page').first().evaluate(e=>getComputedStyle(e).height==='auto'||e.style.height),'auto');
  await page.evaluate(()=>window.__command('ws:view-speed'));await pause(600);assert.equal(await charLeft(),actionLeft,'speed view flattens cues to the action indent');assert.ok(await page.locator('.dc-speed-label').count()>0);
  const status=await page.locator('footer').innerText();assert.ok(status.includes('of '+pages)||status.includes('Page 1 of'),'page count comes from the real pagination');
  await page.evaluate(()=>window.__command('ws:view-page'));await pause(500);assert.equal(await charLeft(),cue);
  await bar().getByRole('button',{name:'Views',exact:true}).click();assert.equal(await page.getByRole('menuitemcheckbox',{name:'Page View'}).getAttribute('aria-checked'),'true');await page.keyboard.press('Escape');
  await page.evaluate(()=>window.__command('ws:focus'));await pause(300);assert.equal(await bar().count(),0);await page.getByRole('button',{name:'Exit Focus Mode',exact:true}).click();await bar().waitFor();
  await page.evaluate(()=>window.__command('ws:typewriter'));await pause(200);const last=page.locator('#input-d5');await last.click();await last.evaluate(e=>e.setSelectionRange(e.value.length,e.value.length));for(let i=0;i<3;i++){await page.keyboard.press('Enter');await page.keyboard.type('Typewriter line '+i,{delay:5});}await pause(400);
  const y=await page.evaluate(()=>{const c=document.querySelector('.dc-editor-workspace').getBoundingClientRect(),a=document.activeElement.getBoundingClientRect();return (a.bottom-c.top)/c.height;});assert.ok(y>.3&&y<.65,'caret line stays near the middle: '+y);
  await page.evaluate(()=>window.__command('ws:ruler'));await page.locator('.dc-ruler').waitFor();await page.evaluate(()=>window.__command('ws:formatting-marks'));await page.locator('.dc-mark').first().waitFor();
 });
 await check('timeline: Script lane follows the real pagination; double-click opens a scene; caret indicator follows the caret',async()=>{
  await seed();const scenes=tl().locator('.dc-tl-scene');assert.equal(await scenes.count(),6);
  const index=await page.evaluate(()=>[...document.querySelectorAll('.dc-tl-scene')].map(e=>parseFloat(e.style.left)));assert.ok(index.every((x,i)=>i===0||x>index[i-1]),'scenes in script order');
  await scenes.nth(3).dblclick();await pause(400);assert.equal(await page.evaluate(()=>document.activeElement.id),'input-h3');
  await page.locator('#input-d5').click();await pause(300);const caret=await tl().locator('.dc-tl-caret').evaluate(e=>parseFloat(e.style.left));const scene5=await scenes.nth(5).evaluate(e=>parseFloat(e.style.left));assert.ok(caret>scene5+156,'caret is inside the last scene');
  const before=await scenes.nth(5).evaluate(e=>parseFloat(e.style.left));await page.locator('#input-a0-0').click();await page.locator('#input-a0-0').evaluate(e=>e.setSelectionRange(e.value.length,e.value.length));for(let i=0;i<12;i++)await page.keyboard.press('Enter'),await page.keyboard.type('More text that pushes the later scenes onto later pages of the screenplay.',{delay:0});await pause(900);
  const after=await scenes.nth(5).evaluate(e=>parseFloat(e.style.left));assert.ok(after>before+20,'repagination moves later scenes right: '+before+' → '+after);
 });
 await check('timeline: create, rename, move, resize, move between lanes, edit goals, delete and undo; linked to the Beat Board',async()=>{
  await seed();const lane=tl().locator('[data-lane-row="lane-outline-3"] .dc-tl-track'),box=await lane.boundingBox(),pw=(await prefs()).timeline?.pageWidth||56;
  await lane.dblclick({position:{x:pw*2+1,y:box.height/2}});await tl().getByLabel('Outline element title').waitFor();/* the new name is selected, so typing replaces it */await page.keyboard.type('Kitchen fight');await page.keyboard.press('Enter');
  let d=await stored();assert.equal(d.outlineLanes.length,3,'default lanes are saved with the first element');let m=d.outlineMarkers[0];assert.equal(m.title,'Kitchen fight');assert.equal(m.startPage,3);assert.equal(m.endPage,4);const beat=d.beats.find(b=>b.id===m.beatId);assert.equal(beat.title,'Kitchen fight');
  const marker=tl().locator('[data-marker-id="'+m.id+'"]');let mb=await marker.boundingBox();await page.mouse.move(mb.x+mb.width/2,mb.y+mb.height/2);await page.mouse.down();await page.mouse.move(mb.x+mb.width/2+pw*2,mb.y+mb.height/2,{steps:6});await page.mouse.up();
  d=await stored();m=d.outlineMarkers[0];assert.equal(m.startPage,5);assert.equal(m.endPage,6);
  mb=await marker.boundingBox();await page.mouse.move(mb.x+mb.width-2,mb.y+mb.height/2);await page.mouse.down();await page.mouse.move(mb.x+mb.width-2+pw*1.5,mb.y+mb.height/2,{steps:6});await page.mouse.up();d=await stored();assert.equal(d.outlineMarkers[0].endPage,7.5,'resize snaps to eighths');
  mb=await marker.boundingBox();const up=await tl().locator('[data-lane-row="lane-outline-2"]').boundingBox();await page.mouse.move(mb.x+10,mb.y+mb.height/2);await page.mouse.down();await page.mouse.move(mb.x+10,up.y+up.height/2,{steps:6});await page.mouse.up();d=await stored();if(process.env.WS_DEBUG)console.log('DEBUG',JSON.stringify({mb,up,marker:d.outlineMarkers[0],rows:await page.evaluate(()=>[...document.querySelectorAll('[data-lane-row]')].map(r=>[r.dataset.laneRow,Math.round(r.getBoundingClientRect().top),Math.round(r.getBoundingClientRect().bottom)]))}));assert.equal(d.outlineMarkers[0].laneId,'lane-outline-2');
  await marker.click();await tl().getByLabel('Goal start page').fill('2');await tl().getByLabel('Goal start page').press('Enter');await tl().getByLabel('Goal end page').fill('4');await tl().getByLabel('Goal end page').press('Enter');d=await stored();assert.equal(d.outlineMarkers[0].startPage,2);assert.equal(d.outlineMarkers[0].endPage,4);
  await tl().getByLabel('Element description').fill('They argue.');await tl().getByLabel('Element description').press('Enter');d=await stored();assert.equal(d.beats.find(b=>b.id===m.beatId).description,'They argue.','description edits reach the beat');
  await bar().getByRole('button',{name:'Beat Board',exact:true}).click();const card=page.locator('[data-beat-id="'+m.beatId+'"]');await card.waitFor();assert.ok((await card.innerText()).includes('2 – 4'),'the beat shows its goal pages');
  await card.getByLabel('Beat title').fill('Kitchen brawl');await pause(300);assert.equal(await tl().locator('[data-marker-id="'+m.id+'"] .dc-tl-marker-title').innerText(),'Kitchen brawl','a Beat Board rename shows on the timeline');
  await tl().locator('[data-marker-id="'+m.id+'"]').click();await page.keyboard.press('Delete');d=await stored();assert.equal(d.outlineMarkers.length,0);assert.ok(d.beats.some(b=>b.id===m.beatId),'removing from the timeline keeps the beat');
  await page.keyboard.press('Control+z');d=await stored();assert.equal(d.outlineMarkers.length,1,'undo restores it');
  await tl().locator('[data-marker-id="'+m.id+'"]').click();await page.keyboard.press('Control+d');d=await stored();assert.equal(d.outlineMarkers.length,2);assert.equal(d.beats.length,2,'duplicating also duplicates the beat');
 });
 await check('timeline: dragging a written scene moves its text only after confirmation, as one Undo step',async()=>{
  await seed();const order=async()=>(await stored()).paragraphs.filter(p=>p.type==='Scene Heading').map(p=>p.id).join(',');const start=await order();assert.equal(start,'h0,h1,h2,h3,h4,h5');
  await tl().getByRole('button',{name:'Fit Script'}).click();await pause(300);
  const drag=async(from,to,frac=.25)=>{const a=await tl().locator('[data-scene-id="'+from+'"]').boundingBox(),b=await tl().locator('[data-scene-id="'+to+'"]').boundingBox();await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width*frac,b.y+b.height/2,{steps:8});await page.mouse.up();};
  await drag('h3','h0');const confirm=tl().getByRole('alertdialog',{name:'Move scene'});await confirm.waitFor();assert.ok((await confirm.innerText()).includes('before scene 1'),await confirm.innerText());
  await confirm.getByRole('button',{name:'Cancel'}).click();assert.equal(await order(),start,'Cancel moves nothing');
  await drag('h3','h0');await confirm.getByRole('button',{name:'Move Scene'}).click();await pause(300);assert.equal(await order(),'h3,h0,h1,h2,h4,h5');
  const d=await stored(),i=d.paragraphs.findIndex(p=>p.id==='h3');assert.deepEqual(d.paragraphs.slice(i,i+8).map(p=>p.id),['h3','a3-0','a3-1','a3-2','a3-3','a3-4','c3','d3'],'the whole scene moves');assert.equal(d.paragraphs.length,(await seedLength()),'no paragraph lost');
  await bar().getByRole('button',{name:'Undo',exact:true}).click();await pause(300);assert.equal(await order(),start,'one Undo restores the order');
  await tl().locator('[data-scene-id="h2"]').dblclick();await pause(300);assert.equal(await page.evaluate(()=>document.activeElement.id),'input-h2','double-click still opens the scene');assert.equal(await confirm.count(),0,'a double-click is not a move');
 });
 await check('timeline: zoom, fit, lanes, hide/show without touching the document',async()=>{
  await seed();const start=JSON.stringify((await stored()).paragraphs);await tl().getByRole('button',{name:'Fit Script'}).click();await pause(300);const fitted=(await prefs()).timeline.pageWidth;
  await tl().getByRole('button',{name:'Zoom in timeline'}).click();await pause(200);assert.ok((await prefs()).timeline.pageWidth>fitted);
  await tl().getByRole('button',{name:'Add Lane'}).click();let d=await stored();assert.equal(d.outlineLanes.length,4);
  await tl().getByRole('button',{name:'Options for Outline 4'}).click();await page.getByRole('menuitem',{name:'Rename Lane'}).click();await tl().getByLabel('Lane name').fill('Subplot');await tl().getByLabel('Lane name').press('Enter');d=await stored();assert.equal(d.outlineLanes[3].name,'Subplot');
  await tl().getByRole('button',{name:'Collapse Subplot'}).click();assert.ok((await prefs()).timeline.collapsed.includes(d.outlineLanes[3].id));
  await bar().getByRole('button',{name:'Timeline',exact:true}).click();await bar().getByRole('button',{name:'Timeline',exact:true}).click();await tl().waitFor();assert.equal(JSON.stringify((await stored()).paragraphs),start);
  const height=await tl().evaluate(e=>e.offsetHeight);const handle=tl().getByRole('separator',{name:'Resize timeline'});const hb=await handle.boundingBox();await page.mouse.move(hb.x+200,hb.y+2);await page.mouse.down();await page.mouse.move(hb.x+200,hb.y+60,{steps:4});await page.mouse.up();await pause(200);assert.ok((await prefs()).timeline.height>height+40);
 });
 await check('structure lines come from the script and the timeline, not from page numbers',async()=>{
  const ps=[P('act1','New Act','ACT ONE'),...script(2),P('act2','New Act','ACT TWO'),...script(2).map(p=>({...p,id:'x'+p.id}))];await seed(doc(ps,{showStructureLines:true}));await pause(300);
  const acts=await page.locator('.dc-structure-level-0').evaluateAll(es=>es.map(e=>e.dataset.label));assert.ok(acts.includes('Act ACT ONE')&&acts.includes('Act ACT TWO'),acts.join(','));
  assert.ok(await page.locator('.dc-structure-level-3').count()>=4,'scene lines');await page.locator('.dc-structure-level-0').last().click();await pause(700);assert.equal(await page.evaluate(()=>document.activeElement.id),'input-act2','clicking a line goes to the start of its region');
  const textLeft=await page.locator('#input-a0-0').evaluate(e=>e.getBoundingClientRect().left);await page.evaluate(()=>window.__command('ws:structure-lines'));await pause(300);assert.equal(await page.locator('#input-a0-0').evaluate(e=>e.getBoundingClientRect().left),textLeft,'lines never move text');await page.evaluate(()=>window.__command('ws:structure-lines'));await pause(300);
  await page.evaluate(()=>window.__command('ws:structure-lines'));await pause(300);assert.equal(await page.locator('.dc-structure-line').count(),0);
 });
 await check('Show/Hide Outline Elements hides outline paragraphs in the script without deleting them',async()=>{
  const ps=script(2);ps.splice(8,0,P('o1','Outline Level 1','THE SETUP'),P('o2','Outline Level 2','Kitchen argument'));await seed(doc(ps));
  assert.equal(await page.locator('#input-o1').count(),1);const pages=await page.locator('.script-page').count();
  await page.evaluate(()=>window.__command('ws:toggle-outline'));await pause(400);assert.equal(await page.locator('#input-o1').count(),0,'hidden in the script');assert.equal(await page.locator('#input-o2').count(),0);
  const d=await stored();assert.ok(d.paragraphs.some(p=>p.id==='o1')&&d.paragraphs.some(p=>p.id==='o2'),'still in the document');assert.equal((await prefs()).showOutlineElements,false);
  await page.evaluate(()=>window.__command('ws:toggle-outline'));await pause(400);assert.equal(await page.locator('#input-o1').count(),1,'shown again');assert.equal(await page.locator('.script-page').count(),pages);
 });
 await check('appearance: Light, Midnight and System change the toolbar, Navigator and panels',async()=>{
  await seed();const chrome=()=>page.locator('.dc-wtoolbar').evaluate(e=>getComputedStyle(e).backgroundColor);const dark=await chrome();
  await page.evaluate(()=>window.__command('ws:appearance-light'));await pause(300);const light=await chrome();assert.notEqual(light,dark);assert.equal(await page.locator('html').getAttribute('data-appearance'),'light');
  const lum=c=>{const [r,g,b]=c.match(/\d+/g).map(Number);return .2126*r+.7152*g+.0722*b;};assert.ok(lum(light)>180,'light toolbar: '+light);for(const sel of ['.dc-navigator','.dc-timeline','.dc-statusbar']){const bg=await page.locator(sel).first().evaluate(e=>getComputedStyle(e).backgroundColor);assert.ok(lum(bg)>180,sel+' follows Light: '+bg);}
  await page.evaluate(()=>window.__command('ws:appearance-midnight'));await pause(300);assert.equal(await page.locator('html').getAttribute('data-appearance'),'midnight');
  await page.emulateMedia({colorScheme:'light'});await page.evaluate(()=>window.__command('ws:appearance-system'));await pause(300);assert.equal(await page.locator('html').getAttribute('data-appearance'),'light');
  await page.emulateMedia({colorScheme:'dark'});await pause(300);assert.equal(await page.locator('html').getAttribute('data-appearance'),'dark');
 });
 await check('Navigator: Locations, Outline, character interactions, custom tabs without browser prompts, resizing',async()=>{
  await seed(doc(script(),{outlineLanes:[{id:'L1',name:'Acts',type:'act',color:'#8fc5b8'}],outlineMarkers:[{id:'M1',laneId:'L1',title:'ACT ONE',description:'',startPage:1,endPage:3,color:'#8fc5b8',kind:'section'}]}));
  await page.getByRole('tab',{name:'Locations',exact:true}).click();const loc=page.getByRole('region',{name:'Locations'});await loc.waitFor();const rows=await loc.locator('tbody tr').allInnerTexts();assert.ok(rows.some(r=>r.includes('KITCHEN')&&r.includes('2')),rows.join('|'));assert.ok(rows.some(r=>r.includes('ROAD')));
  await loc.getByRole('button',{name:/^KITCHEN/}).click();await loc.getByRole('button',{name:'INT. KITCHEN - DAY'}).click();await pause(300);assert.equal(await page.evaluate(()=>document.activeElement.id),'input-h2');
  await page.getByRole('tab',{name:'Outline',exact:true}).click();await page.getByRole('region',{name:'Outline elements'}).getByRole('button',{name:'ACT ONE'}).waitFor();
  await page.getByRole('tab',{name:/^Cast \(/}).click();await page.getByLabel('Characters sharing scenes with ANNA').waitFor();
  await page.getByRole('button',{name:'Add Custom Navigator Tab'}).click();await page.getByLabel('New tab name').fill('Drafts');await page.getByLabel('New tab name').press('Enter');await page.getByRole('tab',{name:'Drafts',exact:true}).waitFor();
  await page.getByRole('tab',{name:'Drafts',exact:true}).dblclick();await page.getByLabel('Tab name').fill('Revisions');await page.getByLabel('Tab name').press('Enter');await page.getByRole('tab',{name:'Revisions',exact:true}).waitFor();
  const handle=page.getByRole('separator',{name:'Resize Navigator'}),hb=await handle.boundingBox();await page.mouse.move(hb.x+2,hb.y+200);await page.mouse.down();await page.mouse.move(hb.x+82,hb.y+200,{steps:4});await page.mouse.up();await pause(300);assert.ok((await prefs()).navigator.width>=370);
 });
 await check('Navigator Scenes: sorting, column choices that take effect, editing a heading in place',async()=>{
  await seed(doc(script().map(p=>p.id==='a2-4'?{...p,text:p.text+' '+'More words in this scene make it the longest one by far. '.repeat(30)}:p)));
  const list=()=>page.locator('.dc-navigator').locator('span.font-screenplay').allInnerTexts();assert.equal((await list())[0],'INT. KITCHEN - NIGHT');
  await page.getByLabel('Sort scenes').selectOption('length');await page.getByRole('button',{name:'Sort descending'}).click();await pause(200);assert.equal((await list())[0],'INT. KITCHEN - DAY','longest scene first');
  await page.getByLabel('Sort scenes').selectOption('number');await page.getByRole('button',{name:'Sort ascending'}).click();await pause(200);
  const nav=page.locator('.dc-navigator');assert.ok((await nav.innerText()).includes('INTERIOR'));await page.getByRole('button',{name:'Customize Columns'}).click();
  await page.locator('label').filter({hasText:/^INT\/EXT$/}).locator('input').uncheck();await page.getByRole('button',{name:'Customize Columns'}).click();await pause(200);assert.ok(!(await nav.innerText()).includes('INTERIOR'),'hiding a column hides it');
  await nav.locator('span.font-screenplay',{hasText:'EXT. FOREST - DUSK'}).dblclick();const cell=page.getByLabel('Scene heading',{exact:true});await cell.fill('ext. lake - dusk');await cell.press('Enter');await pause(300);
  assert.equal((await stored()).paragraphs.find(p=>p.id==='h3').text,'EXT. LAKE - DUSK','the heading changes in the script');assert.equal(await page.locator('#input-h3').inputValue(),'EXT. LAKE - DUSK');
 });
 await check('Navigator scene table (#27): drag, keyboard and double-click column resizing, header sorting, in-place headings, saved widths',async()=>{
  await seed(doc(script().map(p=>p.id==='a2-4'?{...p,text:p.text+' '+'More words in this scene make it the longest one by far. '.repeat(30)}:p)));
  const nav=page.locator('.dc-navigator'),navWidth=await nav.evaluate(e=>e.getBoundingClientRect().width);
  await nav.getByRole('button',{name:'Show scenes as a table'}).click();const table=nav.getByRole('table',{name:'Scenes'});await table.waitFor();
  assert.equal(await nav.getByRole('button',{name:'Show scenes as a table'}).getAttribute('aria-pressed'),'true');assert.equal((await prefs()).navigator.sceneView,'table');
  // 1.17: columns are addressed by name (a Colour column was added and columns can be reordered).
  const COLS=['number','heading','setting','time','length','characters','summary'],th=i=>table.locator('thead th[data-column="'+COLS[i]+'"]'),width=async i=>Math.round(await th(i).evaluate(e=>e.getBoundingClientRect().width));
  assert.deepEqual((await table.locator('thead th').allInnerTexts()).map(t=>t.trim()),['#','Colour','Heading','INT/EXT','Time','Length','Characters','Summary']);
  assert.equal(await table.locator('tbody tr').count(),6);const headings=()=>table.locator('tbody tr td.dc-nav-td-heading').allInnerTexts();
  const first=(await table.locator('tbody tr').first().locator('td').allInnerTexts()).filter((_,i)=>i!==1);assert.deepEqual(first.slice(0,4),['1','INT. KITCHEN - NIGHT','INT','NIGHT']);assert.match(first[4],/^(\d+|\d+ \d\/8|\d\/8)$/,'length in pages and eighths');
  // Header sorting: first click ascending, second click descending; the longest scene comes first.
  await th(4).getByRole('button').click();assert.equal(await th(4).getAttribute('aria-sort'),'ascending');assert.equal(await th(1).getAttribute('aria-sort'),'none');
  await th(4).getByRole('button').click();assert.equal(await th(4).getAttribute('aria-sort'),'descending');assert.equal((await headings())[0],'INT. KITCHEN - DAY','longest scene first');
  await th(0).getByRole('button').click();assert.equal((await headings())[0],'INT. KITCHEN - NIGHT','back in script order');
  // Drag the Heading column's right edge 80 px: the column follows during the drag and keeps the width afterwards.
  assert.equal(await width(1),190);const handle=table.getByRole('separator',{name:'Resize Heading column'}),hb=await handle.boundingBox();
  await page.mouse.move(hb.x+hb.width/2,hb.y+hb.height/2);await page.mouse.down();await page.mouse.move(hb.x+hb.width/2+50,hb.y+hb.height/2,{steps:4});
  assert.equal(await width(1),240,'the column follows the pointer during the drag');await page.mouse.move(hb.x+hb.width/2+80,hb.y+hb.height/2,{steps:3});await page.mouse.up();await pause(200);
  assert.equal(await width(1),270);assert.equal((await prefs()).navigator.columnWidths.heading,270);assert.equal(await th(1).getAttribute('aria-sort'),'none','resizing does not sort');
  assert.equal(Math.round(await nav.evaluate(e=>e.getBoundingClientRect().width)),Math.round(navWidth),'the Navigator keeps its width');
  assert.ok(await nav.locator('.dc-scene-table-wrap').evaluate(e=>e.scrollWidth>e.clientWidth),'a wide table scrolls sideways inside the Navigator');
  // Keyboard: arrows move the edge by 10 px (Shift: 40 px); limits hold; double-click restores the default width.
  await handle.focus();await page.keyboard.press('ArrowLeft');await page.keyboard.press('Shift+ArrowRight');await pause(150);assert.equal((await prefs()).navigator.columnWidths.heading,300);assert.equal(await handle.getAttribute('aria-valuenow'),'300');
  await page.keyboard.press('Home');await pause(100);assert.equal(await width(1),36,'minimum width');await handle.dblclick();await pause(150);assert.equal(await width(1),190,'double-click restores the default');
  const summary=table.getByRole('separator',{name:'Resize Summary column'});await summary.focus();await page.keyboard.press('Shift+ArrowRight');await page.keyboard.press('Shift+ArrowRight');await pause(150);
  // Saved: after a reload the table and the widths come back.
  await page.reload();await page.locator('.script-page').first().waitFor();await table.waitFor();assert.equal(await width(6),300,'saved column width');
  // Column choices apply to the table; editing a heading in place; a row goes to its scene.
  await page.getByRole('button',{name:'Customize Columns'}).click();await page.locator('label').filter({hasText:/^INT\/EXT$/}).locator('input').uncheck();await page.getByRole('button',{name:'Customize Columns'}).click();await pause(150);
  assert.ok(!(await table.locator('thead th').allInnerTexts()).map(t=>t.trim()).includes('INT/EXT'),'a hidden column leaves the table');assert.equal((await prefs()).navigator.columns.setting,false);
  await table.locator('td',{hasText:'EXT. FOREST - DUSK'}).dblclick();const cell=page.getByLabel('Scene heading',{exact:true});await cell.fill('ext. lake - dusk');await cell.press('Enter');await pause(300);
  assert.equal((await stored()).paragraphs.find(p=>p.id==='h3').text,'EXT. LAKE - DUSK','the heading changes in the script');
  await table.locator('tbody tr',{hasText:'INT. CAR - NIGHT'}).click();await pause(500);assert.equal(await page.evaluate(()=>document.activeElement.id),'input-h4','a row goes to its scene');
  await nav.getByRole('button',{name:'Show scenes as a table'}).click();await pause(150);assert.equal(await table.count(),0,'back to cards');assert.equal((await prefs()).navigator.sceneView,'cards');
 });
 await check('Navigator 1.17 (#30, items 4 and 10): text size, column reorder by real drag and Alt+arrows, sort kept after reload, in-place summary, comment and colour',async()=>{
  await seed(undefined,{version:1,navigator:{open:true,width:480}});const nav=page.locator('.dc-navigator'),navBox=await nav.boundingBox();
  // Text size: A+ / A− scale everything below the header; the header controls keep their size; saved with the workspace.
  const headingH=()=>nav.locator('span.font-screenplay',{hasText:'EXT. ROAD - DAY'}).first().evaluate(e=>e.getBoundingClientRect().height),h0=await headingH();
  const btnH=await nav.getByRole('button',{name:'Larger Navigator text'}).evaluate(e=>e.getBoundingClientRect().height);
  await nav.getByRole('button',{name:'Larger Navigator text'}).click();await nav.getByRole('button',{name:'Larger Navigator text'}).click();await pause(200);
  assert.equal((await prefs()).navigator.zoom,1.25);const h1=await headingH();assert.ok(Math.abs(h1/h0-1.25)<.06,'text is 125 % ('+h0+' → '+h1+')');
  assert.equal(await nav.getByRole('button',{name:'Larger Navigator text'}).evaluate(e=>e.getBoundingClientRect().height),btnH,'header controls keep their size');
  const panel=nav.locator(':scope > :nth-child(2)');const pb=await panel.boundingBox();assert.ok(Math.abs(pb.x+pb.width-(navBox.x+navBox.width))<=2&&Math.abs(pb.x-navBox.x)<=2,'the zoomed panel still fills the Navigator width');
  assert.equal(Math.round((await nav.boundingBox()).width),Math.round(navBox.width),'the Navigator keeps its width');
  await page.reload();await page.locator('.script-page').first().waitFor();await pause(300);assert.ok(Math.abs(await headingH()/h0-1.25)<.06,'text size kept after reload');
  assert.match(await nav.getByRole('button',{name:/^Navigator text size 125%/}).innerText(),/125%/);
  for(let i=0;i<5;i++)if(await nav.getByRole('button',{name:'Smaller Navigator text'}).isEnabled())await nav.getByRole('button',{name:'Smaller Navigator text'}).click();await pause(150);
  assert.equal((await prefs()).navigator.zoom,.8);assert.equal(await nav.getByRole('button',{name:'Smaller Navigator text'}).isDisabled(),true,'80 % is the smallest');
  await nav.getByRole('button',{name:/^Navigator text size 80%/}).click();await pause(150);assert.equal((await prefs()).navigator.zoom,1,'clicking the percentage restores 100 %');
  // Column reorder with a real pointer drag: Time dropped on the left half of Heading lands before it.
  await nav.getByRole('button',{name:'Show scenes as a table'}).click();const table=nav.getByRole('table',{name:'Scenes'});await table.waitFor();
  const order=async()=>(await table.locator('thead th').evaluateAll(t=>t.map(e=>e.dataset.column)));
  assert.deepEqual(await order(),['number','color','heading','setting','time','length','characters','summary']);
  const from=await table.locator('thead th[data-column="time"] .dc-nav-th').boundingBox(),to=await table.locator('thead th[data-column="heading"]').boundingBox();
  await page.mouse.move(from.x+15,from.y+from.height/2);await page.mouse.down();await page.mouse.move(from.x+5,from.y+from.height/2,{steps:3});await page.mouse.move(to.x+12,to.y+to.height/2,{steps:8});
  assert.equal(await table.locator('thead th[data-column="heading"]').getAttribute('data-drop-before'),'true','a drop marker shows where the column will go');await page.mouse.up();await pause(250);
  assert.deepEqual(await order(),['number','color','time','heading','setting','length','characters','summary'],'dragged column moved');
  assert.deepEqual((await prefs()).navigator.columnOrder.slice(0,4),['number','color','time','heading']);assert.equal((await prefs()).navigator.sort.field,'number','a header drag does not sort');
  // Keyboard: Alt+→ on the Time header moves it one place right; focus stays on it.
  await table.locator('thead th[data-column="time"] .dc-nav-th').focus();await page.keyboard.press('Alt+ArrowRight');await pause(200);
  assert.deepEqual((await order()).slice(0,4),['number','color','heading','time'],'Alt+→ moves the column');assert.equal(await page.evaluate(()=>document.activeElement.closest('th')?.dataset.column),'time','focus follows the column');
  await page.keyboard.press('Alt+ArrowLeft');await pause(200);assert.deepEqual((await order()).slice(0,4),['number','color','time','heading'],'Alt+← moves it back');
  // Sort by a header; the sort and the order come back after a reload.
  await table.locator('thead th[data-column="time"] .dc-nav-th').click();await table.locator('thead th[data-column="time"] .dc-nav-th').click();await pause(150);
  assert.deepEqual((await prefs()).navigator.sort,{field:'time',asc:false});
  await page.reload();await page.locator('.script-page').first().waitFor();await table.waitFor();
  assert.equal(await table.locator('thead th[data-column="time"]').getAttribute('aria-sort'),'descending','sort kept after reload');assert.deepEqual((await order()).slice(0,4),['number','color','time','heading'],'order kept after reload');
  const times=await table.locator('tbody td[data-column="time"]').allInnerTexts();assert.deepEqual(times,[...times].sort().reverse(),'rows are in descending time order');
  await table.locator('thead th[data-column="number"] .dc-nav-th').click();await pause(150);
  // In place: summary (double-click, Enter), scene comment (column shown from Customize Columns), Escape cancels; colour.
  const row=table.locator('tbody tr[data-scene-id="h1"]');await row.locator('td[data-column="summary"]').dblclick();let input=page.getByLabel('Scene summary',{exact:true});await input.fill('The chase begins');await input.press('Enter');await pause(300);
  assert.equal((await stored()).paragraphs.find(p=>p.id==='h1').sceneSummary,'The chase begins');assert.equal((await row.locator('td[data-column="summary"]').innerText()).trim(),'The chase begins');
  await page.getByRole('button',{name:'Customize Columns'}).click();await page.locator('label').filter({hasText:/^Comment$/}).locator('input').check();await page.getByRole('button',{name:'Customize Columns'}).click();await pause(150);
  await row.locator('td[data-column="comment"]').dblclick();input=page.getByLabel('Scene comment',{exact:true});await input.fill('Needs a permit');await input.press('Enter');await pause(300);
  assert.equal((await stored()).paragraphs.find(p=>p.id==='h1').sceneComment,'Needs a permit');
  await row.locator('td[data-column="comment"]').dblclick();input=page.getByLabel('Scene comment',{exact:true});await input.fill('discard me');await input.press('Escape');await pause(300);
  assert.equal((await stored()).paragraphs.find(p=>p.id==='h1').sceneComment,'Needs a permit','Escape keeps the old comment');
  await row.locator('td[data-column="color"] input').evaluate(e=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'#ff0000');e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));});await pause(300);
  assert.equal((await stored()).paragraphs.find(p=>p.id==='h1').sceneColor,'#ff0000','the colour is the scene colour');
  await bar().getByRole('button',{name:'Undo',exact:true}).click();await pause(300);assert.notEqual((await stored()).paragraphs.find(p=>p.id==='h1').sceneColor,'#ff0000','Undo reverts the colour');
  assert.equal((await stored()).paragraphs.find(p=>p.id==='h1').sceneComment,'Needs a permit');assert.deepEqual(errors,[]);
 });
 await check('status bar (#31, item 6): right-click shows or hides each item, Show All, scene number follows the caret, saved',async()=>{
  await seed();const sb=page.locator('footer.dc-statusbar'),item=n=>sb.locator('[data-status-item="'+n+'"]');
  for(const n of ['page','scene','words','lines','element','view','zoom'])assert.equal(await item(n).count(),1,n+' shown by default');
  await page.locator('#input-a2-1').click();await pause(200);assert.equal((await item('scene').innerText()).trim(),'Scene 3','scene of the caret');
  await page.locator('#input-a4-0').click();await pause(200);assert.equal((await item('scene').innerText()).trim(),'Scene 5');
  const open=async()=>{const b=await sb.boundingBox();await page.mouse.click(b.x+b.width/2,b.y+b.height/2,{button:'right'});await page.getByRole('menu').waitFor();};
  await open();const menu=page.getByRole('menu');assert.equal(await menu.getByRole('menuitemcheckbox').count(),15,'one entry per item');
  assert.equal(await menu.getByRole('menuitemcheckbox',{name:'Word Count'}).getAttribute('aria-checked'),'true');
  await menu.getByRole('menuitemcheckbox',{name:'Word Count'}).click();await pause(150);assert.equal(await item('words').count(),0,'word count hidden');
  assert.equal(await menu.getByRole('menuitemcheckbox',{name:'Word Count'}).getAttribute('aria-checked'),'false','the menu stays open and shows the change');
  await menu.getByRole('menuitemcheckbox',{name:'Zoom'}).click();await menu.getByRole('menuitemcheckbox',{name:'View Menu'}).click();await page.keyboard.press('Escape');await pause(150);
  assert.equal(await page.getByRole('menu').count(),0);assert.deepEqual([await item('zoom').count(),await item('view').count(),await item('page').count()],[0,0,1]);
  assert.deepEqual((await prefs()).statusBar.hidden,['words','view','zoom']);
  await page.reload();await page.locator('.script-page').first().waitFor();await pause(300);assert.deepEqual([await item('words').count(),await item('zoom').count(),await item('lines').count()],[0,0,1],'kept after reload');
  await open();await page.getByRole('menu').getByRole('menuitem',{name:'Show All'}).click();await pause(150);assert.equal(await item('words').count(),1);assert.deepEqual((await prefs()).statusBar.hidden,[]);
  assert.equal(await page.getByRole('menu').count(),0,'Show All closes the menu');assert.deepEqual(errors,[]);
 });
 await check('auto-hide right scene numbers (#32, item 7): per document, off by default; hides only colliding right numbers in the editor; menu and Production Studio',async()=>{
  const long='INT. ABANDONED TEXTILE WAREHOUSE NEAR THE OLD HARBOR CRANES - NIGHT';
  await seed(doc([P('h1','Scene Heading',long,{sceneNumber:'123AB'}),P('a1','Action','Rain.'),P('h2','Scene Heading','INT. ROOM - DAY',{sceneNumber:'124AB'}),P('a2','Action','Quiet.')],{sceneNumberPlacement:'both'}));
  const rights=()=>page.locator('.dc-scene-number-right').allInnerTexts();
  assert.deepEqual((await rights()).map(t=>t.trim()),['123AB','124AB'],'both right numbers without the option');
  await page.evaluate(()=>window.__command('ws:scene-numbers-auto-hide'));await pause(300);
  assert.deepEqual((await rights()).map(t=>t.trim()),['124AB'],'the right number that would overlap its heading is hidden');assert.equal(await page.locator('.dc-scene-number-left').count(),2,'left numbers stay');
  assert.equal((await stored()).autoHideRightSceneNumbers,true,'saved in the document');
  await page.evaluate(()=>window.__command('production-pages')).catch(()=>{});await pause(300);
  if(!(await page.getByRole('dialog',{name:'Production Studio'}).count()))await page.evaluate(()=>window.__command('ws:production-pages'));await page.getByRole('dialog',{name:'Production Studio'}).waitFor();
  const box=page.getByRole('checkbox',{name:/Auto-hide right scene numbers/});assert.equal(await box.isChecked(),true,'Production Studio shows the option');await box.uncheck();await pause(300);
  assert.equal((await stored()).autoHideRightSceneNumbers,false);await page.getByRole('button',{name:'Close Production Studio'}).click();await pause(200);
  assert.deepEqual((await rights()).map(t=>t.trim()),['123AB','124AB'],'turned off again');assert.deepEqual(errors,[]);
 });
 await check('Navigator Cast List (#33, item 5): scenes, pages, eighths and screen time per character; sortable, exportable, rows go to the first scene',async()=>{
  await seed();const nav=page.locator('.dc-navigator');await nav.getByRole('tab',{name:'Cast List',exact:true}).click();const table=nav.getByRole('table',{name:'Cast List'});await table.waitFor();
  const names=()=>table.locator('tbody td[data-column="name"]').allInnerTexts(),cell=(n,c)=>table.locator('tbody tr[data-character="'+n+'"] td[data-column="'+c+'"]').innerText();
  assert.deepEqual(await names(),['ANNA','BEN'],'first-appearance order');assert.equal(await cell('ANNA','scenes'),'4');assert.equal(await cell('BEN','scenes'),'3');assert.equal(await cell('ANNA','speeches'),'4');
  assert.match(await cell('ANNA','eighths'),/^(\d+|\d+ \d\/8|\d\/8)$/);assert.match((await cell('ANNA','screen')).trim(),/^\d+:\d\d$/,'screen time m:ss');
  const th=c=>table.locator('thead th').filter({hasText:c}).first();
  await th('Scenes').getByRole('button').click();assert.equal(await th('Scenes').getAttribute('aria-sort'),'descending','numbers sort largest first');assert.deepEqual(await names(),['ANNA','BEN']);
  await th('Scenes').getByRole('button').click();assert.deepEqual(await names(),['BEN','ANNA'],'click again to reverse');
  await th('Character').getByRole('button').click();assert.equal(await th('Character').getAttribute('aria-sort'),'ascending');assert.deepEqual(await names(),['ANNA','BEN']);
  const [download]=await Promise.all([page.waitForEvent('download'),nav.getByRole('button',{name:'Export CSV'}).click()]);const csv=fs.readFileSync(await download.path(),'utf8').split('\n');
  assert.equal(download.suggestedFilename(),'Cast-List.csv');assert.match(csv[0],/^"Character","Scenes","Scene numbers","Pages"/);assert.match(csv[1],/^"ANNA","4","1 2 4 6",/);
  await nav.getByLabel('Filter Navigator').fill('be');await pause(150);assert.deepEqual(await names(),['BEN'],'the Navigator search filters the list');await nav.getByLabel('Filter Navigator').fill('');
  await table.locator('tbody tr[data-character="BEN"]').click();await pause(500);assert.equal(await page.evaluate(()=>document.activeElement.id),'input-h0','a row goes to the first scene');assert.deepEqual(errors,[]);
 });
 await check('emoji (#34, item 1): layout line breaks equal the browser wrapping, no hidden lines; typing, Undo and Backspace keep emoji whole; Beats, ScriptNotes and Outline Editor show them',async()=>{
  const {measureLines}=require('../src/production/layout.ts'),{styleFor,fontStack}=require('../src/formats/model.ts');
  const texts=['She opens the box 🎁 and laughs 😂😂😂 until the lights go out 💡 and the room is dark again 🌑 for a long moment.',
   'Emoji glued to words: wow😀wow wow😀wow wow😀wow wow😀wow wow😀wow wow😀wow wow😀wow wow😀wow wow😀wow wow😀wow wow😀wow.',
   'Family 👨‍👩‍👧‍👦 and flags 🇺🇸🇬🇧🇯🇵🇮🇳 and skin tones 👍🏽👋🏿🙌🏻 and keycaps 1️⃣2️⃣3️⃣ and hearts ❤️‍🔥 repeated 👨‍👩‍👧‍👦👨‍👩‍👧‍👦👨‍👩‍👧‍👦👨‍👩‍👧‍👦 at the end.',
   '😀😁😂🤣😃😄😅😆😉😊😋😎😍😘🥰😗😙😚🙂🤗🤩🤔🤨😐😑😶🙄😏😣😥😮🤐😯😪😫🥱😴😌😛😜😝🤤😒😓😔😕🙃🤑😲☹️🙁😖😞😟😤😢😭😦😧😨😩🤯😬😰😱🥵🥶😳🤪😵🥴😠😡🤬😷🤒🤕🤢🤮',
   'Mixed ✨text✨ with symbols ★ ☆ ♥ ☺ ✔ ✘ → ← and dingbats ✂ ✈ ☎ ⌛ and ©®™ plus “emoji” 🗣️ and a long word supercalifragilistic😀expialidocious next.'];
  const ps=[P('h','Scene Heading','INT. ROOM 🏠 - NIGHT'),...texts.map((t,i)=>P('e'+i,'Action',t)),P('c','Character','ZOË 🤖'),P('d','Dialogue','Hello 👋 there, friend 🙂. We have 🕐 one minute left to decide 🤔 what happens next 🚀🚀.')];
  await seed(doc(ps,{sceneNumberPlacement:'none'}));await page.evaluate(()=>document.fonts.ready);await pause(300);
  const fmt=STANDARD_FORMAT,content=(fmt.page.width-fmt.page.left-fmt.page.right)*72,seg=new Intl.Segmenter(undefined,{granularity:'grapheme'});
  // The layout splits words that contain emoji with the renderer's ICU line breaker (Intl.v8BreakIterator). Node has no
  // such API, so this check gives the layout module the browser's own break positions for those words.
  const emojiWords=[...new Set(ps.flatMap(p=>p.text.match(/[^\s]+/gu)||[]).filter(w=>/[\p{Extended_Pictographic}\p{Regional_Indicator}]/u.test(w)))];
  const icu=await page.evaluate(words=>{const it=new Intl.v8BreakIterator(['en'],{type:'line'});return Object.fromEntries(words.map(w=>{it.adoptText(w);const b=[];let q=it.first();while((q=it.next())!==-1)b.push(q);return [w,b];}));},emojiWords);
  Intl.v8BreakIterator=class{adoptText(t){if(!icu[t])throw Error('no browser breaks for '+t);this.b=icu[t];this.i=0;}first(){return 0;}next(){return this.i<this.b.length?this.b[this.i++]:-1;}};
  for(const p of ps){
   const s=styleFor(fmt,p),width=Math.max(s.size,content-s.left*72-s.right*72),font=`${s.italic?'italic ':''}${s.bold?'700':'400'} ${s.size*96/72}px ${fontStack(s.font)}`;
   const pieces=new Set();for(const t of p.text.match(/[^\S\n]+|\n|[^\s]+/gu)||[]){pieces.add(t);for(const g of seg.segment(t))pieces.add(g.segment);let from=0;for(const to of icu[t]||[]){pieces.add(t.slice(from,to));from=to;}}
   const widths=await page.evaluate(({font,pieces,caps})=>{const c=document.createElement('canvas').getContext('2d');c.font=font;return Object.fromEntries(pieces.map(x=>[x,c.measureText(caps?x.toLocaleUpperCase():x).width*72/96]));},{font,pieces:[...pieces],caps:s.caps});
   const layoutStarts=measureLines(p,s,width,0,p.text.length,t=>widths[t]??(()=>{throw Error('unmeasured '+t)})()).map(l=>l.start);
   // The browser's own wrapping of the same text in the editor's field (a mirror with the field's styles).
   const native=await page.locator('#input-'+p.id).evaluate(t=>{const cs=getComputedStyle(t),m=document.createElement('div');for(const k of ['fontFamily','fontSize','fontWeight','fontStyle','letterSpacing','wordSpacing','textTransform','whiteSpace','wordBreak','overflowWrap','lineHeight','textIndent','tabSize','fontVariantLigatures','fontKerning'])m.style[k]=cs[k];
     m.style.position='absolute';m.style.visibility='hidden';m.style.boxSizing='content-box';m.style.padding='0';m.style.border='0';m.style.width=(t.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight))+'px';m.textContent=t.value;t.parentElement.appendChild(m);
     const node=m.firstChild,r=document.createRange(),starts=[0];let top=null;for(let i=0;i<t.value.length;i++){if(/[\uDC00-\uDFFF]/.test(t.value[i]))continue;r.setStart(node,i);r.setEnd(node,i+1);const rect=[...r.getClientRects()].find(x=>x.width>0);if(!rect)continue;const y=Math.round(rect.top);if(top===null)top=y;else if(y>top+2){starts.push(i);top=y;}}m.remove();
     return {starts,hidden:t.scrollHeight-t.clientHeight};});
   assert.deepEqual(layoutStarts,native.starts,p.id+': layout breaks equal browser wrapping');assert.ok(native.hidden<=2,p.id+': no hidden lines ('+native.hidden+'px)');
  }
  // Typing emoji, one Undo per word, and survival in the saved document.
  const input=page.locator('#input-e0'),toEnd=()=>input.evaluate(e=>{e.focus();e.setSelectionRange(e.value.length,e.value.length);});await toEnd();await page.keyboard.type(' 🎬');await page.keyboard.insertText('👩🏾‍💻');await pause(250);
  assert.ok((await stored()).paragraphs.find(p=>p.id==='e0').text.endsWith(' 🎬👩🏾‍💻'),'typed and inserted emoji are saved');
  await bar().getByRole('button',{name:'Undo',exact:true}).click();await pause(250);assert.ok(!(await stored()).paragraphs.find(p=>p.id==='e0').text.includes('👩🏾‍💻'),'Undo removes the inserted emoji whole (no broken surrogate)');
  assert.ok(!/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/.test((await stored()).paragraphs.find(p=>p.id==='e0').text),'no lone surrogates');
  // Caret movement treats an emoji as one character.
  await toEnd();const beforeBack=await input.inputValue();await input.press('Backspace');await pause(200);assert.equal(await input.inputValue(),beforeBack.slice(0,-'🎬'.length),'Backspace removes the whole emoji');
  // Beats, ScriptNotes and the Outline Editor show emoji as typed.
  await seed(doc([P('h','Scene Heading','INT. ROOM - DAY'),P('a','Action','Rain.',{notes:[{id:'n1',author:'QA',text:'Check the 👀 shot',color:'yellow',createdAt:'2026-01-01T00:00:00Z'}]})],{showScriptNotes:true,beats:[{id:'b1',title:'Midpoint 🔥',description:'Everything changes 💥',act:2,color:'#e57373',tags:[],posX:60,posY:60}],outlineLanes:[{id:'L1',name:'Acts',type:'act',color:'#8fc5b8'}],outlineMarkers:[{id:'M1',laneId:'L1',title:'Heist 💰',description:'',startPage:1,endPage:2,color:'#8fc5b8',kind:'section'}]}));
  assert.ok((await tl().innerText()).includes('Heist 💰'),'Outline Editor element title');
  await page.locator('.dc-navigator').getByRole('tab',{name:/^Notes/}).click();await pause(200);assert.equal(await page.locator('.dc-navigator').getByLabel(/^ScriptNote text/).first().inputValue(),'Check the 👀 shot','ScriptNote text in the Navigator');
  await bar().getByRole('button',{name:'Beat Board',exact:true}).click();await page.locator('.dc-beatboard').waitFor();const values=await page.locator('.dc-beatboard').evaluate(b=>b.innerText+' '+[...b.querySelectorAll('input,textarea')].map(e=>e.value).join(' '));assert.ok(values.includes('Midpoint 🔥')&&values.includes('Everything changes 💥'),'Beat card title and text');
  assert.equal(await page.locator('.dc-beatboard').getByLabel('Beat title').first().inputValue(),'Midpoint 🔥');
  assert.deepEqual(errors,[]);
 });
 await check('Outline Editor nesting and ripple insert (#35, item 2): a parent drag carries its children, ⌥ leaves them, one Undo; ripple insert; nest/unnest; keyboard; saved',async()=>{
  const lanes=[{id:'L1',name:'Acts',type:'act',color:'#8fc5b8'},{id:'L2',name:'Sequences',type:'sequence',color:'#a99be6'},{id:'L3',name:'Beats',type:'custom',color:'#e9b872'}];
  const M=(id,laneId,s,e,extra={})=>({id,laneId,title:id.toUpperCase(),description:'',startPage:s,endPage:e,color:'#9fb8e8',kind:'section',visible:true,anchor:{page:s},...extra});
  const markers=[M('act','L1',1,6),M('seq','L2',2,4,{parentId:'act'}),M('beat','L3',2.5,3,{parentId:'seq'}),M('b2','L3',4,5),M('b3','L3',5,6)];
  await seed(doc(script(),{outlineLanes:lanes,outlineMarkers:markers}));const pw=(await prefs()).timeline?.pageWidth||56;
  const mk=async id=>(await stored()).outlineMarkers.find(m=>m.id===id),pages=async id=>{const m=await mk(id);return [m.startPage,m.endPage];};
  assert.match(await tl().locator('[data-marker-id="beat"]').getAttribute('aria-label'),/inside SEQ/);assert.match(await tl().locator('[data-marker-id="act"]').getAttribute('aria-label'),/1 nested element/);
  // A real pointer drag of the act by two pages moves its sequence and the sequence's beat; the preview shows them moving.
  let box=await tl().locator('[data-marker-id="act"]').boundingBox();await page.mouse.move(box.x+30,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+30+pw,box.y+box.height/2,{steps:4});
  assert.equal(await tl().locator('[data-marker-id="beat"]').getAttribute('data-carried'),'true','children are shown moving with the parent');
  await page.mouse.move(box.x+30+pw*2,box.y+box.height/2,{steps:4});await page.mouse.up();await pause(250);
  assert.deepEqual([await pages('act'),await pages('seq'),await pages('beat'),await pages('b2')],[[3,8],[4,6],[4.5,5],[4,5]],'children moved by the same amount; others stay');
  assert.equal((await mk('seq')).parentId,'act');assert.equal((await mk('beat')).parentId,'seq');
  await tl().focus();await page.keyboard.press('Control+z');await pause(250);assert.deepEqual([await pages('act'),await pages('seq'),await pages('beat')],[[1,6],[2,4],[2.5,3]],'one Undo restores the parent and its children');
  // Option/Alt-drag leaves the children; a child left outside its parent is released.
  box=await tl().locator('[data-marker-id="act"]').boundingBox();await page.keyboard.down('Alt');await page.mouse.move(box.x+30,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+30+pw*3,box.y+box.height/2,{steps:6});await page.mouse.up();await page.keyboard.up('Alt');await pause(250);
  assert.deepEqual([await pages('act'),await pages('seq'),await pages('beat')],[[4,9],[2,4],[2.5,3]],'Alt leaves nested elements in place');assert.equal((await mk('seq')).parentId,undefined,'the sequence is no longer inside the act');
  await tl().focus();await page.keyboard.press('Control+z');await pause(250);assert.equal((await mk('seq')).parentId,'act');
  // Ripple insert: a new beat at page 3.5 (the gap after BEAT) in the Beats lane is one page long, so it pushes b2 (4–5)
  // and b3 (5–6) right by half a page.
  const track=tl().locator('[data-lane-row="L3"] .dc-tl-track'),tb=await track.boundingBox();await track.dblclick({position:{x:pw*2.5+1,y:tb.height/2}});await tl().getByLabel('Outline element title').waitFor();await page.keyboard.type('Inserted');await page.keyboard.press('Enter');await pause(250);
  let d=await stored(),ins=d.outlineMarkers.find(m=>m.title==='Inserted');assert.deepEqual([ins.startPage,ins.endPage],[3.5,4.5]);assert.deepEqual([await pages('b2'),await pages('b3')],[[4.5,5.5],[5.5,6.5]],'following elements pushed right');
  assert.equal(ins.parentId,'seq','a new element joins the element above it');
  // Naming the new element is its own step; the next Undo removes the element and the ripple together.
  await tl().focus();await page.keyboard.press('Control+z');await pause(250);d=await stored();assert.ok(d.outlineMarkers.some(m=>m.id===ins.id&&m.title!=='Inserted'),'first Undo: the name');
  await page.keyboard.press('Control+z');await pause(250);d=await stored();assert.ok(!d.outlineMarkers.some(m=>m.id===ins.id));assert.deepEqual(await pages('b2'),[4,5],'one Undo removes the element and the ripple');
  // Ripple insert can be turned off in the timeline settings.
  await tl().getByRole('button',{name:'Timeline settings'}).click();await page.getByRole('menuitemcheckbox',{name:/Ripple Insert/}).click();assert.equal((await prefs()).timeline.ripple,false);
  await track.dblclick({position:{x:pw*2.5+1,y:tb.height/2}});await tl().getByLabel('Outline element title').waitFor();await page.keyboard.press('Enter');await pause(250);assert.deepEqual(await pages('b2'),[4,5],'no ripple when off');
  await tl().focus();await page.keyboard.press('Control+z');await pause(200);
  // Nest and unnest from the context menu.
  await tl().locator('[data-marker-id="b2"]').click({button:'right'});await page.getByRole('menuitem',{name:'Nest Inside “ACT”'}).click();await pause(200);assert.equal((await mk('b2')).parentId,'act');
  await tl().locator('[data-marker-id="b2"]').click({button:'right'});await page.getByRole('menuitem',{name:'Remove from “ACT”'}).click();await pause(200);assert.equal((await mk('b2')).parentId,undefined);
  // Keyboard: → moves the selected parent and its children by an eighth; ⌥→ moves only the parent.
  await tl().locator('[data-marker-id="seq"]').click();await page.keyboard.press('ArrowRight');await pause(200);assert.deepEqual([await pages('seq'),await pages('beat')],[[2.125,4.125],[2.625,3.125]]);
  await page.keyboard.press('Alt+ArrowRight');await pause(200);assert.deepEqual([await pages('seq'),await pages('beat')],[[2.25,4.25],[2.625,3.125]]);
  await page.reload();await page.locator('.script-page').first().waitFor();await pause(300);assert.equal((await mk('beat')).parentId,'seq','saved with the document');assert.match(await tl().locator('[data-marker-id="beat"]').getAttribute('aria-label'),/inside SEQ/);
  assert.deepEqual(errors,[]);
 });
 await check('Structure Line settings (#28): width, opacity, levels and default colours; reachable from the toolbar, View menu and right-click; saved',async()=>{
  const ps=[P('act1','New Act','ACT ONE'),...script(2),P('act2','New Act','ACT TWO'),...script(2).map(p=>({...p,id:'x'+p.id}))];await seed(doc(ps,{showStructureLines:true}));await pause(300);
  const look=sel=>page.locator(sel).first().evaluate(e=>{const s=getComputedStyle(e);return {w:Math.round(parseFloat(s.width)*100)/100,o:Math.round(parseFloat(s.opacity)*100)/100,bg:s.backgroundColor};});
  let act=await look('.dc-structure-level-0'),scene=await look('.dc-structure-level-3');assert.equal(act.w,3);assert.equal(act.o,.92);assert.equal(scene.w,2);assert.equal(scene.o,.55);
  const textLeft=await page.locator('#input-a0-0').evaluate(e=>e.getBoundingClientRect().left);
  await bar().getByRole('button',{name:'Show/Hide',exact:true}).click();await page.getByRole('menuitem',{name:'Structure Line Settings…'}).click();
  const dlg=page.getByRole('dialog',{name:'Structure Line Settings'});await dlg.waitFor();
  const set=(label,v)=>dlg.getByLabel(label,{exact:true}).evaluate((e,v)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,String(v));e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));},v);
  await set('Line width',6);await set('Line opacity',50);await pause(200);act=await look('.dc-structure-level-0');scene=await look('.dc-structure-level-3');
  assert.deepEqual([act.w,act.o,scene.w,scene.o],[6,.5,4,.3],'width and opacity apply at once (scene lines at 2/3 width and 60 % opacity)');
  assert.equal(await dlg.getByLabel('Line width value').innerText(),'6 px');
  await dlg.getByLabel('Show Scene lines').uncheck();await pause(200);assert.equal(await page.locator('.dc-structure-level-3').count(),0,'a level can be hidden');assert.ok(await page.locator('.dc-structure-level-0').count()>0);
  await set('Act default colour','#ff0000');await pause(200);assert.equal((await look('.dc-structure-level-0')).bg,'rgb(255, 0, 0)','the level default colour replaces the palette');
  assert.equal(await page.locator('#input-a0-0').evaluate(e=>e.getBoundingClientRect().left),textLeft,'settings never move text');
  await dlg.getByRole('button',{name:'Done'}).click();assert.deepEqual((await prefs()).structure,{width:6,opacity:.5,levels:[true,true,true,false],colors:['#ff0000','','','']});
  await page.reload();await page.locator('.script-page').first().waitFor();await pause(300);act=await look('.dc-structure-level-0');assert.deepEqual([act.w,act.o,act.bg],[6,.5,'rgb(255, 0, 0)'],'saved');assert.equal(await page.locator('.dc-structure-level-3').count(),0);
  // Right-click a line; right-click script text (page menu); the native View menu command.
  await page.locator('.dc-structure-level-0').first().click({button:'right'});await dlg.waitFor();await page.keyboard.press('Escape');await pause(200);assert.equal(await dlg.count(),0,'Escape closes');
  const input=page.locator('#input-a1-2');await input.scrollIntoViewIfNeeded();await pause(400);await input.click({button:'right'});await page.getByRole('menu').getByRole('menuitem',{name:'Structure Line Settings…'}).click();await dlg.waitFor();await dlg.getByRole('button',{name:'Done'}).click();
  await page.evaluate(()=>window.__command('ws:structure-settings'));await dlg.waitFor();
  await dlg.getByRole('button',{name:'Use automatic Act colours'}).click();await pause(150);assert.notEqual((await look('.dc-structure-level-0')).bg,'rgb(255, 0, 0)','Automatic returns to the palette');
  await dlg.getByRole('button',{name:'Restore Defaults'}).click();await pause(200);assert.ok(await page.locator('.dc-structure-level-3').count()>0);assert.equal((await look('.dc-structure-level-0')).w,3);
  await dlg.getByLabel('Show Structure Lines in this screenplay').uncheck();await pause(200);assert.equal(await page.locator('.dc-structure-line').count(),0);assert.equal((await stored()).showStructureLines,false,'the per-screenplay switch');
  await dlg.getByRole('button',{name:'Done'}).click();assert.deepEqual((await prefs()).structure,{width:3,opacity:.92,levels:[true,true,true,true],colors:['','','','']});
 });
 await check('toolbar groups (#29): hide and show whole groups from the toolbar menu, Customize and the View menu; saved; no stray gaps',async()=>{
  await seed();const has=n=>bar().getByRole('button',{name:n,exact:true}).count();assert.equal(await has('Save'),1);
  await bar().click({button:'right',position:{x:700,y:20}});const menu=page.getByRole('menu');await menu.waitFor();const group=menu.getByRole('menuitemcheckbox',{name:/Document$/});
  assert.equal(await group.getAttribute('aria-checked'),'true');await group.click();await pause(200);
  for(const n of ['New','Open','Save','Print','Title Page'])assert.equal(await has(n),0,n+' is hidden with its group');assert.equal(await has('Undo'),1,'other groups stay');
  let p=await prefs();assert.deepEqual(p.toolbar.hiddenGroups,['document']);assert.ok(p.toolbar.items.includes('save'),'hidden items keep their places in the arrangement');
  await page.evaluate(()=>window.__command('ws:toolbar-group-edit'));await pause(200);assert.equal(await has('Undo'),0,'View › Toolbar Groups');
  const kinds=await bar().evaluate(b=>[...b.children].filter(c=>!c.classList.contains('dc-wtoolbar-measure')).map(c=>c.dataset.kind||'item'));
  assert.notEqual(kinds[0],'space','no leading gap: '+kinds.join(','));for(let i=1;i<kinds.length;i++)assert.ok(!(kinds[i]==='space'&&kinds[i-1]==='space'),'no double gap: '+kinds.join(','));
  await page.evaluate(()=>window.__command('ws:customize'));const sheet=page.getByRole('dialog',{name:'Customize Toolbar',exact:true});await sheet.waitFor();
  const box=sheet.getByLabel('Show the Document group in the toolbar');assert.equal(await box.isChecked(),false);await box.check();await pause(150);assert.equal(await has('Save'),1);
  await sheet.getByLabel('Show the Workspace group in the toolbar').uncheck();await pause(150);assert.equal(await has('Navigator'),0);await sheet.getByRole('button',{name:'Done',exact:true}).click();
  p=await prefs();assert.deepEqual([...p.toolbar.hiddenGroups].sort(),['edit','workspace']);
  await page.reload();await page.locator('.script-page').first().waitFor();assert.equal(await has('Navigator'),0,'saved');assert.equal(await has('Save'),1);
  await page.evaluate(()=>window.__command('ws:customize'));await sheet.getByRole('button',{name:'Reset to Default',exact:true}).click();await sheet.getByRole('button',{name:'Done',exact:true}).click();
  assert.deepEqual((await prefs()).toolbar.hiddenGroups,[]);assert.equal(await has('Navigator'),1);assert.equal(await has('Undo'),1);
 });
 await check('long scripts: after a change that moves every page, fragments on far pages show the right lines (deferred positioning)',async()=>{
  const ps=[P('h','Scene Heading','INT. ROOM - DAY'),P('t','Action','She waits'),...Array.from({length:700},(_,i)=>P('u'+i,'Action','A precise visual action crosses the room as the distant traffic fades. '.repeat(4)))];
  await seed(doc(ps));const t=page.locator('#input-t');await t.click();await t.evaluate(e=>e.setSelectionRange(e.value.length,e.value.length));
  for(let i=0;i<3;i++){await page.keyboard.press('Enter');await page.keyboard.insertText('He waits');await pause(150);}await pause(400);
  // Only pages near the viewport are drawn (content-visibility); their fragments must be scrolled to their own first line,
  // which is the height of the same paragraph's earlier fragments.
  const verify=()=>page.evaluate(()=>{const vh=innerHeight;let checked=0;const bad=[];for(const input of document.querySelectorAll('textarea[data-editor-paragraph]')){const start=+input.dataset.fragmentStart;if(!start)continue;const r=input.closest('.script-page').getBoundingClientRect();if(r.bottom<0||r.top>vh)continue;
   const id=input.dataset.editorParagraph,expected=[...document.querySelectorAll('textarea[data-editor-paragraph="'+id+'"]')].filter(v=>+v.dataset.fragmentStart<start).reduce((sum,v)=>sum+parseFloat(v.style.height)*4/3,0);checked++;if(Math.abs(input.scrollTop-expected)>1.5)bad.push([id,start,input.scrollTop,expected]);}return {checked,bad};});
  for(const at of [.45,.999]){await page.evaluate(f=>{const s=document.querySelector('.dc-editor-workspace');s.scrollTop=f*(s.scrollHeight-s.clientHeight);},at);for(let i=0;i<4;i++)await page.evaluate(()=>new Promise(r=>requestAnimationFrame(r)));await pause(300);
   const v=await verify();assert.ok(v.checked>0,'split fragments are visible at '+at);assert.deepEqual(v.bad,[],'fragments show their own lines at '+at);}
  assert.ok(await page.locator('.script-page').count()>60,'a long script');
 });
 await check('Beat Board: undo/redo for edits, keyboard copy/paste/delete, context menu, filter, arrange by act',async()=>{
  const beats=[{id:'b1',title:'Opening',description:'Calm.',act:1,color:'#3b82f6',tags:[],posX:100,posY:100},{id:'b2',title:'Midpoint',description:'Twist.',act:2,color:'#ec4899',tags:[],posX:500,posY:300},{id:'b3',title:'Climax',description:'Fight.',act:4,color:'#f59e0b',tags:[],posX:900,posY:100}];
  await seed(doc(script(),{beats}));await bar().getByRole('button',{name:'Beat Board',exact:true}).click();const board=page.locator('.dc-beatboard');await board.waitFor();
  await page.locator('[data-beat-id="b2"]').locator('.dc-beat-meta').click({position:{x:4,y:4}});await page.keyboard.press('Delete');let d=await stored();assert.equal(d.beats.length,2);
  await page.keyboard.press('Control+z');d=await stored();assert.equal(d.beats.length,3,'undo restores a deleted beat');await page.keyboard.press('Control+Shift+z');d=await stored();assert.equal(d.beats.length,2,'redo');await page.keyboard.press('Control+z');
  await page.locator('[data-beat-id="b1"]').locator('.dc-beat-meta').click({position:{x:4,y:4}});await page.keyboard.press('Control+c');await page.keyboard.press('Control+v');d=await stored();assert.equal(d.beats.length,4);
  await page.locator('[data-beat-id="b3"]').locator('.dc-beat-meta').click({button:'right',position:{x:4,y:4}});await page.getByRole('menuitem',{name:'Duplicate'}).click();d=await stored();assert.equal(d.beats.length,5);
  await page.getByLabel('Filter beats').fill('twist');await pause(200);assert.equal(await page.locator('.dc-beat-card[data-filtered]').count(),4);await page.getByLabel('Filter beats').fill('');
  await page.getByRole('button',{name:'Arrange by Act',exact:true}).click();d=await stored();const y=Object.fromEntries(d.beats.map(b=>[b.id,b.posY]));assert.ok(y.b1<y.b2&&y.b2<y.b3,'one row per act');
  await page.locator('[data-beat-id="b2"]').locator('.dc-beat-meta').click({button:'right',position:{x:4,y:4}});await page.getByRole('menuitem',{name:'Place on Timeline'}).click();d=await stored();assert.ok(d.outlineMarkers.some(m=>m.beatId==='b2'),'a beat can be placed on the timeline');
 });
 await check('Beat Board (#36, item 9): a real drag saves once and is one Undo step; Arrange by Sequence; saved views; nesting badges; keyboard moves',async()=>{
  const B=(id,title,act,x,y)=>({id,title,description:'',act,color:'#3b82f6',tags:[],posX:x,posY:y});
  const beats=[B('sa','SEQ A',1,100,600),B('sb','SEQ B',2,400,600),B('b1','Opening',1,700,100),B('b2','Turn',2,100,100),B('b3','Setup',1,400,100),B('b4','Loose idea',3,1000,100)];
  const lanes=[{id:'L1',name:'Acts',type:'act',color:'#8fc5b8'},{id:'L2',name:'Sequences',type:'sequence',color:'#a99be6'},{id:'L3',name:'Beats',type:'custom',color:'#e9b872'}];
  const M=(id,laneId,s,e,beatId,extra={})=>({id,laneId,title:'',description:'',startPage:s,endPage:e,color:'#9fb8e8',beatId,kind:'section',visible:true,anchor:{page:s},...extra});
  const markers=[M('msa','L2',1,3,'sa'),M('msb','L2',3,5,'sb'),M('m1','L3',1.5,2,'b1'),M('m2','L3',3.5,4,'b2',{parentId:'msa'}),M('m3','L3',2,2.5,'b3')];
  await seed(doc(script(),{beats,outlineLanes:lanes,outlineMarkers:markers}));await bar().getByRole('button',{name:'Beat Board',exact:true}).click();await page.locator('.dc-beatboard').waitFor();
  const pos=async id=>{const b=(await stored()).beats.find(b=>b.id===id);return [b.posX,b.posY];};
  // A real drag: nothing is saved while the card moves; one save when it is dropped; one Undo puts it back.
  await page.evaluate(k=>{window.__saves=0;const set=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key===k)window.__saves++;return set.call(this,key,value);};},KEY);
  const card=page.locator('[data-beat-id="b4"] .dc-beat-meta'),cb=await card.boundingBox();await page.mouse.move(cb.x+4,cb.y+4);await page.mouse.down();
  for(let i=1;i<=12;i++)await page.mouse.move(cb.x+4+i*10,cb.y+4+i*5);await pause(700);
  assert.equal(await page.evaluate(()=>window.__saves),0,'no document save while dragging');assert.deepEqual(await pos('b4'),[1000,100],'the document is unchanged during the drag');
  const shown=await page.locator('[data-beat-id="b4"]').evaluate(e=>parseFloat(e.style.left));assert.ok(shown>=1100,'the card follows the pointer ('+shown+')');
  await page.mouse.up();await pause(400);const moved=await pos('b4');assert.ok(moved[0]>=1100&&moved[1]>100,'dropped position saved: '+moved);const saves=await page.evaluate(()=>window.__saves);assert.ok(saves>=1&&saves<=2,'saved once on drop ('+saves+')');
  await page.locator('.dc-beatboard').focus();await page.keyboard.press('Control+z');await pause(250);assert.deepEqual(await pos('b4'),[1000,100],'one Undo restores the drag');await page.keyboard.press('Control+Shift+z');await pause(250);assert.deepEqual(await pos('b4'),moved,'Redo');
  // Escape during a drag cancels it.
  const cb2=await page.locator('[data-beat-id="b3"] .dc-beat-meta').boundingBox();await page.mouse.move(cb2.x+4,cb2.y+4);await page.mouse.down();await page.mouse.move(cb2.x+80,cb2.y+60,{steps:5});await page.keyboard.press('Escape');await page.mouse.up();await pause(250);assert.deepEqual(await pos('b3'),[400,100],'Escape cancels a drag');
  // Nesting shows on the cards; Arrange by Sequence puts each sequence in its own row in story order.
  assert.match(await page.locator('[data-beat-id="b2"] .dc-beat-parent').innerText(),/SEQ A/,'nested beat shows its parent');
  await page.getByRole('button',{name:'Arrange by Sequence',exact:true}).click();await pause(250);let d=await stored();const at=Object.fromEntries(d.beats.map(b=>[b.id,[b.posX,b.posY]]));
  assert.deepEqual(['sa','b1','b3','b2'].map(id=>at[id][1]),Array(4).fill(at.sa[1]),'sequence A row: its card, then its beats');assert.ok(at.sa[0]<at.b1[0]&&at.b1[0]<at.b3[0]&&at.b3[0]<at.b2[0],'story order inside the row (nesting puts Turn in A)');
  assert.ok(at.sb[1]>at.sa[1]&&at.b4[1]>at.sb[1],'then sequence B, then beats in no sequence');
  // Saved views: save, change the board, show the view again, rename, survive a reload, delete.
  await page.getByRole('button',{name:/^Board Views/}).click();const views=page.getByRole('dialog',{name:'Beat Board views'});await views.getByLabel('New view name').fill('By sequence');await views.getByRole('button',{name:'Save Current View'}).click();await pause(200);
  d=await stored();assert.equal(d.beatBoardViews.length,1);assert.deepEqual(d.beatBoardViews[0].positions.b2,{x:at.b2[0],y:at.b2[1]});
  await page.keyboard.press('Escape');await page.getByRole('button',{name:'Arrange by Act',exact:true}).click();await pause(200);assert.notDeepEqual(await pos('b2'),at.b2);
  await page.getByRole('button',{name:/^Board Views/}).click();await views.getByRole('button',{name:'Show view By sequence'}).click();await pause(250);assert.deepEqual(await pos('b2'),at.b2,'showing the view restores the arrangement');
  await page.locator('.dc-beatboard').focus();await page.keyboard.press('Control+z');await pause(200);assert.notDeepEqual(await pos('b2'),at.b2,'showing a view is one Undo step');await page.keyboard.press('Control+Shift+z');await pause(200);
  await page.getByRole('button',{name:/^Board Views/}).click();await views.getByRole('button',{name:'Rename view By sequence'}).click();const nameField=views.getByLabel('View name',{exact:true});await nameField.fill('Sequences');await nameField.press('Enter');await pause(200);
  assert.equal((await stored()).beatBoardViews[0].name,'Sequences');await page.keyboard.press('Escape');
  await page.reload();await page.locator('.script-page, .dc-beatboard').first().waitFor();if(!(await page.locator('.dc-beatboard').count()))await bar().getByRole('button',{name:'Beat Board',exact:true}).click();await page.locator('.dc-beatboard').waitFor();
  await page.getByRole('button',{name:/^Board Views \(1\)/}).click();await page.getByRole('dialog',{name:'Beat Board views'}).getByRole('button',{name:'Delete view Sequences'}).click();await pause(200);assert.deepEqual((await stored()).beatBoardViews,[],'deleted');await page.keyboard.press('Escape');
  // Keyboard: arrows move the selected card by a grid step (Shift: five steps); each move is one Undo step.
  await page.locator('[data-beat-id="b1"] .dc-beat-meta').click({position:{x:4,y:4}});const p0=await pos('b1');await page.keyboard.press('ArrowRight');await page.keyboard.press('Shift+ArrowDown');await pause(200);
  assert.deepEqual(await pos('b1'),[p0[0]+20,p0[1]+100]);await page.keyboard.press('Control+z');await pause(200);assert.deepEqual(await pos('b1'),[p0[0]+20,p0[1]]);
  await page.keyboard.press(']');await pause(100);assert.match(await page.locator('.dc-beatboard [role=status]').innerText(),/^Selected “/,'] selects the next card');
  await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'Beat title','Enter edits the selected card');
  assert.deepEqual(errors,[]);
 });
 await check('accessibility (#37, item 13): element names on script fields, ⌃⇧. announces the element number, in-place element changes announced; keyboard use of Navigator tabs, timeline and Beat Board',async()=>{
  const ps=script(3).map(p=>p.id==='h2'?{...p,sceneNumber:'3A'}:p);ps.push(P('end','Action',''));await seed(doc(ps));
  assert.ok(await page.getByRole('textbox',{name:'Dialogue',exact:true}).count()>=3,'dialogue fields are named Dialogue');assert.equal(await page.getByRole('textbox',{name:'Scene Heading, scene 3A',exact:true}).count(),1,'numbered headings include the scene number');
  const status=page.locator('#dc-screen-reader-status');assert.equal(await status.getAttribute('role'),'status');
  await page.locator('#input-d1').click();await page.keyboard.press('Control+Shift+Period');await pause(150);const index=ps.findIndex(p=>p.id==='d1')+1;
  const label=await page.locator('#input-d1').evaluate(e=>e.closest('.script-page')?.dataset.pageLabel);assert.ok(label);
  assert.equal((await status.innerText()).trim(),'Element '+index+' of '+ps.length+': Dialogue, page '+label+', scene 2','⌃⇧. reads the element number, page and scene');
  await page.evaluate(()=>window.__command('ws:announce-element'));await pause(150);assert.match(await status.innerText(),/^Element \d+ of \d+: Dialogue/,'View › Announce Element Number');
  await page.locator('#input-end').click();await page.keyboard.press('Tab');await pause(250);assert.equal((await stored()).paragraphs.at(-1).type,'Character');assert.equal((await status.innerText()).trim(),'Character','an element changed in place is announced');
  assert.equal(await page.locator('#input-end').getAttribute('aria-label'),'Character','and the field is renamed');
  // Navigator tabs: a tab list operated with the arrow keys.
  const tabs=page.getByRole('tablist',{name:'Navigator tabs'});await tabs.getByRole('tab',{name:/^Scenes/}).focus();assert.equal(await tabs.getByRole('tab',{name:/^Scenes/}).getAttribute('aria-selected'),'true');
  await page.keyboard.press('ArrowRight');await pause(150);assert.equal(await tabs.getByRole('tab',{name:/^Cast \(/}).getAttribute('aria-selected'),'true','→ shows the next tab');assert.match(await page.evaluate(()=>document.activeElement.textContent),/^Cast \(/,'and focuses it');
  await page.keyboard.press('ArrowRight');await pause(150);assert.ok(await page.getByRole('table',{name:'Cast List'}).count(),'the Cast List panel is shown');
  await page.keyboard.press('End');await pause(150);assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-selected')),'true');await page.keyboard.press('Home');await pause(150);assert.match(await page.evaluate(()=>document.activeElement.textContent),/^Scenes/);
  // Timeline by keyboard: lane options → New Element at the Caret, name it, Home selects, arrows move, ⇧F10 opens its menu.
  await page.locator('#input-a1-2').click();await tl().getByRole('button',{name:'Options for Outline 3 (Beats)'}).focus();await page.keyboard.press('Enter');const item=page.getByRole('menuitem',{name:'New Element at the Caret'});await item.focus();await page.keyboard.press('Enter');
  await tl().getByLabel('Outline element title').waitFor();await page.keyboard.type('Keyboard beat');await page.keyboard.press('Enter');await pause(250);let d=await stored(),m=d.outlineMarkers.find(x=>x.title==='Keyboard beat');assert.ok(m,'created from the keyboard');
  await page.keyboard.press('Home');await pause(150);assert.equal(await page.evaluate(()=>document.activeElement.dataset.markerId),m.id,'Home selects the first element');const before=m.startPage;await page.keyboard.press('ArrowRight');await pause(200);assert.equal((await stored()).outlineMarkers.find(x=>x.id===m.id).startPage,before+.125,'→ moves it');
  await page.keyboard.press('Shift+F10');await page.getByRole('menu').waitFor();assert.ok(await page.getByRole('menuitem',{name:'Rename'}).count(),'⇧F10 opens the element menu');await page.keyboard.press('Escape');
  // Beat Board by keyboard: Escape from a card field returns to the board; arrows move the card; the context-menu key opens its menu.
  await bar().getByRole('button',{name:'Beat Board',exact:true}).click();await page.locator('.dc-beatboard').waitFor();const title=page.locator('[data-beat-id="'+m.beatId+'"]').getByLabel('Beat title');await title.focus();await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>document.activeElement.classList.contains('dc-beatboard')),true,'Escape returns to the board');const p0=(await stored()).beats.find(b=>b.id===m.beatId);await page.keyboard.press('ArrowDown');await pause(200);assert.equal((await stored()).beats.find(b=>b.id===m.beatId).posY,p0.posY+20);
  await page.keyboard.press('Shift+F10');await page.getByRole('menu').waitFor();assert.ok(await page.getByRole('menuitem',{name:'Duplicate'}).count(),'the card menu opens from the keyboard');await page.keyboard.press('Escape');
  assert.deepEqual(errors,[]);
 });
 await check('right-to-left text (#38, item 12): Hebrew and Arabic fields run right to left, wrap where the layout breaks them, keep caret and selection native; English is unchanged',async()=>{
  const {measureLines}=require('../src/production/layout.ts'),{styleFor,fontStack}=require('../src/formats/model.ts');
  const he='דנה פותחת את החלון ומביטה ברחוב הריק, ואז היא נזכרת במכתב שהשאירה על השולחן בבוקר. היא חוזרת פנימה בשקט.',ar='تفتح دانة النافذة وتنظر إلى الشارع الفارغ، ثم تتذكر الرسالة التي تركتها على الطاولة في الصباح. تعود إلى الداخل بهدوء.';
  const ps=[P('h','Scene Heading','INT. APARTMENT - NIGHT'),P('he','Action',he+' '+he),P('c','Character','דנה'),P('ar','Dialogue',ar),P('mix','Action','She reads: “שלום” and smiles at the 2 words, then leaves.'),P('en','Action','An ordinary English line that is long enough to wrap onto a second line of the page here.')];
  await seed(doc(ps,{sceneNumberPlacement:'none'}));await page.evaluate(()=>document.fonts.ready);await pause(300);
  const dir=id=>page.locator('#input-'+id).evaluate(e=>[getComputedStyle(e).direction,getComputedStyle(e).textAlign]);
  assert.deepEqual(await dir('he'),['rtl','start']);assert.deepEqual(await dir('ar'),['rtl','start']);assert.deepEqual(await dir('c'),['rtl','start'],'a Hebrew cue too');assert.deepEqual(await dir('en'),['ltr','start']);assert.deepEqual(await dir('mix'),['ltr','start'],'the first strong character decides');
  const fmt=STANDARD_FORMAT,content=(fmt.page.width-fmt.page.left-fmt.page.right)*72;
  for(const p of ps){const s=styleFor(fmt,p),width=Math.max(s.size,content-s.left*72-s.right*72),font=`${s.italic?'italic ':''}${s.bold?'700':'400'} ${s.size*96/72}px ${fontStack(s.font)}`;
   const pieces=[...new Set(p.text.match(/[^\S\n]+|\n|[^\s]+/gu)||[])];const widths=await page.evaluate(({font,pieces,caps})=>{const c=document.createElement('canvas').getContext('2d');c.font=font;return Object.fromEntries(pieces.map(x=>[x,c.measureText(caps?x.toLocaleUpperCase():x).width*72/96]));},{font,pieces,caps:s.caps});
   const layoutStarts=measureLines(p,s,width,0,p.text.length,t=>widths[t]).map(l=>l.start);
   const native=await page.locator('#input-'+p.id).evaluate(t=>{const cs=getComputedStyle(t),m=document.createElement('div');for(const k of ['fontFamily','fontSize','fontWeight','fontStyle','letterSpacing','wordSpacing','textTransform','whiteSpace','wordBreak','overflowWrap','lineHeight','textIndent','tabSize','direction','unicodeBidi','textAlign'])m.style[k]=cs[k];
     m.style.position='absolute';m.style.visibility='hidden';m.style.padding='0';m.style.border='0';m.style.width=(t.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight))+'px';m.textContent=t.value;t.parentElement.appendChild(m);
     const node=m.firstChild,r=document.createRange(),starts=[0];let top=null;for(let i=0;i<t.value.length;i++){r.setStart(node,i);r.setEnd(node,i+1);const rect=[...r.getClientRects()].find(x=>x.width>0);if(!rect)continue;const y=Math.round(rect.top);if(top===null)top=y;else if(y>top+2){starts.push(i);top=y;}}m.remove();return {starts,hidden:t.scrollHeight-t.clientHeight};});
   assert.deepEqual(layoutStarts,native.starts,p.id+': layout breaks equal the browser wrapping');assert.ok(native.hidden<=2,p.id+': no hidden lines');}
  // The text sits at the right edge of the column; the custom caret steps aside for the native one.
  await page.locator('#input-ar').click();await pause(250);assert.equal(await page.locator('.dc-smooth-caret').evaluateAll(es=>es.filter(e=>e.style.display!=='none').length),0,'native caret for right-to-left text');
  // Selection and typing: replace a selected Hebrew word, add Arabic text; the document keeps logical order.
  const input=page.locator('#input-he'),word='החלון',at=he.indexOf(word);await input.evaluate((e,[a,b])=>{e.focus();e.setSelectionRange(a,b);},[at,at+word.length]);await page.keyboard.insertText('הדלת');await pause(250);
  let d=await stored();assert.ok(d.paragraphs.find(p=>p.id==='he').text.startsWith('דנה פותחת את הדלת ומביטה'),'selected word replaced');
  await page.locator('#input-ar').evaluate(e=>{e.focus();e.setSelectionRange(e.value.length,e.value.length);});await page.keyboard.insertText(' شكرا');await pause(250);d=await stored();assert.ok(d.paragraphs.find(p=>p.id==='ar').text.endsWith('بهدوء. شكرا'));
  await bar().getByRole('button',{name:'Undo',exact:true}).click();await pause(250);assert.ok((await stored()).paragraphs.find(p=>p.id==='ar').text.endsWith('بهدوء.'),'Undo');
  assert.deepEqual(errors,[]);
 });
 await check('Next/Previous Bookmark go forward and back from the caret and wrap (R-05)',async()=>{
  const bm=(id,name)=>({id:'bm-'+id,name,color:'#3b82f6'});
  await seed(doc(script().map(p=>['a1-0','a3-0','a5-0'].includes(p.id)?{...p,bookmark:bm(p.id,'Mark '+p.id)}:p)));
  const at=()=>page.evaluate(()=>document.activeElement.id);await page.locator('#input-a2-0').click();
  for(const [cmd,want] of [['next','input-a3-0'],['next','input-a5-0'],['next','input-a1-0'],['prev','input-a5-0'],['prev','input-a3-0']]){await page.evaluate(c=>window.__command('ws:bookmark-'+c),cmd);await pause(350);assert.equal(await at(),want,cmd);}
  await pause(2300);await page.evaluate(()=>window.__command('ws:bookmark-next'));await pause(350);assert.equal(await at(),'input-a5-0','still from the caret after the highlight fades');
 });
 await check('native menu commands reach the workspace and menu state follows',async()=>{
  await seed();for(const id of ['view-normal','view-page','timeline','timeline','navigator','navigator','toggle-outline','toggle-outline','paragraph-controls','paragraph-controls','header-footer']){await page.evaluate(c=>window.__command('ws:'+c),id);await pause(120);}
  await page.getByRole('dialog').first().waitFor();assert.deepEqual(errors,[]);
 });
 await check('Phase 9 #6 right-click on script text: page and text actions plus styles, notes and the element, applied to the clicked text',async()=>{
  await seed();const input=page.locator('#input-a1-2');await input.scrollIntoViewIfNeeded();await pause(400);/* a scroll that is still running closes the menu, as it should */await input.click({button:'right'});const menu=page.getByRole('menu');await menu.waitFor();
  for(const name of ['Copy Page','Paste Text at Caret','Insert ScriptNote…','Insert Bookmark…'])assert.equal(await menu.getByRole('menuitem',{name,exact:true}).count(),1,name);
  assert.equal(await menu.getByRole('menuitem',{name:'Copy Selected Text',exact:true}).isDisabled(),true,'nothing selected: copy is off');
  await menu.getByRole('menuitem',{name:'Element ▸'}).click();assert.equal(await menu.getByRole('menuitemradio',{name:/Action$/}).getAttribute('aria-checked'),'true','the current element is checked');
  await menu.getByRole('menuitemradio',{name:/^Character$/}).click();await pause(400);assert.equal((await stored()).paragraphs.find(p=>p.id==='a1-2').type,'Character');assert.equal(await page.evaluate(()=>document.activeElement.id),'input-a1-2','focus returns to the text');
  await page.keyboard.press('Control+z');await pause(300);assert.equal((await stored()).paragraphs.find(p=>p.id==='a1-2').type,'Action','the change is one Undo step');
  const target=page.locator('#input-a0-1');await target.evaluate(e=>{e.scrollIntoView({block:'center'});e.focus();e.setSelectionRange(0,4);});await pause(200);let box=await target.boundingBox();
  await page.mouse.click(box.x+12,box.y+8,{button:'right'});await menu.waitFor();if(await target.evaluate(e=>e.selectionEnd-e.selectionStart)!==4){await page.keyboard.press('Escape');await target.evaluate(e=>{e.focus();e.setSelectionRange(0,4);});await target.dispatchEvent('contextmenu');await menu.waitFor();}
  await menu.getByRole('menuitemcheckbox',{name:/Bold$/}).click();await pause(400);assert.deepEqual((await stored()).paragraphs.find(p=>p.id==='a0-1').runs?.[0],{text:'Line',style:{bold:true}});
  await target.evaluate(e=>{e.focus();e.setSelectionRange(0,4);});await page.mouse.click(box.x+12,box.y+8,{button:'right'});await menu.waitFor();await page.keyboard.press('Escape');await pause(200);assert.equal(await menu.count(),0);assert.equal(await page.evaluate(()=>document.activeElement.id),'input-a0-1','Escape returns to the text');
  await page.mouse.click(box.x+12,box.y+8,{button:'right'});await menu.getByRole('menuitem',{name:'Insert ScriptNote…',exact:true}).click();await page.getByRole('dialog').first().waitFor();
  assert.deepEqual(errors,[]);
 });
 await check('Phase 9 #11 panels stay aligned: Navigator 220–640 px, windows 1024–1920 px, while dragging the divider',async()=>{
  for(const [w,h,nav] of [[1024,700,220],[1440,900,300],[1920,1080,640],[1024,700,640]]){
   await seed(undefined,{navigator:{open:true,width:nav}},{width:w,height:h});await pause(400);
   const m=await page.evaluate(()=>{const column=e=>{let f=e.parentElement;while(f&&getComputedStyle(f).display==='contents')f=f.parentElement;return f;};const a=document.querySelector('.dc-navigator'),f=column(a).getBoundingClientRect(),r=a.getBoundingClientRect(),ed=document.querySelector('.dc-editor-workspace').getBoundingClientRect(),tabs=[...a.querySelectorAll('.dc-nav-tabs button')].map(b=>b.getBoundingClientRect()),bar=document.querySelector('.dc-wtoolbar'),barRect=bar.getBoundingClientRect(),clipped=[...bar.querySelectorAll('button,select')].filter(e=>!e.closest('.dc-wtoolbar-measure')&&e.getClientRects().length).filter(e=>e.getBoundingClientRect().right>barRect.right+1).map(e=>e.getAttribute('aria-label')||e.textContent),foot=document.querySelector('.dc-tl-footer');
     return {frame:[f.left,f.right],aside:[r.left,r.right,a.scrollWidth,a.clientWidth],editor:ed.left,tabsInside:tabs.every(t=>t.left>=r.left-1&&t.right<=r.right+1),clipped,foot:foot?[foot.scrollWidth,foot.clientWidth]:null,page:document.documentElement.scrollWidth,vw:innerWidth};});
   const at=w+'×'+h+' nav '+nav+': '+JSON.stringify(m);
   assert.ok(Math.abs(m.aside[1]-m.frame[1])<=1.5&&m.aside[2]<=m.aside[3]+1,'Navigator fills its column without spilling: '+at);assert.ok(m.editor>=m.frame[1]-1,'editor starts after the Navigator: '+at);assert.ok(m.tabsInside,'every Navigator tab is visible: '+at);
   assert.deepEqual(m.clipped,[],'no toolbar control is cut off: '+at);assert.ok(!m.foot||m.foot[0]<=m.foot[1]+1,'timeline controls fit: '+at);assert.ok(m.page<=m.vw,'no horizontal page scroll: '+at);
  }
  await seed(undefined,{navigator:{open:true,width:300}});const handle=page.getByRole('separator',{name:'Resize Navigator'}),hb=await handle.boundingBox();await page.mouse.move(hb.x+2,hb.y+300);await page.mouse.down();
  for(const dx of [60,140,-40]){await page.mouse.move(hb.x+2+dx,hb.y+300,{steps:3});await pause(60);const d=await page.evaluate(()=>{const column=e=>{let f=e.parentElement;while(f&&getComputedStyle(f).display==='contents')f=f.parentElement;return f;};const a=document.querySelector('.dc-navigator'),f=column(a).getBoundingClientRect();return {gap:document.querySelector('.dc-editor-workspace').getBoundingClientRect().left-f.right,spill:a.getBoundingClientRect().right-f.right};});assert.ok(d.gap>=-1&&d.spill<=1.5,'during the drag: '+JSON.stringify(d));}
  await page.mouse.up();
 });
 await check('Phase 9 #4 the floating element hint never covers the line being written',async()=>{
  await seed(undefined,undefined,{width:1280,height:760});const last=page.locator('#input-d5');await last.click();await last.evaluate(e=>e.setSelectionRange(e.value.length,e.value.length));await page.keyboard.press('Enter');await page.keyboard.press('Enter');await pause(200);
  await page.keyboard.type('CLOSE ON THE CLOC',{delay:10});
  await page.evaluate(()=>{const s=document.querySelector('.dc-editor-workspace'),a=document.activeElement.getBoundingClientRect();s.scrollTop-=(innerHeight-52)-a.bottom;});await page.keyboard.type('K',{delay:10});await pause(500);
  const hint=page.locator('.dc-element-hint');assert.equal(await hint.count(),1,'the hint appears for a camera direction');
  const r=await page.evaluate(()=>{const c=document.querySelector('.dc-element-hint').getBoundingClientRect(),a=document.activeElement.getBoundingClientRect();return {c:[c.top,c.bottom,c.left,c.right],a:[a.top,a.bottom,a.left,a.right]};});
  const overlap=r.a[1]>r.c[0]&&r.a[0]<r.c[1]&&r.a[3]>r.c[2]&&r.a[2]<r.c[3];assert.ok(!overlap,'hint and line overlap: '+JSON.stringify(r));
 });
 await check('#39 Help › Getting Started is searchable and Idea to Draft opens a tutorial project on the Beat Board (1.17 items 16–17)',async()=>{
  await seed();await page.evaluate(()=>window.__command('getting-started'));const guide=page.getByRole('dialog',{name:'Getting Started'});await guide.waitFor();
  const search=guide.getByRole('searchbox',{name:'Search Getting Started'});assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'Search Getting Started','search has focus');
  const nav=guide.getByRole('navigation',{name:'Getting Started sections'}),total=await nav.getByRole('button').count();assert.ok(total>=20,'guide and reference sections: '+total);
  await search.fill('cast list csv');await pause(150);const hits=await nav.getByRole('button').allInnerTexts();assert.ok(hits.length>=1&&hits.length<total,'filtered: '+hits.join(' | '));assert.match(hits[0],/Navigator/,'best match first');
  assert.match(await guide.getByRole('status').innerText(),new RegExp('^'+hits.length+' section'));assert.ok(await guide.locator('mark').count()>=3,'matches highlighted');
  await search.fill('keyboard shortcuts');await pause(150);assert.ok((await nav.getByRole('button').allInnerTexts()).some(t=>/^Keyboard Shortcuts$/i.test(t)),'the shipped reference is searchable too');
  await search.fill('zzqqxx');await pause(150);assert.equal(await nav.getByRole('button').count(),0);assert.match(await guide.innerText(),/No sections match/);
  await search.fill('idea to draft');await pause(150);await search.press('Enter');await pause(200);assert.equal(await page.evaluate(()=>document.activeElement.dataset.guideSection),'idea-to-draft','Return shows the first result');
  await page.keyboard.press('Escape');await pause(300);assert.equal(await guide.count(),0,'Escape closes the guide');
  await page.evaluate(()=>window.__command('getting-started'));await guide.waitFor();await guide.getByRole('searchbox').fill('idea to draft');await guide.getByRole('button',{name:'Start Feature Screenplay'}).click();await pause(800);
  assert.equal(await guide.count(),0,'the guide closes');const d=await stored();assert.equal(d.titlePage.title,'IDEA TO DRAFT — FEATURE');assert.equal(d.appliedTemplateId,'standard-feature-screenplay');
  assert.equal(d.beats.length,16);assert.equal(d.flowLines.length,15);assert.equal(d.outlineMarkers.filter(m=>m.beatId).length,7,'one outline section per structure card');
  await page.waitForFunction(()=>[...document.querySelectorAll('[data-beat-id] input')].some(i=>i.value==='1 · Logline'&&i.offsetParent),null,{timeout:5000});assert.equal(await page.locator('[data-beat-id]').count(),16,'the Beat Board shows the step cards');
  await page.evaluate(()=>window.__command('idea-to-draft-stage'));await pause(800);const s=await stored();assert.equal(s.titlePage.title,'IDEA TO DRAFT — PLAY');assert.equal(s.writingFormat.kind,'stageplay');assert.equal(s.paragraphs[1].type,'Stage Direction');
  assert.deepEqual(errors,[]);
 });
 await check('#40 emoji picker (1.18): toolbar, menu and right-click open it; search, keyboard, insert at the caret as one Undo step, Shift-click keeps it open, recently used, Beat Board fields',async()=>{
  await seed();const text=async id=>(await stored()).paragraphs.find(p=>p.id===id).text,area=page.locator('#input-a1-0');
  const before=await text('a1-0');await area.click();await area.evaluate(e=>e.setSelectionRange(4,4));
  await bar().getByRole('button',{name:'Emoji',exact:true}).click();const picker=page.getByRole('dialog',{name:'Emoji',exact:true});await picker.waitFor();
  assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'Search emoji','search has focus');
  assert.ok(await picker.locator('.dc-emoji-cell').count()>1000,'all categories are listed');
  await page.keyboard.type('laugh');await pause(150);assert.match(await picker.getByRole('status').innerText(),/emoji/);assert.equal(await picker.locator('.dc-emoji-cell').first().getAttribute('data-emoji'),'😂','best match first');
  await page.keyboard.press('ArrowDown');assert.equal(await page.evaluate(()=>document.activeElement.dataset.emoji),'😂');await page.keyboard.press('Enter');await pause(400);
  assert.equal(await picker.count(),0,'a plain choice closes the picker');assert.equal(await page.evaluate(()=>document.activeElement.id),'input-a1-0','focus returns to the script');
  assert.equal(await text('a1-0'),before.slice(0,4)+'😂'+before.slice(4),'inserted at the caret');
  await bar().getByRole('button',{name:'Undo',exact:true}).click();await pause(300);assert.equal(await text('a1-0'),before,'one Undo removes it');
  // Keyboard grid, recently used, Shift-click keeps it open, Escape returns to the field.
  await area.click();await area.evaluate(e=>e.setSelectionRange(0,0));await page.evaluate(()=>window.__command('ws:emoji'));await picker.waitFor();
  assert.equal(await picker.locator('.dc-emoji-section').first().innerText(),'RECENTLY USED');assert.equal(await picker.locator('.dc-emoji-cell').first().getAttribute('data-emoji'),'😂');
  await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>document.activeElement.dataset.emojiIndex),'1','arrow keys move through the grid');
  for(let i=0;i<8;i++)await page.keyboard.press('Tab');assert.ok(await page.evaluate(()=>!!document.activeElement.closest('.dc-emoji-picker')),'Tab stays inside the picker');
  await picker.getByRole('searchbox').fill('clapper');await picker.locator('[data-emoji="🎬"]').click({modifiers:['Shift']});await picker.getByRole('searchbox').fill('rain');await picker.locator('.dc-emoji-cell').first().click({modifiers:['Shift']});
  assert.equal(await picker.count(),1,'Shift-click keeps the picker open');const rain=await picker.locator('.dc-emoji-cell').first().getAttribute('data-emoji');
  await page.keyboard.press('Escape');await pause(300);assert.equal(await picker.count(),0);assert.equal(await page.evaluate(()=>document.activeElement.id),'input-a1-0');
  assert.ok((await text('a1-0')).startsWith('🎬'+rain+before.slice(0,4)),'both inserted in order at the caret: '+(await text('a1-0')).slice(0,12));
  // Right-click › Insert Emoji… uses the clicked position.
  const target=page.locator('#input-a2-0');await target.scrollIntoViewIfNeeded();await pause(300);const box=await target.boundingBox();await page.mouse.click(box.x+8,box.y+6);await target.evaluate(e=>e.setSelectionRange(0,0));
  await page.mouse.click(box.x+8,box.y+6,{button:'right'});const menu=page.getByRole('menu');await menu.waitFor();const offset=await target.evaluate(e=>e.selectionStart);
  await menu.getByRole('menuitem',{name:'Insert Emoji…',exact:true}).click();await picker.waitFor();await picker.getByRole('searchbox').fill('fire');await picker.locator('[data-emoji="🔥"]').click();await pause(400);
  const a2=await text('a2-0');assert.equal(a2.indexOf('🔥'),offset,'inserted where the menu was opened');
  // Other text fields: a Beat Board card title.
  await page.evaluate(()=>window.__command('ws:beat-board'));await pause(400);await page.getByRole('button',{name:'New Beat'}).first().click();await pause(300);
  const title=page.locator('[data-beat-id] input').first();await title.click();await title.evaluate(e=>e.setSelectionRange(e.value.length,e.value.length));await page.evaluate(()=>window.__command('ws:emoji'));await picker.waitFor();
  await picker.getByRole('searchbox').fill('rocket');await picker.locator('[data-emoji="🚀"]').click();await pause(400);assert.ok((await stored()).beats.some(b=>b.title.endsWith('🚀')),'inserted into the beat title');
  assert.deepEqual(errors,[]);
 });
 await check('#41 Start Window (1.18): create, open, recent projects by id, missing files, filter, keyboard, Continue, Learn and the show-at-launch setting',async()=>{
  await seed();const now=new Date().toISOString();
  await page.evaluate(now=>{const calls=window.__startCalls=[];let recent=[{id:'aaaaaaaaaaaaaaaa',title:'THE HEIST',name:'Heist.draftcraft',folder:'/Users/someone/Scripts',openedAt:now,modifiedAt:now,exists:true,kind:'draftcraft'},{id:'bbbbbbbbbbbbbbbb',title:'OLD DRAFT',name:'Old.fdx',folder:'/Users/someone/Archive',openedAt:'2025-02-01T10:00:00Z',modifiedAt:null,exists:false,kind:'fdx'}];
   window.draftcraftDesktop.openProject=async()=>({opened:false});window.draftcraftDesktop.startWindow={info:async()=>({showAtLaunch:true,recent,version:'1.18.0'}),setShowAtLaunch:async v=>{calls.push(['show',v]);return{showAtLaunch:v};},openRecent:async id=>{calls.push(['open',id]);return{requestId:'req-1'};},removeRecent:async id=>{calls.push(['remove',id]);recent=recent.filter(r=>r.id!==id);return recent;},clearRecent:async()=>{calls.push(['clear']);recent=[];return recent;},revealRecent:async id=>{calls.push(['reveal',id]);return true;}};},now);
  const open=async()=>{await page.evaluate(()=>window.__command('start-window'));const d=page.getByRole('dialog',{name:/Welcome to DraftCraft Pro/});await d.waitFor();await pause(250);return d;};
  let win=await open();assert.match(await win.innerText(),/1\.18\.0/);assert.equal(await page.evaluate(()=>document.activeElement.textContent.includes('New Screenplay')),true,'focus starts on New Screenplay');
  const rows=win.getByRole('list',{name:'Recent projects'}).locator('[data-recent-open]');assert.equal(await rows.count(),2);
  assert.match(await rows.nth(0).getAttribute('aria-label'),/THE HEIST, Heist\.draftcraft, in ~\/Scripts, opened Today/);assert.match(await rows.nth(1).innerText(),/Missing/);
  await rows.nth(0).focus();await page.keyboard.press('ArrowDown');assert.match(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),/^OLD DRAFT/,'arrow keys move through the list');
  await page.keyboard.press('Enter');await pause(200);assert.match(await win.innerText(),/no longer where it was/,'a missing project is explained, not opened');
  await win.getByRole('searchbox',{name:'Filter recent projects'}).fill('heist');assert.equal(await rows.count(),1);await win.getByRole('searchbox',{name:'Filter recent projects'}).fill('');
  await win.getByRole('button',{name:'Remove “OLD DRAFT” from the list'}).click();await pause(200);assert.equal(await rows.count(),1);
  await win.getByRole('button',{name:'Show “THE HEIST” in Finder'}).click();await rows.nth(0).click();await pause(300);
  assert.deepEqual(await page.evaluate(()=>window.__startCalls),[['remove','bbbbbbbbbbbbbbbb'],['reveal','aaaaaaaaaaaaaaaa'],['open','aaaaaaaaaaaaaaaa']],'recent projects are addressed by id only');
  await win.getByRole('checkbox',{name:'Show this window when DraftCraft Pro opens'}).uncheck();await pause(150);assert.deepEqual((await page.evaluate(()=>window.__startCalls)).at(-1),['show',false]);
  await page.keyboard.press('Escape');await pause(400);assert.equal(await win.count(),0,'Escape continues with the current document');assert.equal((await stored()).id,'workspace-qa');
  win=await open();await win.getByRole('button',{name:'Continue with “WORKSPACE QA”'}).click();await pause(300);assert.equal(await win.count(),0);
  win=await open();await win.getByRole('button',{name:'New Television Pilot (One-hour drama)'}).click();await pause(800);assert.equal(await win.count(),0,'it closes once the new project is open');
  let d=await stored();assert.equal(d.appliedTemplateId,'television-pilot');assert.notEqual(d.id,'workspace-qa');
  win=await open();await win.getByRole('button',{name:"What's New"}).click();const guide=page.getByRole('dialog',{name:'Getting Started'});await guide.waitFor();assert.equal(await guide.getByRole('searchbox').inputValue(),"What's New In 1.18.0");
  assert.match((await guide.getByRole('navigation').getByRole('button').allInnerTexts())[0],/What's New In 1\.18\.0/i);await page.keyboard.press('Escape');await pause(300);
  win=await open();await win.getByRole('button',{name:'Idea to Draft: Stage Play'}).click();await pause(800);assert.equal((await stored()).titlePage.title,'IDEA TO DRAFT — PLAY');assert.equal(await win.count(),0);
  win=await open();await win.getByRole('button',{name:'New Screenplay'}).click();await pause(800);d=await stored();assert.equal(d.writingFormat.kind,'screenplay');assert.equal(d.beats.length,0);
  assert.deepEqual(errors,[]);
 });
 await browser.close();server.close();
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));
 const failed=results.filter(r=>!r.passed);console.log(`\n${results.length-failed.length} passed, ${failed.length} failed`);if(errors.length)console.log('PAGE ERRORS',errors.slice(0,5).join(' | '));
 process.exit(failed.length||errors.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
