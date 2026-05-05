import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { chartsApi, locationsApi } from '@clario/api-client';
import type { CityOption } from '@clario/api-client';
import { normalizeCreateChartBirthTime, resolveChartTimezone } from '@clario/validation';
import { useTranslations } from '@/lib/i18n';
import { goBackTo, openChartDetail, resolveParentRoute, routes } from '@/lib/navigation';
import {
  buildChartFormLocationPatch,
  CHART_FORM_TOTAL_STEPS,
  createEmptyChartFormData,
  type ChartFormData,
  validateChartFormStep,
} from '@/lib/chart-form';
import { ChartFormScreen } from '@/components/charts/ChartFormScreen';

export default function NewChartScreen() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<ChartFormData>(createEmptyChartFormData());
  const [cityDisplay, setCityDisplay] = useState('');
  const [cityModalOpen, setCityModalOpen] = useState(false);
  const [houseExpanded, setHouseExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tForm = useTranslations('chartForm');

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
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setStep((value) => value + 1);
  }

  async function handleSubmit() {
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const timezone = resolveChartTimezone(form.timezone, form.country);
      const { chart } = await chartsApi.createChart({
        label: form.label.trim(),
        personName: form.personName.trim(),
        subjectType: form.subjectType,
        birthDate: form.birthDate.trim(),
        birthTime: normalizeCreateChartBirthTime(form.birthTimeKnown, form.birthTime),
        birthTimeKnown: form.birthTimeKnown,
        city: form.city,
        country: form.country,
        latitude: form.lat ?? undefined,
        longitude: form.lon ?? undefined,
        timezone,
        houseSystem: form.houseSystem,
        locale: 'ru',
      });

      openChartDetail(chart.id, resolveParentRoute(returnTo, routes.tabs.charts));
    } catch {
      setError(tForm('errorToast'));
    } finally {
      setSubmitting(false);
    }
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
      submitLabel={tForm('submit')}
      onBack={() =>
        step > 1 ? setStep((value) => value - 1) : goBackTo(returnTo, routes.tabs.charts)
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
