import { ClientCountBand, SubscriptionPlanType, BillingCycleType, SubscriptionStatusType } from '../types';

export interface PlanPricing {
  monthlyPrice: number;
  annualPrice: number; // yearly bill total
  annualMonthlyEquivalent: number; // monthly equivalent when paid annually
}

export interface SubscriptionPlanObject {
  id: string;
  plan: SubscriptionPlanType;
  name: string;
  tagline: string;
  description: string;
  badge?: string;
  isPopular?: boolean;
  pricing: PlanPricing | Record<ClientCountBand, PlanPricing>;
  features: string[];
  limits: {
    transformationReports: string;
    gymHubSync: boolean;
    clientRosterLimit: number | string;
    customReportBranding: boolean;
    pdfExport: boolean;
    priorityAISupport: boolean;
  };
  stripePriceIds?: {
    monthly?: string;
    annual?: string;
    byBand?: Record<ClientCountBand, { monthly: string; annual: string }>;
  };
}

export const CLIENT_COUNT_BANDS: { band: ClientCountBand; label: string; maxClients: number | string; pricing: PlanPricing }[] = [
  {
    band: '1-5',
    label: '1 - 5 Clients',
    maxClients: 5,
    pricing: {
      monthlyPrice: 49,
      annualPrice: 469,
      annualMonthlyEquivalent: 39.08
    }
  },
  {
    band: '6-15',
    label: '6 - 15 Clients',
    maxClients: 15,
    pricing: {
      monthlyPrice: 99,
      annualPrice: 949,
      annualMonthlyEquivalent: 79.08
    }
  },
  {
    band: '16-30',
    label: '16 - 30 Clients',
    maxClients: 30,
    pricing: {
      monthlyPrice: 189,
      annualPrice: 1799,
      annualMonthlyEquivalent: 149.92
    }
  },
  {
    band: '31+',
    label: '31+ Clients (Enterprise)',
    maxClients: 'Unlimited',
    pricing: {
      monthlyPrice: 299,
      annualPrice: 2849,
      annualMonthlyEquivalent: 237.42
    }
  }
];

export const SUBSCRIPTION_PLANS: SubscriptionPlanObject[] = [
  {
    id: 'free',
    plan: 'free',
    name: 'Free Tier',
    tagline: 'Get started with personal transformation AI',
    description: 'Perfect for exploring personal physique analysis and basic workout logging.',
    pricing: {
      monthlyPrice: 0,
      annualPrice: 0,
      annualMonthlyEquivalent: 0
    },
    features: [
      '1 Full Transformation AI Report',
      'Basic Gym Hub workout tracking',
      'Personal meal & macro logging',
      'Standard AI processing queue'
    ],
    limits: {
      transformationReports: '1 total',
      gymHubSync: true,
      clientRosterLimit: 0,
      customReportBranding: false,
      pdfExport: false,
      priorityAISupport: false
    },
    stripePriceIds: {
      monthly: 'price_free_monthly',
      annual: 'price_free_annual'
    }
  },
  {
    id: 'pro',
    plan: 'pro',
    name: 'Pro Member',
    tagline: 'For serious athletes & physique transformations',
    description: 'Unlimited AI assessments, full Gym Hub sync, HD PDF downloads, and priority generation.',
    badge: 'MOST POPULAR',
    isPopular: true,
    pricing: {
      monthlyPrice: 14.99,
      annualPrice: 119.88,
      annualMonthlyEquivalent: 9.99
    },
    features: [
      'Unlimited AI Transformation Reports',
      'Full Gym Hub sync & progress logs',
      'HD PDF report exports & printing',
      'Advanced recovery & supplement protocols',
      'Priority AI generation speed'
    ],
    limits: {
      transformationReports: 'Unlimited',
      gymHubSync: true,
      clientRosterLimit: 0,
      customReportBranding: false,
      pdfExport: true,
      priorityAISupport: true
    },
    stripePriceIds: {
      monthly: 'price_pro_monthly_v1',
      annual: 'price_pro_annual_v1'
    }
  },
  {
    id: 'coach',
    plan: 'coach',
    name: 'Coach & Trainer',
    tagline: 'Scaling your coaching business with AI automation',
    description: 'Tiered client roster bands, Client Hub, pushing workout & meal plans directly to clients.',
    badge: 'FOR TRAINERS',
    pricing: {
      '1-5': { monthlyPrice: 49, annualPrice: 469, annualMonthlyEquivalent: 39.08 },
      '6-15': { monthlyPrice: 99, annualPrice: 949, annualMonthlyEquivalent: 79.08 },
      '16-30': { monthlyPrice: 189, annualPrice: 1799, annualMonthlyEquivalent: 149.92 },
      '31+': { monthlyPrice: 299, annualPrice: 2849, annualMonthlyEquivalent: 237.42 }
    },
    features: [
      'Everything in Pro included',
      'Client Hub roster management',
      'Push workout & meal plans to client Gym Hubs',
      'Custom report branding with coach logo',
      'Client transformation analytics & alerts',
      'Tiered pricing per client-count band'
    ],
    limits: {
      transformationReports: 'Unlimited',
      gymHubSync: true,
      clientRosterLimit: 'Per Client Band',
      customReportBranding: true,
      pdfExport: true,
      priorityAISupport: true
    },
    stripePriceIds: {
      byBand: {
        '1-5': { monthly: 'price_coach_1_5_monthly', annual: 'price_coach_1_5_annual' },
        '6-15': { monthly: 'price_coach_6_15_monthly', annual: 'price_coach_6_15_annual' },
        '16-30': { monthly: 'price_coach_16_30_monthly', annual: 'price_coach_16_30_annual' },
        '31+': { monthly: 'price_coach_31plus_monthly', annual: 'price_coach_31plus_annual' }
      }
    }
  }
];

export function getPriceForPlan(
  plan: SubscriptionPlanType,
  cycle: BillingCycleType,
  clientBand: ClientCountBand = '1-5'
): { price: number; periodLabel: string; savePercentage?: number } {
  if (plan === 'free') {
    return { price: 0, periodLabel: '/month' };
  }

  if (plan === 'pro') {
    if (cycle === 'annual') {
      return { price: 119.88, periodLabel: '/year ($9.99/mo)', savePercentage: 33 };
    }
    return { price: 14.99, periodLabel: '/month' };
  }

  // Coach plan
  const bandInfo = CLIENT_COUNT_BANDS.find(b => b.band === clientBand) || CLIENT_COUNT_BANDS[0];
  if (cycle === 'annual') {
    return {
      price: bandInfo.pricing.annualPrice,
      periodLabel: `/year ($${bandInfo.pricing.annualMonthlyEquivalent.toFixed(2)}/mo)`,
      savePercentage: 20
    };
  }
  return { price: bandInfo.pricing.monthlyPrice, periodLabel: '/month' };
}
