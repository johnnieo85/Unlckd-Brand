import React from 'react';
import { ArrowRight, RefreshCw, X } from 'lucide-react';
import { useServiceWorker } from '../hooks/useServiceWorker';

export const UpdateReadyBanner: React.FC = () => {
  const { hasUpdate, refreshApp } = useServiceWorker();
  const [dismissed, setDismissed] = React.useState(false);

  if (!hasUpdate || dismissed) {
    return null;
  }

  return (
    <div className="fixed top-20 sm:top-24 right-4 z-50 max-w-sm pointer-events-auto select-none animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-[#111111]/95 border border-brand-primary/40 rounded-[6px] shadow-2xl backdrop-blur-md">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-brand-primary text-xs font-mono font-bold uppercase tracking-wider">
            <RefreshCw className="w-3 h-3 animate-spin" />
            UPDATE READY
          </div>
          <p className="text-xs text-[#D1D1D1] mt-0.5 font-medium">
            A new version of UNLCKD is available.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={refreshApp}
            className="flex items-center gap-1 px-3 py-1.5 bg-brand-primary text-black font-display font-bold text-xs uppercase tracking-wider rounded-[4px] hover:bg-brand-primary/90 transition-colors cursor-pointer"
          >
            <span>REFRESH WHEN READY</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setDismissed(true)}
            className="text-[#666] hover:text-white p-1 cursor-pointer"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
