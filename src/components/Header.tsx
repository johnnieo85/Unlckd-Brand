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
  CreditCard,
  User as UserIcon,
  Home
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

  const isCoach = userProfile?.plan === 'coach' || userProfile?.membershipTier === 'trainer';

  const displayName = formatShortName(
    userProfile?.fullName || user?.displayName,
    user?.email
  );

  return (
    <>
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 w-full z-50 bg-[#080808]/95 backdrop-blur-md border-b border-[#292929] no-print">
        <div className="max-w-[1560px] mx-auto px-4 sm:px-8 lg:px-12 h-16 sm:h-20 flex items-center justify-between">
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
                className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-[#00DFA2]/10 border-[#00DFA2]/30 text-brand-primary rounded-[4px] text-xs font-bold hover:bg-[#00DFA2]/20 transition-colors cursor-pointer"
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
              className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 bg-[#171717] border border-[#292929] rounded-[4px] text-xs font-bold text-[#A1A1A1] hover:text-white hover:border-[#444] transition-colors"
            >
              Get Access
              <ExternalLink className="w-3 h-3" />
            </a>

            {user ? (
              <>
                {/* Desktop Nav Items */}
                <div className="hidden md:flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={async () => {
                      setActiveTab('reports');
                      setStep('history');
                      await loadHistory();
                    }}
                    className={cn(
                      "gap-2 text-xs font-bold rounded-[4px] uppercase tracking-wider", 
                      activeTab === 'reports' && step === 'history' ? "text-brand-primary bg-[#171717] border border-[#292929]" : "text-[#A1A1A1] hover:text-white"
                    )}
                  >
                    <History className="w-3.5 h-3.5" />
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
                    className={cn(
                      "gap-2 text-xs font-bold rounded-[4px] uppercase tracking-wider", 
                      activeTab === 'gym' ? "text-brand-primary bg-[#171717] border border-[#292929]" : "text-[#A1A1A1] hover:text-white"
                    )}
                  >
                    <Dumbbell className="w-3.5 h-3.5" />
                    Gym Hub
                    {!isPremium && <Lock className="w-3 h-3 text-[#6C6C6C]" />}
                  </Button>

                  {userProfile?.membershipTier === 'trainer' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveTab('client')}
                      className={cn(
                        "gap-2 text-xs font-bold rounded-[4px] uppercase tracking-wider text-amber-400 hover:bg-[#171717]", 
                        activeTab === 'client' && "bg-amber-400/10 text-amber-400 border border-amber-400/30"
                      )}
                    >
                      Client Hub
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 border-l border-[#292929]">
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
                          <Badge variant="active" className="text-[8px] h-3.5 px-1 py-0 border-[#00DFA2]/30 bg-[#00DFA2]/10 text-brand-primary uppercase font-bold leading-none hover:bg-[#00DFA2]/20 transition-colors">
                            Lvl {getLevelInfo(userProfile.xp || 0).level}
                          </Badge>
                        </span>
                      )}
                      {isCoach ? (
                        <Badge variant="coach" className="text-[8px] h-3.5 px-1 py-0">Coach</Badge>
                      ) : hasAccess ? (
                        <Badge variant="pro" className="text-[8px] h-3.5 px-1 py-0">Pro</Badge>
                      ) : (
                        <Badge variant="danger" className="text-[8px] h-3.5 px-1 py-0">Restricted</Badge>
                      )}
                    </div>
                    <div 
                      className={cn(
                        "text-xs font-bold flex items-center justify-end gap-1.5 transition-colors whitespace-nowrap",
                        isCoach ? "text-purple-300 group-hover:text-purple-200" : isPremium ? "text-amber-400 group-hover:text-white" : "text-white group-hover:text-brand-primary"
                      )}
                    >
                      {userProfile?.avatarUrl && (
                        <div className={cn(
                          "w-5 h-5 rounded-full overflow-hidden border bg-black shrink-0",
                          isCoach ? "border-purple-400/80" : "border-[#292929]"
                        )}>
                          <img src={userProfile.avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <span className={isCoach ? "text-purple-300" : ""}>{displayName}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {onOpenSubscriptionModal && (
                      <Button variant="ghost" size="icon" onClick={onOpenSubscriptionModal} className="hidden sm:flex hover:bg-[#171717] text-brand-primary hover:text-white" title="Billing & Purchase Plans">
                        <CreditCard className="w-4 h-4 text-brand-primary" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => setActiveTab('profile')} className={cn("hidden sm:flex hover:bg-[#171717]", activeTab === 'profile' ? "text-brand-primary bg-[#171717]" : "text-[#A1A1A1] hover:text-white")} title="Profile & Settings">
                      <Settings className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleSignOut} className="hidden sm:flex hover:bg-[#171717] text-[#A1A1A1] hover:text-white" title="Sign Out">
                      <LogOut className="w-4 h-4" />
                    </Button>
                    
                    {/* Mobile Menu Toggle Button */}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
                      className="md:hidden text-[#A1A1A1] hover:text-white hover:bg-[#171717] ml-1 h-10 w-10"
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
                className="gap-2 bg-brand-primary text-black font-bold hover:bg-brand-accent rounded-[4px] min-h-[40px] px-4"
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
              className="md:hidden border-t border-[#292929] bg-[#111111] px-4 py-4 space-y-3 shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-widest text-[#6C6C6C] pb-2 border-b border-[#292929]">
                <span>Logged in as {displayName}</span>
                <span>Level {getLevelInfo(userProfile?.xp || 0).level}</span>
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
                    "justify-start gap-2.5 text-xs font-bold py-3 min-h-[44px] bg-[#171717] border-[#292929] text-white rounded-[4px]",
                    activeTab === 'reports' && step === 'history' && "text-brand-primary border-brand-primary/40 bg-[#00DFA2]/10"
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
                    "justify-start gap-2.5 text-xs font-bold py-3 min-h-[44px] bg-[#171717] border-[#292929] text-white rounded-[4px]",
                    activeTab === 'gym' && "text-brand-primary border-brand-primary/40 bg-[#00DFA2]/10"
                  )}
                >
                  <Dumbbell className="w-4 h-4 text-brand-primary" />
                  <span>Gym Hub</span>
                  {!isPremium && <Lock className="w-3 h-3 text-[#6C6C6C] ml-auto" />}
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
                      "justify-start gap-2.5 text-xs font-bold py-3 min-h-[44px] bg-amber-400/10 border-amber-400/30 text-amber-400 col-span-2 rounded-[4px]",
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
                    className="justify-start gap-2.5 text-xs font-bold py-3 min-h-[44px] bg-[#00DFA2]/10 border-[#00DFA2]/30 text-brand-primary hover:bg-[#00DFA2]/20 col-span-2 rounded-[4px] cursor-pointer"
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
                    "justify-start gap-2.5 text-xs font-bold py-3 min-h-[44px] bg-[#171717] border-[#292929] text-white rounded-[4px]",
                    activeTab === 'profile' && "text-brand-primary border-brand-primary/40 bg-[#00DFA2]/10"
                  )}
                >
                  <Settings className="w-4 h-4 text-[#A1A1A1]" />
                  <span>Profile</span>
                </Button>

                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    handleSignOut();
                    setMobileMenuOpen(false);
                  }}
                  className="justify-start gap-2.5 text-xs font-bold py-3 min-h-[44px] bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-[4px]"
                >
                  <LogOut className="w-4 h-4 text-red-400" />
                  <span>Sign Out</span>
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Persistent Mobile Bottom Navigation (≥44px touch targets, high contrast, clean icons) */}
      {user && (
        <nav 
          aria-label="Mobile Navigation" 
          className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#080808]/95 backdrop-blur-xl border-t border-[#292929] px-2 py-1.5 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.8)] no-print"
        >
          <div className="flex items-center justify-around max-w-lg mx-auto">
            {/* 1. Reports / Home */}
            <button
              type="button"
              onClick={async () => {
                setActiveTab('reports');
                setStep('history');
                await loadHistory();
              }}
              className={cn(
                "flex flex-col items-center justify-center min-h-[48px] min-w-[56px] py-1 px-2 rounded-[4px] transition-colors cursor-pointer",
                activeTab === 'reports' && step === 'history'
                  ? "text-[#00DFA2] bg-[#00DFA2]/10"
                  : "text-[#A1A1A1] hover:text-white"
              )}
            >
              <History className="w-5 h-5 mb-0.5" />
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider">Reports</span>
            </button>

            {/* 2. Gym Hub */}
            <button
              type="button"
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
              className={cn(
                "flex flex-col items-center justify-center min-h-[48px] min-w-[56px] py-1 px-2 rounded-[4px] transition-colors cursor-pointer",
                activeTab === 'gym'
                  ? "text-[#00DFA2] bg-[#00DFA2]/10"
                  : "text-[#A1A1A1] hover:text-white"
              )}
            >
              <Dumbbell className="w-5 h-5 mb-0.5" />
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider">Gym Hub</span>
            </button>

            {/* 3. Clients (if trainer/coach) */}
            {isCoach && (
              <button
                type="button"
                onClick={() => setActiveTab('client')}
                className={cn(
                  "flex flex-col items-center justify-center min-h-[48px] min-w-[56px] py-1 px-2 rounded-[4px] transition-colors cursor-pointer",
                  activeTab === 'client'
                    ? "text-purple-400 bg-purple-500/10"
                    : "text-[#A1A1A1] hover:text-white"
                )}
              >
                <Users className="w-5 h-5 mb-0.5" />
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider">Clients</span>
              </button>
            )}

            {/* 4. Profile */}
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={cn(
                "flex flex-col items-center justify-center min-h-[48px] min-w-[56px] py-1 px-2 rounded-[4px] transition-colors cursor-pointer",
                activeTab === 'profile'
                  ? "text-[#00DFA2] bg-[#00DFA2]/10"
                  : "text-[#A1A1A1] hover:text-white"
              )}
            >
              <UserIcon className="w-5 h-5 mb-0.5" />
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider">Profile</span>
            </button>

            {/* 5. Plans / Membership */}
            {onOpenSubscriptionModal && (
              <button
                type="button"
                onClick={onOpenSubscriptionModal}
                className="flex flex-col items-center justify-center min-h-[48px] min-w-[56px] py-1 px-2 rounded-[4px] text-[#A1A1A1] hover:text-[#00DFA2] transition-colors cursor-pointer"
              >
                <CreditCard className="w-5 h-5 mb-0.5 text-brand-primary" />
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider">Plans</span>
              </button>
            )}
          </div>
        </nav>
      )}
    </>
  );
};
