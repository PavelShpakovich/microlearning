'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  RotateCcw,
  Trash2,
  Users,
  LayoutGrid,
  BookOpen,
  Heart,
  Zap,
  AlertTriangle,
  MessageSquare,
  Coins,
} from 'lucide-react';
import { BackLink } from '@/components/common/back-link';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { AdminTableSkeleton } from '@/components/skeletons';
import { ConfirmationDialog } from '@/components/common/confirmation-dialog';
import { adminApi, type AdminUser, type AdminAnalytics } from '@/services/admin-api';

// ---------------------------------------------------------------------------
// Reading type label map
// ---------------------------------------------------------------------------
const READING_TYPE_LABELS: Record<string, string> = {
  natal_overview: 'Натальный обзор',
  personality: 'Личность',
  love: 'Любовь',
  career: 'Карьера',
  strengths: 'Сильные стороны',
  finance: 'Финансы',
  health: 'Здоровье',
  transit: 'Транзиты',
  year_ahead: 'Год вперёд',
  progressions: 'Прогрессии',
  compatibility: 'Синастрия',
  solar_return: 'Солярный',
  lunar_return: 'Лунный возврат',
  karmic: 'Кармическая',
};

// ---------------------------------------------------------------------------
// Stat Tile
// ---------------------------------------------------------------------------
function StatTile({
  label,
  value,
  icon: Icon,
  monthDelta,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  monthDelta?: number;
  accent?: 'red' | 'blue' | 'purple';
}) {
  const iconClass =
    accent === 'red'
      ? 'text-red-500'
      : accent === 'blue'
        ? 'text-blue-500'
        : accent === 'purple'
          ? 'text-violet-500'
          : 'text-muted-foreground';

  return (
    <div className="flex flex-col justify-between gap-3 rounded-xl border bg-card p-4">
      <div className={`flex items-center gap-1.5 text-xs font-medium ${iconClass}`}>
        <Icon className="size-3.5 shrink-0" />
        <span className="truncate">{label}</span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <p className="text-2xl font-bold leading-none tabular-nums">{value}</p>
        {monthDelta !== undefined && (
          <span
            className={`mb-0.5 text-xs font-medium ${monthDelta > 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}
          >
            {monthDelta > 0 ? `+${monthDelta}` : '—'} мес.
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Analytics section
// ---------------------------------------------------------------------------
function AnalyticsSection() {
  const t = useTranslations('admin');
  const [data, setData] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await adminApi.getAnalytics());
    } catch {
      toast.error(t('analyticsLoadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Card className="p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('analyticsTitle')}</h2>
        <Button variant="ghost" size="icon" onClick={() => void load()} disabled={loading}>
          <RotateCcw
            className={loading ? 'animate-[spin_1s_linear_infinite_reverse]' : undefined}
          />
        </Button>
      </div>

      {loading && !data ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : data ? (
        <>
          {/* Primary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatTile
              label={t('analyticsTotalUsers')}
              value={data.totalUsers}
              icon={Users}
              monthDelta={data.newUsersThisMonth}
            />
            <StatTile
              label={t('analyticsTotalCharts')}
              value={data.totalCharts}
              icon={LayoutGrid}
              monthDelta={data.chartsThisMonth}
            />
            <StatTile
              label={t('analyticsTotalReadings')}
              value={data.totalReadings}
              icon={BookOpen}
              monthDelta={data.readingsThisMonth}
            />
            <StatTile
              label={t('analyticsCompatibility')}
              value={data.totalCompatibilityReports}
              icon={Heart}
            />
          </div>

          {/* AI + Reading types */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* AI stats */}
            <div className="rounded-xl border bg-muted/20 p-4 flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                AI-активность
              </p>
              <div className="grid grid-cols-2 gap-3">
                <StatTile
                  label={t('analyticsAiCalls')}
                  value={data.totalAiCalls}
                  icon={Zap}
                  monthDelta={data.aiCallsThisMonth}
                  accent="blue"
                />
                <StatTile
                  label={t('analyticsAiErrors')}
                  value={data.aiErrors}
                  icon={AlertTriangle}
                  accent={data.aiErrors > 0 ? 'red' : undefined}
                />
                <StatTile
                  label={t('analyticsFollowUpMessages')}
                  value={data.totalFollowUpMessages}
                  icon={MessageSquare}
                  accent="purple"
                />
                <StatTile
                  label={t('analyticsTokensUsed')}
                  value={data.totalTokensUsed > 0 ? data.totalTokensUsed.toLocaleString() : '—'}
                  icon={Coins}
                  accent="purple"
                />
              </div>
            </div>

            {/* Reading type breakdown */}
            {Object.keys(data.readingsByType).length > 0
              ? (() => {
                  const entries = Object.entries(data.readingsByType).sort(([, a], [, b]) => b - a);
                  const maxCount = entries[0]?.[1] ?? 1;
                  return (
                    <div className="rounded-xl border bg-muted/20 p-4 flex flex-col gap-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t('analyticsReadingTypes')}
                      </p>
                      <div className="flex flex-col gap-2">
                        {entries.map(([type, count]) => (
                          <div key={type} className="flex items-center gap-3">
                            <span className="w-32 shrink-0 truncate text-sm text-foreground">
                              {READING_TYPE_LABELS[type] ?? type}
                            </span>
                            <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary/60 transition-all"
                                style={{ width: `${(count / maxCount) * 100}%` }}
                              />
                            </div>
                            <span className="w-6 shrink-0 text-right text-sm font-semibold tabular-nums">
                              {count}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()
              : null}
          </div>
        </>
      ) : null}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// User actions hook
// ---------------------------------------------------------------------------
function formatUserIdentifier(user: AdminUser): string {
  return user.email || user.displayName;
}

function VerificationBadge({ user }: { user: AdminUser }) {
  const t = useTranslations('admin');
  if (!user.email) {
    return (
      <Badge variant="outline" className="text-xs">
        {t('verificationUnavailable')}
      </Badge>
    );
  }
  return user.isEmailVerified ? (
    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-xs">
      {t('verified')}
    </Badge>
  ) : (
    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-xs">
      {t('unverified')}
    </Badge>
  );
}

type PendingAction = 'toggleAdmin' | 'deleteUser' | null;

interface UserRowProps {
  user: AdminUser;
  onRefresh: () => void;
  currentUserId: string;
}

function useUserActions(user: AdminUser, onRefresh: () => void) {
  const t = useTranslations('admin');
  const [loading, setLoading] = useState(false);
  const [isAdminState, setIsAdminState] = useState(user.isAdmin);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const executeToggleAdmin = async () => {
    setLoading(true);
    try {
      await adminApi.toggleAdmin(user.id, !isAdminState);
      setIsAdminState(!isAdminState);
      onRefresh();
    } catch {
      toast.error(t('failedToggleAdmin'));
    } finally {
      setLoading(false);
    }
  };

  const executeDeleteUser = async () => {
    setLoading(true);
    try {
      await adminApi.deleteUser(user.id);
      toast.success(t('deleteUserSuccess'));
      onRefresh();
    } catch {
      toast.error(t('failedDeleteUser'));
    } finally {
      setLoading(false);
    }
  };

  const executeConfirmed = async () => {
    const action = pendingAction;
    setPendingAction(null);
    if (action === 'toggleAdmin') await executeToggleAdmin();
    if (action === 'deleteUser') await executeDeleteUser();
  };

  const actionLabel = isAdminState ? t('demote').toLowerCase() : t('promote').toLowerCase();

  const dialogTitle = pendingAction === 'deleteUser' ? t('deleteConfirmTitle') : t('confirmTitle');

  const dialogDescription =
    pendingAction === 'toggleAdmin'
      ? t('confirmToggleAdmin', { action: actionLabel })
      : pendingAction === 'deleteUser'
        ? t('confirmDeleteUser', { user: formatUserIdentifier(user) })
        : '';

  const confirmLabel = pendingAction === 'deleteUser' ? t('deleteConfirmAction') : t('confirm');

  return {
    t,
    loading,
    isAdminState,
    handleToggleAdmin: () => setPendingAction('toggleAdmin'),
    handleDeleteUser: () => setPendingAction('deleteUser'),
    dialogOpen: pendingAction !== null,
    dialogTitle,
    dialogDescription,
    confirmLabel,
    closeDialog: () => setPendingAction(null),
    executeConfirmed,
  };
}

// ---------------------------------------------------------------------------
// Mobile card
// ---------------------------------------------------------------------------
function UserMobileCard({ user, onRefresh, currentUserId }: UserRowProps) {
  const {
    t,
    loading,
    isAdminState,
    handleToggleAdmin,
    handleDeleteUser,
    dialogOpen,
    dialogTitle,
    dialogDescription,
    confirmLabel,
    closeDialog,
    executeConfirmed,
  } = useUserActions(user, onRefresh);
  const isSelf = user.id === currentUserId;

  return (
    <>
      <ConfirmationDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
        onConfirm={() => void executeConfirmed()}
        title={dialogTitle}
        description={dialogDescription}
        confirmLabel={confirmLabel}
        cancelLabel={t('cancel')}
      />
      <div className="border rounded-lg p-4 flex flex-col gap-3 bg-card">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{formatUserIdentifier(user)}</p>
            <p className="text-xs text-muted-foreground truncate">{user.displayName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {new Date(user.createdAt).toLocaleDateString('ru', {
                day: '2-digit',
                month: '2-digit',
                year: '2-digit',
              })}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <VerificationBadge user={user} />
            {isAdminState && (
              <Badge variant="secondary" className="text-xs">
                {t('colAdmin')}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isSelf && (
            <Button
              size="sm"
              variant={isAdminState ? 'destructive' : 'outline'}
              onClick={handleToggleAdmin}
              disabled={loading}
            >
              {isAdminState ? t('demote') : t('promote')}
            </Button>
          )}
          {!isSelf && (
            <Button
              size="icon"
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={loading}
              title={t('deleteUser')}
              className="size-8"
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Desktop table row
// ---------------------------------------------------------------------------
function UserRow({ user, onRefresh, currentUserId }: UserRowProps) {
  const {
    t,
    loading,
    isAdminState,
    handleToggleAdmin,
    handleDeleteUser,
    dialogOpen,
    dialogTitle,
    dialogDescription,
    confirmLabel,
    closeDialog,
    executeConfirmed,
  } = useUserActions(user, onRefresh);
  const isSelf = user.id === currentUserId;

  return (
    <>
      <ConfirmationDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
        onConfirm={() => void executeConfirmed()}
        title={dialogTitle}
        description={dialogDescription}
        confirmLabel={confirmLabel}
        cancelLabel={t('cancel')}
      />
      <tr className="border-b hover:bg-muted/30 transition-colors">
        <td className="px-4 py-3">
          <div>
            <p className="text-sm font-medium">{formatUserIdentifier(user)}</p>
            {user.displayName !== formatUserIdentifier(user) && (
              <p className="text-xs text-muted-foreground">{user.displayName}</p>
            )}
          </div>
        </td>
        <td className="px-4 py-3">
          <VerificationBadge user={user} />
        </td>
        <td className="px-4 py-3 text-xs text-muted-foreground">
          {new Date(user.createdAt).toLocaleDateString('ru', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
          })}
        </td>
        <td className="px-4 py-3">
          {isAdminState && (
            <Badge variant="secondary" className="text-xs">
              {t('colAdmin')}
            </Badge>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            {!isSelf && (
              <Button
                size="sm"
                variant={isAdminState ? 'destructive' : 'outline'}
                onClick={handleToggleAdmin}
                disabled={loading}
              >
                {isAdminState ? t('demote') : t('promote')}
              </Button>
            )}
            {!isSelf && (
              <Button
                size="icon"
                variant="destructive"
                onClick={handleDeleteUser}
                disabled={loading}
                title={t('deleteUser')}
                className="size-8"
              >
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </div>
        </td>
      </tr>
    </>
  );
}

// ---------------------------------------------------------------------------
// Users table
// ---------------------------------------------------------------------------
function AdminTableContent() {
  const t = useTranslations('admin');
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? '';
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const perPage = 20;

  const [data, setData] = useState<{ users: AdminUser[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await adminApi.listUsers(page, perPage);
      setData(result);
    } catch {
      setError(t('failedLoadUsers'));
    } finally {
      setLoading(false);
    }
  }, [page, perPage, t]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  if (loading) return <AdminTableSkeleton />;
  if (error) return <div className="text-center py-8 text-red-600">{error}</div>;
  if (!data?.users?.length)
    return <div className="text-center py-8 text-muted-foreground">{t('noUsers')}</div>;

  const nextUrl = `${pathname}?page=${page + 1}`;
  const prevUrl = `${pathname}?page=${page - 1}`;

  return (
    <div className="flex flex-col gap-6">
      {/* Mobile */}
      <div className="md:hidden flex flex-col gap-3">
        {data.users.map((user) => (
          <UserMobileCard
            key={user.id}
            user={user}
            onRefresh={loadUsers}
            currentUserId={currentUserId}
          />
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-semibold">{t('colEmail')}</th>
              <th className="px-4 py-3 text-left font-semibold">{t('colVerification')}</th>
              <th className="px-4 py-3 text-left font-semibold">{t('colJoined')}</th>
              <th className="px-4 py-3 text-left font-semibold">{t('colAdmin')}</th>
              <th className="px-4 py-3 text-left font-semibold">{t('colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {data.users.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                onRefresh={loadUsers}
                currentUserId={currentUserId}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        {page === 1 ? (
          <Button variant="outline" size="sm" disabled className="gap-2">
            <ChevronLeft className="size-4" />
            {t('previous')}
          </Button>
        ) : (
          <Button variant="outline" size="sm" asChild className="gap-2">
            <Link href={prevUrl}>
              <ChevronLeft className="size-4" />
              {t('previous')}
            </Link>
          </Button>
        )}
        <span className="text-sm text-muted-foreground">{t('page', { page })}</span>
        {data.users.length < perPage ? (
          <Button variant="outline" size="sm" disabled className="gap-2">
            {t('next')}
            <ChevronRight className="size-4" />
          </Button>
        ) : (
          <Button variant="outline" size="sm" asChild className="gap-2">
            <Link href={nextUrl}>
              {t('next')}
              <ChevronRight className="size-4" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function AdminPage() {
  const t = useTranslations('admin');
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <BackLink />
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground mt-1">{t('description')}</p>
      </div>

      <AnalyticsSection />

      <Card className="p-6 flex flex-col gap-4">
        <h2 className="text-lg font-semibold">{t('usersTitle')}</h2>
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          }
        >
          <AdminTableContent />
        </Suspense>
      </Card>
    </main>
  );
}
