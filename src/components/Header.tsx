import React from 'react';
import { motion } from 'motion/react';
import { 
  ExternalLink, 
  History, 
  Dumbbell, 
  Lock, 
  LogOut,
  LogIn,
  Instagram,
  Facebook,
  Settings
} from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Card';
import { cn } from '../lib/utils';
import { getLevelInfo } from '../lib/levels';
import { User } from 'firebase/auth';
import { UserProfile } from '../types';
import { Logo } from './Logo';

export interface HeaderProps {
  user: User | null;
  hasAccess: boolean | null;
  isPremium: boolean;
  userProfile: UserProfile | null;
  activeTab: 'reports' | 'gym';
  step: string;
  setStep: (step: any) => void;
  setActiveTab: (tab: 'reports' | 'gym') => void;
  loadHistory: () => Promise<void>;
  handleSignIn: () => void;
  handleSignOut: () => void;
  setShowGymAuth: (show: boolean) => void;
  onShowAccount: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  hasAccess,
  isPremium,
  userProfile,
  activeTab,
  step,
  setStep,
  setActiveTab,
  loadHistory,
  handleSignIn,
  handleSignOut,
  setShowGymAuth,
  onShowAccount
}) => {
  return (
    <header className="fixed top-0 w-full z-50 bg-brand-dark/40 backdrop-blur-xl border-b border-white/5 no-print">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Logo 
          onClick={() => {
            setStep('landing');
            setActiveTab('reports');
          }}
        />
        
        <div className="flex items-center gap-4 no-print">
          <a 
            href="https://unlckdbrand.com/unlckd-pro-trainer" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hidden lg:flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-xs font-bold text-gray-300 hover:bg-white/10 transition-all hover:text-brand-primary"
          >
            Get Access
            <ExternalLink className="w-3 h-3" />
          </a>

          <div className="hidden sm:flex items-center gap-3 pr-2 mr-2 border-r border-white/10">
            <a href="https://instagram.com/unlckd_brand" target="_blank" rel="noreferrer" className="text-gray-400 hover:text-brand-primary transition-colors" title="Instagram">
              <Instagram className="w-4 h-4" />
            </a>
            <a href="https://facebook.com/unlckdbrand" target="_blank" rel="noreferrer" className="text-gray-400 hover:text-brand-primary transition-colors" title="Facebook">
              <Facebook className="w-4 h-4" />
            </a>
          </div>

          {user ? (
            <>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={async () => {
                  setActiveTab('reports');
                  setStep('history');
                  await loadHistory();
                }}
                className={cn("gap-2 hover:bg-white/5", activeTab === 'reports' && step === 'history' && "text-brand-primary bg-white/5")}
              >
                <History className="w-4 h-4" />
                My Reports
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
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
                className={cn("gap-2 hover:bg-white/5", activeTab === 'gym' && "text-brand-primary bg-white/5")}
              >
                <Dumbbell className="w-4 h-4" />
                Gym Hub
                {!isPremium && <Lock className="w-3 h-3 text-gray-500" />}
              </Button>
              <div className="flex items-center gap-3 pl-4 border-l border-white/10">
                <div className="text-right hidden sm:block">
                  <div className="flex items-center gap-2 justify-end mb-0.5">
                    {userProfile && (
                      <Badge className="text-[8px] h-3.5 px-1 py-0 border-brand-primary/20 bg-brand-primary/10 text-brand-primary uppercase font-black leading-none mr-1">
                        Lvl {getLevelInfo(userProfile.xp || 0).level}
                      </Badge>
                    )}
                    {hasAccess ? (
                      <Badge className="text-[8px] h-3.5 px-1 py-0 border-brand-primary/20 bg-brand-primary/10 text-brand-primary uppercase font-black leading-none">Pro</Badge>
                    ) : (
                      <Badge className="text-[8px] h-3.5 px-1 py-0 border-red-500/20 bg-red-500/10 text-red-500 uppercase font-black leading-none">Restricted</Badge>
                    )}
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Signed In As</p>
                  </div>
                  <motion.div 
                    initial={false}
                    animate={isPremium ? {
                      textShadow: [
                        "0 0 5px rgba(251, 191, 36, 0.4)",
                        "0 0 15px rgba(251, 191, 36, 0.8)",
                        "0 0 5px rgba(251, 191, 36, 0.4)"
                      ],
                      scale: [1, 1.02, 1]
                    } : {}}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className={cn(
                      "text-xs font-medium truncate max-w-[160px] flex items-center justify-end gap-1.5",
                      isPremium ? "text-amber-400" : "text-gray-300"
                    )}
                  >
                    <span>{user.displayName || user.email}</span>
                    {isPremium && (
                      <span className="bg-amber-400/20 px-1.5 py-0.5 rounded border border-amber-400/30 text-[9px] font-black tracking-tighter uppercase leading-none">
                        Premium
                      </span>
                    )}
                  </motion.div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={onShowAccount} className="hover:bg-white/5 text-gray-400 hover:text-white" title="Account Settings">
                    <Settings className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleSignOut} className="hover:bg-white/5 text-gray-400 hover:text-white" title="Sign Out">
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <Button 
              size="sm" 
              onClick={handleSignIn} 
              className="gap-2 bg-brand-primary text-brand-dark font-bold hover:bg-brand-primary/90"
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
