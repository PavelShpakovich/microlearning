import { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { goBackTo, routes } from '@/lib/navigation';
import { Ionicons } from '@expo/vector-icons';
import { getAuthHeaders, resolveUrl, adminApi } from '@clario/api-client';
import type {
  AdminUser,
  AdminAnalytics,
  AdminPricingProduct,
  CreditPack,
} from '@clario/api-client';
import { useTranslations } from '@/lib/i18n';
import { useConfirm } from '@/components/ConfirmDialog';

import { runToastMutation } from '@/lib/mutation-toast';
import { useColors, cardShadow } from '@/lib/colors';
import { SCREEN_TOP_INSET_OFFSET } from '@/lib/layout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Skeleton } from '@/components/Skeleton';
import { usePullToRefresh } from '@/lib/refresh';

// ─── Skeletons ───────────────────────────────────────────────────────────────

function AnalyticsSkeleton() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Skeleton width={15} height={15} borderRadius={4} />
        <Skeleton width={120} height={13} />
      </View>
      <View style={styles.statsGrid}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View key={i} style={[styles.statCard, { gap: 6 }]}>
            <Skeleton width={16} height={16} borderRadius={4} />
            <Skeleton width={48} height={22} borderRadius={6} />
            <Skeleton width={'80%'} height={10} borderRadius={4} />
          </View>
        ))}
        <View style={[styles.statCard, styles.statCardWide, { gap: 6 }]}>
          <Skeleton width={16} height={16} borderRadius={4} />
          <Skeleton width={90} height={22} borderRadius={6} />
          <Skeleton width={'50%'} height={10} borderRadius={4} />
        </View>
      </View>
    </View>
  );
}

function UserRowSkeleton() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.userCard, { padding: 14 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Skeleton width={42} height={42} borderRadius={21} />
        <View style={{ flex: 1, gap: 6 }}>
          <Skeleton width={'55%'} height={13} />
          <Skeleton width={'75%'} height={11} />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 2 }}>
            <Skeleton width={32} height={10} />
            <Skeleton width={28} height={10} />
            <Skeleton width={28} height={10} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} width={34} height={34} borderRadius={8} />
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── Pricing Section ─────────────────────────────────────────────────────────

function PricingSection() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const t = useTranslations('adminCredits');
  const [products, setProducts] = useState<AdminPricingProduct[]>([]);
  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftProducts, setDraftProducts] = useState<Record<string, number>>({});
  const [draftProductsFree, setDraftProductsFree] = useState<Record<string, boolean>>({});
  const [draftPacks, setDraftPacks] = useState<
    Record<string, { credits?: number; active?: boolean }>
  >({});

  const hasChanges =
    Object.keys(draftProducts).length > 0 ||
    Object.keys(draftProductsFree).length > 0 ||
    Object.keys(draftPacks).length > 0;

  function productLabel(row: AdminPricingProduct): string {
    const key = `productName_${row.kind}` as Parameters<typeof t>[0];
    try {
      return t(key) || row.title || row.kind;
    } catch {
      return row.title || row.kind;
    }
  }

  const loadPricing = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    let cancelled = false;
    adminApi.getPricingDashboard().then(
      ({ packs: packRows, products: productRows }) => {
        if (cancelled) return;
        setProducts(productRows);
        setPacks(packRows);
        setLoading(false);
      },
      () => {
        if (!cancelled) {
          setLoadError(true);
          setLoading(false);
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => loadPricing(), [loadPricing]);

  async function saveAll() {
    setSaving(true);
    try {
      await runToastMutation({
        action: async () => {
          const productUpdates = products
            .filter((p) => draftProducts[p.id] != null || draftProductsFree[p.id] != null)
            .map((p) =>
              adminApi.updateProductPricing(p.id, {
                ...(draftProducts[p.id] != null ? { creditCost: draftProducts[p.id] } : {}),
                ...(draftProductsFree[p.id] != null ? { free: draftProductsFree[p.id] } : {}),
              }),
            );
          const packUpdates = Object.entries(draftPacks).map(([id, updates]) =>
            adminApi.updateCreditPack(id, updates),
          );
          await Promise.all([...productUpdates, ...packUpdates]);
        },
        successMessage: t('pricingSaved'),
        errorMessage: t('pricingFailed'),
        toastKey: 'admin-pricing-save',
        onSuccess: () => {
          setProducts((prev) =>
            prev.map((p) => ({
              ...p,
              ...(draftProducts[p.id] != null ? { credit_cost: draftProducts[p.id] } : {}),
              ...(draftProductsFree[p.id] != null ? { free: draftProductsFree[p.id] } : {}),
            })),
          );
          setPacks((prev) =>
            prev.map((pk) => {
              const d = draftPacks[pk.id];
              if (!d) return pk;
              return { ...pk, credits: d.credits ?? pk.credits, active: d.active ?? pk.active };
            }),
          );
          setDraftProducts({});
          setDraftProductsFree({});
          setDraftPacks({});
        },
      });
    } catch {
      // Toast is handled by runToastMutation.
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.card, { marginTop: 12 }]}>
        <View style={styles.cardHeader}>
          <Skeleton width={15} height={15} borderRadius={4} />
          <Skeleton width={160} height={13} />
        </View>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} height={48} borderRadius={10} />
        ))}
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={[styles.card, { marginTop: 12 }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="pricetag-outline" size={15} color={colors.primary} />
          <Text style={styles.cardTitle}>{t('pricingTitle')}</Text>
        </View>
        <TouchableOpacity style={styles.retryRow} onPress={loadPricing}>
          <Ionicons name="refresh-outline" size={16} color={colors.mutedForeground} />
          <Text style={styles.retryText}>{t('pricingFailed')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.card, { marginTop: 12 }]}>
      <View style={styles.cardHeader}>
        <Ionicons name="pricetag-outline" size={15} color={colors.primary} />
        <Text style={styles.cardTitle}>{t('pricingTitle')}</Text>
      </View>

      {/* Product costs */}
      <Text style={styles.pricingSectionLabel}>{t('productPricing')}</Text>
      {products.map((product) => {
        const isFree = draftProductsFree[product.id] ?? product.free;
        const cost = draftProducts[product.id] ?? product.credit_cost;
        const setCost = (val: number) =>
          setDraftProducts((prev) => {
            if (val === product.credit_cost) {
              const next = { ...prev };
              delete next[product.id];
              return next;
            }
            return { ...prev, [product.id]: val };
          });
        return (
          <View key={product.id} style={styles.pricingRow}>
            <Text style={styles.pricingRowLabel}>{productLabel(product)}</Text>
            <View style={styles.pricingRowControls}>
              <TouchableOpacity
                style={[styles.freeBadge, isFree ? styles.freeBadgeOn : styles.freeBadgeOff]}
                onPress={() => {
                  const newFree = !isFree;
                  setDraftProductsFree((prev) => {
                    if (newFree === product.free) {
                      const next = { ...prev };
                      delete next[product.id];
                      return next;
                    }
                    return { ...prev, [product.id]: newFree };
                  });
                }}
                hitSlop={6}
              >
                <Text
                  style={[
                    styles.freeBadgeText,
                    isFree ? styles.freeBadgeTextOn : styles.freeBadgeTextOff,
                  ]}
                >
                  {isFree ? t('productFree') : t('productPaid')}
                </Text>
              </TouchableOpacity>
              <View style={[styles.stepper, isFree && { opacity: 0.4 }]}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setCost(Math.max(1, cost - 1))}
                  disabled={isFree || saving || cost <= 1}
                  hitSlop={6}
                >
                  <Text style={styles.stepperBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{cost}</Text>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setCost(cost + 1)}
                  disabled={isFree || saving}
                  hitSlop={6}
                >
                  <Text style={styles.stepperBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );
      })}

      {/* Credit packs */}
      <Text style={[styles.pricingSectionLabel, { marginTop: 8 }]}>{t('packPricing')}</Text>
      {packs.length === 0 ? (
        <Text style={styles.packEmptyText}>{t('noPacksConfigured')}</Text>
      ) : (
        packs.map((pack) => {
          const isActive = draftPacks[pack.id]?.active ?? pack.active ?? true;
          const credits = draftPacks[pack.id]?.credits ?? pack.credits;
          const setCredits = (val: number) =>
            setDraftPacks((prev) => {
              const existing = prev[pack.id] ?? {};
              const updated = { ...existing, credits: val };
              if (val === pack.credits && updated.active == null) {
                const next = { ...prev };
                delete next[pack.id];
                return next;
              }
              return { ...prev, [pack.id]: updated };
            });
          return (
            <View key={pack.id} style={styles.pricingRow}>
              <Text style={styles.pricingRowLabel}>{pack.name}</Text>
              <View style={styles.pricingRowControls}>
                <TouchableOpacity
                  style={[styles.freeBadge, isActive ? styles.freeBadgeOn : styles.freeBadgeOff]}
                  onPress={() => {
                    const newActive = !isActive;
                    setDraftPacks((prev) => {
                      const existing = prev[pack.id] ?? {};
                      const updated = { ...existing, active: newActive };
                      if (newActive === (pack.active ?? true) && updated.credits == null) {
                        const next = { ...prev };
                        delete next[pack.id];
                        return next;
                      }
                      return { ...prev, [pack.id]: updated };
                    });
                  }}
                  hitSlop={6}
                >
                  <Text
                    style={[
                      styles.freeBadgeText,
                      isActive ? styles.freeBadgeTextOn : styles.freeBadgeTextOff,
                    ]}
                  >
                    {isActive ? t('active') : t('inactive')}
                  </Text>
                </TouchableOpacity>
                <View style={[styles.stepper, !isActive && { opacity: 0.35 }]}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setCredits(Math.max(1, credits - 1))}
                    disabled={saving || credits <= 1 || !isActive}
                    hitSlop={6}
                  >
                    <Text style={styles.stepperBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>{credits}</Text>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setCredits(credits + 1)}
                    disabled={saving || !isActive}
                    hitSlop={6}
                  >
                    <Text style={styles.stepperBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })
      )}

      {/* Save button */}
      <TouchableOpacity
        style={[styles.savePricingBtn, (!hasChanges || saving) && styles.btnDisabled]}
        onPress={() => void saveAll()}
        disabled={!hasChanges || saving}
      >
        {saving ? (
          <ActivityIndicator size="small" color={colors.primaryForeground} />
        ) : (
          <Text style={styles.savePricingBtnText}>{t('savePricing')}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(resolveUrl(path), {
    ...init,
    headers: { ...authHeaders, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const data = (await res.json()) as { error?: string } & T;
  if (!res.ok) throw new Error(data.error ?? 'Error');
  return data;
}

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();
}

interface CreditFormProps {
  user: AdminUser;
  mode: 'grant' | 'revoke';
  onClose: () => void;
  onDone: () => void;
}

function CreditForm({ user, mode, onClose, onDone }: CreditFormProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const t = useTranslations('adminCredits');
  const tc = useTranslations('common');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    const n = parseInt(amount, 10);
    if (!n || n <= 0) return;
    setLoading(true);
    try {
      await runToastMutation({
        action: () =>
          adminFetch(mode === 'grant' ? '/api/admin/credits/grant' : '/api/admin/credits/revoke', {
            method: 'POST',
            body: JSON.stringify({ userId: user.id, amount: n }),
          }),
        successMessage: mode === 'grant' ? t('grantSuccess') : t('revokeSuccess'),
        errorMessage: mode === 'grant' ? t('grantFailed') : t('revokeFailed'),
        toastKey: `admin-credit-${mode}`,
        onSuccess: async () => {
          await onDone();
          onClose();
        },
      });
    } catch {
      // Toast is handled by runToastMutation.
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.creditForm}>
        <View style={styles.creditFormHeader}>
          <Text style={styles.creditFormTitle}>
            {mode === 'grant' ? t('grantCredits') : t('revokeCredits')}
          </Text>
          <Text style={styles.creditFormSub}>{user.email ?? user.displayName}</Text>
        </View>
        <TextInput
          style={styles.creditInput}
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholder={t('amount')}
          placeholderTextColor={colors.mutedForeground}
          editable={!loading}
          autoFocus
        />
        <View style={styles.creditFormButtons}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={loading}>
            <Text style={styles.cancelBtnText}>{tc('cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.confirmBtn, (!amount || loading) && styles.btnDisabled]}
            onPress={() => void handleSubmit()}
            disabled={!amount || loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.primaryForeground} size="small" />
            ) : (
              <Text style={styles.confirmBtnText}>
                {mode === 'grant' ? t('grantCredits') : t('revokeCredits')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

interface UserRowProps {
  user: AdminUser;
  onGrant: () => void;
  onRevoke: () => void;
  onToggleAdmin: () => void;
  onDelete: () => void;
  creditTarget: { user: AdminUser; mode: 'grant' | 'revoke' } | null;
  onCreditClose: () => void;
  onCreditDone: () => void;
}

function UserRow({
  user,
  onGrant,
  onRevoke,
  onToggleAdmin,
  onDelete,
  creditTarget,
  onCreditClose,
  onCreditDone,
}: UserRowProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const isExpanded = creditTarget !== null && creditTarget.user.id === user.id;

  return (
    <View style={styles.userCard}>
      <View style={styles.userRow}>
        <View style={[styles.avatar, user.isAdmin && styles.avatarAdmin]}>
          <Text style={[styles.avatarText, user.isAdmin && styles.avatarTextAdmin]}>
            {initials(user.displayName)}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <View style={styles.userNameRow}>
            <Text style={styles.userName} numberOfLines={1}>
              {user.displayName || '\u2014'}
            </Text>
            {user.isAdmin && (
              <View style={styles.adminPill}>
                <Text style={styles.adminPillText}>admin</Text>
              </View>
            )}
          </View>
          <Text style={styles.userEmail} numberOfLines={1}>
            {user.email ?? '\u2014'}
          </Text>
          <View style={styles.userStats}>
            <View style={styles.statChip}>
              <Ionicons name="star-outline" size={11} color={colors.primary} />
              <Text style={styles.statChipText}>{user.creditBalance}</Text>
            </View>
            <View style={styles.statChip}>
              <Ionicons name="book-outline" size={11} color={colors.mutedForeground} />
              <Text style={styles.statChipText}>{user.totalReadings}</Text>
            </View>
            <View style={styles.statChip}>
              <Ionicons name="disc-outline" size={11} color={colors.mutedForeground} />
              <Text style={styles.statChipText}>{user.totalCharts}</Text>
            </View>
          </View>
        </View>
        <View style={styles.userActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={onGrant} hitSlop={6}>
            <Ionicons name="add-circle-outline" size={22} color={colors.success} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={onRevoke} hitSlop={6}>
            <Ionicons name="remove-circle-outline" size={22} color={colors.warning} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={onToggleAdmin} hitSlop={6}>
            <Ionicons
              name={user.isAdmin ? 'shield' : 'shield-outline'}
              size={22}
              color={user.isAdmin ? colors.primary : colors.mutedForeground}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={onDelete} hitSlop={6}>
            <Ionicons name="trash-outline" size={22} color={colors.destructive} />
          </TouchableOpacity>
        </View>
      </View>
      {isExpanded && (
        <CreditForm
          user={creditTarget!.user}
          mode={creditTarget!.mode}
          onClose={onCreditClose}
          onDone={onCreditDone}
        />
      )}
    </View>
  );
}

const PER_PAGE = 20;

export default function AdminScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const insets = useSafeAreaInsets();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const confirm = useConfirm();

  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [creditTarget, setCreditTarget] = useState<{
    user: AdminUser;
    mode: 'grant' | 'revoke';
  } | null>(null);
  const hasLoadedRef = useRef(false);

  // Stable dep-free callback — avoids re-render loop from useTranslations returning new refs
  const loadAll = useCallback(async (p: number, isRefresh = false) => {
    if (!isRefresh) {
      setAnalyticsLoading(true);
      setUsersLoading(true);
    }

    const [analyticsResult, usersResult] = await Promise.allSettled([
      adminFetch<AdminAnalytics>('/api/admin/analytics'),
      adminFetch<{ users: AdminUser[]; pagination: { total: number } }>(
        `/api/admin/users?page=${p}&perPage=${PER_PAGE}`,
      ),
    ]);

    if (analyticsResult.status === 'fulfilled') {
      setAnalytics(analyticsResult.value);
    }
    setAnalyticsLoading(false);

    if (usersResult.status === 'fulfilled') {
      setUsers(usersResult.value.users);
      setTotal(usersResult.value.pagination.total);
      setPage(p);
    }
    setUsersLoading(false);
  }, []);

  const { refreshing, handleRefresh } = usePullToRefresh(() => loadAll(page, true));

  useFocusEffect(
    useCallback(() => {
      if (hasLoadedRef.current) {
        void loadAll(1, true);
        return;
      }

      hasLoadedRef.current = true;
      void loadAll(1);
    }, [loadAll]),
  );

  async function handleToggleAdmin(user: AdminUser) {
    const action = user.isAdmin ? t('demote').toLowerCase() : t('promote').toLowerCase();
    const ok = await confirm({
      title: t('confirmTitle'),
      description: t('confirmToggleAdmin').replace('{action}', action),
      confirmText: t('confirm'),
      cancelText: tCommon('cancel'),
    });
    if (!ok) return;
    try {
      await runToastMutation({
        action: () =>
          adminFetch(`/api/admin/users/${user.id}/admin`, {
            method: 'PATCH',
            body: JSON.stringify({ makeAdmin: !user.isAdmin }),
          }),
        silentSuccess: true,
        errorMessage: t('failedToggleAdmin'),
        toastKey: 'admin-toggle-role',
        onSuccess: () => {
          setUsers((prev) =>
            prev.map((u) => (u.id === user.id ? { ...u, isAdmin: !u.isAdmin } : u)),
          );
        },
      });
    } catch {
      // Toast is handled by runToastMutation.
    }
  }

  async function handleDeleteUser(user: AdminUser) {
    const ok = await confirm({
      title: t('deleteConfirmTitle'),
      description: t('confirmDeleteUser').replace('{user}', user.email ?? user.displayName),
      confirmText: t('deleteConfirmAction'),
      cancelText: tCommon('cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await runToastMutation({
        action: () => adminFetch(`/api/admin/users/${user.id}`, { method: 'DELETE' }),
        successMessage: t('deleteUserSuccess'),
        errorMessage: t('failedDeleteUser'),
        toastKey: 'admin-delete-user',
        onSuccess: () => {
          setUsers((prev) => prev.filter((u) => u.id !== user.id));
        },
      });
    } catch {
      // Toast is handled by runToastMutation.
    }
  }

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      !q || (u.email ?? '').toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(total / PER_PAGE);

  const analyticsStats = analytics
    ? [
        {
          label: t('analyticsTotalUsers'),
          value: analytics.totalUsers,
          icon: 'people-outline' as const,
          wide: false,
        },
        {
          label: t('analyticsTotalCharts'),
          value: analytics.totalCharts,
          icon: 'disc-outline' as const,
          wide: false,
        },
        {
          label: t('analyticsTotalReadings'),
          value: analytics.totalReadings,
          icon: 'book-outline' as const,
          wide: false,
        },
        {
          label: t('analyticsCompatibility'),
          value: analytics.totalCompatibilityReports,
          icon: 'heart-outline' as const,
          wide: false,
        },
        {
          label: t('analyticsAiCalls'),
          value: analytics.totalAiCalls ?? 0,
          icon: 'sparkles-outline' as const,
          wide: false,
        },
        {
          label: t('analyticsCreditsSpent'),
          value: analytics.totalCreditsSpent ?? 0,
          icon: 'star-outline' as const,
          wide: false,
        },
        {
          label: t('analyticsTokensUsed'),
          value: (analytics.totalTokensUsed ?? 0).toLocaleString(),
          icon: 'flash-outline' as const,
          wide: true,
        },
      ]
    : [];

  return (
    <View style={styles.root}>
      <FlatList
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <>
            <View style={[styles.header, { paddingTop: insets.top + SCREEN_TOP_INSET_OFFSET }]}>
              <TouchableOpacity
                onPress={() => goBackTo(returnTo, routes.tabs.settings)}
                style={styles.backBtn}
                hitSlop={8}
              >
                <Ionicons name="chevron-back" size={22} color={colors.foreground} />
              </TouchableOpacity>
              <Text style={styles.title}>{t('title')}</Text>
              <TouchableOpacity
                onPress={() => void loadAll(page)}
                style={styles.refreshBtn}
                hitSlop={8}
              >
                <Ionicons name="refresh-outline" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <View style={styles.headerSection}>
              {analyticsLoading ? (
                <AnalyticsSkeleton />
              ) : (
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Ionicons name="bar-chart-outline" size={15} color={colors.primary} />
                    <Text style={styles.cardTitle}>{t('analyticsTitle')}</Text>
                  </View>
                  <View style={styles.statsGrid}>
                    {analyticsStats.map((s) => (
                      <View key={s.label} style={[styles.statCard, s.wide && styles.statCardWide]}>
                        <Ionicons
                          name={s.icon}
                          size={16}
                          color={colors.primary}
                          style={styles.statIcon}
                        />
                        <Text style={styles.statValue}>{s.value}</Text>
                        <Text style={styles.statLabel}>{s.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="people-outline" size={15} color={colors.primary} />
                  <Text style={styles.cardTitle}>{t('usersTitle')}</Text>
                  {total > 0 && (
                    <View style={styles.countPill}>
                      <Text style={styles.countPillText}>{total}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.searchBox}>
                  <Ionicons name="search-outline" size={16} color={colors.mutedForeground} />
                  <TextInput
                    style={styles.searchInput}
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Email или имя…"
                    placeholderTextColor={colors.mutedForeground}
                  />
                  {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
                      <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          </>
        }
        refreshing={refreshing}
        onRefresh={handleRefresh}
        data={
          usersLoading && users.length === 0
            ? (Array.from({ length: 8 }, (_, i) => ({ id: `sk-${i}` })) as AdminUser[])
            : filtered
        }
        renderItem={({ item }) =>
          item.id.startsWith('sk-') ? (
            <UserRowSkeleton />
          ) : (
            <UserRow
              user={item}
              onGrant={() => setCreditTarget({ user: item, mode: 'grant' })}
              onRevoke={() => setCreditTarget({ user: item, mode: 'revoke' })}
              onToggleAdmin={() => void handleToggleAdmin(item)}
              onDelete={() => void handleDeleteUser(item)}
              creditTarget={creditTarget}
              onCreditClose={() => setCreditTarget(null)}
              onCreditDone={() => void loadAll(page)}
            />
          )
        }
        ListEmptyComponent={
          !usersLoading ? (
            <View style={styles.emptyBox}>
              <Ionicons name="people-outline" size={32} color={colors.border} />
              <Text style={styles.emptyText}>{t('noUsers')}</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          <>
            {totalPages > 1 ? (
              <View style={styles.pagination}>
                <TouchableOpacity
                  style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
                  onPress={() => {
                    if (page > 1) void loadAll(page - 1);
                  }}
                  disabled={page <= 1}
                >
                  <Ionicons name="chevron-back" size={16} color={colors.foreground} />
                </TouchableOpacity>
                <Text style={styles.pageLabel}>
                  {page} / {totalPages}
                </Text>
                <TouchableOpacity
                  style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
                  onPress={() => {
                    if (page < totalPages) void loadAll(page + 1);
                  }}
                  disabled={page >= totalPages}
                >
                  <Ionicons name="chevron-forward" size={16} color={colors.foreground} />
                </TouchableOpacity>
              </View>
            ) : null}
            <PricingSection />
          </>
        }
      />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      gap: 8,
    },
    backBtn: { padding: 4 },
    title: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.foreground },
    refreshBtn: { padding: 4 },
    listContent: { padding: 16, paddingBottom: 48 },
    headerSection: { gap: 12, marginBottom: 12 },

    card: {
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 12,
      ...cardShadow,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    cardTitle: { fontSize: 14, fontWeight: '600', color: colors.foreground, flex: 1 },

    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    statCard: {
      backgroundColor: colors.muted,
      borderRadius: 10,
      padding: 12,
      width: '47%',
      flexGrow: 1,
      gap: 2,
    },
    statCardWide: { width: '100%', flexGrow: 0 },
    statIcon: { marginBottom: 2 },
    statValue: { fontSize: 22, fontWeight: '700', color: colors.foreground },
    statLabel: { fontSize: 11, color: colors.mutedForeground },

    countPill: {
      backgroundColor: colors.muted,
      borderRadius: 20,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    countPillText: { fontSize: 12, color: colors.mutedForeground, fontWeight: '600' },

    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.muted,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      gap: 8,
      height: 42,
    },
    searchInput: { flex: 1, fontSize: 14, color: colors.foreground },

    userCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      marginBottom: 8,
      ...cardShadow,
    },
    userRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
    avatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.muted,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    avatarAdmin: { backgroundColor: colors.primaryTint },
    avatarText: { fontSize: 15, fontWeight: '700', color: colors.mutedForeground },
    avatarTextAdmin: { color: colors.primary },
    userInfo: { flex: 1, gap: 2 },
    userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    userName: { fontSize: 14, fontWeight: '600', color: colors.foreground, flexShrink: 1 },
    adminPill: {
      backgroundColor: colors.primarySubtle,
      borderRadius: 4,
      paddingHorizontal: 5,
      paddingVertical: 1,
    },
    adminPillText: { fontSize: 10, fontWeight: '700', color: colors.primary },
    userEmail: { fontSize: 12, color: colors.mutedForeground },
    userStats: { flexDirection: 'row', gap: 8, marginTop: 4 },
    statChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    statChipText: { fontSize: 11, color: colors.mutedForeground },
    userActions: { flexDirection: 'row', gap: 2 },
    actionBtn: { padding: 6 },

    creditForm: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.muted,
      padding: 14,
      gap: 12,
    },
    creditFormHeader: { gap: 2 },
    creditFormTitle: { fontSize: 14, fontWeight: '600', color: colors.foreground },
    creditFormSub: { fontSize: 12, color: colors.mutedForeground },
    creditInput: {
      height: 44,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      fontSize: 16,
      color: colors.foreground,
      backgroundColor: colors.card,
    },
    creditFormButtons: { flexDirection: 'row', gap: 10 },
    cancelBtn: {
      flex: 1,
      height: 40,
      borderRadius: 8,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelBtnText: { fontSize: 14, fontWeight: '500', color: colors.foreground },
    confirmBtn: {
      flex: 1,
      height: 40,
      borderRadius: 8,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnDisabled: { opacity: 0.5 },
    confirmBtnText: { fontSize: 14, fontWeight: '600', color: colors.primaryForeground },

    emptyBox: { alignItems: 'center', paddingVertical: 40, gap: 10 },
    emptyText: { fontSize: 14, color: colors.mutedForeground },

    pagination: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      overflow: 'hidden',
      marginVertical: 12,
    },
    pageBtn: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pageBtnDisabled: { opacity: 0.4 },
    pageLabel: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.mutedForeground,
      paddingHorizontal: 10,
    },

    pricingSectionLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.mutedForeground,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    pricingRow: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: colors.background,
      gap: 6,
    },
    pricingRowLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.foreground,
    },
    pricingRowControls: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    freeBadge: {
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderWidth: 1,
    },
    freeBadgeOn: {
      backgroundColor: colors.primarySubtle,
      borderColor: colors.primary,
    },
    freeBadgeOff: {
      backgroundColor: colors.muted,
      borderColor: colors.border,
    },
    freeBadgeText: {
      fontSize: 11,
      fontWeight: '600',
    },
    freeBadgeTextOn: { color: colors.primary },
    freeBadgeTextOff: { color: colors.mutedForeground },
    stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      backgroundColor: colors.card,
      height: 34,
      overflow: 'hidden',
    },
    stepperBtn: {
      width: 32,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.muted,
    },
    stepperBtnText: {
      fontSize: 18,
      lineHeight: 20,
      color: colors.foreground,
      fontWeight: '400',
    },
    stepperValue: {
      minWidth: 36,
      textAlign: 'center',
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
    },
    packEmptyText: {
      fontSize: 13,
      color: colors.mutedForeground,
      textAlign: 'center',
      paddingVertical: 10,
    },
    retryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 16,
    },
    retryText: {
      fontSize: 13,
      color: colors.mutedForeground,
    },
    savePricingBtn: {
      height: 42,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
    },
    savePricingBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primaryForeground,
    },
  });
}
