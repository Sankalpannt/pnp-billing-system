import React, { useState } from 'react';
import { Printer, ArrowLeft, Sliders, RotateCcw, Move, QrCode, Maximize2, PackageCheck } from 'lucide-react';
import { useInvoiceStore } from '../store/useInvoiceStore';
import { formatNPR } from '../utils/formatters';
import { formatBSDate, convertADToBS, convertBSToAD } from '../utils/nepaliDate';
import { BrandTitle } from './BrandTitle';
import pnpIcon from '../assets/pnp_icon_transparent.png';
import { triggerAppPrint } from '../utils/printHelper';

export const InvoicePreview: React.FC = () => {
  const { currentInvoice, companyDetails, setActiveTab, setShowDiscount, deductStockForInvoice } = useInvoiceStore();
  const [copyType, setCopyType] = useState<'customer' | 'office'>('customer');
  const [densityMode, setDensityMode] = useState<'auto' | 'compact' | 'comfortable'>('auto');
  const [showBuyerPan, setShowBuyerPan] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('pnp_show_buyer_pan');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const [showInvoiceNumber, setShowInvoiceNumber] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('pnp_show_invoice_number');
      return saved !== null ? saved === 'true' : false;
    } catch {
      return false;
    }
  });

  // Draggable Stamp, Signature, and Payment QR States (stored in localStorage for persistence)
  const [signPos, setSignPos] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem('pnp_bill_sign_pos');
      return saved ? JSON.parse(saved) : { x: 0, y: 0 };
    } catch {
      return { x: 0, y: 0 };
    }
  });

  const [stampPos, setStampPos] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem('pnp_bill_stamp_pos');
      return saved ? JSON.parse(saved) : { x: 0, y: 0 };
    } catch {
      return { x: 0, y: 0 };
    }
  });

  const [qrPos, setQrPos] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem('pnp_bill_qr_pos');
      return saved ? JSON.parse(saved) : { x: 0, y: 0 };
    } catch {
      return { x: 0, y: 0 };
    }
  });

  // Scale (size) states for Stamp, Signature, and Payment QR (stored in localStorage)
  const [signScale, setSignScale] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('pnp_bill_sign_scale');
      return saved ? parseFloat(saved) : 1;
    } catch {
      return 1;
    }
  });

  const [stampScale, setStampScale] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('pnp_bill_stamp_scale');
      return saved ? parseFloat(saved) : 1;
    } catch {
      return 1;
    }
  });

  const [qrScale, setQrScale] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('pnp_bill_qr_scale');
      return saved ? parseFloat(saved) : 1;
    } catch {
      return 1;
    }
  });

  const [isDraggingSign, setIsDraggingSign] = useState(false);
  const [isDraggingStamp, setIsDraggingStamp] = useState(false);
  const [isDraggingQr, setIsDraggingQr] = useState(false);
  const [isResizingSign, setIsResizingSign] = useState(false);
  const [isResizingStamp, setIsResizingStamp] = useState(false);
  const [isResizingQr, setIsResizingQr] = useState(false);

  const [showStampOnBill, setShowStampOnBill] = useState(() => {
    try {
      return localStorage.getItem('pnp_bill_show_stamp') !== 'false';
    } catch {
      return true;
    }
  });

  const [showSignOnBill, setShowSignOnBill] = useState(() => {
    try {
      return localStorage.getItem('pnp_bill_show_sign') !== 'false';
    } catch {
      return true;
    }
  });

  const [showQrOnBill, setShowQrOnBill] = useState(() => {
    try {
      return localStorage.getItem('pnp_bill_show_qr') !== 'false';
    } catch {
      return true;
    }
  });

  const [paymentQrSrc, setPaymentQrSrc] = useState<string>('');

  // Load Payment QR Code from company settings, Electron IPC, or Vite dev server
  React.useEffect(() => {
    let isMounted = true;

    async function loadQr() {
      // 1. If companyDetails has custom uploaded qrCodeUrl
      if (companyDetails.qrCodeUrl && companyDetails.qrCodeUrl.trim()) {
        if (isMounted) setPaymentQrSrc(companyDetails.qrCodeUrl);
        return;
      }

      // 2. If running inside Electron, read from "payment qr" directory via IPC
      if (typeof window !== 'undefined' && (window as any).require) {
        try {
          const { ipcRenderer } = (window as any).require('electron');
          if (ipcRenderer) {
            const res = await ipcRenderer.invoke('get-payment-qr-file');
            if (res && res.success && res.dataUrl && isMounted) {
              setPaymentQrSrc(res.dataUrl);
              return;
            }
          }
        } catch (e) {
          console.warn('Could not read payment QR via Electron IPC:', e);
        }
      }

      // 3. If running in browser / Vite dev server, fetch /api/payment-qr endpoint
      try {
        const resp = await fetch('/api/payment-qr');
        if (resp.ok) {
          const data = await resp.json();
          if (data && data.success && data.dataUrl && isMounted) {
            setPaymentQrSrc(data.dataUrl);
            return;
          }
        }
      } catch (e) {}

      // 4. Default static fallback
      if (isMounted) {
        setPaymentQrSrc('./payment_qr.png');
      }
    }

    loadQr();
    return () => { isMounted = false; };
  }, [companyDetails.qrCodeUrl]);

  // Mouse / Touch Drag Handler for Stamp, Signature, and Payment QR (Position Move)
  const startDrag = (type: 'sign' | 'stamp' | 'qr', e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const initialPos = type === 'sign' ? signPos : type === 'stamp' ? stampPos : qrPos;
    const startX = clientX - initialPos.x;
    const startY = clientY - initialPos.y;

    if (type === 'sign') setIsDraggingSign(true);
    else if (type === 'stamp') setIsDraggingStamp(true);
    else setIsDraggingQr(true);

    const onMove = (moveEvt: MouseEvent | TouchEvent) => {
      const curX = 'touches' in moveEvt ? moveEvt.touches[0].clientX : moveEvt.clientX;
      const curY = 'touches' in moveEvt ? moveEvt.touches[0].clientY : moveEvt.clientY;
      const newPos = {
        x: Math.round(curX - startX),
        y: Math.round(curY - startY)
      };
      if (type === 'sign') {
        setSignPos(newPos);
      } else if (type === 'stamp') {
        setStampPos(newPos);
      } else {
        setQrPos(newPos);
      }
    };

    const onEnd = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);

      if (type === 'sign') {
        setIsDraggingSign(false);
        setSignPos((pos) => {
          try { localStorage.setItem('pnp_bill_sign_pos', JSON.stringify(pos)); } catch {}
          return pos;
        });
      } else if (type === 'stamp') {
        setIsDraggingStamp(false);
        setStampPos((pos) => {
          try { localStorage.setItem('pnp_bill_stamp_pos', JSON.stringify(pos)); } catch {}
          return pos;
        });
      } else {
        setIsDraggingQr(false);
        setQrPos((pos) => {
          try { localStorage.setItem('pnp_bill_qr_pos', JSON.stringify(pos)); } catch {}
          return pos;
        });
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onEnd);
  };

  // Mouse / Touch Drag-to-Resize Handler for Stamp, Signature, and Payment QR (Enlarge / Shrink)
  const startResize = (type: 'sign' | 'stamp' | 'qr', e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const initialScale = type === 'sign' ? signScale : type === 'stamp' ? stampScale : qrScale;

    // Center point of the item container to compute radial drag distance
    const targetElement = (e.currentTarget as HTMLElement).closest('.resizable-item-container');
    const rect = targetElement ? targetElement.getBoundingClientRect() : null;
    const centerX = rect ? rect.left + rect.width / 2 : clientX;
    const centerY = rect ? rect.top + rect.height / 2 : clientY;

    const initialDistance = Math.max(25, Math.hypot(clientX - centerX, clientY - centerY));

    if (type === 'sign') setIsResizingSign(true);
    else if (type === 'stamp') setIsResizingStamp(true);
    else setIsResizingQr(true);

    const onMove = (moveEvt: MouseEvent | TouchEvent) => {
      const curX = 'touches' in moveEvt ? moveEvt.touches[0].clientX : moveEvt.clientX;
      const curY = 'touches' in moveEvt ? moveEvt.touches[0].clientY : moveEvt.clientY;
      const currentDistance = Math.hypot(curX - centerX, curY - centerY);
      const ratio = currentDistance / initialDistance;
      const rawScale = initialScale * ratio;
      // Clamped scale from 0.4x to 2.5x with 0.05 step precision
      const newScale = Math.max(0.4, Math.min(2.5, Math.round(rawScale * 20) / 20));

      if (type === 'sign') {
        setSignScale(newScale);
      } else if (type === 'stamp') {
        setStampScale(newScale);
      } else {
        setQrScale(newScale);
      }
    };

    const onEnd = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);

      if (type === 'sign') {
        setIsResizingSign(false);
        setSignScale((s) => {
          try { localStorage.setItem('pnp_bill_sign_scale', String(s)); } catch {}
          return s;
        });
      } else if (type === 'stamp') {
        setIsResizingStamp(false);
        setStampScale((s) => {
          try { localStorage.setItem('pnp_bill_stamp_scale', String(s)); } catch {}
          return s;
        });
      } else {
        setIsResizingQr(false);
        setQrScale((s) => {
          try { localStorage.setItem('pnp_bill_qr_scale', String(s)); } catch {}
          return s;
        });
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onEnd);
  };

  const resetPositions = () => {
    setSignPos({ x: 0, y: 0 });
    setStampPos({ x: 0, y: 0 });
    setQrPos({ x: 0, y: 0 });
    setSignScale(1);
    setStampScale(1);
    setQrScale(1);
    try {
      localStorage.removeItem('pnp_bill_sign_pos');
      localStorage.removeItem('pnp_bill_stamp_pos');
      localStorage.removeItem('pnp_bill_qr_pos');
      localStorage.removeItem('pnp_bill_sign_scale');
      localStorage.removeItem('pnp_bill_stamp_scale');
      localStorage.removeItem('pnp_bill_qr_scale');
    } catch {}
  };

  // Auto trigger print dialog when preview opens & ensure stock deduction
  React.useEffect(() => {
    if (!currentInvoice.stockDeducted) {
      deductStockForInvoice(currentInvoice);
    }
    const timer = setTimeout(() => {
      triggerAppPrint();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const handlePrintClick = async () => {
    if (!currentInvoice.stockDeducted) {
      await deductStockForInvoice(currentInvoice);
    }
    triggerAppPrint();
  };

  const isVatInvoice = currentInvoice.taxMode !== 'exempted';
  const showDiscountColumn = currentInvoice.showDiscount !== false;
  const isUnpaidOrPartial = currentInvoice.paymentStatus === 'unpaid' || currentInvoice.paymentStatus === 'partial' || currentInvoice.amountDue > 0;
  const effectiveDueAmount = currentInvoice.paymentStatus === 'unpaid'
    ? (currentInvoice.amountDue > 0 ? currentInvoice.amountDue : currentInvoice.grandTotal)
    : currentInvoice.amountDue;
  let invoiceHeaderTitle = 'TAX INVOICE';
  if (currentInvoice.docType === 'cctv_invoice') {
    invoiceHeaderTitle = isVatInvoice ? 'CCTV SALES & TAX INVOICE' : 'CCTV SALES & INSTALLATION BILL';
  } else if (currentInvoice.docType === 'counter_sale') {
    invoiceHeaderTitle = 'COUNTER CASH MEMO / RECEIPT';
  } else {
    invoiceHeaderTitle = isVatInvoice 
      ? (companyDetails.isVatRegistered ? 'TAX INVOICE' : 'INVOICE')
      : 'INVOICE / BILL OF SUPPLY';
  }

  const isGeneralSales = currentInvoice.docType === 'studio_invoice';
  const displayBusinessName = isGeneralSales 
    ? (companyDetails.generalBusinessName || 'PARICHAYA PHOTO STUDIO')
    : (companyDetails.studioName || 'PNP TECH TRADERS');

  const displayTagline = isGeneralSales
    ? (companyDetails.generalBusinessTagline || 'Digital Photography, Framing, Printing & General Sales')
    : companyDetails.tagline;

  const itemCount = currentInvoice.items.length;
  
  // Determine adaptive density based on item count
  const isCompact = densityMode === 'compact' || (densityMode === 'auto' && itemCount >= 7);
  const isSuperCompact = densityMode === 'compact' || (densityMode === 'auto' && itemCount >= 12);

  // Minimum rows for spacious small invoice pads
  const minimumRows = isCompact ? 0 : 6;
  const paddingRowsNeeded = Math.max(0, minimumRows - itemCount);

  const effectiveBS = currentInvoice.dateBS || (currentInvoice.dateAD ? convertADToBS(currentInvoice.dateAD) : '');
  const effectiveAD = currentInvoice.dateAD || (currentInvoice.dateBS ? convertBSToAD(currentInvoice.dateBS) : '');
  const nepaliDateFormatted = effectiveBS ? formatBSDate(effectiveBS, true) : '';

  return (
    <div className="max-w-4xl mx-auto pb-12 print:max-w-none print:w-full print:p-0 print:m-0 print:pb-0 print:bg-white">
      
      {/* Top Action Bar (Hidden when printing) */}
      <div className="print:hidden bg-slate-800 border border-slate-700/80 rounded-2xl p-4 mb-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <button
          onClick={() => setActiveTab('create')}
          className="flex items-center space-x-2 text-slate-300 hover:text-white text-xs font-semibold px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Editor</span>
        </button>

        {/* Copy Type Selector & Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Print Copy */}
          <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-700">
            {(['customer', 'office'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setCopyType(type)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                  copyType === type
                    ? 'bg-sky-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {type} Copy
              </button>
            ))}
          </div>

          {/* Density Mode Selector */}
          <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-700">
            <span className="text-[11px] text-slate-400 px-1.5 flex items-center gap-1 font-medium">
              <Sliders className="h-3 w-3 text-sky-400" />
              Density:
            </span>
            {(['auto', 'compact', 'comfortable'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setDensityMode(mode)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize transition-all ${
                  densityMode === mode
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title={mode === 'auto' ? 'Automatically fits items on 1 page' : `${mode} spacing`}
              >
                {mode === 'auto' ? `Auto (${isSuperCompact ? 'Super-Compact' : isCompact ? 'Compact' : 'Normal'})` : mode}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowDiscount(!showDiscountColumn)}
            className={`text-xs px-3 py-1.5 rounded-xl font-medium border transition-all ${
              showDiscountColumn 
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold' 
                : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            {showDiscountColumn ? '✓ Discount Col' : '+ Hide Discount'}
          </button>

          <button
            type="button"
            onClick={() => {
              const next = !showBuyerPan;
              setShowBuyerPan(next);
              try {
                localStorage.setItem('pnp_show_buyer_pan', String(next));
              } catch {}
            }}
            className={`text-xs px-3 py-1.5 rounded-xl font-medium border transition-all ${
              showBuyerPan 
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 font-bold' 
                : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Toggle Buyer PAN / Bill Number display on bill"
          >
            {showBuyerPan ? '✓ Buyer PAN' : '+ Buyer PAN (Hidden)'}
          </button>

          {/* Invoice Number Toggle Button */}
          <button
            type="button"
            onClick={() => {
              const next = !showInvoiceNumber;
              setShowInvoiceNumber(next);
              try { localStorage.setItem('pnp_show_invoice_number', String(next)); } catch {}
            }}
            className={`text-xs px-3 py-1.5 rounded-xl font-medium border transition-all ${
              showInvoiceNumber 
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 font-bold' 
                : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Toggle Invoice Number display on bill"
          >
            {showInvoiceNumber ? '✓ Invoice No' : '+ Invoice No (Hidden)'}
          </button>

          {/* Stamp Toggle Button */}
          <button
            type="button"
            onClick={() => {
              const next = !showStampOnBill;
              setShowStampOnBill(next);
              try { localStorage.setItem('pnp_bill_show_stamp', String(next)); } catch {}
            }}
            className={`text-xs px-3 py-1.5 rounded-xl font-medium border transition-all ${
              showStampOnBill
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold'
                : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Toggle Official Stamp on bill"
          >
            {showStampOnBill ? '✓ Stamp' : '+ Stamp (Off)'}
          </button>

          {/* Signature Toggle Button */}
          <button
            type="button"
            onClick={() => {
              const next = !showSignOnBill;
              setShowSignOnBill(next);
              try { localStorage.setItem('pnp_bill_show_sign', String(next)); } catch {}
            }}
            className={`text-xs px-3 py-1.5 rounded-xl font-medium border transition-all ${
              showSignOnBill
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 font-bold'
                : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Toggle Signature on bill"
          >
            {showSignOnBill ? '✓ Signature' : '+ Signature (Off)'}
          </button>

          {/* Payment QR Toggle Button (Available when unpaid or partial) */}
          {isUnpaidOrPartial && (
            <button
              type="button"
              onClick={() => {
                const next = !showQrOnBill;
                setShowQrOnBill(next);
                try { localStorage.setItem('pnp_bill_show_qr', String(next)); } catch {}
              }}
              className={`text-xs px-3 py-1.5 rounded-xl font-medium border transition-all ${
                showQrOnBill
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                  : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title="Toggle Payment QR Code on bill"
            >
              {showQrOnBill ? '✓ Payment QR' : '+ Payment QR (Off)'}
            </button>
          )}

          {/* Reset Stamp, Signature & QR Positions & Sizes */}
          {(signPos.x !== 0 || signPos.y !== 0 || stampPos.x !== 0 || stampPos.y !== 0 || qrPos.x !== 0 || qrPos.y !== 0 || signScale !== 1 || stampScale !== 1 || qrScale !== 1) && (
            <button
              type="button"
              onClick={resetPositions}
              className="text-xs px-3 py-1.5 rounded-xl font-medium border bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:text-white transition-all flex items-center gap-1.5 shadow-sm"
              title="Reset stamp, signature and QR to default position and size"
            >
              <RotateCcw className="h-3 w-3 text-sky-400" />
              <span>Reset Adjustments</span>
            </button>
          )}

          <span className="hidden xl:inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium px-1 select-none">
            <Move className="h-3 w-3 text-amber-400 animate-pulse" />
            <span>Drag on bill to move • Drag corner handles to resize</span>
          </span>
        </div>

        {/* Print & Stock Actions */}
        <div className="flex items-center space-x-2">
          {/* Stock Deduction Status Pill */}
          <button
            type="button"
            onClick={() => setActiveTab('stock')}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
              currentInvoice.stockDeducted
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
            }`}
            title="Click to view Stock Inventory & Sales Logs"
          >
            <PackageCheck className="h-4 w-4 text-emerald-400" />
            <span className="hidden sm:inline">
              {currentInvoice.stockDeducted ? 'Stock Deducted ✓' : 'Deducting Stock...'}
            </span>
            <span className="text-[10px] font-mono opacity-80">
              ({currentInvoice.items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0)} items)
            </span>
          </button>

          <button
            onClick={handlePrintClick}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-extrabold shadow-lg shadow-sky-500/30 transition-all animate-pulse"
          >
            <Printer className="h-4 w-4" />
            <span>Print A4 Invoice</span>
          </button>
        </div>
      </div>

      {/* A4 Printable Invoice Sheet */}
      <div className="print:m-0 print:p-0 print:w-full">
        <div className={`a4-print-sheet bg-white text-slate-900 selection:bg-slate-200 selection:text-slate-900 rounded-none shadow-2xl border border-slate-200 print:border-none print:shadow-none print:p-0 print:m-0 print:w-full flex flex-col justify-between font-sans ${
          isSuperCompact 
            ? 'p-3 sm:p-5 min-h-[280mm]' 
            : isCompact 
            ? 'p-4 sm:p-6 min-h-[285mm]' 
            : 'p-6 sm:p-8 min-h-[290mm]'
        }`}>
          
          {/* Top Header & Studio Info */}
          <div>
            
            {/* Tax Invoice Header Tag */}
            <div className={`flex items-center justify-between border-b-2 border-slate-900 ${isCompact ? 'pb-2 mb-2' : 'pb-3 mb-3'}`}>
              <div className="flex items-center space-x-4">
                {(() => {
                  const effectiveLogo = companyDetails.logoUrl || (!isGeneralSales ? pnpIcon : '');
                  if (effectiveLogo) {
                    return (
                      <img 
                        src={effectiveLogo} 
                        alt="Logo" 
                        className={`${isSuperCompact ? 'h-20 w-20' : isCompact ? 'h-24 w-24' : 'h-28 w-28 sm:h-32 sm:w-32'} object-contain shrink-0 filter drop-shadow-sm`} 
                      />
                    );
                  }
                  return (
                    <div className={`${isSuperCompact ? 'h-20 w-20 text-base' : isCompact ? 'h-24 w-24 text-xl' : 'h-28 w-28 sm:h-32 sm:w-32 text-2xl'} rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black tracking-tight shrink-0 shadow-md`}>
                      {displayBusinessName ? displayBusinessName.split(' ').map(w => w[0]).join('').slice(0, 3) : (isGeneralSales ? 'PPS' : 'PNP')}
                    </div>
                  );
                })()}
                <div>
                  <h1 className={`${isSuperCompact ? 'text-lg' : isCompact ? 'text-xl' : 'text-2xl sm:text-3xl'} font-black tracking-tight uppercase leading-tight`}>
                    {isGeneralSales ? (
                      <span className="text-slate-900 font-serif">{displayBusinessName}</span>
                    ) : (
                      <BrandTitle 
                        name={displayBusinessName} 
                        size={isSuperCompact ? 'md' : isCompact ? 'lg' : 'xl'} 
                        isPrintFriendly={true} 
                        showAccentBar={true}
                      />
                    )}
                  </h1>
                  <p className={`${isSuperCompact ? 'text-xs' : 'text-sm'} font-medium text-slate-600 font-sans leading-tight mt-0.5`}>
                    {displayTagline}
                  </p>
                  <p className="text-[11px] text-slate-700 mt-0.5 leading-tight">
                    {companyDetails.address}, {companyDetails.city} | Ph: {companyDetails.phonePrimary} {companyDetails.phoneSecondary ? `, ${companyDetails.phoneSecondary}` : ''}
                  </p>
                  <p className="text-[11px] text-slate-700 leading-tight">
                    Email: {companyDetails.email}
                  </p>
                </div>
              </div>

              {/* Invoice Title & PAN/VAT Box */}
              <div className="text-right">
                <span className={`inline-block px-2.5 py-0.5 rounded bg-slate-900 text-white font-extrabold tracking-wider uppercase ${isSuperCompact ? 'text-[9px] mb-1' : 'text-[10px] mb-1.5'}`}>
                  {invoiceHeaderTitle}
                </span>
                <div className="border border-slate-900 px-2.5 py-0.5 rounded inline-block text-right">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-600 leading-none">PAN / VAT No.</p>
                  <p className={`${isSuperCompact ? 'text-xs' : 'text-sm'} font-mono font-black text-slate-900 tracking-widest leading-tight`}>
                    {companyDetails.panVatNo}
                  </p>
                </div>
                <p className="text-[9px] font-bold text-slate-500 uppercase mt-0.5 tracking-widest">
                  [{copyType === 'customer' ? 'Customer Copy' : 'Office Copy'}]
                </p>
              </div>
            </div>

            {/* Invoice & Buyer Metadata Section */}
            <div className={`grid grid-cols-2 gap-3 border border-slate-900 rounded-lg bg-slate-50/50 ${
              isSuperCompact 
                ? 'p-1.5 text-[10px] mb-2' 
                : isCompact 
                ? 'p-2 text-[11px] mb-2.5' 
                : 'p-3 text-xs mb-3.5'
            }`}>
              
              {/* Left Box: Buyer / Customer Info */}
              <div className="space-y-0.5 border-r border-slate-300 pr-2">
                <div className="flex">
                  <span className="font-bold text-slate-700 w-22 shrink-0">Buyer's Name:</span>
                  <span className="font-bold text-slate-900 uppercase truncate">{currentInvoice.customerName || 'Cash Customer / Retail'}</span>
                </div>
                <div className="flex">
                  <span className="font-bold text-slate-700 w-22 shrink-0">Address:</span>
                  <span className="text-slate-800 truncate">{currentInvoice.customerAddress || 'N/A'}</span>
                </div>
                {currentInvoice.docType === 'cctv_invoice' && currentInvoice.installationSite && (
                  <div className="flex text-slate-900">
                    <span className="font-bold text-slate-700 w-22 shrink-0">Site Location:</span>
                    <span className="font-semibold truncate">{currentInvoice.installationSite}</span>
                  </div>
                )}
                <div className="flex">
                  <span className="font-bold text-slate-700 w-22 shrink-0">Contact Phone:</span>
                  <span className="font-mono text-slate-900">{currentInvoice.customerPhone || 'N/A'}</span>
                </div>
                {showBuyerPan && (
                  <div className="flex">
                    <span className="font-bold text-slate-700 w-22 shrink-0">Bill No. / PAN:</span>
                    <span className="font-mono font-bold text-slate-900">{currentInvoice.customerPanVat || 'N/A'}</span>
                  </div>
                )}
              </div>

              {/* Right Box: Invoice Meta */}
              <div className="space-y-0.5 pl-2 font-mono">
                {showInvoiceNumber && (
                  <div className="flex justify-between">
                    <span className="font-bold font-sans text-slate-700">Invoice No / बिल नं:</span>
                    <span className="text-slate-900 font-extrabold">{currentInvoice.invoiceNumber}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="font-bold font-sans text-slate-700">Fiscal Year / आ.व.:</span>
                  <span className="text-slate-900 font-bold">{currentInvoice.fiscalYear || companyDetails.fiscalYear}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="font-bold font-sans text-slate-700">नेपाली मिति (Miti BS):</span>
                  <span className="text-slate-900 font-bold font-sans">
                    {effectiveBS} {nepaliDateFormatted ? `(${nepaliDateFormatted})` : ''}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="font-bold font-sans text-slate-700">English Date (AD):</span>
                  <span className="text-slate-900 font-bold">{effectiveAD}</span>
                </div>
                <div className="flex justify-between pt-0.5 border-t border-slate-300">
                  <span className="font-bold font-sans text-slate-700">Mode of Payment:</span>
                  <span className={`font-sans font-bold uppercase ${
                    currentInvoice.paymentStatus === 'unpaid'
                      ? 'text-red-600'
                      : currentInvoice.paymentStatus === 'partial'
                      ? 'text-amber-600'
                      : 'text-slate-900'
                  }`}>
                    {currentInvoice.paymentMethod} ({currentInvoice.paymentStatus})
                  </span>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className={`border border-slate-900 rounded-lg overflow-hidden ${isSuperCompact ? 'mb-2' : isCompact ? 'mb-2.5' : 'mb-3.5'}`}>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[9px]">
                    <th className={`border-r border-slate-700 text-center w-8 ${isSuperCompact ? 'py-1 px-1.5' : isCompact ? 'py-1.5 px-2' : 'py-2 px-3'}`}>S.N.</th>
                    <th className={`border-r border-slate-700 ${isSuperCompact ? 'py-1 px-2' : isCompact ? 'py-1.5 px-2.5' : 'py-2 px-3'}`}>Description of Goods / Particulars</th>
                    <th className={`border-r border-slate-700 text-center w-12 ${isSuperCompact ? 'py-1 px-1' : isCompact ? 'py-1.5 px-1.5' : 'py-2 px-2'}`}>Qty</th>
                    <th className={`border-r border-slate-700 text-center w-14 ${isSuperCompact ? 'py-1 px-1' : isCompact ? 'py-1.5 px-1.5' : 'py-2 px-2'}`}>Unit</th>
                    <th className={`border-r border-slate-700 text-right w-22 ${isSuperCompact ? 'py-1 px-1.5' : isCompact ? 'py-1.5 px-2' : 'py-2 px-3'}`}>Rate (Rs.)</th>
                    {showDiscountColumn && (
                      <th className={`border-r border-slate-700 text-right w-18 ${isSuperCompact ? 'py-1 px-1.5' : isCompact ? 'py-1.5 px-2' : 'py-2 px-3'}`}>Discount</th>
                    )}
                    <th className={`text-right w-24 ${isSuperCompact ? 'py-1 px-2' : isCompact ? 'py-1.5 px-2.5' : 'py-2 px-3'}`}>Amount (Rs.)</th>
                  </tr>
                </thead>
                <tbody className={`divide-y divide-slate-300 ${isSuperCompact ? 'text-[10px]' : isCompact ? 'text-[11px]' : 'text-xs'}`}>
                  {currentInvoice.items.map((item, idx) => (
                    <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                      <td className={`text-center border-r border-slate-300 font-mono text-slate-600 ${isSuperCompact ? 'py-0.5 px-1.5' : isCompact ? 'py-1 px-2' : 'py-1.5 px-3'}`}>
                        {item.sn}
                      </td>
                      <td className={`border-r border-slate-300 font-semibold text-slate-900 ${isSuperCompact ? 'py-0.5 px-2 leading-snug' : isCompact ? 'py-1 px-2.5 leading-snug' : 'py-1.5 px-3'}`}>
                        {item.description}
                      </td>
                      <td className={`text-center border-r border-slate-300 font-mono font-bold ${isSuperCompact ? 'py-0.5 px-1' : isCompact ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>
                        {item.qty}
                      </td>
                      <td className={`text-center border-r border-slate-300 text-slate-700 ${isSuperCompact ? 'py-0.5 px-1' : isCompact ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>
                        {item.unit}
                      </td>
                      <td className={`text-right border-r border-slate-300 font-mono ${isSuperCompact ? 'py-0.5 px-1.5' : isCompact ? 'py-1 px-2' : 'py-1.5 px-3'}`}>
                        {formatNPR(item.listPrice, false)}
                      </td>
                      {showDiscountColumn && (
                        <td className={`text-right border-r border-slate-300 font-mono text-slate-700 ${isSuperCompact ? 'py-0.5 px-1.5' : isCompact ? 'py-1 px-2' : 'py-1.5 px-3'}`}>
                          {item.discountValue > 0 ? (item.discountType === 'percent' ? `${item.discountValue}%` : formatNPR(item.discountValue, false)) : '-'}
                        </td>
                      )}
                      <td className={`text-right font-mono font-bold text-slate-900 ${isSuperCompact ? 'py-0.5 px-2' : isCompact ? 'py-1 px-2.5' : 'py-1.5 px-3'}`}>
                        {formatNPR(item.amount, false)}
                      </td>
                    </tr>
                  ))}

                  {/* Padding Rows for standard invoice pad height */}
                  {Array.from({ length: paddingRowsNeeded }).map((_, i) => (
                    <tr key={`pad-${i}`} className={isCompact ? 'h-6' : 'h-7'}>
                      <td className="border-r border-slate-300"></td>
                      <td className="border-r border-slate-300"></td>
                      <td className="border-r border-slate-300"></td>
                      <td className="border-r border-slate-300"></td>
                      <td className="border-r border-slate-300"></td>
                      {showDiscountColumn && <td className="border-r border-slate-300"></td>}
                      <td></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculations & Amount in Words Grid */}
            <div className={`grid grid-cols-12 gap-3 avoid-break ${isSuperCompact ? 'mb-2 text-[10px]' : isCompact ? 'mb-2.5 text-[11px]' : 'mb-3.5 text-xs'}`}>
              
              {/* Left 7 Cols: Amount in Words & Notes */}
              <div className="col-span-7 flex flex-col justify-between space-y-2">
                <div className={`border border-slate-900 rounded-lg bg-slate-50 ${isSuperCompact ? 'p-1.5' : isCompact ? 'p-2' : 'p-2.5'}`}>
                  <p className="text-[9px] uppercase font-bold text-slate-600 tracking-wider">Amount in Words:</p>
                  <p className="font-serif font-bold text-slate-900 text-[11px] mt-0.5 leading-tight">
                    "{currentInvoice.amountInWords}"
                  </p>
                </div>

                {currentInvoice.notes && (
                  <div className="text-[10px] text-slate-700 italic border-l-2 border-slate-900 pl-2 leading-tight">
                    <strong>Note:</strong> {currentInvoice.notes}
                  </div>
                )}

                {currentInvoice.docType === 'cctv_invoice' && ((currentInvoice.serialNumbers && currentInvoice.serialNumbers.trim()) || (currentInvoice.warrantyInfo && currentInvoice.warrantyInfo.trim())) && (
                  <div className={`rounded-lg border border-slate-900 bg-slate-50 text-slate-900 space-y-1 ${
                    isSuperCompact ? 'p-1.5 text-[9px]' : 'p-2 text-[10px]'
                  }`}>
                    {currentInvoice.serialNumbers && currentInvoice.serialNumbers.trim() && (
                      <div>
                        <p className="font-bold uppercase tracking-wider text-slate-900 font-sans text-[9px]">Serial Numbers (S/N):</p>
                        <p className="font-mono mt-0.5 leading-tight font-semibold text-slate-900">{currentInvoice.serialNumbers}</p>
                      </div>
                    )}
                    {currentInvoice.warrantyInfo && currentInvoice.warrantyInfo.trim() && (
                      <div>
                        <p className="font-bold uppercase tracking-wider text-slate-900 font-sans text-[9px]">CCTV Warranty & Policy Terms:</p>
                        <p className="font-sans mt-0.5 leading-tight">{currentInvoice.warrantyInfo}</p>
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* Right 5 Cols: Financial Totals */}
              <div className="col-span-5 border border-slate-900 rounded-lg overflow-hidden font-mono">
                <table className="w-full">
                  <tbody className="divide-y divide-slate-300">
                    <tr className="bg-slate-50">
                      <td className={`font-sans text-slate-700 font-medium ${isSuperCompact ? 'py-0.5 px-2' : isCompact ? 'py-1 px-2.5' : 'py-1.5 px-3'}`}>Subtotal</td>
                      <td className={`text-right font-bold text-slate-900 ${isSuperCompact ? 'py-0.5 px-2' : isCompact ? 'py-1 px-2.5' : 'py-1.5 px-3'}`}>{formatNPR(currentInvoice.subtotal, false)}</td>
                    </tr>
                    {showDiscountColumn && (
                      <tr>
                        <td className={`font-sans text-slate-700 ${isSuperCompact ? 'py-0.5 px-2' : isCompact ? 'py-1 px-2.5' : 'py-1.5 px-3'}`}>Total Discount (-)</td>
                        <td className={`text-right text-slate-900 ${isSuperCompact ? 'py-0.5 px-2' : isCompact ? 'py-1 px-2.5' : 'py-1.5 px-3'}`}>{formatNPR(currentInvoice.totalDiscount, false)}</td>
                      </tr>
                    )}

                    {isVatInvoice && (
                      <>
                        <tr className="bg-slate-50">
                          <td className={`font-sans text-slate-700 ${isSuperCompact ? 'py-0.5 px-2' : isCompact ? 'py-1 px-2.5' : 'py-1.5 px-3'}`}>Taxable Amount</td>
                          <td className={`text-right font-bold text-slate-900 ${isSuperCompact ? 'py-0.5 px-2' : isCompact ? 'py-1 px-2.5' : 'py-1.5 px-3'}`}>{formatNPR(currentInvoice.taxableAmount, false)}</td>
                        </tr>
                        <tr>
                          <td className={`font-sans text-slate-700 ${isSuperCompact ? 'py-0.5 px-2' : isCompact ? 'py-1 px-2.5' : 'py-1.5 px-3'}`}>VAT 13% (+)</td>
                          <td className={`text-right font-bold text-slate-900 ${isSuperCompact ? 'py-0.5 px-2' : isCompact ? 'py-1 px-2.5' : 'py-1.5 px-3'}`}>{formatNPR(currentInvoice.vatAmount, false)}</td>
                        </tr>
                      </>
                    )}

                    <tr className="bg-slate-900 text-white font-bold">
                      <td className={`font-sans uppercase tracking-wider ${isSuperCompact ? 'py-1 px-2 text-xs' : 'py-1.5 px-3 text-xs'}`}>Grand Total</td>
                      <td className={`text-right font-mono ${isSuperCompact ? 'py-1 px-2 text-xs' : 'py-1.5 px-3 text-sm'}`}>{formatNPR(currentInvoice.grandTotal)}</td>
                    </tr>

                    {currentInvoice.paymentStatus === 'unpaid' && (
                      <tr className="text-red-700 font-bold bg-red-50">
                        <td className={`font-sans ${isSuperCompact ? 'py-0.5 px-2' : 'py-1 px-2.5'}`}>Payment Status</td>
                        <td className={`text-right ${isSuperCompact ? 'py-0.5 px-2' : 'py-1 px-2.5'}`}>UNPAID (Due: {formatNPR(effectiveDueAmount)})</td>
                      </tr>
                    )}

                    {currentInvoice.paymentStatus === 'partial' && (
                      <>
                        <tr className="text-emerald-700">
                          <td className={`font-sans ${isSuperCompact ? 'py-0.5 px-2' : 'py-1 px-2.5'}`}>Amount Paid</td>
                          <td className={`text-right font-bold ${isSuperCompact ? 'py-0.5 px-2' : 'py-1 px-2.5'}`}>{formatNPR(currentInvoice.amountPaid)}</td>
                        </tr>
                        <tr className="text-red-700 font-bold bg-red-50">
                          <td className={`font-sans ${isSuperCompact ? 'py-0.5 px-2' : 'py-1 px-2.5'}`}>Balance Due</td>
                          <td className={`text-right ${isSuperCompact ? 'py-0.5 px-2' : 'py-1 px-2.5'}`}>{formatNPR(currentInvoice.amountDue)}</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Terms & Conditions Box & Payment QR Section */}
            <div className={`border-t border-slate-300 avoid-break ${isSuperCompact ? 'pt-1.5 mb-2' : isCompact ? 'pt-2 mb-3' : 'pt-2.5 mb-4'}`}>
              <div className="flex items-start justify-between gap-4">
                
                {/* Left Side: Terms & Conditions and Bank Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-bold uppercase text-slate-700 tracking-wider mb-0.5">Terms & Conditions:</p>
                  <pre className="text-[9px] text-slate-600 font-sans whitespace-pre-wrap leading-tight">
                    {currentInvoice.terms}
                  </pre>

                  {companyDetails.bankName && (
                    <div className="mt-2 text-[9px] text-slate-700 border-t border-slate-200 pt-1 leading-snug">
                      <span className="font-bold text-slate-900 uppercase tracking-wide">Bank Details: </span>
                      <span className="font-semibold">{companyDetails.bankName}</span>
                      <span className="mx-1 text-slate-400">•</span>
                      <span>A/C No: </span><span className="font-mono font-bold text-slate-900">{companyDetails.accountNumber}</span>
                      <span className="mx-1 text-slate-400">•</span>
                      <span>Name: </span><span className="font-semibold text-slate-900">{companyDetails.accountName || companyDetails.studioName}</span>
                    </div>
                  )}
                </div>

                {/* Right Side: Payment QR Box (Rendered when Unpaid or Partial) */}
                {isUnpaidOrPartial && showQrOnBill && (
                  <div
                    onMouseDown={(e) => startDrag('qr', e)}
                    onTouchStart={(e) => startDrag('qr', e)}
                    style={{
                      transform: `translate3d(${qrPos.x}px, ${qrPos.y}px, 0) scale(${qrScale})`,
                      transformOrigin: 'bottom right',
                      touchAction: 'none'
                    }}
                    className={`resizable-item-container shrink-0 cursor-grab active:cursor-grabbing select-none group border border-slate-800 rounded-xl bg-white p-2 shadow-sm transition-shadow ${
                      isDraggingQr ? 'cursor-grabbing scale-105 shadow-md ring-2 ring-sky-500' : ''
                    } ${isResizingQr ? 'ring-2 ring-emerald-500 rounded-xl' : ''} print:shadow-none print:border-slate-800`}
                    title="Click & drag with mouse to adjust QR position on bill • Drag corner to resize"
                  >
                    <div className="relative flex items-center gap-2.5">
                      {/* QR Image Box */}
                      <div className="relative border border-slate-300 rounded-lg p-1 bg-white shrink-0 flex items-center justify-center">
                        {paymentQrSrc ? (
                          <img
                            src={paymentQrSrc}
                            alt="Payment QR"
                            className={`${isSuperCompact ? 'h-16 w-16' : isCompact ? 'h-20 w-20' : 'h-24 w-24'} object-contain pointer-events-none`}
                            draggable={false}
                          />
                        ) : (
                          <div className={`${isSuperCompact ? 'h-16 w-16' : isCompact ? 'h-20 w-20' : 'h-24 w-24'} bg-slate-100 flex flex-col items-center justify-center text-slate-500 p-1 text-center`}>
                            <QrCode className="h-6 w-6 text-slate-700 mb-0.5" />
                            <span className="text-[7px] font-bold">Fonepay QR</span>
                          </div>
                        )}

                        {/* Corner Resize Handle */}
                        <div
                          onMouseDown={(e) => startResize('qr', e)}
                          onTouchStart={(e) => startResize('qr', e)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-md border border-white cursor-nwse-resize hover:scale-125 z-30 print:!hidden"
                          title="Click and drag outward to enlarge, inward to shrink"
                        >
                          <Maximize2 className="h-2 w-2" />
                        </div>

                        {/* Drag & Resize indicator tooltip (hidden on print) */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex print:!hidden items-center gap-1 bg-slate-900 text-white text-[8px] px-1.5 py-0.5 rounded shadow absolute -top-4 left-1/2 -translate-x-1/2 pointer-events-auto whitespace-nowrap z-30">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const next = Math.max(0.5, Math.round((qrScale - 0.1) * 20) / 20);
                              setQrScale(next);
                              try { localStorage.setItem('pnp_bill_qr_scale', String(next)); } catch {}
                            }}
                            className="hover:text-emerald-400 font-extrabold px-0.5"
                            title="Shrink QR"
                          >
                            -
                          </button>
                          <span className="font-mono text-emerald-400 font-bold">{Math.round(qrScale * 100)}%</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const next = Math.min(2.0, Math.round((qrScale + 0.1) * 20) / 20);
                              setQrScale(next);
                              try { localStorage.setItem('pnp_bill_qr_scale', String(next)); } catch {}
                            }}
                            className="hover:text-emerald-400 font-extrabold px-0.5"
                            title="Enlarge QR"
                          >
                            +
                          </button>
                          <span className="text-slate-600">|</span>
                          <Move className="h-2 w-2 text-amber-400" />
                          <span>Drag / Resize</span>
                        </div>
                      </div>

                      {/* Payment Badge & Text */}
                      <div className="flex flex-col justify-between text-left space-y-1">
                        <div>
                          <span className="inline-block bg-red-600 text-white text-[7.5px] font-black uppercase px-1.5 py-0.5 rounded tracking-wide leading-none">
                            Fonepay / QR
                          </span>
                          <p className="text-[9px] font-extrabold text-slate-900 mt-0.5 leading-tight">
                            SCAN TO PAY
                          </p>
                        </div>

                        <div className="bg-red-50 border border-red-200 rounded px-1.5 py-0.5">
                          <p className="text-[7.5px] font-bold text-red-600 uppercase leading-none">Amount Due:</p>
                          <p className="text-[11px] font-mono font-black text-red-700 leading-tight">
                            {formatNPR(effectiveDueAmount)}
                          </p>
                        </div>

                        <p className="text-[7.5px] text-slate-500 leading-tight">
                          Mobile Banking / eSewa
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>

          {/* Bottom Signatures Section */}
          <div className={`grid grid-cols-2 gap-6 border-t-2 border-slate-900 avoid-break ${
            isSuperCompact ? 'pt-2 mt-1' : isCompact ? 'pt-3 mt-2' : 'pt-4 mt-3'
          }`}>
            {/* Receiver's Signature */}
            <div className="text-center flex flex-col items-center justify-end">
              <div className={`${isSuperCompact ? 'h-10' : isCompact ? 'h-12' : 'h-14'} w-full flex items-end justify-center`}></div>
              <div className={`border-b border-dashed border-slate-900 mx-auto ${isSuperCompact ? 'w-32' : 'w-40'} mt-1`}></div>
              <div className="mt-1">
                <p className="text-[11px] font-bold text-slate-900 uppercase">Receiver's Signature / Stamp</p>
                <p className="text-[9px] text-slate-500">मिति / Date: __________________</p>
              </div>
            </div>

            {/* Authorized Signatory */}
            <div className="text-center relative flex flex-col items-center justify-end">
              {/* Draggable Stamp and Signature Container */}
              <div className={`relative flex items-center justify-center ${isSuperCompact ? 'h-12' : isCompact ? 'h-14' : 'h-16'} w-full`}>
                
                {/* 1. SIGNATURE (Draggable Position + Draggable Size) */}
                {showSignOnBill && (
                  <div
                    onMouseDown={(e) => startDrag('sign', e)}
                    onTouchStart={(e) => startDrag('sign', e)}
                    style={{
                      transform: `translate3d(${signPos.x}px, ${signPos.y}px, 0) scale(${signScale})`,
                      transformOrigin: 'center center',
                      touchAction: 'none'
                    }}
                    className={`resizable-item-container absolute z-20 cursor-grab active:cursor-grabbing select-none group transition-shadow ${
                      isDraggingSign ? 'cursor-grabbing opacity-90' : ''
                    } ${isResizingSign ? 'ring-2 ring-blue-500/80 rounded' : ''}`}
                    title="Drag to reposition • Drag corner handle to enlarge or shrink"
                  >
                    <div className="relative p-1 rounded border border-transparent hover:border-blue-400/60 hover:bg-blue-50/20 print:border-none print:bg-transparent print:p-0">
                      {companyDetails.signatureUrl ? (
                        <img 
                          src={companyDetails.signatureUrl} 
                          alt="Authorized Signature" 
                          className="max-h-12 sm:max-h-14 max-w-[140px] sm:max-w-[160px] object-contain pointer-events-none"
                          draggable={false}
                        />
                      ) : (
                        <div className="flex flex-col items-center pointer-events-none">
                          <svg viewBox="0 0 160 55" className="w-28 sm:w-36 h-auto drop-shadow-sm select-none">
                            <path d="M12 38 C 25 18, 42 12, 58 24 C 68 32, 62 46, 78 30 C 92 16, 108 22, 122 20 C 132 18, 138 34, 150 30 M30 44 C 60 36, 92 30, 142 26" fill="none" stroke="#1d4ed8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                            <text x="35" y="50" fontSize="8" fontFamily="sans-serif" fill="#1e40af" fontWeight="700" opacity="0.75">Authorized</text>
                          </svg>
                        </div>
                      )}

                      {/* Corner Drag-to-Resize Handle (Bottom Right) */}
                      <div
                        onMouseDown={(e) => startResize('sign', e)}
                        onTouchStart={(e) => startResize('sign', e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-2 -right-2 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg border border-white cursor-nwse-resize hover:scale-125 z-30 print:!hidden"
                        title="Click and drag outward to enlarge, inward to shrink"
                      >
                        <Maximize2 className="h-2.5 w-2.5" />
                      </div>

                      {/* Corner Drag-to-Resize Handle (Top Right) */}
                      <div
                        onMouseDown={(e) => startResize('sign', e)}
                        onTouchStart={(e) => startResize('sign', e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-2 -right-2 w-4 h-4 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-sm border border-white cursor-nesw-resize hover:scale-125 z-30 print:!hidden"
                        title="Click and drag to resize"
                      >
                        <span className="text-[7px] font-bold">⤢</span>
                      </div>

                      {/* Drag & Scale Control Pill (Hover only, hidden on print) */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex print:!hidden items-center gap-1 bg-slate-900/95 text-white text-[8.5px] px-2 py-0.5 rounded-full shadow-xl border border-slate-700/80 absolute -top-8 left-1/2 -translate-x-1/2 pointer-events-auto whitespace-nowrap z-30">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const next = Math.max(0.4, Math.round((signScale - 0.1) * 20) / 20);
                            setSignScale(next);
                            try { localStorage.setItem('pnp_bill_sign_scale', String(next)); } catch {}
                          }}
                          className="hover:bg-slate-800 text-sky-300 font-extrabold px-1 rounded transition-colors"
                          title="Shrink signature (-10%)"
                        >
                          -
                        </button>
                        <span className="font-mono font-bold text-sky-400">{Math.round(signScale * 100)}%</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const next = Math.min(2.5, Math.round((signScale + 0.1) * 20) / 20);
                            setSignScale(next);
                            try { localStorage.setItem('pnp_bill_sign_scale', String(next)); } catch {}
                          }}
                          className="hover:bg-slate-800 text-sky-300 font-extrabold px-1 rounded transition-colors"
                          title="Enlarge signature (+10%)"
                        >
                          +
                        </button>
                        <span className="text-slate-600">|</span>
                        <span className="text-[7.5px] text-slate-300 flex items-center gap-0.5">
                          <Move className="h-2 w-2 text-amber-400" /> Drag move • Corner resizes
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. STAMP (Draggable Position + Draggable Size) */}
                {showStampOnBill && (
                  <div
                    onMouseDown={(e) => startDrag('stamp', e)}
                    onTouchStart={(e) => startDrag('stamp', e)}
                    style={{
                      transform: `translate3d(${stampPos.x}px, ${stampPos.y}px, 0) scale(${stampScale})`,
                      transformOrigin: 'center center',
                      touchAction: 'none'
                    }}
                    className={`resizable-item-container absolute right-1 sm:right-4 z-10 cursor-grab active:cursor-grabbing select-none group transition-shadow ${
                      isDraggingStamp ? 'cursor-grabbing opacity-90' : ''
                    } ${isResizingStamp ? 'ring-2 ring-red-500/80 rounded-full' : ''}`}
                    title="Drag to reposition • Drag corner handle to enlarge or shrink"
                  >
                    <div className="relative p-1 rounded-full border border-transparent hover:border-red-400/60 hover:bg-red-50/20 print:border-none print:bg-transparent print:p-0">
                      {companyDetails.stampUrl ? (
                        <img 
                          src={companyDetails.stampUrl} 
                          alt="Official Stamp" 
                          className="max-h-16 sm:max-h-20 max-w-[80px] sm:max-w-[90px] object-contain opacity-90 pointer-events-none filter drop-shadow-sm"
                          draggable={false}
                        />
                      ) : (
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-red-600/85 border-dashed p-0.5 flex items-center justify-center rotate-[-6deg] select-none pointer-events-none opacity-85 shadow-sm bg-white/40">
                          <div className="w-full h-full rounded-full border border-red-600/80 flex flex-col items-center justify-center text-center p-0.5 text-red-600 font-bold leading-none">
                            <span className="text-[6.5px] font-black uppercase tracking-wider">PNP TECH</span>
                            <span className="text-[5.5px] font-bold uppercase tracking-tight text-blue-600">TRADERS</span>
                            <span className="text-[5px] my-0.5 font-mono text-red-700">★ POKHARA ★</span>
                            <span className="text-[5.5px] font-extrabold uppercase tracking-tight text-red-600">OFFICIAL STAMP</span>
                          </div>
                        </div>
                      )}

                      {/* Corner Drag-to-Resize Handle (Bottom Right) */}
                      <div
                        onMouseDown={(e) => startResize('stamp', e)}
                        onTouchStart={(e) => startResize('stamp', e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-1 -right-1 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg border border-white cursor-nwse-resize hover:scale-125 z-30 print:!hidden"
                        title="Click and drag outward to enlarge, inward to shrink"
                      >
                        <Maximize2 className="h-2.5 w-2.5" />
                      </div>

                      {/* Corner Drag-to-Resize Handle (Top Right) */}
                      <div
                        onMouseDown={(e) => startResize('stamp', e)}
                        onTouchStart={(e) => startResize('stamp', e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center shadow-sm border border-white cursor-nesw-resize hover:scale-125 z-30 print:!hidden"
                        title="Click and drag to resize"
                      >
                        <span className="text-[7px] font-bold">⤢</span>
                      </div>

                      {/* Drag & Scale Control Pill (Hover only, hidden on print) */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex print:!hidden items-center gap-1 bg-slate-900/95 text-white text-[8.5px] px-2 py-0.5 rounded-full shadow-xl border border-slate-700/80 absolute -top-8 left-1/2 -translate-x-1/2 pointer-events-auto whitespace-nowrap z-30">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const next = Math.max(0.4, Math.round((stampScale - 0.1) * 20) / 20);
                            setStampScale(next);
                            try { localStorage.setItem('pnp_bill_stamp_scale', String(next)); } catch {}
                          }}
                          className="hover:bg-slate-800 text-rose-300 font-extrabold px-1 rounded transition-colors"
                          title="Shrink stamp (-10%)"
                        >
                          -
                        </button>
                        <span className="font-mono font-bold text-rose-400">{Math.round(stampScale * 100)}%</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const next = Math.min(2.5, Math.round((stampScale + 0.1) * 20) / 20);
                            setStampScale(next);
                            try { localStorage.setItem('pnp_bill_stamp_scale', String(next)); } catch {}
                          }}
                          className="hover:bg-slate-800 text-rose-300 font-extrabold px-1 rounded transition-colors"
                          title="Enlarge stamp (+10%)"
                        >
                          +
                        </button>
                        <span className="text-slate-600">|</span>
                        <span className="text-[7.5px] text-slate-300 flex items-center gap-0.5">
                          <Move className="h-2 w-2 text-amber-400" /> Drag move • Corner resizes
                        </span>
                      </div>
                    </div>
                  </div>
                )}

              </div>
              <div className={`border-b border-dashed border-slate-900 mx-auto ${isSuperCompact ? 'w-32' : 'w-40'} mt-1`}></div>
              <div className="mt-1">
                <p className="text-[11px] font-bold text-slate-900 uppercase truncate px-1">
                  For{' '}
                  {!isGeneralSales && (displayBusinessName || '').toUpperCase().startsWith('PNP') ? (
                    <>
                      <span className="text-red-600 print:text-red-600 font-black">PNP TECH</span>{' '}
                      <span className="text-blue-600 print:text-blue-600 font-black">
                        {(displayBusinessName || '').toUpperCase().startsWith('PNP TECH')
                          ? (displayBusinessName || '').slice(8).trim()
                          : (displayBusinessName || '').slice(3).trim()}
                      </span>
                    </>
                  ) : (
                    displayBusinessName
                  )}
                </p>
                <p className="text-[9px] font-semibold text-slate-600">Authorized Signatory / Manager</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
