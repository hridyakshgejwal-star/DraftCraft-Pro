import {documentLayout} from '../production/layout';
import { ScriptDocument } from '../types/script';

export interface ScriptBackupEntry {
  id: string;
  docId: string;
  title: string;
  timestamp: string;
  wordCount: number;
  pageCount: number;
  pageLabels?:string[];
  isAutosave: boolean;
  isCrashRecovery?: boolean;
  document: ScriptDocument;
}

export interface BackupSettings {
  autosaveEnabled: boolean;
  autosaveIntervalSeconds: number; // e.g. 60, 120, 300
  backupRetentionCount: number; // e.g. 10, 20, 50
  backupFolder: string; // e.g. 'Local Safe / Screenplay Backups' or virtual directory path
  protectAgainstAccidentalLoss: boolean;
  lastBackupTime?: string;
}

const BACKUP_STORAGE_KEY = 'fd13_script_backups_v1';
const SETTINGS_STORAGE_KEY = 'fd13_backup_settings_v1';
const RECENT_DOCS_KEY = 'fd13_recent_documents_v1';
const CRASH_RECOVERY_KEY = 'fd13_crash_recovery_state_v1';

export const DEFAULT_BACKUP_SETTINGS: BackupSettings = {
  autosaveEnabled: true,
  autosaveIntervalSeconds: 120, // 2 minutes
  backupRetentionCount: 20,
  backupFolder: 'Screenplay Auto-Backups',
  protectAgainstAccidentalLoss: true,
};

export interface RecentDocItem {
  id: string;
  title: string;
  author: string;
  lastModified: string;
  wordCount: number;
  pageCount: number;
  pageLabels?:string[];
}

/**
 * Load backup settings from local storage
 */
export function loadBackupSettings(): BackupSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_BACKUP_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.error('Failed to load backup settings', err);
  }
  return DEFAULT_BACKUP_SETTINGS;
}

/**
 * Save backup settings
 */
export function saveBackupSettings(settings: BackupSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save backup settings', err);
  }
}

/**
 * Get all stored backups
 */
export function getAllBackups(): ScriptBackupEntry[] {
  try {
    const raw = localStorage.getItem(BACKUP_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed to parse backups', err);
  }
  return [];
}

/**
 * Transactional / Atomic Save of Document with Crash Recovery & Backup pruning
 */
export function saveDocumentWithBackup(
  doc: ScriptDocument,
  isAutosave = false,
  isCrashRecovery = false
): { success: boolean; backupEntry?: ScriptBackupEntry; error?: string } {
  try {
    const settings = loadBackupSettings();

    // 1. Transactional write to crash recovery slot first (atomic scratchpad)
    const tempCrashKey = `${CRASH_RECOVERY_KEY}_temp`;
    const docJson = JSON.stringify(doc);
    localStorage.setItem(tempCrashKey, docJson);

    // Commit to crash recovery
    localStorage.setItem(CRASH_RECOVERY_KEY, docJson);
    localStorage.removeItem(tempCrashKey);

    // 2. Count words and pages
    const wordCount = doc.paragraphs.reduce(
      (acc, p) => acc + p.text.trim().split(/\s+/).filter(Boolean).length,
      0
    );
    const pages=documentLayout(doc).pages,pageCount=pages.length,pageLabels=pages.map(p=>p.pageLabel);

    // 3. Create Backup Entry
    const backupEntry: ScriptBackupEntry = {
      id: `backup-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      docId: doc.id,
      title: doc.titlePage.title || 'Untitled Screenplay',
      timestamp: new Date().toISOString(),
      wordCount,
      pageCount,pageLabels,
      isAutosave,
      isCrashRecovery,
      document: doc,
    };

    // 4. Update backups list with retention limit
    const allBackups = getAllBackups();
    // Prepend new backup
    const updated = [backupEntry, ...allBackups];

    // Filter and prune older backups for the same doc if exceeding retention count
    const pruned = updated.slice(0, settings.backupRetentionCount);

    try {
      localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(pruned));
    } catch (quotaErr) {
      // If quota exceeded, prune to 5 most recent
      const emergencyPrune = updated.slice(0, 5);
      localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(emergencyPrune));
    }

    // 5. Update Recent Documents list
    updateRecentDocuments({
      id: doc.id,
      title: doc.titlePage.title || 'Untitled Screenplay',
      author: doc.titlePage.author || 'Anonymous',
      lastModified: new Date().toISOString(),
      wordCount,
      pageCount,pageLabels,
    });

    // 6. Persist main document
    localStorage.setItem('fd13_autosave_script_v2', docJson);

    return { success: true, backupEntry };
  } catch (err: any) {
    console.error('Error saving document with backup:', err);
    return { success: false, error: err?.message || 'Storage error' };
  }
}

/**
 * Check if a crash recovery state exists and is newer or uncommitted
 */
export function checkCrashRecoveryState(currentSavedTime?: string): ScriptDocument | null {
  try {
    const raw = localStorage.getItem(CRASH_RECOVERY_KEY);
    if (raw) {
      const recoveredDoc: ScriptDocument = JSON.parse(raw);
      if (recoveredDoc && recoveredDoc.paragraphs && recoveredDoc.paragraphs.length > 0) {
        if (!currentSavedTime || new Date(recoveredDoc.lastSavedAt).getTime() > new Date(currentSavedTime).getTime()) {
          return recoveredDoc;
        }
      }
    }
  } catch (err) {
    console.error('Failed to parse crash recovery state', err);
  }
  return null;
}

/**
 * Clear crash recovery state after user acknowledged or dismissed
 */
export function clearCrashRecoveryState(): void {
  try {
    localStorage.removeItem(CRASH_RECOVERY_KEY);
  } catch (err) {
    console.error('Failed to clear crash recovery', err);
  }
}

/**
 * Update Recent Documents list
 */
export function updateRecentDocuments(item: RecentDocItem): void {
  try {
    const raw = localStorage.getItem(RECENT_DOCS_KEY);
    let list: RecentDocItem[] = raw ? JSON.parse(raw) : [];
    // Remove if exists
    list = list.filter((x) => x.id !== item.id && x.title !== item.title);
    list.unshift(item);
    // Keep max 15 recent
    localStorage.setItem(RECENT_DOCS_KEY, JSON.stringify(list.slice(0, 15)));
  } catch (err) {
    console.error('Failed to update recent docs', err);
  }
}

/**
 * Get Recent Documents list
 */
export function getRecentDocuments(): RecentDocItem[] {
  try {
    const raw = localStorage.getItem(RECENT_DOCS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed to get recent docs', err);
  }
  return [];
}

/**
 * Remove a single backup
 */
export function deleteBackupEntry(id: string): void {
  try {
    const all = getAllBackups();
    const updated = all.filter((b) => b.id !== id);
    localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to delete backup entry', err);
  }
}

/**
 * Clear all backups
 */
export function clearAllBackups(): void {
  try {
    localStorage.removeItem(BACKUP_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear backups', err);
  }
}
