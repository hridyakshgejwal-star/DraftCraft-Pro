'use strict';
const { contextBridge, ipcRenderer, webFrame } = require('electron');
let commandCallback, fileStateCallback, lastFileState;
ipcRenderer.on('desktop:file-state', (_event,state)=>{lastFileState=state;fileStateCallback?.(state)});
const pendingCommands = [];
ipcRenderer.on('desktop:command', (_event, command, file) => {
  if (commandCallback) commandCallback(command, file);
  else pendingCommands.push([command, file]);
});
contextBridge.exposeInMainWorld('draftcraftDesktop', {
  // 1.17: the operating system's spellchecker for languages other than English (macOS: NSSpellChecker).
  spelling:{
    misspelled:words=>Array.isArray(words)?words.slice(0,2000).filter(w=>typeof w==='string'&&w.length<=100&&webFrame.isWordMisspelled(w)):[],
    suggestions:word=>typeof word==='string'&&word.length<=100?webFrame.getWordSuggestions(word).slice(0,8):[],
    setLanguage:language=>ipcRenderer.invoke('desktop:spelling-language',language),
  },
  dictation:(action,language)=>ipcRenderer.invoke('desktop:dictation',action,language),
  onDictation:callback=>{const listener=(_event,value)=>callback(value);ipcRenderer.on('desktop:dictation-event',listener);return()=>ipcRenderer.removeListener('desktop:dictation-event',listener);},
  documentSlot:ipcRenderer.sendSync('desktop:document-slot'),
  newDocumentWindow:()=>ipcRenderer.invoke('desktop:new-window'),
  productionPrint:request=>ipcRenderer.invoke('desktop:production-print',request),
  tableRead:{
    status:()=>ipcRenderer.invoke('desktop:table-read','status'),
    voices:(engine,options)=>ipcRenderer.invoke('desktop:table-read','voices',{engine,options}),
    configure:key=>ipcRenderer.invoke('desktop:table-read','configure',{key}),
    authorize:requests=>ipcRenderer.invoke('desktop:table-read','authorize',{requests}),
    synthesize:(request,id,token)=>ipcRenderer.invoke('desktop:table-read','synthesize',{request,id,token}),
    cancel:prefix=>ipcRenderer.invoke('desktop:table-read','cancel',{prefix}),
    clear:()=>ipcRenderer.invoke('desktop:table-read','clear'),
    limit:mb=>ipcRenderer.invoke('desktop:table-read','limit',{mb}),
    export:payload=>ipcRenderer.invoke('desktop:table-read','export',payload),
    onProgress:callback=>{const listener=(_event,value)=>callback(value);ipcRenderer.on('desktop:table-read-progress',listener);return()=>ipcRenderer.removeListener('desktop:table-read-progress',listener)}
  },
  initializeProject:(snapshot,wasStored)=>ipcRenderer.invoke('desktop:initialize-project',snapshot,wasStored),
  normalizeProject:(snapshot,stamp,original)=>ipcRenderer.invoke('desktop:normalize-project',snapshot,stamp,original),
  changeProject:(snapshot,stamp,next)=>ipcRenderer.invoke('desktop:change-project',snapshot,stamp,next),
  openProject:(snapshot,stamp,requestId)=>ipcRenderer.invoke('desktop:open-project',snapshot,stamp,requestId),
  // 1.18 Start Window: recent projects by id (paths stay in the main process) and the show-at-launch preference.
  startWindow:{
    info:()=>ipcRenderer.invoke('desktop:start-info'),
    setShowAtLaunch:value=>ipcRenderer.invoke('desktop:start-preference',!!value),
    openRecent:id=>ipcRenderer.invoke('desktop:recent-open',String(id)),
    removeRecent:id=>ipcRenderer.invoke('desktop:recent-remove',String(id)),
    clearRecent:()=>ipcRenderer.invoke('desktop:recent-clear'),
    revealRecent:id=>ipcRenderer.invoke('desktop:recent-reveal',String(id)),
  },
  showEmojiPanel:()=>ipcRenderer.send('desktop:emoji-panel'),
  saveProject:(snapshot,saveAs=false,stamp,suggestedName)=>ipcRenderer.invoke('desktop:save-project',snapshot,saveAs,stamp,suggestedName),
  autosaveProject:(snapshot,stamp)=>ipcRenderer.invoke('desktop:autosave-project',snapshot,stamp),
  checkpointProject:(snapshot,stamp,preserve=false,label)=>ipcRenderer.invoke('desktop:checkpoint-project',snapshot,stamp,preserve,label),
  revertProject:(snapshot,stamp)=>ipcRenderer.invoke('desktop:revert-project',snapshot,stamp),
  closeStarted:()=>ipcRenderer.invoke('desktop:close-started'),
  finishClose:(snapshot,stamp,continuation)=>ipcRenderer.invoke('desktop:finish-close',snapshot,stamp,continuation),
  completeClose:(token,snapshot,stamp)=>ipcRenderer.invoke('desktop:complete-close',token,snapshot,stamp),
  cancelClose:()=>ipcRenderer.invoke('desktop:cancel-close'),
  filePreferences:p=>ipcRenderer.invoke('desktop:file-preferences',p),
  revealProject:()=>ipcRenderer.invoke('desktop:reveal-project'),
  recoveryList:()=>ipcRenderer.invoke('desktop:recovery-list'),
  reviewRecovery:id=>ipcRenderer.invoke('desktop:recovery-review',id),
  discardRecovery:id=>ipcRenderer.invoke('desktop:recovery-discard',id),
  restoreRecovery:(id,snapshot,stamp)=>ipcRenderer.invoke('desktop:recovery-restore',id,snapshot,stamp),
  onFileState:callback=>{fileStateCallback=callback;if(lastFileState)callback(lastFileState);return()=>{if(fileStateCallback===callback)fileStateCallback=undefined}},
  nativeHistory: (action) => ipcRenderer.invoke('desktop:native-history', action),
  setShortcutRecording: (enabled) => ipcRenderer.invoke('desktop:shortcut-recording', enabled),
  readClipboard: (options) => ipcRenderer.invoke('desktop:clipboard-read', options?.images === true ? {images: true} : undefined),
  writeClipboard: (payload) => ipcRenderer.invoke('desktop:clipboard-write', payload),
  menuState: (state) => { if (state && typeof state === 'object') ipcRenderer.send('desktop:menu-state', state); },
  editAction: (action) => { if (['cut', 'copy', 'paste'].includes(action)) ipcRenderer.send('desktop:edit', action); },
  onWindowState: (callback) => { const listener = (_event, value) => callback(value); ipcRenderer.on('desktop:window-state', listener); return () => ipcRenderer.removeListener('desktop:window-state', listener); },
  windowAction: (action) => {
    if (['close', 'minimize', 'fullscreen'].includes(action)) ipcRenderer.send('desktop:window', action);
  },
  onCommand: (callback) => {
    commandCallback = callback;
    for (const args of pendingCommands.splice(0)) callback(...args);
    return () => { if (commandCallback === callback) commandCallback = undefined; };
  },
  runtime: Object.freeze({
    electron: process.versions.electron,
    chromium: process.versions.chrome,
    node: process.versions.node,
    platform: process.platform,
    arch: process.arch,
  }),
});
window.addEventListener('DOMContentLoaded', () => document.documentElement.classList.add('dc-desktop'));
