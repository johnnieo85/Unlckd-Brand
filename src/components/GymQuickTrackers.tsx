import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, closestCenter, SensorDescriptor, SensorOptions } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Droplets, 
  Footprints, 
  Moon, 
  Sparkles, 
  Minus, 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  Save 
} from 'lucide-react';
import { Card, Button } from './ui';
import { UnitToggle } from './UnitToggle';
import { cn } from '../lib/utils';
import { DailyLog } from '../types';

export const SortableTracker = ({ id, children }: { id: string; children: React.ReactNode }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group/tracker">
      <div 
        {...attributes} 
        {...listeners} 
        className="absolute top-3 right-3 p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white cursor-grab active:cursor-grabbing opacity-0 group-hover/tracker:opacity-100 transition-opacity z-20"
        title="Drag to reorder"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="6" r="2" />
          <circle cx="15" cy="6" r="2" />
          <circle cx="9" cy="12" r="2" />
          <circle cx="15" cy="12" r="2" />
          <circle cx="9" cy="18" r="2" />
          <circle cx="15" cy="18" r="2" />
        </svg>
      </div>
      {children}
    </div>
  );
};

export interface GymQuickTrackersProps {
  sensors: SensorDescriptor<SensorOptions>[];
  trackerOrder: string[];
  handleDragEnd: (event: any) => void;
  log: DailyLog;
  setLog: React.Dispatch<React.SetStateAction<DailyLog>>;
  isWaterCollapsed: boolean;
  setIsWaterCollapsed: (val: boolean) => void;
  updateWater: (delta: number) => void;
  toggleWaterUnit: () => void;
  handleSaveHydration: () => void;
  isSavingHydration: boolean;
  isStepsCollapsed: boolean;
  setIsStepsCollapsed: (val: boolean) => void;
  updateSteps: (delta: number) => void;
  handleSaveMovement: () => void;
  isSavingSteps: boolean;
  isSleepCollapsed: boolean;
  setIsSleepCollapsed: (val: boolean) => void;
  updateSleepHours: (delta: number) => void;
  handleSaveSleep: () => void;
  isSavingSleep: boolean;
  isRecoveryCollapsed: boolean;
  setIsRecoveryCollapsed: (val: boolean) => void;
  getRecoveryForSelectedDate: () => any;
  handleToggleQuickRecovery: (modality: string, title: string) => void;
  setActiveView: (view: 'hub' | 'report' | 'recovery') => void;
}

export const GymQuickTrackers: React.FC<GymQuickTrackersProps> = ({
  sensors,
  trackerOrder,
  handleDragEnd,
  log,
  setLog,
  isWaterCollapsed,
  setIsWaterCollapsed,
  updateWater,
  toggleWaterUnit,
  handleSaveHydration,
  isSavingHydration,
  isStepsCollapsed,
  setIsStepsCollapsed,
  updateSteps,
  handleSaveMovement,
  isSavingSteps,
  isSleepCollapsed,
  setIsSleepCollapsed,
  updateSleepHours,
  handleSaveSleep,
  isSavingSleep,
  isRecoveryCollapsed,
  setIsRecoveryCollapsed,
  getRecoveryForSelectedDate,
  handleToggleQuickRecovery,
  setActiveView,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-mono font-bold tracking-widest text-[#A1A1A1] uppercase">Daily Trackers & Protocols</span>
        <span className="text-[10px] font-mono text-[#6C6C6C]">DRAG TO REORDER</span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={trackerOrder}
            strategy={verticalListSortingStrategy}
          >
            {trackerOrder.map((id) => (
              <SortableTracker key={id} id={id}>
                {id === 'hydration' ? (
                  <Card className="p-4 sm:p-5 bg-brand-surface border-white/5 h-full overflow-hidden">
                    <div className="flex items-center justify-between gap-2.5 min-w-0 w-full pr-8">
                      <div 
                        className="flex items-center gap-2.5 cursor-pointer group flex-1 min-w-0"
                        onClick={() => setIsWaterCollapsed(!isWaterCollapsed)}
                      >
                        <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors shrink-0">
                          <Droplets className="w-5 h-5 text-blue-500" />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <h3 className="font-bold text-gray-200 text-sm sm:text-base leading-tight truncate">Hydration</h3>
                          <span className={cn("text-xs font-mono font-bold leading-tight truncate mt-0.5", isWaterCollapsed ? "text-blue-400" : "text-gray-500")}>
                            {isWaterCollapsed ? `${log.water} / ${log.waterGoal} ${log.waterUnit}` : "Track Intake"}
                          </span>
                        </div>
                      </div>
                      <div 
                        className="p-1.5 text-gray-400 hover:text-white cursor-pointer rounded-lg hover:bg-white/5 transition-colors shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsWaterCollapsed(!isWaterCollapsed);
                        }}
                      >
                        {isWaterCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                      </div>
                    </div>
                    
                    <AnimatePresence>
                      {!isWaterCollapsed && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-4 pt-4">
                            {/* Dedicated Counter Row */}
                            <div className="flex items-center justify-between bg-black/30 border border-white/10 rounded-xl p-2.5 gap-2 w-full">
                              <div className="flex items-center gap-1.5 shrink-0">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="w-7 h-7 sm:w-8 sm:h-8 p-0 border-white/10 hover:border-blue-500/40 text-blue-400 shrink-0 cursor-pointer"
                                  onClick={() => updateWater(log.waterUnit === 'oz' ? -8 : -250)}
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </Button>
                                <input 
                                  type="number"
                                  value={log.water ? log.water : ''}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    const val = raw === '' ? 0 : (parseInt(raw, 10) || 0);
                                    setLog({ ...log, water: val });
                                  }}
                                  className="w-12 sm:w-14 bg-white/5 border border-white/10 rounded-lg px-1 py-1 text-center font-mono text-xs sm:text-sm font-bold text-gray-100 focus:border-blue-500 outline-none transition-colors"
                                />
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="w-7 h-7 sm:w-8 sm:h-8 p-0 border-white/10 hover:border-blue-500/40 text-blue-400 shrink-0 cursor-pointer"
                                  onClick={() => updateWater(log.waterUnit === 'oz' ? 8 : 250)}
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                              <div className="flex-1 min-w-0 text-right">
                                <span className="text-xs font-mono font-bold text-gray-400 truncate block">
                                  / {log.waterGoal} {log.waterUnit}
                                </span>
                              </div>
                            </div>

                            {/* Quick Presets */}
                            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                              {(() => {
                                const increments = log.waterUnit === 'oz' ? [18, 20, 32] : [500, 750, 1000];
                                return increments.map((amount) => (
                                  <Button 
                                    key={amount}
                                    variant="outline" 
                                    className="w-full border-white/10 bg-white/[0.02] hover:border-blue-500/40 hover:bg-blue-500/10 transition-all text-[11px] sm:text-xs font-bold text-blue-400 py-1.5 px-1 text-center truncate"
                                    onClick={() => updateWater(amount)}
                                  >
                                    +{amount} {log.waterUnit}
                                  </Button>
                                ));
                              })()}
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-[10px] font-mono text-gray-500">
                                <span>Progress</span>
                                <span>{Math.round(Math.min((log.water / log.waterGoal) * 100, 100))}%</span>
                              </div>
                              <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                <motion.div 
                                  className="h-full bg-blue-500"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.min((log.water / log.waterGoal) * 100, 100)}%` }}
                                />
                              </div>
                            </div>

                            {/* Unit System Selector */}
                            <div className="flex items-center justify-between pt-1 border-t border-white/5">
                              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-gray-400">Unit System</span>
                              <UnitToggle<'oz' | 'ml'>
                                unitA="oz"
                                unitB="ml"
                                labelA="oz"
                                labelB="ml"
                                value={log.waterUnit || 'oz'}
                                onChange={(u) => {
                                  if (log.waterUnit !== u) {
                                    toggleWaterUnit();
                                  }
                                }}
                                size="sm"
                              />
                            </div>

                            {/* Save Button for Hydration */}
                            <div className="pt-1">
                              <Button 
                                size="sm"
                                onClick={handleSaveHydration}
                                disabled={isSavingHydration}
                                className="w-full bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-400 font-bold text-xs py-2 rounded-xl gap-2 cursor-pointer transition-all"
                              >
                                <Save className="w-3.5 h-3.5" />
                                {isSavingHydration ? "Hydration Saved!" : "Save Hydration"}
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                ) : id === 'movement' ? (
                  <Card className="p-4 sm:p-5 bg-brand-surface border-white/5 h-full overflow-hidden">
                    <div className="flex items-center justify-between gap-2.5 min-w-0 w-full pr-8">
                      <div 
                        className="flex items-center gap-2.5 cursor-pointer group flex-1 min-w-0"
                        onClick={() => setIsStepsCollapsed(!isStepsCollapsed)}
                      >
                        <div className="p-2 bg-emerald-500/10 rounded-lg group-hover:bg-emerald-500/20 transition-colors shrink-0">
                          <Footprints className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <h3 className="font-bold text-gray-200 text-sm sm:text-base leading-tight truncate">Movement</h3>
                          <span className={cn("text-xs font-mono font-bold leading-tight truncate mt-0.5", isStepsCollapsed ? "text-emerald-400" : "text-gray-500")}>
                            {isStepsCollapsed ? `${log.steps.toLocaleString()} / ${log.stepGoal.toLocaleString()} steps` : "Daily Progress"}
                          </span>
                        </div>
                      </div>
                      <div 
                        className="p-1.5 text-gray-400 hover:text-white cursor-pointer rounded-lg hover:bg-white/5 transition-colors shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsStepsCollapsed(!isStepsCollapsed);
                        }}
                      >
                        {isStepsCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                      </div>
                    </div>
                    
                    <AnimatePresence>
                      {!isStepsCollapsed && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-4 pt-4">
                            {/* Dedicated Counter Row */}
                            <div className="flex items-center justify-between bg-black/30 border border-white/10 rounded-xl p-2.5 gap-2 w-full">
                              <div className="flex items-center gap-1.5 shrink-0">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="w-7 h-7 sm:w-8 sm:h-8 p-0 border-white/10 hover:border-emerald-500/40 text-emerald-400 shrink-0 cursor-pointer"
                                  onClick={() => updateSteps(-500)}
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </Button>
                                <input 
                                  type="number"
                                  value={log.steps ? log.steps : ''}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    const val = raw === '' ? 0 : (parseInt(raw, 10) || 0);
                                    setLog({ ...log, steps: val });
                                  }}
                                  className="w-14 sm:w-16 bg-white/5 border border-white/10 rounded-lg px-1 py-1 text-center font-mono text-xs sm:text-sm font-bold text-gray-100 focus:border-emerald-500 outline-none transition-colors"
                                />
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="w-7 h-7 sm:w-8 sm:h-8 p-0 border-white/10 hover:border-emerald-500/40 text-emerald-400 shrink-0 cursor-pointer"
                                  onClick={() => updateSteps(500)}
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                              <div className="flex-1 min-w-0 text-right">
                                <span className="text-xs font-mono font-bold text-gray-400 truncate block">
                                  / {log.stepGoal.toLocaleString()}
                                </span>
                              </div>
                            </div>

                            {/* Quick Presets */}
                            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                              {[500, 1000, 2000].map((amount) => (
                                <Button 
                                  key={amount}
                                  variant="outline" 
                                  className="w-full border-white/10 bg-white/[0.02] hover:border-emerald-500/40 hover:bg-emerald-500/10 text-[11px] sm:text-xs font-bold text-emerald-400 py-1.5 px-1 text-center truncate"
                                  onClick={() => updateSteps(amount)}
                                >
                                  +{amount >= 1000 ? `${amount / 1000}k` : amount} Steps
                                </Button>
                              ))}
                            </div>

                            {/* Progress Bar */}
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-[10px] font-mono text-gray-500">
                                <span>Progress</span>
                                <span>{Math.round(Math.min((log.steps / log.stepGoal) * 100, 100))}%</span>
                              </div>
                              <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                <motion.div 
                                  className="h-full bg-emerald-500"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.min((log.steps / log.stepGoal) * 100, 100)}%` }}
                                />
                              </div>
                            </div>

                            {/* Save Button for Movement */}
                            <div className="pt-1">
                              <Button 
                                size="sm"
                                onClick={handleSaveMovement}
                                disabled={isSavingSteps}
                                className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 font-bold text-xs py-2 rounded-xl gap-2 cursor-pointer transition-all"
                              >
                                <Save className="w-3.5 h-3.5" />
                                {isSavingSteps ? "Movement Saved!" : "Save Movement"}
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                ) : id === 'sleep' ? (
                  <Card className="p-4 sm:p-5 bg-brand-surface border-white/5 h-full overflow-hidden">
                    <div className="flex items-center justify-between gap-2.5 min-w-0 w-full pr-8">
                      <div 
                        className="flex items-center gap-2.5 cursor-pointer group flex-1 min-w-0"
                        onClick={() => setIsSleepCollapsed(!isSleepCollapsed)}
                      >
                        <div className="p-2 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition-colors shrink-0">
                          <Moon className="w-5 h-5 text-purple-400" />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <h3 className="font-bold text-gray-200 text-sm sm:text-base leading-tight truncate" title="Sleep & Recovery">Sleep & Recovery</h3>
                          <span className={cn("text-xs font-mono font-bold leading-tight truncate mt-0.5", isSleepCollapsed ? "text-purple-400" : "text-gray-500")}>
                            {isSleepCollapsed 
                              ? `${log.sleepHours || 0} / ${log.sleepGoal || 8} hrs` 
                              : "Track Sleep Quality"}
                          </span>
                        </div>
                      </div>
                      <div 
                        className="p-1.5 text-gray-400 hover:text-white cursor-pointer rounded-lg hover:bg-white/5 transition-colors shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsSleepCollapsed(!isSleepCollapsed);
                        }}
                      >
                        {isSleepCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                      </div>
                    </div>
                    
                    <AnimatePresence>
                      {!isSleepCollapsed && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-4 pt-4">
                            {/* Dedicated Counter Row */}
                            <div className="flex items-center justify-between bg-black/30 border border-white/10 rounded-xl p-2.5 gap-2 w-full">
                              <div className="flex items-center gap-1.5 shrink-0">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="w-7 h-7 sm:w-8 sm:h-8 p-0 border-white/10 hover:border-purple-500/40 text-purple-400 shrink-0 cursor-pointer"
                                  onClick={() => updateSleepHours(-0.5)}
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </Button>
                                <input 
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="24"
                                  value={log.sleepHours ? log.sleepHours : ''}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    const val = raw === '' ? 0 : (parseFloat(raw) || 0);
                                    setLog({ ...log, sleepHours: val });
                                  }}
                                  className="w-14 sm:w-16 bg-white/5 border border-white/10 rounded-lg px-1 py-1 text-center font-mono text-xs sm:text-sm font-bold text-gray-100 focus:border-purple-500 outline-none transition-colors"
                                />
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="w-7 h-7 sm:w-8 sm:h-8 p-0 border-white/10 hover:border-purple-500/40 text-purple-400 shrink-0 cursor-pointer"
                                  onClick={() => updateSleepHours(0.5)}
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                              <div className="flex-1 min-w-0 text-right">
                                <span className="text-xs font-mono font-bold text-gray-400 truncate block">
                                  / {log.sleepGoal || 8} hrs target
                                </span>
                              </div>
                            </div>

                            {/* Quick Presets */}
                            <div className="grid grid-cols-4 gap-1.5">
                              {[6.0, 7.0, 8.0, 9.0].map((hours) => (
                                <Button 
                                  key={hours}
                                  variant="outline" 
                                  className={cn(
                                    "border-white/10 text-xs font-bold py-1.5 px-1 text-center transition-all truncate",
                                    log.sleepHours === hours 
                                      ? "bg-purple-500/20 border-purple-500/50 text-purple-300"
                                      : "bg-white/[0.02] hover:border-purple-500/40 hover:bg-purple-500/10 text-purple-400"
                                  )}
                                  onClick={() => setLog({ ...log, sleepHours: hours })}
                                >
                                  {hours}h
                                </Button>
                              ))}
                            </div>

                            {/* Sleep Quality Selection */}
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400">Sleep Quality</label>
                              <div className="grid grid-cols-4 gap-1 sm:gap-1.5">
                                {[
                                  { label: 'Poor', emoji: '😴' },
                                  { label: 'Fair', emoji: '😐' },
                                  { label: 'Good', emoji: '🙂' },
                                  { label: 'Excellent', emoji: '🌟' }
                                ].map((q) => (
                                  <button
                                    key={q.label}
                                    type="button"
                                    onClick={() => setLog({ ...log, sleepQuality: q.label as any })}
                                    className={cn(
                                      "flex flex-col items-center justify-center p-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer min-w-0",
                                      log.sleepQuality === q.label
                                        ? "bg-purple-500/20 border-purple-500/60 text-purple-200 shadow-sm"
                                        : "bg-black/20 border-white/5 text-gray-400 hover:border-purple-500/30 hover:text-gray-200"
                                    )}
                                  >
                                    <span className="text-sm">{q.emoji}</span>
                                    <span className="text-[10px] mt-0.5 truncate w-full text-center leading-tight">{q.label}</span>
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Sleep Notes */}
                            <div className="space-y-1">
                              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400">Recovery & Sleep Notes</label>
                              <input 
                                type="text"
                                placeholder="e.g. Slept 11pm - 7am, felt rested"
                                value={log.sleepNotes || ''}
                                onChange={(e) => setLog({ ...log, sleepNotes: e.target.value })}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-gray-200 placeholder:text-gray-600 outline-none focus:border-purple-500/50 transition-colors"
                              />
                            </div>

                            {/* Progress Bar */}
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-[10px] font-mono text-gray-500">
                                <span>Target Progress</span>
                                <span>{Math.round(Math.min(((log.sleepHours || 0) / (log.sleepGoal || 8)) * 100, 100))}%</span>
                              </div>
                              <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                <motion.div 
                                  className="h-full bg-purple-500"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.min(((log.sleepHours || 0) / (log.sleepGoal || 8)) * 100, 100)}%` }}
                                />
                              </div>
                            </div>

                            {/* Save Button for Sleep */}
                            <div className="pt-2">
                              <Button 
                                size="sm"
                                onClick={handleSaveSleep}
                                disabled={isSavingSleep}
                                className="w-full bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 font-bold text-xs py-2 rounded-xl gap-2 cursor-pointer transition-all"
                              >
                                <Save className="w-3.5 h-3.5" />
                                {isSavingSleep ? "Sleep Log Saved!" : "Save Sleep Log"}
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                ) : id === 'recovery' ? (
                  <Card className="p-4 sm:p-5 bg-brand-surface border-white/5 h-full overflow-hidden">
                    <div className="flex items-center justify-between gap-2.5 min-w-0 w-full pr-8">
                      <div 
                        className="flex items-center gap-2.5 cursor-pointer group flex-1 min-w-0"
                        onClick={() => setIsRecoveryCollapsed(!isRecoveryCollapsed)}
                      >
                        <div className="p-2 bg-amber-500/10 rounded-lg group-hover:bg-amber-500/20 transition-colors shrink-0">
                          <Sparkles className="w-5 h-5 text-amber-400" />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <h3 className="font-bold text-gray-200 text-sm sm:text-base leading-tight truncate">Recovery Protocol</h3>
                          <span className={cn("text-xs font-mono font-bold leading-tight truncate mt-0.5", isRecoveryCollapsed ? "text-amber-400" : "text-gray-500")}>
                            {isRecoveryCollapsed 
                              ? `${(log.recoverySessions || []).filter(s => s.completed).length} Modalities Completed` 
                              : (() => {
                                  const recItem = getRecoveryForSelectedDate();
                                  return recItem ? `${recItem.day}: ${recItem.focus}` : "Sauna, Steam, Compression & Massage";
                                })()}
                          </span>
                        </div>
                      </div>
                      <div 
                        className="p-1.5 text-gray-400 hover:text-white cursor-pointer rounded-lg hover:bg-white/5 transition-colors shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsRecoveryCollapsed(!isRecoveryCollapsed);
                        }}
                      >
                        {isRecoveryCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                      </div>
                    </div>

                    <AnimatePresence>
                      {!isRecoveryCollapsed && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-3 pt-4">
                            {(() => {
                              const recItem = getRecoveryForSelectedDate();
                              if (recItem) {
                                return (
                                  <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl space-y-1">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-[11px] font-mono font-bold text-purple-300 uppercase truncate">{recItem.day} Prescribed Protocol</span>
                                      {recItem.duration && (
                                        <span className="text-[10px] font-mono bg-purple-500/20 text-purple-200 px-2 py-0.5 rounded-md shrink-0">
                                          ⏱️ {recItem.duration}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs font-bold text-white leading-snug">{recItem.focus}</p>
                                    {recItem.notes && (
                                      <p className="text-[11px] text-gray-300 italic font-light pt-1 leading-normal">💡 {recItem.notes}</p>
                                    )}
                                  </div>
                                );
                              }
                              return (
                                <div className="text-xs text-gray-300 font-light leading-relaxed">
                                  Prescribed recovery modalities for today's workout split (Sauna, Steam Room, NormaTec & Massage).
                                </div>
                              );
                            })()}

                            <div className="space-y-2">
                              {(() => {
                                const recItem = getRecoveryForSelectedDate();
                                let modalList: Array<{ title: string; modality: string }> = [];

                                if (recItem && recItem.modalities && recItem.modalities.length > 0) {
                                  modalList = recItem.modalities.map(m => {
                                    const str = typeof m === 'string' ? m : String(m);
                                    let modalityCat = 'sauna';
                                    const lower = str.toLowerCase();
                                    if (lower.includes('steam')) modalityCat = 'steam_room';
                                    else if (lower.includes('compression') || lower.includes('normatec')) modalityCat = 'normatec';
                                    else if (lower.includes('massage') || lower.includes('foam') || lower.includes('theragun')) modalityCat = 'percussive';
                                    else if (lower.includes('plunge') || lower.includes('cold') || lower.includes('contrast')) modalityCat = 'contrast';
                                    else if (lower.includes('stretch') || lower.includes('hang') || lower.includes('mobility')) modalityCat = 'stretching';

                                    return {
                                      title: str,
                                      modality: modalityCat
                                    };
                                  });
                                } else {
                                  modalList = [
                                    { title: 'Infrared Sauna (20m @ 170°F)', modality: 'sauna' },
                                    { title: 'NormaTec Air Compression (25m)', modality: 'normatec' },
                                    { title: 'Moist Heat Steam Room (15m)', modality: 'steam_room' }
                                  ];
                                }

                                return modalList.map((m, idx) => {
                                  const isDone = (log.recoverySessions || []).some(s => s.completed && (s.modality === m.modality || s.title === m.title));
                                  return (
                                    <div key={idx} className="flex items-center justify-between p-2.5 bg-black/30 border border-white/5 rounded-xl text-xs gap-2 min-w-0">
                                      <span className="font-semibold text-gray-200 truncate flex-1 leading-tight">{m.title}</span>
                                      <Button
                                        size="sm"
                                        variant={isDone ? 'outline' : 'primary'}
                                        className={cn(
                                          "h-7 text-[11px] font-bold px-2.5 rounded-lg cursor-pointer shrink-0",
                                          isDone ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10" : "bg-amber-500 text-black hover:bg-amber-400"
                                        )}
                                        onClick={() => handleToggleQuickRecovery(m.modality, m.title)}
                                      >
                                        {isDone ? '✓ Logged' : '+ Log (+25 XP)'}
                                      </Button>
                                    </div>
                                  );
                                });
                              })()}
                            </div>

                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full border-purple-500/30 text-purple-300 hover:bg-purple-500/10 font-bold text-xs py-2 rounded-xl gap-2 cursor-pointer mt-2"
                              onClick={() => setActiveView('recovery')}
                            >
                              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                              Open Full 7-Day Recovery Master Hub
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                ) : (
                  <Card className="p-8 bg-brand-surface border-white/5 h-full flex items-center justify-center">
                     <span className="text-[10px] font-black uppercase text-gray-600">Unknown Tracker</span>
                  </Card>
                )}
              </SortableTracker>
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
};
