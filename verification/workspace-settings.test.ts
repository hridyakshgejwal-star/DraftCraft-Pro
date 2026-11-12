// 1.16.1 workspace settings: Structure Line drawing settings (editor and print), and the stored preferences for
// Navigator table columns, toolbar groups and Structure Lines (defaults, limits, and older preference files).
import test from 'node:test';
import assert from 'node:assert/strict';
import { structureSpans, styledSpans, structureWidth, structureOpacity, DEFAULT_STRUCTURE_STYLE } from '../src/story/structure.ts';
import { buildStoryIndex } from '../src/story/model.ts';
import { layoutPageHtml } from '../src/production/print.ts';
import { documentLayout } from '../src/production/layout.ts';
import { normalizeWorkspace, DEFAULT_WORKSPACE, NAVIGATOR_COLUMN_WIDTHS } from '../src/workspace/preferences.ts';
import { STANDARD_FORMAT } from '../src/formats/catalog.ts';
import type { Paragraph, ScriptDocument } from '../src/types/script.ts';

const P = (id: string, type: Paragraph['type'], text: string, extra: Partial<Paragraph> = {}): Paragraph => ({ id, type, text, ...extra });
function doc(): ScriptDocument {
  const paragraphs: Paragraph[] = [P('act1', 'New Act', 'ACT ONE')];
  for (let i = 0; i < 6; i++) paragraphs.push(P('h' + i, 'Scene Heading', 'INT. ROOM - DAY', i === 2 ? { sceneColor: '#123456' } : {}), P('a' + i, 'Action', 'She waits by the window for the train.'));
  paragraphs.push(P('act2', 'New Act', 'ACT TWO'), P('h9', 'Scene Heading', 'EXT. ROAD - NIGHT'));
  return { id: 'd', titlePage: { title: 'T', author: '', draftDate: '', contact: '', copyright: '' }, paragraphs, beats: [], flowLines: [], outlineLanes: [], outlineMarkers: [], characterHighlights: {}, showStructureLines: true, writingFormat: structuredClone(STANDARD_FORMAT), currentRevision: 'White', productionMode: false, lockedPages: false, sceneNumberPlacement: 'none' } as unknown as ScriptDocument;
}

test('structure styles: hidden levels are left out and level colours replace only palette colours', () => {
  const d = doc(), spans = structureSpans(d, buildStoryIndex(d.paragraphs));
  assert.equal(styledSpans(spans), spans, 'the default style draws every region as it is');
  const styled = styledSpans(spans, { width: 4, opacity: .5, levels: [true, false, false, false], colors: ['#ff0000', '', '', '#00ff00'] });
  assert.ok(styled.every(s => s.level === 0), 'only act lines');
  assert.deepEqual(styled.map(s => s.color), ['#ff0000', '#ff0000']);
  const scenes = styledSpans(spans, { ...DEFAULT_STRUCTURE_STYLE, colors: ['', '', '', '#00ff00'] }).filter(s => s.level === 3);
  assert.equal(scenes.find(s => s.startId === 'h2')!.color, '#123456', 'a scene colour of its own wins over the level default');
  assert.equal(scenes.find(s => s.startId === 'h1')!.color, '#00ff00');
  assert.ok(spans.every(s => s.color !== '#ff0000'), 'the regions themselves are not changed');
  assert.equal(structureWidth(0, { ...DEFAULT_STRUCTURE_STYLE, width: 6 }), 6);assert.equal(structureWidth(3, { ...DEFAULT_STRUCTURE_STYLE, width: 6 }), 4);assert.equal(structureWidth(3, { ...DEFAULT_STRUCTURE_STYLE, width: 1 }), 1);
  assert.equal(structureOpacity(3, { ...DEFAULT_STRUCTURE_STYLE, opacity: .5 }), .3);
});

test('print and PDF draw Structure Lines with the writer’s settings (defaults unchanged)', () => {
  const d = doc(), page = documentLayout(d).pages[0];
  const plain = layoutPageHtml(d, page, { structureLines: true });
  assert.match(plain, /data-structure-level="0"[^>]*width:3pt;[^>]*opacity:0\.92/);assert.match(plain, /data-structure-level="3"[^>]*width:1\.5pt;[^>]*opacity:0\.55/);
  const styled = layoutPageHtml(d, page, { structureLines: true, structureStyle: { width: 6, opacity: .5, levels: [true, false, false, false], colors: ['#ff0000', '', '', ''] } });
  assert.match(styled, /data-structure-level="0"[^>]*width:6pt;background:#ff0000;opacity:0\.5/);
  assert.ok(!styled.includes('data-structure-level="3"'), 'hidden scene lines do not print');
  assert.ok(!layoutPageHtml(d, page, { structureLines: false, structureStyle: DEFAULT_STRUCTURE_STYLE }).includes('data-structure-level'));
});

test('workspace preferences: new settings have defaults, limits, and survive older preference files', () => {
  const old = normalizeWorkspace({ version: 1, navigator: { open: false, width: 280 }, toolbar: { items: ['new', 'save'], display: 'icon', size: 'regular', visible: true } });
  assert.equal(old.navigator.open, false);assert.equal(old.navigator.width, 280);assert.equal(old.navigator.sceneView, 'cards');
  assert.deepEqual(old.navigator.columnWidths, NAVIGATOR_COLUMN_WIDTHS);assert.ok(Object.entries(old.navigator.columns).every(([c, shown]) => shown === (c !== 'comment')), 'all columns shown except the 1.17 Comment column, which starts hidden');
  assert.deepEqual(old.toolbar.hiddenGroups, []);assert.deepEqual(old.structure, DEFAULT_WORKSPACE.structure);
  const odd = normalizeWorkspace({ navigator: { sceneView: 'table', columns: { setting: false, bogus: true }, columnWidths: { heading: 9999, number: 2, summary: 'x' } },
    toolbar: { hiddenGroups: ['document', 'nope', 'tools', 'document'] }, structure: { width: 20, opacity: 0, levels: [false, 'x'], colors: ['#ABCDEF', 'red', '#12345', null] } });
  assert.equal(odd.navigator.sceneView, 'table');assert.equal(odd.navigator.columns.setting, false);assert.equal((odd.navigator.columns as Record<string, boolean>).bogus, undefined);
  assert.deepEqual([odd.navigator.columnWidths.heading, odd.navigator.columnWidths.number, odd.navigator.columnWidths.summary], [640, 36, NAVIGATOR_COLUMN_WIDTHS.summary]);
  assert.deepEqual(odd.toolbar.hiddenGroups, ['document', 'tools']);
  assert.deepEqual(odd.structure, { width: 8, opacity: .15, levels: [false, true, true, true], colors: ['#abcdef', '', '', ''] });
  assert.deepEqual(normalizeWorkspace(JSON.parse(JSON.stringify(DEFAULT_WORKSPACE))), DEFAULT_WORKSPACE, 'defaults round-trip');
});
