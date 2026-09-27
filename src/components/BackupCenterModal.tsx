import React, { useState, useRef, useEffect } from 'react';
import { 
  Cloud, CloudRain, HardDrive, Download, Upload, CheckCircle2, 
  AlertCircle, RefreshCw, Clock, Database, ShieldCheck, FolderOpen, Search, FolderSync, X, ExternalLink
} from 'lucide-react';
import { useInvoiceStore } from '../store/useInvoiceStore';
import { isElectron, getElectronIpc, openBackupFolderInExplorer } from '../utils/googleDriveBackup';
import { DatabaseSnapshot } from '../types/invoice';

interface BackupCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackupCenterModal: React.FC<BackupCenterModalProps> = ({ isOpen, onClose }) => {
  const { 
    companyDetails, 
    updateBackupSettings, 
    triggerManualBackup, 
    downloadBackupJSON, 
    restoreFromSnapshot, 
    backupHistory, 
    isBackingUp, 
    backupStatusMessage 
  } = useInvoiceStore();

  const backupSettings = companyDetails.backupSettings || {
    autoBackupEnabled: true,
    backupFrequency: 'on_save',
    googleDriveConnected: true,
    localSyncEnabled: true,
    lastBackupStatus: 'idle'
  };

  const [restoreFilePreview, setRestoreFilePreview] = useState<DatabaseSnapshot | null>(null);
  const [restoreMode, setRestoreMode] = useState<'overwrite' | 'merge'>('overwrite');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-detect on open if not already set
  useEffect(() => {
    if (isOpen && isElectron() && !backupSettings.localSyncFolderPath) {
      handleAutoDetectGDrive(true);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Electron folder selection
  const handleSelectLocalFolder = async () => {
    const ipc = getElectronIpc();
    if (!ipc) {
      alert('Local folder picker is available in the desktop application.');
      return;
    }

    try {
      const res = await ipc.invoke('backup-select-folder');
      if (res && res.path) {
        updateBackupSettings({
          localSyncFolderPath: res.path,
          localSyncEnabled: true,
          googleDriveConnected: true
        });
        setActionSuccess(`Backup directory linked to: ${res.path}`);
      }
    } catch (err: any) {
      setActionError('Failed to select directory: ' + err.message);
    }
  };

  // Auto detect Google Drive virtual drive on Windows
  const handleAutoDetectGDrive = async (silent = false) => {
    const ipc = getElectronIpc();
    if (!ipc) return;
    
    setIsDetecting(true);
    try {
      const detected = await ipc.invoke('backup-detect-gdrive');
      if (detected && detected.path) {
        updateBackupSettings({
          localSyncFolderPath: detected.path,
          localSyncEnabled: true,
          googleDriveConnected: true
        });
        if (!silent) {
          setActionSuccess(`Auto-detected Google Drive folder: ${detected.path}`);
        }
      }
    } catch (err: any) {
      if (!silent) {
        setActionError('Auto-detect error: ' + err.message);
      }
    } finally {
      setIsDetecting(false);
    }
  };

  // Open folder in Windows File Explorer
  const handleOpenFolder = async () => {
    const res = await openBackupFolderInExplorer(backupSettings.localSyncFolderPath);
    if (!res.success) {
      setActionError(res.error || 'Could not open directory in Windows Explorer.');
    }
  };

  // Handle local JSON file import
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed: DatabaseSnapshot = JSON.parse(event.target?.result as string);
        if (!parsed.invoices || !Array.isArray(parsed.invoices)) {
          throw new Error('Invalid backup file: invoices collection missing.');
        }
        setRestoreFilePreview(parsed);
      } catch (err: any) {
        setActionError('Failed to read backup file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  // Execute restore
  const handleExecuteRestore = async () => {
    if (!restoreFilePreview) return;
    if (!window.confirm(`Are you sure you want to restore ${restoreFilePreview.invoices.length} invoices and ${restoreFilePreview.customers?.length || 0} customers? (${restoreMode.toUpperCase()} mode)`)) {
      return;
    }

    try {
      await restoreFromSnapshot(restoreFilePreview, restoreMode);
      setRestoreFilePreview(null);
      setActionSuccess('Database successfully restored from backup snapshot!');
    } catch (err: any) {
      setActionError('Restore failed: ' + err.message);
    }
  };

  const isGDriveLinked = Boolean(backupSettings.localSyncFolderPath);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn print:hidden">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40">
          <div className="flex items-center space-x-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
              <Cloud className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-extrabold text-white">
                  Google Drive for Desktop - Automated Backup Center
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  REAL-TIME SYNC
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Continuous automated data protection synced directly with Google Drive for Desktop
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          
          {/* Notifications */}
          {actionSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{actionSuccess}</span>
              </div>
              <button onClick={() => setActionSuccess(null)} className="text-xs font-bold underline">Dismiss</button>
            </div>
          )}

          {actionError && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{actionError}</span>
              </div>
              <button onClick={() => setActionError(null)} className="text-xs font-bold underline">Dismiss</button>
            </div>
          )}

          {backupStatusMessage && (
            <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-300 flex items-center space-x-2">
              <RefreshCw className="h-4 w-4 shrink-0 animate-spin" />
              <span>{backupStatusMessage}</span>
            </div>
          )}

          {/* Google Drive for Desktop Status & Folder Linking Section */}
          <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <HardDrive className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-sm text-white">Google Drive Sync Folder</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isGDriveLinked 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {isGDriveLinked ? 'Linked & Active' : 'Ready to Link'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-mono break-all">
                    {backupSettings.localSyncFolderPath || 'G:\\My Drive\\PNP Tech Traders Backups (or default local folder)'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 shrink-0">
                {isElectron() && (
                  <>
                    <button
                      onClick={() => handleAutoDetectGDrive(false)}
                      disabled={isDetecting}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs flex items-center space-x-1.5 transition-all border border-slate-700"
                    >
                      <Search className={`h-3.5 w-3.5 text-sky-400 ${isDetecting ? 'animate-spin' : ''}`} />
                      <span>{isDetecting ? 'Scanning...' : 'Auto-Detect'}</span>
                    </button>

                    <button
                      onClick={handleSelectLocalFolder}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center space-x-1.5 transition-all shadow-md shadow-indigo-600/20"
                    >
                      <FolderSync className="h-3.5 w-3.5" />
                      <span>Browse / Link Folder</span>
                    </button>

                    <button
                      onClick={handleOpenFolder}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs flex items-center space-x-1.5 transition-all border border-slate-700"
                      title="Open backup folder in Windows File Explorer"
                    >
                      <FolderOpen className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Open Folder</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Quick Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="flex items-center space-x-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${backupSettings.autoBackupEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`}></span>
                  <span className="text-slate-300 font-semibold">Continuous Auto-Backup:</span>
                </div>
                <span className="font-bold text-white">
                  {backupSettings.autoBackupEnabled ? 'Enabled (On Every Save)' : 'Paused'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="flex items-center space-x-2">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-slate-300 font-semibold">Last Backup Time:</span>
                </div>
                <span className="font-mono font-bold text-slate-200">
                  {backupSettings.lastBackupTime ? new Date(backupSettings.lastBackupTime).toLocaleString() : 'Not recorded yet'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Guide Card: How Google Drive for Desktop Works */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-950/30 to-indigo-950/30 border border-sky-500/20 space-y-2">
            <h4 className="font-bold text-white flex items-center space-x-2">
              <Cloud className="h-4 w-4 text-sky-400" />
              <span>How Google Drive for Desktop Works</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-slate-300 pt-1">
              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/60 space-y-1">
                <span className="font-bold text-sky-300 block">1. Install Desktop App</span>
                <p className="text-slate-400">Download and sign into Google Drive for Desktop on your Windows PC.</p>
              </div>
              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/60 space-y-1">
                <span className="font-bold text-indigo-300 block">2. Auto-Detect Folder</span>
                <p className="text-slate-400">Click <strong>Auto-Detect</strong> above to link your <code className="text-sky-300">G:\My Drive</code> folder.</p>
              </div>
              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/60 space-y-1">
                <span className="font-bold text-emerald-300 block">3. 100% Automated Cloud Sync</span>
                <p className="text-slate-400">Every bill you save is backed up locally & Google Drive syncs it to cloud automatically.</p>
              </div>
            </div>
          </div>

          {/* Action Trigger Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => triggerManualBackup('Manual Backup Button')}
              disabled={isBackingUp}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 disabled:opacity-50 text-white font-bold shadow-lg shadow-sky-500/20 transition-all"
            >
              <Cloud className={`h-4 w-4 ${isBackingUp ? 'animate-spin' : ''}`} />
              <span>{isBackingUp ? 'Backing Up...' : 'Backup Now to Google Drive'}</span>
            </button>

            <button
              onClick={downloadBackupJSON}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold border border-slate-700 transition-all"
            >
              <Download className="h-4 w-4 text-emerald-400" />
              <span>Download Backup File (.json)</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold border border-slate-700 transition-all"
            >
              <Upload className="h-4 w-4 text-indigo-400" />
              <span>Restore Database from File</span>
            </button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept=".json"
              className="hidden"
            />
          </div>

          {/* Restore Confirmation Box (if a file is selected) */}
          {restoreFilePreview && (
            <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-4 animate-fadeIn">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h4 className="font-extrabold text-sm text-amber-300 flex items-center space-x-2">
                    <Database className="h-4 w-4" />
                    <span>Confirm Database Restore</span>
                  </h4>
                  <p className="text-slate-300">
                    Backup Date: <span className="font-mono font-bold text-white">{new Date(restoreFilePreview.exportedAt).toLocaleString()}</span>
                  </p>
                </div>
                <button onClick={() => setRestoreFilePreview(null)} className="text-slate-400 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <p className="text-slate-400 text-[10px]">Invoices to Restore</p>
                  <p className="text-base font-bold text-white font-mono mt-0.5">{restoreFilePreview.invoices?.length || 0}</p>
                </div>
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <p className="text-slate-400 text-[10px]">Customers</p>
                  <p className="text-base font-bold text-white font-mono mt-0.5">{restoreFilePreview.customers?.length || 0}</p>
                </div>
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <p className="text-slate-400 text-[10px]">Catalog Items</p>
                  <p className="text-base font-bold text-white font-mono mt-0.5">{restoreFilePreview.catalog?.length || 0}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2 cursor-pointer text-slate-300">
                    <input
                      type="radio"
                      name="restoreMode"
                      checked={restoreMode === 'overwrite'}
                      onChange={() => setRestoreMode('overwrite')}
                      className="text-amber-500 focus:ring-amber-500"
                    />
                    <span>Clean Overwrite (Recommended)</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer text-slate-300">
                    <input
                      type="radio"
                      name="restoreMode"
                      checked={restoreMode === 'merge'}
                      onChange={() => setRestoreMode('merge')}
                      className="text-amber-500 focus:ring-amber-500"
                    />
                    <span>Merge with existing</span>
                  </label>
                </div>

                <button
                  onClick={handleExecuteRestore}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-lg transition-all"
                >
                  Proceed with Restore
                </button>
              </div>
            </div>
          )}

          {/* Backup History Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-white">Recent Backup Snapshots</h3>
              <span className="text-[11px] text-slate-400">Total {backupHistory.length} snapshots recorded</span>
            </div>

            {backupHistory.length > 0 ? (
              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/60">
                <table className="w-full text-left">
                  <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-3">Location</th>
                      <th className="p-3">Backup File</th>
                      <th className="p-3">Invoices</th>
                      <th className="p-3">Size</th>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {backupHistory.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-900/40">
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center space-x-1 w-max">
                            <Cloud className="h-3 w-3" />
                            <span>Google Drive</span>
                          </span>
                        </td>
                        <td className="p-3 font-mono font-medium text-slate-200">{rec.fileName}</td>
                        <td className="p-3 font-mono text-slate-300">{rec.invoiceCount} invoices</td>
                        <td className="p-3 font-mono text-slate-400">{(rec.sizeBytes / 1024).toFixed(1)} KB</td>
                        <td className="p-3 text-slate-400">{new Date(rec.timestamp).toLocaleString()}</td>
                        <td className="p-3 text-right">
                          {isElectron() && (
                            <button
                              onClick={handleOpenFolder}
                              className="text-sky-400 hover:underline inline-flex items-center space-x-1 font-bold text-xs"
                            >
                              <span>Open in Drive</span>
                              <ExternalLink className="h-3 w-3" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-950/40 border border-slate-800 rounded-2xl text-slate-500">
                <CloudRain className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                <p>No backups recorded yet. Click "Backup Now to Google Drive" to create your first snapshot.</p>
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-[11px] text-slate-400">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Automatic Backup runs continuously whenever bills are created or modified</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
