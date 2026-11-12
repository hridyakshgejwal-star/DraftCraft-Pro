// Compatibility probe (bundled with esbuild and run in Chromium by compat-1154.cjs): documents and .fdx files produced by
// the 1.15.3 code open in 1.15.4 unchanged. OLD is a checkout of tag release-1.15.3 (path substituted at bundle time).
import * as oldFdx from 'OLD/src/utils/fdxCodec';
import {FORMAT_TEMPLATES as OLD_TEMPLATES} from 'OLD/src/formats/catalog';
import * as fdx from '../src/utils/fdxCodec';
import {validateFormat} from '../src/formats/model';
import {upgradeDocumentFormat} from '../src/formats/storage';

const LAYOUT = ['Scene Heading', 'Action', 'Character', 'Parenthetical', 'Dialogue', 'Transition'] as const;
function docFor(t: any) {
  const paragraphs = (t.sample?.length ? t.sample : [{type: t.format.supported[0], text: 'Sample.'}]).map((p: any, i: number) => ({id: 'c' + i, type: p.type, text: p.text, ...(p.customElementLabel ? {customElementLabel: p.customElementLabel} : {})}));
  return {id: 'compat-' + t.id, titlePage: {title: 'COMPAT ' + t.name, author: 'QA', draftDate: '', contact: '', copyright: ''}, paragraphs, writingFormat: structuredClone(t.format), beats: [], flowLines: [], outlineLanes: [], outlineMarkers: [], characterHighlights: {}};
}
const same = (a: any[], b: any[]) => a.length === b.length && a.every((p, i) => p.type === b[i].type && p.text === b[i].text);
const stripMeta = (xml: string) => xml.replace(/<DraftCraftMetadata[\s\S]*?<\/DraftCraftMetadata>/, '');
(globalThis as any).runCompat = () => {
  const rows: any[] = [];
  for (const t of OLD_TEMPLATES) {
    const row: any = {template: t.name, kind: t.format.kind, templateVersion: t.format.templateVersion};
    const doc = JSON.parse(JSON.stringify(docFor(t)));
    try { validateFormat(structuredClone(doc.writingFormat)); row.formatValid = true; } catch (e) { row.formatValid = false; row.formatError = String((e as Error).message); }
    const upgraded = upgradeDocumentFormat(doc);
    row.documentUnchangedOnOpen = upgraded === doc;
    try {
      const xml = oldFdx.exportToFdx(doc);
      const back = fdx.parseFdx(xml);
      row.fdxWithMetadata = {paragraphs: same(doc.paragraphs, back.paragraphs || []), formatIdentical: JSON.stringify(back.writingFormat) === JSON.stringify(doc.writingFormat)};
      const plain = fdx.parseFdx(stripMeta(xml)), f = plain.writingFormat, o = doc.writingFormat;
      const layout = f && ['screenplay', 'television', 'stageplay'].includes(o.kind) ? LAYOUT.filter((e) => o.supported.includes(e)).every((e) => Math.abs(f.page.left + f.elements[e].left - (o.page.left + o.elements[e].left)) < 0.011 && Math.abs(f.page.right + f.elements[e].right - (o.page.right + o.elements[e].right)) < 0.011) && Math.abs(f.page.top - o.page.top) < 0.011 && Math.abs(f.page.bottom - o.page.bottom) < 0.011 : null;
      row.fdxWithoutMetadata = {paragraphs: same(doc.paragraphs, plain.paragraphs || []), layoutWithin001in: layout};
    } catch (e) { row.fdxError = String((e as Error).message); }
    try {
      const xml = fdx.exportToFdx(doc), old = oldFdx.parseFdx(xml);
      row.newFdxOpensIn1153 = {paragraphs: same(doc.paragraphs, old.paragraphs || []), formatIdentical: JSON.stringify(old.writingFormat) === JSON.stringify(doc.writingFormat)};
    } catch (e) { row.newFdxOpensIn1153 = {error: String((e as Error).message)}; }
    rows.push(row);
  }
  return rows;
};
