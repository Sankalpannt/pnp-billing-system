import React, { useEffect, useState } from 'react';
import { useInvoiceStore } from './store/useInvoiceStore';
import { Sidebar } from './components/Sidebar';
import { InvoiceForm } from './components/InvoiceForm';
import { InvoicePreview } from './components/InvoicePreview';
import { InvoiceHistory } from './components/InvoiceHistory';
import { CustomerDirectory } from './components/CustomerDirectory';
import { ItemCatalogModal } from './components/ItemCatalogModal';
import { StockDatabaseSection } from './components/StockDatabaseSection';
import { CompanySettings } from './components/CompanySettings';
import { SalesAnalytics } from './components/SalesAnalytics';
import { CalculatorSection } from './components/CalculatorSection';
import { PasswordVaultSection } from './components/PasswordVaultSection';
import { ExcelPriceWorkerStore } from './components/ExcelPriceWorkerStore';
import { QuickCalculatorModal } from './components/QuickCalculatorModal';
import { WirelessScannerModal } from './components/WirelessScannerModal';
import { ScannerToast } from './components/ScannerToast';
import { useWirelessScanner } from './hooks/useWirelessScanner';
import { BrandTitle } from './components/BrandTitle';
import { AppLockScreen } from './components/AppLockScreen';
import { Loader2, Calculator, Smartphone } from 'lucide-react';

export const App: React.FC = () => {
  const { activeTab, initializeStore, isLoading, isAppLocked, companyDetails } = useInvoiceStore();
  const [showQuickCalc, setShowQuickCalc] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);

  // Wireless Scanner hook
  const {
    isServerOnline,
    isPhoneConnected,
    phoneDevices,
    networkInterfaces,
    selectedIp,
    setSelectedIp,
    scanHistory,
    tagRecords,
    toastMessage,
    dismissToast,
    simulateScan,
    refreshNetwork
  } = useWirelessScanner();

  useEffect(() => {
    initializeStore();
  }, [initializeStore]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4 text-white">
        <div className="relative">
          <Loader2 className="h-12 w-12 text-red-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-3 w-3 rounded-full bg-blue-500 animate-ping opacity-80" />
          </div>
        </div>
        <p className="text-sm font-semibold tracking-wider flex items-center gap-2">
          <span>Loading</span>
          <BrandTitle name="PNP TECH TRADERS" size="sm" />
          <span>System...</span>
        </p>
      </div>
    );
  }

  // 🔒 Front Software Access Password Lock
  const isLockActive = isAppLocked && companyDetails.securitySettings?.appLockEnabled !== false;
  if (isLockActive) {
    return <AppLockScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-sky-500 selection:text-white flex print:bg-white print:text-black print:block print:p-0 print:m-0 print:min-h-0 print:w-full relative">
      
      {/* Left Vertical Sidebar Navigation */}
      <Sidebar 
        onOpenScannerModal={() => setShowScannerModal(true)}
        isPhoneConnected={isPhoneConnected}
      />

      {/* Main Content Area */}
      <div className="flex-1 min-h-screen overflow-y-auto p-6 lg:p-8 print:p-0 print:m-0 print:min-h-0 print:overflow-visible print:w-full print:block">
        {activeTab === 'create' && <InvoiceForm />}
        {activeTab === 'stock' && <StockDatabaseSection />}
        {activeTab === 'preview' && <InvoicePreview />}
        {activeTab === 'excel_store' && <ExcelPriceWorkerStore />}
        {activeTab === 'calculator' && <CalculatorSection />}
        {activeTab === 'passwords' && <PasswordVaultSection />}
        {(activeTab === 'cctv_history' || activeTab === 'studio_history' || activeTab === 'counter_history' || activeTab === 'history') && <InvoiceHistory />}
        {activeTab === 'customers' && <CustomerDirectory />}
        {activeTab === 'catalog' && <ItemCatalogModal />}
        {activeTab === 'settings' && <CompanySettings />}
        {activeTab === 'analytics' && <SalesAnalytics />}
      </div>

      {/* Floating Action Buttons Container */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end space-y-2.5 print:hidden">
        {/* Floating Wireless Scanner Status Button */}
        <button
          type="button"
          onClick={() => setShowScannerModal(true)}
          className={`p-3.5 rounded-2xl shadow-2xl transition-all hover:scale-110 flex items-center space-x-2 border group ${
            isPhoneConnected
              ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-emerald-500/30 border-emerald-400/40 ring-2 ring-emerald-400/30'
              : 'bg-slate-900 hover:bg-slate-800 text-sky-400 border-slate-700 shadow-slate-950/50'
          }`}
          title={isPhoneConnected ? 'Phone Scanner Linked (Click to view)' : 'Pair Phone Scanner (Click to scan QR)'}
        >
          <Smartphone className={`h-5 w-5 ${isPhoneConnected ? 'animate-bounce' : ''}`} />
          <span className="text-xs font-bold hidden group-hover:inline-block transition-all pr-1">
            {isPhoneConnected ? 'Phone Linked' : 'Scanner QR'}
          </span>
          <span className={`w-2 h-2 rounded-full ${isPhoneConnected ? 'bg-white animate-ping' : 'bg-sky-400'}`} />
        </button>

        {/* Floating Quick Calculator Trigger Button */}
        {activeTab !== 'calculator' && (
          <button
            type="button"
            onClick={() => setShowQuickCalc(true)}
            className="p-3.5 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-2xl shadow-sky-500/40 border border-sky-400/40 transition-all hover:scale-110 flex items-center space-x-2 group"
            title="Open Quick Calculator (Alt+C)"
          >
            <Calculator className="h-5 w-5 animate-pulse" />
            <span className="text-xs font-bold hidden group-hover:inline-block transition-all pr-1">Quick Calc</span>
          </button>
        )}
      </div>

      {/* Floating Quick Calculator Modal */}
      <QuickCalculatorModal
        isOpen={showQuickCalc}
        onClose={() => setShowQuickCalc(false)}
      />

      {/* Wireless Scanner Pairing & Simulator Modal */}
      <WirelessScannerModal
        isOpen={showScannerModal}
        onClose={() => setShowScannerModal(false)}
        isServerOnline={isServerOnline}
        isPhoneConnected={isPhoneConnected}
        phoneDevices={phoneDevices}
        networkInterfaces={networkInterfaces}
        selectedIp={selectedIp}
        onSelectIp={setSelectedIp}
        scanHistory={scanHistory}
        tagRecords={tagRecords}
        onSimulateScan={simulateScan}
        onRefreshNetwork={refreshNetwork}
      />

      {/* Live Mobile Scan Toast Notification */}
      <ScannerToast
        toast={toastMessage}
        onDismiss={dismissToast}
      />

    </div>
  );
};

export default App;

