import React, { useState } from 'react';
import { TrendingUp, DollarSign, ShieldCheck, CreditCard, PieChart, FileSpreadsheet } from 'lucide-react';
import { useInvoiceStore } from '../store/useInvoiceStore';
import { formatNPR } from '../utils/formatters';
import { BrandExcelExportModal } from './BrandExcelExportModal';

export const SalesAnalytics: React.FC = () => {
  const { savedInvoices, companyDetails } = useInvoiceStore();
  const [showBrandModal, setShowBrandModal] = useState(false);

  const totalInvoicesCount = savedInvoices.length;
  const totalGrossSales = savedInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
  const totalTaxableAmount = savedInvoices.reduce((sum, inv) => sum + inv.taxableAmount, 0);
  const totalVatCollected = savedInvoices.reduce((sum, inv) => sum + inv.vatAmount, 0);
  const totalDiscountsGiven = savedInvoices.reduce((sum, inv) => sum + inv.totalDiscount, 0);

  // Group sales by Payment Method
  const paymentMethodStats = savedInvoices.reduce((acc, inv) => {
    const method = inv.paymentMethod || 'cash';
    acc[method] = (acc[method] || 0) + inv.grandTotal;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 print:hidden">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            Sales & Tax Analytics Dashboard
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Financial performance, tax collection reports, and payment channel insights for FY {companyDetails.fiscalYear}
          </p>
        </div>

        <button
          onClick={() => setShowBrandModal(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 transition-all self-start sm:self-auto"
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>Brand-Wise Excel Export</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg space-y-2">
          <div className="flex items-center justify-between text-sky-400">
            <span className="text-xs font-semibold text-slate-400">Gross Sales Revenue</span>
            <DollarSign className="h-5 w-5" />
          </div>
          <p className="text-2xl font-black font-mono text-white">{formatNPR(totalGrossSales)}</p>
          <p className="text-[11px] text-slate-500">{totalInvoicesCount} Total Sales Invoices</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg space-y-2">
          <div className="flex items-center justify-between text-indigo-400">
            <span className="text-xs font-semibold text-slate-400">Taxable Sales Amount</span>
            <TrendingUp className="h-5 w-5" />
          </div>
          <p className="text-2xl font-black font-mono text-indigo-400">{formatNPR(totalTaxableAmount)}</p>
          <p className="text-[11px] text-slate-500">Excludes VAT Tax Portion</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg space-y-2">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-xs font-semibold text-slate-400">13% VAT Tax Collected</span>
            <ShieldCheck className="h-5 w-5" />
          </div>
          <p className="text-2xl font-black font-mono text-emerald-400">{formatNPR(totalVatCollected)}</p>
          <p className="text-[11px] text-emerald-500/80">Payable to IRD Nepal</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg space-y-2">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-xs font-semibold text-slate-400">Total Customer Discounts</span>
            <PieChart className="h-5 w-5" />
          </div>
          <p className="text-2xl font-black font-mono text-amber-400">{formatNPR(totalDiscountsGiven)}</p>
          <p className="text-[11px] text-slate-500">Promotions & Deductions</p>
        </div>
      </div>

      {/* Payment Channel Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center space-x-2 text-sky-400 border-b border-slate-800 pb-3">
            <CreditCard className="h-5 w-5" />
            <h3 className="font-bold text-sm text-white">Revenue by Payment Channel</h3>
          </div>

          <div className="space-y-3">
            {Object.keys(paymentMethodStats).length > 0 ? (
              Object.entries(paymentMethodStats).map(([method, amount]) => {
                const percent = totalGrossSales > 0 ? Math.round((amount / totalGrossSales) * 100) : 0;
                return (
                  <div key={method} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold uppercase text-slate-300">{method}</span>
                      <span className="font-mono text-white font-bold">{formatNPR(amount)} ({percent}%)</span>
                    </div>
                    <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-sky-500 to-indigo-600 rounded-full"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-500 py-4 text-center">No payment data recorded yet.</p>
            )}
          </div>
        </div>

        {/* IRD Nepali Tax Compliance Summary */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center space-x-2 text-sky-400 border-b border-slate-800 pb-3">
            <ShieldCheck className="h-5 w-5" />
            <h3 className="font-bold text-sm text-white">Nepali Business Accounting Summary</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500">Business PAN / VAT</span>
              <p className="font-mono font-bold text-white text-sm">{companyDetails.panVatNo}</p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500">Fiscal Year Range</span>
              <p className="font-mono font-bold text-indigo-400 text-sm">{companyDetails.fiscalYear}</p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500">Tax Type</span>
              <p className="font-bold text-emerald-400 text-sm">
                {companyDetails.isVatRegistered ? 'Value Added Tax (13% Standard VAT)' : 'PAN Retail Account'}
              </p>
            </div>
          </div>
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
