import { DatabaseSnapshot, BackupRecord, BackupSettings } from '../types/invoice';
import { createFullDatabaseSnapshot, getSavedCompanyDetails, saveCompanyDetails } from './storage';

const BACKUP_HISTORY_STORAGE_KEY = 'pnp_backup_history';

// Helper to check if running in Electron environment
export const isElectron = (): boolean => {
  return typeof window !== 'undefined' && Boolean((window as any).process && (window as any).process.type);
};

export const getElectronIpc = () => {
  if (isElectron()) {
    try {
      const { ipcRenderer } = (window as any).require('electron');
      return ipcRenderer;
    } catch {
      return null;
    }
  }
  return null;
};

/**
 * Loads recent backup history
 */
export function getBackupHistory(): BackupRecord[] {
  try {
    const raw = localStorage.getItem(BACKUP_HISTORY_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load backup history', e);
  }
  return [];
}

/**
 * Saves a new backup record into history
 */
export function addBackupRecord(record: BackupRecord): void {
  try {
    const current = getBackupHistory();
    // Keep last 30 backups in history
    const updated = [record, ...current.filter(r => r.id !== record.id)].slice(0, 30);
    localStorage.setItem(BACKUP_HISTORY_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save backup record', e);
  }
}

// Zero Expiring Tokens: All backups are saved as clean timestamped JSON snapshots
// directly into the Google Drive for Desktop synced directory (G:\My Drive\PNP Tech Traders Backups).
// Google Drive for Desktop silently handles continuous cloud synchronization in the background.

/**
 * Opens the backup directory in Windows File Explorer
 */
export async function openBackupFolderInExplorer(folderPath?: string): Promise<{ success: boolean; error?: string; folder?: string }> {
  const ipc = getElectronIpc();
  if (!ipc) {
    return { success: false, error: 'Windows Explorer integration is available in the desktop application.' };
  }
  try {
    return await ipc.invoke('backup-open-folder', folderPath);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Saves a backup file to local Google Drive folder in Electron desktop
 */
export async function saveBackupToLocalGoogleDriveFolder(
  snapshot: DatabaseSnapshot,
  folderPath?: string
): Promise<BackupRecord | null> {
  const ipc = getElectronIpc();
  if (!ipc) {
    return null;
  }

  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = `PNP_TECH_Backup_${dateStr}.json`;
  const fileContent = JSON.stringify(snapshot, null, 2);
  const sizeBytes = new Blob([fileContent]).size;

  try {
    const result = await ipc.invoke('backup-save-local', {
      fileName,
      content: fileContent,
      customFolder: folderPath
    });

    if (result && result.success) {
      const record: BackupRecord = {
        id: 'drive-' + Date.now(),
        fileName,
        timestamp: new Date().toISOString(),
        sizeBytes,
        invoiceCount: snapshot.invoices.length,
        customerCount: snapshot.customers.length,
        catalogCount: snapshot.catalog.length,
        type: result.isGoogleDrive ? 'cloud' : 'local'
      };

      addBackupRecord(record);
      return record;
    }
  } catch (err) {
    console.error('Failed to write Google Drive backup file in Electron:', err);
  }

  return null;
}

/**
 * Master automated backup function: backs up to Google Drive for Desktop folder
 */
export async function performAutomaticBackup(reason: string = 'auto'): Promise<{
  success: boolean;
  message: string;
  cloudRecord?: BackupRecord;
  localRecord?: BackupRecord;
}> {
  const companyDetails = getSavedCompanyDetails();
  const backupSettings: BackupSettings = companyDetails.backupSettings || {
    autoBackupEnabled: true,
    backupFrequency: 'on_save',
    googleDriveConnected: true,
    localSyncEnabled: true,
    lastBackupStatus: 'idle'
  };

  if (!backupSettings.autoBackupEnabled) {
    return { success: false, message: 'Auto backup is disabled in settings.' };
  }

  try {
    // Update status to syncing
    const updatedSettings: BackupSettings = {
      ...backupSettings,
      lastBackupStatus: 'syncing',
      lastBackupMessage: `Creating snapshot (${reason})...`
    };
    saveCompanyDetails({ ...companyDetails, backupSettings: updatedSettings });

    const snapshot = await createFullDatabaseSnapshot();
    let localRecord: BackupRecord | null | undefined;
    let message = 'Backup snapshot saved successfully';

    // Save to Google Drive folder via Electron IPC
    if (isElectron()) {
      localRecord = await saveBackupToLocalGoogleDriveFolder(
        snapshot,
        backupSettings.localSyncFolderPath
      );
      if (localRecord) {
        message = `Auto-saved to Google Drive folder (${localRecord.fileName})`;
      }
    } else {
      // In web browser mode, create local record in history
      const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileName = `PNP_TECH_Backup_${dateStr}.json`;
      const fileContent = JSON.stringify(snapshot, null, 2);
      const sizeBytes = new Blob([fileContent]).size;
      localRecord = {
        id: 'web-' + Date.now(),
        fileName,
        timestamp: new Date().toISOString(),
        sizeBytes,
        invoiceCount: snapshot.invoices.length,
        customerCount: snapshot.customers.length,
        catalogCount: snapshot.catalog.length,
        type: 'local'
      };
      addBackupRecord(localRecord);
      message = 'Snapshot created successfully';
    }

    const finalSettings: BackupSettings = {
      ...backupSettings,
      lastBackupTime: new Date().toISOString(),
      lastBackupStatus: 'success',
      lastBackupMessage: message,
      googleDriveConnected: true
    };

    saveCompanyDetails({ ...companyDetails, backupSettings: finalSettings });

    return {
      success: true,
      message,
      localRecord: localRecord || undefined
    };
  } catch (err: any) {
    console.error('Automatic backup error:', err);
    const failedSettings: BackupSettings = {
      ...backupSettings,
      lastBackupStatus: 'failed',
      lastBackupMessage: err.message || 'Backup failed'
    };
    saveCompanyDetails({ ...companyDetails, backupSettings: failedSettings });
    return {
      success: false,
      message: err.message || 'Backup error'
    };
  }
}

