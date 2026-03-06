'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { profileApi } from '@/services/profile-api';
import { revalidateProfileData } from '@/app/api/actions/profile';
import { broadcastDisplayName } from '@/hooks/use-display-name';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslations } from 'next-intl';
import { ChevronRight, Send } from 'lucide-react';
import { BackLink } from '@/components/common/back-link';
import { isTelegramWebApp } from '@/components/telegram-provider';

const BOT_URL = process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL;

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

  const telegramId = initialProfile?.telegram_id ?? null;
  // Hide the Connect card when the user is already inside the Telegram WebApp —
  // the card is only useful for web (email) users who want to add bot access.
  const showTelegramCard = BOT_URL && !isTelegramWebApp();
  const [isConnecting, setIsConnecting] = useState(false);

  const onConnectTelegram = async () => {
    if (!BOT_URL) return;
    try {
      setIsConnecting(true);
      const { token } = await profileApi.generateTelegramLinkToken();
      // Deep-link opens the Mini App with start_param=link_<token>
      const deepLink = `${BOT_URL}?startapp=link_${token}`;
      window.open(deepLink, '_blank', 'noopener,noreferrer');
      toast.success(t('settings.telegramConnectOpened'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('settings.telegramConnectFailed'));
    } finally {
      setIsConnecting(false);
    }
  };

  // Reflect connection after user returns from the bot (storage event or poll not needed —
  // a page refresh is the natural UX after linking inside Telegram).

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
    <main className="w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <BackLink />

      {/* ── Plan & Billing ── */}
      <Link href="/settings/plan" className="block group">
        <Card className="transition-colors hover:border-foreground/30">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-base">{t('settings.planCardTitle')}</CardTitle>
              <CardDescription>{t('settings.planCardDescription')}</CardDescription>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
          </CardHeader>
        </Card>
      </Link>
      {showTelegramCard && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              {t('settings.telegramCardTitle')}
            </CardTitle>
            <CardDescription>{t('settings.telegramCardDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            {telegramId ? (
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                ✓ {t('settings.telegramConnected')}
              </span>
            ) : (
              <Button onClick={() => void onConnectTelegram()} disabled={isConnecting}>
                <Send className="h-4 w-4 mr-2" />
                {isConnecting ? t('settings.telegramConnecting') : t('settings.telegramConnectCta')}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
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
