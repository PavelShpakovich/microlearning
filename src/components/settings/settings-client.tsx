'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useSearchParams } from 'next/navigation';
import { profileApi } from '@/services/profile-api';
import { revalidateProfileData } from '@/actions/profile';
import { broadcastDisplayName } from '@/hooks/use-display-name';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslations } from 'next-intl';
import { ChevronRight, Send, Globe } from 'lucide-react';
import { BackLink } from '@/components/common/back-link';
import { isTelegramWebApp } from '@/components/telegram-provider';

const BOT_URL = process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL;

interface SettingsClientProps {
  userEmail: string;
  initialProfile: {
    display_name: string | null;
    telegram_id: string | null;
  } | null;
  /** OAuth / NextAuth display name as an additional fallback */
  userName?: string | null;
  /** True if the user is a Telegram-first stub (no email credentials set up yet) */
  isStub?: boolean;
}

import { signOut } from 'next-auth/react';
import { ConfirmationDialog } from '@/components/common/confirmation-dialog';

export function SettingsClient({
  userEmail,
  initialProfile,
  userName,
  isStub = false,
}: SettingsClientProps) {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const [displayName, setDisplayName] = useState(initialProfile?.display_name || userName || '');
  const [isSaving, setIsSaving] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const telegramId = initialProfile?.telegram_id ?? null;
  // Stub accounts were created by Telegram-first users (email = telegram_*@noreply.*).
  // They need to set up web credentials before they can log in via browser.
  // Hide the Connect card when the user is already inside the Telegram WebApp —
  // the card is only useful for web (email) users who want to add bot access.
  const showTelegramCard = BOT_URL && !isStub && !isTelegramWebApp();
  const [isConnecting, setIsConnecting] = useState(false);

  // Show over-limit warning after a web→Tg account merge redirected here with ?overLimit=1
  useEffect(() => {
    if (searchParams.get('overLimit') === '1') {
      toast.warning(t('telegramUpgrade.mergedOverLimitWarning'), { duration: 8000 });
      const url = new URL(window.location.href);
      url.searchParams.delete('overLimit');
      window.history.replaceState(null, '', url.toString());
    }
  }, [searchParams, t]);

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

  const onDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      await profileApi.deleteAccount();
      toast.success(t('settings.accountDeleted'));
      await signOut({ callbackUrl: '/' });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('settings.accountDeleteFailed'));
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteConfirm(false);
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
      {isStub && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              {t('settings.webAccessCardTitle')}
            </CardTitle>
            <CardDescription>{t('settings.webAccessCardDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <a href="/tg/upgrade">{t('settings.webAccessCardCta')}</a>
            </Button>
          </CardContent>
        </Card>
      )}
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

            <div className="flex justify-end">
              <Button onClick={() => void onSave()} disabled={isSaving}>
                {isSaving ? t('settings.saving') : t('settings.saveProfile')}
              </Button>
            </div>
          </>
        </CardContent>
      </Card>

      {!isStub && (
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
      )}

      {/* DANGER ZONE */}
      <Card className="border-red-200 dark:border-red-900/50 mt-8">
        <CardHeader>
          <CardTitle className="text-red-600 dark:text-red-500">
            {t('settings.dangerZone')}
          </CardTitle>
          <CardDescription>{t('settings.deleteAccountDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium text-muted-foreground">
              {t('settings.deleteAccountWarning')}
            </p>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeletingAccount}
            >
              {t('settings.deleteAccountButton')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={() => void onDeleteAccount()}
        title={t('settings.deleteConfirmTitle')}
        description={t('settings.deleteConfirmDescription')}
        confirmLabel={
          isDeletingAccount ? t('settings.deleting') : t('settings.deleteConfirmAction')
        }
        cancelLabel={t('buttons.cancel')}
      />
    </main>
  );
}
