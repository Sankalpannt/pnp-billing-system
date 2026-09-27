import React, { useState, useRef, useEffect } from 'react';
import { 
  Save, ShieldCheck, CreditCard, FileText, CheckCircle2, Building2, 
  Cloud, HardDrive, Download, Upload, RefreshCw, Database, 
  Image as ImageIcon, PenTool, QrCode, Trash2, FolderOpen, Search, FolderSync, Sparkles, DownloadCloud,
  Lock, KeyRound, Eye, EyeOff
} from 'lucide-react';
import { useInvoiceStore } from '../store/useInvoiceStore';
import { CompanyDetails, DatabaseSnapshot } from '../types/invoice';
import { isElectron, getElectronIpc, openBackupFolderInExplorer } from '../utils/googleDriveBackup';
import { getTodayDates } from '../utils/nepaliDate';
import { BrandTitle } from './BrandTitle';

export const CompanySettings: React.FC = () => {
  const { 
    companyDetails, 
    updateCompanyDetails, 
    updateBackupSettings, 
    triggerManualBackup, 
    downloadBackupJSON, 
    restoreFromSnapshot, 
    isBackingUp, 
    backupStatusMessage,
    lockApp
  } = useInvoiceStore();

  const [formData, setFormData] = useState<CompanyDetails>(companyDetails);
  const [showMasterPassword, setShowMasterPassword] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [restoreFilePreview, setRestoreFilePreview] = useState<DatabaseSnapshot | null>(null);
  const [restoreMode, setRestoreMode] = useState<'overwrite' | 'merge'>('overwrite');
  const [statusAlert, setStatusAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Software Update State
  const [appVersion, setAppVersion] = useState('1.0.0');
  const [updateStatus, setUpdateStatus] = useState<{ status: string; message: string; version?: string; percent?: number } | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  useEffect(() => {
    const ipc = getElectronIpc();
    if (ipc) {
      ipc.invoke('get-app-version').then((v: string) => {
        if (v) setAppVersion(v);
      }).catch(() => {});

      const handleUpdaterEvent = (_event: any, data: any) => {
        setUpdateStatus(data);
        setIsCheckingUpdate(false);
      };

      ipc.on('updater-event', handleUpdaterEvent);
      return () => {
        ipc.removeListener('updater-event', handleUpdaterEvent);
      };
    }
  }, []);

  const handleCheckUpdates = async () => {
    const ipc = getElectronIpc();
    if (!ipc) {
      setUpdateStatus({
        status: 'web',
        message: 'You are running in web browser mode. Client updates apply to the desktop application.'
      });
      return;
    }
    setIsCheckingUpdate(true);
    setUpdateStatus({ status: 'checking', message: 'Connecting to update server...' });
    try {
      const res = await ipc.invoke('check-app-update');
      if (res && res.status === 'dev-mode') {
        setUpdateStatus({ status: 'dev-mode', message: res.message });
      } else if (res && !res.success) {
        setUpdateStatus({ status: 'error', message: res.error || 'Failed to check for updates.' });
      }
    } catch (err: any) {
      setUpdateStatus({ status: 'error', message: err.message });
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleApplyUpdateNow = () => {
    const ipc = getElectronIpc();
    if (ipc) {
      ipc.invoke('install-app-update');
    }
  };

  // File input refs for Logo, Signature, Stamp, and QR
  const logoInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const stampInputRef = useRef<HTMLInputElement>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Image Upload (JPEG, PNG, JPG, WebP) and convert to Base64
  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'logoUrl' | 'signatureUrl' | 'stampUrl' | 'qrCodeUrl'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type (PNG, JPEG, JPG, WebP)
    const isValidImage = file.type.match(/^image\/(png|jpeg|jpg|webp)$/i) || file.name.match(/\.(png|jpe?g|webp)$/i);
    if (!isValidImage) {
      alert('Please select a valid image file (PNG, JPG, or JPEG).');
      return;
    }

    // Limit to 5MB
    if (file.size > 5 * 1024 * 1024) {
      alert('Image file size is too large (maximum 5MB allowed).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setFormData(prev => ({ ...prev, [field]: result }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const backupSettings = formData.backupSettings || companyDetails.backupSettings || {
    autoBackupEnabled: true,
    backupFrequency: 'on_save',
    googleDriveConnected: true,
    localSyncEnabled: true,
    lastBackupStatus: 'idle'
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompanyDetails(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Google Drive for Desktop Folder Picker
  const handleSelectLocalFolder = async () => {
    const ipc = getElectronIpc();
    if (!ipc) {
      alert('Local folder picker is available in the desktop application.');
      return;
    }

    try {
      const res = await ipc.invoke('backup-select-folder');
      if (res && res.path) {
        const updated = {
          ...backupSettings,
          localSyncFolderPath: res.path,
          localSyncEnabled: true,
          googleDriveConnected: true
        };
        setFormData(prev => ({ ...prev, backupSettings: updated }));
        updateBackupSettings(updated);
        setStatusAlert({ type: 'success', message: `Google Drive backup directory set to: ${res.path}` });
      }
    } catch (err: any) {
      setStatusAlert({ type: 'error', message: 'Folder selection error: ' + err.message });
    }
  };

  // Auto detect Google Drive virtual drive
  const handleAutoDetectGDrive = async () => {
    const ipc = getElectronIpc();
    if (!ipc) return;
    try {
      const detected = await ipc.invoke('backup-detect-gdrive');
      if (detected && detected.path) {
        const updated = {
          ...backupSettings,
          localSyncFolderPath: detected.path,
          localSyncEnabled: true,
          googleDriveConnected: true
        };
        setFormData(prev => ({ ...prev, backupSettings: updated }));
        updateBackupSettings(updated);
        setStatusAlert({ type: 'success', message: `Auto-detected Google Drive folder: ${detected.path}` });
      }
    } catch (err: any) {
      setStatusAlert({ type: 'error', message: 'Auto-detect error: ' + err.message });
    }
  };

  // Open folder in Windows File Explorer
  const handleOpenFolder = async () => {
    const res = await openBackupFolderInExplorer(backupSettings.localSyncFolderPath);
    if (!res.success) {
      setStatusAlert({ type: 'error', message: res.error || 'Could not open folder in Explorer.' });
    }
  };

  // File restore handling
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed: DatabaseSnapshot = JSON.parse(event.target?.result as string);
        if (!parsed.invoices || !Array.isArray(parsed.invoices)) {
          throw new Error('Invalid backup file: invoices list not found.');
        }
        setRestoreFilePreview(parsed);
      } catch (err: any) {
        setStatusAlert({ type: 'error', message: 'Failed to read backup file: ' + err.message });
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = async () => {
    if (!restoreFilePreview) return;
    if (!window.confirm(`Restore ${restoreFilePreview.invoices.length} invoices and ${restoreFilePreview.customers?.length || 0} customers? (${restoreMode.toUpperCase()} mode)`)) {
      return;
    }

    try {
      await restoreFromSnapshot(restoreFilePreview, restoreMode);
      setRestoreFilePreview(null);
      setFormData(companyDetails);
      setStatusAlert({ type: 'success', message: 'Database successfully restored!' });
    } catch (err: any) {
      setStatusAlert({ type: 'error', message: 'Restore error: ' + err.message });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 print:hidden">
      
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            Company Preferences & System Settings
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage company profile, PAN number, automatic Google Drive backup, document prefixes, and bank details
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold animate-bounce">
            <CheckCircle2 className="h-4 w-4" />
            <span>Settings Saved!</span>
          </div>
        )}
      </div>

      {/* Alerts */}
      {statusAlert && (
        <div className={`p-4 rounded-2xl border text-xs flex items-center justify-between ${
          statusAlert.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          <span>{statusAlert.message}</span>
          <button onClick={() => setStatusAlert(null)} className="font-bold underline ml-3">Dismiss</button>
        </div>
      )}

      {backupStatusMessage && (
        <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs flex items-center space-x-2">
          <RefreshCw className="h-4 w-4 shrink-0 animate-spin" />
          <span>{backupStatusMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* 🎨 1. Company Logo, Authorized Signature & Stamp */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2 text-sky-400">
              <ImageIcon className="h-5 w-5" />
              <h3 className="font-bold text-sm text-white">Company Logo, Invoice Signature & Stamp</h3>
            </div>
            <span className="text-[10px] font-mono font-bold text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
              PNG / JPG / JPEG / WEBP
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* 1. Company Logo */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-white flex items-center space-x-1.5">
                  <ImageIcon className="h-4 w-4 text-sky-400" />
                  <span>Company / Studio Logo</span>
                </label>
                
                {/* Logo Preview Box */}
                <div className="h-28 w-full bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-center p-2 relative overflow-hidden group">
                  {formData.logoUrl ? (
                    <img 
                      src={formData.logoUrl} 
                      alt="Company Logo" 
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <div className="text-center space-y-1 text-slate-500">
                      <ImageIcon className="h-8 w-8 mx-auto opacity-40" />
                      <p className="text-[11px]">No Logo Uploaded</p>
                      <p className="text-[9px] text-slate-600">Default initials will appear on bills</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="flex-1 py-2 px-3 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center space-x-1.5"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>{formData.logoUrl ? 'Change Logo' : 'Upload Logo'}</span>
                  </button>

                  {formData.logoUrl && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, logoUrl: '' }))}
                      className="p-2 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 rounded-xl transition-all"
                      title="Remove Logo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <input
                  type="file"
                  ref={logoInputRef}
                  onChange={(e) => handleImageUpload(e, 'logoUrl')}
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  className="hidden"
                />

                <p className="text-[10px] text-slate-400 leading-tight">
                  Supports <strong>PNG</strong> (transparent), <strong>JPG</strong>, and <strong>JPEG</strong>. Appears at top-left of printed invoices.
                </p>
              </div>
            </div>

            {/* 2. Authorized Signature (Invoice Sign) */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-white flex items-center space-x-1.5">
                  <PenTool className="h-4 w-4 text-emerald-400" />
                  <span>Authorized Signature (हस्ताक्षर)</span>
                </label>
                
                {/* Signature Preview Box (White/Light Canvas for clear contrast) */}
                <div className="h-28 w-full bg-slate-100 border border-slate-300 rounded-xl flex items-center justify-center p-2 relative overflow-hidden shadow-inner">
                  {formData.signatureUrl ? (
                    <img 
                      src={formData.signatureUrl} 
                      alt="Authorized Signature" 
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <div className="text-center space-y-1 text-slate-400">
                      <PenTool className="h-8 w-8 mx-auto opacity-30 text-slate-600" />
                      <p className="text-[11px] text-slate-500 font-medium">No Signature Uploaded</p>
                      <p className="text-[9px] text-slate-400">Blank line for physical pen signature</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => signatureInputRef.current?.click()}
                    className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center space-x-1.5"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>{formData.signatureUrl ? 'Change Signature' : 'Upload Signature'}</span>
                  </button>

                  {formData.signatureUrl && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, signatureUrl: '' }))}
                      className="p-2 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 rounded-xl transition-all"
                      title="Remove Signature"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <input
                  type="file"
                  ref={signatureInputRef}
                  onChange={(e) => handleImageUpload(e, 'signatureUrl')}
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  className="hidden"
                />

                <p className="text-[10px] text-slate-400 leading-tight">
                  Supports <strong>PNG</strong>, <strong>JPG</strong>, and <strong>JPEG</strong>. Prints digitally above <em>"Authorized Signatory"</em>.
                </p>
              </div>
            </div>

            {/* 3. Official Company Stamp / Seal */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-white flex items-center space-x-1.5">
                  <ShieldCheck className="h-4 w-4 text-indigo-400" />
                  <span>Official Stamp / Seal (कम्पनी छाप)</span>
                </label>
                
                {/* Stamp Preview Box */}
                <div className="h-28 w-full bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-center p-2 relative overflow-hidden">
                  {formData.stampUrl ? (
                    <img 
                      src={formData.stampUrl} 
                      alt="Company Stamp" 
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <div className="text-center space-y-1 text-slate-500">
                      <ShieldCheck className="h-8 w-8 mx-auto opacity-40" />
                      <p className="text-[11px]">Optional Company Stamp</p>
                      <p className="text-[9px] text-slate-600">Prints next to signature</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => stampInputRef.current?.click()}
                    className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center space-x-1.5"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>{formData.stampUrl ? 'Change Stamp' : 'Upload Stamp'}</span>
                  </button>

                  {formData.stampUrl && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, stampUrl: '' }))}
                      className="p-2 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 rounded-xl transition-all"
                      title="Remove Stamp"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <input
                  type="file"
                  ref={stampInputRef}
                  onChange={(e) => handleImageUpload(e, 'stampUrl')}
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  className="hidden"
                />

                <p className="text-[10px] text-slate-400 leading-tight">
                  Supports <strong>PNG</strong>, <strong>JPG</strong>, and <strong>JPEG</strong>. Stamped next to the signature on A4 bills.
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* 2. Business Profile & PAN Information */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center space-x-2 text-sky-400 border-b border-slate-800 pb-3">
            <Building2 className="h-5 w-5" />
            <h3 className="font-bold text-sm text-white">Business Identification & PAN Details</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-300">
                  CCTV / Tech Business Name *
                </label>
                <div className="flex items-center gap-1.5 bg-slate-900/90 px-2 py-0.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400">Preview:</span>
                  <BrandTitle name={formData.studioName || 'PNP TECH TRADERS'} size="xs" />
                </div>
              </div>
              <input
                type="text"
                required
                value={formData.studioName}
                onChange={(e) => setFormData({ ...formData, studioName: e.target.value })}
                placeholder="e.g. PNP TECH TRADERS"
                className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-3 py-2.5 text-xs text-white font-bold"
              />
              <p className="text-[10px] text-slate-500 mt-1">Printed on CCTV Sales & Installation Bills</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                General Sales / Photo Studio Name *
              </label>
              <input
                type="text"
                required
                value={formData.generalBusinessName || ''}
                onChange={(e) => setFormData({ ...formData, generalBusinessName: e.target.value })}
                placeholder="e.g. PARICHAYA PHOTO STUDIO"
                className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-3 py-2.5 text-xs text-white font-bold"
              />
              <p className="text-[10px] text-slate-500 mt-1">Printed on General Sales & Studio Bills</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                <span>PAN / VAT Number *</span>
                <span className="text-[10px] text-sky-400 font-mono">Nepal IRD Compliant</span>
              </label>
              <input
                type="text"
                required
                value={formData.panVatNo}
                onChange={(e) => setFormData({ ...formData, panVatNo: e.target.value })}
                placeholder="617322405"
                className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Primary Business Tagline
              </label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                placeholder="CCTV Security Systems, IT Networking & Tech Sales"
                className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                General Sales / Studio Tagline
              </label>
              <input
                type="text"
                value={formData.generalBusinessTagline || ''}
                onChange={(e) => setFormData({ ...formData, generalBusinessTagline: e.target.value })}
                placeholder="Digital Photography, Framing, Printing & General Sales"
                className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Address / Location
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Pokhara 27, Talchok"
                className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                City / District
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Pokhara"
                className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Primary Phone Number
              </label>
              <input
                type="text"
                value={formData.phonePrimary}
                onChange={(e) => setFormData({ ...formData, phonePrimary: e.target.value })}
                placeholder="+977 9740777765"
                className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Secondary Phone / Landline
              </label>
              <input
                type="text"
                value={formData.phoneSecondary}
                onChange={(e) => setFormData({ ...formData, phoneSecondary: e.target.value })}
                placeholder="Optional secondary phone"
                className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="pnptechtraders@gmail.com"
                className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-300">
                  Active Fiscal Year
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const { fiscalYear } = getTodayDates();
                    setFormData({ ...formData, fiscalYear });
                  }}
                  className="text-[10px] text-sky-400 hover:text-sky-300 font-semibold flex items-center space-x-1"
                  title="Auto-calculate current Nepal Fiscal Year from today's date"
                >
                  <Sparkles className="h-3 w-3 text-amber-300" />
                  <span>Auto-Detect FY</span>
                </button>
              </div>
              <input
                type="text"
                value={formData.fiscalYear}
                onChange={(e) => setFormData({ ...formData, fiscalYear: e.target.value })}
                placeholder="2083-84"
                className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold"
              />
            </div>
          </div>
        </div>

        {/* 2. Google Drive & Automatic Cloud Data Backup */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2 text-sky-400">
              <Cloud className="h-5 w-5 animate-pulse" />
              <h3 className="font-bold text-sm text-white">Google Drive Automatic Cloud Backup</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              REAL-TIME SYNC
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            All customer records, sales bills, item catalogs, and accounting records are automatically protected and backed up to Google Drive continuously.
          </p>

          <div className="space-y-4">
            
            {/* Google Drive for Desktop Card */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="h-9 w-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <HardDrive className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-white">Google Drive Desktop Sync Folder</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        backupSettings.localSyncFolderPath 
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {backupSettings.localSyncFolderPath ? 'Linked' : 'Ready'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                      {backupSettings.localSyncFolderPath || 'G:\\My Drive\\PNP Tech Traders Backups'}
                    </p>
                  </div>
                </div>

                {isElectron() && (
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleAutoDetectGDrive}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center space-x-1.5 transition-all border border-slate-700"
                    >
                      <Search className="h-3.5 w-3.5 text-sky-400" />
                      <span>Auto-Detect</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSelectLocalFolder}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md shadow-indigo-600/20"
                    >
                      <FolderSync className="h-3.5 w-3.5" />
                      <span>Browse Folder</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenFolder}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center space-x-1.5 transition-all border border-slate-700"
                    >
                      <FolderOpen className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Open Folder</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Auto Backup Toggle */}
              <label className="flex items-center space-x-3 p-3 bg-slate-900 border border-slate-800/80 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={backupSettings.autoBackupEnabled}
                  onChange={(e) => {
                    const updated = { ...backupSettings, autoBackupEnabled: e.target.checked };
                    setFormData(prev => ({ ...prev, backupSettings: updated }));
                    updateBackupSettings(updated);
                  }}
                  className="rounded text-sky-500 focus:ring-sky-500 h-4 w-4"
                />
                <div>
                  <span className="text-xs font-bold text-white block">Continuous Real-Time Backup</span>
                  <span className="text-[11px] text-slate-400">Creates snapshots automatically on invoice save, edit, and delete</span>
                </div>
              </label>
            </div>

          </div>

          {/* Action Buttons: Backup Now & Download & Restore */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => triggerManualBackup('Manual Settings')}
              disabled={isBackingUp}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-sky-500/20 transition-all"
            >
              <Cloud className={`h-4 w-4 ${isBackingUp ? 'animate-spin' : ''}`} />
              <span>{isBackingUp ? 'Backing Up...' : 'Backup Now to Google Drive'}</span>
            </button>

            <button
              type="button"
              onClick={downloadBackupJSON}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all"
            >
              <Download className="h-4 w-4 text-emerald-400" />
              <span>Download Backup File (.json)</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all"
            >
              <Upload className="h-4 w-4 text-indigo-400" />
              <span>Restore from Backup (.json)</span>
            </button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept=".json"
              className="hidden"
            />
          </div>

          {/* Restore Confirmation */}
          {restoreFilePreview && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-300 flex items-center space-x-1.5">
                  <Database className="h-4 w-4" />
                  <span>Restore Snapshot ({restoreFilePreview.invoices?.length || 0} Invoices, {restoreFilePreview.customers?.length || 0} Customers)</span>
                </span>
                <button type="button" onClick={() => setRestoreFilePreview(null)} className="text-slate-400 hover:text-white">Cancel</button>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center space-x-3 text-xs">
                  <label className="flex items-center space-x-1.5 text-slate-300">
                    <input
                      type="radio"
                      name="settingsRestoreMode"
                      checked={restoreMode === 'overwrite'}
                      onChange={() => setRestoreMode('overwrite')}
                      className="text-amber-500"
                    />
                    <span>Clean Overwrite</span>
                  </label>
                  <label className="flex items-center space-x-1.5 text-slate-300">
                    <input
                      type="radio"
                      name="settingsRestoreMode"
                      checked={restoreMode === 'merge'}
                      onChange={() => setRestoreMode('merge')}
                      className="text-amber-500"
                    />
                    <span>Merge</span>
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleExecuteRestore}
                  className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black"
                >
                  Execute Restore
                </button>
              </div>
            </div>
          )}

        </div>

        {/* 3. Tax Registration & Document Prefixes */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center space-x-2 text-sky-400 border-b border-slate-800 pb-3">
            <ShieldCheck className="h-5 w-5" />
            <h3 className="font-bold text-sm text-white">Tax Registration & Document Prefixes</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                CCTV Invoice Prefix
              </label>
              <input
                type="text"
                value={formData.cctvPrefix || 'CCTV'}
                onChange={(e) => setFormData({ ...formData, cctvPrefix: e.target.value })}
                placeholder="CCTV"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Tax Bill / Invoice Prefix
              </label>
              <input
                type="text"
                value={formData.invoicePrefix || 'INV'}
                onChange={(e) => setFormData({ ...formData, invoicePrefix: e.target.value })}
                placeholder="INV"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Counter Cash Prefix
              </label>
              <input
                type="text"
                value={formData.salesPrefix || 'SALE'}
                onChange={(e) => setFormData({ ...formData, salesPrefix: e.target.value })}
                placeholder="SALE"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
            </div>
          </div>

          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center space-x-2 p-3 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isVatRegistered}
                onChange={(e) => setFormData({ ...formData, isVatRegistered: e.target.checked })}
                className="rounded text-sky-500 focus:ring-sky-500"
              />
              <span className="text-xs font-medium text-white">VAT Registered Business (Standard 13% Tax Invoice enabled)</span>
            </label>

            <label className="flex items-center space-x-2 p-3 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={formData.showDiscountByDefault ?? true}
                onChange={(e) => setFormData({ ...formData, showDiscountByDefault: e.target.checked })}
                className="rounded text-sky-500 focus:ring-sky-500"
              />
              <span className="text-xs font-medium text-white">Enable Discount Column by Default on New Invoices</span>
            </label>
          </div>
        </div>

        {/* 4. Bank & Payment Details */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center space-x-2 text-sky-400 border-b border-slate-800 pb-3">
            <CreditCard className="h-5 w-5" />
            <h3 className="font-bold text-sm text-white">Bank Account Details (For Print Invoices)</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Bank Name
              </label>
              <input
                type="text"
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Account Holder Name
              </label>
              <input
                type="text"
                value={formData.accountName}
                onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Account Number
              </label>
              <input
                type="text"
                value={formData.accountNumber}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold"
              />
            </div>
          </div>

          {/* Payment QR Code Uploader */}
          <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="h-14 w-14 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center p-1 overflow-hidden">
                {formData.qrCodeUrl ? (
                  <img src={formData.qrCodeUrl} alt="Payment QR" className="max-h-full max-w-full object-contain" />
                ) : (
                  <QrCode className="h-6 w-6 text-slate-600" />
                )}
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Payment QR Code (eSewa / Fonepay / Bank QR)</span>
                <span className="text-[11px] text-slate-400">Supports PNG, JPG, and JPEG</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={async () => {
                  if (typeof window !== 'undefined' && (window as any).require) {
                    try {
                      const { ipcRenderer } = (window as any).require('electron');
                      if (ipcRenderer) {
                        await ipcRenderer.invoke('open-payment-qr-folder');
                        return;
                      }
                    } catch {}
                  }
                  alert('Payment QR folder is located at: E:\\parichiya system\\payment qr\n\nYou can drop any PNG or JPG payment QR image into this folder.');
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center space-x-1.5"
                title="Open payment qr folder in Windows File Explorer"
              >
                <FolderOpen className="h-3.5 w-3.5 text-amber-400" />
                <span>Open Folder</span>
              </button>

              <button
                type="button"
                onClick={() => qrInputRef.current?.click()}
                className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center space-x-1.5"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>{formData.qrCodeUrl ? 'Change QR' : 'Upload QR'}</span>
              </button>

              {formData.qrCodeUrl && (
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, qrCodeUrl: '' }))}
                  className="p-1.5 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 rounded-xl transition-all"
                  title="Remove QR Code"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}

              <input
                type="file"
                ref={qrInputRef}
                onChange={(e) => handleImageUpload(e, 'qrCodeUrl')}
                accept="image/png, image/jpeg, image/jpg, image/webp"
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* 5. Terms & Conditions */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center space-x-2 text-sky-400 border-b border-slate-800 pb-3">
            <FileText className="h-5 w-5" />
            <h3 className="font-bold text-sm text-white">Default Invoice Terms & Conditions</h3>
          </div>

          <div>
            <textarea
              rows={4}
              value={formData.defaultTerms}
              onChange={(e) => setFormData({ ...formData, defaultTerms: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl p-3 text-xs text-white font-sans leading-relaxed"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              These terms will automatically appear at the bottom of all printed bills and invoices.
            </p>
          </div>
        </div>

        {/* 6. Software Version & Silent Cloud Updates */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2 text-sky-400">
              <DownloadCloud className="h-5 w-5" />
              <h3 className="font-bold text-sm text-white">Software Delivery & Client Updates</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
              Version v{appVersion}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800/80">
            <div className="space-y-1">
              <p className="text-xs font-bold text-white flex items-center space-x-2">
                <span>Safe Client Update Packaging</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Data Protected
                </span>
              </p>
              <p className="text-[11px] text-slate-400">
                Invoices, customers, catalog, and passwords are stored safely in <code className="text-sky-300 font-mono">%APPDATA%\PNP Tech Traders Billing</code> and Google Drive.
                Updates will never erase or touch your client database.
              </p>
            </div>

            <button
              type="button"
              onClick={handleCheckUpdates}
              disabled={isCheckingUpdate}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs flex items-center space-x-2 transition-all shrink-0 border border-slate-700 shadow"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-sky-400 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
              <span>{isCheckingUpdate ? 'Checking...' : 'Check for Updates'}</span>
            </button>
          </div>

          {updateStatus && (
            <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
              updateStatus.status === 'downloaded'
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                : updateStatus.status === 'error'
                ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                : 'bg-sky-500/10 border-sky-500/40 text-sky-300'
            }`}>
              <div className="flex items-center space-x-2">
                <span className="font-medium">{updateStatus.message}</span>
                {updateStatus.percent !== undefined && (
                  <span className="font-mono font-bold">({updateStatus.percent}%)</span>
                )}
              </div>

              {updateStatus.status === 'downloaded' && (
                <button
                  type="button"
                  onClick={handleApplyUpdateNow}
                  className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs ml-3 transition-colors shrink-0"
                >
                  Restart &amp; Install Now ⚡
                </button>
              )}
            </div>
          )}
        </div>

        {/* 🔒 7. Software Access Security & Password Lock */}
        {(() => {
          const sec = formData.securitySettings || {
            appLockEnabled: true,
            masterPassword: 'pnp2083',
            securityQuestion: 'Company Name',
            securityAnswer: 'PNP TECH TRADERS'
          };

          const handleSecChange = (field: string, val: any) => {
            setFormData(prev => ({
              ...prev,
              securitySettings: {
                ...(prev.securitySettings || {
                  appLockEnabled: true,
                  masterPassword: 'pnp2083',
                  securityQuestion: 'Company Name',
                  securityAnswer: 'PNP TECH TRADERS'
                }),
                [field]: val
              }
            }));
          };

          return (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2 text-indigo-400">
                  <Lock className="h-5 w-5" />
                  <div>
                    <h3 className="font-bold text-sm text-white">Software Access Security & Password Lock</h3>
                    <p className="text-[10px] text-slate-400">सफ्टवेयर पहुँच सुरक्षा तथा मास्टर पासवर्ड लक</p>
                  </div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  sec.appLockEnabled
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}>
                  {sec.appLockEnabled ? 'LOCK ACTIVATED' : 'LOCK DISABLED'}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Control master security protection for the billing system. When enabled, accessing the software requires the master password.
              </p>

              {/* Master Lock Toggle */}
              <label className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer hover:border-indigo-500/40 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg border ${sec.appLockEnabled ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Enable Software Password Lock (सफ्टवेयर लक सक्रिय गर्नुहोस्)</span>
                    <span className="text-[11px] text-slate-400">Protects bills, customer ledgers, and transactions from unauthorized eyes</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={sec.appLockEnabled}
                  onChange={(e) => handleSecChange('appLockEnabled', e.target.checked)}
                  className="rounded text-indigo-500 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                />
              </label>

              {/* Password Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                    <span>Master Password / PIN *</span>
                    <span className="text-[10px] text-indigo-400 font-mono">Default: pnp2083</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showMasterPassword ? 'text' : 'password'}
                      required={sec.appLockEnabled}
                      value={sec.masterPassword}
                      onChange={(e) => handleSecChange('masterPassword', e.target.value)}
                      placeholder="Enter master password"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-3 pr-10 py-2 text-xs text-white font-mono font-bold tracking-wider"
                    />
                    <button
                      type="button"
                      onClick={() => setShowMasterPassword(!showMasterPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      tabIndex={-1}
                    >
                      {showMasterPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Can be PIN (e.g. 2083) or word password</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Security Question (Emergency Recovery)
                  </label>
                  <input
                    type="text"
                    value={sec.securityQuestion || 'Company Name'}
                    onChange={(e) => handleSecChange('securityQuestion', e.target.value)}
                    placeholder="e.g. Company Name"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Verification question if password is lost</p>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Security Answer (सुरक्षा उत्तर)
                  </label>
                  <input
                    type="text"
                    value={sec.securityAnswer || 'PNP TECH TRADERS'}
                    onChange={(e) => handleSecChange('securityAnswer', e.target.value)}
                    placeholder="e.g. PNP TECH TRADERS"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Answering this will reset the software password back to default (<strong>pnp2083</strong>).
                  </p>
                </div>
              </div>

              {/* Fail-Safe Notice */}
              <div className="p-3 bg-indigo-950/30 border border-indigo-500/20 rounded-xl flex items-start space-x-3 text-xs text-indigo-300">
                <ShieldCheck className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-white">Owner Permanent Bypass Protection (कहिले पनि लक नहुने व्यवस्था):</p>
                  <p className="text-[11px] text-indigo-200/90 leading-relaxed">
                    In an emergency, entering your registered PAN (<strong className="font-mono text-white">{formData.panVatNo || '617322405'}</strong>) directly into the password screen will immediately unlock the software.
                  </p>
                </div>
              </div>

              {/* Quick Lock Trigger */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-800">
                <span className="text-[11px] text-slate-400">
                  Save preferences and test locking the screen immediately:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    updateCompanyDetails(formData);
                    lockApp();
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-rose-300 hover:text-rose-200 text-xs font-bold border border-rose-500/30 flex items-center justify-center space-x-1.5 transition-all shadow-sm"
                >
                  <Lock className="h-3.5 w-3.5" />
                  <span>Lock Software Now (सफ्टवेयर लक गर्नुहोस्)</span>
                </button>
              </div>
            </div>
          );
        })()}

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-sky-500/20 transition-all"
          >
            <Save className="h-4 w-4" />
            <span>Save Company Preferences</span>
          </button>
        </div>

      </form>
    </div>
  );
};
