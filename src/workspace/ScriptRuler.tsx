// Ruler above the page (View › Ruler): inches across the sheet, the page margins, and the indents and first-line
// indent of the element with the caret. It follows the editor zoom because it is drawn inside the scaled page stack.
import React from 'react';
import type { Paragraph } from '../types/script';
import { styleFor, type WritingFormat } from '../formats/model';
export function ScriptRuler({ format, paragraph }: { format: WritingFormat; paragraph?: Paragraph }) {
  const width = format.page.width, ticks: React.ReactNode[] = [];
  for (let i = 0; i <= width * 8; i++) {
    const inch = i % 8 === 0, half = i % 4 === 0;
    ticks.push(<span key={i} className={'dc-ruler-tick' + (inch ? ' dc-ruler-inch' : half ? ' dc-ruler-half' : '')} style={{ left: (i / 8) + 'in' }}>{inch && i > 0 && i < width * 8 ? i / 8 : null}</span>);
  }
  const style = paragraph ? styleFor(format, paragraph) : undefined, left = format.page.left, right = format.page.width - format.page.right;
  return <div className="dc-ruler no-print" role="img" aria-label={'Ruler: margins ' + left + ' in and ' + format.page.right + ' in' + (style && paragraph ? '; ' + paragraph.type + ' indents ' + (left + style.left).toFixed(2) + ' in to ' + (right - style.right).toFixed(2) + ' in' : '')} style={{ width: width + 'in' }}>
    <div className="dc-ruler-margin" style={{ left: 0, width: left + 'in' }} /><div className="dc-ruler-margin" style={{ left: right + 'in', width: format.page.right + 'in' }} />
    {ticks}
    {style && <>
      <span className="dc-ruler-marker dc-ruler-left" title={'Left indent ' + (left + style.left).toFixed(2) + ' in'} style={{ left: (left + style.left) + 'in' }} />
      {style.first !== 0 && <span className="dc-ruler-marker dc-ruler-first" title={'First-line indent ' + style.first.toFixed(2) + ' in'} style={{ left: (left + style.left + style.first) + 'in' }} />}
      <span className="dc-ruler-marker dc-ruler-right" title={'Right indent ' + (right - style.right).toFixed(2) + ' in'} style={{ left: (right - style.right) + 'in' }} />
    </>}
  </div>;
}
