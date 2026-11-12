'use strict';
// Native self-test (1.17; the Start Window, recent projects and emoji picker steps are 1.18). Runs ONLY when both DRAFTCRAFT_TEST_PROFILE (an isolated, disposable profile) and
// DRAFTCRAFT_SELF_TEST (the JSON report path) are set, which a normal launch never does. It checks, on the Mac itself,
// what a Linux build cannot: the window and its tabs, full screen, menu check marks, the system spellchecker, installed
// voices, the Speech helper, the accessibility labels and live region, the Getting Started window, and Return latency
// in a 250-page script using real input events. It writes the report step by step and quits without saving anything.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawn}=require('node:child_process');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const once=(emitter,name,ms)=>new Promise(r=>{const t=setTimeout(()=>r(false),ms);emitter.once(name,()=>{clearTimeout(t);r(true);});});
const pct=(a,p)=>{if(!a.length)return null;const s=[...a].sort((x,y)=>x-y);return Math.round(s[Math.min(s.length-1,Math.floor(p/100*s.length))]);};

// Deterministic screenplays in Fountain: a mixed, dialogue-heavy script and the uniform worst case used by
// verification/performance-scale-browser.cjs (every page full of splittable action).
function realisticFountain(paragraphs=5400){let seed=7;const rnd=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648;};const pick=a=>a[Math.floor(rnd()*a.length)];
 const words='the a door window light rain he she they walks turns looks waits slowly quietly kitchen street car phone night morning hand table chair glass coffee letter gun money road sky old young tired angry'.split(' ');
 const sentence=n=>{const w=Array.from({length:n},()=>pick(words));w[0]=w[0][0].toUpperCase()+w[0].slice(1);return w.join(' ')+'.';};
 const names=['ANNA','BEN','CLARA','DETECTIVE MORRIS','JO'],out=[];let count=0;
 while(count<paragraphs){out.push(pick(['INT. ','EXT. '])+pick(['KITCHEN','STREET','OFFICE','CAR','ROOFTOP'])+' - '+pick(['DAY','NIGHT','CONTINUOUS']),'');count++;
  const blocks=2+Math.floor(rnd()*6);for(let b=0;b<blocks;b++){if(rnd()<0.35){out.push(Array.from({length:1+Math.floor(rnd()*3)},()=>sentence(6+Math.floor(rnd()*10))).join(' '),'');count++;}
   else{const speeches=2+Math.floor(rnd()*5);for(let s=0;s<speeches;s++){out.push(pick(names));count++;if(rnd()<0.2){out.push('(quietly)');count++;}out.push(Array.from({length:1+Math.floor(rnd()*3)},()=>sentence(4+Math.floor(rnd()*9))).join(' '),'');count++;}}}
  if(rnd()<0.15){out.push('CUT TO:','');count++;}}
 return out.join('\n');}
function uniformFountain(scenes=582){const out=[];for(let n=0;n<scenes;n++){out.push('INT. KITCHEN - NIGHT','');for(let j=0;j<4;j++)out.push('He watched the window and waited for the next train to arrive at the platform. '.repeat(2).trim(),'');out.push(n%2?'ANNA':'BEN','Speech number '+n+' that is spoken here.','');}return out.join('\n');}

async function runSelfTest({app,BrowserWindow,Menu,window:first,newDocumentTab,tableRead,findHelper,recentProjects,out}){
 const dir=path.dirname(out),report={version:app.getVersion(),started:new Date().toISOString(),checks:{}};
 const write=()=>{try{fs.writeFileSync(out,JSON.stringify(report,null,2));}catch{}};
 const step=async(name,fn)=>{const t=Date.now();try{report.checks[name]={ok:true,...(await fn()||{})};}catch(e){report.checks[name]={ok:false,error:String(e&&e.stack||e).slice(0,800)};}report.checks[name].ms=Date.now()-t;write();};
 const js=(win,code)=>win.webContents.executeJavaScript(code,true);
 const send=(win,command,file)=>win.webContents.send('desktop:command',command,file);
 const key=(win,keyCode,modifiers=[])=>{win.webContents.sendInputEvent({type:'keyDown',keyCode,modifiers});if(keyCode.length===1||keyCode==='Return'||keyCode==='Enter')win.webContents.sendInputEvent({type:'char',keyCode:keyCode==='Return'||keyCode==='Enter'?'\r':keyCode,modifiers});win.webContents.sendInputEvent({type:'keyUp',keyCode,modifiers});};
 const typeText=async(win,text)=>{for(const ch of text){win.webContents.sendInputEvent({type:'char',keyCode:ch});await wait(25);}};
 const until=async(win,expr,ms=30000)=>{const end=Date.now()+ms;for(;;){if(await js(win,expr).catch(()=>false))return true;if(Date.now()>end)return false;await wait(200);}};
 const capture=async(win,name)=>{const image=await win.webContents.capturePage();fs.writeFileSync(path.join(dir,name),image.toPNG());return name;};
 write();
 const win=first;
 await step('editor-ready',async()=>{if(win.webContents.isLoading())await once(win.webContents,'did-finish-load',30000);const ready=await until(win,"!!document.querySelector('.script-page')",45000);if(!ready)throw Error('the editor did not render a page');win.show();win.focus();await wait(1500);return {screenshot:await capture(win,'01-window.png')};});
 // 1.18: a fresh profile shows the Start Window at launch; Escape closes it and leaves the new script.
 const fileMenu=()=>Menu.getApplicationMenu()?.items.find(i=>i.label==='File')?.submenu?.items||[];
 await step('start-window',async()=>{const shown=await until(win,"!!document.querySelector('.dc-start')",10000);if(!shown)throw Error('the Start Window did not open at launch');await wait(600);
  const info=await js(win,`(()=>{const d=document.querySelector('.dc-start');return {heading:d.querySelector('h2')?.textContent||'',tiles:[...d.querySelectorAll('.dc-start-tile')].map(b=>b.getAttribute('aria-label')),recent:d.querySelectorAll('[data-recent-open]').length,empty:d.querySelector('.dc-start-empty')?.textContent||null,focused:(document.activeElement?.textContent||'').trim().slice(0,40),showAtLaunch:!!d.querySelector('.dc-start-check input')?.checked,learn:[...d.querySelectorAll('.dc-start-chip')].map(b=>b.textContent.trim())}})()`);
  const shot=await capture(win,'01b-start-window.png'),items=fileMenu().map(i=>i.label),recentMenu=fileMenu().find(i=>i.label==='Open Recent')?.submenu?.items.map(i=>i.label)||null;
  key(win,'Escape');const closed=await until(win,"!document.querySelector('.dc-start')",5000);await wait(300);
  const editorFocused=await js(win,"!!document.activeElement&&document.activeElement.matches('textarea[data-editor-paragraph]')||document.activeElement===document.body");
  if(!closed||info.tiles.length<6||!recentMenu||!items.includes('Start Window…'))throw Error(JSON.stringify({closed,info,recentMenu,items}));
  return {...info,fileMenu:items.filter(l=>/Open|Start|New/.test(l||'')),openRecentMenu:recentMenu,closedWithEscape:closed,editorFocused,screenshot:shot};});
 // A project opened before shows in File › Open Recent and on the Start Window, and opens from there.
 await step('recent-projects',async()=>{if(!recentProjects)return {available:false};const sample=path.join(dir,'Self Test Sample.fountain');
  fs.writeFileSync(sample,'Title: SELF TEST SAMPLE\n\nINT. TEST ROOM - DAY\n\nA quiet room. Nothing moves.\n\nANNA\nIs it working?\n');
  recentProjects.touch(sample,'SELF TEST SAMPLE');await wait(400);const menu=fileMenu().find(i=>i.label==='Open Recent')?.submenu?.items.map(i=>({label:i.label,enabled:i.enabled}))||[];
  send(win,'start-window');const listed=await until(win,"!!document.querySelector('.dc-start [data-recent-open]')",8000);if(!listed)throw Error('the recent project is not on the Start Window: '+JSON.stringify(menu));
  const row=await js(win,"document.querySelector('.dc-start [data-recent-open]').getAttribute('aria-label')"),shot=await capture(win,'01c-start-window-recent.png');
  await js(win,"document.querySelector('.dc-start [data-recent-open]').click()");
  const opened=await until(win,"!document.querySelector('.dc-start')&&[...document.querySelectorAll('textarea[data-editor-paragraph]')].some(t=>t.value.includes('TEST ROOM'))",20000);
  if(!opened||!menu.some(m=>m.label.startsWith('SELF TEST SAMPLE')&&m.enabled))throw Error(JSON.stringify({menu,row,opened}));
  return {menu,row,opened,screenshot:shot};});
 await step('environment',async()=>{const plist=(()=>{try{return fs.readFileSync(path.join(process.resourcesPath,'..','Info.plist'),'utf8');}catch{return '';}})(),value=k=>(plist.match(new RegExp('<key>'+k+'</key>\\s*<string>([^<]*)</string>'))||[])[1]||null;
  return {electron:process.versions.electron,chrome:process.versions.chrome,os:os.release(),macos:process.getSystemVersion?.(),arch:process.arch,packaged:app.isPackaged,cpu:os.cpus()[0]?.model,cores:os.cpus().length,memoryGB:Math.round(os.totalmem()/2**30),
   info:{version:value('CFBundleShortVersionString'),microphone:value('NSMicrophoneUsageDescription'),speech:value('NSSpeechRecognitionUsageDescription'),minimumSystem:value('LSMinimumSystemVersion')}};});
 await step('window',async()=>({bounds:win.getBounds(),trafficLights:win.getWindowButtonPosition?.()||null,fullScreenable:win.isFullScreenable(),tabbingIdentifier:win.tabbingIdentifier||null,titleBarSpacer:await js(win,"(()=>{const t=document.querySelector('[data-macos-titlebar],.dc-titlebar,.macos-titlebar');return t?Math.round(t.getBoundingClientRect().height):null})()")}));
 await step('full-screen',async()=>{win.setFullScreen(true);const entered=await once(win,'enter-full-screen',8000);await wait(800);const during=win.isFullScreen(),shot=await capture(win,'02-full-screen.png');win.setFullScreen(false);const left=await once(win,'leave-full-screen',8000);await wait(800);if(!entered||!during||!left||win.isFullScreen())throw Error(JSON.stringify({entered,during,left}));return {entered,left,screenshot:shot};});
 await step('tabs',async()=>{const before=BrowserWindow.getAllWindows().length,tab=newDocumentTab();await once(tab.webContents,'did-finish-load',20000);await until(tab,"!!document.querySelector('.script-page')",30000);await wait(800);
  const result={before,after:BrowserWindow.getAllWindows().length,sameTabGroup:!!win.tabbingIdentifier&&win.tabbingIdentifier===tab.tabbingIdentifier};
  if(typeof win.mergeAllWindows==='function'){win.mergeAllWindows();result.merge='called';}else result.merge='not available on this platform';
  tab.close();result.closed=await once(tab,'closed',15000);result.remaining=BrowserWindow.getAllWindows().length;if(result.after!==before+1||!result.closed)throw Error(JSON.stringify(result));win.focus();return result;});
 await step('menu-check-marks',async()=>{const menu=Menu.getApplicationMenu(),results={};
  for(const id of ['navigator','timeline']){const item=menu.getMenuItemById('ws:'+id);if(!item){results[id]='missing';continue;}const a=item.checked;send(win,'ws:'+id);await wait(1200);const b=item.checked;send(win,'ws:'+id);await wait(1200);results[id]={before:a,toggled:b,restored:item.checked};}
  const checks=[];const walk=(items,trail)=>{for(const i of items){const p=trail?trail+' › '+i.label:i.label;if(i.type==='checkbox'||i.type==='radio')checks.push(p+(i.checked?' ✓':''));if(i.submenu)walk(i.submenu.items,p);}};walk(menu.items,'');
  if(Object.values(results).some(r=>typeof r!=='object'||r.before===r.toggled||r.restored!==r.before))throw Error(JSON.stringify(results));return {toggles:results,checkItems:checks.length,checked:checks.filter(c=>c.endsWith('✓'))};});
 await step('spelling',async()=>await js(win,`(async()=>{const s=window.draftcraftDesktop.spelling,words=['recieve','receive','teh','bonjour','Straße','Wohnung','qwrtzxv','colour','color'];return {misspelled:await s.misspelled(words),checked:words,suggestions:{recieve:await s.suggestions('recieve'),teh:await s.suggestions('teh')}}})()`));
 await step('voices',async()=>{const macos=await tableRead.voices('macos').catch(e=>({error:String(e)})),list=macos.voices||[];const web=await js(win,`new Promise(r=>{const done=()=>r(speechSynthesis.getVoices().map(v=>v.name));if(speechSynthesis.getVoices().length)done();else{speechSynthesis.onvoiceschanged=done;setTimeout(done,3000);}})`).catch(()=>[]);
  const quality=list.filter(v=>/\((Premium|Enhanced)\)/i.test(v.name)).map(v=>v.name);return {say:list.length,premiumOrEnhanced:quality,sample:list.slice(0,12).map(v=>v.name+' '+v.language),browserVoices:web.length,error:macos.error};});
 await step('dictation-helper',async()=>{const helper=findHelper();if(!helper)return {available:false};const stat=fs.statSync(helper);
  // An unknown language makes the helper stop before it asks for any permission: this proves it runs, not dictation.
  const run=await new Promise(resolve=>{const child=spawn(helper,['xx-XX'],{stdio:['ignore','pipe','pipe']});let stdout='',stderr='';const t=setTimeout(()=>{child.kill('SIGTERM');},10000);child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);child.on('error',e=>{clearTimeout(t);resolve({error:String(e)});});child.on('exit',(code,signal)=>{clearTimeout(t);resolve({code,signal,stdout:stdout.slice(0,400),stderr:stderr.slice(0,400)});});});
  const signature=await new Promise(resolve=>{const c=spawn('/usr/bin/codesign',['-dv',helper],{stdio:['ignore','pipe','pipe']});let t='';c.stdout.on('data',b=>t+=b);c.stderr.on('data',b=>t+=b);c.on('exit',code=>resolve({code,text:t.replace(/\/Users\/[^/\s]+/g,'/Users/<user>').slice(0,500)}));c.on('error',e=>resolve({error:String(e)}));});
  return {available:true,location:path.relative(path.join(process.resourcesPath,'..'),helper),bytes:stat.size,mode:(stat.mode&0o777).toString(8),run,signature};});
 await step('accessibility',async()=>{await js(win,"(()=>{const t=document.querySelector('textarea[data-editor-paragraph]');t.focus();t.setSelectionRange(0,0);})()");await wait(300);
  const labels=await js(win,"[...document.querySelectorAll('textarea[data-editor-paragraph]')].slice(0,6).map(t=>t.getAttribute('aria-label'))");
  key(win,'.',['control','shift']);await wait(600);let announced=await js(win,"document.getElementById('dc-screen-reader-status')?.textContent||''"),via='key';
  if(!announced){send(win,'ws:announce-element');await wait(800);announced=await js(win,"document.getElementById('dc-screen-reader-status')?.textContent||''");via='menu';}
  const region=await js(win,"(()=>{const r=document.getElementById('dc-screen-reader-status');return r?{role:r.getAttribute('role'),live:r.getAttribute('aria-live')}:null})()");
  const tabs=await js(win,"[...document.querySelectorAll('[role=tablist] [role=tab]')].map(t=>t.textContent.trim()).slice(0,8)");
  if(!labels.length||!labels.every(Boolean)||!announced)throw Error(JSON.stringify({labels,announced}));return {labels,announced,via,region,navigatorTabs:tabs};});
 await step('getting-started',async()=>{send(win,'getting-started');const open=await until(win,"!!document.querySelector('[role=dialog] input[aria-label=\"Search Getting Started\"]')",8000);if(!open)throw Error('the guide did not open');
  const total=await js(win,"document.querySelectorAll('nav[aria-label=\"Getting Started sections\"] button').length");
  await js(win,"(()=>{const i=document.querySelector('input[aria-label=\"Search Getting Started\"]');const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;set.call(i,'cast list csv');i.dispatchEvent(new Event('input',{bubbles:true}));})()");await wait(400);
  const hits=await js(win,"[...document.querySelectorAll('nav[aria-label=\"Getting Started sections\"] button')].map(b=>b.textContent)");const shot=await capture(win,'03-getting-started.png');
  await js(win,"document.querySelector('[aria-label=\"Close Getting Started\"]').click()");await wait(500);return {sections:total,search:'cast list csv',hits,screenshot:shot};});
 // 1.18: Insert › Emoji…: search with real typing, Return inserts at the caret, focus goes back, one Undo removes it.
 await step('emoji-picker',async()=>{await js(win,"(()=>{const all=[...document.querySelectorAll('textarea[data-editor-paragraph]')],t=all.find(t=>t.getAttribute('aria-label')==='Action')||all[0];t.scrollIntoView({block:'center'});t.focus();t.setSelectionRange(t.value.length,t.value.length);})()");await wait(400);
  const before=await js(win,"({value:document.activeElement.value,label:document.activeElement.getAttribute('aria-label'),paragraphs:document.querySelectorAll('textarea[data-editor-paragraph]').length})");
  send(win,'ws:emoji');const open=await until(win,"document.activeElement?.getAttribute('aria-label')==='Search emoji'",8000);if(!open)throw Error('the emoji picker did not open with its search focused');
  await typeText(win,'clapper');await wait(500);const first=await js(win,"document.querySelector('.dc-emoji-cell')?.dataset.emoji||null"),count=await js(win,"document.querySelector('.dc-emoji-count')?.textContent||''");
  const shot=await capture(win,'04-emoji-picker.png');key(win,'Return');const closed=await until(win,"!document.querySelector('.dc-emoji-picker')",5000);await wait(500);
  const after=await js(win,"({value:document.activeElement?.value??null,label:document.activeElement?.getAttribute('aria-label')||null,paragraphs:document.querySelectorAll('textarea[data-editor-paragraph]').length})");
  send(win,'undo');await wait(1000);const undone=await js(win,"[...document.querySelectorAll('textarea[data-editor-paragraph]')].some(t=>t.value.includes('🎬'))");
  const inserted=after.value===before.value+'🎬';
  if(first!=='🎬'||!closed||!inserted||after.label!==before.label||after.paragraphs!==before.paragraphs||undone)throw Error(JSON.stringify({first,closed,before:{label:before.label,paragraphs:before.paragraphs},after:{label:after.label,paragraphs:after.paragraphs,tail:String(after.value).slice(-12)},undone}));
  return {search:'clapper',first,count,insertedInto:after.label,focusReturned:true,undoRemoved:true,characterViewer:await js(win,"typeof window.draftcraftDesktop?.showEmojiPanel==='function'"),screenshot:shot};});
 // Return latency: real key events (sendInputEvent) in a 250-page script, measured two ways in the page:
 // * keydown→paint: the Event Timing API (Chromium's input-to-next-frame measure, 8 ms resolution, ≥16 ms reported);
 // * keydown→second animation frame: the same measure as verification/performance-scale-browser.cjs.
 // Each script opens in its own new tab (an unchanged new document), so switching never asks to save the previous one.
 const latency=async(name,fountain)=>step(name,async()=>{const win=newDocumentTab();await once(win.webContents,'did-finish-load',20000);await until(win,"!!document.querySelector('.script-page')",30000);win.focus();win.webContents.focus();await wait(800);send(win,'open-file',{name:name+'.fountain',text:fountain});
  const loaded=await until(win,"document.querySelectorAll('.script-page').length>=200",90000);if(!loaded)throw Error('the 250-page script did not open');await wait(4000);
  const pages=await js(win,"Math.max(...[...document.querySelectorAll('.script-page')].map(p=>Number(p.dataset.pageNumber)||0))");
  await js(win,`(()=>{const t=[...document.querySelectorAll('textarea[data-editor-paragraph]')].find(t=>t.getAttribute('aria-label')==='Action');t.scrollIntoView({block:'center'});t.focus();t.setSelectionRange(t.value.length,t.value.length);
   window.__dcLat={raf:[],timing:[],typing:[]};let start=0,typed=0;document.addEventListener('keydown',e=>{if(e.key==='Enter')start=performance.now();},true);
   window.addEventListener('keydown',e=>{if(e.key!=='Enter')return;const s=start;requestAnimationFrame(()=>requestAnimationFrame(()=>window.__dcLat.raf.push(performance.now()-s)));});
   document.addEventListener('beforeinput',()=>{typed=performance.now();},true);document.addEventListener('input',()=>{const s=typed;requestAnimationFrame(()=>requestAnimationFrame(()=>window.__dcLat.typing.push(performance.now()-s)));},true);
   new PerformanceObserver(l=>{for(const e of l.getEntries())if(e.name==='keydown')window.__dcLat.timing.push({duration:e.duration,processing:Math.round(e.processingEnd-e.processingStart),delay:Math.round(e.processingStart-e.startTime)});}).observe({type:'event',durationThreshold:16});})()`);
  await wait(800);
  for(let i=0;i<12;i++){await typeText(win,'He waits');await wait(700);key(win,'Return');await wait(900);}
  const r=await js(win,'window.__dcLat');const returns=r.raf.slice(2),timing=r.timing.slice(2).map(e=>e.duration);
  // Keydowns faster than 16 ms are not reported by the Event Timing API at all: count them as under 16 ms.
  return {pages,paragraphs:await js(win,"document.querySelectorAll('textarea[data-editor-paragraph]').length"),returns:returns.length,keydownToSecondFrame:{p50:pct(returns,50),p95:pct(returns,95),max:Math.round(Math.max(...returns)),all:returns.map(Math.round)},
   keydownToPaint:{reported:timing.length,note:'Event Timing reports only keydowns of 16 ms or more (all keys, including typing)',p50:pct(timing,50),p95:pct(timing,95),max:timing.length?Math.max(...timing):null,all:r.timing},
   typingInputToSecondFrame:{n:r.typing.length,p50:pct(r.typing,50),p95:pct(r.typing,95)}};});
 await latency('return-latency-mixed-script',realisticFountain());
 await latency('return-latency-uniform-worst-case',uniformFountain());
 report.finished=new Date().toISOString();report.passed=Object.values(report.checks).filter(c=>c.ok).length;report.failed=Object.entries(report.checks).filter(([,c])=>!c.ok).map(([k])=>k);write();
 if(!process.env.DRAFTCRAFT_SELF_TEST_STAY)setTimeout(()=>app.exit(0),500);
}
module.exports={runSelfTest,realisticFountain,uniformFountain};
