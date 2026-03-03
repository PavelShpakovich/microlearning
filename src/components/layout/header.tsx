'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { signOut } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/use-auth';
import { useStreak } from '@/hooks/use-streak';
import { useDisplayName } from '@/hooks/use-display-name';
import { useUiLanguage } from '@/hooks/use-ui-language';
import { Button } from '@/components/ui/button';
import { isTelegramWebApp } from '@/components/telegram-provider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, Settings, User, Moon, Sun, Flame, Globe } from 'lucide-react';

export function Header() {
  const t = useTranslations();
  const { user, isAuthenticated } = useAuth();
  const { theme, setTheme } = useTheme();
  const { streak } = useStreak();
  const displayName = useDisplayName();
  const { locale, setLanguage } = useUiLanguage();
  const [isOpen, setIsOpen] = useState(false);

  // Hide header in Telegram Mini App context
  if (isTelegramWebApp()) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <header className="border-b bg-white dark:bg-gray-900 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 md:py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/globe.svg" alt="Logo" width={32} height={32} />
          </Link>
          <div className="flex gap-2">
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
    <header className="border-b bg-white dark:bg-gray-900 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 md:py-4 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image src="/globe.svg" alt="Logo" width={32} height={32} />
        </Link>

        {isAuthenticated && (
          <div className="flex items-center gap-2">
            {/* Streak Counter */}
            {streak !== null && streak > 0 && (
              <div className="flex items-center gap-1 px-3 py-2 rounded-lg bg-orange-50 dark:bg-orange-950">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                  {streak}
                </span>
              </div>
            )}

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
                  className={locale === 'en' ? 'bg-blue-50' : ''}
                >
                  {t('common.english')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => void setLanguage('ru')}
                  className={locale === 'ru' ? 'bg-blue-50' : ''}
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
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {t('navigation.dashboard')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    {t('navigation.settings')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: '/login' })}
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
