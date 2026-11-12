import { beatWidth, beatHeight, resizedBeat, BeatSize } from '../utils/beatSizing';
import { ToolbarMenu } from '../workspace/Toolbar';
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import {
  BeatCard,
  BeatBoardView,
  FlowLine,
  FlowLineStyle,
  Paragraph,
  ElementType,
} from '../types/script';
import {
  Plus,
  Trash2,
  Clock,
  Tag,
  Palette,
  Sparkles,
  Link,
  ChevronRight,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Copy,
  Grid,
  Move,
  ArrowRight,
  ArrowLeft,
  ArrowLeftRight,
  FileText,
  Image as ImageIcon,
  Check,
  X,
  Send,
} from 'lucide-react';

interface BeatBoardProps {
  beats: BeatCard[];
  flowLines: FlowLine[];
  onBeatsChange: (beats: BeatCard[]) => void;
  onFlowLinesChange: (lines: FlowLine[]) => void;
  onSendBeatToScript: (beat: BeatCard) => void;
  onJumpToLinkedScene?: (id:string)=>void;
  onOpenResearch: (query: string) => void;
  onResizeCommit: (id: string, previous: BeatSize, next: BeatSize) => void;
  onUndoResize: () => void;
  onRedoResize: () => void;
  canUndoResize: boolean;
  canRedoResize: boolean;
  /** Goal page range of each beat placed on the timeline ("1 – 3"). */
  goals?: Record<string, string>;
  /** Place a beat that is not on the timeline yet at the caret page. */
  onPlaceOnTimeline?: (beatId: string) => void;
  /** 1.17: sequences on the timeline, in story order, with the beats inside each (Arrange by Sequence). */
  sequenceGroups?: SequenceGroup[];
  /** 1.17: title of the outline element each beat is nested inside, by beat id. */
  parents?: Record<string, string>;
  /** 1.17: saved board views, kept in the document. */
  views?: BeatBoardView[];
  onViewsChange?: (views: BeatBoardView[]) => void;
}
export interface SequenceGroup { id: string; title: string; beatId?: string; members: string[] }

const PRESET_COLORS = [
  '#3b82f6', // Blue
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#8b5cf6', // Violet
  '#ef4444', // Red
  '#06b6d4', // Cyan
];

const CARD_SIZES = [
  { label: 'Standard', width: 260 },
  { label: 'Wide', width: 340 },
  { label: 'Compact', width: 200 },
];

export const BeatBoard: React.FC<BeatBoardProps> = ({
  beats,
  flowLines,
  onBeatsChange,
  onFlowLinesChange,
  onSendBeatToScript,
  onJumpToLinkedScene,
  onOpenResearch, onResizeCommit, onUndoResize, onRedoResize, canUndoResize, canRedoResize, goals = {}, onPlaceOnTimeline,
  sequenceGroups = [], parents = {}, views = [], onViewsChange,
}) => {
  // Undo/redo for every Beat Board edit. Resizes keep their own patch history in App (so undoing a resize never
  // reverts a later edit); `ops` records which history the next ⌘Z belongs to.
  const history = useRef<{ undo: { beats: BeatCard[]; flowLines: FlowLine[] }[]; redo: { beats: BeatCard[]; flowLines: FlowLine[] }[]; ops: ('edit' | 'resize')[]; redoOps: ('edit' | 'resize')[] }>({ undo: [], redo: [], ops: [], redoOps: [] });
  const [historyTick, setHistoryTick] = useState(0);
  const latest = useRef({ beats, flowLines }); latest.current = { beats, flowLines };
  const record = () => { const h = history.current; h.undo.push({ beats: latest.current.beats, flowLines: latest.current.flowLines }); if (h.undo.length > 100) h.undo.shift(); h.ops.push('edit'); h.redo = []; h.redoOps = []; setHistoryTick(t => t + 1); };
  const recordResize = () => { history.current.ops.push('resize'); history.current.redoOps = []; setHistoryTick(t => t + 1); };
  const undoBoard = () => { const h = history.current, op = h.ops.pop(); if (!op) return; if (op === 'resize') { h.redoOps.push('resize'); onUndoResize(); } else { const prev = h.undo.pop(); if (!prev) return; h.redo.push({ beats: latest.current.beats, flowLines: latest.current.flowLines }); h.redoOps.push('edit'); onBeatsChange(prev.beats); onFlowLinesChange(prev.flowLines); } setHistoryTick(t => t + 1); };
  const redoBoard = () => { const h = history.current, op = h.redoOps.pop(); if (!op) return; if (op === 'resize') { h.ops.push('resize'); onRedoResize(); } else { const next = h.redo.pop(); if (!next) return; h.undo.push({ beats: latest.current.beats, flowLines: latest.current.flowLines }); h.ops.push('edit'); onBeatsChange(next.beats); onFlowLinesChange(next.flowLines); } setHistoryTick(t => t + 1); };
  const editing = useRef<string | null>(null);
  const dragRecorded = useRef(false);
  const [filter, setFilter] = useState('');
  const [notice, setNotice] = useState('');
  const [menu, setMenu] = useState<{ x: number; y: number; beatId?: string; at?: { x: number; y: number } } | null>(null);
  const clipboard = useRef<BeatCard[]>([]);
  const matches = (b: BeatCard) => !filter.trim() || [b.title, b.description, b.notes || '', ...(b.tags || [])].join(' ').toLowerCase().includes(filter.trim().toLowerCase());
  const canvasRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const [measuredSizes, setMeasuredSizes] = useState<Record<string, { width: number; height: number }>>({});
  const [resizePreview, setResizePreview] = useState<{ id: string; width: number; height: number } | null>(null);
  const resizeRef = useRef<{ id: string; pointerId: number; axis: 'x' | 'y' | 'both'; x: number; y: number; width: number; height: number; zoom: number; previous: BeatSize; current: BeatSize; moved: boolean } | null>(null);
  useLayoutEffect(() => {
    const layer = cardsRef.current;
    if (!layer) return;
    const measure = () => {
      const sizes: Record<string, { width: number; height: number }> = {};
      layer.querySelectorAll<HTMLElement>('[data-beat-id]').forEach(el => { sizes[el.dataset.beatId!] = { width: el.offsetWidth, height: el.offsetHeight }; });
      setMeasuredSizes(prev => JSON.stringify(prev) === JSON.stringify(sizes) ? prev : sizes);
    };
    const observer = new ResizeObserver(measure);
    layer.querySelectorAll('[data-beat-id]').forEach(el => observer.observe(el));
    measure(); return () => observer.disconnect();
  }, [beats.length]);
  useEffect(() => () => { resizeRef.current = null; }, []);

  const beginResize = (e: React.PointerEvent<HTMLButtonElement>, card: BeatCard, axis: 'x' | 'y' | 'both') => {
    if (e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    setIsPanning(false); setDraggingCardId(null); setConnectingFromId(null);
    const size = measuredSizes[card.id] || { width: beatWidth(card.width), height: beatHeight(card.height) || 200 };
    const previous = { width: card.width, height: card.height };
    resizeRef.current = { id: card.id, pointerId: e.pointerId, axis, x: e.clientX, y: e.clientY, width: size.width, height: size.height, zoom, previous, current: previous, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const moveResize = (e: React.PointerEvent<HTMLButtonElement>) => {
    const r = resizeRef.current;
    if (!r || r.pointerId !== e.pointerId) return;
    e.stopPropagation();
    const dx = (e.clientX - r.x) / r.zoom, dy = (e.clientY - r.y) / r.zoom;
    r.moved = r.moved || Math.abs(dx) + Math.abs(dy) > 0.5;
    if (!r.moved) return;
    const dimensions = resizedBeat(r.width + (r.axis === 'y' ? 0 : dx), r.height + (r.axis === 'x' ? 0 : dy), snapToGrid);
    // A horizontal drag preserves natural height for legacy cards. A vertical
    // drag preserves the exact saved width, including its default state.
    r.current = { width: r.axis === 'y' ? r.previous.width : dimensions.width, height: r.axis === 'x' ? r.previous.height : dimensions.height };
    setResizePreview({ id: r.id, width: r.axis === 'y' ? r.width : dimensions.width, height: r.axis === 'x' ? r.height : dimensions.height });
  };
  const endResize = (e: React.PointerEvent<HTMLButtonElement>, cancel = false) => {
    const r = resizeRef.current;
    if (!r || r.pointerId !== e.pointerId) return;
    e.stopPropagation(); resizeRef.current = null; setResizePreview(null);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (!cancel && r.moved && (r.current.width !== r.previous.width || r.current.height !== r.previous.height)) { recordResize(); onResizeCommit(r.id, r.previous, r.current); }
  };


  // Zoom & Pan Canvas State
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Dragging Card State
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  // 1.17: while a card is dragged only this preview changes; the document changes once, when the card is dropped
  // (one save and one Undo step per drag).
  const [dragPos, setDragPos] = useState<{ id: string; x: number; y: number } | null>(null);
  const posOf = (b: BeatCard) => dragPos?.id === b.id ? { x: dragPos.x, y: dragPos.y } : { x: b.posX, y: b.posY };

  // Multi-Selection State
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [snapToGrid, setSnapToGrid] = useState(true);

  // Flow Line Connection Mode
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
  const [selectedFlowLineId, setSelectedFlowLineId] = useState<string | null>(null);

  // Pan Canvas Handler
  const handleMouseDownCanvas = (e: React.PointerEvent) => {
    if (resizeRef.current || e.button !== 0) return;
    // If middle click or spacebar held or target is canvas background
    if (e.target === canvasRef.current || (e.target as HTMLElement).tagName === 'svg') {
      e.currentTarget.setPointerCapture(e.pointerId);
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      setSelectedCardIds([]);
    }
  };

  const handleMouseMove = (e: React.PointerEvent) => {
    if (resizeRef.current) return;
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    } else if (draggingCardId) {
      const card = beats.find((b) => b.id === draggingCardId);
      if (!card) return;

      const bounds = canvasRef.current!.getBoundingClientRect();
      let newX = (e.clientX - bounds.left - pan.x) / zoom - dragOffset.x;
      let newY = (e.clientY - bounds.top - pan.y) / zoom - dragOffset.y;

      if (snapToGrid) {
        newX = Math.round(newX / 20) * 20;
        newY = Math.round(newY / 20) * 20;
      }

      setDragPos({ id: draggingCardId, x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    const drop = dragPos, card = drop && beats.find(b => b.id === drop.id);
    if (drop && card && (card.posX !== drop.x || card.posY !== drop.y)) { record(); onBeatsChange(beats.map(b => b.id === drop.id ? { ...b, posX: drop.x, posY: drop.y } : b)); }
    setDragPos(null); setDraggingCardId(null);
  };
  const cancelDrag = () => { setIsPanning(false); setDragPos(null); setDraggingCardId(null); };

  // Card Mouse Down
  const handleCardMouseDown = (e: React.PointerEvent, card: BeatCard) => {
    e.stopPropagation();
    if (e.button !== 0 || resizeRef.current || (e.target as HTMLElement).closest('input, textarea, button, select, [data-resize-handle]')) return;
    e.currentTarget.setPointerCapture(e.pointerId);

    if (connectingFromId) {
      // Create new flow line
      if (connectingFromId !== card.id) {
        const newLine: FlowLine = {
          id: `flow-${Date.now()}`,
          fromId: connectingFromId,
          toId: card.id,
          style: 'forward',
          color: card.color || '#3b82f6',
          label: 'Story Progression',
        };
        record(); onFlowLinesChange([...flowLines, newLine]);
      }
      setConnectingFromId(null);
      return;
    }

    if (e.shiftKey) {
      setSelectedCardIds((prev) =>
        prev.includes(card.id) ? prev.filter((id) => id !== card.id) : [...prev, card.id]
      );
    } else {
      setSelectedCardIds([card.id]);
    }

    dragRecorded.current = false; setDraggingCardId(card.id);
    const bounds = canvasRef.current!.getBoundingClientRect();
    const mouseX = (e.clientX - bounds.left - pan.x) / zoom;
    const mouseY = (e.clientY - bounds.top - pan.y) / zoom;
    setDragOffset({ x: mouseX - card.posX, y: mouseY - card.posY });
  };

  // Card Operations
  const handleAddBeat = (act = 1) => {
    record();
    const newBeat: BeatCard = {
      id: `beat-${Date.now()}`,
      title: 'New Story Beat',
      description: 'Describe turning point, dilemma, sequence, or character action...',
      act,
      color: PRESET_COLORS[(beats.length) % PRESET_COLORS.length],
      targetMinutes: act === 1 ? 15 : act === 2 ? 45 : act === 3 ? 75 : 100,
      tags: ['Plot Point'],
      posX: 120 + (beats.length % 5) * 80,
      posY: 100 + (beats.length % 4) * 60,
      width: 260,
      viewStyle: 'card',
    };
    onBeatsChange([...beats, newBeat]);
    setSelectedCardIds([newBeat.id]);
  };

  const handleDuplicateCard = (card: BeatCard) => {
    record();
    const copy: BeatCard = {
      ...card,
      id: `beat-${Date.now()}`,
      title: `${card.title} (Copy)`,
      posX: card.posX + 30,
      posY: card.posY + 30,
    };
    onBeatsChange([...beats, copy]);
    setSelectedCardIds([copy.id]);
  };

  const handleDeleteCard = (cardId: string) => {
    record();
    onBeatsChange(beats.filter((b) => b.id !== cardId));
    onFlowLinesChange(flowLines.filter((l) => l.fromId !== cardId && l.toId !== cardId));
    setSelectedCardIds((prev) => prev.filter((id) => id !== cardId));
  };

  // Align to Row
  const handleAlignRow = () => {
    if (selectedCardIds.length < 2) return;
    record();
    const selectedBeats = beats.filter((b) => selectedCardIds.includes(b.id));
    const avgY = selectedBeats.reduce((sum, b) => sum + b.posY, 0) / selectedBeats.length;

    onBeatsChange(
      beats.map((b) => (selectedCardIds.includes(b.id) ? { ...b, posY: avgY } : b))
    );
  };

  // Align to Column
  const handleAlignColumn = () => {
    if (selectedCardIds.length < 2) return;
    record();
    const selectedBeats = beats.filter((b) => selectedCardIds.includes(b.id));
    const avgX = selectedBeats.reduce((sum, b) => sum + b.posX, 0) / selectedBeats.length;

    onBeatsChange(
      beats.map((b) => (selectedCardIds.includes(b.id) ? { ...b, posX: avgX } : b))
    );
  };

  // Cascade Selected Beats
  const handleCascade = () => {
    if (selectedCardIds.length < 2) return;
    record();
    let startX = 80;
    let startY = 80;

    onBeatsChange(
      beats.map((b) => {
        if (selectedCardIds.includes(b.id)) {
          const updated = { ...b, posX: startX, posY: startY };
          startX += 120;
          startY += 70;
          return updated;
        }
        return b;
      })
    );
  };

  const handleDistribute = (axis: 'x' | 'y') => {
    if (selectedCardIds.length < 3) return; record();
    const chosen = beats.filter(b => selectedCardIds.includes(b.id)).sort((a, b) => axis === 'x' ? a.posX - b.posX : a.posY - b.posY);
    const first = axis === 'x' ? chosen[0].posX : chosen[0].posY, last = axis === 'x' ? chosen.at(-1)!.posX : chosen.at(-1)!.posY, step = (last - first) / (chosen.length - 1);
    const place = new Map(chosen.map((b, i) => [b.id, Math.round(first + i * step)]));
    onBeatsChange(beats.map(b => place.has(b.id) ? { ...b, [axis === 'x' ? 'posX' : 'posY']: place.get(b.id)! } : b));
  };
  // Arrange by act: one row per act, in story order (goal page where placed on the timeline, then strip order).
  const handleArrangeByAct = () => {
    if (!beats.length) return; record();
    const goalStart = (b: BeatCard) => { const g = goals[b.id]; return g ? parseFloat(g) : Infinity; };
    const rows = new Map<number, BeatCard[]>(); for (const b of beats) { const act = b.act || 1; rows.set(act, [...(rows.get(act) || []), b]); }
    const place = new Map<string, { x: number; y: number }>(); let y = 80;
    for (const act of [...rows.keys()].sort((a, b) => a - b)) { const row = rows.get(act)!.sort((a, b) => goalStart(a) - goalStart(b) || (a.stripOrder ?? 0) - (b.stripOrder ?? 0)); row.forEach((b, i) => place.set(b.id, { x: 80 + i * 300, y })); y += 260; }
    onBeatsChange(beats.map(b => place.has(b.id) ? { ...b, posX: place.get(b.id)!.x, posY: place.get(b.id)!.y } : b));
  };
  // Arrange by sequence (1.17): one row per sequence on the timeline, the sequence's own card first, then the beats
  // inside it in story order; beats in no sequence go in a last row.
  const handleArrangeBySequence = () => {
    if (!beats.length) return; if (!sequenceGroups.length) { setNotice('No sequences on the timeline yet. Add elements to a Sequences lane first.'); return; }
    record();
    const goalStart = (b: BeatCard) => { const g = goals[b.id]; return g ? parseFloat(g) : Infinity; }, byId = new Map(beats.map(b => [b.id, b])), used = new Set<string>(), place = new Map<string, { x: number; y: number }>(); let y = 80;
    const row = (ids: string[]) => { ids.forEach((id, i) => place.set(id, { x: 80 + i * 300, y })); y += 260; };
    for (const g of sequenceGroups) { const members = g.members.map(id => byId.get(id)).filter((b): b is BeatCard => !!b && !used.has(b.id) && b.id !== g.beatId).sort((a, b) => goalStart(a) - goalStart(b) || (a.stripOrder ?? 0) - (b.stripOrder ?? 0)); const ids = [...(g.beatId && byId.has(g.beatId) ? [g.beatId] : []), ...members.map(b => b.id)]; ids.forEach(id => used.add(id)); if (ids.length) row(ids); }
    const rest = beats.filter(b => !used.has(b.id)).sort((a, b) => goalStart(a) - goalStart(b) || (a.stripOrder ?? 0) - (b.stripOrder ?? 0)); if (rest.length) row(rest.map(b => b.id));
    onBeatsChange(beats.map(b => place.has(b.id) ? { ...b, posX: place.get(b.id)!.x, posY: place.get(b.id)!.y } : b)); setNotice('Arranged in ' + sequenceGroups.length + ' sequence' + (sequenceGroups.length === 1 ? '' : 's'));
  };
  // Saved views (1.17): a named arrangement of the board (card positions, zoom, pan and filter), kept in the document.
  const [viewsOpen, setViewsOpen] = useState(false);
  const [viewName, setViewName] = useState('');
  const [renamingView, setRenamingView] = useState<string | null>(null);
  const snapshot = () => ({ positions: Object.fromEntries(beats.map(b => [b.id, { x: b.posX, y: b.posY }])), zoom, pan: { ...pan }, filter });
  const saveView = () => { const name = viewName.trim() || 'View ' + (views.length + 1); onViewsChange?.([...views, { id: 'view-' + crypto.randomUUID(), name, createdAt: new Date().toISOString(), ...snapshot() }]); setViewName(''); setNotice('Saved view “' + name + '”'); };
  const showView = (v: BeatBoardView) => {
    const moved = beats.some(b => v.positions[b.id] && (v.positions[b.id].x !== b.posX || v.positions[b.id].y !== b.posY));
    if (moved) { record(); onBeatsChange(beats.map(b => v.positions[b.id] ? { ...b, posX: v.positions[b.id].x, posY: v.positions[b.id].y } : b)); }
    setZoom(v.zoom); setPan(v.pan); setFilter(v.filter); setNotice('View “' + v.name + '”'); setViewsOpen(false);
  };
  const copySelected = () => { clipboard.current = beats.filter(b => selectedCardIds.includes(b.id)); if (clipboard.current.length) setNotice(clipboard.current.length + ' beat' + (clipboard.current.length === 1 ? '' : 's') + ' copied'); };
  const pasteBeats = (at?: { x: number; y: number }) => {
    if (!clipboard.current.length) return; record();
    const minX = Math.min(...clipboard.current.map(b => b.posX)), minY = Math.min(...clipboard.current.map(b => b.posY));
    const copies = clipboard.current.map(b => ({ ...b, id: 'beat-' + crypto.randomUUID(), sceneId: undefined, posX: (at ? at.x : minX + 40) + b.posX - minX, posY: (at ? at.y : minY + 40) + b.posY - minY }));
    onBeatsChange([...beats, ...copies]); setSelectedCardIds(copies.map(b => b.id));
  };
  const deleteSelected = () => { if (!selectedCardIds.length) return; record(); const ids = new Set(selectedCardIds); onBeatsChange(beats.filter(b => !ids.has(b.id))); onFlowLinesChange(flowLines.filter(l => !ids.has(l.fromId) && !ids.has(l.toId))); setSelectedCardIds([]); };
  const recolor = (id: string, color: string) => { record(); onBeatsChange(beats.map(b => b.id === id || selectedCardIds.includes(id) && selectedCardIds.includes(b.id) ? { ...b, color } : b)); };
  const canvasPoint = (clientX: number, clientY: number) => { const r = canvasRef.current!.getBoundingClientRect(); return { x: Math.round(((clientX - r.left - pan.x) / zoom) / 20) * 20, y: Math.round(((clientY - r.top - pan.y) / zoom) / 20) * 20 }; };
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(''), 2600); return () => clearTimeout(t); }, [notice]);

  // Helper to calculate flow line endpoints between cards
  const getLineCoordinates = (line: FlowLine) => {
    const fromCard = beats.find((b) => b.id === line.fromId);
    const toCard = beats.find((b) => b.id === line.toId);
    if (!fromCard || !toCard) return null;

    const fromSize = resizePreview?.id === fromCard.id ? resizePreview : measuredSizes[fromCard.id];
    const toSize = resizePreview?.id === toCard.id ? resizePreview : measuredSizes[toCard.id];
    const fromWidth = fromSize?.width || beatWidth(fromCard.width);
    const fromHeight = fromSize?.height || beatHeight(fromCard.height) || 200;
    const toWidth = toSize?.width || beatWidth(toCard.width);
    const toHeight = toSize?.height || beatHeight(toCard.height) || 200;

    const from = posOf(fromCard), to = posOf(toCard);
    const startX = from.x + fromWidth;
    const startY = from.y + fromHeight / 2;
    const endX = to.x;
    const endY = to.y + toHeight / 2;

    const midX = (startX + endX) / 2;

    return {
      path: `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`,
      midX,
      midY: (startY + endY) / 2,
    };
  };

  return (
    <div
      className="dc-beatboard flex-1 bg-[#14141a] dc-bg-workspace flex flex-col overflow-hidden select-none relative"
      tabIndex={0}
      aria-label="Beat Board"
      onKeyDown={e => {
        const inField = !!(e.target as HTMLElement).closest('input, textarea, select'), mod = e.metaKey || e.ctrlKey, key = e.key.toLowerCase();
        // Escape in a card field returns to the board with the card still selected, so the arrow keys move it.
        if (e.key === 'Escape' && inField && (e.target as HTMLElement).closest('[data-beat-id]')) { e.preventDefault(); e.currentTarget.focus(); return; }
        if (!inField && (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) && selectedCardIds.length) { e.preventDefault(); const r = cardsRef.current?.querySelector<HTMLElement>('[data-beat-id="' + selectedCardIds[0] + '"]')?.getBoundingClientRect(); setMenu({ x: r ? r.left + 12 : 60, y: r ? r.top + 24 : 60, beatId: selectedCardIds[0] }); return; }
        if (mod && key === 'z' && !inField) { e.preventDefault(); e.shiftKey ? redoBoard() : undoBoard(); }
        if (!inField && mod && key === 'a') { e.preventDefault(); setSelectedCardIds(beats.map(b => b.id)); }
        if (!inField && mod && key === 'c') { e.preventDefault(); copySelected(); }
        if (!inField && mod && key === 'v') { e.preventDefault(); pasteBeats(); }
        if (!inField && mod && key === 'd') { e.preventDefault(); const card = beats.find(b => b.id === selectedCardIds[0]); if (card) handleDuplicateCard(card); }
        if (!inField && (e.key === 'Delete' || e.key === 'Backspace') && selectedCardIds.length) { e.preventDefault(); deleteSelected(); }
        if (e.key === 'Escape') { resizeRef.current = null; setResizePreview(null); cancelDrag(); setConnectingFromId(null); setViewsOpen(false); }
        // Keyboard access (1.17): arrows move the selected cards by a grid step (Shift: five), one Undo step each;
        // Tab-free card cycling with [ and ].
        if (!inField && !mod && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) && selectedCardIds.length) { e.preventDefault(); const step = e.shiftKey ? 100 : 20, dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0, dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0; record(); onBeatsChange(beats.map(b => selectedCardIds.includes(b.id) ? { ...b, posX: Math.max(0, b.posX + dx), posY: Math.max(0, b.posY + dy) } : b)); setNotice('Moved ' + selectedCardIds.length + ' beat' + (selectedCardIds.length === 1 ? '' : 's')); }
        if (!inField && !mod && (e.key === ']' || e.key === '[') && beats.length) { e.preventDefault(); const order = [...beats].sort((a, b) => a.posY - b.posY || a.posX - b.posX), at = order.findIndex(b => b.id === selectedCardIds[0]), next = order[(at + (e.key === ']' ? 1 : -1) + order.length) % order.length]; setSelectedCardIds([next.id]); setNotice('Selected “' + (next.title || 'Untitled beat') + '”'); }
        if (!inField && !mod && e.key === 'Enter' && selectedCardIds.length === 1) { e.preventDefault(); cardsRef.current?.querySelector<HTMLInputElement>('[data-beat-id="' + selectedCardIds[0] + '"] input[aria-label="Beat title"]')?.focus(); }
      }}
      onPointerMove={handleMouseMove}
      onPointerUp={handleMouseUp}
      onPointerCancel={handleMouseUp}
    >
      {/* Top Floating Toolbar */}
      <div className="dc-toolbar h-11 bg-[#1b1b24]/95 dc-bg-chrome border-b border-white/10 px-4 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-neutral-200 mr-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <span>Beat Board Canvas</span>
            <span className="text-[10px] dc-meta font-mono px-1.5 py-0.2 bg-black/40 text-neutral-400 rounded border border-white/10">
              {beats.length} Beats
            </span>
          </div>

          <button
            onClick={() => handleAddBeat(1)}
            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-md flex items-center gap-1 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Beat</span>
          </button>

          <button
            onClick={() => {
              if (selectedCardIds.length > 0) {
                setConnectingFromId(selectedCardIds[0]);
              } else {
                setNotice('Select the beat the flow line starts from, then choose Connect Flow Line.');
              }
            }}
            className={`px-2.5 py-1 rounded-md flex items-center gap-1 text-xs border transition-colors ${
              connectingFromId
                ? 'bg-blue-600 text-white border-blue-400 animate-pulse'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-white/10'
            }`}
            title="Create Flow Line connection between two beats"
          >
            <Link className="w-3.5 h-3.5 text-blue-400" />
            <span>{connectingFromId ? 'Click Target Beat...' : 'Connect Flow Line'}</span>
          </button>

          <button aria-label="Undo Beat Board change" title="Undo (⌘Z)" disabled={!history.current.ops.length} onClick={undoBoard} className="px-2 py-1 disabled:opacity-30">Undo</button>
          <button aria-label="Redo Beat Board change" title="Redo (⇧⌘Z)" disabled={!history.current.redoOps.length} onClick={redoBoard} className="px-2 py-1 disabled:opacity-30">Redo</button>
          <button aria-label="Undo card resize" disabled={!canUndoResize} onClick={onUndoResize} className="px-2 py-1 disabled:opacity-30">Undo Resize</button>
          <button aria-label="Redo card resize" disabled={!canRedoResize} onClick={onRedoResize} className="px-2 py-1 disabled:opacity-30">Redo Resize</button>
          <button onClick={handleArrangeByAct} title="Arrange beats in one row per act, in story order" className="px-2 py-1">Arrange by Act</button>
          <button onClick={handleArrangeBySequence} title="Arrange beats in one row per sequence on the timeline, in story order" className="px-2 py-1">Arrange by Sequence</button>
          <div className="relative">
            <button type="button" aria-haspopup="dialog" aria-expanded={viewsOpen} onClick={() => setViewsOpen(v => !v)} title="Saved board views" className="px-2 py-1">Board Views{views.length ? ' (' + views.length + ')' : ''}</button>
            {viewsOpen && <div role="dialog" aria-label="Beat Board views" className="dc-beat-views" onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); setViewsOpen(false); } }}>
              <div className="flex gap-1"><input aria-label="New view name" placeholder="View name" value={viewName} onChange={e => setViewName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveView(); } }} />
                <button type="button" onClick={saveView} disabled={!onViewsChange}>Save Current View</button></div>
              {!views.length && <p>No saved views. A view keeps where every card is, the zoom, the position and the filter.</p>}
              <ul aria-label="Saved views">{views.map(v => <li key={v.id}>
                {renamingView === v.id ? <input autoFocus aria-label="View name" defaultValue={v.name} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { e.currentTarget.value = v.name; e.currentTarget.blur(); } }} onBlur={e => { const name = e.currentTarget.value.trim(); setRenamingView(null); if (name && name !== v.name) onViewsChange?.(views.map(x => x.id === v.id ? { ...x, name } : x)); }} />
                  : <button type="button" className="dc-beat-view-name" aria-label={'Show view ' + v.name} onClick={() => showView(v)}>{v.name}</button>}
                <button type="button" aria-label={'Update view ' + v.name} title="Replace this view with the board as it is now" onClick={() => { onViewsChange?.(views.map(x => x.id === v.id ? { ...x, ...snapshot() } : x)); setNotice('Updated view “' + v.name + '”'); }}>Update</button>
                <button type="button" aria-label={'Rename view ' + v.name} onClick={() => setRenamingView(v.id)}>Rename</button>
                <button type="button" aria-label={'Delete view ' + v.name} onClick={() => onViewsChange?.(views.filter(x => x.id !== v.id))}>Delete</button></li>)}</ul>
            </div>}
          </div>
          <input aria-label="Filter beats" placeholder="Filter beats…" value={filter} onChange={e => setFilter(e.target.value)} className="dc-beat-filter" />

          {/* Alignment Tools (when multiple cards selected) */}
          {selectedCardIds.length > 1 && (
            <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-md border border-white/10">
              <button
                onClick={handleAlignRow}
                className="px-2 py-0.5 hover:bg-white/10 rounded text-[11px] text-neutral-300"
                title="Align Selected Beats to Row"
              >
                Align Row
              </button>
              <button
                onClick={handleAlignColumn}
                className="px-2 py-0.5 hover:bg-white/10 rounded text-[11px] text-neutral-300"
                title="Align Selected Beats to Column"
              >
                Align Col
              </button>
              <button
                onClick={handleCascade}
                className="px-2 py-0.5 hover:bg-white/10 rounded text-[11px] text-neutral-300"
                title="Cascade Beats Diagonally"
              >
                Cascade
              </button>
              {selectedCardIds.length > 2 && <><button onClick={() => handleDistribute('x')} className="px-2 py-0.5 hover:bg-white/10 rounded text-[11px] text-neutral-300" title="Space the selected beats evenly from left to right">Distribute Across</button>
              <button onClick={() => handleDistribute('y')} className="px-2 py-0.5 hover:bg-white/10 rounded text-[11px] text-neutral-300" title="Space the selected beats evenly from top to bottom">Distribute Down</button></>}
            </div>
          )}
        </div>

        {/* Right Canvas Utilities: Zoom, Grid Snap */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setSnapToGrid(!snapToGrid)}
            className={`px-2 py-1 rounded-md text-[11px] flex items-center gap-1 border transition-colors ${
              snapToGrid ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-black/30 text-neutral-400 border-white/10'
            }`}
            title="Snap to 20px Grid"
          >
            <Grid className="w-3 h-3" />
            <span>Grid Snap</span>
          </button>

          <div className="flex items-center bg-black/40 rounded-md border border-white/10 px-1 py-0.5">
            <button aria-label="Zoom Out"
              onClick={() => setZoom(Math.max(0.4, zoom - 0.1))}
              className="p-1 hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="px-1 text-[11px] font-mono text-neutral-300 min-w-8 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button aria-label="Zoom In"
              onClick={() => setZoom(Math.min(2.0, zoom + 0.1))}
              className="p-1 hover:text-white"
              title="Zoom In"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>

          <button aria-label="Reset Pan & Zoom"
            onClick={() => {
              setPan({ x: 0, y: 0 });
              setZoom(1.0);
            }}
            className="p-1.5 hover:bg-white/10 rounded text-neutral-400 hover:text-white"
            title="Reset Pan & Zoom"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Interactive Unbounded Canvas */}
      <div
        ref={canvasRef}
        onPointerDown={handleMouseDownCanvas}
        onContextMenu={e => { if (e.target !== canvasRef.current && (e.target as HTMLElement).tagName !== 'svg') return; e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY, at: canvasPoint(e.clientX, e.clientY) }); }}
        className="flex-1 w-full h-full overflow-hidden relative cursor-grab active:cursor-grabbing"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(183,196,223,0.055) 1px, transparent 1px)`,
          backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      >
        {/* Transform Container */}
        <div
          className="absolute inset-0 origin-top-left pointer-events-none"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          {/* SVG Flow Lines Layer */}
          <svg className="absolute inset-0 w-[5000px] h-[5000px] pointer-events-auto overflow-visible">
            <defs>
              <marker
                id="arrow-forward"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#60a5fa" />
              </marker>
              <marker
                id="arrow-reverse"
                viewBox="0 0 10 10"
                refX="2"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 10 1 L 0 5 L 10 9 z" fill="#60a5fa" />
              </marker>
            </defs>

            {flowLines.map((line) => {
              const coords = getLineCoordinates(line);
              if (!coords) return null;
              const isSelected = selectedFlowLineId === line.id;

              return (
                <g key={line.id} onClick={() => setSelectedFlowLineId(line.id)} className="cursor-pointer group">
                  {/* Invisible thicker hit-box */}
                  <path
                    d={coords.path}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="18"
                  />
                  {/* Main Flow line path */}
                  <path
                    d={coords.path}
                    fill="none"
                    stroke={isSelected ? '#f59e0b' : line.color}
                    strokeWidth={isSelected ? '3.5' : '2'}
                    strokeDasharray={line.style === 'plain' ? 'none' : 'none'}
                    markerEnd={line.style === 'forward' || line.style === 'double' ? 'url(#arrow-forward)' : undefined}
                    markerStart={line.style === 'reverse' || line.style === 'double' ? 'url(#arrow-reverse)' : undefined}
                    className="transition-colors group-hover:stroke-amber-400"
                  />
                  {/* Flow Line Label */}
                  {line.label && (
                    <text
                      x={coords.midX}
                      y={coords.midY - 8}
                      fill="#e2e8f0"
                      fontSize="10"
                      fontFamily="sans-serif"
                      textAnchor="middle"
                      className="select-none bg-black/60 px-1 py-0.5"
                    >
                      {line.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Cards Layer */}
          <div ref={cardsRef} className="absolute inset-0 pointer-events-none">
            {beats.map((beat) => {
              const isSelected = selectedCardIds.includes(beat.id);
              const preview = resizePreview?.id === beat.id ? resizePreview : null;
              const cardWidth = preview?.width || beatWidth(beat.width);
              const cardHeight = preview?.height || beatHeight(beat.height);

              return (
                <div
                  key={beat.id}
                  data-beat-id={beat.id}
                  onFocusCapture={() => setSelectedCardIds(ids => ids.includes(beat.id) ? ids : [beat.id])}
                  onPointerDown={(e) => handleCardMouseDown(e, beat)}
                  onContextMenu={e => { if ((e.target as HTMLElement).closest('input, textarea')) return; e.preventDefault(); e.stopPropagation(); if (!selectedCardIds.includes(beat.id)) setSelectedCardIds([beat.id]); setMenu({ x: e.clientX, y: e.clientY, beatId: beat.id }); }}
                  data-filtered={!matches(beat) || undefined}
                  className={`dc-beat-card pointer-events-auto absolute rounded-xl border p-3.5 transition-shadow flex flex-col gap-2 cursor-pointer select-none group ${
                    isSelected
                      ? 'ring-2 ring-amber-400 shadow-2xl border-white/30 z-30'
                      : 'border-white/15 hover:border-white/30 shadow-lg z-10'
                  }`}
                  style={{
                    left: `${posOf(beat).x}px`,
                    top: `${posOf(beat).y}px`,
                    width: `${cardWidth}px`,
                    height: cardHeight ? `${cardHeight}px` : undefined,
                    backgroundColor: '#1f1f2a',
                    borderTopWidth: '4px',
                    borderTopColor: beat.color,
                  }}
                >
                  {/* Card Header & Controls */}
                  <div className="flex items-start justify-between gap-1.5 shrink-0">
                    <input
                      type="text"
                      aria-label="Beat title"
                      value={beat.title}
                      onFocus={() => { editing.current = null; }}
                      onChange={(e) => {
                        if (editing.current !== beat.id + ':title') { record(); editing.current = beat.id + ':title'; }
                        onBeatsChange(
                          beats.map((b) => (b.id === beat.id ? { ...b, title: e.target.value } : b))
                        );
                      }}
                      className="bg-transparent text-xs font-bold text-white focus:outline-none w-full min-w-0 select-text border-b border-transparent focus:border-amber-400/50"
                    />

                    {goals[beat.id] && <span className="dc-beat-goal" title="Goal pages on the timeline"><i>Goal:</i> {goals[beat.id]}</span>}
                    {parents[beat.id] && <span className="dc-beat-parent" title={'Nested inside “' + parents[beat.id] + '” on the timeline'}>↳ {parents[beat.id]}</span>}
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                      <button aria-label="Duplicate Beat (⌘D)"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateCard(beat);
                        }}
                        className="text-neutral-400 hover:text-white p-0.5"
                        title="Duplicate Beat (⌘D)"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button aria-label="Delete Beat"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCard(beat.id);
                        }}
                        className="text-neutral-400 hover:text-red-400 p-0.5"
                        title="Delete Beat"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Card Description */}
                  <textarea
                    rows={3}
                    value={beat.description}
                    aria-label="Beat description"
                    onFocus={() => { editing.current = null; }}
                    onChange={(e) => {
                      if (editing.current !== beat.id + ':description') { record(); editing.current = beat.id + ':description'; }
                      onBeatsChange(
                        beats.map((b) => (b.id === beat.id ? { ...b, description: e.target.value } : b))
                      );
                    }}
                    className="dc-beat-description min-h-0 flex-1 overflow-y-auto select-text bg-black/30 border border-white/5 text-[11px] text-neutral-300 p-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500/50 resize-none font-mono"
                  />

                  {/* Meta Bar: Act + Minutes + Workflow Button */}
                  {beat.sceneId && onJumpToLinkedScene && <button className="text-[10px] text-amber-300 text-left" onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onJumpToLinkedScene(beat.sceneId!)}}>Go to linked scene</button>}
                  <div className="dc-beat-meta flex flex-wrap items-center justify-between gap-1 shrink-0 text-[10px] dc-meta text-neutral-400 pt-1">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-neutral-300">
                        Act {beat.act === 2 ? 'II-A' : beat.act === 3 ? 'II-B' : beat.act === 4 ? 'III' : 'I'}
                      </span>
                      <span>•</span>
                      <Clock className="w-2.5 h-2.5 text-amber-400" />
                      <span>{beat.targetMinutes || 15}m</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSendBeatToScript(beat);
                        }}
                        className="px-2 py-0.5 bg-neutral-800 hover:bg-amber-500 hover:text-black rounded text-[10px] dc-meta font-medium flex items-center gap-1 border border-white/10 transition-colors"
                        title="Transfer this beat into the screenplay as Scene Heading and Action"
                      >
                        <Send className="w-2.5 h-2.5" />
                        <span>Send to Script</span>
                      </button>

                      {/* Color dots */}
                      <div className="flex items-center gap-0.5">
                        {PRESET_COLORS.slice(0, 4).map((c) => (
                          <button
                            key={c}
                            aria-label={'Color ' + c}
                            onClick={(e) => {
                              e.stopPropagation();
                              recolor(beat.id, c);
                            }}
                            className={`w-2 h-2 rounded-full ${
                              beat.color === c ? 'ring-1 ring-white scale-125' : 'opacity-60'
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  {isSelected && (['x', 'y', 'both'] as const).map(axis => <button key={axis}
                    aria-label={axis === 'x' ? 'Resize card width' : axis === 'y' ? 'Resize card height' : 'Resize card width and height'}
                    data-resize-handle={axis} className={`dc-resize-handle dc-resize-${axis}`}
                    onPointerDown={e => beginResize(e, beat, axis)} onPointerMove={moveResize}
                    onPointerUp={e => endResize(e)} onPointerCancel={e => endResize(e, true)} onLostPointerCapture={e => endResize(e, true)}
                    onKeyDown={e => {
                      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
                      e.preventDefault(); e.stopPropagation();
                      const size = measuredSizes[beat.id] || { width: cardWidth, height: cardHeight || 200 };
                      const dimensions = resizedBeat(size.width + (axis !== 'y' ? (e.key === 'ArrowRight' ? 20 : e.key === 'ArrowLeft' ? -20 : 0) : 0), size.height + (axis !== 'x' ? (e.key === 'ArrowDown' ? 20 : e.key === 'ArrowUp' ? -20 : 0) : 0), snapToGrid);
                      recordResize(); onResizeCommit(beat.id, { width: beat.width, height: beat.height }, { width: axis === 'y' ? beat.width : dimensions.width, height: axis === 'x' ? beat.height : dimensions.height });
                    }} />)}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {notice && <div role="status" className="dc-beat-notice">{notice}</div>}
      {menu && (() => {
        const beat = menu.beatId ? beats.find(b => b.id === menu.beatId) : undefined, labels: Record<string, string> = {}, run: Record<string, () => void> = {}, entries: string[] = [];
        const add = (id: string, label: string, fn: () => void) => { entries.push(id); labels[id] = label; run[id] = fn; };
        if (beat) {
          add('bb-duplicate', 'Duplicate', () => handleDuplicateCard(beat)); add('bb-copy', 'Copy', copySelected); add('bb-delete', selectedCardIds.length > 1 ? 'Delete ' + selectedCardIds.length + ' Beats' : 'Delete', deleteSelected); entries.push('separator');
          add('bb-send', 'Send to Script…', () => onSendBeatToScript(beat));
          if (!goals[beat.id] && onPlaceOnTimeline) add('bb-place', 'Place on Timeline', () => onPlaceOnTimeline(beat.id));
          if (beat.sceneId && onJumpToLinkedScene) add('bb-scene', 'Go to Linked Scene', () => onJumpToLinkedScene(beat.sceneId!));
          entries.push('separator'); [1, 2, 3, 4].forEach(act => add('bb-act-' + act, 'Act ' + ['I', 'II-A', 'II-B', 'III'][act - 1], () => { record(); onBeatsChange(beats.map(b => b.id === beat.id || selectedCardIds.includes(b.id) ? { ...b, act } : b)); }));
          entries.push('separator'); PRESET_COLORS.forEach((c, i) => add('bb-color-' + i, '● Color ' + (i + 1), () => recolor(beat.id, c)));
        } else { add('bb-new', 'New Beat Here', () => { record(); const n: BeatCard = { id: 'beat-' + crypto.randomUUID(), title: 'New Story Beat', description: '', act: 1, color: PRESET_COLORS[beats.length % PRESET_COLORS.length], tags: [], posX: menu.at!.x, posY: menu.at!.y, width: 260, viewStyle: 'card' }; onBeatsChange([...beats, n]); setSelectedCardIds([n.id]); }); add('bb-paste', 'Paste', () => pasteBeats(menu.at)); add('bb-all', 'Select All', () => setSelectedCardIds(beats.map(b => b.id))); }
        return <ToolbarMenu x={menu.x} y={menu.y} entries={entries} labels={labels} state={{ elements: [], active: {}, disabled: { 'bb-paste': !clipboard.current.length } }} onClose={() => setMenu(null)} onPick={id => { setMenu(null); run[id]?.(); }} />;
      })()}
      {/* Selected Flow Line Quick Delete */}
      {selectedFlowLineId && (
        <div className="absolute bottom-4 left-6 z-30 bg-[#1e1e28] dc-bg-panel border border-amber-500/40 rounded-xl px-4 py-2 flex items-center gap-3 text-xs shadow-2xl">
          <span className="text-neutral-300 font-medium">Flow Line Selected</span>
          <button
            onClick={() => {
              record(); onFlowLinesChange(flowLines.filter((l) => l.id !== selectedFlowLineId));
              setSelectedFlowLineId(null);
            }}
            className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded-md font-bold"
          >
            Disconnect Flow Line
          </button>
          <button
            onClick={() => setSelectedFlowLineId(null)}
            className="text-neutral-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
