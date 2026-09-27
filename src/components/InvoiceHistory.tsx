import React, { useState } from 'react';
import { 
  Search, Edit, Copy, Trash2, 
  Download, Eye, Calendar, DollarSign, CheckCircle2, AlertTriangle, FileSpreadsheet 
} from 'lucide-react';
import { useInvoiceStore } from '../store/useInvoiceStore';
import { formatNPR } from '../utils/formatters';
import { BrandExcelExportModal } from './BrandExcelExportModal';
import { useLiveClock } from '../hooks/useLiveClock';
import { getYesterdayDates, parseBSDate, formatBSDate } from '../utils/nepaliDate';

export const InvoiceHistory: React.FC = () => {
  const { savedInvoices, activeTab, viewInvoicePreview, loadInvoiceForEdit, duplicateInvoice, deleteInvoice } = useInvoiceStore();
  const liveClock = useLiveClock();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'this_month' | 'this_fy'>('all');
  const [showBrandModal, setShowBrandModal] = useState(false);

  const yesterday = getYesterdayDates();
  const currentBS = parseBSDate(liveClock.dateBS);

  // Filter by document type tab
  const categoryInvoices = savedInvoices.filter((inv) => {
    if (activeTab === 'cctv_history') return inv.docType === 'cctv_invoice';
    if (activeTab === 'studio_history') return inv.docType === 'studio_invoice' || !inv.docType;
    if (activeTab === 'counter_history') return inv.docType === 'counter_sale';
    return true; // 'history' tab shows all combined
  });

  const filteredInvoices = categoryInvoices.filter((inv) => {
    const matchesSearch = 
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(search.toLowerCase()) ||
      inv.customerPhone.includes(search) ||
      inv.dateBS.includes(search) ||
      inv.dateAD.includes(search);

    const matchesStatus = statusFilter === 'all' || inv.paymentStatus === statusFilter;

    let matchesDate = true;
    if (dateFilter === 'today') {
      matchesDate = liveClock.isTodayBS(inv.dateBS) || liveClock.isTodayAD(inv.dateAD);
    } else if (dateFilter === 'yesterday') {
      matchesDate = inv.dateBS === yesterday.dateBS || inv.dateAD === yesterday.dateAD;
    } else if (dateFilter === 'this_month' && currentBS) {
      const invBS = parseBSDate(inv.dateBS);
      matchesDate = invBS ? (invBS.year === currentBS.year && invBS.month === currentBS.month) : false;
    } else if (dateFilter === 'this_fy') {
      matchesDate = inv.fiscalYear === liveClock.fiscalYear;
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  const registerTitle = 
    activeTab === 'cctv_history' ? 'CCTV Sales & Installation Records' :
    activeTab === 'studio_history' ? 'General Sales Invoice Register' :
    activeTab === 'counter_history' ? 'Counter Cash Sales Register' : 'All Combined Sales & Invoices Records';

  // Calculate Metrics for this register
  const totalSales = categoryInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
  const totalPaid = categoryInvoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
  const totalDue = categoryInvoices.reduce((sum, inv) => sum + inv.amountDue, 0);
  const unpaidCount = categoryInvoices.filter(inv => inv.paymentStatus === 'unpaid' || inv.paymentStatus === 'partial').length;

  const exportToCSV = () => {
    if (savedInvoices.length === 0) return;
    
    const headers = ['Invoice No', 'Fiscal Year', 'BS Date', 'AD Date', 'Customer Name', 'Phone', 'PAN/VAT', 'Tax Mode', 'Grand Total (NPR)', 'Paid (NPR)', 'Due (NPR)', 'Status', 'Payment Method'];
    
    const rows = savedInvoices.map(inv => [
      inv.invoiceNumber,
      inv.fiscalYear,
      inv.dateBS,
      inv.dateAD,
      `"${inv.customerName.replace(/"/g, '""')}"`,
      inv.customerPhone,
      inv.customerPanVat,
      inv.taxMode,
      inv.grandTotal,
      inv.amountPaid,
      inv.amountDue,
      inv.paymentStatus,
      inv.paymentMethod
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Sales_Report_PNP_TECH_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 print:hidden">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            {registerTitle}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Showing {categoryInvoices.length} transactions in this register | Search, filter, print, or export to Excel/CSV
          </p>
        </div>

        <div className="flex items-center space-x-2.5 self-start sm:self-auto">
          <button
            onClick={() => setShowBrandModal(true)}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-950/40 transition-all"
            title="Export separate Excel files for each camera brand"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Brand-Wise Excel Export</span>
          </button>

          <button
            onClick={exportToCSV}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all"
            title="Export all sales to general tax CSV"
          >
            <Download className="h-4 w-4" />
            <span>Sales CSV</span>
          </button>
        </div>
      </div>

      {/* Financial Metrics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Invoiced Sales</p>
            <p className="text-xl font-black font-mono text-white mt-1">{formatNPR(totalSales)}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{savedInvoices.length} Invoices Issued</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/20">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Collected Revenue</p>
            <p className="text-xl font-black font-mono text-emerald-400 mt-1">{formatNPR(totalPaid)}</p>
            <p className="text-[10px] text-emerald-500/80 mt-0.5">Cleared Payments</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Outstanding Dues</p>
            <p className="text-xl font-black font-mono text-red-400 mt-1">{formatNPR(totalDue)}</p>
            <p className="text-[10px] text-red-400/80 mt-0.5">{unpaidCount} Pending / Partial</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center border border-red-500/20">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Active FY Invoices</p>
            <p className="text-xl font-black font-mono text-indigo-400 mt-1">{savedInvoices.length}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Local Database IndexedDB</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
            <Calendar className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full lg:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice #, customer, phone, date..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500"
          />
        </div>

        {/* Date Filter Tabs Bar */}
        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 w-full lg:w-auto overflow-x-auto scrollbar-none">
          {[
            { id: 'all', label: 'All Dates' },
            { id: 'today', label: '⚡ Today (आज)' },
            { id: 'yesterday', label: 'हिजो (Yesterday)' },
            { id: 'this_month', label: 'यो महिना (Month)' },
            { id: 'this_fy', label: `FY ${liveClock.fiscalYear}` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setDateFilter(tab.id as any)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                dateFilter === tab.id
                  ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 w-full lg:w-auto">
          {[
            { id: 'all', label: 'All Status' },
            { id: 'paid', label: 'Paid' },
            { id: 'unpaid', label: 'Unpaid' },
            { id: 'partial', label: 'Partial' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === tab.id
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Data Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 text-[11px] font-semibold uppercase tracking-wider border-b border-slate-800">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Mitti Date (BS)</th>
                <th className="py-3 px-4">Roman Date (AD)</th>
                <th className="py-3 px-4">Party / Customer</th>
                <th className="py-3 px-4 text-right">Grand Total</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredInvoices.length > 0 ? (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-800/50 transition-colors">
                    
                    {/* Invoice Number */}
                    <td className="py-3 px-4 font-mono font-bold text-sky-400 text-xs">
                      {inv.invoiceNumber}
                      {liveClock.isTodayBS(inv.dateBS) && (
                        <span className="ml-1.5 text-[9px] font-sans px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Today</span>
                      )}
                    </td>

                    {/* BS Date */}
                    <td className="py-3 px-4 text-xs font-mono">
                      <span className="text-white font-bold">{inv.dateBS}</span>
                      <span className="text-[10px] text-sky-400/90 block">{formatBSDate(inv.dateBS)}</span>
                    </td>

                    {/* AD Date */}
                    <td className="py-3 px-4 text-xs text-slate-400 font-mono">
                      {inv.dateAD}
                    </td>

                    {/* Customer */}
                    <td className="py-3 px-4 text-xs">
                      <p className="font-bold text-white">{inv.customerName || 'Retail Customer'}</p>
                      {inv.customerPhone && <p className="text-[11px] text-slate-400 font-mono">{inv.customerPhone}</p>}
                    </td>

                    {/* Grand Total */}
                    <td className="py-3 px-4 text-right font-mono font-extrabold text-xs text-white">
                      {formatNPR(inv.grandTotal)}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        inv.paymentStatus === 'paid'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : inv.paymentStatus === 'unpaid'
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {inv.paymentStatus}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => viewInvoicePreview(inv)}
                          className="p-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 transition-colors"
                          title="Print / View A4"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => loadInvoiceForEdit(inv.id)}
                          className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 transition-colors"
                          title="Edit Invoice"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => duplicateInvoice(inv.id)}
                          className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                          title="Duplicate Invoice"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete invoice ${inv.invoiceNumber}?`)) {
                              deleteInvoice(inv.id);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                          title="Delete Invoice"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-500">
                    No matching invoices found in records.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Brand-Wise Separate Excel Export Modal */}
      <BrandExcelExportModal
        isOpen={showBrandModal}
        onClose={() => setShowBrandModal(false)}
      />
    </div>
  );
};
