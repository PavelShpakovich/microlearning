import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { creditsApi } from '@clario/api-client';
import type {
  CreditBalanceSnapshot,
  CreditsPricingSnapshot,
  CreditPack,
  CreditHistorySnapshot,
} from '@clario/api-client';
import { useTranslations, getLocale } from '@/lib/i18n';
import { useColors, cardShadow } from '@/lib/colors';
import { SCREEN_TOP_INSET_OFFSET } from '@/lib/layout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Skeleton } from '@/components/Skeleton';
import { usePullToRefresh } from '@/lib/refresh';
import {
  getPlatformProductId,
  isBillingAvailable,
  isPurchaseCancelled,
  loadStoreProductsForPacks,
  purchaseCreditPack,
  restoreAndReconcilePurchases,
} from '@/lib/billing';
import { toast } from '@/lib/toast';
import type { PurchasesStoreProduct } from 'react-native-purchases';

function StoreSkeleton() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.headerBar, { paddingTop: insets.top + SCREEN_TOP_INSET_OFFSET }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerText}>
            <Skeleton width={74} height={10} />
            <Skeleton width={156} height={24} style={{ marginTop: 6 }} />
          </View>
          <Skeleton width={36} height={36} borderRadius={8} />
        </View>
        <Skeleton width={'82%'} height={13} style={{ marginTop: 8 }} />
      </View>

      {/* Balance card */}
      <View style={styles.balanceCard}>
        <Skeleton width={44} height={44} borderRadius={22} />
        <View style={styles.balanceInfo}>
          <Skeleton width={80} height={12} />
          <Skeleton width={100} height={22} style={{ marginTop: 4 }} />
        </View>
      </View>

      {/* Credit packs section */}
      <View style={styles.sectionHeader}>
        <Skeleton width={20} height={20} borderRadius={4} />
        <Skeleton width={100} height={15} />
      </View>
      <Skeleton width={'70%'} height={12} style={{ marginBottom: 8 }} />
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.packCard}>
          <View style={styles.packInfo}>
            <Skeleton width={90} height={15} />
            <Skeleton width={70} height={12} style={{ marginTop: 4 }} />
          </View>
          <Skeleton width={60} height={15} />
        </View>
      ))}

      {/* Credit costs section */}
      <View style={styles.sectionHeader}>
        <Skeleton width={20} height={20} borderRadius={4} />
        <Skeleton width={110} height={15} />
      </View>
      <View style={styles.costsCard}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.costRow, i === 3 && styles.costRowLast]}>
            <Skeleton width={'55%'} height={13} />
            <Skeleton width={50} height={13} />
          </View>
        ))}
      </View>

      {/* Transaction history section */}
      <View style={styles.sectionHeader}>
        <Skeleton width={20} height={20} borderRadius={4} />
        <Skeleton width={130} height={15} />
      </View>
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.historyRow}>
          <View style={{ flex: 1, gap: 4 }}>
            <Skeleton width={'60%'} height={13} />
            <Skeleton width={'40%'} height={11} />
          </View>
          <Skeleton width={50} height={13} />
        </View>
      ))}
    </ScrollView>
  );
}

const REASON_KEYS: Record<string, string> = {
  pack_purchase: 'reasonPackPurchase',
  admin_grant: 'reasonAdminGrant',
  admin_revoke: 'reasonAdminRevoke',
  reading_debit: 'reasonReadingDebit',
  compatibility_debit: 'reasonCompatibilityDebit',
  forecast_pack_debit: 'reasonForecastPackDebit',
  chat_pack_debit: 'reasonChatPackDebit',
  welcome_bonus: 'reasonWelcomeBonus',
  refund_llm_failure: 'reasonRefundLlmFailure',
  refund_admin: 'reasonRefundAdmin',
  refund_store_revoke: 'reasonRefundStoreRevoke',
};

const COST_KEYS: Record<string, string> = {
  natal_report: 'natalReport',
  compatibility_report: 'compatibilityReport',
  forecast_report: 'forecastPack',
  follow_up_pack: 'chatPack',
};

const PACK_NAME_KEYS: Record<string, string> = {
  starter: 'packNameStarter',
  standard: 'packNameStandard',
  premium: 'packNamePremium',
};

export default function StoreScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  // Static data loaded once on focus (balance, packs, pricing)
  const [balance, setBalance] = useState<CreditBalanceSnapshot | null>(null);
  const [pricing, setPricing] = useState<CreditsPricingSnapshot | null>(null);
  const [packs, setPacks] = useState<CreditPack[]>([]);
  // History loaded separately per page
  const [history, setHistory] = useState<CreditHistorySnapshot | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [storeProducts, setStoreProducts] = useState<Record<string, PurchasesStoreProduct>>({});
  const [purchasePackId, setPurchasePackId] = useState<string | null>(null);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const hasLoadedRef = useRef(false);
  const PAGE_SIZE = 5;

  const tCredits = useTranslations('credits');

  // Load static parts (balance, packs, pricing) — history is loaded separately
  const loadStatic = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [balanceData, pricingData, packsData] = await Promise.all([
        creditsApi.getBalance(true),
        creditsApi.getPricing(true),
        creditsApi.getPacks({ noCache: true }),
      ]);
      const storeProductsData = isBillingAvailable()
        ? await loadStoreProductsForPacks(packsData.packs).catch(() => ({}))
        : {};

      setBalance(balanceData);
      setPricing(pricingData);
      setPacks(packsData.packs);
      setStoreProducts(storeProductsData);
      setPage(1); // always reset to page 1 on (re)focus
    } finally {
      setLoading(false);
    }
  }, []);

  const handlePurchase = useCallback(
    async (pack: CreditPack) => {
      if (!isBillingAvailable()) {
        toast.error(tCredits('billingUnavailable'));
        return;
      }

      setPurchasePackId(pack.id);
      try {
        await purchaseCreditPack(pack);
        await loadStatic(true);
        toast.success(tCredits('purchaseSuccess'));
      } catch (error) {
        if (isPurchaseCancelled(error)) {
          toast.info(tCredits('purchaseCancelled'));
          return;
        }

        toast.error(tCredits('purchaseFailed'));
      } finally {
        setPurchasePackId(null);
      }
    },
    [loadStatic, tCredits],
  );

  const handleRestore = useCallback(async () => {
    if (!isBillingAvailable()) {
      toast.error(tCredits('billingUnavailable'));
      return;
    }

    setRestoreLoading(true);
    try {
      const results = await restoreAndReconcilePurchases(packs);
      await loadStatic(true);

      if (results.length === 0) {
        toast.info(tCredits('restoreEmpty'));
        return;
      }

      toast.success(tCredits('restoreSuccess').replace('{count}', String(results.length)));
    } catch {
      toast.error(tCredits('restoreFailed'));
    } finally {
      setRestoreLoading(false);
    }
  }, [loadStatic, packs, tCredits]);

  const { refreshing, handleRefresh } = usePullToRefresh(() => loadStatic(true));

  useFocusEffect(
    useCallback(() => {
      if (hasLoadedRef.current) {
        void loadStatic(true);
        return;
      }

      hasLoadedRef.current = true;
      void loadStatic();
    }, [loadStatic]),
  );

  // Load history whenever page or balance changes
  useEffect(() => {
    if (!balance) return;
    setHistoryLoading(true);
    creditsApi
      .getHistory({ page, pageSize: PAGE_SIZE, noCache: true })
      .then((data) => setHistory(data))
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [page, balance]);

  if (loading) {
    return <StoreSkeleton />;
  }

  if (!balance || !pricing) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={44} color={colors.border} />
        <Text style={styles.errorTitle}>{tCredits('loadErrorTitle')}</Text>
        <Text style={styles.errorText}>{tCredits('loadErrorDescription')}</Text>
        <TouchableOpacity style={styles.primaryAction} onPress={() => void loadStatic()}>
          <Text style={styles.primaryActionText}>{tCredits('loadErrorRetry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const totalPages = history ? Math.max(1, Math.ceil(history.total / PAGE_SIZE)) : 1;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
        />
      }
    >
      <View style={[styles.headerBar, { paddingTop: insets.top + SCREEN_TOP_INSET_OFFSET }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>{tCredits('yourBalance')}</Text>
            <Text style={styles.title}>{tCredits('storeTitle')}</Text>
          </View>
          <View style={styles.headerBadge}>
            <Ionicons name="wallet-outline" size={20} color={colors.primary} />
          </View>
        </View>
        <Text style={styles.storeDesc}>{tCredits('storeDescription')}</Text>
        <TouchableOpacity
          style={[styles.restoreButton, restoreLoading && styles.restoreButtonDisabled]}
          onPress={() => void handleRestore()}
          disabled={restoreLoading}
        >
          {restoreLoading ? (
            <ActivityIndicator size="small" color={colors.foreground} />
          ) : (
            <>
              <Ionicons name="refresh-outline" size={16} color={colors.foreground} />
              <Text style={styles.restoreButtonText}>{tCredits('restorePurchases')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Balance card */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceIconWrap}>
          <Ionicons name="wallet-outline" size={24} color={colors.primary} />
        </View>
        <View style={styles.balanceInfo}>
          <Text style={styles.balanceLabel}>{tCredits('yourBalance')}</Text>
          <Text style={styles.balanceValue}>
            {balance.balance} <Text style={styles.balanceUnit}>{tCredits('creditsUnit')}</Text>
          </Text>
          {balance.forecastAccessUntil && (
            <Text style={styles.forecastAccess}>
              {tCredits('forecastAccessActive').replace(
                '{date}',
                new Date(balance.forecastAccessUntil).toLocaleDateString(getLocale()),
              )}
            </Text>
          )}
        </View>
      </View>

      {/* Credit packs */}
      <View style={styles.sectionHeader}>
        <Ionicons name="cube-outline" size={18} color={colors.foreground} />
        <Text style={styles.sectionTitle}>{tCredits('creditPacks')}</Text>
      </View>
      {packs.map((pack) => (
        <View key={pack.id} style={styles.packCard}>
          <View style={styles.packInfo}>
            <Text style={styles.packName}>
              {tCredits(
                (PACK_NAME_KEYS[pack.name.toLowerCase()] ?? pack.name) as Parameters<
                  typeof tCredits
                >[0],
              ) || pack.name}
            </Text>
            <Text style={styles.packCredits}>
              {tCredits('packCredits').replace('{count}', String(pack.credits))}
            </Text>
          </View>
          <View style={styles.packAction}>
            {getPlatformProductId(pack) ? (
              <TouchableOpacity
                style={[styles.buyButton, purchasePackId === pack.id && styles.buyButtonDisabled]}
                onPress={() => void handlePurchase(pack)}
                disabled={purchasePackId === pack.id}
              >
                {purchasePackId === pack.id ? (
                  <ActivityIndicator size="small" color={colors.primaryForeground} />
                ) : (
                  <Text style={styles.buyButtonText}>
                    {formatPackPrice(pack, storeProducts, tCredits)}
                  </Text>
                )}
              </TouchableOpacity>
            ) : (
              <Text style={styles.comingSoonText}>{tCredits('comingSoon')}</Text>
            )}
          </View>
        </View>
      ))}
      {packs.length === 0 && <View style={styles.packsEmpty} />}

      {/* Credit costs */}
      <View style={styles.sectionHeader}>
        <Ionicons name="flash-outline" size={18} color={colors.foreground} />
        <Text style={styles.sectionTitle}>{tCredits('creditCosts')}</Text>
      </View>
      <View style={styles.costsCard}>
        {Object.entries(pricing.costs)
          .filter(([k]) => COST_KEYS[k])
          .map(([key, cost], index, arr) => (
            <View
              key={key}
              style={[styles.costRow, index === arr.length - 1 && styles.costRowLast]}
            >
              <Text style={styles.costLabel}>
                {tCredits(COST_KEYS[key] as Parameters<typeof tCredits>[0])}
              </Text>
              <Text style={styles.costValue}>
                {pricing.freeProducts.includes(key)
                  ? tCredits('freeLabel')
                  : tCredits('balanceCount').replace('{count}', String(cost))}
              </Text>
            </View>
          ))}
      </View>

      {/* Transaction history */}
      <View style={styles.sectionHeader}>
        <Ionicons name="time-outline" size={18} color={colors.foreground} />
        <Text style={styles.sectionTitle}>{tCredits('purchaseHistory')}</Text>
        {history && history.total > 0 && (
          <View style={styles.pagination}>
            <TouchableOpacity
              style={[
                styles.pageChevron,
                (page <= 1 || historyLoading) && styles.pageButtonDisabled,
              ]}
              onPress={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || historyLoading}
            >
              <Ionicons name="chevron-back" size={16} color={colors.foreground} />
            </TouchableOpacity>
            {historyLoading ? (
              <ActivityIndicator
                size="small"
                color={colors.primary}
                style={{ marginHorizontal: 8 }}
              />
            ) : (
              <Text style={styles.pageLabel}>
                {tCredits('pageLabel')
                  .replace('{current}', String(page))
                  .replace('{total}', String(totalPages))}
              </Text>
            )}
            <TouchableOpacity
              style={[
                styles.pageChevron,
                (page >= totalPages || historyLoading) && styles.pageButtonDisabled,
              ]}
              onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || historyLoading}
            >
              <Ionicons name="chevron-forward" size={16} color={colors.foreground} />
            </TouchableOpacity>
          </View>
        )}
      </View>
      {!history || history.transactions.length === 0 ? (
        historyLoading ? (
          <View style={styles.historyCard}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[styles.txRow, i === 2 && styles.txRowLast]}>
                <View style={styles.txLeft}>
                  <Skeleton width={'60%'} height={13} />
                  <Skeleton width={'40%'} height={11} style={{ marginTop: 2 }} />
                </View>
                <Skeleton width={50} height={13} />
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>{tCredits('noTransactions')}</Text>
        )
      ) : historyLoading ? (
        <View style={styles.historyCard}>
          {history.transactions.map((_, index) => (
            <View
              key={index}
              style={[styles.txRow, index === history.transactions.length - 1 && styles.txRowLast]}
            >
              <View style={styles.txLeft}>
                <Skeleton width={'60%'} height={13} />
                <Skeleton width={'40%'} height={11} style={{ marginTop: 2 }} />
              </View>
              <Skeleton width={50} height={13} />
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.historyCard}>
          {history.transactions.map((tx, index) => {
            const reasonKey = REASON_KEYS[tx.reason];
            const reasonLabel = reasonKey
              ? tCredits(reasonKey as Parameters<typeof tCredits>[0])
              : tx.reason;
            return (
              <View
                key={tx.id}
                style={[
                  styles.txRow,
                  index === history.transactions.length - 1 && styles.txRowLast,
                ]}
              >
                <View style={styles.txLeft}>
                  <Text style={styles.txReason}>{reasonLabel}</Text>
                  {tx.note ? <Text style={styles.txNote}>{tx.note}</Text> : null}
                  <Text style={styles.txDate}>
                    {new Date(tx.created_at).toLocaleString(getLocale())}
                  </Text>
                </View>
                <View style={styles.txRight}>
                  <Text
                    style={[styles.txAmount, tx.amount > 0 ? styles.txPositive : styles.txNegative]}
                  >
                    {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

function formatPackPrice(
  pack: CreditPack,
  storeProducts: Record<string, PurchasesStoreProduct>,
  tCredits: ReturnType<typeof useTranslations>,
): string {
  const productId = getPlatformProductId(pack);
  if (productId && storeProducts[productId]) {
    return storeProducts[productId].priceString;
  }

  return tCredits('buyNow' as Parameters<typeof tCredits>[0]);
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
      backgroundColor: colors.background,
      gap: 12,
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 4,
      paddingBottom: 48,
    },
    headerBar: {
      paddingBottom: 8,
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    headerText: {
      flex: 1,
      gap: 2,
    },
    headerBadge: {
      width: 36,
      height: 36,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySubtle,
      borderWidth: 1,
      borderColor: colors.primaryTint,
    },
    // Page title
    eyebrow: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 2,
      marginBottom: 2,
    },
    title: {
      fontSize: 26,
      fontWeight: '600',
      color: colors.foreground,
      letterSpacing: -0.5,
    },
    storeDesc: {
      fontSize: 13,
      color: colors.mutedForeground,
      lineHeight: 19,
      marginTop: 4,
    },
    restoreButton: {
      marginTop: 12,
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    restoreButtonDisabled: {
      opacity: 0.6,
    },
    restoreButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.foreground,
    },
    // Balance card
    balanceCard: {
      backgroundColor: colors.primarySubtle,
      borderRadius: 14,
      padding: 20,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.primaryTint,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    balanceIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primaryTint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    balanceInfo: {
      flex: 1,
      gap: 2,
    },
    balanceLabel: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.primary,
      marginBottom: 2,
    },
    balanceValue: {
      fontSize: 32,
      fontWeight: '800',
      color: colors.primary,
      lineHeight: 38,
    },
    balanceUnit: {
      fontSize: 13,
      color: colors.primary,
      fontWeight: '500',
    },
    forecastAccess: {
      fontSize: 12,
      color: colors.primary,
      marginTop: 4,
    },
    // Section headers with icon
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
      marginTop: 8,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.foreground,
      flex: 1,
    },
    sectionDesc: {
      fontSize: 13,
      color: colors.mutedForeground,
      marginBottom: 12,
      lineHeight: 18,
    },
    // Costs card — card style with row dividers
    costsCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      ...cardShadow,
      marginBottom: 24,
      overflow: 'hidden',
    },
    costRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    costRowLast: {
      borderBottomWidth: 0,
    },
    costLabel: {
      fontSize: 14,
      color: colors.foreground,
    },
    costValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },
    // Pack cards — card style
    packCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      ...cardShadow,
      padding: 16,
      marginBottom: 8,
    },
    packInfo: {
      flex: 1,
      gap: 2,
    },
    packName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.foreground,
    },
    packCredits: {
      fontSize: 13,
      color: colors.mutedForeground,
    },
    packAction: {
      alignItems: 'flex-end',
      gap: 4,
    },
    buyButton: {
      minWidth: 96,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    buyButtonDisabled: {
      opacity: 0.6,
    },
    buyButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primaryForeground,
    },
    packPrice: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.foreground,
    },
    comingSoonText: {
      fontSize: 13,
      color: colors.mutedForeground,
    },
    packsEmpty: {
      marginBottom: 16,
    },
    // Transaction history — card style with row dividers
    historyCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      ...cardShadow,
      marginBottom: 8,
      overflow: 'hidden',
    },
    txRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 8,
    },
    txRowLast: {
      borderBottomWidth: 0,
    },
    txLeft: {
      flex: 1,
      gap: 2,
    },
    txReason: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
    },
    txNote: {
      fontSize: 12,
      color: colors.mutedForeground,
    },
    txDate: {
      fontSize: 12,
      color: colors.placeholder,
    },
    txRight: {
      alignItems: 'flex-end',
      gap: 2,
    },
    txAmount: {
      fontSize: 16,
      fontWeight: '700',
    },
    txPositive: {
      color: colors.success,
    },
    txNegative: {
      color: colors.error,
    },
    // Pagination (inline in section header)
    pagination: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      overflow: 'hidden',
    },
    pageChevron: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pageButtonDisabled: {
      opacity: 0.4,
    },
    pageLabel: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.mutedForeground,
      paddingHorizontal: 10,
    },
    emptyText: {
      fontSize: 14,
      color: colors.mutedForeground,
      textAlign: 'center',
      marginBottom: 20,
    },
    errorTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.foreground,
      textAlign: 'center',
    },
    errorText: {
      fontSize: 16,
      color: colors.mutedForeground,
      textAlign: 'center',
      lineHeight: 22,
    },
    primaryAction: {
      minWidth: 180,
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingHorizontal: 18,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
      ...cardShadow,
    },
    primaryActionText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primaryForeground,
    },
    secondaryAction: {
      minWidth: 180,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 18,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
    },
    secondaryActionText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
    },
    historyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 8,
    },
  });
}
