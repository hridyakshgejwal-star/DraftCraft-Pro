import {emptyStudio} from '../production/model';
import { SAMPLE_SCRIPT } from '../data/sampleScript';
import type { ScriptDocument } from '../types/script';
export interface FilesPreferences { automaticSaving:boolean;delayMs:number;maxIntervalMs:number;showStatus:boolean;restoreRecovery:boolean;retentionDays:number }
export const DEFAULT_FILES:FilesPreferences={automaticSaving:true,delayMs:1500,maxIntervalMs:15000,showStatus:true,restoreRecovery:true,retentionDays:14};
export interface ProjectStamp {sessionId:string;revision:number}
export interface FileState extends ProjectStamp {projectId:string;savedRevision:number;status:'saved'|'saving'|'unsaved'|'failed';dirty:boolean;name:string;location:string;error:string;recoveryFailed:boolean;preferences:FilesPreferences}
export interface RecoveryItem {id:string;projectId:string;title:string;capturedAt:string;paragraphs:number;location:string;conflict:boolean;expired:boolean}
export interface ProjectResult {document?:ScriptDocument;state?:FileState;recoveries?:RecoveryItem[];saved?:boolean;canceled?:boolean;stale?:boolean;changed?:boolean;opened?:boolean;restored?:boolean;reverted?:boolean;discardedId?:string;error?:string;name?:string;importFile?:{name:string;text:string;base64?:string}}
export const STORAGE_KEY='draftcraft_screenplay_doc_v1';
export function blankDocument():ScriptDocument {
  return {...SAMPLE_SCRIPT,id:'doc-'+crypto.randomUUID(),lastSavedAt:new Date().toISOString(),titlePage:{title:'UNTITLED SCREENPLAY',author:'Written by',basedOn:'',draftDate:'FIRST DRAFT',contact:'',copyright:'All Rights Reserved'},currentRevision:'White',productionMode:false,lockedPages:false,sceneNumberPlacement:'both',showStructureLines:false,studio:emptyStudio(),storyStructure:undefined,beats:[],flowLines:[],outlineMarkers:[],characterMemory:[],characterShortcuts:{},characterHighlightMap:{},characterVoiceMap:{},writingAssistance:undefined,paragraphs:[{id:'p-'+crypto.randomUUID(),type:'Scene Heading',text:''},{id:'p-'+crypto.randomUUID(),type:'Action',text:''}]};
}
export function forgetLocalProject(id:string,replacement?:ScriptDocument|null) {
  for(const key of [STORAGE_KEY,'fd13_crash_recovery_state_v1','fd13_crash_recovery_state_v1_temp','fd13_autosave_script_v2'])try {const raw=localStorage.getItem(key);if(raw && JSON.parse(raw).id===id)localStorage.removeItem(key);}catch{}
  if(replacement)localStorage.setItem(STORAGE_KEY,JSON.stringify(replacement));
}
export function onlySaveTimeChanged(a:ScriptDocument,b:ScriptDocument) {const keys=new Set([...Object.keys(a),...Object.keys(b)]);return [...keys].every(key=>key==='lastSavedAt'||a[key as keyof ScriptDocument]===b[key as keyof ScriptDocument]);}
