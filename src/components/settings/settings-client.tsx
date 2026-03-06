'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { profileApi } from '@/services/profile-api';
import { revalidateProfileData } from '@/app/api/actions/profile';
import { broadcastDisplayName } from '@/hooks/use-display-name';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslations } from 'next-intl';
import { UsageCard } from '@/components/common/usage-card';
import { PlansCard } from '@/components/common/plans-card';
import { BackLink } from '@/components/common/back-link';

interface SettingsClientProps {
  userEmail: string;
  initialProfile: {
    display_name: string | null;
    streak_count: number | null;
    telegram_id: string | null;
  } | null;
  /** OAuth / NextAuth display name as an additional fallback */
  userName?: string | null;
}

export function SettingsClient({ userEmail, initialProfile, userName }: SettingsClientProps) {
  const t = useTranslations();
  const [displayName, setDisplayName] = useState(initialProfile?.display_name || userName || '');
  const [streakCount, setStreakCount] = useState<number>(initialProfile?.streak_count || 0);
  const [isSaving, setIsSaving] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const onSave = async () => {
    const normalizedName = displayName.trim();
    if (!normalizedName) {
      toast.error(t('settings.displayNameRequired'));
      return;
    }

    try {
      setIsSaving(true);
      const updated = await profileApi.updateDisplayName(normalizedName);
      const savedName = updated.display_name || normalizedName;
      setDisplayName(savedName);
      setStreakCount(updated.streak_count || 0);

      // Push new name to header instantly (no page reload needed)
      broadcastDisplayName(savedName);

      // Revalidate server-side caches
      await revalidateProfileData();

      toast.success(t('settings.profileUpdated'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('settings.failedUpdateProfile'));
    } finally {
      setIsSaving(false);
    }
  };

  const onSavePassword = async () => {
    if (newPassword.length < 6) {
      toast.error(t('validation.passwordTooShort'));
      return;
    }

    try {
      setIsSavingPassword(true);
      await profileApi.updatePassword(newPassword);
      setNewPassword('');
      toast.success(t('settings.passwordUpdated'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('settings.failedUpdatePassword'));
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 space-y-6">
      <BackLink />
      <UsageCard />
      <PlansCard />
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.profileTitle')}</CardTitle>
          <CardDescription>{t('settings.profileDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <>
            <div className="space-y-2">
              <Label htmlFor="email">{t('settings.email')}</Label>
              <Input id="email" value={userEmail} disabled />
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">{t('settings.displayName')}</Label>
              <Input
                id="displayName"
                value={displayName}
                maxLength={100}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder={t('settings.displayNamePlaceholder')}
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="streak">{t('settings.currentStreak')}</Label>
                <span className="text-xs text-muted-foreground">
                  {t('settings.streakDescription')}
                </span>
              </div>
              <Input
                id="streak"
                value={t('settings.streakDays', { count: streakCount })}
                disabled
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={() => void onSave()} disabled={isSaving}>
                {isSaving ? t('settings.saving') : t('settings.saveProfile')}
              </Button>
            </div>
          </>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.security')}</CardTitle>
          <CardDescription>{t('settings.securityDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="newPassword">{t('settings.newPassword')}</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder={t('settings.newPasswordPlaceholder')}
              disabled={isSavingPassword}
            />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => void onSavePassword()}
              disabled={isSavingPassword || newPassword.length < 6}
              variant="secondary"
            >
              {isSavingPassword ? t('settings.updating') : t('settings.updatePassword')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
