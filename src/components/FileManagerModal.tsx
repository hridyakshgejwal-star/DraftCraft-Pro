import { DialogOverlay, useOverlayVisibility } from './ui/Presentation';
import React, { useState, useEffect } from 'react';
import {
  FolderArchive,
  X,
  Clock,
  RotateCcw,
  Trash2,
  Settings,
  ShieldAlert,
  ShieldCheck,
  FileText,
  Copy,
  Download,
  Search,
  CheckCircle2,
  HardDrive,
  FolderOpen,
} from 'lucide-react';
import { ScriptDocument } from '../types/script';
import {
  ScriptBackupEntry,
  BackupSettings,
  RecentDocItem,
  getAllBackups,
  loadBackupSettings,
  saveBackupSettings,
  getRecentDocuments,
  deleteBackupEntry,
  clearAllBackups,
  saveDocumentWithBackup,
} from '../utils/fileManagerStorage';

interface FileManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDocument: ScriptDocument;
  onLoadDocument: (doc: ScriptDocument) => Promise<boolean>;
  onDuplicateDocument: (newTitle: string) => Promise<boolean>;
  onSaveAsDocument: (newTitle: string) => Promise<boolean>;
  onRevertToSaved: () => Promise<boolean>;
}

export const FileManagerModal: React.FC<FileManagerModalProps> = ({
  isOpen,
  onClose,
  currentDocument,
  onLoadDocument,
  onDuplicateDocument,
  onSaveAsDocument,
  onRevertToSaved,
}) => {
  const [fileActionBusy,setFileActionBusy]=useState(false);
  const [activeTab, setActiveTab] = useState<'backups' | 'recent' | 'settings'>('backups');
  const [backups, setBackups] = useState<ScriptBackupEntry[]>([]);
  const [recentDocs, setRecentDocs] = useState<RecentDocItem[]>([]);
  const [backupSettings, setBackupSettings] = useState<BackupSettings>(() => loadBackupSettings());
  const [searchFilter, setSearchFilter] = useState('');

  // Save As / Duplicate input modal state
  const [newTitleInput, setNewTitleInput] = useState('');
  const [actionPrompt, setActionPrompt] = useState<'none' | 'saveAs' | 'duplicate'>('none');
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setBackups(getAllBackups());
      setRecentDocs(getRecentDocuments());
      setBackupSettings(loadBackupSettings());
    }
  }, [isOpen]);

  const showNotification = (msg: string) => {
    setSuccessBanner(msg);
    setTimeout(() => setSuccessBanner(null), 3000);
  };

  const handleDeleteBackup = (id: string) => {
    deleteBackupEntry(id);
    setBackups(getAllBackups());
    showNotification('Backup removed.');
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all archived backups?')) {
      clearAllBackups();
      setBackups([]);
      showNotification('All backups cleared.');
    }
  };

  const handleRestoreBackup=async(backup:ScriptBackupEntry)=>{if(fileActionBusy||!window.confirm(`Restore screenplay from "${backup.title}" (${new Date(backup.timestamp).toLocaleString()})? Current work will be checkpointed first.`))return;setFileActionBusy(true);try{if(await onLoadDocument(backup.document)){showNotification('Snapshot restored.');onClose();}else showNotification('Snapshot was not adopted; current work remains open.');}catch(error){showNotification(String(error));}finally{setFileActionBusy(false);}};

  const handleSaveSettings = (newSettings: BackupSettings) => {
    setBackupSettings(newSettings);
    saveBackupSettings(newSettings);
    showNotification('Backup settings updated.');
  };

  const handleManualBackupNow = () => {
    const res = saveDocumentWithBackup(currentDocument, false, false);
    if (res.success) {
      setBackups(getAllBackups());
      showNotification('Snapshot backup created successfully.');
    }else showNotification(res.error||'The local snapshot could not be stored.');
  };

  const filteredBackups = backups.filter((b) =>
    b.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
    b.timestamp.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const filteredRecent = recentDocs.filter((r) =>
    r.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
    r.author.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const showUI = useOverlayVisibility(isOpen);
  if (!showUI) return null;

  return (
    <DialogOverlay open={isOpen} onClose={onClose} className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1e1e24] dc-bg-panel border border-white/15 rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden text-neutral-200">
        {/* Header */}
        <div className="px-6 py-4 bg-[#26262e] dc-bg-elevated border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <FolderArchive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                File Management, Autosave & Backups
                <span className="text-xs font-normal px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Part 11
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Crash recovery, revision backups, recent documents, Save As, and transactional persistence
              </p>
            </div>
          </div>
          <button aria-label="Close dialog"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-md hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notifications */}
        {successBanner && (
          <div className="bg-emerald-950/80 border-b border-emerald-500 px-6 py-2 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {successBanner}
          </div>
        )}

        {/* Action Bar (Save As, Duplicate, Revert) */}
        <div className="px-6 py-3 bg-[#1c1c22] border-b border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setNewTitleInput(`${currentDocument.titlePage.title || 'Screenplay'} (Copy)`);
                setActionPrompt('duplicate');
              }}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-md border border-white/10 flex items-center gap-1.5 transition-colors"
            >
              <Copy className="w-3.5 h-3.5 text-amber-400" />
              Duplicate Document
            </button>

            <button
              onClick={() => {
                setNewTitleInput(`${currentDocument.titlePage.title || 'Screenplay'} - New Draft`);
                setActionPrompt('saveAs');
              }}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-md border border-white/10 flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              Save As...
            </button>

            <button
              disabled={fileActionBusy}
              onClick={async()=>{if(!window.confirm('Reload the saved native file? Current work will first be preserved as a recovery checkpoint.'))return;setFileActionBusy(true);try{if(await onRevertToSaved()){showNotification('Reverted to the saved file.');onClose();}else showNotification('The saved file was not adopted; current work remains open.');}catch(error){showNotification(String(error));}finally{setFileActionBusy(false);}}}

              className="px-3 py-1.5 bg-neutral-800 hover:bg-rose-950/60 text-neutral-300 hover:text-rose-300 rounded-md border border-white/10 flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
              Revert to Saved Version
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleManualBackupNow}
              className="px-3 py-1.5 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 rounded-md border border-emerald-700/50 flex items-center gap-1.5 font-medium transition-colors"
            >
              <HardDrive className="w-3.5 h-3.5" />
              Create Snapshot Backup
            </button>
          </div>
        </div>

        {/* Prompt Modal for Save As / Duplicate */}
        {actionPrompt !== 'none' && (
          <div className="p-4 bg-amber-500/10 border-b border-amber-500/30 flex items-center justify-between gap-4">
            <div className="flex-1 flex items-center gap-3">
              <span className="text-xs font-semibold text-amber-300 whitespace-nowrap">
                {actionPrompt === 'duplicate' ? 'Duplicate Screenplay As:' : 'Suggested filename:'}
              </span>
              <input
                type="text"
                value={newTitleInput}
                onChange={(e) => setNewTitleInput(e.target.value)}
                className="flex-1 bg-black/60 border border-amber-500/40 rounded px-3 py-1 text-xs text-white focus:outline-none focus:border-amber-400"
                placeholder="Enter title..."
                autoFocus
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={fileActionBusy}
                onClick={async()=>{if(!newTitleInput.trim()||fileActionBusy)return;setFileActionBusy(true);try{const success=actionPrompt==='duplicate'?await onDuplicateDocument(newTitleInput.trim()):await onSaveAsDocument(newTitleInput.trim());if(success){showNotification(actionPrompt==='duplicate'?'Duplicate created.':'Project saved to the selected file.');setActionPrompt('none');onClose();}else showNotification('Operation canceled or unavailable; no success was reported.');}catch(error){showNotification(String(error));}finally{setFileActionBusy(false);}}}

                className="px-3 py-1 bg-amber-500 text-black font-semibold text-xs rounded hover:bg-amber-400"
              >
                Confirm
              </button>
              <button
                onClick={() => setActionPrompt('none')}
                className="px-3 py-1 bg-neutral-800 text-neutral-300 text-xs rounded hover:bg-neutral-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Navigation Tabs & Search */}
        <div className="flex items-center justify-between px-6 pt-3 bg-[#212128] border-b border-white/10 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('backups')}
              className={`px-4 py-2 font-medium border-b-2 flex items-center gap-1.5 transition-colors ${
                activeTab === 'backups'
                  ? 'border-emerald-400 text-emerald-300 bg-emerald-500/10 rounded-t'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              Automatic Backups & Snapshots ({backups.length})
            </button>
            <button
              onClick={() => setActiveTab('recent')}
              className={`px-4 py-2 font-medium border-b-2 flex items-center gap-1.5 transition-colors ${
                activeTab === 'recent'
                  ? 'border-emerald-400 text-emerald-300 bg-emerald-500/10 rounded-t'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Recent Documents ({recentDocs.length})
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 font-medium border-b-2 flex items-center gap-1.5 transition-colors ${
                activeTab === 'settings'
                  ? 'border-emerald-400 text-emerald-300 bg-emerald-500/10 rounded-t'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              Backup Intervals & Retention
            </button>
          </div>

          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-neutral-500" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Locate files / search..."
              className="bg-black/40 border border-white/10 rounded-md pl-8 pr-3 py-1 text-xs text-neutral-200 focus:outline-none focus:border-emerald-400 w-48"
            />
          </div>
        </div>

        {/* Tab 1: Backups List */}
        {activeTab === 'backups' && (
          <div className="flex-1 flex flex-col overflow-hidden p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>
                  Autosave active every {backupSettings.autosaveIntervalSeconds}s • Retention limit:{' '}
                  {backupSettings.backupRetentionCount} revisions
                </span>
              </div>
              {backups.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-xs text-neutral-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear Archive
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {filteredBackups.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-neutral-400 p-8">
                  <HardDrive className="w-12 h-12 text-neutral-600 mb-3" />
                  <p className="text-sm font-medium text-neutral-300">No backups in archive yet</p>
                  <p className="text-xs text-neutral-500 max-w-sm mt-1">
                    Click "Create Snapshot Backup" above or continue typing. The automatic crash-prevention engine
                    will record periodic revisions.
                  </p>
                </div>
              ) : (
                filteredBackups.map((b) => (
                  <div
                    key={b.id}
                    className="p-3 bg-[#24242c] hover:bg-[#2b2b35] border border-white/10 rounded-lg flex items-center justify-between text-xs transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-white flex items-center gap-2">
                          {b.title}
                          {b.isAutosave && (
                            <span className="text-[10px] dc-meta bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded border border-blue-500/30">
                              Autosave
                            </span>
                          )}
                          {b.isCrashRecovery && (
                            <span className="text-[10px] dc-meta bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/30">
                              Crash Recovery
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-neutral-400 flex items-center gap-3 mt-0.5">
                          <span>{new Date(b.timestamp).toLocaleString()}</span>
                          <span>•</span>
                          <span>{b.wordCount.toLocaleString()} words</span>
                          <span>•</span>
                          <span>{b.pageCount} pages{b.pageLabels?'':' (legacy estimate)'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        disabled={fileActionBusy} onClick={() => void handleRestoreBackup(b)}
                        className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-black font-medium rounded border border-emerald-500/30 transition-colors flex items-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Restore Version
                      </button>
                      <button aria-label="Delete this backup"
                        onClick={() => handleDeleteBackup(b.id)}
                        className="p-1.5 text-neutral-500 hover:text-rose-400 rounded hover:bg-white/5 transition-colors"
                        title="Delete this backup"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Recent Documents */}
        {activeTab === 'recent' && (
          <div className="flex-1 p-6 overflow-y-auto space-y-3">
            <div className="text-xs text-neutral-400 mb-2">
              Recently opened and edited screenplays stored in browser persistence:
            </div>
            {filteredRecent.length === 0 ? (
              <div className="text-center p-8 text-neutral-500 text-xs">No recent files matched.</div>
            ) : (
              filteredRecent.map((docItem) => (
                <div
                  key={docItem.id}
                  className="p-3 bg-[#24242c] hover:bg-[#2b2b35] border border-white/10 rounded-lg flex items-center justify-between text-xs transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <FolderOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-white">{docItem.title}</div>
                      <div className="text-[11px] text-neutral-400 flex items-center gap-3 mt-0.5">
                        <span>Author: {docItem.author}</span>
                        <span>•</span>
                        <span>Last modified: {new Date(docItem.lastModified).toLocaleString()}</span>
                        <span>•</span>
                        <span>{docItem.wordCount} words</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Settings */}
        {activeTab === 'settings' && (
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            <div className="max-w-xl bg-[#24242d] border border-white/10 rounded-xl p-6 space-y-5 text-xs">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-emerald-400" />
                Autosave & Backup Retention Options
              </h3>

              {/* Toggle Autosave */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  <div className="font-medium text-neutral-200">Enable Background Autosave</div>
                  <div className="text-[11px] text-neutral-400">
                    Periodically commits screenplay state to localStorage and recovery memory.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={backupSettings.autosaveEnabled}
                  onChange={(e) =>
                    handleSaveSettings({ ...backupSettings, autosaveEnabled: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-emerald-500"
                />
              </div>

              {/* Autosave Interval */}
              <div>
                <label className="block font-medium text-neutral-200 mb-1">
                  Autosave Interval:
                </label>
                <select
                  value={backupSettings.autosaveIntervalSeconds}
                  onChange={(e) =>
                    handleSaveSettings({
                      ...backupSettings,
                      autosaveIntervalSeconds: Number(e.target.value),
                    })
                  }
                  className="w-full bg-[#181820] dc-bg-sidebar border border-white/15 rounded-md px-3 py-2 text-neutral-200 focus:outline-none focus:border-emerald-400"
                >
                  <option value={30}>Every 30 seconds (High frequency)</option>
                  <option value={60}>Every 1 minute (Recommended)</option>
                  <option value={120}>Every 2 minutes</option>
                  <option value={300}>Every 5 minutes</option>
                  <option value={600}>Every 10 minutes</option>
                </select>
              </div>

              {/* Backup Retention */}
              <div>
                <label className="block font-medium text-neutral-200 mb-1">
                  Maximum Backup Retention Count:
                </label>
                <select
                  value={backupSettings.backupRetentionCount}
                  onChange={(e) =>
                    handleSaveSettings({
                      ...backupSettings,
                      backupRetentionCount: Number(e.target.value),
                    })
                  }
                  className="w-full bg-[#181820] dc-bg-sidebar border border-white/15 rounded-md px-3 py-2 text-neutral-200 focus:outline-none focus:border-emerald-400"
                >
                  <option value={10}>Retain last 10 snapshots</option>
                  <option value={20}>Retain last 20 snapshots (Default)</option>
                  <option value={50}>Retain last 50 snapshots</option>
                  <option value={100}>Retain last 100 snapshots</option>
                </select>
              </div>

              {/* Backup Folder Destination */}
              <div>
                <label className="block font-medium text-neutral-200 mb-1">
                  Local snapshot label (browser storage):
                </label>
                <input
                  type="text"
                  value={backupSettings.backupFolder}
                  onChange={(e) =>
                    handleSaveSettings({
                      ...backupSettings,
                      backupFolder: e.target.value,
                    })
                  }
                  className="w-full bg-[#181820] dc-bg-sidebar border border-white/15 rounded-md px-3 py-2 text-neutral-200 focus:outline-none focus:border-emerald-400"
                />
              </div>

              {/* Accidental Loss Protection */}
              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <div>
                  <div className="font-medium text-neutral-200">Protection Against Accidental Data Loss</div>
                  <div className="text-[11px] text-neutral-400">
                    Stores atomic recovery cache before browser tab close or unexpected crashes.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={backupSettings.protectAgainstAccidentalLoss}
                  onChange={(e) =>
                    handleSaveSettings({
                      ...backupSettings,
                      protectAgainstAccidentalLoss: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded text-emerald-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </DialogOverlay>
  );
};
