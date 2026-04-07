import { useState } from 'react';
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
  Clock,
  Droplets,
  Footprints,
  Info
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from './components/ui/Button';
import { Input, Select } from './components/ui/Input';
import { Card, Badge } from './components/ui/Card';
import { cn } from './lib/utils';
import { Path, UserData, Photos, ProgressPhotos, AssessmentResult, Rating } from './types';
import { generateTransformationReport } from './services/gemini';

const LogoBranding = () => null;

const RatingTable = ({ title, ratings, summary, photo }: { title: string; ratings: Rating[]; summary?: string; photo?: string | null }) => (
  <div className="space-y-6">
    <h2 className="text-2xl font-display font-bold text-brand-primary border-b border-gray-800 pb-2">{title}</h2>
    <div className={cn("grid grid-cols-1 gap-6", photo && "md:grid-cols-2")}>
      {photo && (
        <div className="aspect-[3/4] rounded-xl overflow-hidden border border-gray-800">
          <img src={photo} alt={title} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="space-y-4">
        <div className="bg-brand-secondary/10 border border-brand-secondary/30 rounded-xl overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-brand-secondary/20 text-gray-400 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-2 font-semibold border-r border-gray-800">Area</th>
                <th className="px-4 py-2 font-semibold border-r border-gray-800">Rating</th>
                <th className="px-4 py-2 font-semibold">Evaluation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {ratings.map((r, i) => (
                <tr key={i} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-200 border-r border-gray-800">{r.category}</td>
                  <td className="px-4 py-3 border-r border-gray-800">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{r.rating}/10</span>
                      <div className="flex gap-0.5">
                        {[...Array(10)].map((_, idx) => (
                          <div 
                            key={idx} 
                            className={cn(
                              "w-1 h-3 rounded-full",
                              idx < r.rating ? "bg-brand-primary" : "bg-gray-800"
                            )} 
                          />
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs leading-relaxed">{r.evaluation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {summary && (
          <div className="p-4 bg-brand-surface border border-gray-800 rounded-xl text-sm text-gray-300 leading-relaxed italic">
            {summary}
          </div>
        )}
      </div>
    </div>
  </div>
);

const ProgressComparison = ({ title, ratings, summary, beforePhoto, afterPhoto, beforeDate, afterDate }: { 
  title: string; 
  ratings: Rating[]; 
  summary?: string; 
  beforePhoto: string | null; 
  afterPhoto: string | null;
  beforeDate: string;
  afterDate: string;
}) => (
  <div className="space-y-6">
    <h2 className="text-2xl font-display font-bold text-brand-primary border-b border-gray-800 pb-2">{title}</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2 text-center">
            <div className="aspect-[3/4] rounded-xl overflow-hidden border border-gray-800">
              <img src={beforePhoto!} alt="Before" className="w-full h-full object-cover" />
            </div>
            <span className="text-[10px] font-bold text-gray-500 uppercase">Before ({beforeDate})</span>
          </div>
          <div className="space-y-2 text-center">
            <div className="aspect-[3/4] rounded-xl overflow-hidden border border-gray-800">
              <img src={afterPhoto!} alt="After" className="w-full h-full object-cover" />
            </div>
            <span className="text-[10px] font-bold text-brand-primary uppercase">After ({afterDate})</span>
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <div className="bg-brand-secondary/10 border border-brand-secondary/30 rounded-xl overflow-hidden">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-brand-secondary/20 text-gray-400 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-2 font-semibold border-r border-gray-800">Area</th>
                <th className="px-4 py-2 font-semibold border-r border-gray-800">Rating</th>
                <th className="px-4 py-2 font-semibold">Evaluation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {ratings.map((r, i) => (
                <tr key={i} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-200 border-r border-gray-800">{r.category}</td>
                  <td className="px-4 py-3 border-r border-gray-800">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{r.rating}/10</span>
                      <div className="flex gap-0.5">
                        {[...Array(10)].map((_, idx) => (
                          <div 
                            key={idx} 
                            className={cn(
                              "w-1 h-3 rounded-full",
                              idx < r.rating ? "bg-brand-primary" : "bg-gray-800"
                            )} 
                          />
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs leading-relaxed italic">{r.evaluation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {summary && (
          <div className="p-4 bg-brand-surface border border-gray-800 rounded-xl text-sm text-gray-300 leading-relaxed italic">
            {summary}
          </div>
        )}
      </div>
    </div>
  </div>
);

export default function App() {
  const [step, setStep] = useState<'landing' | 'intake' | 'photos' | 'progress-photos' | 'processing' | 'report'>('landing');
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
    caloriePreference: 'maintain'
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
    afterDate: ''
  });
  const [report, setReport] = useState<AssessmentResult | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('Analyzing your physique...');

  const handleStart = (selectedPath: Path) => {
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

  const processReport = async () => {
    setStep('processing');
    const messages = [
      'Analyzing your physique data...',
      'Calculating optimal macros...',
      'Designing your 7-day training split...',
      'Curating your personalized meal plan...',
      'Finalizing your transformation report...'
    ];
    
    let msgIndex = 0;
    const interval = setInterval(() => {
      msgIndex = (msgIndex + 1) % messages.length;
      setLoadingMessage(messages[msgIndex]);
    }, 3000);

    try {
      const result = await generateTransformationReport(
        userData, 
        path === 'progress' ? progressPhotos : photos, 
        path
      );
      setReport(result);
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
      
      alert(errorMessage);
      setStep('landing');
    } finally {
      clearInterval(interval);
    }
  };

  const handlePhotoUpload = (view: keyof Photos, file: File, set: 'current' | 'before' | 'after' = 'current') => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      if (set === 'current') {
        setPhotos(prev => ({ ...prev, [view]: base64 }));
      } else if (set === 'before') {
        setProgressPhotos(prev => ({ ...prev, before: { ...prev.before, [view]: base64 } }));
      } else if (set === 'after') {
        setProgressPhotos(prev => ({ ...prev, after: { ...prev.after, [view]: base64 } }));
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-brand-dark text-gray-100 selection:bg-brand-primary selection:text-white">
      <header className="fixed top-0 w-full z-50 bg-brand-dark/80 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-display font-bold text-xl tracking-tight">UNLCKD <span className="text-brand-primary">Pro Trainer</span></span>
          </div>
          {step !== 'landing' && (
            <Button variant="ghost" size="sm" onClick={() => setStep('landing')}>
              Exit
            </Button>
          )}
        </div>
      </header>

      <main className="pt-24 pb-12 px-4 max-w-5xl mx-auto">
        <AnimatePresence mode="wait">
          {step === 'landing' && (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12 text-center"
            >
              <div className="space-y-4">
                <Badge>Premium AI Coaching</Badge>
                <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight leading-tight">
                  Unlock Your <span className="text-brand-primary italic">Peak</span> Physique
                </h1>
                <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                  The elite digital coach that turns your data and photos into a structured, professional transformation plan.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-6 hover:border-brand-primary/50 transition-all cursor-pointer group" onClick={() => handleStart('assessment')}>
                  <div className="flex flex-col items-center text-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-brand-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Camera className="w-6 h-6 text-brand-primary" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-xl">Physique Assessment</h3>
                      <p className="text-sm text-gray-500 mt-1">Detailed visual review and category ratings.</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-6 hover:border-brand-primary/50 transition-all cursor-pointer group" onClick={() => handleStart('workout')}>
                  <div className="flex flex-col items-center text-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-brand-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Dumbbell className="w-6 h-6 text-brand-primary" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-xl">7-Day Workout Plan</h3>
                      <p className="text-sm text-gray-500 mt-1">Tailored training split with sets and reps.</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-6 bg-brand-primary/5 border-brand-primary/30 hover:border-brand-primary transition-all cursor-pointer group md:col-span-2" onClick={() => handleStart('full')}>
                  <div className="flex flex-col items-center text-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-brand-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-xl">Full Transformation Report</h3>
                      <p className="text-sm text-gray-500 mt-1">The complete assessment, training, and nutrition package.</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-6 hover:border-brand-primary/50 transition-all cursor-pointer group" onClick={() => handleStart('meal')}>
                  <div className="flex flex-col items-center text-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-brand-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Utensils className="w-6 h-6 text-brand-primary" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-xl">7-Day Meal Plan</h3>
                      <p className="text-sm text-gray-500 mt-1">Goal-matched nutrition and grocery lists.</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-6 border-brand-primary/20 hover:border-brand-primary transition-all cursor-pointer group" onClick={() => handleStart('progress')}>
                  <div className="flex flex-col items-center text-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-brand-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Activity className="w-6 h-6 text-brand-primary" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-xl">Progress Photo Engine</h3>
                      <p className="text-sm text-gray-500 mt-1">Compare before/after photos with expert feedback.</p>
                    </div>
                  </div>
                </Card>
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
              <div className="space-y-2">
                <h2 className="text-3xl font-display font-bold">Smart Intake</h2>
                <p className="text-gray-400">Tell us about your current status and goals.</p>
              </div>

              <form onSubmit={handleIntakeSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input 
                    label="Full Name" 
                    placeholder="John Doe" 
                    required 
                    value={userData.name}
                    onChange={e => setUserData({...userData, name: e.target.value})}
                  />
                  <Input 
                    label="Location" 
                    placeholder="London, UK" 
                    required 
                    value={userData.location}
                    onChange={e => setUserData({...userData, location: e.target.value})}
                  />

                  {path !== 'meal' && (
                    <>
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
                </div>

                {path !== 'meal' && (
                  <>
                    <Input 
                      label="Primary Goal" 
                      placeholder="e.g. Lose 5kg fat while maintaining muscle" 
                      required 
                      value={userData.goals}
                      onChange={e => setUserData({...userData, goals: e.target.value})}
                    />
                    <Input 
                      label="Current Workout (Optional)" 
                      placeholder="Describe your current routine or 'None'" 
                      value={userData.currentWorkout}
                      onChange={e => setUserData({...userData, currentWorkout: e.target.value})}
                    />
                    <Input 
                      label="Event Focus (Optional)" 
                      placeholder="e.g. Wedding in 3 months, Beach holiday" 
                      value={userData.eventFocus}
                      onChange={e => setUserData({...userData, eventFocus: e.target.value})}
                    />

                    {(path === 'workout' || path === 'full' || path === 'progress') && (
                      <Input 
                        label="Current or Past Injuries" 
                        placeholder="e.g. Lower back pain, ACL surgery 2 years ago" 
                        value={userData.injuries}
                        onChange={e => setUserData({...userData, injuries: e.target.value})}
                      />
                    )}
                  </>
                )}

                {(path === 'meal' || path === 'full' || path === 'progress') && (
                  <Input 
                    label="Food Allergies or Non-preferred Foods" 
                    placeholder="e.g. Dairy allergy, No cilantro, Vegan" 
                    value={userData.allergies}
                    onChange={e => setUserData({...userData, allergies: e.target.value})}
                  />
                )}

                {path === 'progress' && (
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
                  onClick={processReport}
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
                <h2 className="text-3xl font-display font-bold">Progress Photo Engine</h2>
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
                            <Camera className="w-6 h-6 text-gray-600 group-hover:text-brand-primary transition-colors" />
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
                            <Camera className="w-6 h-6 text-gray-600 group-hover:text-brand-primary transition-colors" />
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
                  onClick={processReport}
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
                <h2 className="text-2xl font-display font-bold">UNLCKD AI is working</h2>
                <p className="text-gray-400 animate-pulse">{loadingMessage}</p>
              </div>
            </motion.div>
          )}

          {step === 'report' && report && (
            <motion.div
              key="report"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-16 max-w-5xl mx-auto"
            >
              {/* Page 1: Header & Baseline Info */}
              <section className="space-y-8">
                <div className="text-center space-y-2">
                  <h1 className="text-4xl font-display font-bold text-brand-primary">UNLCKD Transformation Report</h1>
                  <p className="text-gray-500">Baseline Assessment, 7-Day Training Plan, and Nutrition Strategy</p>
                </div>

                <div className="bg-brand-secondary/10 border border-brand-secondary/30 rounded-xl overflow-hidden">
                  <table className="w-full text-sm text-left border-collapse">
                    <tbody className="divide-y divide-gray-800">
                      {[
                        { label: 'Client Name', value: userData.name },
                        { label: 'Report Type', value: path === 'progress' ? 'Progress Photo Engine' : 'Transformation Report' },
                        { label: 'Date', value: new Date().toLocaleDateString() },
                        { label: 'Age / Sex', value: `${userData.age} / ${userData.sex.charAt(0).toUpperCase() + userData.sex.slice(1)}` },
                        { label: 'Height / Weight', value: `${userData.height} ${userData.heightUnit} / ${userData.weight} ${userData.weightUnit}` },
                        { label: 'Location', value: userData.location },
                        { label: 'Current Workout', value: userData.currentWorkout || 'None' },
                        { label: 'Primary Goals', value: userData.goals },
                      ].map((row, i) => (
                        <tr key={i}>
                          <td className="px-6 py-3 bg-brand-secondary/20 font-bold text-gray-200 w-1/3">{row.label}</td>
                          <td className="px-6 py-3 text-gray-300">{row.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

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
                <LogoBranding />
              </section>

              {/* Page 2: Topline Assessment */}
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
                <LogoBranding />
              </section>

              {/* View Comparisons */}
              <section className="space-y-16 pt-16 border-t border-gray-800">
                {path !== 'progress' ? (
                  <>
                    <RatingTable title="Front View Comparison" ratings={report.frontViewAnalysis.ratings} summary={report.frontViewAnalysis.summary} photo={photos.front} />
                    <RatingTable title="Left Side Comparison" ratings={report.leftViewAnalysis.ratings} summary={report.leftViewAnalysis.summary} photo={photos.left} />
                    <RatingTable title="Back View Comparison" ratings={report.backViewAnalysis.ratings} summary={report.backViewAnalysis.summary} photo={photos.back} />
                    <RatingTable title="Right Side Comparison" ratings={report.rightViewAnalysis.ratings} summary={report.rightViewAnalysis.summary} photo={photos.right} />
                  </>
                ) : (
                  <>
                    <ProgressComparison 
                      title="Front View Comparison" 
                      ratings={report.frontViewAnalysis.ratings} 
                      summary={report.frontViewAnalysis.summary} 
                      beforePhoto={progressPhotos.before.front} 
                      afterPhoto={progressPhotos.after.front}
                      beforeDate={progressPhotos.beforeDate}
                      afterDate={progressPhotos.afterDate}
                    />
                    <ProgressComparison 
                      title="Left Side Comparison" 
                      ratings={report.leftViewAnalysis.ratings} 
                      summary={report.leftViewAnalysis.summary} 
                      beforePhoto={progressPhotos.before.left} 
                      afterPhoto={progressPhotos.after.left}
                      beforeDate={progressPhotos.beforeDate}
                      afterDate={progressPhotos.afterDate}
                    />
                    <ProgressComparison 
                      title="Back View Comparison" 
                      ratings={report.backViewAnalysis.ratings} 
                      summary={report.backViewAnalysis.summary} 
                      beforePhoto={progressPhotos.before.back} 
                      afterPhoto={progressPhotos.after.back}
                      beforeDate={progressPhotos.beforeDate}
                      afterDate={progressPhotos.afterDate}
                    />
                    <ProgressComparison 
                      title="Right Side Comparison" 
                      ratings={report.rightViewAnalysis.ratings} 
                      summary={report.rightViewAnalysis.summary} 
                      beforePhoto={progressPhotos.before.right} 
                      afterPhoto={progressPhotos.after.right}
                      beforeDate={progressPhotos.beforeDate}
                      afterDate={progressPhotos.afterDate}
                    />
                  </>
                )}
                <LogoBranding />
              </section>

              {/* Final Summary & Next Steps */}
              <section className="space-y-8 pt-16 border-t border-gray-800">
                <h2 className="text-3xl font-display font-bold text-brand-primary">Final Summary / Next-Phase Improvement Plan</h2>
                <RatingTable title="Strategic Ratings" ratings={report.finalSummary.ratings} />
                
                <div className="space-y-4">
                  <h3 className="text-xl font-display font-bold text-gray-200">Coaching-Oriented Next Steps</h3>
                  <div className="grid grid-cols-1 gap-4">
                    {report.finalSummary.nextSteps.map((step, i) => (
                      <div key={i} className="flex gap-4 p-4 bg-brand-surface border border-gray-800 rounded-xl items-start">
                        <div className="w-6 h-6 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold text-xs shrink-0">{i + 1}</div>
                        <p className="text-sm text-gray-300">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <LogoBranding />
              </section>

              {/* Workout Plan */}
              <section className="space-y-8 pt-16 border-t border-gray-800">
                <h2 className="text-3xl font-display font-bold text-brand-primary">7-Day Workout Plan</h2>
                <div className="overflow-x-auto bg-brand-secondary/10 border border-brand-secondary/30 rounded-xl">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-brand-secondary/20 text-gray-400 uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="px-4 py-3 font-semibold border-r border-gray-800">Day</th>
                        <th className="px-4 py-3 font-semibold border-r border-gray-800">Focus</th>
                        <th className="px-4 py-3 font-semibold border-r border-gray-800">Warm-Up</th>
                        <th className="px-4 py-3 font-semibold border-r border-gray-800">Main Work</th>
                        <th className="px-4 py-3 font-semibold">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {report.workoutPlan.map((day, i) => (
                        <tr key={i} className="hover:bg-white/5 transition-colors">
                          <td className="px-4 py-4 font-bold text-brand-primary border-r border-gray-800">{day.day}</td>
                          <td className="px-4 py-4 border-r border-gray-800 text-gray-200">{day.focus}</td>
                          <td className="px-4 py-4 border-r border-gray-800 text-gray-400 text-xs">{day.warmUp}</td>
                          <td className="px-4 py-4 border-r border-gray-800 text-gray-300 font-medium">{day.mainWork}</td>
                          <td className="px-4 py-4 text-gray-400 text-xs italic">{day.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <LogoBranding />
              </section>

              {/* Nutrition & Meal Plan */}
              <section className="space-y-8 pt-16 border-t border-gray-800">
                <h2 className="text-3xl font-display font-bold text-brand-primary">Nutrition Strategy</h2>
                <div className="p-6 bg-brand-surface border border-gray-800 rounded-xl text-gray-300 leading-relaxed">
                  {report.nutritionStrategy}
                </div>

                <div className="overflow-x-auto bg-brand-secondary/10 border border-brand-secondary/30 rounded-xl">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-brand-secondary/20 text-gray-400 uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="px-4 py-3 font-semibold border-r border-gray-800">Day</th>
                        <th className="px-4 py-3 font-semibold border-r border-gray-800">Breakfast</th>
                        <th className="px-4 py-3 font-semibold border-r border-gray-800">Lunch</th>
                        <th className="px-4 py-3 font-semibold border-r border-gray-800">Dinner</th>
                        <th className="px-4 py-3 font-semibold">Snack</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {report.mealPlan.map((day, i) => (
                        <tr key={i} className="hover:bg-white/5 transition-colors">
                          <td className="px-4 py-4 font-bold text-brand-primary border-r border-gray-800">{day.day}</td>
                          <td className="px-4 py-4 border-r border-gray-800 text-gray-300">{day.breakfast}</td>
                          <td className="px-4 py-4 border-r border-gray-800 text-gray-300">{day.lunch}</td>
                          <td className="px-4 py-4 border-r border-gray-800 text-gray-300">{day.dinner}</td>
                          <td className="px-4 py-4 text-gray-300">{day.snack}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <LogoBranding />
              </section>

              {/* Grocery List */}
              <section className="space-y-8 pt-16 border-t border-gray-800">
                <h2 className="text-3xl font-display font-bold text-brand-primary">Grocery List</h2>
                <div className="bg-brand-secondary/10 border border-brand-secondary/30 rounded-xl overflow-hidden">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-brand-secondary/20 text-gray-400 uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="px-6 py-3 font-semibold border-r border-gray-800 w-1/3">Category</th>
                        <th className="px-6 py-3 font-semibold">Items</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {report.groceryList.map((row, i) => (
                        <tr key={i}>
                          <td className="px-6 py-4 bg-brand-secondary/20 font-bold text-gray-200 border-r border-gray-800">{row.category}</td>
                          <td className="px-6 py-4 text-gray-300">{row.items}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <LogoBranding />
              </section>

              {/* Recovery & Tracking */}
              <section className="space-y-8 pt-16 border-t border-gray-800">
                <h2 className="text-3xl font-display font-bold text-brand-primary">Recovery, Steps, Water, and Progress Tracking</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <Footprints className="w-5 h-5 text-brand-primary" />
                      <h3 className="font-bold">Daily Step Target</h3>
                    </div>
                    <p className="text-sm text-gray-400">{report.stepGoals}</p>
                  </Card>
                  <Card className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <Droplets className="w-5 h-5 text-brand-primary" />
                      <h3 className="font-bold">Daily Water Target</h3>
                    </div>
                    <p className="text-sm text-gray-400">{report.hydrationTargets}</p>
                  </Card>
                  <Card className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <Camera className="w-5 h-5 text-brand-primary" />
                      <h3 className="font-bold">Weekly Photo Reminder</h3>
                    </div>
                    <p className="text-sm text-gray-400">Take progress photos once per week in the same lighting and time of day.</p>
                  </Card>
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
                        {report.recoverySchedule.map((row, i) => (
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
                    {report.waterSchedule.map((item, i) => (
                      <div key={i} className="flex gap-3 items-center text-sm text-gray-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-primary shrink-0" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
                <LogoBranding />
              </section>

              {/* Trainer Summary */}
              <section className="pt-16 border-t border-gray-800">
                <h2 className="text-3xl font-display font-bold text-brand-primary mb-8">Trainer Follow-Up Summary</h2>
                <div className="bg-brand-secondary/10 border border-brand-secondary/30 rounded-xl overflow-hidden">
                  <table className="w-full text-sm text-left border-collapse">
                    <tbody className="divide-y divide-gray-800">
                      {[
                        { label: 'Name', value: userData.name },
                        { label: 'Weight', value: `${userData.weight} ${userData.weightUnit}` },
                        { label: 'Height', value: `${userData.height} ${userData.heightUnit}` },
                        { label: 'Meal Plan', value: report.trainerSummary.split('\n')[0] },
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
                <div className="mt-12 text-center">
                  <Button size="lg" onClick={() => setStep('landing')}>Start New Assessment</Button>
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="py-12 border-t border-gray-800 bg-brand-dark">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-4">
          <div className="flex items-center justify-center gap-2 opacity-50">
            <Dumbbell className="w-4 h-4" />
            <span className="font-display font-bold text-sm tracking-tight">UNLCKD Pro Trainer</span>
          </div>
          <p className="text-xs text-gray-600">
            © 2026 UNLCKD Pro Trainer. AI-generated assessments are for informational purposes only. Consult a professional before starting any new fitness or nutrition program.
          </p>
        </div>
      </footer>
    </div>
  );
}
