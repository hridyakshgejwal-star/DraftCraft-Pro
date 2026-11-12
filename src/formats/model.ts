import type {CSSProperties} from 'react';
import type {ElementType, Paragraph, ScriptDocument, HeaderFooterConfig, TitlePage} from '../types/script';

export type FormatKind='screenplay'|'television'|'stageplay'|'comic'|'prose'|'structure';
export type TemplateCategory='My Templates'|'Structure'|'Script'|'TV'|'Graphic Novel'|'Text';
export const FORMAT_ELEMENTS:ElementType[]=['Scene Heading','Action','Character','Parenthetical','Dialogue','Dual Dialogue','Transition','Shot','General','Centered Text','Lyrics','New Act','End of Act','Scene Summary','Cast List','Outline Level 1','Outline Level 2','Outline Level 3','Sequence','Note','Stage Direction','Song Title','Comic Page','Panel','Panel Description','Caption','Sound Effect','Narration','User Defined'];
export interface ElementStyle {
  font:string; size:number; bold:boolean; italic:boolean; underline:boolean;
  caps:boolean; align:'left'|'center'|'right'|'justify'; left:number; right:number; first:number;
  before:number; after:number; line:number; breakBefore:boolean; keepNext:boolean;
  next:ElementType; tab:ElementType;
}
export interface WritingFormat {
  version:1; templateId:string; templateVersion:number; name:string; kind:FormatKind; language:string;
  page:{width:number;height:number;top:number;bottom:number;left:number;right:number};
  elements:Record<ElementType,ElementStyle>; supported:ElementType[];
  mode:'standard'|'smart'|'manual'; sceneSeparator:string;
  transitionPunctuation?:'colon'|'traditional'|'preserve';
  spacingRules?:{version:1;afterSpeech:number;collapse:boolean;trimPageTop:boolean};
  numbering:{scenes:boolean;comicPages:boolean;panels:boolean;resetPanels:boolean};
  continuations:{more:boolean;continued:boolean}; titlePage:boolean;
  customElements:{name:string;style:ElementStyle}[];
}
export type SmartCategory='characters'|'extensions'|'intros'|'locations'|'timesOfDay'|'transitions';
export interface SmartTypePreferences {version:1;entries:Partial<Record<SmartCategory,string[]>>;excluded:Partial<Record<SmartCategory,string[]>>;disabled:SmartCategory[];accept:'both'|'tab'|'enter';sort:'alphabetical'|'usage';predict:boolean}
export const DEFAULT_SMART:SmartTypePreferences={version:1,entries:{},excluded:{},disabled:[],accept:'both',sort:'usage',predict:false};
export interface FormatTemplate {id:string;name:string;category:TemplateCategory;description:string;format:WritingFormat;targetPages:number;sample:{type:ElementType;text:string;customElementLabel?:string}[];structure?:string[];custom?:boolean;source:string;headerFooter?:HeaderFooterConfig;title?:Partial<TitlePage>;smartType?:SmartTypePreferences;characterMemory?:ScriptDocument['characterMemory'];characterShortcuts?:ScriptDocument['characterShortcuts'];planning?:Pick<ScriptDocument,'beats'|'flowLines'|'outlineLanes'|'outlineMarkers'|'storyStructure'>;shortcutProfile?:import('../shortcuts/model').ShortcutProfile}

export function baseFormat(kind:FormatKind='screenplay'):WritingFormat {
 const base:ElementStyle={font:'Courier Prime',size:12,bold:false,italic:false,underline:false,caps:false,align:'left',left:0,right:0,first:0,before:0,after:12,line:12,breakBefore:false,keepNext:false,next:'Action',tab:'Character'};
 const elements=Object.fromEntries(FORMAT_ELEMENTS.map(e=>[e,{...base}])) as Record<ElementType,ElementStyle>;
 const set=(e:ElementType,p:Partial<ElementStyle>)=>Object.assign(elements[e],p);
 set('Scene Heading',{caps:true,before:kind==='screenplay'||kind==='television'?24:12,keepNext:true,tab:'Scene Heading'});
 set('Character',{caps:true,left:2.2,right:.4,after:0,keepNext:true,next:'Dialogue',tab:'Parenthetical'});
 set('Dialogue',{left:1,right:1.5,after:0,next:'Action',tab:'Parenthetical'});
 set('Dual Dialogue',{left:0,right:3.1,after:0});
 // Template version 3: parenthetical 3.1"–5.6" from the paper edge (2.9" right margin), as in common US practice.
 set('Parenthetical',{left:1.6,right:1.9,after:0,next:'Dialogue',tab:'Dialogue',keepNext:true});
 set('Transition',{caps:true,align:'right',next:'Scene Heading',tab:'Scene Heading'});
 set('Shot',{caps:true,keepNext:true,before:kind==='screenplay'||kind==='television'?24:0});
 set('General',{next:'General',tab:'General'});set('Centered Text',{align:'center',next:'Centered Text'});
 set('New Act',{caps:true,align:'center',underline:true,breakBefore:true,keepNext:true,next:'Scene Heading'});
 set('End of Act',{caps:true,align:'center',next:'New Act'});
 set('Lyrics',{left:1,right:1.5,italic:true,next:'Lyrics'});
 set('Stage Direction',{left:.5,right:.5,italic:true,next:'Dialogue'});
 set('Song Title',{caps:true,align:'center',keepNext:true,next:'Lyrics'});
 set('Cast List',{next:'Action'});set('Scene Summary',{italic:true,next:'Scene Summary'});
 for(const [i,e] of (['Outline Level 1','Outline Level 2','Outline Level 3'] as ElementType[]).entries())set(e,{left:i*.3,bold:i===0,next:e,tab:i===0?'Outline Level 2':i===1?'Outline Level 3':'Outline Level 3'});
 set('Sequence',{bold:true,keepNext:true});set('Note',{italic:true,next:'Note'});
 set('Comic Page',{caps:true,bold:true,breakBefore:true,keepNext:true,next:'Panel'});
 set('Panel',{bold:true,keepNext:true,next:'Panel Description'});
 set('Panel Description',{next:'Character'});
 const script:ElementType[]=['Scene Heading','Action','Character','Parenthetical','Dialogue','Dual Dialogue','Transition','Shot','General','Centered Text','Scene Summary','Sequence','Note','Outline Level 1','Outline Level 2','Outline Level 3','User Defined'];
 let supported=[...script];
 if(kind==='television')supported.push('New Act','End of Act','Cast List');
 // Theatre scripts have no camera directions: Shot paragraphs convert to Stage Direction (see conversion()).
 if(kind==='stageplay') {supported=supported.filter(e=>e!=='Shot');supported.push('New Act','End of Act','Cast List','Stage Direction','Lyrics','Song Title');set('Dialogue',{left:0,right:0,after:12});set('Parenthetical',{left:.5,right:.5,italic:true});}
 if(kind==='comic') {supported=['Comic Page','Panel','Panel Description','Character','Dialogue','Caption','Sound Effect','Narration','General','Note','User Defined'];for(const e of ['Character','Dialogue','Caption','Sound Effect','Narration'] as ElementType[])set(e,{left:0,right:0,after:12});}
 if(kind==='prose'||kind==='structure') {supported=['General','Centered Text','Outline Level 1','Outline Level 2','Outline Level 3','Scene Summary','Note','User Defined'];for(const e of FORMAT_ELEMENTS)set(e,{left:0,right:0,caps:false,next:'General',tab:'General'});set('General',{font:'Times New Roman',line:24,first:.5,after:0});set('Outline Level 1',{font:'Times New Roman',bold:true,size:14,line:24,first:0,breakBefore:true,keepNext:true});}
 return {version:1,templateId:'standard-feature-screenplay',templateVersion:3,...(['screenplay','television'].includes(kind)?{spacingRules:{version:1 as const,afterSpeech:12,collapse:true,trimPageTop:true}}:{}),name:'Standard Feature Screenplay',kind,language:'en-US',page:{width:8.5,height:11,top:1,bottom:1,left:1.5,right:1},elements,supported,mode:'smart',sceneSeparator:' - ',transitionPunctuation:'traditional',numbering:{scenes:false,comicPages:true,panels:true,resetPanels:true},continuations:{more:true,continued:true},titlePage:true,customElements:[]};
}
const aligned=new WeakMap<ElementStyle,Map<string,ElementStyle>>();
/** The element's style; a paragraph's own alignment (Format › Alignment) overrides the element's. */
export function styleFor(format:WritingFormat,p:Paragraph):ElementStyle{const base=p.type==='User Defined'?format.customElements.find(e=>e.name===p.customElementLabel)?.style || format.elements['User Defined']:format.elements[p.type] || format.elements.General;
 if(!p.align||p.align===base.align)return base;let variants=aligned.get(base);if(!variants){variants=new Map();aligned.set(base,variants);}let style=variants.get(p.align);if(!style){style={...base,align:p.align};variants.set(p.align,style);}return style;}
export function paragraphGap(previous:Paragraph|undefined,current:Paragraph,format:WritingFormat,pageTop=false){const s=styleFor(format,current),rules=format.spacingRules;if(pageTop||!previous)return rules?.trimPageTop?0:s.before;const prior=styleFor(format,previous);if(!rules)return prior.after+s.before;const gap=rules.collapse?Math.max(prior.after,s.before):prior.after+s.before,completed=['Dialogue','Dual Dialogue'].includes(previous.type)&&!['Parenthetical','Dialogue','Dual Dialogue'].includes(current.type);return Math.max(gap,completed?rules.afterSpeech:0);}
/** One CSS font-family list for the editor, canvas measurement and print, so an
 * unavailable face falls back to the same generic family everywhere. */
/* Another Courier (Courier Final Draft, Courier New, Courier Screenplay…) falls back to the bundled Courier Prime,
 * which has the same 0.6 em advance, before the platform's generic monospace face. */
export function fontStack(font:string){const name=String(font||'Courier Prime').replace(/['";{}\\]/g,'').trim()||'Courier Prime';return `'${name}', ${/Courier/i.test(name)&&name!=='Courier Prime'?"'Courier Prime', ":''}${/Courier|Mono/i.test(name)?'monospace':'serif'}`;}
export function elementCss(format:WritingFormat,p:Paragraph):CSSProperties {
 const s=styleFor(format,p),content=format.page.width-format.page.left-format.page.right;
 return {fontFamily:fontStack(s.font),fontSize:s.size+'pt',fontWeight:s.bold?700:400,fontStyle:s.italic?'italic':'normal',textDecoration:s.underline?'underline':'none',textTransform:s.caps?'uppercase':'none',textAlign:s.align,paddingLeft:s.left+'in',paddingRight:s.right+'in',width:'100%',maxWidth:'100%',textIndent:s.first+'in',lineHeight:s.line+'pt',letterSpacing:'normal',boxSizing:'border-box',minHeight:s.line+'pt',...(content<=0?{display:'none'}:{})};
}
// Counting wide glyphs keeps CJK layouts from using Latin character widths.
export function textUnits(text:string){return [...text].reduce((n,c)=>n+(/[\u2e80-\u9fff\uf900-\ufaff\u{20000}-\u{2ffff}]/u.test(c)?2:1),0);}
export function wrappedLines(text:string,width:number):string[]{
 const result:string[]=[];for(const explicit of text.split('\n')){let line='';for(const token of explicit.match(/\S+\s*|\s+/gu)||['']){if(line&&textUnits(line+token)>width){result.push(line.trimEnd());line='';}if(textUnits(token)>width){for(const c of token){if(textUnits(line+c)>width){result.push(line);line='';}line+=c;}}else line+=token;}result.push(line.trimEnd());}return result;
}
type Measurement={lines:string[];height:number;style:ElementStyle};
const measurements=new WeakMap<WritingFormat,WeakMap<Paragraph,Measurement>>();
export function paragraphMeasure(p:Paragraph,f:WritingFormat):Measurement{let cache=measurements.get(f);if(!cache){cache=new WeakMap();measurements.set(f,cache);}const cached=cache.get(p);if(cached)return cached;const s=styleFor(f,p),width=Math.max(1,(f.page.width-f.page.left-f.page.right-s.left-s.right)*72),columns=Math.max(1,Math.floor(width/(s.size*.6)));const lines=wrappedLines(p.text,columns);const value={lines,height:lines.length*s.line+s.before+s.after,style:s};cache.set(p,value);return value;}
export function automaticNumbers(paragraphs:Paragraph[],f:WritingFormat):Paragraph[]{
 let page=0,panel=0,scene=0,changed=false;const next=paragraphs.map(p=>{let text=p.text,number=p.sceneNumber;
 if(p.type==='Scene Heading'){scene++;if(f.numbering.scenes&&!number)number=String(scene);}
 if(f.kind==='comic'){if(p.type==='Comic Page'){page++;if(f.numbering.resetPanels)panel=0;if(f.numbering.comicPages)text=text.replace(/^PAGE\s+\d+/i,'PAGE '+page);}if(p.type==='Panel'){panel++;if(f.numbering.panels)text=text.replace(/^PANEL\s+\d+/i,'PANEL '+panel);}}
 if(text!==p.text||number!==p.sceneNumber){changed=true;return {...p,text,sceneNumber:number};}return p;});return changed?next:paragraphs;
}

export function validateFormat(input:unknown):WritingFormat {
 if(!input||typeof input!=='object')throw Error('Missing format definition.');const f=structuredClone(input) as WritingFormat;
 if(f.version!==1||!['screenplay','television','stageplay','comic','prose','structure'].includes(f.kind)||typeof f.name!=='string'||!f.name.trim()||f.name.length>120||typeof f.templateId!=='string')throw Error('Unsupported writing format.');
 if(f.spacingRules&&(f.spacingRules.version!==1||!Number.isFinite(f.spacingRules.afterSpeech)||f.spacingRules.afterSpeech<0||f.spacingRules.afterSpeech>144||typeof f.spacingRules.collapse!=='boolean'||typeof f.spacingRules.trimPageTop!=='boolean'))throw Error('Invalid paragraph spacing rules.');
 const finite=(n:unknown,min:number,max:number)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
 for(const k of ['width','height'] as const)if(!finite(f.page?.[k],4,20))throw Error('Invalid page size.');
 for(const k of ['left','right','top','bottom'] as const)if(!finite(f.page[k],0,4))throw Error('Invalid page margin.');
 if(f.page.width-f.page.left-f.page.right<1||f.page.height-f.page.top-f.page.bottom<1)throw Error('The page margins leave insufficient writing space.');
 if(!Array.isArray(f.supported)||!f.supported.length||f.supported.some(e=>!FORMAT_ELEMENTS.includes(e)))throw Error('Invalid supported elements.');
 const check=(s:ElementStyle)=>{if(!s||typeof s.font!=='string'||s.font.length>100||!finite(s.size,6,72)||!finite(s.line,6,150)||!finite(s.left,0,10)||!finite(s.right,0,10)||s.left+s.right>f.page.width-f.page.left-f.page.right-.5||!finite(s.first,-3,3)||!finite(s.before,0,300)||!finite(s.after,0,300)||!['left','center','right','justify'].includes(s.align)||!FORMAT_ELEMENTS.includes(s.next)||!FORMAT_ELEMENTS.includes(s.tab)||!['bold','italic','underline','caps','breakBefore','keepNext'].every(k=>typeof s[k as keyof ElementStyle]==='boolean'))throw Error('Invalid element style or indentation.');};
 for(const e of FORMAT_ELEMENTS)check(f.elements?.[e]);
 if(!Array.isArray(f.customElements)||f.customElements.length>100)throw Error('Invalid custom elements.');for(const e of f.customElements){if(typeof e.name!=='string'||!e.name.trim()||e.name.length>80)throw Error('Invalid custom element name.');check(e.style);}
 if(!['standard','smart','manual'].includes(f.mode)||typeof f.sceneSeparator!=='string'||f.sceneSeparator.length>12)throw Error('Invalid formatting behavior.');
 if(f.transitionPunctuation===undefined)f.transitionPunctuation='colon';
 if(!['colon','traditional','preserve'].includes(f.transitionPunctuation))throw Error('Invalid transition punctuation rules.');
 if(typeof f.language!=='string'||f.language.length>40||!Number.isInteger(f.templateVersion)||f.templateVersion<1||typeof f.titlePage!=='boolean'||!f.numbering||!['scenes','comicPages','panels','resetPanels'].every(k=>typeof f.numbering[k as keyof typeof f.numbering]==='boolean')||!f.continuations||typeof f.continuations.more!=='boolean'||typeof f.continuations.continued!=='boolean')throw Error('Invalid template behavior settings.');
 return f;
}
export function validateSmartType(raw:unknown):SmartTypePreferences {
 if(!raw||typeof raw!=='object')throw Error('Invalid SmartType preferences.');const p=structuredClone(raw) as SmartTypePreferences,categories:SmartCategory[]=['characters','extensions','intros','locations','timesOfDay','transitions'];
 if(p.version!==1||!['both','tab','enter'].includes(p.accept)||!['usage','alphabetical'].includes(p.sort)||typeof p.predict!=='boolean'||!Array.isArray(p.disabled)||p.disabled.some(v=>!categories.includes(v))||!p.entries||!p.excluded)throw Error('Invalid SmartType preferences.');
 for(const key of categories)for(const source of [p.entries,p.excluded])if(source[key]&&(!Array.isArray(source[key])||source[key]!.length>10000||source[key]!.some(s=>typeof s!=='string'||s.length>250)))throw Error('Invalid SmartType list.');return p;
}
export function conversion(doc:ScriptDocument,target:WritingFormat){
 const incompatible=(doc.writingFormat?.kind || 'screenplay')!==target.kind;
 const paragraphs=doc.paragraphs.map(p=>{
   if(target.supported.includes(p.type)&&!(target.kind==='stageplay'&&p.type==='Action'))return {...p,conversionReview:undefined};
   const equivalent:Partial<Record<ElementType,ElementType>>=target.kind==='stageplay'?{Action:'Stage Direction',Shot:'Stage Direction',Transition:'Stage Direction'}:target.kind==='comic'?{Action:'Panel Description','Scene Heading':'Panel Description',Parenthetical:'Panel Description',Shot:'Panel Description',Transition:'Panel Description'}:target.kind==='prose'||target.kind==='structure'?Object.fromEntries(FORMAT_ELEMENTS.map(e=>[e,'General'])):{'Stage Direction':'Action','Panel Description':'Action',Caption:'Dialogue',Narration:'Action'};
   const type=equivalent[p.type] || 'General';return {...p,type,conversionReview:incompatible?`Review ${p.type} → ${type}`:`${p.type} retained as ${type}`};
 });
 return {...doc,paragraphs:automaticNumbers(paragraphs,target),writingFormat:structuredClone(target),appliedTemplateId:target.templateId,sceneNumberPlacement:target.numbering.scenes?'both' as const:doc.sceneNumberPlacement};
}

const speedFormats=new WeakMap<WritingFormat,WritingFormat>();
/** Speed View geometry: every element at the Action indents, left aligned, with no first-line indent, so writing is not
 * slowed by element positions. Only the editor draws with it; pages, printing and the timeline keep the real format. */
export function speedFormat(format:WritingFormat):WritingFormat{const cached=speedFormats.get(format);if(cached)return cached;
 const action=format.elements.Action,flat=(s:ElementStyle):ElementStyle=>({...s,left:action.left,right:action.right,first:0,align:'left'});
 const elements=Object.fromEntries(Object.entries(format.elements).map(([k,v])=>[k,flat(v)])) as WritingFormat['elements'];
 const result={...format,elements,customElements:format.customElements.map(e=>({...e,style:flat(e.style)}))};speedFormats.set(format,result);return result;}
