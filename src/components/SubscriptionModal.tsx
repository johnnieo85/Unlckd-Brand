import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Check, 
  ShieldCheck, 
  CreditCard, 
  Calendar, 
  RefreshCw, 
  AlertCircle, 
  ArrowRight, 
  ArrowLeft, 
  Lock, 
  CheckCircle2, 
  Receipt,
  Users,
  ChevronRight
} from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
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

  // Purchase Checkout State
  const [checkoutPlan, setCheckoutPlan] = useState<{
    plan: SubscriptionPlanType;
    band?: ClientCountBand;
  } | null>(null);

  const [checkoutCardName, setCheckoutCardName] = useState(userProfile?.fullName || '');
  const [checkoutCardNumber, setCheckoutCardNumber] = useState('•••• •••• •••• 4242');
  const [checkoutExpiry, setCheckoutExpiry] = useState('12/28');
  const [checkoutCvc, setCheckoutCvc] = useState('888');
  const [checkoutZip, setCheckoutZip] = useState('90210');
  const [purchaseComplete, setPurchaseComplete] = useState(false);

  if (!isOpen || !userProfile) return null;

  const currentPlan = userProfile.plan || 'free';
  const currentCycle = userProfile.billingCycle || 'monthly';
  const currentBand = userProfile.clientBand || '1-5';
  const currentStatus = userProfile.status || 'active';

  // Format Renewal Date cleanly
  const renewalDateFormatted = (() => {
    if (userProfile.renewalDate) {
      try {
        const d = new Date(userProfile.renewalDate + 'T00:00:00');
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
        }
      } catch {
        // Fallback
      }
      return userProfile.renewalDate.toUpperCase();
    }
    return '13 SEP 2026';
  })();

  const handleOpenCheckout = (
    targetPlan: SubscriptionPlanType,
    targetBand?: ClientCountBand
  ) => {
    if (targetPlan === 'free') {
      handleDirectPlanUpdate('free');
      return;
    }
    setCheckoutPlan({
      plan: targetPlan,
      band: targetPlan === 'coach' ? (targetBand || selectedCoachBand) : '1-5'
    });
    setPurchaseComplete(false);
  };

  const handleDirectPlanUpdate = async (
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
        `Plan updated to ${
          targetPlan === 'free'
            ? 'Free'
            : targetPlan === 'pro'
            ? 'Pro'
            : `Coach (${targetBand || selectedCoachBand} Clients)`
        }.`
      );
      setTimeout(() => setSuccessMessage(null), 4000);
      setCheckoutPlan(null);
    } catch (err) {
      console.error('Failed to update subscription:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCompletePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutPlan) return;

    setIsUpdating(true);
    try {
      const updated = await updateSubscriptionPlan(userProfile.userId, {
        plan: checkoutPlan.plan,
        billingCycle: selectedCycle,
        clientBand: checkoutPlan.plan === 'coach' ? (checkoutPlan.band || selectedCoachBand) : '1-5',
        status: 'active',
        cancelAtPeriodEnd: false
      });
      onProfileUpdated(updated);
      setPurchaseComplete(true);
      setSuccessMessage(`Payment confirmed. Welcome to ${checkoutPlan.plan === 'pro' ? 'Pro' : 'Coach'}.`);
    } catch (err) {
      console.error('Failed to complete purchase:', err);
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
          ? 'Membership will end at the conclusion of your current billing period.'
          : 'Membership reactivated.'
      );
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Failed to update cancellation state:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Pricing calculations for checkout view
  const checkoutPlanObj = checkoutPlan ? SUBSCRIPTION_PLANS.find(p => p.plan === checkoutPlan.plan) : null;
  const checkoutPriceObj = checkoutPlan ? getPriceForPlan(checkoutPlan.plan, selectedCycle, checkoutPlan.band) : null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 no-print overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-sm"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          className="relative w-full max-w-5xl bg-[#0D0D0D] border border-[#292929] rounded-[6px] shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col text-white"
        >
          {/* Header */}
          <div className="p-6 sm:p-8 border-b border-[#292929] bg-[#111111] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shrink-0">
            <div className="space-y-1.5 min-w-0">
              <span className="text-[11px] font-mono font-bold tracking-widest text-[#00DFA2] uppercase block">
                MEMBERSHIP
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-black text-white uppercase tracking-tight">
                {checkoutPlan ? 'SECURE CHECKOUT' : 'CHOOSE YOUR LEVEL.'}
              </h2>
              <p className="text-xs sm:text-sm text-[#A1A1A1] font-sans">
                {checkoutPlan 
                  ? 'Confirm your plan details and billing method to activate your account.'
                  : 'Training evolves. Your membership should too.'}
              </p>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
              {checkoutPlan && !purchaseComplete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCheckoutPlan(null)}
                  className="gap-1.5 text-xs font-mono font-bold border-[#292929] text-[#A1A1A1] hover:text-white"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>ALL PLANS</span>
                </Button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-[4px] border border-[#292929] bg-[#171717] text-[#A1A1A1] hover:text-white hover:border-[#444444] transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Success Banner */}
          {successMessage && !purchaseComplete && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-[#00DFA2]/10 border-b border-[#00DFA2]/30 px-6 py-3 text-[#00DFA2] text-xs font-mono font-bold flex items-center gap-2 shrink-0"
            >
              <Check className="w-4 h-4 text-[#00DFA2] shrink-0" />
              <span>{successMessage}</span>
            </motion.div>
          )}

          {/* Modal Body */}
          <div className="p-6 sm:p-8 space-y-8 overflow-y-auto">
            {/* CHECKOUT FLOW */}
            {checkoutPlan && checkoutPriceObj && checkoutPlanObj ? (
              purchaseComplete ? (
                /* RECEIPT SCREEN */
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-[#111111] border border-[#00DFA2]/40 rounded-[6px] p-8 sm:p-10 text-center space-y-6 shadow-2xl"
                >
                  <div className="w-14 h-14 bg-[#00DFA2]/10 text-[#00DFA2] border border-[#00DFA2]/30 rounded-[4px] flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono font-bold tracking-widest text-[#00DFA2] uppercase block">
                      PAYMENT CONFIRMED
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-display font-black text-white uppercase tracking-tight">
                      MEMBERSHIP ACTIVATED
                    </h3>
                    <p className="text-[#A1A1A1] text-xs max-w-md mx-auto">
                      Your account has been upgraded to <strong className="text-white">{checkoutPlanObj.name}</strong>. All features are active immediately.
                    </p>
                  </div>

                  {/* Clean Receipt Box */}
                  <div className="max-w-md mx-auto bg-[#080808] border border-[#292929] rounded-[4px] p-5 text-left text-xs space-y-3 font-mono">
                    <div className="flex items-center justify-between pb-2 border-b border-[#292929] text-[#6C6C6C] text-[10px]">
                      <span>TRANSACTION REF</span>
                      <span className="text-white">TXN-{Math.floor(100000 + Math.random() * 900000)}</span>
                    </div>
                    <div className="flex justify-between text-[#A1A1A1]">
                      <span>Plan:</span>
                      <span className="font-bold text-white uppercase">{checkoutPlanObj.name}</span>
                    </div>
                    <div className="flex justify-between text-[#A1A1A1]">
                      <span>Frequency:</span>
                      <span className="font-bold text-white uppercase">{selectedCycle}</span>
                    </div>
                    {checkoutPlan.plan === 'coach' && (
                      <div className="flex justify-between text-[#A1A1A1]">
                        <span>Client Capacity:</span>
                        <span className="font-bold text-purple-300">{checkoutPlan.band || selectedCoachBand} Clients</span>
                      </div>
                    )}
                    <div className="flex justify-between text-white pt-2 border-t border-[#292929] font-bold text-sm">
                      <span>Total Billed:</span>
                      <span className="text-[#00DFA2] font-mono font-black">${checkoutPriceObj.price.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Button
                      onClick={onClose}
                      className="font-mono font-bold text-xs uppercase px-8 py-3 bg-brand-primary text-black"
                    >
                      RETURN TO TRAINING
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setCheckoutPlan(null)}
                      className="font-mono font-bold text-xs uppercase border-[#292929] text-[#A1A1A1]"
                    >
                      VIEW MEMBERSHIP TIERS
                    </Button>
                  </div>
                </motion.div>
              ) : (
                /* CHECKOUT FORM */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* Left Column: Order Summary */}
                  <div className="lg:col-span-5 space-y-4">
                    <div className="bg-[#111111] border border-[#292929] rounded-[6px] p-6 space-y-6">
                      <div className="flex items-center justify-between pb-3 border-b border-[#292929]">
                        <span className="text-[11px] font-mono font-bold tracking-widest text-[#00DFA2] uppercase">
                          ORDER SUMMARY
                        </span>
                        <Badge variant="neutral" className="text-[9px] font-mono">
                          {selectedCycle.toUpperCase()}
                        </Badge>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <div className="text-xl font-display font-black text-white uppercase">
                            {checkoutPlanObj.name}
                          </div>
                          <p className="text-xs text-[#A1A1A1] mt-1">
                            {checkoutPlanObj.tagline}
                          </p>
                        </div>

                        {/* Frequency segmented toggle */}
                        <div className="bg-[#080808] p-1 rounded-[4px] border border-[#292929] flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedCycle('monthly')}
                            className={cn(
                              "flex-1 py-1.5 rounded-[3px] text-[11px] font-mono font-bold uppercase transition-colors cursor-pointer",
                              selectedCycle === 'monthly'
                                ? "bg-[#171717] text-white border border-[#333333]"
                                : "text-[#A1A1A1] hover:text-white"
                            )}
                          >
                            MONTHLY
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedCycle('annual')}
                            className={cn(
                              "flex-1 py-1.5 rounded-[3px] text-[11px] font-mono font-bold uppercase transition-colors flex items-center justify-center gap-1 cursor-pointer",
                              selectedCycle === 'annual'
                                ? "bg-[#171717] text-white border border-[#333333]"
                                : "text-[#A1A1A1] hover:text-white"
                            )}
                          >
                            <span>ANNUAL</span>
                            <span className="text-[9px] text-[#00DFA2]">SAVE 33%</span>
                          </button>
                        </div>

                        {/* Coach Band */}
                        {checkoutPlan.plan === 'coach' && (
                          <div className="p-3 bg-[#080808] border border-[#292929] rounded-[4px] flex items-center justify-between text-xs font-mono">
                            <span className="text-[#A1A1A1]">Client Roster:</span>
                            <span className="text-white font-bold">{checkoutPlan.band || selectedCoachBand} Clients</span>
                          </div>
                        )}

                        {/* Line Items */}
                        <div className="space-y-2 text-xs font-mono text-[#A1A1A1] pt-3 border-t border-[#292929]">
                          <div className="flex justify-between">
                            <span>Base Rate:</span>
                            <span className="text-white font-bold">${checkoutPriceObj.price.toFixed(2)}</span>
                          </div>
                          {selectedCycle === 'annual' && (
                            <div className="flex justify-between text-[#00DFA2]">
                              <span>Annual Savings:</span>
                              <span>Applied (33%)</span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm font-bold text-white pt-3 border-t border-[#292929]">
                            <span>Total Due:</span>
                            <span className="text-[#00DFA2] font-black">${checkoutPriceObj.price.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-3 bg-[#080808] border border-[#292929] rounded-[4px] space-y-1 text-xs text-[#A1A1A1]">
                        <div className="flex items-center gap-1.5 text-white font-bold">
                          <ShieldCheck className="w-3.5 h-3.5 text-[#00DFA2]" />
                          <span>Direct Activation</span>
                        </div>
                        <p className="text-[11px] text-[#6C6C6C]">
                          Immediate access upon confirmation. Manage or cancel renewal anytime.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Payment Form */}
                  <div className="lg:col-span-7">
                    <form onSubmit={handleCompletePurchase} className="bg-[#111111] border border-[#292929] rounded-[6px] p-6 sm:p-8 space-y-6">
                      <div className="flex items-center justify-between pb-3 border-b border-[#292929]">
                        <span className="text-[11px] font-mono font-bold tracking-widest text-white uppercase flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-brand-primary" />
                          PAYMENT DETAILS
                        </span>
                        <Badge variant="neutral" className="text-[9px] font-mono">
                          <Lock className="w-3 h-3 text-[#00DFA2] mr-1" /> ENCRYPTED
                        </Badge>
                      </div>

                      <div className="space-y-4">
                        {/* Name */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono font-bold text-[#A1A1A1] uppercase block">
                            Cardholder Name
                          </label>
                          <input
                            type="text"
                            required
                            value={checkoutCardName}
                            onChange={(e) => setCheckoutCardName(e.target.value)}
                            placeholder="Full Name"
                            className="w-full bg-[#080808] border border-[#292929] rounded-[4px] px-3.5 py-2 text-xs font-mono text-white placeholder-[#6C6C6C] focus:border-brand-primary outline-none"
                          />
                        </div>

                        {/* Card Number */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] font-mono text-[#A1A1A1] uppercase">
                            <span>Card Number</span>
                            <span className="text-[#6C6C6C]">VISA / MC / AMEX</span>
                          </div>
                          <input
                            type="text"
                            required
                            value={checkoutCardNumber}
                            onChange={(e) => setCheckoutCardNumber(e.target.value)}
                            placeholder="4242 4242 4242 4242"
                            className="w-full bg-[#080808] border border-[#292929] rounded-[4px] px-3.5 py-2 text-xs font-mono text-white placeholder-[#6C6C6C] focus:border-brand-primary outline-none"
                          />
                        </div>

                        {/* Expiry / CVC / Zip */}
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-mono font-bold text-[#A1A1A1] uppercase block">
                              Expiry
                            </label>
                            <input
                              type="text"
                              required
                              value={checkoutExpiry}
                              onChange={(e) => setCheckoutExpiry(e.target.value)}
                              placeholder="MM/YY"
                              className="w-full bg-[#080808] border border-[#292929] rounded-[4px] px-3 py-2 text-xs font-mono text-white placeholder-[#6C6C6C] text-center focus:border-brand-primary outline-none"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-mono font-bold text-[#A1A1A1] uppercase block">
                              CVC
                            </label>
                            <input
                              type="text"
                              required
                              value={checkoutCvc}
                              onChange={(e) => setCheckoutCvc(e.target.value)}
                              placeholder="CVC"
                              className="w-full bg-[#080808] border border-[#292929] rounded-[4px] px-3 py-2 text-xs font-mono text-white placeholder-[#6C6C6C] text-center focus:border-brand-primary outline-none"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-mono font-bold text-[#A1A1A1] uppercase block">
                              Postal Code
                            </label>
                            <input
                              type="text"
                              required
                              value={checkoutZip}
                              onChange={(e) => setCheckoutZip(e.target.value)}
                              placeholder="90210"
                              className="w-full bg-[#080808] border border-[#292929] rounded-[4px] px-3 py-2 text-xs font-mono text-white placeholder-[#6C6C6C] text-center focus:border-brand-primary outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-[#292929] space-y-3">
                        <Button
                          type="submit"
                          disabled={isUpdating}
                          className="w-full font-mono font-bold text-xs uppercase py-3 bg-brand-primary text-black hover:bg-[#00DFA2]/90 flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {isUpdating ? (
                            <div className="flex items-center gap-2">
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>PROCESSING...</span>
                            </div>
                          ) : (
                            <>
                              <Lock className="w-3.5 h-3.5" />
                              <span>PAY ${checkoutPriceObj.price.toFixed(2)} & ACTIVATE</span>
                            </>
                          )}
                        </Button>

                        <p className="text-[10px] font-mono text-[#6C6C6C] text-center uppercase tracking-wide">
                          RECURRING BILLING APPLIES UNTIL CANCELED.
                        </p>
                      </div>
                    </form>
                  </div>
                </div>
              )
            ) : (
              /* ============================================================ */
              /* EDITORIAL PRICING COLUMNS (3 COLUMNS)                        */
              /* ============================================================ */
              <div className="space-y-8">
                {/* Current Membership Header Banner */}
                <div className="bg-[#111111] border border-[#292929] rounded-[6px] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono font-bold tracking-widest text-[#A1A1A1] uppercase block">
                      CURRENT MEMBERSHIP
                    </span>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-lg font-display font-black text-white uppercase">
                        {currentPlan === 'free' ? 'START (FREE TIER)' : currentPlan === 'pro' ? 'PRO' : `COACH (${currentBand} CLIENTS)`}
                      </span>
                      <Badge variant={currentPlan === 'coach' ? 'coach' : currentPlan === 'pro' ? 'pro' : 'neutral'} className="text-[9px] font-mono">
                        {currentStatus.toUpperCase()}
                      </Badge>
                      <span className="text-xs font-mono text-[#A1A1A1]">
                        • RENEWS {renewalDateFormatted}
                      </span>
                    </div>
                  </div>

                  {/* Secondary cancellation trigger */}
                  {currentPlan !== 'free' && (
                    <div className="pt-2 sm:pt-0 border-t sm:border-t-0 border-[#292929]">
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={handleToggleCancel}
                        className={cn(
                          "text-[11px] font-mono font-bold uppercase transition-colors cursor-pointer",
                          userProfile.cancelAtPeriodEnd
                            ? "text-[#00DFA2] hover:underline"
                            : "text-[#A1A1A1] hover:text-white hover:underline"
                        )}
                      >
                        {userProfile.cancelAtPeriodEnd ? 'REACTIVATE MEMBERSHIP' : 'CANCEL AT PERIOD END'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Restrained Segmented Billing Control */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#292929] pb-5">
                  <div>
                    <span className="text-[11px] font-mono font-bold tracking-widest text-[#A1A1A1] uppercase block">
                      BILLING CYCLE
                    </span>
                    <p className="text-xs text-[#6C6C6C] font-sans">Save 33% with an annual commitment</p>
                  </div>

                  <div className="flex items-center bg-[#080808] p-1 rounded-[4px] border border-[#292929] w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setSelectedCycle('monthly')}
                      className={cn(
                        "flex-1 sm:flex-none px-4 py-1.5 rounded-[3px] text-xs font-mono font-bold uppercase transition-colors cursor-pointer",
                        selectedCycle === 'monthly'
                          ? "bg-[#171717] text-white border border-[#333333]"
                          : "text-[#A1A1A1] hover:text-white"
                      )}
                    >
                      MONTHLY
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCycle('annual')}
                      className={cn(
                        "flex-1 sm:flex-none px-4 py-1.5 rounded-[3px] text-xs font-mono font-bold uppercase transition-colors flex items-center justify-center gap-1.5 cursor-pointer",
                        selectedCycle === 'annual'
                          ? "bg-[#171717] text-white border border-[#333333]"
                          : "text-[#A1A1A1] hover:text-white"
                      )}
                    >
                      <span>ANNUAL</span>
                      <span className="text-[10px] text-[#00DFA2] font-mono">SAVE 33%</span>
                    </button>
                  </div>
                </div>

                {/* Editorial Columns */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                  
                  {/* -------------------------------------------------- */}
                  {/* 1. START ($0)                                      */}
                  {/* -------------------------------------------------- */}
                  <div className={cn(
                    "bg-[#111111] border rounded-[6px] p-6 flex flex-col justify-between transition-colors",
                    currentPlan === 'free' ? "border-[#444444]" : "border-[#292929]"
                  )}>
                    <div className="space-y-5">
                      <div>
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-display font-black text-white uppercase tracking-tight">
                            START
                          </h3>
                          {currentPlan === 'free' && (
                            <Badge variant="neutral" className="text-[9px] font-mono">
                              CURRENT
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-[#A1A1A1] mt-1">
                          Core baseline physique analysis
                        </p>
                      </div>

                      {/* Pricing */}
                      <div className="pt-3 border-t border-[#292929]">
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl sm:text-4xl font-mono font-black text-white">
                            $0
                          </span>
                        </div>
                        <p className="text-[10px] font-mono text-[#6C6C6C] uppercase mt-0.5">
                          FREE ALWAYS
                        </p>
                      </div>

                      {/* Benefits */}
                      <div className="space-y-2.5 pt-3 border-t border-[#292929]">
                        <span className="text-[10px] font-mono font-bold tracking-widest text-[#A1A1A1] uppercase block">
                          CORE BENEFITS
                        </span>
                        <ul className="space-y-2 text-xs text-[#A1A1A1] font-sans">
                          <li className="flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-white shrink-0 mt-0.5" />
                            <span>1 Full Transformation AI Report</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-white shrink-0 mt-0.5" />
                            <span>Basic Gym Hub workout tracking</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-white shrink-0 mt-0.5" />
                            <span>Personal meal & macro logging</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-white shrink-0 mt-0.5" />
                            <span>Standard processing queue</span>
                          </li>
                        </ul>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-6 mt-6 border-t border-[#292929]">
                      <Button
                        variant="outline"
                        disabled={isUpdating || currentPlan === 'free'}
                        onClick={() => handleDirectPlanUpdate('free')}
                        className="w-full min-h-[44px] text-xs font-mono font-bold tracking-wider uppercase border-[#292929] text-white hover:border-[#444444]"
                      >
                        {currentPlan === 'free' ? 'CURRENT PLAN' : 'GET STARTED →'}
                      </Button>
                    </div>
                  </div>

                  {/* -------------------------------------------------- */}
                  {/* 2. PRO ($14.99) - RECOMMENDED (Elevated & Scaled)  */}
                  {/* -------------------------------------------------- */}
                  <div className={cn(
                    "bg-[#171717] border-2 rounded-[6px] p-6 sm:p-7 flex flex-col justify-between relative transition-all shadow-2xl lg:-translate-y-2",
                    currentPlan === 'pro' 
                      ? "border-[#00DFA2]" 
                      : "border-[#00DFA2] shadow-[0_0_25px_rgba(0,223,162,0.12)]"
                  )}>
                    {/* Top Label */}
                    <div className="absolute -top-3 left-6">
                      <span className="bg-brand-primary text-black font-mono font-extrabold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-[3px] shadow">
                        RECOMMENDED
                      </span>
                    </div>

                    <div className="space-y-5">
                      <div>
                        <div className="flex items-center justify-between">
                          <h3 className="text-2xl font-display font-black text-white uppercase tracking-tight">
                            PRO
                          </h3>
                          {currentPlan === 'pro' && (
                            <Badge variant="pro" className="text-[9px] font-mono">
                              CURRENT
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-[#A1A1A1] mt-1">
                          For serious athletes & physique transformation
                        </p>
                      </div>

                      {/* Pricing */}
                      <div className="pt-3 border-t border-[#292929]">
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl sm:text-5xl font-mono font-black text-white tracking-tight">
                            {selectedCycle === 'annual' ? '$9.99' : '$14.99'}
                          </span>
                          <span className="text-xs font-mono font-bold text-brand-primary uppercase">
                            /MONTH
                          </span>
                        </div>
                        <p className="text-[10px] font-mono text-[#A1A1A1] mt-0.5">
                          {selectedCycle === 'annual' ? 'BILLED $119.88 ANNUALLY (SAVE 33%)' : 'BILLED MONTHLY • CANCEL ANYTIME'}
                        </p>
                      </div>

                      {/* Benefits */}
                      <div className="space-y-2.5 pt-3 border-t border-[#292929]">
                        <span className="text-[10px] font-mono font-bold tracking-widest text-[#00DFA2] uppercase block">
                          PREMIUM ATHLETE BENEFITS
                        </span>
                        <ul className="space-y-2 text-xs text-white font-sans">
                          <li className="flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-[#00DFA2] shrink-0 mt-0.5" />
                            <span className="font-semibold">Unlimited AI Transformation Reports</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-[#00DFA2] shrink-0 mt-0.5" />
                            <span>Full Gym Hub sync & progress logs</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-[#00DFA2] shrink-0 mt-0.5" />
                            <span>HD PDF report exports & printing</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-[#00DFA2] shrink-0 mt-0.5" />
                            <span>Advanced recovery protocols</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-[#00DFA2] shrink-0 mt-0.5" />
                            <span>Priority AI generation queue</span>
                          </li>
                        </ul>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-6 mt-6 border-t border-[#292929]">
                      <Button
                        variant="primary"
                        disabled={isUpdating || currentPlan === 'pro'}
                        onClick={() => handleOpenCheckout('pro')}
                        className="w-full min-h-[44px] text-xs font-mono font-black tracking-wider uppercase py-3 bg-brand-primary text-black hover:bg-[#00DFA2]/90 shadow-none cursor-pointer"
                      >
                        {currentPlan === 'pro' ? 'CURRENT PLAN' : 'CHOOSE PRO →'}
                      </Button>
                    </div>
                  </div>

                  {/* -------------------------------------------------- */}
                  {/* 3. COACH ($49+)                                    */}
                  {/* -------------------------------------------------- */}
                  <div className={cn(
                    "bg-[#111111] border rounded-[6px] p-6 flex flex-col justify-between transition-colors",
                    currentPlan === 'coach' ? "border-purple-500/50" : "border-[#292929]"
                  )}>
                    <div className="space-y-5">
                      <div>
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-display font-black text-white uppercase tracking-tight">
                            COACH
                          </h3>
                          {currentPlan === 'coach' && (
                            <Badge variant="coach" className="text-[9px] font-mono">
                              CURRENT
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-[#A1A1A1] mt-1">
                          Trainer & business management tools
                        </p>
                      </div>

                      {/* Simplified Client Roster Band Selector */}
                      <div className="space-y-1.5 pt-2 border-t border-[#292929]">
                        <div className="flex items-center justify-between text-[10px] font-mono text-[#A1A1A1] uppercase">
                          <span>CLIENT ROSTER</span>
                          <span className="text-white font-bold">{selectedCoachBand} CLIENTS</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {CLIENT_COUNT_BANDS.map((b) => (
                            <button
                              key={b.band}
                              type="button"
                              onClick={() => setSelectedCoachBand(b.band)}
                              className={cn(
                                "px-2.5 py-1.5 min-h-[38px] rounded-[3px] text-[10px] font-mono font-bold border transition-colors text-left cursor-pointer",
                                selectedCoachBand === b.band
                                  ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                                  : "bg-[#080808] border-[#292929] text-[#A1A1A1] hover:text-white"
                              )}
                            >
                              {b.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Pricing */}
                      <div className="pt-3 border-t border-[#292929]">
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl sm:text-4xl font-mono font-black text-white">
                            ${selectedCycle === 'annual'
                              ? CLIENT_COUNT_BANDS.find(b => b.band === selectedCoachBand)?.pricing.annualMonthlyEquivalent.toFixed(0)
                              : CLIENT_COUNT_BANDS.find(b => b.band === selectedCoachBand)?.pricing.monthlyPrice}
                          </span>
                          <span className="text-xs font-mono font-bold text-purple-300 uppercase">
                            /MONTH
                          </span>
                        </div>
                        <p className="text-[10px] font-mono text-[#6C6C6C] uppercase mt-0.5">
                          {selectedCycle === 'annual'
                            ? `BILLED $${CLIENT_COUNT_BANDS.find(b => b.band === selectedCoachBand)?.pricing.annualPrice} ANNUALLY`
                            : 'BILLED MONTHLY'}
                        </p>
                      </div>

                      {/* Benefits */}
                      <div className="space-y-2.5 pt-3 border-t border-[#292929]">
                        <span className="text-[10px] font-mono font-bold tracking-widest text-[#A1A1A1] uppercase block">
                          TRAINER & BUSINESS BENEFITS
                        </span>
                        <ul className="space-y-2 text-xs text-[#A1A1A1] font-sans">
                          <li className="flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                            <span>Everything in Pro included</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                            <span>Client Hub roster management</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                            <span>Push routines directly to clients</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                            <span>Custom branding on reports</span>
                          </li>
                        </ul>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-6 mt-6 border-t border-[#292929]">
                      <Button
                        variant="secondary"
                        disabled={isUpdating || (currentPlan === 'coach' && currentBand === selectedCoachBand)}
                        onClick={() => handleOpenCheckout('coach', selectedCoachBand)}
                        className="w-full min-h-[44px] text-xs font-mono font-bold tracking-wider uppercase border-[#292929] text-white hover:border-[#444444] cursor-pointer"
                      >
                        {currentPlan === 'coach' && currentBand === selectedCoachBand ? 'CURRENT PLAN' : 'CHOOSE COACH →'}
                      </Button>
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
