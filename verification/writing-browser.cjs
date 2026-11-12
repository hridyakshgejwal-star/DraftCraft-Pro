const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {SAMPLE_SCRIPT}=require('../src/data/sampleScript.ts'),{paginateScript}=require('../src/utils/pagination.ts');
const {DEFAULT_WRITING_SETTINGS}=require('../src/writing/model.ts');
const root=path.resolve(__dirname,'..'),dist=process.env.DRAFTCRAFT_DIST || path.resolve(root,'../desktop-build/app/dist');
const out=path.resolve(root,'../qa');fs.mkdirSync(out,{recursive:true});
const key='draftcraft_screenplay_doc_v1',prefKey='draftcraft_writing_assistance_v1';
const base={...structuredClone(SAMPLE_SCRIPT),id:'writing-browser-qa',showScriptNotes:false,showBookmarks:false,showSceneComments:false,paragraphs:[
  {id:'a',type:'Action',text:'He recieved the mesage yesterday.'},
  {id:'c1',type:'Character',text:'JOHN (V.O.)'},
  {id:'c2',type:'Character',text:'SARAH'},
  {id:'c3',type:'Character',text:'MICHAEL'},
  {id:'c4',type:'Character',text:'DETECTIVE ROBERT'},
  {id:'c5',type:'Character',text:'ZAYVION'},
  {id:'c6',type:'Character',text:'ÉLODIE (LIVE RADIO)'},
  {id:'new',type:'Character',text:''},
  {id:'dialogue',type:'Dialogue',text:'The next line is dialogue.'},
]};
let server,browser,context,page,origin;const results=[],errors=[],external=[];
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function seed(doc=base,preferences={...DEFAULT_WRITING_SETTINGS,autocorrect:false}){
  const next=await context.newPage();if(page)await page.close();page=next;page.setDefaultTimeout(10000);
  page.on('pageerror',e=>errors.push(e.message));page.on('console',message=>{if(message.type()==='error')console.log('BROWSER CONSOLE',message.text());});page.on('worker',w=>console.log('WORKER',w.url()));page.on('request',req=>{if(!req.url().startsWith(origin) && !req.url().startsWith('data:'))external.push(req.url());});
  await page.addInitScript(({doc,preferences,key,prefKey})=>{
    if(!sessionStorage.getItem('qa-initialized')){localStorage.clear();localStorage.setItem('draftcraft_editor_preferences_v1',JSON.stringify({autoCapitalize:false}));localStorage.setItem(key,JSON.stringify(doc));localStorage.setItem(prefKey,JSON.stringify(preferences));sessionStorage.setItem('qa-initialized','1');}
    window.draftcraftDesktop={windowAction:()=>{},onCommand:callback=>{window.__nativeCommand=callback;return()=>{}},nativeHistory:async action=>{window.__historyFallback=action;return true},readClipboard:async()=>({text:'',html:''}),writeClipboard:async()=>true};
  },{doc,preferences,key,prefKey});
  await page.goto(origin);await page.locator('.script-page').first().waitFor();await pause(250);
}
async function stored(){await pause(180);return page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);}
async function check(name,fn){if(process.env.SP_ONLY&&!name.includes(process.env.SP_ONLY))return;try{await fn();results.push({name,passed:true});console.log('PASS',name)}catch(e){results.push({name,passed:false,error:e.message});console.log('FAIL',name,e.message);console.log('DIAGNOSTICS',await page.evaluate(()=>({text:document.body.innerText.slice(-2400),inputs:Array.from(document.querySelectorAll('textarea')).map(el=>({id:el.id,text:el.value})),workerLayers:document.querySelectorAll('[data-spell-layer]').length})));console.log('ERRORS',errors);await page.screenshot({path:path.join(out,'failure-'+results.length+'.png')});throw e}}
async function typo(word,id='a'){const span=page.locator(`[data-spell-layer="${id}"] [data-spell-start]`).filter({hasText:word}).first();await span.waitFor();return span;}
async function clickTypo(word,id='a',button='left'){
  const span=await typo(word,id);await page.locator('#input-'+id).scrollIntoViewIfNeeded();await pause(180);const rect=await span.boundingBox();
  await page.mouse.click(rect.x+rect.width/2,rect.y+rect.height/2,{button,clickCount:1});await page.getByRole('dialog',{name:'Spelling Suggestions',exact:true}).waitFor();
}
async function settings(){await page.getByRole('button',{name:'Edit',exact:true}).click();await page.getByRole('button',{name:'Writing Assistance…',exact:true}).click();await page.getByRole('dialog',{name:'Writing Assistance',exact:true}).waitFor();}
// fill('') clears by pressing Delete. Since 1.15.3, Delete at the end of an element joins the next element (E-02),
// so an element that is already empty is focused instead of "cleared". Assertions are unchanged.
async function typeEnd(id,text){const input=page.locator('#input-'+id);if(await input.inputValue())await input.fill('');else await input.focus();await input.pressSequentially(text);return input;}

(async()=>{
  const policy=fs.readFileSync(path.join(root,'desktop/main.cjs'),'utf8').match(/const CONTENT_POLICY = "([^"]+)"/)[1];
  server=http.createServer((req,res)=>{
    const file=path.join(dist,new URL(req.url,'http://localhost').pathname==='/'?'index.html':decodeURIComponent(new URL(req.url,'http://localhost').pathname));
    if(!file.startsWith(dist)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}
    const mime={'.js':'application/javascript','.css':'text/css','.html':'text/html','.woff2':'font/woff2'}[path.extname(file)]||'application/octet-stream';
    res.writeHead(200,{'content-type':mime,'Content-Security-Policy':policy});fs.createReadStream(file).pipe(res);
  });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({executablePath:process.env.BROWSER_EXE,headless:true,args:['--no-sandbox','--no-zygote',...(process.env.DRAFTCRAFT_MULTIPROCESS==='1'?[]:['--single-process'])]});
  context=await browser.newContext({viewport:{width:1440,height:1000}});
  await check('real dictionary worker flags completed words across existing pages',async()=>{
    await seed();await typo('recieved');await typo('mesage');assert.equal(await page.locator('.dc-misspelled').count(),2);
    assert.equal((await stored()).paragraphs[0].text,base.paragraphs[0].text);
  });
  await check('left click replaces only the chosen range, closes popup, and supports undo/redo',async()=>{
    await clickTypo('recieved');await page.getByRole('dialog',{name:'Spelling Suggestions'}).getByRole('button',{name:'received',exact:true}).click();
    assert.equal(await page.locator('#input-a').inputValue(),'He received the mesage yesterday.');
    assert.equal(await page.getByRole('dialog',{name:'Spelling Suggestions'}).count(),0);
    await page.locator('#input-a').focus();await page.keyboard.press('Control+z');assert.equal(await page.locator('#input-a').inputValue(),base.paragraphs[0].text);
    await page.keyboard.press('Control+Shift+z');assert.equal(await page.locator('#input-a').inputValue(),'He received the mesage yesterday.');
  });
  await check('secondary click, keyboard spelling route and page actions coexist',async()=>{
    await seed();await clickTypo('mesage','a','right');await page.keyboard.press('Escape');
    await page.locator('#input-a').evaluate(el=>{el.focus();el.setSelectionRange(6,6)});await page.keyboard.press('Shift+F10');await page.getByRole('dialog',{name:'Spelling Suggestions'}).waitFor();await page.getByRole('button',{name:'received',exact:true}).waitFor();
    await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowUp');await page.keyboard.press('Enter');
    assert.equal(await page.locator('#input-a').inputValue(),'He received the mesage yesterday.');
    await page.locator('.dc-page-actions-button').first().click();await page.getByRole('dialog').getByRole('button',{name:'Delete Page…',exact:true}).waitFor();
    await page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click();
  });
  await check('native Edit commands use screenplay history and preserve native undo in other text fields',async()=>{
    await seed(base,DEFAULT_WRITING_SETTINGS);const input=await typeEnd('a','teh ');assert.equal(await input.inputValue(),'the ');
    await page.evaluate(()=>window.__nativeCommand('undo'));assert.equal(await input.inputValue(),'teh ');await page.evaluate(()=>window.__nativeCommand('redo'));assert.equal(await input.inputValue(),'the ');
    await settings();await page.getByLabel('Custom dictionary word').fill('draft');await page.evaluate(()=>window.__nativeCommand('undo'));assert.equal(await page.evaluate(()=>window.__historyFallback),'undo');await page.getByRole('button',{name:'Close writing assistance'}).click();
  });
  await check('space corrections retain caret, one separator, capitalization, immediate undo and Backspace learning',async()=>{
    await seed(base,DEFAULT_WRITING_SETTINGS);
    const input=await typeEnd('a','I definately recieved it ');assert.equal(await input.inputValue(),'I definitely received it ');
    await input.fill('teh');await input.press('End');await input.press('Space');assert.equal(await input.inputValue(),'the ');
    await input.press('Control+z');assert.equal(await input.inputValue(),'teh ');await input.press('Control+Shift+z');assert.equal(await input.inputValue(),'the ');
    await input.fill('becuase');await input.press('End');await input.press('Space');assert.equal(await input.inputValue(),'because ');await input.press('Backspace');assert.equal(await input.inputValue(),'becuase');await input.press('Space');assert.equal(await input.inputValue(),'becuase ');
    await input.fill('Definately');await input.press('End');await input.press(',');assert.equal(await input.inputValue(),'Definitely,');
    assert.equal(await input.evaluate(el=>el.selectionStart),11);
  });
  await check('acronyms and ambiguous spellings stay unchanged under conservative autocorrect',async()=>{
    await seed(base,DEFAULT_WRITING_SETTINGS);const input=await typeEnd('a','ADN VFX throught ');assert.equal(await input.inputValue(),'ADN VFX throught ');await typo('throught');assert.equal(await page.locator('.dc-misspelled').count(),1);
  });
  await check('prefix, partial name, Unicode, multiword and extension suggestions accept exact names',async()=>{
    await seed();const input=await typeEnd('new','jo');await page.getByRole('listbox',{name:'Character Suggestions'}).waitFor();await input.press('Enter');assert.equal(await input.inputValue(),'JOHN');
    await typeEnd('new','rob');await page.getByRole('option',{name:/DETECTIVE ROBERT/}).waitFor();await input.press('Tab');assert.equal(await input.inputValue(),'DETECTIVE ROBERT');
    await typeEnd('new','é');await page.getByRole('option',{name:/ÉLODIE/}).click();assert.equal(await input.inputValue(),'ÉLODIE');
    await typeEnd('new','DR. EMILY CARTER');assert.equal(await input.inputValue(),'DR. EMILY CARTER');await input.fill('ÉLODIE (LIVE');await page.getByRole('option',{name:/LIVE RADIO/}).waitFor();await input.press('Tab');assert.equal(await input.inputValue(),'ÉLODIE (LIVE RADIO)');
    await input.fill('JOHN (V.');await page.getByRole('option',{name:/V.O./}).waitFor();await input.press('Tab');assert.equal(await input.inputValue(),'JOHN (V.O.)');
    await page.locator('#input-a').fill('JO');assert.equal(await page.getByRole('listbox',{name:'Character Suggestions'}).count(),0);
  });
  await check('fictional names and custom dictionary words stay protected; selection and rapid typing remain intact',async()=>{
    await seed(base,DEFAULT_WRITING_SETTINGS);const input=await typeEnd('a','Zayvion walked in. ');await pause(350);assert.equal(await input.inputValue(),'Zayvion walked in. ');assert.equal(await page.locator('.dc-misspelled').count(),0);
    await input.fill('🙂 teh end.');await input.evaluate(el=>el.setSelectionRange(3,6));await input.press('Space');assert.equal(await input.inputValue(),'🙂   end.');
    await typeEnd('a','teh quick brown fox recieved it ');assert.equal(await input.inputValue(),'the quick brown fox received it ');
    await settings();await page.getByLabel('Custom dictionary word').fill('recieve');await page.getByRole('button',{name:'Add Word',exact:true}).click();await page.getByRole('button',{name:'Close writing assistance'}).click();
    await typeEnd('a','recieve ');assert.equal(await input.inputValue(),'recieve ');
  });
  await check('ignore once/document, custom dictionary and per-word autocorrect exclusion persist correctly',async()=>{
    await seed();await clickTypo('recieved');await page.getByRole('button',{name:'Ignore Once',exact:true}).click();assert.equal(await page.locator('.dc-misspelled').count(),1);
    await clickTypo('mesage');await page.getByRole('button',{name:'Ignore All in Document',exact:true}).click();assert.equal(await page.locator('.dc-misspelled').count(),0);
    assert.deepEqual((await stored()).writingAssistance.ignoredWords,['mesage']);
    await seed();await clickTypo('mesage');await page.getByRole('button',{name:'Disable Autocorrect for This Word',exact:true}).click();await settings();await page.getByLabel('Enable Automatic Spelling Correction').check();await page.getByRole('button',{name:'Close writing assistance'}).click();
    await typeEnd('a','mesage ');assert.equal(await page.locator('#input-a').inputValue(),'mesage ');
    await seed();await clickTypo('mesage');await page.getByRole('button',{name:'Add to Dictionary',exact:true}).click();assert.ok((await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),prefKey)).customWords.includes('mesage'));
  });
  await check('character records and settings survive autosave, reload, manual backups and live rename',async()=>{
    await seed();await typeEnd('new','MRS. ANDERSON (V.O.)');await page.keyboard.press('Control+s');
    const saved=await stored();assert.ok(saved.characterMemory.some(r=>r.name==='MRS. ANDERSON'));
    const backup=await page.evaluate(()=>JSON.parse(localStorage.getItem('fd13_script_backups_v1'))[0].document);assert.deepEqual(backup.characterMemory,saved.characterMemory);
    await page.reload();await page.locator('#input-new').waitFor();await typeEnd('c3','mrs');await page.getByRole('option',{name:/MRS. ANDERSON/}).waitFor();await page.keyboard.press('Tab');assert.equal(await page.locator('#input-c3').inputValue(),'MRS. ANDERSON');
    await page.locator('#input-c2').fill('SAMANTHA');await page.locator('#input-c2').press('Control+z');assert.equal(await page.locator('#input-c2').inputValue(),'SARAH');await page.locator('#input-c2').press('Control+Shift+z');assert.equal(await page.locator('#input-c2').inputValue(),'SAMANTHA');await typeEnd('new','sam');await page.getByRole('option',{name:/SAMANTHA/}).waitFor();
    await page.keyboard.press('Escape');await settings();await page.getByLabel('Enable Character Name Autocomplete').uncheck();await page.getByLabel('Select Spelling Language').selectOption('en-GB');await page.getByRole('button',{name:'Close writing assistance'}).click();await page.reload();await typeEnd('new','sam');assert.equal(await page.getByRole('listbox',{name:'Character Suggestions'}).count(),0);assert.equal((await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),prefKey)).language,'en-GB');
  });
  await check('aggressive autocorrect accepts only a unique near dictionary match and rejects stale completion',async()=>{
    await seed(base,{...DEFAULT_WRITING_SETTINGS,aggressive:true});const input=await typeEnd('a','accomodation ');await page.waitForFunction(()=>document.getElementById('input-a').value==='accommodation ');
    await input.press('Control+z');assert.equal(await input.inputValue(),'accomodation ');await input.press('Control+Shift+z');assert.equal(await input.inputValue(),'accommodation ');
    await input.fill('accomodation');await input.press('End');await input.pressSequentially(' next word');await pause(300);assert.ok((await input.inputValue()).endsWith(' next word'));
  });
  await check('underlines do not change wrapping or pagination at 50/100/200 percent and both themes',async()=>{
    await seed();await typo('recieved');const geometry=()=>page.locator('#input-a').evaluate(el=>({height:el.offsetHeight,width:el.offsetWidth,scrollHeight:el.scrollHeight,pages:document.querySelectorAll('.script-page').length}));const before=await geometry();
    await settings();await page.getByLabel('Show Red Underlines').uncheck();await page.getByRole('button',{name:'Close writing assistance'}).click();assert.deepEqual(await geometry(),before);
    await settings();await page.getByLabel('Show Red Underlines').check();await page.getByRole('button',{name:'Close writing assistance'}).click();
    let current=100;
    for(const zoom of [50,100,200]){
      while(current!==zoom){await page.locator('footer').getByRole('button',{name:current>zoom?'Zoom Out':'Zoom In',exact:true}).click();current+=current>zoom?-10:10;}await pause(220);
      await clickTypo('recieved');const popup=await page.getByRole('dialog',{name:'Spelling Suggestions'}).boundingBox(),word=await (await typo('recieved')).boundingBox();assert.ok(popup.x+popup.width<=1440&&popup.y+popup.height<=1000);assert.ok(popup.x>=word.x+word.width||popup.y>=word.y+word.height||popup.y+popup.height<=word.y||popup.x+popup.width<=word.x);await page.keyboard.press('Escape');assert.deepEqual(await geometry(),before);
    }
    await page.getByRole('button',{name:'Switch to Light Appearance',exact:true}).click();await clickTypo('recieved');await page.screenshot({path:path.join(out,'light-spelling.png')});await page.keyboard.press('Escape');
    await page.emulateMedia({media:'print'});assert.equal(await page.locator('.dc-spelling-layer').first().isVisible(),false);await page.emulateMedia({media:'screen'});
  });
  await check('stale popup results, paste and composition cannot overwrite newer text',async()=>{
    await seed();await clickTypo('recieved');await page.locator('#input-a').evaluate(el=>{Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(el,'Newest screenplay text.');el.dispatchEvent(new Event('input',{bubbles:true}))});await pause(50);assert.equal(await page.getByRole('dialog',{name:'Spelling Suggestions'}).count(),0);assert.equal(await page.locator('#input-a').inputValue(),'Newest screenplay text.');
    await page.locator('#input-a').fill('First mesage.\nAnother recieved message.');await page.locator('#input-dialogue').focus();await typo('mesage');await typo('recieved');
    const input=page.locator('#input-a');await input.fill('teh');await input.focus();await input.dispatchEvent('compositionstart');await input.press('Space');assert.equal(await input.inputValue(),'teh ');await input.dispatchEvent('compositionend',{data:'teh '});
  });
  await check('custom autocorrect (1.17 item 3): add, edit, delete, import and export pairs; applied while typing in any element, with spelling autocorrect off; one Undo step',async()=>{
    await seed(base,{...DEFAULT_WRITING_SETTINGS,autocorrect:false});await settings();const dlg=page.getByRole('dialog',{name:'Writing Assistance',exact:true}),box=dlg.getByRole('group',{name:'Custom Autocorrect'});
    assert.equal(await box.getByRole('checkbox',{name:'Use Custom Autocorrect'}).isChecked(),true,'on by default (the list starts empty)');
    const add=async(a,b)=>{await box.getByLabel('Replace',{exact:true}).fill(a);await box.getByLabel('With',{exact:true}).fill(b);await box.getByLabel('With',{exact:true}).press('Enter');};
    await add('omw','on my way');await add('jd','JOHN DOE');await add('(cont)','(CONT\'D)');await add('Mgr','Manager');
    const list=box.getByRole('list',{name:'Custom replacements'});assert.equal(await list.getByRole('listitem').count(),4);
    await box.getByRole('button',{name:'Edit replacement jd'}).click();assert.equal(await box.getByLabel('Replace',{exact:true}).inputValue(),'jd');await box.getByLabel('With',{exact:true}).fill('JANE DOE');await box.getByRole('button',{name:'Update',exact:true}).click();
    assert.equal(await list.getByRole('listitem').count(),4,'editing replaces the pair');assert.match(await list.innerText(),/jd → JANE DOE/);
    await add('zz','sleep');await box.getByRole('button',{name:'Delete replacement zz'}).click();assert.equal(await list.getByRole('listitem').count(),4,'deleted');
    // Export, then import a file in another format (one pair per line).
    const [download]=await Promise.all([page.waitForEvent('download'),box.getByRole('button',{name:'Export…'}).click()]);const exported=fs.readFileSync(await download.path(),'utf8');
    assert.match(exported,/^omw\ton my way$/m);assert.match(exported,/^jd\tJANE DOE$/m);
    const file=path.join(out,'autocorrect-import.txt');fs.writeFileSync(file,'# imported\nbtw => by the way\nasap,as soon as possible\n');
    await box.getByLabel('Import replacements').setInputFiles(file);await pause(200);assert.equal(await list.getByRole('listitem').count(),6,'two imported');assert.match(await box.getByRole('status').innerText(),/Imported 2 replacements/);
    const saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),prefKey);assert.equal(saved.replacements.length,6);assert.equal(saved.autocorrect,false);
    await page.getByRole('button',{name:'Close writing assistance'}).click();
    // Typing: a space, punctuation and Return trigger it; case follows a lowercase pair; capitals in "from" match exactly.
    let input=await typeEnd('a','I am omw ');assert.equal(await input.inputValue(),'I am on my way ','space');
    await input.press('Control+z');assert.equal(await input.inputValue(),'I am omw ','one Undo restores what was typed');await input.press('Control+Shift+z');assert.equal(await input.inputValue(),'I am on my way ');
    assert.deepEqual((await stored()).documentAssistance?.disabledAutocorrectWords||[],[],'undoing a custom replacement does not switch the pair off');
    await input.pressSequentially('Btw, OMW.');assert.equal(await input.inputValue(),'I am on my way By the way, ON MY WAY.','case follows the typed word; comma and full stop trigger');
    await input.pressSequentially(' mgr Mgr ');assert.equal(await input.inputValue(),'I am on my way By the way, ON MY WAY. mgr Manager ','a pair with capitals matches exactly');
    await input.pressSequentially('xomw ');assert.ok((await input.inputValue()).endsWith('xomw '),'only whole words');
    await input.pressSequentially('asap');await input.press('Backspace');await input.pressSequentially('p ');assert.ok((await input.inputValue()).endsWith('as soon as possible '));await input.press('Backspace');assert.ok((await input.inputValue()).endsWith('asap'),'Backspace straight after restores the typed word');
    input=await typeEnd('new','jd');await input.press('Enter');await pause(250);let d=await stored();assert.equal(d.paragraphs.find(p=>p.id==='new').text,'JANE DOE','Return at the end of a Character cue');
    input=await typeEnd('dialogue','Wait (cont) ');assert.equal(await input.inputValue(),"Wait (CONT'D) ",'pairs may contain punctuation');
    // Turning it off stops replacements.
    await settings();await box.getByRole('checkbox',{name:'Use Custom Autocorrect'}).uncheck();await page.getByRole('button',{name:'Close writing assistance'}).click();
    input=await typeEnd('a','omw ');assert.equal(await input.inputValue(),'omw ','off: nothing is replaced');assert.deepEqual(errors,[]);
  });
  await check('languages (1.17 item 12): words in other scripts are not marked by the English dictionary; other languages use the system spellchecker for underlines, suggestions and corrections',async()=>{
    const doc={...base,paragraphs:[{id:'a',type:'Action',text:'He recieved שלום and مرحبا and Привет today.'},{id:'f',type:'Action',text:'Le chat dort bonjuor.'},{id:'new',type:'Character',text:''}]};
    await seed(doc,{...DEFAULT_WRITING_SETTINGS,autocorrect:false});await typo('recieved');await pause(400);
    assert.deepEqual(await page.locator('[data-spell-layer="a"] [data-spell-start]').allInnerTexts(),['recieved'],'Hebrew, Arabic and Cyrillic words are not reported by the English dictionary');
    // French through the system spellchecker (the desktop bridge; here a stand-in with a small word list).
    await page.addInitScript(()=>{const known=new Set(['le','chat','dort','bonjour','la','maison','teh']);window.draftcraftDesktop.spelling={misspelled:w=>w.filter(x=>!known.has(x.toLowerCase())),suggestions:w=>w==='bonjuor'?['bonjour']:[],setLanguage:async l=>{window.__spellingLanguage=l;return{ok:true};}};});
    await page.evaluate(([k,s])=>localStorage.setItem(k,JSON.stringify(s)),[prefKey,{...DEFAULT_WRITING_SETTINGS,language:'fr'}]);await page.reload();await page.locator('.script-page').first().waitFor();
    await typo('bonjuor','f');assert.equal(await page.evaluate(()=>window.__spellingLanguage),'fr','the language is passed to the system spellchecker');
    assert.deepEqual(await page.locator('[data-spell-layer="f"] [data-spell-start]').allInnerTexts(),['bonjuor']);
    await clickTypo('bonjuor','f');await page.getByRole('dialog',{name:'Spelling Suggestions',exact:true}).getByRole('button',{name:/^bonjour/}).first().click();await pause(300);assert.equal((await stored()).paragraphs.find(p=>p.id==='f').text,'Le chat dort bonjour.');
    // The English list of common misspellings does not apply to French text.
    const input=await typeEnd('f','teh ');assert.equal(await input.inputValue(),'teh ','no English autocorrect in French');
    await settings();const dlg=page.getByRole('dialog',{name:'Writing Assistance',exact:true});assert.ok(await dlg.getByLabel('Spelling language').locator('option').count()>=20);assert.match(await dlg.getByRole('note').innerText(),/spelling dictionaries of your Mac/);
    await page.getByRole('button',{name:'Close writing assistance'}).click();assert.deepEqual(errors,[]);
  });
  if(process.env.RUN_LARGE==='1')await check('10/50/120/250-page scripts: typing, complete-document checking, autocomplete and autosave',async()=>{
    const measurements=[];
    for(const target of [10,50,120,250]){
      const paragraphs=[{id:'a',type:'Action',text:'He recieved the mesage yesterday.'},{id:'name',type:'Character',text:'ZAYVION'},{id:'new',type:'Character',text:''}];
      let count=paginateScript(paragraphs).length,i=0;
      while(count<target){
        const group=i++;paragraphs.push({id:'heading-'+group,type:'Scene Heading',text:'INT. OFFICE - DAY'},{id:'body-'+group,type:'Action',text:'He watched the window and waited for the next train. '.repeat(12)},{id:'character-'+group,type:'Character',text:'ZAYVION'},{id:'dialogue-'+group,type:'Dialogue',text:'The train will be here soon. We should leave before the rain. '.repeat(4)});
        count=paginateScript(paragraphs).length;
      }
      assert.equal(count,target);
      const doc={...base,id:'performance-'+target,productionMode:false,paragraphs};const started=Date.now();await seed(doc,DEFAULT_WRITING_SETTINGS);await typo('recieved');const startupMs=Date.now()-started;
      const input=page.locator('#input-a');await input.fill('');await input.focus();const timings=[];
      // Keep native focus and time direct key dispatch, without repeating
      // locator actionability/scroll checks for every individual character.
      for(const letter of 'I recieved the mesage yesterday. '){const at=performance.now();await page.keyboard.type(letter);timings.push(performance.now()-at);}
      assert.equal(await input.inputValue(),'I received the message yesterday. ');await typeEnd('new','za');await page.getByRole('option',{name:/ZAYVION/}).waitFor();await page.keyboard.press('Tab');assert.equal(await page.locator('#input-new').inputValue(),'ZAYVION');
      const storedDoc=await stored();assert.equal(storedDoc.paragraphs[0].text,'I received the message yesterday. ');assert.ok(storedDoc.characterMemory.some(r=>r.name==='ZAYVION'));
      timings.sort((a,b)=>a-b);const p95=timings[Math.floor(timings.length*.95)];assert.ok(p95<Number(process.env.DRAFTCRAFT_SPELLING_P95_MS||250),'typing response exceeded '+(process.env.DRAFTCRAFT_SPELLING_P95_MS||250)+' ms: '+p95);
      const session=await context.newCDPSession(page);await session.send('Performance.enable');const metrics=await session.send('Performance.getMetrics');const memory=metrics.metrics.find(m=>m.name==='JSHeapUsedSize')?.value || null;await session.detach();
      measurements.push({pages:target,paragraphs:paragraphs.length,startupMs,keyEventP50Ms:Math.round(timings[Math.floor(timings.length*.5)]),keyEventP95Ms:Math.round(p95),usedJSHeapBytes:memory});console.log('PERFORMANCE',JSON.stringify(measurements.at(-1)));
    }
    fs.writeFileSync(path.join(out,'performance-results.json'),JSON.stringify({environment:'Chromium 151 headless shell on Linux; key timings include automation round trip',measurements},null,2));
  });
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({results,errors,external},null,2));
})().catch(e=>{console.error(e.stack);fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({results,errors,external,error:e.message},null,2));process.exitCode=1}).finally(async()=>{if(browser)await browser.close();if(server)server.close()});
