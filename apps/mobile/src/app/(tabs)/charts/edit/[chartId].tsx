import { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { chartsApi, locationsApi } from '@clario/api-client';
import type { ChartRecord, CityOption } from '@clario/api-client';
import { normalizeUpdateChartBirthTime, resolveChartTimezone } from '@clario/validation';
import { useTranslations } from '@/lib/i18n';
import { useColors } from '@/lib/colors';
import { SCREEN_TOP_INSET_OFFSET } from '@/lib/layout';
import { goBackTo, routes } from '@/lib/navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  buildChartFormLocationPatch,
  CHART_FORM_TOTAL_STEPS,
  getChartDisplayLocation,
  mapChartRecordToFormData,
  type ChartFormData,
  validateChartFormStep,
} from '@/lib/chart-form';
import { Skeleton } from '@/components/Skeleton';
import { ChartFormScreen } from '@/components/charts/ChartFormScreen';

function EditChartSkeleton() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header bar */}
      <View style={[styles.headerBar, { paddingTop: insets.top + SCREEN_TOP_INSET_OFFSET }]}>
        <Skeleton width={60} height={16} borderRadius={8} />
        <Skeleton width={50} height={13} borderRadius={6} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.stepContainer}>
          {/* Step title + desc */}
          <Skeleton width={180} height={22} borderRadius={6} />
          <Skeleton width={'80%'} height={14} borderRadius={6} style={{ marginTop: 4 }} />
          {/* Label field */}
          <Skeleton width={80} height={13} borderRadius={6} style={{ marginTop: 10 }} />
          <Skeleton width={'100%'} height={44} borderRadius={8} style={{ marginTop: 4 }} />
          {/* Name field */}
          <Skeleton width={100} height={13} borderRadius={6} style={{ marginTop: 10 }} />
          <Skeleton width={'100%'} height={44} borderRadius={8} style={{ marginTop: 4 }} />
          {/* Subject type label */}
          <Skeleton width={110} height={13} borderRadius={6} style={{ marginTop: 10 }} />
          {/* Chips row */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {[72, 80, 64, 70, 60].map((w, i) => (
              <Skeleton key={i} width={w} height={32} borderRadius={20} />
            ))}
          </View>
        </View>
        {/* Next button */}
        <Skeleton width={'100%'} height={50} borderRadius={10} style={{ marginTop: 28 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default function EditChartScreen() {
  const { chartId, returnTo } = useLocalSearchParams<{ chartId: string; returnTo?: string }>();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<ChartFormData>(mapChartRecordToFormDataPlaceholder());
  const [cityDisplay, setCityDisplay] = useState('');
  const [cityModalOpen, setCityModalOpen] = useState(false);
  const [houseExpanded, setHouseExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tForm = useTranslations('chartForm');

  useEffect(() => {
    if (!chartId) return;
    async function loadChart() {
      try {
        const detail = await chartsApi.getChart(chartId);
        const c: ChartRecord = detail.chart;
        const mappedForm = mapChartRecordToFormData(c);
        setForm(mappedForm);
        setCityDisplay(getChartDisplayLocation(mappedForm));
      } finally {
        setLoading(false);
      }
    }
    void loadChart();
  }, [chartId]);

  function update<K extends keyof ChartFormData>(key: K, value: ChartFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleCitySelect(city: CityOption) {
    setCityDisplay(city.displayName);
    const patch = await buildChartFormLocationPatch(city, locationsApi.lookupTimezone);
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function validateStep(): string | null {
    return validateChartFormStep(step, form, {
      identity: tForm('validationIdentity'),
      birth: tForm('validationBirth'),
      birthTime: tForm('validationBirthTime'),
      location: tForm('validationLocation'),
    });
  }

  function handleNext() {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep((s) => s + 1);
  }

  async function handleSubmit() {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const timezone = resolveChartTimezone(form.timezone, form.country);
      await chartsApi.updateChart(chartId, {
        label: form.label.trim(),
        personName: form.personName.trim(),
        subjectType: form.subjectType,
        birthDate: form.birthDate.trim(),
        birthTime: normalizeUpdateChartBirthTime(form.birthTimeKnown, form.birthTime),
        birthTimeKnown: form.birthTimeKnown,
        city: form.city,
        country: form.country,
        timezone: timezone ?? null,
        latitude: form.lat,
        longitude: form.lon,
        houseSystem: form.houseSystem,
        notes: null,
      });
      goBackTo(returnTo, routes.charts.detail(chartId));
    } catch {
      setError(tForm('errorToast'));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <EditChartSkeleton />;
  }

  return (
    <ChartFormScreen
      form={form}
      step={step}
      totalSteps={CHART_FORM_TOTAL_STEPS}
      cityDisplay={cityDisplay}
      cityModalOpen={cityModalOpen}
      houseExpanded={houseExpanded}
      submitting={submitting}
      error={error}
      submitLabel={tForm('submitEdit')}
      onBack={() =>
        step > 1 ? setStep((value) => value - 1) : goBackTo(returnTo, routes.charts.detail(chartId))
      }
      onNext={handleNext}
      onSubmit={handleSubmit}
      onUpdate={update}
      onSelectCity={handleCitySelect}
      onToggleCityModal={setCityModalOpen}
      onToggleHouseExpanded={setHouseExpanded}
    />
  );
}

function mapChartRecordToFormDataPlaceholder(): ChartFormData {
  return {
    label: '',
    personName: '',
    subjectType: 'self',
    birthDate: '',
    birthTime: '',
    birthTimeKnown: true,
    houseSystem: 'placidus',
    city: '',
    country: '',
    lat: null,
    lon: null,
    timezone: '',
  };
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
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 56,
      paddingBottom: 12,
    },
    content: {
      padding: 20,
      paddingBottom: 48,
    },
    stepContainer: {
      gap: 10,
    },
  });
}
