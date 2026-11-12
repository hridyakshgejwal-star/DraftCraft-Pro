// Audit probe: renders every page-layout template with its supported elements in the built renderer and reports, per
// element, where the text actually sits on the page (inches from the paper edge), the gap above it (points) and the
// line pitch, next to the values the template defines. Writes format-geometry-results/geometry.json.
// Usage: DRAFTCRAFT_DIST=<dist> BROWSER_EXE=<chrome> node --import tsx verification/format-geometry-probe.cjs [template name filter]
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {FORMAT_TEMPLATES}=require('../src/formats/catalog.ts'),{paragraphGap,styleFor}=require('../src/formats/model.ts'),{DEFAULT_WRITING_SETTINGS}=require('../src/writing/model.ts');
const dist=path.resolve(process.env.DRAFTCRAFT_DIST),key='draftcraft_screenplay_doc_v1',filter=process.argv[2]||'';
const texts={'Scene Heading':'INT. STATION - NIGHT','Action':'Rain taps the window. A traveler sets down a worn suitcase and studies the departure board for a long moment.','Character':'ALEX','Parenthetical':'(quietly)','Dialogue':'There is still time to change our plans, if we leave before the last train goes.','Transition':'CUT TO:','Shot':'CLOSE ON THE CLOCK','General':'General text.','Centered Text':'THE END','Lyrics':'One more mile along the line','New Act':'ACT ONE','End of Act':'END OF ACT ONE','Scene Summary':'Alex waits.','Cast List':'ALEX — a traveler.','Stage Direction':'(Alex looks up.)','Song Title':'THE ROAD HOME','Comic Page':'PAGE 1','Panel':'PANEL 1','Panel Description':'A traveler stands under the station clock.','Caption':'The last departure.','Sound Effect':'CLACK','Narration':'It was late.','Note':'A note.','Sequence':'SEQUENCE A','Outline Level 1':'Part One','Outline Level 2':'Chapter','Outline Level 3':'Beat'};
const order=['New Act','Scene Heading','Action','Character','Parenthetical','Dialogue','Shot','Action','Transition','Scene Heading','Stage Direction','Character','Dialogue','Song Title','Lyrics','Comic Page','Panel','Panel Description','Caption','Character','Dialogue','Sound Effect','Narration','Centered Text','End of Act'];
(async()=>{
 const server=http.createServer((req,res)=>{const p=decodeURIComponent(new URL(req.url,'http://l').pathname),file=path.join(dist,p==='/'?'index.html':p);if(!file.startsWith(dist+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end()}res.setHeader('content-type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');fs.createReadStream(file).pipe(res)});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXE,headless:true,args:['--no-sandbox']});
 const report=[];
 for(const t of FORMAT_TEMPLATES.filter(t=>!['Structure'].includes(t.category)&&t.name.includes(filter))){
  const f=t.format,types=order.filter(e=>f.supported.includes(e));
  const paragraphs=types.map((type,i)=>({id:'g'+i,type,text:texts[type]||type}));
  const doc={id:'geometry-'+t.id,titlePage:{title:'GEOMETRY',author:'QA',draftDate:'',contact:'',copyright:''},paragraphs,beats:[],flowLines:[],outlineLanes:[],outlineMarkers:[],characterHighlights:{},showStructureLines:false,showBookmarks:false,showScriptNotes:false,showSceneComments:false,writingFormat:f};
  const ctx=await browser.newContext({viewport:{width:1600,height:1200},deviceScaleFactor:1});const page=await ctx.newPage();
  await page.addInitScript(({doc,key,settings})=>{if(!sessionStorage.getItem('seeded')){localStorage.clear();localStorage.setItem(key,JSON.stringify(doc));localStorage.setItem('draftcraft_writing_assistance_v1',JSON.stringify(settings));sessionStorage.setItem('seeded','1')}window.draftcraftDesktop={windowAction:()=>{},onCommand:()=>()=>{},nativeHistory:async()=>true,readClipboard:async()=>({text:'',html:''}),writeClipboard:async()=>true,saveProject:async()=>({saved:true}),autosaveProject:async()=>({saved:true}),finishClose:async()=>({closed:false})};},{doc,key,settings:{...DEFAULT_WRITING_SETTINGS,autocorrect:false,leftClickSuggestions:false}});
  await page.goto(origin);await page.locator('.script-page').first().waitFor();await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(400);
  const measured=await page.evaluate(ids=>ids.map(id=>{const t=document.getElementById('input-'+id);if(!t)return null;const pageEl=t.closest('.script-page'),pr=pageEl.getBoundingClientRect(),r=t.getBoundingClientRect(),cs=getComputedStyle(t);
   // Text extent of the first line: measure with a canvas in the textarea's own font.
   const c=document.createElement('canvas').getContext('2d');c.font=cs.fontStyle+' '+cs.fontWeight+' '+cs.fontSize+' '+cs.fontFamily;const text=cs.textTransform==='uppercase'?t.value.toUpperCase():t.value;const lineHeight=parseFloat(cs.lineHeight);const lines=Math.round(r.height/lineHeight);
   const first=text.split('\n')[0],w=Math.min(c.measureText(first).width,r.width),indent=parseFloat(cs.textIndent)||0;
   const textLeft=cs.textAlign==='right'?r.right-w:cs.textAlign==='center'?r.left+(r.width-w)/2:r.left+indent;
   return {page:pageEl.dataset.page||null,pageTop:pr.top,pageLeft:pr.left,pageWidth:pr.width,boxLeft:r.left-pr.left,boxRight:pr.right-r.right,textLeft:textLeft-pr.left,textRight:pr.right-(textLeft+w),top:r.top-pr.top,bottom:r.bottom-pr.top,lineHeight,lines,font:cs.fontFamily,fontSize:cs.fontSize,align:cs.textAlign,caps:cs.textTransform,renderedFont:document.fonts.check(cs.fontSize+' '+cs.fontFamily)};}),paragraphs.map(p=>p.id));
  const rows=[];let prev=null;
  for(const [i,p] of paragraphs.entries()){const m=measured[i];if(!m){rows.push({type:p.type,missing:true});continue;}const s=styleFor(f,p),inch=96;
   const expectLeft=f.page.left+s.left,expectRight=f.page.right+s.right;
   const samePage=prev&&prev.m&&Math.abs(prev.m.pageTop-m.pageTop)<1;
   const gapPt=samePage?(m.top-prev.m.bottom)*0.75:null,expectGap=samePage?paragraphGap(prev.p,p,f,false):null;
   rows.push({type:p.type,align:s.align,boxLeftIn:+(m.boxLeft/inch).toFixed(3),expectLeftIn:expectLeft,boxRightIn:+(m.boxRight/inch).toFixed(3),expectRightIn:expectRight,textLeftIn:+(m.textLeft/inch).toFixed(3),textRightIn:+(m.textRight/inch).toFixed(3),gapPt:gapPt===null?null:+gapPt.toFixed(1),expectGapPt:expectGap,linePt:+(m.lineHeight*0.75).toFixed(2),expectLinePt:s.line,lines:m.lines,font:m.font,fontSize:m.fontSize,caps:m.caps,expectCaps:s.caps});
   prev={p,m};}
  const issues=[];for(const r of rows){if(r.missing){issues.push(r.type+': not rendered');continue;}
   if(Math.abs(r.boxLeftIn-r.expectLeftIn)>0.02)issues.push(`${r.type}: left ${r.boxLeftIn}in, template ${r.expectLeftIn}in`);
   if(Math.abs(r.boxRightIn-r.expectRightIn)>0.02)issues.push(`${r.type}: right margin ${r.boxRightIn}in, template ${r.expectRightIn}in`);
   if(r.gapPt!==null&&Math.abs(r.gapPt-r.expectGapPt)>1.5)issues.push(`${r.type}: gap ${r.gapPt}pt, template ${r.expectGapPt}pt`);
   if(Math.abs(r.linePt-r.expectLinePt)>0.3)issues.push(`${r.type}: line ${r.linePt}pt, template ${r.expectLinePt}pt`);
   if((r.caps==='uppercase')!==r.expectCaps)issues.push(`${r.type}: caps ${r.caps}, template ${r.expectCaps}`);}
  report.push({template:t.name,kind:f.kind,page:f.page,rows,issues});
  console.log((issues.length?'ISSUES ':'OK     ')+t.name+(issues.length?'\n   '+issues.join('\n   '):''));
  await ctx.close();
 }
 const out=path.join(__dirname,'format-geometry-results');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'geometry.json'),JSON.stringify(report,null,1));
 await browser.close();server.close();
})().catch(e=>{console.error(e);process.exit(1)});
