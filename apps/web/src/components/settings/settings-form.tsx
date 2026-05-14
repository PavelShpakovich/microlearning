'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { signOut } from 'next-auth/react';
import { runToastMutation } from '@/lib/mutation-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { DisplayNameForm } from '@/components/settings/display-name-form';
import { TimezoneSelect } from '@/components/ui/timezone-select';
import { User, Sparkles, Trash2, Languages } from 'lucide-react';
import { profileApi, preferencesApi } from '@clario/api-client';

export interface SettingsFormData {
  email: string;
  displayName: string;
  timezone: string | null;
  locale: 'ru' | 'en';
  preferences: {
    tone_style: string;
    content_focus_love: boolean;
    content_focus_career: boolean;
    content_focus_growth: boolean;
    allow_spiritual_tone: boolean;
  };
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <div className="text-sm font-medium text-right">{children}</div>
    </div>
  );
}

export function SettingsForm({ data }: { data: SettingsFormData }) {
  const t = useTranslations('settingsPage');
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [currentLocale, setCurrentLocale] = useState<'ru' | 'en'>(data.locale);

  async function persistLocaleCookie(locale: 'ru' | 'en') {
    const response = await fetch('/api/locale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale }),
    });

    if (!response.ok) {
      throw new Error('Failed to persist locale cookie');
    }
  }

  function handleLocaleChange(lang: 'ru' | 'en') {
    if (lang === currentLocale) return;

    const previousLocale = currentLocale;
    setCurrentLocale(lang);

    startTransition(async () => {
      try {
        await runToastMutation({
          action: async () => {
            await profileApi.updateProfile({ locale: lang });
            await persistLocaleCookie(lang);
          },
          silentSuccess: true,
          errorMessage: t('saveError'),
          toastKey: 'settings-language-save',
          onSuccess: () => {
            window.location.reload();
          },
        });
      } catch {
        setCurrentLocale(previousLocale);
      }
    });
  }

  // Profile state
  const [timezone, setTimezone] = useState(data.timezone ?? '');

  // Preferences state
  const [toneStyle, setToneStyle] = useState(data.preferences.tone_style);
  const [spiritualTone, setSpiritualTone] = useState(data.preferences.allow_spiritual_tone);
  const [focusLove, setFocusLove] = useState(data.preferences.content_focus_love);
  const [focusCareer, setFocusCareer] = useState(data.preferences.content_focus_career);
  const [focusGrowth, setFocusGrowth] = useState(data.preferences.content_focus_growth);

  const toneOptions = [
    { value: 'balanced', label: t('toneBalanced') },
    { value: 'mystical', label: t('toneMystical') },
    { value: 'therapeutic', label: t('toneTherapeutic') },
    { value: 'analytical', label: t('toneAnalytical') },
  ];

  async function saveProfile(updates: Record<string, unknown>) {
    await profileApi.updateProfile(updates);
  }

  async function savePreferences() {
    await preferencesApi.updatePreferences({
      toneStyle,
      allowSpiritualTone: spiritualTone,
      contentFocusLove: focusLove,
      contentFocusCareer: focusCareer,
      contentFocusGrowth: focusGrowth,
    });
  }

  function handleTimezoneChange(value: string) {
    setTimezone(value);
    startTransition(async () => {
      try {
        await runToastMutation({
          action: () => saveProfile({ timezone: value || null }),
          successMessage: t('saved'),
          errorMessage: t('saveError'),
          toastKey: 'settings-timezone-save',
        });
      } catch {
        // Toast is handled by runToastMutation.
      }
    });
  }

  function handleSavePreferences() {
    startTransition(async () => {
      try {
        await runToastMutation({
          action: () => savePreferences(),
          successMessage: t('saved'),
          errorMessage: t('saveError'),
          toastKey: 'settings-preferences-save',
        });
      } catch {
        // Toast is handled by runToastMutation.
      }
    });
  }

  function handleDeleteAccount() {
    startDeleteTransition(async () => {
      try {
        await runToastMutation({
          action: () => profileApi.deleteAccount(),
          silentSuccess: true,
          errorMessage: t('deleteAccountError'),
          toastKey: 'settings-delete-account',
          onSuccess: async () => {
            await signOut({ callbackUrl: '/' });
          },
        });
      } catch {
        // Toast is handled by runToastMutation.
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Profile card */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <User className="size-4 text-primary" />
              <CardTitle className="text-base">{t('profileTitle')}</CardTitle>
            </div>
            <CardDescription className="text-xs">{t('profileDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldRow label={t('emailLabel')}>
              <span className="text-muted-foreground">{data.email || t('emailUnavailable')}</span>
            </FieldRow>
            <FieldRow label={t('nameLabel')}>
              <DisplayNameForm initialName={data.displayName} />
            </FieldRow>
            <FieldRow label={t('timezoneLabel')}>
              <TimezoneSelect
                value={timezone}
                onValueChange={handleTimezoneChange}
                placeholder={t('timezonePlaceholder')}
                triggerClassName="h-8 w-52 text-sm"
              />
            </FieldRow>
          </CardContent>
        </Card>
      </div>

      {/* Reading preferences card */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <CardTitle className="text-base">{t('preferencesTitle')}</CardTitle>
          </div>
          <CardDescription className="text-xs">{t('preferencesDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-5 sm:grid-cols-2">
            {/* Tone selector */}
            <div className="grid gap-2">
              <Label className="text-sm">{t('toneLabel')}</Label>
              <Select value={toneStyle} onValueChange={setToneStyle} disabled={isPending}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {toneOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Spiritual tone toggle */}
            <div className="grid gap-2">
              <Label className="text-sm">{t('spiritualTone')}</Label>
              <p className="text-xs text-muted-foreground">{t('spiritualToneHint')}</p>
              <div className="flex items-center gap-3 h-9">
                <Switch
                  checked={spiritualTone}
                  onCheckedChange={setSpiritualTone}
                  disabled={isPending}
                />
                <span className="text-sm text-muted-foreground">
                  {spiritualTone ? t('on') : t('off')}
                </span>
              </div>
            </div>
          </div>

          {/* Focus areas */}
          <div className="mt-5">
            <Label className="text-sm">{t('focusAreas')}</Label>
            <div className="mt-2.5 grid gap-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <Switch
                  checked={focusLove}
                  onCheckedChange={setFocusLove}
                  disabled={isPending}
                  className="mt-0.5"
                />
                <div>
                  <span className="text-sm">{t('focusLove')}</span>
                  <p className="text-xs text-muted-foreground">{t('focusLoveHint')}</p>
                </div>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <Switch
                  checked={focusCareer}
                  onCheckedChange={setFocusCareer}
                  disabled={isPending}
                  className="mt-0.5"
                />
                <div>
                  <span className="text-sm">{t('focusCareer')}</span>
                  <p className="text-xs text-muted-foreground">{t('focusCareerHint')}</p>
                </div>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <Switch
                  checked={focusGrowth}
                  onCheckedChange={setFocusGrowth}
                  disabled={isPending}
                  className="mt-0.5"
                />
                <div>
                  <span className="text-sm">{t('focusGrowth')}</span>
                  <p className="text-xs text-muted-foreground">{t('focusGrowthHint')}</p>
                </div>
              </label>
            </div>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">{t('preferencesHint')}</p>

          <div className="mt-4 flex justify-end">
            <Button onClick={handleSavePreferences} disabled={isPending} size="sm">
              {isPending ? t('saving') : t('savePreferences')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Language card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Languages className="size-4 text-primary" />
            <CardTitle className="text-base">{t('languageTitle')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {(['ru', 'en'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => handleLocaleChange(lang)}
                className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${
                  currentLocale === lang
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                }`}
              >
                {t(lang === 'ru' ? 'languageRu' : 'languageEn')}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/30">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Trash2 className="size-4 text-destructive" />
            <CardTitle className="text-base text-destructive">{t('dangerZoneTitle')}</CardTitle>
          </div>
          <CardDescription className="text-xs">{t('dangerZoneDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">{t('deleteAccountLabel')}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t('deleteAccountHint')}</p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={isDeleting}>
                  {isDeleting ? t('deletingAccount') : t('deleteAccountButton')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('deleteAccountConfirmTitle')}</AlertDialogTitle>
                  <AlertDialogDescription>{t('deleteAccountConfirmDesc')}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('deleteAccountCancel')}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {t('deleteAccountConfirm')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
