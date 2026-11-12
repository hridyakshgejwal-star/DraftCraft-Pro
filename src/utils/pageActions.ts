import {replaceRuns} from '../writing/wordSuggestions';
import { ElementType, Paragraph, RevisionTier } from '../types/script';
import { PageChunk } from './pagination';
import { parseFountain } from './fountainCodec';

export interface PageTarget {
  pageNumber: number;
  pageLabel?:string;
  ranges?:{id:string;start:number;end:number}[];
  ids: string[];
  start: number;
  end: number;
  fingerprint: string;
}

export const newContentId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

// Pages contain whole paragraphs in the existing paginator. Never target by a
// mutable page index alone, and invalidate even metadata-only changes.
export function capturePage(page: PageChunk, paragraphs: Paragraph[]): PageTarget {
  const ids = page.paragraphs.map(p => p.id);
  const start = ids.length ? paragraphs.findIndex(p => p.id === ids[0]) : 0;
  return { pageNumber: page.pageNumber,pageLabel:page.pageLabel,ranges:page.fragments.filter(f=>f.lines.length).map(f=>({id:f.paragraphId,start:f.start,end:f.end})), ids, start, end: start + ids.length, fingerprint: JSON.stringify(paragraphs) };
}

export function isPageCurrent(target: PageTarget, paragraphs: Paragraph[]) {
  return target.fingerprint === JSON.stringify(paragraphs) &&
    target.ids.every((id, i) => paragraphs[target.start + i]?.id === id);
}

export function deletePageContent(paragraphs: Paragraph[], target: PageTarget): Paragraph[] {
  if (!isPageCurrent(target, paragraphs)) throw new Error('The screenplay changed. Refresh Page Actions before continuing.');
  const remaining=paragraphs.flatMap(p=>{
    const ranges=target.ranges?.filter(r=>r.id===p.id).sort((a,b)=>b.start-a.start);
    if(!ranges?.length)return target.ids.includes(p.id)&&!target.ranges?[]:[p];
    if(ranges.some(r=>r.start===0&&r.end===p.text.length))return [];
    let text=p.text;for(const r of ranges)text=text.slice(0,r.start)+text.slice(r.end);
    return [{...p,text,runs:replaceRuns(p.runs,p.text,ranges.map(r=>({start:r.start,end:r.end,text:''})))}];
  });
  return remaining.length ? remaining : [{ id: newContentId('p'), type: 'Action', text: '' }];
}

export function pageContent(paragraphs:Paragraph[],target:PageTarget):Paragraph[]{
 return target.ids.map(id=>{const p=paragraphs.find(p=>p.id===id)!;const r=target.ranges?.filter(v=>v.id===id);if(!r?.length||r.length===1&&r[0].start===0&&r[0].end===p.text.length)return p;const keep=r.sort((a,b)=>a.start-b.start);const removed:{start:number;end:number;text:string}[]=[];let from=0;for(const range of keep){if(range.start>from)removed.push({start:from,end:range.start,text:''});from=range.end;}if(from<p.text.length)removed.push({start:from,end:p.text.length,text:''});return {...p,text:keep.map(v=>p.text.slice(v.start,v.end)).join(''),runs:replaceRuns(p.runs,p.text,removed)};});
}

export function clonePageContent(source: Paragraph[], productionMode: boolean, revision: RevisionTier): Paragraph[] {
  const groups = new Map<string, string>();
  return structuredClone(source).map(p => {
    p.id = newContentId('p');
    for (const note of p.notes || []) { note.id = newContentId('note'); note.paragraphId = p.id; }
    if (p.bookmark && typeof p.bookmark === 'object') {
      p.bookmark.id = newContentId('bm'); p.bookmark.paragraphId = p.id;
    }
    if (p.dualGroupId) {
      if (!groups.has(p.dualGroupId)) groups.set(p.dualGroupId, newContentId('dual'));
      p.dualGroupId = groups.get(p.dualGroupId);
    }
    // Existing locked numbers belong to the original production material.
    // Insertions stay unnumbered, matching new paragraphs in the editor.
    if (p.type === 'Scene Heading') { delete p.sceneNumber; delete p.lockedScene; }
    if (productionMode) { p.revised = true; p.revision = revision; }
    return p;
  });
}

export function insertPageContent(paragraphs: Paragraph[], target: PageTarget, content: Paragraph[], after: boolean) {
  if (!isPageCurrent(target, paragraphs)) throw new Error('The screenplay changed. Refresh Page Actions before continuing.');
  const range=after?target.ranges?.at(-1):target.ranges?.[0];
  if(range){const index=paragraphs.findIndex(p=>p.id===range.id),p=paragraphs[index],offset=after?range.end:range.start;
    if(offset>0&&offset<p.text.length)return [...paragraphs.slice(0,index),{...p,text:p.text.slice(0,offset),runs:replaceRuns(p.runs,p.text,[{start:offset,end:p.text.length,text:''}])},...content,{...p,id:newContentId('p'),text:p.text.slice(offset),runs:replaceRuns(p.runs,p.text,[{start:0,end:offset,text:''}]),altDialogue:undefined,activeAltIndex:undefined,sceneNumber:undefined,lockedScene:undefined},...paragraphs.slice(index+1)];}
  const at = after ? target.end : target.start;
  return [...paragraphs.slice(0, at), ...content, ...paragraphs.slice(at)];
}

const types: ElementType[] = ['Scene Heading', 'Action', 'Character', 'Parenthetical', 'Dialogue', 'Dual Dialogue', 'Transition', 'Shot', 'General', 'New Act', 'End of Act', 'Scene Summary', 'Cast List', 'Outline Level 1', 'Outline Level 2', 'User Defined'];
const marker = /<meta\s+name=["']draftcraft-page["']\s+content=["']([A-Za-z0-9+/=]+)["']\s*\/?\s*>/i;

function encode(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

export function pageClipboardPayload(paragraphs: Paragraph[]) {
  const text = paragraphs.map(p => p.text).join('\n\n');
  const data = encode(JSON.stringify({ kind: 'draftcraft-page', version: 1, paragraphs }));
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return { text, html: `<meta name="draftcraft-page" content="${data}"><pre>${escaped}</pre>` };
}

export function decodePageClipboard(payload: { text: string; html?: string }): Paragraph[] {
  const match = payload.html?.match(marker);
  if (match) {
    try {
      const bytes = Uint8Array.from(atob(match[1]), c => c.charCodeAt(0));
      const data = JSON.parse(new TextDecoder().decode(bytes));
      if (data.kind !== 'draftcraft-page' || data.version !== 1 || !Array.isArray(data.paragraphs) || !data.paragraphs.length || data.paragraphs.length > 10000) throw new Error();
      const valid = data.paragraphs.every((p: Paragraph) => p && typeof p.id === 'string' && typeof p.text === 'string' && types.includes(p.type) &&
        (!p.notes || Array.isArray(p.notes) && p.notes.every(n => typeof n.id === 'string' && typeof n.text === 'string')) &&
        (!p.runs || Array.isArray(p.runs) && p.runs.every(r => typeof r.text === 'string')) &&
        (!p.tags || Array.isArray(p.tags) && p.tags.every(t => typeof t === 'string')));
      if (!valid) throw new Error();
      return data.paragraphs;
    } catch { throw new Error('The copied DraftCraft page is invalid. Copy it again.'); }
  }
  if (!payload.text.trim()) throw new Error('The clipboard contains no supported screenplay text.');
  const parsed = parseFountain(payload.text).paragraphs;
  if (!parsed?.length) throw new Error('The clipboard contains no supported screenplay text.');
  return parsed;
}

export async function writeClipboard(payload: { text: string; html?: string }) {
  if (window.draftcraftDesktop?.writeClipboard) {
    await window.draftcraftDesktop.writeClipboard(payload); return;
  }
  if (payload.html && navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
    await navigator.clipboard.write([new ClipboardItem({
      'text/plain': new Blob([payload.text], { type: 'text/plain' }),
      'text/html': new Blob([payload.html], { type: 'text/html' }),
    })]);
  } else {
    // Plain text is durable too; callers clearly report that it loses metadata.
    if (payload.html) throw new Error('Lossless page copying is unavailable in this browser. Use the desktop app or a browser with HTML clipboard support.');
    await navigator.clipboard.writeText(payload.text);
  }
}

export async function readClipboard(): Promise<{ text: string; html?: string }> {
  if (window.draftcraftDesktop?.readClipboard) return window.draftcraftDesktop.readClipboard();
  if (!navigator.clipboard) throw new Error('Clipboard access is unavailable. Use the desktop app or grant browser clipboard access.');
  if (!navigator.clipboard.read) return { text: await navigator.clipboard.readText() };
  let text = '', html = '';
  for (const item of await navigator.clipboard.read()) {
    if (item.types.includes('text/plain')) text = await (await item.getType('text/plain')).text();
    if (item.types.includes('text/html')) html = await (await item.getType('text/html')).text();
  }
  return { text, html };
}
