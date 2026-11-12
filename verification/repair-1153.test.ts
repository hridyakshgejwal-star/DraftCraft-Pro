// DraftCraft Pro 1.15.3 regression tests (layout, continuation cues, font stacks).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { layoutScript, type MeasureText } from '../src/production/layout';
import { baseFormat, elementCss, fontStack, styleFor } from '../src/formats/model';
import { printHtml } from '../src/production/print';
import type { Paragraph, ScriptDocument } from '../src/types/script';

// Deterministic Courier-style metrics: 0.6 em per glyph (12 pt -> 7.2 pt, 10 cpi).
const mono: MeasureText = (text, style) => [...text].length * style.size * 0.6;
const P = (id: string, type: Paragraph['type'], text: string, extra: Partial<Paragraph> = {}): Paragraph => ({ id, type, text, ...extra } as Paragraph);
const f = baseFormat();
const labels = (paragraphs: Paragraph[], format = f) => layoutScript(paragraphs, format, undefined, mono).pages.flatMap((page) => page.labels.map((l) => ({ ...l, page: page.pageNumber })));

test('D-03: the same speaker resuming after action gets one generated (CONT\'D) on the cue line', () => {
  const script = [P('h', 'Scene Heading', 'INT. ROOM - NIGHT'), P('c1', 'Character', 'ELENA'), P('d1', 'Dialogue', 'Stay.'), P('a', 'Action', 'She turns away.'), P('c2', 'Character', 'ELENA'), P('d2', 'Dialogue', 'Still here.')];
  const layout = layoutScript(script, f, undefined, mono);
  const resumed = layout.pages[0].labels.filter((l) => l.kind === 'resumed');
  assert.equal(resumed.length, 1);
  const cue = layout.pages[0].fragments.find((fr) => fr.paragraphId === 'c2')!;
  const cs = styleFor(f, script[4]);
  assert.equal(resumed[0].paragraphId, 'c2');
  assert.equal(resumed[0].text, "(CONT'D)");
  assert.equal(resumed[0].y, cue.y, 'label sits on the cue line');
  assert.ok(Math.abs(resumed[0].x - (cs.left * 72 + cs.first * 72 + 5 * 7.2 + 7.2)) < 0.01, 'label follows the name and one space');
  assert.equal(script[4].text, 'ELENA', 'the character text is never modified');
});

test('D-03: no automatic continued for a different speaker, a new scene, dual dialogue or an explicit cue', () => {
  const base = [P('h', 'Scene Heading', 'INT. ROOM - NIGHT'), P('c1', 'Character', 'ELENA'), P('d1', 'Dialogue', 'Stay.'), P('a', 'Action', 'A pause.')];
  assert.equal(labels([...base, P('c2', 'Character', 'MARCUS'), P('d2', 'Dialogue', 'No.')]).filter((l) => l.kind === 'resumed').length, 0, 'different speaker');
  assert.equal(labels([...base, P('h2', 'Scene Heading', 'EXT. STREET - DAY'), P('c2', 'Character', 'ELENA'), P('d2', 'Dialogue', 'Hi.')]).filter((l) => l.kind === 'resumed').length, 0, 'new scene');
  assert.equal(labels([...base, P('c2', 'Character', "ELENA (CONT'D)"), P('d2', 'Dialogue', 'Hi.')]).filter((l) => l.kind === 'resumed').length, 0, 'writer typed it');
  assert.equal(labels([...base.slice(0, 3), P('c2', 'Character', 'ELENA'), P('d2', 'Dialogue', 'Again.')]).filter((l) => l.kind === 'resumed').length, 0, 'no interruption');
  assert.equal(labels([...base, P('c2', 'Character', 'ELENA (V.O.)'), P('d2', 'Dialogue', 'Hi.')]).filter((l) => l.kind === 'resumed').length, 1, 'extensions do not change the speaker');
  const off = { ...f, continuations: { ...f.continuations, continued: false } };
  assert.equal(labels([...base, P('c2', 'Character', 'ELENA'), P('d2', 'Dialogue', 'Hi.')], off).filter((l) => l.kind === 'resumed').length, 0, 'format option disabled');
});

test('D-03: (MORE) and the next page NAME (CONT\'D) align with the Character element', () => {
  const speech = 'Every word of this speech must survive the page break without loss. '.repeat(60);
  const script = [P('h', 'Scene Heading', 'INT. ROOM - NIGHT'), P('c', 'Character', 'ELENA'), P('d', 'Dialogue', speech)];
  const layout = layoutScript(script, f, undefined, mono);
  assert.ok(layout.pages.length >= 2);
  const cs = styleFor(f, script[1]);
  const more = layout.pages[0].labels.find((l) => l.kind === 'more')!, continued = layout.pages[1].labels.find((l) => l.kind === 'continued')!;
  assert.equal(more.text, '(MORE)');
  assert.equal(continued.text, "ELENA (CONT'D)");
  for (const l of [more, continued]) { assert.equal(l.x, cs.left * 72); assert.equal(l.align, cs.align === 'center' ? 'center' : 'left'); }
  // No dialogue text is lost or duplicated across the break.
  const text = layout.pages.flatMap((pg) => pg.fragments.filter((fr) => fr.paragraphId === 'd').map((fr) => speech.slice(fr.start, fr.end))).join('');
  assert.equal(text, speech);
});

test('D-04: editor CSS, canvas measurement and print share one font family list', () => {
  assert.equal(fontStack('Courier Prime'), "'Courier Prime', monospace");
  assert.equal(fontStack('JetBrains Mono'), "'JetBrains Mono', monospace");
  assert.equal(fontStack('Times New Roman'), "'Times New Roman', serif");
  assert.equal(fontStack('Bad";}Font'), "'BadFont', serif");
  const p = P('a', 'Action', 'Text');
  assert.equal(elementCss(f, p).fontFamily, fontStack(styleFor(f, p).font));
  const doc = { id: 'doc', titlePage: { title: 'T', author: '', draftDate: '', contact: '', copyright: '' }, paragraphs: [P('h', 'Scene Heading', 'INT. ROOM - NIGHT'), P('c1', 'Character', 'ELENA'), P('d1', 'Dialogue', 'Stay.'), P('a', 'Action', 'She turns away.'), P('c2', 'Character', 'ELENA'), P('d2', 'Dialogue', 'Still here.')], beats: [], flowLines: [], outlineLanes: [], outlineMarkers: [], writingFormat: f } as unknown as ScriptDocument;
  const html = printHtml(doc);
  assert.ok(html.includes(fontStack('Courier Prime').replace(/'/g, '&#39;')) || html.includes(fontStack('Courier Prime')), 'print uses the shared stack');
  assert.ok(html.includes("(CONT'D)") || html.includes('(CONT&#39;D)'), 'print includes the generated continued cue');
});

test('D-07: a character cue is never stranded at the page bottom by the (MORE) reserve', () => {
  // Fill a page so that exactly two lines remain, then a cue + one-line speech.
  const capacity = (f.page.height - f.page.top - f.page.bottom) * 72;
  const filler: Paragraph[] = [];
  let lines = 0; let n = 0;
  while ((lines + 2) * 12 < capacity - 24) { filler.push(P('f' + n++, 'Action', 'Filler line.')); lines += 2; }
  for (let extra = 0; extra < 4; extra++) {
    const script = [...filler, ...Array.from({ length: extra }, (_, k) => P('g' + k, 'Action', 'One.')), P('c', 'Character', 'MARCUS'), P('d', 'Dialogue', 'Still here.')];
    const layout = layoutScript(script, f, undefined, mono);
    const cuePage = layout.pages.findIndex((pg) => pg.fragments.some((fr) => fr.paragraphId === 'c'));
    const speechPage = layout.pages.findIndex((pg) => pg.fragments.some((fr) => fr.paragraphId === 'd'));
    assert.equal(cuePage, speechPage, `cue and one-line speech share a page (extra=${extra})`);
    assert.equal(layout.pages.flatMap((pg) => pg.labels).filter((l) => l.kind === 'continued' || l.kind === 'more').length, 0, 'no MORE/CONT\'D for a speech that fits');
  }
});

test('D-07: a split element never leaves a single widow line on the next page', () => {
  const capacity = (f.page.height - f.page.top - f.page.bottom) * 72;
  for (let fill = 30; fill < 50; fill++) {
    const long = P('long', 'Action', 'This sentence keeps going across the page boundary to test widows. '.repeat(8).trim());
    const script = [...Array.from({ length: fill }, (_, k) => P('f' + k, 'Action', 'Line.')), long];
    const layout = layoutScript(script, f, undefined, mono);
    const parts = layout.pages.flatMap((pg) => pg.fragments.filter((fr) => fr.paragraphId === 'long').map((fr) => fr.lines.length));
    if (parts.length > 1) assert.ok(parts.at(-1)! >= 2 && parts[0] >= 2, `fill=${fill}: ${parts}`);
    const text = layout.pages.flatMap((pg) => pg.fragments.filter((fr) => fr.paragraphId === 'long').map((fr) => long.text.slice(fr.start, fr.end))).join('');
    assert.equal(text, long.text, 'no text lost or duplicated');
    void capacity;
  }
});

test('P-01: a text edit keeps the outline marker array identity so per-page story panels stay memoized', async () => {
  const { reconcileStudio } = await import('../src/production/model');
  const marker = { id: 'm1', laneId: 'lane', title: 'Act One', startPage: 1, endPage: 1, color: '#8b7cf8', anchor: { page: 1, paragraphId: 'a' } };
  const before = { id: 'doc', titlePage: { title: 'T', author: '', draftDate: '', contact: '', copyright: '' }, paragraphs: [P('h', 'Scene Heading', 'INT. ROOM - NIGHT'), P('a', 'Action', 'She waits.')], beats: [], flowLines: [], outlineLanes: [{ id: 'lane', name: 'Acts', type: 'act', color: '#8b7cf8' }], outlineMarkers: [marker] } as unknown as ScriptDocument;
  const settled = reconcileStudio(before, before);
  const edited = reconcileStudio(settled, { ...settled, paragraphs: [settled.paragraphs[0], { ...settled.paragraphs[1], text: 'She waits. Then runs.' }] });
  assert.equal(edited.paragraphs[1].text, 'She waits. Then runs.');
  assert.equal(edited.outlineMarkers, settled.outlineMarkers, 'unchanged markers keep their array identity');
});

test('P-01: cached per-paragraph word counts match a full recount and never go stale', async () => {
  const { calculateScriptStats } = await import('../src/utils/pagination');
  const paragraphs = [P('h', 'Scene Heading', 'INT. ROOM - NIGHT'), P('a', 'Action', '  Two   words '), P('c', 'Character', 'ELENA'), P('d', 'Dialogue', 'One more line here.')];
  const recount = (list: Paragraph[]) => list.reduce((n, p) => n + p.text.split(/\s+/).filter(Boolean).length, 0);
  assert.equal(calculateScriptStats(paragraphs, []).wordCount, recount(paragraphs));
  const next = [...paragraphs.slice(0, 3), { ...paragraphs[3], text: 'Shorter.' }];
  assert.equal(calculateScriptStats(next, []).wordCount, recount(next), 'an edited paragraph is recounted');
  (paragraphs[1] as { text: string }).text = 'now three words';
  assert.equal(calculateScriptStats(paragraphs, []).wordCount, recount(paragraphs), 'an in-place mutation is recounted');
});
