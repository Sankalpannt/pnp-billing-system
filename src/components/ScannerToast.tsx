import React from 'react';
import { X, Zap } from 'lucide-react';

interface ScannerToastProps {
  toast: { title: string; subtitle: string; id: number; tagNumber?: string } | null;
  onDismiss: () => void;
}

export const ScannerToast: React.FC<ScannerToastProps> = ({ toast, onDismiss }) => {
  if (!toast) return null;

  return (
    <div className="fixed top-5 right-5 z-50 animate-slideInRight max-w-sm w-full pointer-events-auto print:hidden">
      <div className="p-4 rounded-2xl bg-slate-900/95 border border-sky-500/40 shadow-2xl shadow-sky-500/20 backdrop-blur-xl flex items-start space-x-3.5 ring-1 ring-sky-400/30">
        <div className="p-2 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shrink-0 shadow-lg shadow-sky-500/30 animate-pulse">
          <Zap className="h-5 w-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 truncate">
              {toast.tagNumber && (
                <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 text-[10px] font-bold font-mono border border-sky-500/30">
                  🏷️ {toast.tagNumber}
                </span>
              )}
              <h4 className="text-xs font-bold text-white truncate font-sans">
                {toast.title}
              </h4>
            </div>
            <button
              type="button"
              onClick={onDismiss}
              className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-sky-300/90 mt-0.5 font-mono truncate">
            {toast.subtitle}
          </p>
        </div>
      </div>
    </div>
  );
};
