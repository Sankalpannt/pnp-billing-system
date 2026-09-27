import React, { useState } from 'react';
import { 
  PlusCircle, Printer, History, Users, 
  Package, Settings, BarChart2, Cloud, Calculator, Key 
} from 'lucide-react';
import { useInvoiceStore } from '../store/useInvoiceStore';
import { BackupCenterModal } from './BackupCenterModal';
import { useLiveClock } from '../hooks/useLiveClock';
import { BrandTitle } from './BrandTitle';
import { BrandLogoBadge } from './BrandLogoBadge';
import { triggerAppPrint } from '../utils/printHelper';

export const Navbar: React.FC = () => {
  const { activeTab, setActiveTab, companyDetails, resetInvoiceForm, isBackingUp } = useInvoiceStore();
  const [showBackupModal, setShowBackupModal] = useState(false);
  const liveClock = useLiveClock();

  const navItems = [
    { id: 'create', label: 'Create Invoice', icon: PlusCircle },
    { id: 'preview', label: 'Print Preview (A4)', icon: Printer },
    { id: 'calculator', label: 'Calculator', icon: Calculator },
    { id: 'passwords', label: 'Passwords', icon: Key },
    { id: 'history', label: 'Invoice Records', icon: History },
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'catalog', label: 'Item Catalog', icon: Package },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  const isCloudSynced = Boolean(companyDetails.backupSettings?.localSyncFolderPath || companyDetails.backupSettings?.googleDriveConnected);

  return (
    <>
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-xl print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Brand Logo & Name */}
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('create')}>
              <BrandLogoBadge logoUrl={companyDetails.logoUrl} size="sm" />
              <div>
                <div className="flex items-center space-x-2">
                  <BrandTitle name={companyDetails.studioName || 'PNP TECH TRADERS'} size="md" />
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-red-500/10 to-blue-500/10 text-slate-200 border border-slate-700 font-mono font-medium">
                    {companyDetails.isVatRegistered ? 'VAT Registered' : 'PAN'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 flex items-center space-x-2">
                  <span>PAN/VAT: <strong className="font-mono text-slate-300">{companyDetails.panVatNo || '617322405'}</strong></span>
                  <span>•</span>
                  <span className="text-sky-400 font-semibold">🇳🇵 {liveClock.formattedBSDevanagari}</span>
                  <span>•</span>
                  <span className="font-mono text-slate-300">{liveClock.time12}</span>
                </p>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="hidden lg:flex items-center space-x-1.5 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800/80">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                      isActive 
                        ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/30 border border-sky-400/40 ring-2 ring-sky-400/30 scale-[1.02]' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? 'text-white animate-pulse' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                    {isActive && (
                      <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping ml-0.5"></span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Quick Actions */}
            <div className="flex items-center space-x-2">
              
              {/* Google Drive Backup Status Button */}
              <button
                onClick={() => setShowBackupModal(true)}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                  isCloudSynced 
                    ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
                title="Google Drive Automatic Backup Status"
              >
                <Cloud className={`h-4 w-4 ${isBackingUp ? 'animate-spin text-sky-400' : isCloudSynced ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span className="hidden sm:inline">{isCloudSynced ? 'Drive Synced' : 'Drive Backup'}</span>
              </button>

              <button
                onClick={() => {
                  resetInvoiceForm();
                  setActiveTab('create');
                }}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-all"
              >
                <PlusCircle className="h-4 w-4" />
                <span className="hidden sm:inline">New Invoice</span>
              </button>

              {activeTab === 'preview' && (
                <button
                  onClick={() => triggerAppPrint()}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold shadow-lg shadow-sky-500/30 transition-all animate-pulse"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print</span>
                </button>
              )}
            </div>
          </div>

          {/* Mobile Navigation Row */}
          <div className="lg:hidden flex items-center space-x-1.5 overflow-x-auto py-2.5 border-t border-slate-800 scrollbar-none">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    isActive 
                      ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md border border-sky-400/30' 
                      : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Backup Center Modal */}
      <BackupCenterModal
        isOpen={showBackupModal}
        onClose={() => setShowBackupModal(false)}
      />
    </>
  );
};
