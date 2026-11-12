const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http');
const {DEFAULT_WRITING_SETTINGS}=require('../src/writing/model.ts'),{STANDARD_FORMAT}=require('../src/formats/catalog.ts');
const dist=process.env.DIST,KEY='draftcraft_screenplay_doc_v1',pause=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const s=http.createServer((req,res)=>{const p=decodeURIComponent(new URL(req.url,'http://l').pathname),f=path.join(dist,p==='/'?'index.html':p);if(!fs.existsSync(f)){res.writeHead(404);return res.end()}res.setHeader('content-type',f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':'text/html');fs.createReadStream(f).pipe(res)});await new Promise(r=>s.listen(0,r));
 const b=await chromium.launch({executablePath:process.env.BROWSER_EXE,args:['--no-sandbox']});
 for(const [w,h] of [[1400,1000],[1024,768],[820,1000]]){
 const ctx=await b.newContext({viewport:{width:w,height:h}}),page=await ctx.newPage();
 const d={id:'c',titlePage:{title:'C',author:'',draftDate:'',contact:'',copyright:''},paragraphs:[{id:'h',type:'Scene Heading',text:'INT. ROOM - DAY'},{id:'a',type:'Action',text:''},{id:'z',type:'Action',text:'A later paragraph.'}],beats:[],flowLines:[],outlineLanes:[],outlineMarkers:[],characterHighlights:{},writingFormat:structuredClone(STANDARD_FORMAT)};
 await page.addInitScript(({d,key,settings})=>{if(!sessionStorage.getItem('s')){localStorage.clear();localStorage.setItem(key,JSON.stringify(d));localStorage.setItem('draftcraft_writing_assistance_v1',JSON.stringify(settings));sessionStorage.setItem('s','1')}window.draftcraftDesktop={windowAction:()=>{},onCommand:cb=>()=>{},nativeHistory:async()=>true,readClipboard:async()=>({text:'',html:''}),writeClipboard:async()=>true,finishClose:async()=>({closed:false})};},{d,key:KEY,settings:{...DEFAULT_WRITING_SETTINGS}});
 await page.goto('http://127.0.0.1:'+s.address().port);await page.locator('.script-page').first().waitFor();await pause(1200);
 const where=()=>page.evaluate(()=>{const z=document.getElementById('input-z').getBoundingClientRect(),a=document.getElementById('input-a').getBoundingClientRect();const tb=document.querySelector('.dc-formatting-slot');return {z:Math.round(z.top),a:Math.round(a.top),slot:tb?Math.round(tb.getBoundingClientRect().height):null};});
 await page.locator('#input-a').click();await pause(400);const w0=await where();
 await page.keyboard.type('ANGLE ON SARAH',{delay:20});await pause(400);const w1=await where();const chip=await page.locator('.dc-element-suggestion').count();
 await page.keyboard.press('Escape');await page.keyboard.press('End');await page.keyboard.type(' quietly waits.',{delay:20});await pause(400);const w2=await where();
 console.log(w+'x'+h,'focus',JSON.stringify(w0),'chip',chip,JSON.stringify(w1),'after',JSON.stringify(w2));await ctx.close();}
 await b.close();s.close();})().catch(e=>{console.error(e);process.exit(1)});
