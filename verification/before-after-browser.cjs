// Before/after sample: the same keystrokes typed into a new screenplay (File > New, the build's own default format) in two
// built renderers. Saves a screenshot of the first page and the resulting element list for each build.
// Usage: BUILDS="1.15.3=<dist>,1.15.4=<dist>" OUT=<dir> BROWSER_EXE=<chrome> node --import tsx verification/before-after-browser.cjs
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {DEFAULT_WRITING_SETTINGS}=require('../src/writing/model.ts');
const builds=(process.env.BUILDS||'').split(',').filter(Boolean).map(b=>b.split('=')),out=path.resolve(process.env.OUT||'before-after');fs.mkdirSync(out,{recursive:true});
const KEY='draftcraft_screenplay_doc_v1',pause=ms=>new Promise(r=>setTimeout(r,ms));
// Keystrokes: [text to type, key to press afterwards]. Text is typed as the writer would (lower case where a writer would).
const STEPS=[['ext/int. dock - night','Enter'],['Waves slap the pilings. A lantern swings over the water.','Enter'],['ANGLE ON SARAH','Enter'],['','Tab'],['sarah','Enter'],['','Tab'],['barely audible, turning away from the window toward the door','Enter'],['We should go before the tide turns.','Enter'],['fade out','Enter']];
function serve(dist){return new Promise(r=>{const s=http.createServer((req,res)=>{const p=decodeURIComponent(new URL(req.url,'http://l').pathname),file=path.join(dist,p==='/'?'index.html':p);if(!file.startsWith(path.resolve(dist)+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end()}res.setHeader('content-type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');fs.createReadStream(file).pipe(res)});s.listen(0,'127.0.0.1',()=>r(s));});}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXE,headless:true,args:['--no-sandbox']});const summary={steps:STEPS,builds:{}};
 for(const [label,dist] of builds){
  const server=await serve(dist),origin='http://127.0.0.1:'+server.address().port;
  const context=await browser.newContext({viewport:{width:1400,height:1300},deviceScaleFactor:1});const page=await context.newPage();page.on('dialog',d=>d.accept());
  // Start from an empty untitled script (not the bundled sample), then File > New so the build assigns its own default format.
  const empty={id:'before-after-seed',titlePage:{title:'',author:'',draftDate:'',contact:'',copyright:''},paragraphs:[{id:'seed',type:'Action',text:''}],beats:[],flowLines:[],outlineLanes:[],outlineMarkers:[],characterHighlights:{}};
  await page.addInitScript(({settings,empty,key})=>{if(!sessionStorage.getItem('seeded')){localStorage.clear();localStorage.setItem(key,JSON.stringify(empty));localStorage.setItem('draftcraft_writing_assistance_v1',JSON.stringify(settings));sessionStorage.setItem('seeded','1')}window.draftcraftDesktop={windowAction:()=>{},onCommand:cb=>{window.__nativeCommand=cb;return()=>{}},nativeHistory:async()=>true,readClipboard:async()=>({text:'',html:''}),writeClipboard:async()=>true,saveProject:async()=>({saved:true}),autosaveProject:async()=>({saved:true}),finishClose:async()=>({closed:false})};},{settings:{...DEFAULT_WRITING_SETTINGS,autocorrect:false,leftClickSuggestions:false},empty,key:KEY});
  await page.goto(origin);await page.locator('.script-page').first().waitFor();await page.evaluate(()=>window.__nativeCommand('new'));await pause(1200);
  const fresh=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);if(fresh.paragraphs.length!==1||fresh.paragraphs[0].text)throw Error(label+': File > New did not give an empty script');
  const first=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).paragraphs[0].id,KEY);
  await page.locator('#input-'+first).evaluate(e=>{e.focus();e.setSelectionRange(e.value.length,e.value.length)});
  const chips=[];
  for(const [text,key] of STEPS){if(text){await page.keyboard.type(text,{delay:8});await pause(150);}const chip=page.locator('.dc-element-suggestion');chips.push(await chip.count()?(await chip.innerText()).replace(/\s+/g,' '):'');if(text&&key==='Enter'&&chips.at(-1))await page.screenshot({path:path.join(out,label+'-suggestion-'+chips.length+'.png'),clip:await page.locator('.script-page').first().boundingBox().then(b=>({x:b.x,y:b.y,width:b.width,height:Math.min(b.height,520)}))});await page.keyboard.press(key);await pause(200);}
  await pause(500);const d=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
  await page.locator('.script-page').first().screenshot({path:path.join(out,label+'-page1.png')});
  const wf=d.writingFormat||null;// a build may keep a new script's default format implicit (not stored)
  summary.builds[label]={writingFormat:wf,format:wf?{templateVersion:wf.templateVersion,transitionPunctuation:wf.transitionPunctuation,parentheticalRightIn:wf.page.right+wf.elements.Parenthetical.right}:'app default (not stored with the document)',suggestionsShownBeforeEachKey:chips,paragraphs:d.paragraphs.map(p=>({type:p.type,text:p.text}))};
  console.log(label,JSON.stringify(summary.builds[label].paragraphs));
  await context.close();server.close();
 }
 fs.writeFileSync(path.join(out,'before-after.json'),JSON.stringify(summary,null,1));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
