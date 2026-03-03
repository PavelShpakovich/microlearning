'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/use-auth';
import { useStreak } from '@/hooks/use-streak';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, Settings, User, Moon, Sun, Flame } from 'lucide-react';

export function Header() {
  const { user, isAuthenticated } = useAuth();
  const { theme, setTheme } = useTheme();
  const { streak } = useStreak();
  const [isOpen, setIsOpen] = useState(false);

  if (!isAuthenticated) {
    return (
      <header className="border-b bg-white dark:bg-gray-900 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="font-bold text-2xl text-blue-600">
            Microlearning
          </Link>
          <div className="flex gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Sign up</Link>
            </Button>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="border-b bg-white dark:bg-gray-900 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="font-bold text-2xl text-blue-600">
          Microlearning
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

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="gap-2"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
              <span className="hidden sm:inline text-xs">
                {theme === 'dark' ? 'Light' : 'Dark'}
              </span>
            </Button>

            {/* User Dropdown */}
            <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">{user?.name || user?.email}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col gap-1">
                    <p className="font-semibold text-sm">{user?.name || 'User'}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="flex items-center gap-2 text-red-600 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </header>
  );
}
