import {SceneListView} from './components/SceneListView';
import {IndexCardsView} from './components/IndexCardsView';
import {findOccurrences,replaceDocumentOccurrences,type SearchOccurrence,type SearchOptions} from './editor/search';
import {inputForOffset} from './production/FragmentTextarea';
import {cloneDocumentGraph,documentGraphIssues} from './files/documentGraph.mjs';
import {upgradeDocumentFormat} from './formats/storage';
import {InterchangeReview,interchangeLosses,type ExportReview} from './production/InterchangeReview';
import {extractPdf,type PdfReview} from './production/pdfImport';
import {PdfImportDialog} from './production/PdfImportDialog';
import {SendToScriptDialog} from './production/SendToScriptDialog';
import {synchronizePlanning,type PlanningSource} from './production/planning';
import {WritingActivity,type ActivityOrigin} from './production/activity';
import {documentLayout,layoutScript} from './production/layout';
import {DictationPanel} from './production/DictationPanel';
import {useCollaboration} from './collaboration/useCollaboration';
import {CollaborationPanel} from './collaboration/CollaborationPanel';
import {ProductionPanel,type ProductionSection,type EditorSelection} from './production/ProductionPanel';
import {updateCastLists} from './production/queries';
import {lockLayout,unlockLayout} from './production/layout';
import {migrateStudio,reconcileStudio,pairDialogue,renameCharacter} from './production/model';
import {invalidateLayoutFonts} from './production/layout';
import {parsePlainText,parseRtf} from './formats/interchange';
import {FORMAT_TEMPLATES} from './formats/catalog';
import {FormatStudio,type FormatPanel} from './components/FormatStudio';
import './formats/formats.css';
import {allTemplates,browserPrefs,newFromTemplate} from './formats/storage';
import {STANDARD_FORMAT} from './formats/catalog';
import type {FormatTemplate} from './formats/model';
import {DEFAULT_SMART,speedFormat} from './formats/model';
import { SidebarFrame, UIPresence, UIProvider, scrollMotion } from './components/ui/Presentation';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { CharacterIndex, WordCountIndex, characterName, loadWritingSettings, normalizeWord, WRITING_SETTINGS_KEY, type WritingSettings } from './writing/model';
import { WritingAssistanceSettings } from './components/WritingAssistanceSettings';
import {AutomaticPunctuationSettings} from './components/AutomaticPunctuationSettings';
import { KeyboardShortcutSettings } from './components/KeyboardShortcutSettings';
import { useProjectFiles } from './files/useProjectFiles';
import { blankDocument } from './files/model';
import { FilesAutosaveSettings, SaveStatus } from './components/FilesAutosaveSettings';
import { EditorSettings } from './components/EditorSettings';
import { loadEditorPreferences, EDITOR_PREFS_KEY, type EditorPreferences } from './editor/preferences';
import { buildStoryIndex, insertStructureMarker, storySettings, resolveAnchor, type StoryFeature } from './story/model';
import type { StorySelection } from './components/StoryTools';
import { activeProfile, displayShortcut, loadShortcutSettings, SHORTCUT_SETTINGS_KEY, type ShortcutSettings } from './shortcuts/model';
import {
  ScriptDocument,
  Paragraph,
  ElementType,
  RevisionTier,
  SceneNumberPlacement,
} from './types/script';
import { BeatSize } from './utils/beatSizing';
import { SAMPLE_SCRIPT } from './data/sampleScript';
import { exportToFdx, parseFdx } from './utils/fdxCodec';
import { exportToFountain, parseFountain } from './utils/fountainCodec';
import { buildSmartTypeFromScript, SmartTypeDictionary } from './utils/smartType';
import { runFormattingDoctor, applyDoctorFix, fixDoctorIssues, FormatIssue } from './utils/formatDoctor';
import { MacOsMenubar } from './components/MacOsMenubar';
import { ScriptEditor, flushPendingPages } from './components/ScriptEditor';
import { BeatBoard } from './components/BeatBoard';
import { OutlineEditor } from './components/OutlineEditor';
import { DeferredNavigator } from './components/NavigatorSidebar';
import { GettingStartedGuide } from './help/GettingStartedGuide';
import { StartWindow } from './start/StartWindow';
import { isEditable, type InsertTarget } from './emoji/emoji';
// The emoji picker and its data load on first use.
const EmojiPicker = React.lazy(() => import('./emoji/EmojiPicker'));
import { ideaToDraftDocument, tutorial, type TutorialKind } from './help/ideaToDraft';
import { FindReplaceBar } from './components/FindReplaceBar';
import { SmartTypeManagerModal } from './components/SmartTypeManagerModal';
import { FormatDoctorModal } from './components/FormatDoctorModal';
import { NamesDatabaseModal } from './components/NamesDatabaseModal';
import type {ReadHighlight} from './components/AiTableReadModal';
import type {ReadScope} from './tableRead/model';
import { AiTableReadModal } from './components/AiTableReadModal';
import { AiResearchModal } from './components/AiResearchModal';
import { AiImageAnalysisModal } from './components/AiImageAnalysisModal';
import { ProductionRevisionsModal } from './components/ProductionRevisionsModal';
import { TitlePageModal } from './components/TitlePageModal';
import { HeaderFooterModal } from './components/HeaderFooterModal';
import { ProductionReportsModal } from './components/ProductionReportsModal';
import { RustEngineModal } from './components/RustEngineModal';
import { ScriptCompareModal } from './components/ScriptCompareModal';
import { FileManagerModal } from './components/FileManagerModal';
import { PrintAndPdfModal } from './components/PrintAndPdfModal';
import { StatusBar } from './components/StatusBar';
import { ProductivityModal } from './components/ProductivityModal';
import { WelcomeStatsModal } from './components/WelcomeStatsModal';
import {
  saveDocumentWithBackup,
  loadBackupSettings,
  checkCrashRecoveryState,
  clearCrashRecoveryState,
} from './utils/fileManagerStorage';
import {
  ProductivityStore,
  TimerState,
  SessionStats,
} from './types/productivity';
import {
  loadProductivityStore,
  saveProductivityStore,
  recordActivityDelta,
  getTodayKey,
  computeStreaks,
  playSprintChime,
} from './utils/productivityStorage';
import { paginateScript } from './utils/pagination';
import { ScriptViewMode, SplitScreenMode } from './types/script';
import { loadWorkspace, saveWorkspace, TOOLBAR_GROUP_IDS, type ToolbarGroupId, type WorkspacePreferences, type NavigatorPreferences } from './workspace/preferences';
import { StructureSettings } from './workspace/StructureSettings';
import { KNOWN_ITEMS, ITEM_BY_ID } from './workspace/commands';
import { Toolbar, TitleRow, toggleGroup, type ToolbarState } from './workspace/Toolbar';
import { Timeline, beatGoals, beatParents, beatSequenceGroups, placeBeat, type TimelineApi } from './workspace/Timeline';
import { moveSceneBefore } from './editor/scenes';

const EMPTY_DICTIONARY: string[] = [];
const OUTLINE_ELEMENTS=new Set<ElementType>(['Outline Level 1','Outline Level 2','Outline Level 3']);
const STORAGE_KEY = 'draftcraft_screenplay_doc_v1';

export default function App() {
  const [writingSettings, setWritingSettings] = useState<WritingSettings>(loadWritingSettings);
  const currentWritingSettings=useRef(writingSettings); currentWritingSettings.current=writingSettings;
  const [formatPanel,setFormatPanel]=useState<FormatPanel|null>(null);
  const [formatTransaction,setFormatTransaction]=useState<{token:string;before:ScriptDocument;after:ScriptDocument;alreadyApplied?:boolean}|undefined>();
  const [isWritingSettingsOpen, setIsWritingSettingsOpen] = useState(false);
  const [isPunctuationSettingsOpen,setIsPunctuationSettingsOpen]=useState(false);
  const [shortcutSettings, setShortcutSettings] = useState<ShortcutSettings>(loadShortcutSettings);
  const [isShortcutSettingsOpen, setIsShortcutSettingsOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [guideQuery, setGuideQuery] = useState<string | undefined>(undefined);
  // 1.18: the Start Window, and DraftCraft's emoji picker (with the field it inserts into).
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [emojiTarget, setEmojiTarget] = useState<InsertTarget | null>(null);
  const lastTextField = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const remember = (e: FocusEvent) => { const t = e.target as HTMLElement | null; if (t && isEditable(t) && !t.closest('.dc-emoji-picker, .dc-start')) lastTextField.current = t; };
    document.addEventListener('focusin', remember, true);
    return () => document.removeEventListener('focusin', remember, true);
  }, []);
  // ⌃⌘E opens the emoji picker in the browser version (the desktop menu item carries the same shortcut).
  useEffect(() => {
    if (window.draftcraftDesktop) return;
    const key = (e: KeyboardEvent) => { if (e.ctrlKey && e.metaKey && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'e') { e.preventDefault(); openEmojiPickerRef.current(); } };
    window.addEventListener('keydown', key, true); return () => window.removeEventListener('keydown', key, true);
  }, []);
  const openEmojiPickerRef = useRef<() => void>(() => {});
  const openEmojiPicker = (target?: { paragraphId: string; start: number; end: number } | null) => {
    let element: HTMLElement | null = null, start: number | undefined, end: number | undefined;
    if (target?.paragraphId) { element = inputForOffset(target.paragraphId, target.start) as HTMLElement | null; start = target.start; end = target.end; }
    else { const active = document.activeElement as HTMLElement | null; element = active && isEditable(active) ? active : lastTextField.current; if (element && !element.isConnected) element = null; if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) { start = element.selectionStart ?? undefined; end = element.selectionEnd ?? undefined; } }
    setEmojiTarget({ element, start, end });
  };
  openEmojiPickerRef.current = () => openEmojiPicker();
  const [editorPreferences,setEditorPreferences]=useState<EditorPreferences>(loadEditorPreferences);
  const [editorSettings,setEditorSettings]=useState<{selection?:StorySelection;page?:number;tab?:'caret'|'formatting'}|null>(null);
  useEffect(()=>{localStorage.setItem(EDITOR_PREFS_KEY,JSON.stringify(editorPreferences))},[editorPreferences]);
  useEffect(() => { localStorage.setItem(SHORTCUT_SETTINGS_KEY, JSON.stringify(shortcutSettings)); }, [shortcutSettings]);
  const pendingActivityOrigin=useRef<ActivityOrigin>('ignored');
  const characterIndex = useRef(new CharacterIndex());
  const [doc, setDocState] = useState<ScriptDocument>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.sceneNumberPlacement) parsed.sceneNumberPlacement = 'both';
        return migrateStudio(characterIndex.current.reconcile(parsed, writingSettings.rememberCharacters));
      }
    } catch (e) {
      console.error('Failed to load document from localStorage', e);
    }
    if(window.draftcraftDesktop?.documentSlot)return blankDocument();
    return migrateStudio(characterIndex.current.reconcile({ ...SAMPLE_SCRIPT, sceneNumberPlacement: 'both' }, writingSettings.rememberCharacters));
  });

  const wordCounts=useRef(new WordCountIndex());
  const documentWordCount=wordCounts.current.count(doc.paragraphs);
  const latestDoc = useRef(doc); latestDoc.current = doc;
  const collaboration=useCollaboration(doc,next=>applyNativeDocument(next));
  const appCommands=useRef<(command:string)=>void>(()=>{});
  const workspaceCommand=useRef<(command:string)=>void>(()=>{});
  const [isHeaderFooterOpen,setIsHeaderFooterOpen]=useState(false);
  const [dictationOpen,setDictationOpen]=useState(false);
  const [toolbarCustomizing,setToolbarCustomizing]=useState(false);
  const [collaborationOpen,setCollaborationOpen]=useState(false);
  const projectSwitch=useRef<((next:ScriptDocument)=>Promise<boolean>)|null>(null);
  const applyNativeDocument=useCallback((next:ScriptDocument)=>{const normalized=updateCastLists(migrateStudio(characterIndex.current.reconcile(next,currentWritingSettings.current.rememberCharacters)));latestDoc.current=normalized;setDocState(normalized)},[]);
  const setDoc:React.Dispatch<React.SetStateAction<ScriptDocument>>=update=>{if(collaboration.readOnly)return;const next=typeof update==='function'?update(latestDoc.current):update;if(next.id!==latestDoc.current.id&&window.draftcraftDesktop?.initializeProject&&projectSwitch.current){void projectSwitch.current(next);return;}const before=latestDoc.current;const reconciled=reconcileStudio(before,synchronizePlanning(before,next));applyNativeDocument(synchronizePlanning(before,reconciled));};
  const loadNativeDocument=useCallback((next:ScriptDocument)=>{characterIndex.current.reconcile(next,currentWritingSettings.current.rememberCharacters);const normalized=migrateStudio(characterIndex.current.reconcile(next,currentWritingSettings.current.rememberCharacters));latestDoc.current=normalized;setDocState(normalized)},[]);
  const nativeFiles=useProjectFiles(doc,latestDoc,loadNativeDocument,file=>{if(file.base64){const bytes=Uint8Array.from(atob(file.base64),c=>c.charCodeAt(0));void handleImportPdf(new File([bytes],file.name,{type:'application/pdf'}));return;}const input=new File([file.text],file.name,{type:'text/plain'});if(/\.fdxt?$/i.test(file.name))void handleOpenFdx(input);else if(/\.(txt|rtf)$/i.test(file.name))void handleOpenText(input);else void handleOpenFountain(input)});
  projectSwitch.current=nativeFiles.change;
  const [filesSettings,setFilesSettings]=useState(false);
  const [fileStatus,setFileStatus]=useState('');
  const formatMigrationFlight=useRef(false);
  useEffect(()=>{if(!nativeFiles.ready||formatMigrationFlight.current)return;const current=latestDoc.current,next=upgradeDocumentFormat(current);if(next===current)return;formatMigrationFlight.current=true;void(async()=>{try{await nativeFiles.checkpoint();if(latestDoc.current===current)applyNativeDocument(next);}catch(error){setFileStatus('Layout migration needs a recoverable checkpoint: '+String(error));}finally{formatMigrationFlight.current=false;}})();},[doc.id,nativeFiles.ready,doc.writingFormat]);

  useEffect(() => {
    try { localStorage.setItem(WRITING_SETTINGS_KEY, JSON.stringify(writingSettings)); }
    catch (error) { console.error('Could not save writing preferences', error); }
    setDoc(previous => previous);
  }, [writingSettings]);

  // Dimension patches persist across view switches. Applying a patch only to
  // width/height preserves later title edits, colors, movement and script edits.
  type ResizeEntry = { id: string; previous: BeatSize; next: BeatSize };
  const [resizeHistory, setResizeHistory] = useState<ResizeEntry[]>([]);
  const [resizeRedo, setResizeRedo] = useState<ResizeEntry[]>([]);
  useEffect(() => { setResizeHistory([]); setResizeRedo([]); }, [doc.id]);
  const commitBeatResize = (id: string, previous: BeatSize, next: BeatSize) => {
    const card = doc.beats.find(b => b.id === id);
    if (!card || card.width !== previous.width || card.height !== previous.height) return;
    if (previous.width === next.width && previous.height === next.height) return;
    setResizeHistory(entries => [...entries.slice(-49), { id, previous, next }]); setResizeRedo([]);
    setDoc(current => ({ ...current, beats: current.beats.map(b => b.id === id ? { ...b, ...next } : b) }));
  };
  const undoBeatResize = () => {
    const entry = resizeHistory.at(-1);
    if (!entry) return;
    const card = doc.beats.find(b => b.id === entry.id);
    if (!card || card.width !== entry.next.width || card.height !== entry.next.height) return;
    setDoc(current => ({ ...current, beats: current.beats.map(b => b.id === entry.id ? { ...b, ...entry.previous } : b) }));
    setResizeHistory(entries => entries.slice(0, -1)); setResizeRedo(entries => [...entries, entry]);
  };
  const redoBeatResize = () => {
    const entry = resizeRedo.at(-1);
    if (!entry) return;
    const card = doc.beats.find(b => b.id === entry.id);
    if (!card || card.width !== entry.previous.width || card.height !== entry.previous.height) return;
    setDoc(current => ({ ...current, beats: current.beats.map(b => b.id === entry.id ? { ...b, ...entry.next } : b) }));
    setResizeRedo(entries => entries.slice(0, -1)); setResizeHistory(entries => [...entries, entry]);
  };

  const [exportReview,setExportReview]=useState<ExportReview|null>(null);
  const reviewExport=(format:string,run:()=>void)=>{const warnings=interchangeLosses(latestDoc.current,format);if(warnings.length)setExportReview({format,warnings,run});else run();};
  const pdfInput=useRef<HTMLInputElement>(null);
  const [pdfReview,setPdfReview]=useState<PdfReview|null>(null);
  const pdfImportJob=useRef<AbortController|null>(null);
  const handleImportPdf=async(file:File)=>{pdfImportJob.current?.abort();const job=new AbortController();pdfImportJob.current=job;setFileStatus('Extracting PDF text…');try{const review=await extractPdf(file,job.signal,(page,total)=>setFileStatus(`Extracting PDF page ${page} of ${total}…`));if(!job.signal.aborted){setPdfReview(review);setFileStatus('PDF ready for review; original file unchanged.');}}catch(error){if(!job.signal.aborted)setFileStatus((error as Error).message);}};
  const [planningSource,setPlanningSource]=useState<PlanningSource|null>(null);
  const [productionSection,setProductionSection]=useState<ProductionSection|null>(null);
  const savedEditorSelection=useRef<EditorSelection|null>(null);
  function rememberEditorSelection(){const active=document.activeElement;if(active instanceof HTMLTextAreaElement&&active.dataset.editorParagraph)savedEditorSelection.current={paragraphId:active.dataset.editorParagraph,start:active.selectionStart,end:active.selectionEnd};}
  function openProduction(section:ProductionSection){const active=document.activeElement,input=active instanceof HTMLTextAreaElement&&active.dataset.editorParagraph?active:document.getElementById('input-'+focusedParagraphId) as HTMLTextAreaElement|null;if(input?.dataset.editorParagraph)savedEditorSelection.current={paragraphId:input.dataset.editorParagraph,start:input.selectionStart,end:input.selectionEnd};setProductionSection(section);}

  const [fontLayoutEpoch,setFontLayoutEpoch]=useState(0);
  const composingLayout=useRef(false),lastLayoutPages=useRef<ReturnType<typeof paginateScript>>([]);
  useEffect(()=>{let alive=true;const ready=()=>{if(alive){invalidateLayoutFonts();setFontLayoutEpoch(v=>v+1);}};void document.fonts.ready.then(ready);document.fonts.addEventListener('loadingdone',ready);const begin=()=>{composingLayout.current=true;},end=()=>{composingLayout.current=false;setFontLayoutEpoch(v=>v+1);};document.addEventListener('compositionstart',begin,true);document.addEventListener('compositionend',end,true);return()=>{alive=false;document.fonts.removeEventListener('loadingdone',ready);document.removeEventListener('compositionstart',begin,true);document.removeEventListener('compositionend',end,true);};},[]);
  useEffect(()=>{const remember=(event:Event)=>{const input=event.target;if(input instanceof HTMLTextAreaElement&&input.dataset.editorParagraph)savedEditorSelection.current={paragraphId:input.dataset.editorParagraph,start:input.selectionStart,end:input.selectionEnd};};document.addEventListener('select',remember,true);return()=>document.removeEventListener('select',remember,true);},[]);
  const commitResolved=(after:ScriptDocument)=>{if(collaboration.readOnly||after.id!==latestDoc.current.id)return;const before=latestDoc.current;setActiveView('script');applyNativeDocument(after);setFormatTransaction({token:crypto.randomUUID(),before,after,alreadyApplied:true});};
  const commitProduction=(after:ScriptDocument)=>{if(collaboration.readOnly)return;const before=latestDoc.current;if(after.id!==before.id)return;setActiveView('script');const next=reconcileStudio(before,after,{track:false});applyNativeDocument(next);setFormatTransaction({token:crypto.randomUUID(),before,after:next,alreadyApplied:true});};
  const [scriptPresentation,setScriptPresentation]=useState<'pages'|'scenes'|'cards'>('pages');
  const [activeView, setActiveView] = useState<'script' | 'beatboard' | 'outline' | 'reports'>('script');
  const [zoom, setZoom] = useState<number>(100);
  const [focusedParagraphId, setFocusedParagraphId] = useState<string | null>(null);
  // 1.17: the caret's element is shown in the toolbar, status bar and timeline a frame later (a transition), so moving
  // to a new element does not re-render the whole window inside the keystroke that created it.
  const latestFocusedId=useRef<string|null>(null);
  // Status bar: the scene the caret is in (its number, or its position when scenes are not numbered) and the scene count.
  const caretScene=useMemo(()=>{let count=0,number='',seen=!focusedParagraphId;for(const p of doc.paragraphs){if(p.type==='Scene Heading'&&!p.omitted){count++;if(!seen)number=p.sceneNumber||String(count);}if(p.id===focusedParagraphId)seen=true;}return {number,count};},[doc.paragraphs,focusedParagraphId]);
  useEffect(()=>{if(focusedParagraphId&&collaboration.active)collaboration.presence(focusedParagraphId);},[focusedParagraphId]);
  const scriptPages = useMemo(()=>{if(composingLayout.current&&lastLayoutPages.current.length)return lastLayoutPages.current;const pages=documentLayout(doc).pages;lastLayoutPages.current=pages;return pages;},[doc.paragraphs,doc.lockedPages,doc.writingFormat,doc.studio,fontLayoutEpoch]);
  const storyIndex=useMemo(()=>buildStoryIndex(doc.paragraphs,doc.lockedPages,scriptPages),[doc.paragraphs,doc.lockedPages,scriptPages]);
  // Speed View draws the editor with flattened indents; everything page-dependent keeps the real pagination above.
  const [speedView,setSpeedView]=useState(false);
  const displayFormat=useMemo(()=>speedView?speedFormat(doc.writingFormat||STANDARD_FORMAT):undefined,[speedView,doc.writingFormat]);
  const [hideOutline,setHideOutline]=useState(false);
  const displayIndex=useMemo(()=>{if(!displayFormat&&!hideOutline)return storyIndex;const shown=hideOutline?doc.paragraphs.filter(p=>!OUTLINE_ELEMENTS.has(p.type)):doc.paragraphs;return buildStoryIndex(shown,doc.lockedPages,layoutScript(shown,displayFormat||doc.writingFormat||STANDARD_FORMAT,doc.studio).pages);},[displayFormat,hideOutline,doc.paragraphs,doc.lockedPages,doc.studio,doc.writingFormat,storyIndex,fontLayoutEpoch]);
  const updateStory=useCallback((next:ScriptDocument)=>{if(next.id!==latestDoc.current.id)return;setDoc(previous=>({...previous,storyStructure:next.storyStructure,outlineLanes:next.outlineLanes,outlineMarkers:next.outlineMarkers,beats:next.beats,flowLines:next.flowLines}))},[]);
  const openEditorSettings=useCallback((selection?:StorySelection,page?:number,tab?:'caret'|'formatting')=>setEditorSettings({selection,page,tab}),[]);
  const handlePageStructure=(page:number,command:string)=>{
    if(['act','plot','marker'].includes(command)){
      const next=insertStructureMarker(latestDoc.current,storyIndex,page,command as 'act'|'plot'|'marker');updateStory(next);openEditorSettings({kind:'marker',id:next.outlineMarkers.at(-1)!.id},page);
    }else if(command==='toggle-markers'){
      const s=storySettings(doc.storyStructure),d=s.displays.markers;const existing=d.pages.some(a=>Math.floor(resolveAnchor(a,storyIndex))+1===page);
      updateStory({...doc,storyStructure:{...s,displays:{...s.displays,markers:{...d,enabled:true,hidden:false,allPages:false,pages:existing?d.pages.filter(a=>Math.floor(resolveAnchor(a,storyIndex))+1!==page):[...d.pages,{page,paragraphId:storyIndex.pages[page-1]?.paragraphs[0]?.id}]}}}});
    }else openEditorSettings(undefined,page);
  };
  // Window arrangement, views and appearance (this computer's preferences, never stored in documents).
  const [workspace,setWorkspaceState]=useState<WorkspacePreferences>(()=>loadWorkspace(KNOWN_ITEMS));
  const setWorkspace=useCallback((update:WorkspacePreferences|((w:WorkspacePreferences)=>WorkspacePreferences))=>setWorkspaceState(w=>{const next=typeof update==='function'?update(w):update;saveWorkspace(next);return next;}),[]);
  const [systemDark,setSystemDark]=useState(()=>typeof matchMedia==='function'?matchMedia('(prefers-color-scheme: dark)').matches:true);
  useEffect(()=>{if(typeof matchMedia!=='function')return;const query=matchMedia('(prefers-color-scheme: dark)'),change=()=>setSystemDark(query.matches);query.addEventListener('change',change);return()=>query.removeEventListener('change',change);},[]);
  const appearance=workspace.appearance==='system'?(systemDark?'dark':'light'):workspace.appearance;
  const isDarkMode=appearance!=='light';
  const setIsDarkMode=(dark:boolean)=>setWorkspace(w=>({...w,appearance:dark?'dark':'light'}));
  useEffect(()=>{document.documentElement.dataset.storyTheme=isDarkMode?'dark':'light';document.documentElement.dataset.appearance=appearance;},[isDarkMode,appearance]);
  useEffect(()=>setSpeedView(workspace.view==='speed'),[workspace.view]);
  useEffect(()=>setHideOutline(!workspace.showOutlineElements),[workspace.showOutlineElements]);
  const isNavigatorOpen=workspace.navigator.open;
  const setIsNavigatorOpen=(open:boolean)=>setWorkspace(w=>({...w,navigator:{...w.navigator,open}}));
  // Navigator Scenes view, columns and column widths (the Navigator keeps open/width as they are).
  const navigatorPrefs=useCallback((patch:Partial<NavigatorPreferences>)=>setWorkspace(w=>({...w,navigator:{...w.navigator,...patch}})),[setWorkspace]);

  // Modals & Panels state
  const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);
  const [findMatches, setFindMatches] = useState<SearchOccurrence[]>([]);
  const findState=useRef<{options:SearchOptions;matches:SearchOccurrence[];index:number}>({options:{query:'',wholeWord:false,matchCase:false},matches:[],index:0});
  const [currentMatchIdx, setCurrentMatchIdx] = useState(0);

  const [isSmartTypeManagerOpen, setIsSmartTypeManagerOpen] = useState(false);
  const [smartTypeDict, setSmartTypeDict] = useState<SmartTypeDictionary>(() =>
    buildSmartTypeFromScript(doc.paragraphs)
  );

  const [isFormatDoctorOpen, setIsFormatDoctorOpen] = useState(false);
  const [isNamesDatabaseOpen, setIsNamesDatabaseOpen] = useState(false);

  const [isTableReadOpen, setIsTableReadOpen] = useState(false);
  const [tableReadLaunch,setTableReadLaunch]=useState<{token:number;view:'player'|'cast'|'settings'|'export';paragraphId?:string;scope?:ReadScope;character?:string}>({token:0,view:'player'});
  const [readHighlight,setReadHighlight]=useState<ReadHighlight>();
  const openTableRead=(view:'player'|'cast'|'settings'|'export'='player',paragraphId?:string,scope?:ReadScope,character?:string)=>{setTableReadLaunch(p=>({token:p.token+1,view,paragraphId,scope,character}));setIsTableReadOpen(true)};

  const [isResearchOpen, setIsResearchOpen] = useState(false);
  const [researchSnippet, setResearchSnippet] = useState<string>('');

  const [isImageAnalysisOpen, setIsImageAnalysisOpen] = useState(false);
  const [isRevisionsOpen, setIsRevisionsOpen] = useState(false);
  const [isTitlePageOpen, setIsTitlePageOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [isRustModalOpen, setIsRustModalOpen] = useState(false);
  // Part 11: Script Compare and File Management
  const [isScriptCompareOpen, setIsScriptCompareOpen] = useState(false);
  const [isFileManagerOpen, setIsFileManagerOpen] = useState(false);
  const [structureSettingsOpen,setStructureSettingsOpen]=useState(false);
  const [crashRecoveryAlert, setCrashRecoveryAlert] = useState<ScriptDocument | null>(null);

  // Part 12: Print, PDF Engine & File Formats State
  const [isPrintAndPdfOpen, setIsPrintAndPdfOpen] = useState(false);
  const [printModalTab, setPrintModalTab] = useState<'pdf' | 'print' | 'formats'>('pdf');

  // Part 8: Writing Goals and Productivity Statistics State
  const [isProductivityOpen, setIsProductivityOpen] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const [productivityStore, setProductivityStore] = useState<ProductivityStore>(() => loadProductivityStore());

  // Timer State (Sprint & Stopwatch)
  const [timerState, setTimerState] = useState<TimerState>({
    mode: 'sprint',
    durationSeconds: 25 * 60,
    remainingSeconds: 25 * 60,
    elapsedSeconds: 0,
    isRunning: false,
    sprintPreset: 25,
  });

  // Session Statistics
  const initialWordCount = documentWordCount;
  const initialPageCount = scriptPages.length;

  const [sessionStats, setSessionStats] = useState<SessionStats>({
    sessionStartTime: Date.now(),
    startWordCount: initialWordCount,
    startPageCount: initialPageCount,
    currentWordsAdded: 0,
    currentPagesAdded: 0,
    activeSeconds: 0,
  });

  const activityMeter=useRef(new WritingActivity()),lastWritingAt=useRef(0);
  useEffect(()=>{activityMeter.current.observe(doc,documentLayout(doc).pages.length,'ignored');setSessionStats({sessionStartTime:Date.now(),startWordCount:wordCounts.current.count(doc.paragraphs),startPageCount:documentLayout(doc).pages.length,currentWordsAdded:0,currentPagesAdded:0,activeSeconds:0});},[doc.id]);
  const recordDocumentActivity=(next:ScriptDocument,origin:ActivityOrigin)=>{
    const changes=activityMeter.current.observe(next,scriptPages.length,origin);let words=0,pages=0;for(const delta of changes){words+=delta.words;pages+=delta.pages;setProductivityStore(recordActivityDelta(delta.words,delta.pages,0,delta.date));}
    if(words||pages)setSessionStats(previous=>({...previous,currentWordsAdded:Math.max(0,previous.currentWordsAdded+words),currentPagesAdded:Math.max(0,previous.currentPagesAdded+pages)}));if(origin==='edit')lastWritingAt.current=Date.now();
  };
  // Writing statistics are counted in idle time (1.17), so comparing the whole script after a keystroke does not delay it.
  const activityQueue=useRef<{doc:ScriptDocument;origin:ActivityOrigin}[]>([]),activityTimer=useRef<number|null>(null),recordActivity=useRef(recordDocumentActivity);recordActivity.current=recordDocumentActivity;
  useEffect(()=>{activityQueue.current.push({doc,origin:pendingActivityOrigin.current});pendingActivityOrigin.current='ignored';
    if(activityTimer.current===null){const run=()=>{activityTimer.current=null;for(const item of activityQueue.current.splice(0))if(item.doc.id===latestDoc.current.id)recordActivity.current(item.doc,item.origin);};
      activityTimer.current=(typeof requestIdleCallback==='function'?requestIdleCallback(run,{timeout:400}):window.setTimeout(run,40)) as unknown as number;}},[doc,scriptPages]);
  const restoreEditorDocument=(next:ScriptDocument,origin?:'undo'|'redo'|'command')=>{pendingActivityOrigin.current=origin==='undo'||origin==='redo'?origin:'ignored';applyNativeDocument(next);};
  useEffect(()=>{let previous=Date.now();const timer=setInterval(()=>{const now=Date.now(),seconds=Math.min(2,Math.floor((now-previous)/1000));previous=now;if(seconds>0&&document.visibilityState==='visible'&&document.hasFocus()&&Date.now()-lastWritingAt.current<30000){setSessionStats(stats=>({...stats,activeSeconds:stats.activeSeconds+seconds}));setProductivityStore(recordActivityDelta(0,0,seconds));}},1000);return()=>clearInterval(timer);},[]);

  // View controls (status bar, toolbar, View menu) all change the same workspace preferences.
  const viewMode:ScriptViewMode=workspace.focus?'focus':workspace.view;
  const setViewMode=(mode:ScriptViewMode)=>setWorkspace(w=>mode==='focus'?{...w,focus:true}:{...w,view:mode,focus:false});
  const isTypewriterMode=workspace.typewriter,setIsTypewriterMode=(update:boolean|((v:boolean)=>boolean))=>setWorkspace(w=>({...w,typewriter:typeof update==='function'?update(w.typewriter):update}));
  const splitMode:SplitScreenMode=workspace.split,setSplitMode=(update:SplitScreenMode|((v:SplitScreenMode)=>SplitScreenMode))=>setWorkspace(w=>({...w,split:typeof update==='function'?update(w.split):update}));
  const showFormattingMarks=workspace.formattingMarks,setShowFormattingMarks=(update:boolean|((v:boolean)=>boolean))=>setWorkspace(w=>({...w,formattingMarks:typeof update==='function'?update(w.formattingMarks):update}));
  const showRuler=workspace.ruler,setShowRuler=(update:boolean|((v:boolean)=>boolean))=>setWorkspace(w=>({...w,ruler:typeof update==='function'?update(w.ruler):update}));

  // Check crash recovery on initial startup
  useEffect(() => {
    if(nativeFiles.supported)return;
    const recovered = checkCrashRecoveryState(doc.lastSavedAt);
    if (recovered && recovered.paragraphs && recovered.paragraphs.length > 0) {
      setCrashRecoveryAlert(recovered);
    }
  }, []);

  // Transactional Auto-save & Backups engine (Part 11)
  const saveStarted = useRef(0);
  const flushAutosave = () => {
    if(nativeFiles.suppressLocal.current)return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(latestDoc.current)); saveStarted.current = 0; }
    catch (error) { console.error('Failed to save document to localStorage', error); }
  };
  useEffect(() => {
    if (!saveStarted.current) saveStarted.current = Date.now();
    const delay = Math.max(0, Math.min(150, 1000 - (Date.now() - saveStarted.current)));
    const timer = setTimeout(flushAutosave, delay);
    return () => clearTimeout(timer);
  }, [doc]);
  useEffect(() => {
    const hide = () => { if (document.visibilityState === 'hidden') flushAutosave(); };
    window.addEventListener('pagehide', flushAutosave); document.addEventListener('visibilitychange', hide);
    return () => { flushAutosave(); window.removeEventListener('pagehide', flushAutosave); document.removeEventListener('visibilitychange', hide); };
  }, []);


  // Periodic automatic backup based on backup settings interval
  useEffect(() => {
    const backupSettings = loadBackupSettings();
    if (!backupSettings.autosaveEnabled) return;

    const intervalMs = Math.max(30, backupSettings.autosaveIntervalSeconds) * 1000;
    const interval = setInterval(() => {
      saveDocumentWithBackup(latestDoc.current, true, false);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isFileManagerOpen]);

  const sprintRun=useRef<{projectId:string;startedAt:string;plannedSeconds:number;words:number;activeSeconds:number;lastWords:number;lastActive:number}|null>(null);
  if(sprintRun.current&&sprintRun.current.projectId===doc.id){sprintRun.current.lastWords=documentWordCount;sprintRun.current.lastActive=sessionStats.activeSeconds;}
  useEffect(()=>{const run=sprintRun.current;if(run&&(!timerState.isRunning||timerState.mode!=='sprint'||run.projectId!==doc.id)){const result={id:crypto.randomUUID(),projectId:run.projectId,startedAt:run.startedAt,finishedAt:new Date().toISOString(),plannedSeconds:run.plannedSeconds,activeSeconds:Math.max(0,run.lastActive-run.activeSeconds),words:Math.max(0,run.lastWords-run.words),completed:timerState.remainingSeconds===0&&run.projectId===doc.id};setProductivityStore(previous=>{const next={...previous,sprints:[...(previous.sprints||[]),result].slice(-500)};saveProductivityStore(next);return next;});sprintRun.current=null;}if(timerState.isRunning&&timerState.mode==='sprint'&&!sprintRun.current)sprintRun.current={projectId:doc.id,startedAt:new Date().toISOString(),plannedSeconds:timerState.remainingSeconds,words:documentWordCount,activeSeconds:sessionStats.activeSeconds,lastWords:documentWordCount,lastActive:sessionStats.activeSeconds};},[timerState.isRunning,timerState.mode,doc.id]);

  // Timer countdown / countup engine
  useEffect(() => {
    let interval: any = null;
    if (timerState.isRunning) {
      interval = setInterval(() => {
        setTimerState((prev) => {
          if (!prev.isRunning) return prev;
          if (prev.mode === 'sprint') {
            if (prev.remainingSeconds <= 1) {
              if (productivityStore.settings.soundAlerts) {
                playSprintChime();
              }
              return {
                ...prev,
                remainingSeconds: 0,
                isRunning: false,
              };
            }
            return {
              ...prev,
              remainingSeconds: prev.remainingSeconds - 1,
            };
          } else {
            return {
              ...prev,
              elapsedSeconds: prev.elapsedSeconds + 1,
            };
          }
        });


      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerState.isRunning, productivityStore.settings.soundAlerts]);

  // Global Keyboard Shortcuts (⌘S, ⌘P, ⌘F, ⌘⌥G)
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing || (e.target as HTMLElement)?.closest('.dc-overlay')) return;
      if ((e.metaKey || e.ctrlKey) && e.altKey && (e.key === 'g' || e.key === 'G')) {
        e.preventDefault();
        setIsProductivityOpen((prev) => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.altKey && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        setIsReportsOpen((prev) => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.altKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        rememberEditorSelection();setIsScriptCompareOpen((prev) => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.altKey && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        setIsFileManagerOpen((prev) => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave(e.shiftKey);
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        handlePrintPdf();
      } else if ((e.metaKey || e.ctrlKey) && (e.key === 'e' || e.key === 'E')) {
        e.preventDefault();
        handleOpenPdfStudio();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setIsFindReplaceOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [doc]);

  const handleParagraphsChange = (paragraphs: Paragraph[]) => {
    if(latestDoc.current.id!==doc.id)return;
    if(collaboration.readOnly)return;pendingActivityOrigin.current='edit';

    setDoc((prev) => ({
      ...prev,
      paragraphs,
      lastSavedAt: new Date().toISOString(),
    }));
  };

  const handleSave = async (saveAs=false) => {
    if(window.draftcraftDesktop?.saveProject){if(await nativeFiles.save(saveAs)){saveDocumentWithBackup(latestDoc.current,false,false);flushAutosave();}}else{saveDocumentWithBackup(latestDoc.current,false,false);flushAutosave();}
  };

  const handleDuplicateDocument=async(newTitle:string)=>{const copy=cloneDocumentGraph(latestDoc.current,{title:newTitle}).document;const issues=documentGraphIssues(copy);if(issues.length){setFileStatus('Copy needs reference repair: '+issues.join('; '));return false;}const changed=nativeFiles.supported?await nativeFiles.change(copy):(applyNativeDocument(copy),true);if(changed)saveDocumentWithBackup(copy,false,false);return changed;};
  const handleSaveAsDocument=async(newTitle:string)=>{if(!nativeFiles.supported){setFileStatus('Native Save As requires the desktop application.');return false;}const saved=await nativeFiles.save(true,false,newTitle);if(saved)saveDocumentWithBackup(latestDoc.current,false,false);return saved;};
  const handleRevertToSaved=async()=>{try{if(!nativeFiles.supported)throw Error('Revert requires a native saved project. Choose an explicit browser snapshot instead.');return await nativeFiles.revert();}catch(error){setFileStatus(String(error));return false;}};
  const handleLoadSnapshot=async(snapshot:ScriptDocument)=>{try{if(collaboration.readOnly)throw Error('This collaboration role cannot restore snapshots.');await nativeFiles.checkpoint('Before Snapshot Restore');if(snapshot.id===latestDoc.current.id){commitProduction(structuredClone(snapshot));return true;}const copy=cloneDocumentGraph(snapshot,{title:(snapshot.titlePage.title||'Screenplay')+' — Snapshot'}).document;return nativeFiles.supported?await nativeFiles.change(copy):(applyNativeDocument(copy),true);}catch(error){setFileStatus(String(error));return false;}};

  // Help › Idea to Draft: the tutorial opens as a new project (the current one goes through the normal switch, which
  // resolves unsaved changes first) and shows the Beat Board with the numbered step cards.
  // The Start Window closes itself once another document is open (created, opened, a recent project, a tutorial).
  const startDocId = useRef('');
  useEffect(() => { if (isStartOpen) startDocId.current = latestDoc.current.id; }, [isStartOpen]);
  useEffect(() => { if (isStartOpen && startDocId.current && doc.id !== startDocId.current) setIsStartOpen(false); }, [doc.id]);
  // Start Window › New Screenplay or a format tile: a new project through the normal switch (unsaved changes first).
  const startNewDocument=async(template?:FormatTemplate)=>{const selected=template||allTemplates().find(t=>t.id===browserPrefs().defaultId)||allTemplates().find(t=>t.id===STANDARD_FORMAT.templateId)!;
    const next=newFromTemplate(blankDocument(),selected);const changed=nativeFiles.supported?await nativeFiles.change(next):(saveDocumentWithBackup(latestDoc.current,false,false),setDoc(next),true);
    if(changed){setIsStartOpen(false);setActiveView('script');setScriptPresentation('pages');}return changed;};
  const startTutorial=async(kind:TutorialKind)=>{const next=ideaToDraftDocument(kind);setIsGuideOpen(false);
    const changed=nativeFiles.supported?await nativeFiles.change(next):(saveDocumentWithBackup(latestDoc.current,false,false),setDoc(next),true);
    if(changed){setActiveView('beatboard');setFileStatus('Idea to Draft — '+tutorial(kind).name+': follow the numbered cards on the Beat Board.');}};
  const handleNewScript = () => {
    const selected=allTemplates().find(t=>t.id===browserPrefs().defaultId)||allTemplates().find(t=>t.id===STANDARD_FORMAT.templateId)!;
    const blank=newFromTemplate(blankDocument(),selected);
    if(nativeFiles.supported){setDoc(blank);return;}
    if(confirm('Create a new blank screenplay? Current changes are auto-saved in offline storage.')){saveDocumentWithBackup(latestDoc.current,false,false);setDoc(blank);}
  };

  // Open FDX File
  const handleOpenFdx = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = parseFdx(text);
      saveDocumentWithBackup(latestDoc.current,false,false);
      const base=blankDocument();setDoc({...base,...parsed,id:'doc-'+crypto.randomUUID(),paragraphs:parsed.paragraphs||base.paragraphs,titlePage:parsed.titlePage||base.titlePage,appliedTemplateId:parsed.writingFormat?.templateId,lastSavedAt:new Date().toISOString()});
    } catch (err) {
      alert('Failed to parse Final Draft (.fdx) file. Please ensure it is a valid XML file.');
    }
  };

  const handleOpenText=async(file:File)=>{try{const text=await file.text(),parsed=/\.rtf$/i.test(file.name)?parseRtf(text):parsePlainText(text);const t=FORMAT_TEMPLATES.find(t=>t.name==='Blank Text Document')!;const next=newFromTemplate(blankDocument(),t);setDoc({...next,paragraphs:parsed.paragraphs||next.paragraphs,importReport:parsed.importReport,titlePage:{...next.titlePage,title:file.name.replace(/\.[^.]+$/,'')}})}catch(e){alert('The text document could not be imported: '+String(e))}};

  // Open Fountain File
  const handleOpenFountain = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = parseFountain(text);
      saveDocumentWithBackup(latestDoc.current,false,false);
      const base=blankDocument();setDoc({...base,...parsed,id:'doc-'+crypto.randomUUID(),paragraphs:parsed.paragraphs||base.paragraphs,titlePage:parsed.titlePage||base.titlePage,lastSavedAt:new Date().toISOString()});
    } catch (err) {
      alert('Failed to parse Fountain file.');
    }
  };

  // Export FDX
  const handleExportFdx=()=>reviewExport('fdx',exportFdxFile);
  const handleExportFountain=()=>reviewExport('fountain',exportFountainFile);
  const exportFdxFile = () => {
    const xml = exportToFdx(doc);
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.titlePage.title.replace(/[^a-zA-Z0-9_-]/g, '_') || 'script'}.fdx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export Fountain
  const exportFountainFile = () => {
    const text = exportToFountain(doc);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.titlePage.title.replace(/[^a-zA-Z0-9_-]/g, '_') || 'script'}.fountain`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Part 12: Print, PDF & Formats Handlers
  const handlePrintPdf = () => {
    setPrintModalTab('print');
    setIsPrintAndPdfOpen(true);
  };

  const handleOpenPdfStudio = () => {
    setPrintModalTab('pdf');
    setIsPrintAndPdfOpen(true);
  };

  const handleOpenFormatExports = () => {
    setPrintModalTab('formats');
    setIsPrintAndPdfOpen(true);
  };

  const handleOpenTemplates = () => {
    setFormatPanel('templates');
  };

  useEffect(() => {
    const run:Parameters<NonNullable<Window['draftcraftDesktop']>['onCommand']>[0]=(command,file)=>{
      switch (command) {
        case 'undo': case 'redo': {
          const event=new KeyboardEvent('keydown',{key:'z',metaKey:true,shiftKey:command==='redo',bubbles:true,cancelable:true});
          const unhandled=(document.activeElement || document.body).dispatchEvent(event);
          if(unhandled&&activeView==='script'&&!(document.activeElement instanceof HTMLInputElement||document.activeElement instanceof HTMLTextAreaElement))window.dispatchEvent(new CustomEvent('draftcraft-editor-history',{detail:command}));else if(unhandled)void window.draftcraftDesktop?.nativeHistory(command);
          break;
        }
        case 'dictation':setDictationOpen(true);break;
        case 'new-window':void window.draftcraftDesktop?.newDocumentWindow?.();break;
        case 'customize-toolbar':setToolbarCustomizing(true);break;
        case 'import-pdf':pdfInput.current?.click();break;
        case 'collaboration':setCollaborationOpen(true);break;
        case 'production-images':openProduction('images');break;
        case 'production-macros':openProduction('macros');break;
        case 'production-pages':case 'production-revisions':case 'production-changes':case 'production-tags':case 'production-cast':case 'production-navigator':openProduction(command.slice(11) as ProductionSection);break;
        case 'table-read':openTableRead('player',focusedParagraphId||undefined);break;
        case 'table-read-settings':openTableRead('settings');break;
        case 'voice-cast':openTableRead('cast');break;
        case 'export-table-read':openTableRead('export');break;
        case 'new': handleNewScript(); break;
        case 'new-template': case 'apply-template':setFormatPanel('templates');break;
        case 'save-template':setFormatPanel('save-template');break;
        case 'elements':setFormatPanel('elements');break;
        case 'auto-formatting':setFormatPanel('writing');break;
        case 'smarttype':{const dictionary=buildSmartTypeFromScript(doc.paragraphs);dictionary.characters=[...new Set([...dictionary.characters,...(doc.characterMemory||[]).map(r=>r.name)])];setSmartTypeDict(dictionary);setIsSmartTypeManagerOpen(true);break;}
        case 'save': handleSave(); break;
        case 'save-as': handleSave(true); break;
        case 'prepare-close': flushAutosave(); void nativeFiles.close(); break;
        case 'select-all': window.dispatchEvent(new CustomEvent('draftcraft-editor-command',{detail:'select-all'})); break;
        case 'files-autosave': setFilesSettings(true);void nativeFiles.refresh();break;
        case 'open-project': void nativeFiles.open();break;
        case 'open-request': void nativeFiles.open(file?.requestId);break;
        case 'export-fdx': handleExportFdx(); break;
        case 'export-fountain': handleExportFountain(); break;
        case 'pdf': handleOpenPdfStudio(); break;
        case 'print': handlePrintPdf(); break;
        case 'writing-assistance': setIsWritingSettingsOpen(true); break;
        case 'automatic-punctuation':setIsPunctuationSettingsOpen(true);break;
        case 'keyboard-shortcuts': setIsShortcutSettingsOpen(true); break;
        case 'getting-started': setGuideQuery(undefined); setIsGuideOpen(true); break;
        case 'start-window': setIsStartOpen(true); break;
        case 'emoji': openEmojiPicker(); break;
        case 'idea-to-draft-feature': case 'idea-to-draft-series': case 'idea-to-draft-stage': void startTutorial(command.slice('idea-to-draft-'.length) as TutorialKind); break;
        case 'editor-settings': openEditorSettings(); break;
        case 'caret-animation': openEditorSettings(undefined,undefined,'caret');break;
        case 'automatic-formatting':openEditorSettings(undefined,undefined,'formatting');break;
        case 'script-pages':case 'script-scenes':case 'script-cards':setActiveView('script');setScriptPresentation(command==='script-scenes'?'scenes':command==='script-cards'?'cards':'pages');break;
        case 'find': setIsFindReplaceOpen(true); break;
        case 'title-page': setIsTitlePageOpen(true); break;
        case 'open-file': {
          if (!file?.name || typeof file.text!=='string') break;
          if(file.name.toLowerCase().endsWith('.draftcraft')){try{const opened=JSON.parse(file.text);saveDocumentWithBackup(latestDoc.current,false,false);setDoc(opened);setFileStatus('Opened '+file.name)}catch{setFileStatus('The project could not be opened.')}break;}
          const input = new File([file.text], file.name, { type: 'text/plain' });
          if (/\.fdxt?$/i.test(file.name)) void handleOpenFdx(input);
          else if(/\.(txt|rtf)$/i.test(file.name))void handleOpenText(input);
          else void handleOpenFountain(input);
          break;
        }
        default: workspaceCommand.current(String(command).replace(/^ws:/,''));
      }
    };appCommands.current=command=>run(command as import('./types/desktop').DesktopCommand);
    return window.draftcraftDesktop?.onCommand(run);
  }, [doc,activeView]);

  // Insert Element from Menubar
  const handleInsertElement = (type: ElementType) => {
    const newP: Paragraph = {
      id: `p-${Date.now()}`,
      type,
      text: type==='Parenthetical'&&editorPreferences.autoParentheticals?'()':'',
      revised: doc.productionMode,
      revision: doc.productionMode ? doc.currentRevision : undefined,
    };
    if(activeView==='script')window.dispatchEvent(new CustomEvent('draftcraft-editor-append',{detail:{owner:doc.id,paragraph:newP}}));else handleParagraphsChange([...doc.paragraphs,newP]);
  };

  // Toggle Dual Dialogue
  const handleToggleDualDialogue = () => {
    try { const before=latestDoc.current;const after={...before,paragraphs:pairDialogue(before.paragraphs,focusedParagraphId||'')};setFormatTransaction({token:crypto.randomUUID(),before,after}); }
    catch(error){setFileStatus((error as Error).message);}
  };

  // Scroll to scene in editor
  const handleSelectScene = (sceneIndex: number) => {
    setActiveView('script');setScriptPresentation('pages');
    const targetParagraph = doc.paragraphs[sceneIndex];
    if (targetParagraph) {
      flushPendingPages();
      const el = document.getElementById(`input-${targetParagraph.id}`);
      if (el) {
        el.scrollIntoView({ behavior: scrollMotion(), block: 'center' });
        el.focus();
      }
    }
  };

  // Occurrence ranges use the same canonical UTF-16 offsets as editing and tags.
  function showOccurrence(match:SearchOccurrence|undefined,focus=true){if(!match)return;setActiveView('script');setScriptPresentation('pages');const select=()=>{flushPendingPages();const input=inputForOffset(match.paragraphId,match.start);if(input){if(focus){input.focus({preventScroll:true});input.scrollIntoView({block:'nearest'});}input.setSelectionRange(match.start,match.end);}};if(activeView==='script'&&scriptPresentation==='pages'&&inputForOffset(match.paragraphId,match.start)?.getClientRects().length)select();else requestAnimationFrame(select);}
  function refreshFind(options=findState.current.options,index=0,focus=false){const matches=findOccurrences(latestDoc.current.paragraphs,options),at=Math.min(Math.max(0,index),Math.max(0,matches.length-1));findState.current={options,matches,index:at};setFindMatches(matches);setCurrentMatchIdx(at);showOccurrence(matches[at],focus);return matches;}
  const handleFind=(query:string,matchCase:boolean,wholeWord:boolean)=>{refreshFind({query,matchCase,wholeWord});};
  const handleFindNext=()=>{const state=findState.current;if(state.matches.length)refreshFind(state.options,(state.index+1)%state.matches.length,true);};
  const handleFindPrev=()=>{const state=findState.current;if(state.matches.length)refreshFind(state.options,(state.index+state.matches.length-1)%state.matches.length,true);};
  const handleReplace=(replacement:string)=>{const state=findState.current,match=state.matches[state.index];if(!match)return;try{commitResolved(replaceDocumentOccurrences(latestDoc.current,[match],replacement));refreshFind(state.options,state.index,true);}catch(error){setFileStatus(String(error));refreshFind(state.options);}};
  const handleReplaceAll=(query:string,replacement:string,matchCase:boolean,wholeWord:boolean)=>{const options={query,matchCase,wholeWord};try{const matches=findOccurrences(latestDoc.current.paragraphs,options);if(matches.length)commitResolved(replaceDocumentOccurrences(latestDoc.current,matches,replacement));refreshFind(options);}catch(error){setFileStatus(String(error));}};
  useEffect(()=>{if(!isFindReplaceOpen||!findState.current.options.query)return;const state=findState.current,matches=findOccurrences(doc.paragraphs,state.options),selected=state.matches[state.index],index=Math.max(0,matches.findIndex(m=>m.paragraphId===selected?.paragraphId&&m.start===selected.start&&m.sourceText===selected.sourceText));findState.current={...state,matches,index};setFindMatches(matches);setCurrentMatchIdx(index);},[doc.paragraphs,isFindReplaceOpen]);

  // Format Doctor Fixes
  const handleApplyDoctorFix=(issue:FormatIssue)=>{const current=latestDoc.current;commitResolved(reconcileStudio(current,{...current,writingFormat:issue.fixedFormat||current.writingFormat,paragraphs:applyDoctorFix(current.paragraphs,issue)}));};
  const handleFixAllDoctorIssues=()=>{const current=latestDoc.current,issues=runFormattingDoctor(current.paragraphs,current.writingFormat,current.studio?.doctor),writingFormat=issues.find(i=>i.fixedFormat)?.fixedFormat||current.writingFormat;commitResolved(reconcileStudio(current,{...current,writingFormat,paragraphs:fixDoctorIssues(current.paragraphs,current.writingFormat,current.studio?.doctor)}));};

  // Section 4.2 Workflow Bridge: Beat Board -> Script Pages
  const handleSendBeatToScript=(beat:ScriptDocument['beats'][number])=>setPlanningSource({kind:'beat',id:beat.id,title:beat.title,description:beat.description});
  const handleSendMarkerToScript=(marker:ScriptDocument['outlineMarkers'][number])=>setPlanningSource({kind:'marker',id:marker.id,title:marker.title,description:marker.description});

  // ── Workspace commands: the toolbar, the View/Insert/Format menus and shortcuts all run these. ──
  const macDesktop=window.draftcraftDesktop?.runtime?.platform==='darwin';
  const [editorFormatState,setEditorFormatState]=useState<Record<string,boolean>>({});
  useEffect(()=>{const update=(event:Event)=>{const next=(event as CustomEvent).detail as Record<string,boolean>;setEditorFormatState(previous=>Object.keys({...previous,...next}).every(k=>previous[k]===next[k])?previous:next);};window.addEventListener('draftcraft-editor-format',update);return()=>window.removeEventListener('draftcraft-editor-format',update);},[]);
  const [timelineSelection,setTimelineSelection]=useState<string|null>(null);
  const goals=useMemo(()=>beatGoals(doc,storyIndex),[doc.outlineMarkers,doc.beats,storyIndex.geometry]);
  const sequenceGroups=useMemo(()=>beatSequenceGroups(doc,storyIndex),[doc.outlineMarkers,doc.outlineLanes,doc.beats,storyIndex.geometry]);
  const beatParentTitles=useMemo(()=>beatParents(doc,storyIndex),[doc.outlineMarkers,doc.outlineLanes,doc.beats,storyIndex.geometry]);
  const boardExtras={sequenceGroups,parents:beatParentTitles,views:doc.beatBoardViews||[],onViewsChange:(beatBoardViews:NonNullable<ScriptDocument['beatBoardViews']>)=>setDoc(prev=>({...prev,beatBoardViews}))};
  const placeOnTimeline=(beatId:string)=>{const patch=placeBeat(latestDoc.current,beatId,(focusedParagraphId&&storyIndex.positions.get(focusedParagraphId))||0);if(patch){setDoc(prev=>({...prev,...patch}));setWorkspace(w=>w.timeline.visible?w:{...w,timeline:{...w.timeline,visible:true}});}};
  // The timeline is memoized; it reaches the app through this stable object instead of new callbacks every render.
  const timelineApi=useRef<TimelineApi>(null as unknown as TimelineApi);
  timelineApi.current={
    onChange:patch=>setDoc(prev=>({...prev,...patch})),
    onNavigate:id=>{const at=latestDoc.current.paragraphs.findIndex(p=>p.id===id);if(at>=0)handleSelectScene(at);},
    onNavigatePage:page=>{showScript();requestAnimationFrame(()=>(flushPendingPages(),document).querySelector(`.script-page[data-page-number="${page}"]`)?.scrollIntoView({block:'start',behavior:scrollMotion()}));},
    onSendToScript:marker=>handleSendMarkerToScript(marker),
    onSelection:setTimelineSelection,
    onPrefs:timeline=>setWorkspace(w=>({...w,timeline})),
    onMoveScene:(sceneId,beforeId)=>{const paragraphs=moveSceneBefore(latestDoc.current.paragraphs,sceneId,beforeId);if(paragraphs!==latestDoc.current.paragraphs)commitProduction({...latestDoc.current,paragraphs});},
  };
  const [windowFullscreen,setWindowFullscreen]=useState(false);
  useEffect(()=>window.draftcraftDesktop?.onWindowState?.(state=>setWindowFullscreen(!!state.fullscreen)),[]);
  /** Editor operations that need the current paragraph and selection (element, styles, alignment, inserts). */
  // A command from a right-click menu names the paragraph and selection it was opened on.
  const commandTarget=useRef<EditorSelection|null>(null);
  const editorCommand=(detail:Record<string,unknown>)=>{const target=commandTarget.current,selection=target||savedEditorSelection.current;window.dispatchEvent(new CustomEvent('draftcraft-editor-command',{detail:{...detail,paragraphId:target?.paragraphId||focusedParagraphId||selection?.paragraphId,selection}}));};
  const showScript=()=>{setActiveView('script');setScriptPresentation('pages');};
  const runWorkspaceCommand=(id:string)=>{
    const elementItem=ITEM_BY_ID.get(id)?.element;if(elementItem){showScript();editorCommand({command:'element',type:elementItem});return;}
    if(id.startsWith('reformat-')){editorCommand({command:'reformat',type:id.slice(9)});return;}
    if(id.startsWith('appearance-')){setWorkspace(w=>({...w,appearance:id.slice(11) as WorkspacePreferences['appearance']}));return;}
    if(id.startsWith('toolbar-group-')){const group=id.slice(14) as ToolbarGroupId;if(TOOLBAR_GROUP_IDS.includes(group))setWorkspace(w=>({...w,toolbar:toggleGroup(w.toolbar,group)}));return;}
    if(id.startsWith('split-pane-')){setWorkspace(w=>({...w,splitPane:id.slice(11) as WorkspacePreferences['splitPane'],split:w.split==='none'?'vertical':w.split}));return;}
    switch(id){
      case 'new':handleNewScript();break;
      case 'open':if(window.draftcraftDesktop?.openProject)void nativeFiles.open();else setIsFileManagerOpen(true);break;
      case 'save':void handleSave();break;case 'save-as':void handleSave(true);break;
      case 'print':handlePrintPdf();break;case 'export-pdf':handleOpenPdfStudio();break;case 'export-fdx':handleExportFdx();break;case 'export-fountain':handleExportFountain();break;
      case 'export-text':case 'export-rtf':case 'export-html':handleOpenFormatExports();break;
      case 'title-page':setIsTitlePageOpen(true);break;
      case 'undo':case 'redo':appCommands.current(id);break;
      case 'cut':case 'copy':case 'paste':if(window.draftcraftDesktop?.editAction)window.draftcraftDesktop.editAction(id);else if(id==='paste')void (window.draftcraftDesktop?.readClipboard?.().then(r=>r?.text)??navigator.clipboard?.readText()).then(text=>{if(text)document.execCommand('insertText',false,text);}).catch(()=>{});else document.execCommand(id);break;
      case 'find':setIsFindReplaceOpen(true);break;
      case 'emoji':openEmojiPicker(commandTarget.current);break;
      case 'start-window':setIsStartOpen(true);break;
      case 'dual-dialogue':handleToggleDualDialogue();break;
      case 'new-scene':showScript();editorCommand({command:'new-scene'});break;
      case 'insert-note':showScript();editorCommand({command:'note'});break;
      case 'insert-bookmark':showScript();editorCommand({command:'bookmark'});break;
      case 'bookmark-next':case 'bookmark-prev':showScript();editorCommand({command:id});break;
      case 'new-beat':window.dispatchEvent(new CustomEvent('draftcraft-timeline',{detail:{command:'new-beat'}}));if(!workspace.timeline.visible)setWorkspace(w=>({...w,timeline:{...w.timeline,visible:true}}));break;
      case 'send-to-script':window.dispatchEvent(new CustomEvent('draftcraft-timeline',{detail:{command:'send-to-script'}}));break;
      case 'script':showScript();break;
      case 'view-page':case 'view-normal':case 'view-speed':showScript();setWorkspace(w=>({...w,view:id.slice(5) as WorkspacePreferences['view']}));break;
      case 'timeline':setWorkspace(w=>({...w,timeline:{...w.timeline,visible:!w.timeline.visible}}));break;
      case 'beat-board':setActiveView(v=>v==='beatboard'?'script':'beatboard');break;
      case 'outline-editor':setActiveView(v=>v==='outline'?'script':'outline');break;
      case 'reports':setActiveView(v=>v==='reports'?'script':'reports');break;
      case 'navigator':setWorkspace(w=>({...w,navigator:{...w.navigator,open:!w.navigator.open}}));break;
      case 'scene-view':setActiveView('script');setScriptPresentation(p=>p==='scenes'?'pages':'scenes');break;
      case 'index-cards':setActiveView('script');setScriptPresentation(p=>p==='cards'?'pages':'cards');break;
      case 'split-vertical':case 'split-horizontal':setWorkspace(w=>({...w,split:id.slice(6) as WorkspacePreferences['split']}));break;
      case 'unsplit':setWorkspace(w=>({...w,split:'none'}));break;
      case 'focus':setWorkspace(w=>({...w,focus:!w.focus}));break;
      case 'typewriter':setIsTypewriterMode(v=>!v);break;
      case 'writing-stats':setIsProductivityOpen(true);break;
      case 'structure-lines':setDoc(prev=>({...prev,showStructureLines:!prev.showStructureLines}));break;
      case 'structure-settings':setStructureSettingsOpen(true);break;
      case 'toggle-notes':setDoc(prev=>({...prev,showScriptNotes:prev.showScriptNotes===false}));break;
      case 'toggle-bookmarks':setDoc(prev=>({...prev,showBookmarks:prev.showBookmarks===false}));break;
      case 'toggle-comments':setDoc(prev=>({...prev,showSceneComments:prev.showSceneComments===false}));break;
      case 'toggle-outline':setWorkspace(w=>({...w,showOutlineElements:!w.showOutlineElements}));break;
      case 'formatting-marks':setShowFormattingMarks(v=>!v);break;
      case 'ruler':setShowRuler(v=>!v);break;
      case 'paragraph-controls':setWorkspace(w=>({...w,paragraphControls:!w.paragraphControls}));break;
      case 'toolbar-visible':setWorkspace(w=>({...w,toolbar:{...w.toolbar,visible:!w.toolbar.visible}}));break;
      case 'bold':case 'italic':case 'underline':case 'strikethrough':editorCommand({command:'style',style:id});break;
      case 'align-left':case 'align-center':case 'align-right':editorCommand({command:'align',align:id.slice(6)});break;
      case 'element-formatting':setFormatPanel('elements');break;
      case 'scene-numbers':openProduction('pages');break;
      case 'highlight-current':{const at=doc.paragraphs.findIndex(p=>p.id===focusedParagraphId);let cue=at;while(cue>=0&&doc.paragraphs[cue].type!=='Character')cue--;const name=cue>=0&&at-cue<=4?characterName(doc.paragraphs[cue].text):'';if(!name){setFileStatus('Put the caret in a character cue or speech to highlight that character.');break;}const palette=['#f59e0b','#38bdf8','#a78bfa','#34d399','#f472b6','#fb7185','#facc15'],used=Object.keys(doc.characterHighlightMap||{}).length;setDoc(prev=>({...prev,characterHighlightMap:{...(prev.characterHighlightMap||{}),[name]:prev.characterHighlightMap?.[name]||palette[used%palette.length]}}));break;}
      case 'highlight-clear':setDoc(prev=>({...prev,characterHighlightMap:{}}));break;
      case 'format-assistant':setIsFormatDoctorOpen(true);break;
      case 'toggle-case':editorCommand({command:'toggle-case'});break;
      case 'announce-element':editorCommand({command:'announce-element'});break;
      case 'revision-mode':setDoc(prev=>({...prev,productionMode:!prev.productionMode}));break;
      case 'track-changes':openProduction('changes');break;
      case 'tags':openProduction('tags');break;
      case 'table-read':openTableRead('player',focusedParagraphId||undefined);break;
      case 'collaboration':setCollaborationOpen(true);break;
      case 'customize':setToolbarCustomizing(true);break;
      // Commands reached from the native menus (and the in-window menu bar off macOS).
      case 'revert':void handleRevertToSaved();break;
      case 'research':setResearchSnippet(doc.paragraphs.find(p=>p.type==='Scene Heading')?.text||'');setIsResearchOpen(true);break;
      case 'image-analysis':setIsImageAnalysisOpen(true);break;
      case 'names-database':setIsNamesDatabaseOpen(true);break;
      case 'script-compare':rememberEditorSelection();setIsScriptCompareOpen(true);break;
      case 'file-manager':setIsFileManagerOpen(true);break;
      case 'format-exports':handleOpenFormatExports();break;
      case 'header-footer':setIsHeaderFooterOpen(true);break;
      case 'story-settings':openEditorSettings();break;
      case 'welcome':setIsWelcomeOpen(true);break;
      case 'rust-engine':setIsRustModalOpen(true);break;
      case 'smarttype-manager':appCommands.current('smarttype');break;
      case 'show-streaks':{const updated={...productivityStore,settings:{...productivityStore.settings,showStreakInfo:!productivityStore.settings.showStreakInfo}};saveProductivityStore(updated);setProductivityStore(updated);break;}
      case 'sprint-15':case 'sprint-25':case 'sprint-45':{const minutes=Number(id.slice(7));setTimerState({mode:'sprint',sprintPreset:minutes,durationSeconds:minutes*60,remainingSeconds:minutes*60,elapsedSeconds:0,isRunning:true});break;}
      case 'scene-numbers-auto-hide':setDoc(prev=>({...prev,autoHideRightSceneNumbers:!prev.autoHideRightSceneNumbers}));break;
      case 'scene-numbers-left':case 'scene-numbers-right':case 'scene-numbers-both':case 'scene-numbers-none':setDoc(prev=>({...prev,sceneNumberPlacement:id.slice(14) as SceneNumberPlacement}));break;
      case 'zoom-in':setZoom(z=>Math.min(200,z+10));break;case 'zoom-out':setZoom(z=>Math.max(50,z-10));break;case 'zoom-reset':setZoom(100);break;
      default:if(id.startsWith('insert-element-')){showScript();handleInsertElement(id.slice(15) as ElementType);}
    }
  };
  workspaceCommand.current=runWorkspaceCommand;
  // Commands from in-window menus (the script's right-click menu) take the same path as toolbar and menu-bar commands.
  useEffect(()=>{const run=(e:Event)=>{const detail=(e as CustomEvent).detail,id=detail?.id;if(typeof id!=='string')return;commandTarget.current=detail.target||null;try{workspaceCommand.current?.(id);}finally{commandTarget.current=null;}};window.addEventListener('draftcraft-workspace-command',run);return()=>window.removeEventListener('draftcraft-workspace-command',run);},[]);
  // Native menu check marks follow the same state as the toolbar.
  const menuSignal=useRef('');
  useEffect(()=>{const state:Record<string,boolean>={...toolbarState.active as Record<string,boolean>,['scene-numbers-'+(doc.sceneNumberPlacement||'both')]:true,'scene-numbers-auto-hide':!!doc.autoHideRightSceneNumbers,'show-streaks':productivityStore.settings.showStreakInfo};const signal=JSON.stringify(state);if(signal===menuSignal.current)return;menuSignal.current=signal;window.draftcraftDesktop?.menuState?.(state);});
  const focusedElement=activeView==='script'&&scriptPresentation==='pages'?doc.paragraphs.find(p=>p.id===focusedParagraphId)?.type:undefined;
  const shortcutProfileForToolbar=doc.documentShortcutProfile||activeProfile(shortcutSettings);
  const toolbarState:ToolbarState={
    element:focusedElement,elements:(doc.writingFormat?.supported||['Scene Heading','Action','Character','Parenthetical','Dialogue','Transition','Shot','General']) as ElementType[],
    elementShortcuts:Object.fromEntries(((doc.writingFormat?.supported||[]) as ElementType[]).map(t=>[t,displayShortcut(shortcutProfileForToolbar.bindings['element:'+t])]).filter(([,v])=>v)),
    active:{script:activeView==='script'&&scriptPresentation==='pages','view-page':workspace.view==='page','view-normal':workspace.view==='normal','view-speed':workspace.view==='speed',timeline:workspace.timeline.visible,'beat-board':activeView==='beatboard','outline-editor':activeView==='outline',reports:activeView==='reports',navigator:isNavigatorOpen,
      'scene-view':activeView==='script'&&scriptPresentation==='scenes','index-cards':activeView==='script'&&scriptPresentation==='cards',focus:workspace.focus,typewriter:workspace.typewriter,'structure-lines':!!doc.showStructureLines,
      'toggle-notes':doc.showScriptNotes!==false,'toggle-bookmarks':doc.showBookmarks!==false,'toggle-comments':doc.showSceneComments!==false,'toggle-outline':workspace.showOutlineElements,'formatting-marks':workspace.formattingMarks,ruler:workspace.ruler,'paragraph-controls':workspace.paragraphControls,'toolbar-visible':workspace.toolbar.visible,...Object.fromEntries(TOOLBAR_GROUP_IDS.map(g=>['toolbar-group-'+g,!workspace.toolbar.hiddenGroups.includes(g)])),
      'split-vertical':workspace.split==='vertical','split-horizontal':workspace.split==='horizontal',unsplit:workspace.split==='none',['split-pane-'+workspace.splitPane]:true,['appearance-'+workspace.appearance]:true,'revision-mode':doc.productionMode,
      ...editorFormatState},
    disabled:{'send-to-script':!timelineSelection,'el-scene-heading':!focusedElement,'el-action':!focusedElement,'el-character':!focusedElement,'el-parenthetical':!focusedElement,'el-dialogue':!focusedElement,'el-transition':!focusedElement,'el-shot':!focusedElement,'dual-dialogue':!focusedElement,'insert-note':!focusedElement,'insert-bookmark':!focusedElement,bold:!focusedElement,italic:!focusedElement,underline:!focusedElement,strikethrough:!focusedElement,'align-left':!focusedElement,'align-center':!focusedElement,'align-right':!focusedElement,'toggle-case':!focusedElement},
  };

  // Split window: the screenplay with Index Cards, Scene View, Beat Board or the Outline Map beside or below it.
  const splitActive=workspace.split!=='none'&&activeView==='script'&&scriptPresentation==='pages';
  const renderSecondPane=(pane:WorkspacePreferences['splitPane'])=>{
    const jump=(id:string)=>handleSelectScene(doc.paragraphs.findIndex(p=>p.id===id));
    if(pane==='scenes')return <SceneListView document={doc} paragraphs={doc.paragraphs} onParagraphsChange={paragraphs=>commitProduction({...latestDoc.current,paragraphs})} onJumpToScene={jump} isDarkMode={isDarkMode}/>;
    if(pane==='beatboard')return <BeatBoard beats={doc.beats} flowLines={doc.flowLines||[]} onBeatsChange={beats=>setDoc(prev=>({...prev,beats}))} onResizeCommit={commitBeatResize} onUndoResize={undoBeatResize} onRedoResize={redoBeatResize} canUndoResize={resizeHistory.length>0} canRedoResize={resizeRedo.length>0} onFlowLinesChange={flowLines=>setDoc(prev=>({...prev,flowLines}))} goals={goals} {...boardExtras} onPlaceOnTimeline={placeOnTimeline} onSendBeatToScript={handleSendBeatToScript} onJumpToLinkedScene={jump} onOpenResearch={q=>{setResearchSnippet(q);setIsResearchOpen(true);}}/>;
    if(pane==='outline')return <OutlineEditor document={doc} onUpdateDocument={setDoc} onJumpToScene={handleSelectScene} onSendMarkerToScript={handleSendMarkerToScript}/>;
    return <IndexCardsView document={doc} paragraphs={doc.paragraphs} onParagraphsChange={paragraphs=>commitProduction({...latestDoc.current,paragraphs})} onJumpToScene={jump} isDarkMode={isDarkMode}/>;
  };

  // AI Insertion
  const handleInsertActionFromAi = (text: string) => {
    const newP: Paragraph = {
      id: `p-${Date.now()}`,
      type: 'Action',
      text,
      revised: doc.productionMode,
      revision: doc.productionMode ? doc.currentRevision : undefined,
    };
    handleParagraphsChange([...doc.paragraphs, newP]);
  };

  return (
    <UIProvider><div className="dc-app h-full flex flex-col overflow-hidden bg-[#16161c] dc-bg-workspace text-neutral-100 select-none">
      {/* Window title row and the customizable main toolbar */}
      {!workspace.focus&&<TitleRow title={doc.titlePage.title} onTitle={()=>setIsTitlePageOpen(true)} nativeLights={macDesktop} fullscreen={windowFullscreen}
        status={window.draftcraftDesktop?.saveProject&&nativeFiles.state.status!=='failed'?<SaveStatus state={nativeFiles.state} onRetry={()=>void handleSave()} onSaveAs={()=>void handleSave(true)}/>:undefined}>
        {doc.productionMode&&<button type="button" className="dc-wtitle-pill" onClick={()=>setProductionSection('revisions')} title="Revision set">{doc.currentRevision} Revision</button>}
      </TitleRow>}
      {!workspace.focus&&<Toolbar prefs={workspace.toolbar} onPrefs={toolbar=>setWorkspace(w=>({...w,toolbar}))} state={toolbarState} onCommand={runWorkspaceCommand}
        onElement={type=>editorCommand({command:'element',type})} customizing={toolbarCustomizing} onCustomizing={setToolbarCustomizing}/>}
      {workspace.focus&&<div className="dc-focus-exit no-print"><button type="button" onClick={()=>setWorkspace(w=>({...w,focus:false}))}>Exit Focus Mode</button></div>}

      {/* In-window menu bar (macOS uses the system menu bar) */}
      {!macDesktop&&!workspace.focus&&<MacOsMenubar
        onNewScript={handleNewScript}
        onOpenFdx={handleOpenFdx}
        onOpenFountain={file=>/\.(txt|rtf)$/i.test(file.name)?void handleOpenText(file):void handleOpenFountain(file)}
        onSave={() => handleSave()}
        onOpenProject={window.draftcraftDesktop?.openProject?()=>{void nativeFiles.open()}:undefined}
        onSaveProjectAs={window.draftcraftDesktop?.saveProject?()=>handleSave(true):undefined}
        onExportFdx={handleExportFdx}
        onExportFountain={handleExportFountain}
        onPrintPdf={handlePrintPdf}
        onOpenTableRead={()=>openTableRead()}
        onOpenTableReadSettings={()=>openTableRead('settings')}
        onOpenResearch={() => {
          setResearchSnippet(doc.paragraphs.find((p) => p.type === 'Scene Heading')?.text || '');
          setIsResearchOpen(true);
        }}
        onOpenImageAnalysis={() => setIsImageAnalysisOpen(true)}
        onOpenRevisionsModal={() => setProductionSection('revisions')}
        onCommand={command=>appCommands.current(command)} onImportPdf={()=>pdfInput.current?.click()} onOpenProduction={openProduction}
        onOpenReportsModal={() => setIsReportsOpen(true)}
        onOpenTitlePageModal={() => setIsTitlePageOpen(true)}
        onOpenRustModal={() => setIsRustModalOpen(true)}
        onOpenFormatDoctor={() => setIsFormatDoctorOpen(true)}
        onOpenWritingAssistance={() => setIsWritingSettingsOpen(true)}
        onOpenPunctuationSettings={()=>setIsPunctuationSettingsOpen(true)}
        onOpenKeyboardShortcuts={() => setIsShortcutSettingsOpen(true)}
        onOpenEditorSettings={() => openEditorSettings()}
        onOpenCaretSettings={()=>openEditorSettings(undefined,undefined,'caret')} onOpenAutomaticFormatting={()=>openEditorSettings(undefined,undefined,'formatting')}
        onOpenFilesSettings={()=>{setFilesSettings(true);void nativeFiles.refresh()}}
        onOpenSmartTypeManager={() => { const dictionary=buildSmartTypeFromScript(doc.paragraphs);dictionary.characters=[...new Set([...dictionary.characters,...(doc.characterMemory || []).map(record=>record.name)])].sort();setSmartTypeDict(dictionary); setIsSmartTypeManagerOpen(true); }}
        onOpenNamesDatabase={() => setIsNamesDatabaseOpen(true)}
        onOpenFindReplace={() => setIsFindReplaceOpen((prev) => !prev)}
        onOpenScriptCompare={() => {rememberEditorSelection();setIsScriptCompareOpen(true);}}
        onOpenFileManager={() => setIsFileManagerOpen(true)}
        onOpenPdfStudio={handleOpenPdfStudio}
        onOpenFormatExports={handleOpenFormatExports}
        onOpenTemplates={handleOpenTemplates} onOpenElements={()=>setFormatPanel('elements')} onSaveTemplate={()=>setFormatPanel('save-template')} onAutoFormatting={()=>setFormatPanel('writing')}
        sceneNumberPlacement={doc.sceneNumberPlacement}
        onChangeSceneNumberPlacement={(placement) =>
          setDoc((prev) => ({ ...prev, sceneNumberPlacement: placement }))
        }
        onInsertElement={handleInsertElement}
        onToggleDualDialogue={handleToggleDualDialogue}
        showScriptNotes={doc.showScriptNotes !== false}
        showBookmarks={doc.showBookmarks !== false}
        showSceneComments={doc.showSceneComments !== false}
        onToggleShowScriptNotes={() =>
          setDoc((prev) => ({ ...prev, showScriptNotes: prev.showScriptNotes === false ? true : false }))
        }
        onToggleShowBookmarks={() =>
          setDoc((prev) => ({ ...prev, showBookmarks: prev.showBookmarks === false ? true : false }))
        }
        onToggleShowSceneComments={() =>
          setDoc((prev) => ({ ...prev, showSceneComments: prev.showSceneComments === false ? true : false }))
        }
        onNextBookmark={()=>editorCommand({command:'bookmark-next'})}
        onPrevBookmark={()=>editorCommand({command:'bookmark-prev'})}
        onOpenProductivityModal={() => setIsProductivityOpen(true)}
        onOpenWelcomeModal={() => setIsWelcomeOpen(true)}
        onStartSprint={(minutes) => {
          setTimerState({
            mode: 'sprint',
            sprintPreset: minutes,
            durationSeconds: minutes * 60,
            remainingSeconds: minutes * 60,
            elapsedSeconds: 0,
            isRunning: true,
          });
        }}
        onToggleShowStreaks={() => {
          const updated = {
            ...productivityStore,
            settings: {
              ...productivityStore.settings,
              showStreakInfo: !productivityStore.settings.showStreakInfo,
            },
          };
          saveProductivityStore(updated);
          setProductivityStore(updated);
        }}
        showStreaks={productivityStore.settings.showStreakInfo}
      />}

      {/* Crash Recovery Notification Banner (Part 11) */}
      {window.draftcraftDesktop?.saveProject && nativeFiles.state.status==='failed' && <SaveStatus state={nativeFiles.state} onRetry={()=>void handleSave()} onSaveAs={()=>void handleSave(true)}/>}
      {nativeFiles.state.preferences.restoreRecovery&&nativeFiles.recoveries.length>0&&<div className="dc-save-status no-print"><span>Interrupted work is available for review.</span><button onClick={()=>setFilesSettings(true)}>Review Recovery</button></div>}
      {crashRecoveryAlert && (
        <div className="dc-recovery bg-amber-950/90 border-b border-amber-500/80 px-6 py-2.5 flex items-center justify-between text-xs text-amber-200 z-40 backdrop-blur-sm shadow-lg">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping shrink-0" />
            <span>
              <strong>Document Recovery:</strong> An uncommitted autosave snapshot from{' '}
              <span className="text-amber-100 underline decoration-amber-400">
                {new Date(crashRecoveryAlert.lastSavedAt).toLocaleTimeString()}
              </span>{' '}
              was recovered following a crash or unexpected browser shutdown ({crashRecoveryAlert.paragraphs.length} paragraphs).
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setDoc(crashRecoveryAlert);
                clearCrashRecoveryState();
                setCrashRecoveryAlert(null);
              }}
              className="px-3 py-1 bg-amber-400 text-black font-semibold rounded hover:bg-amber-300 transition-colors"
            >
              Restore Recovered Version
            </button>
            <button
              onClick={() => {
                clearCrashRecoveryState();
                setCrashRecoveryAlert(null);
              }}
              className="px-3 py-1 bg-neutral-800 text-neutral-300 rounded hover:bg-neutral-700 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {workspace.timeline.visible&&!workspace.focus&&(activeView==='script'||activeView==='beatboard')&&<Timeline document={doc} index={storyIndex} prefs={workspace.timeline} caretParagraphId={focusedParagraphId} api={timelineApi}/>}
      {collaboration.active&&<div role="status" className="px-4 py-1 text-xs bg-blue-950">Collaboration: {collaboration.state.phase} · {collaboration.state.people.length} connected <button onClick={()=>setCollaborationOpen(true)}>Session</button></div>}
      {/* Find & Replace Bar */}
      <UIPresence>{isFindReplaceOpen && (
        <FindReplaceBar
          isOpen={isFindReplaceOpen}
          onClose={() => setIsFindReplaceOpen(false)}
          onFind={handleFind}
          onFindNext={handleFindNext}
          onFindPrev={handleFindPrev}
          onReplace={handleReplace}
          onReplaceAll={handleReplaceAll}
          matchCount={findMatches.length}
          currentMatchIndex={currentMatchIdx}
        />
      )}</UIPresence>

      {/* Main Workspace */}
      {fileStatus && <div role="status" className="no-print px-4 py-1 text-[10px] dc-bg-chrome text-neutral-400">{fileStatus}</div>}
      <main inert={nativeFiles.closing||!nativeFiles.ready||collaboration.readOnly} className="dc-workspace flex-1 flex overflow-hidden relative">
        {activeView === 'script' && (
          <>
            {/* Final Draft Navigator 2.0 Sidebar */}
            <SidebarFrame open={isNavigatorOpen} width={workspace.navigator.width}><DeferredNavigator
              onNavigatePage={page=>timelineApi.current.onNavigatePage(page)}
              document={doc}
              onUpdateDocument={commitProduction}
              onSelectScene={handleSelectScene}
              onOpenTableReadSnippet={(_text,char)=>openTableRead('cast',undefined,undefined,char)}
              isOpen={isNavigatorOpen}
              onToggle={() => setIsNavigatorOpen(!isNavigatorOpen)}
              prefs={workspace.navigator} onPrefs={navigatorPrefs}
            />{isNavigatorOpen&&<div className="dc-nav-resize no-print" role="separator" aria-orientation="vertical" aria-label="Resize Navigator" tabIndex={0}
              onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();setWorkspace(w=>({...w,navigator:{...w.navigator,width:Math.max(220,Math.min(640,w.navigator.width+(e.key==='ArrowRight'?20:-20)))}}));}}}
              onPointerDown={e=>{const handle=e.currentTarget,frame=handle.parentElement as HTMLElement,start=e.clientX,width=workspace.navigator.width;handle.setPointerCapture(e.pointerId);const move=(ev:PointerEvent)=>{frame.style.width=Math.max(220,Math.min(640,width+ev.clientX-start))+'px';};const up=(ev:PointerEvent)=>{handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',up);setWorkspace(w=>({...w,navigator:{...w.navigator,width:Math.max(220,Math.min(640,width+ev.clientX-start))}}));};handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',up);}}/>}</SidebarFrame>

            {scriptPresentation!=='pages'&&<section role="region" aria-label={scriptPresentation==='scenes'?'Scene list':'Index cards'} className="flex-1 min-w-0 overflow-auto flex flex-col"><button onClick={()=>setScriptPresentation('pages')}>Return to screenplay</button>{scriptPresentation==='scenes'?<SceneListView document={doc} paragraphs={doc.paragraphs} onParagraphsChange={paragraphs=>commitProduction({...latestDoc.current,paragraphs})} onJumpToScene={id=>handleSelectScene(doc.paragraphs.findIndex(p=>p.id===id))} isDarkMode={isDarkMode}/>:<IndexCardsView document={doc} paragraphs={doc.paragraphs} onParagraphsChange={paragraphs=>commitProduction({...latestDoc.current,paragraphs})} onJumpToScene={id=>handleSelectScene(doc.paragraphs.findIndex(p=>p.id===id))} isDarkMode={isDarkMode}/>}</section>}
            <div className={splitActive?'dc-split dc-split-'+workspace.split:undefined} style={{display:scriptPresentation==='pages'?(splitActive?'flex':'contents'):'none'}}>
            {/* Core Hollywood Screenplay Editor */}
            <ScriptEditor key={doc.id} readHighlight={readHighlight}
              collaborativeHistory={collaboration.history} formatTransaction={formatTransaction} onFormatConsumed={()=>setFormatTransaction(undefined)} onDocumentChange={restoreEditorDocument}
              storyDocument={doc} storyIndex={displayIndex} displayFormat={displayFormat} scriptViewMode={workspace.view} typewriterMode={workspace.typewriter} showFormattingMarks={workspace.formattingMarks} showRuler={workspace.ruler} showStructureLines={doc.showStructureLines} structureStyle={workspace.structure} paragraphControls={workspace.paragraphControls} hiddenTypes={hideOutline?OUTLINE_ELEMENTS:undefined} onStoryUpdate={updateStory} onEditStory={openEditorSettings} onPageStructure={handlePageStructure} editorPreferences={editorPreferences}
              shortcutProfile={doc.documentShortcutProfile||activeProfile(shortcutSettings)}
              characterShortcuts={doc.characterShortcuts || {}}
              onOpenKeyboardShortcuts={() => setIsShortcutSettingsOpen(true)}
              characterMemory={doc.characterMemory || []}
              writingSettings={writingSettings}
              documentAssistance={doc.writingAssistance}
              customDictionary={doc.customDictionary || EMPTY_DICTIONARY}
              onWritingSettingsChange={setWritingSettings}
              onDocumentAssistanceChange={writingAssistance => setDoc(previous => ({ ...previous, writingAssistance }))}
              paragraphs={doc.paragraphs}
              onParagraphsChange={handleParagraphsChange}
              activeRevision={doc.currentRevision}
              onFocusedParagraphChange={p => { if (p.id === latestFocusedId.current) return; latestFocusedId.current = p.id; React.startTransition(() => setFocusedParagraphId(p.id)); }}
              productionMode={doc.productionMode}
              lockedPages={doc.lockedPages}
              zoom={zoom}
              isDarkMode={isDarkMode}
              sceneNumberPlacement={doc.sceneNumberPlacement}
              autoHideRightSceneNumbers={!!doc.autoHideRightSceneNumbers}
              characterHighlightMap={doc.characterHighlightMap}
              showScriptNotes={doc.showScriptNotes !== false}
              showBookmarks={doc.showBookmarks !== false}
              showSceneComments={doc.showSceneComments !== false}
              onToggleShowScriptNotes={() =>
                setDoc((prev) => ({ ...prev, showScriptNotes: prev.showScriptNotes === false ? true : false }))
              }
              onToggleShowBookmarks={() =>
                setDoc((prev) => ({ ...prev, showBookmarks: prev.showBookmarks === false ? true : false }))
              }
              onToggleShowSceneComments={() =>
                setDoc((prev) => ({ ...prev, showSceneComments: prev.showSceneComments === false ? true : false }))
              }
              activeAuthor={doc.titlePage.author.replace(/Written by /i, '').trim() || 'Elena Vance'}
              onOpenTableReadSnippet={(_text,charA,_charB,id)=>openTableRead('player',id,doc.paragraphs.find(p=>p.id===id)?.type==='Scene Heading'?'scene':'dialogue',charA)}
              onOpenResearchSnippet={(text) => {
                setResearchSnippet(text);
                setIsResearchOpen(true);
              }}
            />
            {splitActive&&<section className="dc-split-pane" role="region" aria-label={'Second panel: '+({cards:'Index Cards',scenes:'Scene View',beatboard:'Beat Board',outline:'Outline Map',script:'Index Cards'} as const)[workspace.splitPane]}>{renderSecondPane(workspace.splitPane)}</section>}
            </div>
          </>
        )}

        {activeView === 'beatboard' && (
          <BeatBoard
            beats={doc.beats}
            flowLines={doc.flowLines || []}
            onBeatsChange={(beats) => setDoc((prev) => ({ ...prev, beats }))}
            onResizeCommit={commitBeatResize}
            onUndoResize={undoBeatResize} onRedoResize={redoBeatResize}
            canUndoResize={resizeHistory.length > 0} canRedoResize={resizeRedo.length > 0}
            onFlowLinesChange={(flowLines) => setDoc((prev) => ({ ...prev, flowLines }))}
            goals={goals} {...boardExtras} onPlaceOnTimeline={placeOnTimeline}
            onSendBeatToScript={handleSendBeatToScript}
            onJumpToLinkedScene={id=>{const at=doc.paragraphs.findIndex(p=>p.id===id);if(at>=0)handleSelectScene(at)}}
            onOpenResearch={(q) => {
              setResearchSnippet(q);
              setIsResearchOpen(true);
            }}
          />
        )}

        {activeView === 'outline' && (
          <OutlineEditor
            document={doc}
            onUpdateDocument={setDoc}
            onJumpToScene={handleSelectScene}
            onSendMarkerToScript={handleSendMarkerToScript}
          />
        )}

        <UIPresence>{activeView === 'reports' && (
          <div className="flex-1 bg-[#16161c] dc-bg-workspace p-6 overflow-y-auto">
            <ProductionReportsModal
              isOpen={true}
              onClose={() => setActiveView('script')}
              document={doc}
              paragraphs={doc.paragraphs}
              titlePage={doc.titlePage}
            />
          </div>
        )}</UIPresence>
      </main>

      {/* Hollywood Screenplay Status Bar with Live Writing Goals & Sprint Capsule */}
      <StatusBar
        pageCount={scriptPages.length}
        currentPage={scriptPages.find(page => page.paragraphs.some(p => p.id === focusedParagraphId))?.pageNumber || 1}
        wordCount={documentWordCount}
        lineCount={doc.paragraphs.length}
        currentElementType={doc.paragraphs.find(p => p.id === focusedParagraphId)?.type || doc.paragraphs[0]?.type || 'Action'}
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
        typewriterMode={isTypewriterMode}
        onToggleTypewriterMode={() => setIsTypewriterMode((prev) => !prev)}
        splitMode={splitMode}
        onToggleSplitMode={() => setSplitMode((prev) => (prev === 'none' ? 'vertical' : 'none'))}
        showFormattingMarks={showFormattingMarks}
        onToggleFormattingMarks={() => setShowFormattingMarks((prev) => !prev)}
        showRuler={showRuler}
        onToggleRuler={() => setShowRuler((prev) => !prev)}
        zoom={zoom}
        onZoomChange={setZoom}
        isDarkMode={isDarkMode}
        onToggleAppearance={()=>setWorkspace(w=>({...w,appearance:isDarkMode?'light':'dark'}))}
        timerState={timerState}
        onToggleTimer={() => setTimerState((prev) => ({ ...prev, isRunning: !prev.isRunning }))}
        onOpenProductivityModal={() => setIsProductivityOpen(true)}
        todayWordsAdded={productivityStore.history[getTodayKey()]?.wordsAdded || 0}
        dailyWordsGoal={productivityStore.goals.dailyWordsGoal}
        streakCount={computeStreaks(productivityStore.history).currentStreak}
        showStreak={productivityStore.settings.showStreakInfo}
        sceneNumber={caretScene.number}
        sceneCount={caretScene.count}
        hidden={workspace.statusBar.hidden}
        onHiddenChange={hidden=>setWorkspace(w=>({...w,statusBar:{hidden}}))}
      />

      {/* Modals */}
      <WritingAssistanceSettings open={isWritingSettingsOpen} onClose={() => setIsWritingSettingsOpen(false)} settings={writingSettings} onChange={setWritingSettings} />
      <AutomaticPunctuationSettings open={isPunctuationSettingsOpen} onClose={()=>setIsPunctuationSettingsOpen(false)} settings={writingSettings.punctuation} onChange={punctuation=>setWritingSettings(previous=>({...previous,punctuation}))}/>
      {formatPanel&&<FormatStudio key={doc.id+formatPanel} panel={formatPanel} document={doc} onClose={()=>setFormatPanel(null)} onNew={next=>setDoc(next)} onApply={async(before,after)=>{await nativeFiles.checkpoint();if(latestDoc.current.id!==before.id||latestDoc.current.paragraphs!==before.paragraphs||latestDoc.current.writingFormat!==before.writingFormat)throw Error('The document changed. Review the refreshed preview and apply again.');setActiveView('script');setFormatTransaction({token:crypto.randomUUID(),before:latestDoc.current,after});}}/>}
      {structureSettingsOpen&&<StructureSettings value={workspace.structure} onChange={structure=>setWorkspace(w=>({...w,structure}))} shown={!!doc.showStructureLines} onShown={shown=>setDoc(prev=>({...prev,showStructureLines:shown}))} onClose={()=>setStructureSettingsOpen(false)}/>}
      {filesSettings&&<FilesAutosaveSettings state={nativeFiles.state} supported={nativeFiles.supported} recoveries={nativeFiles.recoveries} onPreferences={nativeFiles.preferences} onSaveAs={()=>nativeFiles.save(true)} onReveal={nativeFiles.reveal} onRefresh={nativeFiles.refresh} onRestore={nativeFiles.restore} onDiscard={nativeFiles.discard} onReview={nativeFiles.review} onClose={()=>setFilesSettings(false)}/>}
      {editorSettings && <EditorSettings key={doc.id+':'+(editorSettings.selection?.id || '')+':'+(editorSettings.page || '')+':'+(editorSettings.tab || '')} initialTab={editorSettings.tab} document={doc} index={storyIndex} page={editorSettings.page || scriptPages.find(p=>p.paragraphs.some(p=>p.id===focusedParagraphId))?.pageNumber || 1} selection={editorSettings.selection} preferences={editorPreferences} onPreferences={setEditorPreferences} onUpdate={updateStory} onClose={()=>setEditorSettings(null)}/>}
      <GettingStartedGuide open={isGuideOpen} initialQuery={guideQuery} onClose={() => setIsGuideOpen(false)} onStartTutorial={kind => void startTutorial(kind)} />
      <StartWindow open={isStartOpen} documentTitle={doc.titlePage.title} bridge={window.draftcraftDesktop?.startWindow} onClose={() => setIsStartOpen(false)}
        onNew={template => void startNewDocument(template)} onMoreTemplates={() => { setIsStartOpen(false); setFormatPanel('templates'); }}
        onOpen={() => { if (window.draftcraftDesktop?.openProject) void nativeFiles.open(); else { setIsStartOpen(false); setIsFileManagerOpen(true); } }}
        onOpenRecent={requestId => void nativeFiles.open(requestId)}
        onTutorial={kind => void startTutorial(kind)} onGuide={query => { setIsStartOpen(false); setGuideQuery(query); setIsGuideOpen(true); }} />
      {emojiTarget && <React.Suspense fallback={null}><EmojiPicker target={emojiTarget} onClose={() => setEmojiTarget(null)} /></React.Suspense>}
      {isShortcutSettingsOpen && <KeyboardShortcutSettings key={doc.id} settings={shortcutSettings} characters={doc.characterMemory || []} characterShortcuts={doc.characterShortcuts || {}} onClose={() => setIsShortcutSettingsOpen(false)} onChange={(settings, characterShortcuts) => { setShortcutSettings(settings); setDoc(previous => ({ ...previous, characterShortcuts,documentShortcutProfile:activeProfile(settings) })); }} />}
      <SmartTypeManagerModal
        isOpen={isSmartTypeManagerOpen}
        onClose={() => setIsSmartTypeManagerOpen(false)}
        dict={smartTypeDict} preferences={doc.smartType||DEFAULT_SMART} onPreferences={smartType=>setDoc(previous=>({...previous,smartType}))} paragraphs={doc.paragraphs} onRenameCharacter={(from,to)=>{if(window.confirm(`Rename ${from} to ${to} throughout character cues?`)){try{commitProduction(renameCharacter(latestDoc.current,from,to));}catch(error){setFileStatus((error as Error).message);}}}}

        onUpdateDict={dictionary => {
          setSmartTypeDict(dictionary);
          setDoc(previous => {
            const names = new Set(dictionary.characters.map(normalizeWord));
            const records = (previous.characterMemory || []).map(record => ({ ...record, saved:Boolean(record.saved && names.has(record.normalized)) }));
            for (const name of dictionary.characters) if (!records.some(record => record.normalized === normalizeWord(name))) {
              records.push({ id:crypto.randomUUID(), projectId:previous.id, name:characterName(name), normalized:normalizeWord(name), aliases:[], paragraphIds:[], firstAppearance:null, appearances:0, firstUsedAt:new Date().toISOString(), lastUsedAt:new Date().toISOString(), saved:true });
            }
            const smart=previous.smartType||DEFAULT_SMART,learned=buildSmartTypeFromScript(previous.paragraphs),excluded={...smart.excluded};for(const key of Object.keys(dictionary) as (keyof SmartTypeDictionary)[])excluded[key]=[...new Set([...(smart.excluded[key]||[]),...learned[key].filter(v=>!dictionary[key].includes(v))])].filter(v=>!dictionary[key].includes(v));
            return { ...previous, characterMemory:records,smartType:{...smart,entries:dictionary,excluded} };
          });
        }}
        onRebuildFromScript={()=>{setSmartTypeDict(buildSmartTypeFromScript(doc.paragraphs));setDoc(p=>({...p,smartType:{...(p.smartType||DEFAULT_SMART),entries:{},excluded:{}}}))}}
      />

      <FormatDoctorModal
        isOpen={isFormatDoctorOpen}
        onClose={() => setIsFormatDoctorOpen(false)}
        paragraphs={doc.paragraphs}
        format={doc.writingFormat} preferences={doc.studio!.doctor} onPreferences={doctor=>setDoc(previous=>({...previous,studio:{...previous.studio!,doctor}}))} onJump={id=>{const at=doc.paragraphs.findIndex(p=>p.id===id);if(at>=0)handleSelectScene(at)}}
        onApplyFix={handleApplyDoctorFix}
        onFixAll={handleFixAllDoctorIssues}
      />

      <NamesDatabaseModal
        isOpen={isNamesDatabaseOpen}
        onClose={() => setIsNamesDatabaseOpen(false)}
        onSelectCharacter={(name) => {
          const newP: Paragraph = {
            id: `p-${Date.now()}`,
            type: 'Character',
            text: name,
          };
          handleParagraphsChange([...doc.paragraphs, newP]);
        }}
      />

      <AiTableReadModal isOpen={isTableReadOpen} onClose={()=>setIsTableReadOpen(false)} document={doc} onProject={tableRead=>setDoc(previous=>({...previous,tableRead}))} focusedParagraphId={focusedParagraphId||undefined} launch={tableReadLaunch} onHighlight={setReadHighlight}/>

      <AiResearchModal
        isOpen={isResearchOpen}
        onClose={() => setIsResearchOpen(false)}
        initialQuery={researchSnippet}
        onInsertAction={handleInsertActionFromAi}
      />

      <AiImageAnalysisModal
        isOpen={isImageAnalysisOpen}
        onClose={() => setIsImageAnalysisOpen(false)}
        onInsertAction={handleInsertActionFromAi}
      />

      <input ref={pdfInput} type="file" accept="application/pdf,.pdf" hidden onChange={e=>{const file=e.target.files?.[0];if(file)void handleImportPdf(file);e.target.value='';}}/>
      <InterchangeReview request={exportReview} onClose={()=>setExportReview(null)}/>
      <PdfImportDialog review={pdfReview} onClose={()=>setPdfReview(null)} onImport={setDoc}/>
      <SendToScriptDialog source={planningSource} doc={doc} focusedId={focusedParagraphId||undefined} onClose={()=>setPlanningSource(null)} onCommit={commitProduction}/>
      {dictationOpen&&<DictationPanel doc={doc} selection={savedEditorSelection.current} onClose={()=>setDictationOpen(false)}/>}
      {collaborationOpen&&<CollaborationPanel session={collaboration} onClose={()=>setCollaborationOpen(false)}/>}
      <ProductionPanel document={doc} section={productionSection} onSection={setProductionSection} onClose={()=>setProductionSection(null)} onCommit={commitProduction} selection={savedEditorSelection.current} onJump={id=>{const index=doc.paragraphs.findIndex(p=>p.id===id);if(index>=0)handleSelectScene(index);}}/>

      <ProductionRevisionsModal
        isOpen={isRevisionsOpen}
        onClose={() => setIsRevisionsOpen(false)}
        currentRevision={doc.currentRevision}
        onSelectRevision={(rev) => setDoc((prev) => ({ ...prev, currentRevision: rev }))}
        productionMode={doc.productionMode}
        onToggleProductionMode={() =>
          setDoc((prev) => ({ ...prev, productionMode: !prev.productionMode }))
        }
        lockedPages={doc.lockedPages}
        onToggleLockPages={()=>commitProduction(doc.studio?.pageLocks.length?unlockLayout(doc,true):lockLayout(doc))}
      />

      {isHeaderFooterOpen&&<HeaderFooterModal isOpen={isHeaderFooterOpen} onClose={()=>setIsHeaderFooterOpen(false)} config={doc.headerFooterConfig} document={doc} onSave={headerFooterConfig=>{setDoc(prev=>({...prev,headerFooterConfig}));setIsHeaderFooterOpen(false);}}/>}
      <TitlePageModal
        isOpen={isTitlePageOpen}
        onClose={() => setIsTitlePageOpen(false)}
        titlePage={doc.titlePage}
        onSave={(titlePage) => setDoc((prev) => ({ ...prev, titlePage }))}
      />

      <UIPresence>{isReportsOpen && (
        <ProductionReportsModal
          isOpen={isReportsOpen}
          onClose={() => setIsReportsOpen(false)}
          document={doc}
          paragraphs={doc.paragraphs}
          titlePage={doc.titlePage}
        />
      )}</UIPresence>

      <RustEngineModal
        isOpen={isRustModalOpen}
        onClose={() => setIsRustModalOpen(false)}
      />

      {/* Part 8: Writing Goals & Productivity Statistics Modal */}
      <ProductivityModal
        isOpen={isProductivityOpen}
        onClose={() => setIsProductivityOpen(false)}
        store={productivityStore}
        onUpdateStore={setProductivityStore}
        timerState={timerState}
        onStartTimer={() => setTimerState((prev) => ({ ...prev, isRunning: true }))}
        onPauseTimer={() => setTimerState((prev) => ({ ...prev, isRunning: false }))}
        onResetTimer={() =>
          setTimerState((prev) => ({
            ...prev,
            isRunning: false,
            remainingSeconds: prev.durationSeconds,
            elapsedSeconds: 0,
          }))
        }
        onSetSprintPreset={(mins) =>
          setTimerState({
            mode: 'sprint',
            sprintPreset: mins,
            durationSeconds: mins * 60,
            remainingSeconds: mins * 60,
            elapsedSeconds: 0,
            isRunning: true,
          })
        }
        onSwitchTimerMode={(mode) =>
          setTimerState((prev) => ({
            ...prev,
            mode,
            isRunning: false,
          }))
        }
        sessionStats={sessionStats}
      />

      {/* Part 8: Welcome-Screen Writing Statistics Modal */}
      <WelcomeStatsModal
        isOpen={isWelcomeOpen}
        onClose={() => setIsWelcomeOpen(false)}
        store={productivityStore}
        onStartSprint={(mins) =>
          setTimerState({
            mode: 'sprint',
            sprintPreset: mins,
            durationSeconds: mins * 60,
            remainingSeconds: mins * 60,
            elapsedSeconds: 0,
            isRunning: true,
          })
        }
        onOpenFullProductivity={() => setIsProductivityOpen(true)}
        screenplayTitle={doc.titlePage?.title || 'UNTITLED SCREENPLAY'}
        totalPageCount={scriptPages.length}
        totalWordCount={documentWordCount}
      />
      {/* Part 11: Script Compare and Combine Modal */}
      <UIPresence>{isScriptCompareOpen && (
        <ScriptCompareModal
          isOpen={isScriptCompareOpen}
          onClose={() => setIsScriptCompareOpen(false)}
          currentDocument={doc}
          insertionAnchor={savedEditorSelection.current?{paragraphId:savedEditorSelection.current.paragraphId,offset:savedEditorSelection.current.end}:null}
          onApplyMergedScript={commitProduction}
          onApplyReformattedText={(newParas) => {
            commitProduction({...latestDoc.current,paragraphs:[...latestDoc.current.paragraphs,...newParas]});
          }}
        />
      )}</UIPresence>

      {/* Part 11: File Manager, Backups, Recent Documents & Autosave Modal */}
      <UIPresence>{isFileManagerOpen && (
        <FileManagerModal
          isOpen={isFileManagerOpen}
          onClose={() => setIsFileManagerOpen(false)}
          currentDocument={doc}
          onLoadDocument={handleLoadSnapshot}
          onDuplicateDocument={handleDuplicateDocument}
          onSaveAsDocument={handleSaveAsDocument}
          onRevertToSaved={handleRevertToSaved}
        />
      )}</UIPresence>

      {/* Part 12: Professional PDF, Print & File Format Support Modal */}
      <UIPresence>{isPrintAndPdfOpen && (
        <PrintAndPdfModal
          isOpen={isPrintAndPdfOpen}
          onClose={() => setIsPrintAndPdfOpen(false)}
          document={doc} onExportReview={reviewExport}
          initialTab={printModalTab}
          onLoadTemplateOrDocument={(newDoc) => setDoc(newDoc)}
        />
      )}</UIPresence>
    </div></UIProvider>
  );
}
