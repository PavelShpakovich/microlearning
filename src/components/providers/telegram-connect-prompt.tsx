'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { Send } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { profileApi } from '@/services/profile-api';
import { isTelegramWebApp } from '@/components/telegram-provider';

const BOT_URL = process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL;

/**
 * Shows a one-time dialog suggesting the web user connects their Telegram account.
 *
 * Conditions to show:
 *  - User is authenticated
 *  - BOT_URL is configured
 *  - Not already inside the Telegram WebApp
 *  - User does not already have telegram_id linked (checked via profile API)
 *  - localStorage flag `tg_prompt_shown_{userId}` is not set
 *
 * On dismiss or connect: sets the flag so it never shows again (for this account on this device).
 */
export function TelegramConnectPrompt() {
  const { data: session, status } = useSession();
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.id || !BOT_URL) return;
    if (isTelegramWebApp()) return;

    const storageKey = `tg_prompt_shown_${session.user.id}`;
    if (localStorage.getItem(storageKey)) return;

    // Fetch profile to check if telegram already linked
    profileApi
      .getProfile()
      .then((profile) => {
        if (!profile.telegram_id) {
          setOpen(true);
        }
      })
      .catch(() => {
        // Silently ignore — non-critical prompt
      });
  }, [status, session?.user?.id]);

  function dismiss() {
    if (session?.user?.id) {
      localStorage.setItem(`tg_prompt_shown_${session.user.id}`, '1');
    }
    setOpen(false);
  }

  async function onConnect() {
    if (!BOT_URL || !session?.user?.id) return;
    try {
      setIsConnecting(true);
      const { token } = await profileApi.generateTelegramLinkToken();
      const deepLink = `${BOT_URL}?startapp=link_${token}`;
      window.open(deepLink, '_blank', 'noopener,noreferrer');
      toast.success(t('settings.telegramConnectOpened'));
      dismiss();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('settings.telegramConnectFailed'));
    } finally {
      setIsConnecting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) dismiss();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            {t('telegramPrompt.title')}
          </DialogTitle>
          <DialogDescription>{t('telegramPrompt.description')}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={dismiss}>
            {t('telegramPrompt.dismiss')}
          </Button>
          <Button onClick={() => void onConnect()} disabled={isConnecting}>
            <Send className="mr-2 h-4 w-4" />
            {isConnecting ? t('telegramPrompt.connecting') : t('telegramPrompt.connect')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
