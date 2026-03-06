'use client';

import { ChevronLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

interface BackLinkProps {
  href?: string;
}

/**
 * A back-navigation link shown on all inner pages (both Telegram Mini App and regular web).
 */
export function BackLink({ href = '/dashboard' }: BackLinkProps) {
  const t = useTranslations('navigation');

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
    >
      <ChevronLeft className="h-4 w-4" />
      {t('back')}
    </Link>
  );
}
