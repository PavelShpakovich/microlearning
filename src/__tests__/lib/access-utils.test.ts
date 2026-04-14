/**
 * Tests for access-utils.
 * Supabase admin client is mocked so no real DB connection is needed.
 */

// ── mock supabase admin ────────────────────────────────────────────────────
const mockMaybeSingle = jest.fn();

// Build a chainable supabase query mock
function makeQueryMock(resolvedData: unknown) {
  mockMaybeSingle.mockResolvedValue({ data: resolvedData, error: null });

  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    maybeSingle: mockMaybeSingle,
  };
  return chain;
}

jest.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}));

import { supabaseAdmin } from '@/lib/supabase/admin';
import { getWorkspaceAccessStatus, getUserAccessPolicy, getUserUsage } from '@/lib/access-utils';

const mockFrom = supabaseAdmin.from as jest.Mock;

// ── helpers ────────────────────────────────────────────────────────────────

function setupUsageCounterMock(chartsCreated: number | null) {
  mockFrom.mockReturnValue(
    makeQueryMock(chartsCreated != null ? { charts_created: chartsCreated } : null),
  );
}

// ── getWorkspaceAccessStatus ───────────────────────────────────────────────

describe('getWorkspaceAccessStatus', () => {
  it('returns correct structure when usage counter exists', async () => {
    setupUsageCounterMock(1);
    const status = await getWorkspaceAccessStatus('user-1');

    expect(status.accessMode).toBe('direct');
    expect(status.chartsCreated).toBe(1);
    expect(status.chartsLimit).toBe(3); // from DEFAULT_USAGE_POLICY
    expect(status.chartsRemaining).toBe(2);
    expect(status.canCreateCharts).toBe(true);
    expect(status.hasPaidAccess).toBe(false);
  });

  it('defaults to 0 charts created when counter row is null', async () => {
    setupUsageCounterMock(null);
    const status = await getWorkspaceAccessStatus('user-new');

    expect(status.chartsCreated).toBe(0);
    expect(status.chartsRemaining).toBe(3);
    expect(status.canCreateCharts).toBe(true);
  });

  it('sets canCreateCharts to false when limit is reached', async () => {
    setupUsageCounterMock(3);
    const status = await getWorkspaceAccessStatus('user-full');

    expect(status.chartsRemaining).toBe(0);
    expect(status.canCreateCharts).toBe(false);
  });

  it('chartsRemaining never goes below zero', async () => {
    setupUsageCounterMock(100); // over limit
    const status = await getWorkspaceAccessStatus('user-over');

    expect(status.chartsRemaining).toBe(0);
  });

  it('usage sub-object mirrors top-level fields', async () => {
    setupUsageCounterMock(2);
    const status = await getWorkspaceAccessStatus('user-2');

    expect(status.usage.chartsCreated).toBe(status.chartsCreated);
    expect(status.usage.chartsLimit).toBe(status.chartsLimit);
    expect(status.usage.chartsRemaining).toBe(status.chartsRemaining);
  });

  it('policy sub-object reflects usage policy', async () => {
    setupUsageCounterMock(0);
    const status = await getWorkspaceAccessStatus('user-policy');

    expect(status.policy.chartsPerPeriod).toBe(3);
    expect(status.policy.savedChartsLimit).toBe(5);
  });
});

// ── getUserAccessPolicy ────────────────────────────────────────────────────

describe('getUserAccessPolicy', () => {
  it('returns access policy regardless of userId', async () => {
    const policy = await getUserAccessPolicy('any-user');

    expect(policy.accessMode).toBe('direct');
    expect(policy.chartsLimit).toBe(3);
    expect(policy.savedChartsLimit).toBe(5);
  });
});

// ── getUserUsage ───────────────────────────────────────────────────────────

describe('getUserUsage', () => {
  it('returns usage with chartsRemaining clamped to zero', async () => {
    setupUsageCounterMock(10);
    const usage = await getUserUsage('user-maxed');

    expect(usage.chartsCreated).toBe(10);
    expect(usage.chartsRemaining).toBe(0);
    expect(usage.chartsLimit).toBe(3);
  });

  it('returns full quota when no usage row exists', async () => {
    setupUsageCounterMock(null);
    const usage = await getUserUsage('user-fresh');

    expect(usage.chartsCreated).toBe(0);
    expect(usage.chartsRemaining).toBe(3);
  });
});
