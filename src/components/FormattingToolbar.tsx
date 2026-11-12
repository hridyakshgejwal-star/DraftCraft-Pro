import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Measures in viewport coordinates, so the page stack's transform and sidebar
// animation cannot move the controls over text. The fallback occupies a real
// row outside the scrolling paper, including when no paragraph is hovered.
export function FormattingToolbar({ id, workspaceRef, fallbackRef, children, onEnter, onLeave, onCaptureSelection }: {
  id: string | null; workspaceRef: React.RefObject<HTMLDivElement | null>; fallbackRef: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode; onEnter: () => void; onLeave: () => void; onCaptureSelection: (e: React.PointerEvent) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const floating=position!==null;
  useLayoutEffect(() => { setReady(true); }, []);
  useLayoutEffect(() => {
    let frame = 0;
    const measure = () => {
      const input = id ? document.getElementById(`input-${id}`) : null;
      const page = input?.closest('.script-page');
      const workspace = workspaceRef.current;
      if (!input || !page || !workspace || !ref.current) { setPosition(null); return; }
      const paper = page.getBoundingClientRect(), text = input.getBoundingClientRect(), bounds = workspace.getBoundingClientRect();
      const width = 240, height = ref.current.offsetHeight;
      const left = paper.left - width - 20;
      const room = left >= bounds.left + 8 && text.bottom > bounds.top && text.top < bounds.bottom;
      const next = room ? { left, top: Math.max(bounds.top + 8, Math.min(text.top, bounds.bottom - height - 8)) } : null;
      setPosition(prev => prev?.left === next?.left && prev?.top === next?.top ? prev : next);
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    measure();
    const observer = new ResizeObserver(schedule);
    if (workspaceRef.current) observer.observe(workspaceRef.current);
    if (ref.current) observer.observe(ref.current);
    if (id) { const input = document.getElementById(`input-${id}`); if (input) observer.observe(input); }
    window.addEventListener('scroll', schedule, true); window.addEventListener('resize', schedule);
    // Transforms animate without ResizeObserver notifications.
    const end = () => schedule(); document.addEventListener('transitionend', end);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); window.removeEventListener('scroll', schedule, true); window.removeEventListener('resize', schedule); document.removeEventListener('transitionend', end); };
    // Text edits recreate the controls' JSX without moving the toolbar. The
    // observed input/toolbar sizes, scrolling and transforms provide the
    // geometry updates; avoid synchronous document layout on every keystroke.
  }, [id, workspaceRef, ready, floating]);
  const toolbar = <div ref={ref} role="toolbar" aria-label="Paragraph formatting" data-paragraph-id={id || ''}
    className={`dc-formatting-toolbar no-print ${position ? 'dc-formatting-gutter' : 'dc-formatting-row'}`}
    style={position ? { position: 'fixed', width: 240, left: position.left, top: position.top, zIndex: 45 } : undefined}
    onPointerEnter={onEnter} onPointerLeave={onLeave} onPointerDownCapture={onCaptureSelection}>
    {children || <span className="text-xs text-neutral-400">Focus a paragraph to format it.</span>}
  </div>;
  return fallbackRef.current ? createPortal(toolbar, position ? document.body : fallbackRef.current) : null;
}
