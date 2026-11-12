import type {TableReadApi} from '../tableRead/bridge';
import type {ScriptDocument} from './script';
import type {FileState,FilesPreferences,ProjectResult,ProjectStamp,RecoveryItem} from '../files/model';
export interface RecentProject { id: string; title: string; name: string; folder: string; openedAt: string; modifiedAt: string | null; exists: boolean; kind: string }
export type DesktopCommand = 'select-all'|'script-pages'|'script-scenes'|'script-cards'|'collaboration'|'customize-toolbar'|'new-window'|'dictation'|'production-images'|'production-macros'|'import-pdf'|'production-pages'|'production-revisions'|'production-changes'|'production-tags'|'production-cast'|'production-navigator'|'table-read'|'table-read-settings'|'voice-cast'|'export-table-read'|'automatic-punctuation'|'new-template'|'apply-template'|'save-template'|'elements'|'auto-formatting'|'smarttype'| 'new' | 'undo' | 'redo' | 'save' | 'save-as' | 'prepare-close' | 'editor-settings' | 'caret-animation' | 'automatic-formatting' | 'export-fdx' | 'export-fountain' | 'pdf' | 'print' | 'find' | 'keyboard-shortcuts' | 'writing-assistance' | 'title-page' | 'open-file' | 'open-project' | 'open-request' | 'files-autosave' | 'getting-started' | 'idea-to-draft-feature' | 'idea-to-draft-series' | 'idea-to-draft-stage' | 'start-window' | 'emoji';

declare global {
  interface Window {
    draftcraftDesktop?: {
      dictation?:(action:'status'|'start'|'stop',language?:string)=>Promise<{available:boolean;reason:string;listening:boolean}>;
      onDictation?:(callback:(event:{type:string;text?:string;state?:string;message?:string})=>void)=>()=>void;
      documentSlot?:string;newDocumentWindow?:()=>Promise<boolean>;
      productionPrint?:(request:{mode:'preview'|'save'|'print';html:string;width:number;height:number;name?:string})=>Promise<{data?:string;bytes?:number;saved?:boolean;location?:string;canceled?:boolean;printed?:boolean}>;
      tableRead?:TableReadApi;
      initializeProject?:(snapshot:string,wasStored:boolean)=>Promise<ProjectResult>;
      normalizeProject?:(snapshot:string,stamp:ProjectStamp,original:string)=>Promise<ProjectResult>;
      changeProject?:(snapshot:string,stamp:ProjectStamp,next:string)=>Promise<ProjectResult>;
      openProject:(snapshot?:string,stamp?:ProjectStamp,requestId?:string)=>Promise<ProjectResult|boolean>;
      saveProject:(snapshot:string,saveAs?:boolean,stamp?:ProjectStamp,suggestedName?:string)=>Promise<ProjectResult>;
      autosaveProject:(snapshot:string,stamp?:ProjectStamp)=>Promise<ProjectResult>;
      checkpointProject?:(snapshot:string,stamp:ProjectStamp,preserve?:boolean,label?:string)=>Promise<ProjectResult>;
      revertProject?:(snapshot:string,stamp:ProjectStamp)=>Promise<ProjectResult>;
      closeStarted?:()=>Promise<boolean>;
      finishClose:(snapshot:string,stamp?:ProjectStamp,continuation?:string)=>Promise<{closed?:boolean;action?:string;token?:string;state?:FileState;baseline?:ScriptDocument|null;error?:string}>;
      completeClose?:(token:string,snapshot:string,stamp:ProjectStamp)=>Promise<{closed:boolean;stale?:boolean}>;
      cancelClose?:()=>Promise<boolean>;
      filePreferences?:(preferences?:FilesPreferences)=>Promise<FilesPreferences>;
      revealProject?:()=>Promise<boolean>;
      recoveryList?:()=>Promise<RecoveryItem[]>;
      reviewRecovery?:(id:string)=>Promise<{document:ScriptDocument}>;
      discardRecovery?:(id:string)=>Promise<{discarded:boolean}>;
      restoreRecovery?:(id:string,snapshot:string,stamp:ProjectStamp)=>Promise<ProjectResult>;
      onFileState?:(callback:(state:FileState)=>void)=>()=>void;
      readClipboard: (options?:{images?:boolean}) => Promise<{text:string;html?:string;image?:{type:string;base64:string}}>;
      writeClipboard: (payload: { text: string; html?: string; image?:{type:string;base64:string} }) => Promise<boolean>;
      nativeHistory: (action: 'undo' | 'redo') => Promise<boolean>;
      setShortcutRecording?: (enabled: boolean) => Promise<boolean>;
      windowAction: (action: 'close' | 'minimize' | 'fullscreen') => void;
      /** Native cut, copy and paste of the focused field (the same path as the Edit menu). */
      editAction?: (action: 'cut' | 'copy' | 'paste') => void;
      onWindowState?: (callback: (state: { fullscreen: boolean }) => void) => () => void;
      /** Check marks of the native menu items (View, Format, Production…), by workspace command id. */
      menuState?: (state: Record<string, boolean>) => void;
      onCommand: (callback: (command: DesktopCommand, file?: { name?: string; text?: string; base64?:string; requestId?: string }) => void) => () => void;
      runtime: { electron: string; chromium: string; node: string; platform: string; arch: string };
      /** 1.18 Start Window: recent projects (addressed by id) and the show-at-launch preference. */
      startWindow?: {
        info: () => Promise<{ showAtLaunch: boolean; recent: RecentProject[]; version: string }>;
        setShowAtLaunch: (value: boolean) => Promise<{ showAtLaunch: boolean }>;
        openRecent: (id: string) => Promise<{ requestId?: string; missing?: boolean }>;
        removeRecent: (id: string) => Promise<RecentProject[]>;
        clearRecent: () => Promise<RecentProject[]>;
        revealRecent: (id: string) => Promise<boolean>;
      };
      /** Opens the macOS character viewer. */
      showEmojiPanel?: () => void;
    };
  }
}
