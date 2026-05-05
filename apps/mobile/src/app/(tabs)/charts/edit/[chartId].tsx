import { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { chartsApi, locationsApi } from '@clario/api-client';
import type { ChartRecord, CityOption } from '@clario/api-client';
import { CHART_SUBJECT_TYPES, HOUSE_SYSTEMS } from '@clario/types';
import { normalizeUpdateChartBirthTime, resolveChartTimezone } from '@clario/validation';
import { useTranslations } from '@/lib/i18n';
import { useColors } from '@/lib/colors';
import { SCREEN_TOP_INSET_OFFSET } from '@/lib/layout';
import { goBackTo, routes } from '@/lib/navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Skeleton } from '@/components/Skeleton';
import { CityPickerModal } from '@/components/CityPickerModal';
import { DateTimePickerField } from '@/components/DateTimePickerField';

type SubjectType = (typeof CHART_SUBJECT_TYPES)[number];
type HouseSystem = (typeof HOUSE_SYSTEMS)[number];

interface FormData {
  label: string;
  personName: string;
  subjectType: SubjectType;
  birthDate: string;
  birthTime: string;
  birthTimeKnown: boolean;
  houseSystem: HouseSystem;
  city: string;
  country: string;
  lat: number | null;
  lon: number | null;
  timezone: string;
}

const TOTAL_STEPS = 3;

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
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const insets = useSafeAreaInsets();
  const { chartId, returnTo } = useLocalSearchParams<{ chartId: string; returnTo?: string }>();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormData>({
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
  });
  const [cityDisplay, setCityDisplay] = useState('');
  const [cityModalOpen, setCityModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tForm = useTranslations('chartForm');
  const tNav = useTranslations('navigation');

  useEffect(() => {
    if (!chartId) return;
    async function loadChart() {
      try {
        const detail = await chartsApi.getChart(chartId);
        const c: ChartRecord = detail.chart;
        setForm({
          label: c.label,
          personName: c.person_name,
          subjectType: (CHART_SUBJECT_TYPES.includes(c.subject_type as SubjectType)
            ? c.subject_type
            : 'self') as SubjectType,
          birthDate: c.birth_date,
          birthTime: c.birth_time ?? '',
          birthTimeKnown: c.birth_time_known,
          houseSystem: (HOUSE_SYSTEMS.includes(c.house_system as HouseSystem)
            ? c.house_system
            : 'placidus') as HouseSystem,
          city: c.city,
          country: c.country,
          lat: c.latitude ?? null,
          lon: c.longitude ?? null,
          timezone: resolveChartTimezone(c.timezone, c.country) ?? '',
        });
        setCityDisplay(c.city ? `${c.city}, ${c.country}` : '');
      } finally {
        setLoading(false);
      }
    }
    void loadChart();
  }, [chartId]);

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleCitySelect(city: CityOption) {
    setCityDisplay(city.displayName);
    update('city', city.city);
    update('country', city.country);
    update('lat', city.lat);
    update('lon', city.lon);
    const tz = await locationsApi.lookupTimezone(city.lat, city.lon);
    update('timezone', resolveChartTimezone(tz, city.country) ?? '');
  }

  function validateStep(): string | null {
    if (step === 1) {
      if (!form.label.trim()) return tForm('validationIdentity');
      if (!form.personName.trim()) return tForm('validationIdentity');
    }
    if (step === 2) {
      if (!form.birthDate.trim()) return tForm('validationBirth');
      if (form.birthTimeKnown && !form.birthTime.trim()) return tForm('validationBirthTime');
    }
    if (step === 3) {
      if (!form.city.trim() || !form.country.trim()) return tForm('validationLocation');
    }
    return null;
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

  const subjectLabels: Record<SubjectType, string> = {
    self: tForm('subjectSelf'),
    partner: tForm('subjectPartner'),
    child: tForm('subjectChild'),
    client: tForm('subjectClient'),
    other: tForm('subjectOther'),
  };

  const houseLabels: Record<HouseSystem, string> = {
    placidus: tForm('housePlacidus'),
    koch: tForm('houseKoch'),
    equal: tForm('houseEqual'),
    whole_sign: tForm('houseWholeSigns'),
    porphyry: tForm('housePorphyry'),
    regiomontanus: tForm('houseRegiomontanus'),
    campanus: tForm('houseCampanus'),
  };

  if (loading) {
    return <EditChartSkeleton />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.headerBar, { paddingTop: insets.top + SCREEN_TOP_INSET_OFFSET }]}>
        <TouchableOpacity
          onPress={() =>
            step > 1 ? setStep((s) => s - 1) : goBackTo(returnTo, routes.charts.detail(chartId))
          }
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={18} color={colors.mutedForeground} />
          <Text style={styles.backText}>{tNav('back')}</Text>
        </TouchableOpacity>
        <Text style={styles.stepLabel}>
          {tForm('progressLabel', { current: step, total: TOTAL_STEPS })}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>{tForm('stepIdentityTitle')}</Text>
            <Text style={styles.stepDesc}>{tForm('stepIdentityDesc')}</Text>

            <Text style={styles.label}>{tForm('chartLabel')}</Text>
            <TextInput
              style={styles.input}
              value={form.label}
              onChangeText={(v) => update('label', v)}
              placeholder={tForm('chartLabelPlaceholder')}
              placeholderTextColor={colors.placeholder}
            />

            <Text style={styles.label}>{tForm('personName')}</Text>
            <TextInput
              style={styles.input}
              value={form.personName}
              onChangeText={(v) => update('personName', v)}
              placeholder={tForm('personNamePlaceholder')}
              placeholderTextColor={colors.placeholder}
            />

            <Text style={styles.label}>{tForm('subjectType')}</Text>
            <View style={styles.chipRow}>
              {CHART_SUBJECT_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.chip, form.subjectType === type && styles.chipActive]}
                  onPress={() => update('subjectType', type)}
                >
                  <Text
                    style={[styles.chipText, form.subjectType === type && styles.chipTextActive]}
                  >
                    {subjectLabels[type]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>{tForm('stepBirthTitle')}</Text>
            <Text style={styles.stepDesc}>{tForm('stepBirthDesc')}</Text>

            <Text style={styles.label}>{tForm('birthDate')} (ГГГГ-ММ-ДД)</Text>
            <DateTimePickerField
              mode="date"
              value={form.birthDate}
              placeholder="1990-06-15"
              title={tForm('birthDate')}
              maximumDate={new Date()}
              onChange={(v) => update('birthDate', v)}
            />

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>{tForm('birthTimeKnown')}</Text>
              <Switch
                value={form.birthTimeKnown}
                onValueChange={(v) => {
                  update('birthTimeKnown', v);
                  if (!v) update('birthTime', '');
                }}
                trackColor={{ false: colors.muted, true: colors.primary }}
                thumbColor={form.birthTimeKnown ? colors.primaryForeground : colors.mutedForeground}
              />
            </View>

            {form.birthTimeKnown && (
              <>
                <Text style={styles.label}>{tForm('birthTime')} (ЧЧ:ММ)</Text>
                <DateTimePickerField
                  mode="time"
                  value={form.birthTime}
                  placeholder="14:30"
                  title={tForm('birthTime')}
                  onChange={(v) => update('birthTime', v)}
                />
              </>
            )}

            <Text style={styles.label}>{tForm('houseSystem')}</Text>
            <View style={styles.chipRow}>
              {HOUSE_SYSTEMS.map((hs) => (
                <TouchableOpacity
                  key={hs}
                  style={[styles.chip, form.houseSystem === hs && styles.chipActive]}
                  onPress={() => update('houseSystem', hs)}
                >
                  <Text style={[styles.chipText, form.houseSystem === hs && styles.chipTextActive]}>
                    {houseLabels[hs]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>{tForm('stepLocationTitle')}</Text>
            <Text style={styles.stepDesc}>{tForm('stepLocationDesc')}</Text>

            <Text style={styles.label}>{tForm('city')}</Text>
            <TouchableOpacity style={styles.pickerButton} onPress={() => setCityModalOpen(true)}>
              <Text
                style={[styles.pickerButtonText, !cityDisplay && styles.pickerButtonPlaceholder]}
                numberOfLines={1}
              >
                {cityDisplay || tForm('citySearchPlaceholder')}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
            <CityPickerModal
              visible={cityModalOpen}
              value={cityDisplay}
              placeholder={tForm('citySearchPlaceholder')}
              onSelect={handleCitySelect}
              onClose={() => setCityModalOpen(false)}
            />
          </View>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {step < TOTAL_STEPS ? (
          <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
            <Text style={styles.primaryButtonText}>{tForm('nextStep')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.primaryButton, submitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>{tForm('submitEdit')}</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 56,
      paddingBottom: 12,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    backText: {
      color: colors.mutedForeground,
      fontSize: 14,
    },
    stepLabel: {
      fontSize: 13,
      color: colors.mutedForeground,
    },
    content: {
      padding: 20,
      paddingBottom: 48,
    },
    stepContainer: {
      gap: 10,
    },
    stepTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.foreground,
      marginBottom: 2,
    },
    stepDesc: {
      fontSize: 14,
      color: colors.mutedForeground,
      marginBottom: 8,
    },
    label: {
      fontSize: 13,
      color: colors.mutedForeground,
      marginTop: 6,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.foreground,
    },
    switchRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 8,
    },
    switchLabel: {
      fontSize: 15,
      color: colors.foreground,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 4,
    },
    chip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    chipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipText: {
      fontSize: 13,
      color: colors.foreground,
    },
    chipTextActive: {
      color: '#fff',
    },
    pickerButton: {
      height: 44,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.background,
    },
    pickerButtonText: {
      fontSize: 15,
      color: colors.foreground,
      flex: 1,
      marginRight: 8,
    },
    pickerButtonPlaceholder: {
      color: colors.placeholder,
    },
    error: {
      color: colors.error,
      fontSize: 14,
      textAlign: 'center',
      marginTop: 8,
    },
    primaryButton: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 20,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    primaryButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
  });
}
