import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DialogOverlay } from './ui/Presentation';
import { Paragraph, RevisionTier } from '../types/script';
import { PageChunk, paginateScript } from '../utils/pagination';
import { capturePage, pageContent, clonePageContent, decodePageClipboard, deletePageContent, insertPageContent, isPageCurrent, pageClipboardPayload, readClipboard, writeClipboard, PageTarget } from '../utils/pageActions';

type Command = 'copy' | 'cut' | 'before' | 'after' | 'duplicate' | 'select' | 'delete' | 'text-copy' | 'text-cut' | 'text-paste';
type Selection = { id: string; start: number; end: number; direction: 'forward' | 'backward' | 'none' };
type ActionState = { target: PageTarget; mode: 'menu' | 'dialog' | 'delete' | 'cut' | 'select'; x: number; y: number; selection: Selection | null };

/** Script-text commands added to the page menu when it opens on text (styles, notes, element). */
export interface TextMenuSection { items: { id: string; label: string; checked?: boolean; disabled?: boolean }[]; elements: { id: string; label: string; checked: boolean }[]; run: (id: string) => void }
const labels: Record<Command, string> = { copy: 'Copy Page', cut: 'Cut Page', before: 'Paste Page Before', after: 'Paste Page After', duplicate: 'Duplicate Page', select: 'Select Page Contents', delete: 'Delete Page…', 'text-copy': 'Copy Selected Text', 'text-cut': 'Cut Selected Text', 'text-paste': 'Paste Text at Caret' };

function PageMenu({ state, commands, disabled, onCommand, onClose, onStoryStructure, text, onText }: {
  state: ActionState; commands: Command[]; disabled: (c: Command) => boolean; onCommand: (c: Command) => void; onClose: () => void; onStoryStructure?:(page:number,command:string)=>void;
  text?: TextMenuSection | null; onText?: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const menu = ref.current!;
    const place=()=>{const rect = menu.getBoundingClientRect();menu.style.left = `${Math.max(8, Math.min(state.x, window.innerWidth - rect.width - 8))}px`;menu.style.top = `${Math.max(8, Math.min(state.y, window.innerHeight - rect.height - 8))}px`;};
    place();const observer=new ResizeObserver(place);observer.observe(menu);
    menu.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({ preventScroll: true });
    const outside = (e: PointerEvent) => { if (!menu.contains(e.target as Node)) onClose(); };
    // Control-click opens on pointerdown. Register after that same event has
    // finished bubbling, so it cannot immediately dismiss its own menu.
    const register = window.setTimeout(() => document.addEventListener('pointerdown', outside), 0);
    return () => { observer.disconnect();clearTimeout(register); document.removeEventListener('pointerdown', outside); };
  }, []);
  return createPortal(<div ref={ref} role="menu" aria-label={`Page ${state.target.pageLabel||state.target.pageNumber} actions`} className="dc-page-menu no-print" style={{ left: state.x, top: state.y }}
    onKeyDown={e => {
      const items = Array.from(ref.current!.querySelectorAll<HTMLElement>('button:not(:disabled),summary')).filter(el=>el.getClientRects().length && (!el.closest('details:not([open])') || el.tagName==='SUMMARY'));
      const at = items.indexOf(document.activeElement as HTMLElement);
      if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); onClose(); }
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
        e.preventDefault();
        const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : (at + (e.key === 'ArrowUp' ? -1 : 1) + items.length) % items.length;
        items[next]?.focus({preventScroll:true});
      }
    }}>
    <div className="dc-page-menu-label">Page {state.target.pageLabel||state.target.pageNumber}</div>
    {commands.map((c, i) => <React.Fragment key={c}>
      {c === 'text-copy' && <div role="separator" className="dc-page-menu-separator" />}
      <button role="menuitem" disabled={disabled(c)} onClick={() => onCommand(c)} className={c === 'delete' ? 'dc-danger' : ''}>{labels[c]}</button>
    </React.Fragment>)}
    {text && onText && <>
      <div role="separator" className="dc-page-menu-separator" />
      {text.items.map(item => <button key={item.id} role={item.checked === undefined ? 'menuitem' : 'menuitemcheckbox'} aria-checked={item.checked === undefined ? undefined : item.checked} disabled={item.disabled} onClick={() => onText(item.id)}>{item.checked ? '✓ ' : ''}{item.label}</button>)}
      <details className="dc-page-story-submenu"><summary role="menuitem" tabIndex={0}>Element ▸</summary>{text.elements.map(el => <button key={el.id} role="menuitemradio" aria-checked={el.checked} onClick={() => onText(el.id)}>{el.checked ? '✓ ' : ''}{el.label}</button>)}</details>
    </>}
    {onStoryStructure && <details className="dc-page-story-submenu"><summary role="menuitem" tabIndex={0}>Story Structure ▸</summary>{[['act','Add Act Break'],['plot','Add Plot Point'],['marker','Add Structural Marker'],['edit','Edit / Remove Marker…'],['toggle-markers','Show / Hide Page Markers'],['settings','Page Story Settings…']].map(([command,label])=><button key={command} role="menuitem" onClick={()=>{onClose();onStoryStructure(state.target.pageNumber,command)}}>{label}</button>)}</details>}
  </div>, document.body);
}

export function usePageActions({ paragraphs, commit, productionMode, activeRevision, lockedPages, layoutPages, onStoryStructure, textActions }: {
  paragraphs: Paragraph[]; commit: (paragraphs: Paragraph[]) => void; productionMode: boolean; activeRevision: RevisionTier; lockedPages: boolean;layoutPages?:PageChunk[];onStoryStructure?:(page:number,command:string)=>void;
  textActions?: (selection: Selection) => TextMenuSection | null;
}) {
  const [state, setState] = useState<ActionState | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pasteStatus, setPasteStatus] = useState<'unknown' | 'empty' | 'ready'>('unknown');
  const latest = useRef(paragraphs); latest.current = paragraphs;
  const selectionArea = useRef<HTMLTextAreaElement>(null);
  const mounted = useRef(true);
  const close = (restore = true) => {
    const selection = state?.selection;
    setState(null); setError('');
    if (restore && selection) requestAnimationFrame(() => {
      const input = document.getElementById(selection.id) as HTMLTextAreaElement | null;
      input?.focus({ preventScroll: true }); input?.setSelectionRange(selection.start, selection.end, selection.direction);
    });
    else if (restore && state) requestAnimationFrame(() => {
      document.querySelector<HTMLButtonElement>(`[data-page-number="${state.target.pageLabel||state.target.pageNumber}"] .dc-page-actions-button`)?.focus({ preventScroll: true });
    });
  };
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (!state) return;
    // Only scrolling that moves the page closes the menu; the timeline following the caret, or any other panel scrolling, does not.
    const closeMenu = (event:Event) => { const t = event.target; if ((t as HTMLElement)?.closest?.('.dc-page-menu'))return; if (event.type === 'scroll' && t instanceof Element) { const page = document.querySelector(`[data-page-number="${state.target.pageLabel||state.target.pageNumber}"]`); if (!page || !t.contains(page)) return; } if (state.mode === 'menu') close(); };
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) { e.preventDefault(); close(); } };
    window.addEventListener('scroll', closeMenu, true); window.addEventListener('resize', closeMenu);
    document.addEventListener('keydown', escape);
    if (state.mode === 'select') requestAnimationFrame(() => { selectionArea.current?.focus(); selectionArea.current?.select(); });
    return () => { window.removeEventListener('scroll', closeMenu, true); window.removeEventListener('resize', closeMenu); document.removeEventListener('keydown', escape); };
  }, [state, busy]);
  useEffect(() => {
    if (state?.mode === 'menu' && !isPageCurrent(state.target, paragraphs)) close();
  }, [paragraphs]);

  const openPage = (page: PageChunk, mode: 'menu' | 'dialog', x = 0, y = 0, clicked?: EventTarget | null) => {
    const input = clicked instanceof HTMLTextAreaElement ? clicked : document.activeElement;
    const selection: Selection | null = input instanceof HTMLTextAreaElement && input.id.startsWith('input-')
      ? { id: input.id, start: input.selectionStart, end: input.selectionEnd, direction: input.selectionDirection } : null;
    setState({ target: capturePage(page, latest.current), mode, x, y, selection }); setError(''); setPasteStatus('unknown');
    // Denied permission means unknown, not empty. The explicit Paste command
    // retries during the user's gesture and reports a useful error.
    void readClipboard().then(payload => {
      if (mounted.current) setPasteStatus(payload.text.trim() || payload.html?.includes('draftcraft-page') ? 'ready' : 'empty');
    }).catch(() => {});
  };
  const stale = !!state && !isPageCurrent(state.target, paragraphs);
  const disabled = (c: Command) => busy || stale || ((c === 'before' || c === 'after' || c === 'text-paste') && pasteStatus === 'empty') ||
    ((c === 'text-copy' || c === 'text-cut') && (!state?.selection || state.selection.start === state.selection.end));
  const assertCurrent = (target: PageTarget) => { if (!mounted.current || !isPageCurrent(target, latest.current)) throw new Error('The screenplay changed. Refresh Page Actions before continuing.'); };

  const focusAfter = (next: Paragraph[], at: number) => {
    requestAnimationFrame(() => (document.getElementById(`input-${next[Math.min(at, next.length - 1)].id}`) as HTMLTextAreaElement | null)?.focus());
  };
  const perform = async (command: Command, confirmed = false) => {
    if (!state || busy) return;
    const { target, selection } = state;
    if ((command === 'cut' || command === 'delete') && !confirmed) { setState({ ...state, mode: command }); return; }
    setBusy(true); setError('');
    try {
      assertCurrent(target);
      const source = pageContent(latest.current,target);
      if (command.startsWith('text-')) {
        if (!selection) throw new Error('Select screenplay text first.');
        const id = selection.id.slice('input-'.length);
        const p = latest.current.find(p => p.id === id);
        if (!p) throw new Error('The selected paragraph is no longer available.');
        if (command !== 'text-paste') await writeClipboard({ text: p.text.slice(selection.start, selection.end) });
        const inserted = command === 'text-paste' ? (await readClipboard()).text : '';
        assertCurrent(target);
        if (command !== 'text-copy') {
          const next = latest.current.map(item => item.id === id ? { ...item, text: p.text.slice(0, selection.start) + inserted + p.text.slice(selection.end), revised: productionMode || p.revised, revision: productionMode ? activeRevision : p.revision } : item);
          commit(next);
        }
        close(); return;
      }
      if (command === 'copy' || command === 'cut') {
        await writeClipboard(pageClipboardPayload(source));
        assertCurrent(target); // Clipboard failure or an intervening edit cannot cut content.
        if (command === 'copy') { close(); return; }
      }
      if (command === 'delete' || command === 'cut') {
        const next = deletePageContent(latest.current, target); commit(next); close(false); focusAfter(next, target.start); return;
      }
      if (command === 'select') { setState({ ...state, mode: 'select' }); return; }
      const copied = command === 'duplicate' ? source : decodePageClipboard(await readClipboard());
      assertCurrent(target);
      const content = clonePageContent(copied, productionMode, activeRevision);
      const after = command !== 'before';
      const next = insertPageContent(latest.current, target, content, after);
      commit(next); close(false); focusAfter(next, after ? target.end : target.start);
    } catch (e) {
      if (mounted.current) { setError(e instanceof Error ? e.message : 'The clipboard operation failed. The screenplay was kept intact.'); setState({ ...state, mode: state.mode === 'menu' ? 'dialog' : state.mode }); }
    } finally { if (mounted.current) setBusy(false); }
  };

  const menuCommands: Command[] = ['copy', 'cut', 'before', 'after', 'duplicate', 'select', 'delete'];
  if (state?.selection) menuCommands.push('text-copy', 'text-cut', 'text-paste');
  const confirmation = state?.mode === 'delete' || state?.mode === 'cut';
  const source = state ? pageContent(paragraphs,state.target) : [];
  const locked = lockedPages || source.some(p => p.lockedScene);
  const overlay = <>
    {state?.mode === 'menu' && <PageMenu state={state} commands={menuCommands} disabled={disabled} onCommand={c => void perform(c)} onClose={() => close()} onStoryStructure={onStoryStructure}
      text={state.selection && textActions ? textActions(state.selection) : null} onText={id => { close(); requestAnimationFrame(() => requestAnimationFrame(() => (state.selection && textActions?.(state.selection))?.run(id))); }}/>}
    <DialogOverlay open={!!state && state.mode !== 'menu'} label={state ? `Page ${state.target.pageLabel||state.target.pageNumber} actions` : undefined} className="no-print fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      {state && <div className="dc-page-dialog bg-[#21212a] border border-white/15 rounded-xl p-5 shadow-2xl text-neutral-200">
        <h2 className="text-base font-semibold mb-3">{state.mode === 'select' ? 'Contents of' : 'Actions for'} Page {state.target.pageLabel||state.target.pageNumber}</h2>
        {stale && <div role="alert" className="mb-3 text-sm text-amber-300">The screenplay changed. These actions are paused.
          <button className="dc-page-command mt-2" onClick={() => {
            const pages = layoutPages||paginateScript(paragraphs, lockedPages);
            const page = pages.find(p => p.paragraphs.some(p => state.target.ids.includes(p.id))) || pages[Math.min(state.target.pageNumber - 1, pages.length - 1)];
            setState({ ...state, target: capturePage(page, paragraphs), mode: 'dialog' }); setError('');
          }}>Refresh target from the current screenplay</button>
        </div>}
        {error && <p role="alert" className="mb-3 text-sm text-rose-300">{error}</p>}
        {confirmation ? <>
          <p className="text-sm mb-3">{state.mode === 'cut' ? 'Copy, then delete' : 'Delete'} Page {state.target.pageLabel||state.target.pageNumber} and all screenplay content currently on it?</p>
          {locked && <p className="text-xs text-amber-300 mb-3">This includes locked production material. Pages will reflow; surviving locked scene numbers are preserved. Undo restores the removed content.</p>}
          <button className="dc-page-command dc-danger" disabled={busy || stale} onClick={() => void perform(state.mode === 'cut' ? 'cut' : 'delete', true)}>{state.mode === 'cut' ? 'Copy and Cut Page' : 'Delete Page'}</button>
        </> : state.mode === 'select' ? <textarea ref={selectionArea} aria-label={`Selected contents of Page ${state.target.pageLabel||state.target.pageNumber}`} className="w-full h-64 p-3 bg-black/25 font-screenplay text-sm rounded" readOnly value={source.map(p => p.text).join('\n\n')} /> : <>
          <div className="grid grid-cols-2 gap-2">{(['copy', 'before', 'after', 'delete'] as Command[]).map(c => <button key={c} className={'dc-page-command ' + (c === 'delete' ? 'dc-danger' : '')} disabled={disabled(c)} onClick={() => void perform(c)}>{labels[c]}</button>)}</div>
          {onStoryStructure && <button className="dc-page-command mt-3" onClick={()=>{const page=state.target.pageNumber;close(false);onStoryStructure(page,'settings')}}>Story Structure…</button>}
          {productionMode && <p className="mt-3 text-xs text-neutral-400">Inserted scenes get new IDs and no locked scene number. New material uses the active revision.</p>}
        </>}
        <button className="dc-page-command mt-4" disabled={busy} onClick={() => close()}>{state.mode === 'select' ? 'Close' : 'Cancel'}</button>
      </div>}
    </DialogOverlay>
  </>;
  return { openPage, overlay };
}
