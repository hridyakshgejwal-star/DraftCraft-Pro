// Structure Lines: coloured lines in the left page margin that show which act, sequence, outline beat and scene each
// part of the script belongs to. Regions come from the script's own structural elements (New Act / Outline Level 1,
// Sequence / Outline Level 2, Outline Level 3, Scene Heading). Where the script has none at a level, the timeline's
// lane of that kind supplies the regions by page position. Lines are drawn outside the text column, so they never
// move text or change pagination.
import type { BeatCard, OutlineLane, OutlineMarker, Paragraph, ScriptDocument } from '../types/script';
import { markerPosition, resolveAnchor, type StoryIndex } from './model';
export type StructureLevel = 0 | 1 | 2 | 3;
export interface StructureSpan { level: StructureLevel; label: string; color: string; start: number; end: number; startId: string;
  /** The colour comes from the built-in palette (the region has no colour of its own), so a level default may replace it. */ auto?: boolean }
/** How the lines are drawn (the writer's settings): width in px (pt in print), opacity, levels shown, level default colours. */
export interface StructureStyle { width: number; opacity: number; levels: readonly boolean[]; colors: readonly string[] }
export const DEFAULT_STRUCTURE_STYLE: StructureStyle = { width: 3, opacity: .92, levels: [true, true, true, true], colors: ['', '', '', ''] };
/** The regions to draw under a style: hidden levels are left out, and palette colours give way to level defaults. */
export function styledSpans(spans: StructureSpan[], style: StructureStyle = DEFAULT_STRUCTURE_STYLE): StructureSpan[] {
  if (style.levels.every(Boolean) && !style.colors.some(Boolean)) return spans;
  return spans.filter(s => style.levels[s.level] !== false).map(s => s.auto && style.colors[s.level] ? { ...s, color: style.colors[s.level] } : s);
}
/** Scene lines are thinner and fainter than act, sequence and outline lines. */
export const structureWidth = (level: StructureLevel, style: StructureStyle = DEFAULT_STRUCTURE_STYLE) => level === 3 ? Math.max(1, style.width * 2 / 3) : style.width;
export const structureOpacity = (level: StructureLevel, style: StructureStyle = DEFAULT_STRUCTURE_STYLE) => Math.round((level === 3 ? style.opacity * .6 : style.opacity) * 100) / 100;
export const STRUCTURE_NAMES = ['Act', 'Sequence', 'Outline', 'Scene'];
const PALETTES = [['#8fc5b8', '#7fb3d5', '#d9a3d0', '#a9cf7f'], ['#a99be6', '#9fb8e8', '#e9b872', '#e98f8f'], ['#e9b872', '#f2d16b', '#a9cf7f', '#d9a3d0']];
const LEVEL_TYPES: Record<number, Paragraph['type'][]> = { 0: ['New Act', 'Outline Level 1'], 1: ['Sequence', 'Outline Level 2'], 2: ['Outline Level 3'] };
const LANE_TYPES: Record<number, OutlineLane['type'][]> = { 0: ['act'], 1: ['sequence'], 2: ['custom', 'scene', 'character'] };
function planningColor(doc: ScriptDocument, p: Paragraph) {
  const marker = p.sourceMarkerId ? doc.outlineMarkers.find(m => m.id === p.sourceMarkerId) : p.sourceBeatId ? doc.outlineMarkers.find(m => m.beatId === p.sourceBeatId) : undefined;
  const beat: BeatCard | undefined = p.sourceBeatId ? doc.beats.find(b => b.id === p.sourceBeatId) : marker?.beatId ? doc.beats.find(b => b.id === marker.beatId) : undefined;
  return marker?.color || beat?.color;
}
export function structureSpans(doc: ScriptDocument, index: StoryIndex): StructureSpan[] {
  const paragraphs = doc.paragraphs, spans: StructureSpan[] = [];
  for (const level of [0, 1, 2] as const) {
    const types = LEVEL_TYPES[level], starts = paragraphs.map((p, i) => types.includes(p.type) ? i : -1).filter(i => i >= 0);
    if (starts.length) {
      starts.forEach((at, n) => {
        let end = starts[n + 1] ?? paragraphs.length;
        // An act also closes at its End of Act element.
        if (level === 0) { const close = paragraphs.findIndex((p, i) => i > at && i < end && p.type === 'End of Act'); if (close >= 0) end = close + 1; }
        const p = paragraphs[at], own = planningColor(doc, p);
        spans.push({ level, label: p.text || STRUCTURE_NAMES[level], color: own || PALETTES[level][n % 4], auto: !own, start: at, end, startId: p.id });
      });
      continue;
    }
    // No structural elements at this level: use the timeline lane of the same kind (planning page positions).
    const lane = doc.outlineLanes.find(l => LANE_TYPES[level].includes(l.type) && doc.outlineMarkers.some(m => m.laneId === l.id && (!m.kind || m.kind === 'section')));
    if (!lane) continue;
    const markers = doc.outlineMarkers.filter((m: OutlineMarker) => m.laneId === lane.id && m.visible !== false && (!m.kind || m.kind === 'section'));
    for (const m of markers) {
      const from = markerPosition(m, index), to = m.endAnchor ? resolveAnchor(m.endAnchor, index) : Math.max(0, m.endPage - 1);
      let start = -1, end = -1;
      paragraphs.forEach((p, i) => { const at = index.positions.get(p.id); if (at === undefined) return; if (at >= from - 1e-6 && at < to - 1e-6) { if (start < 0) start = i; end = i + 1; } });
      if (start < 0) continue;
      const beat = m.beatId ? doc.beats.find(b => b.id === m.beatId) : undefined;
      spans.push({ level, label: beat?.title || m.title, color: m.color || beat?.color || PALETTES[level][0], auto: !(m.color || beat?.color), start, end, startId: paragraphs[start].id });
    }
  }
  const scenes = paragraphs.map((p, i) => p.type === 'Scene Heading' ? i : -1).filter(i => i >= 0);
  scenes.forEach((at, n) => spans.push({ level: 3, label: paragraphs[at].text || 'Scene', color: paragraphs[at].sceneColor || 'rgba(150,160,185,.55)', auto: !paragraphs[at].sceneColor, start: at, end: scenes[n + 1] ?? paragraphs.length, startId: paragraphs[at].id }));
  return spans;
}
export interface StructureSegment { span: StructureSpan; top: number; bottom: number; continuesBefore: boolean; continuesAfter: boolean }
/** Spans grouped by level and sorted by start, with the longest span of each level, so a page looks only at the
 * spans that can reach it (1.17: a 250-page script has hundreds of scene regions; checking every region on every page
 * after each keystroke allocated megabytes). Cached per spans array. */
type SpanRef = { start: number; end: number; i: number };
const spanIndex = new WeakMap<StructureSpan[], { groups: SpanRef[][]; maxLen: number[] }>();
function indexSpans(spans: StructureSpan[]) {
  let index = spanIndex.get(spans);
  if (!index) {
    const byLevel = new Map<number, SpanRef[]>();
    spans.forEach((span, i) => { let list = byLevel.get(span.level); if (!list) byLevel.set(span.level, list = []); list.push({ start: span.start, end: span.end, i }); });
    const groups = [...byLevel.values()].map(list => list.sort((a, b) => a.start - b.start || a.i - b.i));
    index = { groups, maxLen: groups.map(list => list.reduce((m: number, x: SpanRef) => Math.max(m, x.end - x.start), 0)) };
    spanIndex.set(spans, index);
  }
  return index;
}
/** The part of each region on one page, in points from the top of the text area. */
export function pageSegments(spans: StructureSpan[], fragments: { paragraphId: string; y: number; height: number }[], order: Map<string, number>, contentHeight: number): StructureSegment[] {
  if (!fragments.length) return [];
  const n = fragments.length, indices = new Array<number>(n);let first = Infinity, last = -Infinity;
  for (let k = 0; k < n; k++) { const at = order.get(fragments[k].paragraphId) ?? -1; indices[k] = at; if (at >= 0 && at < first) first = at; if (at > last) last = at; }
  if (!Number.isFinite(first)) return [];
  // Candidates: spans with start <= last and end > first, found per level by binary search on start.
  const { groups, maxLen } = indexSpans(spans), hits: number[] = [];
  groups.forEach((list, g) => {
    const from = first - maxLen[g];let lo = 0, hi = list.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (list[mid].start < from) lo = mid + 1; else hi = mid; }
    for (let k = lo; k < list.length && list[k].start <= last; k++) if (list[k].end > first) hits.push(list[k].i);
  });
  hits.sort((a, b) => a - b);
  const out: StructureSegment[] = [];
  for (const h of hits) {
    const span = spans[h];let top = Infinity, bottom = -Infinity;
    for (let k = 0; k < n; k++) { const at = indices[k]; if (at >= span.start && at < span.end) { const f = fragments[k]; if (f.y < top) top = f.y; if (f.y + f.height > bottom) bottom = f.y + f.height; } }
    const before = span.start < first, after = span.end - 1 > last;
    if (before) top = 0; if (after) bottom = contentHeight;
    if (!Number.isFinite(top)) { if (before && after) { top = 0; bottom = contentHeight; } else continue; }
    out.push({ span, top, bottom, continuesBefore: before, continuesAfter: after });
  }
  return out;
}
/** Horizontal place of each level's line, in inches left of the text column. */
export const STRUCTURE_OFFSETS = [1.16, 1.06, .96, .86];
