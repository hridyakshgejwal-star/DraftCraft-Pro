import type {Paragraph, ScriptDocument} from '../types/script';
import type {RevisionMark} from './model';
import type {LayoutFragment, MeasuredLine} from './layout';

/** A deletion is a point in the surviving text, including an empty paragraph.
 * At a page boundary it belongs to the following fragment, except at EOF. */
export function revisionIntersects(mark: RevisionMark, start: number, end: number, textLength: number): boolean {
  return mark.start === mark.end
    ? mark.start >= start && (mark.start < end || end === textLength && mark.start === end)
    : mark.start < end && mark.end > start;
}

export function matchingRevisions(p: Paragraph, start: number, end: number, setId?: string): RevisionMark[] {
  return (p.revisionMarks || []).filter(mark => (!setId || mark.setId === setId) && revisionIntersects(mark, start, end, p.text.length));
}

export function revisedFragment(doc: ScriptDocument, fragment: LayoutFragment, setId?: string): boolean {
  const p = doc.paragraphs.find(p => p.id === fragment.paragraphId);
  return !!p && ((!setId && !!p.revised) || matchingRevisions(p, fragment.start, fragment.end, setId).length > 0);
}

export function revisedLine(p: Paragraph, line: MeasuredLine, setId?: string): boolean {
  return matchingRevisions(p, line.start, line.end, setId).length > 0 || !setId && !!p.revised && !p.revisionMarks?.length;
}

/** Selected revision pages are derived from the same fragments as the editor. */
export function revisionPageLabels(doc: ScriptDocument, pages: {pageLabel: string; fragments: LayoutFragment[];revisionSetIds?:string[]}[], setId?: string): string[] {
  return pages.filter(page => page.revisionSetIds?.some(id=>!setId||id===setId) || page.fragments.some(fragment => revisedFragment(doc, fragment, setId))).map(page => page.pageLabel);
}
