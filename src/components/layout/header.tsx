'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { signOut } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useDisplayName } from '@/hooks/use-display-name';
import { useUiLanguage } from '@/hooks/use-ui-language';
import { Button } from '@/components/ui/button';
import { isTelegramWebApp } from '@/components/telegram-provider';
import { TgSettingsBar } from '@/components/dashboard/tg-settings-bar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  LogOut,
  Settings,
  ShieldCheck,
  User,
  Moon,
  Sun,
  Globe,
  LayoutDashboard,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function Header() {
  const t = useTranslations();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { theme, setTheme } = useTheme();
  const displayName = useDisplayName();
  const { locale, setLanguage } = useUiLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // In Telegram Mini App context, show settings bar on all pages except study
  if (isTelegramWebApp()) {
    if (pathname.startsWith('/study')) return null;
    return <TgSettingsBar />;
  }

  // Skip rendering unauthenticated header while session is loading to avoid flash
  if (isLoading) {
    return (
      <header className="border-b bg-background sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 md:py-4 flex items-center justify-between">
          <div className="w-[64px] h-[64px] flex items-center">
            <Skeleton className="h-8 w-16" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </header>
    );
  }

  if (!isAuthenticated) {
    return (
      <header className="border-b bg-background sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 md:py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src={theme === 'dark' ? '/logo.png' : '/logo-dark.png'}
              alt="Logo"
              width={64}
              height={64}
            />
          </Link>
          <div className="flex items-center gap-2">
            {/* Language Toggle */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Globe className="w-4 h-4" />
                  <span className="hidden sm:inline text-xs">{locale.toUpperCase()}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => void setLanguage('en')}
                  className={locale === 'en' ? 'bg-muted' : ''}
                >
                  {t('common.english')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => void setLanguage('ru')}
                  className={locale === 'ru' ? 'bg-muted' : ''}
                >
                  {t('common.russian')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>

            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">{t('navigation.login')}</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/register">{t('navigation.register')}</Link>
            </Button>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="border-b bg-background sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1 md:py-2 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image
            src={theme === 'dark' ? '/logo.png' : '/logo-dark.png'}
            alt="Logo"
            width={64}
            height={64}
          />
        </Link>

        {isAuthenticated && (
          <div className="flex items-center gap-2">
            {/* Language Toggle */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Globe className="w-4 h-4" />
                  <span className="hidden sm:inline text-xs">{locale.toUpperCase()}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => void setLanguage('en')}
                  className={locale === 'en' ? 'bg-muted' : ''}
                >
                  {t('common.english')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => void setLanguage('ru')}
                  className={locale === 'ru' ? 'bg-muted' : ''}
                >
                  {t('common.russian')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="gap-2"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>

            {/* User Dropdown */}
            <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">{displayName}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col gap-1">
                    <p className="font-semibold text-sm">{displayName}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="flex items-center gap-2">
                    <LayoutDashboard className="w-4 h-4" />
                    {t('navigation.dashboard')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    {t('navigation.settings')}
                  </Link>
                </DropdownMenuItem>
                {user?.isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" />
                        {t('navigation.adminPanel')}
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="flex items-center gap-2 text-red-600 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  {t('navigation.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </header>
  );
}
