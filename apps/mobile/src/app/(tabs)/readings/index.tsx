import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  ScrollView,
} from 'react-native';

import { openChartsTab, openNewChart, openReadingDetail, routes } from '@/lib/navigation';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { readingsApi } from '@clario/api-client';
import type { ReadingRecord } from '@clario/api-client';
import { READING_TYPES } from '@clario/types';
import { useTranslations, getLocale } from '@/lib/i18n';
import { useConfirm } from '@/components/ConfirmDialog';
import { allMessages } from '@clario/i18n';
import { useColors, cardShadow } from '@/lib/colors';
import { SCREEN_TOP_INSET_OFFSET } from '@/lib/layout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Skeleton } from '@/components/Skeleton';
import { SwipeToDeleteRow } from '@/components/SwipeToDeleteRow';
import { usePullToRefresh } from '@/lib/refresh';

function ReadingsListSkeleton() {
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
            <Skeleton width={150} height={20} style={{ marginTop: 6 }} />
          </View>
        </View>
        <Skeleton width={'85%'} height={12} style={{ marginTop: 8 }} />
      </View>
      {/* Search bar skeleton */}
      <View style={{ paddingHorizontal: 20, marginBottom: 10 }}>
        <Skeleton width={'100%'} height={40} borderRadius={10} />
      </View>
      {/* Filter chips — dynamic based on READING_TYPES */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={[styles.filterRow, { paddingHorizontal: 20 }]}
      >
        {['all', 'tarot', 'natal', 'transit', 'synastry'].map((_, i) => (
          <Skeleton
            key={i}
            width={48 + i * 8}
            height={30}
            borderRadius={15}
            style={{ marginRight: 8 }}
          />
        ))}
      </ScrollView>
      {/* Cards */}
      <ScrollView contentContainerStyle={styles.listContent}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.card}>
            <View style={styles.cardTypeRow}>
              <Skeleton width={11} height={11} borderRadius={5} />
              <Skeleton width={80} height={10} />
            </View>
            <Skeleton width={'70%'} height={15} style={{ marginTop: 6 }} />
            {i % 2 === 0 && <Skeleton width={'90%'} height={11} style={{ marginTop: 4 }} />}
            <View style={styles.cardFooter}>
              <View style={styles.cardFooterLeft}>
                {i % 3 !== 0 && <Skeleton width={50} height={18} borderRadius={9} />}
                <Skeleton width={70} height={11} />
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export default function ReadingsListScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const insets = useSafeAreaInsets();
  const [readings, setReadings] = useState<ReadingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const hasLoadedRef = useRef(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tReadings = useTranslations('readingsPage');
  const tCommon = useTranslations('common');
  const confirm = useConfirm();

  const loadReadings = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const { readings: data } = await readingsApi.listReadings();
      setReadings(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const { refreshing, handleRefresh } = usePullToRefresh(() => loadReadings(true));

  useFocusEffect(
    useCallback(() => {
      if (hasLoadedRef.current) {
        void loadReadings(true);
        return;
      }

      hasLoadedRef.current = true;
      void loadReadings();
    }, [loadReadings]),
  );

  // Poll every 4s while any reading is still generating/pending
  useEffect(() => {
    const hasInProgress = readings.some((r) => r.status === 'pending' || r.status === 'generating');
    if (hasInProgress) {
      if (!pollRef.current) {
        pollRef.current = setInterval(() => {
          void loadReadings(true);
        }, 4000);
      }
    } else {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [readings, loadReadings]);

  async function confirmDelete(reading: ReadingRecord) {
    const ok = await confirm({
      title: tReadings('deleteReading'),
      description: tReadings('confirmDeleteReading', {
        title: reading.title || reading.reading_type,
      }),
      confirmText: tReadings('deleteReading'),
      cancelText: tCommon('cancel'),
      destructive: true,
    });
    if (!ok) return;
    await readingsApi.deleteReading(reading.id);
    setReadings((prev) => prev.filter((r) => r.id !== reading.id));
  }

  function getStatusLabel(status: string): string {
    switch (status) {
      case 'ready':
        return tReadings('statusReady');
      case 'pending':
        return tReadings('statusPending');
      case 'generating':
        return tReadings('statusGenerating');
      case 'error':
        return tReadings('statusError');
      default:
        return status;
    }
  }

  function getStatusStyle(status: string) {
    switch (status) {
      case 'ready':
        return { bg: colors.successSubtle, fg: colors.success };
      case 'error':
        return { bg: colors.destructiveSubtle, fg: colors.destructive };
      default:
        return { bg: '#FEF3C7', fg: '#92400E' };
    }
  }

  const readingTypeLabels = allMessages[getLocale()].readingsPage.readingTypes as Record<
    string,
    string
  >;

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return readings.filter((r) => {
      const matchesSearch = !q || (r.title ?? '').toLowerCase().includes(q);
      const matchesType = typeFilter === 'all' || r.reading_type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [readings, search, typeFilter]);

  if (loading) {
    return <ReadingsListSkeleton />;
  }

  const listEmptyComponent =
    readings.length === 0 ? (
      <View style={styles.emptyContainer}>
        <Ionicons name="sparkles-outline" size={48} color={colors.border} />
        <Text style={styles.emptyTitle}>{tReadings('noReadingsTitle')}</Text>
        <Text style={styles.emptyDesc}>{tReadings('noReadingsDescription')}</Text>
        <View style={styles.emptyButtons}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => openNewChart(routes.tabs.readings)}
          >
            <Text style={styles.primaryButtonText}>{tReadings('createChart')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.outlineButton} onPress={openChartsTab}>
            <Text style={styles.outlineButtonText}>{tReadings('openCharts')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    ) : filtered.length === 0 ? (
      <View style={styles.noResultsContainer}>
        <Text style={styles.noResultsText}>{tReadings('noResults')}</Text>
      </View>
    ) : null;

  return (
    <View style={styles.container}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <>
            <View style={[styles.headerBar, { paddingTop: insets.top + SCREEN_TOP_INSET_OFFSET }]}>
              <View style={styles.headerTop}>
                <View style={styles.headerText}>
                  <Text style={styles.eyebrow}>{tReadings('sectionLabel')}</Text>
                  <Text style={styles.pageTitle}>{tReadings('heading')}</Text>
                </View>
              </View>
              <Text style={styles.pageDesc}>{tReadings('description')}</Text>
            </View>

            <View style={styles.searchWrapper}>
              <Ionicons
                name="search-outline"
                size={16}
                color={colors.mutedForeground}
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder={tReadings('searchPlaceholder')}
                placeholderTextColor={colors.mutedForeground}
                clearButtonMode="while-editing"
              />
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterScroll}
              contentContainerStyle={styles.filterRow}
            >
              <TouchableOpacity
                style={[styles.filterChip, typeFilter === 'all' && styles.filterChipActive]}
                onPress={() => setTypeFilter('all')}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    typeFilter === 'all' && styles.filterChipTextActive,
                  ]}
                >
                  {tReadings('filterAll')}
                </Text>
              </TouchableOpacity>
              {READING_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.filterChip, typeFilter === type && styles.filterChipActive]}
                  onPress={() => setTypeFilter(type)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      typeFilter === type && styles.filterChipTextActive,
                    ]}
                  >
                    {readingTypeLabels[type] ?? type}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        }
        ListEmptyComponent={listEmptyComponent}
        renderItem={({ item }) => {
          const statusStyle = getStatusStyle(item.status);
          return (
            <SwipeToDeleteRow onDeletePress={() => confirmDelete(item)}>
              <TouchableOpacity
                style={styles.card}
                onPress={() => openReadingDetail(item.id, routes.tabs.readings)}
                activeOpacity={0.75}
              >
                {/* Type label row */}
                <View style={styles.cardTypeRow}>
                  <Ionicons name="sparkles" size={11} color={colors.primary} />
                  <Text style={styles.cardTypeLabel}>
                    {readingTypeLabels[item.reading_type] ?? item.reading_type}
                  </Text>
                </View>

                {/* Title */}
                <Text style={styles.cardTitle}>
                  {item.title || readingTypeLabels[item.reading_type]}
                </Text>

                {/* Summary */}
                {item.summary ? (
                  <Text style={styles.cardSummary} numberOfLines={2}>
                    {item.summary}
                  </Text>
                ) : null}

                {/* Footer: date + status badge */}
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
    pageDesc: {
      fontSize: 13,
      color: colors.mutedForeground,
      lineHeight: 19,
      marginTop: 4,
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

    // ── Search ───────────────────────────────────────────────────────────────────
    searchWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 10,
      height: 40,
    },
    searchIcon: {
      marginRight: 6,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: colors.foreground,
      height: 40,
    },

    // ── Type filter chips ────────────────────────────────────────────────────────
    filterScroll: {
      flexGrow: 0,
      flexShrink: 0,
    },
    filterRow: {
      paddingRight: 12,
      paddingBottom: 10,
      alignItems: 'center',
    },
    filterChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 99,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 8,
    },
    filterChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterChipText: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.mutedForeground,
    },
    filterChipTextActive: {
      color: colors.primaryForeground,
      fontWeight: '600',
    },

    // ── List ─────────────────────────────────────────────────────────────────────
    listContent: {
      paddingHorizontal: 20,
      paddingBottom: 32,
      paddingTop: 4,
      gap: 12,
    },
    noResultsContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    noResultsText: {
      fontSize: 14,
      color: colors.mutedForeground,
      textAlign: 'center',
    },

    // ── Card ─────────────────────────────────────────────────────────────────────
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

    // ── Empty state ───────────────────────────────────────────────────────────────
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
      gap: 12,
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
  });
}
