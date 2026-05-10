import { useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CityOption } from '@clario/api-client';
import { CHART_SUBJECT_TYPES, HOUSE_SYSTEMS } from '@clario/types';
import { useTranslations } from '@/lib/i18n';
import { useColors } from '@/lib/colors';
import { SCREEN_TOP_INSET_OFFSET } from '@/lib/layout';
import type { ChartFormData } from '@/lib/chart-form';
import { CityPickerModal } from '@/components/CityPickerModal';
import { DateTimePickerField } from '@/components/DateTimePickerField';

type SubjectType = (typeof CHART_SUBJECT_TYPES)[number];
type HouseSystem = (typeof HOUSE_SYSTEMS)[number];

interface ChartFormScreenProps {
  form: ChartFormData;
  step: number;
  totalSteps: number;
  cityDisplay: string;
  cityModalOpen: boolean;
  houseExpanded: boolean;
  submitting: boolean;
  error: string | null;
  submitLabel: string;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
  onUpdate: <K extends keyof ChartFormData>(key: K, value: ChartFormData[K]) => void;
  onSelectCity: (city: CityOption) => void | Promise<void>;
  onToggleCityModal: (visible: boolean) => void;
  onToggleHouseExpanded: (expanded: boolean | ((value: boolean) => boolean)) => void;
}

export function ChartFormScreen({
  form,
  step,
  totalSteps,
  cityDisplay,
  cityModalOpen,
  houseExpanded,
  submitting,
  error,
  submitLabel,
  onBack,
  onNext,
  onSubmit,
  onUpdate,
  onSelectCity,
  onToggleCityModal,
  onToggleHouseExpanded,
}: ChartFormScreenProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const tForm = useTranslations('chartForm');
  const tNav = useTranslations('navigation');

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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.headerBar, { paddingTop: insets.top + SCREEN_TOP_INSET_OFFSET }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={18} color={colors.mutedForeground} />
          <Text style={styles.backText}>{tNav('back')}</Text>
        </TouchableOpacity>
        <Text style={styles.stepLabel}>
          {tForm('progressLabel', { current: step, total: totalSteps })}
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
              onChangeText={(value) => onUpdate('label', value)}
              placeholder={tForm('chartLabelPlaceholder')}
              placeholderTextColor={colors.placeholder}
            />

            <Text style={styles.label}>{tForm('personName')}</Text>
            <TextInput
              style={styles.input}
              value={form.personName}
              onChangeText={(value) => onUpdate('personName', value)}
              placeholder={tForm('personNamePlaceholder')}
              placeholderTextColor={colors.placeholder}
            />

            <Text style={styles.label}>{tForm('subjectType')}</Text>
            <View style={styles.chipRow}>
              {CHART_SUBJECT_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.chip, form.subjectType === type && styles.chipActive]}
                  onPress={() => onUpdate('subjectType', type)}
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

            <Text style={styles.label}>{tForm('birthDate')}</Text>
            <DateTimePickerField
              mode="date"
              value={form.birthDate}
              placeholder="1990-06-15"
              title={tForm('birthDate')}
              maximumDate={new Date()}
              onChange={(value) => onUpdate('birthDate', value)}
            />

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>{tForm('birthTimeKnown')}</Text>
              <Switch
                value={form.birthTimeKnown}
                onValueChange={(value) => {
                  onUpdate('birthTimeKnown', value);
                  if (!value) onUpdate('birthTime', '');
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
                  onChange={(value) => onUpdate('birthTime', value)}
                />
              </>
            )}

            <TouchableOpacity
              style={styles.collapsibleHeader}
              onPress={() => onToggleHouseExpanded((value) => !value)}
            >
              <Text style={styles.label}>
                {tForm('houseSystemToggle', { name: houseLabels[form.houseSystem] })}
              </Text>
              <Ionicons
                name={houseExpanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.mutedForeground}
              />
            </TouchableOpacity>
            {houseExpanded && (
              <View style={styles.chipRow}>
                {HOUSE_SYSTEMS.map((houseSystem) => (
                  <TouchableOpacity
                    key={houseSystem}
                    style={[styles.chip, form.houseSystem === houseSystem && styles.chipActive]}
                    onPress={() => {
                      onUpdate('houseSystem', houseSystem);
                      onToggleHouseExpanded(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        form.houseSystem === houseSystem && styles.chipTextActive,
                      ]}
                    >
                      {houseLabels[houseSystem]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>{tForm('stepLocationTitle')}</Text>
            <Text style={styles.stepDesc}>{tForm('stepLocationDesc')}</Text>

            <Text style={styles.label}>{tForm('city')}</Text>
            <TouchableOpacity style={styles.pickerButton} onPress={() => onToggleCityModal(true)}>
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
              title={tForm('citySearchTitle')}
              placeholder={tForm('citySearchPlaceholder')}
              emptyText={tForm('citySearchNoResults')}
              onSelect={onSelectCity}
              onClose={() => onToggleCityModal(false)}
            />
          </View>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {step < totalSteps ? (
          <TouchableOpacity style={styles.primaryButton} onPress={onNext}>
            <Text style={styles.primaryButtonText}>{tForm('nextStep')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.primaryButton, submitting && styles.buttonDisabled]}
            onPress={onSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>{submitLabel}</Text>
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
    collapsibleHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 6,
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
