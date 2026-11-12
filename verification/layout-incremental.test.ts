// Incremental layout must give exactly the pages a full layout gives. Random scripts (scenes, action, dialogue that
// splits across pages with MORE/CONT'D, parentheticals, transitions, dual dialogue, acts, keep-with-next chains,
// page locks with A-pages) receive random edits: text changes, inserts, deletes and element changes. After each edit
// the incremental result is compared field by field with a fresh full layout.
import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutScript, resetLayoutReuse, lockLayout, browserMeasure, layoutReuseStats, type MeasureText } from '../src/production/layout.ts';
import { STANDARD_FORMAT } from '../src/formats/catalog.ts';
import { emptyStudio } from '../src/production/model.ts';
import type { Paragraph, ScriptDocument } from '../src/types/script.ts';

let seed = 1234567;
const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)];
const words = 'the rain falls over the station while everyone waits for a train that never comes back again tonight'.split(' ');
const sentence = (n: number) => Array.from({ length: n }, () => pick(words)).join(' ') + '.';
let nextId = 0;
const para = (type: Paragraph['type'], text: string, extra: Partial<Paragraph> = {}): Paragraph => ({ id: 'p' + (nextId++), type, text, ...extra });
function script(scenes: number): Paragraph[] {
  const ps: Paragraph[] = [para('New Act', 'ACT ONE')];
  for (let s = 0; s < scenes; s++) {
    ps.push(para('Scene Heading', pick(['INT. KITCHEN - NIGHT', 'EXT. ROAD - DAY', 'INT. CAR - DUSK'])));
    ps.push(para('Action', sentence(8 + Math.floor(rand() * 60))));
    for (let k = 0; k < 1 + Math.floor(rand() * 4); k++) {
      ps.push(para('Character', pick(['ANNA', 'BEN', 'CARLA'])));
      if (rand() < .3) ps.push(para('Parenthetical', '(quietly)'));
      ps.push(para('Dialogue', sentence(5 + Math.floor(rand() * (rand() < .15 ? 260 : 40)))));
      if (rand() < .3) ps.push(para('Action', sentence(6 + Math.floor(rand() * 20))));
    }
    if (rand() < .2) { const g = 'dual-' + s; ps.push(para('Character', 'ANNA', { dualGroupId: g, dualColumn: 1 }), para('Dialogue', sentence(10 + Math.floor(rand() * 40)), { dualGroupId: g, dualColumn: 1 }), para('Character', 'BEN', { dualGroupId: g, dualColumn: 2 }), para('Dialogue', sentence(10 + Math.floor(rand() * 40)), { dualGroupId: g, dualColumn: 2 })); }
    if (rand() < .25) ps.push(para('Transition', 'CUT TO:'));
    if (s === Math.floor(scenes / 2)) ps.push(para('New Act', 'ACT TWO'));
  }
  return ps;
}
function edit(ps: Paragraph[]): Paragraph[] {
  const next = ps.slice(), i = Math.floor(rand() * next.length), r = rand(), p = next[i];
  if (r < .45) next[i] = { ...p, text: p.text + (rand() < .5 ? ' ' + sentence(1 + Math.floor(rand() * 30)) : 'x') };
  else if (r < .6) next[i] = { ...p, text: p.text.slice(0, Math.max(0, p.text.length - 1 - Math.floor(rand() * 80))) };
  else if (r < .75) { if (!p.dualGroupId) next.splice(i, 0, para(pick(['Action', 'Scene Heading', 'Character', 'Dialogue']), sentence(3 + Math.floor(rand() * 50)))); }
  else if (r < .87) { if (!p.dualGroupId && next.length > 5) next.splice(i, 1); }
  else if (!p.dualGroupId) next[i] = { ...p, type: pick(['Action', 'Character', 'Dialogue', 'Scene Heading', 'Shot']) };
  return next;
}
const shape = (r: ReturnType<typeof layoutScript>) => r.pages.map(pg => ({ n: pg.pageNumber, label: pg.pageLabel, id: pg.id.startsWith('flow:') ? 'flow' : pg.id, omitted: !!pg.omitted, more: !!pg.more, cont: pg.continuedCharacter || '', lines: pg.lineCount, used: pg.usedHeight,
  paragraphs: pg.paragraphs.map(p => p.id).join(','), fragments: pg.fragments.map(f => [f.paragraphId, f.start, f.end, f.x, f.y, f.width, f.height, f.column || 0, f.imageHeight, f.lines.length].join(':')).join('|'),
  labels: pg.labels.map(l => [l.kind, l.text, l.x, l.y, l.width, l.align, l.paragraphId || ''].join(':')).join('|') }));
// The same measurements through a different function: a full layout that neither uses nor replaces the reuse state.
const fullMeasure: MeasureText = (t, st, p, at) => browserMeasure(t, st, p, at);
const full = (ps: Paragraph[], state?: Parameters<typeof layoutScript>[2]) => layoutScript(ps, STANDARD_FORMAT, state, fullMeasure);

test('incremental layout equals a full layout after random edits (chained runs, no production locks)', () => {
  for (let round = 0; round < 8; round++) {
    let ps = script(40 + Math.floor(rand() * 40)); resetLayoutReuse();
    let resumedRuns = 0, convergedRuns = 0, before = layoutScript(ps, STANDARD_FORMAT), beforeShape = JSON.stringify(shape(before));
    for (let k = 0; k < 40; k++) { ps = edit(ps); const inc = layoutScript(ps, STANDARD_FORMAT); assert.equal(JSON.stringify(shape(before)), beforeShape, `round ${round} edit ${k}: the previous result is unchanged`); before = inc; beforeShape = JSON.stringify(shape(inc)); if (layoutReuseStats.reusedPages > 0) resumedRuns++; if (layoutReuseStats.reusedTail > 0) convergedRuns++; const ref = full(ps); assert.deepEqual(shape(inc), shape(ref), `round ${round} edit ${k}`); assert.deepEqual([...inc.paragraphPages], [...ref.paragraphPages], `round ${round} edit ${k} paragraphPages`); }
    assert.ok(resumedRuns > 20, 'most runs resumed: ' + resumedRuns);
    assert.ok(convergedRuns > 10, 'many runs stopped early and reused the tail: ' + convergedRuns);
  }
});

test('incremental layout resumes mid-script and reuses earlier pages', () => {
  // Regular scenes (no long speeches), so reuse is predictable.
  let ps: Paragraph[] = []; for (let s = 0; s < 80; s++) ps.push(para('Scene Heading', 'INT. KITCHEN - NIGHT'), para('Action', 'He waits by the window for the train that is late again tonight and the rain keeps falling.'), para('Character', s % 2 ? 'ANNA' : 'BEN'), para('Dialogue', 'We should go before the rain comes down on all of us tonight.'));
  resetLayoutReuse(); const first = layoutScript(ps, STANDARD_FORMAT); assert.ok(first.pages.length > 12, 'a long script'); const firstShape = JSON.stringify(shape(first));
  const at = ps.length - 5; ps = ps.map((p, i) => i === at ? { ...p, text: p.text + ' more' } : p);
  const second = layoutScript(ps, STANDARD_FORMAT);
  assert.ok(layoutReuseStats.reusedPages >= first.pages.length - 3, 'only the last pages were laid out again: ' + JSON.stringify(layoutReuseStats));
  // An edit near the start: resume at page 1 and stop as soon as the layout rejoins the previous run.
  // (a same-length change keeps the line count, so the very next page start matches the previous run)
  ps = ps.map((p, i) => i === 1 ? { ...p, text: p.text.replace('train', 'trams') } : p); const third = layoutScript(ps, STANDARD_FORMAT);
  assert.ok(layoutReuseStats.reusedTail >= third.pages.length - 4, 'the tail was reused: ' + JSON.stringify(layoutReuseStats));
  assert.deepEqual(shape(third), shape(full(ps)));
  assert.equal(JSON.stringify(shape(first)), firstShape, 'earlier results are never modified by later runs');
  assert.ok(second.pages[0].fragments[0] === first.pages[0].fragments[0], 'fragments of early pages are the same objects');
  assert.equal(second.pages[0], first.pages[0], 'untouched pages are reused as they are');
  assert.deepEqual(shape(second), shape(full(ps)));
});

test('incremental layout equals a full layout with page locks and A-pages', () => {
  for (let round = 0; round < 4; round++) {
    let ps = script(50); resetLayoutReuse();
    const doc = { id: 'd', paragraphs: ps, writingFormat: STANDARD_FORMAT, studio: emptyStudio('W') } as unknown as ScriptDocument;
    const locked = lockLayout(doc); const state = locked.studio!;
    layoutScript(ps, STANDARD_FORMAT, state);
    let aPages = 0;
    for (let k = 0; k < 30; k++) { ps = edit(ps); /* the app rebuilds the production state object on every edit */const inc = layoutScript(ps, STANDARD_FORMAT, { ...state, pageLocks: state.pageLocks.map(l => ({ ...l })) }); assert.deepEqual(shape(inc), shape(full(ps, state)), `locks round ${round} edit ${k}`); aPages += inc.pages.filter(pg => /[A-Z]$/.test(pg.pageLabel)).length; }
    assert.ok(aPages > 0, 'edits after locking produce A-pages');
  }
});
