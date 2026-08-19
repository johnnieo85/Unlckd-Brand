import React, { useState } from 'react';
import { WifiOff, RefreshCw, CheckCircle2, AlertCircle, UploadCloud, ChevronRight, X } from 'lucide-react';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { cn } from '../lib/utils';

export const SyncStatusIndicator: React.FC = () => {
  const { state, isOnline, pendingPhotosCount, triggerSync, errorMessage } = useSyncStatus();
  const [showQueueDetails, setShowQueueDetails] = useState(false);
  const [dismissedSynced, setDismissedSynced] = useState(false);

  // When ONLINE with no pending photos and not syncing, keep header completely clean
  if (state === 'ONLINE' && pendingPhotosCount === 0) {
    return null;
  }

  if (state === 'SYNCED' && dismissedSynced) {
    return null;
  }

  return (
    <div className="fixed bottom-20 sm:bottom-6 right-4 z-40 max-w-sm pointer-events-auto select-none transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
      {state === 'OFFLINE' && (
        <div className="flex items-center gap-2.5 px-3.5 py-2 bg-[#121212]/95 border border-[#292929] rounded-[6px] shadow-xl backdrop-blur-md">
          <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 leading-none">
              OFFLINE
            </span>
            <span className="text-[10px] text-[#A1A1A1] mt-0.5 leading-tight">
              Changes saved on this device.
            </span>
          </div>
          {pendingPhotosCount > 0 && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-white shrink-0 ml-1">
              {pendingPhotosCount} queued
            </span>
          )}
        </div>
      )}

      {state === 'SYNCING' && (
        <div className="flex items-center gap-2.5 px-3.5 py-2 bg-[#121212]/95 border border-brand-primary/30 rounded-[6px] shadow-xl backdrop-blur-md">
          <RefreshCw className="w-3.5 h-3.5 text-brand-primary animate-spin shrink-0" />
          <div className="flex flex-col">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-brand-primary leading-none">
              SYNCING…
            </span>
            <span className="text-[10px] text-[#A1A1A1] mt-0.5 leading-tight">
              Synchronizing offline records
            </span>
          </div>
        </div>
      )}

      {state === 'SYNCED' && (
        <div className="flex items-center gap-2.5 px-3.5 py-2 bg-[#121212]/95 border border-brand-primary/40 rounded-[6px] shadow-xl backdrop-blur-md">
          <CheckCircle2 className="w-3.5 h-3.5 text-brand-primary shrink-0" />
          <div className="flex flex-col">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-brand-primary leading-none">
              ALL CHANGES SYNCED
            </span>
          </div>
          <button 
            onClick={() => setDismissedSynced(true)}
            className="text-[#666] hover:text-white ml-2 p-0.5 cursor-pointer"
            aria-label="Dismiss"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {state === 'SYNC_ERROR' && (
        <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-[#171111]/95 border border-red-500/30 rounded-[6px] shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-red-400 leading-none">
                SYNC ISSUE
              </span>
              <span className="text-[10px] text-[#A1A1A1] mt-0.5 leading-tight">
                {errorMessage || 'Your changes are still saved locally.'}
              </span>
            </div>
          </div>
          <button
            onClick={() => triggerSync()}
            className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 text-[10px] font-bold uppercase tracking-wider rounded-[4px] cursor-pointer transition-colors shrink-0"
          >
            RETRY
          </button>
        </div>
      )}

      {state !== 'OFFLINE' && state !== 'SYNCING' && state !== 'SYNCED' && state !== 'SYNC_ERROR' && pendingPhotosCount > 0 && (
        <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-[#121212]/95 border border-[#292929] rounded-[6px] shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <UploadCloud className="w-3.5 h-3.5 text-brand-primary shrink-0" />
            <div className="flex flex-col">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-white leading-none">
                WAITING TO UPLOAD
              </span>
              <span className="text-[10px] text-[#A1A1A1] mt-0.5 leading-tight">
                {pendingPhotosCount} photo{pendingPhotosCount > 1 ? 's' : ''} queued
              </span>
            </div>
          </div>
          {isOnline && (
            <button
              onClick={() => triggerSync()}
              className="px-2.5 py-1 bg-brand-primary/10 hover:bg-brand-primary/20 border border-brand-primary/30 text-brand-primary text-[10px] font-bold uppercase tracking-wider rounded-[4px] cursor-pointer transition-colors shrink-0"
            >
              SYNC NOW
            </button>
          )}
        </div>
      )}
    </div>
  );
};
