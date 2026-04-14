'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import { Send } from 'lucide-react';

const BOT_URL = process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL;

export function LandingFooter() {
  const { theme } = useTheme();
  const t = useTranslations('landing');
  const year = new Date().getFullYear();

  return (
    <footer className="border-t bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Image
            src={theme === 'dark' ? '/logo.png' : '/logo-dark.png'}
            alt="Clario"
            width={32}
            height={32}
          />
          <span className="text-sm text-muted-foreground">
            © {year} Clario. {t('footerRights')}
          </span>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <Link
            href="/privacy"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('footerPrivacy')}
          </Link>
          <Link
            href="/terms"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('footerTerms')}
          </Link>
          {BOT_URL ? (
            <a
              href={BOT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Send className="size-3.5" />
              {t('footerTelegram')}
            </a>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
