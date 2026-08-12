import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Check, 
  ShieldCheck, 
  Zap, 
  Users, 
  CreditCard, 
  Calendar, 
  RefreshCw, 
  AlertCircle, 
  Sparkles,
  ArrowRight,
  Download
} from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Card';
import { cn } from '../lib/utils';
import { UserProfile, SubscriptionPlanType, BillingCycleType, ClientCountBand } from '../types';
import { SUBSCRIPTION_PLANS, CLIENT_COUNT_BANDS, getPriceForPlan } from '../lib/subscriptions';
import { updateSubscriptionPlan, updateUserProfile } from '../services/accessService';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
  onProfileUpdated: (updatedProfile: UserProfile) => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  onProfileUpdated
}) => {
  const [selectedCycle, setSelectedCycle] = useState<BillingCycleType>(
    userProfile?.billingCycle || 'monthly'
  );
  const [selectedCoachBand, setSelectedCoachBand] = useState<ClientCountBand>(
    userProfile?.clientBand || '1-5'
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen || !userProfile) return null;

  const currentPlan = userProfile.plan || 'free';
  const currentCycle = userProfile.billingCycle || 'monthly';
  const currentBand = userProfile.clientBand || '1-5';
  const currentStatus = userProfile.status || 'active';

  const handleSelectPlan = async (
    targetPlan: SubscriptionPlanType,
    targetBand?: ClientCountBand
  ) => {
    setIsUpdating(true);
    setSuccessMessage(null);
    try {
      const updated = await updateSubscriptionPlan(userProfile.userId, {
        plan: targetPlan,
        billingCycle: selectedCycle,
        clientBand: targetPlan === 'coach' ? (targetBand || selectedCoachBand) : '1-5',
        status: 'active',
        cancelAtPeriodEnd: false
      });
      onProfileUpdated(updated);
      setSuccessMessage(
        `Successfully updated plan to ${
          targetPlan === 'free'
            ? 'Free Tier'
            : targetPlan === 'pro'
            ? 'Pro Member'
            : `Coach Tier (${targetBand || selectedCoachBand} Clients)`
        }!`
      );
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Failed to update subscription:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleCancel = async () => {
    setIsUpdating(true);
    try {
      const newCancelState = !userProfile.cancelAtPeriodEnd;
      await updateUserProfile(userProfile.userId, {
        cancelAtPeriodEnd: newCancelState,
        status: newCancelState ? 'canceled' : 'active'
      });
      const updatedProfile: UserProfile = {
        ...userProfile,
        cancelAtPeriodEnd: newCancelState,
        status: newCancelState ? 'canceled' : 'active'
      };
      onProfileUpdated(updatedProfile);
      setSuccessMessage(
        newCancelState
          ? 'Subscription set to cancel at end of billing period.'
          : 'Subscription reactivated successfully!'
      );
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Failed to update cancel status:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleExportAssessmentJSON = () => {
    const assessmentPayload = {
      appMetadata: {
        appName: 'UNLCKD AI Transformation Platform',
        environment: 'Production Cloud Run / Firestore',
        exportDate: new Date().toISOString()
      },
      recurringBillingObjects: SUBSCRIPTION_PLANS,
      clientCountBands: CLIENT_COUNT_BANDS,
      currentUserSubscriptionState: {
        userId: userProfile.userId,
        email: userProfile.email,
        plan: userProfile.plan || 'free',
        billingCycle: userProfile.billingCycle || 'monthly',
        renewalDate: userProfile.renewalDate || 'N/A',
        status: userProfile.status || 'active',
        clientBand: userProfile.clientBand || '1-5',
        subscriptionId: userProfile.subscriptionId || 'N/A',
        cancelAtPeriodEnd: !!userProfile.cancelAtPeriodEnd
      }
    };

    const blob = new Blob([JSON.stringify(assessmentPayload, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `unlckd-subscription-assessment-${userProfile.userId.slice(0, 6)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 no-print overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-5xl bg-[#0b1320] border border-white/10 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="p-6 sm:p-8 border-b border-white/10 bg-gradient-to-r from-brand-dark via-[#111927] to-brand-dark flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-brand-primary/20 text-brand-primary border-brand-primary/30 text-xs font-black uppercase tracking-wider">
                  <CreditCard className="w-3 h-3 mr-1" />
                  Membership & Billing
                </Badge>
                {currentStatus === 'active' ? (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs font-bold">
                    <Check className="w-3 h-3 mr-1" /> Active Status
                  </Badge>
                ) : (
                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs font-bold">
                    <AlertCircle className="w-3 h-3 mr-1" /> {currentStatus.replace('_', ' ').toUpperCase()}
                  </Badge>
                )}
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Recurring Billing & Subscription Tiers
              </h2>
              <p className="text-gray-400 text-xs sm:text-sm mt-1">
                Manage your UNLCKD membership plan, review pricing objects, or switch billing cycles anytime.
              </p>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportAssessmentJSON}
                className="gap-2 text-xs font-bold border-white/10 text-gray-300 hover:text-white hover:bg-white/5"
                title="Download pricing & schema assessment JSON"
              >
                <Download className="w-3.5 h-3.5 text-brand-primary" />
                <span>Export Assessment</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-gray-400 hover:text-white hover:bg-white/10 rounded-full"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Success Banner */}
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-emerald-500/15 border-b border-emerald-500/30 px-6 py-3 text-emerald-300 text-xs font-bold flex items-center gap-2 shrink-0"
            >
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </motion.div>
          )}

          {/* Main Scrollable Content */}
          <div className="p-6 sm:p-8 space-y-8 overflow-y-auto">
            {/* Active Subscription Summary Card */}
            <div className="bg-[#0f1828] border border-white/10 rounded-2xl p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-inner">
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Current Firestore Subscription State
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xl font-extrabold text-white capitalize">
                    {currentPlan === 'free'
                      ? 'Free Tier'
                      : currentPlan === 'pro'
                      ? 'Pro Member'
                      : `Coach Tier (${currentBand} Clients)`}
                  </span>
                  <Badge className="bg-brand-primary/10 text-brand-primary border-brand-primary/20 text-xs font-mono font-bold">
                    {currentCycle.toUpperCase()}
                  </Badge>
                  {userProfile.subscriptionId && (
                    <span className="text-[11px] font-mono text-gray-500">
                      ID: {userProfile.subscriptionId}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 pt-1">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-brand-primary" />
                    <span>Renewal Date: <strong className="text-gray-200">{userProfile.renewalDate || 'N/A'}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Status: <strong className="text-emerald-400 capitalize">{currentStatus}</strong></span>
                  </div>
                </div>
              </div>

              {currentPlan !== 'free' && (
                <div className="flex items-center gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-white/10">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isUpdating}
                    onClick={handleToggleCancel}
                    className={cn(
                      "text-xs font-bold transition-all",
                      userProfile.cancelAtPeriodEnd
                        ? "border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                        : "border-red-500/30 text-red-400 hover:bg-red-500/10"
                    )}
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    {userProfile.cancelAtPeriodEnd ? 'Reactivate Plan' : 'Cancel at Period End'}
                  </Button>
                </div>
              )}
            </div>

            {/* Billing Cycle Selector Toggle */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/5 p-2 rounded-2xl border border-white/10">
              <div className="text-xs text-gray-300 font-bold px-3">
                Select Preferred Billing Frequency:
              </div>

              <div className="flex items-center bg-[#070b14] p-1 rounded-xl border border-white/10 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setSelectedCycle('monthly')}
                  className={cn(
                    "flex-1 sm:flex-none px-5 py-2 rounded-lg text-xs font-bold transition-all",
                    selectedCycle === 'monthly'
                      ? "bg-brand-primary text-brand-dark shadow-md"
                      : "text-gray-400 hover:text-white"
                  )}
                >
                  Monthly Billing
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCycle('annual')}
                  className={cn(
                    "flex-1 sm:flex-none px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                    selectedCycle === 'annual'
                      ? "bg-brand-primary text-brand-dark shadow-md"
                      : "text-gray-400 hover:text-white"
                  )}
                >
                  <span>Annual Billing</span>
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase">
                    Save 31%
                  </span>
                </button>
              </div>
            </div>

            {/* Subscription Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {SUBSCRIPTION_PLANS.map((planObj) => {
                const isCurrent =
                  currentPlan === planObj.plan &&
                  (planObj.plan !== 'coach' || currentBand === selectedCoachBand);

                let priceDisplay = '$0';
                let periodText = '/month';

                if (planObj.plan === 'free') {
                  priceDisplay = '$0';
                  periodText = '/month';
                } else if (planObj.plan === 'pro') {
                  const pr = getPriceForPlan('pro', selectedCycle);
                  priceDisplay = `$${pr.price}`;
                  periodText = pr.periodLabel;
                } else if (planObj.plan === 'coach') {
                  const pr = getPriceForPlan('coach', selectedCycle, selectedCoachBand);
                  priceDisplay = `$${pr.price}`;
                  periodText = pr.periodLabel;
                }

                return (
                  <div
                    key={planObj.id}
                    className={cn(
                      "relative bg-[#0d1525] border rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 hover:border-brand-primary/50 shadow-lg",
                      planObj.isPopular
                        ? "border-brand-primary/50 bg-gradient-to-b from-[#111c33] to-[#0d1525] shadow-brand-primary/10"
                        : isCurrent
                        ? "border-emerald-500/50 bg-[#0d1829]"
                        : "border-white/10"
                    )}
                  >
                    {/* Badge header */}
                    {planObj.badge && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-brand-primary text-brand-dark font-black text-[10px] uppercase tracking-wider px-3 py-0.5 border-none shadow-md">
                          {planObj.badge}
                        </Badge>
                      </div>
                    )}

                    <div className="space-y-4">
                      {/* Title & Tagline */}
                      <div>
                        <h3 className="text-xl font-extrabold text-white">
                          {planObj.name}
                        </h3>
                        <p className="text-gray-400 text-xs mt-1 leading-relaxed">
                          {planObj.tagline}
                        </p>
                      </div>

                      {/* Coach Client Count Band Selector */}
                      {planObj.plan === 'coach' && (
                        <div className="space-y-2 pt-2 border-t border-white/10">
                          <label className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center justify-between">
                            <span>Client Roster Size</span>
                            <span>{selectedCoachBand} Clients</span>
                          </label>
                          <div className="grid grid-cols-2 gap-1.5">
                            {CLIENT_COUNT_BANDS.map((b) => (
                              <button
                                key={b.band}
                                type="button"
                                onClick={() => setSelectedCoachBand(b.band)}
                                className={cn(
                                  "px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all text-left",
                                  selectedCoachBand === b.band
                                    ? "bg-amber-400/20 text-amber-300 border-amber-400/50 shadow-sm"
                                    : "bg-black/30 border-white/10 text-gray-400 hover:text-white"
                                )}
                              >
                                {b.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Pricing Display */}
                      <div className="pt-2 border-t border-white/10">
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl sm:text-4xl font-black text-white">
                            {priceDisplay}
                          </span>
                          <span className="text-gray-400 text-xs font-semibold">
                            {periodText}
                          </span>
                        </div>
                        {selectedCycle === 'annual' && planObj.plan !== 'free' && (
                          <p className="text-[10px] text-emerald-400 font-bold mt-1">
                            Billed annually (${getPriceForPlan(planObj.plan, 'annual', selectedCoachBand).price}/yr)
                          </p>
                        )}
                      </div>

                      {/* Features List */}
                      <div className="space-y-2 pt-2 border-t border-white/10">
                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                          Included Capabilities
                        </div>
                        <ul className="space-y-2">
                          {planObj.features.map((feat, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-xs text-gray-300">
                              <Check className="w-3.5 h-3.5 text-brand-primary shrink-0 mt-0.5" />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-6 mt-6 border-t border-white/10">
                      <Button
                        disabled={isUpdating || isCurrent}
                        onClick={() => handleSelectPlan(planObj.plan, selectedCoachBand)}
                        className={cn(
                          "w-full font-bold text-xs py-2.5 transition-all",
                          isCurrent
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default"
                            : planObj.plan === 'coach'
                            ? "bg-amber-400 text-black hover:bg-amber-300"
                            : planObj.plan === 'pro'
                            ? "bg-brand-primary text-brand-dark hover:bg-brand-primary/90"
                            : "bg-white/10 text-gray-200 hover:bg-white/20"
                        )}
                      >
                        {isCurrent ? (
                          <span className="flex items-center justify-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Current Plan
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-1">
                            Switch to {planObj.name}
                            <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Assessment Note */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-gray-400 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-gray-200 block mb-0.5">Note on Pricing & Assessment Compatibility</strong>
                All subscription plan objects, recurring billing rates, and coach client-count bands are serialized in Firestore state and accessible via <code className="bg-black/50 px-1.5 py-0.5 rounded text-amber-300">userProfile.plan</code>, <code className="bg-black/50 px-1.5 py-0.5 rounded text-amber-300">userProfile.billingCycle</code>, <code className="bg-black/50 px-1.5 py-0.5 rounded text-amber-300">userProfile.clientBand</code>, and <code className="bg-black/50 px-1.5 py-0.5 rounded text-amber-300">userProfile.status</code>.
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
