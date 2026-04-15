'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { signOut } from 'next-auth/react';
import { toast } from 'sonner';
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
import { ShieldCheck, User, Sparkles, Trash2 } from 'lucide-react';
import { profileApi } from '@/services/profile-api';

const TIMEZONES = [
  { value: 'Europe/Moscow', label: 'Москва (UTC+3)' },
  { value: 'Europe/Minsk', label: 'Минск (UTC+3)' },
  { value: 'Europe/Kiev', label: 'Киев (UTC+2)' },
  { value: 'Europe/Kaliningrad', label: 'Калининград (UTC+2)' },
  { value: 'Asia/Yekaterinburg', label: 'Екатеринбург (UTC+5)' },
  { value: 'Asia/Omsk', label: 'Омск (UTC+6)' },
  { value: 'Asia/Krasnoyarsk', label: 'Красноярск (UTC+7)' },
  { value: 'Asia/Irkutsk', label: 'Иркутск (UTC+8)' },
  { value: 'Asia/Yakutsk', label: 'Якутск (UTC+9)' },
  { value: 'Asia/Vladivostok', label: 'Владивосток (UTC+10)' },
  { value: 'Asia/Magadan', label: 'Магадан (UTC+11)' },
  { value: 'Asia/Kamchatka', label: 'Камчатка (UTC+12)' },
  { value: 'Asia/Almaty', label: 'Алматы (UTC+6)' },
  { value: 'Asia/Tashkent', label: 'Ташкент (UTC+5)' },
  { value: 'Asia/Tbilisi', label: 'Тбилиси (UTC+4)' },
  { value: 'Asia/Baku', label: 'Баку (UTC+4)' },
  { value: 'Europe/Istanbul', label: 'Стамбул (UTC+3)' },
  { value: 'Europe/Warsaw', label: 'Варшава (UTC+1)' },
  { value: 'Europe/Berlin', label: 'Берлин (UTC+1)' },
  { value: 'Europe/London', label: 'Лондон (UTC+0)' },
  { value: 'America/New_York', label: 'Нью-Йорк (UTC-5)' },
  { value: 'America/Chicago', label: 'Чикаго (UTC-6)' },
  { value: 'America/Denver', label: 'Денвер (UTC-7)' },
  { value: 'America/Los_Angeles', label: 'Лос-Анджелес (UTC-8)' },
  { value: 'Asia/Dubai', label: 'Дубай (UTC+4)' },
  { value: 'Asia/Bangkok', label: 'Бангкок (UTC+7)' },
  { value: 'Asia/Shanghai', label: 'Шанхай (UTC+8)' },
  { value: 'Asia/Tokyo', label: 'Токио (UTC+9)' },
  { value: 'Australia/Sydney', label: 'Сидней (UTC+10)' },
] as const;

export interface SettingsFormData {
  email: string;
  displayName: string;
  timezone: string | null;
  birthDataConsentAt: string | null;
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

function ConsentBadge({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
      }`}
    >
      {active ? '✓' : '—'} {label}
    </span>
  );
}

export function SettingsForm({ data }: { data: SettingsFormData }) {
  const t = useTranslations('settingsPage');
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

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
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Profile save failed');
  }

  async function savePreferences() {
    const res = await fetch('/api/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toneStyle,
        allowSpiritualTone: spiritualTone,
        contentFocusLove: focusLove,
        contentFocusCareer: focusCareer,
        contentFocusGrowth: focusGrowth,
      }),
    });
    if (!res.ok) throw new Error('Preferences save failed');
  }

  function handleTimezoneChange(value: string) {
    setTimezone(value);
    startTransition(async () => {
      try {
        await saveProfile({ timezone: value || null });
        toast.success(t('saved'));
      } catch {
        toast.error(t('saveError'));
      }
    });
  }

  function handleSavePreferences() {
    startTransition(async () => {
      try {
        await savePreferences();
        toast.success(t('saved'));
      } catch {
        toast.error(t('saveError'));
      }
    });
  }

  function handleDeleteAccount() {
    startDeleteTransition(async () => {
      try {
        await profileApi.deleteAccount();
        await signOut({ callbackUrl: '/' });
      } catch {
        toast.error(t('deleteAccountError'));
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
              <Select value={timezone} onValueChange={handleTimezoneChange}>
                <SelectTrigger className="h-8 w-52 text-sm">
                  <SelectValue placeholder={t('timezonePlaceholder')} />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>
          </CardContent>
        </Card>

        {/* Privacy card */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              <CardTitle className="text-base">{t('privacyTitle')}</CardTitle>
            </div>
            <CardDescription className="text-xs">{t('privacyDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldRow label={t('birthConsent')}>
              <ConsentBadge
                active={!!data.birthDataConsentAt}
                label={data.birthDataConsentAt ? t('consentGranted') : t('consentNotGranted')}
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
            <div className="mt-2.5 flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch checked={focusLove} onCheckedChange={setFocusLove} disabled={isPending} />
                <span className="text-sm">{t('focusLove')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch
                  checked={focusCareer}
                  onCheckedChange={setFocusCareer}
                  disabled={isPending}
                />
                <span className="text-sm">{t('focusCareer')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch
                  checked={focusGrowth}
                  onCheckedChange={setFocusGrowth}
                  disabled={isPending}
                />
                <span className="text-sm">{t('focusGrowth')}</span>
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
