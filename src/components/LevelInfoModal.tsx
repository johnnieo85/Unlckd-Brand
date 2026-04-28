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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-brand-dark/80 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-2xl bg-brand-surface border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-8 bg-gradient-to-br from-brand-primary/10 to-transparent border-b border-white/5 relative shrink-0">
              <button 
                onClick={onClose}
                className="absolute top-6 right-6 p-2 text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-brand-primary/20 rounded-2xl">
                  <TrendingUp className="w-6 h-6 text-brand-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-display font-black text-white">Level Progression</h2>
                  <p className="text-gray-500 text-sm">Earn XP through daily workouts and habits</p>
                </div>
              </div>

              {/* Progress Summary */}
              <div className="bg-brand-dark/50 rounded-2xl p-6 border border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl font-display font-black text-brand-primary">Lvl {currentLevelInfo.level}</span>
                    <Badge className="bg-brand-primary/10 text-brand-primary border-brand-primary/20">
                      {currentLevelInfo.title}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1">Total XP</span>
                    <span className="text-xl font-mono font-bold text-white">{xp.toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                    <span className="text-brand-primary">Progress to Lvl {currentLevelInfo.level + 1}</span>
                    <span className="text-gray-500">{Math.round(currentLevelInfo.progress)}%</span>
                  </div>
                  <div className="h-3 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/10">
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
            <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-6">Unlocked & Upcoming Milestone</h3>
              
              <div className="space-y-3">
                {LEVELS.map((lvl) => {
                  const isReached = xp >= lvl.minXp;
                  const isCurrent = currentLevelInfo.level === lvl.level;
                  
                  return (
                    <div 
                      key={lvl.level}
                      className={cn(
                        "relative p-5 rounded-2xl border transition-all duration-300",
                        isCurrent 
                          ? "bg-brand-primary/10 border-brand-primary shadow-[0_0_20px_rgba(16,185,129,0.1)]" 
                          : isReached 
                            ? "bg-white/[0.02] border-white/5" 
                            : "bg-brand-dark/30 border-white/5 opacity-50"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center font-display font-black text-xl border",
                          isReached 
                            ? "bg-brand-primary/20 border-brand-primary/20 text-brand-primary" 
                            : "bg-white/5 border-white/5 text-gray-600"
                        )}>
                          {lvl.level === 10 ? 'MAX' : lvl.level}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className={cn(
                              "font-bold text-sm",
                              isReached ? "text-white" : "text-gray-500"
                            )}>
                              {lvl.title}
                            </h4>
                            {isReached && <Award className="w-3.5 h-3.5 text-brand-primary" />}
                            {!isReached && <Lock className="w-3.5 h-3.5 text-gray-700" />}
                          </div>
                          <p className="text-[10px] text-gray-500 line-clamp-1">{lvl.description}</p>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-mono text-gray-600 block">Min XP</span>
                          <span className={cn(
                            "text-xs font-mono font-bold",
                            isReached ? "text-white" : "text-gray-500 hover:text-gray-400"
                          )}>
                            {lvl.minXp.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {isReached && (
                        <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap gap-2">
                          {lvl.perks.map((perk, i) => (
                            <Badge 
                              key={i} 
                              className="text-[9px] bg-white/5 border-white/5 text-gray-400"
                            >
                              {perk}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {!isReached && lvl.level === currentLevelInfo.level + 1 && (
                        <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 bg-brand-primary/20 rounded-lg">
                          <Sparkles className="w-3 h-3 text-brand-primary animate-pulse" />
                          <span className="text-[9px] font-black text-brand-primary uppercase">Next Reward</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-brand-dark/50 border-t border-white/5 flex justify-center shrink-0">
              <p className="text-[10px] text-gray-600 text-center max-w-sm tracking-wide">
                XP is finalized at the end of each day. Streaks are calculated based on consecutive workout logs. Keep pushing for more unlocks.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
