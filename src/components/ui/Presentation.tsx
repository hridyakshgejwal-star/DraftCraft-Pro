import React, {
  forwardRef, useCallback, useEffect, useId, useLayoutEffect, useRef, useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  AnimatePresence, MotionConfig, motion, useIsPresent, useReducedMotion,
  type HTMLMotionProps,
} from 'motion/react';

// Presentation only: these components never read or write screenplay state.
const ease = [0.22, 1, 0.36, 1] as const;
const modalStack: HTMLElement[] = [];
const modalReturnTargets = new WeakMap<HTMLElement, HTMLElement[]>();
const focusable = 'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

function focusOrigin() {
  if (typeof document === 'undefined') return null;
  const active = document.activeElement as HTMLElement | null;
  const menu = active?.closest('.dc-menu');
  // A menu command disappears as soon as it opens a dialog. Its persistent
  // menu button remains the correct return target.
  return menu?.parentElement?.querySelector<HTMLElement>('button') || active;
}

function returnTargets() {
  const origin = focusOrigin();
  if (!origin) return [];
  const parent = origin.closest<HTMLElement>('.dc-overlay');
  return [origin, ...(parent ? modalReturnTargets.get(parent) || [] : [])];
}

export function UIProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

export function UIPresence({ children }: { children: React.ReactNode }) {
  return <AnimatePresence initial={false}>{children}</AnimatePresence>;
}

// Keep only an exiting presentation alive; the original component's form state
// stays in its existing instance. Closing callbacks still execute immediately.
export function useOverlayVisibility(open: boolean) {
  const reduced = useReducedMotion();
  const [retained, setRetained] = useState(open);
  useEffect(() => {
    if (open) { setRetained(true); return; }
    const timer = window.setTimeout(() => setRetained(false), reduced ? 0 : 170);
    return () => window.clearTimeout(timer);
  }, [open, reduced]);
  return open || retained;
}

function useModalFocus(ref: React.RefObject<HTMLDivElement | null>, present: boolean) {
  const targetsToRestore = useRef(returnTargets());
  const origin = useRef(targetsToRestore.current[0] || null);
  const selection = useRef(origin.current instanceof HTMLTextAreaElement || origin.current instanceof HTMLInputElement
    ? { start: origin.current.selectionStart, end: origin.current.selectionEnd } : null);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || !present) return;
    modalStack.push(root);
    modalReturnTargets.set(root, targetsToRestore.current);
    root.style.zIndex = String(100 + (modalStack.length - 1) * 10);
    const targets = () => Array.from(root.querySelectorAll<HTMLElement>(focusable))
      .filter(element => element.tabIndex >= 0 && element.getClientRects().length > 0 && !element.closest('[inert]'));
    const focusFirst = () => (targets()[0] || root).focus({ preventScroll: true });
    if (!root.contains(document.activeElement)) focusFirst();

    const trapTab = (event: KeyboardEvent) => {
      if (modalStack.at(-1) !== root || event.key !== 'Tab') return;
      const items = targets();
      if (!items.length) { event.preventDefault(); root.focus(); return; }
      const active = document.activeElement;
      if (event.shiftKey && (active === items[0] || !root.contains(active))) {
        event.preventDefault(); items.at(-1)!.focus();
      } else if (!event.shiftKey && (active === items.at(-1) || !root.contains(active))) {
        event.preventDefault(); items[0].focus();
      }
    };
    const trapFocus = (event: FocusEvent) => {
      if (modalStack.at(-1) !== root || root.contains(event.target as Node)) return;
      // A nested portal may autofocus before its layout effect registers it.
      if ((event.target as HTMLElement).closest?.('.dc-overlay')) return;
      focusFirst();
    };
    document.addEventListener('keydown', trapTab, true);
    document.addEventListener('focusin', trapFocus);
    return () => {
      document.removeEventListener('keydown', trapTab, true);
      document.removeEventListener('focusin', trapFocus);
      const wasTop = modalStack.at(-1) === root;
      const index = modalStack.indexOf(root);
      if (index >= 0) modalStack.splice(index, 1);
      const target = targetsToRestore.current.find(element => element.isConnected && !element.closest('[inert], [aria-hidden="true"]'));
      modalReturnTargets.delete(root);
      if (wasTop && target?.isConnected && (root.contains(document.activeElement) || document.activeElement === document.body)) {
        target.focus({ preventScroll: true });
        const range = selection.current;
        if (target === origin.current && range && range.start !== null && range.end !== null &&
          (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) &&
          target.selectionStart !== null) target.setSelectionRange(range.start, range.end);
      }
    };
  }, [present, ref]);
}

function DialogLayer({ children, className = '', label, onClose }: {
  children: React.ReactNode; className?: string; label?: string; onClose?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const present = useIsPresent();
  const reduced = useReducedMotion();
  const titleId = useId();
  useModalFocus(ref, present);
  useLayoutEffect(() => {
    const root = ref.current;
    const heading = root?.querySelector<HTMLElement>('h1, h2, h3, h4');
    if (root && heading && !label) {
      if (!heading.id) heading.id = 'dc-dialog-' + titleId;
      root.setAttribute('aria-labelledby', heading.id);
    }
  }, [label, titleId]);

  return createPortal(
    <motion.div
      ref={ref} role="dialog" aria-modal="true" aria-label={label}
      aria-hidden={!present || undefined} inert={!present || undefined} tabIndex={-1}
      className={'dc-overlay ' + className}
      // Escape closes the dialog it was pressed in (only that one, and only if nothing inside handled it first).
      onKeyDown={onClose ? (e: React.KeyboardEvent) => { if (e.key === 'Escape' && !e.defaultPrevented && !e.nativeEvent.isComposing) { e.stopPropagation(); onClose(); } } : undefined}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: reduced ? 0 : (present ? 0.2 : 0.14), ease }}
      style={{ pointerEvents: present ? undefined : 'none' }}
    >
      <motion.div
        className="dc-dialog-position"
        initial={{ y: reduced ? 0 : 8, scale: reduced ? 1 : 0.985 }}
        animate={{ y: 0, scale: 1 }} exit={{ y: reduced ? 0 : 4, scale: reduced ? 1 : 0.99 }}
        transition={{ duration: reduced ? 0 : (present ? 0.22 : 0.14), ease }}
      >
        {React.Children.map(children, child => React.isValidElement<{ className?: string }>(child)
          ? React.cloneElement(child, { className: 'dc-dialog-surface ' + (child.props.className || '') }) : child)}
      </motion.div>
    </motion.div>, document.body,
  );
}

export function DialogOverlay({ open, children, className, label, onClose }: {
  open: boolean; children: React.ReactNode; className?: string; label?: string; onClose?: () => void;
}) {
  return (
    <AnimatePresence propagate>
      {open && <DialogLayer key="dialog" className={className} label={label} onClose={onClose}>{children}</DialogLayer>}
    </AnimatePresence>
  );
}

export function MenuSurface({ children, className = '', ...props }: HTMLMotionProps<'div'>) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const present = useIsPresent();
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const place = () => {
      element.style.marginLeft = '0px';
      const rect = element.getBoundingClientRect();
      const shift = Math.min(0, window.innerWidth - rect.right - 8);
      element.style.marginLeft = Math.max(8 - rect.left, shift) + 'px';
      element.style.maxHeight = Math.max(80, window.innerHeight - rect.top - 8) + 'px';
    };
    place(); window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, []);
  return <motion.div {...props} ref={ref} className={'dc-menu ' + className}
    inert={!present || undefined} aria-hidden={!present || undefined}
    initial={{ opacity: 0, y: reduced ? 0 : -4 }} animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: reduced ? 0 : -2 }}
    transition={{ duration: reduced ? 0 : 0.15, ease }}
    style={{ ...props.style, pointerEvents: present ? undefined : 'none' }}>{children}</motion.div>;
}

export function BarSurface({ children, className = '', ...props }: HTMLMotionProps<'div'>) {
  const reduced = useReducedMotion();
  const present = useIsPresent();
  return <motion.div {...props} className={className}
    inert={!present || undefined} aria-hidden={!present || undefined}
    initial={{ opacity: 0, y: reduced ? 0 : -4 }} animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: reduced ? 0 : -2 }}
    transition={{ duration: reduced ? 0 : 0.15, ease }}
    style={{ ...props.style, pointerEvents: present ? undefined : 'none' }}>{children}</motion.div>;
}

export const FloatingSurface = forwardRef<HTMLDivElement, HTMLMotionProps<'div'>>(
  function FloatingSurface({ children, className = '', style, ...props }, forwardedRef) {
    const localRef = useRef<HTMLDivElement | null>(null);
    const reduced = useReducedMotion();
    const present = useIsPresent();
    const origin = useRef(focusOrigin());
    const range = useRef(origin.current instanceof HTMLTextAreaElement || origin.current instanceof HTMLInputElement
      ? { start: origin.current.selectionStart, end: origin.current.selectionEnd } : null);
    const [bounds, setBounds] = useState<{ left?: number; top?: number }>({});
    const mergeRef = useCallback((node: HTMLDivElement | null) => {
      localRef.current = node;
      if (typeof forwardedRef === 'function') forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    }, [forwardedRef]);
    useLayoutEffect(() => {
      if (!present && localRef.current?.contains(document.activeElement) && origin.current?.isConnected) {
        origin.current.focus({ preventScroll: true });
        if (range.current?.start !== null && range.current?.end !== null && range.current &&
          (origin.current instanceof HTMLTextAreaElement || origin.current instanceof HTMLInputElement) &&
          origin.current.selectionStart !== null) origin.current.setSelectionRange(range.current.start, range.current.end);
      }
    }, [present]);
    useLayoutEffect(() => {
      const element = localRef.current;
      if (!element) return;
      const coordinate = (value: unknown, extent: number) => typeof value === 'number' ? value :
        typeof value === 'string' && value.endsWith('%') ? parseFloat(value) * extent / 100 : parseFloat(String(value)) || 0;
      const place = () => setBounds({
        left: Math.max(8, Math.min(coordinate(style?.left, window.innerWidth), window.innerWidth - element.offsetWidth - 8)),
        top: Math.max(8, Math.min(coordinate(style?.top, window.innerHeight), window.innerHeight - element.offsetHeight - 8)),
      });
      place(); window.addEventListener('resize', place);
      return () => window.removeEventListener('resize', place);
    }, [style?.left, style?.top]);
    return <motion.div {...props} ref={mergeRef} className={'dc-popover ' + className}
      inert={!present || undefined} aria-hidden={!present || undefined}
      initial={{ opacity: 0, y: reduced ? 0 : 4 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: reduced ? 0 : 2 }}
      transition={{ duration: reduced ? 0 : 0.15, ease }}
      style={{ ...style, ...bounds, pointerEvents: present ? undefined : 'none' }}>{children}</motion.div>;
  },
);

export function SidebarFrame({ open, width = 336, children }: { open: boolean; width?: number; children: React.ReactNode }) {
  const reduced = useReducedMotion();
  return <motion.div className="dc-sidebar-frame" initial={false}
    animate={{ width: open ? width : 32 }} transition={{ duration: reduced ? 0 : 0.2, ease }}>
    {children}
  </motion.div>;
}

export function SelectionIndicator({ selected }: { selected: boolean }) {
  const reduced = useReducedMotion();
  return selected ? <motion.span aria-hidden="true" className="dc-selection-indicator"
    layoutId="dc-workspace-selection" transition={{ duration: reduced ? 0 : 0.18, ease }} /> : null;
}

export function scrollMotion(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}
