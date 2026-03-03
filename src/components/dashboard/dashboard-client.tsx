'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Trash2, BookOpen, Globe, Lock, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import type { Database } from '@/lib/supabase/types';
import { themeApi } from '@/services/theme-api';
import { themesApi } from '@/services/themes-api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { ConfirmationDialog } from '@/components/common/confirmation-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Theme = Database['public']['Tables']['themes']['Row'];

interface DashboardClientProps {
  initialThemes: Theme[];
  publicThemes?: Theme[];
  cardCounts?: Record<string, number>;
}

export function DashboardClient({
  initialThemes,
  publicThemes = [],
  cardCounts = {},
}: DashboardClientProps) {
  const t = useTranslations();
  const [themes, setThemes] = useState(initialThemes);
  const [themeToDelete, setThemeToDelete] = useState<Theme | null>(null);
  const [togglingPrivacy, setTogglingPrivacy] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!themeToDelete) return;
    try {
      await themeApi.deleteTheme(themeToDelete.id);

      setThemes((prev) => prev.filter((theme) => theme.id !== themeToDelete.id));
      toast.success(t('messages.themeDeleted'));
    } catch {
      toast.error(t('messages.failedDelete'));
    } finally {
      setThemeToDelete(null);
    }
  };

  const handlePrivacyToggle = async (themeId: string, currentIsPublic: boolean) => {
    setTogglingPrivacy(themeId);
    try {
      const updated = await themesApi.togglePrivacy(themeId, !currentIsPublic);
      setThemes((prev) =>
        prev.map((theme) =>
          theme.id === themeId ? { ...theme, is_public: updated.is_public } : theme,
        ),
      );
      const status = updated.is_public ? t('dashboard.public') : t('dashboard.private');
      toast.success(`Theme is now ${status}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('messages.failedUpdate'));
    } finally {
      setTogglingPrivacy(null);
    }
  };

  const renderThemeList = (currentThemes: Theme[], isOwner: boolean) => {
    if (currentThemes.length === 0) {
      return (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="mb-4 h-12 w-12 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900">
              {isOwner ? t('dashboard.emptyTitle') : t('dashboard.noCommunityThemes')}
            </h3>
            <p className="mt-2 text-gray-600">
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {currentThemes.map((theme) => (
          <Card key={theme.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="line-clamp-2">{theme.name}</CardTitle>
                <span className="shrink-0 rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                  {cardCounts[theme.id] ?? 0} {t('dashboard.cards')}
                </span>
              </div>
              {theme.description && (
                <CardDescription className="line-clamp-2">{theme.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="mt-auto space-y-3">
              <div className="flex gap-2">
                <Link href={`/study/${theme.id}`} className="flex-1">
                  <Button className="w-full" variant="default" size="sm">
                    {t('buttons.study')}
                  </Button>
                </Link>
                {isOwner && (
                  <Link href={`/themes/${theme.id}/edit`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      {t('buttons.edit')}
                    </Button>
                  </Link>
                )}
              </div>

              {isOwner && (
                <div className="flex items-center justify-between border-t pt-3">
                  <div className="flex items-center gap-2">
                    {theme.is_public ? (
                      <Globe className="h-4 w-4 text-blue-600" />
                    ) : (
                      <Lock className="h-4 w-4 text-gray-400" />
                    )}
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {theme.is_public ? t('dashboard.public') : t('dashboard.private')}
                    </span>
                  </div>
                  <Switch
                    checked={theme.is_public ?? false}
                    onCheckedChange={() =>
                      void handlePrivacyToggle(theme.id, theme.is_public ?? false)
                    }
                    disabled={togglingPrivacy === theme.id}
                  />
                </div>
              )}

              {isOwner && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-red-600 hover:text-red-700"
                  onClick={() => setThemeToDelete(theme)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('buttons.delete')}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 md:py-10">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
            {t('dashboard.heading')}
          </h1>
          <p className="mt-1 text-sm md:text-base text-gray-600 dark:text-gray-400">
            {t('dashboard.description', { count: themes.length })}
          </p>
        </div>
        <Link href="/themes/new" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            {t('buttons.addTheme')}
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="my-themes" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="my-themes">{t('dashboard.myThemesTab')}</TabsTrigger>
          <TabsTrigger value="community">{t('dashboard.communityTab')}</TabsTrigger>
        </TabsList>
        <TabsContent value="my-themes">{renderThemeList(themes, true)}</TabsContent>
        <TabsContent value="community">{renderThemeList(publicThemes, false)}</TabsContent>
      </Tabs>

      <ConfirmationDialog
        open={!!themeToDelete}
        onOpenChange={(open) => {
          if (!open) setThemeToDelete(null);
        }}
        onConfirm={() => void handleDelete()}
        title={t('dialog.deleteTheme')}
        description={t('dialog.deleteThemeDescription')}
        confirmLabel={t('dialog.delete')}
        cancelLabel={t('dialog.cancel')}
      />
    </main>
  );
}
