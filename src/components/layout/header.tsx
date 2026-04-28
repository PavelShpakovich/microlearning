'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/use-auth';
import { useDisplayName } from '@/hooks/use-display-name';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
  Moon,
  Sun,
  LayoutDashboard,
  Monitor,
  ScrollText,
  Orbit,
  CalendarDays,
  Coins,
  Link2,
} from 'lucide-react';
import { FeedbackButton } from '@/components/common/feedback-widget';
import { CreditBalance } from '@/components/layout/credit-balance';

// ─── Shared constants ────────────────────────────────────────────────────────
const HEADER_CLASS =
  'sticky top-0 z-40 h-16 shrink-0 border-b border-border/50 bg-background/80 backdrop-blur-md';
const INNER_CLASS =
  'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-4';

// ─── Theme toggle (shared across auth states) ────────────────────────────────
function ThemeToggle({
  theme,
  resolvedTheme,
  setTheme,
  t,
}: {
  theme: string;
  resolvedTheme?: string;
  setTheme: (t: string) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t('common.toggleTheme')}>
          {resolvedTheme === 'dark' ? <Moon className="size-4" /> : <Sun className="size-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => setTheme('light')}
          className={theme === 'light' ? 'bg-muted' : ''}
        >
          <Sun className="size-4 mr-2" />
          {t('common.themeLight')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('dark')}
          className={theme === 'dark' ? 'bg-muted' : ''}
        >
          <Moon className="size-4 mr-2" />
          {t('common.themeDark')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('system')}
          className={theme === 'system' ? 'bg-muted' : ''}
        >
          <Monitor className="size-4 mr-2" />
          {t('common.themeSystem')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Nav link with active indicator ─────────────────────────────────────────
function NavLink({
  href,
  icon: Icon,
  label,
  pathname,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  pathname: string;
}) {
  const active = pathname === href || pathname.startsWith(href + '/');
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
      )}
    >
      <Icon className="size-4 shrink-0" />
      {label}
    </Link>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export function Header() {
  const t = useTranslations();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { theme: rawTheme, setTheme, resolvedTheme } = useTheme();
  const theme = rawTheme ?? 'system';
  const displayName = useDisplayName();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const logoSrc = resolvedTheme === 'dark' ? '/logo.png' : '/logo-dark.png';

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <header className={HEADER_CLASS}>
        <div className={INNER_CLASS}>
          <Link href="/" className="flex items-center gap-2">
            <Image
              src={logoSrc}
              alt="Clario"
              width={40}
              height={40}
              priority
              className="h-10 w-auto"
            />
          </Link>
          <Skeleton className="h-8 w-24" />
        </div>
      </header>
    );
  }

  // ── Unauthenticated ───────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <header className={HEADER_CLASS}>
        <div className={INNER_CLASS}>
          <Link href="/" className="flex items-center gap-2">
            <Image
              src={logoSrc}
              alt="Clario"
              width={40}
              height={40}
              priority
              className="h-10 w-auto"
            />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle theme={theme} resolvedTheme={resolvedTheme} setTheme={setTheme} t={t} />
            <Button variant="ghost" asChild className="h-11 px-4">
              <Link href="/login">{t('navigation.login')}</Link>
            </Button>
            <Button asChild className="h-11 px-4">
              <Link href="/register">{t('navigation.register')}</Link>
            </Button>
          </div>
        </div>
      </header>
    );
  }

  // ── Authenticated ─────────────────────────────────────────────────────────
  return (
    <header className={HEADER_CLASS}>
      <div className={INNER_CLASS}>
        {/* Logo → dashboard */}
        <Link href="/dashboard" className="flex shrink-0 items-center gap-2">
          <Image
            src={logoSrc}
            alt="Clario"
            width={40}
            height={40}
            priority
            className="h-10 w-auto"
          />
        </Link>

        {/* Primary nav — visible md+ */}
        <nav className="hidden md:flex items-center gap-1 flex-1" aria-label={t('common.mainNav')}>
          <NavLink href="/charts" icon={Orbit} label={t('navigation.charts')} pathname={pathname} />
          <NavLink
            href="/readings"
            icon={ScrollText}
            label={t('navigation.readings')}
            pathname={pathname}
          />
          <NavLink
            href="/compatibility"
            icon={Link2}
            label={t('navigation.compatibility')}
            pathname={pathname}
          />
          <NavLink
            href="/calendar"
            icon={CalendarDays}
            label={t('navigation.calendar')}
            pathname={pathname}
          />
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-1">
          <CreditBalance />
          <FeedbackButton />
          <ThemeToggle theme={theme} resolvedTheme={resolvedTheme} setTheme={setTheme} t={t} />

          {/* User menu */}
          <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-11 gap-2 pl-2 pr-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                  {(displayName?.[0] ?? 'U').toUpperCase()}
                </span>
                <span className="hidden sm:inline max-w-[120px] truncate text-sm">
                  {displayName}
                </span>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-64 max-w-[calc(100vw-2rem)]">
              {/* User info */}
              <DropdownMenuLabel>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="font-semibold text-sm">{displayName}</p>
                  <p className="break-all whitespace-normal text-xs leading-snug text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              {/* Dashboard */}
              <DropdownMenuItem asChild>
                <Link href="/dashboard" className="flex items-center gap-2">
                  <LayoutDashboard className="size-4" />
                  {t('navigation.workspace')}
                </Link>
              </DropdownMenuItem>

              {/* Charts & Readings — always in dropdown (mobile fallback) */}
              <DropdownMenuItem asChild>
                <Link href="/charts" className="flex items-center gap-2">
                  <Orbit className="size-4" />
                  {t('navigation.charts')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/readings" className="flex items-center gap-2">
                  <ScrollText className="size-4" />
                  {t('navigation.readings')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/compatibility" className="flex items-center gap-2">
                  <Link2 className="size-4" />
                  {t('navigation.compatibility')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/calendar" className="flex items-center gap-2">
                  <CalendarDays className="size-4" />
                  {t('navigation.calendar')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/store" className="flex items-center gap-2">
                  <Coins className="size-4" />
                  {t('credits.store')}
                </Link>
              </DropdownMenuItem>

              {/* Settings */}
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center gap-2">
                  <Settings className="size-4" />
                  {t('navigation.settings')}
                </Link>
              </DropdownMenuItem>

              {/* Admin (if applicable) */}
              {user?.isAdmin ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="flex items-center gap-2">
                      <ShieldCheck className="size-4" />
                      {t('navigation.adminPanel')}
                    </Link>
                  </DropdownMenuItem>
                </>
              ) : null}

              <DropdownMenuSeparator />

              {/* Logout */}
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: '/' })}
                className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer"
              >
                <LogOut className="size-4" />
                {t('navigation.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
