import React, { useState, useEffect } from 'react';
import { 
  Calculator, Copy, Check, PlusCircle, ArrowRightLeft, 
  Percent, DollarSign, Frame, Trash2, Clock 
} from 'lucide-react';
import { useInvoiceStore } from '../store/useInvoiceStore';
import { formatNPR } from '../utils/formatters';

export const CalculatorSection: React.FC = () => {
  const { addLineItem, setActiveTab, currentInvoice } = useInvoiceStore();

  // Active sub-tab inside calculator
  const [calcMode, setCalcMode] = useState<'standard' | 'change' | 'framing'>('standard');

  // Standard Calculator State
  const [expression, setExpression] = useState<string>('');
  const [displayValue, setDisplayValue] = useState<string>('0');
  const [history, setHistory] = useState<Array<{ id: string; expr: string; res: string; time: string }>>(() => {
    try {
      const saved = localStorage.getItem('pnp_calc_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [copied, setCopied] = useState<boolean>(false);
  const [addedItemSuccess, setAddedItemSuccess] = useState<boolean>(false);

  // Cash Change Calculator State
  const [billAmount, setBillAmount] = useState<number>(currentInvoice.grandTotal > 0 ? currentInvoice.grandTotal : 0);
  const [tenderedCash, setTenderedCash] = useState<number>(0);

  // Frame & Area Calculator State
  const [frameWidth, setFrameWidth] = useState<number>(12);
  const [frameHeight, setFrameHeight] = useState<number>(18);
  const [frameUnit, setFrameUnit] = useState<'inch' | 'feet'>('inch');
  const [ratePerSqFt, setRatePerSqFt] = useState<number>(800);
  const [extraFramingCost, setExtraFramingCost] = useState<number>(0);
  const [frameItemName, setFrameItemName] = useState<string>('Photo Frame Matte Finish');

  // Save history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('pnp_calc_history', JSON.stringify(history.slice(0, 30)));
    } catch {}
  }, [history]);

  // Keyboard support for standard calculator
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (calcMode !== 'standard') return;
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') return;

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
      } else if (key === 'Escape' || key === 'c' || key === 'C') {
        handleClearAll();
      } else if (key === '%') {
        handlePercentage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [calcMode, displayValue, expression]);

  // Safe evaluation
  const safeEval = (expr: string): number => {
    try {
      const normalized = expr
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/%/g, '*0.01');

      if (!/^[0-9+\-*/().\s]+$/.test(normalized)) {
        return 0;
      }

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
    const resultStr = String(result);

    // Save to history
    const record = {
      id: 'calc-' + Date.now(),
      expr: fullExpr,
      res: resultStr,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
    setHistory(prev => [record, ...prev.slice(0, 29)]);

    setDisplayValue(resultStr);
    setExpression('');
  };

  const handleClearAll = () => {
    setDisplayValue('0');
    setExpression('');
  };

  const handleClearEntry = () => {
    setDisplayValue('0');
  };

  const handleBackspace = () => {
    if (displayValue.length <= 1 || displayValue === 'Error') {
      setDisplayValue('0');
    } else {
      setDisplayValue(displayValue.slice(0, -1));
    }
  };

  const handleToggleSign = () => {
    const num = parseFloat(displayValue);
    if (isNaN(num)) return;
    setDisplayValue(String(-num));
  };

  const handlePercentage = () => {
    const num = parseFloat(displayValue);
    if (isNaN(num)) return;
    setDisplayValue(String(num / 100));
  };

  // Quick VAT & Discount Helpers
  const handleAddVat13 = () => {
    const num = parseFloat(displayValue);
    if (isNaN(num)) return;
    const withVat = Math.round((num * 1.13) * 100) / 100;
    setExpression(`${num} + 13% VAT =`);
    setDisplayValue(String(withVat));
    setHistory(prev => [{
      id: 'calc-' + Date.now(),
      expr: `${num} + 13% VAT`,
      res: String(withVat),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }, ...prev]);
  };

  const handleReverseVat13 = () => {
    const num = parseFloat(displayValue);
    if (isNaN(num)) return;
    const base = Math.round((num / 1.13) * 100) / 100;
    const vat = Math.round((num - base) * 100) / 100;
    setExpression(`${num} (Gross) ÷ 1.13 (VAT Extract) =`);
    setDisplayValue(String(base));
    setHistory(prev => [{
      id: 'calc-' + Date.now(),
      expr: `${num} Gross → Base: ${base} | VAT: ${vat}`,
      res: String(base),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }, ...prev]);
  };

  const handleApplyDiscount = (pct: number) => {
    const num = parseFloat(displayValue);
    if (isNaN(num)) return;
    const discounted = Math.round((num * (1 - pct / 100)) * 100) / 100;
    setExpression(`${num} - ${pct}% Disc =`);
    setDisplayValue(String(discounted));
    setHistory(prev => [{
      id: 'calc-' + Date.now(),
      expr: `${num} - ${pct}% Disc`,
      res: String(discounted),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }, ...prev]);
  };

  const handleCopyResult = () => {
    navigator.clipboard.writeText(displayValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddToInvoice = (amount: number, description = 'Calculated Goods / Service') => {
    addLineItem({
      description,
      qty: 1,
      unit: 'Pcs',
      listPrice: amount,
      discountValue: 0
    });
    setAddedItemSuccess(true);
    setTimeout(() => setAddedItemSuccess(false), 3000);
  };

  // Change Calculation
  const changeDue = Math.max(0, tenderedCash - billAmount);
  const isExactOrMore = tenderedCash >= billAmount && billAmount > 0;

  // Breakdown of change in currency notes
  const getDenominations = (amount: number) => {
    if (amount <= 0) return [];
    let rem = Math.floor(amount);
    const notes = [1000, 500, 100, 50, 20, 10, 5];
    const breakdown: Array<{ note: number; count: number }> = [];

    for (const note of notes) {
      if (rem >= note) {
        const count = Math.floor(rem / note);
        rem %= note;
        breakdown.push({ note, count });
      }
    }
    return breakdown;
  };

  // Framing & Area Calculation
  const widthInFt = frameUnit === 'inch' ? frameWidth / 12 : frameWidth;
  const heightInFt = frameUnit === 'inch' ? frameHeight / 12 : frameHeight;
  const totalSqFt = Math.round((widthInFt * heightInFt) * 100) / 100;
  const totalSqInch = frameUnit === 'inch' ? frameWidth * frameHeight : (frameWidth * 12) * (frameHeight * 12);
  const frameBaseCost = Math.round((totalSqFt * ratePerSqFt) * 100) / 100;
  const totalFramePrice = Math.round((frameBaseCost + Number(extraFramingCost || 0)) * 100) / 100;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 print:hidden animate-fadeIn">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white tracking-tight">
                Smart Retail & Billing Calculator
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Financial arithmetic, Nepal 13% VAT helper, Cash counter change & Photo framing area estimator
              </p>
            </div>
          </div>
        </div>

        {/* Sub-mode Switcher */}
        <div className="flex items-center space-x-1.5 bg-slate-900 p-1 rounded-2xl border border-slate-800 self-start sm:self-auto">
          {[
            { id: 'standard', label: 'Standard & VAT Calc', icon: Calculator },
            { id: 'change', label: 'Cash Change Counter', icon: DollarSign },
            { id: 'framing', label: 'Frame & Area Estimator', icon: Frame },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = calcMode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCalcMode(tab.id as any)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Success Notification after adding line item */}
      {addedItemSuccess && (
        <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-emerald-300 text-xs font-bold flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-2">
            <Check className="h-4 w-4 text-emerald-400" />
            <span>Successfully inserted calculated amount into active Invoice Line Items!</span>
          </div>
          <button
            onClick={() => setActiveTab('create')}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all"
          >
            Go to Invoice Editor →
          </button>
        </div>
      )}

      {/* MODE 1: Standard & VAT Calculator */}
      {calcMode === 'standard' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Calculator Pad (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
              
              {/* Digital LCD Screen Display */}
              <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between min-h-[110px] shadow-inner relative group">
                
                {/* Top live expression & History note */}
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 min-h-[20px]">
                  <span className="truncate max-w-[80%] text-slate-400 font-medium">
                    {expression || 'Ready'}
                  </span>
                  <span className="text-[10px] text-sky-400/80 uppercase font-bold tracking-wider">
                    Keyboard Ready
                  </span>
                </div>

                {/* Main Large Digital Digits */}
                <div className="flex items-end justify-between mt-2">
                  <span className="text-xs font-mono text-slate-500 font-bold">NPR</span>
                  <div className="text-right overflow-x-auto scrollbar-none font-mono font-black text-2xl sm:text-4xl text-white tracking-tight">
                    {displayValue}
                  </div>
                </div>

                {/* Quick Action Overlay Buttons inside Screen */}
                <div className="absolute right-3 top-3 flex items-center space-x-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={handleCopyResult}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs flex items-center space-x-1"
                    title="Copy Result"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    <span className="text-[10px] font-bold">{copied ? 'Copied' : 'Copy'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddToInvoice(parseFloat(displayValue) || 0)}
                    className="p-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white transition-all text-xs flex items-center space-x-1 font-bold shadow-md"
                    title="Insert directly as line item in current invoice"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span className="text-[10px] hidden sm:inline">Add to Bill</span>
                  </button>
                </div>
              </div>

              {/* Quick Tax & Special Operations Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleAddVat13}
                  className="py-2 px-2.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 hover:text-white border border-indigo-500/40 text-xs font-bold transition-all flex items-center justify-center space-x-1.5"
                  title="Add 13% VAT to current number"
                >
                  <Percent className="h-3.5 w-3.5 text-indigo-400" />
                  <span>+13% VAT</span>
                </button>

                <button
                  type="button"
                  onClick={handleReverseVat13}
                  className="py-2 px-2.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 hover:text-white border border-purple-500/40 text-xs font-bold transition-all flex items-center justify-center space-x-1.5"
                  title="Extract Net Base from Gross amount (Divide by 1.13)"
                >
                  <ArrowRightLeft className="h-3.5 w-3.5 text-purple-400" />
                  <span>Reverse VAT</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyDiscount(10)}
                  className="py-2 px-2.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 hover:text-white border border-amber-500/30 text-xs font-bold transition-all flex items-center justify-center space-x-1"
                >
                  <span>-10% Disc</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyDiscount(5)}
                  className="py-2 px-2.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 hover:text-white border border-amber-500/30 text-xs font-bold transition-all flex items-center justify-center space-x-1"
                >
                  <span>-5% Disc</span>
                </button>
              </div>

              {/* Main Keypad Grid */}
              <div className="grid grid-cols-4 gap-2 sm:gap-2.5 pt-1">
                
                {/* Row 1: Clear & Functional Operations */}
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="py-3.5 rounded-2xl bg-red-600/20 hover:bg-red-600/40 text-red-400 hover:text-white border border-red-500/30 font-black text-sm transition-all"
                >
                  C
                </button>
                <button
                  type="button"
                  onClick={handleClearEntry}
                  className="py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition-all"
                >
                  CE
                </button>
                <button
                  type="button"
                  onClick={handleBackspace}
                  className="py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition-all flex items-center justify-center"
                >
                  ⌫
                </button>
                <button
                  type="button"
                  onClick={() => handleOperator('÷')}
                  className="py-3.5 rounded-2xl bg-sky-600/30 hover:bg-sky-600 text-sky-300 hover:text-white border border-sky-500/30 font-black text-base transition-all"
                >
                  ÷
                </button>

                {/* Row 2: 7, 8, 9, × */}
                {['7', '8', '9'].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleDigit(num)}
                    className="py-3.5 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-white font-bold text-lg transition-all shadow-sm active:scale-95"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleOperator('×')}
                  className="py-3.5 rounded-2xl bg-sky-600/30 hover:bg-sky-600 text-sky-300 hover:text-white border border-sky-500/30 font-black text-base transition-all"
                >
                  ×
                </button>

                {/* Row 3: 4, 5, 6, - */}
                {['4', '5', '6'].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleDigit(num)}
                    className="py-3.5 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-white font-bold text-lg transition-all shadow-sm active:scale-95"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleOperator('-')}
                  className="py-3.5 rounded-2xl bg-sky-600/30 hover:bg-sky-600 text-sky-300 hover:text-white border border-sky-500/30 font-black text-base transition-all"
                >
                  -
                </button>

                {/* Row 4: 1, 2, 3, + */}
                {['1', '2', '3'].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleDigit(num)}
                    className="py-3.5 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-white font-bold text-lg transition-all shadow-sm active:scale-95"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleOperator('+')}
                  className="py-3.5 rounded-2xl bg-sky-600/30 hover:bg-sky-600 text-sky-300 hover:text-white border border-sky-500/30 font-black text-base transition-all"
                >
                  +
                </button>

                {/* Row 5: ±, 0, ., = */}
                <button
                  type="button"
                  onClick={handleToggleSign}
                  className="py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-base transition-all"
                >
                  ±
                </button>
                <button
                  type="button"
                  onClick={() => handleDigit('0')}
                  className="py-3.5 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-white font-bold text-lg transition-all active:scale-95"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleDecimal}
                  className="py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-black text-lg transition-all"
                >
                  .
                </button>
                <button
                  type="button"
                  onClick={handleEquals}
                  className="py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-black text-xl shadow-lg shadow-sky-500/30 transition-all active:scale-95"
                >
                  =
                </button>
              </div>

            </div>
          </div>

          {/* Right Column: Calculation History & Quick Bill Transfer (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Calculation History Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col justify-between h-full min-h-[420px]">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                  <div className="flex items-center space-x-2 text-sky-400">
                    <Clock className="h-4 w-4" />
                    <h3 className="font-bold text-xs text-white uppercase tracking-wider">Calculation History Tape</h3>
                  </div>
                  {history.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setHistory([])}
                      className="text-[11px] text-red-400 hover:text-red-300 font-medium flex items-center space-x-1"
                      title="Clear History Tape"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Clear</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
                  {history.length > 0 ? (
                    history.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setDisplayValue(item.res)}
                        className="p-2.5 rounded-xl bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800/80 transition-all cursor-pointer group flex items-center justify-between"
                      >
                        <div className="overflow-hidden pr-2">
                          <p className="text-[11px] font-mono text-slate-400 truncate">{item.expr}</p>
                          <p className="text-xs font-mono font-bold text-white mt-0.5 group-hover:text-sky-400 transition-colors">
                            = {item.res}
                          </p>
                        </div>
                        <span className="text-[10px] text-slate-600 font-mono shrink-0">
                          {item.time}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 text-center text-xs text-slate-500">
                      No calculations recorded yet.<br />Use keypad or keyboard to calculate.
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Quick Tools */}
              <div className="pt-4 border-t border-slate-800/80 space-y-2">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Quick Invoice Insertion
                </p>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handleAddToInvoice(parseFloat(displayValue) || 0, 'General Goods / Service')}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center space-x-2"
                  >
                    <PlusCircle className="h-4 w-4" />
                    <span>Insert Rs. {displayValue} to Invoice</span>
                  </button>
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* MODE 2: Cash Counter Change Calculator */}
      {calcMode === 'change' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl max-w-3xl mx-auto space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-400" />
              Cash Counter & Change Return Calculator
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Enter bill amount and cash tendered by the buyer to compute exact return change and currency notes breakdown.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Bill Amount */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase text-slate-300 tracking-wider">
                Total Bill Amount (Rs.)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={billAmount}
                onChange={(e) => setBillAmount(parseFloat(e.target.value) || 0)}
                placeholder="e.g. 1450"
                className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-2xl p-3.5 text-lg font-mono font-extrabold text-white"
              />
              {currentInvoice.grandTotal > 0 && (
                <button
                  type="button"
                  onClick={() => setBillAmount(currentInvoice.grandTotal)}
                  className="text-[11px] text-sky-400 hover:text-sky-300 font-bold"
                >
                  Use current invoice total (Rs. {formatNPR(currentInvoice.grandTotal, false)})
                </button>
              )}
            </div>

            {/* Cash Received */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase text-slate-300 tracking-wider">
                Cash Tendered / Received (Rs.)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={tenderedCash}
                onChange={(e) => setTenderedCash(parseFloat(e.target.value) || 0)}
                placeholder="e.g. 2000"
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-2xl p-3.5 text-lg font-mono font-extrabold text-emerald-400"
              />

              {/* Quick Cash Buttons */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[500, 1000, 1500, 2000, 5000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setTenderedCash(amt)}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono font-bold transition-all"
                  >
                    Rs. {amt}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setTenderedCash(billAmount)}
                  className="px-2 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 text-[11px] font-bold transition-all"
                >
                  Exact
                </button>
              </div>
            </div>

          </div>

          {/* Change Display Banner */}
          <div className={`p-6 rounded-2xl border transition-all ${
            isExactOrMore 
              ? 'bg-emerald-950/40 border-emerald-500/40 text-white' 
              : tenderedCash > 0 && tenderedCash < billAmount
              ? 'bg-red-950/40 border-red-500/40 text-red-200'
              : 'bg-slate-950 border-slate-800 text-slate-300'
          }`}>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider font-bold text-slate-400">
                  {tenderedCash >= billAmount ? 'Cash Change to Return Buyer' : 'Remaining Due from Buyer'}
                </p>
                <h4 className="text-3xl sm:text-4xl font-mono font-black mt-1">
                  Rs. {formatNPR(Math.abs(tenderedCash - billAmount), false)}
                </h4>
              </div>

              {/* Currency Breakdown Notes */}
              {isExactOrMore && changeDue > 0 && (
                <div className="text-right sm:border-l border-slate-800 sm:pl-6">
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Recommended Currency Notes:</p>
                  <div className="flex flex-wrap gap-1.5 justify-end">
                    {getDenominations(changeDue).map((item) => (
                      <span key={item.note} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-emerald-400 text-xs font-mono font-bold">
                        {item.count} × Rs. {item.note}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* MODE 3: Photo Frame & Square Feet Area Estimator */}
      {calcMode === 'framing' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl max-w-4xl mx-auto space-y-6">
          <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                <Frame className="h-5 w-5 text-indigo-400" />
                Photo Framing & Banner Dimensions Calculator
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Calculate total square feet, custom synthetic/wooden frame price, or banner print cost based on length and width.
              </p>
            </div>

            {/* Unit Switcher */}
            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {(['inch', 'feet'] as const).map((unit) => (
                <button
                  key={unit}
                  type="button"
                  onClick={() => setFrameUnit(unit)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all ${
                    frameUnit === unit ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {unit === 'inch' ? 'Inches (in)' : 'Feet (ft)'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Width ({frameUnit === 'inch' ? 'Inches' : 'Feet'})
              </label>
              <input
                type="number"
                min="0.1"
                step="any"
                value={frameWidth}
                onChange={(e) => setFrameWidth(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-3 text-sm font-mono font-bold text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Height ({frameUnit === 'inch' ? 'Inches' : 'Feet'})
              </label>
              <input
                type="number"
                min="0.1"
                step="any"
                value={frameHeight}
                onChange={(e) => setFrameHeight(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-3 text-sm font-mono font-bold text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Rate per Square Foot (Rs.)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={ratePerSqFt}
                onChange={(e) => setRatePerSqFt(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-3 text-sm font-mono font-bold text-white"
              />
            </div>

          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Item Description Name
              </label>
              <input
                type="text"
                value={frameItemName}
                onChange={(e) => setFrameItemName(e.target.value)}
                placeholder="e.g. Photo Frame Synthetic Matte"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Extra Mounting / Glass / Labor (Rs.)
              </label>
              <input
                type="number"
                min="0"
                value={extraFramingCost}
                onChange={(e) => setExtraFramingCost(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-2.5 text-xs font-mono text-white"
              />
            </div>
          </div>

          {/* Computed Summary Banner */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-3 text-xs font-mono text-slate-400">
                <span>Dimensions: <strong>{frameWidth} × {frameHeight} {frameUnit}</strong></span>
                <span>•</span>
                <span>Area: <strong className="text-indigo-400">{totalSqFt} Sq. Ft.</strong> ({totalSqInch} sq in)</span>
              </div>
              <div className="text-2xl font-black font-mono text-white pt-1">
                Estimated Price: <span className="text-indigo-400">Rs. {formatNPR(totalFramePrice, false)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleAddToInvoice(totalFramePrice, `${frameItemName} (${frameWidth}x${frameHeight} ${frameUnit} - ${totalSqFt} Sq Ft)`)}
              className="py-3 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center space-x-2 shrink-0"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Add to Invoice Line Items</span>
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
