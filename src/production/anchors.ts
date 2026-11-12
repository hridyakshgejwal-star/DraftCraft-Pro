import type {Paragraph} from '../types/script';

export interface TextRange {paragraphId: string; start: number; end: number}
interface Slice {paragraphId: string; sourceStart: number; sourceEnd: number; targetStart: number}

/** Recover exact split/join correspondences. Never search the whole script for
 * a repeated phrase: an ambiguous match must not attach a prop to another scene. */
export function structuralSlices(before: Paragraph[], after: Paragraph[]): Map<string, Slice[]> {
  const oldIds = new Set(before.map(p => p.id)), positions = new Map(after.map((p, i) => [p.id, i])), nextIds = new Set(positions.keys());
  const result = new Map<string, Slice[]>();
  for (const old of before) {
    const at = positions.get(old.id) ?? -1;
    if (at >= 0 && old.text !== after[at].text) {
      const pieces = [after[at]];
      for (let i = at + 1; i < after.length && !oldIds.has(after[i].id); i++) pieces.push(after[i]);
      if (pieces.length > 1 && pieces.map(p => p.text).join('') === old.text) {
        let offset = 0;
        result.set(old.id, pieces.map(p => {
          const slice = {paragraphId: p.id, sourceStart: offset, sourceEnd: offset + p.text.length, targetStart: 0};
          offset = slice.sourceEnd; return slice;
        }));
      }
    }
  }
  for (let i = 0; i < before.length; i++) {
    if (!nextIds.has(before[i].id)) continue;
    const target = after[positions.get(before[i].id)!];
    const pieces = [before[i]];
    for (let j = i + 1; j < before.length && !nextIds.has(before[j].id); j++) pieces.push(before[j]);
    if (pieces.length > 1 && pieces.map(p => p.text).join('') === target.text) {
      let offset = 0;
      for (const source of pieces) {
        result.set(source.id, [{paragraphId: target.id, sourceStart: 0, sourceEnd: source.text.length, targetStart: offset}]);
        offset += source.text.length;
      }
    }
  }
  return result;
}

export function projectStructuralRange(range: TextRange, slices: Map<string, Slice[]>): TextRange[] | undefined {
  const projection = slices.get(range.paragraphId);
  if (!projection) return;
  return projection.flatMap(slice => {
    const start = Math.max(range.start, slice.sourceStart), end = Math.min(range.end, slice.sourceEnd);
    const point = range.start === range.end && start === end && start >= slice.sourceStart &&
      (start < slice.sourceEnd || slice === projection.at(-1));
    return end > start || point ? [{paragraphId: slice.paragraphId, start: slice.targetStart + start - slice.sourceStart, end: slice.targetStart + end - slice.sourceStart}] : [];
  });
}
