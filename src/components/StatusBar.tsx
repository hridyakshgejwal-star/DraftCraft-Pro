import React, { useCallback, useState } from 'react';
import { ToolbarMenu } from '../workspace/Toolbar';
import { STATUS_ITEMS, type StatusItem } from '../workspace/preferences';
import {
  ScriptViewMode,
  TypewriterPosition,
  SplitScreenMode,
  ElementType,
} from '../types/script';
import { TimerState } from '../types/productivity';
import {
  FileText,
  Eye,
  Type,
  Columns,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Minus,
  Plus,
  Compass,
  Clock,
  Target,
  Flame,
  Play,
  Pause,
} from 'lucide-react';

interface StatusBarProps {
  pageCount: number;
  currentPage: number;
  wordCount: number;
  lineCount: number;
  currentElementType?: ElementType;
  viewMode: ScriptViewMode;
  onChangeViewMode: (mode: ScriptViewMode) => void;
  typewriterMode: boolean;
  onToggleTypewriterMode: () => void;
  splitMode: SplitScreenMode;
  onToggleSplitMode: () => void;
  showFormattingMarks: boolean;
  onToggleFormattingMarks: () => void;
  showRuler: boolean;
  onToggleRuler: () => void;
  zoom: number;
  onZoomChange: (newZoom: number) => void;
  isDarkMode: boolean;
  onToggleAppearance?: () => void;
  timerState?: TimerState;
  onToggleTimer?: () => void;
  onOpenProductivityModal?: () => void;
  todayWordsAdded?: number;
  dailyWordsGoal?: number;
  streakCount?: number;
  showStreak?: boolean;
  /** 1.17: the scene the caret is in ("12" or "12A"), and the number of scenes. */
  sceneNumber?: string;
  sceneCount?: number;
  /** 1.17: items the writer hid (right-click the status bar); saved with the workspace. */
  hidden?: StatusItem[];
  onHiddenChange?: (hidden: StatusItem[]) => void;
}

/** Names shown in the status bar's right-click menu. */
export const STATUS_ITEM_LABELS: Record<StatusItem, string> = {
  page: 'Page Number', scene: 'Scene Number', words: 'Word Count', lines: 'Line Count', element: 'Current Element', timer: 'Sprint Timer',
  goal: 'Daily Goal', streak: 'Writing Streak', appearance: 'Appearance Switch', marks: 'Formatting Marks Button', ruler: 'Ruler Button',
  typewriter: 'Typewriter Button', split: 'Split Button', view: 'View Menu', zoom: 'Zoom',
};
const Dot = () => <span className="text-white/20" aria-hidden>•</span>;
/** Puts a dot between the items that are shown. */
const joined = (nodes: React.ReactNode[]) => nodes.filter(Boolean).flatMap((n, i) => i ? [<Dot key={'d' + i} />, n] : [n]);

export const StatusBar: React.FC<StatusBarProps> = ({
  pageCount,
  currentPage,
  wordCount,
  lineCount,
  currentElementType = 'Action',
  viewMode,
  onChangeViewMode,
  typewriterMode,
  onToggleTypewriterMode,
  splitMode,
  onToggleSplitMode,
  showFormattingMarks,
  onToggleFormattingMarks,
  showRuler,
  onToggleRuler,
  zoom,
  onZoomChange,
  isDarkMode,
  onToggleAppearance,
  timerState,
  onToggleTimer,
  onOpenProductivityModal,
  todayWordsAdded = 0,
  dailyWordsGoal = 1000,
  streakCount = 0,
  showStreak = true,
  sceneNumber,
  sceneCount = 0,
  hidden = [],
  onHiddenChange,
}) => {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const closeMenu = useCallback(() => setMenu(null), []);
  const shown = (item: StatusItem) => !hidden.includes(item);
  const toggle = (item: StatusItem) => onHiddenChange?.(STATUS_ITEMS.filter(i => i === item ? shown(i) : hidden.includes(i)));
  const formatTimerDisplay = (state: TimerState) => {
    const secs = state.mode === 'sprint' ? state.remainingSeconds : state.elapsedSeconds;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const wordsGoalProgress = Math.min(100, Math.round((todayWordsAdded / Math.max(1, dailyWordsGoal)) * 100));

  const timerShown = !!timerState && (shown('timer') || shown('goal') || shown('streak') && showStreak && streakCount > 0);
  return (
    <footer className="dc-statusbar h-6 bg-[#121217] border-t border-white/10 px-3 flex items-center justify-between text-[11px] text-neutral-400 select-none z-20 shrink-0 font-mono no-print"
      aria-label="Status bar" title={onHiddenChange ? 'Right-click to choose what the status bar shows' : undefined}
      onContextMenu={e => { if (!onHiddenChange || (e.target as HTMLElement).closest('select')) return; e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY }); }}>
      {/* Left: document metrics */}
      <div className="flex items-center gap-3">
        {joined([
          shown('page') && <span key="page" data-status-item="page" className="flex items-center gap-1 text-neutral-300"><FileText className="w-3 h-3 text-amber-400" /><span>Page {currentPage} of {pageCount}</span></span>,
          shown('scene') && <span key="scene" data-status-item="scene" title={sceneCount ? 'Scene ' + (sceneNumber || '–') + ' of ' + sceneCount + ' scenes' : 'No scenes yet'}>Scene {sceneNumber || '–'}</span>,
          shown('words') && <span key="words" data-status-item="words">{wordCount.toLocaleString()} Words</span>,
          shown('lines') && <span key="lines" data-status-item="lines">{lineCount} Lines</span>,
          shown('element') && <span key="element" data-status-item="element" className="text-amber-300/80 font-sans font-medium px-1.5 py-0.2 rounded bg-white/5 border border-white/10 text-[10px] dc-meta">{currentElementType}</span>,
        ])}
      </div>

      {/* Middle: writing goals and the sprint timer */}
      {timerState && timerShown && (
        <div className="flex items-center gap-2 bg-black/40 px-2 py-0.5 rounded-full border border-white/10 text-[10px] dc-meta">
          {joined([
            shown('timer') && <div key="timer" data-status-item="timer" className="flex items-center gap-1 text-neutral-300">
              <button aria-label={timerState.isRunning ? 'Pause Timer' : 'Start Timer'} onClick={onToggleTimer} className="p-0.5 hover:text-amber-400 text-neutral-400" title={timerState.isRunning ? 'Pause Timer' : 'Start Timer'}>
                {timerState.isRunning ? <Pause className="w-2.5 h-2.5 fill-current text-amber-400" /> : <Play className="w-2.5 h-2.5 fill-current" />}
              </button>
              <button onClick={onOpenProductivityModal} className={`hover:text-amber-300 transition-colors ${timerState.isRunning ? 'text-amber-400 font-bold' : 'text-neutral-300'}`} title="Click to open Productivity Center">⏱️ {formatTimerDisplay(timerState)}</button>
            </div>,
            shown('goal') && <button key="goal" data-status-item="goal" onClick={onOpenProductivityModal} className="flex items-center gap-1 hover:text-amber-300 transition-colors" title={`Daily Goal: ${todayWordsAdded} of ${dailyWordsGoal} words (${wordsGoalProgress}%)`}>
              <Target className="w-2.5 h-2.5 text-amber-400" /><span>{todayWordsAdded}/{dailyWordsGoal}w ({wordsGoalProgress}%)</span></button>,
            shown('streak') && showStreak && streakCount > 0 && <button key="streak" data-status-item="streak" onClick={onOpenProductivityModal} className="flex items-center gap-0.5 text-orange-400 hover:text-orange-300 font-bold transition-colors" title={`${streakCount}-day writing streak! Click to view statistics`}>
              <Flame className="w-3 h-3 text-orange-400 fill-orange-400" /><span>{streakCount}d</span></button>,
          ])}
        </div>
      )}

      {/* Right: view controls */}
      <div className="flex items-center gap-2 font-sans">
        {joined([
          (shown('appearance') && onToggleAppearance || shown('marks') || shown('ruler')) && <span key="g1" className="flex items-center gap-2">
            {shown('appearance') && onToggleAppearance && <button type="button" data-status-item="appearance" onClick={onToggleAppearance} aria-label={isDarkMode ? 'Switch to Light Appearance' : 'Switch to Dark Appearance'} title={isDarkMode ? 'Switch to Light Appearance' : 'Switch to Dark Appearance'} className="px-1.5 py-0.5 rounded text-[11px] hover:bg-white/5 text-neutral-400">{isDarkMode ? '☀︎' : '☾'}</button>}
            {shown('marks') && <button data-status-item="marks" onClick={onToggleFormattingMarks} aria-label="Toggle Formatting Marks" className={`px-1.5 py-0.5 rounded text-[10px] dc-meta font-mono transition-colors ${showFormattingMarks ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'hover:bg-white/5 text-neutral-400'}`} title="Toggle Formatting Marks (¶ spaces, tabs)">¶</button>}
            {shown('ruler') && <button data-status-item="ruler" aria-label="Toggle Screenplay Margin Ruler" onClick={onToggleRuler} className={`px-1.5 py-0.5 rounded text-[10px] dc-meta transition-colors ${showRuler ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'hover:bg-white/5 text-neutral-400'}`} title="Toggle Screenplay Margin Ruler"><Compass className="w-3 h-3" /></button>}
          </span>,
          (shown('typewriter') || shown('split')) && <span key="g2" className="flex items-center gap-2">
            {shown('typewriter') && <button data-status-item="typewriter" onClick={onToggleTypewriterMode} className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] dc-meta transition-colors ${typewriterMode ? 'bg-amber-500 text-black font-bold shadow-sm' : 'hover:bg-white/10 text-neutral-300'}`} title="Toggle Typewriter Mode (Fixed writing line)"><Type className="w-3 h-3" /><span>Typewriter</span></button>}
            {shown('split') && <button data-status-item="split" onClick={onToggleSplitMode} className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] dc-meta transition-colors ${splitMode !== 'none' ? 'bg-blue-500 text-white font-bold shadow-sm' : 'hover:bg-white/10 text-neutral-300'}`} title="Toggle Split-Screen Workspace (Side-by-side editing)"><Columns className="w-3 h-3" /><span>Split</span></button>}
          </span>,
          shown('view') && <select key="view" data-status-item="view" aria-label="Script view mode" value={viewMode} onChange={(e) => onChangeViewMode(e.target.value as ScriptViewMode)} className="bg-black/50 text-neutral-300 rounded px-1.5 py-0.5 text-[10px] dc-meta border border-white/10 focus:outline-none cursor-pointer">
            <option value="page">Page View</option><option value="normal">Normal View</option><option value="speed">Speed View</option><option value="focus">Focus Mode</option>
          </select>,
          shown('zoom') && <div key="zoom" data-status-item="zoom" className="flex items-center gap-1 bg-black/40 rounded px-1 py-0.5 border border-white/5">
            <button aria-label="Zoom Out" onClick={() => onZoomChange(Math.max(50, zoom - 10))} className="p-0.5 hover:text-white" title="Zoom Out"><Minus className="w-2.5 h-2.5" /></button>
            <span className="w-9 text-center text-[10px] dc-meta font-mono text-neutral-300 select-none">{zoom}%</span>
            <button aria-label="Zoom In" onClick={() => onZoomChange(Math.min(200, zoom + 10))} className="p-0.5 hover:text-white" title="Zoom In"><Plus className="w-2.5 h-2.5" /></button>
          </div>,
        ])}
      </div>
      {menu && onHiddenChange && <ToolbarMenu x={menu.x} y={menu.y} onClose={closeMenu}
        entries={[...STATUS_ITEMS.map(i => 'status:' + i), 'separator', 'status-show-all']}
        labels={{ ...Object.fromEntries(STATUS_ITEMS.map(i => ['status:' + i, STATUS_ITEM_LABELS[i]])), 'status-show-all': 'Show All' }}
        state={{ elements: [], active: Object.fromEntries(STATUS_ITEMS.map(i => ['status:' + i, shown(i)])), disabled: { 'status-show-all': !hidden.length } }}
        onPick={id => { if (id === 'status-show-all') { onHiddenChange([]); setMenu(null); } else toggle(id.slice(7) as StatusItem); }} />}
    </footer>
  );
};
