import type {TableReadProject} from '../tableRead/model';
import type { CharacterRecord, DocumentAssistance } from '../writing/model';
import type { CharacterShortcuts } from '../shortcuts/model';
import type { StoryAnchor, StoryStructure } from '../story/model';

export type ElementType =
  | 'Scene Heading'
  | 'Action'
  | 'Character'
  | 'Parenthetical'
  | 'Dialogue'
  | 'Dual Dialogue'
  | 'Transition'
  | 'Shot'
  | 'General'
  | 'Centered Text'
  | 'Lyrics'
  | 'New Act'
  | 'End of Act'
  | 'Scene Summary'
  | 'Cast List'
  | 'Outline Level 1'
  | 'Outline Level 2'
  | 'Outline Level 3'
  | 'Sequence'
  | 'Note'
  | 'Stage Direction'
  | 'Song Title'
  | 'Comic Page'
  | 'Panel'
  | 'Panel Description'
  | 'Caption'
  | 'Sound Effect'
  | 'Narration'
  | 'User Defined';

export type RevisionTier =
  | 'White'
  | 'Blue'
  | 'Pink'
  | 'Yellow'
  | 'Green'
  | 'Goldenrod'
  | 'Buff'
  | 'Salmon'
  | 'Cherry'
  | 'Second Blue';

export interface RevisionConfig {
  name: RevisionTier;
  colorName: string;
  badgeBg: string;
  badgeText: string;
  borderHex: string;
}

export const REVISION_TIERS: RevisionConfig[] = [
  { name: 'White', colorName: 'White (First Draft)', badgeBg: 'bg-white/10', badgeText: 'text-neutral-200', borderHex: '#ffffff' },
  { name: 'Blue', colorName: 'Blue (1st Revision)', badgeBg: 'bg-blue-500/20', badgeText: 'text-blue-300', borderHex: '#60a5fa' },
  { name: 'Pink', colorName: 'Pink (2nd Revision)', badgeBg: 'bg-pink-500/20', badgeText: 'text-pink-300', borderHex: '#f472b6' },
  { name: 'Yellow', colorName: 'Yellow (3rd Revision)', badgeBg: 'bg-yellow-500/20', badgeText: 'text-yellow-300', borderHex: '#facc15' },
  { name: 'Green', colorName: 'Green (4th Revision)', badgeBg: 'bg-emerald-500/20', badgeText: 'text-emerald-300', borderHex: '#4ade80' },
  { name: 'Goldenrod', colorName: 'Goldenrod (5th Revision)', badgeBg: 'bg-amber-500/20', badgeText: 'text-amber-300', borderHex: '#fbbf24' },
  { name: 'Buff', colorName: 'Buff (6th Revision)', badgeBg: 'bg-orange-500/20', badgeText: 'text-orange-300', borderHex: '#fb923c' },
  { name: 'Salmon', colorName: 'Salmon (7th Revision)', badgeBg: 'bg-rose-500/20', badgeText: 'text-rose-300', borderHex: '#fb7185' },
  { name: 'Cherry', colorName: 'Cherry (8th Revision)', badgeBg: 'bg-red-500/20', badgeText: 'text-red-300', borderHex: '#f87171' },
  { name: 'Second Blue', colorName: '2nd Blue (9th Revision)', badgeBg: 'bg-sky-500/20', badgeText: 'text-sky-300', borderHex: '#38bdf8' },
];

export interface InlineStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  color?: string;
}

export interface TextRun {
  text: string;
  style?: InlineStyle;
  revisionId?: string;
}

export type ScriptNoteColor = 'yellow' | 'blue' | 'rose' | 'emerald' | 'purple' | 'orange';

export type ScriptNoteCategory = 'general' | 'direction' | 'actor' | 'production' | 'vfx';

export interface ScriptNoteTheme {
  name: ScriptNoteColor;
  label: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  accentHex: string;
  dotClass: string;
}

export const SCRIPT_NOTE_THEMES: Record<ScriptNoteColor, ScriptNoteTheme> = {
  yellow: {
    name: 'yellow',
    label: 'Yellow (Editorial)',
    bgClass: 'bg-yellow-500/20',
    borderClass: 'border-yellow-500/50',
    textClass: 'text-yellow-200',
    accentHex: '#eab308',
    dotClass: 'bg-yellow-400',
  },
  blue: {
    name: 'blue',
    label: 'Blue (Directorial)',
    bgClass: 'bg-blue-500/20',
    borderClass: 'border-blue-500/50',
    textClass: 'text-blue-200',
    accentHex: '#3b82f6',
    dotClass: 'bg-blue-400',
  },
  rose: {
    name: 'rose',
    label: 'Pink / Rose (Character & Actor)',
    bgClass: 'bg-rose-500/20',
    borderClass: 'border-rose-500/50',
    textClass: 'text-rose-200',
    accentHex: '#f43f5e',
    dotClass: 'bg-rose-400',
  },
  emerald: {
    name: 'emerald',
    label: 'Green (Production & Props)',
    bgClass: 'bg-emerald-500/20',
    borderClass: 'border-emerald-500/50',
    textClass: 'text-emerald-200',
    accentHex: '#10b981',
    dotClass: 'bg-emerald-400',
  },
  purple: {
    name: 'purple',
    label: 'Purple (VFX & Camera)',
    bgClass: 'bg-purple-500/20',
    borderClass: 'border-purple-500/50',
    textClass: 'text-purple-200',
    accentHex: '#a855f7',
    dotClass: 'bg-purple-400',
  },
  orange: {
    name: 'orange',
    label: 'Orange (Pacing & Rewrite)',
    bgClass: 'bg-orange-500/20',
    borderClass: 'border-orange-500/50',
    textClass: 'text-orange-200',
    accentHex: '#f97316',
    dotClass: 'bg-orange-400',
  },
};

export interface ScriptNote {
  id: string;
  name?: string; // Named note e.g. "Directorial Note", "VFX Cue", "Pacing Note"
  author: string;
  text: string;
  color: ScriptNoteColor;
  category?: ScriptNoteCategory;
  createdAt: string;
  updatedAt?: string;
  paragraphId?: string;
}

export interface ScriptBookmark {
  id: string;
  name: string; // e.g. "Climax Scene", "Act II Midpoint", "Elena's Monologue"
  color: string; // Hex or theme color
  createdAt: string;
  paragraphId?: string;
}

export interface Paragraph {
  images?:import('../production/model').ImagePlacement[];
  revisionMarks?:import('../production/model').RevisionMark[];
  generatedCastSceneId?:string;
  sourceBeatId?:string;
  sourceMarkerId?:string;
  fdxUnknown?:{attributes:Record<string,string>;children:string[]};
  sourcePdfPage?:number;
  sourcePlanningField?:'title'|'description';
  automaticFormattingOmissions?:string[];
  id: string;
  type: ElementType;
  text: string;
  runs?: TextRun[];
  sceneNumber?: string;
  lockedScene?: boolean;
  omitted?: boolean;
  dualGroupId?: string;
  dualColumn?: 1 | 2;
  altDialogue?: string[];
  activeAltIndex?: number;
  revision?: RevisionTier;
  revised?: boolean;
  notes?: ScriptNote[];
  tags?: string[];
  bookmark?: ScriptBookmark | string;
  sceneComment?: string; // Dedicated scene comment/production note distinct from inline notes
  sceneColor?: string; // Section 7.1 & 7.2: Scene Index Card Color
  sceneSummary?: string; // Section 7.1 & 7.2: Scene Synopsis / Summary
  characterExtension?: string;
  customElementLabel?: string;
  elementSource?: 'manual' | 'inferred';
  conversionReview?: string;
  pageBreakBefore?: boolean;
  /** Sentence endings the writer deliberately removed or undid in this paragraph. */
  punctuationOmissions?: string[];
  /** Alignment chosen for this paragraph (Format › Alignment); absent means the element's alignment. */
  align?: 'left' | 'center' | 'right';
}

export type ScriptViewMode = 'page' | 'normal' | 'speed' | 'focus';
export type AppThemeMode = 'light' | 'night' | 'midnight' | 'sepia';
export type SplitScreenMode = 'none' | 'vertical' | 'horizontal';
export type IndexCardSize = 'small' | 'medium' | 'large' | 'wide';
export type TypewriterPosition = 'center' | 'top' | 'bottom';

export interface TitlePage {
  title: string;
  author: string; // Written by
  screenplayBy?: string; // Screenplay by
  storyBy?: string; // Story by
  basedOn: string; // Based on material by
  additionalCredits?: string; // Optional additional credits / Producer / Co-writer
  draftDate: string; // Draft date
  contact: string; // Contact information
  copyright: string; // Copyright notice / WGA #
  customNotes?: string; // Custom notes / bottom text
  includeInPdf?: boolean; // Whether to include title page in PDF export
}

export interface HeaderFooterPosition {
  left: string;
  center: string;
  right: string;
}

export interface HeaderFooterConfig {
  showHeader: boolean;
  showFooter: boolean;
  firstPageHasHeader: boolean;
  firstPageHasFooter: boolean;
  header: HeaderFooterPosition;
  footer: HeaderFooterPosition;
  customLabel?: string;
  dateFormat?: 'MM/DD/YYYY' | 'YYYY-MM-DD' | 'DD Month YYYY' | 'Month DD, YYYY';
}

/** 1.17 saved Beat Board view: card positions, zoom, pan and filter, kept in the document. */
export interface BeatBoardView { id: string; name: string; positions: Record<string, { x: number; y: number }>; zoom: number; pan: { x: number; y: number }; filter: string; createdAt: string }

// 4.1 Beat Board Canvas Models
export interface BeatCard {
  id: string;
  title: string;
  description: string;
  act: number; // 1, 2, 3, 4
  color: string;
  targetMinutes?: number;
  tags: string[];
  posX: number;
  posY: number;
  width?: number;
  height?: number;
  viewStyle?: 'card' | 'sticky' | 'compact' | 'image';
  imageUrl?: string;
  characterId?: string;
  sceneId?: string;
  sequenceId?: string;
  storyline?: string;
  notes?: string;
  stripOrder?: number;
}

export type FlowLineStyle = 'plain' | 'forward' | 'reverse' | 'double';

export interface FlowLine {
  id: string;
  fromId: string;
  toId: string;
  style: FlowLineStyle;
  color: string;
  label?: string;
}

// 4.2 Multi-Lane Outline Models
export type OutlineLaneType = 'act' | 'sequence' | 'scene' | 'character' | 'custom';

export interface OutlineLane {
  id: string;
  name: string;
  type: OutlineLaneType;
  color: string;
  height?: number;
}

export interface OutlineMarker {
  id: string;
  laneId: string;
  title: string;
  description: string;
  startPage: number;
  endPage: number;
  color: string;
  beatId?: string;
  kind?: 'section' | 'act' | 'plot' | 'marker';
  anchor?: StoryAnchor;
  endAnchor?: StoryAnchor;
  visible?: boolean;
  /** 1.17 nested outline elements: the element (in a lane above) this one belongs to. Moving the parent moves it. */
  parentId?: string;
}

export type SceneNumberPlacement = 'left' | 'right' | 'both' | 'none';

export interface ScriptDocument {
  combinedSources?:{sourceId:string;metadata:Record<string,unknown>}[];
  importReport?:{source:string;type:string;sha256?:string;warnings:string[];unsupportedXml?:string[]};
  studio?:import('../production/model').StudioState;
  tableRead?:TableReadProject;
  id: string;
  titlePage: TitlePage;
  paragraphs: Paragraph[];
  currentRevision: RevisionTier;
  productionMode: boolean;
  lockedPages: boolean;
  beats: BeatCard[];
  flowLines: FlowLine[];
  outlineLanes: OutlineLane[];
  outlineMarkers: OutlineMarker[];
  targetScriptPages: number; // e.g. 110 pages standard
  showStructureLines: boolean; // Section 4.3 Structure Lines
  storyStructure?: StoryStructure;
  sceneNumberPlacement: SceneNumberPlacement;
  /** 1.17 (Final Draft 13.3.4): hide a right scene number that would overlap its heading. Off by default. */
  autoHideRightSceneNumbers?: boolean;
  /** 1.17 saved Beat Board views (Final Draft 13 "customizable Beat Board views"). */
  beatBoardViews?: BeatBoardView[];
  showScriptNotes?: boolean; // Section 6: ScriptNotes visibility
  showBookmarks?: boolean; // Section 6: Bookmarks visibility
  showSceneComments?: boolean; // Section 6: Scene comments visibility
  activeAuthor?: string; // Section 6: Current author profile for notes
  themeMode?: AppThemeMode; // Section 7.5: Theme mode
  scriptViewMode?: ScriptViewMode; // Section 7.3: Normal, Page, Speed, Focus
  typewriterMode?: boolean; // Section 7.4: Typewriter mode
  typewriterPosition?: TypewriterPosition;
  typewriterHighlightLine?: boolean;
  showFormattingMarks?: boolean; // Section 7.3: Pilcrows, tab arrows, spaces
  showRuler?: boolean; // Section 7.3: Margin rulers
  splitMode?: SplitScreenMode; // Section 7.3: Split-screen editing
  splitSecondaryView?: 'indexcards' | 'scenes' | 'beatboard' | 'outline';
  characterHighlightMap?: Record<string, string>;
  characterVoiceMap?: Record<string, string>;
  characterTraitsMap?: Record<string, { role?: string; notes?: string }>;
  customNavigatorTabs?: { id: string; name: string; content?: string }[];
  customDictionary?: string[];
  characterMemory?: CharacterRecord[];
  characterShortcuts?: CharacterShortcuts;
  writingAssistance?: DocumentAssistance;
  headerFooterConfig?: HeaderFooterConfig;
  appliedTemplateId?: string;
  documentShortcutProfile?: import('../shortcuts/model').ShortcutProfile;
  writingFormat?: import('../formats/model').WritingFormat;
  smartType?: import('../formats/model').SmartTypePreferences;
  lastSavedAt: string;
}

export interface SmartTypeEntry {
  category: 'character' | 'extension' | 'intro' | 'location' | 'time' | 'transition';
  value: string;
  count: number;
}
