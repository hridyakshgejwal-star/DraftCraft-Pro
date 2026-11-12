// Cross-paragraph editing model (1.15.3). Every screenplay element is its own
// semantic paragraph (and its own textarea), so operations that cross element
// boundaries — joining, splitting with rich text, range selection, deleting,
// copying and pasting several elements — are defined here as pure functions on
// the paragraph list. The rules keep stable identities so production anchors
// (tags, locks) can follow exact split/join correspondences:
//   - a join keeps the FIRST paragraph's id, type and metadata, and the joined
//     text is exactly the concatenation of the pieces;
//   - a split keeps the original id for the left piece and creates new ids.
import type { Paragraph, RevisionTier, TextRun } from '../types/script';
import type { RevisionMark } from '../production/model';

export interface TextPoint { id: string; offset: number }
export interface CrossSelection { anchor: TextPoint; focus: TextPoint }
export interface EditResult { paragraphs: Paragraph[]; caret: TextPoint }
export interface Blocked { blocked: string }

const newId = () => 'p-' + crypto.randomUUID();
const indexOf = (paragraphs: Paragraph[], id: string) => paragraphs.findIndex((p) => p.id === id);
const runsValid = (p: Paragraph) => !!p.runs?.length && p.runs.map((r) => r.text).join('') === p.text;

/** Runs covering text[start,end) of a paragraph (undefined when the paragraph has no valid runs). */
export function sliceRuns(p: Paragraph, start: number, end: number): TextRun[] | undefined {
  if (!runsValid(p)) return undefined;
  const out: TextRun[] = [];
  let at = 0;
  for (const run of p.runs!) {
    const a = Math.max(start, at), b = Math.min(end, at + run.text.length);
    if (b > a) out.push({ ...run, text: run.text.slice(a - at, b - at) });
    at += run.text.length;
  }
  return out.length ? out : undefined;
}
/** Concatenate the runs of two text pieces; plain pieces become unstyled runs when the other side is styled. */
export function joinRuns(a: { text: string; runs?: TextRun[] }, b: { text: string; runs?: TextRun[] }): TextRun[] | undefined {
  if (!a.runs?.length && !b.runs?.length) return undefined;
  const left = a.runs?.length ? a.runs : a.text ? [{ text: a.text }] : [];
  const right = b.runs?.length ? b.runs : b.text ? [{ text: b.text }] : [];
  const merged: TextRun[] = [];
  for (const run of [...left, ...right]) {
    const last = merged.at(-1);
    if (last && JSON.stringify(last.style || {}) === JSON.stringify(run.style || {}) && last.revisionId === run.revisionId) merged[merged.length - 1] = { ...last, text: last.text + run.text };
    else if (run.text) merged.push({ ...run });
  }
  return merged.length ? merged : undefined;
}
function clipMarks(marks: RevisionMark[] | undefined, start: number, end: number, by = -start) {
  const out = (marks || []).flatMap((m) => { const a = Math.max(start, m.start), b = Math.min(end, m.end); return b > a || (m.start === m.end && m.start >= start && m.start <= end) ? [{ ...m, start: a + by, end: b + by }] : []; });
  return out.length ? out : undefined;
}
const revised = (p: Paragraph, revision?: RevisionTier): Paragraph => (revision ? { ...p, revised: true, revision } : p);

/** Split one paragraph at [start,end) keeping inline styles and revision marks on both sides. */
export function splitParagraph(p: Paragraph, start: number, end = start): { left: Paragraph; right: Paragraph } {
  const left: Paragraph = { ...p, text: p.text.slice(0, start), runs: sliceRuns(p, 0, start), revisionMarks: clipMarks(p.revisionMarks, 0, start, 0) };
  const right: Paragraph = { id: newId(), type: p.type, text: p.text.slice(end), runs: sliceRuns(p, end, p.text.length), revisionMarks: clipMarks(p.revisionMarks, end, p.text.length), ...(p.dualGroupId ? { dualGroupId: p.dualGroupId, dualColumn: p.dualColumn } : {}) };
  return { left, right };
}

/** Concatenate `second` onto `first`, keeping `first`'s identity, type and element metadata. */
function concatParagraphs(first: Paragraph, second: Paragraph, revision?: RevisionTier): Paragraph {
  const text = first.text + second.text;
  const notes = [...(first.notes || []), ...(second.notes || []).map((n) => ({ ...n, paragraphId: first.id }))];
  const tags = [...new Set([...(first.tags || []), ...(second.tags || [])])];
  // Revision marks stay in the first paragraph's previous coordinates: reconcileStudio
  // re-derives them from the text edit (and adds the active revision's mark).
  const images = [...(first.images || []), ...(second.images || [])];
  const joined: Paragraph = {
    ...first,
    text,
    runs: joinRuns({ text: first.text, runs: runsValid(first) ? first.runs : undefined }, { text: second.text, runs: runsValid(second) ? second.runs : undefined }),
    notes: notes.length ? notes : undefined,
    tags: tags.length ? tags : undefined,
    bookmark: first.bookmark || (second.bookmark && typeof second.bookmark === 'object' ? { ...second.bookmark, paragraphId: first.id } : second.bookmark),
    images: images.length ? images : undefined,
    sceneComment: first.sceneComment || second.sceneComment,
  };
  for (const key of Object.keys(joined) as (keyof Paragraph)[]) if (joined[key] === undefined) delete joined[key];
  return revised(joined, revision);
}

/** Merge `second` into `first` (Backspace at the start of `second`, or Delete at the end of `first`). */
/** Removing an empty element keeps its neighbour as it is (identity, type and inline styles);
 * only the empty element's annotations move across, so nothing attached to it is lost. */
function absorbEmpty(kept: Paragraph, empty: Paragraph): Paragraph {
  const notes = [...(kept.notes || []), ...(empty.notes || []).map((n) => ({ ...n, paragraphId: kept.id }))];
  const tags = [...new Set([...(kept.tags || []), ...(empty.tags || [])])];
  const images = [...(empty.images || []), ...(kept.images || [])];
  const result: Paragraph = {
    ...kept,
    notes: notes.length ? notes : undefined,
    tags: tags.length ? tags : undefined,
    bookmark: kept.bookmark || (empty.bookmark && typeof empty.bookmark === 'object' ? { ...empty.bookmark, paragraphId: kept.id } : empty.bookmark),
    images: images.length ? images : undefined,
    sceneComment: kept.sceneComment || empty.sceneComment,
  };
  for (const key of Object.keys(result) as (keyof Paragraph)[]) if (result[key] === undefined) delete result[key];
  return result;
}

export function joinParagraphs(first: Paragraph, second: Paragraph, revision?: RevisionTier): Paragraph | Blocked {
  // Backspace into, or Delete from, an empty element removes that element: the element with
  // text keeps its own type (an empty Character line never turns the next Dialogue into a cue).
  if (!first.text && second.text && (first.altDialogue?.length || 0) <= 1 && !first.images?.length) return absorbEmpty(second, first);
  if ((second.altDialogue?.length || 0) > 1) return { blocked: 'This element has alternate dialogue takes, which would be lost by joining. Choose a single take first.' };
  if (first.type === 'Scene Heading' && second.type === 'Scene Heading' && first.lockedScene && second.lockedScene) return { blocked: 'Two locked scene headings cannot be joined. Unlock or omit one scene first.' };
  return concatParagraphs(first, second, revision);
}

export function joinWithPrevious(paragraphs: Paragraph[], id: string, revision?: RevisionTier): EditResult | Blocked | null {
  const i = indexOf(paragraphs, id);
  if (i <= 0) return null;
  const joined = joinParagraphs(paragraphs[i - 1], paragraphs[i], revision);
  if ('blocked' in joined) return joined;
  const next = [...paragraphs];
  next.splice(i - 1, 2, joined);
  return { paragraphs: next, caret: { id: joined.id, offset: paragraphs[i - 1].text.length } };
}
export function joinWithNext(paragraphs: Paragraph[], id: string, revision?: RevisionTier): EditResult | Blocked | null {
  const i = indexOf(paragraphs, id);
  if (i < 0 || i >= paragraphs.length - 1) return null;
  return joinWithPrevious(paragraphs, paragraphs[i + 1].id, revision);
}

/** Selection endpoints in document order, or null when either endpoint no longer exists. */
export function ordered(paragraphs: Paragraph[], sel: CrossSelection) {
  const a = indexOf(paragraphs, sel.anchor.id), f = indexOf(paragraphs, sel.focus.id);
  if (a < 0 || f < 0) return null;
  const clamp = (pt: TextPoint, i: number) => ({ id: pt.id, offset: Math.max(0, Math.min(paragraphs[i].text.length, pt.offset)), index: i });
  const A = clamp(sel.anchor, a), F = clamp(sel.focus, f);
  return A.index < F.index || (A.index === F.index && A.offset <= F.offset) ? { start: A, end: F } : { start: F, end: A };
}
export function isCollapsed(paragraphs: Paragraph[], sel: CrossSelection) { const o = ordered(paragraphs, sel); return !o || (o.start.index === o.end.index && o.start.offset === o.end.offset); }
export function spansParagraphs(paragraphs: Paragraph[], sel: CrossSelection | null) { const o = sel && ordered(paragraphs, sel); return !!o && o.start.index !== o.end.index; }

/** Per-paragraph [start,end) ranges covered by the selection. */
export function selectionRanges(paragraphs: Paragraph[], sel: CrossSelection): { id: string; start: number; end: number }[] {
  const o = ordered(paragraphs, sel);
  if (!o) return [];
  const out = [];
  for (let i = o.start.index; i <= o.end.index; i++) {
    const p = paragraphs[i];
    out.push({ id: p.id, start: i === o.start.index ? o.start.offset : 0, end: i === o.end.index ? o.end.offset : p.text.length });
  }
  return out;
}

/** Selected content as standalone paragraphs (types, inline styles and notes retained) for the clipboard. */
export function extractSelection(paragraphs: Paragraph[], sel: CrossSelection): Paragraph[] {
  return selectionRanges(paragraphs, sel).map((r) => {
    const p = paragraphs[indexOf(paragraphs, r.id)];
    if (r.start === 0 && r.end === p.text.length) return structuredClone(p);
    return { id: p.id, type: p.type, text: p.text.slice(r.start, r.end), runs: sliceRuns(p, r.start, r.end), ...(p.dualGroupId ? { dualGroupId: p.dualGroupId, dualColumn: p.dualColumn } : {}) };
  });
}

/** Plain text of a selection; elements are separated by a blank line like a screenplay page. */
export function selectionText(paragraphs: Paragraph[], sel: CrossSelection) { return extractSelection(paragraphs, sel).map((p) => p.text).join('\n\n'); }

/** Delete the selected range. The first paragraph keeps its id/type; the remainder of the last is appended to it. */
export function deleteSelection(paragraphs: Paragraph[], sel: CrossSelection, revision?: RevisionTier): EditResult | Blocked | null {
  const o = ordered(paragraphs, sel);
  if (!o) return null;
  const first = paragraphs[o.start.index], last = paragraphs[o.end.index];
  if (o.start.index === o.end.index) {
    if (o.start.offset === o.end.offset) return { paragraphs, caret: { id: first.id, offset: o.start.offset } };
    const { left, right } = splitParagraph(first, o.start.offset, o.end.offset);
    const next = [...paragraphs]; next[o.start.index] = concatParagraphs(left, { ...right, notes: undefined }, revision);
    return { paragraphs: next, caret: { id: first.id, offset: o.start.offset } };
  }
  const covered = paragraphs.slice(o.start.index, o.end.index + 1);
  if (covered.some((p) => p.lockedScene && p.type === 'Scene Heading') && !(o.start.offset === 0 && o.end.offset === last.text.length)) {
    // Locked production scene numbers must not silently merge into another element.
    return { blocked: 'The selection crosses a locked scene heading. Unlock the scene, or select whole elements to delete them.' };
  }
  const head = splitParagraph(first, o.start.offset).left;
  const tail = splitParagraph(last, o.end.offset).right;
  let target: Paragraph;
  if (o.start.offset === 0 && tail.text) {
    // Whole leading elements removed: the remaining text is the LAST element with its
    // start deleted, so it keeps that element's identity, type and metadata (production
    // anchors follow an ordinary edit of that paragraph).
    target = revised({ ...last, text: tail.text, runs: tail.runs }, revision);
    if (!target.runs) delete target.runs;
  } else {
    target = concatParagraphs(head, { ...tail, notes: last.notes, tags: last.tags, bookmark: last.bookmark }, revision);
  }
  const next = [...paragraphs];
  next.splice(o.start.index, o.end.index - o.start.index + 1, target);
  return { paragraphs: next, caret: { id: target.id, offset: o.start.offset } };
}

/** Insert copied elements at a caret. A single element is pasted inline (taking the
 * caret element's type). Several elements keep their own types and are inserted as
 * whole elements: before the caret element when the caret is at its start, after it
 * when the caret is at its end, or between its two halves when the caret is inside. */
export function insertParagraphs(paragraphs: Paragraph[], at: TextPoint, content: Paragraph[], revision?: RevisionTier): EditResult | null {
  const i = indexOf(paragraphs, at.id);
  if (i < 0 || !content.length) return null;
  const target = paragraphs[i], offset = Math.max(0, Math.min(target.text.length, at.offset));
  const fresh = content.map((p) => revised({ ...structuredClone(p), id: newId(), bookmark: undefined, sceneNumber: undefined, lockedScene: undefined }, revision));
  for (const p of fresh) { p.notes = p.notes?.map((note) => ({ ...note, id: 'note-' + crypto.randomUUID(), paragraphId: p.id })); if (!p.notes?.length) delete p.notes; if (p.bookmark === undefined) delete p.bookmark; }
  const next = [...paragraphs];
  if (fresh.length === 1) {
    const piece = fresh[0], { left, right } = splitParagraph(target, offset);
    const merged = concatParagraphs(concatParagraphs(left, { ...piece, id: left.id }, revision), { ...right, notes: undefined, tags: undefined }, revision);
    next[i] = { ...merged, id: target.id, type: target.text ? target.type : piece.type };
    return { paragraphs: next, caret: { id: target.id, offset: offset + piece.text.length } };
  }
  const last = fresh.at(-1)!, caret = { id: last.id, offset: last.text.length };
  if (!target.text) { next.splice(i, 1, { ...fresh[0], id: target.id, notes: target.notes || fresh[0].notes, tags: target.tags || fresh[0].tags }, ...fresh.slice(1)); return { paragraphs: next, caret: fresh.length === 1 ? { id: target.id, offset: fresh[0].text.length } : caret }; }
  if (offset === 0) { next.splice(i, 0, ...fresh); return { paragraphs: next, caret }; }
  if (offset === target.text.length) { next.splice(i + 1, 0, ...fresh); return { paragraphs: next, caret }; }
  const { left, right } = splitParagraph(target, offset);
  next.splice(i, 1, revised(left, revision), ...fresh, revised({ ...right, notes: undefined, tags: undefined }, revision));
  return { paragraphs: next, caret };
}

/** Heuristic used before parsing plain clipboard text as Fountain screenplay markup. */
export function looksLikeScreenplay(text: string) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n').map((l) => l.trim());
  if (lines.some((l) => /^(INT|EXT|EST|INT\.?\/EXT|I\/E)[.\s]/i.test(l) || /^[A-Z0-9 .'-]+TO:$/.test(l))) return true;
  for (let i = 0; i < lines.length - 1; i++) if (/^[A-Z][A-Z0-9 .'\-]{1,30}(\s*\([^)]*\))?$/.test(lines[i]) && lines[i + 1] && (i === 0 || !lines[i - 1])) return true;
  return false;
}
/** Plain text split into elements at blank lines (single line breaks stay inside an element). */
export function plainTextElements(text: string, type: Paragraph['type']): Paragraph[] {
  return text.replace(/\r\n?/g, '\n').split(/\n[ \t]*\n+/).map((chunk) => chunk.replace(/^\n+|\n+$/g, '')).filter((chunk, n, all) => chunk || (n > 0 && n < all.length - 1)).map((chunk) => ({ id: newId(), type, text: chunk }));
}
