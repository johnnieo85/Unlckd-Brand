import React from 'react';
import { WifiOff, RefreshCw, X, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { cn } from '../lib/utils';

interface InternetRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry?: () => void;
  title?: string;
  featureName?: string;
}

export const InternetRequiredModal: React.FC<InternetRequiredModalProps> = ({
  isOpen,
  onClose,
  onRetry,
  title = "INTERNET REQUIRED",
  featureName
}) => {
  const { checkConnectivity } = useNetworkStatus();
  const [checking, setChecking] = React.useState(false);

  const handleRetry = async () => {
    setChecking(true);
    const online = await checkConnectivity();
    setChecking(false);
    if (online) {
      onClose();
      if (onRetry) onRetry();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="w-full max-w-md bg-[#111111] border border-[#292929] rounded-[8px] p-6 shadow-2xl relative"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-[#888] hover:text-white transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-[6px] bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
                <WifiOff className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-display font-bold uppercase tracking-wider text-white">
                  {title}
                </h3>
                {featureName && (
                  <span className="text-xs text-brand-primary font-mono font-medium">
                    {featureName}
                  </span>
                )}
              </div>
            </div>

            <p className="text-sm text-[#D1D1D1] mb-5 leading-relaxed">
              This feature needs a connection. Your offline data is safe.
            </p>

            <div className="flex items-center gap-2 p-3 bg-[#171717] border border-[#222] rounded-[4px] mb-6">
              <ShieldCheck className="w-4 h-4 text-brand-primary shrink-0" />
              <span className="text-xs text-[#A1A1A1]">
                All workouts, sets, tracking logs, and measurements remain stored locally on your device.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-[#1c1c1c] hover:bg-[#252525] border border-[#292929] text-white text-xs font-bold uppercase tracking-wider rounded-[4px] transition-colors cursor-pointer"
              >
                DISMISS
              </button>
              {onRetry && (
                <button
                  type="button"
                  onClick={handleRetry}
                  disabled={checking}
                  className="flex items-center gap-2 px-5 py-2 bg-brand-primary text-black text-xs font-display font-bold uppercase tracking-wider rounded-[4px] hover:bg-brand-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", checking && "animate-spin")} />
                  <span>{checking ? 'CHECKING...' : 'TRY AGAIN'}</span>
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
