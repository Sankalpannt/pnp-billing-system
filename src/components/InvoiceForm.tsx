import React, { useState, useEffect } from 'react';
import { 
  User, Phone, MapPin, Hash, CreditCard, 
  Plus, Save, Printer, RefreshCw, Layers, Search, 
  Tag, Check, Copy, Smartphone, Trash2, X, ChevronDown, ChevronUp,
  Boxes 
} from 'lucide-react';
import { useInvoiceStore } from '../store/useInvoiceStore';
import { LineItemRow } from './LineItemRow';
import { NepaliDatePicker } from './NepaliDatePicker';
import { formatNPR } from '../utils/formatters';
import { formatBSDate } from '../utils/nepaliDate';
import { TaxMode, PaymentStatus, PaymentMethod, DocumentType } from '../types/invoice';

export const InvoiceForm: React.FC = () => {
  const {
    currentInvoice,
    catalog,
    customers,
    setDocumentType,
    setCctvDetails,
    setInvoiceDates,
    updateCustomerInfo,
    selectCustomer,
    addLineItem,
    updateLineItem,
    removeLineItem,
    setTaxMode,
    setShowDiscount,
    setPaymentDetails,
    setInvoiceNotes,
    saveCurrentInvoice,
    resetInvoiceForm,
    setActiveTab,
    isEditing
  } = useInvoiceStore();

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showQuickPresets, setShowQuickPresets] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('pnp_show_presets');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });
  const [quickCatFilter, setQuickCatFilter] = useState<string>(
    currentInvoice.docType === 'cctv_invoice' ? 'CCTV & Security' : 'All'
  );

  // 📱 Active Scanner / Barcode Real-Time Field State
  const [activeScanInput, setActiveScanInput] = useState('');

  const processScannedBarcode = (rawCode: string) => {
    const text = rawCode.trim();
    if (!text) return;

    // 1. Search for matching catalog item
    const matched = catalog.find(c => 
      (c.code && c.code.toLowerCase() === text.toLowerCase()) ||
      (c.description && c.description.toLowerCase() === text.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(text.toLowerCase()))
    );

    if (matched) {
      addLineItem({
        description: matched.description,
        unit: matched.unit,
        listPrice: matched.price,
        qty: 1
      });
    } else {
      addLineItem({
        description: text,
        unit: 'Pcs',
        listPrice: 0,
        qty: 1
      });
    }

    // 2. If docType is CCTV or text looks like serial number, also append to serialNumbers
    if (currentInvoice.docType === 'cctv_invoice' || /^([A-Z0-9-]{6,})/i.test(text)) {
      const cleanSn = text.replace(/^SN:/i, '').trim();
      const currentSn = currentInvoice.serialNumbers?.trim() || '';
      const updatedSn = currentSn ? `${currentSn}, ${cleanSn}` : cleanSn;
      setCctvDetails(currentInvoice.installationSite || '', currentInvoice.warrantyInfo || '', updatedSn);
    }
  };

  const handleActiveScanKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (activeScanInput.trim()) {
        processScannedBarcode(activeScanInput);
        setActiveScanInput('');
      }
    }
  };

  // 🏷️ Tag Number & CCTV Serial Number Finder State
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [selectedTagNumber, setSelectedTagNumber] = useState<string>('TAG-01');
  const [tagCopiedFeedback, setTagCopiedFeedback] = useState<string | null>(null);
  const [tagRecords, setTagRecords] = useState<Record<string, { tagNumber: string; sectionName?: string; serials: string[] }>>(() => {
    try {
      const saved = localStorage.getItem('pnp_scanner_tag_records');
      return saved ? JSON.parse(saved) : {
        'TAG-01': {
          tagNumber: 'TAG-01',
          sectionName: 'Main Entrance & Gate Cameras',
          serials: ['HK20839218', 'HK20839219', 'HK20839220', 'HK20839221']
        },
        'BOX-A': {
          tagNumber: 'BOX-A',
          sectionName: '8CH 4K NVR & Storage Unit',
          serials: ['DH7719283-NVR', 'WD-PURPLE-4TB']
        }
      };
    } catch {
      return {};
    }
  });

  const [isTagSectionCollapsed, setIsTagSectionCollapsed] = useState<boolean>(false);

  // Sync tag records from localStorage on focus or periodic poll
  useEffect(() => {
    const refreshTags = () => {
      try {
        const saved = localStorage.getItem('pnp_scanner_tag_records');
        if (saved) {
          setTagRecords(JSON.parse(saved));
        }
      } catch {}
    };

    window.addEventListener('storage', refreshTags);
    const interval = setInterval(refreshTags, 2000);
    return () => {
      window.removeEventListener('storage', refreshTags);
      clearInterval(interval);
    };
  }, []);

  // Delete an entire Tag
  const handleDeleteTag = (tagToDelete: string) => {
    const updated = { ...tagRecords };
    delete updated[tagToDelete.toUpperCase()];
    delete updated[tagToDelete];
    setTagRecords(updated);
    try {
      localStorage.setItem('pnp_scanner_tag_records', JSON.stringify(updated));
      window.dispatchEvent(new Event('storage'));
    } catch {}

    const remaining = Object.keys(updated);
    if ((selectedTagNumber || '').toUpperCase() === tagToDelete.toUpperCase()) {
      setSelectedTagNumber(remaining.length > 0 ? remaining[0] : '');
    }
  };

  // Delete a single S/N from a Tag
  const handleDeleteSerial = (tagNumber: string, serialToDelete: string) => {
    const tagKey = Object.keys(tagRecords).find(k => k.toUpperCase() === tagNumber.toUpperCase()) || tagNumber;
    const currentRecord = tagRecords[tagKey];
    if (!currentRecord) return;

    const updatedSerials = currentRecord.serials.filter(s => s !== serialToDelete);
    const updated = {
      ...tagRecords,
      [tagKey]: {
        ...currentRecord,
        serials: updatedSerials
      }
    };
    setTagRecords(updated);
    try {
      localStorage.setItem('pnp_scanner_tag_records', JSON.stringify(updated));
      window.dispatchEvent(new Event('storage'));
    } catch {}
  };

  // Clear all scanned tags
  const handleClearAllTags = () => {
    if (window.confirm('Are you sure you want to remove all scanned tags and serial numbers? (सबै स्क्यान गरिएका ट्याग र सिरियल नं हटाउन चाहनुहुन्छ?)')) {
      setTagRecords({});
      setSelectedTagNumber('');
      try {
        localStorage.setItem('pnp_scanner_tag_records', JSON.stringify({}));
        window.dispatchEvent(new Event('storage'));
      } catch {}
    }
  };

  // Sync quick category filter when document type changes
  React.useEffect(() => {
    if (currentInvoice.docType === 'cctv_invoice') {
      setQuickCatFilter('CCTV & Security');
    } else {
      setQuickCatFilter('All');
    }
  }, [currentInvoice.docType]);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone.includes(customerSearch)
  );

  const totalQtyCount = currentInvoice.items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);

  const [isSaving, setIsSaving] = useState(false);

  const handleSaveOnly = async () => {
    try {
      setIsSaving(true);
      await saveCurrentInvoice();
    } catch (err: any) {
      alert('Could not save invoice: ' + (err?.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndPrint = async () => {
    try {
      setIsSaving(true);
      await saveCurrentInvoice();
      setActiveTab('preview');
    } catch (err: any) {
      alert('Could not save invoice: ' + (err?.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 print:hidden">
      
      {/* Document Type Switcher Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center space-x-1.5 w-full sm:w-auto">
          {[
            { id: 'cctv_invoice', label: 'CCTV Sales & Installation', desc: 'Hardware & System Sales' },
            { id: 'studio_invoice', label: 'General Sales Invoice', desc: 'General Products & Merchandise' },
            { id: 'counter_sale', label: 'Counter Cash Sale', desc: 'Walk-in Retail Cash' },
          ].map((doc) => {
            const isSelected = (currentInvoice.docType || 'cctv_invoice') === doc.id;
            return (
              <button
                key={doc.id}
                type="button"
                onClick={() => setDocumentType(doc.id as DocumentType)}
                className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-left transition-all ${
                  isSelected
                    ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/20 border border-sky-400/40'
                    : 'bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <p className="text-xs font-bold">{doc.label}</p>
                <p className="text-[10px] text-slate-300/80 mt-0.5">{doc.desc}</p>
              </button>
            );
          })}
        </div>

        <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center space-x-2 text-xs font-mono">
          <span className="text-slate-400">Current Ref:</span>
          <span className="font-bold text-sky-400">{currentInvoice.invoiceNumber}</span>
        </div>
      </div>

      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/80 border border-slate-700/60 p-4 rounded-2xl shadow-lg backdrop-blur-md">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              {isEditing ? 'Edit Transaction' : (
                currentInvoice.docType === 'cctv_invoice' ? 'New CCTV Sales Invoice' :
                currentInvoice.docType === 'counter_sale' ? 'New Counter Cash Voucher' : 'New General Sales Invoice'
              )}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
              {currentInvoice.invoiceNumber}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-sans">
              🇳🇵 मिति: {currentInvoice.dateBS} ({formatBSDate(currentInvoice.dateBS, true)})
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Standard Nepali Billing & Invoice System • FY {currentInvoice.fiscalYear}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => resetInvoiceForm()}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium transition-all"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Reset Form</span>
          </button>
          
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveOnly}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? 'Saving...' : 'Save Invoice'}</span>
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveAndPrint}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-sky-500/20 transition-all cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>{isSaving ? 'Saving...' : 'Save & Print A4'}</span>
          </button>
        </div>
      </div>

      {/* Main Form Layout: Customer & Invoice Metadata */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Customer Details */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2 text-sky-400">
              <User className="h-5 w-5" />
              <h3 className="font-bold text-sm text-white">Party / Customer Information</h3>
            </div>
            <button
              type="button"
              onClick={() => setShowCustomerModal(true)}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 text-xs font-medium border border-sky-500/20 transition-colors"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Select Saved Party</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Customer Name */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Party / Buyer Name <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  value={currentInvoice.customerName}
                  onChange={(e) => updateCustomerInfo({ customerName: e.target.value, customerAddress: currentInvoice.customerAddress, customerPhone: currentInvoice.customerPhone, customerPanVat: currentInvoice.customerPanVat })}
                  placeholder="e.g. Ram Kumar Shrestha / Company Ltd."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 font-medium"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Contact Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  value={currentInvoice.customerPhone}
                  onChange={(e) => updateCustomerInfo({ customerName: currentInvoice.customerName, customerAddress: currentInvoice.customerAddress, customerPhone: e.target.value, customerPanVat: currentInvoice.customerPanVat })}
                  placeholder="e.g. 9856012345 / 061-520123"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 font-mono"
                />
              </div>
            </div>

            {/* Customer Address */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Address / Location
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  value={currentInvoice.customerAddress}
                  onChange={(e) => updateCustomerInfo({ customerName: currentInvoice.customerName, customerAddress: e.target.value, customerPhone: currentInvoice.customerPhone, customerPanVat: currentInvoice.customerPanVat })}
                  placeholder="e.g. Lakeside, Pokhara-06"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500"
                />
              </div>
            </div>

            {/* Bill Number / PAN Number */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Bill Number / PAN No. <span className="text-slate-500">(Optional)</span>
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  value={currentInvoice.customerPanVat}
                  onChange={(e) => updateCustomerInfo({ customerName: currentInvoice.customerName, customerAddress: currentInvoice.customerAddress, customerPhone: currentInvoice.customerPhone, customerPanVat: e.target.value })}
                  placeholder="e.g. BILL-101 or 601928374"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 font-mono"
                />
              </div>
            </div>

            {/* CCTV Specific: Installation Site & Serial Numbers */}
            {currentInvoice.docType === 'cctv_invoice' && (
              <>
                <div className="sm:col-span-2 p-3.5 bg-gradient-to-r from-sky-950/40 to-slate-900 border border-sky-500/30 rounded-2xl space-y-3.5 shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-sky-400 font-bold text-xs">
                      <MapPin className="h-4 w-4" />
                      <span>CCTV Installation Site & Hardware Details</span>
                    </div>
                    <div className="flex items-center space-x-1.5 text-[11px] text-sky-300/80 bg-sky-500/10 px-2 py-0.5 rounded-md border border-sky-500/20">
                      <Smartphone className="h-3 w-3 text-sky-400" />
                      <span>Phone Scanner Tag Sync Active</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Installation Site / Project Address
                      </label>
                      <input
                        type="text"
                        value={currentInvoice.installationSite || ''}
                        onChange={(e) => setCctvDetails(e.target.value, currentInvoice.warrantyInfo || '', currentInvoice.serialNumbers || '')}
                        placeholder="e.g. Hotel Annapurna, Main Gate & Lobby, Pokhara"
                        className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-semibold text-slate-300">
                          Hardware Serial Numbers (S/N)
                        </label>
                        {currentInvoice.serialNumbers && (
                          <button
                            type="button"
                            onClick={() => setCctvDetails(currentInvoice.installationSite || '', currentInvoice.warrantyInfo || '', '')}
                            className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center space-x-1 transition-colors"
                            title="Clear all hardware serial numbers (सबै सिरियल हटाउनुहोस्)"
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                            <span>Clear S/N</span>
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={currentInvoice.serialNumbers || ''}
                        onChange={(e) => setCctvDetails(currentInvoice.installationSite || '', currentInvoice.warrantyInfo || '', e.target.value)}
                        placeholder="e.g. DVR S/N: HK90123; CAM 1-4 S/N: C78910-14"
                        className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono"
                      />
                    </div>
                  </div>

                  {/* 🏷️ Tag Number & Mobile S/N Quick Search Bar */}
                  <div className="pt-2 border-t border-slate-800/80 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => setIsTagSectionCollapsed(!isTagSectionCollapsed)}
                          className="flex items-center space-x-1.5 text-xs font-bold text-sky-400 hover:text-sky-300 transition-colors"
                          title="Toggle Tag Finder visibility"
                        >
                          <Tag className="h-3.5 w-3.5" />
                          <span>Find CCTV S/N by Tag Number (ट्याग नम्बरबाट सिरियल नं खोज्नुहोस्):</span>
                          {isTagSectionCollapsed ? (
                            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                          ) : (
                            <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                          )}
                        </button>
                        {Object.keys(tagRecords).length > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                            {Object.keys(tagRecords).length} {Object.keys(tagRecords).length === 1 ? 'Tag' : 'Tags'}
                          </span>
                        )}
                      </div>
                      
                      {/* Search / Filter Tag Input & Clear All */}
                      {!isTagSectionCollapsed && (
                        <div className="flex items-center space-x-2 flex-1 sm:max-w-xs">
                          <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
                            <input
                              type="text"
                              value={tagSearchQuery}
                              onChange={(e) => {
                                setTagSearchQuery(e.target.value);
                                if (e.target.value.trim()) {
                                  setSelectedTagNumber(e.target.value.trim().toUpperCase());
                                }
                              }}
                              placeholder="Type Tag # (e.g. TAG-01, BOX-A)..."
                              className="w-full bg-slate-900 border border-slate-700/80 focus:border-sky-400 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-500 font-mono"
                            />
                            {tagSearchQuery && (
                              <button
                                type="button"
                                onClick={() => setTagSearchQuery('')}
                                className="absolute right-2 top-2 text-slate-500 hover:text-slate-300"
                                title="Clear search"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Clear All Tags Button */}
                          {Object.keys(tagRecords).length > 0 && (
                            <button
                              type="button"
                              onClick={handleClearAllTags}
                              title="Clear all saved tags (सबै ट्याग हटाउनुहोस्)"
                              className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 rounded-xl text-[11px] font-semibold flex items-center space-x-1 transition-all shrink-0"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span className="hidden sm:inline">Clear All</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {!isTagSectionCollapsed && (
                      <>
                        {/* Available Tag Chips with scroll constraint */}
                        <div className="flex items-center gap-1.5 flex-wrap max-h-28 overflow-y-auto pr-1">
                          <span className="text-[11px] font-semibold text-slate-400">Tags from Phone:</span>
                          {Object.keys(tagRecords).length === 0 ? (
                            <span className="text-[11px] text-slate-500 italic">No tags scanned yet. Scan with phone scanner to populate!</span>
                          ) : (
                            Object.entries(tagRecords)
                              .filter(([tag]) => !tagSearchQuery || tag.toLowerCase().includes(tagSearchQuery.toLowerCase()))
                              .map(([tag, record]) => {
                                const isSelected = (selectedTagNumber || '').toUpperCase() === tag.toUpperCase();
                                return (
                                  <div
                                    key={tag}
                                    className={`group/tagchip inline-flex items-center rounded-lg text-xs font-mono font-bold transition-all border ${
                                      isSelected
                                        ? 'bg-sky-600 text-white border-sky-400 shadow-md shadow-sky-600/30 ring-1 ring-sky-300'
                                        : 'bg-slate-900 hover:bg-slate-800 text-sky-400 border-slate-700 hover:border-sky-500/50'
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => setSelectedTagNumber(tag)}
                                      className="px-2.5 py-1 flex items-center space-x-1.5"
                                    >
                                      <span>🏷️ {tag}</span>
                                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-sky-500/20 text-sky-300'}`}>
                                        {record.serials.length} S/N
                                      </span>
                                    </button>
                                    {/* Quick remove tag button */}
                                    <button
                                      type="button"
                                      title={`Delete ${tag}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteTag(tag);
                                      }}
                                      className={`px-1.5 py-1 transition-colors border-l ${
                                        isSelected
                                          ? 'border-sky-400/40 text-sky-200 hover:text-white hover:bg-sky-700'
                                          : 'border-slate-800 text-slate-500 hover:text-rose-400 hover:bg-rose-500/20'
                                      }`}
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                );
                              })
                          )}
                        </div>

                        {/* Selected Tag Serial Numbers Preview Card */}
                        {selectedTagNumber && tagRecords[selectedTagNumber.toUpperCase()] && (
                          <div className="p-3 bg-slate-950/80 border border-sky-500/30 rounded-xl space-y-2">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center space-x-2 flex-wrap">
                                <span className="text-xs font-bold text-sky-300 font-mono">
                                  🏷️ {selectedTagNumber.toUpperCase()}
                                </span>
                                {tagRecords[selectedTagNumber.toUpperCase()].sectionName && (
                                  <span className="text-[11px] text-slate-400 font-medium">
                                    • {tagRecords[selectedTagNumber.toUpperCase()].sectionName}
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-500 font-mono">
                                  ({tagRecords[selectedTagNumber.toUpperCase()].serials.length} S/N)
                                </span>
                              </div>

                              <div className="flex items-center space-x-2 flex-wrap">
                                {/* Copy S/N button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const allSn = tagRecords[selectedTagNumber.toUpperCase()].serials.join(', ');
                                    navigator.clipboard.writeText(allSn);
                                    setTagCopiedFeedback(selectedTagNumber);
                                    setTimeout(() => setTagCopiedFeedback(null), 2000);
                                  }}
                                  className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] rounded-lg border border-slate-700 flex items-center space-x-1"
                                >
                                  {tagCopiedFeedback === selectedTagNumber ? (
                                    <>
                                      <Check className="h-3 w-3 text-emerald-400" />
                                      <span className="text-emerald-400 font-bold">Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="h-3 w-3" />
                                      <span>Copy</span>
                                    </>
                                  )}
                                </button>

                                {/* Insert All S/N into Invoice button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const serialsList = tagRecords[selectedTagNumber.toUpperCase()].serials;
                                    if (serialsList.length === 0) return;
                                    const formattedSn = `[${selectedTagNumber.toUpperCase()}] ${serialsList.join(', ')}`;
                                    const currentSn = currentInvoice.serialNumbers?.trim() || '';
                                    const updated = currentSn ? `${currentSn}, ${formattedSn}` : formattedSn;
                                    setCctvDetails(currentInvoice.installationSite || '', currentInvoice.warrantyInfo || '', updated);
                                  }}
                                  className="px-3 py-1 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs rounded-lg shadow transition-all flex items-center space-x-1.5"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  <span>Insert All ({tagRecords[selectedTagNumber.toUpperCase()].serials.length} S/N)</span>
                                </button>

                                {/* Delete Tag button */}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTag(selectedTagNumber)}
                                  title="Delete this tag (ट्याग हटाउनुहोस्)"
                                  className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 text-[11px] rounded-lg flex items-center space-x-1 transition-colors"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  <span>Delete Tag</span>
                                </button>
                              </div>
                            </div>

                            {/* Individual S/N Pills with scroll constraint and delete (x) button */}
                            {tagRecords[selectedTagNumber.toUpperCase()].serials.length === 0 ? (
                              <div className="flex items-center justify-between py-1 text-slate-500 text-[11px] italic">
                                <span>No serial numbers remaining in this tag.</span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTag(selectedTagNumber)}
                                  className="text-[10px] text-rose-400 hover:underline not-italic font-sans"
                                >
                                  Remove empty tag
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 flex-wrap pt-1 max-h-36 overflow-y-auto pr-1">
                                {tagRecords[selectedTagNumber.toUpperCase()].serials.map((sn, idx) => (
                                  <div
                                    key={idx}
                                    className="group/snpill inline-flex items-center rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] font-mono border border-slate-800 hover:border-sky-500/40 transition-colors overflow-hidden"
                                  >
                                    <button
                                      type="button"
                                      title="Click to insert this single S/N into invoice"
                                      onClick={() => {
                                        const currentSn = currentInvoice.serialNumbers?.trim() || '';
                                        const updated = currentSn ? `${currentSn}, ${sn}` : sn;
                                        setCctvDetails(currentInvoice.installationSite || '', currentInvoice.warrantyInfo || '', updated);
                                      }}
                                      className="px-2 py-0.5 hover:text-sky-300 flex items-center space-x-1"
                                    >
                                      <span>+ {sn}</span>
                                    </button>
                                    <button
                                      type="button"
                                      title={`Remove ${sn} from ${selectedTagNumber}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteSerial(selectedTagNumber, sn);
                                      }}
                                      className="px-1.5 py-0.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/20 border-l border-slate-800 transition-colors"
                                    >
                                      <X className="h-2.5 w-2.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right 1 Col: Invoice Dates & Meta */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <NepaliDatePicker
            dateBS={currentInvoice.dateBS}
            dateAD={currentInvoice.dateAD}
            onChange={(newBS, newAD) => setInvoiceDates(newBS, newAD)}
          />
        </div>
      </div>

      {/* Line Items Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-2">
          <div className="flex items-center space-x-2 text-sky-400">
            <Layers className="h-5 w-5" />
            <h3 className="font-bold text-sm text-white">Particulars & Services Grid</h3>
            <span className="text-xs text-slate-500">({currentInvoice.items.length} items)</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Stock Database Quick Link */}
            <button
              type="button"
              onClick={() => setActiveTab('stock')}
              className="flex items-center space-x-1.5 bg-slate-950 hover:bg-emerald-950/40 text-emerald-400 hover:text-emerald-300 px-3 py-1 rounded-xl border border-emerald-500/30 text-[11px] font-bold transition-all shadow-sm"
              title="Open Stock Database to check available quantities and add items"
            >
              <Boxes className="h-3.5 w-3.5" />
              <span>Stock Database</span>
            </button>

            {/* Quick Presets Toggle Switch */}
            <div className="flex items-center space-x-1.5 bg-slate-950 px-3 py-1 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 font-medium">Quick Presets:</span>
              <button
                type="button"
                onClick={() => {
                  const nextVal = !showQuickPresets;
                  setShowQuickPresets(nextVal);
                  try {
                    localStorage.setItem('pnp_show_presets', String(nextVal));
                  } catch {}
                }}
                className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition-all ${
                  showQuickPresets
                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
                title={showQuickPresets ? 'Click to hide Quick Presets bar' : 'Click to show Quick Presets bar'}
              >
                {showQuickPresets ? '✓ ON' : '✕ OFF'}
              </button>
            </div>

            {/* Discount Toggle Switch */}
            <div className="flex items-center space-x-1.5 bg-slate-950 px-3 py-1 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 font-medium">Discount Field:</span>
              <button
                type="button"
                onClick={() => setShowDiscount(currentInvoice.showDiscount === false)}
                className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition-all ${
                  currentInvoice.showDiscount !== false
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
                title={currentInvoice.showDiscount !== false ? 'Click to disable discount fields for this bill' : 'Click to enable discount fields for this bill'}
              >
                {currentInvoice.showDiscount !== false ? '✓ Enabled' : '✕ Disabled'}
              </button>
            </div>

            <button
              type="button"
              onClick={() => addLineItem()}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-all shadow-md"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Custom Row</span>
            </button>
          </div>
        </div>

        {/* 📱 Real-Time Wireless Barcode & Serial Scanner Bar */}
        <div className="bg-slate-950/80 border border-sky-500/30 rounded-2xl p-3.5 shadow-md flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center space-x-2.5 text-sky-400 shrink-0">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/30 shadow-sm">
              <Smartphone className="h-4 w-4 animate-pulse text-sky-400" />
            </div>
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-200 block">
                Active Scanner Field
              </span>
              <span className="text-[10px] text-sky-400 font-medium">
                Auto-injects mobile camera scans & presses Enter
              </span>
            </div>
          </div>

          <div className="relative flex-1 w-full">
            <input
              id="active-bill-scan-input"
              data-scanner-input="true"
              type="text"
              value={activeScanInput}
              onChange={(e) => setActiveScanInput(e.target.value)}
              onKeyDown={handleActiveScanKeyDown}
              placeholder="📱 Scan with phone camera or type item code / serial & press Enter to inject..."
              className="w-full bg-slate-900 border border-slate-700 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/30 rounded-xl px-4 py-2.5 text-xs font-mono text-white placeholder-slate-500 shadow-inner transition-all"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              if (activeScanInput.trim()) {
                processScannedBarcode(activeScanInput);
                setActiveScanInput('');
              }
            }}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md transition-all shrink-0 flex items-center space-x-1.5"
          >
            <span>Inject ↵</span>
          </button>
        </div>

        {/* Line Items Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 text-[11px] font-semibold uppercase tracking-wider border-b border-slate-800">
                <th className="py-3 px-3 text-center w-12">S.N.</th>
                <th className="py-3 px-3">Description of Goods / Services</th>
                <th className="py-3 px-2 text-center w-20">Qty</th>
                <th className="py-3 px-2 w-24">Unit</th>
                <th className="py-3 px-2 text-right w-28">List Price (Rs.)</th>
                {currentInvoice.showDiscount !== false && (
                  <th className="py-3 px-2 text-right w-32">Discount</th>
                )}
                <th className="py-3 px-3 text-right">Effective Rate</th>
                <th className="py-3 px-3 text-right">Amount (Rs.)</th>
                <th className="py-3 px-2 text-center w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {currentInvoice.items.map((item) => (
                <LineItemRow
                  key={item.id}
                  item={item}
                  catalog={catalog}
                  showDiscount={currentInvoice.showDiscount !== false}
                  onUpdate={updateLineItem}
                  onRemove={removeLineItem}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Quick Item Presets Bar (Can be turned ON / OFF) */}
        {showQuickPresets && (
          <div className="pt-2 space-y-2 border-t border-slate-800/60 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <p className="text-[11px] font-semibold text-slate-300">Quick Add Popular Presets:</p>
              <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto scrollbar-none">
                {['All', 'General Products', 'Electronics', 'Accessories', 'CCTV & Security', 'Photo & Print', 'Framing', 'Services'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setQuickCatFilter(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${
                      quickCatFilter === cat
                        ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {catalog
                .filter(cat => quickCatFilter === 'All' || cat.category === quickCatFilter)
                .map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => addLineItem({ description: cat.description, unit: cat.unit, listPrice: cat.price })}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700/60 hover:border-sky-500/40 transition-all flex items-center space-x-1 shadow-sm hover:scale-[1.02]"
                  >
                    <span className={cat.category === 'CCTV & Security' ? 'text-sky-300 font-bold' : cat.category === 'General Products' ? 'text-emerald-300 font-bold' : ''}>+ {cat.description}</span>
                    <span className="text-sky-400 font-mono text-[11px] font-bold">({formatNPR(cat.price)})</span>
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Calculations & Payment Settings Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Tax Mode, Payment Status & Notes */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center space-x-2 text-sky-400 border-b border-slate-800 pb-3">
            <CreditCard className="h-5 w-5" />
            <h3 className="font-bold text-sm text-white">Taxation & Payment Settings</h3>
          </div>

          {/* Tax Mode Toggle */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Invoice Tax Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'exempted', label: 'Non-VAT / Exempted', desc: 'Bill of Supply' },
                { id: 'vat_13_exclusive', label: 'VAT 13% Exclusive', desc: '+13% Taxable' },
                { id: 'vat_13_inclusive', label: 'VAT 13% Inclusive', desc: 'Tax Included' },
              ].map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setTaxMode(mode.id as TaxMode)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    currentInvoice.taxMode === mode.id
                      ? 'bg-sky-500/20 border-sky-500 text-white shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <p className="text-xs font-bold">{mode.label}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{mode.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Payment Status & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Payment Status
              </label>
              <select
                value={currentInvoice.paymentStatus}
                onChange={(e) => setPaymentDetails(e.target.value as PaymentStatus, currentInvoice.paymentMethod, currentInvoice.amountPaid)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl px-3 py-2 text-xs text-white font-medium"
              >
                <option value="paid">Paid (Fully Cleared)</option>
                <option value="unpaid">Unpaid / Full Due</option>
                <option value="partial">Partial Payment</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Payment Method / Channel
              </label>
              <select
                value={currentInvoice.paymentMethod}
                onChange={(e) => setPaymentDetails(currentInvoice.paymentStatus, e.target.value as PaymentMethod, currentInvoice.amountPaid)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl px-3 py-2 text-xs text-white font-medium"
              >
                <option value="cash">Cash Counter</option>
                <option value="esewa">eSewa Wallet</option>
                <option value="khalti">Khalti Pay</option>
                <option value="fonepay">Fonepay QR Scan</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="credit">Credit / Account</option>
              </select>
            </div>
          </div>

          {/* Amount Paid if Partial */}
          {currentInvoice.paymentStatus === 'partial' && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-amber-300">Amount Received Now (Rs.)</label>
                <span className="text-xs font-mono text-amber-400 font-bold">
                  Due: {formatNPR(currentInvoice.amountDue)}
                </span>
              </div>
              <input
                type="number"
                min="0"
                max={currentInvoice.grandTotal}
                step="any"
                value={currentInvoice.amountPaid}
                onChange={(e) => setPaymentDetails('partial', currentInvoice.paymentMethod, parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-amber-500/40 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold"
              />
            </div>
          )}

          {/* Invoice Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Customer Notes / Delivery Remarks
            </label>
            <textarea
              rows={2}
              value={currentInvoice.notes}
              onChange={(e) => setInvoiceNotes(e.target.value)}
              placeholder="e.g. Delivered via courier / Goods received in good condition / Remarks..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl p-3 text-xs text-white placeholder-slate-600"
            />
          </div>
        </div>

        {/* Real-time Summary Totals Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-white">Invoice Financial Breakdown</h3>
              <span className="text-xs font-mono text-slate-400">Total Items Qty: <strong className="text-white">{totalQtyCount}</strong></span>
            </div>

            <div className="space-y-2.5 pt-4 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal (List Prices)</span>
                <span className="text-white font-medium">{formatNPR(currentInvoice.subtotal)}</span>
              </div>

              {currentInvoice.showDiscount !== false && (
                <div className="flex justify-between text-amber-400">
                  <span>Total Discount (-)</span>
                  <span>-{formatNPR(currentInvoice.totalDiscount)}</span>
                </div>
              )}

              {currentInvoice.taxMode !== 'exempted' && (
                <>
                  <div className="flex justify-between text-slate-300 pt-1 border-t border-slate-800/80">
                    <span>Taxable Amount</span>
                    <span>{formatNPR(currentInvoice.taxableAmount)}</span>
                  </div>

                  <div className="flex justify-between text-sky-400">
                    <span>VAT 13% (+)</span>
                    <span>+{formatNPR(currentInvoice.vatAmount)}</span>
                  </div>
                </>
              )}

              <div className="flex justify-between items-center text-lg font-bold text-white pt-3 border-t-2 border-slate-700">
                <span className="font-sans">Grand Total</span>
                <span className="text-sky-400 font-mono">{formatNPR(currentInvoice.grandTotal)}</span>
              </div>
            </div>

            {/* Amount in Words Box */}
            <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-sky-500/20">
              <p className="text-[10px] uppercase font-bold text-sky-400 tracking-wider">
                Amount in Words (NPR):
              </p>
              <p className="text-xs font-serif italic text-slate-200 mt-1 leading-relaxed">
                "{currentInvoice.amountInWords}"
              </p>
            </div>
          </div>

          {/* Bottom Quick Save CTA */}
          <div className="pt-2">
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveAndPrint}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-sm shadow-xl shadow-sky-500/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>{isSaving ? 'Saving...' : 'Finalize & Preview Printable A4 Invoice'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Customer Selection Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-white">Select Saved Customer</h3>
              <button onClick={() => setShowCustomerModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <input
              type="text"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="Search by party name or phone..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            />

            <div className="max-h-60 overflow-y-auto space-y-2">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((cust) => (
                  <button
                    key={cust.id}
                    type="button"
                    onClick={() => {
                      selectCustomer(cust);
                      setShowCustomerModal(false);
                    }}
                    className="w-full text-left p-3 rounded-xl bg-slate-950 hover:bg-sky-600/20 border border-slate-800 hover:border-sky-500/40 transition-all space-y-1"
                  >
                    <div className="flex justify-between text-xs font-bold text-white">
                      <span>{cust.name}</span>
                      <span className="text-sky-400 font-mono">{cust.phone}</span>
                    </div>
                    {cust.address && <p className="text-[11px] text-slate-400">{cust.address}</p>}
                    {cust.panVatNo && <p className="text-[10px] text-slate-500 font-mono">PAN: {cust.panVatNo}</p>}
                  </button>
                ))
              ) : (
                <p className="text-xs text-slate-500 text-center py-4">No matching customers found</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
