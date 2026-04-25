import { fetchJson } from '@/services/api-client';

export type CreditCosts = Record<string, number> & {
  natal_report: number;
  compatibility_report: number;
  forecast_report: number;
  follow_up_pack: number;
};

export interface CreditBalanceSnapshot {
  balance: number;
  forecastAccessUntil: string | null;
}

export interface CreditsPricingSnapshot {
  costs: CreditCosts;
  freeProducts: string[];
}

export interface CreditPack {
  id: string;
  name: string;
  credits: number;
  priceminor: number | null;
  currency: string;
  active?: boolean;
}

export interface CreditTransaction {
  id: string;
  amount: number;
  balance_after: number;
  reason: string;
  reference_type: string | null;
  reference_id: string | null;
  note: string | null;
  created_at: string;
}

export interface CreditHistorySnapshot {
  transactions: CreditTransaction[];
  page: number;
  pageSize: number;
  total: number;
}

export interface CreditsStoreSnapshot {
  balance: CreditBalanceSnapshot;
  pricing: CreditsPricingSnapshot;
  packs: CreditPack[];
  history: CreditHistorySnapshot;
}

class CreditsApi {
  async getBalance(noCache = false): Promise<CreditBalanceSnapshot> {
    return fetchJson<CreditBalanceSnapshot>('/api/credits/balance', {
      cache: noCache ? 'no-store' : 'default',
    });
  }

  async getPricing(noCache = false): Promise<CreditsPricingSnapshot> {
    const data = await fetchJson<Partial<CreditsPricingSnapshot>>('/api/credits/pricing', {
      cache: noCache ? 'no-store' : 'default',
    });

    return {
      costs: (data.costs ?? {}) as CreditCosts,
      freeProducts: data.freeProducts ?? [],
    };
  }

  async getPacks(options?: {
    includeInactive?: boolean;
    noCache?: boolean;
  }): Promise<{ packs: CreditPack[] }> {
    const params = new URLSearchParams();
    if (options?.includeInactive) params.set('includeInactive', 'true');
    const query = params.size > 0 ? `?${params.toString()}` : '';

    const data = await fetchJson<{ packs?: CreditPack[] }>(`/api/credits/packs${query}`, {
      cache: options?.noCache ? 'no-store' : 'default',
    });

    return { packs: data.packs ?? [] };
  }

  async getHistory(options?: {
    page?: number;
    pageSize?: number;
    noCache?: boolean;
  }): Promise<CreditHistorySnapshot> {
    const params = new URLSearchParams();
    params.set('page', String(options?.page ?? 1));
    params.set('pageSize', String(options?.pageSize ?? 20));

    const data = await fetchJson<Partial<CreditHistorySnapshot>>(
      `/api/credits/history?${params.toString()}`,
      {
        cache: options?.noCache ? 'no-store' : 'default',
      },
    );

    return {
      transactions: data.transactions ?? [],
      page: data.page ?? 1,
      pageSize: data.pageSize ?? options?.pageSize ?? 20,
      total: data.total ?? 0,
    };
  }

  async getStoreSnapshot(options?: {
    page?: number;
    pageSize?: number;
  }): Promise<CreditsStoreSnapshot> {
    const [balance, pricing, packs, history] = await Promise.all([
      this.getBalance(true),
      this.getPricing(true),
      this.getPacks({ noCache: true }),
      this.getHistory({
        page: options?.page,
        pageSize: options?.pageSize,
        noCache: true,
      }),
    ]);

    return {
      balance,
      pricing,
      packs: packs.packs,
      history,
    };
  }
}

export const creditsApi = new CreditsApi();
