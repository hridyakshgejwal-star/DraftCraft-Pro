import {expandMacro,triggerMacro} from '../production/macros';
import {commitActiveTake,takeOperation} from '../production/model';
import {FragmentTextarea,inputForOffset,flushFragmentPositions,isFieldScroll} from '../production/FragmentTextarea';
import {deleteSelection,extractSelection,insertParagraphs,joinWithNext,joinWithPrevious,looksLikeScreenplay,ordered,plainTextElements,selectionRanges,spansParagraphs,type CrossSelection,type TextPoint} from '../editor/crossParagraph';
import {hasStyle,toggleStyle,styledRuns,type StyleKey} from '../production/textRuns';
import {browserMeasure} from '../production/layout';
import { hideRightSceneNumber } from '../production/sceneNumbers';
import {clonePageContent,decodePageClipboard,pageClipboardPayload} from '../utils/pageActions';
import type {ReadHighlight} from './AiTableReadModal';
import {useReadingHighlight} from '../tableRead/highlight';
import {STANDARD_FORMAT} from '../formats/catalog';
import {DEFAULT_SMART,elementCss,styleFor,automaticNumbers, type WritingFormat} from '../formats/model';
import {inferElement,headingTab,nextSpeaker,afterDialogue,proseInCue} from '../formats/inference';
import { FormattingToolbar } from './FormattingToolbar';
import { TextMirror } from '../workspace/TextMirror';
import { ScriptRuler } from '../workspace/ScriptRuler';
import { pageSegments, structureSpans, styledSpans, STRUCTURE_NAMES, STRUCTURE_OFFSETS, DEFAULT_STRUCTURE_STYLE, type StructureStyle } from '../story/structure';
import { StoryPanels, type StorySelection } from './StoryTools';
import { EditorCaret } from './EditorCaret';
import { capitalizeInsertion, effectivePreferences, type EditorPreferences } from '../editor/preferences';
import {typedState,replaceState,upperState,completeElement,convertElement,parentheticalState,canSkipParentheticalClose,headingCandidate,sceneIntro,transitionName,transitionEnding,omitFormatting,removedFormatting} from '../editor/automaticFormatting';
import type { StoryIndex } from '../story/model';
import type { ScriptDocument } from '../types/script';
import { ScreenplayCommandPalette } from './ScreenplayCommandPalette';
import { assignment, characterCommands, COMMANDS, displayShortcut, elementCommand, ELEMENTS, enterParagraph, insertCommand, matchesShortcut, resolveCommand, defaultProfile, professionalProfile, type ShortcutCommand, type CharacterShortcuts, type ShortcutProfile } from '../shortcuts/model';
import { usePageActions, type TextMenuSection } from './PageActions';
import { UIPresence, scrollMotion } from './ui/Presentation';
import React, { useRef, useState, useEffect, useMemo, useLayoutEffect, useCallback } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { characterName, characterVocabulary, normalizeWord, suggestCharacters, type CharacterRecord, type DocumentAssistance, type WritingSettings } from '../writing/model';
import { boundaryCorrection, customReplacement, distance, enterCorrection, matchCase, wordsIn, type Correction } from '../writing/spelling';
import { useWordAlternatives } from '../writing/useWordAlternatives';
import { applyWordEdits, replaceRuns, establishedCharacterWord, type Alternative, type SynonymResult, type WordContext } from '../writing/wordSuggestions';
import { useSpelling } from '../writing/useSpelling';
import {warmPunctuationAnalysis,punctuationEdit,punctuatedParagraph,removedPunctuation,addPunctuationOmission,DEFAULT_PUNCTUATION,type PunctuationContext} from '../writing/punctuation';
import { SpellingLayer, spellingWordAt, editorWordAt } from './SpellingLayer';
import { SpellingPopover, type SpellingTarget } from './SpellingPopover';
import {
  Paragraph,
  ElementType,
  RevisionTier,
  REVISION_TIERS,
  ScriptNote,
  ScriptBookmark,
  SceneNumberPlacement,
  SCRIPT_NOTE_THEMES,
  ScriptViewMode,
  AppThemeMode,
  TypewriterPosition,
} from '../types/script';
import { paginateScript } from '../utils/pagination';
import {
  buildSmartTypeFromScript,
  getSmartTypeSuggestions,
  SmartTypeDictionary,
} from '../utils/smartType';
import { SmartTypePopover } from './SmartTypePopover';
import { NotePopover } from './NotePopover';
import { BookmarkPopover } from './BookmarkPopover';
import {
  MessageSquare,
  Bookmark,
  Plus,
  Trash2,
  Lock,
  Unlock,
  Volume2,
  HelpCircle,
  Copy,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Palette,
  AlignLeft,
  AlignCenter,
  Scissors,
  Eye,
  EyeOff,
  Clapperboard,
  Tag,
  Check,
  Compass,
} from 'lucide-react';

interface ScriptEditorProps {
  collaborativeHistory?:(direction:'undo'|'redo')=>boolean;
  formatTransaction?: {token:string;before:ScriptDocument;after:ScriptDocument;alreadyApplied?:boolean}; onFormatConsumed:()=>void; onDocumentChange:(doc:ScriptDocument,origin?:'undo'|'redo'|'command')=>void;
  storyDocument: ScriptDocument; storyIndex: StoryIndex; editorPreferences: EditorPreferences;
  onStoryUpdate: (document:ScriptDocument)=>void; onEditStory:(selection?:StorySelection,page?:number)=>void;
  onPageStructure:(page:number,command:string)=>void;
  shortcutProfile: ShortcutProfile;
  characterShortcuts: CharacterShortcuts;
  onOpenKeyboardShortcuts: () => void;
  characterMemory: CharacterRecord[];
  writingSettings: WritingSettings;
  documentAssistance?: DocumentAssistance;
  customDictionary: string[];
  onWritingSettingsChange: (settings: WritingSettings) => void;
  onDocumentAssistanceChange: (settings: DocumentAssistance) => void;
  paragraphs: Paragraph[];
  onParagraphsChange: (paragraphs: Paragraph[]) => void;
  activeRevision: RevisionTier;
  productionMode: boolean;
  lockedPages: boolean;
  zoom: number;
  isDarkMode: boolean;
  sceneNumberPlacement?: SceneNumberPlacement;
  /** Hide right scene numbers that would overlap their heading (per document). */
  autoHideRightSceneNumbers?: boolean;
  characterHighlightMap?: Record<string, string>;
  showStructureLines?: boolean;
  /** Width, opacity, levels and default colours of the Structure Lines (View › Show › Structure Line Settings). */
  structureStyle?: StructureStyle;
  showScriptNotes?: boolean;
  showBookmarks?: boolean;
  showSceneComments?: boolean;
  onToggleShowScriptNotes?: () => void;
  onToggleShowBookmarks?: () => void;
  onToggleShowSceneComments?: () => void;
  activeAuthor?: string;
  scriptViewMode?: ScriptViewMode;
  typewriterMode?: boolean;
  typewriterPosition?: TypewriterPosition;
  typewriterHighlightLine?: boolean;
  showFormattingMarks?: boolean;
  showRuler?: boolean;
  themeMode?: AppThemeMode;
  onFocusedParagraphChange?: (paragraph: Paragraph) => void;
  onOpenTableReadSnippet: (text: string, charA?: string, charB?: string, paragraphId?:string) => void;
  readHighlight?:ReadHighlight;
  onOpenResearchSnippet: (text: string) => void;
  onJumpToParagraphId?: (id: string) => void;
  /** Show the per-paragraph controls (element menu, notes, bookmarks…) in the page margin. */
  paragraphControls?: boolean;
  /** Geometry used to draw the editor when it differs from the document format (Speed View). */
  displayFormat?: WritingFormat;
  /** Element types hidden from the editor (they stay in the document); caret movement steps over them. */
  hiddenTypes?: Set<ElementType>;
}

/** 1.17 windowed page rendering. In a long script only the pages near the window are rebuilt when the layout changes;
 * the others keep what they last drew (they are not painted: content-visibility) and are brought up to date in idle
 * time, a few pages at a time. Anything that is about to show or focus a paragraph by its id calls
 * flushPendingPages() first, which brings every page up to date at once. */
const WINDOWED_FROM=40;
let flushPages: (() => void) | null = null;
export function flushPendingPages() { flushPages?.(); }
/** Accessible name of a script field (VoiceOver reads it before the text): the element, and the scene number of a
 * numbered scene heading. The element's position is announced on request (⌃⇧. ), not in the name, so inserting a
 * paragraph does not rename every field after it. */
export const elementLabel=(p:Paragraph)=>(p.type==='User Defined'&&p.customElementLabel?p.customElementLabel:p.type)+(p.type==='Scene Heading'&&p.sceneNumber?', scene '+p.sceneNumber:'');
const SPEED_LABELS:Partial<Record<ElementType,string>>={'Scene Heading':'SCENE','Action':'ACTION','Character':'CHAR','Parenthetical':'PAREN','Dialogue':'DIAL','Dual Dialogue':'DUAL','Transition':'TRANS','Shot':'SHOT','General':'GEN'};
// Elements whose final word Enter may correct. Cues, headings, transitions, shots and lyrics are never corrected.
const ENTER_SPELLING=new Set<ElementType>(['Action','Dialogue','Dual Dialogue','General','Parenthetical','Narration','Caption','Panel Description','Stage Direction']);
function wordOccurrences(paragraphs:Paragraph[],normalized:string){let count=0;for(const p of paragraphs){if(!p.text||!p.text.toLocaleLowerCase('en-US').includes(normalized))continue;for(const w of wordsIn(p.text))if(normalizeWord(w.word)===normalized)count++;}return count;}

export const ScriptEditor: React.FC<ScriptEditorProps> = ({
  collaborativeHistory,formatTransaction,onFormatConsumed,onDocumentChange,storyDocument,storyIndex,editorPreferences:storedEditorPreferences,onStoryUpdate,onEditStory,onPageStructure,
  shortcutProfile,
  characterShortcuts,
  onOpenKeyboardShortcuts,
  paragraphs,
  characterMemory,
  writingSettings,
  documentAssistance,
  customDictionary,
  onWritingSettingsChange,
  onDocumentAssistanceChange,
  onParagraphsChange,
  activeRevision,
  productionMode,
  lockedPages,
  zoom,
  isDarkMode,
  sceneNumberPlacement = 'both',
  autoHideRightSceneNumbers = false,
  characterHighlightMap = {},
  showStructureLines = false,
  structureStyle = DEFAULT_STRUCTURE_STYLE,
  showScriptNotes = true,
  showBookmarks = true,
  showSceneComments = true,
  onToggleShowScriptNotes,
  onToggleShowBookmarks,
  onToggleShowSceneComments,
  activeAuthor = 'Writer',
  scriptViewMode = 'page',
  typewriterMode = false,
  typewriterPosition = 'center',
  typewriterHighlightLine = true,
  showFormattingMarks = false,
  showRuler = false,
  themeMode = 'night',
  onFocusedParagraphChange,
  onOpenTableReadSnippet,
  readHighlight,
  onOpenResearchSnippet,
  onJumpToParagraphId,
  paragraphControls = true,
  displayFormat,
  hiddenTypes,
}) => {
  const format=storyDocument.writingFormat;
  const activeFormat=format || STANDARD_FORMAT;
  // View modes change only how the script is drawn: Page View shows sheets, Normal View continuous text with page
  // breaks marked, Speed View unindented text. Pagination, printing and the timeline always use the real format.
  const scriptView:'page'|'normal'|'speed'=scriptViewMode==='normal'||scriptViewMode==='speed'?scriptViewMode:'page';
  const geometryFormat=displayFormat||activeFormat,presentationMarks=showFormattingMarks;
  const contentWidthPt=(activeFormat.page.width-activeFormat.page.left-activeFormat.page.right)*72;
  // Element styles are stable objects per format; serialize each once instead of once per row per keystroke.
  const styleKeys=useRef(new WeakMap<object,string>());
  const styleKey=(st:object)=>{let k=styleKeys.current.get(st);if(k===undefined){k=JSON.stringify(st);styleKeys.current.set(st,k);}return k;};
  const customNavigation=JSON.stringify(shortcutProfile.navigation)!==JSON.stringify((shortcutProfile.id==='final-draft-inspired'?professionalProfile():defaultProfile()).navigation);
  const useTemplateNavigation=Boolean(format)&&!customNavigation;
  const smartPrefs=storyDocument.smartType || DEFAULT_SMART;
  const [elementSuggestion,setElementSuggestion]=useState<{id:string;type:ElementType;reason:string}|null>(null);
  const knownNames=useMemo(()=>new Set(characterMemory.map(r=>characterName(r.name))),[characterMemory]);
  // Intelligent Auto Formatting off turns every automatic change off; manual formatting is unaffected.
  const editorPreferences=useMemo(()=>effectivePreferences(storedEditorPreferences),[storedEditorPreferences]);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  // Typewriter mode: after typing or moving the caret, scroll so the caret's line sits at the same height (45% of the
  // editor) instead of creeping down the window.
  useEffect(()=>{
    const container=editorContainerRef.current;if(!typewriterMode||!container)return;
    let frame=0;const ghost=document.createElement('div');ghost.setAttribute('aria-hidden','true');Object.assign(ghost.style,{position:'absolute',visibility:'hidden',left:'-100000px',top:'0',whiteSpace:'pre-wrap',overflowWrap:'break-word',height:'auto'});
    const center=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
      const input=document.activeElement;if(!(input instanceof HTMLTextAreaElement)||!input.dataset.editorParagraph||!container.contains(input)||input.selectionStart!==input.selectionEnd)return;
      const css=getComputedStyle(input);for(const key of ['font-family','font-size','font-weight','font-style','line-height','letter-spacing','word-spacing','text-indent','text-transform','text-align','box-sizing','padding-left','padding-right'])ghost.style.setProperty(key,css.getPropertyValue(key));ghost.style.width=input.clientWidth+'px';
      ghost.textContent=input.value.slice(0,input.selectionStart);const mark=document.createElement('span');mark.textContent='\u200b';ghost.append(mark);document.body.append(ghost);
      const scale=input.getBoundingClientRect().height/(input.offsetHeight||1)||1,y=input.getBoundingClientRect().top+(mark.offsetTop-input.scrollTop)*scale;ghost.remove();
      const box=container.getBoundingClientRect(),delta=y-(box.top+container.clientHeight*.45);if(Math.abs(delta)>2)container.scrollTop+=delta;});};
    const events=['input','keyup','click'];for(const e of events)container.addEventListener(e,center);center();
    return()=>{cancelAnimationFrame(frame);for(const e of events)container.removeEventListener(e,center);ghost.remove();};
  },[typewriterMode]);
  const hasPageStory=Object.values(storyDocument.storyStructure?.displays || {}).some(d=>d.enabled && !d.hidden && (d.allPages || d.pages.length));
  const jumpToStoryScene=useCallback((id:string)=>{flushPendingPages();const input=document.getElementById('input-'+id) as HTMLTextAreaElement|null;input?.scrollIntoView({block:'center',behavior:scrollMotion()});input?.focus({preventScroll:true})},[]);
  const storyProps={document:storyDocument,index:storyIndex,onUpdate:onStoryUpdate,onEdit:onEditStory,onJump:jumpToStoryScene};
  const manualCase=useRef(new Set<string>());
  useReadingHighlight(readHighlight,paragraphs);
  const dirtyElements=useRef(new Set<string>());
  const emptyAutomaticPairs=useRef(new Set<string>());
  const formattingSnapshots=useRef(new WeakMap<Paragraph[],{id:string;key:string}>());
  const capitalSnapshots=useRef(new WeakMap<Paragraph[],{id:string;start:number}>());
  const [shortcutMode, setShortcutMode] = useState(false);
  const [paletteParagraphId, setPaletteParagraphId] = useState<string | null>(null);
  const macros=storyDocument.studio?.macros||[];
  const shortcutCommands = useMemo<ShortcutCommand[]>(() => [...COMMANDS, ...characterCommands(characterMemory),...macros.filter(m=>m.enabled).map(m=>({id:'macro:'+m.id,label:m.name,category:'Other' as const}))], [characterMemory,macros]);
  const editorCommandHistory = useRef(new WeakMap<Paragraph[], { before: { id: string; text: string; start: number; end: number }; after: { id: string; text: string; start: number; end: number } }>());
  useEffect(() => setShortcutMode(false), [shortcutProfile.id, shortcutProfile.modeKey]);
  const toolbarSlotRef = useRef<HTMLDivElement>(null);
  const [toolbarId, setToolbarId] = useState<string | null>(null);
  const toolbarHeld = useRef(false);
  const toolbarTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputSelection = useRef<{ id: string; start: number; end: number; direction: 'forward' | 'backward' | 'none' } | null>(null);
  const rememberSelection = (input: HTMLTextAreaElement) => {
    inputSelection.current = { id: input.id, start: input.selectionStart, end: input.selectionEnd, direction: input.selectionDirection };
    announceFormatLater.current(input);
  };
  const announceFormatLater=useRef((_input:HTMLTextAreaElement)=>{});
  const restoreSelection = () => {
    const range = inputSelection.current;
    if (range) requestAnimationFrame(() => {
      const input = document.getElementById(range.id) as HTMLTextAreaElement | null;
      input?.focus({ preventScroll: true }); input?.setSelectionRange(range.start, range.end, range.direction);
    });
  };
  const targetToolbar = (id: string) => {
    if (toolbarTimer.current) clearTimeout(toolbarTimer.current);
    if (!toolbarHeld.current) {
      const active = document.activeElement;
      // A writer moving from the caret to the reserved row passes other lines.
      // Keyboard focus wins over incidental hover throughout that journey.
      setToolbarId(active instanceof HTMLTextAreaElement && active.id.startsWith('input-') ? active.id.slice(6) : id);
    }
  };
  const leaveToolbar = () => {
    if (toolbarTimer.current) clearTimeout(toolbarTimer.current);
    toolbarTimer.current = setTimeout(() => {
      if (toolbarHeld.current) return;
      const focused = document.activeElement;
      setToolbarId(focused instanceof HTMLTextAreaElement && focused.id.startsWith('input-') ? focused.id.slice(6) : null);
    }, 350);
  };
  useEffect(() => () => { if (toolbarTimer.current) clearTimeout(toolbarTimer.current); }, []);
  // Close autocomplete when its viewport anchor changes. Keeping the old
  // fixed coordinate could otherwise place it over a newly scrolled line.
  useEffect(() => {
    const close = (event?: Event) => { if (event?.type === 'scroll' && isFieldScroll(event)) return; setSuggestions([]); setActiveSuggestionParagraphId(null); };
    window.addEventListener('scroll', close, true); window.addEventListener('resize', close);
    const observer = new ResizeObserver(() => close());
    if (editorContainerRef.current) observer.observe(editorContainerRef.current);
    return () => { observer.disconnect(); window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close); };
  }, []);

  const characterSignature = characterMemory.map(r => r.name+'|'+r.aliases.join('|')).join('\0') + paragraphs.filter(p=>p.type==='Character').map(p=>p.text).join('\0');
  const vocabulary = useMemo(() => {
    const words = writingSettings.protectCharacters ? characterVocabulary(characterMemory, paragraphs) : new Set<string>();
    for(const word of [...writingSettings.customWords,...customDictionary,...(documentAssistance?.ignoredWords || [])]) words.add(normalizeWord(word));
    return words;
  },[characterSignature,writingSettings.protectCharacters,writingSettings.customWords,customDictionary,documentAssistance?.ignoredWords]);
  const spelling = useSpelling(paragraphs, writingSettings, vocabulary);
  // Fetch dictionary suggestions for misspellings in the element being typed while the writer types, so Enter can
  // decide on a correction synchronously (no suggestion yet means no correction, never a delayed one).
  useEffect(()=>{const active=document.activeElement;if(!writingSettings.autocorrect||!(active instanceof HTMLTextAreaElement)||!active.dataset.editorParagraph)return;for(const error of (spelling.errors.get(active.dataset.editorParagraph) || []).slice(-3))if(/^[a-z]{5,}$/.test(error.word)&&!spelling.cachedSuggestions(error.word))void spelling.suggest(error.word);},[spelling.errors,writingSettings.autocorrect]);
  const wordAlternatives=useWordAlternatives(writingSettings);
  const currentWordTools=useRef(wordAlternatives);currentWordTools.current=wordAlternatives;
  const [wordSynonyms,setWordSynonyms]=useState<SynonymResult|null>(null);
  const [synonymLoading,setSynonymLoading]=useState(false),[advancedLoading,setAdvancedLoading]=useState(false),[advancedNote,setAdvancedNote]=useState('');
  const currentParagraphs = useRef(paragraphs); currentParagraphs.current = paragraphs;
  const currentPreferences = useRef({writingSettings,vocabulary,documentAssistance}); currentPreferences.current = {writingSettings,vocabulary,documentAssistance};
  const [spellingTarget,setSpellingTarget] = useState<SpellingTarget | null>(null);
  const [spellingSuggestions,setSpellingSuggestions] = useState<string[]>([]);
  const [spellingLoading,setSpellingLoading] = useState(false);
  const spellingRequest = useRef<SpellingTarget | null>(null);
  const composition = useRef(new Set<string>());
  const [draftWord,setDraftWord] = useState<{id:string;text:string;start:number;end:number} | null>(null);
  const lastCorrection = useRef<(Correction & {id:string;after:string;enter?:boolean}) | null>(null);
  const restoredWords = useRef(new Set<string>());
  // Cues the editor created after a speech (not chosen by the writer), and the text of each as typed before automatic
  // capitals, so a cue that turns out to be prose can become Action in the writer's own case, once.
  const contextCues = useRef(new Set<string>());
  const typedCue = useRef(new Map<string,{stored:string;raw:string}>());
  const refinedCues = useRef(new WeakMap<Paragraph[],string>());
  const correctionSnapshots = useRef(new WeakMap<Paragraph[],Correction & {id:string;after:string;enter?:boolean}>());
  const punctuationSnapshots=useRef(new WeakMap<Paragraph[],{id:string;key:string}>());
  const punctuationPreferences=writingSettings.punctuation||DEFAULT_PUNCTUATION;
  useEffect(()=>{
    if(!punctuationPreferences.enabled)return;
    let canceled=false;const warm=()=>{if(!canceled)warmPunctuationAnalysis()};
    if('requestIdleCallback' in window){const id=window.requestIdleCallback(warm,{timeout:2000});return()=>{canceled=true;window.cancelIdleCallback(id)}}
    const id=setTimeout(warm,250);return()=>{canceled=true;clearTimeout(id)};
  },[punctuationPreferences.enabled]);
  const punctuationContext=(type:ElementType,index:number):PunctuationContext=>({element:type,language:format?.language||writingSettings.language,previous:paragraphs.slice(Math.max(0,index-4),index).map(p=>({type:p.type,text:p.text.slice(-600)}))});
  // Return punctuates the finished sentence after a local language analysis (several milliseconds). The same analysis
  // runs while the writer pauses with the caret at the end of an element, so Return usually finds it cached (1.17).
  const warmReturn=useRef<()=>void>(()=>{});
  warmReturn.current=()=>{const el=document.activeElement as HTMLTextAreaElement|null,id=el?.dataset?.editorParagraph;if(!el||!id||el.selectionStart!==el.selectionEnd||el.selectionEnd!==el.value.length)return;
    const index=paragraphs.findIndex(p=>p.id===id),p=paragraphs[index];if(!p||p.text!==el.value)return;
    punctuationEdit(p.text,p.text.length,p.text.length,punctuationContext(p.type,index),punctuationPreferences,p.punctuationOmissions);};
  useEffect(()=>{
    if(!punctuationPreferences.enabled||!punctuationPreferences.onEnter)return;
    const run=()=>{try{warmReturn.current();}catch{/* a cache warm-up only */}};
    if(typeof requestIdleCallback==='function'){const id=requestIdleCallback(run,{timeout:800});return()=>cancelIdleCallback(id);}
    const id=window.setTimeout(run,150);return()=>clearTimeout(id);
  },[paragraphs,punctuationPreferences]);
  const pendingCaret = useRef<{id:string;text:string;start:number;end:number} | null>(null);
  useLayoutEffect(()=>{
    const caret=pendingCaret.current;if(!caret)return;flushFragmentPositions();
    const input=inputForOffset(caret.id,caret.start) as HTMLTextAreaElement | null;
    if(!input || input.value!==caret.text)return;
    pendingCaret.current=null;
    if(toolbarTimer.current){clearTimeout(toolbarTimer.current);toolbarTimer.current=null;}
    toolbarHeld.current=false;setToolbarId(caret.id);
    input.focus({preventScroll:true});input.setSelectionRange(caret.start,caret.end);rememberSelection(input);
  },[paragraphs]);
  const rememberRestoredWord = (word:string) => {
    const normalized=normalizeWord(word);restoredWords.current.add(normalized);
    if(!(documentAssistance?.disabledAutocorrectWords || []).includes(normalized))onDocumentAssistanceChange({version:1,ignoredWords:documentAssistance?.ignoredWords || [],disabledAutocorrectWords:[...(documentAssistance?.disabledAutocorrectWords || []),normalized]});
  };
  const spellingErrors = (p:Paragraph) => (spelling.errors.get(p.id) || []).filter(word=>!(draftWord?.id===p.id && draftWord.text===p.text && draftWord.start===word.start && draftWord.end===word.end));
  const closeSpelling = (restore=true) => {
    const target=spellingRequest.current;
    spellingRequest.current=null;setSpellingTarget(null);currentWordTools.current.cancel();
    if(restore && target) {
      const input=document.getElementById('input-'+target.id) as HTMLTextAreaElement | null;
      input?.focus({preventScroll:true});input?.setSelectionRange(target.selection.start,target.selection.end);
    }
  };
  const openSpelling = (id:string,x?:number,y?:number,allowAll=false,keyboard=false,offset?:number) => {
    if(allowAll ? (!writingSettings.synonyms && !writingSettings.suggestions) : (!writingSettings.spellcheck || !writingSettings.suggestions))return false;
    const p=paragraphs.find(p=>p.id===id),input=document.getElementById('input-'+id) as HTMLTextAreaElement|null;
    const hit=allowAll?editorWordAt(id,x,y,offset):spellingWordAt(id,x!,y!);
    if(!hit || !p || !input)return false;
    const error=spellingErrors(p).some(w=>w.start===hit.start && w.end===hit.end && w.word===hit.word);
    if(!allowAll && !error)return false;
    const knownName=establishedCharacterWord(hit.word,characterMemory);
    const protectedReason=p.type==='Character'?'Character names are protected from vocabulary replacement.':p.type==='Scene Heading'?'Scene headings and established locations are protected.':p.type==='Transition'?'Screenplay transitions are protected.':knownName?'This established character name is protected.':p.type==='Shot' && /^(?:CLOSE|UP|WIDE|ANGLE|INSERT|TRACKING|PAN|TILT|DOLLY|ZOOM|ESTABLISHING|INTERCUT|MONTAGE)$/i.test(hit.word)?'This technical shot term is protected.':/^(?:INT|EXT|POV|VFX|OS|VO|CONT|CONTINUED|FADE|CUT)$/i.test(hit.word)?'This screenplay term is protected.':undefined;
    const target:SpellingTarget={id,text:p.text,word:hit.word,start:hit.start,end:hit.end,rect:{top:hit.rect.top,bottom:hit.rect.bottom,left:hit.rect.left,right:hit.rect.right},selection:{start:input.selectionStart,end:input.selectionEnd},keyboard,correct:error?false:null,protectedReason};
    currentWordTools.current.cancel();spellingRequest.current=target;setSpellingTarget(target);setSpellingLoading(true);setSpellingSuggestions([]);setWordSynonyms(null);setSynonymLoading(writingSettings.synonyms);setAdvancedLoading(false);setAdvancedNote('');
    setSuggestions([]);setActiveSuggestionParagraphId(null);
    const index=paragraphIndices.get(id) ?? paragraphs.findIndex(p=>p.id===id);
    const context:WordContext={word:target.word,text:p.text,start:hit.start,end:hit.end,type:p.type,nearby:[paragraphs[index-1]?.text,paragraphs[index+1]?.text].filter(Boolean).join(' ').slice(0,1000),protectedReason};
    void spelling.lookup(target.word).then(async lookup=>{
      if(spellingRequest.current!==target)return;
      const correct=p.type==='Character' || knownName || [...writingSettings.customWords,...customDictionary].some(w=>normalizeWord(w)===normalizeWord(target.word))?true:lookup.correct;
      const allCorrections=correct===false?lookup.corrections.map(word=>matchCase(target.word,word)):[];
      const corrections=writingSettings.suggestions?allCorrections:[];
      setSpellingTarget({...target,correct});setSpellingSuggestions(corrections);setSpellingLoading(false);
      const intended=correct===false?allCorrections[0] || target.word:target.word;
      const results=await currentWordTools.current.query(context,intended);
      if(spellingRequest.current!==target)return;setWordSynonyms(results);setSynonymLoading(false);
      if(writingSettings.advancedAnalysis && !protectedReason && !results.protectedReason){setAdvancedLoading(true);const refined=await currentWordTools.current.advanced(context,intended);if(spellingRequest.current!==target)return;
        if(refined.alternatives.length){const merged=[...refined.alternatives,...results.alternatives];setWordSynonyms({...results,alternatives:merged.filter((a,i)=>merged.findIndex(b=>normalizeWord(b.text)===normalizeWord(a.text))===i)});}
        setAdvancedNote(refined.note);setAdvancedLoading(false);
      }
    });return true;
  };
  useEffect(()=>{
    if(spellingTarget && (paragraphs.find(p=>p.id===spellingTarget.id)?.text!==spellingTarget.text || (!writingSettings.synonyms && !writingSettings.suggestions)))closeSpelling(false);
  },[paragraphs,writingSettings.synonyms,writingSettings.suggestions]);
  useEffect(()=>{
    const close=(event:Event)=>{if(event.target instanceof HTMLElement && event.target.closest('.dc-spelling-popup'))return;if(event.type==='scroll'&&isFieldScroll(event))return;closeSpelling()};
    const outside=(event:PointerEvent)=>{if(!(event.target as HTMLElement).closest('.dc-spelling-popup'))closeSpelling(false)};
    window.addEventListener('scroll',close,true);window.addEventListener('resize',close);document.addEventListener('pointerdown',outside,true);
    return()=>{window.removeEventListener('scroll',close,true);window.removeEventListener('resize',close);document.removeEventListener('pointerdown',outside,true)};
  },[]);
  useEffect(()=>{closeSpelling(false)},[zoom,writingSettings.language,writingSettings.synonyms,writingSettings.contextualAnalysis,writingSettings.vocabularyStyle,writingSettings.advancedAnalysis,writingSettings.leftClickSuggestions]);

  useEffect(()=>{closeSpelling(false);setSuggestions([]);setElementSuggestion(null)},[format]);

  // Undo / Redo History Stacks
  const [history, setHistory] = useState<(Paragraph[]|{document:ScriptDocument})[]>([]);
  const [redoStack, setRedoStack] = useState<(Paragraph[]|{document:ScriptDocument})[]>([]);

  // SmartType Autocomplete State
  const smartTypeSignature = paragraphs.filter(p=>p.type==='Scene Heading' || p.type==='Transition').map(p=>p.id+p.type+p.text).join('\0');
  const characterExtensionKey = useMemo(()=>[...new Set(paragraphs.filter(p=>p.type==='Character').flatMap(p=>p.text.match(/\([^()]*\)/gu) || []).map(value=>value.toLocaleUpperCase('en-US')))].sort().join('\0'),[characterSignature]);
  const smartTypeDict = useMemo(() => {
    const base=buildSmartTypeFromScript(paragraphs.filter(p=>p.type!=='Character'),activeFormat.sceneSeparator);
    const merged={...base,extensions:[...new Set([...base.extensions,...characterExtensionKey.split('\0').filter(Boolean)])]};for(const key of Object.keys(merged) as (keyof SmartTypeDictionary)[])merged[key]=[...new Set([...merged[key],...(smartPrefs.entries[key]||[])])].filter(v=>!(smartPrefs.excluded[key]||[]).includes(v));return merged;
  }, [smartTypeSignature,characterExtensionKey,smartPrefs,activeFormat.sceneSeparator]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [activeSuggestionParagraphId, setActiveSuggestionParagraphId] = useState<string | null>(null);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });

  useEffect(() => { setSuggestions([]); setActiveSuggestionParagraphId(null); }, [zoom]);

  useEffect(() => {
    const outside=(event:PointerEvent)=>{
      const target=event.target as HTMLElement;
      if(!target.closest('.dc-smarttype') && target.id!=='input-'+activeSuggestionParagraphId){setSuggestions([]);setActiveSuggestionParagraphId(null)}
    };
    document.addEventListener('pointerdown',outside,true);
    return()=>document.removeEventListener('pointerdown',outside,true);
  },[activeSuggestionParagraphId]);

  const lastCommitted=useRef<Paragraph[]|null>(null);
  useLayoutEffect(()=>{const source=lastCommitted.current;if(source&&source!==paragraphs&&source.length===paragraphs.length&&source.every((p,i)=>p.id===paragraphs[i].id&&p.text===paragraphs[i].text)){inheritEditHistory(source,paragraphs);lastCommitted.current=null;}},[paragraphs]);
  const historyStudio=useRef(new WeakMap<Paragraph[],ScriptDocument>());
  const updateParagraphsWithHistory = (newParagraphs: Paragraph[], previous = paragraphs) => {
    if(format&&(format.numbering.scenes||format.kind==='comic')){const numbered=automaticNumbers(newParagraphs,format);if(numbered!==newParagraphs){const command=editorCommandHistory.current.get(newParagraphs);if(command){const target=numbered.find(p=>p.id===command.after.id);editorCommandHistory.current.set(numbered,target?{...command,after:{...command.after,text:target.text,start:Math.min(command.after.start,target.text.length),end:Math.min(command.after.end,target.text.length)}}:command);}const formatting=formattingSnapshots.current.get(newParagraphs);if(formatting)formattingSnapshots.current.set(numbered,formatting);const punctuation=punctuationSnapshots.current.get(newParagraphs);if(punctuation)punctuationSnapshots.current.set(numbered,punctuation);const correction=correctionSnapshots.current.get(newParagraphs);if(correction)correctionSnapshots.current.set(numbered,correction);const capital=capitalSnapshots.current.get(newParagraphs);if(capital)capitalSnapshots.current.set(numbered,capital);const caret=pendingCaret.current,target=caret&&numbered.find(p=>p.id===caret.id);if(caret&&target)pendingCaret.current={...caret,text:target.text,start:Math.min(caret.start,target.text.length),end:Math.min(caret.end,target.text.length)};newParagraphs=numbered;}}
    historyStudio.current.set(previous,{...storyDocument,paragraphs:previous});
    setHistory((prev) => [...prev.slice(-30), previous]);
    setRedoStack([]);
    lastCommitted.current=newParagraphs;
    onParagraphsChange(newParagraphs);
  };

  const inheritEditHistory=(original:Paragraph[],next:Paragraph[])=>{const command=editorCommandHistory.current.get(original);if(command)editorCommandHistory.current.set(next,command);const correction=correctionSnapshots.current.get(original);if(correction)correctionSnapshots.current.set(next,correction);const capital=capitalSnapshots.current.get(original);if(capital)capitalSnapshots.current.set(next,capital);const punctuation=punctuationSnapshots.current.get(original);if(punctuation)punctuationSnapshots.current.set(next,punctuation);const formatting=formattingSnapshots.current.get(original);if(formatting)formattingSnapshots.current.set(next,formatting);};
  const handleUndo = () => {
    if(collaborativeHistory?.('undo'))return;
    dirtyElements.current.clear();emptyAutomaticPairs.current.clear();
    if (history.length === 0) return;
    const entry = history[history.length - 1];
    let previous=Array.isArray(entry)?entry:entry.document.paragraphs;
    const punctuation=punctuationSnapshots.current.get(paragraphs);
    if(punctuation){
      const original=previous;previous=previous.map(p=>p.id===punctuation.id?addPunctuationOmission(p,punctuation.key):p);
      const command=editorCommandHistory.current.get(original);if(command)editorCommandHistory.current.set(previous,command);
      const correction=correctionSnapshots.current.get(original);if(correction)correctionSnapshots.current.set(previous,correction);
      const capital=capitalSnapshots.current.get(original);if(capital)capitalSnapshots.current.set(previous,capital);
      const prior=punctuationSnapshots.current.get(original);if(prior)punctuationSnapshots.current.set(previous,prior);const priorFormatting=formattingSnapshots.current.get(original);if(priorFormatting)formattingSnapshots.current.set(previous,priorFormatting);
    }
    const formatting=formattingSnapshots.current.get(paragraphs);
    if(formatting&&Array.isArray(entry)){const original=previous;previous=previous.map(p=>p.id===formatting.id?omitFormatting(p,formatting.key):p);inheritEditHistory(original,previous);}
    const edit = editorCommandHistory.current.get(paragraphs);
    const refined=refinedCues.current.get(paragraphs);if(refined){contextCues.current.delete(refined);typedCue.current.delete(refined);}
    const capital=capitalSnapshots.current.get(paragraphs);if(capital)manualCase.current.add(capital.id+':'+capital.start);
    if (edit) pendingCaret.current = edit.before;
    const correction=correctionSnapshots.current.get(paragraphs);
    if(correction && paragraphs.find(p=>p.id===correction.id)?.text===correction.after){
      if(!correction.custom)rememberRestoredWord(correction.original);lastCorrection.current=null;
      const cursor=correction.start+correction.original.length+correction.delimiter.length;
      pendingCaret.current={id:correction.id,text:previous.find(p=>p.id===correction.id)!.text,start:cursor,end:cursor};
    }
    setSuggestions([]);closeSpelling(false);setDraftWord(null);
    setRedoStack((prev) => [...prev, Array.isArray(entry)?paragraphs:{document:storyDocument}]);
    setHistory((prev) => prev.slice(0, -1));
    if(Array.isArray(entry)){const snapshot=historyStudio.current.get(entry);historyStudio.current.set(paragraphs,storyDocument);if(snapshot)onDocumentChange({...snapshot,paragraphs:previous},'undo');else onParagraphsChange(previous);}else onDocumentChange(entry.document,'undo');
  };

  const handleRedo = () => {
    if(collaborativeHistory?.('redo'))return;
    dirtyElements.current.clear();emptyAutomaticPairs.current.clear();
    if (redoStack.length === 0) return;
    const entry = redoStack[redoStack.length - 1];
    const next=Array.isArray(entry)?entry:entry.document.paragraphs;
    const edit = editorCommandHistory.current.get(next);
    if (edit) pendingCaret.current = edit.after;
    const correction=correctionSnapshots.current.get(next);
    if(correction&&!correction.enter){lastCorrection.current=correction;pendingCaret.current={id:correction.id,text:correction.after,start:correction.cursor,end:correction.cursor};}
    setSuggestions([]);closeSpelling(false);setDraftWord(null);
    setHistory((prev) => [...prev, Array.isArray(entry)?paragraphs:{document:storyDocument}]);
    setRedoStack((prev) => prev.slice(0, -1));
    if(Array.isArray(entry)){const snapshot=historyStudio.current.get(entry);historyStudio.current.set(paragraphs,storyDocument);if(snapshot)onDocumentChange({...snapshot,paragraphs:next},'redo');else onParagraphsChange(next);}else onDocumentChange(entry.document,'redo');
  };

  const consumedFormat=useRef('');
  useEffect(()=>{if(!formatTransaction||consumedFormat.current===formatTransaction.token)return;consumedFormat.current=formatTransaction.token;if(formatTransaction.before.id===storyDocument.id){setHistory(h=>[...h.slice(-30),{document:formatTransaction.before}]);setRedoStack([]);if(!formatTransaction.alreadyApplied)onDocumentChange(formatTransaction.after);}onFormatConsumed();},[formatTransaction]);
  const liveHistory=useRef({handleUndo,handleRedo});liveHistory.current={handleUndo,handleRedo};
  useEffect(()=>{const run=(event:Event)=>{const detail=(event as CustomEvent).detail;if(detail==='undo')liveHistory.current.handleUndo();if(detail==='redo')liveHistory.current.handleRedo();};window.addEventListener('draftcraft-editor-history',run);return()=>window.removeEventListener('draftcraft-editor-history',run)},[]);
  const pages=storyIndex.pages;
  // Right-clicking script text: the page menu also offers styles, notes and the element (run with the clicked text).
  const textActions=(sel:{id:string;start:number;end:number}):TextMenuSection|null=>{const id=sel.id.replace(/^input-/,''),p=currentParagraphs.current.find(v=>v.id===id);if(!p)return null;const any=sel.end>sel.start,style=(k:StyleKey)=>any&&hasStyle(p,sel.start,sel.end,k);
    const types=(['Scene Heading','Action','Character','Parenthetical','Dialogue','Transition','Shot'] as ElementType[]).filter(t=>activeFormat.supported.includes(t));
    return {items:[{id:'bold',label:'Bold',checked:style('bold'),disabled:!any},{id:'italic',label:'Italic',checked:style('italic'),disabled:!any},{id:'underline',label:'Underline',checked:style('underline'),disabled:!any},{id:'insert-note',label:'Insert ScriptNote…'},{id:'insert-bookmark',label:'Insert Bookmark…'},{id:'emoji',label:'Insert Emoji…'},{id:'structure-settings',label:'Structure Line Settings…'}],
      elements:types.map(t=>({id:'el-'+t.toLowerCase().replace(/ /g,'-'),label:t,checked:p.type===t})),
      run:command=>window.dispatchEvent(new CustomEvent('draftcraft-workspace-command',{detail:{id:command,target:{paragraphId:id,start:sel.start,end:sel.end}}}))};};
  const pageActions = usePageActions({ paragraphs, commit: updateParagraphsWithHistory, productionMode, activeRevision, lockedPages, layoutPages:pages, onStoryStructure:onPageStructure, textActions });

  const commitAssistedText = (id:string,text:string,start:number,end=start,previous=paragraphs) => {
    const current=paragraphs.find(p=>p.id===id);const runs=current?typedState(current,text,start,end).runs:undefined;
    const next=paragraphs.map(p=>p.id===id?{...p,text,runs,revised:productionMode?true:p.revised,revision:productionMode?activeRevision:p.revision}:p);
    const correction=lastCorrection.current;
    if(correction?.id===id && correction.after===text)correctionSnapshots.current.set(next,correction);
    pendingCaret.current={id,text,start,end};
    updateParagraphsWithHistory(next,previous);
    setSuggestions([]);setActiveSuggestionParagraphId(null);setDraftWord(null);
  };
  const assistanceCommit = useRef(commitAssistedText); assistanceCommit.current = commitAssistedText;
  const replaceSpelling = (choice:string|Alternative) => {
    const target=spellingRequest.current,p=paragraphs.find(p=>p.id===target?.id);
    if(!target || !p || p.text!==target.text || p.text.slice(target.start,target.end)!==target.word){closeSpelling(false);return;}
    const replacement=typeof choice==='string'?choice:choice.text;
    const edits=typeof choice==='object' && choice.edits?choice.edits:[{start:target.start,end:target.end,text:replacement}];
    const text=applyWordEdits(p.text,edits),runs=replaceRuns(p.runs,p.text,edits);
    const change={...p,text,runs,...(productionMode?{revised:true,revision:activeRevision}:{})};
    const next=paragraphs.map(p=>p.id===target.id?change:p),caret=target.start+replacement.length+edits.filter(e=>e.end<=target.start).reduce((n,e)=>n+e.text.length-(e.end-e.start),0);
    editorCommandHistory.current.set(next,{before:{id:p.id,text:p.text,start:target.selection.start,end:target.selection.end},after:{id:p.id,text,start:caret,end:caret}});
    closeSpelling(false);lastCorrection.current=null;pendingCaret.current={id:p.id,text,start:caret,end:caret};updateParagraphsWithHistory(next);setDraftWord(null);
  };
  const spellingAction = (action:'once'|'document'|'dictionary'|'disable') => {
    const target=spellingRequest.current;if(!target)return;
    if(action==='once')spelling.ignoreOnce(target.id,target.text,target.start);
    if(action==='dictionary')onWritingSettingsChange({...writingSettings,customWords:[...new Set([...writingSettings.customWords,target.word])]});
    if(action==='document' || action==='disable'){
      const preference:DocumentAssistance={version:1,ignoredWords:documentAssistance?.ignoredWords || [],disabledAutocorrectWords:documentAssistance?.disabledAutocorrectWords || []};
      const key=action==='document'?'ignoredWords':'disabledAutocorrectWords';
      onDocumentAssistanceChange({...preference,[key]:[...new Set([...preference[key],normalizeWord(target.word)])]});
    }
    closeSpelling();
  };

  // Group paragraphs into pages using 54-line Hollywood pagination
  const paragraphIndices = useMemo(()=>new Map(paragraphs.map((p,i)=>[p.id,i])),[paragraphs]);

  const handleTextChange = (id: string, newText: string, element: HTMLTextAreaElement, inputType?:string) => {
    if(spellingRequest.current)closeSpelling(false);
    const target = paragraphs.find((p) => p.id === id);
    if (!target) return;
    if(inputType?.startsWith('delete')){
      if(!newText && target.text.length>1){for(const key of manualCase.current)if(key.startsWith(id+':'))manualCase.current.delete(key);}
      else if(target.text.length-newText.length===1){const at=element.selectionStart;const letter=target.text[at];if(letter && /^\p{Lu}$/u.test(letter) && capitalizeInsertion(target.text.slice(0,at),target.text.slice(0,at)+letter.toLocaleLowerCase(),target.type,editorPreferences,'insertText'))manualCase.current.add(id+':'+at);}
    }

    lastCorrection.current=null;
    const composing=composition.current.has(id),typing=!composing&&(!inputType||inputType==='insertText');
    if(typing)dirtyElements.current.add(id);else dirtyElements.current.delete(id);
    if(newText!=='()')emptyAutomaticPairs.current.delete(id);
    const omission=!composing?removedPunctuation(target,newText,inputType):null;
    const formatOmission=!composing?removedFormatting(target,newText):null;
    const at=paragraphIndices.get(id) || 0;
    let inferred=typing?inferElement(newText,target,paragraphs[at-1],activeFormat,knownNames,{enabled:editorPreferences.autoFormatting,characters:editorPreferences.detectCharacters,templateRules:editorPreferences.templateFormatting,ambiguous:editorPreferences.ambiguousSuggestions}):null;
    if(inferred?.type==='Scene Heading'&&!editorPreferences.autoSceneHeadings||inferred?.type==='Transition'&&!editorPreferences.autoTransitions)inferred=null;
    if(typing&&editorPreferences.autoSceneHeadings&&activeFormat.mode!=='manual'&&target.elementSource!=='manual'&&target.type==='Action'&&['screenplay','television'].includes(activeFormat.kind)&&headingCandidate(newText))inferred={type:'Scene Heading',confident:true,reason:'Scene heading prefix'};
    // A cue the editor created after a speech keeps the writer's typed case alongside the automatic capitals; when
    // what is typed is clearly prose (see proseInCue), it becomes Action once, in that case. Undo keeps it a cue.
    let typedRaw:string|undefined;
    if(target.type==='Character'&&contextCues.current.has(id)&&!target.runs){const tracked=typedCue.current.get(id),base=target.text===''?'':tracked?.stored===target.text?tracked.raw:undefined;
      if(base!==undefined&&base.length===target.text.length){let a=0;while(a<target.text.length&&a<newText.length&&target.text[a]===newText[a])a++;let b=0;while(b<target.text.length-a&&b<newText.length-a&&target.text[target.text.length-1-b]===newText[newText.length-1-b])b++;typedRaw=base.slice(0,a)+newText.slice(a,newText.length-b)+base.slice(target.text.length-b);}}
    const refineCue=typing&&!composing&&editorPreferences.contextualFlow&&typedRaw!==undefined&&target.elementSource!=='manual'&&(!inferred||!inferred.confident)&&activeFormat.supported.includes('Action')&&proseInCue(typedRaw)&&!knownNames.has(characterName(typedRaw));
    if(refineCue)inferred={type:'Action',confident:true,reason:'Prose typed into a cue'};
    const nextType=inferred?.confident?inferred.type:target.type;
    setElementSuggestion(inferred&&!inferred.confident?{id,type:inferred.type,reason:inferred.reason}:null);
    let state=refineCue?{text:editorPreferences.autoCapitalize?typedRaw!.replace(/^\p{Ll}/u,c=>c.toLocaleUpperCase()):typedRaw!,start:element.selectionStart,end:element.selectionEnd,runs:undefined}:typedState(target,newText,element.selectionStart,element.selectionEnd);
    if(refineCue){contextCues.current.delete(id);typedCue.current.delete(id);}
    if(typing&&nextType==='Character'&&(!format||format.elements.Character.caps))state=upperState(state);
    if(typedRaw!==undefined&&nextType==='Character'&&state.text.length===typedRaw.length)typedCue.current.set(id,{stored:state.text,raw:typedRaw});else typedCue.current.delete(id);
    const automatic=typing?completeElement({...target,type:nextType},state,activeFormat,editorPreferences,false,smartTypeDict.timesOfDay,element.selectionStart===newText.length&&element.selectionEnd===newText.length):{state,key:undefined};state=automatic.state;
    const capital=typing&&!refineCue?capitalizeInsertion(target.text,newText,nextType,editorPreferences,inputType):null;
    const applyCapital=capital&&!(editorPreferences.preserveManualCase&&manualCase.current.has(id+':'+capital.start));
    if(applyCapital&&state.text===newText)state=replaceState(state,capital!.start,capital!.end,capital!.text.slice(capital!.start,capital!.text.length-(newText.length-capital!.end)));
    const typedBoundary=typing&&inputType==='insertText'&&newText===target.text+' '&&newText.endsWith('  ')&&element.selectionStart===newText.length&&element.selectionEnd===element.selectionStart
      ?punctuationEdit(state.text,state.start,state.end,punctuationContext(nextType,at),punctuationPreferences,target.punctuationOmissions,'typing'):null;
    if(typedBoundary)state=replaceState(state,typedBoundary.at,typedBoundary.at,typedBoundary.mark);
    const processedText=state.text;
    if(!composing)pendingCaret.current={id,text:processedText,start:state.start,end:state.end};
    const next=paragraphs.map(p=>p.id===id?{...p,text:processedText,runs:state.runs,type:nextType,elementSource:inferred?.confident?'inferred' as const:p.elementSource,
      ...(omission?{punctuationOmissions:addPunctuationOmission(p,omission).punctuationOmissions}:{}),
      ...(formatOmission?{automaticFormattingOmissions:omitFormatting(p,formatOmission).automaticFormattingOmissions}:{}),
      revised:productionMode?true:p.revised,revision:productionMode?activeRevision:p.revision}:p);
    if(automatic.key)formattingSnapshots.current.set(next,{id,key:automatic.key});
    if(typedBoundary){
      editorCommandHistory.current.set(next,{before:{id,text:target.text,start:target.text.length,end:target.text.length},after:{id,text:processedText,start:state.start,end:state.end}});
      punctuationSnapshots.current.set(next,{id,key:typedBoundary.key});pendingCaret.current={id,text:processedText,start:state.start,end:state.end};updateParagraphsWithHistory(next);
    }else if(applyCapital){
      const raw=typedState(target,newText,element.selectionStart,element.selectionEnd);
      const before=paragraphs.map(p=>p.id===id?{...p,text:newText,runs:raw.runs}:p);
      editorCommandHistory.current.set(next,{before:{id,text:newText,start:element.selectionStart,end:element.selectionEnd},after:{id,text:processedText,start:state.start,end:state.end}});
      capitalSnapshots.current.set(next,{id,start:capital!.start});pendingCaret.current={id,text:processedText,start:state.start,end:state.end};updateParagraphsWithHistory(next,before);
    }else {
      if(refineCue)refinedCues.current.set(next,id);
      if(processedText!==newText){const range=inputSelection.current?.id==='input-'+id?inputSelection.current:null;editorCommandHistory.current.set(next,{before:{id,text:target.text,start:Math.min(target.text.length,range?.start??element.selectionStart),end:Math.min(target.text.length,range?.end??element.selectionEnd)},after:{id,text:processedText,start:state.start,end:state.end}});pendingCaret.current={id,text:processedText,start:state.start,end:state.end};}
      updateParagraphsWithHistory(next);
    }

    const cursor=element.selectionStart;
    const draft=wordsIn(processedText).find(word=>word.start<cursor && word.end>=cursor);
    setDraftWord(draft && !/\s/u.test(processedText[cursor-1] || '')?{id,text:processedText,start:draft.start,end:draft.end}:null);
    if(composing){setSuggestions([]);return;}
    // SmartType Autocomplete trigger
    if (editorPreferences.smartTypeSuggestions && (nextType === 'Character' || nextType === 'Scene Heading' || nextType === 'Transition')) {
      const rect = element.getBoundingClientRect();
      let suggs = nextType==='Character' && !processedText.includes('(')
        ? (writingSettings.autocomplete?suggestCharacters(characterMemory,processedText,id):[])
        : getSmartTypeSuggestions(nextType, processedText, smartTypeDict,activeFormat.sceneSeparator);
      const category=nextType==='Character'?(processedText.includes('(')?'extensions':'characters'):nextType==='Transition'?'transitions':processedText.includes(activeFormat.sceneSeparator)?'timesOfDay':/^(INT|EXT|I\/E)[.\/]/i.test(processedText)?'locations':'intros';
      if(smartPrefs.disabled.includes(category))suggs=[];
      else {const excluded=new Set(smartPrefs.excluded[category]||[]);suggs=suggs.filter(v=>!excluded.has(v));if(smartPrefs.sort==='alphabetical')suggs.sort();}
      if(target.type==='Character' && !writingSettings.autocomplete){setSuggestions([]);setActiveSuggestionParagraphId(null);return;}
      if(nextType==='Transition'&&editorPreferences.autoTransitions&&activeFormat.transitionPunctuation!=='preserve')suggs=[...new Set(suggs.map(v=>{const name=transitionName(v);return name?name+transitionEnding(activeFormat,name):v}))];
      suggs=suggs.filter(v=>v.trim().toUpperCase()!==processedText.trim().toUpperCase());
      const height = Math.min(224, 34 + suggs.length * 32);
      const bounds = editorContainerRef.current?.getBoundingClientRect();
      const bottom = Math.min(window.innerHeight - 8, bounds?.bottom ?? window.innerHeight);
      const top = Math.max(8, bounds?.top ?? 8);
      const popupTop = rect.bottom + 6 + height <= bottom ? rect.bottom + 6 : rect.top - height - 6;
      if (popupTop < top) { setSuggestions([]); setActiveSuggestionParagraphId(null); return; }
      setPopoverPos({ top: popupTop, left: Math.max(8,Math.min(window.innerWidth-240,rect.left)) });
      setSuggestions(suggs);
      setSelectedSuggestionIndex(0);
      setActiveSuggestionParagraphId(id);
    } else {
      setSuggestions([]);
      setActiveSuggestionParagraphId(null);
    }
  };

  const handleApplySmartTypeSuggestion = (value:string) => {
    const p=paragraphs.find(p=>p.id===activeSuggestionParagraphId);if(!p)return;
    let text:string;
    if(p.type==='Scene Heading'){
      const intro=sceneIntro(p.text),choice=sceneIntro(value),at=activeFormat.sceneSeparator?p.text.lastIndexOf(activeFormat.sceneSeparator):-1;
      if(choice)text=value.slice(choice.end).trim()?value:value.trimEnd()+' '+(intro?p.text.slice(intro.end).trimStart():'');
      else if(at>=0)text=p.text.slice(0,at)+activeFormat.sceneSeparator+value;
      else text=(intro?(editorPreferences.autoSceneHeadings?intro.canonical:intro.raw)+' ':'')+value;
      if(editorPreferences.autoSceneHeadings&&activeFormat.elements['Scene Heading'].caps)text=text.toLocaleUpperCase('en-US');
    }else text=value.startsWith('(')?p.text.split('(')[0].trimEnd()+' '+value:value+(p.text.includes('(')?' '+p.text.slice(p.text.indexOf('(')):'');
    lastCorrection.current=null;commitAssistedText(p.id,text,text.length);
  };

  const commitKeyboardEdit = (next: Paragraph[], beforeId: string, target: Paragraph, start: number, end = start) => {
    const input = document.getElementById('input-' + beforeId) as HTMLTextAreaElement | null;
    const previous = paragraphs.find(p => p.id === beforeId)!;
    const selection = inputSelection.current?.id === 'input-' + beforeId ? inputSelection.current : null;
    const before = { id: beforeId, text: previous.text, start: input?.selectionStart ?? selection?.start ?? 0, end: input?.selectionEnd ?? selection?.end ?? 0 };
    const after = { id: target.id, text: target.text, start, end };
    editorCommandHistory.current.set(next, { before, after }); pendingCaret.current = after;
    lastCorrection.current = null; closeSpelling(false); setSuggestions([]); setActiveSuggestionParagraphId(null);
    updateParagraphsWithHistory(next);
  };
  // ---- Cross-paragraph editing (1.15.3) ------------------------------------
  // Each element is its own textarea; these handlers let the caret and selections
  // cross element boundaries, and join/split/delete/copy/paste whole elements.
  const [crossSel,setCrossSel]=useState<CrossSelection|null>(null);
  const crossRef=useRef<CrossSelection|null>(null);crossRef.current=crossSel;
  const [crossNotice,setCrossNotice]=useState('');
  useEffect(()=>{if(!crossNotice)return;const t=setTimeout(()=>setCrossNotice(''),5000);return()=>clearTimeout(t)},[crossNotice]);
  const activeCross=crossSel&&spansParagraphs(paragraphs,crossSel)?crossSel:null;
  const crossRanges=useMemo(()=>activeCross?new Map(selectionRanges(paragraphs,activeCross).map(r=>[r.id,r] as const)):null,[activeCross,paragraphs]);
  const revisionTier=productionMode?activeRevision:undefined;
  const paragraphLines=(id:string)=>pages.flatMap(pg=>pg.fragments.filter(f=>f.paragraphId===id).flatMap(f=>f.lines));
  const lineIndexAt=(lines:{start:number;end:number}[],offset:number)=>{const i=lines.findIndex(l=>offset>=l.start&&offset<l.end);return i<0?lines.length-1:i;};
  const glyph=(p:Paragraph)=>{const st=styleFor(geometryFormat,p);return browserMeasure('0',st,{...p,runs:undefined},0)||st.size*.6;};
  const indentOf=(p:Paragraph,first:boolean)=>{const st=styleFor(geometryFormat,p);return st.left*72+(first?st.first*72:0);};
  /** Caret target in the adjacent element when moving vertically off the first/last visual line, else null. */
  const verticalTarget=(p:Paragraph,offset:number,dir:-1|1):TextPoint|null=>{
    const lines=paragraphLines(p.id);if(!lines.length)return null;const i=lineIndexAt(lines,offset);if(i+dir>=0&&i+dir<lines.length)return null;
    const at=paragraphIndices.get(p.id);let k=at===undefined?-1:at+dir;while(k>=0&&k<paragraphs.length&&hiddenTypes?.has(paragraphs[k].type))k+=dir;const q=at===undefined?undefined:paragraphs[k];if(!q)return null;
    const x=indentOf(p,!!(lines[i] as {first?:boolean}).first)+(offset-lines[i].start)*glyph(p);
    const target=paragraphLines(q.id),line=dir<0?target.at(-1):target[0];if(!line)return {id:q.id,offset:dir<0?q.text.length:0};
    const col=Math.max(0,Math.round((x-indentOf(q,!!(line as {first?:boolean}).first))/glyph(q)));
    const end=line.end<q.text.length&&/\s/u.test(q.text[line.end-1]||'')?line.end-1:line.end;
    return {id:q.id,offset:Math.min(line.start+col,end)};
  };
  const stepPoint=(pt:TextPoint,key:string):TextPoint|null=>{
    const at=paragraphIndices.get(pt.id);if(at===undefined)return null;const p=paragraphs[at];
    const near=(d:-1|1)=>{let k=at+d;while(k>=0&&k<paragraphs.length&&hiddenTypes?.has(paragraphs[k].type))k+=d;return paragraphs[k];};
    if(key==='ArrowLeft'){const q=near(-1);return pt.offset>0?{id:p.id,offset:pt.offset-1}:q?{id:q.id,offset:q.text.length}:pt;}
    if(key==='ArrowRight'){const q=near(1);return pt.offset<p.text.length?{id:p.id,offset:pt.offset+1}:q?{id:q.id,offset:0}:pt;}
    const lines=paragraphLines(p.id);
    if(key==='Home'||key==='End'){if(!lines.length)return {id:p.id,offset:key==='Home'?0:p.text.length};const l=lines[lineIndexAt(lines,pt.offset)];return {id:p.id,offset:key==='Home'?l.start:l.end};}
    const dir=key==='ArrowUp'?-1:1,cross=verticalTarget(p,pt.offset,dir);if(cross)return cross;
    if(!lines.length)return pt;const i=lineIndexAt(lines,pt.offset),line=lines[i+dir];if(!line)return {id:p.id,offset:dir<0?0:p.text.length};
    return {id:p.id,offset:Math.min(line.start+(pt.offset-lines[i].start),line.end)};
  };
  const moveFocusTo=(pt:TextPoint,anchorOffset?:number)=>{
    const input=inputForOffset(pt.id,pt.offset) as HTMLTextAreaElement|null;if(!input)return;
    input.focus({preventScroll:true});
    if(anchorOffset===undefined)input.setSelectionRange(pt.offset,pt.offset);else input.setSelectionRange(Math.min(anchorOffset,pt.offset),Math.max(anchorOffset,pt.offset),anchorOffset>pt.offset?'backward':'forward');
    rememberSelection(input);input.scrollIntoView({block:'nearest',inline:'nearest'});
  };
  const setCrossFocus=(sel:CrossSelection)=>{
    if(sel.anchor.id===sel.focus.id){setCrossSel(null);moveFocusTo(sel.focus,sel.anchor.offset);return;}
    setCrossSel(sel);moveFocusTo(sel.focus);
  };
  const commitCross=(next:Paragraph[],beforeId:string,caret:TextPoint)=>{
    const target=next.find(p=>p.id===caret.id);if(!target)return;setCrossSel(null);
    if(!paragraphs.some(p=>p.id===beforeId))beforeId=caret.id;
    if(!paragraphs.some(p=>p.id===beforeId)){pendingCaret.current={id:caret.id,text:target.text,start:caret.offset,end:caret.offset};updateParagraphsWithHistory(next);return;}
    commitKeyboardEdit(next,beforeId,target,caret.offset);
  };
  const applyCrossDelete=(sel:CrossSelection,{insert,enter}:{insert?:string;enter?:boolean}={})=>{
    const d=deleteSelection(paragraphs,sel,revisionTier);if(!d)return false;if('blocked' in d){setCrossNotice(d.blocked);return false;}
    let next=d.paragraphs,caret=d.caret;
    if(insert)next=next.map(q=>q.id!==caret.id?q:{...q,text:q.text.slice(0,caret.offset)+insert+q.text.slice(caret.offset),runs:replaceRuns(q.runs,q.text,[{start:caret.offset,end:caret.offset,text:insert}])});
    if(insert)caret={...caret,offset:caret.offset+insert.length};
    if(enter){const r=enterParagraph(next,caret.id,caret.offset,caret.offset,shortcutProfile.navigation,revisionTier);if(r){next=r.paragraphs;caret={id:r.paragraph.id,offset:0};}}
    commitCross(next,sel.focus.id,caret);return true;
  };
  // Where the caret was before Select All, so Escape can return there instead of jumping to the end of the script.
  const selectAllOrigin=useRef<{sel:CrossSelection;caret:TextPoint}|null>(null);
  // The caret before the first Select All press, which only selects the element's text natively.
  const selectAllPre=useRef<{id:string;value:string;offset:number}|null>(null);
  const noteSelectAllStart=(input:HTMLTextAreaElement)=>{const id=input.dataset.editorParagraph;selectAllPre.current=id?{id,value:input.value,offset:input.selectionEnd}:null;};
  const selectWholeScript=()=>{const first=paragraphs[0],last=paragraphs.at(-1);if(!first||!last)return;if(first===last){moveFocusTo({id:last.id,offset:last.text.length},0);return;}
    const a=document.activeElement,id=a instanceof HTMLTextAreaElement?a.dataset.editorParagraph:undefined,pre=selectAllPre.current;selectAllPre.current=null;
    const origin=id&&a instanceof HTMLTextAreaElement?{id,offset:pre&&pre.id===id&&pre.value===a.value&&a.selectionStart===0&&a.selectionEnd===a.value.length?pre.offset:a.selectionStart}:null;
    const whole={anchor:{id:first.id,offset:0},focus:{id:last.id,offset:last.text.length}};selectAllOrigin.current=origin?{sel:whole,caret:origin}:null;setCrossSel(whole);};
  /** Keyboard handling for element boundaries and cross-element selections. Returns true when handled. */
  const handleCrossKey=(e:React.KeyboardEvent<HTMLTextAreaElement>,paragraph:Paragraph,index:number)=>{
    const input=e.currentTarget,mod=e.metaKey||e.ctrlKey,sel=crossRef.current,active=!!sel&&spansParagraphs(paragraphs,sel);
    // Select All: the first press selects the element's text (native); pressing it again
    // once the whole element is selected selects the whole script.
    if(mod&&!e.altKey&&!e.shiftKey&&e.key.toLowerCase()==='a'){if(!active&&(input.selectionStart>0||input.selectionEnd<input.value.length)){noteSelectAllStart(input);return false;}e.preventDefault();selectWholeScript();return true;}
    if(!['Meta','Control','Shift','Alt'].includes(e.key))selectAllPre.current=null;
    if(active){
      const o=ordered(paragraphs,sel!);if(!o){setCrossSel(null);return false;}
      if(e.key==='Escape'){e.preventDefault();const origin=selectAllOrigin.current;setCrossSel(null);selectAllOrigin.current=null;moveFocusTo(origin&&origin.sel===sel?origin.caret:sel!.focus);return true;}
      if(e.shiftKey&&!mod&&!e.altKey&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key)){e.preventDefault();const f=stepPoint(sel!.focus,e.key);if(f)setCrossFocus({anchor:sel!.anchor,focus:f});return true;}
      if(['ArrowLeft','ArrowUp','ArrowRight','ArrowDown'].includes(e.key)&&!e.shiftKey){e.preventDefault();setCrossSel(null);moveFocusTo(['ArrowLeft','ArrowUp'].includes(e.key)?o.start:o.end);return true;}
      if((e.key==='Backspace'||e.key==='Delete')&&!e.altKey){e.preventDefault();applyCrossDelete(sel!);return true;}
      if(e.key==='Enter'&&!mod&&!e.altKey){e.preventDefault();applyCrossDelete(sel!,{enter:true});return true;}
      if(e.key==='Tab'){e.preventDefault();return true;}
      if(mod&&e.key.toLowerCase()==='z'){setCrossSel(null);return false;}
      if(e.key.length===1&&!mod&&!e.nativeEvent.isComposing){e.preventDefault();applyCrossDelete(sel!,{insert:e.key});return true;}
      return false;
    }
    if(mod||e.altKey)return false;
    const start=input.selectionStart,end=input.selectionEnd,backward=input.selectionDirection==='backward',collapsed=start===end;
    if(e.shiftKey&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
      const focus=backward?start:end,anchor=backward?end:start;let next:TextPoint|null=null;
      if(e.key==='ArrowRight'&&focus===paragraph.text.length&&index<paragraphs.length-1)next={id:paragraphs[index+1].id,offset:0};
      if(e.key==='ArrowLeft'&&focus===0&&index>0)next={id:paragraphs[index-1].id,offset:paragraphs[index-1].text.length};
      if(e.key==='ArrowDown'||e.key==='ArrowUp')next=verticalTarget(paragraph,focus,e.key==='ArrowUp'?-1:1);
      if(next){e.preventDefault();setCrossFocus({anchor:{id:paragraph.id,offset:anchor},focus:next});return true;}
      return false;
    }
    if(e.shiftKey||!collapsed)return false;
    if(e.key==='ArrowLeft'&&start===0&&index>0){e.preventDefault();const q=paragraphs[index-1];moveFocusTo({id:q.id,offset:q.text.length});return true;}
    if(e.key==='ArrowRight'&&start===paragraph.text.length&&index<paragraphs.length-1){e.preventDefault();moveFocusTo({id:paragraphs[index+1].id,offset:0});return true;}
    if(e.key==='ArrowUp'||e.key==='ArrowDown'){const t=verticalTarget(paragraph,start,e.key==='ArrowUp'?-1:1);if(t){e.preventDefault();moveFocusTo(t);return true;}return false;}
    if(e.key==='Backspace'&&start===0&&index>0){e.preventDefault();const r=joinWithPrevious(paragraphs,paragraph.id,revisionTier);if(r&&'blocked' in r){setCrossNotice(r.blocked);return true;}if(r)commitCross(r.paragraphs,paragraph.id,r.caret);return true;}
    if(e.key==='Delete'&&start===paragraph.text.length&&index<paragraphs.length-1){e.preventDefault();const r=joinWithNext(paragraphs,paragraph.id,revisionTier);if(r&&'blocked' in r){setCrossNotice(r.blocked);return true;}if(r)commitCross(r.paragraphs,paragraph.id,r.caret);return true;}
    return false;
  };
  const handleCrossCopy=(e:React.ClipboardEvent<HTMLTextAreaElement>,cut:boolean)=>{
    const sel=crossRef.current;if(!sel||!spansParagraphs(paragraphs,sel))return;
    e.preventDefault();const payload=pageClipboardPayload(extractSelection(paragraphs,sel));
    e.clipboardData.setData('text/plain',payload.text);e.clipboardData.setData('text/html',payload.html);
    if(cut)applyCrossDelete(sel);
  };
  const handleCrossPaste=(e:React.ClipboardEvent<HTMLTextAreaElement>,p:Paragraph)=>{
    const html=e.clipboardData.getData('text/html'),text=e.clipboardData.getData('text/plain'),sel=crossRef.current,active=!!sel&&spansParagraphs(paragraphs,sel);
    let content:Paragraph[]|null=null;
    if(html&&/name=["']draftcraft-page["']/i.test(html)){try{content=decodePageClipboard({text,html});}catch(error){setCrossNotice(String((error as Error).message||error));e.preventDefault();return;}}
    else if(/\n[ \t]*\n/u.test(text.replace(/\r\n?/g,'\n'))){if(looksLikeScreenplay(text)){try{content=decodePageClipboard({text});}catch{content=null;}}if(!content)content=plainTextElements(text,p.type);}
    if(!content&&!active)return; // ordinary single-element paste stays native (native undo and IME behavior)
    e.preventDefault();
    let base=paragraphs,caret:TextPoint={id:p.id,offset:e.currentTarget.selectionStart};const selectedEnd=e.currentTarget.selectionEnd;
    if(active){const d=deleteSelection(base,sel!,revisionTier);if(!d)return;if('blocked' in d){setCrossNotice(d.blocked);return;}base=d.paragraphs;caret=d.caret;}
    else if(selectedEnd>caret.offset){const d=deleteSelection(base,{anchor:caret,focus:{id:p.id,offset:selectedEnd}},revisionTier);if(d&&!('blocked' in d)){base=d.paragraphs;caret=d.caret;}}
    const items=content||[{id:'p-'+crypto.randomUUID(),type:p.type,text}];
    const r=insertParagraphs(base,caret,clonePageContent(items,productionMode,activeRevision),revisionTier);if(!r)return;
    commitCross(r.paragraphs,p.id,r.caret);
  };
  const pendingShift=useRef<TextPoint|null>(null);
  const crossLive=useRef({setCrossSel,moveFocusTo});crossLive.current={setCrossSel,moveFocusTo};
  useEffect(()=>{
    let drag:{id:string;anchor:TextPoint|null;active:boolean}|null=null;
    const editorInput=(t:EventTarget|null)=>t instanceof HTMLTextAreaElement&&t.dataset.editorParagraph?t:null;
    const pointAt=(x:number,y:number):TextPoint|null=>{
      const el=document.elementFromPoint(x,y) as HTMLElement|null;const input=editorInput(el)||el?.closest?.('[data-paragraph-id]')?.querySelector<HTMLTextAreaElement>('textarea[data-editor-paragraph]')||null;if(!input)return null;
      const c=(document as Document&{caretPositionFromPoint?:(x:number,y:number)=>{offsetNode:Node;offset:number}|null}).caretPositionFromPoint?.(x,y);
      const r=input.getBoundingClientRect();const offset=c&&c.offsetNode===input?c.offset:y<r.top+r.height/2?Number(input.dataset.fragmentStart||0):Number(input.dataset.fragmentEnd||input.value.length);
      return {id:input.dataset.editorParagraph!,offset};
    };
    const down=(e:PointerEvent)=>{
      if(e.button!==0)return;const input=editorInput(e.target);
      if(!input){if((e.target as HTMLElement|null)?.closest?.('.dc-editor-workspace')&&!(e.target as HTMLElement).closest('button,select,input,[role="dialog"],[role="menu"]'))crossLive.current.setCrossSel(null);return;}
      if(e.shiftKey){const sel=crossRef.current,last=inputSelection.current;const anchor=sel?sel.anchor:last&&last.id.startsWith('input-')?{id:last.id.slice(6),offset:last.direction==='backward'?last.end:last.start}:null;
        // Shift+Click in another element extends the selection across elements (native
        // text controls cannot), so the click is handled here instead of by the browser.
        if(anchor&&anchor.id!==input.dataset.editorParagraph){const pt=pointAt(e.clientX,e.clientY);if(pt){e.preventDefault();pendingShift.current={...anchor};const sel2={anchor,focus:pt};crossLive.current.setCrossSel(sel2);requestAnimationFrame(()=>crossLive.current.moveFocusTo(pt));}}
        return;}
      crossLive.current.setCrossSel(null);const id=input.dataset.editorParagraph!;drag={id,anchor:null,active:false};
      setTimeout(()=>{if(drag&&drag.id===id&&!drag.anchor)drag.anchor={id,offset:input.selectionStart};},0);
    };
    const move=(e:PointerEvent)=>{
      if(!drag||!(e.buttons&1))return;const pt=pointAt(e.clientX,e.clientY);if(!pt||(pt.id===drag.id&&!drag.active))return;
      drag.active=true;const anchor=drag.anchor||{id:drag.id,offset:0};crossLive.current.setCrossSel(pt.id===anchor.id?null:{anchor,focus:pt});
    };
    const up=()=>{
      pendingShift.current=null;
      if(drag?.active){const sel=crossRef.current;if(sel)requestAnimationFrame(()=>crossLive.current.moveFocusTo(sel.focus));}
      drag=null;
    };
    document.addEventListener('pointerdown',down,true);document.addEventListener('pointermove',move,true);document.addEventListener('pointerup',up,true);
    const command=(event:Event)=>{if((event as CustomEvent).detail==='select-all'){const a=document.activeElement;if(a instanceof HTMLTextAreaElement&&a.dataset.editorParagraph){if(!crossRef.current&&(a.selectionStart>0||a.selectionEnd<a.value.length)){liveCross.current.noteSelectAllStart(a);a.select();}else liveCross.current.selectWholeScript();}else if(a instanceof HTMLInputElement||a instanceof HTMLTextAreaElement)a.select();else document.execCommand('selectAll');}};
    window.addEventListener('draftcraft-editor-command',command);
    // Save/Open/Close ask the editor to commit the element being typed; it does so without moving focus or the caret.
    const finalize=(event:Event)=>{const input=(event as CustomEvent).detail?.input;if(!(input instanceof HTMLTextAreaElement)||!input.dataset.editorParagraph||!input.isConnected)return;event.preventDefault();liveRowEvents.current.finishEditedElement(input.dataset.editorParagraph,input,null,true);};
    document.addEventListener('draftcraft-finalize-element',finalize);
    return()=>{document.removeEventListener('pointerdown',down,true);document.removeEventListener('pointermove',move,true);document.removeEventListener('pointerup',up,true);window.removeEventListener('draftcraft-editor-command',command);document.removeEventListener('draftcraft-finalize-element',finalize);};
  },[]);
  // Toolbar and menu commands that act on the current paragraph or selection (App dispatches them with the paragraph
  // that last had the caret, because a toolbar control may hold focus).
  // Screen-reader announcements (1.17): element changes made in place, and the element number on request.
  const [srMessage,setSrMessage]=useState('');
  const announce=(text:string)=>setSrMessage(prev=>prev===text?text+'\u00a0':text);
  const describeElement=(id:string)=>{const i=paragraphIndices.get(id);if(i===undefined)return '';const p=paragraphs[i];let scene='';for(let k=i;k>=0;k--)if(paragraphs[k].type==='Scene Heading'){scene=paragraphs[k].sceneNumber||String(paragraphs.slice(0,k+1).filter(q=>q.type==='Scene Heading').length);break;}
    const page=storyIndex.paragraphPage.get(id);return 'Element '+(i+1)+' of '+paragraphs.length+': '+elementLabel(p).replace(/, scene .*/,'')+(page!==undefined&&pages[page-1]?', page '+pages[page-1].pageLabel:'')+(scene?', scene '+scene:'');};
  const lastElement=useRef<{id:string;type:string}|null>(null);
  useEffect(()=>{const focus=(e:FocusEvent)=>{const id=(e.target as HTMLElement|null)?.dataset?.editorParagraph;if(!id)return;const p=currentParagraphs.current.find(q=>q.id===id);if(p)lastElement.current={id,type:p.type};};document.addEventListener('focusin',focus);return()=>document.removeEventListener('focusin',focus);},[]);
  useEffect(()=>{const a=document.activeElement as HTMLElement|null,id=a?.dataset?.editorParagraph;if(!id){lastElement.current=null;return;}const i=paragraphIndices.get(id);if(i===undefined)return;const type=paragraphs[i].type,prev=lastElement.current;lastElement.current={id,type};if(prev&&prev.id===id&&prev.type!==type)announce(elementLabel(paragraphs[i]));},[paragraphs]);
  const toolbarCommand=useRef((_detail:any)=>{});
  toolbarCommand.current=(detail:any)=>{
    if(!detail||typeof detail!=='object')return;
    if(detail.command==='bookmark-next'){handleNextBookmark();return;}if(detail.command==='bookmark-prev'){handlePrevBookmark();return;}
    if(detail.command==='announce-element'){const id=(document.activeElement as HTMLElement|null)?.dataset?.editorParagraph||detail.paragraphId;if(id)announce(describeElement(id));return;}
    const id:string|undefined=detail.paragraphId,p=id?paragraphs.find(x=>x.id===id):undefined;if(!id||!p)return;
    const input=document.getElementById('input-'+id) as HTMLTextAreaElement|null,live=input&&document.activeElement===input;
    const saved=detail.selection?.paragraphId===id?detail.selection:inputSelection.current?.id==='input-'+id?inputSelection.current:null;
    let start=live?input!.selectionStart:saved?.start??p.text.length,end=live?input!.selectionEnd:saved?.end??start;
    const word=()=>{const w=wordsIn(p.text).find(w=>w.start<=start&&w.end>=start);return w?[w.start,w.end]:[start,end];};
    const cross=crossRef.current&&spansParagraphs(paragraphs,crossRef.current)?selectionRanges(paragraphs,crossRef.current):null;
    switch(detail.command){
      case 'element':handleTypeChange(id,detail.type as ElementType);return;
      case 'reformat':{const type=detail.type as ElementType,ids=new Set(cross?cross.map(r=>r.id):[id]);if(!activeFormat.supported.includes(type))return;const next=paragraphs.map(q=>ids.has(q.id)?{...convertElement(q,type,0,0,activeFormat,editorPreferences).paragraph,...(productionMode?{revised:true,revision:activeRevision}:{})}:q);const target=next.find(q=>q.id===id)!;commitKeyboardEdit(next,id,target,Math.min(start,target.text.length),Math.min(end,target.text.length));return;}
      case 'style':{const key=detail.style as StyleKey;
        if(cross){const all=cross.filter(r=>r.end>r.start).every(r=>hasStyle(paragraphs.find(q=>q.id===r.id)!,r.start,r.end,key));const ranges=new Map(cross.map(r=>[r.id,r]));const next=paragraphs.map(q=>{const r=ranges.get(q.id);if(!r||r.end<=r.start)return q;const already=hasStyle(q,r.start,r.end,key);return already===!all?q:toggleStyle(q,r.start,r.end,key);});updateParagraphsWithHistory(next);return;}
        if(start===end)[start,end]=word();if(start===end)return;const target=toggleStyle(p,start,end,key);if(target===p)return;commitKeyboardEdit(paragraphs.map(q=>q.id===id?target:q),id,target,start,end);return;}
      case 'align':{const base=styleFor(activeFormat,{...p,align:undefined}).align,align=detail.align as 'left'|'center'|'right';const target:Paragraph={...p,align:align===base?undefined:align};if(!target.align)delete target.align;commitKeyboardEdit(paragraphs.map(q=>q.id===id?target:q),id,target,start,end);return;}
      case 'note':handleOpenNotePopover(id,null);return;
      case 'bookmark':handleOpenBookmarkPopover(id);return;
      case 'new-scene':{const at=paragraphs.findIndex(q=>q.id===id);let end=at+1;while(end<paragraphs.length&&paragraphs[end].type!=='Scene Heading')end++;const heading:Paragraph={id:'p-'+crypto.randomUUID(),type:'Scene Heading',text:'',...(productionMode?{revised:true,revision:activeRevision}:{})};const next=[...paragraphs];next.splice(end,0,heading);commitKeyboardEdit(next,id,heading,0);return;}
      case 'toggle-case':{if(start===end)[start,end]=word();if(start===end)return;const middle=[...p.text.slice(start,end)].map(c=>{const u=c.toLocaleUpperCase(),l=c.toLocaleLowerCase();const t=c===u?l:u;return t.length===c.length?t:c;}).join('');commitAssistedText(id,p.text.slice(0,start)+middle+p.text.slice(end),start,end);return;}
    }
  };
  useEffect(()=>{const run=(event:Event)=>toolbarCommand.current((event as CustomEvent).detail);window.addEventListener('draftcraft-editor-command',run);return()=>window.removeEventListener('draftcraft-editor-command',run);},[]);
  // The toolbar shows the styles and alignment of the current selection.
  const formatSignal=useRef('');
  const announceFormat=(input:HTMLTextAreaElement)=>{const id=input.dataset.editorParagraph,p=id?currentParagraphs.current.find(q=>q.id===id):undefined;if(!p)return;const start=input.selectionStart,end=input.selectionEnd,align=styleFor(activeFormat,p).align;
    const state={bold:hasStyle(p,start,end,'bold'),italic:hasStyle(p,start,end,'italic'),underline:hasStyle(p,start,end,'underline'),strikethrough:hasStyle(p,start,end,'strikethrough'),'align-left':align==='left','align-center':align==='center','align-right':align==='right'};
    const signal=JSON.stringify(state);if(signal===formatSignal.current)return;formatSignal.current=signal;window.dispatchEvent(new CustomEvent('draftcraft-editor-format',{detail:state}));};
  announceFormatLater.current=input=>announceFormat(input);
  const liveCross=useRef({selectWholeScript,noteSelectAllStart});liveCross.current={selectWholeScript,noteSelectAllStart};
  const appendElement=useRef((p:Paragraph)=>{});
  appendElement.current=p=>{const beforeId=inputSelection.current?.id.slice(6);const before=paragraphs.find(v=>v.id===beforeId)||paragraphs.at(-1);if(p.type==='Parenthetical'&&p.text==='()')emptyAutomaticPairs.current.add(p.id);if(before)commitKeyboardEdit([...paragraphs,p],before.id,p,p.type==='Parenthetical'&&p.text==='()'?1:0);};
  useEffect(()=>{const append=(event:Event)=>{const detail=(event as CustomEvent<{owner:string;paragraph:Paragraph}>).detail;if(detail?.owner===storyDocument.id)appendElement.current(detail.paragraph);};window.addEventListener('draftcraft-editor-append',append);return()=>window.removeEventListener('draftcraft-editor-append',append)},[storyDocument.id]);
  const showCharacterSuggestions = (id: string, text: string, input?: HTMLTextAreaElement | null) => {
    if (!writingSettings.autocomplete || !editorPreferences.smartTypeSuggestions || !input || text.includes('(')) return;
    let names = text.trim() ? suggestCharacters(characterMemory, text, id) : characterMemory.filter(r=>r.saved || r.paragraphIds.some(p=>p!==id)).slice().sort((a,b)=>b.appearances-a.appearances || b.lastUsedAt.localeCompare(a.lastUsedAt)).slice(0,8).map(r=>r.name); const excluded=new Set(smartPrefs.excluded.characters||[]);names=[...new Set([...names,...(smartPrefs.entries.characters||[]).filter(v=>v.startsWith(text.toUpperCase()))])].filter(v=>!excluded.has(v));if(smartPrefs.disabled.includes('characters'))return;if(smartPrefs.sort==='alphabetical')names.sort();const predicted=smartPrefs.predict?nextSpeaker(paragraphs,id):undefined;if(!text.trim()&&predicted)names=[predicted,...names.filter(n=>n!==predicted)];if (!names.length) return;
    const rect = input.getBoundingClientRect(), height = Math.min(224, 34 + names.length * 32);
    const bounds = editorContainerRef.current?.getBoundingClientRect();
    const bottom = Math.min(window.innerHeight - 8, bounds?.bottom ?? window.innerHeight), top = Math.max(8, bounds?.top ?? 8);
    const y = rect.bottom + 6 + height <= bottom ? rect.bottom + 6 : rect.top - height - 6;
    if (y < top) return;
    setPopoverPos({ top: y, left: Math.max(8,Math.min(window.innerWidth-240,rect.left)) }); setSuggestions(names); setSelectedSuggestionIndex(0); setActiveSuggestionParagraphId(id);
  };
  const handleTypeChange = (id: string, newType: ElementType) => {
    const current = paragraphs.find(p => p.id === id); if (!current) return;
    const input = document.getElementById('input-' + id) as HTMLTextAreaElement | null;
    const range = inputSelection.current?.id === 'input-' + id ? inputSelection.current : null;
    const start = input?.selectionStart ?? range?.start ?? 0, end = input?.selectionEnd ?? range?.end ?? start;
    dirtyElements.current.delete(id);
    if(newType!==current.type||current.elementSource!=='manual'){
      const change=convertElement(current,newType,start,end,activeFormat,editorPreferences);
      if(newType==='Parenthetical'&&current.type!==newType&&change.paragraph.text==='()')emptyAutomaticPairs.current.add(id);
      const target={...change.paragraph,...(productionMode?{revised:true,revision:activeRevision}:{})};
      commitKeyboardEdit(paragraphs.map(p=>p.id===id?target:p),id,target,change.start,change.end);
    }else{input?.focus({preventScroll:true});input?.setSelectionRange(start,end);}
    if (newType === 'Character') showCharacterSuggestions(id, current.text, input);
  };
  const finishEditedElement=(id:string,input:HTMLTextAreaElement,destination:EventTarget|null,keepFocus=false)=>{
    const pair=currentParagraphs.current.find(p=>p.id===id);
    if(emptyAutomaticPairs.current.has(id)&&pair?.text==='()'&&destination instanceof HTMLTextAreaElement&&destination.id.startsWith('input-')&&destination.id!==input.id){
      emptyAutomaticPairs.current.delete(id);dirtyElements.current.delete(id);
      const next=paragraphs.map(p=>p.id===id?{...p,text:'',runs:undefined}:p);
      editorCommandHistory.current.set(next,{before:{id,text:pair.text,start:input.selectionStart,end:input.selectionEnd},after:{id,text:'',start:0,end:0}});
      updateParagraphsWithHistory(next);return;
    }
    // Opening a menu (toolbar, context menu) is not leaving the element: completion waits until the writer really moves on.
    if(destination instanceof HTMLElement&&destination.closest('.dc-wmenu,.dc-page-menu'))return;
    if(!dirtyElements.current.delete(id)||input.selectionStart!==input.selectionEnd||composition.current.has(id))return;
    const p=currentParagraphs.current.find(p=>p.id===id);if(!p||input.selectionEnd!==p.text.length)return;
    let original=p;
    if(editorPreferences.autoTransitions&&activeFormat.mode!=='manual'&&p.elementSource!=='manual'&&p.type==='Action'&&transitionName(p.text)&&activeFormat.supported.includes('Transition'))original={...p,type:'Transition',elementSource:'inferred'};
    const result=completeElement(original,{text:p.text,start:input.selectionStart,end:input.selectionEnd,runs:p.runs},activeFormat,editorPreferences,true,smartTypeDict.timesOfDay),state=result.state;
    if(state.text===p.text&&original.type===p.type)return;
    const target={...original,text:state.text,runs:state.runs},next=paragraphs.map(v=>v.id===id?target:v);
    editorCommandHistory.current.set(next,{before:{id,text:p.text,start:input.selectionStart,end:input.selectionEnd},after:{id,text:state.text,start:state.start,end:state.end}});
    if(result.key)formattingSnapshots.current.set(next,{id,key:result.key});if(keepFocus)pendingCaret.current={id,text:state.text,start:state.start,end:state.end};updateParagraphsWithHistory(next);
  };
  const handleKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => { if (shortcutProfile.modeKey?.key === 'Alt' && e.key === 'Alt') setShortcutMode(false); };
  const executeShortcutCommand = (command: typeof shortcutCommands[number], id: string) => {
    if(command.id.startsWith('macro:')){const macro=macros.find(m=>'macro:'+m.id===command.id),input=document.getElementById('input-'+id) as HTMLTextAreaElement|null;if(macro){const result=expandMacro(paragraphs,id,input?.selectionStart||0,input?.selectionEnd||0,macro);commitKeyboardEdit(result.paragraphs,id,result.paragraph,result.start);}return;}
    if (command.id === 'note') { setSuggestions([]); handleOpenNotePopover(id); return; }
    if (command.category === 'Elements' && command.type) handleTypeChange(id, command.type);
    else { const name=command.type==='Transition'&&command.text?transitionName(command.text):null;const insert=name&&editorPreferences.autoTransitions?{...command,text:name+transitionEnding(activeFormat,name)}:command;const result = insertCommand(paragraphs, id, insert, productionMode ? activeRevision : undefined); if (result) commitKeyboardEdit(result.paragraphs, id, result.paragraph, result.paragraph.text.length); }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    _index: number,
    paragraph: Paragraph
  ) => {
    // Cached rows retain their DOM after another paragraph is inserted. Resolve
    // their current index by identity before context, Tab or Backspace handling.
    const index=paragraphIndices.get(paragraph.id);
    if(index===undefined)return;
    if(e.nativeEvent.isComposing || composition.current.has(paragraph.id))return;
    if(e.ctrlKey&&e.shiftKey&&!e.altKey&&(e.code==='Period'||e.key==='.'||e.key==='>')){e.preventDefault();announce(describeElement(paragraph.id));return;}
    if(spellingRequest.current?.id===paragraph.id && e.key==='Escape'){e.preventDefault();closeSpelling();return;}
    if(spellingRequest.current?.id===paragraph.id && e.altKey && e.key==='ArrowDown'){e.preventDefault();document.querySelector<HTMLButtonElement>('.dc-spelling-popup .dc-spelling-choice')?.focus();return;}
    if(crossRef.current&&spansParagraphs(paragraphs,crossRef.current)&&handleCrossKey(e,paragraph,index))return;

    if (shortcutProfile.modeKey && matchesShortcut(shortcutProfile.modeKey, e.nativeEvent, true)) {
      e.preventDefault(); e.stopPropagation(); if (!e.repeat) setShortcutMode(value => !value); setSuggestions([]); return;
    }
    if (shortcutMode && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setShortcutMode(false); return; }
    const heldOption = shortcutMode && shortcutProfile.modeKey?.key === 'Alt';
    const letterEvent = heldOption ? { key: /^Key[A-Z]$/.test(e.code) ? e.code.slice(3).toLowerCase() : e.key, code: e.code, metaKey: e.metaKey, ctrlKey: e.ctrlKey, altKey: false, shiftKey: e.shiftKey } : e.nativeEvent;
    const macroKey=macros.find(m=>m.enabled&&m.shortcut&&(!m.scope.length||m.scope.includes(paragraph.type))&&matchesShortcut(m.shortcut,e.nativeEvent,shortcutMode));
    const commandId = (macroKey?'macro:'+macroKey.id:undefined)||resolveCommand(shortcutProfile, characterShortcuts, e.nativeEvent, shortcutMode) || (heldOption ? resolveCommand(shortcutProfile, characterShortcuts, letterEvent, true) : undefined);
    const command = shortcutCommands.find(c => c.id === commandId);
    if (command) {
      e.preventDefault(); e.stopPropagation(); if (e.repeat) return;
      if (!heldOption) setShortcutMode(false);
      executeShortcutCommand(command, paragraph.id);
      return;
    }
    if (shortcutMode && !heldOption && e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) setShortcutMode(false);
    // ⌘B / ⌘I / ⌘U (after custom shortcuts, so a binding the writer made still wins).
    if((e.metaKey||e.ctrlKey)&&!e.altKey&&!e.shiftKey&&['b','i','u'].includes(e.key.toLowerCase())){e.preventDefault();toolbarCommand.current({command:'style',style:{b:'bold',i:'italic',u:'underline'}[e.key.toLowerCase() as 'b'|'i'|'u'],paragraphId:paragraph.id});return;}

    if(editorPreferences.autoParentheticals&&paragraph.type==='Parenthetical'&&!e.metaKey&&!e.ctrlKey&&!e.altKey&&e.currentTarget.selectionStart===e.currentTarget.selectionEnd){
      const at=e.currentTarget.selectionStart;
      if(e.key===')'&&canSkipParentheticalClose(paragraph.text,at)){e.preventDefault();e.currentTarget.setSelectionRange(at+1,at+1);rememberSelection(e.currentTarget);return;}
      if(e.key==='Backspace'&&paragraph.text==='()'&&at===1){e.preventDefault();commitKeyboardEdit(paragraphs.map(p=>p.id===paragraph.id?{...p,text:'',runs:undefined}:p),paragraph.id,{...paragraph,text:'',runs:undefined},0);return;}
    }
    if(e.key==='Backspace' && lastCorrection.current){
      const correction=lastCorrection.current;
      if(correction.id===paragraph.id && paragraph.text===correction.after && e.currentTarget.selectionStart===correction.cursor && e.currentTarget.selectionEnd===correction.cursor && !e.metaKey && !e.ctrlKey && !e.altKey){
        e.preventDefault();if(!correction.custom)rememberRestoredWord(correction.original);lastCorrection.current=null;
        commitAssistedText(paragraph.id,correction.before,correction.start+correction.original.length);return;
      }
    }
    // Custom Autocorrect (the writer's own pairs): every element, independent of spelling autocorrect. The typed key and
    // the replacement are one Undo step; Backspace straight after restores what was typed.
    if([' ','.',',','!','?',':',';'].includes(e.key) && !e.metaKey && !e.ctrlKey && !e.altKey && writingSettings.customAutocorrect && writingSettings.replacements.length && !composition.current.has(paragraph.id)){
      const caret=e.currentTarget.selectionStart,correction=customReplacement(paragraph.text,caret,e.currentTarget.selectionEnd,e.key,writingSettings.replacements,new Set());
      if(correction){
        e.preventDefault();
        const typed=paragraph.text.slice(0,caret)+e.key+paragraph.text.slice(caret+(e.key===' ' && paragraph.text[caret]===' '?1:0));
        lastCorrection.current={...correction,id:paragraph.id,after:correction.text};
        commitAssistedText(paragraph.id,correction.text,correction.cursor,correction.cursor,paragraphs.map(p=>p.id===paragraph.id?{...p,text:typed}:p));return;
      }
    }
    if([' ','.',',','!','?',':',';'].includes(e.key) && !e.metaKey && !e.ctrlKey && !e.altKey && !['Character','Scene Heading','Transition','Shot','New Act','End of Act'].includes(paragraph.type)){
      const blocked=new Set([...restoredWords.current,...(documentAssistance?.disabledAutocorrectWords || []).map(normalizeWord)]);
      const caret=e.currentTarget.selectionStart;
      const word=wordsIn(paragraph.text.slice(0,caret)).at(-1)?.word || '';
      const nearby=(spelling.cachedSuggestions(word) || []).filter(candidate=>distance(normalizeWord(word),normalizeWord(candidate))<=1);
      const correction=boundaryCorrection(paragraph.text,caret,e.currentTarget.selectionEnd,e.key,writingSettings,vocabulary,blocked,nearby);
      if(correction){
        e.preventDefault();
        const typed=paragraph.text.slice(0,caret)+e.key+paragraph.text.slice(caret+(e.key===' ' && paragraph.text[caret]===' '?1:0));
        const previous=paragraphs.map(p=>p.id===paragraph.id?{...p,text:typed}:p);
        lastCorrection.current={...correction,id:paragraph.id,after:correction.text};
        commitAssistedText(paragraph.id,correction.text,correction.cursor,correction.cursor,previous);return;
      }
      if(writingSettings.autocorrect && writingSettings.aggressive && word && !vocabulary.has(normalizeWord(word)) && !blocked.has(normalizeWord(word)) && e.currentTarget.selectionStart===e.currentTarget.selectionEnd){
        const delimiter=e.key,before=paragraph.text;
        const expected=before.slice(0,caret)+delimiter+before.slice(caret);
        void spelling.suggest(word).then(candidates=>requestAnimationFrame(()=>{
          const current=currentPreferences.current;
          const input=document.getElementById('input-'+paragraph.id) as HTMLTextAreaElement | null;
          const now=currentParagraphs.current.find(p=>p.id===paragraph.id);
          if(!input || document.activeElement!==input || composition.current.has(paragraph.id) || input.value!==expected || now?.text!==expected || input.selectionStart!==caret+delimiter.length || input.selectionEnd!==input.selectionStart)return;
          const exclusions=new Set([...restoredWords.current,...(current.documentAssistance?.disabledAutocorrectWords || []).map(normalizeWord)]);
          const nearby=candidates.filter(candidate=>distance(normalizeWord(word),normalizeWord(candidate))<=1);
          const correction=boundaryCorrection(before,caret,caret,delimiter,current.writingSettings,current.vocabulary,exclusions,nearby);
          if(!correction)return;
          lastCorrection.current={...correction,id:paragraph.id,after:correction.text};
          assistanceCommit.current(paragraph.id,correction.text,correction.cursor);
        }));
      }
    }
    if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
      if(e.currentTarget.selectionStart===e.currentTarget.selectionEnd && openSpelling(paragraph.id,undefined,undefined,true,true,e.currentTarget.selectionStart)){e.preventDefault();return;}
      e.preventDefault();
      const page = pages.find(page => page.paragraphs.some(p => p.id === paragraph.id));
      const rect = e.currentTarget.getBoundingClientRect();
      if (page) pageActions.openPage(page, 'menu', rect.left, rect.bottom, e.currentTarget);
      return;
    }
    // Check if SmartType suggestion menu is active
    if (suggestions.length > 0 && activeSuggestionParagraphId === paragraph.id) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => (prev + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if ((e.key === 'Enter' && smartPrefs.accept!=='tab') || (e.key === 'Tab' && smartPrefs.accept!=='enter')) {
        e.preventDefault();
        handleApplySmartTypeSuggestion(suggestions[selectedSuggestionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setSuggestions([]);
        return;
      }
    }

    if(handleCrossKey(e,paragraph,index))return;
    if(e.key==='Tab'&&!e.shiftKey&&!e.metaKey&&!e.ctrlKey&&!e.altKey&&e.currentTarget.selectionStart===e.currentTarget.selectionEnd){const at=e.currentTarget.selectionStart,macro=triggerMacro(macros,paragraph,at);if(macro){e.preventDefault();const result=expandMacro(paragraphs,paragraph.id,at-macro.trigger.length,at,macro);commitKeyboardEdit(result.paragraphs,paragraph.id,result.paragraph,result.start);return;}}

    // Standard Keyboard shortcuts
    if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
      e.preventDefault();
      if (e.shiftKey) handleRedo();
      else handleUndo();
      return;
    }

    const prose=activeFormat.kind==='prose'||activeFormat.kind==='structure';
    if(e.key==='Tab' && (e.altKey || prose && !paragraph.type.startsWith('Outline Level')) && !e.metaKey&&!e.ctrlKey){
      e.preventDefault();const at=e.currentTarget.selectionStart,end=e.currentTarget.selectionEnd,text=paragraph.text.slice(0,at)+'\t'+paragraph.text.slice(end);commitAssistedText(paragraph.id,text,at+1);return;
    }
    if (e.key === 'Tab' && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      if(paragraph.type==='Scene Heading'){if(editorPreferences.autoSceneHeadings){const completed=completeElement(paragraph,{text:paragraph.text,start:e.currentTarget.selectionStart,end:e.currentTarget.selectionEnd,runs:paragraph.runs},activeFormat,editorPreferences,true,smartTypeDict.timesOfDay).state;const change=headingTab(completed.text,activeFormat.sceneSeparator);commitAssistedText(paragraph.id,change.text,change.start);}else{const at=e.currentTarget.selectionStart;commitAssistedText(paragraph.id,paragraph.text.slice(0,at)+'\t'+paragraph.text.slice(e.currentTarget.selectionEnd),at+1);}return;}
      const nextType=useTemplateNavigation?styleFor(format!,paragraph).tab:shortcutProfile.navigation.tab[paragraph.type] || 'Action';
      if(nextType==='Parenthetical'&&paragraph.type==='Dialogue'){const text=editorPreferences.autoParentheticals?'()':'';const target:Paragraph={id:paragraph.text?'p-'+crypto.randomUUID():paragraph.id,type:'Parenthetical',text};if(text)emptyAutomaticPairs.current.add(target.id);const next=[...paragraphs];next.splice(index,1,...(paragraph.text?[paragraph,target]:[target]));commitKeyboardEdit(next,paragraph.id,target,text?1:0);return;}
      handleTypeChange(paragraph.id,nextType);return;
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      const flow=useTemplateNavigation?{...shortcutProfile.navigation,dialogueExit:'legacy' as const,enter:Object.fromEntries(ELEMENTS.map(t=>[t,format!.elements[t].next]))}:shortcutProfile.navigation;
      // Automatic Dialogue Formatting off: a cue no longer switches the next element to Dialogue.
      const navigation=!editorPreferences.autoDialogue&&flow.enter.Character==='Dialogue'?{...flow,enter:{...flow.enter,Character:activeFormat.supported.includes('Action')?'Action' as const:'General' as const}}:flow;
      dirtyElements.current.delete(paragraph.id);
      let original=paragraph;
      const atEnd=e.currentTarget.selectionStart===e.currentTarget.selectionEnd&&e.currentTarget.selectionEnd===paragraph.text.length;
      if(atEnd&&editorPreferences.autoTransitions&&activeFormat.mode!=='manual'&&paragraph.elementSource!=='manual'&&paragraph.type==='Action'&&transitionName(paragraph.text)&&activeFormat.supported.includes('Transition'))original={...paragraph,type:'Transition',elementSource:'inferred'};
      const currentState={text:paragraph.text,start:e.currentTarget.selectionStart,end:e.currentTarget.selectionEnd,runs:paragraph.runs};
      let completed=atEnd?completeElement(original,currentState,activeFormat,editorPreferences,true,smartTypeDict.timesOfDay):{state:currentState,key:undefined};
      if(paragraph.type==='Parenthetical'&&paragraph.text==='()'&&editorPreferences.autoParentheticals)completed={state:{text:'',start:0,end:0,runs:undefined},key:undefined};
      const state=completed.state,skipClose=original.type==='Parenthetical'&&canSkipParentheticalClose(state.text,state.start)&&state.start===state.end;
      const confirmedCue=editorPreferences.detectCharacters&&format?.mode==='smart'&&original.type==='Action'&&original.elementSource!=='manual'&&knownNames.has(characterName(state.text))&&state.start===state.text.length;
      // The final word of the committed element has not passed a word boundary yet: correct it here, inside the same
      // Enter transaction as the full stop and the new element, so one Undo restores exactly what was typed.
      const pairFix=atEnd&&state.start===state.end&&state.end===state.text.length&&writingSettings.customAutocorrect&&writingSettings.replacements.length&&!composition.current.has(paragraph.id)?customReplacement(state.text,state.text.length,state.text.length,'',writingSettings.replacements,new Set()):null;
      if(pairFix){const fixed=typedState({...original,text:state.text,runs:state.runs},pairFix.text,pairFix.cursor);state.text=fixed.text;state.runs=fixed.runs;state.start=state.end=fixed.text.length;}
      const spellFix=!pairFix&&atEnd&&!confirmedCue&&state.start===state.end&&state.end===state.text.length&&ENTER_SPELLING.has(original.type)&&!composition.current.has(paragraph.id)?enterCorrection(state.text,writingSettings,{protectedWords:vocabulary,blocked:new Set([...restoredWords.current,...(documentAssistance?.disabledAutocorrectWords || []).map(normalizeWord)]),suggested:spelling.cachedSuggestions(wordsIn(state.text).at(-1)?.word || ''),occurrences:word=>wordOccurrences(paragraphs,word)}):null;
      if(spellFix){const fixed=typedState({...original,text:state.text,runs:state.runs},spellFix.text,spellFix.cursor);state.text=fixed.text;state.runs=fixed.runs;state.start=state.end=fixed.text.length;}
      const prepared={...original,text:state.text,runs:state.runs,...(confirmedCue?{type:'Character' as const,elementSource:'inferred' as const}:{})};
      let source=paragraphs.map(p=>p.id===paragraph.id?prepared:p);
      const punctuation=punctuationEdit(prepared.text,state.start,state.end,punctuationContext(prepared.type,index),punctuationPreferences,prepared.punctuationOmissions);
      if(punctuation)source=source.map(p=>p.id===paragraph.id?punctuatedParagraph(p,punctuation):p);
      const adjusted=(at:number)=>at+(punctuation&&punctuation.at<=at?punctuation.mark.length:0);
      // Return on an empty cue means the writer is not starting a speech: it becomes Action rather than an empty Dialogue.
      const flowRules=paragraph.type==='Character'&&!state.text&&navigation.enter.Character==='Dialogue'&&activeFormat.supported.includes('Action')?{...navigation,enter:{...navigation.enter,Character:'Action' as const}}:navigation;
      // A split keeps the text exactly as typed (spaces included), like any other editor.
      const result=enterParagraph(source,paragraph.id,skipClose?state.text.length:adjusted(state.start),skipClose?state.text.length:adjusted(state.end),flowRules,productionMode?activeRevision:undefined);
      if(result){result.paragraph.elementSource=undefined;let caret=0;
        // After a finished speech the scene's own pattern (a running exchange, or speeches followed by action) may choose
        // between Character and Action; otherwise the profile or template rule applies unchanged.
        if(editorPreferences.contextualFlow&&paragraph.type==='Dialogue'&&state.text.trim()&&atEnd&&(navigation.dialogueExit==='legacy'||navigation.dialogueExit==='enter')&&!result.paragraph.text&&(result.paragraph.type==='Character'||result.paragraph.type==='Action')){const chosen=afterDialogue(result.paragraphs,result.paragraphs.indexOf(result.paragraph)-1,result.paragraph.type);if(chosen!==result.paragraph.type&&activeFormat.supported.includes(chosen)){result.paragraph.type=chosen;if(chosen==='Character')contextCues.current.add(result.paragraph.id);}}
        if(result.paragraph.type==='Character'&&paragraph.type==='Dialogue')contextCues.current.add(result.paragraph.id);
        if(result.paragraph.type==='Parenthetical'&&editorPreferences.autoParentheticals&&!result.paragraph.text){result.paragraph.text='()';emptyAutomaticPairs.current.add(result.paragraph.id);caret=1;}
        if(punctuation)punctuationSnapshots.current.set(result.paragraphs,{id:paragraph.id,key:punctuation.key});
        const fix=spellFix||pairFix;if(fix){lastCorrection.current=null;correctionSnapshots.current.set(result.paragraphs,{...fix,id:paragraph.id,after:result.paragraphs.find(p=>p.id===paragraph.id)?.text ?? fix.text,enter:true});}
        if(completed.key)formattingSnapshots.current.set(result.paragraphs,{id:paragraph.id,key:completed.key});
        if(format&&result.paragraph.type==='Panel'){result.paragraph.text='PANEL '+(1+paragraphs.slice(0,index+1).reverse().slice(0,paragraphs.slice(0,index+1).reverse().findIndex(p=>p.type==='Comic Page')<0?undefined:paragraphs.slice(0,index+1).reverse().findIndex(p=>p.type==='Comic Page')).filter(p=>p.type==='Panel').length);caret=result.paragraph.text.length;}
        commitKeyboardEdit(result.paragraphs,paragraph.id,result.paragraph,caret);
        if(smartPrefs.predict&&result.paragraph.type==='Character')requestAnimationFrame(()=>showCharacterSuggestions(result.paragraph.id,'',document.getElementById('input-'+result.paragraph.id) as HTMLTextAreaElement));
      }
      return;
    }

    // Backspace on empty paragraph deletes and focuses previous
    if (e.key === 'Backspace' && paragraph.text === '' && paragraphs.length > 1) {
      e.preventDefault();
      const prevP = paragraphs[index - 1];
      const newParagraphs = paragraphs.filter((p) => p.id !== paragraph.id);
      updateParagraphsWithHistory(newParagraphs);

      setTimeout(() => {
        if (prevP) {
          const prevElem = document.getElementById(`input-${prevP.id}`);
          if (prevElem) (prevElem as HTMLTextAreaElement).focus();
        }
      }, 20);
    }
  };

  // Section 3.6: Alternative Dialogue Management
  const editTake=(id:string,action:'add'|'duplicate'|'delete'|'select',index=0)=>updateParagraphsWithHistory(paragraphs.map(p=>p.id===id?takeOperation(p,action,index):p));
  const handleAddAlternativeTake=(id:string)=>editTake(id,'add');
  const handleSwitchAlternativeTake=(id:string,direction:-1|1)=>{const p=paragraphs.find(p=>p.id===id);if(p?.altDialogue?.length)editTake(id,'select',((p.activeAltIndex||0)+direction+p.altDialogue.length)%p.altDialogue.length);};

  // Section 3.4: Move Scene Up / Down
  const handleMoveScene = (index: number, direction: -1 | 1) => {
    // Find entire range of the scene
    let endIndex = index + 1;
    while (endIndex < paragraphs.length && paragraphs[endIndex].type !== 'Scene Heading') {
      endIndex++;
    }

    const sceneSlice = paragraphs.slice(index, endIndex);
    const withoutScene = [...paragraphs.slice(0, index), ...paragraphs.slice(endIndex)];

    let targetIndex = direction === -1 ? index - 1 : endIndex;
    if (direction === -1) {
      // Find previous scene heading
      let prevSceneStart = targetIndex;
      while (prevSceneStart > 0 && withoutScene[prevSceneStart].type !== 'Scene Heading') {
        prevSceneStart--;
      }
      targetIndex = prevSceneStart;
    }

    const newParagraphs = [...withoutScene];
    newParagraphs.splice(targetIndex, 0, ...sceneSlice);
    updateParagraphsWithHistory(newParagraphs);
  };

  // Section 6: Active Popovers for ScriptNotes & Bookmarks
  const [activeNotePopover, setActiveNotePopover] = useState<{
    paragraphId: string;
    noteId?: string | null;
    position: { top: number; left: number };
  } | null>(null);

  const [activeBookmarkPopover, setActiveBookmarkPopover] = useState<{
    paragraphId: string;
    position: { top: number; left: number };
  } | null>(null);

  const [highlightedParagraphId, setHighlightedParagraphId] = useState<string | null>(null);
  const [editingSceneCommentId, setEditingSceneCommentId] = useState<string | null>(null);

  // Jump to paragraph with smooth scroll and visual glow
  const scrollToParagraph = (paragraphId: string) => {
    flushPendingPages();
    const el = document.getElementById(`input-${paragraphId}`) || document.getElementById(`para-${paragraphId}`);
    if (el) {
      el.scrollIntoView({ behavior: scrollMotion(), block: 'center' });
      el.focus();
      setHighlightedParagraphId(paragraphId);
      setTimeout(() => setHighlightedParagraphId(null), 2000);
    }
  };

  // Section 6.2: Bookmarks tracking and navigation
  const bookmarkedParagraphs = paragraphs.filter((p) => Boolean(p.bookmark));

  // Next/Previous Bookmark search from where the writer is (the caret's element, or the bookmark last jumped to),
  // then wrap around. Using only the 2-second highlight made Next always return to the first bookmark.
  const lastBookmarkJump = useRef<string | null>(null);
  const bookmarkOrigin = () => {
    const active = document.activeElement instanceof HTMLTextAreaElement ? document.activeElement.dataset.editorParagraph || document.activeElement.id.replace(/^input-/, '') : '';
    const id = active && paragraphIndices.has(active) ? active : highlightedParagraphId || lastBookmarkJump.current || '';
    return id ? paragraphIndices.get(id) ?? -1 : -1;
  };
  const jumpToBookmark = (direction: 1 | -1) => {
    if (bookmarkedParagraphs.length === 0) return;
    const at = bookmarkOrigin(), order = bookmarkedParagraphs.map(p => ({ p, i: paragraphIndices.get(p.id) ?? -1 }));
    const target = direction === 1 ? (order.find(b => b.i > at) || order[0]) : ([...order].reverse().find(b => b.i < at) || order[order.length - 1]);
    lastBookmarkJump.current = target.p.id; scrollToParagraph(target.p.id);
  };
  const handleNextBookmark = () => jumpToBookmark(1);
  const handlePrevBookmark = () => jumpToBookmark(-1);

  // Keyboard shortcut listener for Bookmark jumping
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if(e.defaultPrevented || (e.target as HTMLElement)?.closest('.dc-overlay'))return;
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === ']' || e.key === '}')) {
        e.preventDefault();
        handleNextBookmark();
      } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === '[' || e.key === '{')) {
        e.preventDefault();
        handlePrevBookmark();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [bookmarkedParagraphs, highlightedParagraphId]);

  const handleOpenNotePopover = (
    paragraphId: string,
    noteId?: string | null,
    e?: React.MouseEvent
  ) => {
    if (e) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setActiveNotePopover({
        paragraphId,
        noteId,
        position: { top: rect.bottom + 8, left: Math.max(16, rect.left - 100) },
      });
    } else {
      const el = document.getElementById(`input-${paragraphId}`);
      const rect = el ? el.getBoundingClientRect() : { top: 220, left: 320 };
      setActiveNotePopover({
        paragraphId,
        noteId,
        position: { top: rect.top + 24, left: rect.left + 50 },
      });
    }
  };

  const handleSaveNote = (savedNote: ScriptNote) => {
    if (!activeNotePopover) return;
    const pId = activeNotePopover.paragraphId;
    updateParagraphsWithHistory(
      paragraphs.map((p) => {
        if (p.id === pId) {
          const existingNotes = p.notes || [];
          const exists = existingNotes.some((n) => n.id === savedNote.id);
          const updatedNotes = exists
            ? existingNotes.map((n) => (n.id === savedNote.id ? savedNote : n))
            : [...existingNotes, savedNote];
          return { ...p, notes: updatedNotes };
        }
        return p;
      })
    );
  };

  const handleDeleteNote = (noteId: string) => {
    if (!activeNotePopover) return;
    const pId = activeNotePopover.paragraphId;
    updateParagraphsWithHistory(
      paragraphs.map((p) => {
        if (p.id === pId) {
          return { ...p, notes: (p.notes || []).filter((n) => n.id !== noteId) };
        }
        return p;
      })
    );
  };

  const handleOpenBookmarkPopover = (paragraphId: string, e?: React.MouseEvent) => {
    if (e) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setActiveBookmarkPopover({
        paragraphId,
        position: { top: rect.bottom + 8, left: Math.max(16, rect.left - 80) },
      });
    } else {
      const el = document.getElementById(`input-${paragraphId}`);
      const rect = el ? el.getBoundingClientRect() : { top: 220, left: 320 };
      setActiveBookmarkPopover({
        paragraphId,
        position: { top: rect.top + 24, left: rect.left + 40 },
      });
    }
  };

  const handleSaveBookmark = (bm: ScriptBookmark) => {
    if (!activeBookmarkPopover) return;
    const pId = activeBookmarkPopover.paragraphId;
    onParagraphsChange(
      paragraphs.map((p) => (p.id === pId ? { ...p, bookmark: bm } : p))
    );
  };

  const handleRemoveBookmark = (paragraphId: string) => {
    onParagraphsChange(
      paragraphs.map((p) => (p.id === paragraphId ? { ...p, bookmark: undefined } : p))
    );
  };

  const handleUpdateSceneComment = (paragraphId: string, comment: string) => {
    onParagraphsChange(
      paragraphs.map((p) => (p.id === paragraphId ? { ...p, sceneComment: comment } : p))
    );
  };

  const handleDeleteParagraph = (id: string) => {
    if (paragraphs.length <= 1) return;
    updateParagraphsWithHistory(paragraphs.filter((p) => p.id !== id));
  };

  const handleToggleLockScene = (id: string) => {
    onParagraphsChange(
      paragraphs.map((p) =>
        p.id === id ? { ...p, lockedScene: !p.lockedScene } : p
      )
    );
  };

  // Section 3.1 & 3.2: Precise Indentation & Margins for all Screenplay Elements
  const getElementStyle = (type: ElementType) => {
    switch (type) {
      case 'Scene Heading':
        return 'font-bold uppercase tracking-wider text-left pl-0 max-w-full';
      case 'Action':
        return 'text-left pl-0 max-w-full leading-relaxed';
      case 'Character':
        return 'uppercase font-bold tracking-wide text-left pl-[37%] max-w-[70%]';
      case 'Parenthetical':
        return 'italic text-left pl-[28%] max-w-[55%]';
      case 'Dialogue':
        return 'text-left pl-[18%] max-w-[65%] leading-relaxed';
      case 'Dual Dialogue':
        return 'text-left pl-[5%] max-w-full leading-snug';
      case 'Transition':
        return 'uppercase font-bold text-right pr-4 max-w-full';
      case 'Shot':
        return 'uppercase font-bold text-left pl-0 max-w-full';
      case 'New Act':
        return 'uppercase font-bold tracking-widest text-center py-4 border-y border-neutral-600 my-2';
      case 'End of Act':
        return 'uppercase font-bold tracking-widest text-center py-2 text-neutral-400';
      case 'Scene Summary':
        return 'italic text-neutral-400 text-left pl-4 border-l-2 border-amber-500/40';
      case 'Cast List':
        return 'text-left pl-4 max-w-md bg-neutral-900/30 p-2 rounded';
      case 'Outline Level 1':
        return 'font-bold text-amber-400 uppercase tracking-wide pl-0 text-[13pt]';
      case 'Outline Level 2':
        return 'font-semibold text-blue-400 pl-4 text-[12pt]';
      case 'Centered Text':
        return 'text-center pl-0 max-w-full';
      case 'Lyrics':
        return 'italic text-left pl-[18%] max-w-[65%] leading-relaxed';
      case 'User Defined':
      case 'General':
      default:
        return 'text-left pl-0 max-w-full';
    }
  };

  // Structure Lines (View › Structure Lines): regions of acts, sequences, outline beats and scenes, from the script's
  // structural elements or, when it has none at a level, from the timeline lanes.
  const structureKey=JSON.stringify([structureStyle.levels,structureStyle.colors]);
  const structure=useMemo(()=>showStructureLines?styledSpans(structureSpans(storyDocument,storyIndex),structureStyle):[],[showStructureLines,structureKey,paragraphs,storyDocument.outlineMarkers,storyDocument.outlineLanes,storyDocument.beats,storyIndex.geometry]);
  // Segments per page, recomputed only when the structure or the layout changes (not on caret or popover updates).
  const structureByPage=useMemo(()=>showStructureLines?pages.map(page=>pageSegments(structure,page.fragments,paragraphIndices,scriptView==='page'?(activeFormat.page.height-activeFormat.page.top-activeFormat.page.bottom)*72:Math.max(12,...page.fragments.map(f=>f.y+f.height)))):[],[showStructureLines,structure,pages,paragraphIndices,scriptView,activeFormat]);
  // The line elements themselves are memoized too, so an unrelated render (caret, popovers) does not diff them.
  // Reuse a page's line elements while its segments are unchanged, so typing does not invalidate every page.
  const structureCache=useRef(new Map<number,{sig:string;nodes:React.ReactNode[]}>());
  const structureNodes=useMemo(()=>structureByPage.map((segs,pageIndex)=>{const sig=segs.map(seg=>seg.span.level+':'+seg.span.startId+':'+seg.span.label+':'+seg.span.color+':'+seg.top+':'+seg.bottom+':'+seg.continuesBefore+':'+seg.continuesAfter).join('|'),hit=structureCache.current.get(pageIndex);if(hit&&hit.sig===sig)return hit.nodes;const nodes=segs.map(seg=><div key={seg.span.level+':'+seg.span.startId} aria-hidden="true" data-label={STRUCTURE_NAMES[seg.span.level]+' '+seg.span.label} className={'dc-structure-line no-print dc-structure-level-'+seg.span.level} data-continues-before={seg.continuesBefore} data-continues-after={seg.continuesAfter}
                style={{left:-STRUCTURE_OFFSETS[seg.span.level]+'in',top:seg.top+'pt',height:Math.max(4,seg.bottom-seg.top)+'pt',['--structure' as string]:seg.span.color}} title={STRUCTURE_NAMES[seg.span.level]+': '+seg.span.label+' — click to go to its start'}
                onMouseDown={e=>e.preventDefault()} onClick={()=>scrollToParagraph(seg.span.startId)}
                onContextMenu={e=>{e.preventDefault();e.stopPropagation();window.dispatchEvent(new CustomEvent('draftcraft-workspace-command',{detail:{id:'structure-settings'}}));}}/>);structureCache.current.set(pageIndex,{sig,nodes});return nodes;}),[structureByPage]);
  const toolbarParagraph = paragraphs.find(p => p.id === toolbarId);
  const renderFormattingControls = (p: Paragraph) => {
    const globalIndex = paragraphs.findIndex(item => item.id === p.id);
    return <>
                      <select value={p.type} onChange={e => handleTypeChange(p.id, e.target.value as ElementType)}
                        className="dc-bg-elevated text-neutral-300 text-[10px] rounded px-1 py-0.5 border border-white/20 shadow-md cursor-pointer max-w-[210px]"
                        title="Change Element Type" aria-label="Screenplay element">
                        {(format?[...new Set([...format.supported,p.type])]:ELEMENTS).map(type => <option key={type} value={type}>{type === 'General' ? 'General Text' : type} · {displayShortcut(assignment(shortcutProfile, characterShortcuts, elementCommand(type)))}</option>)}
                      </select>
                      {p.type==='User Defined'&&format?.customElements.length? <select aria-label="Custom Element Style" value={p.customElementLabel||''} onChange={e=>{const next={...p,customElementLabel:e.target.value};commitKeyboardEdit(paragraphs.map(v=>v.id===p.id?next:v),p.id,next,inputSelection.current?.start||0)}}><option value="">Default custom style</option>{format.customElements.map(e=><option key={e.name}>{e.name}</option>)}</select>:null}
                      <button onClick={onOpenKeyboardShortcuts} title="Customize Shortcuts" aria-label="Customize Shortcuts" className="dc-shortcut-button text-[10px]">Customize Shortcuts</button>
                      <button onClick={() => { setSuggestions([]); setPaletteParagraphId(p.id); }} aria-label="Screenplay Commands" className="dc-shortcut-button text-[10px]">Commands</button>

                      <div className="flex items-center gap-1 bg-[#24242e] p-0.5 rounded border border-white/20 shadow-md">
                        {/* Section 6: ScriptNote Button */}
                        <button aria-label={p.notes && p.notes.length > 0 ? `ScriptNotes (${p.notes.length})` : 'Add ScriptNote'}
                          onClick={(e) => handleOpenNotePopover(p.id, null, e)}
                          className={`p-1 rounded transition-colors ${
                            p.notes && p.notes.length > 0
                              ? 'text-amber-400 bg-amber-500/20'
                              : 'text-neutral-400 hover:text-amber-400 hover:bg-white/10'
                          }`}
                          title={p.notes && p.notes.length > 0 ? `ScriptNotes (${p.notes.length})` : 'Add ScriptNote'}
                        >
                          <MessageSquare className="w-2.5 h-2.5" />
                        </button>

                        {/* Section 6: Bookmark Button */}
                        <button aria-label={p.bookmark ? 'Edit Script Bookmark' : 'Set Bookmark at this line'}
                          onClick={(e) => handleOpenBookmarkPopover(p.id, e)}
                          className={`p-1 rounded transition-colors ${
                            p.bookmark
                              ? 'text-blue-400 bg-blue-500/20'
                              : 'text-neutral-400 hover:text-blue-400 hover:bg-white/10'
                          }`}
                          title={p.bookmark ? 'Edit Script Bookmark' : 'Set Bookmark at this line'}
                        >
                          <Bookmark className="w-2.5 h-2.5" />
                        </button>

                        {p.type === 'Dialogue' && (
                          <button aria-label="Add Alternative Dialogue Take"
                            onClick={() => handleAddAlternativeTake(p.id)}
                            className="p-1 text-neutral-400 hover:text-amber-400 hover:bg-white/10 rounded"
                            title="Add Alternative Dialogue Take"
                          >
                            <Copy className="w-2.5 h-2.5" />
                          </button>
                        )}
                        <button aria-label="Google Search Grounding for this scene"
                          onClick={() => onOpenResearchSnippet(p.text)}
                          className="p-1 text-neutral-400 hover:text-emerald-400 hover:bg-white/10 rounded"
                          title="Google Search Grounding for this scene"
                        >
                          <HelpCircle className="w-2.5 h-2.5" />
                        </button>
                        <button aria-label="Open Table Read from this paragraph"
                          onClick={() => onOpenTableReadSnippet(p.text, p.type === 'Character' ? p.text : undefined,undefined,p.id)}
                          className="p-1 text-neutral-400 hover:text-blue-400 hover:bg-white/10 rounded"
                          title="Open Table Read from this paragraph"
                        >
                          <Volume2 className="w-2.5 h-2.5" />
                        </button>
                        {p.type === 'Scene Heading' && (
                          <>
                            {/* Section 6: Scene Comment Button */}
                            <button aria-label={p.sceneComment ? 'Edit Scene Production Comment' : 'Add Scene Comment'}
                              onClick={() => {
                                setEditingSceneCommentId(editingSceneCommentId === p.id ? null : p.id);
                                if (!p.sceneComment) handleUpdateSceneComment(p.id, 'Scene note: ');
                              }}
                              className={`p-1 rounded transition-colors ${
                                p.sceneComment
                                  ? 'text-emerald-400 bg-emerald-500/20'
                                  : 'text-neutral-400 hover:text-emerald-400 hover:bg-white/10'
                              }`}
                              title={p.sceneComment ? 'Edit Scene Production Comment' : 'Add Scene Comment'}
                            >
                              <Clapperboard className="w-2.5 h-2.5" />
                            </button>
                            <button aria-label="Move Scene Up"
                              onClick={() => handleMoveScene(globalIndex, -1)}
                              disabled={globalIndex === 0}
                              className="p-1 text-neutral-400 hover:text-white hover:bg-white/10 rounded disabled:opacity-30"
                              title="Move Scene Up"
                            >
                              <ArrowUp className="w-2.5 h-2.5" />
                            </button>
                            <button aria-label="Move Scene Down"
                              onClick={() => handleMoveScene(globalIndex, 1)}
                              className="p-1 text-neutral-400 hover:text-white hover:bg-white/10 rounded"
                              title="Move Scene Down"
                            >
                              <ArrowDown className="w-2.5 h-2.5" />
                            </button>
                            <button aria-label={p.lockedScene ? 'Unlock Scene Number' : 'Lock Scene Number'}
                              onClick={() => handleToggleLockScene(p.id)}
                              className="p-1 text-neutral-400 hover:text-amber-400 hover:bg-white/10 rounded"
                              title={p.lockedScene ? 'Unlock Scene Number' : 'Lock Scene Number'}
                            >
                              {p.lockedScene ? <Unlock className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                            </button>
                          </>
                        )}
                        <button aria-label="Delete Element"
                          onClick={() => handleDeleteParagraph(p.id)}
                          className="p-1 text-neutral-400 hover:text-red-400 hover:bg-white/10 rounded"
                          title="Delete Element"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
    </>;
  };

  // Reuse unchanged paragraph markup on large documents. Cached events
  // read current handlers, so a later edit never writes an old document.
  const dictationEdit=useRef((detail:any)=>{});dictationEdit.current=detail=>{if(detail.owner!==storyDocument.id)return;const fail=(error:string)=>window.dispatchEvent(new CustomEvent('draftcraft-dictation-result',{detail:{owner:storyDocument.id,error}}));const id=detail.target?.paragraphId,p=paragraphs.find(p=>p.id===id);if(!p||p.text!==detail.expected){fail('The target paragraph changed. Dictation was not applied.');return;}const input=document.getElementById('input-'+id) as HTMLTextAreaElement|null;if(!input)return;const text=String(detail.text||''),command=text.trim().replace(/[.!?]$/,'').toLocaleLowerCase(),types:Record<string,ElementType>={'scene heading':'Scene Heading',action:'Action',character:'Character',dialogue:'Dialogue',parenthetical:'Parenthetical',transition:'Transition'};if(types[command])handleTypeChange(id,types[command]);else if(command==='undo')handleUndo();else if(command==='redo')handleRedo();else if(command==='new paragraph'||command==='tab'){input.focus({preventScroll:true});input.setSelectionRange(detail.target.start,detail.target.end);input.dispatchEvent(new KeyboardEvent('keydown',{key:command==='tab'?'Tab':'Enter',bubbles:true,cancelable:true}));}else{const start=detail.target.start,end=detail.target.end,next=p.text.slice(0,start)+text+p.text.slice(end);commitAssistedText(id,next,start+text.length);}setTimeout(()=>{const active=document.querySelector<HTMLTextAreaElement>('.dc-editor-workspace textarea:focus')||document.getElementById('input-'+id) as HTMLTextAreaElement|null;if(active)window.dispatchEvent(new CustomEvent('draftcraft-dictation-result',{detail:{owner:storyDocument.id,target:{paragraphId:active.dataset.editorParagraph,start:active.selectionStart,end:active.selectionEnd},expected:active.value}}));},50);};
  useEffect(()=>{const receive=(event:Event)=>dictationEdit.current((event as CustomEvent).detail);window.addEventListener('draftcraft-dictation',receive);return()=>window.removeEventListener('draftcraft-dictation',receive)},[]);
  // The element hint floats above the status bar; it never covers the line being written (Phase 9: floating controls).
  const hintShown=!paragraphControls&&!!(elementSuggestion||toolbarParagraph?.conversionReview);
  useLayoutEffect(()=>{if(!hintShown)return;flushFragmentPositions();const chip=document.querySelector<HTMLElement>('.dc-element-hint'),scroller=editorContainerRef.current,input=document.activeElement;
    if(!chip||!scroller||!(input instanceof HTMLTextAreaElement)||!scroller.contains(input))return;const c=chip.getBoundingClientRect(),r=input.getBoundingClientRect();
    if(r.bottom>c.top-8&&r.top<c.bottom&&r.right>c.left&&r.left<c.right)scroller.scrollTop+=r.bottom-(c.top-16);},[hintShown,elementSuggestion,toolbarParagraph?.id,toolbarParagraph?.text]);
  const liveRowEvents = useRef({ targetToolbar, leaveToolbar, handleSwitchAlternativeTake, handleAddAlternativeTake, handleOpenBookmarkPopover, handleTextChange, handleKeyDown, openSpelling, handleUpdateSceneComment, handleOpenNotePopover, rememberSelection, onFocusedParagraphChange, closeSpelling, handleKeyUp, showCharacterSuggestions, finishEditedElement, handleCrossCopy, handleCrossPaste, editTake });
  liveRowEvents.current = { targetToolbar, leaveToolbar, handleSwitchAlternativeTake, handleAddAlternativeTake, handleOpenBookmarkPopover, handleTextChange, handleKeyDown, openSpelling, handleUpdateSceneComment, handleOpenNotePopover, rememberSelection, onFocusedParagraphChange, closeSpelling, handleKeyUp, showCharacterSuggestions, finishEditedElement, handleCrossCopy, handleCrossPaste, editTake };
  const rowCache = useRef(new Map<string,{paragraph:Paragraph;state:string;fragment:typeof pages[number]['fragments'][number];node:React.ReactNode;pageKey:string}>());
  // Rows are cached per paragraph fragment (id:page:start). Keep exactly the rows the latest
  // commit rendered: unchanged rows are reused across edits, and rows for deleted paragraphs
  // or moved fragments are released. (1.15.2 compared these compound keys with paragraph ids,
  // so every edit discarded the whole cache and re-rendered all rows of the script.)
  const renderedRows=useRef(new Set<string>());renderedRows.current=new Set();
  // Windowed rendering (long scripts): pages near the viewport (IntersectionObserver), around the caret and with
  // transient state are rebuilt at once; other pages that changed are rebuilt `farBudget` at a time in idle renders.
  const windowed=pages.length>WINDOWED_FROM;
  const nearPages=useRef(new Set<number>()),stalePages=useRef(new Set<number>()),refreshBudget=useRef(0),[,setPagesTick]=useState(0);
  let farBudget=refreshBudget.current;refreshBudget.current=0;stalePages.current=new Set();
  const caretPage=(()=>{const id=(typeof document!=='undefined'?document.activeElement as HTMLElement|null:null)?.dataset?.editorParagraph;return id?storyIndex.paragraphPage.get(id):undefined;})();
  const pendingPage=pendingCaret.current?.id?storyIndex.paragraphPage.get(pendingCaret.current.id):undefined;
  const inWindow=(n:number)=>!windowed||nearPages.current.has(n)||caretPage!==undefined&&Math.abs(n-caretPage)<=2||pendingPage!==undefined&&Math.abs(n-pendingPage)<=1;
  flushPages=()=>{if(!stalePages.current.size)return;refreshBudget.current=Infinity;flushSync(()=>setPagesTick(t=>t+1));};
  const pageCache=useRef(new Map<string,{token:string;node:React.ReactNode;page:unknown;env:string;structure:unknown;special:boolean;list:Paragraph[];pars:Paragraph[]}>()),renderedPages=useRef(new Set<string>());renderedPages.current=new Set();
  const committedSpellingRef=useRef<Map<string,unknown>|null>(null);useEffect(()=>{committedSpellingRef.current=spelling.errors;});
  const objectIds=useRef(new WeakMap<object,number>()),objectCounter=useRef(0);
  const livePage=useRef<{menu:(n:number,e:React.MouseEvent)=>void;down:(n:number,e:React.PointerEvent)=>void;dialog:(n:number)=>void}>({menu:()=>{},down:()=>{},dialog:()=>{}});
  useEffect(()=>{for(const key of pageCache.current.keys())if(!renderedPages.current.has(key))pageCache.current.delete(key)});
  // Idle refresh of pages left behind (windowed rendering): 24 pages per idle render, nearest first by page order.
  const idleRefresh=useRef<number|null>(null);
  useEffect(()=>{if(!stalePages.current.size||idleRefresh.current!==null)return;const run=()=>{idleRefresh.current=null;refreshBudget.current=24;setPagesTick(t=>t+1);};
    idleRefresh.current=typeof requestIdleCallback==='function'?requestIdleCallback(run,{timeout:250}) as unknown as number:window.setTimeout(run,60) as unknown as number;});
  useEffect(()=>()=>{if(idleRefresh.current!==null){if(typeof cancelIdleCallback==='function')cancelIdleCallback(idleRefresh.current);else clearTimeout(idleRefresh.current);}flushPages=null;},[]);
  // Which pages are near the viewport (1.5 screens above and below): those are always drawn from the current layout.
  const pageObserver=useRef<IntersectionObserver|null>(null),observedPages=useRef(new WeakSet<Element>()),observedSignature=useRef<unknown>(null),pagesContainer=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(!windowed){pageObserver.current?.disconnect();pageObserver.current=null;observedPages.current=new WeakSet();return;}
    if(!pageObserver.current){const root=document.querySelector('.dc-editor-workspace');pageObserver.current=new IntersectionObserver(entries=>{let refresh=false;for(const e of entries){const n=Number((e.target as HTMLElement).dataset.pageNumber);if(!n)continue;if(e.isIntersecting){if(!nearPages.current.has(n)){nearPages.current.add(n);if(stalePages.current.has(n))refresh=true;}}else nearPages.current.delete(n);}if(refresh)setPagesTick(t=>t+1);},{root,rootMargin:'150% 0px 150% 0px'});}
    // Only when the pages changed (a 43,000-element document makes a selector scan cost milliseconds per render).
    if(observedSignature.current===pages)return;observedSignature.current=pages;
    const container=pagesContainer.current;if(!container)return;
    for(const el of container.children)if(el.classList.contains('script-page')&&!observedPages.current.has(el)){observedPages.current.add(el);pageObserver.current.observe(el);}
  });
  useEffect(()=>()=>{pageObserver.current?.disconnect();},[]);
  // Rows of pages reused from the page cache were not visited this render; keep their cached rows too.
  useEffect(()=>{const keep=new Set(renderedPages.current);for(const [key,row] of rowCache.current)if(!renderedRows.current.has(key)&&!keep.has(row.pageKey))rowCache.current.delete(key)});

  const currentRevConfig = REVISION_TIERS.find((r) => r.name === activeRevision) || REVISION_TIERS[0];
  // Page-level render cache (long scripts). A page element is rebuilt only when something it draws changed: its
  // fragments or their paragraphs (layout reuses fragment objects for unchanged paragraphs), spelling marks, a row's
  // transient state (highlight, suggestions, cross-element selection, the word being typed) or a display setting.
  // Typing in one element then rebuilds one page instead of walking every row of a 250-page script; React skips the
  // unchanged pages entirely. Page handlers read the latest state through livePage at call time.
  const pageByNumber=(n:number)=>pages.find(pg=>pg.pageNumber===n)!;
  livePage.current={
    menu:(n,e)=>{closeSpelling(false);e.preventDefault();pageActions.openPage(pageByNumber(n),'menu',e.clientX,e.clientY,e.target);},
    down:(n,e)=>{if(e.button===2)e.preventDefault();/* keep the selected text on secondary click */if(e.ctrlKey&&e.button===0){if(e.target instanceof HTMLTextAreaElement&&openSpelling(e.target.id.slice(6),e.clientX,e.clientY)){e.preventDefault();return;}e.preventDefault();pageActions.openPage(pageByNumber(n),'menu',e.clientX,e.clientY,e.target);}},
    dialog:n=>pageActions.openPage(pageByNumber(n),'dialog'),
  };
  const oid=(o:unknown)=>{if(!o||typeof o!=='object')return 0;let v=objectIds.current.get(o as object);if(!v){v=++objectCounter.current;objectIds.current.set(o as object,v);}return v;};
  const specialRows=new Map<string,string>();const special=(id:string|null|undefined,v:string)=>{if(id)specialRows.set(id,(specialRows.get(id)||'')+v);};
  special(highlightedParagraphId,'h');special(editingSceneCommentId,'c');special(activeSuggestionParagraphId,'s'+suggestions.join('|')+selectedSuggestionIndex);
  if(draftWord)special(draftWord.id,'d'+draftWord.start+':'+draftWord.end+':'+draftWord.text.length);crossRanges?.forEach((r,id)=>special(id,'x'+r.start+':'+r.end));
  const pageEnv=[isDarkMode,scriptView,oid(format),oid(activeFormat),contentWidthPt,sceneNumberPlacement,autoHideRightSceneNumbers,productionMode,activeRevision,showBookmarks,showSceneComments,showScriptNotes,writingSettings.underlines,presentationMarks,paragraphControls,hiddenTypes?[...hiddenTypes].join(','):'',JSON.stringify(characterHighlightMap),oid(storyDocument.headerFooterConfig),oid(storyDocument.titlePage),showStructureLines].join('\u0001');
  // Pages that hold a row with transient state, or whose spelling marks changed since the last commit, are checked in
  // full; every other page whose layout object is unchanged (layout reuses untouched pages) is reused at once.
  const dirtyPages=new Set<number>();const markPages=(id:string)=>{const n=storyIndex.paragraphPage.get(id);if(n===undefined)return;dirtyPages.add(n);for(let k=n;k<pages.length&&pages[k].fragments[0]?.paragraphId===id;k++)dirtyPages.add(k+1);};
  for(const id of specialRows.keys())markPages(id);
  const committedSpelling=committedSpellingRef.current;let spellingReset=false;
  if(committedSpelling!==spelling.errors){if(!committedSpelling)spellingReset=true;else{for(const [id,v] of spelling.errors)if(committedSpelling.get(id)!==v)markPages(id);for(const id of committedSpelling.keys())if(!spelling.errors.has(id))markPages(id);}}
  const cachedPage=(page:typeof pages[number],pageIndex:number,build:()=>React.ReactNode)=>{
    const key=page.pageNumber+':'+pageIndex,hit=pageCache.current.get(key),structureNode=showStructureLines?structureNodes[pageIndex]:null;
    // Same layout page is not enough: while the layout waits (during IME composition, for example) the paragraphs
    // being typed change without a new page, so the live paragraph objects must be the ones the page was drawn with.
    const sameParagraphs=(entry:{list:Paragraph[];pars:Paragraph[]})=>{if(entry.list===paragraphs)return true;const fr=page.fragments;for(let i=0;i<fr.length;i++)if(paragraphs[paragraphIndices.get(fr[i].paragraphId)!]!==entry.pars[i])return false;entry.list=paragraphs;return true;};
    if(hit&&hit.page===page&&hit.env===pageEnv&&hit.structure===structureNode&&!spellingReset&&!dirtyPages.has(page.pageNumber)&&!hit.special&&sameParagraphs(hit)){renderedPages.current.add(key);return hit.node;}
    // A page outside the window keeps its last drawing until an idle render (or a flush) has budget for it.
    if(hit&&!hit.special&&!dirtyPages.has(page.pageNumber)&&!inWindow(page.pageNumber)){if(farBudget<=0){stalePages.current.add(page.pageNumber);renderedPages.current.add(key);return hit.node;}farBudget--;}
    let token=pageEnv+'|'+pageIndex+'|'+page.pageLabel+'|'+JSON.stringify(page.labels)+'|'+(showStructureLines?oid(structureNodes[pageIndex]):0);
    // Two independent 32-bit hashes of the fragment, paragraph and spelling identities (no string building per row).
    let h1=-2128831035,h2=page.fragments.length;const pars:Paragraph[]=[];
    for(const f of page.fragments){const pid=f.paragraphId,par=paragraphs[paragraphIndices.get(pid)!];pars.push(par);for(const v of [oid(f),oid(par),oid(spelling.errors.get(pid))]){h1=Math.imul(h1^v,16777619);h2=(Math.imul(h2,31)+v)|0;}const extra=specialRows.get(pid);if(extra)token+='!'+pid+extra;}
    token+='#'+h1+':'+h2;
    const special=token.includes('!');
    if(hit&&hit.token===token){pageCache.current.set(key,{...hit,page,env:pageEnv,structure:structureNode,special,list:paragraphs,pars});renderedPages.current.add(key);return hit.node;}
    const node=build();pageCache.current.set(key,{token,node,page,env:pageEnv,structure:structureNode,special,list:paragraphs,pars});renderedPages.current.add(key);return node;
  };

  return (
    <div className="dc-editor-shell flex-1 min-w-0 flex flex-col overflow-hidden">
      <EditorCaret preferences={editorPreferences} layout={paragraphs} zoom={zoom}/>
      <div id="dc-screen-reader-status" role="status" aria-live="polite" aria-atomic="true" className="dc-sr-only">{srMessage}</div>
      {!paragraphControls&&(elementSuggestion||toolbarParagraph?.conversionReview)&&createPortal(<div className="dc-element-hint no-print" role="status">
        {elementSuggestion&&<button type="button" className="dc-element-suggestion" title={'Make it '+elementSuggestion.type} onMouseDown={e=>e.preventDefault()} onClick={()=>{handleTypeChange(elementSuggestion.id,elementSuggestion.type);setElementSuggestion(null)}}>{elementSuggestion.reason} · Use {elementSuggestion.type}</button>}
        {!elementSuggestion&&toolbarParagraph?.conversionReview&&<button type="button" className="dc-element-suggestion" title="Mark as reviewed" onClick={()=>{const id=toolbarParagraph.id;onParagraphsChange(currentParagraphs.current.map(v=>v.id===id?{...v,conversionReview:undefined}:v))}}>{toolbarParagraph.conversionReview}</button>}
      </div>,document.body)}
      {paragraphControls&&<div ref={toolbarSlotRef} className="dc-formatting-slot no-print" />}
      {paragraphControls&&<FormattingToolbar id={toolbarParagraph?.id || null} workspaceRef={editorContainerRef} fallbackRef={toolbarSlotRef}
        onEnter={() => { toolbarHeld.current = true; if (toolbarTimer.current) clearTimeout(toolbarTimer.current); }}
        onLeave={() => { toolbarHeld.current = false; leaveToolbar(); }}
        onCaptureSelection={e => {
          const target = document.getElementById(`input-${toolbarId}`);
          if (target instanceof HTMLTextAreaElement) rememberSelection(target);
          if ((e.target as HTMLElement).closest('button')) e.preventDefault();
        }}>
        {toolbarParagraph ? <>{renderFormattingControls(toolbarParagraph)}
          {elementSuggestion&&<button type="button" className="dc-element-suggestion" onMouseDown={e=>e.preventDefault()} onClick={()=>{handleTypeChange(elementSuggestion.id,elementSuggestion.type);setElementSuggestion(null)}}>{elementSuggestion.reason} · Use {elementSuggestion.type}</button>}
          {toolbarParagraph.conversionReview&&<button type="button" className="dc-element-suggestion" onClick={()=>{const id=toolbarParagraph.id;onParagraphsChange(currentParagraphs.current.map(v=>v.id===id?{...v,conversionReview:undefined}:v))}}>{toolbarParagraph.conversionReview} · Mark reviewed</button>}
        </> : null}
      </FormattingToolbar>}
      {crossNotice && <div role="status" className="no-print px-4 py-1 text-xs bg-amber-500/10 text-amber-300">{crossNotice}</div>}
      {activeCross && <div role="status" aria-live="polite" className="sr-only">{selectionRanges(paragraphs,activeCross).length} elements selected</div>}
      {shortcutMode && <div role="status" className="no-print px-4 py-1 text-xs bg-amber-500/10 text-amber-400">Shortcut Mode · Press an assigned letter. Escape returns to typing.</div>}
      {pageActions.overlay}
      {paletteParagraphId && <ScreenplayCommandPalette commands={shortcutCommands} profile={shortcutProfile} characters={characterShortcuts} onClose={() => setPaletteParagraphId(null)} onExecute={command => { const id=paletteParagraphId; setPaletteParagraphId(null); executeShortcutCommand(command,id); }} />}
      {spellingTarget && <SpellingPopover target={spellingTarget} key={spellingTarget.id+":"+spellingTarget.start+":"+spellingTarget.text} suggestions={spellingSuggestions} loading={spellingLoading} synonyms={wordSynonyms} synonymLoading={synonymLoading} advancedLoading={advancedLoading} advancedNote={advancedNote} settings={writingSettings} onReplace={replaceSpelling} onAction={spellingAction} onClose={()=>closeSpelling()} />}
      {spelling.status==='error' && <p role="status" className="no-print text-xs text-amber-400 px-4">The offline spelling dictionary could not be loaded. Reopen the application to retry.</p>}
    <div
      ref={editorContainerRef}
      className={`dc-editor-workspace flex-1 overflow-y-auto px-4 py-6 flex flex-col items-center select-text transition-colors duration-200 relative ${
        isDarkMode ? 'bg-[#18181f]' : 'bg-[#2b2b36]'
      }`}
    >
      {/* SmartType Popover Overlay */}
      <UIPresence>{suggestions.length > 0 && (
        <SmartTypePopover
          suggestions={suggestions}
          selectedIndex={selectedSuggestionIndex}
          onSelect={handleApplySmartTypeSuggestion}
          position={popoverPos}
          label={paragraphs.find(p=>p.id===activeSuggestionParagraphId)?.type==='Character'?'Character Suggestions':'SmartType suggestions'}
        />
      )}</UIPresence>

      {/* Section 6: Top Annotations & Bookmarks Ribbon. It stays in the document flow
          (not sticky) so it never floats over screenplay text while scrolling or typing. */}
      {paragraphControls&&<div className="dc-annotations mb-6 bg-[#21212a] border border-white/10 rounded-full px-4 py-1.5 shadow-xl flex items-center justify-between gap-4 text-xs select-none no-print">
        {/* Left: Bookmarks Navigation */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-blue-400 font-medium">
            <Bookmark className="w-3.5 h-3.5 fill-blue-400" />
            <span className="text-[11px] font-mono">
              Bookmarks ({bookmarkedParagraphs.length})
            </span>
          </div>

          <div className="flex items-center gap-0.5 bg-black/40 rounded-lg p-0.5 border border-white/5">
            <button aria-label="Previous Bookmark (Cmd+Shift+[)"
              onClick={handlePrevBookmark}
              disabled={bookmarkedParagraphs.length === 0}
              className="p-1 hover:bg-white/10 text-neutral-300 hover:text-white rounded disabled:opacity-30 disabled:hover:bg-transparent"
              title="Previous Bookmark (Cmd+Shift+[)"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button aria-label="Next Bookmark (Cmd+Shift+])"
              onClick={handleNextBookmark}
              disabled={bookmarkedParagraphs.length === 0}
              className="p-1 hover:bg-white/10 text-neutral-300 hover:text-white rounded disabled:opacity-30 disabled:hover:bg-transparent"
              title="Next Bookmark (Cmd+Shift+])"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {bookmarkedParagraphs.length > 0 && (
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) scrollToParagraph(e.target.value);
              }}
              className="bg-black/40 text-neutral-300 rounded px-2 py-0.5 text-[11px] border border-white/10 focus:outline-none max-w-44 truncate"
            >
              <option value="">Jump to Bookmark...</option>
              {bookmarkedParagraphs.map((bm, i) => {
                const bmName = typeof bm.bookmark === 'object' ? bm.bookmark.name : bm.bookmark;
                return (
                  <option key={bm.id} value={bm.id}>
                    #{i + 1}: {bmName || bm.text.slice(0, 24)}
                  </option>
                );
              })}
            </select>
          )}
        </div>

        {/* Right: Annotation Visibility Controls (Distinct from Production Revisions) */}
        <div className="flex items-center gap-3 text-[11px] border-l border-white/10 pl-3">
          <span className="text-neutral-500 text-[10px] dc-meta uppercase font-bold tracking-wider">
            Annotations:
          </span>

          {/* Toggle ScriptNotes */}
          <button
            onClick={onToggleShowScriptNotes}
            className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
              showScriptNotes
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="Toggle ScriptNotes Visibility"
          >
            <MessageSquare className="w-3 h-3" />
            <span>Notes</span>
            {showScriptNotes ? <Eye className="w-2.5 h-2.5 ml-0.5" /> : <EyeOff className="w-2.5 h-2.5 ml-0.5 opacity-60" />}
          </button>

          {/* Toggle Bookmarks */}
          <button
            onClick={onToggleShowBookmarks}
            className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
              showBookmarks
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="Toggle Bookmarks Visibility in Margin"
          >
            <Bookmark className="w-3 h-3" />
            <span>Bookmarks</span>
            {showBookmarks ? <Eye className="w-2.5 h-2.5 ml-0.5" /> : <EyeOff className="w-2.5 h-2.5 ml-0.5 opacity-60" />}
          </button>

          {/* Toggle Scene Comments */}
          <button
            onClick={onToggleShowSceneComments}
            className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
              showSceneComments
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="Toggle Scene Production Comments"
          >
            <Clapperboard className="w-3 h-3" />
            <span>Scene Comments</span>
            {showSceneComments ? <Eye className="w-2.5 h-2.5 ml-0.5" /> : <EyeOff className="w-2.5 h-2.5 ml-0.5 opacity-60" />}
          </button>
        </div>
      </div>}

      <div className="dc-story-dock no-print"><button className="dc-story-open" onClick={()=>onEditStory()}>Story Structure & Editor Settings…</button><StoryPanels {...storyProps} position="above"/><StoryPanels {...storyProps} position="panel"/></div>
      {/* Screenplay Page Sheet (8.5 x 11 in US Letter standard) */}
      <div ref={pagesContainer}
        className={`flex flex-col items-center ${scriptView==='page'?'gap-12':'gap-0'} transition-transform duration-100 origin-top`}
        data-script-view={scriptView}
        style={{ transform: `scale(${zoom / 100})`, width: (format?.page.width || 8.5)+'in', paddingBottom: typewriterMode?'55vh':undefined, ['--dc-structure-width' as string]: structureStyle.width+'px', ['--dc-structure-opacity' as string]: String(structureStyle.opacity) }}
      >
        {showRuler&&<ScriptRuler format={geometryFormat} paragraph={toolbarParagraph}/>}
        {pages.map((page, pageIndex) => (
          <React.Fragment key={`frame-${page.pageNumber}`}>
          {hasPageStory && <StoryPanels {...storyProps} position="above" page={page.pageNumber} pagePosition="above"/>}
          {cachedPage(page,pageIndex,()=><div
            key={`page-${page.pageNumber}-${pageIndex}`}
            data-page-number={page.pageNumber} data-page-label={page.pageLabel}
            onContextMenu={e => livePage.current.menu(page.pageNumber, e)}
            onPointerDownCapture={e => livePage.current.down(page.pageNumber, e)}
            className={`script-page relative flex flex-col transition-shadow ${scriptView==='page'?'rounded-sm':'dc-page-continuous'} ${
              isDarkMode
                ? 'bg-[#121216] text-[#e4e4e7] '+(scriptView==='page'?'border border-white/5':'')
                : 'bg-[#fafafa] text-[#1a1a1a] '+(scriptView==='page'?'shadow-2xl':'')
            }`}
            style={{
              paddingTop: scriptView==='page'||pageIndex===0?(format?.page.top ?? 1)+"in":'18pt',
              paddingBottom: scriptView==='page'?(format?.page.bottom ?? 1)+"in":'6pt',
              paddingLeft: (format?.page.left ?? 1.5)+"in",
              paddingRight: (format?.page.right ?? 1)+"in",
              height: scriptView==='page'?(format?.page.height || 11)+'in':'auto',width:format?format.page.width+'in':undefined,borderWidth:format?0:undefined,
              boxSizing: 'border-box',
            }}
          >
            {scriptView!=='page'&&pageIndex>0&&<div className="dc-page-break no-print" aria-hidden="true"><span>{scriptView==='normal'?'Page '+page.pageLabel:''}</span></div>}
            {scriptView==='page'&&<button className="dc-page-actions-button no-print" aria-label={`Page Actions for Page ${page.pageNumber}`}
              onClick={() => livePage.current.dialog(page.pageNumber)}>Page {page.pageLabel} · Actions</button>}
            {/* Page Header (standard Hollywood top right corner: "2.") */}
            {scriptView==='page'&&(format&&storyDocument.headerFooterConfig?(['header','footer'] as const).map(where=>{const config=storyDocument.headerFooterConfig!,show=where==='header'?config.showHeader&&(page.pageNumber>1||page.pageLabel!=='1'||config.firstPageHasHeader):config.showFooter&&(page.pageNumber>1||config.firstPageHasFooter);const tokens=(text:string)=>text.replace(/\{PAGE\}/gi,page.pageLabel).replace(/\{TITLE\}/gi,storyDocument.titlePage.title).replace(/\{AUTHOR\}/gi,storyDocument.titlePage.author).replace(/\{DATE\}/gi,storyDocument.titlePage.draftDate).replace(/\{REVISION\}/gi,activeRevision).replace(/\{LABEL\}/gi,config.customLabel||'');return show?<div key={where} className="absolute grid grid-cols-3 font-screenplay text-sm text-neutral-400 select-none" style={{left:format.page.left+'in',right:format.page.right+'in',...(where==='header'?{top:'.5in'}:{bottom:'.5in'})}}>{(['left','center','right'] as const).map(side=><span key={side} style={{textAlign:side}}>{tokens(config[where][side])}</span>)}</div>:null;}):<div className="absolute top-[0.5in] right-[1.0in] font-screenplay text-sm text-neutral-400 select-none">{page.pageNumber>1&&<span>{page.pageLabel}.</span>}</div>)}

            {/* Production Revision Watermark / Banner */}
            {productionMode && activeRevision !== 'White' && (
              <div
                className="absolute top-2 left-6 text-[10px] font-mono tracking-widest uppercase opacity-40 select-none"
                style={{ color: currentRevConfig.borderHex }}
              >
                ★ {currentRevConfig.name.toUpperCase()} REVISION DRAFT
              </div>
            )}

            {page.labels.map((label,i)=><div key={i} aria-hidden="true" data-generated-label={label.kind} className="absolute font-screenplay text-[12pt] select-none pointer-events-none whitespace-pre" style={{left:(activeFormat.page.left*72+label.x)+'pt',top:(activeFormat.page.top*72+label.y)+'pt',width:label.width+'pt',textAlign:label.align,lineHeight:'12pt'}}>{label.text}</div>)}
            {/* Fragments share the original semantic paragraph and native selection offsets. */}
            <div className="relative font-screenplay text-[12pt]" style={{height:scriptView==='page'?(activeFormat.page.height-activeFormat.page.top-activeFormat.page.bottom)+'in':Math.max(12,...page.fragments.map(f=>f.y+f.height))+'pt'}}>
              {showStructureLines&&structureNodes[pageIndex]}
              {page.fragments.map((fragment, pIndexInPage) => {
                const p=paragraphs[paragraphIndices.get(fragment.paragraphId)!];
                const globalIndex = paragraphIndices.get(p.id) ?? 0;
                const prevP = globalIndex > 0 ? paragraphs[globalIndex - 1] : null;
                const nextP = globalIndex < paragraphs.length - 1 ? paragraphs[globalIndex + 1] : null;


                // Check character highlighting
                const highlightColor =
                  p.type === 'Character' || p.type === 'Dialogue'
                    ? characterHighlightMap[p.text.split('(')[0].trim().toUpperCase()]
                    : undefined;

                const rowErrors=spellingErrors(p),rowStyled=styledRuns(p);
                const crossRange=crossRanges?.get(p.id);
                const rowState=[format,contentWidthPt,crossRange?crossRange.start+':'+crossRange.end:'',highlightColor,sceneNumberPlacement,autoHideRightSceneNumbers,productionMode,showBookmarks,showSceneComments,showScriptNotes,highlightedParagraphId===p.id,editingSceneCommentId===p.id,writingSettings.underlines,activeSuggestionParagraphId===p.id?suggestions.join('|')+selectedSuggestionIndex:'',rowErrors.map(e=>e.start+':'+e.end).join(','),presentationMarks,scriptView,rowStyled?JSON.stringify(p.runs):''].join('\0')+(format?styleKey(styleFor(format,p)):'');
                const rowKey=p.id+':'+page.pageNumber+':'+fragment.start;
                // Row handlers read liveRowEvents at call time, and handleKeyDown resolves the element's
                // current index by identity, so a cached row stays correct when elements are inserted above it.
                renderedRows.current.add(rowKey);
                const cached=fragment.imageHeight?undefined:rowCache.current.get(rowKey);
                if(cached?.paragraph===p && cached.state===rowState&&cached.fragment===fragment)return cached.node;
                const node = (
                  <div
                    key={p.id} data-paragraph-id={p.id} data-fragment-start={fragment.start} data-fragment-end={fragment.end}
                    onPointerEnter={() => liveRowEvents.current.targetToolbar(p.id)}
                    onPointerLeave={()=>liveRowEvents.current.leaveToolbar()}
                    className="relative group flex flex-col -mx-4 px-4 py-0.5 rounded transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                    style={{...(highlightColor?{backgroundColor:`${highlightColor}20`,borderLeft:`3px solid ${highlightColor}`} : {}),position:'absolute',left:fragment.x+'pt',top:fragment.y+'pt',width:fragment.width+'pt',height:fragment.height+'pt',margin:0,padding:0}}
                  >
                    {scriptView==='speed'&&fragment.start===0&&<span className="dc-speed-label no-print" aria-hidden="true">{SPEED_LABELS[p.type]||p.type}</span>}
                    {/* Scene Number on Left Margin */}
                    {p.type === 'Scene Heading' && p.sceneNumber && (sceneNumberPlacement === 'left' || sceneNumberPlacement === 'both') && (
                      <div className="dc-scene-number-left absolute top-1 font-screenplay text-xs font-bold text-neutral-400 select-none flex items-center gap-1">
                        <span>{p.sceneNumber}</span>
                        {p.lockedScene && <Lock className="w-2.5 h-2.5 text-amber-500" />}
                      </div>
                    )}

                    {/* Section 3.6: Alternative Dialogue Take Bar — compact, right-aligned in the
                        left margin so it never covers the dialogue text it controls. */}
                    {['Dialogue','Dual Dialogue'].includes(p.type) && p.altDialogue && p.altDialogue.length > 1 && fragment.start===0 && (
                      <div className="dc-take-bar no-print select-none" role="group" aria-label={`Alternative takes, take ${(p.activeAltIndex ?? 0) + 1} of ${p.altDialogue.length}`}>
                        <button type="button" aria-label="Previous dialogue alternative take" title="Previous dialogue alternative take" onClick={() => liveRowEvents.current.handleSwitchAlternativeTake(p.id, -1)}><ChevronLeft className="w-3 h-3" /></button>
                        <span title={`Take ${(p.activeAltIndex ?? 0) + 1} of ${p.altDialogue.length}`}>{(p.activeAltIndex ?? 0) + 1}/{p.altDialogue.length}</span>
                        <button type="button" aria-label="Next dialogue alternative take" title="Next dialogue alternative take" onClick={() => liveRowEvents.current.handleSwitchAlternativeTake(p.id, 1)}><ChevronRight className="w-3 h-3" /></button>
                        <button type="button" aria-label="New Take" title="New alternative take" onClick={() => liveRowEvents.current.handleAddAlternativeTake(p.id)}>＋</button>
                        <button type="button" aria-label="Duplicate take" title="Duplicate take" onClick={()=>liveRowEvents.current.editTake(p.id,'duplicate')}>⧉</button>
                        <button type="button" aria-label="Delete take" title="Delete take" onClick={()=>liveRowEvents.current.editTake(p.id,'delete')}>✕</button>
                      </div>
                    )}

                    {/* Section 6: Margin Bookmark Ribbon (Left margin) */}
                    {showBookmarks && p.bookmark && (
                      <div
                        onClick={(e) => liveRowEvents.current.handleOpenBookmarkPopover(p.id, e)}
                        className="absolute -left-9 top-0.5 cursor-pointer select-none group/bm no-print z-10 transition-transform hover:scale-105"
                        title={`Bookmark: ${typeof p.bookmark === 'object' ? p.bookmark.name : p.bookmark}`}
                      >
                        <div
                          className="w-5 h-6 rounded-t-sm flex items-center justify-center shadow-md relative"
                          style={{
                            backgroundColor: typeof p.bookmark === 'object' ? p.bookmark.color : '#3b82f6',
                            clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 75%, 0 100%)',
                          }}
                        >
                          <Bookmark className="w-2.5 h-2.5 text-white fill-white" />
                        </div>
                      </div>
                    )}

                    {/* Cross-element selection highlight, from the shared layout's measured lines */}
                    {crossRange&&(()=>{const st=fragment.style,rects=fragment.lines.flatMap((line,k)=>{const a=Math.max(crossRange.start,line.start),b=Math.min(crossRange.end,line.end),through=crossRange.end>line.end||(crossRange.end===line.end&&k===fragment.lines.length-1&&crossRange.end===p.text.length&&p.text.length>crossRange.start);if(b<a||(b===a&&!through&&!(p.text.length===0)))return [];const indent=line.first?st.first*72:0,avail=fragment.width-indent,shift=indent+(st.align==='center'?(avail-line.width)/2:st.align==='right'?avail-line.width:0);const x1=shift+browserMeasure(p.text.slice(line.start,a),st,p,line.start),x2=through&&b>=line.end?shift+line.width+4:shift+browserMeasure(p.text.slice(line.start,b),st,p,line.start);return [{x:x1,y:k*st.line,w:Math.max(3,x2-x1),h:st.line}];});
                      return rects.map((r,k)=><div key={k} aria-hidden="true" className="dc-cross-selection no-print" style={{left:r.x+'pt',top:r.y+'pt',width:r.w+'pt',height:r.h+'pt'}}/>);})()}
                    {/* Main Text Input Area */}
                    <div
                      id={`para-${p.id}`}
                      className={`w-full relative transition-colors duration-150 ${
                        highlightedParagraphId === p.id
                          ? 'ring-2 ring-blue-500/80 rounded-sm bg-blue-500/10 px-1 -mx-1'
                          : ''
                      }`}
                    >
                      {p.omitted&&p.type==='Scene Heading'?<div aria-label="Omitted scene">SCENE {p.sceneNumber||''} — OMITTED</div>:fragment.imageHeight?(()=>{const image=p.images?.find(i=>i.id===fragment.imageId),asset=storyDocument.studio?.assets.find(a=>a.id===image?.assetId);return image&&asset?<div style={{height:fragment.imageHeight+'pt',textAlign:image.align}}><img src={asset.data} alt={image.alt} style={{display:'inline-block',width:(image.width*fragment.imageHeight/image.height)+'pt',height:fragment.imageHeight+'pt',objectFit:'contain',maxWidth:'100%'}}/></div>:null;})():<FragmentTextarea fragment={fragment} paragraphId={p.id}
                        id={`input-${p.id}`}
                        rows={1}
                        spellCheck={false} autoCorrect="off"
                        aria-label={elementLabel(p)}
                        dir="auto"
                        aria-autocomplete={p.type==='Character'?'list':undefined}
                        aria-controls={activeSuggestionParagraphId===p.id && suggestions.length?'dc-smarttype':undefined}
                        aria-expanded={p.type==='Character'?activeSuggestionParagraphId===p.id && suggestions.length>0:undefined}
                        aria-activedescendant={activeSuggestionParagraphId===p.id && suggestions.length?'dc-smarttype-option-'+selectedSuggestionIndex:undefined}
                        onCompositionStart={()=>{dirtyElements.current.delete(p.id);composition.current.add(p.id);setShortcutMode(false);setSuggestions([]);liveRowEvents.current.closeSpelling(false)}}
                        onCompositionEnd={e=>{composition.current.delete(p.id);liveRowEvents.current.handleTextChange(p.id,e.currentTarget.value,e.currentTarget,'insertCompositionText')}}
                        onClick={e=>{if(document.documentElement.dataset.tableReadClick==='true'&&['Dialogue','Dual Dialogue'].includes(p.type)&&e.currentTarget.selectionStart===e.currentTarget.selectionEnd){window.dispatchEvent(new CustomEvent('draftcraft-read-line',{detail:{paragraphId:p.id}}));return;}if(e.detail>=2){liveRowEvents.current.closeSpelling(false);return;}if(currentPreferences.current.writingSettings.leftClickSuggestions && e.detail===1 && !e.shiftKey && !e.ctrlKey && !e.metaKey && e.currentTarget.selectionStart===e.currentTarget.selectionEnd)liveRowEvents.current.openSpelling(p.id,e.clientX,e.clientY,true)}}
                        onContextMenu={e=>{if(liveRowEvents.current.openSpelling(p.id,e.clientX,e.clientY,false,true)){e.preventDefault();e.stopPropagation();}}}
                        onFocus={e => { if(toolbarTimer.current){clearTimeout(toolbarTimer.current);toolbarTimer.current=null;} toolbarHeld.current = false; setToolbarId(p.id); liveRowEvents.current.rememberSelection(e.currentTarget); liveRowEvents.current.onFocusedParagraphChange?.(p); if(p.type==='Character')liveRowEvents.current.showCharacterSuggestions(p.id,p.text,e.currentTarget); }}
                        onSelect={e => liveRowEvents.current.rememberSelection(e.currentTarget)}
                        onBlur={e => {liveRowEvents.current.rememberSelection(e.currentTarget);liveRowEvents.current.finishEditedElement(p.id,e.currentTarget,e.relatedTarget);setDraftWord(null);if(!(e.relatedTarget instanceof HTMLTextAreaElement && e.relatedTarget.id.startsWith('input-')))setShortcutMode(false);}}
                        value={p.text}
                        onChange={(e) => liveRowEvents.current.handleTextChange(p.id, e.target.value, e.target, (e.nativeEvent as InputEvent).inputType)}
                        onKeyDown={(e) => liveRowEvents.current.handleKeyDown(e, globalIndex, p)}
                        onKeyUp={e => liveRowEvents.current.handleKeyUp(e)}
                        onCopy={e=>liveRowEvents.current.handleCrossCopy(e,false)} onCut={e=>liveRowEvents.current.handleCrossCopy(e,true)} onPaste={e=>liveRowEvents.current.handleCrossPaste(e,p)}
                        placeholder={
                          p.type === 'Scene Heading'
                            ? 'INT. / EXT. LOCATION - TIME'
                            : p.type === 'Character'
                            ? 'CHARACTER NAME'
                            : p.type === 'Dialogue'
                            ? 'Dialogue...'
                            : p.type === 'Parenthetical'
                            ? '(parenthetical)'
                            : p.type === 'New Act'
                            ? 'ACT ONE'
                            : p.type === 'End of Act'
                            ? 'END OF ACT ONE'
                            : 'Action description...'
                        }
                        className={`w-full bg-transparent resize-none overflow-hidden focus:outline-none transition-colors border-none p-0 ${format?'':getElementStyle(p.type)} ${p.revised && productionMode ? 'text-blue-400 dark:text-blue-300' : ''}${rowStyled?' dc-styled-text':''}`}
                        style={{
                          // Longhands, not `padding:0`: elementCss carries paddingLeft/paddingRight (the element indents, which
                          // the positioned fragment column already applies). With the shorthand, React re-sets only the changed
                          // longhand when a paragraph changes type in place, so the old shorthand stops winning and the indents
                          // are applied twice (a cue 2.2" too far right, a parenthetical one letter wide).
                          ...elementCss(geometryFormat,p),paddingTop:0,paddingRight:0,paddingBottom:0,paddingLeft:0,textIndent:fragment.style.first+'in',textAlign:fragment.style.align==='left'?'start':fragment.style.align,
                          fieldSizing: 'content' as any,
                          minHeight: format?styleFor(format,p).line+'pt':'1.2em',
                        }}
                      />}
                      {!(p.omitted&&p.type==='Scene Heading')&&!fragment.imageHeight&&(rowStyled||presentationMarks)&&<TextMirror text={p.text} runs={p.runs} styled={rowStyled} marks={presentationMarks} last={fragment.end>=p.text.length}/>}

                      {rowErrors.length>0 && <SpellingLayer id={p.id} text={p.text} errors={rowErrors} underline={writingSettings.underlines} />}
                    </div>

                    {/* Annotation rail: notes, scene comments and review markers live in the
                        right page margin so they never cover screenplay text or change pagination. */}
                    {fragment.start===0&&(()=>{const comment=showSceneComments&&p.type==='Scene Heading'&&!!p.sceneComment,notes=showScriptNotes&&p.notes?.length?p.notes:null,review=p.conversionReview;if(!comment&&!notes&&!review)return null;
                      return <div className="dc-margin-annotations no-print" style={{left:(contentWidthPt-fragment.x+40)+'pt'}}>
                        {comment&&<button type="button" className="dc-margin-marker dc-margin-comment" aria-label="Edit Scene Production Comment" title={'Scene comment: '+p.sceneComment} onMouseDown={e=>e.preventDefault()} onClick={()=>setEditingSceneCommentId(editingSceneCommentId===p.id?null:p.id)}><Clapperboard className="w-3 h-3"/></button>}
                        {notes&&(()=>{const theme=SCRIPT_NOTE_THEMES[notes[0].color]||SCRIPT_NOTE_THEMES.yellow;return <button type="button" className={`dc-margin-marker ${theme.bgClass} ${theme.textClass} border ${theme.borderClass}`} aria-label={`Script notes (${notes.length})`} title={notes.map(n=>(n.name?n.name+' — ':'')+n.author+': '+n.text).join('\n')} onMouseDown={e=>e.preventDefault()} onClick={e=>{e.stopPropagation();liveRowEvents.current.handleOpenNotePopover(p.id,notes[0].id,e);}}><MessageSquare className="w-3 h-3"/>{notes.length>1&&<span className="dc-margin-count">{notes.length}</span>}</button>;})()}
                        {review&&<button type="button" className="dc-margin-marker dc-margin-review" aria-label={review+' — review this converted element'} title={review} onClick={()=>{setToolbarId(p.id);document.getElementById('input-'+p.id)?.focus({preventScroll:true});}}>!</button>}
                      </div>;})()}
                    {showSceneComments&&p.type==='Scene Heading'&&editingSceneCommentId===p.id&&fragment.start===0&&(
                      <div role="dialog" aria-label="Scene Production Comment" className="dc-scene-comment-editor no-print" style={{top:(fragment.height+4)+'pt'}} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();setEditingSceneCommentId(null);document.getElementById('input-'+p.id)?.focus({preventScroll:true});}}}>
                        <div className="flex items-center justify-between text-[9px] uppercase tracking-wider text-emerald-400 font-bold">
                          <span className="flex items-center gap-1"><Clapperboard className="w-3 h-3" />Scene Production Comment &amp; Directorial Note</span>
                          <span className="flex items-center gap-1">
                            <button type="button" onClick={()=>{liveRowEvents.current.handleUpdateSceneComment(p.id,'');setEditingSceneCommentId(null);}} className="text-neutral-500 hover:text-red-400 text-[10px] px-1 normal-case" title="Delete Scene Comment">Delete</button>
                            <button type="button" onClick={()=>{setEditingSceneCommentId(null);document.getElementById('input-'+p.id)?.focus({preventScroll:true});}} className="text-emerald-300 hover:text-white text-[10px] px-1 normal-case" title="Close comment editor">Done</button>
                          </span>
                        </div>
                        <textarea autoFocus rows={3} aria-label="Scene comment text" value={p.sceneComment || ''} onChange={(e) => liveRowEvents.current.handleUpdateSceneComment(p.id, e.target.value)} placeholder="Add scene lighting, sound cues, camera package, or blocking notes..." className="w-full bg-black/40 border border-white/10 rounded p-1.5 text-emerald-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-400/60 resize-none text-[11px]" />
                      </div>
                    )}

                    {/* Scene Number on Right Margin */}
                    {p.type === 'Scene Heading' && p.sceneNumber && (sceneNumberPlacement === 'right' || sceneNumberPlacement === 'both') && !hideRightSceneNumber(autoHideRightSceneNumbers, fragment, p.sceneNumber, contentWidthPt) && (
                      <div className="dc-scene-number-right absolute -right-8 top-1 font-screenplay font-bold text-neutral-400 select-none">
                        {p.sceneNumber}
                      </div>
                    )}

                    {/* Production Revision Asterisk `*` (Strictly distinct from editorial annotations) */}
                    {p.revised && productionMode && (
                      <div
                        className="absolute -right-12 top-1 font-screenplay font-bold text-blue-500 text-sm select-none"
                        title="Revised line in production draft"
                      >
                        *
                      </div>
                    )}
                  </div>
                );
                if(!fragment.imageHeight)rowCache.current.set(rowKey,{paragraph:p,state:rowState,fragment,node,pageKey:page.pageNumber+':'+pageIndex});
                return node;
              })}
            </div>
          </div>)}
          {hasPageStory && <StoryPanels {...storyProps} position="below" page={page.pageNumber} pagePosition="below"/>}
          </React.Fragment>
        ))}
      </div>
      <div className="dc-story-dock no-print"><StoryPanels {...storyProps} position="below"/></div>

      {/* Section 6: Note Popover Overlay */}
      <UIPresence>{activeNotePopover && (
        <NotePopover
          notes={paragraphs.find((p) => p.id === activeNotePopover.paragraphId)?.notes || []}
          activeNoteId={activeNotePopover.noteId}
          paragraphId={activeNotePopover.paragraphId}
          paragraphType={paragraphs.find((p) => p.id === activeNotePopover.paragraphId)?.type || 'Action'}
          defaultAuthor={activeAuthor}
          position={activeNotePopover.position}
          onClose={() => setActiveNotePopover(null)}
          onSaveNote={handleSaveNote}
          onDeleteNote={handleDeleteNote}
          onAddAnotherNote={() => {
            const p = paragraphs.find((pr) => pr.id === activeNotePopover.paragraphId);
            if (p) {
              const newNote: ScriptNote = {
                id: `note-${Date.now()}`,
                name: 'Director Note',
                author: activeAuthor,
                text: '',
                color: 'yellow',
                category: 'direction',
                createdAt: new Date().toLocaleDateString(),
                paragraphId: p.id,
              };
              handleSaveNote(newNote);
              setActiveNotePopover({
                paragraphId: p.id,
                noteId: newNote.id,
                position: activeNotePopover.position,
              });
            }
          }}
        />
      )}</UIPresence>

      {/* Section 6: Bookmark Popover Overlay */}
      <UIPresence>{activeBookmarkPopover && (
        <BookmarkPopover
          bookmark={paragraphs.find((p) => p.id === activeBookmarkPopover.paragraphId)?.bookmark}
          paragraphId={activeBookmarkPopover.paragraphId}
          paragraphText={paragraphs.find((p) => p.id === activeBookmarkPopover.paragraphId)?.text || ''}
          position={activeBookmarkPopover.position}
          onClose={() => setActiveBookmarkPopover(null)}
          onSaveBookmark={handleSaveBookmark}
          onRemoveBookmark={() => {
            handleRemoveBookmark(activeBookmarkPopover.paragraphId);
          }}
        />
      )}</UIPresence>
    </div>
    </div>
  );
};
