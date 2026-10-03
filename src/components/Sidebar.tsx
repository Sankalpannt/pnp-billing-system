import React, { useState } from 'react';
import { 
  PlusCircle, Printer, History, Users, 
  Package, Settings, BarChart2, ShieldCheck, ShoppingCart, FileText, ChevronRight, Cloud, Calculator, Key, Smartphone, FileSpreadsheet,
  Clock, Lock, Boxes 
} from 'lucide-react';
import { useInvoiceStore } from '../store/useInvoiceStore';
import { DocumentType } from '../types/invoice';
import { BackupCenterModal } from './BackupCenterModal';
import { useLiveClock } from '../hooks/useLiveClock';
import { BrandTitle } from './BrandTitle';
import { BrandLogoBadge } from './BrandLogoBadge';

interface SidebarProps {
  onOpenScannerModal?: () => void;
  isPhoneConnected?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenScannerModal, isPhoneConnected }) => {
  const { activeTab, setActiveTab, companyDetails, resetInvoiceForm, savedInvoices, passwords, spreadsheetData, isBackingUp, lockApp, catalog } = useInvoiceStore();
  const [showBackupModal, setShowBackupModal] = useState(false);
  const liveClock = useLiveClock();

  const cctvCount = savedInvoices.filter(i => i.docType === 'cctv_invoice').length;
  const studioCount = savedInvoices.filter(i => i.docType === 'studio_invoice' || !i.docType).length;
  const counterCount = savedInvoices.filter(i => i.docType === 'counter_sale').length;
  const pwCount = passwords?.length || 0;
  const excelRowCount = spreadsheetData?.sheets?.reduce((sum, s) => sum + s.rows.length, 0) || 0;
  const lowStockCount = catalog?.filter(i => i.trackStock !== false && (Number(i.stockQty) || 0) <= (i.minStockAlert ?? 3)).length || 0;

  const isCloudSynced = Boolean(companyDetails.backupSettings?.localSyncFolderPath || companyDetails.backupSettings?.googleDriveConnected);

  const navItems: Array<{
    id: 'create' | 'stock' | 'preview' | 'excel_store' | 'cctv_history' | 'studio_history' | 'counter_history' | 'history' | 'analytics' | 'customers' | 'catalog' | 'settings' | 'calculator' | 'passwords';
    label: string;
    icon: any;
    badge: string | number | null;
  }> = [
    { id: 'create', label: 'Create Sale / Invoice', icon: PlusCircle, badge: null },
    { id: 'stock', label: 'Stock Database (गोदाम)', icon: Boxes, badge: lowStockCount > 0 ? `${lowStockCount} Low` : `${catalog?.length || 0}` },
    { id: 'excel_store', label: 'Shop Excel & Price Store', icon: FileSpreadsheet, badge: excelRowCount > 0 ? excelRowCount : 'Excel' },
    { id: 'preview', label: 'Print Preview (A4)', icon: Printer, badge: 'A4' },
    { id: 'calculator', label: 'Billing Calculator', icon: Calculator, badge: 'Calc' },
    { id: 'passwords', label: 'Password Vault', icon: Key, badge: pwCount > 0 ? pwCount : 'Vault' },
    { id: 'cctv_history', label: 'CCTV Sales Register', icon: ShieldCheck, badge: cctvCount },
    { id: 'studio_history', label: 'General Sales Register', icon: FileText, badge: studioCount },
    { id: 'counter_history', label: 'Counter Cash Sales', icon: ShoppingCart, badge: counterCount },
    { id: 'history', label: 'All Records Combined', icon: History, badge: savedInvoices.length },
    { id: 'analytics', label: 'Sales & Tax Analytics', icon: BarChart2, badge: null },
    { id: 'customers', label: 'Customer Directory', icon: Users, badge: null },
    { id: 'catalog', label: 'Item Catalog', icon: Package, badge: null },
    { id: 'settings', label: 'Company Settings', icon: Settings, badge: null },
  ];

  const totalSales = savedInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);

  const handleCreateNew = (docType: DocumentType) => {
    resetInvoiceForm(docType);
    setActiveTab('create');
  };

  return (
    <>
      <aside className="w-64 bg-slate-900 border-r border-slate-800/80 flex flex-col justify-between h-screen sticky top-0 z-40 select-none print:hidden shadow-2xl">
        
        {/* Top Branding & Navigation */}
        <div className="p-4 space-y-4 overflow-y-auto scrollbar-none">
          
          {/* Studio Logo & Name */}
          <div className="flex items-center space-x-3 cursor-pointer p-2 rounded-2xl hover:bg-slate-800/60 transition-all group border border-transparent hover:border-slate-700/50" onClick={() => setActiveTab('create')}>
            <BrandLogoBadge logoUrl={companyDetails.logoUrl} size="md" className="group-hover:scale-105" />
            <div className="min-w-0 flex-1">
              <BrandTitle name={companyDetails.studioName || 'PNP TECH TRADERS'} size="sm" />
              <div className="flex items-center space-x-1.5 mt-1">
                <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-red-500 to-blue-500 animate-pulse shrink-0" />
                <p className="text-[11px] text-slate-400 font-mono font-medium truncate">
                  PAN: <span className="text-sky-400 font-semibold">{companyDetails.panVatNo || '617322405'}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons: New CCTV Invoice vs Tax Invoice vs Cash Sale */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 px-1">
              New Transaction
            </p>

            <button
              onClick={() => handleCreateNew('cctv_invoice')}
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-sky-500/20 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center space-x-2">
                <ShieldCheck className="h-4 w-4" />
                <span>+ CCTV Sales Invoice</span>
              </div>
              <span className="text-[10px] font-mono opacity-80">{companyDetails.cctvPrefix}</span>
            </button>

            <button
              onClick={() => handleCreateNew('studio_invoice')}
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-md transition-all flex items-center justify-between group"
            >
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>+ General Sales Invoice</span>
              </div>
              <span className="text-[10px] font-mono opacity-80">{companyDetails.invoicePrefix}</span>
            </button>

            <button
              onClick={() => handleCreateNew('counter_sale')}
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md transition-all flex items-center justify-between group"
            >
              <div className="flex items-center space-x-2">
                <ShoppingCart className="h-4 w-4" />
                <span>+ Counter Cash Sale</span>
              </div>
              <span className="text-[10px] font-mono opacity-80">{companyDetails.salesPrefix}</span>
            </button>
          </div>

          {/* Quick Tools Row: Google Drive Backup & Wireless Scanner */}
          <div className="grid grid-cols-1 gap-1.5">
            {/* Wireless Mobile Scanner Button */}
            <button
              type="button"
              onClick={onOpenScannerModal}
              className={`w-full py-2 px-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-between ${
                isPhoneConnected
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300 hover:bg-emerald-950/60 shadow-lg shadow-emerald-500/10'
                  : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
              title="Pair Phone Camera Barcode Scanner"
            >
              <div className="flex items-center space-x-2.5">
                <Smartphone className={`h-4 w-4 ${isPhoneConnected ? 'text-emerald-400 animate-bounce' : 'text-sky-400'}`} />
                <span>Mobile Scanner</span>
              </div>
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded flex items-center space-x-1 ${
                isPhoneConnected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full mr-1 ${isPhoneConnected ? 'bg-emerald-400 animate-ping' : 'bg-sky-400'}`} />
                {isPhoneConnected ? 'Online' : 'Pair QR'}
              </span>
            </button>

            {/* Google Drive Automatic Backup Center Quick Button */}
            <button
              onClick={() => setShowBackupModal(true)}
              className={`w-full py-2 px-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-between ${
                isCloudSynced 
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300 hover:bg-emerald-950/60' 
                  : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Cloud className={`h-4 w-4 ${isBackingUp ? 'animate-spin text-sky-400' : isCloudSynced ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>Drive Backup</span>
              </div>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                {isCloudSynced ? 'Sync ON' : 'Auto'}
              </span>
            </button>
          </div>

          {/* Vertical Navigation Menu */}
          <div className="space-y-1 pt-1">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 px-3 mb-2">
              Main Navigation
            </p>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 group ${
                    isActive 
                      ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-xl shadow-sky-500/25 border border-sky-400/40 ring-2 ring-sky-400/30 scale-[1.02]' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/80 border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`h-4 w-4 transition-colors ${isActive ? 'text-white animate-pulse' : 'text-slate-400 group-hover:text-sky-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    {item.badge !== null && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                    {isActive && <ChevronRight className="h-3.5 w-3.5 text-white" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Live Date, Clock & Summary Stats Box */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/80 space-y-2">
          {/* Live Nepali & English Date & Clock Widget */}
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950/40 border border-slate-800 shadow-inner space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1 text-[10px] font-bold text-sky-400">
                <Clock className="h-3 w-3 animate-spin text-sky-400" style={{ animationDuration: '6s' }} />
                <span className="font-mono tracking-wider">{liveClock.time12}</span>
              </div>
              <span className="flex items-center space-x-1 text-[9px] font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>Live Date</span>
              </span>
            </div>

            {/* Nepali Devanagari Date */}
            <div className="text-[11px] font-bold text-white tracking-wide truncate">
              🇳🇵 {liveClock.formattedBSDevanagari}
            </div>

            {/* Gregorian Date & Fiscal Year */}
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono border-t border-slate-800/60 pt-1">
              <span>{liveClock.dateAD}</span>
              <span className="text-sky-400 font-bold">FY {companyDetails.fiscalYear || liveClock.fiscalYear}</span>
            </div>
          </div>

          {/* Quick Sales Total Pill */}
          <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/60 flex items-center justify-between text-[11px]">
            <span className="text-[10px] uppercase font-bold text-slate-400">Total Sales</span>
            <span className="font-black font-mono text-emerald-400">Rs. {totalSales.toLocaleString()}</span>
          </div>

          {/* Quick Lock Software Button */}
          <button
            type="button"
            onClick={lockApp}
            className="w-full py-2 px-3 rounded-xl bg-slate-900/90 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-500/40 text-[11px] font-bold transition-all flex items-center justify-between group shadow-sm"
            title="Lock software view immediately (सफ्टवेयर लक गर्नुहोस्)"
          >
            <div className="flex items-center space-x-2">
              <Lock className="h-3.5 w-3.5 text-slate-500 group-hover:text-rose-400 transition-colors" />
              <span>Lock Software</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500 group-hover:text-rose-400">
              सुरक्षा लक
            </span>
          </button>
        </div>

      </aside>

      {/* Backup Center Modal */}
      <BackupCenterModal
        isOpen={showBackupModal}
        onClose={() => setShowBackupModal(false)}
      />
    </>
  );
};
