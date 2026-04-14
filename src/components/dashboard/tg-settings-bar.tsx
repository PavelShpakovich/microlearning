'use client';

import { Globe, Moon, Settings, ShieldCheck, Sun, Monitor, Orbit, ScrollText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { useUiLanguage } from '@/hooks/use-ui-language';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export function TgSettingsBar() {
  const t = useTranslations();
  const { theme: rawTheme, setTheme: setColorTheme, resolvedTheme } = useTheme();
  const colorTheme = rawTheme ?? 'system';
  const { locale, setLanguage } = useUiLanguage();
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="mb-4 flex items-center justify-between gap-2 p-2">
        <div className="shrink-0 w-20 h-7 flex items-center">
          <Skeleton className="h-6 w-16" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-20 rounded-full" />
          <Skeleton className="size-8" />
          <Skeleton className="size-8" />
          <Skeleton className="size-8" />
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 flex items-center justify-between gap-2 p-2">
      {/* Logo — links to dashboard */}
      <Link href="/dashboard" className="shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolvedTheme === 'dark' ? '/logo.png' : '/logo-dark.png'}
          alt="Logo"
          className="h-8 w-auto object-contain"
        />
      </Link>

      <div className="flex items-center gap-2">
        {/* Language */}
        <div className="flex items-center gap-1 rounded-full border border-border bg-background px-1 py-1">
          <Globe className="mx-1.5 size-3.5 text-muted-foreground" />
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
          onClick={() => {
            const next =
              colorTheme === 'light' ? 'dark' : colorTheme === 'dark' ? 'system' : 'light';
            setColorTheme(next);
          }}
          title={
            colorTheme === 'system' ? 'System' : colorTheme === 'dark' ? 'Dark Mode' : 'Light Mode'
          }
        >
          {colorTheme === 'system' || !colorTheme ? (
            <Monitor />
          ) : resolvedTheme === 'dark' ? (
            <Moon />
          ) : (
            <Sun />
          )}
        </Button>

        {/* Settings */}
        <Button variant="ghost" size="icon" asChild title={t('navigation.settings')}>
          <Link href="/settings">
            <Settings />
          </Link>
        </Button>

        <Button variant="ghost" size="icon" asChild title="Charts">
          <Link href="/charts">
            <Orbit />
          </Link>
        </Button>

        <Button variant="ghost" size="icon" asChild title="Readings">
          <Link href="/readings">
            <ScrollText />
          </Link>
        </Button>

        {/* Admin Panel (admin users only) */}
        {user?.isAdmin ? (
          <Button variant="ghost" size="icon" asChild title={t('navigation.adminPanel')}>
            <Link href="/admin">
              <ShieldCheck />
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
