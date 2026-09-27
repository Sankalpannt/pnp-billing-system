import React, { useState, useEffect } from 'react';
import { 
  Calculator, X, Copy, Check, PlusCircle 
} from 'lucide-react';
import { useInvoiceStore } from '../store/useInvoiceStore';

interface QuickCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickCalculatorModal: React.FC<QuickCalculatorModalProps> = ({ isOpen, onClose }) => {
  const { addLineItem } = useInvoiceStore();
  const [expression, setExpression] = useState<string>('');
  const [displayValue, setDisplayValue] = useState<string>('0');
  const [copied, setCopied] = useState<boolean>(false);
  const [addedSuccess, setAddedSuccess] = useState<boolean>(false);

  // Keyboard events when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      if (/^[0-9]$/.test(key)) {
        handleDigit(key);
      } else if (key === '.') {
        handleDecimal();
      } else if (key === '+' || key === '-' || key === '*' || key === '/') {
        const opMap: Record<string, string> = { '+': '+', '-': '-', '*': '×', '/': '÷' };
        handleOperator(opMap[key] || key);
      } else if (key === 'Enter' || key === '=') {
        e.preventDefault();
        handleEquals();
      } else if (key === 'Backspace') {
        handleBackspace();
      } else if (key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, displayValue, expression]);

  if (!isOpen) return null;

  const safeEval = (expr: string): number => {
    try {
      const normalized = expr
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/%/g, '*0.01');

      if (!/^[0-9+\-*/().\s]+$/.test(normalized)) return 0;
      // eslint-disable-next-line no-new-func
      const result = Function(`'use strict'; return (${normalized})`)();
      if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
        return Math.round(result * 10000) / 10000;
      }
      return 0;
    } catch {
      return 0;
    }
  };

  const handleDigit = (digit: string) => {
    if (displayValue === '0' || displayValue === 'Error') {
      setDisplayValue(digit);
    } else {
      setDisplayValue(displayValue + digit);
    }
  };

  const handleDecimal = () => {
    if (!displayValue.includes('.')) {
      setDisplayValue(displayValue + '.');
    }
  };

  const handleOperator = (op: string) => {
    if (displayValue === 'Error') return;
    const newExpr = expression ? `${expression} ${displayValue} ${op}` : `${displayValue} ${op}`;
    setExpression(newExpr);
    setDisplayValue('0');
  };

  const handleEquals = () => {
    if (!expression && displayValue) return;
    const fullExpr = `${expression} ${displayValue}`;
    const result = safeEval(fullExpr);
    setDisplayValue(String(result));
    setExpression('');
  };

  const handleClearAll = () => {
    setDisplayValue('0');
    setExpression('');
  };

  const handleBackspace = () => {
    if (displayValue.length <= 1 || displayValue === 'Error') {
      setDisplayValue('0');
    } else {
      setDisplayValue(displayValue.slice(0, -1));
    }
  };

  const handleAddVat13 = () => {
    const num = parseFloat(displayValue);
    if (isNaN(num)) return;
    const withVat = Math.round((num * 1.13) * 100) / 100;
    setExpression(`${num} + 13% VAT =`);
    setDisplayValue(String(withVat));
  };

  const handleReverseVat13 = () => {
    const num = parseFloat(displayValue);
    if (isNaN(num)) return;
    const base = Math.round((num / 1.13) * 100) / 100;
    setExpression(`${num} (Gross) ÷ 1.13 =`);
    setDisplayValue(String(base));
  };

  const handleApplyDiscount = (pct: number) => {
    const num = parseFloat(displayValue);
    if (isNaN(num)) return;
    const discounted = Math.round((num * (1 - pct / 100)) * 100) / 100;
    setExpression(`${num} - ${pct}% =`);
    setDisplayValue(String(discounted));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(displayValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsertToInvoice = () => {
    const amount = parseFloat(displayValue) || 0;
    if (amount <= 0) return;
    addLineItem({
      description: 'Calculated Item',
      qty: 1,
      unit: 'Pcs',
      listPrice: amount,
      discountValue: 0
    });
    setAddedSuccess(true);
    setTimeout(() => {
      setAddedSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-scaleUp">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-2 text-sky-400">
            <Calculator className="h-4 w-4" />
            <span className="text-xs font-bold text-white">Quick Billing Calculator</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* LCD Screen */}
        <div className="p-4 space-y-3">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 text-right font-mono">
            <div className="text-[11px] text-slate-400 min-h-[16px] truncate">
              {expression || ' '}
            </div>
            <div className="text-3xl font-black text-white mt-1 overflow-x-auto scrollbar-none">
              {displayValue}
            </div>
          </div>

          {/* Quick Tax Helpers */}
          <div className="grid grid-cols-4 gap-1.5">
            <button
              type="button"
              onClick={handleAddVat13}
              className="py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 text-[11px] font-bold border border-indigo-500/30"
            >
              +13% VAT
            </button>
            <button
              type="button"
              onClick={handleReverseVat13}
              className="py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 text-[11px] font-bold border border-purple-500/30"
            >
              Rev VAT
            </button>
            <button
              type="button"
              onClick={() => handleApplyDiscount(10)}
              className="py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 text-[11px] font-bold border border-amber-500/30"
            >
              -10%
            </button>
            <button
              type="button"
              onClick={() => handleApplyDiscount(5)}
              className="py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 text-[11px] font-bold border border-amber-500/30"
            >
              -5%
            </button>
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-4 gap-1.5">
            <button type="button" onClick={handleClearAll} className="py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600/40 text-red-400 font-bold text-xs">C</button>
            <button type="button" onClick={() => setDisplayValue('0')} className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs">CE</button>
            <button type="button" onClick={handleBackspace} className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs">⌫</button>
            <button type="button" onClick={() => handleOperator('÷')} className="py-2.5 rounded-xl bg-sky-600/30 text-sky-300 font-bold text-sm">÷</button>

            {['7', '8', '9'].map(n => (
              <button key={n} type="button" onClick={() => handleDigit(n)} className="py-2.5 rounded-xl bg-slate-800/90 text-white font-bold text-base hover:bg-slate-700">{n}</button>
            ))}
            <button type="button" onClick={() => handleOperator('×')} className="py-2.5 rounded-xl bg-sky-600/30 text-sky-300 font-bold text-sm">×</button>

            {['4', '5', '6'].map(n => (
              <button key={n} type="button" onClick={() => handleDigit(n)} className="py-2.5 rounded-xl bg-slate-800/90 text-white font-bold text-base hover:bg-slate-700">{n}</button>
            ))}
            <button type="button" onClick={() => handleOperator('-')} className="py-2.5 rounded-xl bg-sky-600/30 text-sky-300 font-bold text-sm">-</button>

            {['1', '2', '3'].map(n => (
              <button key={n} type="button" onClick={() => handleDigit(n)} className="py-2.5 rounded-xl bg-slate-800/90 text-white font-bold text-base hover:bg-slate-700">{n}</button>
            ))}
            <button type="button" onClick={() => handleOperator('+')} className="py-2.5 rounded-xl bg-sky-600/30 text-sky-300 font-bold text-sm">+</button>

            <button type="button" onClick={handleDecimal} className="py-2.5 rounded-xl bg-slate-800 text-white font-bold text-base hover:bg-slate-700">.</button>
            <button type="button" onClick={() => handleDigit('0')} className="py-2.5 rounded-xl bg-slate-800/90 text-white font-bold text-base hover:bg-slate-700">0</button>
            <button type="button" onClick={handleCopy} className="py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 flex items-center justify-center">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <button type="button" onClick={handleEquals} className="py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold text-base">=</button>
          </div>

          {/* Action Bar */}
          <div className="pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={handleInsertToInvoice}
              className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
                addedSuccess 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-emerald-600/80 hover:bg-emerald-500 text-white shadow-md'
              }`}
            >
              {addedSuccess ? <Check className="h-4 w-4" /> : <PlusCircle className="h-4 w-4" />}
              <span>{addedSuccess ? 'Added to Line Items!' : `Insert Rs. ${displayValue} to Bill`}</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
