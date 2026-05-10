import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Dumbbell, 
  Utensils, 
  Camera, 
  FileText, 
  ChevronRight, 
  CheckCircle2, 
  Loader2,
  ArrowRight,
  Target,
  User,
  Activity,
  Calendar,
  MapPin,
  Briefcase,
  Search,
  Clock,
  Droplets,
  Footprints,
  Info,
  ExternalLink,
  Download,
  Sparkles,
  History,
  Trash2,
  LogIn,
  LogOut,
  ChevronLeft,
  Shield,
  CreditCard,
  Lock,
  Quote,
  Moon,
  Instagram,
  RotateCcw,
  RefreshCw,
  Zap,
  Youtube,
  LineChart,
  Trophy,
  XCircle,
  AlertCircle,
  ShieldAlert,
  X,
  Smartphone,
  ShieldCheck,
  Facebook,
  Users,
  Apple
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from './components/ui/Button';
import { Input, Select, Checkbox } from './components/ui/Input';
import { Card, Badge } from './components/ui/Card';
import { cn, downloadFile, getLocalDateString, parseLocalDate, safeStorage, getPlanDurationWeeks } from './lib/utils';
import { getWeeklyQuote } from './constants/quotes';
import { SecurityGuard } from './components/SecurityGuard';
import { Path, UserData, Photos, ProgressPhotos, AssessmentResult, Rating, SavedReport, UserProfile } from './types';
import { generateTransformationReport } from './services/gemini';
import { getLevelInfo } from './lib/levels';
import { auth } from './lib/firebase';
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, OAuthProvider, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, setPersistence, browserSessionPersistence, sendPasswordResetEmail, updatePassword } from 'firebase/auth';
import { historyService } from './services/historyService';
import { ensureUserProfile, checkUserAccess, unlockPremium } from './services/accessService';

import { Header } from './components/Header';
import { Logo } from './components/Logo';

const RatingTable = ({ title, ratings = [], summary, photo }: { title: string; ratings?: Rating[]; summary?: string; photo?: string | null }) => (
  <div className="space-y-6">
    <h2 className="text-3xl font-display font-bold text-brand-primary tracking-tight flex items-center gap-3 print:text-black">
      <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center no-print">
        <Activity className="w-4 h-4 text-brand-primary" />
      </div>
      {title}
    </h2>
    <div className={cn("grid grid-cols-1 gap-8", photo && "md:grid-cols-2")}>
      {photo && (
        <div className="aspect-[3/4] rounded-2xl overflow-hidden border border-white/5 shadow-2xl relative group print:border-gray-200">
          <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity no-print" />
          <img src={photo} alt={title} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="space-y-6">
        <div className="bg-white/[0.02] backdrop-blur-sm border border-white/5 rounded-2xl overflow-hidden shadow-xl print:bg-white print:border-gray-200">
          <table className="w-full text-sm text-left">
            <thead className="bg-white/[0.05] text-gray-400 uppercase text-[10px] tracking-[0.2em] font-bold print:bg-gray-100 print:text-gray-600">
              <tr>
                <th className="px-6 py-4 border-r border-white/5 print:border-gray-200">Area</th>
                <th className="px-6 py-4 border-r border-white/5 print:border-gray-200">Rating</th>
                <th className="px-6 py-4">Evaluation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 print:divide-gray-200">
              {ratings?.map((r, i) => (
                <tr key={i} className="hover:bg-white/[0.02] transition-colors print:text-black">
                  <td className="px-6 py-4 font-semibold text-gray-200 border-r border-white/5 print:text-black print:border-gray-200">{r.category}</td>
                  <td className="px-6 py-4 border-r border-white/5 print:border-gray-200">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] text-brand-primary font-bold print:text-black">{r.rating * 10}%</span>
                        <span className="font-mono text-[10px] text-gray-500 print:text-gray-400">{r.rating}/10</span>
                      </div>
                      <div className="flex gap-1 h-1.5">
                        {[...Array(10)].map((_, idx) => (
                          <div 
                            key={idx} 
                            className={cn(
                              "flex-1 rounded-full transition-all duration-500",
                              idx < r.rating 
                                ? "bg-brand-primary shadow-[0_0_8px_rgba(16,185,129,0.4)] print:bg-black print:shadow-none" 
                                : "bg-white/10 print:bg-gray-200"
                            )} 
                          />
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-xs leading-relaxed print:text-gray-700">{r.evaluation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {summary && (
          <div className="p-6 bg-brand-primary/5 border border-brand-primary/10 rounded-2xl text-sm text-gray-300 leading-relaxed italic relative overflow-hidden print:bg-gray-50 print:border-gray-200 print:text-gray-700">
            <div className="absolute top-0 left-0 w-1 h-full bg-brand-primary/40 print:bg-gray-400" />
            <div className="markdown-body">
              <ReactMarkdown>{summary}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);

const ProgressComparison = ({ title, ratings = [], summary, beforePhoto, afterPhoto, beforeDate, afterDate, beforeWeight, afterWeight, weightUnit }: { 
  title: string; 
  ratings?: Rating[]; 
  summary?: string; 
  beforePhoto: string | null; 
  afterPhoto: string | null;
  beforeDate: string;
  afterDate: string;
  beforeWeight?: string;
  afterWeight?: string;
  weightUnit?: string;
}) => (
  <div className="space-y-6">
    <h2 className="text-3xl font-display font-bold text-brand-primary tracking-tight flex items-center gap-3 print:text-black">
      <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center no-print">
        <Activity className="w-4 h-4 text-brand-primary" />
      </div>
      {title}
    </h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3 text-center">
            <div className="aspect-[3/4] rounded-2xl overflow-hidden border border-white/5 shadow-xl print:border-gray-200">
              <img src={beforePhoto!} alt="Before" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col gap-1 items-center">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest print:text-gray-600">Before ({beforeDate})</span>
              {beforeWeight && (
                <span className="text-xs font-mono text-gray-400 font-bold bg-white/5 px-2 py-0.5 rounded-full">{beforeWeight} {weightUnit}</span>
              )}
            </div>
          </div>
          <div className="space-y-3 text-center">
            <div className="aspect-[3/4] rounded-2xl overflow-hidden border border-brand-primary/20 shadow-xl shadow-brand-primary/5 print:border-gray-200">
              <img src={afterPhoto!} alt="After" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col gap-1 items-center">
              <span className="text-[10px] font-bold text-brand-primary uppercase tracking-widest print:text-black">After ({afterDate})</span>
              {afterWeight && (
                <span className="text-xs font-mono text-brand-primary font-bold bg-brand-primary/10 px-2 py-0.5 rounded-full">{afterWeight} {weightUnit}</span>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="space-y-6">
        <div className="bg-white/[0.02] backdrop-blur-sm border border-white/5 rounded-2xl overflow-hidden shadow-xl print:bg-white print:border-gray-200">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-white/[0.05] text-gray-400 uppercase text-[10px] tracking-[0.2em] font-bold print:bg-gray-100 print:text-gray-600">
              <tr>
                <th className="px-6 py-4 border-r border-white/5 print:border-gray-200">Area</th>
                <th className="px-6 py-4 border-r border-white/5 print:border-gray-200">Rating</th>
                <th className="px-6 py-4">Evaluation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 print:divide-gray-200">
              {ratings?.map((r, i) => (
                <tr key={i} className="hover:bg-white/[0.02] transition-colors print:text-black">
                  <td className="px-6 py-4 font-semibold text-gray-200 border-r border-white/5 print:text-black print:border-gray-200">{r.category}</td>
                  <td className="px-6 py-4 border-r border-white/5 print:border-gray-200">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] text-brand-primary font-bold print:text-black">{r.rating * 10}%</span>
                        <span className="font-mono text-[10px] text-gray-500 print:text-gray-400">{r.rating}/10</span>
                      </div>
                      <div className="flex gap-1 h-1.5">
                        {[...Array(10)].map((_, idx) => (
                          <div 
                            key={idx} 
                            className={cn(
                              "flex-1 rounded-full transition-all duration-500",
                              idx < r.rating 
                                ? "bg-brand-primary shadow-[0_0_8px_rgba(16,185,129,0.4)] print:bg-black print:shadow-none" 
                                : "bg-white/10 print:bg-gray-200"
                            )} 
                          />
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-[10px] leading-relaxed italic print:text-gray-700">{r.evaluation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {summary && (
          <div className="p-6 bg-brand-primary/5 border border-brand-primary/10 rounded-2xl text-sm text-gray-300 leading-relaxed italic relative overflow-hidden print:bg-gray-50 print:border-gray-200 print:text-gray-700">
            <div className="absolute top-0 left-0 w-1 h-full bg-brand-primary/40 print:bg-gray-400" />
            <div className="markdown-body">
              <ReactMarkdown>{summary}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);

import { ProGym } from './components/ProGym';
import { gymService } from './services/gymService';

const getSearchUrl = (title: string, category: 'Workouts' | 'Nutrition') => {
  // Enhanced cleaning to handle cases like "W1 Friday Session" or other session-only titles
  const cleanTitle = title
    .replace(/^W\d+.*?(Session|Workout|Day\s+\d+).*?:?\s*/i, '') // Remove batch prefixes
    .replace(/^(Warm-up|MainWork|Primary|Sequence):\s*/i, '')   // Remove section headers
    .trim();
  
  // If the result is just a date-like or session-like string, it's not an exercise
  if (!cleanTitle || /^(Week|Day|Session|Workout)\s*\d*$/i.test(cleanTitle)) {
    return '#'; 
  }

  if (category === 'Workouts') {
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanTitle + ' exercise demonstration')}`;
  }
  return `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(cleanTitle + ' healthy recipe')}`;
};

const extractLinks = (report: AssessmentResult) => {
  const links: { title: string; url: string; category: 'Workouts' | 'Nutrition' }[] = [];

  // Workouts
  if (report.recommendedWorkout?.exercises) {
    report.recommendedWorkout.exercises.forEach(ex => {
      links.push({ title: ex.name, url: getSearchUrl(ex.name, 'Workouts'), category: 'Workouts' });
    });
  }

  // Helper to extract markdown links: [Title](URL)
  const extractMarkdownLinks = (text: string, category: 'Workouts' | 'Nutrition') => {
    const regex = /\[(.*?)\]\((.*?)\)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      links.push({ title: match[1], url: getSearchUrl(match[1], category), category });
    }
  };

  if (report.goalAlignmentSummary) extractMarkdownLinks(report.goalAlignmentSummary, 'Workouts');
  if (report.trainerSummary) extractMarkdownLinks(report.trainerSummary, 'Workouts');
  if (report.nutritionStrategy) extractMarkdownLinks(report.nutritionStrategy, 'Nutrition');

  if (report.workoutPlan) {
    report.workoutPlan.forEach(week => {
      if (!week.days) return;
      week.days.forEach(day => {
        // Individual Exercises
        if (day.warmUp) {
          if (Array.isArray(day.warmUp)) {
            day.warmUp.forEach(ex => {
              links.push({ title: `W${week.week} ${day.day} Warm-up: ${ex.name}`, url: getSearchUrl(ex.name, 'Workouts'), category: 'Workouts' });
            });
          } else {
            extractMarkdownLinks(String(day.warmUp), 'Workouts');
          }
        }
        
        if (day.mainWork) {
          if (Array.isArray(day.mainWork)) {
            day.mainWork.forEach(ex => {
              links.push({ title: `W${week.week} ${day.day} Main: ${ex.name}`, url: getSearchUrl(ex.name, 'Workouts'), category: 'Workouts' });
            });
          } else {
            extractMarkdownLinks(String(day.mainWork), 'Workouts');
          }
        }
      });
    });
  }

  // Nutrition
  if (report.mealPlan) {
    report.mealPlan.forEach(week => {
      if (!week.days) return;
      week.days.forEach(day => {
        if (day.breakfast) links.push({ title: `W${week.week} ${day.day} Breakfast: ${day.breakfast}`, url: getSearchUrl(day.breakfast, 'Nutrition'), category: 'Nutrition' });
        if (day.lunch) links.push({ title: `W${week.week} ${day.day} Lunch: ${day.lunch}`, url: getSearchUrl(day.lunch, 'Nutrition'), category: 'Nutrition' });
        if (day.dinner) links.push({ title: `W${week.week} ${day.day} Dinner: ${day.dinner}`, url: getSearchUrl(day.dinner, 'Nutrition'), category: 'Nutrition' });
        if (day.snack) links.push({ title: `W${week.week} ${day.day} Snack: ${day.snack}`, url: getSearchUrl(day.snack, 'Nutrition'), category: 'Nutrition' });
      });
    });
  }

  return links;
};

const LinkAuditModal = ({ 
  isOpen, 
  onClose, 
  report,
  onFix
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  report: AssessmentResult | null;
  onFix: (invalidContext: string) => void;
}) => {
  const [auditResults, setAuditResults] = useState<Record<string, { status: 'pending' | 'checking' | 'valid' | 'invalid'; reason?: string }>>({});
  const [isAuditing, setIsAuditing] = useState(false);
  const [progress, setProgress] = useState(0);

  if (!isOpen || !report) return null;

  const links = extractLinks(report);
  const invalidLinksCount = Object.values(auditResults).filter(r => r.status === 'invalid').length;

  const performAudit = async () => {
    setIsAuditing(true);
    setProgress(0);
    const results: Record<string, { status: 'pending' | 'checking' | 'valid' | 'invalid'; reason?: string }> = {};
    links.forEach(l => results[l.url] = { status: 'pending' });
    setAuditResults(results);

    for (let i = 0; i < links.length; i++) {
      const link = links[i];
      setAuditResults(prev => ({ ...prev, [link.url]: { status: 'checking' } }));
      
      try {
        const response = await fetch(`/api/audit-link?url=${encodeURIComponent(link.url)}`);
        if (!response.ok) throw new Error('Proxy error');
        
        const data = await response.json();
        setAuditResults(prev => ({ 
          ...prev, 
          [link.url]: { 
            status: data.status === 'valid' ? 'valid' : 'invalid',
            reason: data.reason
          } 
        }));
      } catch (error) {
        setAuditResults(prev => ({ 
          ...prev, 
          [link.url]: { status: 'invalid', reason: 'Audit Service Unavailable' } 
        }));
      }
      
      setProgress(((i + 1) / links.length) * 100);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    setIsAuditing(false);
  };

  const handleFix = () => {
    const invalidList = links
      .filter(l => auditResults[l.url]?.status === 'invalid')
      .map(l => `- ${l.category}: ${l.title} (${l.url}) -> Reason: ${auditResults[l.url]?.reason || 'Broken link'}`)
      .join('\n');
    
    onFix(invalidList);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 no-print">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-brand-dark/95 backdrop-blur-xl"
        onClick={onClose}
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-brand-surface border border-white/5 rounded-[2.5rem] w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl relative z-10"
      >
        <div className="p-8 border-b border-white/5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-display font-bold text-gray-100 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-brand-primary" />
                Link Audit
              </h3>
              <p className="text-sm text-gray-400 mt-1">Status check for all demonstration and resource links.</p>
            </div>
            <button 
              onClick={onClose}
              className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            >
               <XCircle className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest">
              <span className="text-gray-500">Audit Progress</span>
              <span className="text-brand-primary">{Math.round(progress)}%</span>
            </div>
            <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                className="absolute top-0 left-0 h-full bg-brand-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ type: "spring", bounce: 0, duration: 0.5 }}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={performAudit}
                disabled={isAuditing}
                className="flex-1 bg-brand-primary/10 border border-brand-primary/20 text-brand-primary hover:bg-brand-primary/20 h-10 text-xs font-black uppercase tracking-[0.2em] rounded-xl"
              >
                {isAuditing ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Checking...
                  </span>
                ) : progress > 0 ? 'Restart Audit' : 'Initialize Audit'}
              </Button>
              {progress === 100 && invalidLinksCount > 0 && (
                <Button 
                  onClick={handleFix}
                  className="flex-1 bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500/20 h-10 text-xs font-black uppercase tracking-[0.2em] rounded-xl flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Fix & Regenerate
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {(['Workouts', 'Nutrition'] as const).map(category => {
            const categoryLinks = links.filter(l => l.category === category);
            if (categoryLinks.length === 0) return null;

            return (
              <div key={category} className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-brand-primary/60 px-1">{category}</h4>
                <div className="grid grid-cols-1 gap-3">
                  {categoryLinks.map((link, idx) => {
                    const result = auditResults[link.url] || { status: 'pending' };
                    const status = result.status;
                    return (
                      <a 
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center justify-between p-4 bg-white/5 rounded-2xl border transition-all group ${
                          status === 'invalid' ? 'border-rose-500/30 bg-rose-500/5' : 'border-white/5 hover:border-brand-primary/30 hover:bg-brand-primary/5'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex-shrink-0">
                            {status === 'pending' && <div className="w-2 h-2 rounded-full bg-gray-600" />}
                            {status === 'checking' && <Loader2 className="w-4 h-4 text-brand-primary animate-spin" />}
                            {status === 'valid' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                            {status === 'invalid' && <XCircle className="w-4 h-4 text-rose-500" />}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-200 group-hover:text-brand-primary transition-colors line-clamp-1">{link.title}</span>
                            <span className="text-[10px] text-gray-500 font-mono mt-0.5 truncate max-w-[250px]">{link.url}</span>
                            {status === 'invalid' && result.reason && (
                              <span className="text-[10px] text-rose-400 font-bold uppercase mt-1">{result.reason}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {status === 'valid' && <span className="text-[10px] font-black text-emerald-500/50 uppercase tracking-tighter">VERIFIED</span>}
                          {status === 'invalid' && <span className="text-[10px] font-black text-rose-500/50 uppercase tracking-tighter">FAILED</span>}
                          <ExternalLink className="w-4 h-4 text-gray-600 group-hover:text-brand-primary transition-colors" />
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {links.length === 0 && (
            <div className="text-center py-12">
              <Activity className="w-12 h-12 text-gray-700 mx-auto mb-4 opacity-50" />
              <p className="text-gray-500 font-medium">No links were detected in this report.</p>
            </div>
          )}
        </div>

        <div className="p-6 bg-brand-primary/5 border-t border-white/5 flex flex-col items-center gap-2">
          <p className="text-[10px] text-gray-500 font-medium text-center uppercase tracking-widest">
            Note: Some links may require manual verification due to security restrictions.
          </p>
          <p className="text-xs text-brand-primary/60 font-bold uppercase tracking-widest">UNLCKD • RESOURCE INTEGRITY</p>
        </div>
      </motion.div>
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'reports' | 'gym'>('reports');
  const [latestReport, setLatestReport] = useState<SavedReport | null>(null);
  const [step, setStep] = useState<'landing' | 'intake' | 'photos' | 'progress-photos' | 'processing' | 'report' | 'history' | 'no-access' | 'error'>('landing');
  const [lastError, setLastError] = useState<string | null>(null);
  const [showLinkAudit, setShowLinkAudit] = useState(false);

  const LogoBranding = () => (
    <div className="flex items-center justify-between border-t border-white/10 pt-6 mt-12 print:border-gray-200 print:pt-4 print:mt-8">
      <Logo 
        size="sm"
        onClick={() => {
          setStep('landing');
          setActiveTab('reports');
        }}
      />
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest print:text-[10px] print:gap-1.5">
          <Instagram className="w-4 h-4 text-brand-primary print:w-3 print:h-3" />
          unlckd_brand
        </div>
        <span className="text-xs text-gray-500 uppercase tracking-widest print:text-[10px] print:text-gray-400">Official Transformation Report</span>
      </div>
    </div>
  );
  const [path, setPath] = useState<Path>('full');
  const [userData, setUserData] = useState<UserData>({
    name: '',
    age: '',
    sex: 'male',
    height: '',
    heightUnit: 'cm',
    weight: '',
    weightUnit: 'kg',
    location: '',
    occupation: '',
    gymAccess: 'full',
    goals: '',
    eventFocus: '',
    physiqueStyle: 'athletic',
    injuries: '',
    allergies: '',
    currentWorkout: '',
    caloriePreference: 'maintain',
    physicalActivity: 'moderate',
    desiredPhysicalActivity: 'high',
    planDuration: '12-week',
    smartHomeGym: 'none',
    planStartDate: new Date().toISOString().split('T')[0],
    syncToGymHub: true
  });
  const [photos, setPhotos] = useState<Photos>({
    front: null,
    back: null,
    left: null,
    right: null
  });
  const [progressPhotos, setProgressPhotos] = useState<ProgressPhotos>({
    before: { front: null, back: null, left: null, right: null },
    after: { front: null, back: null, left: null, right: null },
    beforeDate: '',
    afterDate: '',
    beforeWeight: '',
    afterWeight: ''
  });
  const [report, setReport] = useState<AssessmentResult | null>(null);
  const [viewingDate, setViewingDate] = useState<Date>(new Date());
  const [loadingMessage, setLoadingMessage] = useState('Analyzing your physique...');
  const [user, setUser] = useState(auth.currentUser);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [selectedFaq, setSelectedFaq] = useState<any>(null);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);

  const faqs = [
    {
      id: 'iphone',
      title: 'Trouble Accessing on iPhone?',
      icon: Smartphone,
      content: (
        <div className="space-y-4 text-sm text-gray-400 leading-relaxed">
          <p>If you can access from other devices but not your iPhone, try these steps:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><span className="text-gray-200">Try Cellular Data:</span> Turn off Wi-Fi in Settings. If it works, the issue is your Wi-Fi configuration.</li>
            <li><span className="text-gray-200">Disable Wi-Fi Privacy:</span> Settings → Wi-Fi → (i) → Toggle off <b>Private Wi-Fi Address</b> and <b>Limit IP Tracking</b>.</li>
            <li><span className="text-gray-200">Clear Safari Cache:</span> Settings → Apps → Safari → Advanced → Website Data → Delete data for this site.</li>
            <li><span className="text-gray-200">Check VPN/iCloud:</span> Ensure VPN is OFF and disable <b>iCloud Private Relay</b> in Name → iCloud.</li>
            <li><span className="text-gray-200">Change DNS:</span> Settings → Wi-Fi → (i) → Configure DNS → Manual. Add <code className="bg-white/5 px-1 rounded text-brand-primary">1.1.1.1</code> and <code className="bg-white/5 px-1 rounded text-brand-primary">8.8.8.8</code>.</li>
          </ul>
        </div>
      )
    },
    {
      id: 'troubleshooting',
      title: 'General Troubleshooting',
      icon: ShieldCheck,
      content: (
        <div className="space-y-4 text-sm text-gray-400 leading-relaxed">
          <p>For login issues and blank pages:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><span className="text-gray-200">Incognito Mode:</span> Avoid Private/Incognito tabs as browsers block the security tokens needed for login.</li>
            <li><span className="text-gray-200">Google Auth:</span> If a popup is blocked, use <b>Email Login</b> or click <b>"Open in Standard Tab"</b>.</li>
            <li><span className="text-gray-200">Network Reset:</span> If connectivity persists, Settings → General → Transfer or Reset → Reset Network Settings.</li>
            <li><span className="text-gray-200">Persistent Issues:</span> Note the specific error (e.g. 403 Forbidden) and contact support with a screenshot.</li>
          </ul>
        </div>
      )
    },
    {
      id: 'pin-reset',
      title: 'Reset my Gym Hub PIN?',
      icon: Lock,
      content: (
        <div className="space-y-4 text-sm text-gray-400 leading-relaxed">
          <p>To reset your Gym Hub PIN, open the Gym Hub and select the gear icon in the top-right corner of the screen.</p>
          <p>From there, choose the option to update or reset your PIN, then enter a new PIN you’ll remember.</p>
          <p>If you are a new customer, your default PIN is: <code className="bg-white/5 px-1.5 py-0.5 rounded text-brand-primary font-mono font-bold">123456</code></p>
          <p className="text-[10px] uppercase tracking-widest opacity-60">We recommend changing this immediately after your first login for better account security.</p>
        </div>
      )
    },
    {
      id: 'community',
      title: 'Join the Community',
      icon: Users,
      content: (
        <div className="space-y-4 text-sm text-gray-400 leading-relaxed">
          <p>Follow us for training tips, athlete highlights, and community updates:</p>
          <div className="flex flex-col gap-3">
            <a href="https://instagram.com/unlckd_brand" target="_blank" rel="noreferrer" className="flex items-center gap-3 text-gray-200 hover:text-brand-primary transition-colors">
              <Instagram className="w-5 h-5" />
              <span>@unlckd_brand</span>
            </a>
            <a href="https://facebook.com/unlckdbrand" target="_blank" rel="noreferrer" className="flex items-center gap-3 text-gray-200 hover:text-brand-primary transition-colors">
              <Facebook className="w-5 h-5" />
              <span>unlckdbrand</span>
            </a>
          </div>
        </div>
      )
    }
  ];
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [showGymAuth, setShowGymAuth] = useState(false);
  const [gymAuthPin, setGymAuthPin] = useState('');
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const getPlanDate = (weekNum: number, dayName: string, dayIndex?: number) => {
    if (!userData.planStartDate) return { date: null, weekday: dayName };
    const baseDate = parseLocalDate(userData.planStartDate);
    baseDate.setHours(12, 0, 0, 0);

    let offset = 0;
    if (dayIndex !== undefined) {
      offset = dayIndex;
    } else {
      const dayMap: { [key: string]: number } = {
        'monday': 0, 'tuesday': 1, 'wednesday': 2, 'thursday': 3, 'friday': 4, 'saturday': 5, 'sunday': 6
      };
      const normalizedDay = dayName.toLowerCase().trim();
      const match = dayName.match(/Day\s*(\d+)/i);
      if (dayMap[normalizedDay] !== undefined) {
        offset = dayMap[normalizedDay];
      } else if (match) {
        offset = (parseInt(match[1]) - 1) % 7;
      }
    }
    
    const targetDate = new Date(baseDate);
    targetDate.setDate(baseDate.getDate() + ((weekNum - 1) * 7) + offset);
    
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const shortWeekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return {
      date: `${shortWeekdays[targetDate.getDay()]}, ${months[targetDate.getMonth()]} ${targetDate.getDate()}`,
      weekday: weekdays[targetDate.getDay()]
    };
  };
  const [isSignUp, setIsSignUp] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');

  useEffect(() => {
    // Force a one-time logout and session clear for the 6-digit PIN security update
    const PIN_VERSION = 'v2_6mapin';
    
    // Check if localStorage is even accessible before trying to read/write version
    const currentVersion = safeStorage.get('unlckd_gym_version');
    
    if (currentVersion !== PIN_VERSION) {
      const performGlobalReset = async () => {
        try {
          await signOut(auth);
          safeStorage.clear('local');
          safeStorage.clear('session');
          safeStorage.set('unlckd_gym_version', PIN_VERSION, 'local');
          console.info("Security Update: Sessions cleared for 6-digit PIN migration.");
          try {
            window.location.reload();
          } catch (reloadErr) {
            console.warn("Auth: Navigation blocked, user must manually refresh.");
          }
        } catch (e) {
          safeStorage.set('unlckd_gym_version', PIN_VERSION, 'local');
        }
      };
      performGlobalReset();
    }
  }, []);

  useEffect(() => {
    if (user && savedReports.length > 0) {
      // Use the absolute latest Transformation Report that is opted-in for Gym Hub import
      const reportForGym = savedReports.find(r => r.path === 'full' && r.userData?.syncToGymHub !== false);
      setLatestReport(reportForGym || null);
    } else {
      setLatestReport(null);
    }
  }, [user, savedReports]);

  useEffect(() => {
    // Handle redirect result for mobile/Apple devices
    const checkRedirect = async () => {
      try {
        console.info("Auth: Checking for redirect result...");
        const result = await getRedirectResult(auth);
        if (result?.user) {
          console.info("Auth: Redirect result success:", result.user.email);
          setIsAuthModalOpen(false);
          setAuthError(null);
        } else {
          console.info("Auth: No pending redirect result.");
        }
      } catch (error: any) {
        console.error("Auth: Redirect error caught:", error);
        
        // Handle common cross-site redirect failures
        const isSecurityError = error?.message?.includes('insecure') || error?.name === 'SecurityError';
        
        if (error.code === 'auth/redirect-cancelled-by-user') return;
        
        if (isSecurityError) {
          setAuthError("Browser privacy settings blocked the login redirect. Please try Email login instead of Google, or open the app in a new tab.");
          setIsAuthModalOpen(true);
        } else if (error.code === 'auth/internal-error' && error.message?.includes('partition')) {
          setAuthError("Browser privacy settings blocked the login. Please try Email login or turn off 'Prevent Cross-Site Tracking' in your browser settings.");
          setIsAuthModalOpen(true);
        } else if (error.code === 'auth/network-request-failed') {
          setAuthError("Network error during login. Please check your connection on your mobile device.");
          setIsAuthModalOpen(true);
        } else {
          handleAuthError(error);
          setIsAuthModalOpen(true);
        }
      }
    };

    checkRedirect();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        try {
          const profile = await ensureUserProfile(user);
          setUserProfile(profile);
          setHasAccess(profile.hasAccess);
          setIsPremium(profile.isPremium);
          loadHistory();
        } catch (error) {
          console.error("Error ensuring user profile:", error);
          setHasAccess(false);
        }
      } else {
        setSavedReports([]);
        setHasAccess(null);
      }
    }, (error: any) => {
      const isSecurityError = error?.message?.includes('insecure') || error?.name === 'SecurityError';
      if (!isSecurityError) console.error("Auth listener error:", error);
    });
    historyService.testConnection();
    return () => unsubscribe();
  }, []);

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const reports = await historyService.getReports();
      setSavedReports(reports);
    } catch (error) {
      console.error("Failed to load history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const profile = await ensureUserProfile(user);
      setUserProfile(profile);
      setHasAccess(profile.hasAccess);
      setIsPremium(profile.isPremium);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setAuthError(null);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    // Safety check for isIframe
    const isIframe = (function() {
      try {
        return window.self !== window.top;
      } catch (e) {
        return true;
      }
    })();

    try {
      // Step 1: Always try Popup first as it's better for debugging and doesn't lose page state
      console.info("Auth: Attempting Popup login...");
      try {
        await signInWithPopup(auth, provider);
        setIsAuthModalOpen(false);
        setAuthError(null);
      } catch (popupError: any) {
        console.warn("Auth: Popup login failed:", popupError);
        
        // If it's blocked or closed, try Redirect as a fallback for non-iframes
        if (popupError.code === 'auth/popup-blocked' || 
            popupError.code === 'auth/popup-closed-by-user' ||
            popupError.code === 'auth/cancelled-popup-request') {
          
          if (!isIframe) {
            console.info("Auth: Popup blocked/closed in standard tab, falling back to Redirect...");
            setAuthError("Popup blocked. Redirecting to secure login...");
            await new Promise(resolve => setTimeout(resolve, 800));
            await signInWithRedirect(auth, provider);
            return;
          }

          setAuthEmail(''); // Reset email if any
          setAuthError("Login window was closed or blocked. In this preview, we strongly recommend logging in with Email or clicking 'Open in Standard Tab' below.");
        } else {
          throw popupError;
        }
      }
    } catch (error: any) {
      console.error("Auth: Master Google Auth Error:", error);
      handleAuthError(error);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleAppleSignIn = async () => {
    setIsSigningIn(true);
    setAuthError(null);
    const provider = new OAuthProvider('apple.com');
    provider.addScope('email');
    provider.addScope('name');
    
    const isIframe = (function() {
      try {
        return window.self !== window.top;
      } catch (e) {
        return true;
      }
    })();

    try {
      console.info("Auth: Attempting Apple Popup login...");
      try {
        await signInWithPopup(auth, provider);
        setIsAuthModalOpen(false);
        setAuthError(null);
      } catch (popupError: any) {
        console.warn("Auth: Apple Popup login failed:", popupError);
        
        if (popupError.code === 'auth/popup-blocked' || 
            popupError.code === 'auth/popup-closed-by-user' ||
            popupError.code === 'auth/cancelled-popup-request') {
          
          if (!isIframe) {
            console.info("Auth: Apple Popup blocked/closed, falling back to Redirect...");
            setAuthError("Popup blocked. Redirecting to secure login...");
            await new Promise(resolve => setTimeout(resolve, 800));
            await signInWithRedirect(auth, provider);
            return;
          }

          setAuthError("Apple login window was closed or blocked. Try 'Open in Standard Tab' or Email sign-in.");
        } else {
          throw popupError;
        }
      }
    } catch (error: any) {
      console.error("Auth: Master Apple Auth Error:", error);
      handleAuthError(error);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleResetPasswordRequested = async () => {
    if (!user?.email) return;
    setAccountError(null);
    try {
      await sendPasswordResetEmail(auth, user.email);
      setResetEmailSent(true);
      setTimeout(() => setResetEmailSent(false), 5000);
    } catch (error: any) {
      console.error("Reset password error:", error);
      setAccountError(error.message || "Failed to send reset email");
    }
  };

  const handleForgotPassword = async () => {
    if (!authEmail) {
      setAuthError("Please enter your email address first.");
      return;
    }
    setAuthError(null);
    try {
      await sendPasswordResetEmail(auth, authEmail);
      setAuthError("Password reset email sent! Check your inbox.");
    } catch (error: any) {
      setAuthError(error.message || "Failed to send reset email.");
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newPassword) return;
    if (newPassword.length < 6) {
      setAccountError("Password must be at least 6 characters.");
      return;
    }

    setIsUpdatingPassword(true);
    setAccountError(null);
    try {
      await updatePassword(user, newPassword);
      setPasswordUpdated(true);
      setNewPassword('');
      setTimeout(() => setPasswordUpdated(false), 5000);
    } catch (error: any) {
      console.error("Update password error:", error);
      if (error.code === 'auth/requires-recent-login') {
        setAccountError("For security, please sign out and sign back in before changing your password.");
      } else {
        setAccountError(error.message || "Failed to update password");
      }
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSigningIn(true);
    setAuthError(null);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      } else {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      }
      setIsAuthModalOpen(false);
      setAuthEmail('');
      setAuthPassword('');
    } catch (error: any) {
      handleAuthError(error);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleAuthError = (error: any) => {
    setIsSigningIn(false);
    console.error("Auth detailed error:", error);

    if (error?.code === 'auth/unauthorized-domain') {
      const hostname = window.location.hostname;
      setAuthError(`DOMAIN NOT AUTHORIZED: The domain '${hostname}' is not in your Firebase Authorized Domains list. Go to Firebase Console > Authentication > Settings > Authorized Domains and add '${hostname}' and 'www.${hostname}'.`);
      return;
    }

    if (error?.code === 'auth/popup-closed-by-user') {
      const isIframe = window.self !== window.top;
      if (isIframe) {
        setAuthError("The sign-in window was closed or blocked. In this preview, security rules may prevent the login. Try Email login or 'Open in Standard Tab'.");
      } else {
        setAuthError("The sign-in process was interrupted. If the window closed by itself, check if your domain reached the Google consent screen correctly.");
      }
      return;
    }
    
    let message = "Authentication failed. Please try again.";
    
    const isSecurityError = error?.message?.includes('insecure') || error?.name === 'SecurityError';
    if (isSecurityError) {
      message = "Browser security settings blocked this action. This often happens in iframes or Private Browsing mode. Try opening the app in a new tab or use Email/Password sign-in.";
      setAuthError(message);
      return;
    }

    switch (error?.code) {
      case 'auth/popup-blocked':
        message = "Popup was blocked by your browser. Please enable popups for this site.";
        break;
      case 'auth/unauthorized-domain':
        const host = window.location.hostname;
        message = `CRITICAL: The domain '${host}' is NOT AUTHORIZED in your Firebase project. Please go to your Firebase Console > Authentication > Settings > Authorized Domains and manually add '${host}' and 'www.${host}' to the list.`;
        break;
      case 'auth/network-request-failed':
        message = "Network error. Please check your connection and try again.";
        break;
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        message = "Invalid email or password. Please check your credentials.";
        break;
      case 'auth/operation-not-allowed':
        message = "Apple Sign-In is not enabled on this Firebase project. Go to Firebase Console > Authentication > Sign-in method and enable Apple.";
        break;
      case 'auth/internal-error':
        if (error.message?.includes('partition')) {
          message = "Browser cross-site restrictions (Partitioned Cookies) detected. Try using a non-private window or another browser.";
        }
        break;
    }
    
    setAuthError(message);
  };

  const handleSignIn = () => {
    setAuthError(null);
    setIsAuthModalOpen(true);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setSavedReports([]);
      setHasAccess(null);
      setStep('landing');
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  const handleDeleteReport = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await historyService.deleteReport(id);
      setSavedReports(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const handleViewSavedReport = (saved: SavedReport) => {
    setPath(saved.path);
    setUserData(saved.userData);
    setPhotos(saved.photos);
    if (saved.progressPhotos) setProgressPhotos(saved.progressPhotos);
    setReport(saved.report);
    setViewingDate(saved.timestamp?.toDate ? saved.timestamp.toDate() : new Date());
    setStep('report');
  };

  const handleStart = (selectedPath: Path) => {
    if (!user) {
      handleSignIn();
      return;
    }
    
    if (hasAccess === false) {
      setStep('no-access');
      return;
    }

    if (selectedPath === 'progress' && !isPremium) {
      // Progress Engine is restricted to premium members
      alert("Weekly Progress Engine is a Premium feature. Please upgrade your membership to access.");
      return;
    }

    setPath(selectedPath);
    setStep('intake');
  };

  const handleIntakeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (path === 'assessment' || path === 'full') {
      setStep('photos');
    } else if (path === 'progress') {
      setStep('progress-photos');
    } else {
      processReport();
    }
  };

  const [isResubmitting, setIsResubmitting] = useState(false);

  const handleReportError = () => {
    if (!lastError) return;
    try {
      const subject = encodeURIComponent(`Error Report: UNLCKD Pro Trainer`);
      const body = encodeURIComponent(`User Email: ${user?.email || 'N/A'}\nError: ${lastError}\nTime: ${new Date().toISOString()}\nPath: ${path}\n\nPlease describe what you were doing when the error occurred:`);
      const mailtoUrl = `mailto:unlocksupport@unlckdbrand.com?subject=${subject}&body=${body}`;
      
      // Creating a hidden anchor is more reliable in some iframes
      const a = document.createElement('a');
      a.href = mailtoUrl;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => document.body.removeChild(a), 100);
    } catch (e) {
      console.error("Failed to trigger mailto link:", e);
      // If window.location.href or anchor click fails with "insecure", fallback to alert
      alert(`We couldn't open your mail app. Please manually email unlocksupport@unlckdbrand.com with this error:\n\n${lastError}`);
    }
  };

  const processReport = async (isResubmit: boolean = false, invalidLinksContext?: string) => {
    setStep('processing');
    setIsResubmitting(isResubmit || !!invalidLinksContext);
    const messages = (isResubmit || invalidLinksContext) ? [
      'Re-evaluating your data for accuracy...',
      'Correcting plan inconsistencies...',
      'Re-verifying exercise video links...',
      'Finalizing your corrected report...'
    ] : [
      'Analyzing your physique data...',
      'Calculating optimal macros...',
      `Designing your ${userData.planDuration || '12-week'} training split...`,
      'Curating your personalized meal plan...',
      'Finalizing your transformation report...'
    ];
    
    let msgIndex = 0;
    const interval = setInterval(() => {
      msgIndex = (msgIndex + 1) % messages.length;
      setLoadingMessage(messages[msgIndex]);
    }, 3000);

    try {
      setLastError(null);
      const result = await generateTransformationReport(
        userData, 
        path === 'progress' ? progressPhotos : photos, 
        path,
        isResubmit || !!invalidLinksContext,
        invalidLinksContext
      );
      setReport(result);
      setViewingDate(new Date());
      
      const currentAuthUser = auth.currentUser;
      if (currentAuthUser) {
        try {
          console.log("Saving report to history for user:", currentAuthUser.uid);
          const savedId = await historyService.saveReport(path, userData, result, photos, path === 'progress' ? progressPhotos : undefined);
          await loadHistory();
          console.log("Report saved and history reloaded successfully");

          // Auto-sync to Gym Hub if requested (only for Transformation Reports)
          if (path === 'full' && userData.syncToGymHub) {
            setLoadingMessage('Syncing plan to Gym Hub...');
            const reports = await historyService.getReports();
            const newlySaved = reports.find(r => r.id === savedId);
            if (newlySaved) {
              await gymService.syncPlanToHub(newlySaved);
              console.log("Plan synced to Gym Hub successfully");
            }
          }
        } catch (saveError) {
          console.error("Failed to save report to history:", saveError);
          // If save fails, we still show the report to the user but warn them
          alert("Report was generated but could not be saved to your history. You can still download the PDF.");
        }
      }
      
      setStep('report');
    } catch (error) {
      console.error('Error generating report:', error);
      let errorMessage = 'Failed to generate report. Please try again.';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        try {
          // Handle cases where error might be a complex object from the API
          errorMessage = (error as any).message || JSON.stringify(error);
        } catch (e) {
          errorMessage = 'An unexpected error occurred. Please check the console for details.';
        }
      }
      
      setLastError(errorMessage);
      setStep('error');
    } finally {
      clearInterval(interval);
    }
  };

  const compressImage = (base64: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 1000;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = base64;
    });
  };

  const handlePhotoUpload = (view: keyof Photos, file: File, set: 'current' | 'before' | 'after' = 'current') => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const compressed = await compressImage(base64);
      
      if (set === 'current') {
        setPhotos(prev => ({ ...prev, [view]: compressed }));
      } else if (set === 'before') {
        setProgressPhotos(prev => ({ ...prev, before: { ...prev.before, [view]: compressed } }));
      } else if (set === 'after') {
        setProgressPhotos(prev => ({ ...prev, after: { ...prev.after, [view]: compressed } }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDownload = () => {
    const originalTitle = document.title;
    
    // Extract last name
    const nameParts = userData.name.trim().split(' ');
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0];
    
    // Format date: 26APR2026
    const now = new Date();
    const day = now.getDate().toString().padStart(2, '0');
    const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const month = monthNames[now.getMonth()];
    const year = now.getFullYear();
    const time = now.toLocaleTimeString('en-GB', { hour12: false }).replace(/:/g, ''); // H_M_S without special chars for filename safety
    
    const formattedDate = `${day}${month}${year}`;
    const fileName = `UNLCKDProTrainer_${lastName}_${formattedDate}_${time}`;
    
    document.title = fileName;
    window.print();
    
    // Restore title after a short delay
    setTimeout(() => {
      document.title = originalTitle;
    }, 500);
  };

  return (
    <div className="min-h-screen bg-brand-dark text-gray-100 selection:bg-brand-primary selection:text-white relative overflow-x-hidden">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-brand-primary/10 blur-[120px] rounded-full" />
        <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] bg-brand-accent/5 blur-[100px] rounded-full" />
        <div className="absolute -bottom-[10%] left-[20%] w-[50%] h-[50%] bg-brand-primary/5 blur-[150px] rounded-full" />
      </div>

      <Header 
        user={user}
        hasAccess={hasAccess}
        isPremium={isPremium}
        userProfile={userProfile}
        activeTab={activeTab}
        step={step}
        setStep={setStep}
        setActiveTab={setActiveTab}
        loadHistory={loadHistory}
        handleSignIn={handleSignIn}
        handleSignOut={handleSignOut}
        setShowGymAuth={setShowGymAuth}
        onShowAccount={() => setIsAccountModalOpen(true)}
      />

      <main className="relative pt-32 pb-20 px-6 max-w-6xl mx-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'gym' ? (
            <motion.div
              key="gym"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ProGym 
                latestReport={latestReport} 
                userProfile={userProfile} 
                onProfileUpdate={refreshProfile}
                onHomeClick={() => {
                  setStep('landing');
                  setActiveTab('reports');
                }}
              />
            </motion.div>
          ) : (
            <>
              {step === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-4xl font-display font-bold tracking-tight">Your Transformation History</h2>
                  <p className="text-gray-400 mt-2 text-lg font-light">Your professional assessments, preserved and tracked.</p>
                </div>
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => loadHistory()} 
                    disabled={isLoadingHistory}
                    className="gap-2 border-white/10 hover:bg-white/5 rounded-xl"
                  >
                    <RefreshCw className={cn("w-4 h-4", isLoadingHistory && "animate-spin")} />
                    Refresh
                  </Button>
                  <Button variant="outline" onClick={() => setStep('landing')} className="gap-2 border-white/10 hover:bg-white/5 rounded-xl">
                    <ChevronLeft className="w-4 h-4" />
                    Back to Dashboard
                  </Button>
                </div>
              </div>

              {isLoadingHistory ? (
                <div className="h-[400px] flex items-center justify-center">
                  <Loader2 className="w-12 h-12 text-brand-primary animate-spin" />
                </div>
              ) : savedReports.length === 0 ? (
                <Card className="p-16 text-center bg-white/[0.02] border-dashed border-white/10 rounded-3xl">
                  <div className="max-w-sm mx-auto space-y-6">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                      <History className="w-10 h-10 text-gray-500" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold">No reports found</h3>
                      <p className="text-gray-400 font-light">Start your first assessment to begin building your transformation history.</p>
                    </div>
                    <Button onClick={() => setStep('landing')} className="bg-brand-primary text-brand-dark font-bold hover:bg-brand-primary/90 rounded-full px-8">
                      Start New Assessment
                    </Button>
                  </div>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {savedReports.map((saved) => (
                    <Card 
                      key={saved.id} 
                      className="group cursor-pointer bg-white/[0.02] border-white/5 hover:border-brand-primary/50 transition-all overflow-hidden relative rounded-3xl"
                      onClick={() => handleViewSavedReport(saved)}
                    >
                      <div className="aspect-video relative overflow-hidden bg-brand-surface">
                        {saved.photos.front ? (
                          <img 
                            src={saved.photos.front} 
                            alt="Report thumbnail"
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 blur-sm brightness-50"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-brand-primary/5">
                            {saved.path === 'meal' ? (
                              <Utensils className="w-12 h-12 text-brand-primary/40" />
                            ) : saved.path === 'workout' ? (
                              <Dumbbell className="w-12 h-12 text-brand-primary/40" />
                            ) : (
                              <Activity className="w-12 h-12 text-brand-primary/40" />
                            )}
                            <span className="text-[10px] font-black uppercase tracking-widest text-brand-primary/40">Report Data Only</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-transparent to-transparent" />
                        <div className="absolute top-4 right-4 z-20 flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-full"
                            onClick={(e) => handleDeleteReport(saved.id, e)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button className="bg-brand-primary text-brand-dark font-bold rounded-full gap-2">
                            View Report
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="p-6 space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <Badge className="bg-brand-primary/10 text-brand-primary border-none mb-2">
                              {saved.path.toUpperCase()}
                            </Badge>
                            <h3 className="font-display font-bold text-xl tracking-tight leading-tight uppercase group-hover:text-brand-primary transition-colors">
                              {saved.userData.name}
                            </h3>
                          </div>
                          <p className="text-[10px] text-gray-500 font-mono">
                            {saved.timestamp?.toDate 
                              ? `${saved.timestamp.toDate().toLocaleDateString()} ${saved.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
                              : 'Recent'}
                          </p>
                        </div>
                        <p className="text-sm text-gray-400 line-clamp-2 font-light italic">
                          "{saved.report.toplineSummary}"
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {step === 'no-access' && (
            <motion.div
              key="no-access"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-2xl mx-auto py-20 text-center space-y-12"
            >
              <div className="relative inline-block">
                <div className="w-24 h-24 rounded-3xl bg-brand-primary/10 flex items-center justify-center mx-auto border border-brand-primary/20">
                  <Lock className="w-10 h-10 text-brand-primary" />
                </div>
                <div className="absolute -top-2 -right-2 bg-brand-primary p-2 rounded-full shadow-lg">
                  <Shield className="w-4 h-4 text-brand-dark" />
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-4xl font-display font-bold tracking-tight">Access Restricted</h2>
                <p className="text-gray-400 text-lg font-light leading-relaxed">
                  Your UNLCKD Pro membership is currently inactive. Complete your registration to unlock the full power of elite AI-driven transformation analysis.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <a 
                  href="https://unlckdbrand.com/unlckd-pro-trainer" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-8 bg-brand-primary text-brand-dark rounded-3xl group relative overflow-hidden transition-all hover:scale-[1.02] shadow-2xl shadow-brand-primary/20"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Sparkles className="w-20 h-20" />
                  </div>
                  <div className="space-y-2 relative z-10">
                    <h3 className="text-2xl font-display font-bold uppercase italic">Purchase Pro Access</h3>
                    <p className="font-medium opacity-80 text-sm">Full Training & Transformation Reports</p>
                  </div>
                </a>

                <a 
                  href="https://unlckdbrand.com/unlckd-pro-trainer-premium" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-8 bg-transparent border-2 border-[#D4AF37]/30 text-[#D4AF37] rounded-3xl group relative overflow-hidden transition-all hover:scale-[1.02] animate-gold-glow"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Trophy className="w-20 h-20" />
                  </div>
                  <div className="space-y-2 relative z-10">
                    <h3 className="text-2xl font-display font-bold uppercase italic">Unlock Premium Hub</h3>
                    <p className="font-medium opacity-80 text-sm">Elite Gym Hub & High-Performance Access</p>
                  </div>
                </a>

                <div className="grid grid-cols-2 gap-4 md:col-span-2">
                  <Button 
                    variant="outline" 
                    className="h-20 rounded-3xl border-white/5 hover:bg-white/5 gap-2"
                    onClick={() => setStep('landing')}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back to Dashboard
                  </Button>
                  <div className="p-4 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col items-center justify-center text-center">
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-[0.2em] mb-1">Status</p>
                    <Badge className="text-red-500 border-red-500/20 bg-red-500/10">Pending Grant</Badge>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-white/5">
                <p className="text-xs text-gray-500 italic">
                  Note: After purchase, access is typically granted within 24 hours. Once your status is updated in the UNLCKD cloud, premium tools will automatically unlock.
                </p>
              </div>
            </motion.div>
          )}

          {step === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-xl mx-auto py-12"
            >
              <Card className="p-12 text-center bg-red-500/5 border-red-500/20 rounded-3xl space-y-8">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle className="w-10 h-10 text-red-500" />
                </div>
                <div className="space-y-4">
                  <h2 className="text-3xl font-display font-bold text-white uppercase tracking-tight">Generation Failed</h2>
                  <div className="p-4 bg-black/20 rounded-xl border border-white/5 text-left font-mono text-xs text-red-400/80 leading-relaxed overflow-hidden break-words">
                    {lastError || 'An unexpected error occurred during processing.'}
                  </div>
                  <p className="text-gray-400 text-sm">Our AI engine encountered a temporary roadblock or high traffic. Your progress hasn't been lost.</p>
                </div>
                <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Button 
                    className="w-full bg-brand-primary text-brand-dark font-bold py-4 rounded-xl text-xs hover:bg-brand-primary/90 uppercase tracking-widest"
                    onClick={() => processReport()}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again Now
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full py-4 border-white/10 hover:bg-white/5 bg-white/5 rounded-xl text-white font-bold uppercase tracking-widest text-xs gap-2"
                    onClick={handleReportError}
                  >
                    <ShieldAlert className="w-4 h-4 text-brand-primary" />
                    Report Error
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => setStep('landing')} 
                    className="sm:col-span-2 py-4 text-gray-500 hover:text-white transition-colors uppercase font-bold tracking-widest text-[10px]"
                  >
                    Return to Dashboard
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}

          {step === 'landing' && (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-16 text-center"
            >
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs font-bold uppercase tracking-widest">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse" />
                  Premium AI Coaching
                </div>
                <h1 className="text-6xl md:text-8xl font-display font-bold tracking-tighter leading-[0.9] max-w-4xl mx-auto">
                  Unlock Your <span className="text-brand-primary italic drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">Peak</span> Physique
                </h1>
                <p className="text-gray-400 text-xl max-w-2xl mx-auto font-light leading-relaxed">
                  The elite digital coach that turns your data and photos into a structured, professional transformation plan.
                </p>
                <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                  {!user ? (
                    <>
                      <a 
                        href="https://unlckdbrand.com/unlckd-pro-trainer" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-brand-primary text-brand-dark font-bold rounded-full hover:bg-brand-primary/90 transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] shadow-lg shadow-brand-primary/10"
                      >
                        <Sparkles className="w-5 h-5" />
                        Purchase Pro Access
                      </a>
                      <a 
                        href="https://unlckdbrand.com/unlckd-pro-trainer-premium" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-transparent border-2 border-[#D4AF37]/40 text-[#D4AF37] font-bold rounded-full hover:bg-[#D4AF37]/10 transition-all hover:scale-105 animate-gold-glow group"
                      >
                        <Trophy className="w-5 h-5 text-[#D4AF37] group-hover:rotate-12 transition-transform" />
                        Purchase Premium
                      </a>
                    </>
                  ) : !isPremium ? (
                    <a 
                      href="https://unlckdbrand.com/unlckd-pro-trainer-premium-upgrade" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-8 py-4 bg-transparent border-2 border-[#D4AF37]/40 text-[#D4AF37] font-bold rounded-full hover:bg-[#D4AF37]/10 transition-all hover:scale-105 animate-gold-glow group"
                    >
                      <Trophy className="w-5 h-5 text-[#D4AF37] group-hover:rotate-12 transition-transform" />
                      Upgrade to Premium
                    </a>
                  ) : null}
                </div>
              </div>

              <div className="space-y-6">
                {/* Top Row: Featured Services */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Featured: Pro Gym Hub */}
                  <Card 
                    className={cn(
                      "p-8 bg-brand-primary/5 border-2 transition-all cursor-pointer group relative overflow-hidden",
                      isPremium ? "border-amber-400/50 shadow-[0_0_15px_rgba(251,191,36,0.2)]" : "border-brand-primary/20 animate-pulse-border"
                    )} 
                    onClick={() => {
                      if (!user) {
                        handleSignIn();
                        return;
                      }
                      if (!hasAccess) {
                        setStep('no-access');
                        return;
                      }
                      if (!isPremium) {
                        setShowGymAuth(true);
                      } else {
                        setActiveTab('gym');
                      }
                    }}
                  >
                    {isPremium && (
                      <motion.div
                        animate={{
                          opacity: [0.1, 0.3, 0.1],
                        }}
                        transition={{
                          duration: 4,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        className="absolute inset-0 bg-amber-400/10 pointer-events-none"
                      />
                    )}
                    <motion.div
                      animate={{
                        boxShadow: [
                          "0 0 0px rgba(251, 191, 36, 0)",
                          "0 0 20px rgba(251, 191, 36, 0.3)",
                          "0 0 0px rgba(251, 191, 36, 0)"
                        ]
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="absolute inset-0 rounded-xl"
                    />
                    <div className="absolute inset-0 bg-brand-primary/5 group-hover:bg-brand-primary/10 transition-colors" />
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/10 blur-3xl -mr-32 -mt-32 group-hover:bg-brand-primary/20 transition-colors" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-primary/5 blur-3xl -ml-32 -mb-32 group-hover:bg-brand-primary/10 transition-colors" />
                    <div className="flex flex-col items-center text-center gap-6 relative z-10 h-full justify-center">
                      <div className="w-16 h-16 rounded-2xl bg-brand-primary/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-brand-primary/30 transition-all duration-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                        <Lock className="w-8 h-8 text-brand-primary" />
                      </div>
                      <div className="max-w-md mx-auto">
                        <h3 className="font-display font-bold text-2xl tracking-tight text-white mb-2">Pro Gym Hub</h3>
                        <p className="text-sm text-gray-400 leading-relaxed italic">"Your private high-performance optimization center. Access professional training environments."</p>
                        {!isPremium && (
                          <div className="mt-4 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">
                            <Zap className="w-3 h-3 fill-[#D4AF37]" />
                            Premium Access Required
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>

                  {/* Featured: Full Transformation Report */}
                  <Card className="p-8 bg-brand-primary border-transparent hover:brightness-110 transition-all cursor-pointer group relative overflow-hidden" onClick={() => handleStart('full')}>
                    <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 blur-3xl -mr-24 -mt-24 group-hover:bg-white/20 transition-colors" />
                    <div className="flex flex-col items-center text-center gap-6 relative z-10 h-full justify-center">
                      <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-all duration-500 backdrop-blur-sm">
                        <FileText className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-2xl tracking-tight text-white">Full Transformation Report</h3>
                        <p className="text-white/70 mt-2 text-sm leading-relaxed max-w-sm">The complete assessment, training, and nutrition package for serious results.</p>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Bottom Row: Core Services */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card className="p-6 bg-white/[0.02] backdrop-blur-sm border-white/5 hover:border-brand-primary/50 transition-all cursor-pointer group relative overflow-hidden" onClick={() => handleStart('assessment')}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 blur-3xl -mr-16 -mt-16 group-hover:bg-brand-primary/10 transition-colors" />
                    <div className="flex flex-col items-center text-center gap-4 relative z-10">
                      <div className="w-12 h-12 rounded-xl bg-brand-primary/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-brand-primary/20 transition-all duration-500">
                        <Camera className="w-6 h-6 text-brand-primary" />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-lg tracking-tight">Physique Assessment</h3>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">Detailed visual review and category ratings.</p>
                      </div>
                    </div>
                  </Card>
                  
                  <Card className="p-6 bg-white/[0.02] backdrop-blur-sm border-white/5 hover:border-brand-primary/50 transition-all cursor-pointer group relative overflow-hidden" onClick={() => handleStart('workout')}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 blur-3xl -mr-16 -mt-16 group-hover:bg-brand-primary/10 transition-colors" />
                    <div className="flex flex-col items-center text-center gap-4 relative z-10">
                      <div className="w-12 h-12 rounded-xl bg-brand-primary/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-brand-primary/20 transition-all duration-500">
                        <Dumbbell className="w-6 h-6 text-brand-primary" />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-lg tracking-tight">Workout Plan</h3>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">Tailored training split with sets and reps.</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6 bg-brand-primary/5 border-brand-primary/20 hover:border-brand-primary/50 transition-all cursor-pointer group relative overflow-hidden" onClick={() => handleStart('meal')}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 blur-3xl -mr-16 -mt-16 group-hover:bg-brand-primary/20 transition-colors" />
                    <div className="flex flex-col items-center text-center gap-4 relative z-10">
                      <div className="w-12 h-12 rounded-xl bg-brand-primary/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-brand-primary/20 transition-all duration-500">
                        <Utensils className="w-6 h-6 text-brand-primary" />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-lg tracking-tight">Meal Plan</h3>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">Goal-matched nutrition and grocery lists.</p>
                      </div>
                    </div>
                  </Card>

                  <Card 
                    className={cn(
                      "p-6 bg-white/[0.02] backdrop-blur-sm border-white/5 transition-all group relative overflow-hidden",
                      isPremium ? "hover:border-amber-400/50 cursor-pointer shadow-[0_0_15px_rgba(251,191,36,0.1)]" : "opacity-60 cursor-not-allowed bg-white/5 border-white/10"
                    )} 
                    onClick={() => handleStart('progress')}
                  >
                    {isPremium && (
                      <motion.div
                        animate={{
                          boxShadow: [
                            "0 0 0px rgba(251, 191, 36, 0)",
                            "0 0 15px rgba(251, 191, 36, 0.2)",
                            "0 0 0px rgba(251, 191, 36, 0)"
                          ],
                          borderColor: [
                            "rgba(251, 191, 36, 0.1)",
                            "rgba(251, 191, 36, 0.5)",
                            "rgba(251, 191, 36, 0.1)"
                          ]
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        className="absolute inset-0 rounded-xl border"
                      />
                    )}
                    <div className={cn(
                      "absolute top-0 right-0 w-32 h-32 blur-3xl -mr-16 -mt-16 transition-colors",
                      isPremium ? "bg-brand-primary/5 group-hover:bg-brand-primary/10" : "bg-gray-500/5"
                    )} />
                    <div className="flex flex-col items-center text-center gap-4 relative z-10">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500",
                        isPremium ? "bg-brand-primary/10 group-hover:scale-110 group-hover:bg-brand-primary/20" : "bg-gray-500/20"
                      )}>
                        <Activity className={cn("w-6 h-6", isPremium ? "text-brand-primary" : "text-gray-500")} />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-lg tracking-tight">Progress Engine</h3>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">Weekly photo comparison and feedback.</p>
                        {!isPremium && (
                          <div className="mt-4 flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-amber-500/80">
                            <Zap className="w-3 h-3 fill-amber-500" />
                            Premium Locked
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </div>

                {/* FAQ Section */}
                <div className="pt-24 border-t border-white/5 space-y-12">
                  <div className="space-y-4">
                    <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight">Support & FAQ</h2>
                    <p className="text-gray-400 max-w-xl mx-auto">Solutions for common access issues and technical questions.</p>
                  </div>
                  
                  <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                    {faqs.map((faq) => (
                      <button
                        key={faq.id}
                        onClick={() => setSelectedFaq(faq)}
                        className="w-full text-left p-6 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-brand-primary/30 transition-all flex items-center gap-4 group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-brand-primary/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                          <faq.icon className="w-5 h-5 text-brand-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold font-display italic uppercase truncate tracking-tight text-white">{faq.title}</h3>
                          <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mt-0.5">Click for Details</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-brand-primary transition-colors" />
                      </button>
                    ))}
                  </div>

                  {/* FAQ Detail Modal */}
                  <AnimatePresence>
                    {selectedFaq && (
                      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={() => setSelectedFaq(null)}
                          className="absolute inset-0 bg-brand-dark/90 backdrop-blur-md" 
                        />
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95, y: 20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 20 }}
                          className="relative w-full max-w-xl bg-brand-surface border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
                        >
                          <div className="p-8 space-y-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-brand-primary/10 flex items-center justify-center">
                                  <selectedFaq.icon className="w-6 h-6 text-brand-primary" />
                                </div>
                                <h3 className="text-2xl font-display font-bold italic uppercase tracking-tight text-white">{selectedFaq.title}</h3>
                              </div>
                              <button 
                                onClick={() => setSelectedFaq(null)}
                                className="p-2 hover:bg-white/5 rounded-full transition-colors"
                              >
                                <X className="w-6 h-6 text-gray-500" />
                              </button>
                            </div>

                            <div className="content">
                              {selectedFaq.content}
                            </div>

                            <button
                              onClick={() => setSelectedFaq(null)}
                              className="w-full py-4 bg-brand-primary text-brand-dark font-black uppercase tracking-tighter rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                            >
                              Close Information
                            </button>
                          </div>
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>
                  
                  {/* Account Settings Modal */}
                  <AnimatePresence>
                    {isAccountModalOpen && (
                      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={() => setIsAccountModalOpen(false)}
                          className="absolute inset-0 bg-brand-dark/90 backdrop-blur-md" 
                        />
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95, y: 20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 20 }}
                          className="relative w-full max-w-md bg-brand-surface border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
                        >
                          <div className="p-8 space-y-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-brand-primary/10 flex items-center justify-center">
                                  <User className="w-6 h-6 text-brand-primary" />
                                </div>
                                <h3 className="text-2xl font-display font-bold italic uppercase tracking-tight text-white">Account Settings</h3>
                              </div>
                              <button 
                                onClick={() => setIsAccountModalOpen(false)}
                                className="p-2 hover:bg-white/5 rounded-full transition-colors"
                              >
                                <X className="w-6 h-6 text-gray-500" />
                              </button>
                            </div>

                            <div className="space-y-4">
                              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Email Address</p>
                                <p className="text-white font-medium">{user?.email}</p>
                              </div>

                              <div className="pt-4 border-t border-white/5 space-y-4">
                                <h4 className="text-sm font-bold text-gray-200 uppercase tracking-wider">Security</h4>
                                
                                {user?.providerData.some(p => p.providerId === 'password') ? (
                                  <div className="space-y-4">
                                    <form onSubmit={handleUpdatePassword} className="space-y-3">
                                      <div className="relative">
                                        <input
                                          type="password"
                                          placeholder="Enter New Password"
                                          value={newPassword}
                                          onChange={(e) => setNewPassword(e.target.value)}
                                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-primary/50 transition-all"
                                          minLength={6}
                                        />
                                      </div>
                                      <button
                                        type="submit"
                                        disabled={isUpdatingPassword || !newPassword}
                                        className="w-full py-3 bg-white/10 hover:bg-white/15 text-white font-bold uppercase tracking-widest text-[10px] rounded-xl transition-all disabled:opacity-50"
                                      >
                                        {isUpdatingPassword ? "Updating..." : "Update Password Now"}
                                      </button>
                                    </form>

                                    {passwordUpdated && (
                                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-emerald-500">
                                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                                        <p className="text-[10px] font-bold">Password updated successfully!</p>
                                      </div>
                                    )}

                                    <div className="relative py-2">
                                      <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-white/5"></div>
                                      </div>
                                      <div className="relative flex justify-center text-[8px] uppercase tracking-widest text-gray-600 font-black">
                                        <span className="bg-brand-surface px-2">Or Use Email Link</span>
                                      </div>
                                    </div>

                                    {resetEmailSent ? (
                                      <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-500">
                                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                                        <p className="text-xs font-bold leading-relaxed">Password reset email sent! Please check your inbox.</p>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={handleResetPasswordRequested}
                                        className="w-full py-3 bg-transparent border border-white/5 text-gray-500 hover:text-gray-300 font-bold uppercase tracking-widest text-[10px] rounded-xl transition-all flex items-center justify-center gap-2"
                                      >
                                        <RotateCcw className="w-3 h-3" />
                                        Send Reset Email Instead
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <div className="p-4 bg-brand-primary/10 border border-brand-primary/20 rounded-xl flex items-center gap-3 text-gray-300">
                                    <Info className="w-5 h-5 shrink-0 text-brand-primary" />
                                    <p className="text-[10px] font-bold uppercase leading-relaxed">You are signed in via Google. Please manage your security settings through your Google Account.</p>
                                  </div>
                                )}
                                
                                {accountError && (
                                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500">
                                    <ShieldAlert className="w-5 h-5 shrink-0" />
                                    <p className="text-xs font-bold leading-relaxed">{accountError}</p>
                                  </div>
                                )}
                              </div>
                            </div>

                            <button
                              onClick={() => setIsAccountModalOpen(false)}
                              className="w-full py-4 bg-brand-primary text-brand-dark font-black uppercase tracking-tighter rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                            >
                              Close Settings
                            </button>
                          </div>
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>

                  {/* Footer */}
                  <div className="pt-12 pb-8 text-center text-gray-500 text-xs uppercase tracking-widest font-medium">
                    <p>&copy; {new Date().getFullYear()} UNLCKD PRO TRAINER. ALL RIGHTS RESERVED.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'intake' && (
            <motion.div
              key="intake"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-2xl mx-auto space-y-8"
            >
              <div className="space-y-4">
                <h2 className="text-4xl font-display font-bold tracking-tight">Smart Intake</h2>
                <p className="text-gray-400 text-lg font-light">Tell us about your current status and goals.</p>
              </div>

              <form onSubmit={handleIntakeSubmit} className="space-y-8 bg-white/[0.02] backdrop-blur-md p-8 rounded-3xl border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-primary to-transparent opacity-50" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input 
                    label="Full Name" 
                    placeholder="John Doe" 
                    required 
                    value={userData.name}
                    onChange={e => setUserData({...userData, name: e.target.value})}
                  />
                  {path !== 'progress' && (
                    <>
                      <Input 
                        label="Location" 
                        placeholder="e.g. London, UK" 
                        required 
                        value={userData.location}
                        onChange={e => setUserData({...userData, location: e.target.value})}
                      />
                      <Input 
                        label="Occupation" 
                        placeholder="e.g. Software Engineer" 
                        required 
                        value={userData.occupation}
                        onChange={e => setUserData({...userData, occupation: e.target.value})}
                      />
                    </>
                  )}
                  <Input 
                    label="Age" 
                    type="number" 
                    placeholder="25" 
                    required 
                    value={userData.age}
                    onChange={e => setUserData({...userData, age: e.target.value})}
                  />
                  <Select 
                    label="Sex" 
                    options={[{label: 'Male', value: 'male'}, {label: 'Female', value: 'female'}]} 
                    value={userData.sex}
                    onChange={e => setUserData({...userData, sex: e.target.value})}
                  />
                  
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-end">
                      <label className="text-sm font-medium text-gray-400">Height</label>
                      <div className="flex bg-brand-surface rounded-md p-0.5 border border-gray-800">
                        <button 
                          type="button"
                          className={cn("px-2 py-0.5 text-[10px] rounded", userData.heightUnit === 'cm' ? "bg-brand-primary text-white" : "text-gray-500")}
                          onClick={() => setUserData({...userData, heightUnit: 'cm'})}
                        >CM</button>
                        <button 
                          type="button"
                          className={cn("px-2 py-0.5 text-[10px] rounded", userData.heightUnit === 'ftin' ? "bg-brand-primary text-white" : "text-gray-500")}
                          onClick={() => setUserData({...userData, heightUnit: 'ftin'})}
                        >FT/IN</button>
                      </div>
                    </div>
                    <Input 
                      placeholder={userData.heightUnit === 'cm' ? "180" : "6'4\""} 
                      required 
                      value={userData.height}
                      onChange={e => setUserData({...userData, height: e.target.value})}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-end">
                      <label className="text-sm font-medium text-gray-400">Weight</label>
                      <div className="flex bg-brand-surface rounded-md p-0.5 border border-gray-800">
                        <button 
                          type="button"
                          className={cn("px-2 py-0.5 text-[10px] rounded", userData.weightUnit === 'kg' ? "bg-brand-primary text-white" : "text-gray-500")}
                          onClick={() => setUserData({...userData, weightUnit: 'kg'})}
                        >KG</button>
                        <button 
                          type="button"
                          className={cn("px-2 py-0.5 text-[10px] rounded", userData.weightUnit === 'lbs' ? "bg-brand-primary text-white" : "text-gray-500")}
                          onClick={() => setUserData({...userData, weightUnit: 'lbs'})}
                        >LBS</button>
                      </div>
                    </div>
                    <Input 
                      placeholder={userData.weightUnit === 'kg' ? "85" : "187"} 
                      required 
                      value={userData.weight}
                      onChange={e => setUserData({...userData, weight: e.target.value})}
                    />
                  </div>

                  {(path !== 'assessment' && path !== 'progress') && (
                    <div className="space-y-4 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Select 
                        label="Current Physical Activity Level"
                        options={[
                          {label: 'Sedentary (Office job, little exercise)', value: 'sedentary'}, 
                          {label: 'Lightly Active (Light exercise 1-3 days/week)', value: 'light'},
                          {label: 'Moderately Active (Moderate exercise 3-5 days/week)', value: 'moderate'},
                          {label: 'Very Active (Hard exercise 6-7 days/week)', value: 'active'},
                          {label: 'Extra Active (Very hard exercise & physical job)', value: 'extra'}
                        ]} 
                        value={userData.physicalActivity}
                        onChange={e => setUserData({...userData, physicalActivity: e.target.value})}
                      />
                      {(path === 'workout' || path === 'full') && (
                        <Select 
                          label="Desired Physical Activity Level"
                          options={[
                            {label: 'Moderately Active (3-5 days/week)', value: 'moderate'},
                            {label: 'Very Active (6-7 days/week)', value: 'active'},
                            {label: 'Extra Active (Athletic/Pro focus)', value: 'extra'}
                          ]} 
                          value={userData.desiredPhysicalActivity}
                          onChange={e => setUserData({...userData, desiredPhysicalActivity: e.target.value})}
                        />
                      )}
                    </div>
                  )}

                  {(path !== 'meal' && path !== 'assessment' && path !== 'progress') && (
                    <>
                      <Select 
                        label="Gym Access"
                        options={[
                          {label: 'Full Commercial Gym', value: 'full'}, 
                          {label: 'Home Gym (Basic)', value: 'home'},
                          {label: 'No Equipment', value: 'none'}
                        ]} 
                        value={userData.gymAccess}
                        onChange={e => setUserData({...userData, gymAccess: e.target.value})}
                      />
                      {(path === 'workout' || path === 'full') && (
                        <Select 
                          label="Smart Home Gym"
                          options={[
                            {label: 'None', value: 'none'},
                            {label: 'Tonal', value: 'tonal'}, 
                            {label: 'Speediance', value: 'speediance'},
                            {label: 'Tempo', value: 'tempo'}
                          ]} 
                          value={userData.smartHomeGym}
                          onChange={e => setUserData({...userData, smartHomeGym: e.target.value as any})}
                        />
                      )}
                      <Select 
                        label="Preferred Physique Style"
                        options={[
                          {label: 'Athletic', value: 'athletic'}, 
                          {label: 'Bodybuilder', value: 'bodybuilder'},
                          {label: 'Lean & Toned', value: 'lean'},
                          {label: 'Powerlifter', value: 'power'}
                        ]} 
                        value={userData.physiqueStyle}
                        onChange={e => setUserData({...userData, physiqueStyle: e.target.value})}
                      />
                    </>
                  )}

                  {path === 'meal' && (
                    <Select 
                      label="Calorie Preference" 
                      options={[
                        {label: 'Deficit (Fat Loss)', value: 'deficit'}, 
                        {label: 'Maintain (Recomp)', value: 'maintain'},
                        {label: 'Surplus (Muscle Gain)', value: 'surplus'}
                      ]} 
                      value={userData.caloriePreference}
                      onChange={e => setUserData({...userData, caloriePreference: e.target.value as any})}
                    />
                  )}

                  {path === 'full' && (
                    <div className="md:col-span-2 pt-2 border-t border-white/[0.03]">
                      <Checkbox 
                        label="Sync to Gym Hub consistency tracker" 
                        checked={userData.syncToGymHub}
                        onChange={e => setUserData({...userData, syncToGymHub: e.target.checked})}
                      />
                      <p className="text-[10px] text-gray-500 mt-2 ml-8 italic leading-relaxed">
                        When enabled, your training plan and metrics will automatically populate the Gym Hub. 
                        Disable this if you are performing a secondary analysis or trial report.
                      </p>
                    </div>
                  )}
                </div>

                {(path !== 'meal' && path !== 'assessment') && (
                  <>
                    {path !== 'progress' && (
                      <>
                        <Input 
                          label="Primary Goal"
                          placeholder="e.g. Lose 5kg fat while maintaining muscle" 
                          required 
                          value={userData.goals}
                          onChange={e => setUserData({...userData, goals: e.target.value})}
                        />
                        <Input 
                          label="Current Workout" 
                          placeholder="Describe your current routine or 'None'" 
                          required
                          value={userData.currentWorkout}
                          onChange={e => setUserData({...userData, currentWorkout: e.target.value})}
                        />
                        <Input 
                          label="Event Focus" 
                          placeholder="e.g. Wedding in 3 months, Beach holiday" 
                          required
                          value={userData.eventFocus}
                          onChange={e => setUserData({...userData, eventFocus: e.target.value})}
                        />
                      </>
                    )}

                    {(path === 'workout' || path === 'full' || path === 'progress') && (
                      <Input 
                        label="Current or Past Injuries" 
                        placeholder="e.g. Lower back pain, ACL surgery 2 years ago, or 'None'" 
                        required
                        value={userData.injuries}
                        onChange={e => setUserData({...userData, injuries: e.target.value})}
                      />
                    )}

                    {path !== 'progress' && (
                      <>
                        <Input 
                          label="Plan Start Date" 
                          type="date" 
                          required 
                          value={userData.planStartDate}
                          onChange={e => setUserData({...userData, planStartDate: e.target.value})}
                        />
                        <Select 
                          label="Plan Duration"
                          options={[
                            {label: '7 Days', value: '7-day'},
                            {label: '2 Weeks', value: '2-week'},
                            {label: '4 Weeks', value: '4-week'},
                            {label: '12 Weeks', value: '12-week'}
                          ]}
                          value={userData.planDuration}
                          onChange={e => setUserData({...userData, planDuration: e.target.value as any})}
                        />
                      </>
                    )}
                  </>
                )}

                {(path === 'meal' || path === 'full') && (
                  <Input 
                    label="Food preferences and Dietary Considerations (ex gout-prone, dislike tofu, dairy allergy)" 
                    placeholder="e.g. Gout-prone, dislike tofu, dairy allergy, or 'None'" 
                    required
                    value={userData.allergies}
                    onChange={e => setUserData({...userData, allergies: e.target.value})}
                  />
                )}

                {path === 'progress' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Input 
                        label="Before Photos Date" 
                        type="date" 
                        required 
                        value={progressPhotos.beforeDate}
                        onChange={e => setProgressPhotos({...progressPhotos, beforeDate: e.target.value})}
                      />
                      <Input 
                        label="After Photos Date" 
                        type="date" 
                        required 
                        value={progressPhotos.afterDate}
                        onChange={e => setProgressPhotos({...progressPhotos, afterDate: e.target.value})}
                      />
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <h3 className="text-lg font-display font-bold text-gray-200">Weight Assessment</h3>
                        <div className="flex bg-brand-surface rounded-md p-0.5 border border-gray-800">
                          <button 
                            type="button"
                            className={cn("px-2 py-0.5 text-[10px] rounded", userData.weightUnit === 'kg' ? "bg-brand-primary text-white" : "text-gray-500")}
                            onClick={() => setUserData({...userData, weightUnit: 'kg'})}
                          >KG</button>
                          <button 
                            type="button"
                            className={cn("px-2 py-0.5 text-[10px] rounded", userData.weightUnit === 'lbs' ? "bg-brand-primary text-white" : "text-gray-500")}
                            onClick={() => setUserData({...userData, weightUnit: 'lbs'})}
                          >LBS</button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Input 
                          label={`Before Weight (${userData.weightUnit})`}
                          type="number" 
                          required 
                          placeholder="e.g. 85"
                          value={progressPhotos.beforeWeight}
                          onChange={e => setProgressPhotos({...progressPhotos, beforeWeight: e.target.value})}
                        />
                        <Input 
                          label={`After Weight (${userData.weightUnit})`}
                          type="number" 
                          required 
                          placeholder="e.g. 82"
                          value={progressPhotos.afterWeight}
                          onChange={e => setProgressPhotos({...progressPhotos, afterWeight: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setStep('landing')}>
                    Back
                  </Button>
                  <Button type="submit" className="flex-1 gap-2">
                    Next <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            </motion.div>
          )}

          {step === 'photos' && (
            <motion.div
              key="photos"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-2xl mx-auto space-y-8"
            >
              <div className="space-y-2 text-center">
                <h2 className="text-3xl font-display font-bold">Physique Photos</h2>
                <p className="text-gray-400">Upload exactly four photos for a complete assessment.</p>
              </div>

              <div className="bg-brand-secondary/20 border border-brand-secondary/30 rounded-xl p-4 flex gap-4 items-start">
                <div className="p-2 bg-brand-primary/10 rounded-lg shrink-0">
                  <Info className="w-5 h-5 text-brand-primary" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-gray-200">Photo Requirements</h4>
                  <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
                    <li>Stand in neutral lighting (natural light is best)</li>
                    <li>Wear minimal, form-fitting clothing</li>
                    <li>Keep the camera at waist height</li>
                    <li>Ensure your full body is visible in every shot</li>
                  </ul>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {(['front', 'back', 'left', 'right'] as const).map((view) => (
                  <div key={view} className="space-y-2">
                    <label className="text-sm font-medium text-gray-400 capitalize">{view} View</label>
                    <div 
                      className={cn(
                        "aspect-[3/4] rounded-xl border-2 border-dashed border-gray-800 bg-brand-surface flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-brand-primary/50 transition-all relative group overflow-hidden",
                        photos[view] && "border-brand-primary/50"
                      )}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.add('border-brand-primary');
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('border-brand-primary');
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('border-brand-primary');
                        const file = e.dataTransfer.files?.[0];
                        if (file && file.type.startsWith('image/')) {
                          handlePhotoUpload(view, file);
                        }
                      }}
                      onClick={() => document.getElementById(`photo-${view}`)?.click()}
                    >
                      {photos[view] ? (
                        <>
                          <img src={photos[view]!} alt={view} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-white hover:bg-white/20"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPhotos(prev => ({ ...prev, [view]: null }));
                              }}
                            >
                              Replace Photo
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <Camera className="w-8 h-8 text-gray-600 group-hover:text-brand-primary transition-colors" />
                          <div className="text-center px-4">
                            <span className="text-xs text-gray-500 block">Click or drag to upload</span>
                            <span className="text-[10px] text-gray-600 block mt-1">JPG, PNG supported</span>
                          </div>
                        </>
                      )}
                      <input 
                        id={`photo-${view}`}
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handlePhotoUpload(view, file);
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-4 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setStep('intake')}>
                  Back
                </Button>
                <Button 
                  className="flex-1 gap-2" 
                  disabled={!photos.front || !photos.back || !photos.left || !photos.right}
                  onClick={() => processReport()}
                >
                  Generate Report <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'progress-photos' && (
            <motion.div
              key="progress-photos"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-4xl mx-auto space-y-12"
            >
              <div className="space-y-2 text-center">
                <h2 className="text-3xl font-display font-bold">Weekly Progress Engine</h2>
                <p className="text-gray-400">Upload your before and after photos for a detailed comparison.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Before Photos */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-brand-primary">Before Photos</h3>
                    <Badge>{progressPhotos.beforeDate || 'No Date'}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {(['front', 'back', 'left', 'right'] as const).map((view) => (
                      <div key={`before-${view}`} className="space-y-2">
                        <label className="text-xs font-medium text-gray-500 capitalize">{view} View</label>
                        <div 
                          className={cn(
                            "aspect-[3/4] rounded-xl border-2 border-dashed border-gray-800 bg-brand-surface flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-brand-primary/50 transition-all relative group overflow-hidden",
                            progressPhotos.before[view] && "border-brand-primary/50"
                          )}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.currentTarget.classList.add('border-brand-primary');
                          }}
                          onDragLeave={(e) => {
                            e.preventDefault();
                            e.currentTarget.classList.remove('border-brand-primary');
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.currentTarget.classList.remove('border-brand-primary');
                            const file = e.dataTransfer.files?.[0];
                            if (file && file.type.startsWith('image/')) {
                              handlePhotoUpload(view, file, 'before');
                            }
                          }}
                          onClick={() => document.getElementById(`before-${view}`)?.click()}
                        >
                          {progressPhotos.before[view] ? (
                            <>
                              <img src={progressPhotos.before[view]!} alt={view} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-white hover:bg-white/20"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setProgressPhotos(prev => ({ ...prev, before: { ...prev.before, [view]: null } }));
                                  }}
                                >
                                  Replace
                                </Button>
                              </div>
                            </>
                          ) : (
                            <>
                              <Camera className="w-6 h-6 text-gray-600 group-hover:text-brand-primary transition-colors" />
                              <div className="text-center px-4">
                                <span className="text-[10px] text-gray-500 block">Drag to upload</span>
                              </div>
                            </>
                          )}
                          <input 
                            id={`before-${view}`}
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handlePhotoUpload(view, file, 'before');
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* After Photos */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-brand-primary">After Photos</h3>
                    <Badge>{progressPhotos.afterDate || 'No Date'}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {(['front', 'back', 'left', 'right'] as const).map((view) => (
                      <div key={`after-${view}`} className="space-y-2">
                        <label className="text-xs font-medium text-gray-500 capitalize">{view} View</label>
                        <div 
                          className={cn(
                            "aspect-[3/4] rounded-xl border-2 border-dashed border-gray-800 bg-brand-surface flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-brand-primary/50 transition-all relative group overflow-hidden",
                            progressPhotos.after[view] && "border-brand-primary/50"
                          )}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.currentTarget.classList.add('border-brand-primary');
                          }}
                          onDragLeave={(e) => {
                            e.preventDefault();
                            e.currentTarget.classList.remove('border-brand-primary');
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.currentTarget.classList.remove('border-brand-primary');
                            const file = e.dataTransfer.files?.[0];
                            if (file && file.type.startsWith('image/')) {
                              handlePhotoUpload(view, file, 'after');
                            }
                          }}
                          onClick={() => document.getElementById(`after-${view}`)?.click()}
                        >
                          {progressPhotos.after[view] ? (
                            <>
                              <img src={progressPhotos.after[view]!} alt={view} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-white hover:bg-white/20"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setProgressPhotos(prev => ({ ...prev, after: { ...prev.after, [view]: null } }));
                                  }}
                                >
                                  Replace
                                </Button>
                              </div>
                            </>
                          ) : (
                            <>
                              <Camera className="w-6 h-6 text-gray-600 group-hover:text-brand-primary transition-colors" />
                              <div className="text-center px-4">
                                <span className="text-[10px] text-gray-500 block">Drag to upload</span>
                              </div>
                            </>
                          )}
                          <input 
                            id={`after-${view}`}
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handlePhotoUpload(view, file, 'after');
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4 max-w-2xl mx-auto">
                <Button variant="outline" className="flex-1" onClick={() => setStep('intake')}>
                  Back
                </Button>
                <Button 
                  className="flex-1 gap-2" 
                  disabled={
                    !progressPhotos.before.front || !progressPhotos.before.back || !progressPhotos.before.left || !progressPhotos.before.right ||
                    !progressPhotos.after.front || !progressPhotos.after.back || !progressPhotos.after.left || !progressPhotos.after.right
                  }
                  onClick={() => processReport()}
                >
                  Generate Comparison <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-24 space-y-8"
            >
              <div className="relative">
                <div className="w-24 h-24 rounded-full border-4 border-brand-primary/20 border-t-brand-primary animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Activity className="w-8 h-8 text-brand-primary animate-pulse" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <h2 
                  className="text-2xl font-display font-bold cursor-pointer hover:text-brand-primary transition-colors"
                  onClick={() => setStep('landing')}
                >UNLCKD AI is working</h2>
                <p className="text-gray-400 animate-pulse">{loadingMessage}</p>
              </div>
            </motion.div>
          )}

          {step === 'report' && report && (
            <motion.div
              key="report"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-16 max-w-5xl mx-auto relative"
            >
              {/* Download Button Actions */}
              <div className="flex justify-end items-center gap-4 no-print border-b border-white/5 pb-8">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-[10px] font-bold uppercase tracking-widest">
                  <Sparkles className="w-3 h-3" />
                  Print Ready
                </div>
                <Button 
                  variant="outline" 
                  size="md" 
                  className="gap-2 border-brand-primary/20 hover:bg-brand-primary/10 text-gray-300"
                  onClick={() => setShowLinkAudit(true)}
                >
                  <CheckCircle2 className="w-5 h-5 text-brand-primary" />
                  Audit Links
                </Button>
                <Button 
                  variant="primary" 
                  size="md" 
                  className="gap-2 bg-brand-primary text-brand-dark font-bold hover:bg-brand-primary/90 shadow-xl shadow-brand-primary/20"
                  onClick={handleDownload}
                >
                  <Download className="w-5 h-5" />
                  Download PDF Report
                </Button>
              </div>

              {/* Motivational Quote */}
              {(() => {
                const weeklyQuote = getWeeklyQuote();
                return (
                  <div className="text-center py-16 px-8 border border-brand-primary/20 bg-brand-primary/5 rounded-[2rem] relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.1),transparent)] opacity-50" />
                    <Quote className="w-10 h-10 text-brand-primary/20 mx-auto mb-6" />
                    <h2 className="text-2xl md:text-3xl font-serif italic text-gray-100 leading-relaxed max-w-3xl mx-auto relative z-10">
                      "{weeklyQuote.text}"
                    </h2>
                    <p className="mt-6 text-brand-primary font-bold tracking-widest text-sm uppercase relative z-10">— {weeklyQuote.author}</p>
                    <div className="mt-10 flex flex-col items-center gap-2 relative z-10">
                      <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em]">Weekly Fuel • Unlock your greatness.</p>
                      <div className="w-12 h-0.5 bg-brand-primary/30 rounded-full" />
                    </div>
                  </div>
                );
              })()}

              {/* Page 1: Header & Baseline Info */}
              <section className="space-y-8">
                <div className="text-center space-y-2">
                  <h1 
                    className="text-4xl font-display font-bold text-brand-primary cursor-pointer hover:brightness-110 transition-all"
                    onClick={() => setStep('landing')}
                  >
                    {(report as any).reportType || (
                      path === 'meal' ? 'UNLCKD Meal Plan' : 
                      path === 'workout' ? 'UNLCKD Workout Plan' : 
                      path === 'progress' ? 'UNLCKD Weekly Comparison Report' :
                      path === 'assessment' ? 'UNLCKD Physique Assessment' :
                      `UNLCKD ${userData.planDuration?.replace('-week', ' Week') || '12-Week'} Transformation Report`
                    )}
                  </h1>
                  <p className="text-gray-500">
                    {path === 'meal' ? 'Nutrition Strategy, Meal Plan, and Grocery List' :
                     path === 'workout' ? 'Training Plan, Recovery, and Hydration Strategy' :
                     path === 'assessment' ? 'Physique Analysis and Body Composition Assessment' :
                     `Complete ${(userData.planDuration?.replace('-week', ' Week') || '12-Week')} Transformation Blueprint`}
                  </p>
                </div>

                <div className="bg-brand-secondary/10 border border-brand-secondary/30 rounded-xl overflow-hidden print-break-inside-avoid">
                  <table className="w-full text-sm text-left border-collapse">
                    <tbody className="divide-y divide-gray-800">
                      {[
                        { label: 'Client Name', value: userData.name },
                        { label: 'Report Type', value: 
                          path === 'progress' ? 'UNLCKD Weekly Comparison Report' : 
                          path === 'meal' ? 'Meal Plan' :
                          path === 'workout' ? 'Workout Plan' :
                          'Transformation Report' 
                        },
                        { label: 'Date', value: viewingDate.toLocaleDateString() },
                        { label: 'Time', value: viewingDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
                        { label: 'Unique ID', value: viewingDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) },
                        { label: 'Age / Sex', value: `${userData.age} / ${userData.sex.charAt(0).toUpperCase() + userData.sex.slice(1)}` },
                        { label: 'Height / Weight', value: `${userData.height} ${userData.heightUnit} / ${userData.weight} ${userData.weightUnit}` },
                        ...(path !== 'progress' ? [
                          { label: 'Location', value: userData.location },
                          { label: 'Occupation', value: userData.occupation }
                        ] : []),
                        ...(path !== 'meal' ? [{ label: 'Current Workout', value: userData.currentWorkout || 'None' }] : []),
                        ...(path === 'meal' 
                          ? [{ 
                              label: 'Diet Strategy', 
                              value: userData.caloriePreference === 'deficit' ? 'Lose Weight (Caloric Deficit)' : 
                                     userData.caloriePreference === 'surplus' ? 'Gain Weight (Caloric Surplus)' : 
                                     'Maintain Weight (Maintenance)' 
                            }] 
                          : (path === 'progress' ? [] : [{ label: 'Primary Goals', value: userData.goals }])),
                      ].map((row, i) => (
                        <tr key={i}>
                          <td className="px-6 py-3 bg-brand-secondary/20 font-bold text-gray-200 w-1/3">{row.label}</td>
                          <td className="px-6 py-3 text-gray-300">{row.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {(path !== 'meal' && path !== 'workout') && (
                  <>
                    {path !== 'progress' ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 text-center">
                          <div className="aspect-[3/4] rounded-xl overflow-hidden border border-gray-800">
                            <img src={photos.front!} alt="Front" className="w-full h-full object-cover" />
                          </div>
                          <span className="text-xs font-bold text-gray-500 uppercase">Front</span>
                        </div>
                        <div className="space-y-2 text-center">
                          <div className="aspect-[3/4] rounded-xl overflow-hidden border border-gray-800">
                            <img src={photos.back!} alt="Back" className="w-full h-full object-cover" />
                          </div>
                          <span className="text-xs font-bold text-gray-500 uppercase">Back</span>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 text-center">
                          <div className="aspect-[3/4] rounded-xl overflow-hidden border border-gray-800">
                            <img src={progressPhotos.after.front!} alt="After Front" className="w-full h-full object-cover" />
                          </div>
                          <span className="text-xs font-bold text-brand-primary uppercase">Latest Front View</span>
                        </div>
                        <div className="space-y-2 text-center">
                          <div className="aspect-[3/4] rounded-xl overflow-hidden border border-gray-800">
                            <img src={progressPhotos.after.back!} alt="After Back" className="w-full h-full object-cover" />
                          </div>
                          <span className="text-xs font-bold text-brand-primary uppercase">Latest Back View</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
                <LogoBranding />
              </section>

              {/* Page 2: Topline Assessment */}
              {(path !== 'meal' && path !== 'workout') && (
                <section className="space-y-8 pt-16 border-t border-gray-800">
                  {path !== 'progress' ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2 text-center">
                        <div className="aspect-[3/4] rounded-xl overflow-hidden border border-gray-800">
                          <img src={photos.left!} alt="Left" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-xs font-bold text-gray-500 uppercase">Left Side</span>
                      </div>
                      <div className="space-y-2 text-center">
                        <div className="aspect-[3/4] rounded-xl overflow-hidden border border-gray-800">
                          <img src={photos.right!} alt="Right" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-xs font-bold text-gray-500 uppercase">Right Side</span>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2 text-center">
                        <div className="aspect-[3/4] rounded-xl overflow-hidden border border-gray-800">
                          <img src={progressPhotos.after.left!} alt="After Left" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-xs font-bold text-brand-primary uppercase">Latest Left View</span>
                      </div>
                      <div className="space-y-2 text-center">
                        <div className="aspect-[3/4] rounded-xl overflow-hidden border border-gray-800">
                          <img src={progressPhotos.after.right!} alt="After Right" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-xs font-bold text-brand-primary uppercase">Latest Right View</span>
                      </div>
                    </div>
                  )}

                  <div className="p-6 bg-brand-surface border border-gray-800 rounded-xl text-gray-300 leading-relaxed">
                    {report.toplineSummary}
                  </div>

                  <RatingTable title={path === 'progress' ? "Progress Ratings" : "Topline Ratings"} ratings={report.toplineRatings} />

                  {report.healthMetrics && (
                    <div className="space-y-6 pt-8 border-t border-gray-800">
                      <h2 className="text-3xl font-display font-bold text-brand-primary">Physique Assessment & Calorie Level</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="p-6 bg-brand-surface border-gray-800">
                          <div className="flex items-center gap-3 mb-4">
                            <Activity className="w-5 h-5 text-brand-primary" />
                            <h3 className="font-bold text-gray-200">Body Composition</h3>
                          </div>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-400">BMI</span>
                              <span className="text-lg font-mono font-bold text-brand-primary">{report.healthMetrics.bmi}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-400">Category</span>
                              <Badge className="border-brand-primary/30 text-brand-primary">{report.healthMetrics.bmiCategory}</Badge>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-400">Est. Body Fat %</span>
                              <span className="text-lg font-mono font-bold text-brand-primary">{report.healthMetrics.estimatedBodyFat}</span>
                            </div>
                          </div>
                        </Card>
                        <Card className="p-6 bg-brand-surface border-gray-800">
                          <div className="flex items-center gap-3 mb-4">
                            <Utensils className="w-5 h-5 text-brand-primary" />
                            <h3 className="font-bold text-gray-200">Calorie Recommendation</h3>
                          </div>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-400">Strategy</span>
                              <Badge className={cn(
                                "capitalize",
                                report.healthMetrics.recommendedCalorieLevel === 'deficit' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                                report.healthMetrics.recommendedCalorieLevel === 'surplus' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                                "bg-green-500/10 text-green-500 border-green-500/20"
                              )}>
                                {report.healthMetrics.recommendedCalorieLevel}
                              </Badge>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-400">Daily Target</span>
                              <span className="text-lg font-mono font-bold text-brand-primary">{report.healthMetrics.dailyCalorieTarget}</span>
                            </div>
                          </div>
                        </Card>
                        
                        <Card className="p-6 bg-brand-surface border-gray-800 md:col-span-2">
                          <div className="flex items-center gap-3 mb-4">
                            <Target className="w-5 h-5 text-brand-primary" />
                            <h3 className="font-bold text-gray-200">Health Status & Focus</h3>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Current Status</span>
                              <p className="text-sm text-gray-300 leading-relaxed">{report.healthMetrics.healthStatus}</p>
                            </div>
                            <div>
                              <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Recommended Focus</span>
                              <p className="text-sm text-gray-300 leading-relaxed font-medium text-brand-primary">{report.healthMetrics.focus}</p>
                            </div>
                            {report.healthMetrics.heightWeightAnalysis && (
                              <div className="md:col-span-2 pt-4 border-t border-gray-800">
                                <span className="text-xs font-bold text-gray-500 uppercase block mb-1 tracking-wider text-brand-primary">Height-to-Weight Relationship Analysis</span>
                                <p className="text-sm text-gray-300 leading-relaxed italic">{report.healthMetrics.heightWeightAnalysis}</p>
                              </div>
                            )}
                          </div>
                        </Card>
                      </div>
                    </div>
                  )}
                  <LogoBranding />
                </section>
              )}

              {/* View Comparisons */}
              {(path !== 'meal' && path !== 'workout') && (
                <section className="space-y-16 pt-16 border-t border-gray-800">
                    {path !== 'progress' ? (
                      <>
                        <RatingTable title="Front View Comparison" ratings={report.frontViewAnalysis?.ratings} summary={report.frontViewAnalysis?.summary} photo={photos.front} />
                        <RatingTable title="Left Side Comparison" ratings={report.leftViewAnalysis?.ratings} summary={report.leftViewAnalysis?.summary} photo={photos.left} />
                        <RatingTable title="Back View Comparison" ratings={report.backViewAnalysis?.ratings} summary={report.backViewAnalysis?.summary} photo={photos.back} />
                        <RatingTable title="Right Side Comparison" ratings={report.rightViewAnalysis?.ratings} summary={report.rightViewAnalysis?.summary} photo={photos.right} />
                      </>
                    ) : (
                      <>
                        <ProgressComparison 
                          title="Front View Comparison" 
                          ratings={report.frontViewAnalysis?.ratings} 
                          summary={report.frontViewAnalysis?.summary} 
                          beforePhoto={progressPhotos.before.front} 
                          afterPhoto={progressPhotos.after.front}
                          beforeDate={progressPhotos.beforeDate}
                          afterDate={progressPhotos.afterDate}
                          beforeWeight={progressPhotos.beforeWeight}
                          afterWeight={progressPhotos.afterWeight}
                          weightUnit={userData.weightUnit}
                        />
                        <ProgressComparison 
                          title="Left Side Comparison" 
                          ratings={report.leftViewAnalysis?.ratings} 
                          summary={report.leftViewAnalysis?.summary} 
                          beforePhoto={progressPhotos.before.left} 
                          afterPhoto={progressPhotos.after.left}
                          beforeDate={progressPhotos.beforeDate}
                          afterDate={progressPhotos.afterDate}
                          beforeWeight={progressPhotos.beforeWeight}
                          afterWeight={progressPhotos.afterWeight}
                          weightUnit={userData.weightUnit}
                        />
                        <ProgressComparison 
                          title="Back View Comparison" 
                          ratings={report.backViewAnalysis?.ratings} 
                          summary={report.backViewAnalysis?.summary} 
                          beforePhoto={progressPhotos.before.back} 
                          afterPhoto={progressPhotos.after.back}
                          beforeDate={progressPhotos.beforeDate}
                          afterDate={progressPhotos.afterDate}
                          beforeWeight={progressPhotos.beforeWeight}
                          afterWeight={progressPhotos.afterWeight}
                          weightUnit={userData.weightUnit}
                        />
                        <ProgressComparison 
                          title="Right Side Comparison" 
                          ratings={report.rightViewAnalysis?.ratings} 
                          summary={report.rightViewAnalysis?.summary} 
                          beforePhoto={progressPhotos.before.right} 
                          afterPhoto={progressPhotos.after.right}
                          beforeDate={progressPhotos.beforeDate}
                          afterDate={progressPhotos.afterDate}
                          beforeWeight={progressPhotos.beforeWeight}
                          afterWeight={progressPhotos.afterWeight}
                          weightUnit={userData.weightUnit}
                        />
                      </>
                    )}
                  <LogoBranding />
                </section>
              )}

              {/* Final Summary & Next Steps */}
              {(path !== 'meal' && path !== 'workout') && (
                <section className="space-y-8 pt-16 border-t border-gray-800">
                  <h2 className="text-3xl font-display font-bold text-brand-primary">Final Summary / Next-Phase Improvement Plan</h2>
                  <RatingTable title="Strategic Ratings" ratings={report.finalSummary?.ratings} />
                  
                  <div className="space-y-4">
                    <h3 className="text-xl font-display font-bold text-gray-200">Coaching-Oriented Next Steps</h3>
                    <div className="grid grid-cols-1 gap-4">
                      {report.finalSummary?.nextSteps?.map((step, i) => (
                        <div key={i} className="flex gap-4 p-4 bg-brand-surface border border-gray-800 rounded-xl items-start">
                          <div className="w-6 h-6 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold text-xs shrink-0">{i + 1}</div>
                          <p className="text-sm text-gray-300">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {path === 'progress' && report.recommendedWorkout && (
                    <div className="space-y-6 pt-8 border-t border-gray-800">
                      <div className="flex items-center gap-3">
                        <Dumbbell className="w-8 h-8 text-brand-primary" />
                        <h2 className="text-3xl font-display font-bold text-brand-primary">Recommended Targeted Workout</h2>
                      </div>
                      <div className="p-6 bg-brand-primary/5 border border-brand-primary/20 rounded-2xl">
                        <h3 className="text-xl font-bold text-gray-200 mb-2">{report.recommendedWorkout.title}</h3>
                        <p className="text-sm text-gray-400 mb-6 leading-relaxed">{report.recommendedWorkout.description}</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {report.recommendedWorkout.exercises?.map((ex, i) => (
    <div key={i} className="p-4 bg-brand-surface border border-gray-800 rounded-xl space-y-2">
      <div className="flex justify-between items-start">
        <a 
          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(ex.name + ' demonstration')}`} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="font-bold text-brand-primary hover:underline flex items-center gap-1"
        >
          {ex.name} <ExternalLink className="w-3 h-3" />
        </a>
        <Badge className="text-[10px] border-gray-700">{ex.sets} x {ex.reps}</Badge>
      </div>
      <p className="text-xs text-gray-500 italic"><span className="text-gray-400 font-medium not-italic">Focus:</span> {ex.focus}</p>
    </div>
  ))}
</div>
                      </div>
                    </div>
                  )}

                  {(path === 'progress' || path === 'assessment') && report.additionalActivities && (
                    <div className="space-y-6 pt-8 border-t border-gray-800">
                      <div className="flex items-center gap-3">
                        <Moon className="w-8 h-8 text-brand-primary" />
                        <h2 className="text-3xl font-display font-bold text-brand-primary">Recovery & Optimization</h2>
                      </div>
                      <div className="p-6 bg-brand-surface border border-gray-800 rounded-2xl">
                        <h3 className="text-xl font-bold text-gray-200 mb-2">{report.additionalActivities.title}</h3>
                        <p className="text-sm text-gray-400 mb-6 leading-relaxed">{report.additionalActivities.description}</p>
                        
                        <div className="grid grid-cols-1 gap-4">
                          {report.additionalActivities.activities?.map((act, i) => (
                            <div key={i} className="p-4 bg-brand-secondary/10 border border-brand-secondary/30 rounded-xl">
                              <div className="flex justify-between items-center mb-2">
                                <h4 className="font-bold text-brand-primary">{act.name}</h4>
                                <Badge className="text-[10px] border-brand-primary/20">{act.frequency}</Badge>
                              </div>
                              <p className="text-sm text-gray-300"><span className="text-gray-500 font-bold uppercase text-[10px] mr-2">Benefit:</span>{act.benefit}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <LogoBranding />
                </section>
              )}

              {/* Workout Plan */}
              {(path === 'workout' || path === 'full') && (
                <section className="space-y-8 pt-16 border-t border-gray-800">
                  <div className="space-y-4">
                    <h2 className="text-3xl font-display font-bold text-brand-primary">Deep Research & Goal Alignment</h2>
                    <div className="p-6 bg-brand-primary/5 border border-brand-primary/20 rounded-2xl text-gray-300 leading-relaxed italic relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-brand-primary" />
                      <div className="flex gap-4">
                        <Search className="w-6 h-6 text-brand-primary shrink-0 mt-1" />
                        <p className="text-sm md:text-base">
                          {report.goalAlignmentSummary}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="text-3xl font-display font-bold text-brand-primary">Workout Plan</h2>
                    {report.workoutPlan && (
                      <div className="flex flex-wrap items-center gap-3">
                        {userData.smartHomeGym === 'tonal' && (
                          <a 
                            href="https://tonal.com/blogs/movements" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-500 rounded-lg text-xs font-bold transition-all hover:bg-amber-500/20"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Tonal Movement Library
                          </a>
                        )}
                        {userData.smartHomeGym === 'speediance' && (
                          <a 
                            href="https://www.speediance.com/pages/speediance-gym-monster-movement-library?srsltid=AfmBOoo3U0D3Z0MW04zf3T0Rc4nBDKymmEl2_p4R0pEymJ-BVfEcaMPk&_su_rec=scLAYcaHvFiphvCHOQIGLeZtLFfz9GZXLZUJ1JbVtUoz9hB2oy4ViEpVsUIvsYzAwTH51GvYujIVDUt8eqToq89AHfc8p4ytUB1PLv3cv8TMlcxdhSC_HRPST5GQUhKar6sUDJ9YK7wectqHvq2tA6Hz5vbG3GsEj7hWz2aLKdKxBRTQNDgpJDWVNySGSMxvPogurLGOOItpPzSj7A0byTm5ia7N3CgQf5y2hwM_8uf8u0Z8XmD1Q1q-8iGFGtukY6AyGAx61zZtKJdIyl_I4r5G9r3I4sl_AtLzvcs4cbrarFqYStdpnG6ipEVmk2nWoi47zifkXg&_su_rec_id=76c8cc1d-54c3-4eaf-bcc9-8df2690d7684-1778418315#Strength" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-500 rounded-lg text-xs font-bold transition-all hover:bg-amber-500/20"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Speediance Movement Library
                          </a>
                        )}
                        {userData.smartHomeGym === 'tempo' && (
                          <a 
                            href="https://app.tempo.fit/login" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-500 rounded-lg text-xs font-bold transition-all hover:bg-amber-500/20"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Tempo Login
                          </a>
                        )}
                        <button 
                          onClick={() => {
                          const numWeeks = getPlanDurationWeeks(userData.planDuration);
                          let content = `UNLCKD PRO TRAINER - ${numWeeks}-WEEK TRAINING PLAN\n`;
                          content += `==========================================\n\n`;
                          
                          report.workoutPlan.forEach(week => {
                            content += `WEEK ${week.week} - ${(week.phase || '').toUpperCase()}\n`;
                            content += `------------------------------------------\n`;
                            
                            week.days.forEach((day, dayIdx) => {
                              const planDateData = getPlanDate(week.week, day.day, dayIdx);
                              content += `${(planDateData.weekday || day.day || '').toUpperCase()}${planDateData.date ? ` [${planDateData.date}]` : ''}\n`;
                              
                              // Strip markdown links for text file: [Name](URL) -> Name
                              const warmUpStr = Array.isArray(day.warmUp) 
                                ? day.warmUp.map(ex => `${ex.name}`).join('\n')
                                : (day.warmUp || '');
                              const mainWorkStr = Array.isArray(day.mainWork)
                                ? day.mainWork.map(ex => `${ex.name} (${ex.sets} x ${ex.reps})`).join('\n')
                                : (day.mainWork || '');

                              const cleanWarmup = warmUpStr.replace(/\[(.*?)\]\(.*?\)/g, '$1');
                              const cleanMainWork = mainWorkStr.replace(/\[(.*?)\]\(.*?\)/g, '$1');
                              
                              content += `Warm-up:\n${cleanWarmup}\n`;
                              content += `Main Work:\n${cleanMainWork}\n`;
                              if (day.notes) content += `Notes: ${day.notes}\n`;
                              content += `\n`;
                            });
                            content += `\n`;
                          });
                          
                          downloadFile('unlckd-training-plan.txt', content);
                        }}
                        className="flex items-center gap-2 px-6 py-3 bg-brand-primary hover:bg-brand-primary/90 text-black rounded-lg text-sm font-bold transition-all transform hover:scale-105 shadow-lg shadow-brand-primary/20 active:scale-95 outline-none"
                      >
                        <Download className="w-4 h-4" />
                        Download Plan (.txt)
                      </button>
                    </div>
                  )}
                  </div>
                  {report.workoutPlan?.map((week, weekIdx) => (
                    <div key={weekIdx} className="space-y-4">
                      <div className="flex items-center gap-4">
                        <h3 className="text-xl font-display font-bold text-gray-200">Week {week.week}</h3>
                        <Badge className="border-brand-primary/30 text-brand-primary">{week.phase}</Badge>
                      </div>
                      <div className="overflow-x-auto bg-brand-secondary/10 border border-brand-secondary/30 rounded-xl">
                        <table className="w-full text-sm text-left border-collapse">
                          <thead className="bg-brand-secondary/20 text-gray-400 uppercase text-[10px] tracking-wider">
                            <tr>
                              <th className="px-4 py-3 font-semibold border-r border-gray-800 w-32">Day / Date</th>
                              <th className="px-4 py-3 font-semibold border-r border-gray-800">Warm-Up</th>
                              <th className="px-4 py-3 font-semibold border-r border-gray-800">Main Work</th>
                              <th className="px-4 py-3 font-semibold">Notes</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-800">
                             {week.days?.map((day, i) => {
                               const planDateData = getPlanDate(week.week, day.day, i);
                               return (
                               <tr key={i} className="hover:bg-white/5 transition-colors">
                                 <td className="px-4 py-4 border-r border-gray-800">
                                   <div className="flex flex-col">
                                     <span className="font-bold text-brand-primary uppercase tracking-tight">{planDateData.weekday}</span>
                                     <span className="text-[10px] text-gray-500 font-mono mt-0.5">{planDateData.date}</span>
                                   </div>
                                 </td>
                                <td className="px-4 py-4 border-r border-gray-800 text-gray-400 text-xs">
  <div className="space-y-1">
    {(Array.isArray(day.warmUp) ? day.warmUp : []).map((ex, idx) => (
      <div key={idx} className="flex items-center gap-1">
        <a 
          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(ex.name + ' exercise demonstration')}`}
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-brand-primary hover:underline font-medium"
        >
          - {ex.name}
        </a>
      </div>
    ))}
    {!Array.isArray(day.warmUp) && (
      <ReactMarkdown components={{ a: ({node, ...props}) => {
        const title = (props.children?.[0] as string) || 'Exercise';
        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(title + ' demonstration')}`;
        return <a {...props} href={searchUrl} className="text-brand-primary hover:underline" target="_blank" rel="noopener noreferrer" />;
      }}}>
        {String(day.warmUp || '')}
      </ReactMarkdown>
    )}
  </div>
</td>
<td className="px-4 py-4 border-r border-gray-800 text-gray-300 font-medium">
  <div className="space-y-1">
    {(Array.isArray(day.mainWork) ? day.mainWork : []).map((ex, idx) => (
      <div key={idx} className="flex items-center gap-1">
        <a 
          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(ex.name + ' exercise tutorial')}`}
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-brand-primary hover:underline"
        >
          - {ex.name}
        </a>
        <span className="text-[10px] text-gray-500 font-mono ml-auto">{ex.sets}x{ex.reps}</span>
      </div>
    ))}
    {!Array.isArray(day.mainWork) && (
      <ReactMarkdown components={{ a: ({node, ...props}) => {
        const title = (props.children?.[0] as string) || 'Exercise';
        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(title + ' tutorial')}`;
        return <a {...props} href={searchUrl} className="text-brand-primary hover:underline" target="_blank" rel="noopener noreferrer" />;
      }}}>
        {String(day.mainWork || '')}
      </ReactMarkdown>
    )}
  </div>
</td>
                                <td className="px-4 py-4 text-gray-400 text-xs italic">{day.notes}</td>
                              </tr>
                               );
                             })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                  <LogoBranding />
                </section>
              )}

              {/* Nutrition & Meal Plan */}
              {(path === 'meal' || path === 'full') && (
                <section className="space-y-8 pt-16 border-t border-gray-800">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="text-3xl font-display font-bold text-brand-primary">Nutrition Strategy</h2>
                    {report.mealPlan && (
                      <button 
                        onClick={() => {
                          const numWeeks = getPlanDurationWeeks(userData.planDuration);
                          let content = `UNLCKD PRO TRAINER - ${numWeeks}-WEEK MEAL PLAN\n`;
                          content += `======================================\n\n`;
                          
                          report.mealPlan.forEach(week => {
                            content += `WEEK ${week.week}\n`;
                            content += `-----------------\n`;
                            
                            week.days.forEach((day, dayIdx) => {
                              const planDateData = getPlanDate(week.week, day.day, dayIdx);
                              content += `${(planDateData.weekday || day.day || '').toUpperCase()}${planDateData.date ? ` [${planDateData.date}]` : ''}\n`;
                              content += `Breakfast: ${day.breakfast || 'N/A'}\n`;
                              content += `Lunch: ${day.lunch || 'N/A'}\n`;
                              content += `Dinner: ${day.dinner || 'N/A'}\n`;
                              content += `Snack: ${day.snack || 'N/A'}\n`;
                              content += `\n`;
                            });
                            content += `\n`;
                          });
                          
                          downloadFile('unlckd-meal-plan.txt', content);
                        }}
                        className="flex items-center gap-2 px-6 py-3 bg-brand-primary hover:bg-brand-primary/90 text-black rounded-lg text-sm font-bold transition-all transform hover:scale-105 shadow-lg shadow-brand-primary/20 active:scale-95 outline-none"
                      >
                        <Download className="w-4 h-4" />
                        Download Meal Plan (.txt)
                      </button>
                    )}
                  </div>
                  <div className="p-6 bg-brand-surface border border-gray-800 rounded-xl text-gray-300 leading-relaxed overflow-hidden">
                    <div className="markdown-body">
  <ReactMarkdown components={{ a: ({node, ...props}) => {
    const title = (props.children?.[0] as string) || 'Link';
    const isWorkout = title.toLowerCase().includes('workout') || title.toLowerCase().includes('exercise');
    const searchUrl = isWorkout 
      ? `https://www.youtube.com/results?search_query=${encodeURIComponent(title + ' demonstration')}`
      : `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(title + ' healthy recipe')}`;
    return <a {...props} href={searchUrl} className="text-brand-primary hover:underline" target="_blank" rel="noopener noreferrer" />;
  }}}>
    {report.nutritionStrategy}
  </ReactMarkdown>
</div>
                  </div>

                  <div className="overflow-x-auto bg-brand-secondary/10 border border-brand-secondary/30 rounded-xl">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead className="bg-brand-secondary/20 text-gray-400 uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="px-4 py-3 font-semibold border-r border-gray-800">Week</th>
                          <th className="px-4 py-3 font-semibold border-r border-gray-800">Day / Date</th>
                          <th className="px-4 py-3 font-semibold border-r border-gray-800">Breakfast</th>
                          <th className="px-4 py-3 font-semibold border-r border-gray-800">Lunch</th>
                          <th className="px-4 py-3 font-semibold border-r border-gray-800">Dinner</th>
                          <th className="px-4 py-3 font-semibold">Snack</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {report.mealPlan?.map((week, weekIdx) => (
                          <React.Fragment key={weekIdx}>
                             {week.days?.map((day, i) => {
                               const planDateData = getPlanDate(week.week, day.day, i);
                               return (
                               <tr key={`${weekIdx}-${i}`} className="hover:bg-white/5 transition-colors">
                                 {i === 0 && (
                                   <td className="px-4 py-4 font-bold text-gray-400 border-r border-gray-800" rowSpan={week.days.length}>
                                     W{week.week}
                                   </td>
                                 )}
                                 <td className="px-4 py-4 border-r border-gray-800">
                                   <div className="flex flex-col">
                                     <span className="font-bold text-brand-primary uppercase tracking-tight">{planDateData.weekday}</span>
                                     <span className="text-[10px] text-gray-500 font-mono mt-0.5">{planDateData.date}</span>
                                   </div>
                                 </td>
                                <td className="px-4 py-4 border-r border-gray-800 text-gray-300 text-center">
                                  <a 
                                    href={`https://www.pinterest.com/search/pins/?q=${encodeURIComponent(day.breakfast + ' healthy recipe')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-medium text-gray-100 hover:text-brand-primary transition-colors hover:underline"
                                  >
                                    {day.breakfast}
                                  </a>
                                </td>
<td className="px-4 py-4 border-r border-gray-800 text-gray-300 text-center">
  <a 
    href={`https://www.pinterest.com/search/pins/?q=${encodeURIComponent(day.lunch + ' healthy recipe')}`}
    target="_blank"
    rel="noopener noreferrer"
    className="font-medium text-gray-100 hover:text-brand-primary transition-colors hover:underline"
  >
    {day.lunch}
  </a>
</td>
<td className="px-4 py-4 border-r border-gray-800 text-gray-300 text-center">
  <a 
    href={`https://www.pinterest.com/search/pins/?q=${encodeURIComponent(day.dinner + ' healthy recipe')}`}
    target="_blank"
    rel="noopener noreferrer"
    className="font-medium text-gray-100 hover:text-brand-primary transition-colors hover:underline"
  >
    {day.dinner}
  </a>
</td>
<td className="px-4 py-4 text-gray-300 text-center">
  <a 
    href={`https://www.pinterest.com/search/pins/?q=${encodeURIComponent(day.snack + ' healthy idea')}`}
    target="_blank"
    rel="noopener noreferrer"
    className="font-medium text-gray-100 hover:text-brand-primary transition-colors hover:underline"
  >
    {day.snack}
  </a>
</td>
                              </tr>
                               );
                             })}
                           </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <LogoBranding />
                </section>
              )}

              {/* Grocery List */}
              {(path !== 'workout' && path !== 'progress' && path !== 'assessment') && (
                <section className="space-y-8 pt-16 border-t border-gray-800">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <h2 className="text-3xl font-display font-bold text-brand-primary">Grocery Checklist</h2>
                        <p className="text-gray-400 text-sm">Every item listed is matched with your specific meal plan for absolute accuracy.</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        {report.recommendedGroceryStore && (
                          <div className="flex items-center gap-2 px-4 py-2 bg-brand-primary/10 border border-brand-primary/30 rounded-lg whitespace-nowrap">
                            <MapPin className="w-4 h-4 text-brand-primary" />
                            <span className="text-sm font-medium text-gray-200">Recommended Store: <span className="text-brand-primary">{report.recommendedGroceryStore}</span></span>
                          </div>
                        )}
                        <button 
                          onClick={() => {
                            let content = `UNLCKD PRO TRAINER - GROCERY CHECKLIST\n`;
                            content += `==========================================\n\n`;
                            
                            const groceryItems = report.groceryList || [];
                            const phases = [...new Set(groceryItems.map(g => g.phase || 'General'))];
                            
                            phases.forEach(phase => {
                              content += `WEEKS: ${phase.toUpperCase()}\n`;
                              content += `=========================\n\n`;
                              
                              const itemsInPhase = groceryItems.filter(g => (g.phase || 'General') === phase);
                              itemsInPhase.forEach(g => {
                                content += `${(g.category || 'Items').toUpperCase()}\n`;
                                content += `-----------------\n`;
                                const items = g.items.split(',').map(i => i.trim()).filter(i => i !== '');
                                items.forEach(item => {
                                  content += `[ ] ${item}\n`;
                                });
                                content += `\n`;
                              });
                              content += `\n`;
                            });
                            
                            downloadFile('unlckd-master-grocery-list.txt', content);
                          }}
                          className="flex items-center gap-2 px-6 py-3 bg-brand-primary hover:bg-brand-primary/90 text-black rounded-lg text-sm font-bold transition-all transform hover:scale-105 shadow-lg shadow-brand-primary/20 active:scale-95 outline-none"
                        >
                          <Download className="w-4 h-4" />
                          Master List (.txt)
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {[...new Set((report.groceryList || []).map(g => g.phase || 'General'))].map((phase, pIdx) => (
                        <Card key={pIdx} className="bg-brand-surface border-gray-800 overflow-hidden flex flex-col group">
                          <div className="bg-brand-secondary/20 p-4 border-b border-gray-800 flex items-center justify-between">
                             <h4 className="font-bold text-brand-primary uppercase tracking-widest text-xs">{phase} Checklist</h4>
                             <button 
                               onClick={() => {
                                 let content = `UNLCKD PRO TRAINER - GROCERY CHECKLIST\n`;
                                 content += `PHASE: ${phase.toUpperCase()}\n`;
                                 content += `==========================================\n\n`;
                                 
                                 const itemsInPhase = (report.groceryList || []).filter(g => (g.phase || 'General') === phase);
                                 itemsInPhase.forEach(g => {
                                   content += `${g.category.toUpperCase()}\n`;
                                   content += `-----------------\n`;
                                   const items = g.items.split(',').map(i => i.trim()).filter(i => i !== '');
                                   items.forEach(item => {
                                     content += `[ ] ${item}\n`;
                                   });
                                   content += `\n`;
                                 });
                                 
                                 downloadFile(`unlckd-grocery-${phase.toLowerCase().replace(/\s+/g, '-')}.txt`, content);
                               }}
                               className="p-2 hover:bg-brand-primary/10 rounded-lg text-brand-primary transition-colors flex items-center gap-2 text-[10px] font-black uppercase tracking-tighter"
                               title="Download this batch"
                             >
                               <Download className="w-3 h-3" />
                               Save List
                             </button>
                          </div>
                          <div className="p-6 space-y-6 flex-1">
                            {(report.groceryList || []).filter(g => (g.phase || 'General') === phase).map((cat, cIdx) => (
                              <div key={cIdx} className="space-y-3">
                                <h5 className="text-[10px] font-black uppercase text-gray-500 tracking-tighter transition-colors group-hover:text-brand-primary">{cat.category}</h5>
                                <div className="grid grid-cols-1 gap-1.5">
                                  {cat.items.split(',').map((item, iIdx) => (
                                    <div key={iIdx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 group/item transition-all">
                                      <div className="w-4 h-4 rounded border border-gray-700 flex items-center justify-center group-hover/item:border-brand-primary/40">
                                        <div className="w-1.5 h-1.5 rounded-full bg-brand-primary scale-0 group-hover/item:scale-100 transition-transform" />
                                      </div>
                                      <span className="text-xs text-gray-300 group-hover/item:text-white leading-relaxed">{item.trim()}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </Card>
                      ))}
                    </div>
                  <LogoBranding />
                </section>
              )}

              {/* Recovery & Tracking */}
              {(path !== 'meal' && path !== 'progress') && (
                <section className="space-y-12 pt-16 border-t border-gray-800 print-break-before">
                  <h2 className="text-3xl font-display font-bold text-brand-primary">Recovery, Sleep & Optimization</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Sleep Recommendation */}
                    {report.sleepRecommendation && (
                      <Card className="p-8 bg-brand-surface border-brand-primary/20 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                          <Moon className="w-24 h-24 text-brand-primary" />
                        </div>
                        <div className="relative z-10 space-y-6">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-brand-primary/10 rounded-lg">
                              <Moon className="w-6 h-6 text-brand-primary" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-100">Sleep Architecture</h3>
                          </div>
                          
                          <div className="space-y-2">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Recommended Duration</span>
                            <p className="text-3xl font-display font-black text-brand-primary">{report.sleepRecommendation.duration}</p>
                          </div>

                          <div className="space-y-2">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Performance Rationale</span>
                            <p className="text-sm text-gray-300 leading-relaxed italic">"{report.sleepRecommendation.rationale}"</p>
                          </div>

                          <div className="space-y-3">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Optimization Tips</span>
                            <ul className="space-y-2">
                              {report.sleepRecommendation.tips?.map((tip, i) => (
                                <li key={i} className="flex gap-3 text-sm text-gray-400">
                                  <div className="w-1.5 h-1.5 rounded-full bg-brand-primary/40 mt-1.5 shrink-0" />
                                  {tip}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </Card>
                    )}

                    <div className="space-y-6">
                      <Card className="p-6 space-y-4 bg-brand-surface border-gray-800">
                        <div className="flex items-center gap-3">
                          <Footprints className="w-5 h-5 text-brand-primary" />
                          <h3 className="font-bold">Daily Step Goal (NEAT)</h3>
                        </div>
                        <p className="text-2xl font-mono font-bold text-brand-primary">{report.stepGoals}</p>
                      </Card>
                      <Card className="p-6 space-y-4 bg-brand-surface border-gray-800">
                        <div className="flex items-center gap-3">
                          <Droplets className="w-5 h-5 text-brand-primary" />
                          <h3 className="font-bold">Hydration Target</h3>
                        </div>
                        <p className="text-2xl font-mono font-bold text-brand-primary">{report.hydrationTargets}</p>
                      </Card>
                      <Card className="p-6 space-y-4 bg-brand-surface border-gray-800">
                        <div className="flex items-center gap-3">
                          <Camera className="w-5 h-5 text-brand-primary" />
                          <h3 className="font-bold">Weekly Documentation</h3>
                        </div>
                        <p className="text-sm text-gray-400 italic">"Ensure photos are taken in consistent lighting for accurate visual tracking."</p>
                      </Card>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xl font-display font-bold text-gray-200">Suggested Recovery Schedule</h3>
                    <div className="bg-brand-secondary/10 border border-brand-secondary/30 rounded-xl overflow-hidden">
                      <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-brand-secondary/20 text-gray-400 uppercase text-[10px] tracking-wider">
                          <tr>
                            <th className="px-6 py-3 font-semibold border-r border-gray-800 w-1/3">Day</th>
                            <th className="px-6 py-3 font-semibold">Recovery Focus</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                          {report.recoverySchedule?.map((row, i) => (
                            <tr key={i}>
                              <td className="px-6 py-4 bg-brand-secondary/20 font-bold text-gray-200 border-r border-gray-800">{row.day}</td>
                              <td className="px-6 py-4 text-gray-300">{row.focus}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xl font-display font-bold text-gray-200">Practical Water Schedule</h3>
                    <div className="grid grid-cols-1 gap-2">
                      {report.waterSchedule?.map((item, i) => (
                        <div key={i} className="flex gap-3 items-center text-sm text-gray-400">
                          <div className="w-1.5 h-1.5 rounded-full bg-brand-primary shrink-0" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                  <LogoBranding />
                </section>
              )}

              {/* Trainer Summary */}
              {(path !== 'meal' && path !== 'progress') && (
                <section className="pt-16 border-t border-gray-800">
                  <h2 className="text-3xl font-display font-bold text-brand-primary mb-8">Trainer Follow-Up Summary</h2>
                  <div className="bg-brand-secondary/10 border border-brand-secondary/30 rounded-xl overflow-hidden">
                    <table className="w-full text-sm text-left border-collapse">
                      <tbody className="divide-y divide-gray-800">
                        {[
                          { label: 'Name', value: userData.name },
                          { label: 'Weight', value: `${userData.weight} ${userData.weightUnit}` },
                          { label: 'Height', value: `${userData.height} ${userData.heightUnit}` },
                          ...(path !== 'workout' ? [{ label: 'Meal Plan', value: report.trainerSummary.split('\n')[0] }] : []),
                          { label: 'Workout Plan', value: report.trainerSummary.split('\n')[1] || '7-day tailored split' },
                          { label: 'Steps', value: report.stepGoals },
                          { label: 'Water Intake', value: report.hydrationTargets },
                        ].map((row, i) => (
                          <tr key={i}>
                            <td className="px-6 py-3 bg-brand-secondary/20 font-bold text-gray-200 w-1/3">{row.label}</td>
                            <td className="px-6 py-3 text-gray-300">{row.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <LogoBranding />
                </section>
              )}

              <div className="mt-12 flex flex-col items-center gap-6 no-print pb-20">
                <Button size="lg" onClick={() => setStep('landing')} className="rounded-2xl px-12">Start New Assessment</Button>
                <button 
                  onClick={() => processReport(true)}
                  className="text-gray-500 hover:text-brand-primary text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2"
                >
                  <RotateCcw className="w-3 h-3" />
                  Resubmit Assessment (Fix Output Issues)
                </button>
              </div>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  </main>
      
  {/* Gym Activation Modal */}
  <AnimatePresence>
    {showGymAuth && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-0">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowGymAuth(false)}
          className="absolute inset-0 bg-brand-dark/80 backdrop-blur-md" 
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-brand-surface border border-white/10 rounded-3xl p-8 shadow-2xl"
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-brand-primary/10 rounded-2xl flex items-center justify-center mb-6">
              <Lock className="w-8 h-8 text-brand-primary" />
            </div>
            <h3 className="text-2xl font-display font-black text-white mb-2 uppercase tracking-tight text-center">Access Pro Gym Hub</h3>
            <p className="text-gray-400 text-sm mb-8 text-center max-w-md">Your professional performance optimization center. Enter your 4-digit activation PIN to unlock elite training tools.</p>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8 w-full max-w-2xl">
              {[
                { icon: Zap, label: 'Dynamic Programming', desc: 'Periodized S&C cycles' },
                { icon: Youtube, label: 'Form Tutorials', desc: 'High-authority guidance' },
                { icon: Activity, label: 'Precision Logging', desc: 'Sets, reps, weight & time' },
                { icon: LineChart, label: 'Visual Analytics', desc: 'Chart your progression' },
                { icon: Trophy, label: 'Achievement System', desc: 'Consistency rewards' },
                { icon: FileText, label: 'Plan Exporting', desc: 'Offline training portability' }
              ].map((f, i) => (
                <div key={i} className="p-4 bg-white/5 border border-white/10 rounded-xl flex flex-col items-center text-center gap-2 group hover:border-brand-primary/30 transition-colors">
                  <f.icon className="w-5 h-5 text-brand-primary group-hover:scale-110 transition-transform" />
                  <div>
                    <div className="text-[10px] font-black text-white uppercase tracking-wider mb-1">{f.label}</div>
                    <div className="text-[9px] text-gray-500 leading-tight">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="w-full space-y-4">
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Activation PIN</label>
                <Input 
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  placeholder="••••"
                  maxLength={4}
                  value={gymAuthPin}
                  onChange={(e) => setGymAuthPin(e.target.value.replace(/\D/g, ''))}
                  className="text-center text-2xl tracking-[1em] font-mono"
                />
              </div>
              
              <Button 
                className="w-full bg-brand-primary text-brand-dark font-black py-6 rounded-2xl text-lg hover:bg-brand-primary/90"
                onClick={async () => {
                  if (gymAuthPin === '1234') { // Mock PIN for demo
                    if (user) {
                      await unlockPremium(user.uid);
                      setIsPremium(true);
                      setShowGymAuth(false);
                      setActiveTab('gym');
                      setGymAuthPin('');
                    }
                  } else {
                    alert('Invalid Activation PIN');
                  }
                }}
              >
                Authorize Entry
              </Button>
              
              <button 
                onClick={() => setShowGymAuth(false)}
                className="text-xs font-bold text-gray-500 hover:text-white transition-colors"
              >
                Cancel Request
              </button>

              <div className="pt-4 border-t border-white/5">
                <p className="text-[10px] text-gray-400 mb-3 uppercase tracking-widest font-bold">Don't have a PIN yet?</p>
                <a 
                  href="https://unlckdbrand.com/unlckd-pro-trainer-premium" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 px-4 border border-[#D4AF37]/30 bg-[#D4AF37]/5 text-[#D4AF37] rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#D4AF37]/10 transition-all animate-gold-glow"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  Get Premium Access
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>

      <footer className="py-12 border-t border-gray-800 bg-brand-dark">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-4">
          <Logo 
            size="sm"
            className="opacity-50 hover:opacity-100 justify-center"
            onClick={() => {
              setStep('landing');
              setActiveTab('reports');
            }}
          />
          <p className="text-xs text-gray-600">
            © 2026 UNLCKD Pro Trainer. AI-generated assessments are for informational purposes only. Consult a professional before starting any new fitness or nutrition program.
          </p>
        </div>
      </footer>

      {/* Auth Modal */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute inset-0 bg-brand-dark/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-brand-surface border border-white/10 rounded-3xl p-8 relative z-10 shadow-2xl"
            >
              <div className="text-center space-y-2 mb-8">
                <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-brand-primary" />
                </div>
                <h2 className="text-3xl font-display font-bold">
                  Welcome Back
                </h2>
                <p className="text-gray-400 font-light">
                  Sign in to access your professional reports.
                </p>
              </div>

              {authError && (
                <div className="mb-6 overflow-hidden">
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-500 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <Info className="w-4 h-4 shrink-0" />
                      <span className="flex-1">{authError}</span>
                    </div>
                    {window.self !== window.top && (
                      <a 
                        href={window.location.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-red-500 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest text-center hover:bg-red-600 transition-colors"
                      >
                        Open in Standard Tab
                      </a>
                    )}
                  </div>
                </div>
              )}

              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">Email Address</label>
                  <Input 
                    type="email" 
                    placeholder="name@example.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Password</label>
                    {!isSignUp && (
                      <button 
                        type="button"
                        onClick={handleForgotPassword}
                        className="text-[10px] uppercase font-black tracking-widest text-brand-primary/60 hover:text-brand-primary transition-colors"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <Input 
                    type="password" 
                    placeholder="••••••••"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-brand-primary text-brand-dark font-bold text-lg shadow-lg shadow-brand-primary/20"
                  disabled={isSigningIn}
                >
                  {isSigningIn && authEmail ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Sign In'}
                </Button>
              </form>

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/5"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase tracking-widest">
                  <span className="bg-brand-surface px-4 text-gray-500">Or continue with</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  onClick={handleGoogleSignIn}
                  className="w-full h-12 border-white/5 hover:bg-white/5 gap-3"
                  disabled={isSigningIn}
                >
                  {isSigningIn && !authEmail ? (
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  ) : (
                    <>
                      <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
                      Google
                    </>
                  )}
                </Button>

                <Button 
                  variant="outline" 
                  onClick={handleAppleSignIn}
                  className="w-full h-12 border-white/5 hover:bg-white/5 gap-3"
                  disabled={isSigningIn}
                >
                  {isSigningIn && !authEmail ? (
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  ) : (
                    <>
                      <Apple className="w-4 h-4" />
                      Apple ID
                    </>
                  )}
                </Button>
              </div>

              {isSigningIn && !authEmail && (
                <p className="mt-4 text-[10px] text-center text-gray-500 animate-pulse">
                  Opening login window... If it doesn't appear, check your popup blocker.
                </p>
              )}

              <div className="mt-8 text-center space-y-6">
                {window.self !== window.top && (
                  <div className="p-3 bg-brand-primary/5 rounded-xl border border-brand-primary/10">
                    <p className="text-[10px] text-gray-500 mb-2">
                      Experiencing issues? Preview frames can restrict Google logins.
                    </p>
                    <a 
                      href={window.location.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-bold text-brand-primary hover:underline uppercase tracking-wider"
                    >
                      Open in Standard Tab
                    </a>
                  </div>
                )}
                <div className="pt-4 border-t border-white/5 space-y-2">
                  <p className="text-sm text-gray-400">
                    {isSignUp ? "Already have an account?" : "No password set up yet?"} {' '}
                    <button 
                      onClick={() => setIsSignUp(!isSignUp)}
                      className="text-brand-primary hover:underline font-bold"
                    >
                      {isSignUp ? "Sign In" : "Sign Up"}
                    </button>
                  </p>
                  <p className="text-[10px] text-gray-600 italic">
                    Note: Pro membership is required for premium features.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showLinkAudit && (
          <LinkAuditModal 
            isOpen={showLinkAudit} 
            onClose={() => setShowLinkAudit(false)} 
            report={report} 
            onFix={(context) => {
              setShowLinkAudit(false);
              processReport(true, context);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
