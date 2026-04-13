import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Tables } from '@/lib/supabase/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateReadingButton } from '@/components/astrology/create-reading-button';

const db = supabaseAdmin;

type ChartSnapshotRow = Tables<'chart_snapshots'>;
type ChartPositionRow = Tables<'chart_positions'>;
type ChartAspectRow = Tables<'chart_aspects'>;

export default async function ChartDetailPage({
  params,
}: {
  params: Promise<{ chartId: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const { chartId } = await params;

  const { data: chart } = await db
    .from('charts')
    .select('*')
    .eq('id', chartId)
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (!chart) {
    redirect('/charts');
  }

  const { data: snapshots } = await db
    .from('chart_snapshots')
    .select('*')
    .eq('chart_id', chartId)
    .order('snapshot_version', { ascending: false });

  const latestSnapshot = snapshots?.[0] ?? null;
  const snapshotIds = (snapshots ?? []).map((item: ChartSnapshotRow) => item.id);
  const [{ data: positions }, { data: aspects }] = await Promise.all([
    snapshotIds.length > 0
      ? db.from('chart_positions').select('*').in('chart_snapshot_id', snapshotIds)
      : Promise.resolve({ data: [] }),
    snapshotIds.length > 0
      ? db.from('chart_aspects').select('*').in('chart_snapshot_id', snapshotIds)
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Детали карты
          </p>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{chart.label}</h1>
          <p className="text-sm text-muted-foreground md:text-base">
            {chart.person_name} · {chart.birth_date}
            {chart.birth_time_known && chart.birth_time
              ? `, ${chart.birth_time}`
              : ' · время неизвестно'}
            {' · '}
            {chart.city}, {chart.country}
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="outline">
            <Link href="/charts">Назад к картам</Link>
          </Button>
          <CreateReadingButton chartId={chart.id} />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Статус</CardDescription>
            <CardTitle className="capitalize">{chart.status}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Система домов: {String(chart.house_system).replace('_', ' ')}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Снимки</CardDescription>
            <CardTitle>{snapshots?.length ?? 0}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Здесь будут храниться версии детерминированных расчётов карты.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Разборы</CardDescription>
            <CardTitle>Скоро</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Натальные разборы и прогнозы будут привязаны к последнему снимку карты.
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle>Последний снимок</CardTitle>
            <CardDescription>
              {latestSnapshot
                ? `Версия ${latestSnapshot.snapshot_version} · ${latestSnapshot.calculation_provider}`
                : 'Пока нет рассчитанного снимка'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {latestSnapshot ? (
              <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs leading-6">
                {JSON.stringify(latestSnapshot.computed_chart_json, null, 2)}
              </pre>
            ) : (
              <p className="text-sm text-muted-foreground">
                Детерминированный астрологический движок ещё не подключён полностью. Эта карта уже
                готова для следующего шага.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Положения</CardTitle>
              <CardDescription>Положения планет и точек для доступных снимков.</CardDescription>
            </CardHeader>
            <CardContent>
              {positions && positions.length > 0 ? (
                <div className="grid gap-2 text-sm">
                  {positions.slice(0, 12).map((position: ChartPositionRow) => (
                    <div
                      key={position.id}
                      className="flex items-center justify-between rounded-lg border px-3 py-2"
                    >
                      <span className="font-medium">{position.body_key}</span>
                      <span className="text-muted-foreground">
                        {position.sign_key} · {position.degree_decimal}
                        {position.house_number ? ` · Дом ${position.house_number}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Положения пока не сохранены.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Аспекты</CardTitle>
              <CardDescription>Рассчитанные связи между объектами карты.</CardDescription>
            </CardHeader>
            <CardContent>
              {aspects && aspects.length > 0 ? (
                <div className="grid gap-2 text-sm">
                  {aspects.slice(0, 12).map((aspect: ChartAspectRow) => (
                    <div
                      key={aspect.id}
                      className="flex items-center justify-between rounded-lg border px-3 py-2"
                    >
                      <span className="font-medium">
                        {aspect.body_a} - {aspect.body_b}
                      </span>
                      <span className="text-muted-foreground">
                        {aspect.aspect_key} · орб {aspect.orb_decimal}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Аспекты пока не сохранены.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
