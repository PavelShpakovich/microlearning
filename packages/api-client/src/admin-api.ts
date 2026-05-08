import type { AdminAnalytics } from '@clario/types';
import { creditsApi, type CreditCosts, type CreditPack } from './credits-api';
import { fetchJson, resolveUrl } from './api-client';

export type { AdminAnalytics };

export interface AdminUser {
  id: string;
  email: string | null;
  displayName: string;
  isAdmin: boolean;
  isEmailVerified: boolean;
  accessMode: string;
  createdAt: string;
  totalReadings: number;
  totalCharts: number;
  readingsThisMonth: number;
  chartsThisMonth: number;
  creditBalance: number;
}

interface ListUsersResponse {
  users: AdminUser[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
  };
}

interface ToggleAdminResponse {
  success: boolean;
  message: string;
  userId: string;
  makeAdmin: boolean;
}

interface DeleteUserResponse {
  success: boolean;
  message: string;
  userId: string;
}

export interface AdminPricingProduct {
  id: string;
  kind: string;
  title: string;
  credit_cost: number;
  free: boolean;
}

class AdminApi {
  async listUsers(page: number = 1, perPage: number = 20): Promise<ListUsersResponse> {
    const res = await fetch(resolveUrl(`/api/admin/users?page=${page}&perPage=${perPage}`));
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Не удалось загрузить пользователей');
    return data;
  }

  async getAnalytics(): Promise<AdminAnalytics> {
    const res = await fetch(resolveUrl('/api/admin/analytics'));
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Не удалось загрузить аналитику');
    return data as AdminAnalytics;
  }

  async getPricingDashboard(): Promise<{
    pricing: { costs: CreditCosts; freeProducts: string[] };
    packs: CreditPack[];
    products: AdminPricingProduct[];
  }> {
    const [pricing, packs, products] = await Promise.all([
      creditsApi.getPricing(true),
      creditsApi.getPacks({ includeInactive: true, noCache: true }),
      fetchJson<{ products: AdminPricingProduct[] }>('/api/admin/pricing/products', {
        cache: 'no-store',
      }),
    ]);

    return {
      pricing,
      packs: packs.packs,
      products: products.products ?? [],
    };
  }

  async toggleAdmin(userId: string, isAdmin: boolean): Promise<ToggleAdminResponse> {
    const res = await fetch(resolveUrl(`/api/admin/users/${userId}/admin`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ makeAdmin: isAdmin }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Не удалось изменить права администратора');
    return data;
  }

  async deleteUser(userId: string): Promise<DeleteUserResponse> {
    const res = await fetch(resolveUrl(`/api/admin/users/${userId}`), { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Не удалось удалить пользователя');
    return data;
  }

  // ── Credits management ──────────────────────────────────────────────────

  async grantCredits(
    userId: string,
    amount: number,
    note?: string,
  ): Promise<{ success: boolean; newBalance: number; transactionId: string }> {
    const res = await fetch(resolveUrl('/api/admin/credits/grant'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, amount, note }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Не удалось начислить кредиты');
    return data;
  }

  async revokeCredits(
    userId: string,
    amount: number,
    note?: string,
  ): Promise<{ success: boolean; newBalance: number; transactionId: string }> {
    const res = await fetch(resolveUrl('/api/admin/credits/revoke'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, amount, note }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Не удалось списать кредиты');
    return data;
  }

  async getUserCreditHistory(
    userId: string,
    page = 1,
    pageSize = 50,
  ): Promise<{
    balance: number;
    forecastAccessUntil: string | null;
    transactions: Array<{
      id: string;
      amount: number;
      balance_after: number;
      reason: string;
      reference_type: string | null;
      reference_id: string | null;
      note: string | null;
      created_at: string;
    }>;
    total: number;
  }> {
    const res = await fetch(
      resolveUrl(`/api/admin/credits/history/${userId}?page=${page}&pageSize=${pageSize}`),
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Не удалось загрузить историю кредитов');
    return data;
  }

  // ── Pricing management ──────────────────────────────────────────────────

  async updateProductPricing(
    productId: string,
    updates: { creditCost?: number; free?: boolean },
  ): Promise<{
    success: boolean;
    product: { id: string; kind: string; title: string; credit_cost: number; free: boolean };
  }> {
    return fetchJson('/api/admin/pricing/products', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, ...updates }),
    });
  }

  async updateCreditPack(
    packId: string,
    updates: { credits?: number; active?: boolean },
  ): Promise<{ success: boolean; pack: Record<string, unknown> }> {
    return fetchJson('/api/admin/pricing/packs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packId, ...updates }),
    });
  }
}

export const adminApi = new AdminApi();
