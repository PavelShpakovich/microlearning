'use client';

import Link from 'next/link';
import { Trash2, Globe, Lock, BookOpen, Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Database } from '@/lib/supabase/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

type Theme = Database['public']['Tables']['themes']['Row'];

interface ThemeCardProps {
  theme: Theme;
  cardCount: number;
  isOwner: boolean;
  canShare?: boolean;
  togglingPrivacy: string | null;
  onPrivacyToggle: (themeId: string, currentIsPublic: boolean) => void;
  onDelete: (theme: Theme) => void;
  view?: 'grid' | 'list';
}

export function ThemeCard({
  theme,
  cardCount,
  isOwner,
  canShare = true,
  togglingPrivacy,
  onPrivacyToggle,
  onDelete,
  view = 'grid',
}: ThemeCardProps) {
  const t = useTranslations();
  if (view === 'list') {
    return (
      <Card className="px-3 py-2.5 md:px-4 md:py-3">
        {/* Desktop: horizontal layout */}
        <div className="hidden md:flex md:items-center md:gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-semibold text-sm text-foreground">{theme.name}</span>
              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {cardCount} {t('dashboard.cards')}
              </span>
            </div>
            {theme.description && (
              <p className="truncate text-xs text-muted-foreground mt-0.5">{theme.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isOwner && (
              <div
                className="flex items-center gap-1"
                title={!canShare ? t('dashboard.shareLockedTooltip') : undefined}
              >
                {theme.is_public ? (
                  <Globe className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <Switch
                  checked={theme.is_public ?? false}
                  onCheckedChange={() => onPrivacyToggle(theme.id, theme.is_public ?? false)}
                  disabled={togglingPrivacy === theme.id || !canShare}
                />
              </div>
            )}
            <Link href={`/study/${theme.id}`}>
              <Button variant="default" size="sm">
                {t('buttons.study')}
              </Button>
            </Link>
            {isOwner && (
              <Link href={`/themes/${theme.id}/edit`}>
                <Button variant="outline" size="sm">
                  {t('buttons.edit')}
                </Button>
              </Link>
            )}
            {isOwner && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive dark:text-destructive-foreground hover:text-destructive dark:hover:text-destructive-foreground"
                onClick={() => onDelete(theme)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Mobile: card-like layout with Study as primary action */}
        <div className="flex flex-col gap-1.5 md:hidden">
          {/* Header: Title + Card Count */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm text-foreground truncate">{theme.name}</h3>
              {theme.description && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">{theme.description}</p>
              )}
            </div>
            <span className="shrink-0 inline-flex rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
              {cardCount}
            </span>
          </div>

          {/* Actions - Privacy left, buttons right */}
          <div
            className={`flex items-center gap-1 ${!isOwner ? 'justify-end' : 'justify-between'}`}
          >
            {/* Privacy Toggle - Left */}
            {isOwner && (
              <div
                className="flex items-center gap-1 rounded-md border border-border bg-background px-1.5 py-1"
                title={!canShare ? t('dashboard.shareLockedTooltip') : undefined}
              >
                {theme.is_public ? (
                  <Globe className="h-3 w-3 text-primary" />
                ) : (
                  <Lock className="h-3 w-3 text-muted-foreground" />
                )}
                <Switch
                  checked={theme.is_public ?? false}
                  onCheckedChange={() => onPrivacyToggle(theme.id, theme.is_public ?? false)}
                  disabled={togglingPrivacy === theme.id || !canShare}
                  className="scale-75"
                />
              </div>
            )}

            {/* Buttons - Right */}
            <div className="flex items-center gap-1">
              {/* Study Button */}
              <Link href={`/study/${theme.id}`}>
                <Button variant="default" size="sm" className="h-7 px-2">
                  <BookOpen className={`h-3.5 w-3.5 ${!isOwner ? 'mr-1' : ''}`} />
                  {!isOwner && t('buttons.study')}
                </Button>
              </Link>

              {isOwner && (
                <>
                  {/* Edit */}
                  <Link href={`/themes/${theme.id}/edit`}>
                    <Button variant="outline" size="sm" className="h-7 px-2">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </Link>

                  {/* Delete */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="px-2 h-7 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                    onClick={() => onDelete(theme)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-full">
      {/* Header */}
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="line-clamp-2 text-base">{theme.name}</CardTitle>
          </div>
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {cardCount}
          </span>
        </div>
        {theme.description && (
          <CardDescription className="line-clamp-2 mt-1">{theme.description}</CardDescription>
        )}
      </CardHeader>

      {/* Content - spacing for bottom alignment */}
      <CardContent className="flex-1 pb-3" />

      {/* Actions Footer */}
      <div className="border-t px-4 py-3 space-y-2">
        {isOwner ? (
          <div className="space-y-2">
            {/* First Row: Study and Edit */}
            <div className="flex items-center gap-2">
              <Link href={`/study/${theme.id}`} className="flex-1">
                <Button className="w-full" variant="default" size="sm">
                  {t('buttons.study')}
                </Button>
              </Link>
              <Link href={`/themes/${theme.id}/edit`} className="flex-1">
                <Button variant="outline" size="sm" className="w-full">
                  {t('buttons.edit')}
                </Button>
              </Link>
            </div>

            {/* Second Row: Delete and Privacy Row */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                onClick={() => onDelete(theme)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('buttons.delete')}
              </Button>

              {/* Privacy Toggle - Compact */}
              <div
                className="flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2 py-1.5"
                title={!canShare ? t('dashboard.shareLockedTooltip') : undefined}
              >
                {theme.is_public ? (
                  <Globe className="h-3.5 w-3.5 text-primary shrink-0" />
                ) : (
                  <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                )}
                <Switch
                  checked={theme.is_public ?? false}
                  onCheckedChange={() => onPrivacyToggle(theme.id, theme.is_public ?? false)}
                  disabled={togglingPrivacy === theme.id || !canShare}
                  className="scale-90"
                />
              </div>
            </div>
          </div>
        ) : (
          /* For non-owners, just the Study button */
          <Link href={`/study/${theme.id}`} className="block">
            <Button className="w-full" variant="default" size="sm">
              <BookOpen className="h-4 w-4 mr-2" />
              {t('buttons.study')}
            </Button>
          </Link>
        )}
      </div>
    </Card>
  );
}
