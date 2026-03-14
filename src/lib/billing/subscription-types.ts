export type PlanId = 'free' | 'basic' | 'pro' | 'max';

export interface AvailablePlan {
  id: PlanId;
  name: string;
  cardsPerMonth: number;
  maxThemes: number | null;
  priceMinor: number | null;
  currency: string;
  isPublic: boolean;
  checkoutEnabled: boolean;
}

export interface SubscriptionStatusResponse {
  planId: PlanId;
  isPaid: boolean;
  expiresAt: string | null;
  inTelegram: boolean;
  autoRenew: boolean;
  subscriptionStatus: 'active' | 'cancelled' | 'expired' | 'none';
  billingEnabled: boolean;
  paidInfoVisible: boolean;
  billingProvider: string | null;
  plan: {
    planId: PlanId;
    cardsPerMonth: number;
    themesLimit: number | null;
    maxThemes: number | null;
    communityThemes: boolean;
  };
  usage: {
    cardsGenerated: number;
    cardsLimit: number;
    cardsRemaining: number;
    periodStart: string;
    periodEnd: string;
  };
  themesUsed: number;
  availablePlans: AvailablePlan[];
}
