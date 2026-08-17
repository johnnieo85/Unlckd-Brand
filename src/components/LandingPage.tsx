import React from 'react';
import { 
  Lock, 
  FileText, 
  Camera, 
  Dumbbell, 
  Utensils, 
  Activity, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  GitBranch, 
  Target
} from 'lucide-react';
import { Path, UserProfile } from '../types';
import { cn } from '../lib/utils';
import gymInteriorImg from '../assets/images/gym_interior_dark.jpg';
import physiqueScanImg from '../assets/images/physique_scan_tech.jpg';

interface LandingPageProps {
  user: any;
  hasAccess: boolean;
  isPremium: boolean;
  userProfile: UserProfile | null;
  onGetStarted: () => void;
  onStartPath: (path: Path) => void;
  onOpenGymHub: () => void;
  onSignIn: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  user,
  hasAccess,
  isPremium,
  userProfile,
  onGetStarted,
  onStartPath,
  onOpenGymHub,
  onSignIn
}) => {
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);

  return (
    <div className="w-full space-y-14 sm:space-y-18 lg:space-y-24 pb-16 bg-transparent">
      
      {/* ============================================================ */}
      {/* 1. HERO SECTION: FULL-BLEED SEAMLESS ATHLETE INTEGRATION     */}
      {/* ============================================================ */}
      <section className="relative w-full min-h-[520px] sm:min-h-[600px] lg:min-h-[680px] xl:min-h-[720px] flex items-center bg-transparent overflow-hidden border-0 outline-none shadow-none">
        
        {/* ATHLETE COMPOSITION: Positioned absolutely as transparent hero layer */}
        <div className="absolute right-0 bottom-0 top-auto lg:top-0 w-full lg:w-[58%] xl:w-[60%] h-[58%] sm:h-[68%] lg:h-full pointer-events-none z-0 flex items-end justify-end overflow-hidden bg-transparent border-0 outline-none shadow-none">
          <div className="relative w-full h-full flex items-end justify-end bg-transparent border-0 outline-none shadow-none">
            <img
              src="https://unlckdprotrainer.com/assets/unlckd-athletes-cutout.png"
              alt="Elite Athletic Performance Team"
              loading="eager"
              decoding="async"
              // @ts-ignore
              fetchPriority="high"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              className={cn(
                "w-full max-w-[460px] sm:max-w-[700px] lg:max-w-[1040px] max-h-full object-contain object-bottom-right bg-transparent border-0 outline-none shadow-none transition-opacity duration-300",
                imageLoaded ? "opacity-100" : "opacity-90"
              )}
              style={{
                WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 82%, rgba(0,0,0,0) 100%)',
                maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 82%, rgba(0,0,0,0) 100%)',
                transform: 'translateZ(0)',
                WebkitBackfaceVisibility: 'hidden',
                imageRendering: '-webkit-optimize-contrast'
              }}
            />
            
            {/* Subtle atmospheric ambient glow behind athletes */}
            <div className="absolute right-1/4 top-1/3 w-[300px] sm:w-[450px] h-[300px] sm:h-[450px] bg-[#00DFA2]/[0.035] rounded-full blur-3xl pointer-events-none" />
          </div>
        </div>

        {/* LEFT SIDE CONTENT: Dominant Headline, Eyebrow, Supporting Copy & Primary CTA */}
        <div className="relative z-10 w-full lg:w-[50%] xl:w-[42%] space-y-5 sm:space-y-8 text-left py-4 sm:py-8 bg-transparent">
          
          {/* Eyebrow */}
          <div className="inline-flex items-center">
            <span className="text-[11px] sm:text-sm font-mono font-bold tracking-widest text-[#00DFA2] uppercase">
              PREMIUM AI COACHING
            </span>
          </div>

          {/* Primary Dominant Headline (Responsive on 375px mobile through 1440px desktop) */}
          <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-[5.75rem] xl:text-[6.75rem] font-display font-black leading-[0.9] sm:leading-[0.88] tracking-tight uppercase text-white drop-shadow-sm">
            UNLOCK <br />
            YOUR <span className="text-[#00DFA2]">PEAK.</span>
          </h1>

          {/* Supporting Copy (16-18px, max 460px wide) */}
          <p className="text-[#A1A1A1] text-sm sm:text-lg leading-relaxed font-sans max-w-[460px]">
            The elite digital coach that turns your data and photos into a structured, professional transformation plan.
          </p>

          {/* Primary CTA (52-56px height, rounded-[4px], #00DFA2 background) */}
          <div className="pt-2">
            <button
              type="button"
              onClick={onGetStarted}
              className="inline-flex items-center justify-center gap-3.5 px-8 py-3.5 sm:px-11 sm:py-4.5 bg-[#00DFA2] text-[#080808] font-sans font-black text-base sm:text-lg uppercase tracking-wider rounded-[4px] hover:bg-[#00DFA2]/90 active:scale-[0.98] transition-all cursor-pointer shadow-none border-0 min-h-[48px]"
            >
              <span>GET STARTED</span>
              <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
            </button>
          </div>

        </div>

      </section>

      {/* ============================================================ */}
      {/* 2. CHOOSE YOUR PATH SECTION DIVIDER                          */}
      {/* ============================================================ */}
      <section className="space-y-8 pt-4 sm:pt-6">
        <div className="flex items-center gap-4">
          <span className="text-xs sm:text-sm font-display font-bold tracking-widest text-white uppercase shrink-0">
            CHOOSE YOUR PATH
          </span>
          <div className="h-[1px] bg-[#222222] flex-1" />
        </div>

        {/* ============================================================ */}
        {/* 3. PRIMARY ACTION PANELS (PRO GYM HUB & TRANSFORMATION REPORT)*/}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          
          {/* PRIMARY PANEL 1: PRO GYM HUB (220-250px height) */}
          <div
            onClick={onOpenGymHub}
            className="group relative bg-[#0D0D0D] border border-[#00DFA2] rounded-[6px] p-7 sm:p-9 flex flex-col justify-between min-h-[220px] sm:min-h-[240px] transition-all duration-200 cursor-pointer overflow-hidden"
          >
            {/* Integrated Dark Gym Interior Photography */}
            <div className="absolute inset-y-0 right-0 w-3/5 sm:w-1/2 overflow-hidden opacity-30 group-hover:opacity-45 transition-opacity duration-300 pointer-events-none">
              <img 
                src={gymInteriorImg} 
                alt="Gym Interior Facility" 
                className="w-full h-full object-cover object-center grayscale contrast-125"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0D0D0D] via-[#0D0D0D]/70 to-transparent" />
            </div>

            {/* Left Content */}
            <div className="relative z-10 flex items-start gap-4 sm:gap-5">
              <div className="w-11 h-11 rounded-[4px] flex items-center justify-center shrink-0 mt-0.5">
                <Lock className="w-9 h-9 text-[#00DFA2] stroke-[1.8]" />
              </div>

              <div className="space-y-2 max-w-sm sm:max-w-md">
                <h3 className="text-xl sm:text-2xl font-display font-bold uppercase tracking-tight text-white group-hover:text-[#00DFA2] transition-colors">
                  PRO GYM HUB
                </h3>
                <p className="text-xs sm:text-sm text-[#A1A1A1] font-sans leading-relaxed">
                  Your private high-performance optimization center. Access professional training environments.
                </p>
              </div>
            </div>

            {/* Bottom Arrow Action */}
            <div className="relative z-10 pt-4 flex items-center">
              <ArrowRight className="w-5 h-5 text-[#00DFA2] transition-transform duration-200 group-hover:translate-x-2 stroke-[2.2]" />
            </div>
          </div>

          {/* PRIMARY PANEL 2: FULL TRANSFORMATION REPORT (220-250px height) */}
          <div
            onClick={() => onStartPath('full')}
            className="group relative bg-gradient-to-r from-[#00382B] via-[#005B44] to-[#00A878] rounded-[6px] p-7 sm:p-9 flex flex-col justify-between min-h-[220px] sm:min-h-[240px] transition-all duration-200 cursor-pointer overflow-hidden border border-emerald-500/30 hover:border-[#00DFA2]"
          >
            {/* Integrated 3D Wireframe Physique Scan Background */}
            <div className="absolute inset-y-0 right-0 w-3/5 sm:w-1/2 overflow-hidden opacity-40 group-hover:opacity-60 transition-opacity duration-300 pointer-events-none mix-blend-screen">
              <img 
                src={physiqueScanImg} 
                alt="Physique Anatomy Scan" 
                className="w-full h-full object-cover object-center contrast-150 brightness-110"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#00382B] via-transparent to-transparent" />
            </div>

            {/* Left Content */}
            <div className="relative z-10 flex items-start gap-4 sm:gap-5">
              <div className="w-11 h-11 rounded-[4px] flex items-center justify-center shrink-0 mt-0.5">
                <FileText className="w-9 h-9 text-white stroke-[1.8]" />
              </div>

              <div className="space-y-2 max-w-sm sm:max-w-md">
                <h3 className="text-xl sm:text-2xl font-display font-bold uppercase tracking-tight text-white">
                  FULL TRANSFORMATION REPORT
                </h3>
                <p className="text-xs sm:text-sm text-emerald-100/90 font-sans leading-relaxed">
                  The complete assessment, training, and nutrition package for serious results.
                </p>
              </div>
            </div>

            {/* Bottom Arrow Action */}
            <div className="relative z-10 pt-4 flex items-center">
              <ArrowRight className="w-5 h-5 text-white transition-transform duration-200 group-hover:translate-x-2 stroke-[2.2]" />
            </div>
          </div>

        </div>

        {/* ============================================================ */}
        {/* 4. SECONDARY ACTION ROW: FOUR EQUAL-WIDTH PANELS (160-190px) */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
          {/* 1. PHYSIQUE ASSESSMENT */}
          <div
            onClick={() => onStartPath('assessment')}
            className="group bg-[#0D0D0D] border border-[#222222] hover:border-[#383838] rounded-[6px] p-6 flex flex-col justify-between min-h-[160px] sm:min-h-[175px] transition-all duration-150 cursor-pointer"
          >
            <div className="flex items-start gap-4">
              <Camera className="w-8 h-8 text-[#00DFA2] stroke-[1.6] shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <h4 className="text-base font-display font-bold uppercase tracking-tight text-white group-hover:text-[#00DFA2] transition-colors">
                  PHYSIQUE ASSESSMENT
                </h4>
                <p className="text-xs text-[#8E8E8E] font-sans leading-relaxed">
                  Detailed visual review and category ratings.
                </p>
              </div>
            </div>
            <div className="pt-3 flex items-center">
              <ArrowRight className="w-4 h-4 text-[#00DFA2] transition-transform duration-150 group-hover:translate-x-1.5 stroke-[2]" />
            </div>
          </div>

          {/* 2. WORKOUT PLAN */}
          <div
            onClick={() => onStartPath('workout')}
            className="group bg-[#0D0D0D] border border-[#222222] hover:border-[#383838] rounded-[6px] p-6 flex flex-col justify-between min-h-[160px] sm:min-h-[175px] transition-all duration-150 cursor-pointer"
          >
            <div className="flex items-start gap-4">
              <Dumbbell className="w-8 h-8 text-[#00DFA2] stroke-[1.6] shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <h4 className="text-base font-display font-bold uppercase tracking-tight text-white group-hover:text-[#00DFA2] transition-colors">
                  WORKOUT PLAN
                </h4>
                <p className="text-xs text-[#8E8E8E] font-sans leading-relaxed">
                  Tailored training split with sets and reps.
                </p>
              </div>
            </div>
            <div className="pt-3 flex items-center">
              <ArrowRight className="w-4 h-4 text-[#00DFA2] transition-transform duration-150 group-hover:translate-x-1.5 stroke-[2]" />
            </div>
          </div>

          {/* 3. MEAL PLAN */}
          <div
            onClick={() => onStartPath('meal')}
            className="group bg-[#0D0D0D] border border-[#222222] hover:border-[#383838] rounded-[6px] p-6 flex flex-col justify-between min-h-[160px] sm:min-h-[175px] transition-all duration-150 cursor-pointer"
          >
            <div className="flex items-start gap-4">
              <Utensils className="w-8 h-8 text-[#00DFA2] stroke-[1.6] shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <h4 className="text-base font-display font-bold uppercase tracking-tight text-white group-hover:text-[#00DFA2] transition-colors">
                  MEAL PLAN
                </h4>
                <p className="text-xs text-[#8E8E8E] font-sans leading-relaxed">
                  Goal-matched nutrition and grocery lists.
                </p>
              </div>
            </div>
            <div className="pt-3 flex items-center">
              <ArrowRight className="w-4 h-4 text-[#00DFA2] transition-transform duration-150 group-hover:translate-x-1.5 stroke-[2]" />
            </div>
          </div>

          {/* 4. PROGRESS ENGINE */}
          <div
            onClick={() => onStartPath('progress')}
            className="group bg-[#0D0D0D] border border-[#222222] hover:border-[#383838] rounded-[6px] p-6 flex flex-col justify-between min-h-[160px] sm:min-h-[175px] transition-all duration-150 cursor-pointer"
          >
            <div className="flex items-start gap-4">
              <Activity className="w-8 h-8 text-[#00DFA2] stroke-[1.6] shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <h4 className="text-base font-display font-bold uppercase tracking-tight text-white group-hover:text-[#00DFA2] transition-colors">
                  PROGRESS ENGINE
                </h4>
                <p className="text-xs text-[#8E8E8E] font-sans leading-relaxed">
                  Weekly photo comparison and feedback.
                </p>
              </div>
            </div>
            <div className="pt-3 flex items-center">
              <ArrowRight className="w-4 h-4 text-[#00DFA2] transition-transform duration-150 group-hover:translate-x-1.5 stroke-[2]" />
            </div>
          </div>

        </div>
      </section>

      {/* ============================================================ */}
      {/* 5. PRODUCT PRINCIPLE STRIP ENCLOSED BAR                      */}
      {/* ============================================================ */}
      <section className="w-full bg-[#0D0D0D] border border-[#222222] rounded-[6px] px-6 py-5 sm:px-8 sm:py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 items-center">
          
          {/* Principle 1: AI-Powered */}
          <div className="flex items-center gap-3.5">
            <CheckCircle2 className="w-5 h-5 text-[#00DFA2] shrink-0 stroke-[2]" />
            <div>
              <h5 className="text-sm font-semibold text-white tracking-tight">AI-Powered</h5>
              <p className="text-xs text-[#7A7A7A] font-sans">Personalized Plans</p>
            </div>
          </div>

          {/* Principle 2: Data-Driven */}
          <div className="flex items-center gap-3.5">
            <Clock className="w-5 h-5 text-[#00DFA2] shrink-0 stroke-[2]" />
            <div>
              <h5 className="text-sm font-semibold text-white tracking-tight">Data-Driven</h5>
              <p className="text-xs text-[#7A7A7A] font-sans">Precise Insights</p>
            </div>
          </div>

          {/* Principle 3: Adaptive Coaching */}
          <div className="flex items-center gap-3.5">
            <GitBranch className="w-5 h-5 text-[#00DFA2] shrink-0 stroke-[2]" />
            <div>
              <h5 className="text-sm font-semibold text-white tracking-tight">Adaptive Coaching</h5>
              <p className="text-xs text-[#7A7A7A] font-sans">Evolves With You</p>
            </div>
          </div>

          {/* Principle 4: Results Focused */}
          <div className="flex items-center gap-3.5">
            <Target className="w-5 h-5 text-[#00DFA2] shrink-0 stroke-[2]" />
            <div>
              <h5 className="text-sm font-semibold text-white tracking-tight">Results Focused</h5>
              <p className="text-xs text-[#7A7A7A] font-sans">Built For Athletes</p>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
};
