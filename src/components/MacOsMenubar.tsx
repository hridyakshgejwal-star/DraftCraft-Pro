import { MenuSurface, UIPresence } from './ui/Presentation';
import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  Save,
  Download,
  Upload,
  Printer,
  Sparkles,
  Search,
  Image as ImageIcon,
  Headphones,
  Sliders,
  FileCode,
  ShieldAlert,
  HelpCircle,
  FolderOpen,
  Stethoscope,
  Users,
  Replace,
  Check,
  Target,
  Flame,
  Clock,
  FileSpreadsheet,
  GitCompare,
  FolderArchive,
  Copy,
  Cloud,
  LayoutTemplate,
} from 'lucide-react';
import { ElementType, SceneNumberPlacement } from '../types/script';

interface MacOsMenubarProps {
  onCommand?:(command:string)=>void;
  onImportPdf?:()=>void;
  onOpenProduction?:(section:import('../production/ProductionPanel').ProductionSection)=>void;
  onNewScript: () => void;
  onOpenFdx: (file: File) => void;
  onOpenFountain: (file: File) => void;
  onSave: () => void;
  onOpenProject?:()=>void;
  onSaveProjectAs?:()=>void;
  onExportFdx: () => void;
  onExportFountain: () => void;
  onPrintPdf: () => void;
  onOpenTableRead: () => void;
  onOpenTableReadSettings:()=>void;
  onOpenResearch: () => void;
  onOpenImageAnalysis: () => void;
  onOpenRevisionsModal: () => void;
  onOpenReportsModal: () => void;
  onOpenTitlePageModal: () => void;
  onOpenRustModal: () => void;
  onOpenFormatDoctor: () => void;
  onOpenSmartTypeManager: () => void;
  onOpenWritingAssistance: () => void;
  onOpenPunctuationSettings:()=>void;
  onOpenKeyboardShortcuts: () => void;
  onOpenEditorSettings: () => void;
  onOpenCaretSettings:()=>void;
  onOpenAutomaticFormatting:()=>void;
  onOpenFilesSettings: () => void;
  onOpenNamesDatabase: () => void;
  onOpenFindReplace: () => void;
  onOpenScriptCompare?: () => void;
  onOpenFileManager?: () => void;
  onOpenPdfStudio?: () => void;
  onOpenFormatExports?: () => void;
  onOpenTemplates?: () => void; onOpenElements?:()=>void; onSaveTemplate?:()=>void; onAutoFormatting?:()=>void;
  onOpenGoogleDrive?: () => void;
  onOpenHeaderFooter?: () => void;
  sceneNumberPlacement: SceneNumberPlacement;
  onChangeSceneNumberPlacement: (placement: SceneNumberPlacement) => void;
  onInsertElement: (type: ElementType) => void;
  onToggleDualDialogue: () => void;
  showScriptNotes?: boolean;
  showBookmarks?: boolean;
  showSceneComments?: boolean;
  onToggleShowScriptNotes?: () => void;
  onToggleShowBookmarks?: () => void;
  onToggleShowSceneComments?: () => void;
  onNextBookmark?: () => void;
  onPrevBookmark?: () => void;
  onAddScriptNote?: () => void;
  onAddBookmark?: () => void;
  onOpenProductivityModal?: () => void;
  onOpenWelcomeModal?: () => void;
  onStartSprint?: (minutes: number) => void;
  onToggleShowStreaks?: () => void;
  showStreaks?: boolean;
}

export const MacOsMenubar: React.FC<MacOsMenubarProps> = ({
  onNewScript,onOpenProduction,onImportPdf,onCommand,
  onOpenFdx,
  onOpenFountain,
  onSave,
  onOpenProject,onSaveProjectAs,
  onExportFdx,
  onExportFountain,
  onPrintPdf,
  onOpenTableRead,
  onOpenTableReadSettings,
  onOpenResearch,
  onOpenImageAnalysis,
  onOpenRevisionsModal,
  onOpenReportsModal,
  onOpenTitlePageModal,
  onOpenRustModal,
  onOpenFormatDoctor,
  onOpenSmartTypeManager,
  onOpenWritingAssistance,
  onOpenPunctuationSettings,
  onOpenKeyboardShortcuts,
  onOpenEditorSettings,onOpenFilesSettings,onOpenCaretSettings,onOpenAutomaticFormatting,
  onOpenNamesDatabase,
  onOpenFindReplace,
  onOpenScriptCompare,
  onOpenFileManager,
  onOpenPdfStudio,
  onOpenFormatExports,
  onOpenTemplates,onOpenElements,onSaveTemplate,onAutoFormatting,
  onOpenGoogleDrive,
  onOpenHeaderFooter,
  sceneNumberPlacement,
  onChangeSceneNumberPlacement,
  onInsertElement,
  onToggleDualDialogue,
  showScriptNotes = true,
  showBookmarks = true,
  showSceneComments = true,
  onToggleShowScriptNotes,
  onToggleShowBookmarks,
  onToggleShowSceneComments,
  onNextBookmark,
  onPrevBookmark,
  onAddScriptNote,
  onAddBookmark,
  onOpenProductivityModal,
  onOpenWelcomeModal,
  onStartSprint,
  onToggleShowStreaks,
  showStreaks = true,
}) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fdxInputRef = useRef<HTMLInputElement>(null);
  const fountainInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuClick = (name: string) => {
    setOpenMenu(openMenu === name ? null : name);
  };

  const handleFdxUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onOpenFdx(file);
      e.target.value = '';
    }
  };

  const handleFountainUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onOpenFountain(file);
      e.target.value = '';
    }
  };

  return (
    <div
      ref={menuRef}
      className="dc-menubar h-7 bg-[#141418] border-b border-white/10 px-3 flex items-center gap-1 text-[12px] text-neutral-300 select-none z-20 shrink-0"
    >
      <input
        ref={fdxInputRef}
        type="file"
        accept=".fdx,.fdxt,application/xml,text/xml"
        className="hidden"
        onChange={handleFdxUpload}
      />
      <input
        ref={fountainInputRef}
        type="file"
        accept=".fountain,.spmd,.txt,.rtf"
        className="hidden"
        onChange={handleFountainUpload}
      />

      {/* App Identifier */}
      <div className="relative">
        <button
          onClick={() => handleMenuClick('app')}
          className={`px-2 py-0.5 rounded font-semibold text-neutral-100 flex items-center gap-1.5 transition-colors ${
            openMenu === 'app' ? 'bg-white/15' : 'hover:bg-white/10'
          }`}
        >
          <span className="text-amber-400 font-bold">DraftCraft</span>
          <span className="text-[10px] dc-meta text-neutral-400 font-normal">macOS</span>
        </button>
        <UIPresence>{openMenu === 'app' && (
          <MenuSurface className="absolute left-0 mt-1 w-64 bg-[#23232c] dc-bg-elevated border border-white/15 rounded-md shadow-2xl py-1 text-neutral-200 z-50">
            <button
              onClick={() => {
                onOpenRustModal();
                setOpenMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-black flex items-center justify-between"
            >
              <span>About DraftCraft Pro</span>
              <span className="text-[10px] dc-meta opacity-75">{window.draftcraftDesktop ? 'v1.4.1' : 'v1.4.0'}</span>
            </button>
            <div className="px-3 py-1 text-[11px] text-neutral-400 border-t border-white/10 mt-1">
              {window.draftcraftDesktop ? 'Local screenplay editor' : 'Final Draft 13.4.0 Complete Parity'}
            </div>
            <div className="px-3 py-1 text-[11px] text-neutral-400">
              {window.draftcraftDesktop ? 'macOS Desktop Runtime' : 'macOS 27.0.1 Golden Gate Ready'}
            </div>
            <div className="px-3 py-1 text-[11px] text-neutral-400 border-b border-white/10 mb-1">
              {window.draftcraftDesktop ? 'Offline writing and file exports' : 'Apple Silicon NEON Engine'}
            </div>
            <button
              onClick={() => {
                onOpenRustModal();
                setOpenMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-black"
            >
              {window.draftcraftDesktop ? 'Desktop Runtime…' : 'Rust Core Architecture...'}
            </button>
          </MenuSurface>
        )}</UIPresence>
      </div>

      {/* File Menu */}
      <div className="relative">
        <button
          onClick={() => handleMenuClick('file')}
          className={`px-2 py-0.5 rounded transition-colors ${
            openMenu === 'file' ? 'bg-white/15' : 'hover:bg-white/10'
          }`}
        >
          File
        </button>
        <UIPresence>{openMenu === 'file' && (
          <MenuSurface className="absolute left-0 mt-1 w-56 bg-[#23232c] dc-bg-elevated border border-white/15 rounded-md shadow-2xl py-1 text-neutral-200 z-50">
            <button
              onClick={() => {
                onNewScript();
                setOpenMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-black flex justify-between"
            >
              <span>New Screenplay</span>
              <span className="text-[10px] dc-meta text-neutral-400">⌘N</span>
            </button>
            {onOpenProject && <button onClick={()=>{onOpenProject();setOpenMenu(null)}} className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-black">Open Project / Screenplay…</button>}
            <button
              onClick={() => {
                fdxInputRef.current?.click();
                setOpenMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-black flex justify-between"
            >
              <span>Open Final Draft (.fdx)...</span>
              <span className="text-[10px] dc-meta text-neutral-400">⌘O</span>
            </button>
            <button
              onClick={() => {
                fountainInputRef.current?.click();
                setOpenMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-black"
            >
              Import Fountain (.fountain)...
            </button>
            <div className="border-t border-white/10 my-1" />
            <button
              onClick={() => {
                onSave();
                setOpenMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-black flex justify-between"
            >
              <span>{onSaveProjectAs?'Save Project…':'Save Offline'}</span>
              <span className="text-[10px] dc-meta text-neutral-400">⌘S</span>
            </button>
            {onSaveProjectAs && <button onClick={()=>{onSaveProjectAs();setOpenMenu(null)}} className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-black">Save Project As…</button>}
            <button
              onClick={() => {
                onExportFdx();
                setOpenMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-black flex items-center justify-between"
            >
              <span>Export Final Draft (.fdx)</span>
              <Download className="w-3 h-3 text-neutral-400" />
            </button>
            <button
              onClick={() => {
                onExportFountain();
                setOpenMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-black flex items-center justify-between"
            >
              <span>Export Fountain (.fountain)</span>
              <Download className="w-3 h-3 text-neutral-400" />
            </button>
            <div className="border-t border-white/10 my-1" />
            <button className="w-full text-left px-3 py-1.5 hover:bg-white/10" onClick={()=>{onImportPdf?.();setOpenMenu(null);}}>Import PDF…</button>
            <div className="px-3 py-0.5 text-[10px] dc-meta font-bold text-neutral-500 uppercase">
              Production File Operations (Part 11)
            </div>
            <button
              onClick={() => {
                onOpenScriptCompare?.();
                setOpenMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-black flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <GitCompare className="w-3.5 h-3.5 text-amber-400" />
                <span>Compare Screenplays (Diff)...</span>
              </div>
              <span className="text-[10px] dc-meta text-neutral-400">⌘⌥C</span>
            </button>
            <button
              onClick={() => {
                onOpenFileManager?.();
                setOpenMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-black flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <FolderArchive className="w-3.5 h-3.5 text-emerald-400" />
                <span>File Manager & Autosave...</span>
              </div>
              <span className="text-[10px] dc-meta text-neutral-400">⌘⌥F</span>
            </button>
            <div className="border-t border-white/10 my-1" />
            <div className="px-3 py-0.5 text-[10px] dc-meta font-bold text-neutral-500 uppercase">
              PDF, Print & File Formats (Part 12)
            </div>
            <button
              onClick={() => {
                onOpenPdfStudio?.();
                setOpenMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-black flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-red-400" />
                <span>Export Screenplay PDF (Studio)...</span>
              </div>
              <span className="text-[10px] dc-meta text-neutral-400">⌘E</span>
            </button>
            <button
              onClick={() => {
                onPrintPdf();
                setOpenMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-black flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Printer className="w-3.5 h-3.5 text-blue-400" />
                <span>Print & Print Preview...</span>
              </div>
              <span className="text-[10px] dc-meta text-neutral-400">⌘P</span>
            </button>
            <button
              onClick={() => {
                onOpenFormatExports?.();
                setOpenMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-black flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <FileCode className="w-3.5 h-3.5 text-amber-400" />
                <span>Production Formats (.sex, .rtf, Avid)...</span>
              </div>
            </button>
            <button
              onClick={() => {
                onOpenTemplates?.();
                setOpenMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-black flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>New from Template…</span>
              </div>
            </button><button className="w-full text-left px-3 py-1 hover:bg-white/10" onClick={()=>{onSaveTemplate?.();setOpenMenu(null)}}>Save as Template…</button>
          </MenuSurface>
        )}</UIPresence>
      </div>

      {/* Edit Menu */}
      <div className="relative">
        <button
          onClick={() => handleMenuClick('edit')}
          className={`px-2 py-0.5 rounded transition-colors ${
            openMenu === 'edit' ? 'bg-white/15' : 'hover:bg-white/10'
          }`}
        >
          Edit
        </button>
        <UIPresence>{openMenu === 'edit' && (
          <MenuSurface className="absolute left-0 mt-1 w-60 bg-[#23232c] dc-bg-elevated border border-white/15 rounded-md shadow-2xl py-1 text-neutral-200 z-50">
            <button
              onClick={() => {
                onOpenFindReplace();
                setOpenMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-black flex justify-between"
            >
              <span>Find & Replace...</span>
              <span className="text-[10px] dc-meta text-neutral-400">⌘F</span>
            </button>
            <div className="border-t border-white/10 my-1" />
            <button onClick={() => { onOpenWritingAssistance(); setOpenMenu(null); }} className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-black">Writing Assistance…</button>
            <button
              onClick={() => {
                onOpenSmartTypeManager();
                setOpenMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-black flex items-center justify-between"
            >
              <span>SmartType Dictionary...</span>
              <Sparkles className="w-3 h-3 text-amber-400" />
            </button>
            <button
              onClick={() => {
                onOpenFormatDoctor();
                setOpenMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-black flex items-center justify-between"
            >
              <span>Formatting Assistant...</span>
              <Stethoscope className="w-3 h-3 text-emerald-400" />
            </button>
            <button
              onClick={() => {
                onOpenNamesDatabase();
                setOpenMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-black flex items-center justify-between"
            >
              <span>Character Names Generator...</span>
              <Users className="w-3 h-3 text-blue-400" />
            </button>
          </MenuSurface>
        )}</UIPresence>
      </div>

      {/* Format Menu (Core + Custom Elements) */}
      <div className="relative">
        <button onClick={() => handleMenuClick('settings')} className="px-3 py-1.5 text-xs rounded hover:bg-white/10">Settings</button>
        <UIPresence>{openMenu === 'settings' && <MenuSurface className="absolute top-full left-0 mt-1 w-80 dc-bg-panel border border-white/15 rounded-lg shadow-xl py-1 z-50 text-xs"><button className="w-full text-left px-3 py-1.5" onClick={()=>{onCommand?.('customize-toolbar');setOpenMenu(null)}}>Customize Toolbar…</button><button className="w-full text-left px-3 py-1.5" onClick={()=>{onCommand?.('collaboration');setOpenMenu(null)}}>Live Collaboration…</button><button className="w-full text-left px-3 py-1.5" onClick={()=>{onCommand?.('dictation');setOpenMenu(null)}}>Dictation…</button><button onClick={()=>{onOpenFilesSettings();setOpenMenu(null)}} className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-black">Files &amp; Autosave…</button><button onClick={() => { onOpenEditorSettings(); setOpenMenu(null); }} className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-black">Editor → Story Structure…</button><button onClick={()=>{onOpenTableReadSettings();setOpenMenu(null)}} className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-black">Table Read…</button><button onClick={()=>{onOpenAutomaticFormatting();setOpenMenu(null)}} className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-black">Editor → Automatic Formatting…</button><button onClick={()=>{onOpenCaretSettings();setOpenMenu(null)}} className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-black">Editor → Caret Animation…</button><button onClick={() => { onOpenKeyboardShortcuts(); setOpenMenu(null); }} className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-black">Keyboard Shortcuts…</button><button onClick={() => { onOpenWritingAssistance(); setOpenMenu(null); }} className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-black">Writing Assistance…</button><button onClick={()=>{onAutoFormatting?.();setOpenMenu(null)}} className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-black">Writing → Intelligent Auto-Formatting…</button><button onClick={()=>{onOpenPunctuationSettings();setOpenMenu(null)}} className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-black">Writing → Intelligent Automatic Punctuation…</button></MenuSurface>}</UIPresence>
      </div>
      <div className="relative">
        <button
          onClick={() => handleMenuClick('format')}
          className={`px-2 py-0.5 rounded transition-colors ${
            openMenu === 'format' ? 'bg-white/15' : 'hover:bg-white/10'
          }`}
        >
          Format
        </button>
        <UIPresence>{openMenu === 'format' && (
          <MenuSurface className="absolute left-0 mt-1 w-56 bg-[#23232c] dc-bg-elevated border border-white/15 rounded-md shadow-2xl py-1 text-neutral-200 z-50 max-h-96 overflow-y-auto">
            <button className="w-full text-left px-3 py-1 hover:bg-white/10" onClick={()=>{onOpenTemplates?.();setOpenMenu(null)}}>Apply Template…</button>
            <button className="w-full text-left px-3 py-1 hover:bg-white/10" onClick={()=>{onOpenTemplates?.();setOpenMenu(null)}}>Change Screenplay Format…</button>
            <button className="w-full text-left px-3 py-1 hover:bg-white/10" onClick={()=>{onOpenElements?.();setOpenMenu(null)}}>Elements…</button>
            <button className="w-full text-left px-3 py-1 hover:bg-white/10" onClick={()=>{onAutoFormatting?.();setOpenMenu(null)}}>Intelligent Auto-Formatting…</button>
            <div className="border-t border-white/10 my-1"/>
            <button
              onClick={() => {
                onInsertElement('Scene Heading');
                setOpenMenu(null);
              }}
              className="w-full text-left px-3 py-1 hover:bg-amber-500 hover:text-black flex justify-between"
            >
              <span>Scene Heading</span>
              <span className="text-[10px] dc-meta text-neutral-400">⌘1</span>
            </button>
            <button
              onClick={() => {
                onInsertElement('Action');
                setOpenMenu(null);
              }}
              className="w-full text-left px-3 py-1 hover:bg-amber-500 hover:text-black flex justify-between"
            >
              <span>Action</span>
              <span className="text-[10px] dc-meta text-neutral-400">⌘2</span>
            </button>
            <button
              onClick={() => {
                onInsertElement('Character');
                setOpenMenu(null);
              }}
              className="w-full text-left px-3 py-1 hover:bg-amber-500 hover:text-black flex justify-between"
            >
              <span>Character</span>
              <span className="text-[10px] dc-meta text-neutral-400">⌘3</span>
            </button>
            <button
              onClick={() => {
                onInsertElement('Parenthetical');
                setOpenMenu(null);
              }}
              className="w-full text-left px-3 py-1 hover:bg-amber-500 hover:text-black flex justify-between"
            >
              <span>Parenthetical</span>
              <span className="text-[10px] dc-meta text-neutral-400">⌘4</span>
            </button>
            <button
              onClick={() => {
                onInsertElement('Dialogue');
                setOpenMenu(null);
              }}
              className="w-full text-left px-3 py-1 hover:bg-amber-500 hover:text-black flex justify-between"
            >
              <span>Dialogue</span>
              <span className="text-[10px] dc-meta text-neutral-400">⌘5</span>
            </button>
            <button
              onClick={() => {
                onInsertElement('Transition');
                setOpenMenu(null);
              }}
              className="w-full text-left px-3 py-1 hover:bg-amber-500 hover:text-black flex justify-between"
            >
              <span>Transition</span>
              <span className="text-[10px] dc-meta text-neutral-400">⌘6</span>
            </button>
            <button
              onClick={() => {
                onInsertElement('Shot');
                setOpenMenu(null);
              }}
              className="w-full text-left px-3 py-1 hover:bg-amber-500 hover:text-black flex justify-between"
            >
              <span>Shot</span>
              <span className="text-[10px] dc-meta text-neutral-400">⌘7</span>
            </button>
            <div className="border-t border-white/10 my-1" />
            <div className="px-3 py-0.5 text-[10px] dc-meta font-bold text-neutral-500 uppercase">
              Act & Structure Elements
            </div>
            <button
              onClick={() => {
                onInsertElement('New Act');
                setOpenMenu(null);
              }}
              className="w-full text-left px-3 py-1 hover:bg-amber-500 hover:text-black flex justify-between"
            >
              <span>New Act</span>
              <span className="text-[10px] dc-meta text-neutral-400">⌘8</span>
            </button>
            <button
              onClick={() => {
                onInsertElement('End of Act');
                setOpenMenu(null);
              }}
              className="w-full text-left px-3 py-1 hover:bg-amber-500 hover:text-black flex justify-between"
            >
              <span>End of Act</span>
              <span className="text-[10px] dc-meta text-neutral-400">⌘9</span>
            </button>
            <button
              onClick={() => {
                onInsertElement('Scene Summary');
                setOpenMenu(null);
              }}
              className="w-full text-left px-3 py-1 hover:bg-amber-500 hover:text-black"
            >
              Scene Summary
            </button>
            <button
              onClick={() => {
                onInsertElement('Cast List');
                setOpenMenu(null);
              }}
              className="w-full text-left px-3 py-1 hover:bg-amber-500 hover:text-black"
            >
              Cast List
            </button>
            <div className="border-t border-white/10 my-1" />
            <button
              onClick={() => {
                onToggleDualDialogue();
                setOpenMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-black flex justify-between"
            >
              <span>Dual Dialogue</span>
              <span className="text-[10px] dc-meta text-neutral-400">⌘D</span>
            </button>
          </MenuSurface>
        )}</UIPresence>
      </div>

      {/* View Menu (Section 6: Annotation Visibility & Bookmarks) */}
      <div className="relative">
        <button
          onClick={() => handleMenuClick('view')}
          className={`px-2 py-0.5 rounded transition-colors ${
            openMenu === 'view' ? 'bg-white/15' : 'hover:bg-white/10'
          }`}
        >
          View
        </button>
        <UIPresence>{openMenu === 'view' && (
          <MenuSurface className="absolute left-0 mt-1 w-64 bg-[#23232c] dc-bg-elevated border border-white/15 rounded-md shadow-2xl py-1 text-neutral-200 z-50">
            {([['script-pages','Screenplay Pages'],['script-scenes','Scene List'],['script-cards','Index Cards']] as const).map(([command,label])=><button className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-black" key={command} onClick={()=>{onCommand?.(command);setOpenMenu(null)}}>{label}</button>)}
            <div className="px-3 py-0.5 text-[10px] dc-meta font-bold text-neutral-500 uppercase">
              Annotations & Visibility
            </div>
            <button
              onClick={() => {
                onToggleShowScriptNotes?.();
                setOpenMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-black flex items-center justify-between"
            >
              <span>Show ScriptNotes</span>
              {showScriptNotes && <Check className="w-3.5 h-3.5 text-amber-400" />}
            </button>
            <button
              onClick={() => {
                onToggleShowBookmarks?.();
                setOpenMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-black flex items-center justify-between"
            >
              <span>Show Bookmarks Ribbon</span>
              {showBookmarks && <Check className="w-3.5 h-3.5 text-blue-400" />}
            </button>
            <button
              onClick={() => {
                onToggleShowSceneComments?.();
                setOpenMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-black flex items-center justify-between"
            >
              <span>Show Scene Production Comments</span>
              {showSceneComments && <Check className="w-3.5 h-3.5 text-emerald-400" />}
            </button>
            <div className="border-t border-white/10 my-1" />
            <div className="px-3 py-0.5 text-[10px] dc-meta font-bold text-neutral-500 uppercase">
              Productivity & Streaks
            </div>
            <button
              onClick={() => {
                onToggleShowStreaks?.();
                setOpenMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-black flex items-center justify-between"
            >
              <span>Show Writing Streaks</span>
              {showStreaks && <Check className="w-3.5 h-3.5 text-orange-400" />}
            </button>
            <div className="border-t border-white/10 my-1" />
            <div className="px-3 py-0.5 text-[10px] dc-meta font-bold text-neutral-500 uppercase">
              Bookmark Navigation
            </div>
            <button
              onClick={() => {
                onNextBookmark?.();
                setOpenMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-black flex justify-between"
            >
              <span>Next Bookmark</span>
              <span className="text-[10px] dc-meta text-neutral-400">⌘⇧]</span>
            </button>
            <button
              onClick={() => {
                onPrevBookmark?.();
                setOpenMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-black flex justify-between"
            >
              <span>Previous Bookmark</span>
              <span className="text-[10px] dc-meta text-neutral-400">⌘⇧[</span>
            </button>
          </MenuSurface>
        )}</UIPresence>
      </div>

      {/* Goals & Sprints Menu (Part 8: Writing Goals & Productivity Statistics) */}
      <div className="relative">
        <button
          onClick={() => handleMenuClick('goals')}
          className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${
            openMenu === 'goals' ? 'bg-white/15' : 'hover:bg-white/10'
          }`}
        >
          <Target className="w-3 h-3 text-amber-400" />
          <span>Goals</span>
        </button>
        <UIPresence>{openMenu === 'goals' && (
          <MenuSurface className="absolute left-0 mt-1 w-72 bg-[#23232c] dc-bg-elevated border border-white/15 rounded-md shadow-2xl py-1 text-neutral-200 z-50">
            <button
              onClick={() => {
                onOpenProductivityModal?.();
                setOpenMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-black flex items-center justify-between font-medium"
            >
              <div className="flex items-center gap-2">
                <Target className="w-3.5 h-3.5 text-amber-400" />
                <span>Writing Goals & Statistics...</span>
              </div>
              <span className="text-[10px] dc-meta text-neutral-400">⌘⌥G</span>
            </button>
            <button
              onClick={() => {
                onOpenWelcomeModal?.();
                setOpenMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-black flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Welcome Screen & Dashboard...</span>
              </div>
            </button>
            <div className="border-t border-white/10 my-1" />
            <div className="px-3 py-0.5 text-[10px] dc-meta font-bold text-neutral-500 uppercase">
              Sprint Timers
            </div>
            <button
              onClick={() => {
                onStartSprint?.(25);
                setOpenMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-black flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Start 25-Min Sprint (Pomodoro)</span>
              </div>
              <span className="text-[10px] dc-meta font-mono text-amber-300">25m</span>
            </button>
            <button
              onClick={() => {
                onStartSprint?.(15);
                setOpenMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-black flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-neutral-400" />
                <span>Start 15-Min Quick Sprint</span>
              </div>
              <span className="text-[10px] dc-meta font-mono text-neutral-400">15m</span>
            </button>
            <button
              onClick={() => {
                onStartSprint?.(45);
                setOpenMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-black flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-neutral-400" />
                <span>Start 45-Min Deep Focus</span>
              </div>
              <span className="text-[10px] dc-meta font-mono text-neutral-400">45m</span>
            </button>
            <div className="border-t border-white/10 my-1" />
            <button
              onClick={() => {
                onToggleShowStreaks?.();
                setOpenMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-black flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <span>Show Writing Streaks</span>
              </div>
              {showStreaks && <Check className="w-3.5 h-3.5 text-orange-400" />}
            </button>
          </MenuSurface>
        )}</UIPresence>
      </div>

      {/* Production Menu */}
      <div className="relative">
        <button
          onClick={() => handleMenuClick('production')}
          className={`px-2 py-0.5 rounded transition-colors ${
            openMenu === 'production' ? 'bg-white/15' : 'hover:bg-white/10'
          }`}
        >
          Production
        </button>
        <UIPresence>{openMenu === 'production' && (
          <MenuSurface className="absolute left-0 mt-1 w-64 bg-[#23232c] dc-bg-elevated border border-white/15 rounded-md shadow-2xl py-1 text-neutral-200 z-50">
            <button
              onClick={() => {
                onOpenRevisionsModal();
                setOpenMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-black flex justify-between"
            >
              <span>Revisions & Colored Drafts...</span>
              <span className="text-[10px] dc-meta text-amber-300">10 Colors</span>
            </button>
            {([['pages','Page Locking & Scene Numbers…'],['changes','Track Changes…'],['tags','Production Tags…'],['cast','Scene Cast Lists…'],['navigator','Saved Navigator Views…'],['images','Script & Title Images…'],['macros','Writing Macros…']] as const).map(([section,label])=><button key={section} className="w-full text-left px-3 py-1.5 hover:bg-white/10" onClick={()=>{onOpenProduction?.(section);setOpenMenu(null);}}>{label}</button>)}
            <div className="border-t border-white/10 my-1" />
            <div className="px-3 py-0.5 text-[10px] dc-meta font-bold text-neutral-500 uppercase">
              Scene Number Placement
            </div>
            {(['both', 'left', 'right', 'none'] as SceneNumberPlacement[]).map((p) => (
              <button
                key={p}
                onClick={() => {
                  onChangeSceneNumberPlacement(p);
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1 hover:bg-amber-500 hover:text-black flex items-center justify-between capitalize"
              >
                <span>{p === 'both' ? 'Both Left & Right' : p}</span>
                {sceneNumberPlacement === p && <Check className="w-3 h-3 text-amber-400" />}
              </button>
            ))}
            <div className="border-t border-white/10 my-1" />
            <button
              onClick={() => {
                onOpenReportsModal();
                setOpenMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-black flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
                <span>Production Reports (Part 10)...</span>
              </div>
              <span className="text-[10px] dc-meta text-neutral-400">⌘⌥R</span>
            </button>
            <button
              onClick={() => {
                onOpenTitlePageModal();
                setOpenMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-black"
            >
              Title Page Settings...
            </button>
          </MenuSurface>
        )}</UIPresence>
      </div>

      {/* AI & Research */}
      <div className="relative">
        <button
          onClick={() => handleMenuClick('ai')}
          className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${
            openMenu === 'ai' ? 'bg-white/15' : 'hover:bg-white/10'
          }`}
        >
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>Story & Audio</span>
        </button>
        <UIPresence>{openMenu === 'ai' && (
          <MenuSurface className="absolute left-0 mt-1 w-72 bg-[#23232c] dc-bg-elevated border border-white/15 rounded-md shadow-2xl py-1 text-neutral-200 z-50">
            <button
              onClick={() => {
                onOpenTableRead();
                setOpenMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-black flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Headphones className="w-3.5 h-3.5 text-blue-400" />
                <span>Table Read…</span>
              </div>
              <span className="text-[10px] dc-meta opacity-75">Voice Cast</span>
            </button>
            <button
              onClick={() => {
                onOpenResearch();
                setOpenMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-black flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-emerald-400" />
                <span>Script Grounding (Google Search)</span>
              </div>
              <span className="text-[10px] dc-meta opacity-75">gemini-3.5-flash</span>
            </button>
            <button
              onClick={() => {
                onOpenImageAnalysis();
                setOpenMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-black flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <ImageIcon className="w-3.5 h-3.5 text-pink-400" />
                <span>Storyboard & Photo Breakdown</span>
              </div>
              <span className="text-[10px] dc-meta opacity-75">gemini-3.1-pro-preview</span>
            </button>
          </MenuSurface>
        )}</UIPresence>
      </div>

      {/* Help (1.17): searchable Getting Started and the Idea to Draft tutorials */}
      <div className="relative">
        <button onClick={() => handleMenuClick('help')} className={`px-2 py-0.5 rounded transition-colors ${openMenu === 'help' ? 'bg-white/15' : 'hover:bg-white/10'}`}>Help</button>
        <UIPresence>{openMenu === 'help' && (
          <MenuSurface role="menu" aria-label="Help" className="absolute left-0 mt-1 w-64 bg-[#23232c] dc-bg-elevated border border-white/15 rounded-md shadow-2xl py-1 text-neutral-200 z-50">
            {([['getting-started','Getting Started'],['idea-to-draft-feature','Idea to Draft: Feature Screenplay'],['idea-to-draft-series','Idea to Draft: Television Pilot'],['idea-to-draft-stage','Idea to Draft: Stage Play'],['keyboard-shortcuts','Keyboard Shortcuts…']] as const).map(([command, label]) =>
              <button key={command} role="menuitem" onClick={() => { onCommand?.(command); setOpenMenu(null); }} className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-black flex items-center gap-2">
                {command === 'getting-started' && <HelpCircle className="w-3.5 h-3.5 text-amber-400" />}<span>{label}</span></button>)}
          </MenuSurface>
        )}</UIPresence>
      </div>
      {/* Rust macOS Native Menu */}
      <div className="relative">
        <button
          onClick={() => handleMenuClick('rust')}
          className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 text-amber-300 ${
            openMenu === 'rust' ? 'bg-white/15' : 'hover:bg-white/10'
          }`}
        >
          <span>{window.draftcraftDesktop ? 'Desktop' : 'Rust macOS'}</span>
        </button>
        <UIPresence>{openMenu === 'rust' && (
          <MenuSurface className="absolute left-0 mt-1 w-72 bg-[#23232c] dc-bg-elevated border border-white/15 rounded-md shadow-2xl py-1 text-neutral-200 z-50">
            <button
              onClick={() => {
                onOpenRustModal();
                setOpenMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-black flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <FileCode className="w-3.5 h-3.5 text-amber-400" />
                <span>{window.draftcraftDesktop ? 'Desktop Runtime' : '24-Crate Workspace Explorer'}</span>
              </div>
              <span className="text-[10px] dc-meta opacity-75">aarch64</span>
            </button>
          </MenuSurface>
        )}</UIPresence>
      </div>
    </div>
  );
};
