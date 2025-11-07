/**
 * Plan Configuration for APIFlow
 * Defines limits and pricing for each tier
 */

export type PlanType = 'free' | 'pro' | 'enterprise';

export interface PlanLimits {
  name: string;
  monthlyRequests: number;
  maxDatabases: number;
  maxApiKeys: number;
  maxEndpoints: number;
  price: string;
  priceId: string;
  annualPriceId?: string;
  features: string[];
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    name: 'Free',
    monthlyRequests: 10_000,
    maxDatabases: 1,
    maxApiKeys: 1,
    maxEndpoints: 5,
    price: '$0',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_FREE_MONTHLY || 'price_1SMKaCL6m2xu0lW3htFfg9Fu',
    features: [
      '10,000 API requests/month',
      '1 database connection',
      '1 API key',
      '5 endpoints',
      'Community support',
    ],
  },
  pro: {
    name: 'Pro',
    monthlyRequests: 100_000,
    maxDatabases: 5,
    maxApiKeys: 5,
    maxEndpoints: 50,
    price: '$29/month',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY || '',
    annualPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL || '',
    features: [
      '100,000 API requests/month',
      '5 database connections',
      '5 API keys',
      '50 endpoints',
      'Priority support',
      'Advanced analytics',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    monthlyRequests: 1_000_000,
    maxDatabases: 999,
    maxApiKeys: 999,
    maxEndpoints: 999,
    price: '$299/month',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_MONTHLY || 'price_1SMKbyL6m2xu0lW3E1UDCKjH',
    annualPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_ANNUAL || 'price_1SMKmnL6m2xu0lW3oCadb6pJ',
    features: [
      '1M+ API requests/month',
      'Unlimited databases',
      'Unlimited API keys',
      'Unlimited endpoints',
      'Priority email support',
      'Advanced analytics',
    ],
  },
};

/**
 * Get user's plan limits
 */
export function getPlanLimits(plan: string): PlanLimits {
  const planType = (plan || 'free') as PlanType;
  return PLAN_LIMITS[planType] || PLAN_LIMITS.free;
}

/**
 * Check if user can perform action based on their plan
 */
export function canPerformAction(
  currentCount: number,
  maxAllowed: number
): { allowed: boolean; reason?: string } {
  if (currentCount >= maxAllowed) {
    return {
      allowed: false,
      reason: `You've reached your plan limit of ${maxAllowed}. Please upgrade to continue.`,
    };
  }
  return { allowed: true };
}
