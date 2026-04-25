'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';
import {
  creditsApi,
  type CreditBalanceSnapshot,
  type CreditCosts,
  type CreditHistorySnapshot,
  type CreditPack,
  type CreditTransaction,
  type CreditsPricingSnapshot,
} from '@/services/credits-api';

interface CreditsContextValue {
  balance: number | null;
  forecastAccessUntil: string | null;
  costs: CreditCosts | null;
  freeProducts: string[];
  packs: CreditPack[];
  transactions: CreditTransaction[];
  historyPage: number;
  historyPageSize: number;
  historyTotal: number;
  creditsReady: boolean;
  storeReady: boolean;
  isRefreshing: boolean;
  isStoreLoading: boolean;
  refreshCredits: () => Promise<void>;
  loadStoreData: (options?: { page?: number; pageSize?: number }) => Promise<void>;
  syncCredits: (snapshot: Partial<CreditBalanceSnapshot> & { newBalance?: number }) => void;
  isFreeProduct: (productKind: string) => boolean;
  getCost: (productKind: string, fallback?: number) => number;
}

const CreditsContext = createContext<CreditsContextValue | null>(null);

interface CreditsState {
  balance: number | null;
  forecastAccessUntil: string | null;
  costs: CreditCosts | null;
  freeProducts: string[];
  packs: CreditPack[];
  transactions: CreditTransaction[];
  historyPage: number;
  historyPageSize: number;
  historyTotal: number;
  creditsReady: boolean;
  storeReady: boolean;
  isRefreshing: boolean;
  isStoreLoading: boolean;
}

type CreditsAction =
  | { type: 'reset' }
  | { type: 'refresh:start' }
  | {
      type: 'refresh:success';
      balance: CreditBalanceSnapshot;
      pricing: CreditsPricingSnapshot;
    }
  | { type: 'refresh:finish' }
  | { type: 'store:start' }
  | {
      type: 'store:success';
      balance: CreditBalanceSnapshot;
      pricing: CreditsPricingSnapshot;
      packs: CreditPack[];
      history: CreditHistorySnapshot;
    }
  | { type: 'store:finish' }
  | { type: 'sync'; snapshot: Partial<CreditBalanceSnapshot> & { newBalance?: number } };

const initialState: CreditsState = {
  balance: null,
  forecastAccessUntil: null,
  costs: null,
  freeProducts: [],
  packs: [],
  transactions: [],
  historyPage: 1,
  historyPageSize: 5,
  historyTotal: 0,
  creditsReady: false,
  storeReady: false,
  isRefreshing: false,
  isStoreLoading: false,
};

function creditsReducer(state: CreditsState, action: CreditsAction): CreditsState {
  switch (action.type) {
    case 'reset':
      return initialState;
    case 'refresh:start':
      return { ...state, isRefreshing: true };
    case 'refresh:success':
      return {
        ...state,
        balance: action.balance.balance,
        forecastAccessUntil: action.balance.forecastAccessUntil,
        costs: action.pricing.costs,
        freeProducts: action.pricing.freeProducts,
        creditsReady: true,
      };
    case 'refresh:finish':
      return { ...state, isRefreshing: false };
    case 'store:start':
      return { ...state, isStoreLoading: true };
    case 'store:success':
      return {
        ...state,
        balance: action.balance.balance,
        forecastAccessUntil: action.balance.forecastAccessUntil,
        costs: action.pricing.costs,
        freeProducts: action.pricing.freeProducts,
        packs: action.packs,
        transactions: action.history.transactions,
        historyPage: action.history.page,
        historyPageSize: action.history.pageSize,
        historyTotal: action.history.total,
        creditsReady: true,
        storeReady: true,
      };
    case 'store:finish':
      return { ...state, isStoreLoading: false };
    case 'sync':
      return {
        ...state,
        balance: action.snapshot.newBalance ?? action.snapshot.balance ?? state.balance,
        forecastAccessUntil:
          action.snapshot.forecastAccessUntil !== undefined
            ? (action.snapshot.forecastAccessUntil ?? null)
            : state.forecastAccessUntil,
      };
    default:
      return state;
  }
}

export function CreditsProvider({ children, enabled }: { children: ReactNode; enabled: boolean }) {
  const [state, dispatch] = useReducer(creditsReducer, initialState);

  const refreshCredits = useCallback(async () => {
    if (!enabled) return;

    dispatch({ type: 'refresh:start' });
    try {
      const [balanceSnapshot, pricingSnapshot] = await Promise.all([
        creditsApi.getBalance(true),
        creditsApi.getPricing(true),
      ]);

      dispatch({
        type: 'refresh:success',
        balance: balanceSnapshot,
        pricing: pricingSnapshot,
      });
    } finally {
      dispatch({ type: 'refresh:finish' });
    }
  }, [enabled]);

  const loadStoreData = useCallback(
    async (options?: { page?: number; pageSize?: number }) => {
      if (!enabled) return;

      const page = options?.page ?? 1;
      const pageSize = options?.pageSize ?? state.historyPageSize;

      dispatch({ type: 'store:start' });
      try {
        const snapshot = await creditsApi.getStoreSnapshot({ page, pageSize });

        dispatch({
          type: 'store:success',
          balance: snapshot.balance,
          pricing: snapshot.pricing,
          packs: snapshot.packs,
          history: snapshot.history,
        });
      } finally {
        dispatch({ type: 'store:finish' });
      }
    },
    [enabled, state.historyPageSize],
  );

  const syncCredits = useCallback(
    (snapshot: Partial<CreditBalanceSnapshot> & { newBalance?: number }) => {
      dispatch({ type: 'sync', snapshot });
    },
    [],
  );

  useEffect(() => {
    if (!enabled) {
      dispatch({ type: 'reset' });
      return;
    }

    void refreshCredits().catch(() => {
      // Credits UI is secondary on first paint. Consumers can retry on demand.
    });
  }, [enabled, refreshCredits]);

  const value = useMemo<CreditsContextValue>(
    () => ({
      balance: state.balance,
      forecastAccessUntil: state.forecastAccessUntil,
      costs: state.costs,
      freeProducts: state.freeProducts,
      packs: state.packs,
      transactions: state.transactions,
      historyPage: state.historyPage,
      historyPageSize: state.historyPageSize,
      historyTotal: state.historyTotal,
      creditsReady: state.creditsReady,
      storeReady: state.storeReady,
      isRefreshing: state.isRefreshing,
      isStoreLoading: state.isStoreLoading,
      refreshCredits,
      loadStoreData,
      syncCredits,
      isFreeProduct: (productKind: string) => state.freeProducts.includes(productKind),
      getCost: (productKind: string, fallback = 1) => state.costs?.[productKind] ?? fallback,
    }),
    [loadStoreData, refreshCredits, syncCredits, state],
  );

  return <CreditsContext.Provider value={value}>{children}</CreditsContext.Provider>;
}

export function useCredits() {
  const context = useContext(CreditsContext);
  if (!context) {
    throw new Error('useCredits must be used within CreditsProvider');
  }
  return context;
}
