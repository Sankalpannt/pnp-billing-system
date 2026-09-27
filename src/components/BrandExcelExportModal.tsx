import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, Download, Layers, Search, Filter, 
  X, CheckCircle, Package, Calendar
} from 'lucide-react';
import { useInvoiceStore } from '../store/useInvoiceStore';
import { 
  extractBrandSales, 
  exportSingleBrandToExcel, 
  exportAllBrandsSeparateFiles, 
  exportMasterMultiSheetExcel 
} from '../utils/brandExport';
import { formatNPR } from '../utils/formatters';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const BrandExcelExportModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { savedInvoices, companyDetails } = useInvoiceStore();
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [fiscalYearFilter, setFiscalYearFilter] = useState<string>('all');
  const [docTypeFilter, setDocTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);

  // Filter invoices based on user selections
  const filteredInvoices = useMemo(() => {
    return savedInvoices.filter((inv) => {
      const matchesFY = fiscalYearFilter === 'all' || inv.fiscalYear === fiscalYearFilter;
      const matchesDoc = docTypeFilter === 'all' || inv.docType === docTypeFilter;
      return matchesFY && matchesDoc;
    });
  }, [savedInvoices, fiscalYearFilter, docTypeFilter]);

  // Extract brand data
  const { itemsByBrand, allBrandItems, brandSummary } = useMemo(() => {
    return extractBrandSales(filteredInvoices);
  }, [filteredInvoices]);

  // List of unique fiscal years in saved invoices
  const fiscalYears = useMemo(() => {
    const years = Array.from(new Set(savedInvoices.map((i) => i.fiscalYear).filter(Boolean)));
    return ['all', ...years];
  }, [savedInvoices]);

  // Active brands that have items
  const activeBrands = useMemo(() => {
    return Object.entries(itemsByBrand)
      .filter(([_, items]) => items.length > 0)
      .map(([brand]) => brand);
  }, [itemsByBrand]);

  // Table preview items based on selected brand and search term
  const previewItems = useMemo(() => {
    let items = selectedBrand === 'all' 
      ? allBrandItems 
      : (itemsByBrand[selectedBrand] || []);

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      items = items.filter(item => 
        item.description.toLowerCase().includes(q) ||
        item.customerName.toLowerCase().includes(q) ||
        item.invoiceNumber.toLowerCase().includes(q) ||
        item.serialNumbers.toLowerCase().includes(q)
      );
    }

    return items;
  }, [selectedBrand, allBrandItems, itemsByBrand, searchTerm]);

  if (!isOpen) return null;

  const handleExportAllSeparate = async () => {
    setIsExporting(true);
    setExportSuccessMsg(null);
    try {
      const count = await exportAllBrandsSeparateFiles(itemsByBrand, companyDetails.cctvPrefix || 'PNP_Tech');
      setExportSuccessMsg(`Successfully exported ${count} separate brand Excel files!`);
      setTimeout(() => setExportSuccessMsg(null), 5000);
    } catch (e) {
      console.error('Export failed', e);
      alert('Error occurred during export.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSingleBrand = (brandName: string) => {
    const items = itemsByBrand[brandName] || [];
    if (items.length === 0) {
      alert(`No records found for ${brandName}`);
      return;
    }
    exportSingleBrandToExcel(brandName, items, companyDetails.cctvPrefix || 'PNP_Tech');
  };

  const handleExportMaster = () => {
    exportMasterMultiSheetExcel(itemsByBrand, companyDetails.cctvPrefix || 'PNP_Tech');
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-6xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center space-x-3">
            <div className="h-11 w-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-inner">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                Brand-Wise Camera & Equipment Excel Export
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Excel .XLSX
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Generate separate Excel files for each CCTV camera brand (Hikvision, Dahua, CP Plus, Uniview, Ezviz, etc.)
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="h-9 w-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
          
          {/* Success Banner */}
          {exportSuccessMsg && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
              <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
              <span>{exportSuccessMsg} Check your Downloads folder for the generated files.</span>
            </div>
          )}

          {/* Quick Actions Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Primary Action 1: Separate Excel Files Per Brand */}
            <div className="bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 p-5 rounded-2xl shadow-xl flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-emerald-400">
                  <Download className="h-5 w-5" />
                  <h3 className="font-bold text-sm text-white">Export Separate Files (1 File Per Brand)</h3>
                </div>
                <p className="text-xs text-slate-300">
                  Downloads individual `.xlsx` spreadsheets for each active camera brand separately ({activeBrands.length} brands ready).
                </p>
              </div>

              <button
                onClick={handleExportAllSeparate}
                disabled={isExporting || activeBrands.length === 0}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-emerald-900/30 flex items-center justify-center space-x-2 transition-all"
              >
                <Download className="h-4 w-4" />
                <span>{isExporting ? 'Generating Files...' : `Download ${activeBrands.length} Separate Brand Files (.xlsx)`}</span>
              </button>
            </div>

            {/* Primary Action 2: Multi-Sheet Master Excel */}
            <div className="bg-gradient-to-br from-sky-950/40 via-slate-900 to-slate-900 border border-sky-500/30 p-5 rounded-2xl shadow-xl flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-sky-400">
                  <Layers className="h-5 w-5" />
                  <h3 className="font-bold text-sm text-white">Export Master Workbook (All Tabs in 1 File)</h3>
                </div>
                <p className="text-xs text-slate-300">
                  Downloads a single master Excel file with a Summary Overview sheet and dedicated worksheet tabs for every brand.
                </p>
              </div>

              <button
                onClick={handleExportMaster}
                disabled={activeBrands.length === 0}
                className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-sky-900/30 flex items-center justify-center space-x-2 transition-all"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Download Master Multi-Sheet Workbook (.xlsx)</span>
              </button>
            </div>

          </div>

          {/* Filters Section */}
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                Fiscal Year (आर्थिक वर्ष)
              </label>
              <select
                value={fiscalYearFilter}
                onChange={(e) => setFiscalYearFilter(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="all">All Fiscal Years (सबै वर्ष)</option>
                {fiscalYears.filter(y => y !== 'all').map(fy => (
                  <option key={fy} value={fy}>FY {fy}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
                <Filter className="h-3.5 w-3.5 text-slate-500" />
                Invoice Category
              </label>
              <select
                value={docTypeFilter}
                onChange={(e) => setDocTypeFilter(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="all">All Invoices & Sales</option>
                <option value="cctv_invoice">CCTV Installation & Sales Only</option>
                <option value="counter_sale">Retail Counter Sales Only</option>
                <option value="studio_invoice">General Sales Invoices</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
                <Search className="h-3.5 w-3.5 text-slate-500" />
                Search Inside Preview
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search camera model, serial #, client..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500"
              />
            </div>
          </div>

          {/* Brands Breakdown Cards */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Package className="h-4 w-4 text-sky-400" />
                Select Brand to Preview & Download Single File
              </h3>
              <span className="text-[11px] text-slate-500 font-mono">
                {allBrandItems.length} Total Line Items Recorded
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {/* All Brands Tab */}
              <button
                onClick={() => setSelectedBrand('all')}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  selectedBrand === 'all'
                    ? 'bg-sky-600/20 border-sky-500 shadow-md shadow-sky-950'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs font-extrabold text-white">All Brands Combined</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                    {allBrandItems.length}
                  </span>
                </div>
                <p className="text-sm font-black font-mono text-sky-400 mt-2">
                  {formatNPR(allBrandItems.reduce((s, i) => s + i.amount, 0))}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">Click to view combined</p>
              </button>

              {/* Individual Brand Cards */}
              {activeBrands.map((brand) => {
                const summary = brandSummary[brand];
                const isSelected = selectedBrand === brand;

                return (
                  <div
                    key={brand}
                    onClick={() => setSelectedBrand(brand)}
                    className={`p-3.5 rounded-2xl border flex flex-col justify-between space-y-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-emerald-600/20 border-emerald-500 shadow-md shadow-emerald-950'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-white truncate pr-1">{brand}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-slate-800 text-emerald-400 font-bold shrink-0">
                          {summary.totalQty} {summary.totalQty === 1 ? 'pc' : 'pcs'}
                        </span>
                      </div>
                      <p className="text-sm font-black font-mono text-emerald-400 mt-1">
                        {formatNPR(summary.totalAmount)}
                      </p>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExportSingleBrand(brand);
                      }}
                      className="w-full py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white text-[11px] font-semibold border border-slate-700 hover:border-emerald-500 flex items-center justify-center space-x-1 transition-all"
                      title={`Download ${brand} Excel file`}
                    >
                      <Download className="h-3 w-3" />
                      <span>Download .xlsx</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Preview Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300">
                Preview Data: <span className="text-sky-400 font-extrabold">{selectedBrand === 'all' ? 'All Brands' : selectedBrand}</span> ({previewItems.length} records)
              </h4>
              {selectedBrand !== 'all' && (
                <button
                  onClick={() => handleExportSingleBrand(selectedBrand)}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download This Table (.xlsx)</span>
                </button>
              )}
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-inner max-h-72 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-900 text-slate-400 text-[10px] font-semibold uppercase tracking-wider border-b border-slate-800 z-10">
                  <tr>
                    <th className="py-2.5 px-3">Date (BS)</th>
                    <th className="py-2.5 px-3">Invoice #</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Brand</th>
                    <th className="py-2.5 px-3">Camera / Particulars</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Rate</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {previewItems.length > 0 ? (
                    previewItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-900/60 transition-colors">
                        <td className="py-2 px-3 text-slate-300 font-normal">{item.dateBS}</td>
                        <td className="py-2 px-3 text-sky-400 font-bold">{item.invoiceNumber}</td>
                        <td className="py-2 px-3 text-white font-sans font-medium">{item.customerName}</td>
                        <td className="py-2 px-3">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 font-sans">
                            {item.brand}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-200 font-sans max-w-xs truncate">{item.description}</td>
                        <td className="py-2 px-3 text-center text-white font-bold">{item.qty} {item.unit}</td>
                        <td className="py-2 px-3 text-right text-slate-300">{formatNPR(item.effectivePrice)}</td>
                        <td className="py-2 px-3 text-right text-emerald-400 font-extrabold">{formatNPR(item.amount)}</td>
                        <td className="py-2 px-3 text-center font-sans">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            item.paymentStatus === 'PAID' ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
                          }`}>
                            {item.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-500 font-sans text-xs">
                        No camera or sales records found for this brand filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/70 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-400">
            Files are formatted with standard columns, sums, customer sites, serial numbers, and warranty info.
          </p>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Close Window
            </button>
            <button
              onClick={handleExportAllSeparate}
              disabled={isExporting || activeBrands.length === 0}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-md transition-all flex items-center space-x-1.5"
            >
              <Download className="h-4 w-4" />
              <span>Export Separate Brand Files</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
