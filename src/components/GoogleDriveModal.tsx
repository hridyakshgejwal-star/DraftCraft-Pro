import { DialogOverlay, UIPresence, useOverlayVisibility } from './ui/Presentation';
import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  initDriveAuth,
  signInWithGoogle,
  signOutGoogle,
  listDriveFiles,
  downloadDriveFile,
  uploadScreenplayToDrive,
  updateDriveFile,
  deleteDriveFile,
  getDriveAccessToken,
  DriveFileItem,
} from '../utils/googleDriveService';
import { ScriptDocument } from '../types/script';
import { exportToFdx, parseFdx } from '../utils/fdxCodec';
import { exportToFountain, parseFountain } from '../utils/fountainCodec';
import { getScriptPdfBlob } from '../utils/pdfExportEngine';
import {
  Cloud,
  X,
  Upload,
  Download,
  Trash2,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  FileText,
  Lock,
  LogOut,
  FolderOpen,
  Sparkles,
} from 'lucide-react';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDocument: ScriptDocument;
  onLoadDocument: (doc: ScriptDocument) => void;
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  isOpen,
  onClose,
  currentDocument,
  onLoadDocument,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [hasAuthToken, setHasAuthToken] = useState<boolean>(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // File list state
  const [driveFiles, setDriveFiles] = useState<DriveFileItem[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Upload/Save State
  const [saveFormat, setSaveFormat] = useState<'fdx' | 'fdproject' | 'fountain' | 'pdf'>('fdx');
  const [saveFilename, setSaveFilename] = useState(
    `${currentDocument.titlePage.title.replace(/[^a-zA-Z0-9_-]/g, '_') || 'My_Screenplay'}`
  );
  const [isUploading, setIsUploading] = useState(false);

  // Destructive Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    type: 'delete' | 'overwrite';
    fileId: string;
    fileName: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    const unsubscribe = initDriveAuth(
      (user, token) => {
        setCurrentUser(user);
        setHasAuthToken(!!token);
        if (token) {
          fetchFiles();
        }
      },
      () => {
        setCurrentUser(null);
        setHasAuthToken(false);
        setDriveFiles([]);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isOpen && hasAuthToken) {
      fetchFiles();
    }
  }, [isOpen, hasAuthToken]);

  const showUI = useOverlayVisibility(isOpen);
  if (!showUI) return null;

  const fetchFiles = async () => {
    setIsLoadingFiles(true);
    setErrorMsg(null);
    try {
      const files = await listDriveFiles(searchQuery, true);
      setDriveFiles(files);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to fetch files from Google Drive');
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setErrorMsg(null);
    try {
      const res = await signInWithGoogle();
      setCurrentUser(res.user);
      setHasAuthToken(true);
      fetchFiles();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to sign in with Google');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutGoogle();
      setCurrentUser(null);
      setHasAuthToken(false);
      setDriveFiles([]);
      setSuccessMsg('Signed out of Google Drive.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to sign out');
    }
  };

  const handleSaveToDrive = async () => {
    if (!hasAuthToken) return;
    setIsUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      let content = '';
      let mimeType = 'text/plain';
      let extension = '.fdx';

      if (saveFormat === 'fdx') {
        content = exportToFdx(currentDocument);
        mimeType = 'application/xml';
        extension = '.fdx';
      } else if (saveFormat === 'fdproject') {
        content = JSON.stringify(currentDocument, null, 2);
        mimeType = 'application/json';
        extension = '.fdproject';
      } else if (saveFormat === 'fountain') {
        content = exportToFountain(currentDocument);
        mimeType = 'text/plain';
        extension = '.fountain';
      } else if (saveFormat === 'pdf') {
        const pdfBlob = getScriptPdfBlob(currentDocument);
        // Convert blob to base64 or array buffer for upload
        const arrayBuffer = await pdfBlob.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        content = atob(base64); // text representation
        mimeType = 'application/pdf';
        extension = '.pdf';
      }

      const fullFilename = saveFilename.endsWith(extension)
        ? saveFilename
        : `${saveFilename}${extension}`;

      await uploadScreenplayToDrive(
        fullFilename,
        content,
        mimeType,
        `Final Draft 13 script: ${currentDocument.titlePage.title}`
      );

      setSuccessMsg(`Successfully uploaded "${fullFilename}" to Google Drive!`);
      await fetchFiles();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Upload to Google Drive failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenFile = async (file: DriveFileItem) => {
    setIsLoadingFiles(true);
    setErrorMsg(null);
    try {
      const { text, name } = await downloadDriveFile(file.id);

      if (name.endsWith('.fdx') || text.includes('<?xml') || text.includes('<FinalDraft')) {
        const loaded = parseFdx(text);
        onLoadDocument({ ...currentDocument, ...loaded });
        setSuccessMsg(`Loaded "${name}" into Final Draft 13!`);
        onClose();
      } else if (name.endsWith('.fdproject') || text.startsWith('{')) {
        try {
          const loaded = JSON.parse(text) as ScriptDocument;
          onLoadDocument(loaded);
          setSuccessMsg(`Loaded "${name}" into Final Draft 13!`);
          onClose();
        } catch {
          throw new Error('Invalid project file format.');
        }
      } else if (name.endsWith('.fountain')) {
        const loaded = parseFountain(text);
        onLoadDocument({ ...currentDocument, ...loaded });
        setSuccessMsg(`Loaded Fountain script "${name}" into Final Draft 13!`);
        onClose();
      } else {
        // Plain text fallback
        const lines = text.split('\n');
        const paragraphs = lines.map((l, i) => ({
          id: `p-${i}`,
          type: (l.trim().startsWith('INT.') || l.trim().startsWith('EXT.')
            ? 'Scene Heading'
            : 'Action') as any,
          text: l,
        }));
        const newDoc: ScriptDocument = {
          ...currentDocument,
          paragraphs,
          titlePage: { ...currentDocument.titlePage, title: name.replace(/\.[^/.]+$/, '') },
        };
        onLoadDocument(newDoc);
        setSuccessMsg(`Loaded "${name}" into Final Draft 13!`);
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to download and parse file from Google Drive');
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // Explicit confirmation prompt triggers
  const promptDeleteFile = (file: DriveFileItem) => {
    setConfirmDialog({
      type: 'delete',
      fileId: file.id,
      fileName: file.name,
      message: `Are you sure you want to permanently delete "${file.name}" from your Google Drive? This action cannot be undone.`,
    });
  };

  const promptOverwriteCurrent = (file: DriveFileItem) => {
    setConfirmDialog({
      type: 'overwrite',
      fileId: file.id,
      fileName: file.name,
      message: `Are you sure you want to overwrite "${file.name}" on Google Drive with the current screenplay draft? Previous contents will be replaced.`,
    });
  };

  const executeConfirmedAction = async () => {
    if (!confirmDialog) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (confirmDialog.type === 'delete') {
        await deleteDriveFile(confirmDialog.fileId);
        setSuccessMsg(`Deleted "${confirmDialog.fileName}" from Google Drive.`);
        await fetchFiles();
      } else if (confirmDialog.type === 'overwrite') {
        const content = exportToFdx(currentDocument);
        await updateDriveFile(confirmDialog.fileId, content, 'application/xml');
        setSuccessMsg(`Updated "${confirmDialog.fileName}" on Google Drive!`);
        await fetchFiles();
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Operation failed.');
    } finally {
      setConfirmDialog(null);
    }
  };

  return (
    <DialogOverlay open={isOpen} onClose={onClose} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#1e1e1e] border border-neutral-700 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden text-neutral-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-[#181818]">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-wide">
                Google Drive Cloud Sync & Storage
              </h2>
              <p className="text-xs text-neutral-400">
                Save, backup, browse, and load Final Draft (.fdx), .fdproject, and PDF files
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {currentUser && (
              <div className="flex items-center space-x-2 bg-[#252525] px-3 py-1 rounded-full border border-neutral-700 text-xs">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || ''}
                    className="w-4 h-4 rounded-full"
                  />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-blue-500 text-[10px] dc-meta text-white flex items-center justify-center font-bold">
                    {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <span className="text-neutral-300 font-medium">
                  {currentUser.displayName || currentUser.email}
                </span>
                <button aria-label="Sign out"
                  onClick={handleSignOut}
                  title="Sign out"
                  className="text-neutral-400 hover:text-red-400 ml-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <button aria-label="Close dialog"
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback banners */}
        {errorMsg && (
          <div className="px-6 py-2.5 bg-red-950/60 border-b border-red-800/80 text-xs text-red-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-red-300 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="px-6 py-2.5 bg-emerald-950/60 border-b border-emerald-800/80 text-xs text-emerald-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-300 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#161616]">
          {!hasAuthToken ? (
            /* Mandatory Sign-in Screen with Official Google Button */
            <div className="max-w-md mx-auto my-12 p-8 bg-[#202020] border border-neutral-800 rounded-xl text-center space-y-6 shadow-xl">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
                <Cloud className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">Connect Google Drive</h3>
                <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                  Sign in with your Google Account to safely save your screenplays, open existing
                  scripts, and sync drafts directly to your Google Drive cloud storage.
                </p>
              </div>

              <div className="flex justify-center pt-2">
                {/* Official Google Sign-In button specification */}
                <button
                  type="button"
                  onClick={handleSignIn}
                  disabled={isSigningIn}
                  className="gsi-material-button relative inline-flex items-center justify-center bg-white hover:bg-neutral-100 text-neutral-800 font-medium text-xs rounded-full px-5 py-2.5 shadow-md border border-neutral-300 hover:shadow-lg transition-colors active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <div className="w-4 h-4 mr-3 flex items-center justify-center">
                    <svg
                      version="1.1"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 48 48"
                      className="w-full h-full"
                    >
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                      />
                      <path
                        fill="#34A853"
                        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                      />
                    </svg>
                  </div>
                  <span>{isSigningIn ? 'Connecting...' : 'Sign in with Google'}</span>
                </button>
              </div>

              <div className="text-[11px] text-neutral-500 pt-2 flex items-center justify-center space-x-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>Tokens are stored in memory only. Your scripts remain private.</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Save / Upload to Drive */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-[#202020] border border-neutral-800 rounded-lg p-5 space-y-4">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-neutral-300 uppercase tracking-wider pb-2 border-b border-neutral-700/50">
                    <Upload className="w-3.5 h-3.5 text-blue-400" />
                    <span>Upload Current Script</span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">
                      File Name
                    </label>
                    <input
                      type="text"
                      value={saveFilename}
                      onChange={(e) => setSaveFilename(e.target.value)}
                      placeholder="My_Screenplay"
                      className="w-full px-3 py-1.5 bg-[#2a2a2a] border border-neutral-700 rounded-md text-white text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">
                      Export Format
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        { id: 'fdx', label: 'Final Draft (.fdx)', desc: 'Industry Standard' },
                        { id: 'fdproject', label: 'Native (.fdproject)', desc: 'Full Studio State' },
                        { id: 'fountain', label: 'Fountain (.fountain)', desc: 'Plain text syntax' },
                        { id: 'pdf', label: 'Screenplay PDF (.pdf)', desc: 'Vector pagination' },
                      ].map((fmt) => (
                        <button
                          key={fmt.id}
                          type="button"
                          onClick={() => setSaveFormat(fmt.id as any)}
                          className={`p-2 rounded-lg border text-left transition-colors ${
                            saveFormat === fmt.id
                              ? 'bg-blue-600/20 border-blue-500 text-white'
                              : 'bg-[#262626] border-neutral-700/80 text-neutral-300 hover:bg-[#2c2c2c]'
                          }`}
                        >
                          <div className="font-semibold text-[11px]">{fmt.label}</div>
                          <div className="text-[10px] dc-meta text-neutral-400">{fmt.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleSaveToDrive}
                    disabled={isUploading}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-semibold text-xs flex items-center justify-center space-x-2 shadow transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    <span>
                      {isUploading ? 'Uploading to Drive...' : `Save to Google Drive (${saveFormat.toUpperCase()})`}
                    </span>
                  </button>

                  <div className="p-3 bg-neutral-900/60 rounded border border-neutral-800 text-[11px] text-neutral-400 space-y-1">
                    <div className="text-neutral-300 font-medium">Currently Loaded:</div>
                    <div className="font-mono text-white text-xs truncate">
                      {currentDocument.titlePage.title || 'Untitled Screenplay'}
                    </div>
                    <div>{currentDocument.paragraphs.length} paragraphs · ~{currentDocument.targetScriptPages || 110} pages</div>
                  </div>
                </div>
              </div>

              {/* Right Column: Files on Drive Browser */}
              <div className="lg:col-span-7 space-y-4">
                <div className="bg-[#202020] border border-neutral-800 rounded-lg p-5 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-700/50">
                    <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center space-x-2">
                      <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Screenplays in Your Google Drive</span>
                    </span>

                    <button aria-label="Refresh files"
                      onClick={fetchFiles}
                      disabled={isLoadingFiles}
                      className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800"
                      title="Refresh files"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFiles ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  {/* Search query */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchFiles()}
                      placeholder="Filter files in Google Drive..."
                      className="w-full pl-8 pr-3 py-1.5 bg-[#2a2a2a] border border-neutral-700 rounded-md text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* File List */}
                  <div className="space-y-2 max-h-[380px] overflow-y-auto">
                    {isLoadingFiles && (
                      <div className="py-8 text-center text-neutral-400 text-xs flex items-center justify-center space-x-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                        <span>Querying Google Drive files...</span>
                      </div>
                    )}

                    {!isLoadingFiles && driveFiles.length === 0 && (
                      <div className="py-8 text-center text-neutral-500 text-xs">
                        No script files found in Google Drive matching the filter.
                      </div>
                    )}

                    {!isLoadingFiles &&
                      driveFiles.map((file) => (
                        <div
                          key={file.id}
                          className="p-3 bg-[#262626] border border-neutral-700/80 rounded-lg flex items-center justify-between hover:border-neutral-600 transition-colors group"
                        >
                          <div className="min-w-0 flex items-center space-x-3">
                            <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                            <div className="min-w-0">
                              <h4 className="text-xs font-semibold text-white truncate">
                                {file.name}
                              </h4>
                              <p className="text-[10px] dc-meta text-neutral-400">
                                {file.modifiedTime
                                  ? new Date(file.modifiedTime).toLocaleDateString()
                                  : 'Recently updated'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1.5 shrink-0">
                            {file.webViewLink && (
                              <a
                                href={file.webViewLink}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 text-neutral-400 hover:text-white rounded"
                                title="Open in Google Drive"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}

                            <button
                              onClick={() => handleOpenFile(file)}
                              className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-medium flex items-center space-x-1"
                              title="Open in Editor"
                            >
                              <Download className="w-3 h-3" />
                              <span>Open</span>
                            </button>

                            <button aria-label="Overwrite with current script"
                              onClick={() => promptOverwriteCurrent(file)}
                              className="p-1 text-neutral-400 hover:text-amber-400 rounded"
                              title="Overwrite with current script"
                            >
                              <Upload className="w-3.5 h-3.5" />
                            </button>

                            <button aria-label="Delete from Google Drive"
                              onClick={() => promptDeleteFile(file)}
                              className="p-1 text-neutral-400 hover:text-red-400 rounded"
                              title="Delete from Google Drive"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Destructive Action Explicit Confirmation Dialog (MANDATORY REQUIREMENT) */}
        <UIPresence>{confirmDialog && (
          <DialogOverlay open={Boolean(confirmDialog)} onClose={() => setConfirmDialog(null)} className="dc-confirm fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#242424] border border-neutral-600 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center space-x-3 text-amber-400">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <h3 className="text-base font-bold text-white">
                  {confirmDialog.type === 'delete' ? 'Confirm File Deletion' : 'Confirm Overwrite'}
                </h3>
              </div>

              <p className="text-xs text-neutral-300 leading-relaxed">
                {confirmDialog.message}
              </p>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeConfirmedAction}
                  className={`px-4 py-2 text-white text-xs font-semibold rounded-lg shadow ${
                    confirmDialog.type === 'delete'
                      ? 'bg-red-600 hover:bg-red-500'
                      : 'bg-amber-600 hover:bg-amber-500'
                  }`}
                >
                  {confirmDialog.type === 'delete' ? 'Yes, Delete File' : 'Yes, Overwrite File'}
                </button>
              </div>
            </div>
          </DialogOverlay>
        )}</UIPresence>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-800 bg-[#181818]">
          <div className="text-xs text-neutral-400 flex items-center space-x-1.5">
            <Lock className="w-3.5 h-3.5 text-neutral-500" />
            <span>Fully compliant with Google Workspace OAuth least-privilege security policies.</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </DialogOverlay>
  );
};
