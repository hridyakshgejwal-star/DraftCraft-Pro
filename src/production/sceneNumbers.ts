// "Auto-hide right scene numbers" (Final Draft 13.3.4): when a right scene number would overlap its scene heading, it is
// left out. The option is per document, off by default, and the editor, Print and PDF apply the same rule.
//
// DraftCraft's rule. The right number is treated as a box whose right edge is 30 pt to the right of the text area and
// whose width is the number in 12-pt Courier (7.2 pt per character); the editor, Print and PDF draw it within that
// box. The number is hidden when the first line of the heading ends less than 3 pt before the box starts. Short numbers
// ("12") never collide; long ones ("123A", "123AB") do when the heading fills its first line to the right edge.
import type { LayoutFragment } from './layout';
export const RIGHT_NUMBER_EDGE = 30, RIGHT_NUMBER_CHAR = 7.2, RIGHT_NUMBER_GAP = 3;
/** Where the first line of a heading fragment ends, in points from the text area's left edge. */
export function headingLineEnd(fr: Pick<LayoutFragment, 'x' | 'width' | 'lines' | 'style'>) {
  const line = fr.lines[0]; if (!line) return fr.x;
  const st = fr.style, start = st.align === 'right' ? fr.width - line.width : st.align === 'center' ? (fr.width - line.width) / 2 : line.first ? st.first * 72 : 0;
  return fr.x + start + line.width;
}
/** Whether the right scene number of this heading fragment collides with the heading (and so is hidden). */
export function rightNumberCollides(fr: Pick<LayoutFragment, 'x' | 'width' | 'lines' | 'style'>, number: string, textAreaWidth: number) {
  const numberLeft = textAreaWidth + RIGHT_NUMBER_EDGE - [...number].length * RIGHT_NUMBER_CHAR;
  return headingLineEnd(fr) > numberLeft - RIGHT_NUMBER_GAP;
}
/** True when the document's option is on and this right number collides. */
export function hideRightSceneNumber(enabled: boolean | undefined, fr: Pick<LayoutFragment, 'x' | 'width' | 'lines' | 'style'>, number: string, textAreaWidth: number) {
  return !!enabled && rightNumberCollides(fr, number, textAreaWidth);
}
