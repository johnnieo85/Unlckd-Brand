import React, { useState } from 'react';
import { Check, ExternalLink, Plus, Minus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { DailyLog } from '../types';

interface ExerciseCardProps {
  exerciseId: string;
  exRaw: any;
  isManual: boolean;
  section: 'warmUp' | 'mainWork';
  index: number;
  log: DailyLog | null;
  measurementUnits: { weight: 'lbs' | 'kg'; length: 'in' | 'cm' };
  onToggle: (id: string) => void;
  onSetRowUpdate: (id: string, sIdx: number, field: 'reps' | 'weight', val: string, defaultReps: string, defaultSets?: string) => void;
  onAddSetRow: (id: string, defaultReps: string, defaultSets?: string) => void;
  onRemoveSetRow?: (id: string, sIdx: number, defaultReps: string, defaultSets?: string) => void;
  onUpdateManualName?: (section: 'warmUp' | 'mainWork', index: number, name: string) => void;
  onRemoveManual?: (section: 'warmUp' | 'mainWork', index: number) => void;
  parseExercise: (raw: any) => { name: string; sets: string; reps: string; url: string | null };
  getSearchUrl: (title: string, cat: 'Workouts' | 'Nutrition') => string;
}

export function ExerciseCard({
  exerciseId,
  exRaw,
  isManual,
  section,
  index,
  log,
  measurementUnits,
  onToggle,
  onSetRowUpdate,
  onAddSetRow,
  onRemoveSetRow,
  onUpdateManualName,
  onRemoveManual,
  parseExercise,
  getSearchUrl
}: ExerciseCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { name, sets, reps, url } = parseExercise(exRaw);
  const exerciseData = log?.workoutData?.[exerciseId];
  const isCompleted = exerciseData?.completed || false;
  const setsCount = parseInt(exerciseData?.sets || sets || '3') || 3;

  const setRows: Array<{ reps: string; weight: string }> = Array.isArray(exerciseData?.setRows)
    ? exerciseData.setRows
    : Array.from({ length: Math.max(1, setsCount) }, () => ({
        reps: exerciseData?.reps || reps || '',
        weight: exerciseData?.weight || ''
      }));

  return (
    <div 
      className={`p-4 sm:p-5 rounded-2xl border transition-all ${
        isCollapsed ? 'space-y-0' : 'space-y-3'
      } ${
        isCompleted 
          ? "bg-brand-primary/5 border-brand-primary/20 opacity-80" 
          : "bg-white/[0.02] border-white/10 hover:border-white/20"
      }`}
    >
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <button 
            type="button"
            onClick={() => onToggle(exerciseId)}
            className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all shrink-0 mt-0.5 cursor-pointer ${
              isCompleted 
                ? "bg-emerald-500 border-emerald-500 text-brand-dark shadow-md shadow-emerald-500/20" 
                : "border-white/20 hover:border-emerald-400/50 bg-black/30"
            }`}
          >
            {isCompleted && <Check className="w-4 h-4 stroke-[3]" />}
          </button>

          <div 
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isManual ? (
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <input 
                  type="text"
                  className="bg-white/5 border border-white/10 rounded px-2.5 py-1 text-sm font-bold text-white outline-none focus:border-brand-primary w-full"
                  value={name}
                  onChange={(e) => onUpdateManualName?.(section, index, e.target.value)}
                />
                <button 
                  type="button"
                  onClick={() => onRemoveManual?.(section, index)}
                  className="text-red-400 hover:text-red-300 p-1 shrink-0"
                  title="Remove exercise"
                >
                  <Minus className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <a 
                  href={url || getSearchUrl(name, 'Workouts')}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="group/title inline-flex items-center gap-1.5 hover:underline decoration-brand-primary decoration-2"
                  title={`Search "${name}" demonstration on YouTube`}
                >
                  <h4 className={`text-base font-bold text-white group-hover/title:text-brand-primary transition-all ${
                    isCompleted ? "line-through text-gray-400" : ""
                  }`}>
                    {name}
                  </h4>
                </a>
              </div>
            )}

            <p className="text-xs text-gray-400 font-mono mt-0.5">
              {sets ? `${sets} ${sets === '1' ? 'set' : 'sets'}` : '3 sets'} × {reps || '10-12 reps'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {!isManual && (
            <a 
              href={url || getSearchUrl(name, 'Workouts')} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-brand-primary p-1.5 rounded-lg hover:bg-white/5 transition-colors shrink-0"
              title="Search or view exercise demonstration"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            title={isCollapsed ? "Expand workout details" : "Collapse workout details"}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Set rows */}
      {!isCollapsed && (
        <div className="pl-0 sm:pl-9 space-y-2 pt-1">
          {/* Set Row Column Header */}
          <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500">
            <span className="w-5 shrink-0 text-center">#</span>
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <span className="flex-[1.4] min-w-0 px-1">Reps / Duration</span>
              <span className="flex-1 min-w-0 px-1 text-center">Weight ({measurementUnits.weight})</span>
            </div>
            <span className="w-6 shrink-0"></span>
          </div>

          {setRows.map((setRow, sIdx) => (
            <div key={sIdx} className="flex items-center gap-2 text-xs">
              <span className="w-5 text-gray-400 font-mono text-xs font-bold shrink-0 text-center">
                {sIdx + 1}.
              </span>
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <input 
                  type="text" 
                  value={setRow.reps}
                  placeholder={reps || '10'}
                  onChange={(e) => onSetRowUpdate(exerciseId, sIdx, 'reps', e.target.value, reps, sets)}
                  className="flex-[1.4] min-w-0 bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 font-mono text-xs text-white focus:border-brand-primary outline-none transition-colors"
                />
                <input 
                  type="text" 
                  value={setRow.weight}
                  placeholder={measurementUnits.weight}
                  onChange={(e) => onSetRowUpdate(exerciseId, sIdx, 'weight', e.target.value, reps, sets)}
                  className="flex-1 min-w-0 bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 font-mono text-xs text-white focus:border-brand-primary outline-none transition-colors text-center"
                />
              </div>
              <button
                type="button"
                onClick={() => onRemoveSetRow?.(exerciseId, sIdx, reps, sets)}
                className="text-gray-500 hover:text-red-400 p-1 rounded-lg hover:bg-white/5 transition-colors shrink-0"
                title="Delete set"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          <div className="pt-1.5">
            <button
              type="button"
              onClick={() => onAddSetRow(exerciseId, reps, sets)}
              className="text-[11px] font-mono font-bold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-dashed border-white/15 hover:border-white/30 rounded-lg px-3 py-1 transition-all flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Set
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

