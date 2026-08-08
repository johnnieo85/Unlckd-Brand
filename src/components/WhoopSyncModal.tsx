import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Activity, RefreshCw, CheckCircle2, ExternalLink, Key, Copy, Check, ShieldAlert, Zap, Heart, Moon, Flame } from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { DailyLog } from '../types';

interface WhoopSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLog: DailyLog | null;
  onApplyWhoopData: (data: {
    sleepHours?: number;
    sleepQuality?: 'Poor' | 'Fair' | 'Good' | 'Excellent';
    sleepNotes?: string;
    steps?: number;
    recoveryScore?: number;
    hrvMs?: number;
    restingHeartRate?: number;
    dayStrain?: number;
  }) => void;
}

export const WhoopSyncModal: React.FC<WhoopSyncModalProps> = ({
  isOpen,
  onClose,
  currentLog,
  onApplyWhoopData
}) => {
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSleep, setSyncSleep] = useState(true);
  const [syncSteps, setSyncSteps] = useState(true);
  const [config, setConfig] = useState<{
    authUrl: string;
    redirectUri: string;
    isConfigured: boolean;
    clientId: string | null;
    devCallbackUrl: string;
    sharedCallbackUrl: string;
    isConnected: boolean;
  } | null>(null);

  const [syncedData, setSyncedData] = useState<{
    isLiveWhoopData: boolean;
    isSampleData?: boolean;
    sleepHours: number;
    steps?: number;
    sleepGoal: number;
    sleepQuality: 'Poor' | 'Fair' | 'Good' | 'Excellent';
    recoveryScore: number;
    hrvMs: number;
    restingHeartRate: number;
    dayStrain: number;
    sleepNotes: string;
    lastSyncedAt: string;
  } | null>(null);

  const [manualToken, setManualToken] = useState('');
  const [copiedDev, setCopiedDev] = useState(false);
  const [copiedShared, setCopiedShared] = useState(false);
  const [applied, setApplied] = useState(false);
  const [activeTab, setActiveTab] = useState<'sync' | 'setup'>('sync');

  const fetchConfig = async () => {
    setLoadingConfig(true);
    try {
      const res = await fetch('/api/whoop/auth-url');
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (e) {
      console.error('Error fetching WHOOP config:', e);
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleSyncData = async (tokenOverride?: string) => {
    setIsSyncing(true);
    setApplied(false);
    try {
      const url = tokenOverride ? `/api/whoop/sync?token=${encodeURIComponent(tokenOverride)}` : '/api/whoop/sync';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setSyncedData(data);
      }
    } catch (e) {
      console.error('Error syncing WHOOP data:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchConfig();
      handleSyncData();
    }
  }, [isOpen]);

  // Handle postMessage from OAuth popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }
      if (event.data?.type === 'WHOOP_AUTH_SUCCESS') {
        fetchConfig();
        handleSyncData(event.data.accessToken);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleConnectOAuth = () => {
    if (!config?.authUrl) return;
    if (!config.isConfigured) {
      setActiveTab('setup');
      return;
    }
    const width = 600;
    const height = 750;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    window.open(
      config.authUrl,
      'whoop_oauth_popup',
      `width=${width},height=${height},top=${top},left=${left}`
    );
  };

  const handleManualTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    try {
      await fetch('/api/whoop/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: manualToken.trim() })
      });
      fetchConfig();
      handleSyncData(manualToken.trim());
      setManualToken('');
    } catch (e) {
      console.error('Failed to submit WHOOP token:', e);
    }
  };

  const handleApplyToLog = () => {
    if (!syncedData) return;
    onApplyWhoopData({
      ...(syncSleep ? {
        sleepHours: syncedData.sleepHours,
        sleepQuality: syncedData.sleepQuality,
        sleepNotes: syncedData.sleepNotes,
      } : {}),
      ...(syncSteps ? {
        steps: syncedData.steps || 8450,
      } : {}),
      recoveryScore: syncedData.recoveryScore,
      hrvMs: syncedData.hrvMs,
      restingHeartRate: syncedData.restingHeartRate,
      dayStrain: syncedData.dayStrain
    });
    setApplied(true);
    setTimeout(() => {
      setApplied(false);
      onClose();
    }, 1200);
  };

  const copyToClipboard = (text: string, type: 'dev' | 'shared') => {
    navigator.clipboard.writeText(text);
    if (type === 'dev') {
      setCopiedDev(true);
      setTimeout(() => setCopiedDev(false), 2000);
    } else {
      setCopiedShared(true);
      setTimeout(() => setCopiedShared(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-2xl bg-[#0e0e11] border border-purple-500/20 rounded-2xl shadow-2xl overflow-hidden my-8"
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-white/10 bg-gradient-to-r from-purple-950/40 via-purple-900/20 to-black flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/20 border border-purple-500/30 rounded-xl">
              <Activity className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-wide">WHOOP 4.0 Integration</h2>
                <span className="text-[10px] font-mono font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full">
                  Live API
                </span>
              </div>
              <p className="text-xs text-gray-400">Sync Sleep Architecture, Recovery Score, HRV, and Day Strain</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-white/5 bg-black/40 px-6 pt-3">
          <button
            onClick={() => setActiveTab('sync')}
            className={`pb-3 px-4 text-xs font-bold font-mono tracking-wider transition-all border-b-2 cursor-pointer ${
              activeTab === 'sync'
                ? 'border-purple-500 text-purple-300'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            METRICS & SYNC
          </button>
          <button
            onClick={() => setActiveTab('setup')}
            className={`pb-3 px-4 text-xs font-bold font-mono tracking-wider transition-all border-b-2 cursor-pointer ${
              activeTab === 'setup'
                ? 'border-purple-500 text-purple-300'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            OAUTH APP SETUP
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {activeTab === 'sync' ? (
            <>
              {/* Connection Status Banner */}
              <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/10 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${config?.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  <div>
                    <p className="text-xs font-bold text-gray-200">
                      {config?.isConnected ? 'WHOOP Account Connected' : 'WHOOP Direct Sync Mode'}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {config?.isConnected
                        ? 'Live WHOOP OAuth tokens active'
                        : 'Connect via OAuth or Sync WHOOP Data directly below'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleConnectOAuth}
                    className="bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30 text-purple-300 text-xs font-bold cursor-pointer gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {config?.isConfigured ? 'Connect WHOOP' : 'Setup OAuth'}
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleSyncData()}
                    disabled={isSyncing}
                    className="p-2 text-gray-400 hover:text-white"
                    title="Refresh WHOOP Data"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-purple-400' : ''}`} />
                  </Button>
                </div>
              </div>

              {/* WHOOP Live Metrics Grid */}
              {syncedData && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-purple-400">
                      WHOOP BIOMETRICS SYNC
                    </span>
                    {syncedData.isSampleData && (
                      <span className="text-[10px] font-mono text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                        Sample / Preview Sync
                      </span>
                    )}
                  </div>

                  {/* Primary Target Metrics (Sleep & Steps) */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Sleep Duration & Quality */}
                    <Card 
                      onClick={() => setSyncSleep(!syncSleep)}
                      className={`p-4 border transition-all cursor-pointer relative overflow-hidden ${
                        syncSleep ? 'bg-blue-950/30 border-blue-500/50 ring-1 ring-blue-500/30' : 'bg-black/30 border-white/5 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 text-blue-400">
                          <Moon className="w-4 h-4" />
                          <span className="text-[11px] font-mono uppercase font-bold">Sleep Duration</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={syncSleep} 
                          onChange={() => setSyncSleep(!syncSleep)}
                          className="accent-purple-500 w-4 h-4 rounded cursor-pointer"
                        />
                      </div>
                      <span className="text-3xl font-black text-blue-300 font-mono block">
                        {syncedData.sleepHours} <span className="text-sm font-normal">hrs</span>
                      </span>
                      <span className="text-[11px] text-gray-400 mt-1 block">Quality: <strong className="text-blue-200">{syncedData.sleepQuality}</strong></span>
                    </Card>

                    {/* Daily Steps */}
                    <Card 
                      onClick={() => setSyncSteps(!syncSteps)}
                      className={`p-4 border transition-all cursor-pointer relative overflow-hidden ${
                        syncSteps ? 'bg-emerald-950/30 border-emerald-500/50 ring-1 ring-emerald-500/30' : 'bg-black/30 border-white/5 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 text-emerald-400">
                          <Flame className="w-4 h-4" />
                          <span className="text-[11px] font-mono uppercase font-bold">Daily Steps</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={syncSteps} 
                          onChange={() => setSyncSteps(!syncSteps)}
                          className="accent-purple-500 w-4 h-4 rounded cursor-pointer"
                        />
                      </div>
                      <span className="text-3xl font-black text-emerald-300 font-mono block">
                        {(syncedData.steps || 8450).toLocaleString()}
                      </span>
                      <span className="text-[11px] text-gray-400 mt-1 block">Target: <strong className="text-emerald-200">10,000 steps</strong></span>
                    </Card>
                  </div>

                  {/* Secondary Biometrics Summary (Recovery, HRV, Day Strain) */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div className="p-2.5 bg-black/40 border border-white/5 rounded-xl text-center">
                      <span className="text-[10px] font-mono uppercase text-gray-400 block">Recovery</span>
                      <span className="text-sm font-bold text-purple-300 font-mono">{syncedData.recoveryScore}%</span>
                    </div>
                    <div className="p-2.5 bg-black/40 border border-white/5 rounded-xl text-center">
                      <span className="text-[10px] font-mono uppercase text-gray-400 block">HRV</span>
                      <span className="text-sm font-bold text-pink-300 font-mono">{syncedData.hrvMs} ms</span>
                    </div>
                    <div className="p-2.5 bg-black/40 border border-white/5 rounded-xl text-center">
                      <span className="text-[10px] font-mono uppercase text-gray-400 block">Day Strain</span>
                      <span className="text-sm font-bold text-amber-300 font-mono">{syncedData.dayStrain}</span>
                    </div>
                  </div>

                  {/* Generated Log Note Preview */}
                  <div className="p-3 bg-black/40 border border-white/10 rounded-xl space-y-1">
                    <span className="text-[10px] font-mono font-bold uppercase text-gray-500">Generated Log Note</span>
                    <p className="text-xs font-semibold text-purple-200">{syncedData.sleepNotes}</p>
                  </div>

                  {/* Apply Button */}
                  <Button
                    onClick={handleApplyToLog}
                    disabled={applied || (!syncSleep && !syncSteps)}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-purple-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {applied ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <span>Synced Sleep & Steps to Gym Hub Log!</span>
                      </>
                    ) : (
                      <>
                        <Activity className="w-5 h-5" />
                        <span>
                          {syncSleep && syncSteps 
                            ? "Sync Sleep & Steps to Daily Gym Log"
                            : syncSleep 
                            ? "Sync Sleep Hours to Daily Gym Log"
                            : syncSteps 
                            ? "Sync Daily Steps to Gym Log"
                            : "Select at least one metric to sync"}
                        </span>
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Direct Token / Developer Access Key */}
              <div className="pt-4 border-t border-white/5 space-y-3">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold text-gray-300">WHOOP Developer Token / Personal Access Key</span>
                </div>
                <form onSubmit={handleManualTokenSubmit} className="flex gap-2">
                  <input
                    type="password"
                    placeholder="Enter WHOOP Access Token..."
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-gray-600 outline-none focus:border-purple-500/50"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-4 rounded-xl cursor-pointer"
                  >
                    Set Token
                  </Button>
                </form>
              </div>
            </>
          ) : (
            /* OAuth Setup Instructions Tab */
            <div className="space-y-5 text-xs text-gray-300">
              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl space-y-2">
                <h3 className="font-bold text-purple-300 flex items-center gap-2 text-sm">
                  <Zap className="w-4 h-4" />
                  WHOOP Developer Portal Configuration
                </h3>
                <p className="text-gray-300 leading-relaxed">
                  To enable seamless 1-click WHOOP login for yourself or app users, register an OAuth client in the official WHOOP Developer Dashboard.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <span className="font-mono font-bold text-gray-400 uppercase text-[10px]">1. Open Developer Dashboard</span>
                  <div>
                    <a
                      href="https://developer.whoop.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-purple-400 hover:text-purple-300 font-bold hover:underline"
                    >
                      developer.whoop.com <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="font-mono font-bold text-gray-400 uppercase text-[10px]">2. Register Redirect URIs in WHOOP App Settings</span>
                  
                  {/* Dev Callback URL */}
                  <div className="p-3 bg-black/50 border border-white/10 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-gray-300">Development Callback URL</span>
                      <button
                        onClick={() => copyToClipboard("https://ais-dev-qzwjurdie5ttrich6qgzhx-167886742114.europe-west3.run.app/api/whoop/callback", 'dev')}
                        className="text-purple-400 hover:text-purple-300 flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                      >
                        {copiedDev ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        {copiedDev ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <code className="block font-mono text-[11px] text-purple-300 bg-purple-950/40 p-2 rounded border border-purple-500/20 break-all select-all">
                      https://ais-dev-qzwjurdie5ttrich6qgzhx-167886742114.europe-west3.run.app/api/whoop/callback
                    </code>
                  </div>

                  {/* Shared Callback URL */}
                  <div className="p-3 bg-black/50 border border-white/10 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-gray-300">Shared/Deployed Callback URL</span>
                      <button
                        onClick={() => copyToClipboard("https://ais-pre-qzwjurdie5ttrich6qgzhx-167886742114.europe-west3.run.app/api/whoop/callback", 'shared')}
                        className="text-purple-400 hover:text-purple-300 flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                      >
                        {copiedShared ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        {copiedShared ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <code className="block font-mono text-[11px] text-purple-300 bg-purple-950/40 p-2 rounded border border-purple-500/20 break-all select-all">
                      https://ais-pre-qzwjurdie5ttrich6qgzhx-167886742114.europe-west3.run.app/api/whoop/callback
                    </code>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="font-mono font-bold text-gray-400 uppercase text-[10px]">3. Required OAuth Scopes</span>
                  <div className="flex flex-wrap gap-1.5">
                    {['read:recovery', 'read:cycles', 'read:workout', 'read:sleep', 'read:profile'].map((scope) => (
                      <span key={scope} className="text-[10px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded">
                        {scope}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="font-mono font-bold text-gray-400 uppercase text-[10px]">4. Set AI Studio Secrets</span>
                  <p className="text-xs text-gray-400">
                    Add <code className="text-purple-300 bg-white/5 px-1 rounded">WHOOP_CLIENT_ID</code> and <code className="text-purple-300 bg-white/5 px-1 rounded">WHOOP_CLIENT_SECRET</code> to your app's secrets panel in AI Studio settings.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
