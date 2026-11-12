import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { EMOJI, EMOJI_GROUPS, type EmojiEntry, type EmojiGroup } from './emojiData';
import { entryFor, insertIntoField, loadRecentEmoji, rememberEmoji, searchEmoji, type InsertTarget } from './emoji';

const COLUMNS = 9;
interface Section { id: EmojiGroup | 'recent' | 'results'; label: string; items: EmojiEntry[] }

/** DraftCraft's emoji picker (Insert › Emoji…, the toolbar's Emoji button, the script's right-click menu, ⌃⌘E).
 * It inserts into the field that had focus, at its selection, then gives that field focus back. Shift-click (or
 * Shift+Return) inserts and keeps the picker open. */
export default function EmojiPicker({ target, onClose }: { target: InsertTarget; onClose: (inserted: boolean) => void }) {
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<string[]>(() => loadRecentEmoji());
  const [message, setMessage] = useState('');
  const [active, setActive] = useState(0);
  const search = useRef<HTMLInputElement>(null), grid = useRef<HTMLDivElement>(null), insertedAny = useRef(false);
  const sections: Section[] = useMemo(() => {
    if (query.trim()) return [{ id: 'results', label: 'Results', items: searchEmoji(query) }];
    const out: Section[] = [];
    const recentItems = recent.map(entryFor).filter((e): e is EmojiEntry => !!e);
    if (recentItems.length) out.push({ id: 'recent', label: 'Recently Used', items: recentItems });
    for (const g of EMOJI_GROUPS) out.push({ id: g.id, label: g.label, items: EMOJI.filter(e => e[2] === g.id) });
    return out;
  }, [query, recent]);
  const flat = useMemo(() => sections.flatMap(s => s.items), [sections]);
  useEffect(() => { setActive(0); }, [query]);
  useLayoutEffect(() => { search.current?.focus(); }, []);
  const close = (inserted: boolean) => {
    onClose(inserted);
    // Back to the field the writer was typing in (the selection is restored by insertIntoField or kept as it was).
    if (target.element?.isConnected) { target.element.focus({ preventScroll: true }); if ((target.element instanceof HTMLTextAreaElement || target.element instanceof HTMLInputElement) && target.start !== undefined) target.element.setSelectionRange(target.start, target.end ?? target.start); }
  };
  const choose = (entry: EmojiEntry, keepOpen: boolean) => {
    const ok = insertIntoField(target, entry[0]);
    if (!ok) { setMessage('Click in the script or a text field first, then choose an emoji.'); return; }
    insertedAny.current = true; setRecent(rememberEmoji(entry[0]));
    if (target.element instanceof HTMLTextAreaElement || target.element instanceof HTMLInputElement) { target.start = target.element.selectionStart ?? undefined; target.end = target.element.selectionEnd ?? undefined; }
    // Kept open: the script gives its field focus back after it commits the insertion, so return to the search box
    // after that has happened (two frames later).
    if (keepOpen) { setMessage('Inserted ' + entry[0] + ' ' + entry[1] + '.'); search.current?.focus(); requestAnimationFrame(() => requestAnimationFrame(() => search.current?.focus())); return; }
    onClose(true);
  };
  const cellFor = (i: number) => grid.current?.querySelector<HTMLButtonElement>('[data-emoji-index="' + i + '"]');
  const move = (to: number) => { const i = Math.max(0, Math.min(flat.length - 1, to)); setActive(i); const cell = cellFor(i); cell?.focus(); cell?.scrollIntoView({ block: 'nearest' }); };
  const onGridKey = (e: React.KeyboardEvent) => {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: COLUMNS, ArrowUp: -COLUMNS };
    if (e.key in keys) { e.preventDefault(); if (e.key === 'ArrowUp' && active < COLUMNS) { search.current?.focus(); return; } move(active + keys[e.key]); }
    else if (e.key === 'Home') { e.preventDefault(); move(0); } else if (e.key === 'End') { e.preventDefault(); move(flat.length - 1); }
  };
  const jump = (id: string) => { setQuery(''); requestAnimationFrame(() => { const head = grid.current?.querySelector<HTMLElement>('[data-emoji-section="' + id + '"]'); head?.scrollIntoView({ block: 'start' }); const first = head?.nextElementSibling?.querySelector<HTMLButtonElement>('button'); if (first) { setActive(Number(first.dataset.emojiIndex)); first.focus({ preventScroll: true }); } }); };
  let index = 0;
  return createPortal(
    <div className="dc-emoji-layer" onMouseDown={e => { if (e.target === e.currentTarget) close(insertedAny.current); }}>
      <div role="dialog" aria-modal="true" aria-label="Emoji" className="dc-emoji-picker"
        onKeyDown={e => {
          if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(insertedAny.current); return; }
          if (e.key === 'Tab') { // keep Tab inside the picker: search, categories, the current emoji, the footer
            const stops = [...e.currentTarget.querySelectorAll<HTMLElement>('input, .dc-emoji-tabs button, .dc-emoji-cell[tabindex="0"], .dc-emoji-foot button')];
            const at = stops.indexOf(document.activeElement as HTMLElement), next = stops[(at + (e.shiftKey ? -1 : 1) + stops.length) % stops.length];
            if (next) { e.preventDefault(); next.focus(); }
          }
        }}>
        <div className="dc-emoji-head">
          <input ref={search} type="search" aria-label="Search emoji" placeholder="Search emoji" value={query} onChange={e => { setQuery(e.target.value); setMessage(''); }}
            onKeyDown={e => { if (e.key === 'ArrowDown' && flat.length) { e.preventDefault(); move(0); } if (e.key === 'Enter' && flat[0]) { e.preventDefault(); choose(flat[active] || flat[0], e.shiftKey); } }} />
          <span role="status" aria-live="polite" className="dc-emoji-count">{query.trim() ? (flat.length ? flat.length + (flat.length === 1 ? ' emoji' : ' emoji') : 'No emoji found') : ''}</span>
        </div>
        <div role="tablist" aria-label="Emoji categories" className="dc-emoji-tabs">
          {recent.length > 0 && <button type="button" role="tab" aria-selected={false} title="Recently Used" aria-label="Recently Used" onClick={() => jump('recent')}>🕘</button>}
          {EMOJI_GROUPS.map(g => <button type="button" role="tab" aria-selected={false} key={g.id} title={g.label} aria-label={g.label} onClick={() => jump(g.id)}>{g.icon}</button>)}
        </div>
        <div ref={grid} className="dc-emoji-grid" onKeyDown={onGridKey}>
          {sections.map(s => <React.Fragment key={s.id}>
            <h3 className="dc-emoji-section" data-emoji-section={s.id}>{s.label}</h3>
            <div role="group" aria-label={s.label} className="dc-emoji-cells">
              {s.items.map(e => { const i = index++; return <button type="button" key={s.id + e[0]} data-emoji-index={i} data-emoji={e[0]} tabIndex={i === active ? 0 : -1}
                aria-label={e[1]} title={e[1]} className="dc-emoji-cell" onMouseDown={ev => ev.preventDefault()} onFocus={() => setActive(i)}
                onClick={ev => choose(e, ev.shiftKey)} onKeyDown={ev => { if ((ev.key === 'Enter' || ev.key === ' ') && !ev.repeat) { ev.preventDefault(); choose(e, ev.shiftKey); } }}>{e[0]}</button>; })}
            </div>
          </React.Fragment>)}
        </div>
        <div className="dc-emoji-foot">
          <span className="dc-emoji-message">{message || 'Click to insert · Shift-click to insert and keep this open'}</span>
          {window.draftcraftDesktop?.showEmojiPanel && <button type="button" onClick={() => { close(insertedAny.current); window.draftcraftDesktop?.showEmojiPanel?.(); }}>Character Viewer…</button>}
        </div>
      </div>
    </div>, document.body);
}
