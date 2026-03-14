'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { profileApi } from '@/services/profile-api';
import { revalidateProfileData } from '@/actions/profile';
import { broadcastDisplayName } from '@/hooks/use-display-name';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslations } from 'next-intl';
import { ChevronRight } from 'lucide-react';
import { BackLink } from '@/components/common/back-link';
import { isTelegramWebApp } from '@/components/telegram-provider';
import { areSubscriptionsEnabled } from '@/lib/feature-flags';

interface SettingsClientProps {
  initialProfile: {
    display_name: string | null;
    telegram_id: string | null;
  } | null;
  /** OAuth / NextAuth display name as an additional fallback */
  userName?: string | null;
  userEmail?: string | null;
  /** True if the user is a Telegram-first stub (no email credentials set up yet) */
  isStub?: boolean;
}

import { signOut } from 'next-auth/react';
import { ConfirmationDialog } from '@/components/common/confirmation-dialog';

export function SettingsClient({
  initialProfile,
  userName,
  userEmail,
  isStub = false,
}: SettingsClientProps) {
  const t = useTranslations();
  const [displayName, setDisplayName] = useState(initialProfile?.display_name || userName || '');
  const [isSaving, setIsSaving] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [webAccessEmail, setWebAccessEmail] = useState(
    userEmail && !userEmail.includes('@noreply') ? userEmail : '',
  );
  const [webAccessPassword, setWebAccessPassword] = useState('');
  const [webAccessConfirmPassword, setWebAccessConfirmPassword] = useState('');
  const [isSettingUpWebAccess, setIsSettingUpWebAccess] = useState(false);
  const [isStartingTelegramLink, setIsStartingTelegramLink] = useState(false);

  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const telegramId = initialProfile?.telegram_id ?? null;
  const canShowBilling = areSubscriptionsEnabled();

  const onSetupWebAccess = async () => {
    if (!webAccessEmail.includes('@')) {
      toast.error(t('validation.invalidEmail'));
      return;
    }

    if (webAccessPassword.length < 6) {
      toast.error(t('validation.passwordTooShort'));
      return;
    }

    if (webAccessPassword !== webAccessConfirmPassword) {
      toast.error(t('validation.passwordsDoNotMatch'));
      return;
    }

    try {
      setIsSettingUpWebAccess(true);
      await profileApi.setupWebAccess(webAccessEmail, webAccessPassword);
      toast.success(t('auth.passwordUpdated'));
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('auth.error'));
    } finally {
      setIsSettingUpWebAccess(false);
    }
  };

  const onConnectTelegram = async () => {
    try {
      setIsStartingTelegramLink(true);
      const result = await profileApi.startTelegramLink();

      if (result.alreadyLinked) {
        toast.success(t('settings.telegramConnected'));
        return;
      }

      if (!result.deepLink) {
        throw new Error(t('settings.telegramConnectFailed'));
      }

      window.open(result.deepLink, '_blank', 'noopener,noreferrer');
      toast.success(t('settings.telegramConnectOpened'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('settings.telegramConnectFailed'));
    } finally {
      setIsStartingTelegramLink(false);
    }
  };

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
      if (isTelegramWebApp()) {
        // Close the Mini App — the cleanest exit after intentional deletion.
        // Redirecting to /tg would immediately auto-create a new account.
        window.Telegram!.WebApp.close();
      } else {
        await signOut({ callbackUrl: '/' });
      }
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

      <Link href="/settings/plan" className="block group">
        <Card className="transition-colors hover:border-foreground/30">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-base">
                {canShowBilling ? t('settings.planCardTitle') : t('settings.usageCardTitle')}
              </CardTitle>
              <CardDescription>
                {canShowBilling
                  ? t('settings.planCardDescription')
                  : t('settings.usageCardDescription')}
              </CardDescription>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
          </CardHeader>
        </Card>
      </Link>

      {isStub && (
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.webAccessCardTitle')}</CardTitle>
            <CardDescription>{t('settings.webAccessCardDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webAccessEmail">{t('auth.email')}</Label>
              <Input
                id="webAccessEmail"
                type="email"
                value={webAccessEmail}
                onChange={(event) => setWebAccessEmail(event.target.value)}
                placeholder={t('auth.emailPlaceholder')}
                disabled={isSettingUpWebAccess}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="webAccessPassword">{t('auth.password')}</Label>
              <Input
                id="webAccessPassword"
                type="password"
                value={webAccessPassword}
                onChange={(event) => setWebAccessPassword(event.target.value)}
                placeholder={t('auth.passwordPlaceholder')}
                disabled={isSettingUpWebAccess}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="webAccessConfirmPassword">{t('auth.confirmPassword')}</Label>
              <Input
                id="webAccessConfirmPassword"
                type="password"
                value={webAccessConfirmPassword}
                onChange={(event) => setWebAccessConfirmPassword(event.target.value)}
                placeholder={t('auth.passwordPlaceholder')}
                disabled={isSettingUpWebAccess}
              />
            </div>
            <div className="flex justify-end">
              <Button
                className="w-full sm:w-auto"
                onClick={() => void onSetupWebAccess()}
                disabled={isSettingUpWebAccess}
              >
                {isSettingUpWebAccess ? t('auth.saving') : t('settings.webAccessCardCta')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.telegramCardTitle')}</CardTitle>
          <CardDescription>{t('settings.telegramCardDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            {telegramId ? t('settings.telegramConnected') : t('settings.telegramBotDescription')}
          </div>
          <Button
            variant={telegramId ? 'secondary' : 'default'}
            onClick={() => void onConnectTelegram()}
            disabled={Boolean(telegramId) || isStartingTelegramLink}
          >
            {telegramId
              ? t('settings.telegramConnected')
              : isStartingTelegramLink
                ? t('settings.telegramConnecting')
                : t('settings.telegramConnectCta')}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.profileTitle')}</CardTitle>
          <CardDescription>{t('settings.profileDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <>
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
              <Button
                className="w-full sm:w-auto"
                onClick={() => void onSave()}
                disabled={isSaving}
              >
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
                className="w-full sm:w-auto"
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
