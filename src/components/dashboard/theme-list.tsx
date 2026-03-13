'use client';

import Link from 'next/link';
import { FolderOpen } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Database } from '@/lib/supabase/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ThemeCard } from './theme-card';

type Theme = Database['public']['Tables']['themes']['Row'];

interface ThemeListProps {
  themes: Theme[];
  isOwner: boolean;
  canShare?: boolean;
  cardCounts: Record<string, number>;
  togglingPrivacy: string | null;
  onPrivacyToggle: (themeId: string, currentIsPublic: boolean) => void;
  onDelete: (theme: Theme) => void;
  view?: 'grid' | 'list';
}

export function ThemeList({
  themes,
  isOwner,
  canShare = true,
  cardCounts,
  togglingPrivacy,
  onPrivacyToggle,
  onDelete,
  view = 'grid',
}: ThemeListProps) {
  const t = useTranslations();

  if (themes.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <FolderOpen className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground text-balance">
            {isOwner ? t('dashboard.emptyTitle') : t('dashboard.noCommunityThemes')}
          </h3>
          <p className="mt-2 text-muted-foreground text-balance">
            {isOwner ? t('dashboard.emptyDescription') : t('dashboard.communityEmptyDescription')}
          </p>
          {isOwner && (
            <Link href="/themes/new" className="mt-4">
              <Button>{t('buttons.addTheme')}</Button>
            </Link>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      className={
        view === 'list' ? 'flex flex-col gap-2' : 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'
      }
    >
      {themes.map((theme) => (
        <ThemeCard
          key={theme.id}
          theme={theme}
          cardCount={cardCounts[theme.id] ?? 0}
          isOwner={isOwner}
          canShare={canShare}
          togglingPrivacy={togglingPrivacy}
          onPrivacyToggle={onPrivacyToggle}
          onDelete={onDelete}
          view={view}
        />
      ))}
    </div>
  );
}
