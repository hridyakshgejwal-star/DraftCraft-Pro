// DraftCraft Pro 1.15.4 — formatting engine, template catalog and automatic-formatting rules (node:test).
import test from 'node:test';
import assert from 'node:assert/strict';
import {FORMAT_TEMPLATES,STANDARD_FORMAT} from '../src/formats/catalog';
import {validateFormat,fontStack,paragraphGap,styleFor,conversion} from '../src/formats/model';
import {inferElement,isShot} from '../src/formats/inference';
import {DEFAULT_EDITOR_PREFS,effectivePreferences,normalizeEditorPreferences} from '../src/editor/preferences';
import type {Paragraph,ElementType,ScriptDocument} from '../src/types/script';

const t=(name:string)=>{const x=FORMAT_TEMPLATES.find(v=>v.name===name);assert.ok(x,name);return x!;};
const p=(type:ElementType,text='',extra:Partial<Paragraph>={}):Paragraph=>({id:'p-'+Math.random(),type,text,...extra});
const infer=(text:string,format=STANDARD_FORMAT,options={},names=new Set<string>())=>inferElement(text,p('Action',text),undefined,format,names,options);

test('standard US template: page, element positions and spacing match the screenplay defaults',()=>{
 const f=STANDARD_FORMAT,e=f.elements,edge=(type:ElementType)=>[f.page.left+e[type].left,f.page.width-f.page.right-e[type].right];
 assert.deepEqual(f.page,{width:8.5,height:11,top:1,bottom:1,left:1.5,right:1});
 assert.deepEqual(edge('Scene Heading'),[1.5,7.5]);assert.deepEqual(edge('Action'),[1.5,7.5]);
 assert.equal(edge('Character')[0],3.7);assert.deepEqual(edge('Dialogue'),[2.5,6]);
 const [pl,pr]=edge('Parenthetical');assert.equal(pl,3.1);assert.ok(Math.abs(8.5-pr-2.9)<1e-9,'2.9" parenthetical right margin');
 assert.equal(e.Transition.align,'right');assert.equal(e['Scene Heading'].caps,true);assert.equal(e.Character.caps,true);assert.equal(e.Action.caps,false);
 for(const type of ['Scene Heading','Action','Character','Parenthetical','Dialogue','Transition'] as ElementType[]){assert.equal(e[type].size,12);assert.equal(e[type].line,12);assert.match(fontStack(e[type].font),/Courier/);}
 const gap=(a:ElementType,b:ElementType)=>paragraphGap(p(a),p(b),f);
 assert.equal(gap('Scene Heading','Action'),12);assert.equal(gap('Action','Character'),12);assert.equal(gap('Character','Dialogue'),0);assert.equal(gap('Character','Parenthetical'),0);assert.equal(gap('Parenthetical','Dialogue'),0);
 assert.equal(gap('Dialogue','Character'),12,'a blank line before the next speaker');assert.equal(gap('Dialogue','Action'),12);assert.equal(gap('Action','Scene Heading'),24);assert.equal(gap('Dialogue','Transition'),12);
 assert.equal(e['Scene Heading'].next,'Action');assert.equal(e.Character.next,'Dialogue');assert.equal(e.Parenthetical.next,'Dialogue');assert.equal(e.Dialogue.tab,'Parenthetical');assert.equal(e.Transition.next,'Scene Heading');
 assert.equal(f.templateVersion,3);assert.equal(f.transitionPunctuation,'traditional');
});

test('every template in the catalog is a valid, complete format with unique ids and its own rules',()=>{
 const ids=new Set<string>();
 for(const x of FORMAT_TEMPLATES){validateFormat(x.format);assert.ok(!ids.has(x.id),'unique id '+x.id);ids.add(x.id);assert.ok(x.description.length>20,x.name);
  for(const type of x.format.supported){const s=x.format.elements[type];assert.ok(x.format.supported.includes(s.next),`${x.name}: ${type} → ${s.next} is supported`);assert.ok(x.format.supported.includes(s.tab),`${x.name}: ${type} Tab → ${s.tab}`);}
  if(x.category!=='Structure')for(const s of x.sample)assert.ok(x.format.supported.includes(s.type),`${x.name} sample uses ${s.type}`);}
});

test('the requested formats exist with structural differences, not just labels',()=>{
 const names=['Standard Feature Screenplay','Short Film Screenplay','Independent Film Screenplay','Shooting Script','Screenplay for Beginners','International Screenplay','A4 Screenplay','Custom Screenplay Format','One-Hour TV Drama','Half-Hour TV Drama','Single-Camera Comedy','Multi-Camera Sitcom','Television Pilot','Television Episode','BBC Screenplay for TV','TV Shooting Script','Stageplay','Radio Drama','Audio Drama','Documentary Script','Commercial Script','Music Video Script','Comic Book Script','Graphic Novel','Animation Screenplay','Screenplay — Cole and Haag style','Screenplay — Warner Brothers style','Custom Studio Format','Three-Act Structure','Five-Act Structure','Eight-Sequence Structure','Save the Cat-style Beat Sheet',"Hero's Journey",'Dan Harmon Story Circle',"Freytag's Pyramid"];
 for(const n of names)t(n);
 const a4=t('A4 Screenplay').format,intl=t('International Screenplay').format;assert.ok(Math.abs(a4.page.width-8.2677)<1e-3&&Math.abs(a4.page.height-11.6929)<1e-3);assert.equal(intl.language,'en-GB');assert.ok(Math.abs(intl.page.height-11.6929)<1e-3);
 const multicam=t('Multi-Camera Sitcom').format;assert.equal(multicam.elements.Dialogue.line,24);assert.equal(multicam.elements.Action.caps,true);assert.equal(multicam.numbering.scenes,true);assert.ok(multicam.supported.includes('New Act'));
 const stage=t('Stageplay').format;assert.equal(stage.kind,'stageplay');assert.equal(stage.elements.Character.align,'center');assert.equal(stage.elements['Scene Heading'].next,'Stage Direction');assert.ok(stage.supported.includes('Stage Direction'));
 const radio=t('Radio Drama').format;assert.ok(radio.supported.includes('Sound Effect'));assert.equal(radio.elements['Sound Effect'].caps,true);assert.equal(radio.elements['Sound Effect'].underline,true);assert.equal(radio.elements.Character.left,0);assert.equal(radio.elements.Dialogue.left,1.5);assert.equal(radio.elements.Dialogue.next,'Character');assert.equal(radio.numbering.scenes,true);
 const audio=t('Audio Drama').format;assert.ok(audio.supported.includes('Sound Effect')&&audio.supported.includes('Narration'));assert.equal(audio.elements.Character.left,2.2);assert.equal(audio.numbering.scenes,false);
 const doc=t('Documentary Script').format;assert.ok(['Narration','Sound Effect','Caption'].every(e=>doc.supported.includes(e as ElementType)));assert.equal(doc.elements.Shot.next,'Narration');
 const ad=t('Commercial Script').format;assert.ok(ad.supported.includes('Caption'));assert.equal(t('Commercial Script').targetPages,2);
 const mv=t('Music Video Script').format;assert.ok(mv.supported.includes('Lyrics'));assert.equal(mv.elements.Shot.next,'Lyrics');
 const anim=t('Animation Screenplay').format;assert.equal(anim.numbering.scenes,true);assert.ok(anim.supported.includes('Sequence'));
 for(const n of ['Shooting Script','TV Shooting Script','Custom Studio Format'])assert.equal(t(n).format.numbering.scenes,true,n);
 const comic=t('Comic Book Script').format;assert.equal(comic.kind,'comic');assert.ok(comic.supported.includes('Panel'));
 assert.equal(t("Hero's Journey").structure!.length,17);assert.equal(t("Freytag's Pyramid").structure!.length,7);assert.equal(t('Five-Act Structure').structure!.length,5);for(const n of ["Hero's Journey","Freytag's Pyramid",'Five-Act Structure'])assert.equal(t(n).category,'Structure');
 assert.equal(t('Podcast Script').format.supported.includes('Sound Effect'),true,'the podcast template now has the SFX/MUSIC cue element it describes');
});

test('switching templates keeps every paragraph text and identity and maps incompatible elements explicitly',()=>{
 const paragraphs=[p('Scene Heading','INT. ROOM - DAY'),p('Action','A door opens.'),p('Character','ALEX'),p('Parenthetical','(softly)'),p('Dialogue','Hello.'),p('Transition','CUT TO:'),p('Shot','CLOSE ON THE DOOR')];
 const doc={paragraphs,writingFormat:STANDARD_FORMAT} as unknown as ScriptDocument;
 for(const target of FORMAT_TEMPLATES.filter(x=>x.category!=='Structure')){const r=conversion(doc,target.format);
  assert.equal(r.paragraphs.length,paragraphs.length,target.name);assert.deepEqual(r.paragraphs.map(q=>q.id),paragraphs.map(q=>q.id),target.name);assert.deepEqual(r.paragraphs.map(q=>q.text),paragraphs.map(q=>q.text),target.name);
  for(const q of r.paragraphs)assert.ok(target.format.supported.includes(q.type),`${target.name}: ${q.type}`);
  for(const [i,q] of r.paragraphs.entries())if(q.type!==paragraphs[i].type)assert.ok(q.conversionReview,`${target.name}: changed element is marked for review`);}
});

test('inference: scene-heading prefixes, transitions, shots and audio cues; prose and dialogue are left alone',()=>{
 for(const h of ['int. bedroom - night','ext. road - day','INT./EXT. CAR - DAY','int/ext. car','ext./int. car - day','ext/int. car','i/e. car - day','I/E car - day'])assert.equal(infer(h)?.type,'Scene Heading',h);
 for(const prose of ['Interior design is hard.','Extra time.','Internal memo.','Exit, pursued by a bear.'])assert.equal(infer(prose),null,prose);
 for(const x of ['cut to:','smash cut to:','match cut to:','jump cut to:','dissolve to:','fade in:','fade out.','fade to black.'])assert.deepEqual([infer(x)?.type,infer(x)?.confident],['Transition',true],x);
 for(const x of ['CUT TO','FADE OUT','DISSOLVE TO'])assert.deepEqual([infer(x)?.type,infer(x)?.confident],['Transition',false],x+' is offered, never forced, and never as a character');
 for(const x of ['CLOSE ON THE CLOCK','close on: the clock','INSERT: THE LETTER','POV: SARAH','ANGLE ON SARAH','WIDE SHOT','TRACKING SHOT','EXTREME CLOSE UP','P.O.V. SARAH'])assert.deepEqual([infer(x)?.type,infer(x)?.confident],['Shot',false],x);
 for(const x of ['Close on the edge of panic, she runs.','Insert the key and turn it.','Wide awake, she listens.'])assert.equal(isShot(x),false,x);
 assert.equal(infer('CLOSE ON THE CLOCK',t('Stageplay').format),null,'no Shot where the template has none');
 for(const x of ['SCENE ONE','MOMENTS LATER','MONTAGE','THE END'])assert.notEqual(infer(x)?.type,'Character',x);
 assert.deepEqual([infer('SARAH')?.type,infer('SARAH')?.confident],['Character',false]);
 assert.equal(inferElement('INT. means interior',p('Dialogue','INT. means interior'),undefined,STANDARD_FORMAT,new Set()),null,'dialogue is never reclassified');
 assert.equal(inferElement('int. room - day',p('Action','int. room - day',{elementSource:'manual'}),undefined,STANDARD_FORMAT,new Set()),null,'an explicit element choice wins');
 const radio=t('Radio Drama').format;for(const x of ['SFX: RAIN','sfx: door slams','MUSIC: THEME UP','F/X: THUNDER'])assert.deepEqual([infer(x,radio)?.type,infer(x,radio)?.confident],['Sound Effect',true],x);
 assert.equal(infer('SFX: RAIN')?.type===undefined||infer('SFX: RAIN')?.type!=='Sound Effect',true,'no Sound Effect in the feature template');
 assert.equal(inferElement('MUSIC: THEME',p('Character','MUSIC: THEME'),undefined,radio,new Set())?.type,'Sound Effect','a new speaker line can become an audio cue');assert.equal(inferElement('MUSIC: THEME',p('Character','MUSIC: THEME'),undefined,STANDARD_FORMAT,new Set()),null);assert.equal(inferElement('SFX: RAIN',p('Action','SFX: RAIN',{elementSource:'manual'}),undefined,radio,new Set()),null);
 const docu=t('Documentary Script').format;assert.equal(infer('LOWER THIRD: ANNA BERG',docu)?.type,'Caption');assert.deepEqual([infer('NARRATOR (V.O.): The harbor wakes.',docu)?.type,infer('NARRATOR (V.O.): The harbor wakes.',docu)?.confident],['Narration',false]);
 const stage=t('Standard Stageplay').format;assert.equal(infer('SCENE TWO',stage)?.type,'Scene Heading');const comic=t('Graphic Novel').format;assert.equal(inferElement('PAGE 2',p('Panel Description','PAGE 2'),undefined,comic,new Set())?.type,'Comic Page');
});

test('auto-formatting options: master switch, character detection, template rules and ambiguous suggestions',()=>{
 const names=new Set(['SARAH']);
 assert.equal(infer('int. room - day',STANDARD_FORMAT,{enabled:false}),null,'master off: nothing is recognized');
 assert.equal(infer('SARAH',STANDARD_FORMAT,{characters:false},names),null,'character detection off');
 assert.equal(infer('WIDE SHOT',STANDARD_FORMAT,{ambiguous:false}),null,'ambiguous suggestions off');
 assert.equal(infer('cut to:',STANDARD_FORMAT,{ambiguous:false})?.type,'Transition','certain recognitions stay with suggestions off');
 const stage=t('Standard Stageplay').format;assert.equal(infer('SCENE TWO',stage,{templateRules:false}),null,'template-specific patterns off');assert.equal(infer('int. room - day',stage,{templateRules:false})?.type,'Scene Heading','generic rules stay');
 assert.equal(infer('SFX: RAIN',t('Radio Drama').format,{templateRules:false}),null);
 for(const key of ['autoFormatting','detectCharacters','autoDialogue','smartTypeSuggestions','templateFormatting','ambiguousSuggestions'] as const){assert.equal(DEFAULT_EDITOR_PREFS[key],true,key+' defaults on');assert.equal(normalizeEditorPreferences({[key]:false})[key],false,key+' persists off');assert.equal(normalizeEditorPreferences({})[key],true);}
 const off=effectivePreferences({...DEFAULT_EDITOR_PREFS,autoFormatting:false});
 for(const key of ['autoCapitalize','autoSceneHeadings','autoParentheticals','autoTransitions','detectCharacters','autoDialogue','smartTypeSuggestions','templateFormatting','ambiguousSuggestions'] as const)assert.equal(off[key],false,key+' off with the master switch');
 assert.equal(effectivePreferences(DEFAULT_EDITOR_PREFS),DEFAULT_EDITOR_PREFS,'on: stored choices apply unchanged');
 assert.equal(normalizeEditorPreferences({autoFormatting:false,detectCharacters:false}).autoSceneHeadings,true,'individual choices are kept while the master switch is off');
});

test('fonts: other Courier faces fall back to the bundled Courier Prime before generic monospace',()=>{
 assert.equal(fontStack('Courier Final Draft'),"'Courier Final Draft', 'Courier Prime', monospace");assert.equal(fontStack('Courier New'),"'Courier New', 'Courier Prime', monospace");assert.equal(fontStack('Courier Prime'),"'Courier Prime', monospace");assert.equal(fontStack('JetBrains Mono'),"'JetBrains Mono', monospace");
 assert.equal(styleFor(STANDARD_FORMAT,p('Dialogue')).font,'Courier Prime');
});

test('print header: page number only (top right, not on page 1), in the script font; the document header settings win',async()=>{
 const {printHtml}=await import('../src/production/print');
 const body=Array.from({length:90},(_,i)=>p('Action','Line '+i+' of a long scene that keeps the printer busy for several pages.'));
 const doc={id:'hdr',titlePage:{title:'SECRET TITLE',author:'',draftDate:'',contact:'',copyright:''},paragraphs:body,writingFormat:STANDARD_FORMAT,beats:[],flowLines:[],outlineLanes:[],outlineMarkers:[],characterHighlights:{}} as unknown as ScriptDocument;
 // The PDF dialog passes headerText undefined (1.15.3 passed the title, which also replaced any configured header text).
 const headers=(html:string)=>[...html.matchAll(/<div style="position:absolute;left:[^"]*top:\.5in;display:flex;([^"]*)">(.*?)<\/div>/g)].map(m=>({style:m[1],text:m[2].replace(/<[^>]+>/g,'|')}));
 const plain=headers(printHtml(doc,{includeTitlePage:false,showHeaders:true,headerText:undefined}));
 assert.ok(plain.length>=2,'several pages after page 1');
 plain.forEach((h,i)=>{assert.ok(!h.text.includes('SECRET TITLE'),'no running title');assert.equal(h.text.replace(/\|/g,''),(i+2)+'.');assert.match(h.style,/font-size:12pt/);assert.match(h.style,/Courier Prime/);});
 const configured={...doc,headerFooterConfig:{showHeader:true,showFooter:false,firstPageHasHeader:false,firstPageHasFooter:false,header:{left:'BLUE DRAFT',center:'',right:'{PAGE}.'},footer:{left:'',center:'',right:''}}} as unknown as ScriptDocument;
 const custom=headers(printHtml(configured,{includeTitlePage:false,showHeaders:true,headerText:undefined}));
 assert.ok(custom.length>=2);assert.ok(custom.every(h=>h.text.includes('BLUE DRAFT')),'configured header text is printed');
});

test('every transition the inference recognizes also gets its ending on completion',async()=>{
 const {transitionName,formatTransition}=await import('../src/editor/automaticFormatting');
 const state=(text:string)=>({text,start:text.length,end:text.length,runs:undefined});
 for(const [typed,expected] of [['time cut','TIME CUT:'],['flash cut to','FLASH CUT TO:'],['fade to','FADE TO:'],['fade to black','FADE TO BLACK.'],['fade out','FADE OUT.'],['jump cut to','JUMP CUT TO:'],['wipe to','WIPE TO:']] as const){
  assert.ok(transitionName(typed),typed);assert.equal(formatTransition(state(typed.toUpperCase()),STANDARD_FORMAT).text,expected);
  const r=infer(expected);assert.equal(r?.type,'Transition');assert.equal(r?.confident,true,expected+' with its ending is a confident transition');
 }
 assert.equal(transitionName('Cut to the chase.'),null);assert.equal(formatTransition(state('CUT TO:'),STANDARD_FORMAT).text,'CUT TO:','no doubled ending');
});

test('a word that exactly fills the line: the space hangs and the next line starts with the next word, in layout and print',async()=>{
 const {layoutScript,measureLines}=await import('../src/production/layout');const {printHtml}=await import('../src/production/print');
 const mono=(text:string,style:{size:number})=>[...text].length*style.size*0.6;
 const f=STANDARD_FORMAT,par=styleFor(f,p('Parenthetical')),width=(f.page.width-f.page.left-f.page.right-par.left-par.right)*72,chars=Math.round(width/7.2);
 const first='('+'x'.repeat(chars-2)+'y',text=first+'  next words here)';
 const lines=measureLines(p('Parenthetical',text),par,width,0,text.length,mono as never);
 assert.equal(lines.length,2);assert.equal(lines[0].text,first,'trailing spaces are not drawn');assert.equal(lines[0].trail,2);assert.equal(text.slice(lines[1].start,lines[1].end),'next words here)','line 2 starts with the word');
 assert.equal(lines[0].end,lines[1].start,'source ranges stay contiguous');
 const action='x'.repeat(59)+'y next line';const al=measureLines(p('Action',action),styleFor(f,p('Action')),(f.page.width-f.page.left-f.page.right)*72,0,action.length,mono as never);assert.deepEqual(al.map(l=>action.slice(l.start,l.end)),['x'.repeat(59)+'y ','next line']);
 const doc={id:'wrap',titlePage:{title:'',author:'',draftDate:'',contact:'',copyright:''},paragraphs:[p('Character','MAREN'),p('Parenthetical',text),p('Dialogue','Fine.'),p('Centered Text','THE '+'Z'.repeat(52)+' END OF THE STORY')],writingFormat:f,beats:[],flowLines:[],outlineLanes:[],outlineMarkers:[],characterHighlights:{}} as unknown as ScriptDocument;
 const html=printHtml(doc,{includeTitlePage:false}),drawn=[...html.matchAll(/<div style="white-space:pre;[^"]*">(.*?)<\/div>/g)].map(m=>m[1]);
 assert.ok(drawn.some(t=>t.startsWith('next words here)')),'printed continuation line');assert.ok(!drawn.some(t=>/^ /.test(t)),'no printed line starts with a space');assert.ok(!drawn.some(t=>/ $/.test(t)),'no printed line ends with a hanging space (right/centre alignment stays exact)');
 assert.equal(layoutScript(doc.paragraphs,f,undefined,mono as never).pages.length,1);
});
