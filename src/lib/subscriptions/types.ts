import type { Database } from '@/lib/supabase/types';

export type SubscriptionPlan = Database['public']['Tables']['subscription_plans']['Row'];
export type UserSubscription = Database['public']['Tables']['user_subscriptions']['Row'];
export type UserUsage = Database['public']['Tables']['user_usage']['Row'];
export type BillingHistory = Database['public']['Tables']['billing_history']['Row'];

export type PlanId = 'free' | 'basic' | 'pro' | 'unlimited';

export interface UserPlanInfo {
  planId: PlanId;
  cardsPerMonth: number;
  /** Maximum number of themes allowed. null = unlimited. */
  maxThemes: number | null;
  /** Whether the plan includes access to community (public) themes. */
  communityThemes: boolean;
  status: 'active' | 'canceled' | 'expired';
  currentPeriodEnd: string;
}

export interface UserUsageInfo {
  cardsGenerated: number;
  cardsLimit: number;
  cardsRemaining: number;
  periodEnd: string;
}

export interface SubscriptionResponse {
  plan: UserPlanInfo;
  usage: UserUsageInfo;
  canGenerate: boolean;
  /** Number of themes the user currently has */
  themesUsed: number;
}
