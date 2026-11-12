import test from 'node:test';
// 1.17: the indexed pageSegments equals the 1.16 implementation on random spans and pages.
// Compares the new pageSegments with the 1.16 version on random spans and pages.
import assert from 'node:assert/strict';
import { pageSegments } from '../src/story/structure.ts';
function old(spans: any[], fragments: any[], order: Map<string, number>, contentHeight: number) {
  if (!fragments.length) return [];
  const indices = fragments.map(f => order.get(f.paragraphId) ?? -1), first = Math.min(...indices.filter(i => i >= 0)), last = Math.max(...indices);
  const out: any[] = [];
  for (const span of spans) { if (span.end <= first || span.start > last) continue; let top = Infinity, bottom = -Infinity;
    fragments.forEach((f, i) => { const at = indices[i]; if (at >= span.start && at < span.end) { top = Math.min(top, f.y); bottom = Math.max(bottom, f.y + f.height); } });
    const before = span.start < first, after = span.end - 1 > last; if (before) top = 0; if (after) bottom = contentHeight;
    if (!Number.isFinite(top)) { if (before && after) { top = 0; bottom = contentHeight; } else continue; }
    out.push({ span, top, bottom, continuesBefore: before, continuesAfter: after }); }
  return out;
}
test('indexed Structure Line segments equal the 1.16 implementation (3000 random pages)', () => {
let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
for (let t = 0; t < 3000; t++) {
  const N = 5 + Math.floor(rnd() * 200), order = new Map<string, number>(); for (let i = 0; i < N; i++) order.set('p' + i, i);
  const spans: any[] = []; for (let l = 0; l < 4; l++) { let at = 0; while (at < N) { const len = 1 + Math.floor(rnd() * (l === 0 ? 80 : l === 3 ? 6 : 25)); if (rnd() < .8) spans.push({ level: l, label: 'x', color: '', start: at, end: Math.min(N, at + len), startId: 'p' + at }); at += len; } }
  if (rnd() < .3) spans.push({ level: 2, label: 'overlap', color: '', start: Math.floor(rnd() * N), end: N, startId: 'q' });
  spans.sort(() => rnd() - .5);
  const a = Math.floor(rnd() * N), b = Math.min(N - 1, a + Math.floor(rnd() * 20)), fragments: any[] = []; let y = 0;
  for (let i = a; i <= b; i++) { fragments.push({ paragraphId: rnd() < .05 ? 'unknown' : 'p' + i, y, height: 12 + Math.floor(rnd() * 3) * 12 }); y += 24; }
  assert.deepEqual(pageSegments(spans, fragments, order, 648), old(spans, fragments, order, 648), 'case ' + t);
}
});
