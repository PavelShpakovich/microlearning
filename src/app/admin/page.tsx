'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  RotateCcw,
  Bot,
  Users,
  CreditCard,
  LayoutGrid,
} from 'lucide-react';
import { BackLink } from '@/components/common/back-link';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { AdminTableSkeleton } from '@/components/skeletons';
import { ConfirmationDialog } from '@/components/common/confirmation-dialog';
import { adminApi, type AdminUser, type AdminAnalytics } from '@/services/admin-api';
import { areSubscriptionsEnabled, isPaidInformationVisible } from '@/lib/feature-flags';

const SHOW_PAID_INFO = areSubscriptionsEnabled() && isPaidInformationVisible();

function formatByn(amountMinor: number, currency: string) {
  return new Intl.NumberFormat('ru-BY', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amountMinor / 100);
}

// ---------------------------------------------------------------------------
// Analytics Card
// ---------------------------------------------------------------------------
function StatTile({
  label,
  value,
  icon: Icon,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  sub?: string;
}) {
  return (
    <div className="flex flex-col gap-1 p-4 rounded-lg border bg-card">
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function AnalyticsCard() {
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

  const planOrder = ['free', 'basic', 'pro', 'max'] as const;
  const planColors: Record<string, string> = {
    free: 'bg-gray-200',
    basic: 'bg-blue-400',
    pro: 'bg-purple-400',
    max: 'bg-amber-400',
  };

  return (
    <Card className="p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{t('analyticsTitle')}</h2>
        <Button variant="ghost" size="sm" onClick={() => void load()} disabled={loading}>
          <RotateCcw
            className={`h-4 w-4 ${loading ? 'animate-[spin_1s_linear_infinite_reverse]' : ''}`}
          />
        </Button>
      </div>

      {loading && !data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : data ? (
        <div className="space-y-4">
          {/* Primary stat tiles */}
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 ${SHOW_PAID_INFO ? 'lg:grid-cols-4' : 'lg:grid-cols-2'} gap-3`}
          >
            <StatTile
              label={t('analyticsTotalUsers')}
              value={data.totalUsers.toLocaleString()}
              icon={Users}
              sub={t('analyticsNewThisMonth', { count: data.newUsersThisMonth })}
            />
            {SHOW_PAID_INFO && (
              <>
                <StatTile
                  label={t('analyticsPaidSubscribers')}
                  value={data.activeSubscribers.toLocaleString()}
                  icon={CreditCard}
                  sub={
                    data.cancelledInPeriod > 0
                      ? t('analyticsCancelling', { count: data.cancelledInPeriod })
                      : undefined
                  }
                />
                <StatTile
                  label={t('analyticsRevenueMonth')}
                  value={formatByn(data.revenueThisMonthMinor, data.revenueCurrency)}
                  icon={CreditCard}
                  sub={t('analyticsAllTime', {
                    amount: formatByn(data.totalRevenueMinor, data.revenueCurrency),
                  })}
                />
              </>
            )}
            <StatTile
              label={t('analyticsCardsGenerated')}
              value={data.cardsGeneratedThisMonth.toLocaleString()}
              icon={LayoutGrid}
              sub={t('analyticsThisMonth')}
            />
          </div>

          {/* Plan distribution */}
          {SHOW_PAID_INFO && Object.keys(data.planDistribution).length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">{t('analyticsPlanDistribution')}</p>
              <div className="flex flex-wrap gap-3">
                {planOrder
                  .filter((p) => data.planDistribution[p] != null)
                  .map((plan) => (
                    <div key={plan} className="flex items-center gap-1.5 text-sm">
                      <span
                        className={`inline-block w-2.5 h-2.5 rounded-full ${planColors[plan] ?? 'bg-gray-400'}`}
                      />
                      <span className="capitalize">{plan}</span>
                      <span className="font-semibold">{data.planDistribution[plan]}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Bot Setup Card
// ---------------------------------------------------------------------------
function BotSetupCard() {
  const t = useTranslations('admin');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  const runSetup = async () => {
    setLoading(true);
    setResult(null);
    try {
      const data = await adminApi.runBotSetup();
      setResult(data);
      if (data.ok) {
        toast.success(t('botSetupSuccess'));
      } else {
        toast.error(t('botSetupFailed'));
      }
    } catch {
      toast.error(t('botSetupRequestFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 mb-6">
      <div className="flex flex-col gap-2">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bot className="h-5 w-5" />
            {t('botSetupTitle')}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{t('botSetupDescription')}</p>
        </div>
        <Button onClick={runSetup} disabled={loading} className="shrink-0 self-end">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {loading ? t('botSetupRunning') : t('botSetupRun')}
        </Button>
      </div>
      {result && (
        <pre className="mt-4 text-xs bg-muted rounded p-3 overflow-x-auto max-h-48">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </Card>
  );
}

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  basic: 'Starter',
  pro: 'Pro',
  max: 'Max',
};

function PlanBadge({ plan }: { plan: string }) {
  const colors: Record<string, string> = {
    free: 'bg-gray-100 text-gray-800',
    basic: 'bg-blue-100 text-blue-800',
    pro: 'bg-purple-100 text-purple-800',
    max: 'bg-amber-100 text-amber-800',
  };
  return <Badge className={colors[plan] || colors.free}>{PLAN_LABELS[plan] ?? plan}</Badge>;
}

function formatUserIdentifier(user: AdminUser): string {
  if (user.telegramId) return `ID: ${user.telegramId}`;
  return user.email;
}

interface UserRowProps {
  user: AdminUser;
  onRefresh: () => void;
  currentUserId: string;
}

function useUserActions(user: AdminUser, onRefresh: () => void) {
  const t = useTranslations('admin');
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(user.plan);
  const [isAdminState, setIsAdminState] = useState(user.isAdmin);
  const [pendingAction, setPendingAction] = useState<'toggleAdmin' | 'resetUsage' | null>(null);

  const handlePlanChange = async (newPlan: string) => {
    setLoading(true);
    try {
      await adminApi.changePlan(user.id, newPlan as 'free' | 'basic' | 'pro' | 'max');
      setSelectedPlan(newPlan);
      onRefresh();
    } catch (error) {
      console.error('Failed to change user plan', error);
      toast.error(t('failedChangePlan'));
    } finally {
      setLoading(false);
    }
  };

  const executeToggleAdmin = async () => {
    setLoading(true);
    try {
      await adminApi.toggleAdmin(user.id, !isAdminState);
      setIsAdminState(!isAdminState);
      onRefresh();
    } catch (error) {
      console.error('Failed to toggle admin status', error);
      toast.error(t('failedToggleAdmin'));
    } finally {
      setLoading(false);
    }
  };

  const executeResetUsage = async () => {
    setLoading(true);
    try {
      await adminApi.resetUsage(user.id);
      toast.success(t('resetUsageSuccess'));
      onRefresh();
    } catch (error) {
      console.error('Failed to reset usage', error);
      toast.error(t('failedResetUsage'));
    } finally {
      setLoading(false);
    }
  };

  const executeConfirmed = async () => {
    setPendingAction(null);
    if (pendingAction === 'toggleAdmin') await executeToggleAdmin();
    if (pendingAction === 'resetUsage') await executeResetUsage();
  };

  const action = isAdminState ? t('demote').toLowerCase() : t('promote').toLowerCase();
  const dialogDescription =
    pendingAction === 'toggleAdmin' ? t('confirmToggleAdmin', { action }) : t('confirmResetUsage');

  return {
    t,
    loading,
    selectedPlan,
    isAdminState,
    handlePlanChange,
    handleToggleAdmin: () => setPendingAction('toggleAdmin'),
    handleResetUsage: () => setPendingAction('resetUsage'),
    dialogOpen: pendingAction !== null,
    dialogDescription,
    closeDialog: () => setPendingAction(null),
    executeConfirmed,
  };
}

function AdminToggle({
  t,
  loading,
  isAdminState,
  handleToggleAdmin,
  isSelf,
}: {
  t: ReturnType<typeof useTranslations>;
  loading: boolean;
  isAdminState: boolean;
  handleToggleAdmin: () => void;
  isSelf: boolean;
}) {
  if (isSelf) return null;
  return (
    <Button
      size="sm"
      variant={isAdminState ? 'destructive' : 'outline'}
      onClick={handleToggleAdmin}
      disabled={loading}
    >
      {isAdminState ? t('demote') : t('promote')}
    </Button>
  );
}

/** Mobile card view */
function UserMobileCard({ user, onRefresh, currentUserId }: UserRowProps) {
  const {
    t,
    loading,
    selectedPlan,
    isAdminState,
    handlePlanChange,
    handleToggleAdmin,
    handleResetUsage,
    dialogOpen,
    dialogDescription,
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
        title={t('confirmTitle')}
        description={dialogDescription}
        confirmLabel={t('confirm')}
        cancelLabel={t('cancel')}
      />
      <div className="border rounded-lg p-4 space-y-3 bg-card">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{formatUserIdentifier(user)}</p>
            <p className="text-xs text-muted-foreground truncate">{user.displayName}</p>
          </div>
          <div className="flex flex-col items-center gap-2 shrink-0">
            {SHOW_PAID_INFO && <PlanBadge plan={selectedPlan} />}
            {isAdminState && (
              <Badge variant="secondary" className="text-xs">
                Admin
              </Badge>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {t('colCardsUsed')}: {user.cardsUsed}/{user.cardsPerMonth}
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {SHOW_PAID_INFO && (
            <Select value={selectedPlan} onValueChange={handlePlanChange} disabled={loading}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="basic">Starter</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="max">Max</SelectItem>
              </SelectContent>
            </Select>
          )}
          <AdminToggle
            t={t}
            loading={loading}
            isAdminState={isAdminState}
            handleToggleAdmin={handleToggleAdmin}
            isSelf={isSelf}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleResetUsage}
            disabled={loading}
            title={t('resetUsage')}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
}

/** Desktop table row */
function UserRow({ user, onRefresh, currentUserId }: UserRowProps) {
  const {
    t,
    loading,
    selectedPlan,
    isAdminState,
    handlePlanChange,
    handleToggleAdmin,
    handleResetUsage,
    dialogOpen,
    dialogDescription,
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
        title={t('confirmTitle')}
        description={dialogDescription}
        confirmLabel={t('confirm')}
        cancelLabel={t('cancel')}
      />
      <tr className="border-b hover:bg-muted/40">
        <td className="px-4 py-3 text-sm">{formatUserIdentifier(user)}</td>
        <td className="px-4 py-3 text-sm">{user.displayName}</td>
        {SHOW_PAID_INFO && (
          <td className="px-4 py-3">
            <PlanBadge plan={selectedPlan} />
          </td>
        )}
        <td className="px-4 py-3 text-sm text-center">
          {user.cardsUsed}/{user.cardsPerMonth}
        </td>
        {SHOW_PAID_INFO && (
          <td className="px-4 py-3">
            <Select value={selectedPlan} onValueChange={handlePlanChange} disabled={loading}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="basic">Starter</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="max">Max</SelectItem>
              </SelectContent>
            </Select>
          </td>
        )}
        <td className="px-4 py-3">
          <AdminToggle
            t={t}
            loading={loading}
            isAdminState={isAdminState}
            handleToggleAdmin={handleToggleAdmin}
            isSelf={isSelf}
          />
        </td>
        <td className="px-4 py-3">
          <Button
            size="sm"
            variant="outline"
            onClick={handleResetUsage}
            disabled={loading}
            title={t('resetUsage')}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </td>
      </tr>
    </>
  );
}

function AdminTableContent() {
  const t = useTranslations('admin');
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? '';
  const searchParams = useSearchParams();
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
    } catch (err) {
      setError(err instanceof Error ? err.message : t('failedLoadUsers'));
    } finally {
      setLoading(false);
    }
  }, [page, perPage, t]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  if (loading) return <AdminTableSkeleton />;

  if (error) {
    return <div className="text-center py-8 text-red-600">{error}</div>;
  }

  if (!data?.users?.length) {
    return <div className="text-center py-8 text-gray-500">{t('noUsers')}</div>;
  }

  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set('page', String(page + 1));

  const prevUrl = new URL(window.location.href);
  prevUrl.searchParams.set('page', String(page - 1));

  return (
    <div className="space-y-6">
      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
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
              <th className="px-4 py-3 text-left font-semibold">{t('colDisplayName')}</th>
              {SHOW_PAID_INFO && (
                <th className="px-4 py-3 text-left font-semibold">{t('colPlan')}</th>
              )}
              <th className="px-4 py-3 text-left font-semibold">{t('colCardsUsed')}</th>
              {SHOW_PAID_INFO && (
                <th className="px-4 py-3 text-left font-semibold">{t('colChangePlan')}</th>
              )}
              <th className="px-4 py-3 text-left font-semibold">{t('colAdmin')}</th>
              <th className="px-4 py-3 text-left font-semibold">{t('resetUsage')}</th>
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

      <div className="flex items-center justify-between">
        {page === 1 ? (
          <Button variant="outline" size="sm" disabled className="gap-2">
            <ChevronLeft className="h-4 w-4" />
            {t('previous')}
          </Button>
        ) : (
          <Button variant="outline" size="sm" asChild className="gap-2">
            <Link href={prevUrl.toString()}>
              <ChevronLeft className="h-4 w-4" />
              {t('previous')}
            </Link>
          </Button>
        )}
        <span className="text-sm text-muted-foreground">{t('page', { page })}</span>
        {data.users.length < perPage ? (
          <Button variant="outline" size="sm" disabled className="gap-2">
            {t('next')}
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="outline" size="sm" asChild className="gap-2">
            <Link href={nextUrl.toString()}>
              {t('next')}
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const t = useTranslations('admin');
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <BackLink />
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground mt-2">{t('description')}</p>
        </div>

        <AnalyticsCard />

        <BotSetupCard />

        <Card className="p-6">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            }
          >
            <AdminTableContent />
          </Suspense>
        </Card>
      </div>
    </div>
  );
}
