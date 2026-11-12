// Draws what a plain textarea cannot: inline emphasis (bold, italic, underline, strikethrough) and invisibles (spaces,
// tabs, line breaks and the paragraph mark). It mirrors the textarea's own text box exactly (same font, size, wrap
// width, indent and scroll position), so the textarea keeps the caret, selection, IME, clipboard and undo. Screenplay
// fonts are monospaced, and the bold/italic faces of Courier Prime have the same advance, so emphasis never re-wraps.
import React, { useLayoutEffect, useRef } from 'react';
import type { TextRun } from '../types/script';
const KEYS = ['font-family', 'font-size', 'font-weight', 'font-style', 'font-variant', 'line-height', 'letter-spacing', 'word-spacing', 'text-align', 'text-indent', 'text-transform', 'direction', 'tab-size', 'padding-top', 'padding-bottom', 'padding-left', 'padding-right', 'box-sizing', 'word-break', 'overflow-wrap', 'white-space'];
function marked(text: string, key: string) {
  const out: React.ReactNode[] = []; let plain = '';
  const flush = () => { if (plain) { out.push(plain); plain = ''; } };
  [...text].forEach((c, i) => {
    if (c === ' ') { flush(); out.push(<span key={key + i} className="dc-mark">·</span>); }
    else if (c === '\t') { flush(); out.push(<span key={key + i} className="dc-mark">→</span>); }
    else if (c === '\n') { flush(); out.push(<span key={key + i} className="dc-mark">↵</span>, '\n'); }
    else plain += c;
  });
  flush(); return out;
}
export const TextMirror = React.memo(function TextMirror({ text, runs, styled, marks, last }: { text: string; runs?: TextRun[]; styled: boolean; marks: boolean; last: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const layer = ref.current, input = layer?.previousElementSibling;
    if (!layer || !(input instanceof HTMLTextAreaElement)) return;
    const place = () => {
      const css = getComputedStyle(input);
      for (const key of KEYS) layer.style.setProperty(key, css.getPropertyValue(key));
      layer.style.whiteSpace = 'pre-wrap'; layer.style.color = styled ? css.color : 'transparent';
      layer.style.width = input.offsetWidth + 'px'; layer.style.height = input.offsetHeight + 'px';
      layer.style.left = input.offsetLeft + 'px'; layer.style.top = input.offsetTop + 'px';
      layer.scrollTop = input.scrollTop;
    };
    const scroll = () => { layer.scrollTop = input.scrollTop; };
    place(); const observer = new ResizeObserver(place); observer.observe(input);
    input.addEventListener('scroll', scroll);
    // FragmentTextarea moves scrollTop after its own layout effect; follow it on the next frame as well.
    const frame = requestAnimationFrame(place);
    return () => { observer.disconnect(); input.removeEventListener('scroll', scroll); cancelAnimationFrame(frame); };
  }, [text, runs, styled, marks]);
  const parts: React.ReactNode[] = [];
  if (styled && runs) runs.forEach((run, i) => {
    const s = run.style || {};
    const decoration = [s.underline ? 'underline' : '', s.strikethrough ? 'line-through' : ''].filter(Boolean).join(' ');
    parts.push(<span key={'r' + i} style={{ fontWeight: s.bold ? 700 : undefined, fontStyle: s.italic ? 'italic' : undefined, textDecorationLine: decoration || undefined }}>{marks ? marked(run.text, 'r' + i + '-') : run.text}</span>);
  });
  else parts.push(...(marks ? marked(text, 't') : [text]));
  if (marks && last) parts.push(<span key="pilcrow" className="dc-mark">¶</span>);
  return <div ref={ref} aria-hidden="true" className={'dc-text-mirror no-print' + (styled ? ' dc-text-mirror-styled' : '')}>{parts}{'​'}</div>;
});
