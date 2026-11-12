import type {InlineStyle, Paragraph, TextRun} from '../types/script';

export function sliceRuns(p: Paragraph, start: number, end: number): TextRun[] {
  if (!p.runs?.length || p.runs.map(run => run.text).join('') !== p.text) return [{text: p.text.slice(start, end)}];
  let at = 0;
  return p.runs.flatMap(run => {
    const a = Math.max(start, at), b = Math.min(end, at + run.text.length); at += run.text.length;
    return b > a ? [{...run, text: p.text.slice(a, b)}] : [];
  });
}

export function compactRuns(runs: TextRun[]): TextRun[] {
  const result: TextRun[] = [];
  for (const run of runs) {
    if (!run.text) continue;
    const last = result.at(-1);
    if (last && JSON.stringify(last.style || {}) === JSON.stringify(run.style || {}) && last.revisionId === run.revisionId) last.text += run.text;
    else result.push({...run, style: run.style ? {...run.style} : undefined});
  }
  return result;
}

/** Typing changes a range; it does not erase emphasis elsewhere in a paragraph.
 * Explicit formatting changes with unchanged text still use the caller's runs. */
export function retainEditedRuns(before: Paragraph, after: Paragraph): Paragraph {
  if (before.text === after.text || !before.runs?.length || before.activeAltIndex !== after.activeAltIndex || after.runs?.map(r => r.text).join('') === after.text) return after;
  if (before.runs.map(r => r.text).join('') !== before.text) return after;
  let start = 0, oldEnd = before.text.length, newEnd = after.text.length;
  while (start < oldEnd && start < newEnd && before.text[start] === after.text[start]) start++;
  while (oldEnd > start && newEnd > start && before.text[oldEnd - 1] === after.text[newEnd - 1]) { oldEnd--; newEnd--; }
  const inherited = sliceRuns(before, Math.max(0, start - 1), Math.max(1, start))[0];
  const style: InlineStyle | undefined = inherited?.style;
  const runs = compactRuns([...sliceRuns(before, 0, start), {text: after.text.slice(start, newEnd), ...(style ? {style} : {})}, ...sliceRuns(before, oldEnd, before.text.length)]);
  return {...after, runs};
}

export type StyleKey = 'bold' | 'italic' | 'underline' | 'strikethrough';
/** Whether every character of [start,end) carries the style (an empty range reads the character before it). */
export function hasStyle(p: Paragraph, start: number, end: number, key: StyleKey): boolean {
  const a = start === end ? Math.max(0, start - 1) : start, b = start === end ? Math.max(1, start) : end;
  if (!p.text || a >= p.text.length) return false;
  const runs = sliceRuns(p, a, Math.min(b, p.text.length));
  return runs.length > 0 && runs.every(run => !!run.style?.[key]);
}
/** Turns a style on for [start,end) unless all of it already has the style, in which case it is turned off. Text is
 * unchanged; runs are split at the range and compacted, and an all-plain paragraph drops its runs. */
export function toggleStyle(p: Paragraph, start: number, end: number, key: StyleKey): Paragraph {
  if (start >= end) return p;
  const on = !hasStyle(p, start, end, key);
  const middle = sliceRuns(p, start, end).map(run => { const style: InlineStyle = { ...(run.style || {}) }; if (on) style[key] = true; else delete style[key]; return { ...run, style: Object.keys(style).length ? style : undefined }; });
  const runs = compactRuns([...sliceRuns(p, 0, start), ...middle, ...sliceRuns(p, end, p.text.length)]).map(run => run.style || run.revisionId ? run : { text: run.text });
  const plain = runs.every(run => !run.style && !run.revisionId);
  const next: Paragraph = { ...p, runs: plain ? undefined : runs };
  if (plain) delete next.runs;
  return next;
}
/** True when the paragraph has visible inline emphasis the editor must draw. */
export function styledRuns(p: Paragraph): boolean { return !!p.runs?.some(run => run.style && (run.style.bold || run.style.italic || run.style.underline || run.style.strikethrough)) && p.runs.map(r => r.text).join('') === p.text; }
