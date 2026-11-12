import type {ScriptDocument,Paragraph,ElementType,TextRun} from '../types/script';
import {baseFormat,FORMAT_ELEMENTS,paragraphGap,validateFormat,validateSmartType,type ElementStyle} from '../formats/model';
const escapeXml=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const direct=(e:Element,name:string)=>Array.from(e.children).filter(c=>c.tagName===name);
const fdxType=(type:ElementType)=>(({ 'Outline Level 1':'Outline 1','Outline Level 2':'Outline 2','Outline Level 3':'Outline 3','Scene Summary':'Summary'} as Partial<Record<ElementType,string>>)[type]||type);
const semantic=(raw:string):ElementType=>({'Outline 1':'Outline Level 1','Outline 2':'Outline Level 2','Outline 3':'Outline Level 3',Summary:'Scene Summary'}[raw] as ElementType)|| (FORMAT_ELEMENTS.includes(raw as ElementType)?raw as ElementType:'User Defined');
export function exportToFdx(doc:ScriptDocument,template=false):string {
 let xml='<?xml version="1.0" encoding="UTF-8"?>\n<FinalDraft DocumentType="Script" Template="'+(template?'Yes':'No')+'" Version="5">\n<Content>\n';
 for(const [index,p] of doc.paragraphs.entries()){const dual=p.dualGroupId&&doc.paragraphs.some(v=>v.dualGroupId===p.dualGroupId&&v.dualColumn===2);if(dual&&doc.paragraphs[index-1]?.dualGroupId!==p.dualGroupId)xml+='<Paragraph><DualDialogue>\n';xml+='<Paragraph Type="'+escapeXml(p.type==='User Defined'&&p.customElementLabel?p.customElementLabel:fdxType(p.type==='Dual Dialogue'?'Dialogue':p.type))+'"'+(p.sceneNumber?' Number="'+escapeXml(p.sceneNumber)+'"':'')+Object.entries(p.fdxUnknown?.attributes||{}).filter(([k])=>!['Type','Number'].includes(k)&&/^[A-Za-z_][\w.:-]*$/.test(k)).map(([k,v])=>' '+k+'="'+escapeXml(v)+'"').join('')+'>\n';
 const runs=p.runs?.map(r=>r.text).join('')===p.text?p.runs:[{text:p.text}];for(const r of runs||[]){const styles=[r.style?.bold?'Bold':'',r.style?.italic?'Italic':'',r.style?.underline?'Underline':'',r.style?.strikethrough?'Strikeout':''].filter(Boolean);xml+='<Text'+(styles.length?' Style="'+styles.join('+')+'"':'')+'>'+escapeXml(r.text)+'</Text>';}
 for(const n of p.notes||[])xml+='<ScriptNote Name="'+escapeXml(n.name||'')+'" Author="'+escapeXml(n.author)+'" Color="'+n.color+'" Category="'+(n.category||'general')+'"><Paragraph><Text>'+escapeXml(n.text)+'</Text></Paragraph></ScriptNote>';
 if(p.bookmark)xml+='<Bookmark Name="'+escapeXml(typeof p.bookmark==='string'?p.bookmark:p.bookmark.name)+'" Color="'+(typeof p.bookmark==='string'?'#3b82f6':p.bookmark.color)+'"/>';
 if(p.sceneComment)xml+='<SceneComment Text="'+escapeXml(p.sceneComment)+'"/>';
 for(const child of p.fdxUnknown?.children||[])xml+=child;xml+='</Paragraph>\n';if(dual&&doc.paragraphs[index+1]?.dualGroupId!==p.dualGroupId)xml+='</DualDialogue></Paragraph>\n';}
 xml+='</Content><TitlePage><Content>';for(const [k,type]of [['title','Title'],['author','Author'],['basedOn','Based On'],['contact','Contact']] as const)xml+='<Paragraph Type="'+type+'"><Text>'+escapeXml(doc.titlePage[k]||'')+'</Text></Paragraph>';xml+='</Content></TitlePage>\n';
 if(doc.writingFormat){const f=doc.writingFormat;
  // Final Draft conventions: margins in points, indents in inches from the paper edge, Leading word + Spacing multiplier,
  // SpaceBefore only (points), capitalized alignment, AllCaps as a style token and the Return-key element.
  xml+='<PageLayout BottomMargin="'+Math.round(f.page.bottom*72)+'" DocumentLeading="Normal" FooterMargin="36" HeaderMargin="36" TopMargin="'+Math.round(f.page.top*72)+'" UsesSmartQuotes="No"/>\n';
  for(const type of FORMAT_ELEMENTS){const s=f.elements[type],speech=['Dialogue','Parenthetical','Dual Dialogue'].includes(type),prior={id:'',type:(speech?'Character':'Action') as ElementType,text:''};
   const before=Math.round(paragraphGap(prior,{id:'',type,text:''},f));const spacing=Math.max(1,Math.round(s.line/s.size*2)/2);
   const style=[s.bold?'Bold':'',s.italic?'Italic':'',s.underline?'Underline':'',s.caps?'AllCaps':''].filter(Boolean).join('+');
   xml+='<ElementSettings Type="'+fdxType(type)+'"><FontSpec Font="'+escapeXml(s.font)+'" Size="'+s.size+'" Style="'+style+'"/><ParagraphSpec Alignment="'+s.align[0].toUpperCase()+s.align.slice(1)+'" FirstIndent="'+s.first.toFixed(2)+'" Leading="Regular" LeftIndent="'+(f.page.left+s.left).toFixed(2)+'" RightIndent="'+(f.page.width-f.page.right-s.right).toFixed(2)+'" SpaceBefore="'+before+'" Spacing="'+spacing+'" StartsNewPage="'+(s.breakBefore?'Yes':'No')+'"/><Behavior PaginateAs="'+fdxType(type)+'" ReturnKey="'+fdxType(s.next)+'"/></ElementSettings>\n';}
 // Namespaced extension gives DraftCraft a lossless round trip; other editors may ignore it.
 xml+='<DraftCraftMetadata xmlns="https://draftcraft.local/schema/1">'+escapeXml(JSON.stringify({writingFormat:f,smartType:doc.smartType,headerFooterConfig:doc.headerFooterConfig,titlePage:doc.titlePage,paragraphMetadata:doc.paragraphs.map(p=>({id:p.id,type:p.type,customElementLabel:p.customElementLabel,lockedScene:p.lockedScene,omitted:p.omitted,altDialogue:p.altDialogue,activeAltIndex:p.activeAltIndex,revisionMarks:p.revisionMarks,dualColumn:p.dualColumn,dualGroupId:p.dualGroupId,revision:p.revision}))}))+'</DraftCraftMetadata>\n';}
 for(const chunk of doc.importReport?.unsupportedXml||[])xml+=chunk+'\n';
 return xml+'</FinalDraft>\n';
}
/**
 * Element settings from a Final Draft (or older DraftCraft) FDX file.
 * Final Draft: PageLayout Top/Bottom/Header/FooterMargin are points; ParagraphSpec LeftIndent/RightIndent are inches
 * from the paper's left edge; Leading is a word ("Regular") and Spacing is the line multiplier; only SpaceBefore
 * (points) exists; StartsNewPage is Yes/No; capitals are the AllCaps style token; Behavior ReturnKey is the next element.
 * DraftCraft 1.15.3 and earlier wrote inches with Width/LeftMargin and numeric Leading/SpaceAfter; both are read.
 */
function importElementSettings(root:Element,settings:Element[]){
 const f=baseFormat();f.templateId='imported-fdx';f.name='Imported Final Draft Format';
 const layout=direct(root,'PageLayout')[0],legacy=!!layout&&(layout.hasAttribute('LeftMargin')||layout.hasAttribute('Width'));
 const num=(e:Element|undefined,attr:string)=>{const v=e?.getAttribute(attr);if(v===null||v===undefined||v.trim()==='')return undefined;const n=Number(v);return Number.isFinite(n)?n:undefined;};
 if(legacy){for(const [key,attr] of Object.entries({width:'Width',height:'Height',top:'TopMargin',bottom:'BottomMargin',left:'LeftMargin',right:'RightMargin'})){const value=num(layout,attr);if(value!==undefined)(f.page as any)[key]=value;}}
 else if(layout){const top=num(layout,'TopMargin'),bottom=num(layout,'BottomMargin');if(top!==undefined)f.page.top=top>12?top/72:top;if(bottom!==undefined)f.page.bottom=bottom>12?bottom/72:bottom;}
 const specs=settings.map(node=>({type:semantic(node.getAttribute('Type')||'General'),font:direct(node,'FontSpec')[0],p:direct(node,'ParagraphSpec')[0],behavior:direct(node,'Behavior')[0]}));
 if(!legacy){
  // Final Draft has no page side margins: body elements start at the left margin and end at the right one.
  const body=specs.filter(x=>['Action','Scene Heading','General'].includes(x.type)&&x.p);
  const lefts=body.map(x=>num(x.p,'LeftIndent')).filter((n):n is number=>n!==undefined),rights=body.map(x=>num(x.p,'RightIndent')).filter((n):n is number=>n!==undefined);
  if(lefts.length)f.page.left=Math.min(...lefts);if(rights.length)f.page.right=Math.max(0,f.page.width-Math.max(...rights));
  f.spacingRules={version:1,afterSpeech:0,collapse:true,trimPageTop:true};
  for(const e of FORMAT_ELEMENTS)f.elements[e].after=0;
 }
 for(const {type,font,p,behavior} of specs){const s=f.elements[type];
  if(font){s.font=font.getAttribute('Font')||s.font;const size=num(font,'Size');if(size!==undefined)s.size=size;const styles=font.getAttribute('Style')||'';s.bold=styles.includes('Bold');s.italic=styles.includes('Italic');s.underline=styles.includes('Underline');s.caps=font.getAttribute('AllCaps')==='Yes'||/AllCaps/.test(styles);}
  if(p){const left=num(p,'LeftIndent'),right=num(p,'RightIndent'),first=num(p,'FirstIndent'),before=num(p,'SpaceBefore'),after=num(p,'SpaceAfter'),leading=num(p,'Leading'),spacing=num(p,'Spacing');
   if(left!==undefined)s.left=+Math.max(0,left-f.page.left).toFixed(4);
   if(right!==undefined)s.right=+Math.max(0,f.page.width-f.page.right-right).toFixed(4);
   if(first!==undefined)s.first=first;if(before!==undefined)s.before=before;if(after!==undefined)s.after=after;
   if(leading!==undefined)s.line=leading;else if(spacing!==undefined&&spacing>0)s.line=+(s.size*spacing).toFixed(2);else s.line=s.size;
   const align=p.getAttribute('Alignment')?.toLowerCase();if(['left','right','center','justify'].includes(align||''))s.align=align as ElementStyle['align'];
   const page=p.getAttribute('StartsNewPage');if(page)s.breakBefore=page==='Yes';}
  const next=behavior?.getAttribute('ReturnKey');if(next){const t=semantic(next);if(FORMAT_ELEMENTS.includes(t)&&t!=='User Defined')s.next=t;}
 }
 // An element wider than the page leaves no writing space; keep the file's text and fall back to the default indent.
 for(const e of FORMAT_ELEMENTS){const s=f.elements[e],content=f.page.width-f.page.left-f.page.right;if(s.left+s.right>content-.5){const d=baseFormat().elements[e];s.left=Math.min(d.left,Math.max(0,content-1));s.right=Math.min(d.right,Math.max(0,content-1-s.left));}}
 try{return validateFormat(f)}catch(e){throw Error('The file has unsupported element or page settings ('+(e as Error).message+'). Correct the reference format before importing.');}
}
export function parseFdx(text:string):Partial<ScriptDocument>{
 if(text.length>50*1024*1024||/<!DOCTYPE|<!ENTITY/i.test(text))throw Error('Unsupported or oversized XML.');
 const xml=new DOMParser().parseFromString(text,'application/xml'),root=xml.documentElement;
 if(xml.querySelector('parsererror')||root.tagName!=='FinalDraft')throw Error('Invalid Final Draft XML.');
 const content=direct(root,'Content')[0];if(!content)throw Error('Missing screenplay content.');
 const nodes:{node:Element;dualGroupId?:string;dualColumn?:1|2}[]=[];for(const node of direct(content,'Paragraph')){const dual=direct(node,'DualDialogue')[0];if(dual){const group='dual-'+crypto.randomUUID();let column:1|2=1,cues=0;for(const child of direct(dual,'Paragraph')){if(child.getAttribute('Type')==='Character'&&++cues>1)column=2;nodes.push({node:child,dualGroupId:group,dualColumn:column});}}else nodes.push({node});}
 const paragraphs:Paragraph[]=nodes.map(({node,dualGroupId,dualColumn},i)=>{const raw=node.getAttribute('Type')||'Action',type=semantic(raw);const runs:TextRun[]=direct(node,'Text').map(n=>{const style=n.getAttribute('Style')||'';return {text:n.textContent||'',style:{bold:style.includes('Bold')||undefined,italic:style.includes('Italic')||undefined,underline:style.includes('Underline')||undefined,strikethrough:style.includes('Strikeout')||undefined}}});
 const notes=direct(node,'ScriptNote').map((n,j)=>({id:'note-'+crypto.randomUUID(),name:n.getAttribute('Name')||undefined,author:n.getAttribute('Author')||'Writer',text:direct(n,'Paragraph').map(p=>direct(p,'Text').map(t=>t.textContent).join('')).join('\n'),color:(['yellow','blue','rose','emerald','purple','orange'].includes(n.getAttribute('Color')||'')?n.getAttribute('Color'):'yellow') as 'yellow',createdAt:new Date().toISOString(),category:'general' as const}));const bm=direct(node,'Bookmark')[0];const unknownChildren=Array.from(node.children).filter(n=>!['Text','ScriptNote','Bookmark','SceneComment'].includes(n.tagName)).map(n=>new XMLSerializer().serializeToString(n)),unknownAttributes=Object.fromEntries(Array.from(node.attributes).filter(a=>!['Type','Number'].includes(a.name)).map(a=>[a.name,a.value]));return{id:'p-'+crypto.randomUUID(),type:dualGroupId&&type==='Dialogue'?'Dual Dialogue':type,dualGroupId,dualColumn,fdxUnknown:unknownChildren.length||Object.keys(unknownAttributes).length?{attributes:unknownAttributes,children:unknownChildren}:undefined,text:runs.map(r=>r.text).join(''),runs,sceneNumber:node.getAttribute('Number')||undefined,customElementLabel:type==='User Defined'?raw:undefined,notes:notes.length?notes:undefined,bookmark:bm?{id:'bm-'+crypto.randomUUID(),name:bm.getAttribute('Name')||'Bookmark',color:bm.getAttribute('Color')||'#3b82f6',createdAt:new Date().toISOString()}:undefined,sceneComment:direct(node,'SceneComment')[0]?.getAttribute('Text')||undefined};});
 const titleNodes=Array.from(root.querySelectorAll('TitlePage Content > Paragraph')),title=(type:string)=>titleNodes.filter(p=>p.getAttribute('Type')===type).flatMap(p=>direct(p,'Text').map(t=>t.textContent||'')).join('');
 const result:Partial<ScriptDocument>={paragraphs,titlePage:{title:title('Title')||'UNTITLED SCRIPT',author:title('Author'),basedOn:title('Based On'),contact:title('Contact'),copyright:'',draftDate:new Date().toISOString().slice(0,10)}};
 const settings=direct(root,'ElementSettings');if(settings.length)result.writingFormat=importElementSettings(root,settings);
 const metadata=direct(root,'DraftCraftMetadata')[0];if(metadata){try{const m=JSON.parse(metadata.textContent||'{}');if(m.writingFormat)result.writingFormat=validateFormat(m.writingFormat);if(m.smartType)result.smartType=validateSmartType(m.smartType);if(m.headerFooterConfig)result.headerFooterConfig=m.headerFooterConfig;if(m.titlePage)result.titlePage={...result.titlePage!,...m.titlePage};if(Array.isArray(m.paragraphMetadata)&&m.paragraphMetadata.length===paragraphs.length){const ids=new Set<string>();for(let i=0;i<paragraphs.length;i++){const p=m.paragraphMetadata[i];if(typeof p.id==='string'&&!ids.has(p.id)&&FORMAT_ELEMENTS.includes(p.type)){paragraphs[i]={...paragraphs[i],...p,text:paragraphs[i].text,runs:paragraphs[i].runs};ids.add(p.id);}}}}catch{throw Error('The DraftCraft metadata extension is invalid.');}}
 const known=new Set(['Content','TitlePage','PageLayout','ElementSettings','DraftCraftMetadata']);const unsupportedXml=Array.from(root.children).filter(n=>!known.has(n.tagName)).map(n=>new XMLSerializer().serializeToString(n));
 const unknownTypes=[...new Set(paragraphs.filter(p=>p.type==='User Defined').map(p=>p.customElementLabel||'Unknown'))];
 result.importReport={source:'FDX document',type:'fdx',unsupportedXml,warnings:[...(unsupportedXml.length?[`${unsupportedXml.length} unsupported document-level XML sections are retained opaquely for FDX export.`]:[]),...(paragraphs.some(p=>p.fdxUnknown)?['Unsupported paragraph attributes/sections are retained opaquely. Editing supported text does not reinterpret those sections.']:[]),...(unknownTypes.length?['Unknown element types retained as custom elements: '+unknownTypes.join(', ')]:[])]};
 return result;
}
