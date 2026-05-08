/**
 * Tests for credits/pricing.
 * Supabase admin client is mocked so no real DB connection is needed.
 */

const mockOrder = jest.fn();

function makeSelectMock(resolvedData: unknown) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    order: mockOrder,
  };
  mockOrder.mockResolvedValue({ data: resolvedData, error: null });
  return chain;
}

jest.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}));

import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  getCreditCosts,
  getCreditPacks,
  getAllCreditPacks,
  getProductPricing,
  invalidatePricingCache,
} from '@/lib/credits/pricing';

const mockFrom = supabaseAdmin.from as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  invalidatePricingCache();
});

// ── getCreditCosts ─────────────────────────────────────────────────────────

describe('getCreditCosts', () => {
  it('loads credit costs from DB', async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      not: jest.fn().mockResolvedValue({
        data: [
          { kind: 'natal_report', credit_cost: 4 },
          { kind: 'compatibility_report', credit_cost: 5 },
          { kind: 'forecast_report', credit_cost: 3 },
          { kind: 'follow_up_pack', credit_cost: 2 },
        ],
        error: null,
      }),
    });

    const costs = await getCreditCosts();

    expect(costs.natal_report).toBe(4);
    expect(costs.compatibility_report).toBe(5);
    expect(costs.forecast_report).toBe(3);
    expect(costs.follow_up_pack).toBe(2);
  });

  it('uses cached value on second call', async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      not: jest.fn().mockResolvedValue({
        data: [{ kind: 'natal_report', credit_cost: 10 }],
        error: null,
      }),
    });

    await getCreditCosts();
    await getCreditCosts();

    // from() should only be called once due to caching
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it('returns fallback defaults on DB error', async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      not: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'connection refused' },
      }),
    });

    const costs = await getCreditCosts();

    // Should return hardcoded defaults
    expect(costs.natal_report).toBe(2);
    expect(costs.compatibility_report).toBe(3);
    expect(costs.forecast_report).toBe(2);
    expect(costs.follow_up_pack).toBe(1);
  });

  it('re-fetches after invalidatePricingCache()', async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      not: jest.fn().mockResolvedValue({
        data: [{ kind: 'natal_report', credit_cost: 4 }],
        error: null,
      }),
    });

    await getCreditCosts();
    invalidatePricingCache();

    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      not: jest.fn().mockResolvedValue({
        data: [{ kind: 'natal_report', credit_cost: 8 }],
        error: null,
      }),
    });

    const costs = await getCreditCosts();

    expect(costs.natal_report).toBe(8);
    expect(mockFrom).toHaveBeenCalledTimes(2);
  });

  it('re-fetches shortly after the costs cache TTL expires', async () => {
    const originalNow = Date.now;

    try {
      let now = 1_000;
      Date.now = jest.fn(() => now);

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        not: jest.fn().mockResolvedValue({
          data: [{ kind: 'natal_report', credit_cost: 4 }],
          error: null,
        }),
      });

      const first = await getCreditCosts();

      now += 11_000;
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        not: jest.fn().mockResolvedValue({
          data: [{ kind: 'natal_report', credit_cost: 9 }],
          error: null,
        }),
      });

      const second = await getCreditCosts();

      expect(first.natal_report).toBe(4);
      expect(second.natal_report).toBe(9);
      expect(mockFrom).toHaveBeenCalledTimes(2);
    } finally {
      Date.now = originalNow;
    }
  });
});

describe('getProductPricing', () => {
  it('loads cost and free status from one DB read', async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        data: [
          { kind: 'natal_report', credit_cost: 4, free: true },
          { kind: 'follow_up_pack', credit_cost: 2, free: false },
        ],
        error: null,
      }),
    });

    const pricing = await getProductPricing('natal_report');

    expect(pricing).toEqual({ cost: 4, isFree: true });
  });

  it('uses fallback values when the DB read fails', async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'connection refused' },
      }),
    });

    const pricing = await getProductPricing('compatibility_report');

    expect(pricing).toEqual({ cost: 3, isFree: false });
  });
});

// ── getCreditPacks ─────────────────────────────────────────────────────────

describe('getCreditPacks', () => {
  it('loads active packs from DB ordered by sort_order', async () => {
    mockFrom.mockReturnValue(
      makeSelectMock([
        {
          id: 'starter',
          name: 'Starter',
          credits: 3,
          apple_product_id: 'by.tryclario.credits.starter.ios',
          google_product_id: 'by.tryclario.credits.starter.android',
          active: true,
          sort_order: 1,
        },
        {
          id: 'standard',
          name: 'Standard',
          credits: 7,
          apple_product_id: 'by.tryclario.credits.standard.ios',
          google_product_id: 'by.tryclario.credits.standard.android',
          active: true,
          sort_order: 2,
        },
      ]),
    );

    const packs = await getCreditPacks();

    expect(packs).toHaveLength(2);
    expect(packs[0].id).toBe('starter');
    expect(packs[0].credits).toBe(3);
    expect(packs[0].appleProductId).toBe('by.tryclario.credits.starter.ios');
    expect(packs[0].googleProductId).toBe('by.tryclario.credits.starter.android');
  });

  it('re-fetches shortly after the pack cache TTL expires', async () => {
    const originalNow = Date.now;

    try {
      let now = 1_000;
      Date.now = jest.fn(() => now);

      mockFrom.mockReturnValueOnce(
        makeSelectMock([
          {
            id: 'starter',
            name: 'Starter',
            credits: 3,
            apple_product_id: 'by.tryclario.credits.starter.ios',
            google_product_id: 'by.tryclario.credits.starter.android',
            active: true,
            sort_order: 1,
          },
        ]),
      );

      const first = await getCreditPacks();

      now += 6_000;
      mockFrom.mockReturnValueOnce(
        makeSelectMock([
          {
            id: 'starter',
            name: 'Starter',
            credits: 8,
            apple_product_id: 'by.tryclario.credits.starter.ios',
            google_product_id: 'by.tryclario.credits.starter.android',
            active: true,
            sort_order: 1,
          },
        ]),
      );

      const second = await getCreditPacks();

      expect(first[0].credits).toBe(3);
      expect(second[0].credits).toBe(8);
      expect(mockFrom).toHaveBeenCalledTimes(2);
    } finally {
      Date.now = originalNow;
    }
  });

  it('returns empty array on DB error', async () => {
    mockFrom.mockReturnValue(makeSelectMock(null));
    mockOrder.mockResolvedValue({ data: null, error: { message: 'fail' } });

    const packs = await getCreditPacks();

    expect(packs).toEqual([]);
  });
});

// ── getAllCreditPacks ──────────────────────────────────────────────────────

describe('getAllCreditPacks', () => {
  it('returns all packs including inactive ones', async () => {
    mockFrom.mockReturnValue(
      makeSelectMock([
        {
          id: 'starter',
          name: 'Starter',
          credits: 3,
          apple_product_id: 'by.tryclario.credits.starter.ios',
          google_product_id: 'by.tryclario.credits.starter.android',
          active: true,
          sort_order: 1,
        },
        {
          id: 'archived',
          name: 'Archived',
          credits: 5,
          apple_product_id: 'by.tryclario.credits.archived.ios',
          google_product_id: 'by.tryclario.credits.archived.android',
          active: false,
          sort_order: 99,
        },
      ]),
    );

    const packs = await getAllCreditPacks();

    expect(packs).toHaveLength(2);
    expect(packs[1].id).toBe('archived');
    expect(packs[1].active).toBe(false);
    expect(packs[1].appleProductId).toBe('by.tryclario.credits.archived.ios');
    expect(packs[1].googleProductId).toBe('by.tryclario.credits.archived.android');
  });

  it('returns empty array on DB error', async () => {
    mockFrom.mockReturnValue(makeSelectMock(null));
    mockOrder.mockResolvedValue({ data: null, error: { message: 'fail' } });

    const packs = await getAllCreditPacks();

    expect(packs).toEqual([]);
  });
});
