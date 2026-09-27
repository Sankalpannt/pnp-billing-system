import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, Lock, Unlock, Eye, EyeOff, AlertCircle, 
  HelpCircle, CheckCircle2, ArrowRight, KeyRound, Sparkles, X, RotateCcw
} from 'lucide-react';
import { useInvoiceStore } from '../store/useInvoiceStore';
import { useLiveClock } from '../hooks/useLiveClock';
import { BrandTitle } from './BrandTitle';

export const AppLockScreen: React.FC = () => {
  const { companyDetails, unlockApp, updateSecuritySettings } = useInvoiceStore();
  const liveClock = useLiveClock();

  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryAnswerInput, setRecoveryAnswerInput] = useState('');
  const [recoveryFeedback, setRecoveryFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const masterPass = companyDetails.securitySettings?.masterPassword || 'pnp2083';
  const secQuestion = companyDetails.securitySettings?.securityQuestion || 'Company Name';
  const secAnswer = companyDetails.securitySettings?.securityAnswer || 'PNP TECH TRADERS';
  const panNo = (companyDetails.panVatNo || '617322405').trim();

  // Auto focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleUnlock = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!passwordInput) {
      setErrorMsg('Please enter your Master Password or PIN.');
      triggerShake();
      return;
    }

    const res = unlockApp(passwordInput);
    if (res.success) {
      setErrorMsg(null);
      setIsSuccess(true);
    } else {
      setErrorMsg(res.error || 'Incorrect Password. Please try again.');
      triggerShake();
    }
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 600);
    inputRef.current?.select();
  };

  // Recovery verification
  const handleVerifyRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    const ans = recoveryAnswerInput.trim().toLowerCase();
    if (!ans) {
      setRecoveryFeedback({ type: 'error', message: 'Please enter the answer or company PAN.' });
      return;
    }

    if (ans === secAnswer.toLowerCase() || ans === panNo.toLowerCase()) {
      // Reset master password to default
      updateSecuritySettings({ masterPassword: 'pnp2083' });
      setRecoveryFeedback({
        type: 'success',
        message: 'Identity verified! Master password reset to default: pnp2083'
      });
      setPasswordInput('pnp2083');
      setTimeout(() => {
        setShowRecoveryModal(false);
        setRecoveryFeedback(null);
        setRecoveryAnswerInput('');
      }, 2500);
    } else {
      setRecoveryFeedback({
        type: 'error',
        message: 'Incorrect answer. You can enter the Company Name or PAN number.'
      });
    }
  };

  const handleKeypadDigit = (digit: string) => {
    setPasswordInput(prev => prev + digit);
    setErrorMsg(null);
    inputRef.current?.focus();
  };

  const handleKeypadBackspace = () => {
    setPasswordInput(prev => prev.slice(0, -1));
    setErrorMsg(null);
    inputRef.current?.focus();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 text-slate-100 p-4 sm:p-6 select-none overflow-y-auto">
      
      {/* Background ambient lighting */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-sky-500/10 blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl animate-pulse" style={{ animationDuration: '10s' }} />
      </div>

      {/* Top Header Branding */}
      <div className="relative z-10 pt-4 flex flex-col items-center text-center space-y-1">
        <div className="flex items-center space-x-2.5">
          <img 
            src={companyDetails.logoUrl || './pnp_icon_transparent.png'} 
            alt="Logo" 
            className="h-10 w-10 object-contain drop-shadow-md"
            onError={(e) => {
              (e.target as HTMLImageElement).src = './pnp_icon_transparent.png';
            }}
          />
          <BrandTitle name={companyDetails.studioName || 'PNP TECH TRADERS'} size="lg" />
        </div>
        <p className="text-[11px] font-medium text-slate-400 tracking-wider">
          {companyDetails.generalBusinessName || 'PARICHAYA PHOTO STUDIO'} • Billing & Accounting Desktop System
        </p>
      </div>

      {/* Center Authentication Card */}
      <div className={`relative z-10 w-full max-w-md my-auto ${isShaking ? 'animate-shake' : ''}`}>
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-700/80 shadow-2xl shadow-slate-950/80 backdrop-blur-2xl space-y-6">
          
          {/* Lock Icon & Title */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className={`h-16 w-16 rounded-3xl flex items-center justify-center border transition-all duration-300 shadow-xl ${
              isSuccess 
                ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-400 shadow-emerald-500/20 scale-110'
                : errorMsg
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-400 shadow-rose-500/20'
                : 'bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 border-sky-400/30 text-sky-400 shadow-sky-500/10'
            }`}>
              {isSuccess ? (
                <CheckCircle2 className="h-8 w-8 animate-bounce" />
              ) : isShaking ? (
                <Lock className="h-8 w-8 animate-pulse text-rose-400" />
              ) : (
                <ShieldCheck className="h-8 w-8" />
              )}
            </div>

            <div>
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
                सफ्टवेयर सुरक्षा लक
              </h1>
              <p className="text-xs font-bold text-sky-400 font-mono mt-0.5">
                Software Access Authentication
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                Enter Master Password or PIN to access software views, billing data, and invoices.
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Master Password / PIN
              </label>
              
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                  <KeyRound className="h-4 w-4" />
                </div>

                <input
                  ref={inputRef}
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  disabled={isSuccess}
                  placeholder="Enter Password (e.g. pnp2083)..."
                  className={`w-full bg-slate-950/90 border rounded-2xl pl-10 pr-11 py-3 text-sm text-white font-mono placeholder-slate-500 focus:outline-none transition-all shadow-inner ${
                    errorMsg 
                      ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/30' 
                      : isSuccess
                      ? 'border-emerald-500 focus:ring-2 focus:ring-emerald-500/30'
                      : 'border-slate-700/80 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20'
                  }`}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-slate-400 hover:text-slate-200 transition-colors"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Error or Success feedback */}
              {errorMsg && (
                <div className="flex items-center space-x-1.5 text-rose-400 text-xs pt-1 animate-fadeIn">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {isSuccess && (
                <div className="flex items-center space-x-1.5 text-emerald-400 text-xs pt-1 animate-fadeIn font-bold">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>Access Granted! Opening system...</span>
                </div>
              )}
            </div>

            {/* Unlock Button */}
            <button
              type="submit"
              disabled={isSuccess}
              className={`w-full py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm tracking-wide shadow-lg transition-all duration-200 flex items-center justify-center space-x-2 ${
                isSuccess
                  ? 'bg-emerald-600 text-white shadow-emerald-500/30'
                  : 'bg-gradient-to-r from-sky-500 via-indigo-600 to-sky-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-sky-500/25 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]'
              }`}
            >
              {isSuccess ? (
                <>
                  <Unlock className="h-4 w-4" />
                  <span>Unlocking...</span>
                </>
              ) : (
                <>
                  <span>Unlock Software (सफ्टवेयर खोल्नुहोस्)</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Virtual Keypad (Optional for touch / fast numeric entry) */}
          <div className="border-t border-slate-800/80 pt-4 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold px-1">
              <span>Quick Keypad</span>
              <button
                type="button"
                onClick={() => setPasswordInput(masterPass)}
                className="text-sky-400 hover:text-sky-300 hover:underline flex items-center space-x-1"
                title="Fill default password"
              >
                <Sparkles className="h-3 w-3" />
                <span>Fill Default ({masterPass})</span>
              </button>
            </div>

            <div className="grid grid-cols-6 gap-1.5">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleKeypadDigit(digit)}
                  className="py-2 rounded-xl bg-slate-950/70 hover:bg-slate-800 text-white font-mono font-bold text-xs border border-slate-800 hover:border-slate-700 transition-all active:scale-95"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={handleKeypadBackspace}
                className="py-2 rounded-xl bg-slate-950/70 hover:bg-slate-800 text-amber-400 font-mono font-bold text-xs border border-slate-800 hover:border-slate-700 transition-all active:scale-95"
                title="Backspace"
              >
                ⌫
              </button>
              <button
                type="button"
                onClick={() => setPasswordInput('')}
                className="py-2 rounded-xl bg-slate-950/70 hover:bg-slate-800 text-rose-400 font-mono font-bold text-xs border border-slate-800 hover:border-slate-700 transition-all active:scale-95"
                title="Clear"
              >
                C
              </button>
            </div>
          </div>

          {/* Bottom Help / Forgot Password link */}
          <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
            <span className="font-mono text-[10px]">Security: Active</span>
            <button
              type="button"
              onClick={() => setShowRecoveryModal(true)}
              className="text-slate-400 hover:text-sky-400 hover:underline flex items-center space-x-1 transition-colors"
            >
              <HelpCircle className="h-3 w-3" />
              <span>Forgot Password? (रिकभरी)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Live Nepali Date & System Status Widget */}
      <div className="relative z-10 pb-2 w-full max-w-md flex items-center justify-between text-[11px] text-slate-400 font-mono px-3">
        <div className="flex items-center space-x-1.5">
          <span>🇳🇵 {liveClock.formattedBSDevanagari}</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sky-400 font-bold">{liveClock.time12}</span>
          <span className="text-slate-600">•</span>
          <span>FY {companyDetails.fiscalYear || '2083-84'}</span>
        </div>
      </div>

      {/* Emergency Recovery Modal */}
      {showRecoveryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-sky-400 font-bold text-sm">
                <ShieldCheck className="h-4 w-4" />
                <span>Password Recovery (पासवर्ड रिकभरी)</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowRecoveryModal(false);
                  setRecoveryFeedback(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Verify your identity using your configured security question or company registered PAN/VAT number.
            </p>

            <form onSubmit={handleVerifyRecovery} className="space-y-3">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Security Question:</span>
                <p className="text-xs font-semibold text-white">{secQuestion}</p>
                <p className="text-[10px] text-slate-400 italic">(Or enter registered PAN: {panNo ? `${panNo.slice(0, 3)}***` : '617322405'})</p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Answer or Registered PAN Number:
                </label>
                <input
                  type="text"
                  value={recoveryAnswerInput}
                  onChange={(e) => setRecoveryAnswerInput(e.target.value)}
                  placeholder="e.g. PNP TECH TRADERS or 617322405"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-sky-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono"
                  autoFocus
                />
              </div>

              {recoveryFeedback && (
                <div className={`p-2.5 rounded-xl border text-xs flex items-center space-x-2 ${
                  recoveryFeedback.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}>
                  {recoveryFeedback.type === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  )}
                  <span>{recoveryFeedback.message}</span>
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRecoveryModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Verify & Reset</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
