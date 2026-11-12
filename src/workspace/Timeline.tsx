// Outline Editor timeline: outline lanes (acts, sequences, beats and custom lanes) above a page ruler and the Script
// lane, all positioned by the screenplay's real pagination (StoryIndex). Outline elements are OutlineMarkers; those
// created here are linked to Beat Board beats (beatId), so a title, description or colour edited in either place is the
// same data. Planning targets ("Goal" page ranges) are page numbers; elements sent to the script are anchored to text.
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { BeatCard, OutlineLane, OutlineMarker, ScriptDocument } from '../types/script';
import { markerPosition, resolveAnchor, type StoryIndex } from '../story/model';
import type { TimelinePreferences } from './preferences';
import { ICONS } from './icons';
import { ToolbarMenu, type ToolbarState } from './Toolbar';
import { childMap, descendants, parentAt, rippleShifts, type Placed } from './outlineNesting';

export const DEFAULT_LANES: OutlineLane[] = [
  { id: 'lane-outline-1', name: 'Outline 1 (Acts)', type: 'act', color: '#8fc5b8' },
  { id: 'lane-outline-2', name: 'Outline 2 (Sequences)', type: 'sequence', color: '#a99be6' },
  { id: 'lane-outline-3', name: 'Outline 3 (Beats)', type: 'custom', color: '#e9b872' },
];
export const TIMELINE_PALETTE = ['#8fc5b8', '#a99be6', '#9fb8e8', '#a9cf7f', '#e9b872', '#e98f8f', '#d9a3d0', '#f2d16b', '#7fb3d5', '#c9c9c9'];
type Planning = Partial<Pick<ScriptDocument, 'outlineLanes' | 'outlineMarkers' | 'beats' | 'targetScriptPages'>>;
export interface TimelineApi {
  onChange: (patch: Planning) => void; onNavigate: (paragraphId: string) => void; onNavigatePage: (page: number) => void;
  onSendToScript: (marker: OutlineMarker) => void; onSelection: (id: string | null) => void; onPrefs: (prefs: TimelinePreferences) => void;
  /** Moves written scene text: only after the writer confirms, and as one undoable change. */ onMoveScene: (sceneId: string, beforeId: string | null) => void;
}
export interface Span { marker: OutlineMarker; start: number; end: number; title: string; description: string; color: string; beat?: BeatCard; point: boolean }
const HEADER = 156, LANE = 30, RULER = 22, SCRIPT = 34;
const Icon = ({ name, size = 14 }: { name: string; size?: number }) => { const C = ICONS[name] || ICONS.Square; return <C size={size} strokeWidth={1.7} aria-hidden={true} />; };
// A goal placed by page may lie beyond the pages written so far (planning a 110-page script on page 12), so page
// positions are not clamped to the script length; positions tied to script text follow that text.
const plannedStart = (m: OutlineMarker, index: StoryIndex) => m.anchor?.paragraphId && index.positions.has(m.anchor.paragraphId) ? markerPosition(m, index) : Math.max(0, (m.anchor?.page ?? m.startPage) - 1 + (m.anchor?.offset || 0));
export function spanOf(m: OutlineMarker, index: StoryIndex, beats: BeatCard[]): Span {
  const start = plannedStart(m, index), endRaw = m.endAnchor?.paragraphId && index.positions.has(m.endAnchor.paragraphId) ? resolveAnchor(m.endAnchor, index) : Math.max(0, m.endPage - 1);
  const beat = m.beatId ? beats.find(b => b.id === m.beatId) : undefined;
  return { marker: m, start, end: Math.max(start, endRaw), title: beat?.title ?? m.title, description: beat?.description ?? m.description, color: m.color || beat?.color || '#9fb8e8', beat, point: !!m.kind && m.kind !== 'section' };
}
export const pageLabel = (position: number) => { const page = Math.floor(position) + 1, eighths = Math.round((position - Math.floor(position)) * 8); const frac = ['', '⅛', '¼', '⅜', '½', '⅝', '¾', '⅞'][eighths % 8]; return eighths === 8 ? String(page + 1) : page + (frac ? ' ' + frac : ''); };
const snapTo = (value: number, snap: TimelinePreferences['snap'], free: boolean) => free || snap === 'off' ? value : snap === 'page' ? Math.round(value) : Math.round(value * 8) / 8;
let clipboard: { markers: { marker: OutlineMarker; beat?: BeatCard }[] } | null = null;
const uid = (kind: string) => kind + '-' + crypto.randomUUID();

interface TimelineProps { document: ScriptDocument; index: StoryIndex; prefs: TimelinePreferences; caretParagraphId?: string | null; api: React.MutableRefObject<TimelineApi> }
export const Timeline = React.memo(TimelineView, (a, b) => a.document.id === b.document.id && a.document.outlineLanes === b.document.outlineLanes && a.document.outlineMarkers === b.document.outlineMarkers
  && a.document.beats === b.document.beats && a.document.targetScriptPages === b.document.targetScriptPages && a.index.geometry === b.index.geometry && a.prefs === b.prefs && a.caretParagraphId === b.caretParagraphId);

function TimelineView({ document: doc, index, prefs, caretParagraphId, api }: TimelineProps) {
  const scroller = useRef<HTMLDivElement>(null), root = useRef<HTMLElement>(null);
  const virtualLanes = doc.outlineLanes.length === 0, lanes = virtualLanes ? DEFAULT_LANES : doc.outlineLanes;
  const [selected, setSelected] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ id: string; mode: 'move' | 'start' | 'end'; start: number; end: number; laneId: string; moved: boolean; from: number; carry: boolean } | null>(null);
  const [renaming, setRenaming] = useState<{ kind: 'marker' | 'lane'; id: string } | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; kind: 'marker' | 'lane' | 'track' | 'beats' | 'settings' | 'color' | 'lane-color' | 'move-lane'; id?: string; laneId?: string; at?: number } | null>(null);
  const [view, setView] = useState({ left: 0, width: 800 });
  const [confirmLane, setConfirmLane] = useState<string | null>(null);
  // Reordering written scenes from the Script lane: drag shows where it would go; nothing moves until confirmed.
  const [sceneDrag, setSceneDrag] = useState<{ id: string; x: number; before: string | null } | null>(null);
  const [pendingMove, setPendingMove] = useState<{ id: string; before: string | null } | null>(null);
  const history = useRef<{ undo: Planning[]; redo: Planning[] }>({ undo: [], redo: [] });
  const pw = prefs.pageWidth;
  const spans = useMemo(() => doc.outlineMarkers.filter(m => m.visible !== false).map(m => spanOf(m, index, doc.beats)), [doc.outlineMarkers, doc.beats, index.geometry]);
  const length = Math.max(index.total, doc.targetScriptPages || 0, ...spans.map(s => s.end), 1);
  // Nesting (1.17): valid parent → children relations, from the elements' current positions.
  const items: Placed[] = useMemo(() => spans.map(s => ({ id: s.marker.id, laneId: s.marker.laneId, start: s.start, end: s.end, parentId: s.marker.parentId, point: s.point })), [spans]);
  const children = useMemo(() => childMap(items, lanes), [items, lanes]);
  const parentIds = useMemo(() => new Map([...children].flatMap(([p, kids]) => kids.map(k => [k, p] as [string, string]))), [children]);
  const dragged = useMemo(() => drag && drag.mode === 'move' ? new Set(descendants(drag.id, children)) : new Set<string>(), [drag?.id, drag?.mode, children]);
  const caret = caretParagraphId ? index.positions.get(caretParagraphId) : undefined;
  const width = length * pw + 48;
  const selectedSpan = spans.find(s => s.marker.id === selected);
  useEffect(() => { api.current.onSelection(selectedSpan ? selected : null); }, [selected, !!selectedSpan]);
  // Restore the last horizontal position once, then remember it.
  useLayoutEffect(() => { const el = scroller.current; if (el) { el.scrollLeft = prefs.scrollPage * pw; setView({ left: el.scrollLeft, width: el.clientWidth }); } }, []);
  useEffect(() => { const el = scroller.current; if (!el) return; let frame = 0, timer: ReturnType<typeof setTimeout>; const update = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => setView(v => v.left === el.scrollLeft && v.width === el.clientWidth ? v : { left: el.scrollLeft, width: el.clientWidth })); clearTimeout(timer); timer = setTimeout(() => { const page = +(el.scrollLeft / pw).toFixed(2); if (Math.abs(page - prefsRef.current.scrollPage) > .01) api.current.onPrefs({ ...prefsRef.current, scrollPage: page }); }, 400); };
    el.addEventListener('scroll', update, { passive: true }); const observer = new ResizeObserver(update); observer.observe(el); return () => { el.removeEventListener('scroll', update); observer.disconnect(); cancelAnimationFrame(frame); clearTimeout(timer); }; }, [pw]);
  const prefsRef = useRef(prefs); prefsRef.current = prefs;
  // Keep the caret indicator in view when the writer moves to another part of the script.
  useEffect(() => { const el = scroller.current; if (!el || caret === undefined || !prefs.followCaret) return; const x = caret * pw + HEADER, visibleLeft = el.scrollLeft + HEADER, visibleRight = el.scrollLeft + el.clientWidth; if (x < visibleLeft + 10 || x > visibleRight - 30) el.scrollLeft = Math.max(0, x - HEADER - (el.clientWidth - HEADER) * .3); }, [caret === undefined ? -1 : Math.floor(caret * 4), pw]);
  // Zoom keeps the page under the pointer (or the view centre) in place.
  const zoomTo = (next: number, anchorClientX?: number) => {
    const el = scroller.current, value = Math.max(4, Math.min(640, next)); if (!el || value === pw) return;
    const r = el.getBoundingClientRect(), offset = (anchorClientX ?? r.left + HEADER + (el.clientWidth - HEADER) / 2) - r.left - HEADER, page = (el.scrollLeft + offset) / pw;
    api.current.onPrefs({ ...prefs, pageWidth: value }); requestAnimationFrame(() => { el.scrollLeft = Math.max(0, page * value - offset); });
  };
  const fit = (from: number, to: number) => { const el = scroller.current; if (!el) return; const usable = el.clientWidth - HEADER - 24, value = Math.max(4, Math.min(640, usable / Math.max(.125, to - from))); api.current.onPrefs({ ...prefs, pageWidth: value }); requestAnimationFrame(() => { el.scrollLeft = Math.max(0, from * value - 8); }); };
  useEffect(() => { const el = scroller.current; if (!el) return; const wheel = (e: WheelEvent) => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); zoomTo(pw * Math.exp(-e.deltaY / 240), e.clientX); } else if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && el.scrollHeight <= el.clientHeight + 1) { e.preventDefault(); el.scrollLeft += e.deltaY; } }; el.addEventListener('wheel', wheel, { passive: false }); return () => el.removeEventListener('wheel', wheel); });

  // ── Edits (one history entry per commit; ⌘Z inside the timeline undoes them) ──
  const commit = (patch: Planning) => {
    history.current.undo.push({ outlineLanes: doc.outlineLanes, outlineMarkers: doc.outlineMarkers, beats: doc.beats, targetScriptPages: doc.targetScriptPages }); if (history.current.undo.length > 100) history.current.undo.shift(); history.current.redo = [];
    api.current.onChange(virtualLanes && patch.outlineMarkers && !patch.outlineLanes ? { ...patch, outlineLanes: DEFAULT_LANES } : patch);
  };
  const step = (from: 'undo' | 'redo') => { const entry = history.current[from].pop(); if (!entry) return false; history.current[from === 'undo' ? 'redo' : 'undo'].push({ outlineLanes: doc.outlineLanes, outlineMarkers: doc.outlineMarkers, beats: doc.beats, targetScriptPages: doc.targetScriptPages }); api.current.onChange(entry); return true; };
  const placed = (m: OutlineMarker, start: number, end: number, laneId = m.laneId): OutlineMarker => ({ ...m, laneId, startPage: +(start + 1).toFixed(4), endPage: +(end + 1).toFixed(4), anchor: { page: +(start + 1).toFixed(4) }, endAnchor: undefined });
  // Moves an element; its children (and theirs) move by the same amount unless `carry` is false (Option/Alt held), in
  // which case children no longer under it are released. The moved element joins the element above it, if any.
  const moveElement = (id: string, to: { start: number; end: number; laneId?: string }, carry = true) => {
    const span = spans.find(s => s.marker.id === id); if (!span) return;
    const delta = to.start - span.start, laneId = to.laneId ?? span.marker.laneId, below = descendants(id, children), carried = new Set(carry ? below : []);
    const parent = parentAt(items, lanes, laneId, to.start, new Set([id, ...below]));
    const outside = (cid: string) => { const c = spans.find(x => x.marker.id === cid); return !c || c.start < to.start - 1e-6 || c.start >= to.end - 1e-6; };
    const markers = doc.outlineMarkers.map(m => {
      if (m.id === id) return { ...placed(m, to.start, to.end, laneId), parentId: parent };
      if (carried.has(m.id)) { const c = spans.find(x => x.marker.id === m.id)!; return placed(m, c.start + delta, c.end + delta); }
      if (!carry && children.get(id)?.includes(m.id) && outside(m.id)) return { ...m, parentId: undefined };
      return m;
    });
    commit({ outlineMarkers: markers });
  };
  const updateMarker = (id: string, change: { start?: number; end?: number; laneId?: string; title?: string; description?: string; color?: string }) => {
    const span = spans.find(s => s.marker.id === id); if (!span) return;
    if (change.laneId && change.laneId !== span.marker.laneId && change.start === undefined && change.end === undefined && !change.title && !change.description && !change.color) { moveElement(id, { start: span.start, end: span.end, laneId: change.laneId }); return; }
    let marker = span.marker;
    if (change.start !== undefined || change.end !== undefined || change.laneId) marker = placed(marker, change.start ?? span.start, change.end ?? span.end, change.laneId ?? marker.laneId);
    const text: Partial<OutlineMarker> = {}; for (const k of ['title', 'description', 'color'] as const) if (change[k] !== undefined) text[k] = change[k];
    marker = { ...marker, ...text };
    const beats = span.beat && Object.keys(text).length ? doc.beats.map(b => b.id === span.beat!.id ? { ...b, ...text } : b) : undefined;
    commit({ outlineMarkers: doc.outlineMarkers.map(m => m.id === id ? marker : m), ...(beats ? { beats } : {}) });
  };
  const actAt = (position: number) => { const acts = spans.filter(s => lanes.find(l => l.id === s.marker.laneId)?.type === 'act' && !s.point).sort((a, b) => a.start - b.start); const i = acts.findIndex(s => position >= s.start && position < s.end); return Math.max(1, Math.min(4, i >= 0 ? i + 1 : acts.filter(s => s.end <= position).length + 1)); };
  const create = (laneId: string, start: number, end: number, title = 'New Beat', fromBeat?: BeatCard) => {
    const lane = lanes.find(l => l.id === laneId) || lanes[0], color = fromBeat?.color || (lane.type === 'act' ? lane.color : TIMELINE_PALETTE[(doc.outlineMarkers.length + 2) % TIMELINE_PALETTE.length]);
    const n = doc.beats.length, beat: BeatCard = fromBeat || { id: uid('beat'), title, description: '', act: actAt(start), color, tags: [], posX: 80 + (n % 4) * 280, posY: 80 + Math.floor(n / 4) * 200, stripOrder: n };
    const marker = { ...placed({ id: uid('marker'), laneId: lane.id, title: beat.title, description: beat.description, startPage: 1, endPage: 1, color, beatId: beat.id, kind: 'section', visible: true }, start, end), parentId: parentAt(items, lanes, lane.id, start) };
    // Ripple insert: the following elements in this lane (and their children) move right to make room.
    const shifts = prefs.ripple ? rippleShifts(items, lanes, lane.id, start, end) : new Map<string, number>();
    const shifted = doc.outlineMarkers.map(m => { const by = shifts.get(m.id), c = by ? spans.find(x => x.marker.id === m.id) : undefined; return c && by ? placed(m, c.start + by, c.end + by) : m; });
    commit({ outlineMarkers: [...shifted, marker], ...(fromBeat ? {} : { beats: [...doc.beats, beat] }) }); setSelected(marker.id); return marker;
  };
  // Focus stays in the timeline after a removal, so ⌘Z there restores it.
  const remove = (id: string) => { commit({ outlineMarkers: doc.outlineMarkers.filter(m => m.id !== id).map(m => m.parentId === id ? { ...m, parentId: undefined } : m) }); if (selected === id) setSelected(null); root.current?.focus({ preventScroll: true }); };
  const duplicate = (id: string) => { const s = spans.find(x => x.marker.id === id); if (!s) return; const len = Math.max(.125, s.end - s.start), beat = s.beat ? { ...s.beat, id: uid('beat'), posX: s.beat.posX + 40, posY: s.beat.posY + 40, sceneId: undefined } : undefined; const marker = { ...placed({ ...s.marker, id: uid('marker'), beatId: beat?.id, title: s.title + ' (copy)' }, s.end, s.end + len), parentId: parentAt(items, lanes, s.marker.laneId, s.end) }; if (beat) beat.title = marker.title; commit({ outlineMarkers: [...doc.outlineMarkers, marker], ...(beat ? { beats: [...doc.beats, beat] } : {}) }); setSelected(marker.id); };
  const copy = (id: string) => { const s = spans.find(x => x.marker.id === id); if (s) clipboard = { markers: [{ marker: { ...s.marker, startPage: s.start + 1, endPage: s.end + 1 }, beat: s.beat }] }; };
  const paste = (laneId?: string, at?: number) => {
    if (!clipboard?.markers.length) return; const first = clipboard.markers[0].marker, base = at ?? (selectedSpan ? selectedSpan.end : caret ?? 0), shift = base - (first.startPage - 1);
    const beats: BeatCard[] = [], markers = clipboard.markers.map(({ marker, beat }) => { const copyBeat = beat ? { ...beat, id: uid('beat'), sceneId: undefined, posX: beat.posX + 40, posY: beat.posY + 40 } : undefined; if (copyBeat) beats.push(copyBeat); const lane = laneId && lanes.some(l => l.id === laneId) ? laneId : lanes.some(l => l.id === marker.laneId) ? marker.laneId : lanes[0].id; return { ...placed({ ...marker, id: uid('marker'), beatId: copyBeat?.id }, marker.startPage - 1 + shift, marker.endPage - 1 + shift, lane), parentId: parentAt(items, lanes, lane, marker.startPage - 1 + shift) }; });
    commit({ outlineMarkers: [...doc.outlineMarkers, ...markers], ...(beats.length ? { beats: [...doc.beats, ...beats] } : {}) }); setSelected(markers.at(-1)!.id);
  };
  const lanePatch = (next: OutlineLane[]) => commit({ outlineLanes: next });
  const unplaced = doc.beats.filter(b => !doc.outlineMarkers.some(m => m.beatId === b.id));

  // ── Pointer: drag to move (also between lanes), drag an edge to resize; Alt drags without snapping ──
  const laneAtY = (clientY: number) => { const rows = [...(root.current?.querySelectorAll<HTMLElement>('[data-lane-row]') || [])]; return rows.find(r => { const b = r.getBoundingClientRect(); return clientY >= b.top && clientY < b.bottom; })?.dataset.laneRow; };
  const startDrag = (e: React.PointerEvent, s: Span, mode: 'move' | 'start' | 'end') => {
    if (e.button !== 0) return; e.stopPropagation(); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const origin = { x: e.clientX, start: s.start, end: s.end }; setSelected(s.marker.id); root.current?.focus({ preventScroll: true });
    const state = { id: s.marker.id, mode, start: s.start, end: s.end, laneId: s.marker.laneId, moved: false, from: s.start, carry: !e.altKey }; setDrag(state);
    const move = (ev: PointerEvent) => {
      // ⌘/Ctrl: no snapping. Option/Alt: children stay where they are.
      const dx = (ev.clientX - origin.x) / pw, free = ev.metaKey || ev.ctrlKey; state.carry = !ev.altKey; if (!state.moved && Math.abs(ev.clientX - origin.x) < 3 && mode === 'move' && laneAtY(ev.clientY) === s.marker.laneId) return; state.moved = true;
      if (mode === 'move') { const len = origin.end - origin.start, start = Math.max(0, snapTo(origin.start + dx, prefs.snap, free)); state.start = start; state.end = start + len; if (!s.point) state.laneId = laneAtY(ev.clientY) || state.laneId; }
      else if (mode === 'start') state.start = Math.max(0, Math.min(origin.end - .125, snapTo(origin.start + dx, prefs.snap, free)));
      else state.end = Math.max(origin.start + .125, snapTo(origin.end + dx, prefs.snap, free));
      setDrag({ ...state });
    };
    const up = (ev: PointerEvent) => { detach(); setDrag(null); if (!(state.moved && (state.start !== s.start || state.end !== s.end || state.laneId !== s.marker.laneId))) return;
      if (mode === 'move') moveElement(s.marker.id, s.point ? { start: state.start, end: state.start } : { start: state.start, end: state.end, laneId: state.laneId }, !ev.altKey);
      else updateMarker(s.marker.id, { start: state.start, end: state.end }); };
    const cancel = () => { detach(); setDrag(null); };
    // Listen on the window: moving to another lane re-renders the element in that lane, so the element that
    // received the press (and its pointer capture) is gone before the button is released.
    const detach = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', cancel); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', cancel);
  };
  const sceneNumber = (id: string) => { const i = index.scenes.findIndex(x => x.id === id), p = i >= 0 ? doc.paragraphs[index.scenes[i].index] : undefined; return p?.sceneNumber || String(i + 1); };
  const startSceneDrag = (e: React.PointerEvent, sceneId: string) => {
    if (e.button !== 0) return; const startX = e.clientX; let active = false;
    const target = (clientX: number) => { const at = positionAt(clientX), next = index.scenes.find(x => x.id !== sceneId && (x.start + x.end) / 2 > at); return next ? next.id : null; };
    const move = (ev: PointerEvent) => { if (!active && Math.abs(ev.clientX - startX) < 6) return; active = true; const r = scroller.current!.getBoundingClientRect(); setSceneDrag({ id: sceneId, x: ev.clientX - r.left + scroller.current!.scrollLeft, before: target(ev.clientX) }); };
    const up = (ev: PointerEvent) => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', cancel); setSceneDrag(null); if (!active) return;
      const before = target(ev.clientX), i = index.scenes.findIndex(x => x.id === sceneId), currentNext = index.scenes[i + 1]?.id ?? null; if (before !== currentNext) setPendingMove({ id: sceneId, before }); };
    const cancel = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', cancel); setSceneDrag(null); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', cancel);
  };
  const positionAt = (clientX: number) => { const el = scroller.current!, r = el.getBoundingClientRect(); return Math.max(0, (clientX - r.left - HEADER + el.scrollLeft) / pw); };
  const keys = (e: React.KeyboardEvent) => {
    if (renaming || (e.target as HTMLElement).closest('input,textarea,select')) return;
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === 'z') { if (step(e.shiftKey ? 'redo' : 'undo')) e.preventDefault(); return; }
    if (mod && e.key.toLowerCase() === 'v') { if (clipboard) { e.preventDefault(); paste(selectedSpan?.marker.laneId); } return; }
    // Keyboard access (1.17): Home/End select the first/last element; the context-menu key (or ⇧F10) opens the menu
    // of the selected element.
    if ((e.key === 'Home' || e.key === 'End') && !mod && spans.length) { e.preventDefault(); const order = [...spans].sort((a, b) => a.start - b.start || lanes.findIndex(l => l.id === a.marker.laneId) - lanes.findIndex(l => l.id === b.marker.laneId)), s = e.key === 'Home' ? order[0] : order[order.length - 1]; setSelected(s.marker.id); requestAnimationFrame(() => root.current?.querySelector<HTMLElement>('[data-marker-id="' + s.marker.id + '"]')?.focus()); return; }
    if (!selectedSpan) return;
    const s = selectedSpan, unit = prefs.snap === 'page' ? 1 : .125;
    if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) { e.preventDefault(); const r = root.current?.querySelector<HTMLElement>('[data-marker-id="' + s.marker.id + '"]')?.getBoundingClientRect(); setMenu({ x: r ? r.left + 8 : 40, y: r ? r.bottom : 40, kind: 'marker', id: s.marker.id }); return; }
    if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicate(s.marker.id); }
    else if (mod && e.key.toLowerCase() === 'c') { e.preventDefault(); copy(s.marker.id); }
    else if (mod && e.key.toLowerCase() === 'x') { e.preventDefault(); copy(s.marker.id); remove(s.marker.id); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); remove(s.marker.id); }
    else if (e.key === 'Enter') { e.preventDefault(); setRenaming({ kind: 'marker', id: s.marker.id }); }
    else if (e.key === 'Escape') { setSelected(null); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); const d = e.key === 'ArrowLeft' ? -unit : unit; if (e.shiftKey && !s.point) updateMarker(s.marker.id, { end: Math.max(s.start + .125, s.end + d) }); else { const start = Math.max(0, s.start + d); moveElement(s.marker.id, s.point ? { start, end: start } : { start, end: start + (s.end - s.start) }, !e.altKey); } }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); const i = lanes.findIndex(l => l.id === s.marker.laneId), lane = lanes[i + (e.key === 'ArrowUp' ? -1 : 1)]; if (lane) updateMarker(s.marker.id, { laneId: lane.id }); }
  };
  useEffect(() => { const run = (event: Event) => { const command = (event as CustomEvent).detail?.command; if (command === 'new-beat') { const lane = lanes.find(l => l.type !== 'act') || lanes[0], at = Math.floor((caret ?? 0) * 8) / 8, m = create(lane.id, at, at + 1); setRenaming({ kind: 'marker', id: m.id }); } if (command === 'send-to-script' && selectedSpan) api.current.onSendToScript({ ...selectedSpan.marker, title: selectedSpan.title, description: selectedSpan.description }); }; window.addEventListener('draftcraft-timeline', run); return () => window.removeEventListener('draftcraft-timeline', run); });

  // ── Ruler ticks for the visible range only ──
  const firstVisible = Math.max(0, Math.floor((view.left - HEADER) / pw) - 1), lastVisible = Math.min(Math.ceil(length), Math.ceil((view.left + view.width) / pw) + 1);
  const labelEvery = pw >= 36 ? 1 : pw >= 14 ? 5 : pw >= 6 ? 10 : 25, minor = pw >= 120 ? 8 : pw >= 40 ? 4 : pw >= 16 ? 2 : 1;
  const ticks: React.ReactNode[] = [];
  for (let page = firstVisible; page <= lastVisible; page++) {
    ticks.push(<span key={'p' + page} className="dc-tl-tick dc-tl-major" style={{ left: page * pw }}>{page % labelEvery === 0 || page === 0 ? <b>{page + 1}</b> : null}</span>);
    if (page < lastVisible) for (let i = 1; i < minor; i++) ticks.push(<span key={'m' + page + '-' + i} className={'dc-tl-tick' + (i * 8 / minor === 4 ? ' dc-tl-half' : '')} style={{ left: (page + i / minor) * pw }} />);
  }
  const preview = (s: Span) => drag?.id === s.marker.id ? { ...s, start: drag.start, end: s.point ? drag.start : drag.end, marker: { ...s.marker, laneId: drag.laneId } }
    : drag && drag.moved && drag.carry && dragged.has(s.marker.id) ? { ...s, start: s.start + drag.start - drag.from, end: s.end + drag.start - drag.from } : s;
  const state: ToolbarState = { elements: [], active: {}, disabled: {} };
  const collapsed = new Set(prefs.collapsed);

  return <section ref={root} className="dc-timeline no-print" aria-label="Outline Editor timeline" tabIndex={-1} onKeyDown={keys} style={{ height: prefs.height }} data-dragging={drag ? drag.mode : undefined}>
    <div ref={scroller} className="dc-tl-scroll">
      <div className="dc-tl-grid" style={{ width: width + HEADER, ['--tl-page' as string]: pw + 'px' }}>
        {lanes.map((lane, laneIndex) => { const folded = collapsed.has(lane.id), laneSpans = spans.map(preview).filter(s => s.marker.laneId === lane.id); return <div key={lane.id} className="dc-tl-row" data-lane-row={lane.id} data-collapsed={folded} style={{ height: folded ? 12 : lane.height || LANE }}>
          <div className="dc-tl-head" style={{ color: lane.color }} onContextMenu={e => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY, kind: 'lane', laneId: lane.id }); }} onDoubleClick={() => setRenaming({ kind: 'lane', id: lane.id })}>
            <button type="button" className="dc-tl-fold" aria-label={(folded ? 'Expand ' : 'Collapse ') + lane.name} aria-expanded={!folded} onClick={() => api.current.onPrefs({ ...prefs, collapsed: folded ? prefs.collapsed.filter(id => id !== lane.id) : [...prefs.collapsed, lane.id] })}><Icon name={folded ? 'ChevronRight' : 'ChevronDown'} size={11} /></button>
            {renaming?.kind === 'lane' && renaming.id === lane.id ? <input autoFocus aria-label="Lane name" defaultValue={lane.name} onFocus={e => e.currentTarget.select()} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { e.currentTarget.value = lane.name; e.currentTarget.blur(); } }} onBlur={e => { const name = e.currentTarget.value.trim(); setRenaming(null); if (name && name !== lane.name) lanePatch(lanes.map(l => l.id === lane.id ? { ...l, name } : l)); }} />
              : <span className="dc-tl-lane-name" title={lane.name + ' — double-click to rename, right-click for lane options'}>{lane.name}</span>}
            <button type="button" className="dc-tl-lane-menu" aria-label={'Options for ' + lane.name} onClick={e => { const r = e.currentTarget.getBoundingClientRect(); setMenu({ x: r.left, y: r.bottom, kind: 'lane', laneId: lane.id, at: caret ?? 0 }); }}><Icon name="Ellipsis" size={12} /></button>
          </div>
          {!folded && <div className="dc-tl-track" style={{ width }} onDoubleClick={e => { if (e.target !== e.currentTarget) return; const at = Math.floor(snapTo(positionAt(e.clientX), prefs.snap === 'off' ? 'eighth' : prefs.snap, false) * 8) / 8; const m = create(lane.id, at, at + (lane.type === 'act' ? Math.max(1, Math.round(length / 4)) : 1), lane.type === 'act' ? 'ACT ' + ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'][Math.min(4, laneSpans.length)] : lane.type === 'sequence' ? 'New Sequence' : 'New Beat'); setRenaming({ kind: 'marker', id: m.id }); }}
            onPointerDown={e => { if (e.target === e.currentTarget && e.button === 0) setSelected(null); }} onContextMenu={e => { if (e.target !== e.currentTarget) return; e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY, kind: 'track', laneId: lane.id, at: positionAt(e.clientX) }); }}>
            {laneSpans.map(s => { const left = s.start * pw, w = s.point ? 2 : Math.max(6, (s.end - s.start) * pw), isSel = selected === s.marker.id; const parent = parentIds.get(s.marker.id), parentTitle = parent ? spans.find(x => x.marker.id === parent)?.title : undefined, kids = children.get(s.marker.id)?.length || 0;
              const label = `${s.title}, ${lane.name}, ${s.point ? 'page ' + pageLabel(s.start) : 'pages ' + pageLabel(s.start) + ' to ' + pageLabel(s.end)}${parentTitle ? ', inside ' + parentTitle : ''}${kids ? ', ' + kids + ' nested element' + (kids === 1 ? '' : 's') : ''}`;
              return <div key={s.marker.id} role="button" tabIndex={0} aria-label={label} aria-pressed={isSel} data-marker-id={s.marker.id} data-parent-id={parent} data-children={kids || undefined} data-carried={dragged.has(s.marker.id) && drag?.carry || undefined} className={'dc-tl-marker' + (s.point ? ' dc-tl-pin' : '') + (isSel ? ' dc-tl-selected' : '') + (parent ? ' dc-tl-child' : '')} title={s.title + (s.description ? '\n' + s.description : '') + '\n' + (s.point ? 'Page ' + pageLabel(s.start) : 'Goal: ' + pageLabel(s.start) + ' – ' + pageLabel(s.end)) + (s.beat ? '\nOn the Beat Board' : '') + (parentTitle ? '\nInside “' + parentTitle + '”' : '') + (kids ? '\n' + kids + ' nested element' + (kids === 1 ? '' : 's') + ' move with it (hold ⌥ Option to leave them)' : '')}
                style={{ left, width: w, ['--marker' as string]: s.color }} onPointerDown={e => startDrag(e, s, 'move')} onFocus={() => setSelected(s.marker.id)}
                onDoubleClick={e => { e.stopPropagation(); setRenaming({ kind: 'marker', id: s.marker.id }); }} onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setSelected(s.marker.id); setMenu({ x: e.clientX, y: e.clientY, kind: 'marker', id: s.marker.id }); }}>
                {!s.point && <span className="dc-tl-edge dc-tl-edge-start" onPointerDown={e => startDrag(e, s, 'start')} aria-hidden="true" />}
                {renaming?.kind === 'marker' && renaming.id === s.marker.id ? <input autoFocus aria-label="Outline element title" defaultValue={s.title} onFocus={e => e.currentTarget.select()} onPointerDown={e => e.stopPropagation()} onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { e.currentTarget.value = s.title; e.currentTarget.blur(); } }} onBlur={e => { const title = e.currentTarget.value.trim(); setRenaming(null); if (title && title !== s.title) updateMarker(s.marker.id, { title }); root.current?.focus({ preventScroll: true }); }} />
                  : <span className="dc-tl-marker-title">{s.title}</span>}
                {!s.point && <span className="dc-tl-edge dc-tl-edge-end" onPointerDown={e => startDrag(e, s, 'end')} aria-hidden="true" />}
              </div>; })}
            {laneIndex === 0 && doc.targetScriptPages > 0 && <span className="dc-tl-target" style={{ left: doc.targetScriptPages * pw }} title={'Target length: ' + doc.targetScriptPages + ' pages'} />}
          </div>}
        </div>; })}
        <div className="dc-tl-row dc-tl-ruler-row" style={{ height: RULER }}>
          <div className="dc-tl-head dc-tl-head-tools">
            <button type="button" aria-label="Add Lane" title="Add an outline lane" onClick={() => { const n = lanes.length + 1; lanePatch([...lanes, { id: uid('lane'), name: 'Outline ' + n, type: 'custom', color: TIMELINE_PALETTE[n % TIMELINE_PALETTE.length] }]); }}><Icon name="Plus" size={12} /></button>
            <button type="button" aria-label="Place a Beat Board beat" title="Place a beat from the Beat Board on the timeline" disabled={!unplaced.length} onClick={e => { const r = e.currentTarget.getBoundingClientRect(); setMenu({ x: r.left, y: r.bottom, kind: 'beats' }); }}><Icon name="LayoutDashboard" size={12} /></button>
            <button type="button" aria-label="Send Outline to Script" title="Send the selected outline element to the script" disabled={!selectedSpan} onClick={() => selectedSpan && api.current.onSendToScript({ ...selectedSpan.marker, title: selectedSpan.title, description: selectedSpan.description })}><Icon name="ArrowDownToLine" size={12} /></button>
            <button type="button" aria-label="Timeline settings" title="Snapping, target length and display" onClick={e => { const r = e.currentTarget.getBoundingClientRect(); setMenu({ x: r.left, y: r.bottom, kind: 'settings' }); }}><Icon name="Settings2" size={12} /></button>
          </div>
          <div className="dc-tl-ruler" style={{ width }} onClick={e => api.current.onNavigatePage(Math.floor(positionAt(e.clientX)) + 1)} title="Click to go to that page">{ticks}</div>
        </div>
        {prefs.showScript && <div className="dc-tl-row dc-tl-script-row" style={{ height: SCRIPT }}>
          <div className="dc-tl-head"><span className="dc-tl-lane-name dc-tl-script-name">Script</span></div>
          <div className="dc-tl-track dc-tl-script" style={{ width }}>
            {index.scenes.map(scene => { const left = scene.start * pw, w = Math.max(2, (scene.end - scene.start) * pw); if (left + w < view.left - HEADER - 200 || left > view.left + view.width + 200) return null; const n = sceneNumber(scene.id); return <button type="button" key={scene.id} className="dc-tl-scene" data-scene-id={scene.id} data-dragging={sceneDrag?.id === scene.id || undefined} style={{ left, width: w, ['--scene' as string]: scene.color }} aria-label={`Scene ${n}: ${scene.heading || 'Untitled scene'}, page ${scene.startPage}, ${(scene.end - scene.start).toFixed(2)} pages`} title={`${n}. ${scene.heading || 'Untitled scene'}\nPage ${scene.startPage} · ${(scene.end - scene.start).toFixed(2)} pages\nDouble-click to go to the scene · drag to move the scene in the script`}
              onPointerDown={e => startSceneDrag(e, scene.id)} onClick={() => setSelected(null)} onDoubleClick={() => api.current.onNavigate(scene.id)}>{w > 24 ? <><b className="dc-tl-scene-number">{n}</b>{w > 44 ? scene.heading.replace(/^(INT\.\/EXT\.|EXT\.\/INT\.|INT\.|EXT\.|I\/E\.?)\s*/i, '') : ''}</> : ''}</button>; })}
            {sceneDrag && <span className="dc-tl-insert" style={{ left: (() => { const b = sceneDrag.before ? index.scenes.find(x => x.id === sceneDrag.before) : undefined; return (b ? b.start : index.total) * pw; })() }} aria-hidden="true" />}
            {!index.scenes.length && <span className="dc-tl-empty">Scene headings appear here as you write.</span>}
          </div>
        </div>}
        {caret !== undefined && <span className="dc-tl-caret" style={{ left: HEADER + caret * pw }} title={'Caret: page ' + pageLabel(caret)} aria-hidden="true" />}
      </div>
    </div>
    <div className="dc-tl-footer" role="group" aria-label="Timeline controls">
      {pendingMove ? (() => { const from = index.scenes.find(x => x.id === pendingMove.id), to = pendingMove.before ? index.scenes.find(x => x.id === pendingMove.before) : undefined; return <div className="dc-tl-confirm" role="alertdialog" aria-label="Move scene">
        <span>Move scene {sceneNumber(pendingMove.id)} “{from?.heading || 'Untitled scene'}” {to ? <>before scene {sceneNumber(to.id)} “{to.heading || 'Untitled scene'}”</> : 'to the end of the script'}? Its text moves with it; Undo puts it back.</span>
        <button type="button" autoFocus onClick={() => { const m = pendingMove; setPendingMove(null); api.current.onMoveScene(m.id, m.before); }}>Move Scene</button><button type="button" onClick={() => setPendingMove(null)}>Cancel</button></div>; })()
        : selectedSpan ? <SelectionBar span={selectedSpan} lanes={lanes} onChange={change => updateMarker(selectedSpan.marker.id, change)} onRemove={() => remove(selectedSpan.marker.id)} onDuplicate={() => duplicate(selectedSpan.marker.id)} onSend={() => api.current.onSendToScript({ ...selectedSpan.marker, title: selectedSpan.title, description: selectedSpan.description })}
        onGo={() => { const id = selectedSpan.marker.anchor?.paragraphId; if (id) api.current.onNavigate(id); else api.current.onNavigatePage(Math.floor(selectedSpan.start) + 1); }} onColor={e => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setMenu({ x: r.left, y: r.top - 8, kind: 'color', id: selectedSpan.marker.id }); }} />
        : <span className="dc-tl-hint">{index.total.toFixed(1).replace(/\.0$/, '')} of {doc.targetScriptPages || '—'} pages · double-click a lane to add an element, drag to move (⌥ Option leaves nested elements behind), drag an edge to resize{caret !== undefined ? ' · caret on page ' + pageLabel(caret) : ''}</span>}
      <span className="dc-tl-spacer" />
      <button type="button" aria-label="Zoom out timeline" title="Zoom out" onClick={() => zoomTo(pw / 1.5)}><Icon name="Minus" size={12} /></button>
      <input type="range" aria-label="Timeline zoom" min={0} max={1000} value={Math.round(Math.log(pw / 4) / Math.log(160) * 1000)} onChange={e => zoomTo(4 * Math.pow(160, Number(e.target.value) / 1000))} />
      <button type="button" aria-label="Zoom in timeline" title="Zoom in" onClick={() => zoomTo(pw * 1.5)}><Icon name="Plus" size={12} /></button>
      <button type="button" onClick={() => fit(0, length)} title="Fit the whole script and outline">Fit Script</button>
      <button type="button" disabled={!selectedSpan} onClick={() => selectedSpan && fit(Math.max(0, selectedSpan.start - .25), selectedSpan.end + .25)} title="Fit the selected element">Fit Selection</button>
    </div>
    <div className="dc-tl-resize" role="separator" aria-orientation="horizontal" aria-label="Resize timeline" tabIndex={0} onKeyDown={e => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); api.current.onPrefs({ ...prefs, height: Math.max(72, Math.min(520, prefs.height + (e.key === 'ArrowDown' ? 16 : -16))) }); } }}
      onPointerDown={e => { const el = e.currentTarget, start = e.clientY, height = prefs.height, section = root.current!; el.setPointerCapture(e.pointerId); const move = (ev: PointerEvent) => { section.style.height = Math.max(72, Math.min(520, height + ev.clientY - start)) + 'px'; }; const up = (ev: PointerEvent) => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); api.current.onPrefs({ ...prefs, height: Math.max(72, Math.min(520, height + ev.clientY - start)) }); }; el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); }} />
    {menu && <TimelineMenu menu={menu} state={state} lanes={lanes} spans={spans} items={items} parents={parentIds} unplaced={unplaced} prefs={prefs} target={doc.targetScriptPages} confirmLane={confirmLane} setConfirmLane={setConfirmLane} onClose={() => setMenu(null)} actions={{
      rename: id => setRenaming({ kind: 'marker', id }), duplicate, copy, remove, paste, send: id => { const s = spans.find(x => x.marker.id === id); if (s) api.current.onSendToScript({ ...s.marker, title: s.title, description: s.description }); },
      go: id => { const s = spans.find(x => x.marker.id === id); if (!s) return; if (s.marker.anchor?.paragraphId) api.current.onNavigate(s.marker.anchor.paragraphId); else api.current.onNavigatePage(Math.floor(s.start) + 1); },
      color: (id, color) => updateMarker(id, { color }), moveToLane: (id, laneId) => updateMarker(id, { laneId }),
      nest: (id, parentId) => commit({ outlineMarkers: doc.outlineMarkers.map(m => m.id === id ? { ...m, parentId } : m) }),
      createAt: (laneId, at) => { const p = Math.floor(snapTo(at, prefs.snap === 'off' ? 'eighth' : prefs.snap, false) * 8) / 8; const m = create(laneId, p, p + 1); setRenaming({ kind: 'marker', id: m.id }); },
      place: beatId => { const beat = doc.beats.find(b => b.id === beatId); if (!beat) return; const lane = lanes.find(l => l.type !== 'act') || lanes[0], at = Math.floor((caret ?? 0) * 8) / 8; create(lane.id, at, at + 1, beat.title, beat); },
      renameLane: id => setRenaming({ kind: 'lane', id }), laneColor: (id, color) => lanePatch(lanes.map(l => l.id === id ? { ...l, color } : l)),
      moveLane: (id, d) => { const i = lanes.findIndex(l => l.id === id), j = i + d; if (j < 0 || j >= lanes.length) return; const next = [...lanes];[next[i], next[j]] = [next[j], next[i]]; lanePatch(next); },
      addLaneBelow: id => { const i = lanes.findIndex(l => l.id === id), n = lanes.length + 1, next = [...lanes]; next.splice(i + 1, 0, { id: uid('lane'), name: 'Outline ' + n, type: 'custom', color: TIMELINE_PALETTE[n % TIMELINE_PALETTE.length] }); lanePatch(next); },
      deleteLane: id => { commit({ outlineLanes: lanes.filter(l => l.id !== id), outlineMarkers: doc.outlineMarkers.filter(m => m.laneId !== id) }); setConfirmLane(null); },
      toggleCollapse: id => api.current.onPrefs({ ...prefs, collapsed: collapsed.has(id) ? prefs.collapsed.filter(x => x !== id) : [...prefs.collapsed, id] }),
      prefs: p => api.current.onPrefs(p), target: pages => commit({ targetScriptPages: pages }),
    }} />}
  </section>;
}

function SelectionBar({ span, lanes, onChange, onRemove, onDuplicate, onSend, onGo, onColor }: { span: Span; lanes: OutlineLane[]; onChange: (c: { start?: number; end?: number; title?: string; description?: string; laneId?: string }) => void; onRemove: () => void; onDuplicate: () => void; onSend: () => void; onGo: () => void; onColor: (e: React.MouseEvent) => void }) {
  const num = (v: number) => +(v + 1).toFixed(3);
  return <div className="dc-tl-selection" role="group" aria-label="Selected outline element">
    <button type="button" className="dc-tl-swatch" style={{ background: span.color }} aria-label="Element color" title="Color" onClick={onColor} />
    <input key={'t' + span.marker.id + span.title} aria-label="Element title" defaultValue={span.title} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} onBlur={e => { const v = e.currentTarget.value.trim(); if (v && v !== span.title) onChange({ title: v }); }} />
    {!span.point ? <label className="dc-tl-goal">Goal <input key={'s' + span.start} type="number" step={0.125} min={1} aria-label="Goal start page" defaultValue={num(span.start)} onBlur={e => { const v = Number(e.currentTarget.value) - 1; if (Number.isFinite(v) && v >= 0 && Math.abs(v - span.start) > 1e-6) onChange({ start: Math.min(v, span.end - .125) }); }} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} />–<input key={'e' + span.end} type="number" step={0.125} min={1} aria-label="Goal end page" defaultValue={num(span.end)} onBlur={e => { const v = Number(e.currentTarget.value) - 1; if (Number.isFinite(v) && v > span.start && Math.abs(v - span.end) > 1e-6) onChange({ end: v }); }} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} /></label>
      : <span className="dc-tl-goal">Page {pageLabel(span.start)}</span>}
    <select aria-label="Element lane" value={span.marker.laneId} onChange={e => onChange({ laneId: e.target.value })}>{lanes.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
    <input key={'d' + span.marker.id + span.description} className="dc-tl-description" aria-label="Element description" placeholder="Description" defaultValue={span.description} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} onBlur={e => { const v = e.currentTarget.value; if (v !== span.description) onChange({ description: v }); }} />
    <button type="button" onClick={onGo} title={span.marker.anchor?.paragraphId ? 'Go to the script text this element was sent to' : 'Go to this page in the script'}>Go to Script</button>
    <button type="button" onClick={onSend} title="Send this element into the script as outline text">Send to Script</button>
    <button type="button" onClick={onDuplicate}>Duplicate</button>
    <button type="button" onClick={onRemove} title={span.beat ? 'Remove from the timeline; the beat stays on the Beat Board' : 'Remove this element'}>{span.beat ? 'Remove from Timeline' : 'Delete'}</button>
  </div>;
}

interface MenuActions { nest: (id: string, parentId: string | undefined) => void; rename: (id: string) => void; duplicate: (id: string) => void; copy: (id: string) => void; remove: (id: string) => void; paste: (laneId?: string, at?: number) => void; send: (id: string) => void; go: (id: string) => void; color: (id: string, color: string) => void; moveToLane: (id: string, laneId: string) => void; createAt: (laneId: string, at: number) => void; place: (beatId: string) => void; renameLane: (id: string) => void; laneColor: (id: string, color: string) => void; moveLane: (id: string, d: number) => void; addLaneBelow: (id: string) => void; deleteLane: (id: string) => void; toggleCollapse: (id: string) => void; prefs: (p: TimelinePreferences) => void; target: (pages: number) => void }
function TimelineMenu({ menu, state, lanes, spans, items, parents, unplaced, prefs, target, confirmLane, setConfirmLane, onClose, actions }: { menu: { x: number; y: number; kind: string; id?: string; laneId?: string; at?: number }; state: ToolbarState; lanes: OutlineLane[]; spans: Span[]; items: Placed[]; parents: Map<string, string>; unplaced: BeatCard[]; prefs: TimelinePreferences; target: number; confirmLane: string | null; setConfirmLane: (id: string | null) => void; onClose: () => void; actions: MenuActions }) {
  const labels: Record<string, string> = {}, entries: string[] = [], run: Record<string, () => void> = {}, active: Record<string, boolean> = {};
  const add = (id: string, label: string, fn: () => void, checked?: boolean) => { entries.push(id); labels[id] = label; run[id] = fn; if (checked !== undefined) active[id] = checked; };
  const sep = () => entries.push('separator');
  if (menu.kind === 'marker' && menu.id) { const s = spans.find(x => x.marker.id === menu.id); add('rename', 'Rename', () => actions.rename(menu.id!)); add('go', 'Go to Script', () => actions.go(menu.id!)); add('send', 'Send to Script…', () => actions.send(menu.id!)); sep(); add('copy', 'Copy', () => actions.copy(menu.id!)); add('duplicate', 'Duplicate', () => actions.duplicate(menu.id!)); add('remove', s?.beat ? 'Remove from Timeline (keep beat)' : 'Delete', () => actions.remove(menu.id!)); sep();
    if (s) { const current = parents.get(s.marker.id), above = parentAt(items, lanes, s.marker.laneId, s.start, new Set([s.marker.id])), title = (id?: string) => spans.find(x => x.marker.id === id)?.title || 'element';
      if (above && above !== current) add('nest', 'Nest Inside “' + title(above) + '”', () => actions.nest(menu.id!, above));
      if (current) add('unnest', 'Remove from “' + title(current) + '”', () => actions.nest(menu.id!, undefined));
      if (above && above !== current || current) sep(); } TIMELINE_PALETTE.forEach((c, i) => add('color-' + i, '● Color ' + (i + 1), () => actions.color(menu.id!, c), s?.color === c)); sep(); lanes.forEach(l => add('lane-' + l.id, 'Move to ' + l.name, () => actions.moveToLane(menu.id!, l.id), s?.marker.laneId === l.id)); }
  else if (menu.kind === 'color' && menu.id) { const s = spans.find(x => x.marker.id === menu.id); TIMELINE_PALETTE.forEach((c, i) => add('color-' + i, '● Color ' + (i + 1), () => actions.color(menu.id!, c), s?.color === c)); }
  else if (menu.kind === 'lane' && menu.laneId) { const lane = lanes.find(l => l.id === menu.laneId)!, count = spans.filter(s => s.marker.laneId === lane.id).length; add('rename-lane', 'Rename Lane', () => actions.renameLane(lane.id)); add('collapse', prefs.collapsed.includes(lane.id) ? 'Expand Lane' : 'Collapse Lane', () => actions.toggleCollapse(lane.id)); add('up', 'Move Lane Up', () => actions.moveLane(lane.id, -1)); add('down', 'Move Lane Down', () => actions.moveLane(lane.id, 1)); add('add-below', 'Add Lane Below', () => actions.addLaneBelow(lane.id)); add('new-at-caret', 'New Element at the Caret', () => actions.createAt(lane.id, menu.at ?? 0)); sep(); TIMELINE_PALETTE.forEach((c, i) => add('lane-color-' + i, '● Lane Color ' + (i + 1), () => actions.laneColor(lane.id, c), lane.color === c)); sep();
    if (confirmLane === lane.id) add('delete-confirm', `Delete “${lane.name}” and its ${count} element${count === 1 ? '' : 's'} (beats stay on the Beat Board)`, () => actions.deleteLane(lane.id)); else { entries.push('delete-ask'); labels['delete-ask'] = 'Delete Lane…'; run['delete-ask'] = () => { if (count) setConfirmLane(lane.id); else actions.deleteLane(lane.id); }; } }
  else if (menu.kind === 'track' && menu.laneId) { add('new', 'New Element Here', () => actions.createAt(menu.laneId!, menu.at || 0)); add('paste', 'Paste', () => actions.paste(menu.laneId, menu.at)); }
  else if (menu.kind === 'beats') unplaced.forEach(b => add('beat-' + b.id, b.title || 'Untitled beat', () => actions.place(b.id)));
  else if (menu.kind === 'settings') { add('snap-eighth', 'Snap to ⅛ Page', () => actions.prefs({ ...prefs, snap: 'eighth' }), prefs.snap === 'eighth'); add('snap-page', 'Snap to Whole Pages', () => actions.prefs({ ...prefs, snap: 'page' }), prefs.snap === 'page'); add('snap-off', 'No Snapping', () => actions.prefs({ ...prefs, snap: 'off' }), prefs.snap === 'off'); sep(); add('follow', 'Follow the Caret', () => actions.prefs({ ...prefs, followCaret: !prefs.followCaret }), prefs.followCaret); add('script', 'Show Script Lane', () => actions.prefs({ ...prefs, showScript: !prefs.showScript }), prefs.showScript); add('ripple', 'Ripple Insert (new elements push later ones right)', () => actions.prefs({ ...prefs, ripple: !prefs.ripple }), prefs.ripple); sep();
    for (const pages of [15, 30, 60, 90, 110, 120]) add('target-' + pages, 'Target Length: ' + pages + ' pages', () => actions.target(pages), target === pages); }
  const keepOpen = new Set(['delete-ask']);
  return <ToolbarMenu x={menu.x} y={menu.y} entries={entries} labels={labels} state={{ ...state, active }} onClose={() => { setConfirmLane(null); onClose(); }} onPick={id => { const fn = run[id]; if (!keepOpen.has(id)) onClose(); fn?.(); }} />;
}

/** Places a Beat Board beat on the timeline (first lane that is not the acts lane) at a page position. */
export function placeBeat(doc: ScriptDocument, beatId: string, position: number): Planning | null {
  const beat = doc.beats.find(b => b.id === beatId); if (!beat || doc.outlineMarkers.some(m => m.beatId === beatId)) return null;
  const lanes = doc.outlineLanes.length ? doc.outlineLanes : DEFAULT_LANES, lane = lanes.find(l => l.type !== 'act') || lanes[0], start = Math.max(0, Math.floor(position * 8) / 8);
  const marker: OutlineMarker = { id: uid('marker'), laneId: lane.id, title: beat.title, description: beat.description, startPage: start + 1, endPage: start + 2, color: beat.color, beatId, kind: 'section', visible: true, anchor: { page: start + 1 } };
  return { outlineMarkers: [...doc.outlineMarkers, marker], ...(doc.outlineLanes.length ? {} : { outlineLanes: DEFAULT_LANES }) };
}
/** "1 – 3" goal ranges of beats placed on the timeline, by beat id. */
export function beatGoals(doc: ScriptDocument, index: StoryIndex): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of doc.outlineMarkers) if (m.beatId && (!m.kind || m.kind === 'section')) { const s = spanOf(m, index, doc.beats); out[m.beatId] = pageLabel(s.start) + ' – ' + pageLabel(s.end); }
  return out;
}
/** 1.17 Beat Board ↔ timeline: the sequences (elements in Sequence lanes) in story order and the beats inside each. A
 * beat belongs to a sequence when its element is nested inside it (directly or through a parent), or else when its
 * element starts within the sequence's pages. Beats not on the timeline belong to no sequence. */
export function beatSequenceGroups(doc: ScriptDocument, index: StoryIndex): { id: string; title: string; beatId?: string; members: string[] }[] {
  const lanes = doc.outlineLanes.length ? doc.outlineLanes : DEFAULT_LANES, seqLanes = new Set(lanes.filter(l => l.type === 'sequence').map(l => l.id));
  const spans = doc.outlineMarkers.filter(m => m.visible !== false).map(m => spanOf(m, index, doc.beats)), byId = new Map(spans.map(s => [s.marker.id, s]));
  const items: Placed[] = spans.map(s => ({ id: s.marker.id, laneId: s.marker.laneId, start: s.start, end: s.end, parentId: s.marker.parentId, point: s.point }));
  const parentOf = new Map([...childMap(items, lanes)].flatMap(([p, kids]) => kids.map(k => [k, p] as [string, string])));
  const sequences = spans.filter(s => seqLanes.has(s.marker.laneId) && !s.point).sort((a, b) => a.start - b.start);
  const groups = sequences.map(s => ({ id: s.marker.id, title: s.title, beatId: s.marker.beatId, members: [] as string[] }));
  for (const s of spans) {
    if (!s.marker.beatId || seqLanes.has(s.marker.laneId)) continue;
    let p = parentOf.get(s.marker.id), seq: string | undefined;
    for (let guard = 0; p && guard < 20; guard++) { if (seqLanes.has(byId.get(p)?.marker.laneId || '')) { seq = p; break; } p = parentOf.get(p); }
    seq ??= sequences.find(q => s.start >= q.start - 1e-6 && s.start < q.end - 1e-6)?.marker.id;
    const g = seq ? groups.find(x => x.id === seq) : undefined; if (g && !g.members.includes(s.marker.beatId)) g.members.push(s.marker.beatId);
  }
  return groups;
}
/** Title of the element each beat's element is nested inside, by beat id. */
export function beatParents(doc: ScriptDocument, index: StoryIndex): Record<string, string> {
  const lanes = doc.outlineLanes.length ? doc.outlineLanes : DEFAULT_LANES, spans = doc.outlineMarkers.filter(m => m.visible !== false).map(m => spanOf(m, index, doc.beats));
  const items: Placed[] = spans.map(s => ({ id: s.marker.id, laneId: s.marker.laneId, start: s.start, end: s.end, parentId: s.marker.parentId, point: s.point }));
  const parentOf = new Map([...childMap(items, lanes)].flatMap(([p, kids]) => kids.map(k => [k, p] as [string, string]))), out: Record<string, string> = {};
  for (const s of spans) { const p = parentOf.get(s.marker.id); if (s.marker.beatId && p) out[s.marker.beatId] = spans.find(x => x.marker.id === p)?.title || ''; }
  return out;
}
