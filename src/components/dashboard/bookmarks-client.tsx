'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Bookmark, ExternalLink, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { InfoCard } from '@/components/info-card';
import type { BookmarkListItem } from '@/lib/bookmarks';

interface BookmarksClientProps {
  initialBookmarks: BookmarkListItem[];
}

export function BookmarksClient({ initialBookmarks }: BookmarksClientProps) {
  const t = useTranslations();
  const [bookmarks, setBookmarks] = useState(initialBookmarks);
  const [pendingCardId, setPendingCardId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const groups = new Map<
      string,
      { themeId: string; themeName: string; items: BookmarkListItem[] }
    >();

    for (const bookmark of bookmarks) {
      const existing = groups.get(bookmark.themeId);
      if (existing) {
        existing.items.push(bookmark);
      } else {
        groups.set(bookmark.themeId, {
          themeId: bookmark.themeId,
          themeName: bookmark.themeName || t('bookmarks.themeFallback'),
          items: [bookmark],
        });
      }
    }

    return Array.from(groups.values());
  }, [bookmarks, t]);

  const handleRemove = async (cardId: string) => {
    setPendingCardId(cardId);
    try {
      const res = await fetch(`/api/bookmarks/${cardId}`, { method: 'DELETE' });
      if (!res.ok) {
        throw new Error('Failed to remove bookmark');
      }
      setBookmarks((prev) => prev.filter((bookmark) => bookmark.cardId !== cardId));
    } catch {
      toast.error(t('messages.failedBookmarkUpdate'));
    } finally {
      setPendingCardId(null);
    }
  };

  if (bookmarks.length === 0) {
    return (
      <main className="w-full mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <div className="mx-auto max-w-lg rounded-3xl border border-border bg-background p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Bookmark className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t('bookmarks.emptyTitle')}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t('bookmarks.emptyDescription')}</p>
          <Button asChild className="mt-6">
            <Link href="/dashboard">{t('navigation.dashboard')}</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 md:py-10">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t('bookmarks.heading')}</h1>
        <p className="mt-1 text-sm md:text-base text-muted-foreground">
          {t('bookmarks.description')}
        </p>
      </div>

      <div className="space-y-8">
        {grouped.map((group) => (
          <section key={group.themeId} className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{group.themeName}</h2>
                <p className="text-sm text-muted-foreground">
                  {t('bookmarks.savedCount', { count: group.items.length })}
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={`/study/${group.themeId}`}>
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  {t('bookmarks.openTheme')}
                </Link>
              </Button>
            </div>

            <div className="grid gap-3">
              {group.items.map((bookmark) => (
                <article
                  key={bookmark.cardId}
                  className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-colors hover:border-foreground/20"
                >
                  <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                    <p className="min-w-0 truncate text-sm text-muted-foreground">
                      {group.themeName}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={pendingCardId === bookmark.cardId}
                      onClick={() => void handleRemove(bookmark.cardId)}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">{t('bookmarks.remove')}</span>
                    </Button>
                  </div>

                  <InfoCard
                    card={{
                      id: bookmark.cardId,
                      title: bookmark.cardTitle,
                      body: bookmark.cardBody,
                    }}
                    fontSize={0}
                    reserveBottomBarSpace={false}
                  />
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
