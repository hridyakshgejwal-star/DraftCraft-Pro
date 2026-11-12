// 1.17.0 features: model-level tests (the browser checks are in workspace-browser.cjs and the other suites).
import test from 'node:test';
import assert from 'node:assert/strict';
import { documentLayout } from '../src/production/layout.ts';
import { layoutPageHtml } from '../src/production/print.ts';
import { headingLineEnd, rightNumberCollides, hideRightSceneNumber } from '../src/production/sceneNumbers.ts';
import { normalizeWorkspace, DEFAULT_WORKSPACE, NAVIGATOR_COLUMNS, STATUS_ITEMS } from '../src/workspace/preferences.ts';
import { STANDARD_FORMAT } from '../src/formats/catalog.ts';
import type { Paragraph, ScriptDocument } from '../src/types/script.ts';

export const P = (id: string, type: Paragraph['type'], text: string, extra: Partial<Paragraph> = {}): Paragraph => ({ id, type, text, ...extra });
export function doc(paragraphs: Paragraph[], extra: Partial<ScriptDocument> = {}): ScriptDocument {
  return { id: 'd', titlePage: { title: 'T', author: '', draftDate: '', contact: '', copyright: '' }, paragraphs, beats: [], flowLines: [], outlineLanes: [], outlineMarkers: [], characterHighlights: {}, showStructureLines: false, writingFormat: structuredClone(STANDARD_FORMAT), currentRevision: 'White', productionMode: false, lockedPages: false, sceneNumberPlacement: 'both', ...extra } as unknown as ScriptDocument;
}

// ---- Item 4, 6, 10: workspace preferences ----
test('workspace 1.17: Navigator zoom, sort, column order and status bar items are saved and checked', () => {
  const d = normalizeWorkspace({});
  assert.equal(d.navigator.zoom, 1); assert.deepEqual(d.navigator.sort, { field: 'number', asc: true }); assert.deepEqual(d.navigator.columnOrder, [...NAVIGATOR_COLUMNS]); assert.deepEqual(d.statusBar, { hidden: [] });
  assert.equal(d.navigator.columns.color, true); assert.equal(d.navigator.columns.comment, false, 'the comment column starts hidden');
  const n = normalizeWorkspace({ navigator: { zoom: 9, sort: { field: 'time', asc: false }, columnOrder: ['summary', 'bogus', 'heading', 'summary'] }, statusBar: { hidden: ['zoom', 'nope', 'scene'] } });
  assert.equal(n.navigator.zoom, 1.5, 'zoom is limited to 150 %'); assert.equal(normalizeWorkspace({ navigator: { zoom: .1 } }).navigator.zoom, .8);
  assert.deepEqual(n.navigator.sort, { field: 'time', asc: false });
  assert.deepEqual(n.navigator.columnOrder.slice(0, 2), ['summary', 'heading'], 'saved order first, unknown and repeated columns dropped');
  assert.equal(n.navigator.columnOrder.length, NAVIGATOR_COLUMNS.length, 'every column exactly once');
  assert.deepEqual(n.statusBar.hidden, ['scene', 'zoom'], 'only known status items');
  assert.deepEqual(normalizeWorkspace({ navigator: { sort: { field: 'nonsense' } } }).navigator.sort, { field: 'number', asc: true });
  // A 1.16 preference file (no 1.17 fields) keeps its own choices and gets the new defaults.
  const old = normalizeWorkspace({ version: 1, navigator: { open: true, width: 333, sceneView: 'table', columns: { summary: false }, columnWidths: { heading: 250 } } });
  assert.equal(old.navigator.width, 333); assert.equal(old.navigator.columns.summary, false); assert.equal(old.navigator.columnWidths.heading, 250); assert.equal(old.navigator.zoom, 1); assert.equal(old.navigator.columns.color, true);
  assert.equal(STATUS_ITEMS.length, 15); assert.deepEqual(DEFAULT_WORKSPACE.statusBar.hidden, []);
});

// ---- Item 7: auto-hide right scene numbers ----
test('auto-hide right scene numbers: only numbers that would overlap their heading are hidden, in Print too', () => {
  const long = 'INT. ABANDONED TEXTILE WAREHOUSE NEAR THE OLD HARBOR CRANES - NIGHT';
  const d = doc([P('h1', 'Scene Heading', long, { sceneNumber: '123AB' }), P('a1', 'Action', 'Rain.'), P('h2', 'Scene Heading', 'INT. ROOM - DAY', { sceneNumber: '124AB' }), P('a2', 'Action', 'Quiet.'), P('h3', 'Scene Heading', long, { sceneNumber: '12' }), P('a3', 'Action', 'Wind.')]);
  const layout = documentLayout(d), page = layout.pages[0], width = (layout.format.page.width - layout.format.page.left - layout.format.page.right) * 72;
  const fr = (id: string) => page.fragments.find(f => f.paragraphId === id)!;
  assert.ok(headingLineEnd(fr('h1')) > width - 12, 'the long heading fills its first line');
  assert.equal(rightNumberCollides(fr('h1'), '123AB', width), true, 'a five-character number collides with a full heading line');
  assert.equal(rightNumberCollides(fr('h2'), '124AB', width), false, 'a short heading leaves room');
  assert.equal(rightNumberCollides(fr('h3'), '12', width), false, 'a two-character number never reaches the text area');
  assert.equal(hideRightSceneNumber(false, fr('h1'), '123AB', width), false, 'off by default: nothing is hidden');
  const count = (html: string, n: string) => (html.match(new RegExp('>' + n + '</span>', 'g')) || []).length;
  const off = layoutPageHtml(d, page, {}), on = layoutPageHtml({ ...d, autoHideRightSceneNumbers: true }, page, {});
  assert.deepEqual([count(off, '123AB'), count(off, '124AB'), count(off, '12')], [2, 2, 2], 'left and right numbers without the option');
  assert.deepEqual([count(on, '123AB'), count(on, '124AB'), count(on, '12')], [1, 2, 2], 'only the colliding right number is hidden; the left one stays');
  assert.equal(count(layoutPageHtml(d, page, { autoHideRightSceneNumbers: true }), '123AB'), 1, 'the print option can turn it on for one print');
  assert.deepEqual(documentLayout({ ...d, autoHideRightSceneNumbers: true }).pages.map(p => p.fragments.map(f => [f.paragraphId, f.y])), layout.pages.map(p => p.fragments.map(f => [f.paragraphId, f.y])), 'pagination is unchanged');
});

// ---- Item 8: Netflix-style feature template ----
test('Streaming Feature (Netflix-style) template: the documented rules, a new document from it, and honest sourcing', async () => {
  const { FORMAT_TEMPLATES, NETFLIX_STYLE_SOURCE, STANDARD_FORMAT: STD } = await import('../src/formats/catalog.ts');
  const t = FORMAT_TEMPLATES.find(t => t.id === 'streaming-feature-netflix-style')!;
  assert.ok(t, 'in the template gallery'); assert.equal(t.category, 'Script'); assert.equal(t.targetPages, 100);
  const f = t.format, e = f.elements;
  assert.deepEqual([f.page.width, f.page.height, f.page.left, f.page.right, f.page.top, f.page.bottom], [8.5, 11, 1.5, 1, 1, 1], 'US Letter, 1.5" left and 1" other margins');
  assert.ok(f.supported.every(type => e[type].font === 'Courier Prime' && e[type].size === 12), '12-pt Courier Prime');
  const fromEdge = (x: number) => Math.round((f.page.left + x) * 100) / 100;
  assert.equal(fromEdge(e.Character.left), 3.7); assert.equal(fromEdge(e.Dialogue.left), 2.5); assert.equal(Math.round((f.page.width - f.page.right - e.Dialogue.right) * 100) / 100, 6);
  assert.equal(fromEdge(e.Parenthetical.left), 3.1); assert.equal(e.Transition.align, 'right'); assert.equal(e['Scene Heading'].caps, true); assert.equal(e['Scene Heading'].bold, false); assert.equal(e['Scene Heading'].before, 24);
  assert.equal(f.numbering.scenes, true, 'scene numbers'); assert.deepEqual(f.continuations, { more: true, continued: true }, '(MORE) and (CONT\'D)');
  assert.deepEqual(t.headerFooter!.header, { left: '', center: '', right: '{PAGE}.' }); assert.equal(t.headerFooter!.firstPageHasHeader, false, 'no page number on page 1');
  assert.match(t.source, /Not affiliated with, endorsed by or approved by Netflix/); assert.equal(t.source, NETFLIX_STYLE_SOURCE);
  // Element geometry is the standard US one, so pages break where the Standard Feature Screenplay breaks them.
  for (const type of ['Scene Heading', 'Action', 'Character', 'Dialogue', 'Parenthetical', 'Transition'] as const) assert.deepEqual({ ...e[type], next: '', tab: '' }, { ...STD.elements[type], next: '', tab: '' }, type + ' is the standard US element');
  const { newFromTemplate } = await import('../src/formats/storage.ts'); const { blankDocument } = await import('../src/files/model.ts');
  const d = newFromTemplate(blankDocument(), t);
  assert.equal(d.sceneNumberPlacement, 'both'); assert.equal(d.appliedTemplateId, t.id); assert.equal(d.headerFooterConfig!.header.right, '{PAGE}.');
  const { applyTemplate } = await import('../src/formats/storage.ts');
  const applied = applyTemplate(doc([P('h1', 'Scene Heading', 'INT. ROOM - DAY'), P('a1', 'Action', 'Rain.'), P('h2', 'Scene Heading', 'EXT. ROAD - NIGHT')], { sceneNumberPlacement: 'none' }), t);
  assert.deepEqual(applied.paragraphs.filter(p => p.type === 'Scene Heading').map(p => p.sceneNumber), ['1', '2'], 'applying the template numbers the scenes');
  assert.equal(applied.sceneNumberPlacement, 'both'); assert.equal(applied.headerFooterConfig!.header.right, '{PAGE}.');
});

// ---- Item 3: custom autocorrect pairs ----
test('custom autocorrect: pairs are cleaned, imported, exported and matched as whole words with case following the typing', async () => {
  const { sanitizeSettings, parseReplacements, formatReplacements, cleanReplacements, DEFAULT_WRITING_SETTINGS } = await import('../src/writing/model.ts');
  const { customReplacement } = await import('../src/writing/spelling.ts');
  assert.equal(DEFAULT_WRITING_SETTINGS.customAutocorrect, true); assert.deepEqual(DEFAULT_WRITING_SETTINGS.replacements, []);
  const s = sanitizeSettings({ customAutocorrect: false, replacements: [{ from: ' omw ', to: 'on my way' }, { from: 'OMW', to: 'x' }, { from: 'omw', to: 'on my way!' }, { from: '', to: 'x' }, { from: 'a\nb', to: 'x' }, { from: 'same', to: 'same' }, { from: 'x'.repeat(41), to: 'y' }, 'junk'] });
  assert.equal(s.customAutocorrect, false);
  assert.deepEqual(s.replacements, [{ from: 'omw', to: 'on my way!' }, { from: 'OMW', to: 'x' }], 'trimmed; the later lowercase pair wins; capitals are a separate exact pair; invalid ones dropped');
  assert.deepEqual(sanitizeSettings({}).replacements, [], 'older settings files get an empty list');
  const parsed = parseReplacements('﻿# comment\nbtw\tby the way\nasap => as soon as possible\nfyi,for your information\n\nnot a pair\n');
  assert.deepEqual(parsed, [{ from: 'btw', to: 'by the way' }, { from: 'asap', to: 'as soon as possible' }, { from: 'fyi', to: 'for your information' }]);
  assert.deepEqual(parseReplacements(formatReplacements(parsed)), parsed, 'export re-imports exactly');
  assert.deepEqual(parseReplacements('[{"from":"jd","to":"JANE DOE"}]'), [{ from: 'jd', to: 'JANE DOE' }], 'JSON import');
  assert.equal(cleanReplacements(Array.from({ length: 1500 }, (_, i) => ({ from: 'w' + i, to: 'x' }))).length, 1000, 'limited to 1000 pairs');
  const pairs = cleanReplacements([{ from: 'omw', to: 'on my way' }, { from: 'om', to: 'X' }, { from: 'Mgr', to: 'Manager' }, { from: '(cont)', to: "(CONT'D)" }, { from: 'del', to: '' }]);
  const at = (text: string, key = ' ') => customReplacement(text, text.length, text.length, key, pairs, new Set())?.text ?? null;
  assert.equal(at('I am omw'), 'I am on my way ', 'longest match wins');assert.equal(at('Omw', ','), 'On my way,');assert.equal(at('OMW', '.'), 'ON MY WAY.');
  assert.equal(at('xomw'), null, 'whole words only'); assert.equal(at('mgr'), null, 'a pair with capitals is exact'); assert.equal(at('Mgr'), 'Manager ');
  assert.equal(at('wait (cont)'), "wait (CONT'D) ", 'punctuation inside a pair'); assert.equal(at('del'), ' ', 'an empty replacement deletes');
  assert.equal(customReplacement('omw now', 3, 3, ' ', pairs, new Set())?.text, 'on my way now', 'a space typed before an existing space is not doubled');
  assert.equal(customReplacement('omwx', 3, 3, ' ', pairs, new Set()), null, 'caret inside a word');
  const c = customReplacement('omw', 3, 3, ' ', pairs, new Set())!; assert.equal(c.custom, true); assert.equal(c.cursor, 'on my way '.length); assert.equal(c.original, 'omw');
});

// ---- Item 5: Navigator Cast List and screen time ----
test('cast list: scenes, pages, eighths and screen time per character; omitted scenes left out; sort and CSV', async () => {
  const { castList, sortCast, formatScreenTime, castListCsv, productionScenes } = await import('../src/production/queries.ts');
  const ps: Paragraph[] = [];
  const scene = (n: number, who: string[], lines = 3, extra: Partial<Paragraph> = {}) => { ps.push(P('h' + n, 'Scene Heading', 'INT. ROOM ' + n + ' - DAY', extra)); for (const w of who) { ps.push(P('c' + n + w, 'Character', w), P('d' + n + w, 'Dialogue', 'Words for ' + w + ' in scene ' + n + '.')); } for (let i = 0; i < lines; i++) ps.push(P('a' + n + '-' + i, 'Action', 'Something happens in the room, slowly and in detail, line ' + i + '.')); };
  scene(1, ['ANNA', 'BEN']); scene(2, ['ANNA'], 40); scene(3, ['BEN (V.O.)', 'CARA']); scene(4, ['CARA'], 2, { omitted: true });
  const d = doc(ps), cast = castList(d), by = (n: string) => cast.find(e => e.name === n)!;
  assert.deepEqual(cast.map(e => e.name), ['ANNA', 'BEN', 'CARA'], 'first-appearance order; extensions are not new characters');
  const scenes = productionScenes(d), eighths = (id: string) => scenes.find(s => s.id === id)!.eighths;
  assert.equal(by('ANNA').scenes, 2); assert.deepEqual(by('ANNA').sceneNumbers, ['1', '2']); assert.equal(by('ANNA').eighths, eighths('h1') + eighths('h2'));
  assert.equal(by('ANNA').screenSeconds, Math.round((eighths('h1') + eighths('h2')) / 8 * 60), '1 page ≈ 1 minute');
  assert.ok(by('ANNA').pages.length >= 2, 'scene 2 runs onto another page'); assert.equal(new Set(by('ANNA').pages).size, by('ANNA').pages.length, 'pages listed once');
  assert.equal(by('BEN').scenes, 2); assert.equal(by('BEN').speeches, 2); assert.equal(by('BEN').words, 13, '6 + 7 words');
  assert.equal(by('CARA').scenes, 1, 'the omitted scene is left out'); assert.equal(by('CARA').speeches, 1);
  assert.deepEqual(sortCast(cast, 'eighths', false).map(e => e.name)[0], 'ANNA'); assert.deepEqual(sortCast(cast, 'name', false).map(e => e.name), ['CARA', 'BEN', 'ANNA']);
  assert.equal(formatScreenTime(98), '1:38'); assert.equal(formatScreenTime(8), '0:08');
  const csv = castListCsv(cast).split('\n'); assert.equal(csv[0], '"Character","Scenes","Scene numbers","Pages","Page list","Eighths","Length (pages)","Screen time (est., m:ss)","Speeches","Words spoken"');
  assert.match(csv[1], /^"ANNA","2","1 2",/); assert.equal(csv.length, 4);
});

// ---- Item 1: emoji ----
test('emoji survive FDX and Fountain export and re-import, and words with emoji break like the browser (fallback rules)', async () => {
  const { exportToFdx, parseFdx } = await import('../src/utils/fdxCodec.ts');
  const { exportToFountain, parseFountain } = await import('../src/utils/fountainCodec.ts');
  const { emojiBreakParts, measureLines } = await import('../src/production/layout.ts');
  const texts = { h: 'INT. ROOM 🏠 - NIGHT', a: 'She laughs 😂😂 at the family 👨‍👩‍👧‍👦, flags 🇺🇸🇯🇵, skin tones 👍🏽 and keycaps 1️⃣ ❤️‍🔥.', c: 'ZOË 🤖', d: 'Hello 👋 friend!' };
  const d = doc([P('h', 'Scene Heading', texts.h), P('a', 'Action', texts.a), P('c', 'Character', texts.c), P('d', 'Dialogue', texts.d)], { titlePage: { title: 'EMOJI 🎬', author: 'QA', draftDate: '', contact: '', copyright: '' } } as Partial<ScriptDocument>);
  const fdx = exportToFdx(d); for (const t of Object.values(texts)) assert.ok(fdx.includes(t), 'FDX keeps ' + t);
  // Re-import (DOMParser) is checked in the interchange suite.
  const fountain = exportToFountain(d); for (const t of Object.values(texts)) assert.ok(fountain.includes(t), 'Fountain keeps ' + t);
  const fp = parseFountain(fountain).paragraphs!.filter(p => p.text.trim()); assert.deepEqual(fp.map(p => p.text), Object.values(texts), 'Fountain round trip');
  void parseFdx;
  // Without the renderer's ICU breaker (Node), words with emoji break before and after each emoji, never inside one,
  // never before closing punctuation or after opening punctuation.
  assert.deepEqual(emojiBreakParts('wow😀wow'), ['wow', '😀', 'wow']);
  assert.deepEqual(emojiBreakParts('(😀).'), ['(😀).']);
  assert.deepEqual(emojiBreakParts('😂😂'), ['😂', '😂']);
  assert.deepEqual(emojiBreakParts('👨‍👩‍👧‍👦👍🏽🇺🇸'), ['👨‍👩‍👧‍👦', '👍🏽', '🇺🇸'], 'ZWJ families, skin tones and flags stay whole');
  // A paragraph of emoji wraps on whole emoji and the line widths add up (fixed-width measure, 12 pt each).
  const p = P('x', 'Action', '😀'.repeat(50)), lines = measureLines(p, STANDARD_FORMAT.elements.Action, 432, 0, p.text.length, t => [...new Intl.Segmenter().segment(t)].length * 12);
  assert.deepEqual(lines.map(l => [...l.text].length), [36, 14], 'each line holds 36 emoji at 12 pt in 432 pt');
  assert.ok(lines.every(l => !/[\uD800-\uDBFF]$/.test(l.text)), 'no line ends inside a surrogate pair');
});

// ---- Item 2: nested outline elements and ripple insert ----
test('outline nesting: valid parents only, descendants, parent at a position, ripple shifts, cleaning', async () => {
  const { childMap, descendants, parentAt, rippleShifts, cleanNesting } = await import('../src/workspace/outlineNesting.ts');
  const lanes = [{ id: 'L1', name: 'Acts', type: 'act', color: '' }, { id: 'L2', name: 'Seq', type: 'sequence', color: '' }, { id: 'L3', name: 'Beats', type: 'custom', color: '' }] as never[];
  const items = [
    { id: 'act', laneId: 'L1', start: 0, end: 5 }, { id: 'seq', laneId: 'L2', start: 1, end: 3, parentId: 'act' }, { id: 'beat', laneId: 'L3', start: 1.5, end: 2, parentId: 'seq' },
    { id: 'b2', laneId: 'L3', start: 2, end: 3 }, { id: 'b3', laneId: 'L3', start: 4, end: 5, parentId: 'b2' /* same lane: invalid */ },
    { id: 'up', laneId: 'L1', start: 6, end: 7, parentId: 'beat' /* parent below: invalid */ }, { id: 'lost', laneId: 'L2', start: 6, end: 7, parentId: 'gone' },
  ];
  const kids = childMap(items, lanes);
  assert.deepEqual([...kids], [['act', ['seq']], ['seq', ['beat']]], 'only parents in a lane above count');
  assert.deepEqual(descendants('act', kids), ['seq', 'beat']); assert.deepEqual(descendants('beat', kids), []);
  assert.equal(parentAt(items, lanes, 'L3', 1.25), 'seq', 'the nearest lane above that covers the position');
  assert.equal(parentAt(items, lanes, 'L3', 4), 'act', 'falls back to a higher lane'); assert.equal(parentAt(items, lanes, 'L1', 1), undefined, 'top lane has no parent');
  assert.equal(parentAt(items, lanes, 'L3', 1.25, new Set(['seq'])), 'act', 'excluded elements are skipped');
  assert.equal(parentAt([...items, { id: 'pin', laneId: 'L2', start: 4, end: 4, point: true }], lanes, 'L3', 4), 'act', 'markers (points) are never parents');
  // Ripple: a new beat at 1.75–2.75 in L3 pushes b2 (2–3) and its followers right by 0.75; earlier ones stay.
  const shifts = rippleShifts(items, lanes, 'L3', 1.75, 2.75);
  assert.deepEqual([...shifts], [['b2', .75], ['b3', .75]]);
  assert.equal(rippleShifts(items, lanes, 'L3', 3, 3.5).size, 0, 'no overlap, no ripple');
  assert.deepEqual([...rippleShifts(items, lanes, 'L2', .5, 2)], [['seq', 1], ['beat', 1], ['lost', 1]], 'children of a pushed element move with it');
  const markers = items.map(i => ({ id: i.id, laneId: i.laneId, title: i.id, description: '', startPage: i.start + 1, endPage: i.end + 1, color: '', parentId: i.parentId }));
  const cleaned = cleanNesting(markers as never, lanes, m => items.find(i => i.id === (m as { id: string }).id)!);
  assert.deepEqual(cleaned.map(m => [m.id, m.parentId]), [['act', undefined], ['seq', 'act'], ['beat', 'seq'], ['b2', undefined], ['b3', undefined], ['up', undefined], ['lost', undefined]]);
});

// ---- Item 12: languages and right-to-left text ----
test('languages: the list is checked; other languages use the platform spellchecker through the same messages', async () => {
  const { sanitizeSettings, SPELLING_LANGUAGES, bundledLanguage } = await import('../src/writing/model.ts');
  const { PlatformSpellingWorker } = await import('../src/writing/platformSpelling.ts');
  assert.equal(sanitizeSettings({ language: 'fr' }).language, 'fr'); assert.equal(sanitizeSettings({ language: 'xx' }).language, 'en-US'); assert.equal(sanitizeSettings({ language: 'en-GB' }).language, 'en-GB');
  assert.ok(SPELLING_LANGUAGES.length >= 20); for (const code of ['fr', 'de', 'es', 'it', 'pt-BR', 'nl', 'sv', 'da', 'nb', 'fi', 'pl', 'he', 'ar']) assert.ok(SPELLING_LANGUAGES.some(([c]) => c === code), code);
  assert.equal(bundledLanguage('en-US'), true); assert.equal(bundledLanguage('fr'), false);
  const known = new Set(['bonjour', 'maison', 'le', 'chat', 'dort', 'la']), asked: string[][] = [];
  const bridge = { misspelled: (words: string[]) => { asked.push(words); return words.filter(w => !known.has(w.toLowerCase())); }, suggestions: (w: string) => w === 'bonjuor' ? ['bonjour'] : [], setLanguage: async () => ({}) };
  const worker = new PlatformSpellingWorker(bridge), messages: { type: string; [k: string]: unknown }[] = [];
  worker.onmessage = e => messages.push(e.data as never); const flush = () => new Promise(r => setTimeout(r, 0));
  worker.postMessage({ type: 'configure', language: 'fr' }); await flush(); assert.equal(messages.at(-1)!.type, 'ready');
  worker.postMessage({ type: 'analyze', items: [{ id: 'a', type: 'Action', text: 'Le chat dort, bonjuor la maison INT.' }, { id: 'c', type: 'Character', text: 'BONJUOR' }] }); await flush();
  const batch = messages.at(-1) as unknown as { items: { id: string; errors: { word: string; start: number }[] }[] };
  assert.deepEqual(batch.items[0].errors.map(e => [e.word, e.start]), [['bonjuor', 14]], 'only the misspelled word; screenplay words (INT) are not asked');
  assert.deepEqual(batch.items[1].errors, [], 'character cues are not checked');
  worker.postMessage({ type: 'lookup', request: 7, word: 'bonjuor' }); await flush(); assert.deepEqual(messages.at(-1), { type: 'lookup', request: 7, word: 'bonjuor', correct: false, suggestions: ['bonjour'] });
  const before = asked.length; worker.postMessage({ type: 'analyze', items: [{ id: 'a', type: 'Action', text: 'Le chat dort.' }] }); await flush(); assert.equal(asked.length, before, 'answers are cached');
});
test('right to left: printed lines of Hebrew and Arabic paragraphs run right to left; left-to-right print is unchanged', async () => {
  const { rtlAt } = await import('../src/production/print.ts');
  assert.equal(rtlAt('שלום עולם', 0), true); assert.equal(rtlAt('مرحبا بالعالم', 3), true); assert.equal(rtlAt('Hello שלום', 0), false, 'first strong character decides');
  assert.equal(rtlAt('Hello\nשלום', 6), true, 'each line-break paragraph on its own'); assert.equal(rtlAt('123 — ', 0), false);
  const d = doc([P('h', 'Scene Heading', 'INT. ROOM - DAY'), P('he', 'Action', 'דנה פותחת את החלון ומביטה ברחוב הריק. '.repeat(3)), P('ar', 'Dialogue', 'مرحبا، هل أنت هنا؟'), P('en', 'Action', 'She closes it again.')]);
  const page = documentLayout(d).pages[0], html = layoutPageHtml(d, page, {});
  const block = (id: string) => html.slice(html.indexOf('data-paragraph-id="' + id + '"'), html.indexOf('</div></div>', html.indexOf('data-paragraph-id="' + id + '"')));
  assert.match(block('he'), /<div dir="rtl" style="white-space:pre/); assert.ok((block('he').match(/dir="rtl"/g) || []).length >= 2, 'every line of the Hebrew paragraph');
  assert.match(block('ar'), /dir="rtl"/); assert.doesNotMatch(block('en'), /dir=/, 'English lines carry no direction'); assert.match(block('en'), /text-align:start/, 'start = left for left-to-right text');
});
