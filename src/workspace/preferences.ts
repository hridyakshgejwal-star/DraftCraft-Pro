// Workspace preferences: how the window is arranged (toolbar, timeline, views, panels, appearance). They belong to the
// writer, not to a screenplay, so they live in this computer's app storage and never change document files.
export type ScriptView = 'page' | 'normal' | 'speed';
export type Appearance = 'system' | 'light' | 'dark' | 'midnight';
export type ToolbarDisplay = 'icon-text' | 'icon' | 'text';
export type SplitLayout = 'none' | 'vertical' | 'horizontal';
export type SplitPane = 'script' | 'cards' | 'scenes' | 'beatboard' | 'outline';
export type TimelineSnap = 'page' | 'eighth' | 'off';
export type ToolbarGroupId = 'document' | 'edit' | 'screenplay' | 'workspace' | 'format' | 'production' | 'tools';
export const TOOLBAR_GROUP_IDS: readonly ToolbarGroupId[] = ['document', 'edit', 'screenplay', 'workspace', 'format', 'production', 'tools'];
export interface ToolbarPreferences {
  items: string[]; display: ToolbarDisplay; size: 'regular' | 'compact'; visible: boolean;
  /** Whole groups taken out of the toolbar at once (their items keep their places and come back when shown). */
  hiddenGroups: ToolbarGroupId[];
}
/** Navigator Scenes tab: cards or a table with resizable columns. Widths are in CSS pixels. */
export type NavigatorColumn = 'number' | 'color' | 'heading' | 'setting' | 'time' | 'length' | 'characters' | 'summary' | 'comment';
export const NAVIGATOR_COLUMNS: readonly NavigatorColumn[] = ['number', 'color', 'heading', 'setting', 'time', 'length', 'characters', 'summary', 'comment'];
export const NAVIGATOR_COLUMN_WIDTHS: Record<NavigatorColumn, number> = { number: 44, color: 40, heading: 190, setting: 72, time: 72, length: 70, characters: 150, summary: 220, comment: 200 };
/** Columns shown by default (1.17 added the colour and scene-comment columns; the comment column starts hidden). */
export const NAVIGATOR_COLUMNS_SHOWN: Record<NavigatorColumn, boolean> = { number: true, color: true, heading: true, setting: true, time: true, length: true, characters: true, summary: true, comment: false };
export const NAVIGATOR_COLUMN_LIMITS = { min: 36, max: 640 };
export interface NavigatorPreferences {
  open: boolean; width: number; sceneView: 'cards' | 'table';
  columns: Record<NavigatorColumn, boolean>; columnWidths: Record<NavigatorColumn, number>;
  /** 1.17: column order in the scene table (every column once). */ columnOrder: NavigatorColumn[];
  /** 1.17: the Scenes sort, kept across relaunches. */ sort: { field: string; asc: boolean };
  /** 1.17: Navigator text size, 0.8–1.5 (1 = normal). */ zoom: number;
}
export const NAVIGATOR_SORT_FIELDS = ['number', 'color', 'heading', 'setting', 'time', 'length', 'characters', 'summary', 'comment'] as const;
/** Navigator text sizes offered by the A− / A+ buttons. */
export const NAVIGATOR_ZOOM_STEPS = [0.8, 0.9, 1, 1.1, 1.25, 1.5] as const;
/** Status bar items that can be shown or hidden (right-click the status bar). */
export const STATUS_ITEMS = ['page', 'scene', 'words', 'lines', 'element', 'timer', 'goal', 'streak', 'appearance', 'marks', 'ruler', 'typewriter', 'split', 'view', 'zoom'] as const;
export type StatusItem = typeof STATUS_ITEMS[number];
/** Structure Lines: drawing settings (the lines themselves are switched on per screenplay). */
export interface StructurePreferences {
  /** Line width in pixels (scene lines are drawn at two thirds of it). */ width: number;
  /** 0.15–1 (scene lines are drawn at 60 % of it). */ opacity: number;
  /** Act, Sequence, Outline, Scene. */ levels: [boolean, boolean, boolean, boolean];
  /** Default colour per level for regions without their own colour; '' keeps the built-in palette. */ colors: [string, string, string, string];
}
export const DEFAULT_STRUCTURE: StructurePreferences = { width: 3, opacity: .92, levels: [true, true, true, true], colors: ['', '', '', ''] };
export interface TimelinePreferences {
  visible: boolean; height: number; pageWidth: number; snap: TimelineSnap; showScript: boolean;
  /** Lanes collapsed to a thin strip, by lane id. */ collapsed: string[];
  /** Last horizontal position, in pages, restored when the timeline opens again. */ scrollPage: number;
  followCaret: boolean;
  /** 1.17 ripple insert: a new element pushes the following elements in its lane to the right. */ ripple: boolean;
}
export interface WorkspacePreferences {
  version: 1; view: ScriptView; focus: boolean; typewriter: boolean; split: SplitLayout; splitPane: SplitPane;
  formattingMarks: boolean; ruler: boolean; appearance: Appearance; paragraphControls: boolean;
  /** Outline Level 1–3 paragraphs (sent from the outline) are shown in the script; hiding them keeps them in the document. */
  showOutlineElements: boolean;
  navigator: NavigatorPreferences; toolbar: ToolbarPreferences; timeline: TimelinePreferences; structure: StructurePreferences;
  /** 1.17: status bar items the writer hid. */ statusBar: { hidden: StatusItem[] };
}
export const WORKSPACE_KEY = 'draftcraft_workspace_v1';
export const DEFAULT_TOOLBAR_ITEMS = ['new', 'open', 'save', 'space', 'undo', 'redo', 'space', 'elements', 'emoji', 'space', 'script', 'beat-board', 'outline-editor', 'timeline', 'navigator', 'views', 'flex', 'title-page', 'find', 'space', 'writing-stats', 'show-hide', 'reports', 'print'];
/** Earlier default toolbars. A toolbar still exactly on one of them follows the current default, so it gains new
 * buttons (1.18: Emoji); a toolbar the writer customised is kept as it is. */
const PREVIOUS_DEFAULT_TOOLBARS = [DEFAULT_TOOLBAR_ITEMS.filter(id => id !== 'emoji')];
const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((id, i) => id === b[i]);
export const DEFAULT_WORKSPACE: WorkspacePreferences = {
  version: 1, view: 'page', focus: false, typewriter: false, split: 'none', splitPane: 'cards', formattingMarks: false, ruler: false,
  appearance: 'dark', paragraphControls: false, showOutlineElements: true,
  navigator: { open: true, width: 300, sceneView: 'cards', columns: { ...NAVIGATOR_COLUMNS_SHOWN }, columnWidths: { ...NAVIGATOR_COLUMN_WIDTHS }, columnOrder: [...NAVIGATOR_COLUMNS], sort: { field: 'number', asc: true }, zoom: 1 },
  toolbar: { items: DEFAULT_TOOLBAR_ITEMS, display: 'icon-text', size: 'regular', visible: true, hiddenGroups: [] },
  timeline: { visible: true, height: 204, pageWidth: 56, snap: 'eighth', showScript: true, collapsed: [], scrollPage: 0, followCaret: true, ripple: true },
  structure: DEFAULT_STRUCTURE,
  statusBar: { hidden: [] },
};
const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T => allowed.includes(value as T) ? value as T : fallback;
const num = (value: unknown, min: number, max: number, fallback: number) => typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
const bool = (value: unknown, fallback: boolean) => typeof value === 'boolean' ? value : fallback;
export function normalizeWorkspace(value: unknown, known?: Set<string>): WorkspacePreferences {
  const v = value && typeof value === 'object' ? value as Record<string, any> : {};
  const d = DEFAULT_WORKSPACE, t = v.toolbar || {}, l = v.timeline || {}, n = v.navigator || {}, st = v.structure || {};
  const cols = n.columns || {}, widths = n.columnWidths || {};
  const color = (c: unknown) => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c) ? c.toLowerCase() : '';
  const saved = Array.isArray(t.items) ? t.items.filter((id: unknown) => typeof id === 'string' && (!known || known.has(id) || id === 'space' || id === 'flex')).slice(0, 80) : d.toolbar.items;
  const items = PREVIOUS_DEFAULT_TOOLBARS.some(p => sameList(saved, p)) ? [...DEFAULT_TOOLBAR_ITEMS] : saved;
  return {
    version: 1, view: pick(v.view, ['page', 'normal', 'speed'] as const, d.view), focus: bool(v.focus, d.focus), typewriter: bool(v.typewriter, d.typewriter),
    split: pick(v.split, ['none', 'vertical', 'horizontal'] as const, d.split), splitPane: pick(v.splitPane, ['script', 'cards', 'scenes', 'beatboard', 'outline'] as const, d.splitPane),
    formattingMarks: bool(v.formattingMarks, d.formattingMarks), ruler: bool(v.ruler, d.ruler), appearance: pick(v.appearance, ['system', 'light', 'dark', 'midnight'] as const, d.appearance),
    paragraphControls: bool(v.paragraphControls, d.paragraphControls), showOutlineElements: bool(v.showOutlineElements, d.showOutlineElements),
    navigator: { open: bool(n.open, d.navigator.open), width: num(n.width, 220, 640, d.navigator.width), sceneView: pick(n.sceneView, ['cards', 'table'] as const, d.navigator.sceneView),
      columns: Object.fromEntries(NAVIGATOR_COLUMNS.map(c => [c, bool(cols[c], NAVIGATOR_COLUMNS_SHOWN[c])])) as Record<NavigatorColumn, boolean>,
      columnWidths: Object.fromEntries(NAVIGATOR_COLUMNS.map(c => [c, Math.round(num(widths[c], NAVIGATOR_COLUMN_LIMITS.min, NAVIGATOR_COLUMN_LIMITS.max, NAVIGATOR_COLUMN_WIDTHS[c]))])) as Record<NavigatorColumn, number>,
      columnOrder: columnOrder(n.columnOrder),
      sort: { field: pick(n.sort?.field, NAVIGATOR_SORT_FIELDS, 'number'), asc: bool(n.sort?.asc, true) },
      zoom: Math.round(num(n.zoom, .8, 1.5, 1) * 100) / 100 },
    toolbar: { items: dedupe(items), display: pick(t.display, ['icon-text', 'icon', 'text'] as const, d.toolbar.display), size: pick(t.size, ['regular', 'compact'] as const, d.toolbar.size), visible: bool(t.visible, d.toolbar.visible),
      hiddenGroups: Array.isArray(t.hiddenGroups) ? TOOLBAR_GROUP_IDS.filter(g => t.hiddenGroups.includes(g)) : [] },
    timeline: { visible: bool(l.visible, d.timeline.visible), height: num(l.height, 72, 520, d.timeline.height), pageWidth: num(l.pageWidth, 4, 640, d.timeline.pageWidth), snap: pick(l.snap, ['page', 'eighth', 'off'] as const, d.timeline.snap), showScript: bool(l.showScript, d.timeline.showScript), collapsed: Array.isArray(l.collapsed) ? l.collapsed.filter((x: unknown) => typeof x === 'string').slice(0, 100) : [], scrollPage: num(l.scrollPage, 0, 100000, 0), followCaret: bool(l.followCaret, d.timeline.followCaret) , ripple: bool(l.ripple, true) },
    statusBar: { hidden: Array.isArray(v.statusBar?.hidden) ? STATUS_ITEMS.filter(i => v.statusBar.hidden.includes(i)) : [] },
    structure: { width: num(st.width, 1, 8, d.structure.width), opacity: num(st.opacity, .15, 1, d.structure.opacity),
      levels: [0, 1, 2, 3].map(i => bool(Array.isArray(st.levels) ? st.levels[i] : undefined, true)) as StructurePreferences['levels'],
      colors: [0, 1, 2, 3].map(i => color(Array.isArray(st.colors) ? st.colors[i] : '')) as StructurePreferences['colors'] },
  };
}
/** Every column exactly once: known columns in the saved order, then any missing ones in their default place. */
function columnOrder(value: unknown): NavigatorColumn[] {
  const saved = Array.isArray(value) ? value.filter((c, i, a): c is NavigatorColumn => NAVIGATOR_COLUMNS.includes(c as NavigatorColumn) && a.indexOf(c) === i) : [];
  return [...saved, ...NAVIGATOR_COLUMNS.filter(c => !saved.includes(c))];
}
// Commands appear once in the toolbar; spaces may repeat.
function dedupe(items: string[]) { const seen = new Set<string>(); return items.filter(id => id === 'space' || id === 'flex' || (!seen.has(id) && !!seen.add(id))); }
export function loadWorkspace(known?: Set<string>): WorkspacePreferences {
  try { return normalizeWorkspace(JSON.parse(localStorage.getItem(WORKSPACE_KEY) || 'null'), known); } catch { return structuredClone(DEFAULT_WORKSPACE); }
}
export function saveWorkspace(value: WorkspacePreferences) { try { localStorage.setItem(WORKSPACE_KEY, JSON.stringify(value)); } catch { /* Storage unavailable: preferences last for this session. */ } }
