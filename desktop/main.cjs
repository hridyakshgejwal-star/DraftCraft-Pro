'use strict';
const { app, BrowserWindow, Menu, dialog, ipcMain, protocol, net, session, shell, safeStorage, screen, clipboard, ClipboardItem } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const http = require('node:http');
const crypto = require('node:crypto');

const APP_NAME = 'DraftCraft Pro';
const ORIGIN = 'draftcraft://app';
app.setName(APP_NAME);
app.setPath('userData', process.env.DRAFTCRAFT_TEST_PROFILE || path.join(app.getPath('appData'), APP_NAME));
protocol.registerSchemesAsPrivileged([{ scheme: 'draftcraft', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true, codeCache: true } }]);
let mainWindow, settingsWindow, apiServer, backendUrl;
let quitting = false;
let readyForEditor = false;
const pendingFiles = [];
const pendingCommands = [];
const apiToken = crypto.randomBytes(32).toString('hex');
const keyPath = path.join(app.getPath('userData'), 'gemini-key.enc');
const statePath = path.join(app.getPath('userData'), 'window-state.json');
const {ProjectFiles,validateDocument}=require('./project-files.cjs');
const projectFiles=new ProjectFiles(path.join(app.getPath('userData'),'project-locations.json'));
const {SaveCoordinator}=require('./save-coordinator.cjs');
const {DocumentWindows}=require('./window-registry.cjs');
// 1.18: recent projects (File › Open Recent and the Start Window) and the Start Window preference.
const {RecentProjects,StartPreference}=require('./recent-projects.cjs');
const recentProjects=new RecentProjects(path.join(app.getPath('userData'),'recent-projects.json'),{onChange:paths=>{
  // The Dock's recent list is per app identifier and shared with an installed copy, so a test copy leaves it alone.
  if(process.platform==='darwin'&&!process.env.DRAFTCRAFT_TEST_PROFILE){try{app.clearRecentDocuments();for(const file of [...paths].reverse())app.addRecentDocument(file);}catch{}}
  if(app.isReady())rebuildMenu();}});
const startPreference=new StartPreference(path.join(app.getPath('userData'),'start-window.json'));
const documentWindows=new DocumentWindows();
const pendingOpenRequests=new Map();
const windowsPath=path.join(app.getPath('userData'),'open-document-windows.json');
function persistWindows(){try{fs.writeFileSync(windowsPath,JSON.stringify(documentWindows.slots()),{mode:0o600});}catch{}}
function recordFor(event){return documentWindows.get(event);}
function coordinatorFor(event){return recordFor(event).coordinator;}
const {TableReadService}=require('./table-read.cjs');
const tableRead=new TableReadService(app.getPath('userData'),{secure:{available:()=>safeStorage.isEncryptionAvailable(),encrypt:value=>safeStorage.encryptString(value),decrypt:bytes=>safeStorage.decryptString(bytes)}});
const CONTENT_POLICY = "default-src 'self'; script-src 'self'; worker-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https: wss: http://127.0.0.1:* http://localhost:* ws://127.0.0.1:* ws://localhost:*; media-src 'self' data: blob:; frame-src 'self' data: blob:; object-src 'none'; base-uri 'self'; form-action 'none'";

function loadKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  try {
    if (safeStorage.isEncryptionAvailable() && fs.existsSync(keyPath)) return safeStorage.decryptString(fs.readFileSync(keyPath));
  } catch { /* Keep offline editing available if the keychain changed. */ }
  return '';
}
function isEditor(url) {
  try { const parsed = new URL(url); return parsed.protocol === 'draftcraft:' && parsed.hostname === 'app'; }
  catch { return false; }
}
function sendCommand(command, file) {
  const focused=BrowserWindow.getFocusedWindow();if(focused&&documentWindows.records.has(focused.webContents.id))mainWindow=focused;
  if (!mainWindow || mainWindow.isDestroyed()) createWindow();
  mainWindow.show(); mainWindow.focus();
  if (mainWindow.webContents.isLoading() || !isEditor(mainWindow.webContents.getURL())) documentWindows.records.get(mainWindow.webContents.id).commands.push([command,file]);
  else mainWindow.webContents.send('desktop:command', command, file);
}
async function openFile(filePath) {
  if(!/\.(fdx|fdxt|fountain|txt|rtf|pdf|draftcraft)$/i.test(filePath))return;
  if(!readyForEditor){pendingFiles.push(filePath);return;}
  const requestId=crypto.randomUUID();pendingOpenRequests.set(requestId,filePath);sendCommand('open-request',{requestId});
}
async function chooseFile(){sendCommand('open-project');}
async function chooseProjectLocation(doc,currentFile,parent=mainWindow,suggestedName){
  const safeName=(suggestedName||doc.titlePage.title||'Untitled Screenplay').replace(/[\\/:*?"<>|]/g,'').slice(0,160);
  const result=await dialog.showSaveDialog(parent,{title:'Save DraftCraft Project',defaultPath:suggestedName?path.join(currentFile?path.dirname(currentFile):app.getPath('documents'),safeName+'.draftcraft'):currentFile||path.join(app.getPath('documents'),safeName+'.draftcraft'),filters:[{name:'DraftCraft Project',extensions:['draftcraft']}],buttonLabel:'Save',properties:['createDirectory','showOverwriteConfirmation']});
  if(result.canceled||!result.filePath)return null;
  const file=/\.draftcraft$/i.test(result.filePath)?result.filePath:result.filePath+'.draftcraft';
  if(file!==result.filePath&&fs.existsSync(file)){const answer=await dialog.showMessageBox(parent,{type:'warning',message:'Replace '+path.basename(file)+'?',detail:'The selected filename will replace this existing project.',buttons:['Replace','Cancel'],defaultId:1,cancelId:1,noLink:true});if(answer.response!==0)return null;}
  return file;
}
async function confirmProjectSave(doc,hasFile,parent=mainWindow){
  const result=await dialog.showMessageBox(parent,{type:'question',title:'Save Your Screenplay?',message:'Save Your Screenplay?',detail:hasFile?'Save changes to “'+(doc.titlePage.title||'Untitled Screenplay')+'” before continuing?':'Choose where to save “'+(doc.titlePage.title||'Untitled Screenplay')+'”. Future changes will save to that file automatically.',buttons:['Save','Don’t Save','Cancel'],defaultId:0,cancelId:2,noLink:true});return ['save','discard','cancel'][result.response]||'cancel';
}
async function saveFailureDialog(message,parent=mainWindow){const answer=await dialog.showMessageBox(parent,{type:'error',title:'The screenplay could not be saved',message:'The screenplay could not be saved',detail:message,buttons:['Retry','Save As…','Cancel Closing'],defaultId:0,cancelId:2,noLink:true});return ['save','save-as','cancel'][answer.response]||'cancel';}
function openSettings() {
  if (settingsWindow && !settingsWindow.isDestroyed()) { settingsWindow.show(); settingsWindow.focus(); return; }
  settingsWindow = new BrowserWindow({ title: 'AI Settings', width: 540, height: 490, frame: false, resizable: false, backgroundColor: '#1b1b22', webPreferences: { preload: path.join(__dirname, 'settings-preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
  settingsWindow.setMenu(null);
  settingsWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  const url = pathToFileURL(path.join(__dirname, 'ai-settings.html')).toString();
  settingsWindow.webContents.on('will-navigate', (event, destination) => { if (destination !== url) event.preventDefault(); });
  settingsWindow.loadURL(url);
  settingsWindow.on('closed', () => { settingsWindow = undefined; });
}
function newDocumentTab() {
  const host = BrowserWindow.getFocusedWindow() || (mainWindow && !mainWindow.isDestroyed() ? mainWindow : null);
  const win = createWindow(crypto.randomUUID());
  if (process.platform === 'darwin' && host && !host.isDestroyed() && host !== win && typeof host.addTabbedWindow === 'function') host.addTabbedWindow(win);
  return win;
}
function recentMenu(){const items=recentProjects.list().slice(0,12).map(e=>({label:e.title+' — '+e.name,sublabel:e.folder,enabled:e.exists,click:()=>{const file=recentProjects.pathFor(e.id);if(file)void openFile(file);}}));
  return [...(items.length?items:[{label:'No Recent Projects',enabled:false}]),{type:'separator'},{label:'Clear Menu',enabled:items.length>0,click:()=>recentProjects.clear()}];}
function rebuildMenu(){buildMenu();const focused=BrowserWindow.getFocusedWindow()||mainWindow;if(focused&&!focused.isDestroyed())applyMenuState(menuStates.get(focused.webContents.id));}
function buildMenu() {
  const action = (label, command, accelerator) => ({ label, accelerator, click: () => sendCommand(command) });
  const historyAction = (label, command, accelerator) => ({ label, accelerator, click: (_item, focusedWindow) => {
    if (focusedWindow && !documentWindows.records.has(focusedWindow.webContents.id)) {
      if (command === 'undo') focusedWindow.webContents.undo();
      else focusedWindow.webContents.redo();
    } else sendCommand(command);
  } });
  // Workspace commands (toolbar ids). Checkbox/radio items carry the command as their id so the renderer's state
  // (desktop:menu-state) can set their check marks. `shown` only displays a shortcut the editor itself handles.
  const ws = (label, command, extra = {}) => ({ label, id: 'ws:' + command, click: () => sendCommand('ws:' + command), ...extra });
  const check = (label, command, extra = {}) => ws(label, command, { type: 'checkbox', checked: false, ...extra });
  const radio = (label, command, extra = {}) => ws(label, command, { type: 'radio', checked: false, ...extra });
  const shown = (accelerator) => ({ accelerator, registerAccelerator: false });
  const elementItem = (type, key) => ws(type === 'General' ? 'General Text' : type, 'el-' + type.toLowerCase().replace(/ /g, '-'), key ? shown('CmdOrCtrl+' + key) : {});
  const template = [
    { label: APP_NAME, submenu: [{ role: 'about' }, { type: 'separator' }, { label: 'Settings', submenu: [{label:'Editor',submenu:[action('Story Structure & Typing…','editor-settings'),action('Caret Animation…','caret-animation'),action('Automatic Formatting…','automatic-formatting')]},{label:'Writing',submenu:[action('Intelligent Automatic Punctuation…','automatic-punctuation'),action('Intelligent Auto-Formatting…','auto-formatting'),action('Writing Assistance…','writing-assistance')]} ,action('Keyboard Shortcuts…', 'keyboard-shortcuts'), action('Writing Assistance…', 'writing-assistance'),action('Intelligent Auto-Formatting…','auto-formatting'),action('Files & Autosave…','files-autosave'),action('Table Read…','table-read-settings'),ws('Customize Toolbar…','customize')] }, { label: 'AI Settings…', accelerator: 'CmdOrCtrl+,', click: openSettings }, { type: 'separator' }, { role: 'services' }, { type: 'separator' }, { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' }, { type: 'separator' }, { role: 'quit' }] },
    { label: 'File', submenu: [action('New Screenplay', 'new', 'CmdOrCtrl+N'),{label:'New Document Window',accelerator:'CmdOrCtrl+Alt+N',click:()=>createWindow(crypto.randomUUID())},action('New from Template…','new-template','CmdOrCtrl+Shift+N'), { type: 'separator' }, { label: 'Open…', accelerator: 'CmdOrCtrl+O', click: chooseFile }, { label: 'Open Recent', submenu: recentMenu() }, action('Start Window…', 'start-window'), action('Import PDF…','import-pdf'), { type: 'separator' }, action('Save Project…', 'save', 'CmdOrCtrl+S'),action('Save Project As…','save-as','CmdOrCtrl+Shift+S'),action('Save as Template…','save-template'),ws('Revert to Saved','revert'), { type: 'separator' }, action('Export PDF…', 'pdf', 'CmdOrCtrl+E'), action('Export Final Draft (.fdx)…', 'export-fdx'), action('Export Fountain…', 'export-fountain'), ws('Export Text, RTF or HTML…','format-exports'), { type: 'separator' }, ws('Compare Screenplays…','script-compare'), ws('File Manager & Backups…','file-manager'), action('Files & Autosave…','files-autosave'), { type: 'separator' }, action('Print…', 'print', 'CmdOrCtrl+P'), { type: 'separator' }, { role: 'close' }] },
    { label: 'Edit', submenu: [historyAction('Undo', 'undo', 'CmdOrCtrl+Z'), historyAction('Redo', 'redo', 'CmdOrCtrl+Shift+Z'), { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'pasteAndMatchStyle' }, { role: 'delete' }, { label: 'Select All', accelerator: 'CmdOrCtrl+A', click: (_item, focusedWindow) => { if (focusedWindow && !focusedWindow.isDestroyed() && documentWindows.records.has(focusedWindow.webContents.id)) focusedWindow.webContents.send('desktop:command', 'select-all'); else focusedWindow?.webContents.selectAll(); } }, { type: 'separator' }, action('Find and Replace…', 'find', 'CmdOrCtrl+F'), ws('Previous Bookmark','bookmark-prev'), ws('Next Bookmark','bookmark-next'), { type: 'separator' }, action('Writing Assistance…', 'writing-assistance'), action('SmartType…','smarttype'), action('Dictation…','dictation')] },
    { label: 'View', submenu: [radio('Page View','view-page'), radio('Normal View','view-normal'), radio('Speed View','view-speed'), { type: 'separator' }, check('Script','script'), check('Scene View','scene-view'), check('Index Cards','index-cards'), check('Beat Board','beat-board'), check('Outline Map','outline-editor'), check('Reports','reports'), { type: 'separator' }, check('Timeline (Outline Editor)','timeline', { accelerator: 'CmdOrCtrl+Alt+T' }), check('Navigator','navigator'), ws('Announce Element Number (⌃⇧.)','announce-element'), { label: 'Split', submenu: [radio('Side by Side','split-vertical'), radio('Top and Bottom','split-horizontal'), radio('Unsplit','unsplit'), { type: 'separator' }, radio('Second Panel: Index Cards','split-pane-cards'), radio('Second Panel: Scene View','split-pane-scenes'), radio('Second Panel: Beat Board','split-pane-beatboard'), radio('Second Panel: Outline Map','split-pane-outline')] }, { type: 'separator' }, check('Focus Mode','focus', { accelerator: 'CmdOrCtrl+Alt+F' }), check('Typewriter Mode','typewriter'), { type: 'separator' }, { label: 'Show', submenu: [check('ScriptNotes','toggle-notes'), check('Bookmarks','toggle-bookmarks'), check('Scene Comments','toggle-comments'), check('Outline Elements','toggle-outline'), check('Structure Lines','structure-lines'), ws('Structure Line Settings…','structure-settings'), check('Invisibles','formatting-marks'), check('Ruler','ruler'), check('Paragraph Controls in Margin','paragraph-controls'), check('Toolbar','toolbar-visible'), check('Writing Streaks','show-streaks')] }, { label: 'Appearance', submenu: [radio('System','appearance-system'), radio('Light','appearance-light'), radio('Dark','appearance-dark'), radio('Midnight','appearance-midnight')] }, { label: 'Toolbar Groups', submenu: [['document','Document'],['edit','Editing'],['screenplay','Screenplay'],['workspace','Workspace'],['format','Formatting'],['production','Production'],['tools','Tools']].map(([g,name])=>check(name,'toolbar-group-'+g)) }, ws('Customize Toolbar…','customize'), { type: 'separator' }, ws('Zoom In','zoom-in', { accelerator: 'CmdOrCtrl+=' }), ws('Zoom Out','zoom-out', { accelerator: 'CmdOrCtrl+-' }), ws('Actual Size','zoom-reset', { accelerator: 'CmdOrCtrl+0', registerAccelerator: false }), { type: 'separator' }, { role: 'togglefullscreen' }] },
    { label: 'Format', submenu: [{ label: 'Element', submenu: [elementItem('Scene Heading','1'), elementItem('Action','2'), elementItem('Character','3'), elementItem('Parenthetical','4'), elementItem('Dialogue','5'), elementItem('Transition','6'), elementItem('Shot','7')] }, { label: 'Reformat Selection', submenu: ['Scene Heading','Action','Character','Parenthetical','Dialogue','Transition','Shot','General'].map(t=>ws(t,'reformat-'+t)) }, { type: 'separator' }, { label: 'Style', submenu: [check('Bold','bold', shown('CmdOrCtrl+B')), check('Italic','italic', shown('CmdOrCtrl+I')), check('Underline','underline', shown('CmdOrCtrl+U')), check('Strikethrough','strikethrough')] }, { label: 'Alignment', submenu: [radio('Left','align-left'), radio('Center','align-center'), radio('Right','align-right')] }, ws('Toggle Case','toggle-case'), ws('Dual Dialogue','dual-dialogue'), { type: 'separator' }, { label: 'Scene Numbers', submenu: [radio('Left','scene-numbers-left'), radio('Right','scene-numbers-right'), radio('Both','scene-numbers-both'), radio('None','scene-numbers-none'), { type: 'separator' }, check('Auto-hide Right Scene Numbers','scene-numbers-auto-hide'), { type: 'separator' }, action('Page Locking & Scene Numbers…','production-pages')] }, { label: 'Highlight Characters', submenu: [ws('Highlight Current Character','highlight-current'), ws('Clear All Highlights','highlight-clear')] }, { type: 'separator' }, action('Elements…','elements'), action('Apply Template…','apply-template'), action('Change Screenplay Format…','apply-template'), action('Intelligent Auto-Formatting…','auto-formatting'), ws('Formatting Assistant…','format-assistant')] },
    { label: 'Insert', submenu: [ws('New Scene','new-scene'), ws('ScriptNote','insert-note'), ws('Bookmark','insert-bookmark'), ws('New Beat on the Timeline','new-beat'), ws('Send Outline Element to Script…','send-to-script'), { type: 'separator' }, { label: 'Element at End of Script', submenu: ['Scene Heading','Action','Character','Parenthetical','Dialogue','Transition','Shot','New Act','End of Act'].map(t=>ws(t,'insert-element-'+t)) }, action('Image…','production-images'), { type: 'separator' }, ws('Emoji…','emoji',{accelerator:'Ctrl+Cmd+E'}), { label: 'Emoji & Symbols (Character Viewer)', click: () => { try { app.showEmojiPanel(); } catch {} } }] },
    { label:'Document',submenu:[action('Title Page…','title-page'),ws('Header and Footer…','header-footer'),ws('Story Structure & Editor Settings…','story-settings'),{ type: 'separator' },action('SmartType Manager…','smarttype'),ws('Character Names…','names-database'),{ type: 'separator' },ws('Writing Goals & Statistics…','writing-stats'),ws('Welcome Dashboard…','welcome')]},
    { label:'Tools',submenu:[action('Table Read…','table-read'),action('Voice Cast…','voice-cast'),action('Export Table Read Audio…','export-table-read'),{ type: 'separator' },action('Dictation…','dictation'),action('Live Collaboration…','collaboration'),{ type: 'separator' },{ label: 'Writing Sprint', submenu: [ws('15-Minute Sprint','sprint-15'),ws('25-Minute Sprint','sprint-25'),ws('45-Minute Sprint','sprint-45')] },ws('Script Research…','research'),ws('Storyboard & Photo Breakdown…','image-analysis'),{ type: 'separator' },ws('Native Engine Information…','rust-engine')]},
    { label:'Production',submenu:[check('Revision Mode','revision-mode'),action('Revision Sets…','production-revisions'),action('Track Changes…','production-changes'),{ type: 'separator' },action('Page Locking & Scene Numbers…','production-pages'),action('Production Tags…','production-tags'),action('Scene Cast Lists…','production-cast'),action('Saved Navigator Views…','production-navigator'),action('Script & Title Images…','production-images'),action('Writing Macros…','production-macros'),{ type: 'separator' },check('Reports','reports')]},
    // Document windows share a macOS tab group (tabbingIdentifier), so they can be shown as tabs of one window.
    { label: 'Window', submenu: [{ role: 'minimize' }, { role: 'zoom' }, ...(process.platform === 'darwin' ? [{ type: 'separator' },
      { label: 'New Tab', accelerator: 'CmdOrCtrl+T', click: () => newDocumentTab() }, { role: 'toggleTabBar' }, { role: 'selectPreviousTab' }, { role: 'selectNextTab' },
      { role: 'moveTabToNewWindow' }, { role: 'mergeAllWindows' }, { type: 'separator' }, { role: 'front' }] : [{ role: 'close' }])] },
    { label: 'Help', submenu: [action('Getting Started', 'getting-started'), { label: 'Idea to Draft', submenu: [action('Feature Screenplay', 'idea-to-draft-feature'), action('Television Pilot', 'idea-to-draft-series'), action('Stage Play', 'idea-to-draft-stage')] }, { type: 'separator' }, { label: 'Getting Started (Text File)', click: () => {
      const external = path.join(process.resourcesPath, 'Getting-Started.txt');
      return shell.openPath(fs.existsSync(external) ? external : path.join(__dirname, 'Getting-Started.txt'));
    } }, action('Keyboard Shortcuts…','keyboard-shortcuts'), { label: 'Show Local Data Folder', click: () => shell.openPath(app.getPath('userData')) }] },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
function createWindow(slot='') {
  let bounds = {};
  try { bounds = JSON.parse(fs.readFileSync(statePath, 'utf8')); } catch { /* First launch. */ }
  const area = screen.getPrimaryDisplay().workArea;
  const width = Math.min(area.width, Math.max(1024, Number(bounds.width) || 1440));
  const height = Math.min(area.height, Math.max(700, Number(bounds.height) || 900));
  const win = new BrowserWindow({ title: APP_NAME, width, height, minWidth: Math.min(1024, area.width), minHeight: Math.min(700, area.height), ...(process.platform === 'darwin' ? { titleBarStyle: 'hiddenInset', trafficLightPosition: { x: 13, y: 9 }, tabbingIdentifier: 'DraftCraftDocument' } : { frame: false }), show: false, backgroundColor: '#1b1b22', autoHideMenuBar: true, webPreferences: { preload: path.join(__dirname, 'preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true, spellcheck: true } });
  mainWindow=win;
  let lastRecent='';
  const coordinator=new SaveCoordinator(projectFiles,{directory:app.getPath('userData'),chooseLocation:(doc,file,suggestedName)=>chooseProjectLocation(doc,file,win,suggestedName),confirmSave:(doc,hasFile)=>confirmProjectSave(doc,hasFile,win),saveFailure:message=>saveFailureDialog(message,win),onState:state=>{if(!win.isDestroyed()&&!win.webContents.isDestroyed())win.webContents.send('desktop:file-state',state);if(state.location){const title=coordinator.active?.doc?.titlePage?.title||'';try{if(lastRecent!==state.location){lastRecent=state.location;recentProjects.touch(state.location,title);}else recentProjects.retitle(state.location,title);}catch{/* the recent list is a convenience */}}}});
  const record=documentWindows.add(win,slot,coordinator);persistWindows();
  // A crashed or killed editor can no longer run the renderer close transaction.
  // Keep the last state the main process received as a recovery copy and let the
  // writer reload the editor (which re-adopts that state) or close the window.
  win.webContents.on('render-process-gone',(_event,details)=>{if(details.reason==='clean-exit'||record.allowClose||win.isDestroyed())return;record.rendererGone=details.reason;clearTimeout(record.closeTimer);record.closePending=false;void(async()=>{await preserveRecovery(record);if(win.isDestroyed())return;const answer=await dialog.showMessageBox(win,{type:'warning',title:'The editor stopped unexpectedly',message:'The editor stopped unexpectedly',detail:'Your most recent changes received by DraftCraft Pro are kept as a recovery copy. Reload the editor to continue working, or close this window.',buttons:['Reload Editor','Close Window'],defaultId:0,cancelId:0,noLink:true});if(win.isDestroyed())return;if(answer.response===1){record.allowClose=true;win.close();}else{record.rendererGone=null;win.webContents.reload();}})();});
  win.on('focus',()=>{mainWindow=win;applyMenuState(menuStates.get(win.webContents.id));});
  for(const name of ['enter-full-screen','leave-full-screen'])win.on(name,()=>{if(!win.isDestroyed()&&!win.webContents.isDestroyed())win.webContents.send('desktop:window-state',{fullscreen:win.isFullScreen()});});
  win.webContents.setWindowOpenHandler(({ url }) => {
    // PrintAndPdfModal creates this blank same-origin window for its print HTML.
    if (url === 'about:blank' || url === '') return { action: 'allow', overrideBrowserWindowOptions: { title: 'Print Screenplay', width: 900, height: 1000, webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true, preload: undefined } } };
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => { if (!isEditor(url)) event.preventDefault(); });
  // Electron has no built-in context menu. Script text, the toolbar, Beat Board and timeline draw their own (the page
  // prevents the default); every other text field and selection gets the standard editing menu here.
  win.webContents.on('context-menu', (_event, params) => {
    const f = params.editFlags || {};
    const template = params.isEditable ? [
      { role: 'undo', enabled: !!f.canUndo }, { role: 'redo', enabled: !!f.canRedo }, { type: 'separator' },
      { role: 'cut', enabled: !!f.canCut }, { role: 'copy', enabled: !!f.canCopy }, { role: 'paste', enabled: !!f.canPaste }, { type: 'separator' },
      { role: 'selectAll', enabled: !!f.canSelectAll },
    ] : params.selectionText && params.selectionText.trim() ? [{ role: 'copy' }] : [];
    if (template.length) Menu.buildFromTemplate(template).popup({ window: win, x: params.x, y: params.y });
  });
  win.webContents.on('did-fail-load', (_event, code, message, _url, isMainFrame) => { if (isMainFrame && code !== -3) dialog.showErrorBox('DraftCraft Pro could not start', message); });
  win.webContents.on('did-finish-load', () => {
    for (const [command, file] of record.commands.splice(0)) win.webContents.send('desktop:command', command, file);
  });
  win.once('ready-to-show', () => win.show());
  win.on('close', event => {
    if(!record.allowClose){event.preventDefault();
      if(record.rendererGone||win.webContents.isDestroyed()||win.webContents.isCrashed()){if(!record.closePending){record.closePending=true;void preserveRecovery(record).finally(()=>{record.allowClose=true;record.closePending=false;if(!win.isDestroyed())win.close();if(quitting)app.quit();});}return;}
      if(!record.closePending){record.closePending=true;win.webContents.send('desktop:command','prepare-close');record.closeTimer=setTimeout(()=>void editorNotResponding(record),15000)}return;}
    const { width, height } = win.getNormalBounds();
    try { fs.mkdirSync(app.getPath('userData'), { recursive: true }); fs.writeFileSync(statePath, JSON.stringify({ width, height })); } catch { /* Preferences must not block editing. */ }
    session.defaultSession.flushStorageData();
  });
  // The window and its webContents are already destroyed here: use the record.
  win.on('closed', () => {clearTimeout(record.closeTimer);record.coordinator.active=null;documentWindows.remove(record);if(mainWindow===win)mainWindow=documentWindows.live().at(-1)?.window;persistWindows();});
  win.loadURL(ORIGIN + '/index.html');
  return win;
}
// Writes the coordinator's latest received document as a recovery snapshot.
async function preserveRecovery(record){const c=record.coordinator,a=c.active;if(!a||!a.dirty)return true;try{await c.run(()=>c.writeRecovery(a,true));return true;}catch(error){dialog.showErrorBox('The recovery copy could not be written',String(error&&error.message||error));return false;}}
async function editorNotResponding(record){
  const win=record.window;if(win.isDestroyed()||!record.closePending)return;
  const answer=await dialog.showMessageBox(win,{type:'warning',title:'The editor has not responded',message:'The editor has not responded',detail:'DraftCraft Pro is still waiting for the editor to finish closing. You can keep waiting, or close the window now; the most recent changes DraftCraft Pro received are kept as a recovery copy.',buttons:['Keep Waiting','Close Window'],defaultId:0,cancelId:0,noLink:true});
  if(win.isDestroyed()||!record.closePending)return;
  if(answer.response!==1){record.closeTimer=setTimeout(()=>void editorNotResponding(record),15000);return;}
  await preserveRecovery(record);if(win.isDestroyed())return;record.allowClose=true;record.closePending=false;win.close();if(quitting)app.quit();
}
async function startApi() {
  const { apiApp } = require('./api.cjs');
  apiServer = http.createServer((req, res) => {
    if (req.headers['x-draftcraft-token'] !== apiToken) { res.writeHead(403); res.end('Forbidden'); return; }
    if (req.url === '/api/health') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ status: 'ok', engine: 'DraftCraft Pro desktop', platform: process.platform, arch: process.arch })); return; }
    const key = loadKey();
    if (!key) { res.writeHead(503, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: 'Add your Gemini API key in DraftCraft Pro → AI Settings. Offline writing and exports remain available.' })); return; }
    process.env.GEMINI_API_KEY = key;
    apiApp(req, res);
  });
  await new Promise((resolve, reject) => { apiServer.once('error', reject); apiServer.listen(0, '127.0.0.1', resolve); });
  backendUrl = 'http://127.0.0.1:' + apiServer.address().port;
}
function registerProtocol() {
  const dist = path.join(__dirname, 'dist');
  protocol.handle('draftcraft', async (request) => {
    try {
      const url = new URL(request.url);
      if (url.hostname !== 'app') return new Response('Not found', { status: 404 });
      if (url.pathname.startsWith('/api/')) {
        const apiPath = url.pathname;
        if (!['/api/health', '/api/tts', '/api/research', '/api/analyze-image', '/api/writing-suggestions'].includes(apiPath)) return new Response('Not found', { status: 404 });
        const body = ['GET', 'HEAD'].includes(request.method) ? undefined : Buffer.from(await request.arrayBuffer());
        return fetch(backendUrl + apiPath, { method: request.method, headers: { 'content-type': 'application/json', 'x-draftcraft-token': apiToken }, body });
      }
      if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405 });
      const audio=url.pathname.match(/^\/__table-read\/audio\/([a-f0-9]{64})\.wav$/);
      if(audio){const response=await net.fetch(pathToFileURL(tableRead.audioPath(audio[1])).toString(),{headers:request.headers});const headers=new Headers(response.headers);headers.set('Content-Type','audio/wav');headers.set('Cache-Control','private, no-store');return new Response(request.method==='HEAD'?null:response.body,{status:response.status,headers});}
      const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
      const filePath = path.resolve(dist, relative);
      const safePath = path.relative(dist, filePath);
      if (safePath.startsWith('..') || path.isAbsolute(safePath) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return new Response('Not found', { status: 404 });
      const response = await net.fetch(pathToFileURL(filePath).toString());
      const headers = new Headers(response.headers);
      headers.set('Content-Security-Policy', CONTENT_POLICY);
      headers.set('X-Content-Type-Options', 'nosniff');
      return new Response(request.method === 'HEAD' ? null : response.body, { status: response.status, headers });
    } catch { return new Response('Unable to load local resource', { status: 500 }); }
  });
}
const menuStates=new Map();
function applyMenuState(state){const menu=Menu.getApplicationMenu();if(!menu||!state)return;for(const [key,value] of Object.entries(state)){const item=menu.getMenuItemById('ws:'+key);if(item&&(item.type==='checkbox'||item.type==='radio')&&item.checked!==!!value)item.checked=!!value;}}
// 1.17: spelling languages other than English use the system spellchecker. On macOS it follows the text and the
// Language & Region settings (setSpellCheckerLanguages does nothing there); elsewhere the language is set explicitly.
ipcMain.handle('desktop:spelling-language',(event,language)=>{if(!documentWindows.has(event))return{ok:false};const code=typeof language==='string'&&/^[a-z]{2,3}(-[A-Z]{2})?$/.test(language)?language:'en-US';
  const ses=event.sender.session;if(process.platform!=='darwin')try{const available=ses.availableSpellCheckerLanguages||[];const match=available.find(l=>l===code)||available.find(l=>l.split('-')[0]===code.split('-')[0]);if(match)ses.setSpellCheckerLanguages([match]);}catch{}
  return{ok:true,platform:process.platform,language:code};});
ipcMain.on('desktop:menu-state',(event,state)=>{if(!documentWindows.has(event)||!state||typeof state!=='object')return;const clean=Object.fromEntries(Object.entries(state).filter(([k,v])=>typeof k==='string'&&k.length<80&&typeof v==='boolean').slice(0,300));menuStates.set(event.sender.id,clean);const focused=BrowserWindow.getFocusedWindow();if(!focused||focused.webContents.id===event.sender.id)applyMenuState(clean);});
ipcMain.on('desktop:edit',(event,action)=>{if(!documentWindows.has(event))return;if(action==='cut')event.sender.cut();if(action==='copy')event.sender.copy();if(action==='paste')event.sender.paste();});
ipcMain.on('desktop:window',(event,action)=>{if(!documentWindows.has(event))return;const win=recordFor(event).window;if(action==='close')win.close();if(action==='minimize')win.minimize();if(action==='fullscreen')win.setFullScreen(!win.isFullScreen());});
ipcMain.on('desktop:document-slot',(event)=>{event.returnValue=documentWindows.has(event)?recordFor(event).slot:'';});
ipcMain.handle('desktop:new-window',event=>{trustedFiles(event);createWindow(crypto.randomUUID());return true;});
// 1.18 Start Window and recent projects. Entries are addressed by id; paths stay in the main process.
ipcMain.handle('desktop:start-info',event=>{trustedFiles(event);return {showAtLaunch:startPreference.showAtLaunch,recent:recentProjects.list(),version:app.getVersion()};});
ipcMain.handle('desktop:start-preference',(event,value)=>{trustedFiles(event);return startPreference.set(value);});
ipcMain.handle('desktop:recent-open',(event,id)=>{trustedFiles(event);const file=recentProjects.pathFor(id);if(!file)throw new Error('This project is no longer in the recent list.');if(!fs.existsSync(file))return {missing:true};const requestId=crypto.randomUUID();pendingOpenRequests.set(requestId,file);return {requestId};});
ipcMain.handle('desktop:recent-remove',(event,id)=>{trustedFiles(event);recentProjects.remove(id);return recentProjects.list();});
ipcMain.handle('desktop:recent-clear',event=>{trustedFiles(event);recentProjects.clear();return [];});
ipcMain.handle('desktop:recent-reveal',(event,id)=>{trustedFiles(event);const file=recentProjects.pathFor(id);if(!file||!fs.existsSync(file))return false;shell.showItemInFolder(file);return true;});
ipcMain.on('desktop:emoji-panel',event=>{if(!documentWindows.has(event))return;try{app.showEmojiPanel();}catch{}});
// Clipboard operations are restricted to the existing trusted main frame.
// The HTML flavor holds the versioned page payload; plain text stays readable
// in other apps. Both are written in one native clipboard transaction.
function clipboardSender(event) {
  if(typeof documentWindows!=='undefined')return documentWindows.has(event);
  return mainWindow && event.sender === mainWindow.webContents && event.senderFrame === event.sender.mainFrame;
}
function trustedFiles(event){if(!clipboardSender(event))throw new Error('Main editor required.');}
require('./table-read-ipc.cjs').registerTableRead({ipcMain,service:tableRead,trusted:trustedFiles,dialog,getWindow:event=>event?recordFor(event).window:mainWindow,documents:()=>app.getPath('documents'),origin:ORIGIN});
ipcMain.handle('desktop:initialize-project',async(event,snapshot,wasStored)=>{trustedFiles(event);if(typeof wasStored!=='boolean')throw new Error('An initial document state is required.');if(coordinatorFor(event).active)return {document:coordinatorFor(event).active.doc,state:coordinatorFor(event).state(),recoveries:await coordinatorFor(event).recoveries()};return coordinatorFor(event).begin(snapshot,{startup:true,wasStored});});
ipcMain.handle('desktop:normalize-project',(event,snapshot,stamp,original)=>{trustedFiles(event);return coordinatorFor(event).normalize(snapshot,stamp,original);});
ipcMain.handle('desktop:change-project',(event,snapshot,stamp,next)=>{trustedFiles(event);return coordinatorFor(event).change(snapshot,stamp,next);});
ipcMain.handle('desktop:open-project',async(event,snapshot,stamp,requestId)=>{
  trustedFiles(event);coordinatorFor(event).receive(snapshot,stamp);let file;
  if(requestId!==undefined){if(typeof requestId!=='string'||!pendingOpenRequests.has(requestId))throw new Error('The open request is no longer available.');file=pendingOpenRequests.get(requestId);pendingOpenRequests.delete(requestId);}
  else{const result=await dialog.showOpenDialog(recordFor(event).window,{title:'Open Screenplay',properties:['openFile'],filters:[{name:'DraftCraft Projects and Screenplays',extensions:['draftcraft','fdx','fdxt','fountain','txt','rtf','pdf']}]});if(result.canceled||!result.filePaths[0])return {opened:false,canceled:true};file=result.filePaths[0];}
  const other=documentWindows.byFile(path.resolve(file));if(other&&other!==recordFor(event)){other.window.show();other.window.focus();return {opened:false};}
  if(/\.draftcraft$/i.test(file))return coordinatorFor(event).open(snapshot,stamp,file);
  if(!/\.(fdx|fdxt|fountain|txt|rtf|pdf)$/i.test(file))throw new Error('Choose a DraftCraft, FDX, Fountain, RTF, PDF or text document.');
  const stat=await fs.promises.stat(file);if(!stat.isFile()||stat.size>50*1024*1024)throw new Error('Choose a screenplay smaller than 50 MB.');try{recentProjects.touch(file,'');}catch{}return /\.pdf$/i.test(file)?{opened:false,importFile:{name:path.basename(file),text:'',base64:(await fs.promises.readFile(file)).toString('base64')}}:{opened:false,importFile:{name:path.basename(file),text:await fs.promises.readFile(file,'utf8')}};
});
ipcMain.handle('desktop:save-project',(event,snapshot,saveAs,stamp,suggestedName)=>{trustedFiles(event);if(suggestedName!==undefined&&(typeof suggestedName!=='string'||suggestedName.length>200))throw Error('Invalid suggested filename.');if(typeof saveAs!=='boolean')throw new Error('A save action is required.');return coordinatorFor(event).save(snapshot,stamp,{saveAs,suggestedName});});
ipcMain.handle('desktop:autosave-project',(event,snapshot,stamp)=>{trustedFiles(event);return coordinatorFor(event).save(snapshot,stamp,{automatic:true});});
ipcMain.handle('desktop:checkpoint-project',(event,snapshot,stamp,preserve=false,label='Before Format Change')=>{trustedFiles(event);if(typeof preserve!=='boolean'||!['Before Format Change','Before Snapshot Restore'].includes(label))throw Error('Invalid checkpoint mode.');return coordinatorFor(event).checkpoint(snapshot,stamp,preserve,label);});
ipcMain.handle('desktop:file-preferences',(event,preferences)=>{trustedFiles(event);return preferences===undefined?coordinatorFor(event).preferences:coordinatorFor(event).setPreferences(preferences);});
ipcMain.handle('desktop:reveal-project',event=>{trustedFiles(event);const file=coordinatorFor(event).active?.file;if(!file)return false;shell.showItemInFolder(file);return true;});
ipcMain.handle('desktop:recovery-list',event=>{trustedFiles(event);return coordinatorFor(event).recoveries();});
ipcMain.handle('desktop:recovery-review',(event,id)=>{trustedFiles(event);return coordinatorFor(event).review(id);});
ipcMain.handle('desktop:recovery-discard',(event,id)=>{trustedFiles(event);return coordinatorFor(event).discardRecovery(id);});
ipcMain.handle('desktop:recovery-restore',(event,id,snapshot,stamp)=>{trustedFiles(event);return coordinatorFor(event).restore(id,snapshot,stamp);});
ipcMain.handle('desktop:revert-project',(event,snapshot,stamp)=>{trustedFiles(event);return coordinatorFor(event).revert(snapshot,stamp);});
ipcMain.handle('desktop:close-started',event=>{trustedFiles(event);const record=recordFor(event);if(!record.closePending)return false;clearTimeout(record.closeTimer);return true;});
ipcMain.handle('desktop:finish-close',async(event,snapshot,stamp,continuation)=>{
 trustedFiles(event);const record=recordFor(event);if(!record.closePending)throw Error('An editor close request is required.');clearTimeout(record.closeTimer);
 try{const result=await record.coordinator.decision(snapshot,stamp,continuation);if(result.action==='cancel'){record.closePending=false;quitting=false;}return result;}
 catch(error){record.closePending=false;quitting=false;dialog.showErrorBox('The project could not be saved',error.message);return {action:'cancel',closed:false,error:error.message};}
});
ipcMain.handle('desktop:cancel-close',event=>{trustedFiles(event);const record=recordFor(event);clearTimeout(record.closeTimer);record.closePending=false;quitting=false;record.coordinator.approval=null;return true;});
ipcMain.handle('desktop:complete-close',(event,token,snapshot,stamp)=>{
 trustedFiles(event);const record=recordFor(event);if(!record.closePending)return {closed:false};try{record.coordinator.receive(snapshot,stamp);if(!record.coordinator.commit(token))throw Error('The document changed before closing.');}catch{return {closed:false,stale:true};}
 clearTimeout(record.closeTimer);record.allowClose=true;record.closePending=false;session.defaultSession.flushStorageData();record.window.close();if(quitting)app.quit();return {closed:true};
});
ipcMain.handle('desktop:shortcut-recording', (event, enabled) => {
  if (!clipboardSender(event) || typeof enabled !== 'boolean') throw new Error('Main editor and boolean recording state required.');
  event.sender.setIgnoreMenuShortcuts(enabled);
  return true;
});
ipcMain.handle('desktop:native-history', (event, action) => {
  if (!clipboardSender(event) || !['undo', 'redo'].includes(action)) throw new Error('Main editor and valid history action required.');
  if (action === 'undo') event.sender.undo();
  else event.sender.redo();
  return true;
});
ipcMain.handle('desktop:clipboard-read', async (event, options) => {
  if (!clipboardSender(event)) throw new Error('Main editor required.');
  // Electron 44 uses ClipboardItem and asynchronous snapshot reads.
  let text = '', html = '', image;
  for (const item of await clipboard.read()) {
    if (item.types.includes('text/plain')) text = await (await item.getType('text/plain')).text();
    if (item.types.includes('text/html')) html = await (await item.getType('text/html')).text();
    if (options?.images === true && !image) {
      const type = ['image/png', 'image/jpeg', 'image/webp'].find(type => item.types.includes(type));
      if (type) { const blob = await item.getType(type); if (blob.size > 4 * 1024 * 1024) throw new Error('Clipboard image exceeds 4 MB.'); image = {type, base64: Buffer.from(await blob.arrayBuffer()).toString('base64')}; }
    }
  }
  if (text.length + html.length > 8 * 1024 * 1024) throw new Error('The clipboard content is too large.');
  return { text, html, ...(image ? {image} : {}) };
});
ipcMain.handle('desktop:clipboard-write', async (event, payload) => {
  if (!clipboardSender(event)) throw new Error('Main editor required.');
  if (!payload || typeof payload.text !== 'string' || (payload.html !== undefined && typeof payload.html !== 'string') || payload.text.length + (payload.html?.length || 0) > 8 * 1024 * 1024) throw new Error('Invalid clipboard content.');
  let image;
  if (payload.image !== undefined) {
    if (!payload.image || !['image/png', 'image/jpeg', 'image/webp'].includes(payload.image.type) || typeof payload.image.base64 !== 'string' || payload.image.base64.length > 6 * 1024 * 1024 || !/^[a-zA-Z0-9+/]+={0,2}$/.test(payload.image.base64)) throw new Error('Invalid clipboard image.');
    image = new Blob([Buffer.from(payload.image.base64, 'base64')], {type: payload.image.type});
  }
  await clipboard.write([new ClipboardItem({ 'text/plain': payload.text, ...(payload.html ? { 'text/html': payload.html } : {}), ...(image ? {[payload.image.type]: image} : {}) })]);
  return true;
});
function settingsSender(event) { return settingsWindow && event.sender === settingsWindow.webContents && event.senderFrame === event.sender.mainFrame; }
ipcMain.handle('ai:status', (event) => settingsSender(event) ? { message: loadKey() ? 'A key is configured. Paste a new key to replace it.' : 'No key configured. Offline editing is ready.' } : { message: 'Settings window required.' });
ipcMain.handle('ai:save', (event, value) => {
  if (!settingsSender(event)) return { message: 'Settings window required.' };
  if (typeof value !== 'string' || value.trim().length < 20 || value.length > 512) return { message: 'Paste a valid Gemini API key.' };
  if (!safeStorage.isEncryptionAvailable()) return { message: 'Keychain encryption is unavailable. The key was not saved.' };
  try { fs.mkdirSync(path.dirname(keyPath), { recursive: true }); fs.writeFileSync(keyPath, safeStorage.encryptString(value.trim()), { mode: 0o600 }); delete process.env.GEMINI_API_KEY; return { message: 'Key saved securely. AI requests will use this key.' }; }
  catch { return { message: 'The key could not be saved. Check access to your Keychain and local data folder.' }; }
});
ipcMain.handle('ai:clear', (event) => {
  if (!settingsSender(event)) return { message: 'Settings window required.' };
  try { fs.rmSync(keyPath, { force: true }); delete process.env.GEMINI_API_KEY; return { message: 'Key removed. Offline editing is ready.' }; }
  catch { return { message: 'The key could not be removed.' }; }
});
ipcMain.handle('ai:close', (event) => { if (settingsSender(event)) settingsWindow.close(); });

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', (_event, argv) => {
    const filePath = argv.find((arg) => /\.(fdx|fdxt|fountain|txt|rtf|pdf|draftcraft)$/i.test(arg));
    if (filePath) void openFile(filePath);
    else if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.show(); mainWindow.focus(); }
    else if (app.isReady()) createWindow();
  });
  app.on('open-file', (event, filePath) => { event.preventDefault(); void openFile(filePath); });
  app.whenReady().then(async () => {
    app.setAboutPanelOptions({ applicationName: APP_NAME, applicationVersion: app.getVersion(), copyright: 'DraftCraft Pro — local screenplay editor', credits: 'Desktop runtime: Electron. The supplied Rust workspace is a prototype and is not linked to this desktop build.' });
    await startApi();
    registerProtocol();
    session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    session.defaultSession.setPermissionCheckHandler(() => false);
    session.defaultSession.on('will-download', (_event, item) => {
      item.setSaveDialogOptions({ title: 'Export Screenplay', defaultPath: path.join(app.getPath('documents'), path.basename(item.getFilename())), buttonLabel: 'Save' });
      item.once('done', (_event, state) => { if (state !== 'completed' && state !== 'cancelled') dialog.showErrorBox('Export was interrupted', 'Please export the screenplay again and choose a writable folder.'); });
    });
    buildMenu();
    let slots=[''];try{const saved=JSON.parse(fs.readFileSync(windowsPath,'utf8'));if(Array.isArray(saved)&&saved.length)slots=saved.filter(s=>s===''||/^[a-f0-9-]{36}$/.test(s)).slice(0,12);}catch{}for(const slot of slots.length?slots:[''])createWindow(slot);
    readyForEditor = true;
    // 1.18 Start Window: once, at a normal launch (not when a file opened the app, and not when switched off).
    const launchedWithFile=pendingFiles.length>0||process.argv.slice(1).some(arg=>/\.(fdx|fdxt|fountain|txt|rtf|pdf|draftcraft)$/i.test(arg));
    if(startPreference.showAtLaunch&&!launchedWithFile&&mainWindow&&!mainWindow.isDestroyed()){const first=documentWindows.records.get(mainWindow.webContents.id);if(first)first.commands.push(['start-window']);}
    // Native self-test: only with an isolated test profile AND a report path (never in a normal launch).
    if (process.env.DRAFTCRAFT_SELF_TEST && process.env.DRAFTCRAFT_TEST_PROFILE) void require('./self-test.cjs').runSelfTest({ app, BrowserWindow, Menu, window: mainWindow, newDocumentTab, tableRead, findHelper: require('./dictation-ipc.cjs').findHelper, recentProjects, out: path.resolve(process.env.DRAFTCRAFT_SELF_TEST) });
    for (const pendingFile of pendingFiles.splice(0)) await openFile(pendingFile);
    const filePath = process.argv.find((arg) => /\.(fdx|fdxt|fountain|txt|rtf|pdf|draftcraft)$/i.test(arg));
    if (filePath) await openFile(filePath);
  }).catch((error) => { dialog.showErrorBox('DraftCraft Pro could not start', error.message); app.quit(); });
  // The tab bar's + button.
  app.on('new-window-for-tab', () => newDocumentTab());
  app.on('activate', () => { if (!quitting && (!mainWindow || mainWindow.isDestroyed()) && app.isReady()) createWindow(); });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
  app.on('before-quit', event => { const pending=[...documentWindows.records.values()].find(r=>!r.allowClose&&!r.window.isDestroyed());if(pending){event.preventDefault();quitting=true;pending.window.close();return;}if(session.defaultSession)session.defaultSession.flushStorageData(); });
  app.on('will-quit', () => { tableRead.dispose(); if (apiServer) apiServer.close(); });
}

require('./dictation-ipc.cjs').installDictation({ipcMain,trusted:trustedFiles,getWindow:event=>recordFor(event).window});
require('./production-print.cjs').installProductionPrint({ipcMain,BrowserWindow,dialog,trusted:trustedFiles,getWindow:event=>event?recordFor(event).window:mainWindow});
