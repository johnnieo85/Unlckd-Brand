import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ExternalLink, 
  History, 
  Dumbbell, 
  Lock, 
  LogOut,
  LogIn,
  Settings,
  Menu,
  X,
  Users,
  CreditCard
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
  activeTab: 'reports' | 'gym' | 'client' | 'profile';
  step: string;
  setStep: (step: any) => void;
  setActiveTab: (tab: 'reports' | 'gym' | 'client' | 'profile') => void;
  loadHistory: () => Promise<void>;
  handleSignIn: () => void;
  handleSignOut: () => void;
  setShowGymAuth: (show: boolean) => void;
  onShowAccount: () => void;
  onOpenLevelModal?: () => void;
  onOpenSubscriptionModal?: () => void;
}

const formatShortName = (fullName?: string | null, email?: string | null) => {
  const nameStr = (fullName || '').trim();
  if (nameStr) {
    const parts = nameStr.split(/\s+/);
    if (parts.length >= 2) {
      const firstInitial = parts[0].charAt(0).toUpperCase();
      const lastName = parts[parts.length - 1];
      return `${firstInitial}. ${lastName}`;
    }
    return nameStr;
  }
  if (email) {
    const username = email.split('@')[0];
    const parts = username.split(/[\._-]/);
    if (parts.length >= 2) {
      const firstInitial = parts[0].charAt(0).toUpperCase();
      const lastName = parts[parts.length - 1];
      return `${firstInitial}. ${lastName.charAt(0).toUpperCase()}${lastName.slice(1)}`;
    }
    return username;
  }
  return 'User';
};

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
  onShowAccount,
  onOpenLevelModal,
  onOpenSubscriptionModal
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const displayName = formatShortName(
    userProfile?.fullName || user?.displayName,
    user?.email
  );

  return (
    <header className="fixed top-0 w-full z-50 bg-brand-dark/80 backdrop-blur-xl border-b border-white/5 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
        <Logo 
          onClick={() => {
            setStep('landing');
            setActiveTab('reports');
            setMobileMenuOpen(false);
          }}
        />
        
        <div className="flex items-center gap-2 sm:gap-4 no-print">
          {onOpenSubscriptionModal && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenSubscriptionModal}
              className="hidden lg:flex items-center gap-2 px-3.5 py-2 bg-brand-primary/10 border-brand-primary/30 text-brand-primary rounded-full text-xs font-bold hover:bg-brand-primary/20 transition-all shadow-sm cursor-pointer"
              title="View & Manage Subscription Tiers"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Billing & Plans</span>
            </Button>
          )}

          <a 
            href="https://unlckdbrand.com/unlckd-pro-trainer" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hidden lg:flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-xs font-bold text-gray-300 hover:bg-white/10 transition-all hover:text-brand-primary"
          >
            Get Access
            <ExternalLink className="w-3 h-3" />
          </a>

          {user ? (
            <>
              {/* Desktop Nav Pills */}
              <div className="hidden md:flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={async () => {
                    setActiveTab('reports');
                    setStep('history');
                    await loadHistory();
                  }}
                  className={cn("gap-2 hover:bg-white/5 text-xs font-bold", activeTab === 'reports' && step === 'history' && "text-brand-primary bg-white/5")}
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
                  className={cn("gap-2 hover:bg-white/5 text-xs font-bold", activeTab === 'gym' && "text-brand-primary bg-white/5")}
                >
                  <Dumbbell className="w-4 h-4" />
                  Gym Hub
                  {!isPremium && <Lock className="w-3 h-3 text-gray-500" />}
                </Button>

                {userProfile?.membershipTier === 'trainer' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab('client')}
                    className={cn("gap-2 hover:bg-white/5 text-amber-400 font-bold text-xs", activeTab === 'client' && "bg-amber-400/10 text-amber-400 border border-amber-400/30")}
                  >
                    Client Hub
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 border-l border-white/10">
                <div 
                  className="text-right cursor-pointer group shrink-0"
                  onClick={() => setActiveTab('profile')}
                  title="Open User Profile"
                >
                  <div className="flex items-center gap-1.5 justify-end mb-0.5">
                    {userProfile && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenLevelModal) onOpenLevelModal();
                        }}
                        title="Click to view Level Progression & XP"
                        className="inline-flex cursor-pointer"
                      >
                        <Badge className="text-[8px] h-3.5 px-1 py-0 border-brand-primary/30 bg-brand-primary/20 hover:bg-brand-primary/40 text-brand-primary uppercase font-black leading-none hover:scale-105 active:scale-95 transition-all shadow-sm">
                          Lvl {getLevelInfo(userProfile.xp || 0).level}
                        </Badge>
                      </span>
                    )}
                    {hasAccess ? (
                      <Badge className="text-[8px] h-3.5 px-1 py-0 border-brand-primary/20 bg-brand-primary/10 text-brand-primary uppercase font-black leading-none">Pro</Badge>
                    ) : (
                      <Badge className="text-[8px] h-3.5 px-1 py-0 border-red-500/20 bg-red-500/10 text-red-500 uppercase font-black leading-none">Restricted</Badge>
                    )}
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
                      "text-xs font-bold flex items-center justify-end gap-1.5 group-hover:text-brand-primary transition-colors whitespace-nowrap",
                      isPremium ? "text-amber-400" : "text-gray-200"
                    )}
                  >
                    {userProfile?.avatarUrl && (
                      <div className="w-5 h-5 rounded-full overflow-hidden border border-brand-primary/50 bg-black/50 shrink-0">
                        <img src={userProfile.avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <span>{displayName}</span>
                    {isPremium && (
                      <span className="bg-amber-400/20 px-1 py-0.5 rounded border border-amber-400/30 text-[8px] font-black tracking-tighter uppercase leading-none">
                        PREMIUM
                      </span>
                    )}
                  </motion.div>
                </div>

                <div className="flex items-center gap-1">
                  {onOpenSubscriptionModal && (
                    <Button variant="ghost" size="icon" onClick={onOpenSubscriptionModal} className="hover:bg-white/5 text-brand-primary hover:text-white" title="Manage Subscription & Pricing">
                      <CreditCard className="w-4 h-4 text-brand-primary" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => setActiveTab('profile')} className={cn("hover:bg-white/5", activeTab === 'profile' ? "text-brand-primary bg-white/10" : "text-gray-400 hover:text-white")} title="Profile & Settings">
                    <Settings className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleSignOut} className="hidden sm:flex hover:bg-white/5 text-gray-400 hover:text-white" title="Sign Out">
                    <LogOut className="w-4 h-4" />
                  </Button>
                  
                  {/* Mobile Menu Toggle Button */}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
                    className="md:hidden text-gray-300 hover:text-white hover:bg-white/5 ml-1"
                    title="Toggle Menu"
                  >
                    {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
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

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {user && mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-white/10 bg-brand-surface/95 backdrop-blur-2xl px-6 py-4 space-y-3 shadow-2xl overflow-hidden"
          >
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 pb-1 border-b border-white/5">
              Navigation Menu
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={async () => {
                  setActiveTab('reports');
                  setStep('history');
                  await loadHistory();
                  setMobileMenuOpen(false);
                }}
                className={cn(
                  "justify-start gap-2.5 text-xs font-bold py-2.5 bg-white/5 border-white/10 text-gray-200",
                  activeTab === 'reports' && step === 'history' && "text-brand-primary border-brand-primary/40 bg-brand-primary/10"
                )}
              >
                <History className="w-4 h-4 text-brand-primary" />
                <span>My Reports</span>
              </Button>

              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setMobileMenuOpen(false);
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
                className={cn(
                  "justify-start gap-2.5 text-xs font-bold py-2.5 bg-white/5 border-white/10 text-gray-200",
                  activeTab === 'gym' && "text-brand-primary border-brand-primary/40 bg-brand-primary/10"
                )}
              >
                <Dumbbell className="w-4 h-4 text-emerald-400" />
                <span>Gym Hub</span>
                {!isPremium && <Lock className="w-3 h-3 text-gray-500 ml-auto" />}
              </Button>

              {userProfile?.membershipTier === 'trainer' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActiveTab('client');
                    setMobileMenuOpen(false);
                  }}
                  className={cn(
                    "justify-start gap-2.5 text-xs font-bold py-2.5 bg-amber-400/10 border-amber-400/30 text-amber-400 col-span-2",
                    activeTab === 'client' && "bg-amber-400/20 border-amber-400/50"
                  )}
                >
                  <Users className="w-4 h-4 text-amber-400" />
                  <span>Client Hub</span>
                </Button>
              )}

              {onOpenSubscriptionModal && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onOpenSubscriptionModal();
                    setMobileMenuOpen(false);
                  }}
                  className="justify-start gap-2.5 text-xs font-bold py-2.5 bg-brand-primary/10 border-brand-primary/30 text-brand-primary hover:bg-brand-primary/20 col-span-2 cursor-pointer"
                >
                  <CreditCard className="w-4 h-4 text-brand-primary" />
                  <span>Billing & Subscription Plans</span>
                </Button>
              )}

              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setActiveTab('profile');
                  setMobileMenuOpen(false);
                }}
                className={cn(
                  "justify-start gap-2.5 text-xs font-bold py-2.5 bg-white/5 border-white/10 text-gray-200",
                  activeTab === 'profile' && "text-brand-primary border-brand-primary/40 bg-brand-primary/10"
                )}
              >
                <Settings className="w-4 h-4 text-gray-300" />
                <span>Profile & Settings</span>
              </Button>

              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  handleSignOut();
                  setMobileMenuOpen(false);
                }}
                className="justify-start gap-2.5 text-xs font-bold py-2.5 bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
              >
                <LogOut className="w-4 h-4 text-red-400" />
                <span>Sign Out</span>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

