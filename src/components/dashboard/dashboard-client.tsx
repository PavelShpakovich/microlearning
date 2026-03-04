'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import type { Database } from '@/lib/supabase/types';
import { themeApi } from '@/services/theme-api';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/common/confirmation-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { isTelegramWebApp } from '@/components/telegram-provider';
import { TgSettingsBar } from './tg-settings-bar';
import { ThemeList } from './theme-list';

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
  const isTg = isTelegramWebApp();

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
      const updated = await themeApi.togglePrivacy(themeId, !currentIsPublic);
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

  const renderThemeList = (currentThemes: Theme[], isOwner: boolean) => (
    <ThemeList
      themes={currentThemes}
      isOwner={isOwner}
      cardCounts={cardCounts}
      togglingPrivacy={togglingPrivacy}
      onPrivacyToggle={(id, current) => void handlePrivacyToggle(id, current)}
      onDelete={(theme) => setThemeToDelete(theme)}
    />
  );

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 md:py-10">
      {isTg && <TgSettingsBar />}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {t('dashboard.heading')}
          </h1>
          <p className="mt-1 text-sm md:text-base text-muted-foreground">
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
