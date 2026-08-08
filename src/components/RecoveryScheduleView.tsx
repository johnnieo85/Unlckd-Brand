import React, { useState } from 'react';
import { 
  Flame, 
  Wind, 
  Sparkles, 
  CheckCircle2, 
  Plus, 
  Clock, 
  Zap, 
  Info, 
  Calendar,
  Layers,
  Heart,
  Droplets,
  Activity,
  Trash2
} from 'lucide-react';
import { Card, Badge } from './ui/Card';
import { Button } from './ui/Button';
import { cn, parseLocalDate } from '../lib/utils';
import { DailyLog, RecoverySession, SavedReport } from '../types';

interface RecoveryScheduleViewProps {
  log: DailyLog | null;
  selectedDate: string;
  report?: SavedReport | null;
  onUpdateRecoverySessions: (sessions: RecoverySession[]) => Promise<void>;
  onAddXP?: (amount: number) => void;
}

export const MODALITY_INFO = [
  {
    id: 'sauna',
    name: 'Infrared & Dry Sauna',
    icon: Flame,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    recommendedFor: ['Heavy Compound Lifting', 'Upper Body Push', 'Full Body Conditioning'],
    tempSetting: '160 - 180°F (70 - 82°C)',
    duration: '15 - 25 mins',
    rationale: 'Triggers heat shock proteins (HSPs), induces growth hormone spikes (up to 200-300%), enhances vascular dilation, and calms the central nervous system post-workout.',
    protocolTips: 'Hydrate with at least 16-24 oz of water with electrolytes before and after. Rest 5 mins sitting before showering.'
  },
  {
    id: 'steam_room',
    name: 'Moist Heat Steam Room',
    icon: Wind,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    recommendedFor: ['Leg Day / Heavy Squats', 'Joint Stiffness', 'Airway & Sinus Relief'],
    tempSetting: '110 - 115°F (100% Humidity)',
    duration: '12 - 18 mins',
    rationale: 'Moist heat deeply penetrates joint capsules, Achilles tendons, and patellar ligaments, promoting synovial fluid lubrication while opening respiratory passages.',
    protocolTips: 'Excellent directly after stretching. Cool down gradually with lukewarm water to stabilize body temperature.'
  },
  {
    id: 'normatec',
    name: 'NormaTec Air Compression',
    icon: Layers,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    recommendedFor: ['Leg Day', 'High Step Counts / Running', 'Calf & Hamstring Soreness'],
    tempSetting: 'Pressure Level 5 - 7',
    duration: '20 - 30 mins',
    rationale: 'Sequential pulse compression mimics natural muscle pumps, propelling lymphatic fluid and metabolic waste away from lower extremities to reduce DOMS.',
    protocolTips: 'Wear light compression pants or tights. Elevate legs slightly above heart level during session for maximum fluid drainage.'
  },
  {
    id: 'massage',
    name: 'Deep Tissue & Sports Massage',
    icon: Heart,
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/30',
    recommendedFor: ['Rest Days', 'Chronic Muscle Knots', 'Post-Heavy Mesocycle'],
    tempSetting: 'Firm to Deep Trigger Point Pressure',
    duration: '45 - 60 mins',
    rationale: 'Breaks down fascial adhesions, releases stubborn muscle knots, increases localized capillary density, and restores resting muscle length.',
    protocolTips: 'Best scheduled on rest days or 24-48h after heavy leg/back sessions. Drink 30oz water post-massage.'
  },
  {
    id: 'contrast',
    name: 'Contrast Therapy (Hot & Cold)',
    icon: Droplets,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    recommendedFor: ['High Volume Training', 'Systemic Fatigue', 'Back & Spine Soreness'],
    tempSetting: 'Sauna (170°F) + Cold Plunge (45-50°F)',
    duration: '3 - 4 Cycles (12m Hot / 2m Cold)',
    rationale: 'Rapid alteration between vasoconstriction and vasodilation creates a vascular pump effect, driving oxygenated blood into deep muscle tissues while flushing inflammatory markers.',
    protocolTips: 'Always finish on COLD for anti-inflammatory neural benefit or finish on HOT if aiming for hypertrophy muscle relaxation.'
  },
  {
    id: 'percussive',
    name: 'Percussive Therapy (Theragun / Massage Gun)',
    icon: Zap,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    recommendedFor: ['Pre/Post Workout Spot Treatment', 'Glutes, Quads, Lats'],
    tempSetting: 'Medium Speed (2000 - 2400 RPM)',
    duration: '2 mins per muscle belly',
    rationale: 'High-frequency rapid percussive strokes override pain receptors (Gate Control Theory) and rapidly increase localized blood flow without causing muscle fatigue.',
    protocolTips: 'Float the head over the muscle belly. Avoid direct contact with bony prominences (kneecaps, spine, shinbones).'
  }
];

export const RecoveryScheduleView: React.FC<RecoveryScheduleViewProps> = ({
  log,
  selectedDate,
  report,
  onUpdateRecoverySessions,
  onAddXP
}) => {
  const [activeTab, setActiveTab] = useState<'today' | 'weekly' | 'guide'>('today');
  const [showAddCustom, setShowAddCustom] = useState(false);

  // Custom modality form state
  const [customTitle, setCustomTitle] = useState('');
  const [customModality, setCustomModality] = useState<RecoverySession['modality']>('sauna');
  const [customDuration, setCustomDuration] = useState('20');
  const [customTempLevel, setCustomTempLevel] = useState('');
  const [customNotes, setCustomNotes] = useState('');

  const currentSessions: RecoverySession[] = log?.recoverySessions || [];

  // Determine current workout focus from manual workout or daily report
  const workoutFocus = log?.manualWorkout?.focus || 
    (log?.workoutData && Object.keys(log.workoutData).length > 0 ? 'Active Training Session' : 'Active Recovery & Mobility');

  const getTodayReportRecovery = () => {
    if (!report?.report?.recoverySchedule || report.report.recoverySchedule.length === 0) return null;
    const baseStartDate = report.userData?.planStartDate 
      ? parseLocalDate(report.userData.planStartDate)
      : (report.timestamp?.toDate ? report.timestamp.toDate() : new Date());
    const startD = new Date(baseStartDate);
    startD.setHours(0, 0, 0, 0);
    const targetD = parseLocalDate(selectedDate);
    targetD.setHours(0, 0, 0, 0);
    const diffDaysTotal = Math.round((targetD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24));
    const idx = ((diffDaysTotal % 7) + 7) % 7;
    return report.report.recoverySchedule[idx % report.report.recoverySchedule.length];
  };

  // Generate suggested modalities based on report recovery schedule or workout focus
  const getSuggestedModalities = (): Partial<RecoverySession>[] => {
    const todayRec = getTodayReportRecovery();
    if (todayRec && todayRec.modalities && todayRec.modalities.length > 0) {
      return todayRec.modalities.map((m, idx) => {
        const str = typeof m === 'string' ? m : String(m);
        let modalityCat: RecoverySession['modality'] = 'sauna';
        const lower = str.toLowerCase();
        if (lower.includes('steam')) modalityCat = 'steam_room';
        else if (lower.includes('compression') || lower.includes('normatec')) modalityCat = 'normatec';
        else if (lower.includes('massage') || lower.includes('foam') || lower.includes('theragun')) modalityCat = 'percussive';
        else if (lower.includes('plunge') || lower.includes('cold') || lower.includes('contrast')) modalityCat = 'contrast';
        else if (lower.includes('stretch') || lower.includes('hang') || lower.includes('mobility')) modalityCat = 'stretching';

        return {
          id: `rep-sug-${idx}`,
          modality: modalityCat,
          title: str,
          durationMinutes: 20,
          temperatureOrLevel: todayRec.duration || 'Prescribed Protocol',
          targetArea: todayRec.focus || 'Target Recovery Area',
          notes: todayRec.notes || 'Prescribed in your AI assessment report recovery schedule.'
        };
      });
    }

    const focusLower = workoutFocus.toLowerCase();
    
    if (focusLower.includes('leg') || focusLower.includes('lower') || focusLower.includes('squat')) {
      return [
        {
          id: 'sug-1',
          modality: 'normatec',
          title: 'NormaTec Air Compression Boots',
          durationMinutes: 25,
          temperatureOrLevel: 'Level 6 Pressure',
          targetArea: 'Quads, Hamstrings & Calves',
          notes: 'Lower body edema drainage & DOMS suppression after heavy leg work.'
        },
        {
          id: 'sug-2',
          modality: 'steam_room',
          title: 'Moist Heat Steam Room',
          durationMinutes: 15,
          temperatureOrLevel: '112°F (100% Humidity)',
          targetArea: 'Knee & Patellar Tendons',
          notes: 'Moist heat relaxes tight connective tissue around knees and hips.'
        },
        {
          id: 'sug-3',
          modality: 'percussive',
          title: 'Percussive Foam Rolling',
          durationMinutes: 10,
          temperatureOrLevel: 'Medium Speed',
          targetArea: 'IT Bands, Glutes & Hip Flexors',
          notes: 'Myofascial release on tight lower body stabilizers.'
        }
      ];
    }

    if (focusLower.includes('push') || focusLower.includes('chest') || focusLower.includes('shoulder')) {
      return [
        {
          id: 'sug-1',
          modality: 'sauna',
          title: 'Infrared Sauna Session',
          durationMinutes: 20,
          temperatureOrLevel: '170°F (77°C)',
          targetArea: 'Full Body & CNS',
          notes: 'Drives vasodilation, relaxes upper body spinal tension, and spikes Growth Hormone.'
        },
        {
          id: 'sug-2',
          modality: 'percussive',
          title: 'Theragun Percussive Therapy',
          durationMinutes: 8,
          temperatureOrLevel: 'Speed 2 (2100 RPM)',
          targetArea: 'Pecs, Front Delts & Triceps',
          notes: 'Breaks up acute muscle tightness in chest and shoulder tendons.'
        },
        {
          id: 'sug-3',
          modality: 'stretching',
          title: 'Thoracic Spine & Hang Decompression',
          durationMinutes: 10,
          temperatureOrLevel: 'Bodyweight Hang',
          targetArea: 'Thoracic Spine & Lats',
          notes: 'Decompresses intervertebral discs after overhead pressing.'
        }
      ];
    }

    if (focusLower.includes('pull') || focusLower.includes('back') || focusLower.includes('deadlift')) {
      return [
        {
          id: 'sug-1',
          modality: 'contrast',
          title: 'Contrast Sauna & Cold Plunge',
          durationMinutes: 20,
          temperatureOrLevel: '3 Cycles (Sauna 170°F / Plunge 48°F)',
          targetArea: 'Spine & Posterior Chain',
          notes: 'Flushes spinal inflammation and surges circulation into erector spinae.'
        },
        {
          id: 'sug-2',
          modality: 'percussive',
          title: 'Lat & Rhomboid Percussive Release',
          durationMinutes: 10,
          temperatureOrLevel: 'Medium Pressure',
          targetArea: 'Upper Traps, Lats & Scapula',
          notes: 'Relieves tightness around shoulder blades and middle back.'
        }
      ];
    }

    // Default / Rest Day / General Active Recovery
    return [
      {
        id: 'sug-1',
        modality: 'sauna',
        title: 'Post-Workout Infrared Sauna',
        durationMinutes: 20,
        temperatureOrLevel: '165 - 175°F',
        targetArea: 'Full Body Cardiovascular & CNS',
        notes: 'Promotes deep vascular circulation and nervous system relaxation.'
      },
      {
        id: 'sug-2',
        modality: 'steam_room',
        title: 'Steam Room Joint Hydration',
        durationMinutes: 15,
        temperatureOrLevel: '110°F',
        targetArea: 'Respiratory & Connective Tissue',
        notes: 'Moist heat warms ligaments and calms airways.'
      },
      {
        id: 'sug-3',
        modality: 'massage',
        title: 'Sports Foam Rolling & Trigger Point Therapy',
        durationMinutes: 15,
        temperatureOrLevel: 'Self-Directed Pressure',
        targetArea: 'Full Body Muscles & Fascia',
        notes: 'Restores baseline muscle length and reduces soreness.'
      }
    ];
  };

  const suggestedModalities = getSuggestedModalities();

  const handleToggleSession = async (sessionToToggle: Partial<RecoverySession>) => {
    const existingIndex = currentSessions.findIndex(s => s.id === sessionToToggle.id || s.title === sessionToToggle.title);
    let updated: RecoverySession[];

    if (existingIndex >= 0) {
      // Toggle completed state
      updated = [...currentSessions];
      const isNowCompleted = !updated[existingIndex].completed;
      updated[existingIndex] = {
        ...updated[existingIndex],
        completed: isNowCompleted
      };
      if (isNowCompleted && onAddXP) {
        onAddXP(25);
      }
    } else {
      // Add as new completed session
      const newSession: RecoverySession = {
        id: sessionToToggle.id || `rec-${Date.now()}`,
        modality: sessionToToggle.modality || 'sauna',
        title: sessionToToggle.title || 'Recovery Session',
        durationMinutes: sessionToToggle.durationMinutes || 20,
        temperatureOrLevel: sessionToToggle.temperatureOrLevel || '',
        notes: sessionToToggle.notes || '',
        completed: true,
        targetArea: sessionToToggle.targetArea || '',
        timestamp: new Date().toISOString()
      };
      updated = [...currentSessions, newSession];
      if (onAddXP) {
        onAddXP(25);
      }
    }

    await onUpdateRecoverySessions(updated);
  };

  const handleRemoveSession = async (id: string) => {
    const updated = currentSessions.filter(s => s.id !== id);
    await onUpdateRecoverySessions(updated);
  };

  const handleAddCustomSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) return;

    const newSession: RecoverySession = {
      id: `custom-rec-${Date.now()}`,
      modality: customModality,
      title: customTitle.trim(),
      durationMinutes: parseInt(customDuration) || 20,
      temperatureOrLevel: customTempLevel.trim(),
      notes: customNotes.trim(),
      completed: true,
      timestamp: new Date().toISOString()
    };

    const updated = [...currentSessions, newSession];
    await onUpdateRecoverySessions(updated);

    if (onAddXP) onAddXP(25);

    // Reset form
    setCustomTitle('');
    setCustomTempLevel('');
    setCustomNotes('');
    setShowAddCustom(false);
  };

  const completedCount = currentSessions.filter(s => s.completed).length;

  return (
    <div className="space-y-6">
      {/* Recovery Banner Header */}
      <Card className="p-6 bg-gradient-to-r from-purple-950/40 via-brand-surface to-brand-dark border-purple-500/20 relative overflow-hidden rounded-3xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px] font-mono uppercase tracking-wider">
                PROGRAM COMPLIMENTARY RECOVERY
              </Badge>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] font-mono">
                +25 XP PER SESSION
              </Badge>
            </div>
            <h2 className="text-2xl md:text-3xl font-display font-black text-white tracking-tight uppercase flex items-center gap-3">
              <Sparkles className="w-7 h-7 text-purple-400 shrink-0" />
              Targeted Recovery Protocol
            </h2>
            <p className="text-xs md:text-sm text-gray-300 max-w-2xl font-light leading-relaxed">
              Prescribed hyper-recovery modalities (Sauna, Steam Room, NormaTec Compression, Massage, & Contrast Plunges) matched specifically to your workout split for optimal hypertrophy, CNS repair, & injury prevention.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-black/40 border border-white/10 p-4 rounded-2xl shrink-0">
            <div className="text-center px-2">
              <div className="text-2xl font-mono font-black text-purple-400">{completedCount}</div>
              <div className="text-[10px] text-gray-400 uppercase font-mono tracking-wider">Sessions Logged</div>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center px-2">
              <div className="text-2xl font-mono font-black text-amber-400">+{completedCount * 25}</div>
              <div className="text-[10px] text-gray-400 uppercase font-mono tracking-wider">Recovery XP</div>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-white/10">
          <Button
            variant={activeTab === 'today' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('today')}
            className={cn(
              "text-xs font-bold gap-2 rounded-xl cursor-pointer",
              activeTab === 'today' ? "bg-purple-500 hover:bg-purple-600 text-white border-none" : "border-white/10 text-gray-400 hover:text-white"
            )}
          >
            <Clock className="w-3.5 h-3.5" />
            Today's Protocol
          </Button>
          <Button
            variant={activeTab === 'weekly' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('weekly')}
            className={cn(
              "text-xs font-bold gap-2 rounded-xl cursor-pointer",
              activeTab === 'weekly' ? "bg-purple-500 hover:bg-purple-600 text-white border-none" : "border-white/10 text-gray-400 hover:text-white"
            )}
          >
            <Calendar className="w-3.5 h-3.5" />
            7-Day Master Plan
          </Button>
          <Button
            variant={activeTab === 'guide' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('guide')}
            className={cn(
              "text-xs font-bold gap-2 rounded-xl cursor-pointer",
              activeTab === 'guide' ? "bg-purple-500 hover:bg-purple-600 text-white border-none" : "border-white/10 text-gray-400 hover:text-white"
            )}
          >
            <Info className="w-3.5 h-3.5" />
            Modality Guide
          </Button>
        </div>
      </Card>

      {/* TAB 1: TODAY'S PROTOCOL */}
      {activeTab === 'today' && (
        <div className="space-y-6">
          {/* Active Workout Context Badge */}
          <div className="bg-brand-surface/80 border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-brand-primary/10 text-brand-primary rounded-xl">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Today's Workout Context</span>
                <h3 className="text-base font-bold text-white capitalize">{workoutFocus}</h3>
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddCustom(!showAddCustom)}
              className="border-purple-500/40 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 text-xs font-bold gap-2 rounded-xl shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Custom Modality
            </Button>
          </div>

          {/* Add Custom Modality Form */}
          {showAddCustom && (
            <Card className="p-5 bg-brand-surface border-purple-500/30 rounded-2xl space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-purple-400" />
                Log Custom Recovery Session
              </h4>

              <form onSubmit={handleAddCustomSession} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Session Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Cryotherapy, Epsom Salt Bath, Red Light"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Modality Category</label>
                  <select
                    value={customModality}
                    onChange={(e) => setCustomModality(e.target.value as any)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-500 outline-none"
                  >
                    <option value="sauna">Sauna (Infrared / Dry)</option>
                    <option value="steam_room">Steam Room</option>
                    <option value="normatec">NormaTec Air Compression</option>
                    <option value="massage">Deep Tissue / Sports Massage</option>
                    <option value="contrast">Contrast Therapy (Hot & Cold)</option>
                    <option value="cold_plunge">Cold Plunge / Ice Bath</option>
                    <option value="percussive">Percussive Therapy (Theragun)</option>
                    <option value="stretching">Active Mobility & Stretching</option>
                    <option value="other">Other Modality</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Duration (Minutes)</label>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={customDuration}
                    onChange={(e) => setCustomDuration(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Temp / Pressure / Intensity (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g., 170°F or Level 6 or 48°F"
                    value={customTempLevel}
                    onChange={(e) => setCustomTempLevel(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-500 outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Notes / Target Area</label>
                  <input
                    type="text"
                    placeholder="e.g., Lower back & hamstrings tightness"
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-500 outline-none"
                  />
                </div>

                <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddCustom(false)}
                    className="text-xs text-gray-400"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-purple-500 hover:bg-purple-600 text-white font-bold text-xs gap-1.5 rounded-xl"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Log Session (+25 XP)
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Prescribed Modalities List */}
          <div className="space-y-4">
            <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-400" />
              Recommended Modalities for Today
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {suggestedModalities.map((item, idx) => {
                const info = MODALITY_INFO.find(m => m.id === item.modality) || MODALITY_INFO[0];
                const IconComponent = info.icon;

                // Check if user has already completed this modality today
                const isCompleted = currentSessions.some(
                  s => s.completed && (s.modality === item.modality || s.title === item.title)
                );

                return (
                  <Card 
                    key={idx}
                    className={cn(
                      "p-5 transition-all rounded-2xl relative overflow-hidden flex flex-col justify-between border",
                      isCompleted 
                        ? "bg-emerald-950/20 border-emerald-500/40" 
                        : "bg-brand-surface/90 border-white/10 hover:border-purple-500/40"
                    )}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className={cn("p-3 rounded-xl shrink-0", info.bgColor, info.color)}>
                          <IconComponent className="w-6 h-6" />
                        </div>
                        <Badge className={cn(
                          "text-[10px] font-mono",
                          isCompleted ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : info.bgColor + " " + info.color + " " + info.borderColor
                        )}>
                          {isCompleted ? 'COMPLETED' : `${item.durationMinutes} MINS`}
                        </Badge>
                      </div>

                      <div>
                        <h4 className="font-bold text-white text-base leading-snug">{item.title}</h4>
                        {item.temperatureOrLevel && (
                          <div className="text-xs font-mono font-semibold text-purple-300 mt-0.5">
                            {item.temperatureOrLevel}
                          </div>
                        )}
                        {item.targetArea && (
                          <div className="text-[11px] font-mono text-gray-400 mt-1">
                            Target: <span className="text-gray-200">{item.targetArea}</span>
                          </div>
                        )}
                      </div>

                      <p className="text-xs text-gray-300/80 leading-relaxed italic font-light">
                        "{item.notes || info.rationale}"
                      </p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-white/5">
                      <Button
                        variant={isCompleted ? 'outline' : 'primary'}
                        size="sm"
                        onClick={() => handleToggleSession(item)}
                        className={cn(
                          "w-full text-xs font-bold gap-2 rounded-xl cursor-pointer",
                          isCompleted 
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20" 
                            : "bg-purple-500 hover:bg-purple-600 text-white border-none shadow-md shadow-purple-500/20"
                        )}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {isCompleted ? 'Logged (+25 XP)' : 'Mark Completed (+25 XP)'}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* User's Logged Sessions History for Today */}
          {currentSessions.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-white/10">
              <h4 className="text-sm font-bold text-gray-200 uppercase tracking-wider font-mono flex items-center justify-between">
                <span>Today's Logged Recovery Sessions ({currentSessions.length})</span>
                <span className="text-purple-400 text-xs">Total XP: +{currentSessions.length * 25}</span>
              </h4>

              <div className="divide-y divide-white/5 bg-brand-surface rounded-2xl border border-white/10 overflow-hidden">
                {currentSessions.map((session) => (
                  <div key={session.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-500/20 text-purple-300 rounded-lg shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{session.title}</div>
                        <div className="text-xs font-mono text-gray-400">
                          {session.durationMinutes} mins {session.temperatureOrLevel ? `• ${session.temperatureOrLevel}` : ''} {session.notes ? `• ${session.notes}` : ''}
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveSession(session.id)}
                      className="text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg shrink-0"
                      title="Remove session"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: 7-DAY MASTER PLAN */}
      {activeTab === 'weekly' && (
        <div className="space-y-6">
          <div className="bg-brand-surface/80 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white uppercase font-mono">Full 7-Day Weekly Recovery Mapping</h3>
              <p className="text-xs text-gray-400">
                Recovery modalities programmed to strategically match your workout training split throughout the week.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {((report?.report?.recoverySchedule && report.report.recoverySchedule.length > 0)
              ? report.report.recoverySchedule.map((item, i) => ({
                  day: item.day || `Day ${i + 1}`,
                  focus: item.focus || 'Active Recovery',
                  modalities: item.modalities && item.modalities.length > 0 
                    ? item.modalities 
                    : ['Infrared Sauna (20 min @ 170°F)', 'Active Mobility & Hydration'],
                  benefit: item.notes || `Tailored recovery protocol targeting ${item.focus}`,
                  duration: item.duration || '30-45 mins'
                }))
              : [
                  {
                    day: 'Monday',
                    focus: 'Heavy Lower Body / Squat Day',
                    modalities: ['NormaTec Compression Boots (25 min @ Lvl 6)', 'Steam Room (15 min @ 112°F)', 'Percussive Foam Rolling (10 min)'],
                    benefit: 'Direct lactic flush & joint capsule warmth for lower body connective tissue.',
                    duration: '50 mins'
                  },
                  {
                    day: 'Tuesday',
                    focus: 'Upper Body Push / Chest & Delts',
                    modalities: ['Infrared Sauna (20 min @ 170°F)', 'Theragun Percussive Release (10 min)', 'Spinal Hang (5 min)'],
                    benefit: 'Drives growth hormone elevation & relieves thoracic spine tightness.',
                    duration: '35 mins'
                  },
                  {
                    day: 'Wednesday',
                    focus: 'Active Mobility & Mid-Week Rest',
                    modalities: ['Sports / Deep Tissue Massage (45 min)', 'Contrast Plunge (3 cycles)', 'Light Flow Yoga (20 min)'],
                    benefit: 'Restores fascial length & surges oxygenated blood flow for mid-week CNS reset.',
                    duration: '65 mins'
                  },
                  {
                    day: 'Thursday',
                    focus: 'Back & Deadlift / Heavy Pull',
                    modalities: ['Contrast Sauna & Cold Plunge (20 min)', 'Rhomboid Percussive Release (10 min)'],
                    benefit: 'Flushes spinal inflammation and mitigates erector spinae DOMS.',
                    duration: '30 mins'
                  },
                  {
                    day: 'Friday',
                    focus: 'Hypertrophy Arms, Shoulders & Abs',
                    modalities: ['Infrared Sauna (20 min @ 170°F)', 'Moist Steam Room (15 min)'],
                    benefit: 'Systemic vasodilation and connective tissue relaxation for weekend recovery.',
                    duration: '35 mins'
                  },
                  {
                    day: 'Saturday',
                    focus: 'Full Body Conditioning / HIIT',
                    modalities: ['Cold Plunge / Ice Bath (3-5 min @ 48°F)', 'Epsom Salt Magnesium Bath (20 min)'],
                    benefit: 'Rapid anti-inflammatory vasoconstriction to flush metabolic waste.',
                    duration: '25 mins'
                  },
                  {
                    day: 'Sunday',
                    focus: 'Complete System Rest & Preparation',
                    modalities: ['Full Body Foam Rolling (20 min)', 'Infrared Sauna (25 min @ 165°F)', 'Hydration Protocol (3L Water)'],
                    benefit: 'Prepares muscles, joints, and nervous system for the upcoming training week.',
                    duration: '45 mins'
                  }
                ]
            ).map((d, i) => (
              <Card key={i} className="p-5 bg-brand-surface/90 border-white/10 rounded-2xl space-y-3 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-3 gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                      D{i + 1}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-white text-sm truncate">{d.day}</h4>
                      <span className="text-[11px] font-mono text-purple-300 block truncate">{d.focus}</span>
                    </div>
                  </div>
                  <Badge className="bg-white/5 text-gray-300 border-white/10 text-[10px] shrink-0 self-start sm:self-auto font-mono">
                    {d.duration ? d.duration : 'PROGRAMMED'}
                  </Badge>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="text-[10px] font-mono uppercase text-gray-400 tracking-wider">Prescribed Modalities:</div>
                  <div className="space-y-1">
                    {d.modalities.map((m, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-gray-200">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0 mt-1.5" />
                        <span className="leading-snug">{typeof m === 'string' ? m : JSON.stringify(m)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-gray-300/80 italic pt-2 border-t border-white/5 leading-relaxed font-light">
                  💡 {d.benefit}
                </p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: MODALITY REFERENCE & BEST PRACTICES GUIDE */}
      {activeTab === 'guide' && (
        <div className="space-y-6">
          <div className="bg-brand-surface/80 border border-white/10 rounded-2xl p-4">
            <h3 className="text-sm font-bold text-white uppercase font-mono">Science-Backed Recovery Modalities Guide</h3>
            <p className="text-xs text-gray-400 mt-1">
              Detailed breakdown of temperatures, pressures, duration targets, and biological mechanisms for maximum recovery efficiency.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {MODALITY_INFO.map((item) => {
              const IconComponent = item.icon;
              return (
                <Card key={item.id} className="p-6 bg-brand-surface/90 border-white/10 rounded-2xl space-y-4">
                  <div className="flex items-start gap-4">
                    <div className={cn("p-3.5 rounded-2xl shrink-0", item.bgColor, item.color)}>
                      <IconComponent className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white">{item.name}</h4>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge className="bg-white/5 text-gray-300 border-white/10 text-[10px] font-mono">
                          Target: {item.duration}
                        </Badge>
                        <Badge className={cn("text-[10px] font-mono", item.bgColor, item.color, item.borderColor)}>
                          {item.tempSetting}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="font-mono text-gray-400 uppercase text-[10px] block mb-1">Recommended For:</span>
                      <div className="flex flex-wrap gap-1">
                        {item.recommendedFor.map((rec, i) => (
                          <span key={i} className="bg-black/30 border border-white/10 px-2 py-0.5 rounded-md text-gray-300 text-[11px]">
                            {rec}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="font-mono text-gray-400 uppercase text-[10px] block mb-1">Physiological Rationale:</span>
                      <p className="text-gray-300 leading-relaxed font-light">{item.rationale}</p>
                    </div>

                    <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-200">
                      <span className="font-bold text-[11px] block mb-0.5">Protocol Tip:</span>
                      <p className="text-[11px] text-purple-200/90 leading-normal">{item.protocolTips}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
