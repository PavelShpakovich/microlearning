import { PlanId } from '@/lib/subscription-utils';
import type { AdminAnalytics } from '@/app/api/admin/analytics/route';

export type { AdminAnalytics };

export interface AdminUser {
  id: string;
  email: string;
  telegramId: number | null;
  displayName: string;
  isAdmin: boolean;
  plan: string;
  cardsPerMonth: number;
  cardsUsed: number;
  cardsRemaining: number;
  createdAt: string;
}

interface ListUsersResponse {
  users: AdminUser[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
  };
}

interface ChangePlanResponse {
  success: boolean;
  message: string;
  userId: string;
  planId: PlanId;
}

interface ToggleAdminResponse {
  success: boolean;
  message: string;
  userId: string;
  makeAdmin: boolean;
}

class AdminApi {
  /**
   * Fetch paginated list of users with subscription info
   */
  async listUsers(page: number = 1, perPage: number = 20): Promise<ListUsersResponse> {
    const res = await fetch(`/api/admin/users?page=${page}&perPage=${perPage}`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch users');
    }

    return data;
  }

  /**
   * Change a user's plan access.
   */
  async changePlan(userId: string, planId: PlanId): Promise<ChangePlanResponse> {
    const res = await fetch(`/api/admin/users/${userId}/plan`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to update plan access');
    }

    return data;
  }

  async updatePlanAccess(userId: string, planId: PlanId): Promise<ChangePlanResponse> {
    return this.changePlan(userId, planId);
  }

  /**
   * Reset a user's card usage to zero for the current period
   */
  async resetUsage(userId: string): Promise<{ success: boolean; message: string; userId: string }> {
    const res = await fetch(`/api/admin/users/${userId}/reset-usage`, {
      method: 'POST',
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to reset usage');
    }

    return data;
  }

  /**
   * Run Telegram bot setup (register webhook + commands)
   */
  async runBotSetup(): Promise<Record<string, unknown>> {
    const res = await fetch('/api/telegram/setup', { method: 'POST' });
    const data = (await res.json()) as Record<string, unknown>;
    return data;
  }

  /**
   * Fetch aggregated platform analytics
   */
  async getAnalytics(): Promise<AdminAnalytics> {
    const res = await fetch('/api/admin/analytics');
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch analytics');
    }

    return data as AdminAnalytics;
  }

  /**
   * Toggle admin status for a user
   */
  async toggleAdmin(userId: string, isAdmin: boolean): Promise<ToggleAdminResponse> {
    const res = await fetch(`/api/admin/users/${userId}/admin`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ makeAdmin: isAdmin }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to toggle admin status');
    }

    return data;
  }
}

export const adminApi = new AdminApi();
