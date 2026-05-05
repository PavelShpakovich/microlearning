import { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  FlatList,
  Pressable,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { chartsApi, compatibilityApi, ApiClientError } from '@clario/api-client';
import type { ChartRecord } from '@clario/api-client';
import { COMPATIBILITY_TYPES } from '@clario/types';
import type { CompatibilityType } from '@clario/types';
import { useTranslations } from '@/lib/i18n';
import {
  goBackTo,
  openCompatibilityDetail,
  openNewChart,
  resolveParentRoute,
  routes,
} from '@/lib/navigation';
import { runToastMutation } from '@/lib/mutation-toast';
import { useColors, cardShadow } from '@/lib/colors';
import { SCREEN_TOP_INSET_OFFSET } from '@/lib/layout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useInsufficientCredits } from '@/lib/insufficient-credits-context';
import { Skeleton } from '@/components/Skeleton';

const TYPE_ICONS: Record<CompatibilityType, keyof typeof Ionicons.glyphMap> = {
  romantic: 'heart-outline',
  friendship: 'people-outline',
  business: 'briefcase-outline',
  family: 'home-outline',
};

function NewCompatibilitySkeleton() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + SCREEN_TOP_INSET_OFFSET }]}
      scrollEnabled={false}
    >
      {/* Back row */}
      <View style={[styles.backRow]}>
        <Skeleton width={60} height={16} borderRadius={8} />
      </View>

      {/* Card */}
      <View style={[styles.card, { gap: 0 }]}>
        {/* Card header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Skeleton width={20} height={20} borderRadius={10} />
          <Skeleton width={140} height={18} borderRadius={6} />
        </View>
        {/* Card desc */}
        <Skeleton width={'90%'} height={13} borderRadius={6} style={{ marginBottom: 16 }} />

        {/* Type label */}
        <Skeleton width={80} height={13} borderRadius={6} style={{ marginBottom: 8 }} />
        {/* Type grid — 2×2 */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {[88, 96, 84, 78].map((w, i) => (
            <Skeleton key={i} width={w} height={36} borderRadius={10} />
          ))}
        </View>

        {/* Primary chart label + select */}
        <Skeleton width={100} height={13} borderRadius={6} style={{ marginBottom: 6 }} />
        <Skeleton width={'100%'} height={46} borderRadius={10} style={{ marginBottom: 12 }} />

        {/* Secondary chart label + select */}
        <Skeleton width={110} height={13} borderRadius={6} style={{ marginBottom: 6 }} />
        <Skeleton width={'100%'} height={46} borderRadius={10} style={{ marginBottom: 20 }} />

        {/* CTA button */}
        <Skeleton width={'100%'} height={50} borderRadius={10} />
      </View>
    </ScrollView>
  );
}

export default function NewCompatibilityScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const insets = useSafeAreaInsets();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const [charts, setCharts] = useState<ChartRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [primaryId, setPrimaryId] = useState<string | null>(null);
  const [secondaryId, setSecondaryId] = useState<string | null>(null);
  const [compatType, setCompatType] = useState<CompatibilityType>('romantic');
  const [submitting, setSubmitting] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const stepTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [pickerFor, setPickerFor] = useState<'primary' | 'secondary' | null>(null);

  const tCompat = useTranslations('compatibility');
  const tNav = useTranslations('navigation');
  const tCommon = useTranslations('common');
  const { showInsufficientCredits } = useInsufficientCredits();

  // Advance step indicator while submitting
  useEffect(() => {
    if (!submitting) {
      stepTimers.current.forEach(clearTimeout);
      stepTimers.current = [];
      setStepIndex(0);
      return;
    }
    setStepIndex(0);
    const delays = [4000, 9000, 16000];
    stepTimers.current = delays.map((delay, i) => setTimeout(() => setStepIndex(i + 1), delay));
    return () => {
      stepTimers.current.forEach(clearTimeout);
    };
  }, [submitting]);

  useEffect(() => {
    async function load() {
      try {
        const { charts: data } = await chartsApi.listCharts();
        setCharts(data.filter((c) => c.status === 'ready'));
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  async function handleCreate() {
    if (!primaryId || !secondaryId) return;
    setSubmitting(true);
    try {
      await runToastMutation({
        action: () =>
          compatibilityApi.createReport({
            primaryChartId: primaryId,
            secondaryChartId: secondaryId,
            compatibilityType: compatType,
          }),
        silentSuccess: true,
        errorMessage: tCompat('createFailed'),
        mapErrorMessage: (error) => {
          if (
            error instanceof ApiClientError &&
            (error.status === 402 || error.code === 'insufficient_credits')
          ) {
            return undefined;
          }

          return tCompat('createFailed');
        },
        toastKey: 'mobile-compatibility-create',
        onSuccess: ({ report }) => {
          openCompatibilityDetail(
            report.id,
            resolveParentRoute(returnTo, routes.tabs.compatibility),
          );
        },
        onError: (error) => {
          if (
            error instanceof ApiClientError &&
            (error.status === 402 || error.code === 'insufficient_credits')
          ) {
            const data = error.data as { required?: number; balance?: number } | undefined;
            showInsufficientCredits({ required: data?.required, balance: data?.balance });
          }
        },
      });
    } catch {
      // Toast is handled by runToastMutation.
    } finally {
      setSubmitting(false);
    }
  }

  const pickerExclude = pickerFor === 'primary' ? secondaryId : primaryId;
  const pickerOptions = charts.filter((c) => c.id !== pickerExclude);

  function handlePickerSelect(id: string) {
    if (pickerFor === 'primary') setPrimaryId(id);
    else if (pickerFor === 'secondary') setSecondaryId(id);
    setPickerFor(null);
  }

  function chartLabel(id: string | null) {
    if (!id) return null;
    const c = charts.find((c) => c.id === id);
    return c ? c.label : null;
  }

  if (loading) {
    return <NewCompatibilitySkeleton />;
  }

  const STEP_LABELS = [
    tCompat('generatingStep1'),
    tCompat('generatingStep2'),
    tCompat('generatingStep3'),
    tCompat('generatingStep4'),
  ];

  if (submitting) {
    return (
      <View
        style={[styles.generatingContainer, { paddingTop: insets.top + SCREEN_TOP_INSET_OFFSET }]}
      >
        <TouchableOpacity
          onPress={() => goBackTo(returnTo, routes.tabs.compatibility)}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={18} color={colors.mutedForeground} />
          <Text style={styles.backText}>{tNav('back')}</Text>
        </TouchableOpacity>
        <View style={styles.generatingContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.generatingTitle}>{tCompat('generatingTitle')}</Text>
          <Text style={styles.generatingStep}>{STEP_LABELS[stepIndex]}</Text>
          <View style={styles.progressDots}>
            {STEP_LABELS.map((_, i) => (
              <View
                key={i}
                style={[styles.progressDot, i <= stepIndex && styles.progressDotActive]}
              />
            ))}
          </View>
        </View>
      </View>
    );
  }

  if (charts.length < 2) {
    return (
      <View style={styles.center}>
        <Ionicons name="planet-outline" size={48} color={colors.border} />
        <Text style={styles.notEnoughText}>{tCompat('notEnoughCharts')}</Text>
        <TouchableOpacity
          onPress={() => openNewChart(routes.tabs.compatibility)}
          style={styles.linkButton}
        >
          <Text style={styles.linkText}>{tCompat('createReport')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => goBackTo(returnTo, routes.tabs.compatibility)}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={18} color={colors.mutedForeground} />
          <Text style={styles.backText}>{tNav('back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const TypeIcon = TYPE_ICONS[compatType];

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Back row */}
        <View style={[styles.backRow, { marginTop: insets.top + SCREEN_TOP_INSET_OFFSET }]}>
          <TouchableOpacity
            onPress={() => goBackTo(returnTo, routes.tabs.compatibility)}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={18} color={colors.mutedForeground} />
            <Text style={styles.backText}>{tNav('back')}</Text>
          </TouchableOpacity>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {/* Card header */}
          <View style={styles.cardHeader}>
            <Ionicons name={TypeIcon} size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>{tCompat('newReport')}</Text>
          </View>
          <Text style={styles.cardDesc}>{tCompat('newReportDesc')}</Text>

          {/* Type grid */}
          <Text style={styles.fieldLabel}>{tCompat('typeLabel')}</Text>
          <View style={styles.typeGrid}>
            {COMPATIBILITY_TYPES.map((type) => {
              const isActive = compatType === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeChip, isActive && styles.typeChipActive]}
                  onPress={() => setCompatType(type)}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name={TYPE_ICONS[type]}
                    size={16}
                    color={isActive ? colors.primary : colors.mutedForeground}
                  />
                  <Text style={[styles.typeChipText, isActive && styles.typeChipTextActive]}>
                    {tCompat(`type_${type}` as Parameters<typeof tCompat>[0])}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Primary chart select */}
          <Text style={styles.fieldLabel}>{tCompat('primaryChart')}</Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setPickerFor('primary')}
            activeOpacity={0.75}
          >
            <Text style={[styles.selectButtonText, !primaryId && styles.selectButtonPlaceholder]}>
              {chartLabel(primaryId) ?? tCompat('selectChartPlaceholder')}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>

          {/* Secondary chart select */}
          <Text style={[styles.fieldLabel, { marginTop: 12 }]}>{tCompat('secondaryChart')}</Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setPickerFor('secondary')}
            activeOpacity={0.75}
          >
            <Text style={[styles.selectButtonText, !secondaryId && styles.selectButtonPlaceholder]}>
              {chartLabel(secondaryId) ?? tCompat('selectChartPlaceholder')}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>

          {/* CTA */}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              (!primaryId || !secondaryId || submitting) && styles.buttonDisabled,
            ]}
            onPress={handleCreate}
            disabled={!primaryId || !secondaryId || submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <>
                <Ionicons name="sparkles" size={16} color={colors.primaryForeground} />
                <Text style={styles.primaryButtonText}>{tCompat('createReport')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Chart picker modal */}
      <Modal
        visible={pickerFor !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPickerFor(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {pickerFor === 'primary' ? tCompat('primaryChart') : tCompat('secondaryChart')}
            </Text>
            <TouchableOpacity onPress={() => setPickerFor(null)} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={pickerOptions}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.modalList}
            renderItem={({ item }) => {
              const currentId = pickerFor === 'primary' ? primaryId : secondaryId;
              const selected = item.id === currentId;
              return (
                <Pressable
                  style={({ pressed }: { pressed: boolean }) => [
                    styles.modalItem,
                    pressed && styles.modalItemPressed,
                  ]}
                  onPress={() => handlePickerSelect(item.id)}
                >
                  <View style={styles.modalItemContent}>
                    <Text style={[styles.modalItemLabel, selected && styles.modalItemLabelActive]}>
                      {item.label}
                    </Text>
                    <Text style={styles.modalItemSub}>
                      {item.person_name} · {item.birth_date}
                    </Text>
                  </View>
                  {selected && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                </Pressable>
              );
            }}
          />
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setPickerFor(null)}>
              <Text style={styles.cancelButtonText}>{tCommon('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
      gap: 12,
      padding: 24,
    },
    content: { padding: 20, paddingBottom: 48 },

    backRow: { marginBottom: 20 },
    backButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    backText: { color: colors.mutedForeground, fontSize: 14 },

    // Card
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 20,
      ...cardShadow,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    cardTitle: { fontSize: 17, fontWeight: '600', color: colors.foreground },
    cardDesc: { fontSize: 13, color: colors.mutedForeground, marginBottom: 20, lineHeight: 18 },

    // Field label
    fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.foreground, marginBottom: 8 },

    // Type grid (2×2)
    typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    typeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      width: '47%',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
    },
    typeChipActive: { borderColor: colors.primary, backgroundColor: colors.primarySubtle },
    typeChipText: { fontSize: 13, color: colors.mutedForeground, fontWeight: '500' },
    typeChipTextActive: { color: colors.primary, fontWeight: '600' },

    // Select button
    selectButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 11,
    },
    selectButtonText: { fontSize: 14, color: colors.foreground, flex: 1 },
    selectButtonPlaceholder: { color: colors.mutedForeground },

    // CTA
    primaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.primary,
      height: 44,
      borderRadius: 10,
      marginTop: 20,
    },
    buttonDisabled: { opacity: 0.5 },
    primaryButtonText: { color: colors.primaryForeground, fontSize: 15, fontWeight: '600' },

    // Generating
    generatingContainer: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 20,
    },
    generatingContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 16,
      paddingHorizontal: 20,
      paddingBottom: 60,
    },
    generatingTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.foreground,
      textAlign: 'center',
    },
    generatingStep: {
      fontSize: 14,
      color: colors.mutedForeground,
      textAlign: 'center',
      minHeight: 20,
    },
    progressDots: {
      flexDirection: 'row',
      gap: 6,
      marginTop: 8,
    },
    progressDot: {
      width: 24,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.primaryTint,
    },
    progressDotActive: {
      backgroundColor: colors.primary,
    },

    // Empty state
    notEnoughText: { fontSize: 15, color: colors.mutedForeground, textAlign: 'center' },
    linkButton: { marginTop: 4 },
    linkText: { color: colors.primary, fontSize: 14, fontWeight: '500' },

    // Modal
    modalContainer: { flex: 1, backgroundColor: colors.background },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: { fontSize: 16, fontWeight: '600', color: colors.foreground },
    modalList: { padding: 12 },
    modalItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 14,
      borderRadius: 12,
      marginBottom: 4,
    },
    modalItemPressed: { backgroundColor: colors.muted },
    modalItemContent: { flex: 1 },
    modalItemLabel: { fontSize: 15, fontWeight: '500', color: colors.foreground },
    modalItemLabelActive: { color: colors.primary },
    modalItemSub: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
    modalFooter: { padding: 16, borderTopWidth: 1, borderTopColor: colors.border },
    cancelButton: {
      height: 44,
      borderRadius: 10,
      backgroundColor: colors.muted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelButtonText: { fontSize: 15, fontWeight: '500', color: colors.foreground },
  });
}
