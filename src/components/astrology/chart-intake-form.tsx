'use client';

import { useCallback, useEffect, useRef, useState, useTransition, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { LocationMap } from '@/components/astrology/location-map';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { TimezoneSelect } from '@/components/ui/timezone-select';
import { normalizeHouseSystem, type HouseSystem } from '@/lib/astrology/constants';
import { chartsApi } from '@/services/charts-api';

interface NominatimResult {
  place_id: number;
  display_name: string;
  name: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    country?: string;
    country_code?: string;
  };
  lat: string;
  lon: string;
}

interface CityOption {
  city: string;
  country: string;
  lat: number;
  lon: number;
  displayName: string;
}

export interface ChartFormDefaults {
  personName?: string;
  timezone?: string;
  city?: string;
  country?: string;
  latitude?: string;
  longitude?: string;
  houseSystem?: string;
}

export interface ChartFormInitialData {
  label?: string;
  personName?: string;
  subjectType?: string;
  birthDate?: string;
  birthTime?: string;
  birthTimeKnown?: boolean;
  city?: string;
  country?: string;
  timezone?: string;
  latitude?: string;
  longitude?: string;
  houseSystem?: string;
  notes?: string;
}

interface ChartIntakeFormProps {
  defaults?: ChartFormDefaults;
  initialData?: ChartFormInitialData;
  mode?: 'create' | 'edit';
  chartId?: string;
}

type ChartWizardStep = 0 | 1 | 2;

async function searchCitiesNominatim(query: string): Promise<CityOption[]> {
  if (query.length < 2) return [];

  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '6');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('featuretype', 'settlement');

    const res = await fetch(url.toString(), {
      headers: { 'Accept-Language': 'ru,en', 'User-Agent': 'Clario/1.0' },
    });
    if (!res.ok) return [];

    const results = (await res.json()) as NominatimResult[];
    return results.map((result) => ({
      city: result.address.city ?? result.address.town ?? result.address.village ?? result.name,
      country: result.address.country ?? '',
      lat: parseFloat(result.lat),
      lon: parseFloat(result.lon),
      displayName: result.display_name,
    }));
  } catch {
    return [];
  }
}

async function lookupTimezone(lat: number, lon: number): Promise<string | null> {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = (await res.json()) as { ianaTimeZoneId?: string };
    return data.ianaTimeZoneId ?? null;
  } catch {
    return null;
  }
}

function normalizeBirthTime(value?: string | null): string {
  if (!value) return '';

  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{2}:\d{2})(?::\d{2})?$/);
  return match ? match[1] : trimmed;
}

export function ChartIntakeForm({
  defaults,
  initialData,
  mode = 'create',
  chartId,
}: ChartIntakeFormProps) {
  const router = useRouter();
  const t = useTranslations('chartForm');
  const [isPending, startTransition] = useTransition();
  const [currentStep, setCurrentStep] = useState<ChartWizardStep>(0);
  const [birthTimeKnown, setBirthTimeKnown] = useState(initialData?.birthTimeKnown ?? true);
  const [form, setForm] = useState({
    label: initialData?.label ?? '',
    personName: initialData?.personName ?? defaults?.personName ?? '',
    subjectType: initialData?.subjectType ?? 'self',
    birthDate: initialData?.birthDate ?? '',
    birthTime: normalizeBirthTime(initialData?.birthTime),
    city: initialData?.city ?? defaults?.city ?? '',
    country: initialData?.country ?? defaults?.country ?? '',
    timezone: initialData?.timezone ?? defaults?.timezone ?? '',
    latitude: initialData?.latitude ?? defaults?.latitude ?? '',
    longitude: initialData?.longitude ?? defaults?.longitude ?? '',
    houseSystem: normalizeHouseSystem(initialData?.houseSystem ?? defaults?.houseSystem),
    notes: initialData?.notes ?? '',
  });
  const [citySuggestions, setCitySuggestions] = useState<CityOption[]>([]);
  const [citySearching, setCitySearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [tzAutoDetecting, setTzAutoDetecting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const subjectOptions = [
    { value: 'self', label: t('subjectSelf') },
    { value: 'partner', label: t('subjectPartner') },
    { value: 'child', label: t('subjectChild') },
    { value: 'client', label: t('subjectClient') },
    { value: 'other', label: t('subjectOther') },
  ] as const;

  const houseSystemOptions = [
    { value: 'placidus', label: t('housePlacidus') },
    { value: 'koch', label: t('houseKoch') },
    { value: 'equal', label: t('houseEqual') },
    { value: 'whole_sign', label: t('houseWholeSigns') },
    { value: 'porphyry', label: t('housePorphyry') },
    { value: 'regiomontanus', label: t('houseRegiomontanus') },
    { value: 'campanus', label: t('houseCampanus') },
  ] as const;

  const wizardSteps = [
    {
      title: t('stepIdentityTitle'),
      description: t('stepIdentityDesc'),
    },
    {
      title: t('stepBirthTitle'),
      description: t('stepBirthDesc'),
    },
    {
      title: t('stepLocationTitle'),
      description: t('stepLocationDesc'),
    },
  ] as const;

  const isLastStep = currentStep === wizardSteps.length - 1;

  const update = useCallback((key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleCityInput = useCallback(
    (value: string) => {
      update('city', value);

      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (value.length < 2) {
        setCitySuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setCitySearching(true);
      debounceRef.current = setTimeout(async () => {
        const results = await searchCitiesNominatim(value);
        setCitySuggestions(results);
        setShowSuggestions(results.length > 0);
        setCitySearching(false);
      }, 400);
    },
    [update],
  );

  const selectCity = useCallback(async (entry: CityOption) => {
    setForm((current) => ({
      ...current,
      city: entry.city,
      country: entry.country,
      latitude: String(entry.lat),
      longitude: String(entry.lon),
    }));
    setCitySuggestions([]);
    setShowSuggestions(false);
    setTzAutoDetecting(true);

    const timezone = await lookupTimezone(entry.lat, entry.lon);
    setTzAutoDetecting(false);

    if (timezone) {
      setForm((current) => ({ ...current, timezone }));
    }
  }, []);

  const validateStep = (step: ChartWizardStep): string | null => {
    if (step === 0 && (!form.label.trim() || !form.personName.trim())) {
      return t('validationIdentity');
    }

    if (step === 1) {
      if (!form.birthDate) {
        return t('validationBirth');
      }

      if (birthTimeKnown && !normalizeBirthTime(form.birthTime)) {
        return t('validationBirthTime');
      }
    }

    if (step === 2 && (!form.city.trim() || !form.country.trim())) {
      return t('validationLocation');
    }

    return null;
  };

  const goToNextStep = () => {
    const errorMessage = validateStep(currentStep);
    if (errorMessage) {
      toast.error(errorMessage);
      return;
    }

    setCurrentStep((current) => Math.min(current + 1, wizardSteps.length - 1) as ChartWizardStep);
  };

  const handleFormKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== 'Enter' || event.defaultPrevented) {
      return;
    }

    const target = event.target;

    if (
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLButtonElement ||
      (target instanceof HTMLInputElement && target.type === 'submit')
    ) {
      return;
    }

    event.preventDefault();
  };

  const saveChart = () => {
    const errorMessage = validateStep(currentStep);
    if (errorMessage) {
      toast.error(errorMessage);
      return;
    }

    const normalizedBirthTime = normalizeBirthTime(form.birthTime);

    startTransition(async () => {
      try {
        if (mode === 'edit' && chartId) {
          const res = await fetch(`/api/charts/${chartId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              label: form.label,
              personName: form.personName,
              subjectType: form.subjectType,
              birthDate: form.birthDate,
              birthTime: birthTimeKnown ? normalizedBirthTime : null,
              birthTimeKnown,
              city: form.city,
              country: form.country,
              timezone: form.timezone || null,
              latitude: form.latitude ? Number(form.latitude) : null,
              longitude: form.longitude ? Number(form.longitude) : null,
              houseSystem: form.houseSystem,
              notes: form.notes || null,
            }),
          });
          const data = (await res.json()) as { error?: string };
          if (!res.ok) throw new Error(data.error ?? t('errorToastEdit'));

          toast.success(t('successToastEdit'));
          router.push(`/charts/${chartId}`);
          router.refresh();
          return;
        }

        const { chart } = await chartsApi.createChart({
          label: form.label,
          personName: form.personName,
          subjectType: form.subjectType as 'self' | 'partner' | 'child' | 'client' | 'other',
          birthDate: form.birthDate,
          birthTime: birthTimeKnown ? normalizedBirthTime : undefined,
          birthTimeKnown,
          city: form.city,
          country: form.country,
          timezone: form.timezone || undefined,
          latitude: form.latitude ? Number(form.latitude) : undefined,
          longitude: form.longitude ? Number(form.longitude) : undefined,
          houseSystem: form.houseSystem as HouseSystem,
          notes: form.notes || undefined,
        });

        toast.success(t('successToast'));
        router.push(`/charts/${chart.id}`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t('errorToast'));
      }
    });
  };

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {t('sectionLabel')}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          {mode === 'edit' ? t('editChartTitle') : t('title')}
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground md:text-base">{t('subtitle')}</p>
      </section>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                  {t('progressLabel', { current: currentStep + 1, total: wizardSteps.length })}
                </p>
                <CardTitle>{wizardSteps[currentStep].title}</CardTitle>
                <CardDescription>{wizardSteps[currentStep].description}</CardDescription>
              </div>
              <div className="hidden items-center gap-2 sm:flex">
                {wizardSteps.map((step, index) => (
                  <button
                    key={step.title}
                    type="button"
                    onClick={() => {
                      if (index <= currentStep) {
                        setCurrentStep(index as ChartWizardStep);
                      }
                    }}
                    className={`flex size-9 items-center justify-center rounded-full border text-sm font-medium transition-colors ${
                      index === currentStep
                        ? 'border-primary bg-primary text-primary-foreground'
                        : index < currentStep
                          ? 'border-primary/30 bg-primary/10 text-primary'
                          : 'border-border bg-background text-muted-foreground'
                    }`}
                    aria-label={step.title}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${((currentStep + 1) / wizardSteps.length) * 100}%` }}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form
            className="grid gap-5"
            onKeyDown={handleFormKeyDown}
            onSubmit={(event) => event.preventDefault()}
          >
            {currentStep === 0 ? (
              <>
                <div className="rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                  {t('birthDataDescription')}
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="label">{t('chartLabel')}</Label>
                    <Input
                      id="label"
                      value={form.label}
                      onChange={(event) => update('label', event.target.value)}
                      placeholder={t('chartLabelPlaceholder')}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="personName">{t('personName')}</Label>
                    <Input
                      id="personName"
                      value={form.personName}
                      onChange={(event) => update('personName', event.target.value)}
                      placeholder={t('personNamePlaceholder')}
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>{t('subjectType')}</Label>
                    <Select
                      value={form.subjectType}
                      onValueChange={(value) => update('subjectType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('selectPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {subjectOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            ) : null}

            {currentStep === 1 ? (
              <>
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="birthDate">{t('birthDate')}</Label>
                    <Input
                      id="birthDate"
                      type="date"
                      value={form.birthDate}
                      onChange={(event) => update('birthDate', event.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between gap-4">
                      <Label htmlFor="birthTime">{t('birthTime')}</Label>
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs text-muted-foreground"
                        onClick={() => setBirthTimeKnown((value) => !value)}
                      >
                        {birthTimeKnown ? t('birthTimeUnknown') : t('birthTimeKnown')}
                      </Button>
                    </div>
                    <Input
                      id="birthTime"
                      type="time"
                      value={form.birthTime}
                      onChange={(event) => update('birthTime', event.target.value)}
                      disabled={!birthTimeKnown}
                      required={birthTimeKnown}
                    />
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>{t('houseSystem')}</Label>
                    <Select
                      value={form.houseSystem}
                      onValueChange={(value) => update('houseSystem', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('selectPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {houseSystemOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            ) : null}

            {currentStep === 2 ? (
              <>
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="city">{t('city')}</Label>
                    <div className="relative">
                      <Input
                        id="city"
                        value={form.city}
                        onChange={(event) => handleCityInput(event.target.value)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                        onFocus={() => {
                          if (citySuggestions.length > 0) setShowSuggestions(true);
                        }}
                        placeholder={t('citySearchPlaceholder')}
                        autoComplete="off"
                        required
                      />
                      {citySearching ? (
                        <p className="absolute z-50 mt-1 w-full rounded-xl border bg-popover px-3 py-2 text-sm text-muted-foreground shadow-lg">
                          {t('citySearchLoading')}
                        </p>
                      ) : showSuggestions ? (
                        <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border bg-popover shadow-lg">
                          {citySuggestions.map((entry, index) => (
                            <li key={`${entry.displayName}-${index}`}>
                              <button
                                type="button"
                                className="flex min-h-[44px] w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-accent"
                                onMouseDown={() => void selectCity(entry)}
                              >
                                <span className="font-medium">{entry.city}</span>
                                <span className="truncate text-xs text-muted-foreground">
                                  {entry.country}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="country">{t('country')}</Label>
                    <Input
                      id="country"
                      value={form.country}
                      onChange={(event) => update('country', event.target.value)}
                      placeholder={t('countryPlaceholder')}
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="timezone">{t('timezone')}</Label>
                  <TimezoneSelect
                    value={form.timezone}
                    onValueChange={(value) => update('timezone', value)}
                    placeholder={
                      tzAutoDetecting ? t('timezoneAutoDetecting') : t('timezoneSearchPlaceholder')
                    }
                    disabled={tzAutoDetecting}
                  />
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="latitude">{t('latitude')}</Label>
                    <Input
                      id="latitude"
                      type="number"
                      step="any"
                      min="-90"
                      max="90"
                      value={form.latitude}
                      onChange={(event) => update('latitude', event.target.value)}
                      placeholder={t('latitudePlaceholder')}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="longitude">{t('longitude')}</Label>
                    <Input
                      id="longitude"
                      type="number"
                      step="any"
                      min="-180"
                      max="180"
                      value={form.longitude}
                      onChange={(event) => update('longitude', event.target.value)}
                      placeholder={t('longitudePlaceholder')}
                    />
                  </div>
                </div>

                <LocationMap
                  latitude={form.latitude}
                  longitude={form.longitude}
                  hint={t('mapHint')}
                  onLocationSelect={(lat, lon, city, country) => {
                    setForm((current) => ({
                      ...current,
                      latitude: lat,
                      longitude: lon,
                      ...(city ? { city } : {}),
                      ...(country ? { country } : {}),
                    }));

                    if (lat && lon) {
                      setTzAutoDetecting(true);
                      void lookupTimezone(parseFloat(lat), parseFloat(lon)).then((timezone) => {
                        setTzAutoDetecting(false);
                        if (timezone) setForm((current) => ({ ...current, timezone }));
                      });
                    }
                  }}
                />

                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="notes">{t('notes')}</Label>
                    <span className="text-xs text-muted-foreground">
                      {t('notesCharCount', { count: form.notes.length })}
                    </span>
                  </div>
                  <Textarea
                    id="notes"
                    value={form.notes}
                    onChange={(event) => update('notes', event.target.value)}
                    placeholder={t('notesPlaceholder')}
                    rows={4}
                    maxLength={500}
                  />
                </div>

                <div className="rounded-2xl border bg-muted/20 p-4 text-sm">
                  <p className="font-medium text-foreground">{t('summaryTitle')}</p>
                  <div className="mt-2 grid gap-1 text-muted-foreground sm:grid-cols-2">
                    <p>{form.personName || '—'}</p>
                    <p>{form.birthDate || '—'}</p>
                    <p>
                      {form.city || '—'}
                      {form.country ? `, ${form.country}` : ''}
                    </p>
                    <p>{form.timezone || t('timezoneAutoFallback')}</p>
                  </div>
                </div>
              </>
            ) : null}

            <div className="flex flex-col gap-3 border-t pt-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                {currentStep > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setCurrentStep((current) => Math.max(current - 1, 0) as ChartWizardStep)
                    }
                  >
                    {t('prevStep')}
                  </Button>
                ) : null}

                {mode === 'edit' && chartId ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => router.push(`/charts/${chartId}`)}
                    disabled={isPending}
                  >
                    {t('cancelEdit')}
                  </Button>
                ) : null}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  className={isLastStep ? 'hidden' : undefined}
                  onClick={goToNextStep}
                >
                  {t('nextStep')}
                </Button>
                <Button
                  type="button"
                  className={!isLastStep ? 'hidden' : undefined}
                  disabled={isPending}
                  onClick={saveChart}
                >
                  {mode === 'edit'
                    ? isPending
                      ? t('submittingEdit')
                      : t('submitEdit')
                    : isPending
                      ? t('submitting')
                      : t('submit')}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
