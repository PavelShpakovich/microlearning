'use client';

import { Globe, Moon, Settings, ShieldCheck, Sun, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';
import { useUiLanguage } from '@/hooks/use-ui-language';
import { useSubscription } from '@/hooks/use-subscription';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export function TgSettingsBar() {
  const t = useTranslations();
  const { theme: colorTheme, setTheme: setColorTheme } = useTheme();
  const { locale, setLanguage } = useUiLanguage();
  const { user, isLoading } = useAuth();
  const { status: subscription, isLoading: subLoading } = useSubscription();
  const cardsRemaining = subscription?.usage?.cardsRemaining;

  if (isLoading || subLoading) {
    return (
      <div className="mb-4 flex items-center justify-between gap-2 p-2">
        <div className="shrink-0 w-20 h-7 flex items-center">
          <Skeleton className="h-6 w-16" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-12 rounded-full" />
          <Skeleton className="h-7 w-20 rounded-full" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 flex items-center justify-between gap-2 p-2">
      {/* Logo — links to dashboard */}
      <Link href="/dashboard" className="shrink-0">
        <Image
          src={colorTheme === 'dark' ? '/logo.png' : '/logo-dark.png'}
          alt="Logo"
          width={40}
          height={32}
          className="h-8 w-auto object-contain"
          priority
          unoptimized
        />
      </Link>

      <div className="flex items-center gap-2">
        {/* Cards remaining indicator */}
        {cardsRemaining != null && (
          <div
            className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
              cardsRemaining === 0
                ? 'border-destructive/30 bg-destructive/10 text-destructive'
                : cardsRemaining <= 5
                  ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
                  : 'border-border bg-background text-muted-foreground'
            }`}
          >
            <Sparkles className="h-3 w-3" />
            <span>{cardsRemaining}</span>
          </div>
        )}
        {/* Language */}
        <div className="flex items-center gap-1 rounded-full border border-border bg-background px-1 py-1">
          <Globe className="mx-1.5 h-3.5 w-3.5 text-muted-foreground" />
          {(['en', 'ru'] as const).map((l) => (
            <button
              key={l}
              onClick={() => void setLanguage(l)}
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${
                locale === l
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Colour scheme */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setColorTheme(colorTheme === 'dark' ? 'light' : 'dark')}
          title={colorTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        >
          {colorTheme === 'dark' ? (
            <Sun className="h-3.5 w-3.5" />
          ) : (
            <Moon className="h-3.5 w-3.5" />
          )}
        </Button>

        {/* Settings */}
        <Button variant="ghost" size="icon" asChild title={t('navigation.settings')}>
          <Link href="/settings">
            <Settings className="h-3.5 w-3.5" />
          </Link>
        </Button>

        {/* Admin Panel (admin users only) */}
        {user?.isAdmin && (
          <Button variant="ghost" size="icon" asChild title={t('navigation.adminPanel')}>
            <Link href="/admin">
              <ShieldCheck className="h-3.5 w-3.5" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
