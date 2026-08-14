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
  ArrowLeft,
  Download,
  Lock,
  CheckCircle2,
  Receipt
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
        `Successfully updated plan to ${
          targetPlan === 'free'
            ? 'Free Tier'
            : targetPlan === 'pro'
            ? 'Pro Member'
            : `Coach Tier (${targetBand || selectedCoachBand} Clients)`
        }!`
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
      setSuccessMessage(`Payment successful! Welcome to UNLCKD ${checkoutPlan.plan === 'pro' ? 'Pro Member' : 'Coach Tier'}.`);
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
                {checkoutPlan ? (
                  <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs font-bold">
                    Step 2 of 2: Purchase Checkout
                  </Badge>
                ) : currentStatus === 'active' ? (
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
                {checkoutPlan ? 'Complete Plan Purchase' : 'Purchase & Manage Membership Plans'}
              </h2>
              <p className="text-gray-400 text-xs sm:text-sm mt-1">
                {checkoutPlan 
                  ? 'Review your plan selection, choose billing frequency, and complete your secure checkout.'
                  : 'Select a plan below to purchase, upgrade, or manage your recurring subscription.'}
              </p>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              {checkoutPlan && !purchaseComplete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCheckoutPlan(null)}
                  className="gap-1.5 text-xs font-bold border-white/10 text-gray-300 hover:text-white hover:bg-white/5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Plans</span>
                </Button>
              )}
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
          {successMessage && !purchaseComplete && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-emerald-500/15 border-b border-emerald-500/30 px-6 py-3 text-emerald-300 text-xs font-bold flex items-center gap-2 shrink-0"
            >
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </motion.div>
          )}

          {/* Main Content Area */}
          <div className="p-6 sm:p-8 space-y-8 overflow-y-auto">
            {/* IF IN CHECKOUT MODE */}
            {checkoutPlan && checkoutPriceObj && checkoutPlanObj ? (
              purchaseComplete ? (
                /* PURCHASE SUCCESS RECEIPT SCREEN */
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-[#0f192b] border border-emerald-500/40 rounded-3xl p-8 sm:p-10 text-center space-y-6 shadow-2xl"
                >
                  <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>

                  <div className="space-y-2">
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs font-black uppercase tracking-wider">
                      Payment Confirmed
                    </Badge>
                    <h3 className="text-2xl sm:text-3xl font-black text-white">
                      Purchase Successful!
                    </h3>
                    <p className="text-gray-300 text-sm max-w-lg mx-auto">
                      Thank you for purchasing <strong className="text-amber-300">{checkoutPlanObj.name}</strong>. Your UNLCKD account features have been unlocked instantly!
                    </p>
                  </div>

                  {/* Receipt Box */}
                  <div className="max-w-md mx-auto bg-black/40 border border-white/10 rounded-2xl p-5 text-left text-xs space-y-3 font-mono">
                    <div className="flex items-center justify-between pb-2 border-b border-white/10 text-gray-400">
                      <span>Transaction ID</span>
                      <span className="text-gray-200">TXN-UNLCKD-{Math.floor(100000 + Math.random() * 900000)}</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Plan Selected:</span>
                      <span className="font-bold text-white capitalize">{checkoutPlanObj.name}</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Billing Frequency:</span>
                      <span className="font-bold text-white capitalize">{selectedCycle}</span>
                    </div>
                    {checkoutPlan.plan === 'coach' && (
                      <div className="flex justify-between text-gray-300">
                        <span>Client Roster Size:</span>
                        <span className="font-bold text-amber-400">{checkoutPlan.band || selectedCoachBand} Clients</span>
                      </div>
                    )}
                    <div className="flex justify-between text-gray-300 pt-2 border-t border-white/10 font-sans font-extrabold text-sm text-white">
                      <span>Total Billed Today:</span>
                      <span className="text-emerald-400">${checkoutPriceObj.price.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Button
                      onClick={onClose}
                      className="bg-brand-primary text-brand-dark font-extrabold text-sm py-3 px-8 hover:bg-brand-primary/90 rounded-xl shadow-lg shadow-brand-primary/20"
                    >
                      Start Using UNLCKD Now
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setCheckoutPlan(null)}
                      className="text-xs border-white/20 text-gray-300 hover:text-white"
                    >
                      View All Plans & Receipts
                    </Button>
                  </div>
                </motion.div>
              ) : (
                /* CHECKOUT & PAYMENT FORM VIEW */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* Left Column: Order Summary */}
                  <div className="lg:col-span-5 space-y-6">
                    <div className="bg-[#0f1828] border border-white/10 rounded-2xl p-6 space-y-6">
                      <div className="flex items-center justify-between pb-4 border-b border-white/10">
                        <h3 className="text-lg font-black text-white flex items-center gap-2">
                          <Receipt className="w-5 h-5 text-brand-primary" />
                          Order Summary
                        </h3>
                        <Badge className="bg-brand-primary/10 text-brand-primary border-brand-primary/20 text-xs font-mono font-bold">
                          {selectedCycle.toUpperCase()}
                        </Badge>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <div className="text-xl font-extrabold text-white">
                            {checkoutPlanObj.name}
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            {checkoutPlanObj.tagline}
                          </p>
                        </div>

                        {/* Billing Frequency Switcher inside Order Summary */}
                        <div className="bg-black/40 p-1.5 rounded-xl border border-white/10 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedCycle('monthly')}
                            className={cn(
                              "flex-1 py-1.5 rounded-lg text-xs font-bold transition-all",
                              selectedCycle === 'monthly'
                                ? "bg-brand-primary text-brand-dark shadow"
                                : "text-gray-400 hover:text-white"
                            )}
                          >
                            Monthly Billing
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedCycle('annual')}
                            className={cn(
                              "flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1",
                              selectedCycle === 'annual'
                                ? "bg-brand-primary text-brand-dark shadow"
                                : "text-gray-400 hover:text-white"
                            )}
                          >
                            <span>Annual</span>
                            <span className="bg-emerald-500/20 text-emerald-300 text-[9px] px-1 rounded uppercase">
                              Save 33%
                            </span>
                          </button>
                        </div>

                        {/* Coach Band Summary */}
                        {checkoutPlan.plan === 'coach' && (
                          <div className="p-3 bg-amber-400/10 border border-amber-400/20 rounded-xl flex items-center justify-between text-xs">
                            <span className="text-amber-300 font-bold">Selected Client Roster:</span>
                            <span className="text-white font-extrabold">{checkoutPlan.band || selectedCoachBand} Clients</span>
                          </div>
                        )}

                        {/* Line Items */}
                        <div className="space-y-2.5 text-xs text-gray-300 pt-3 border-t border-white/10">
                          <div className="flex justify-between">
                            <span>Base Plan Price ({selectedCycle}):</span>
                            <span className="font-bold text-white">${checkoutPriceObj.price.toFixed(2)}</span>
                          </div>
                          {selectedCycle === 'annual' && (
                            <div className="flex justify-between text-emerald-400 font-bold">
                              <span>Annual Savings Discount:</span>
                              <span>Included</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span>Taxes & Processing Fees:</span>
                            <span className="text-gray-400">$0.00</span>
                          </div>
                          <div className="flex justify-between text-base font-black text-white pt-3 border-t border-white/10">
                            <span>Total Due Today:</span>
                            <span className="text-emerald-400">${checkoutPriceObj.price.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Guarantees */}
                      <div className="p-4 bg-white/5 rounded-xl space-y-2 text-xs text-gray-400">
                        <div className="flex items-center gap-2 text-gray-200 font-bold">
                          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>Instant Unlocked Access</span>
                        </div>
                        <p className="text-[11px] leading-relaxed">
                          Your membership updates immediately. Cancel anytime directly in your profile settings with 1 click.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Payment Details Form */}
                  <div className="lg:col-span-7 space-y-6">
                    <form onSubmit={handleCompletePurchase} className="bg-[#0f1828] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6">
                      <div className="flex items-center justify-between pb-4 border-b border-white/10">
                        <h3 className="text-lg font-black text-white flex items-center gap-2">
                          <CreditCard className="w-5 h-5 text-brand-primary" />
                          Payment Details
                        </h3>
                        <div className="flex items-center gap-1.5">
                          <Badge className="bg-black/60 text-gray-300 border-white/10 text-[10px] font-mono">
                            <Lock className="w-3 h-3 text-emerald-400 mr-1" /> 256-Bit SSL
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {/* Name on Card */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                            Cardholder Name
                          </label>
                          <input
                            type="text"
                            required
                            value={checkoutCardName}
                            onChange={(e) => setCheckoutCardName(e.target.value)}
                            placeholder="Full Name on Credit Card"
                            className="w-full bg-black/40 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-primary transition-colors"
                          />
                        </div>

                        {/* Card Number */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center justify-between">
                            <span>Card Number</span>
                            <span className="text-[10px] text-gray-400 font-mono">Visa, Mastercard, Amex</span>
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              required
                              value={checkoutCardNumber}
                              onChange={(e) => setCheckoutCardNumber(e.target.value)}
                              placeholder="4242 4242 4242 4242"
                              className="w-full bg-black/40 border border-white/15 rounded-xl pl-11 pr-4 py-2.5 text-sm font-mono text-white placeholder-gray-500 focus:outline-none focus:border-brand-primary transition-colors"
                            />
                            <CreditCard className="w-4 h-4 text-brand-primary absolute left-4 top-1/2 -translate-y-1/2" />
                          </div>
                        </div>

                        {/* Expiry & CVC & Zip */}
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">
                              Expires
                            </label>
                            <input
                              type="text"
                              required
                              value={checkoutExpiry}
                              onChange={(e) => setCheckoutExpiry(e.target.value)}
                              placeholder="MM/YY"
                              className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-gray-500 text-center focus:outline-none focus:border-brand-primary transition-colors"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">
                              CVC
                            </label>
                            <input
                              type="text"
                              required
                              value={checkoutCvc}
                              onChange={(e) => setCheckoutCvc(e.target.value)}
                              placeholder="CVC"
                              className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-gray-500 text-center focus:outline-none focus:border-brand-primary transition-colors"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">
                              ZIP Code
                            </label>
                            <input
                              type="text"
                              required
                              value={checkoutZip}
                              onChange={(e) => setCheckoutZip(e.target.value)}
                              placeholder="90210"
                              className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-gray-500 text-center focus:outline-none focus:border-brand-primary transition-colors"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Submit Purchase Button */}
                      <div className="pt-4 border-t border-white/10 space-y-3">
                        <Button
                          type="submit"
                          disabled={isUpdating}
                          className="w-full bg-brand-primary text-brand-dark hover:bg-brand-primary/90 font-black text-sm py-3.5 rounded-xl shadow-lg shadow-brand-primary/20 flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {isUpdating ? (
                            <div className="flex items-center gap-2">
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Processing Secure Payment...</span>
                            </div>
                          ) : (
                            <>
                              <Lock className="w-4 h-4" />
                              <span>Pay ${checkoutPriceObj.price.toFixed(2)} & Activate {checkoutPlanObj.name}</span>
                            </>
                          )}
                        </Button>

                        <p className="text-[11px] text-gray-400 text-center">
                          By clicking Pay, you authorize UNLCKD to process recurring billing for this plan until canceled.
                        </p>
                      </div>
                    </form>
                  </div>
                </div>
              )
            ) : (
              /* DEFAULT PLANS LIST VIEW */
              <>
                {/* Active Subscription Summary Card */}
                <div className="bg-[#0f1828] border border-white/10 rounded-2xl p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-inner">
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                      Current Active Firestore Membership
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
                        Save 33%
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
                            onClick={() => handleOpenCheckout(planObj.plan, selectedCoachBand)}
                            className={cn(
                              "w-full font-bold text-xs py-3 transition-all cursor-pointer shadow-md",
                              isCurrent
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default"
                                : planObj.plan === 'coach'
                                ? "bg-amber-400 text-black hover:bg-amber-300 font-extrabold"
                                : planObj.plan === 'pro'
                                ? "bg-brand-primary text-brand-dark hover:bg-brand-primary/90 font-extrabold"
                                : "bg-white/10 text-gray-200 hover:bg-white/20"
                            )}
                          >
                            {isCurrent ? (
                              <span className="flex items-center justify-center gap-1">
                                <Check className="w-3.5 h-3.5" /> Current Active Plan
                              </span>
                            ) : planObj.plan === 'free' ? (
                              <span className="flex items-center justify-center gap-1">
                                Select Free Tier
                                <ArrowRight className="w-3.5 h-3.5" />
                              </span>
                            ) : (
                              <span className="flex items-center justify-center gap-1">
                                Purchase {planObj.name}
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
                    <strong className="text-gray-200 block mb-0.5">Note on Purchasing & Billing Integration</strong>
                    Purchasing any plan directly activates your membership tier in Firestore state (<code className="bg-black/50 px-1.5 py-0.5 rounded text-amber-300">userProfile.plan</code>, <code className="bg-black/50 px-1.5 py-0.5 rounded text-amber-300">userProfile.billingCycle</code>, <code className="bg-black/50 px-1.5 py-0.5 rounded text-amber-300">userProfile.status</code>) and unlocks immediate UNLCKD capabilities.
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
