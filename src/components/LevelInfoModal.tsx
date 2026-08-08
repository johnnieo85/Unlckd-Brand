import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  TrendingUp, 
  Award, 
  Target, 
  Zap, 
  ChevronRight,
  Sparkles,
  Lock
} from 'lucide-react';
import { Card, Badge } from './ui/Card';
import { Button } from './ui/Button';
import { getLevelInfo, LEVELS } from '../lib/levels';
import { cn } from '../lib/utils';

interface LevelInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  xp: number;
}

export const LevelInfoModal = ({ isOpen, onClose, xp }: LevelInfoModalProps) => {
  const currentLevelInfo = getLevelInfo(xp);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-brand-dark/80 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-2xl bg-brand-surface border border-white/10 rounded-2xl sm:rounded-[2rem] overflow-hidden shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-4 sm:p-6 md:p-8 bg-gradient-to-br from-brand-primary/10 to-transparent border-b border-white/5 relative shrink-0">
              <button 
                onClick={onClose}
                className="absolute top-3.5 right-3.5 sm:top-6 sm:right-6 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer shrink-0 z-10"
                aria-label="Close"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6 pr-10 sm:pr-12">
                <div className="p-2.5 sm:p-3 bg-brand-primary/20 rounded-xl sm:rounded-2xl shrink-0">
                  <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-brand-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg sm:text-2xl font-display font-black text-white leading-tight truncate">Level Progression</h2>
                  <p className="text-gray-400 text-xs sm:text-sm truncate">Earn XP through daily workouts and habits</p>
                </div>
              </div>

              {/* Progress Summary */}
              <div className="bg-brand-dark/50 rounded-xl sm:rounded-2xl p-3.5 sm:p-6 border border-white/5 space-y-3 sm:space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                  <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
                    <span className="text-2xl sm:text-4xl font-display font-black text-brand-primary whitespace-nowrap">
                      Lvl {currentLevelInfo.level}
                    </span>
                    <Badge className="bg-brand-primary/10 text-brand-primary border-brand-primary/20 whitespace-nowrap px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-bold tracking-wider">
                      {currentLevelInfo.title}
                    </Badge>
                  </div>
                  <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center border-t sm:border-t-0 border-white/5 pt-2 sm:pt-0">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 block">Total XP</span>
                    <span className="text-lg sm:text-2xl font-mono font-bold text-white whitespace-nowrap">{xp.toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                    <span className="text-brand-primary truncate">Progress to Lvl {currentLevelInfo.level + 1}</span>
                    <span className="text-gray-400 font-mono font-bold shrink-0 ml-2">{Math.round(currentLevelInfo.progress)}%</span>
                  </div>
                  <div className="h-2.5 sm:h-3 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/10">
                    <motion.div 
                      className="h-full bg-brand-primary rounded-full relative overflow-hidden"
                      initial={{ width: 0 }}
                      animate={{ width: `${currentLevelInfo.progress}%` }}
                    >
                      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.3)_50%,transparent_100%)] animate-[shimmer_2s_infinite]" />
                    </motion.div>
                  </div>
                  <p className="text-[10px] text-gray-500 text-center italic">
                    {currentLevelInfo.xpToNext.toLocaleString()} XP remaining for your next promotion
                  </p>
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-4 custom-scrollbar">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-3 sm:mb-6">Unlocked & Upcoming Milestones</h3>
              
              <div className="space-y-2.5 sm:space-y-3">
                {LEVELS.map((lvl) => {
                  const isReached = xp >= lvl.minXp;
                  const isCurrent = currentLevelInfo.level === lvl.level;
                  
                  return (
                    <div 
                      key={lvl.level}
                      className={cn(
                        "relative p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border transition-all duration-300",
                        isCurrent 
                          ? "bg-brand-primary/10 border-brand-primary shadow-[0_0_20px_rgba(16,185,129,0.1)]" 
                          : isReached 
                            ? "bg-white/[0.02] border-white/5" 
                            : "bg-brand-dark/30 border-white/5 opacity-50"
                      )}
                    >
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className={cn(
                          "w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center font-display font-black text-base sm:text-lg border shrink-0",
                          isCurrent
                            ? "bg-brand-primary/20 border-brand-primary/40 text-brand-primary" 
                            : isReached 
                              ? "bg-brand-primary/10 border-brand-primary/20 text-brand-primary/80" 
                              : "bg-white/5 border-white/5 text-gray-500"
                        )}>
                          {lvl.level}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                            <h4 className={cn(
                              "font-bold text-xs sm:text-sm truncate",
                              isReached ? "text-white" : "text-gray-500"
                            )}>
                              {lvl.title}
                            </h4>
                            {isReached && <Award className="w-3.5 h-3.5 text-brand-primary shrink-0" />}
                            {!isReached && <Lock className="w-3.5 h-3.5 text-gray-700 shrink-0" />}
                          </div>
                          <p className="text-[10px] text-gray-500 line-clamp-1">{lvl.description}</p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[9px] sm:text-[10px] font-mono text-gray-600 block">Min XP</span>
                          <span className={cn(
                            "text-xs font-mono font-bold",
                            isReached ? "text-white" : "text-gray-500"
                          )}>
                            {lvl.minXp.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {isReached && (
                        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-white/5 flex flex-wrap gap-1.5 sm:gap-2">
                          {lvl.perks.map((perk, i) => (
                            <Badge 
                              key={i} 
                              className="text-[9px] bg-white/5 border-white/5 text-gray-400 py-0.5 px-1.5"
                            >
                              {perk}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {!isReached && lvl.level === currentLevelInfo.level + 1 && (
                        <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 bg-brand-primary/20 rounded-md sm:rounded-lg">
                          <Sparkles className="w-2.5 h-2.5 text-brand-primary animate-pulse" />
                          <span className="text-[8px] sm:text-[9px] font-black text-brand-primary uppercase">Next Reward</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-3.5 sm:p-5 bg-brand-dark/50 border-t border-white/5 flex justify-center shrink-0">
              <p className="text-[10px] text-gray-500 text-center max-w-sm tracking-wide leading-relaxed">
                XP is finalized at the end of each day. Streaks are calculated based on consecutive workout logs. Keep pushing for more unlocks.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
