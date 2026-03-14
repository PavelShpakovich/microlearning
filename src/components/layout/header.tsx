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
  Monitor,
} from 'lucide-react';

export function Header() {
  const t = useTranslations();
  const { user, isAuthenticated } = useAuth();
  const { theme: rawTheme, setTheme, resolvedTheme } = useTheme();
  const theme = rawTheme ?? 'system';
  const displayName = useDisplayName();
  const { locale, setLanguage } = useUiLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // In Telegram Mini App context, show settings bar on all pages except study and the /tg auth entry page
  if (isTelegramWebApp()) {
    if (pathname.startsWith('/study') || pathname === '/tg') return null;
    return <TgSettingsBar />;
  }

  if (!isAuthenticated) {
    return (
      <header className="border-b bg-background sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 md:py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src={resolvedTheme === 'dark' ? '/logo.png' : '/logo-dark.png'}
              alt="Logo"
              width={64}
              height={64}
              priority
              className="h-16 w-auto"
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  {theme === 'system' ? (
                    <Monitor className="w-4 h-4" />
                  ) : theme === 'dark' ? (
                    <Moon className="w-4 h-4" />
                  ) : (
                    <Sun className="w-4 h-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setTheme('light')}
                  className={theme === 'light' ? 'bg-muted' : ''}
                >
                  <Sun className="w-4 h-4 mr-2" /> Light
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setTheme('dark')}
                  className={theme === 'dark' ? 'bg-muted' : ''}
                >
                  <Moon className="w-4 h-4 mr-2" /> Dark
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setTheme('system')}
                  className={theme === 'system' ? 'bg-muted' : ''}
                >
                  <Monitor className="w-4 h-4 mr-2" /> System
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

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
            src={resolvedTheme === 'dark' ? '/logo.png' : '/logo-dark.png'}
            alt="Logo"
            width={64}
            height={64}
            priority
            className="h-16 w-auto"
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  {theme === 'system' ? (
                    <Monitor className="w-4 h-4" />
                  ) : theme === 'dark' ? (
                    <Moon className="w-4 h-4" />
                  ) : (
                    <Sun className="w-4 h-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setTheme('light')}
                  className={theme === 'light' ? 'bg-muted' : ''}
                >
                  <Sun className="w-4 h-4 mr-2" /> Light
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setTheme('dark')}
                  className={theme === 'dark' ? 'bg-muted' : ''}
                >
                  <Moon className="w-4 h-4 mr-2" /> Dark
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setTheme('system')}
                  className={theme === 'system' ? 'bg-muted' : ''}
                >
                  <Monitor className="w-4 h-4 mr-2" /> System
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

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
