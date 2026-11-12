// Worst-case re-pagination probe (1.16.1): a 223-page script of identical Action paragraphs, where Return near the
// start moves the page break of every later page (no page can be reused). Measures the Return key handler and the
// time to the second frame, twelve times. PROFILE=1 prints a CPU profile; LINES=1 shows Structure Lines.
// Usage: DRAFTCRAFT_DIST=<stage>/app/dist BROWSER_EXE=<chromium> node --import tsx verification/performance-repagination-browser.cjs
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {DEFAULT_WRITING_SETTINGS}=require('../src/writing/model.ts'),{STANDARD_FORMAT}=require('../src/formats/catalog.ts');
const dist=process.env.DRAFTCRAFT_DIST,pause=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://l'),f=path.join(dist,u.pathname==='/'?'index.html':decodeURIComponent(u.pathname));if(!f.startsWith(dist)||!fs.existsSync(f)){res.writeHead(404);res.end();return;}res.writeHead(200,{'content-type':{'.js':'application/javascript','.css':'text/css','.html':'text/html','.wasm':'application/wasm','.woff2':'font/woff2'}[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXE,args:['--no-sandbox']});
 const paragraphs=[{id:'h',type:'Scene Heading',text:'INT. ROOM - DAY'},{id:'target',type:'Action',text:'She waits'},...Array.from({length:1994},(_,i)=>({id:'large-'+i,type:'Action',text:'A precise visual action crosses the room as the distant traffic fades. '.repeat(4)}))];
 const doc={id:'worst',titlePage:{title:'W',author:'',draftDate:'',contact:'',copyright:''},paragraphs,beats:[],flowLines:[],outlineLanes:[],outlineMarkers:[],characterHighlights:{},showStructureLines:!!process.env.LINES,showBookmarks:false,showScriptNotes:false,showSceneComments:false,writingFormat:structuredClone(STANDARD_FORMAT),currentRevision:'White',productionMode:false,lockedPages:false,sceneNumberPlacement:'none'};
 const ctx=await browser.newContext({viewport:{width:1440,height:900}}),page=await ctx.newPage();
 await page.addInitScript(({doc,settings})=>{if(!sessionStorage.getItem('s')){localStorage.clear();localStorage.setItem('draftcraft_screenplay_doc_v1',JSON.stringify(doc));localStorage.setItem('draftcraft_writing_assistance_v1',JSON.stringify(settings));sessionStorage.setItem('s','1');}window.draftcraftDesktop={windowAction:()=>{},nativeHistory:async()=>true,onCommand:cb=>{window.__command=cb;return()=>{}},readClipboard:async()=>({text:''}),writeClipboard:async()=>true,runtime:{platform:'darwin',arch:'arm64',electron:'test'}};},{doc,settings:{...DEFAULT_WRITING_SETTINGS,autocorrect:false}});
 await page.goto(origin);await page.locator('.script-page').first().waitFor({timeout:120000});await pause(1500);
 const el=page.locator('#input-target');await el.click();await el.evaluate(e=>e.setSelectionRange(e.value.length,e.value.length));
 await page.evaluate(()=>{let start=0;window.__h=[];window.__f=[];document.addEventListener('keydown',e=>{if(e.key==='Enter')start=performance.now()},true);window.addEventListener('keydown',e=>{if(e.key==='Enter'){const s=start;window.__h.push(performance.now()-s);requestAnimationFrame(()=>requestAnimationFrame(()=>window.__f.push(performance.now()-s)));}})});
 const cdp=await ctx.newCDPSession(page);if(process.env.PROFILE){await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:200});await cdp.send('Profiler.start');}
 for(let i=0;i<12;i++){await page.keyboard.insertText('He waits');await pause(100);await page.keyboard.press('Enter');await pause(500);}
 if(process.env.PROFILE){const {profile}=await cdp.send('Profiler.stop');const byId=new Map(profile.nodes.map(n=>[n.id,n])),parent=new Map();for(const n of profile.nodes)for(const c of n.children||[])parent.set(c,n.id);const dt=(profile.endTime-profile.startTime)/profile.samples.length/1000,counts=new Map();for(const x of profile.samples)counts.set(x,(counts.get(x)||0)+1);const incl=new Map(),self=new Map();
  for(const [id,c] of counts){const f0=byId.get(id).callFrame,k0=(f0.functionName||'(anon)')+' :'+(f0.lineNumber+1);self.set(k0,(self.get(k0)||0)+c*dt);let cur=id;const seen=new Set();while(cur!==undefined){const f=byId.get(cur).callFrame,k=(f.functionName||'(anon)')+' :'+(f.lineNumber+1);if(!seen.has(k)){seen.add(k);incl.set(k,(incl.get(k)||0)+c*dt);}cur=parent.get(cur);}}
  console.log('INCL',JSON.stringify([...incl].sort((a,b)=>b[1]-a[1]).slice(0,90).map(([k,v])=>[k,Math.round(v)])));console.log('SELF',JSON.stringify([...self].sort((a,b)=>b[1]-a[1]).slice(0,40).map(([k,v])=>[k,Math.round(v)])));}
 const r=await page.evaluate(()=>({h:window.__h,f:window.__f,pages:document.querySelectorAll('.script-page').length}));const pct=(a,p)=>{const s=[...a].sort((x,y)=>x-y);return Math.round(s[Math.min(s.length-1,Math.floor(p/100*s.length))]);};
 console.log('WORST',JSON.stringify({pages:r.pages,handler:{p50:pct(r.h,50),p95:pct(r.h,95)},frames:{p50:pct(r.f,50),p95:pct(r.f,95)}}));
 await browser.close();server.close();
})().catch(e=>{console.error(e);process.exit(1);});
