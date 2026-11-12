import React from 'react';
import type {ScriptDocument} from '../types/script';
import {DialogOverlay} from '../components/ui/Presentation';
export function interchangeLosses(doc:ScriptDocument,format:string){
 const losses:string[]=[],fdx=['fdx','fdxt'].includes(format),rich=format==='rtf';if(['fdproject','draftcraft'].includes(format))return losses;
 const p=doc.paragraphs,s=doc.studio;
 if(p.some(p=>p.altDialogue&&p.altDialogue.length>1))losses.push(fdx?'Unused dialogue takes are retained only in DraftCraft metadata; support in other applications has not been verified.':'Only the selected dialogue take is exported; unused takes remain in the native project.');
 if(s?.pageLocks.length)losses.push('Production boundary anchors and inserted-page locking are native project features. Other editors may recalculate pages.');
 if(s?.track.changes.length)losses.push('Pending editorial change attribution and review decisions are not interoperable in this format. The current final text is exported.');
 if(s?.revisionSets.length||p.some(p=>p.revisionMarks?.length))losses.push('Named range revision metadata is retained in the native project; full production-revision interchange has not been verified.');
 if(s?.tags.length)losses.push('Production tag identities, aliases and anchored ranges remain in the native project.');
 if(p.some(p=>p.images?.length)||s?.titleImages.length)losses.push('Embedded script and title-page images are not supported by this interchange writer. Use native project or PDF.');
 if(doc.beats.length||doc.outlineMarkers.length)losses.push('Beat Board, flow lines and linked planning records remain in the native project. Export the outline separately when needed.');
 if(format==='fountain'){const supported=new Set(['Scene Heading','Action','Character','Parenthetical','Dialogue','Dual Dialogue','Transition','Centered Text','Lyrics','Outline Level 1','Outline Level 2','Outline Level 3','Scene Summary','Note']);const unsupported=[...new Set(p.filter(p=>!supported.has(p.type)).map(p=>p.type))];if(unsupported.length)losses.push('Fountain exports these elements as plain text without their native element identity: '+unsupported.join(', ')+'.');if(p.some(p=>p.runs?.some(r=>r.style?.color||r.style?.strikethrough)))losses.push('Fountain retains bold, italic and underline. Text colors and strikeout are omitted.');}
 if(!fdx&&!rich&&(doc.writingFormat||p.some(p=>p.runs?.length)))losses.push('Template typography, margins and rich-text appearance are not fully represented in plain text.');
 if(fdx&&p.some(p=>p.fdxUnknown)||fdx&&doc.importReport?.unsupportedXml?.length)losses.push('Opaque unsupported FDX sections are preserved as XML. Their meaning, references and behavior after text edits are unverified.');
 if(fdx)losses.push('FDX supports the tested paragraph, text, scene-number, note, style and dual-dialogue subset. This export has not been opened in the Final Draft desktop application here.');
 if(rich)losses.push('RTF preserves supported text emphasis and paragraph layout. Screenplay identities, dual-column semantics and production metadata require a native project.');
 if(doc.tableRead?.cast.length)losses.push('Table Read voice assignments and performance directions remain in the native project.');
 return losses;
}
export interface ExportReview {format:string;warnings:string[];run:()=>void}
export function InterchangeReview({request,onClose}:{request:ExportReview|null;onClose:()=>void}){if(!request)return null;return <DialogOverlay open={!!request} onClose={onClose} label="Review Interchange Export" className="no-print fixed inset-0 bg-black/65 flex items-center justify-center"><section className="dc-production-panel" style={{width:660,height:'auto',maxHeight:'85vh'}}><header><h2>Review {request.format.toUpperCase()} Export</h2><button onClick={onClose}>Cancel</button></header><main><p>The native project keeps its complete data. This exported copy has the following limits:</p><ul style={{paddingLeft:20,listStyle:'disc'}}>{request.warnings.map(w=><li key={w} style={{marginBottom:10,lineHeight:1.5}}>{w}</li>)}</ul></main><footer><span>Original input files and native project data are unchanged.</span><button onClick={()=>{request.run();onClose();}}>Export With These Limits</button></footer></section></DialogOverlay>;}
