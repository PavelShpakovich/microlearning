import { useCallback, useState, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  openChartsTab,
  openCompatibilityDetail,
  openCompatibilityNew,
  routes,
} from '@/lib/navigation';
import { Ionicons } from '@expo/vector-icons';
import { compatibilityApi } from '@clario/api-client';
import type { CompatibilityReport } from '@clario/api-client';
import { useTranslations, getLocale } from '@/lib/i18n';
import { useConfirm } from '@/components/ConfirmDialog';
import { runToastMutation } from '@/lib/mutation-toast';
import { useColors, cardShadow } from '@/lib/colors';
import { SCREEN_TOP_INSET_OFFSET } from '@/lib/layout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Skeleton } from '@/components/Skeleton';
import { SwipeToDeleteRow } from '@/components/SwipeToDeleteRow';
import { usePullToRefresh } from '@/lib/refresh';

function CompatibilityListSkeleton() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: 4 }]}>
      <View
        style={[
          styles.headerBar,
          { paddingTop: insets.top + SCREEN_TOP_INSET_OFFSET, paddingHorizontal: 20 },
        ]}
      >
        <View style={styles.headerTop}>
          <View style={styles.headerText}>
            <Skeleton width={70} height={10} />
            <Skeleton width={140} height={22} style={{ marginTop: 6 }} />
          </View>
          <Skeleton width={36} height={36} borderRadius={8} />
        </View>
        <Skeleton width={'80%'} height={12} style={{ marginTop: 8 }} />
      </View>
      <View style={styles.list}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.card}>
            <View style={styles.cardTypeRow}>
              <Skeleton width={12} height={12} borderRadius={6} />
              <Skeleton width={80} height={10} />
            </View>
            <Skeleton width={'75%'} height={15} style={{ marginTop: 6 }} />
            {i % 2 === 0 && <Skeleton width={'90%'} height={11} style={{ marginTop: 4 }} />}
            <View style={styles.cardFooter}>
              <View style={styles.cardFooterLeft}>
                {i % 3 !== 0 && <Skeleton width={55} height={18} borderRadius={9} />}
                <Skeleton width={70} height={11} />
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

type CompatType = 'romantic' | 'friendship' | 'business' | 'family';

const TYPE_ICONS: Record<CompatType, keyof typeof Ionicons.glyphMap> = {
  romantic: 'heart-outline',
  friendship: 'people-outline',
  business: 'briefcase-outline',
  family: 'home-outline',
};

function getStatusStyle(status: string, colors: ReturnType<typeof useColors>) {
  switch (status) {
    case 'ready':
      return { bg: colors.successSubtle, fg: colors.success };
    case 'error':
      return { bg: colors.destructiveSubtle, fg: colors.destructive };
    default:
      return { bg: '#FEF3C7', fg: '#92400E' };
  }
}

export default function CompatibilityListScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const insets = useSafeAreaInsets();
  const [reports, setReports] = useState<CompatibilityReport[]>([]);
  const [loading, setLoading] = useState(true);
  const hasLoadedRef = useRef(false);

  const tCompat = useTranslations('compatibility');
  const tCommon = useTranslations('common');
  const confirm = useConfirm();

  const loadReports = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const { reports: data } = await compatibilityApi.listReports();
      setReports(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const { refreshing, handleRefresh } = usePullToRefresh(() => loadReports(true));

  useFocusEffect(
    useCallback(() => {
      if (hasLoadedRef.current) {
        void loadReports(true);
        return;
      }
      hasLoadedRef.current = true;
      void loadReports();
    }, [loadReports]),
  );

  async function handleDelete(report: CompatibilityReport) {
    const personTitle =
      report.primary_person_name && report.secondary_person_name
        ? tCompat('reportTitleFallback')
            .replace('{primary}', report.primary_person_name)
            .replace('{secondary}', report.secondary_person_name)
        : (report.title ?? tCompat('synastryLabel'));
    const ok = await confirm({
      title: tCompat('deleteTitle'),
      description: tCompat('confirmDelete', { title: personTitle }),
      confirmText: tCommon('delete'),
      cancelText: tCommon('cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await runToastMutation({
        action: () => compatibilityApi.deleteReport(report.id),
        silentSuccess: true,
        errorMessage: tCompat('deleteFailed'),
        toastKey: 'mobile-compatibility-delete',
        onSuccess: () => {
          setReports((prev) => prev.filter((r) => r.id !== report.id));
        },
      });
    } catch {
      // Toast is handled by runToastMutation.
    }
  }

  function getStatusLabel(status: string) {
    const map: Record<string, string> = {
      ready: tCompat('statusReady'),
      error: tCompat('statusError'),
      pending: tCompat('statusPending'),
      generating: tCompat('statusGenerating'),
    };
    return map[status] ?? status;
  }

  if (loading) {
    return <CompatibilityListSkeleton />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={reports}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListHeaderComponent={
          <View style={[styles.headerBar, { paddingTop: insets.top + SCREEN_TOP_INSET_OFFSET }]}>
            <View style={styles.headerTop}>
              <View style={styles.headerText}>
                <Text style={styles.eyebrow}>{tCompat('sectionLabel')}</Text>
                <Text style={styles.pageTitle}>{tCompat('heading')}</Text>
              </View>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => openCompatibilityNew(routes.tabs.compatibility)}
              >
                <Ionicons name="add" size={20} color={colors.primaryForeground} />
              </TouchableOpacity>
            </View>
            <Text style={styles.pageDesc}>{tCompat('description')}</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="heart-outline" size={48} color={colors.border} />
            <Text style={styles.emptyTitle}>{tCompat('emptyTitle')}</Text>
            <Text style={styles.emptyDesc}>{tCompat('emptyDescription')}</Text>
            <View style={styles.emptyButtons}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => openCompatibilityNew(routes.tabs.compatibility)}
              >
                <Text style={styles.primaryButtonText}>{tCompat('createReport')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.outlineButton} onPress={openChartsTab}>
                <Text style={styles.outlineButtonText}>{tCompat('goToCharts')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const statusStyle = getStatusStyle(item.status, colors);
          const compatType = (item.compatibility_type ?? 'romantic') as CompatType;
          const typeIcon = TYPE_ICONS[compatType] ?? 'heart-outline';
          const cardTitle =
            item.primary_person_name && item.secondary_person_name
              ? tCompat('reportTitleFallback')
                  .replace('{primary}', item.primary_person_name)
                  .replace('{secondary}', item.secondary_person_name)
              : (item.title ?? tCompat('synastryLabel'));

          return (
            <SwipeToDeleteRow onDeletePress={() => handleDelete(item)}>
              <TouchableOpacity
                style={styles.card}
                onPress={() => openCompatibilityDetail(item.id, routes.tabs.compatibility)}
                activeOpacity={0.75}
              >
                {/* Type row */}
                <View style={styles.cardTypeRow}>
                  <Ionicons name={typeIcon} size={12} color={colors.primary} />
                  <Text style={styles.cardTypeLabel}>
                    {tCompat(`type_${compatType}` as Parameters<typeof tCompat>[0])}
                  </Text>
                </View>

                {/* Title */}
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {cardTitle}
                </Text>

                {/* Summary */}
                {item.rendered_content_json?.summary ? (
                  <Text style={styles.cardSummary} numberOfLines={2}>
                    {item.rendered_content_json.summary}
                  </Text>
                ) : null}

                {/* Footer: status + date */}
                <View style={styles.cardFooter}>
                  <View style={styles.cardFooterLeft}>
                    {item.status !== 'ready' ? (
                      <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                        <Text style={[styles.statusBadgeText, { color: statusStyle.fg }]}>
                          {getStatusLabel(item.status)}
                        </Text>
                      </View>
                    ) : null}
                    <Text style={styles.cardDate}>
                      {new Date(item.created_at).toLocaleDateString(getLocale())}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </SwipeToDeleteRow>
          );
        }}
      />
    </View>
  );
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
      backgroundColor: colors.background,
    },
    headerBar: {
      paddingTop: 56,
      paddingBottom: 8,
    },
    pageDesc: {
      fontSize: 13,
      color: colors.mutedForeground,
      lineHeight: 19,
      marginTop: 4,
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
    eyebrow: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 2,
      marginBottom: 2,
    },
    pageTitle: {
      fontSize: 26,
      fontWeight: '600',
      color: colors.foreground,
      letterSpacing: -0.5,
    },
    addButton: {
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    list: {
      paddingHorizontal: 20,
      paddingBottom: 32,
      paddingTop: 4,
      gap: 12,
      flexGrow: 1,
    },
    emptyState: {
      alignItems: 'center',
      gap: 12,
      paddingTop: 60,
      paddingHorizontal: 24,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.foreground,
      textAlign: 'center',
    },
    emptyDesc: {
      fontSize: 14,
      color: colors.mutedForeground,
      lineHeight: 21,
      textAlign: 'center',
    },
    emptyButtons: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 8,
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    primaryButton: {
      backgroundColor: colors.primary,
      height: 40,
      borderRadius: 8,
      paddingHorizontal: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonText: {
      color: colors.primaryForeground,
      fontSize: 15,
      fontWeight: '600',
    },
    outlineButton: {
      height: 40,
      borderRadius: 8,
      paddingHorizontal: 20,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    outlineButtonText: {
      color: colors.foreground,
      fontSize: 15,
      fontWeight: '600',
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 6,
      ...cardShadow,
    },
    cardTypeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginBottom: 2,
    },
    cardTypeLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 2,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.foreground,
    },
    cardSummary: {
      fontSize: 13,
      color: colors.mutedForeground,
      lineHeight: 19,
    },
    cardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 4,
    },
    cardFooterLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
    },
    cardDate: {
      fontSize: 12,
      color: colors.mutedForeground,
    },
    statusBadge: {
      borderRadius: 99,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    statusBadgeText: {
      fontSize: 11,
      fontWeight: '600',
    },
    deleteButton: {
      padding: 4,
    },
  });
}
