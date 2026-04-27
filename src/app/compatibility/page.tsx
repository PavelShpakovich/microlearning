import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';

export const metadata: Metadata = { robots: { index: false } };
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  CompatibilityOverview,
  type ChartStub,
  type CompatibilityReportRecord,
} from '@/components/astrology/compatibility-overview';
import { CompatibilityType } from '@/lib/compatibility/service';

export const dynamic = 'force-dynamic';

const db = supabaseAdmin;

export default async function CompatibilityPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { data: rawReports } = await db
    .from('compatibility_reports')
    .select(
      'id, status, summary, created_at, primary_chart_id, secondary_chart_id, compatibility_type',
    )
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  const reports: CompatibilityReportRecord[] = (rawReports ?? []).map((r) => ({
    id: r.id,
    status: r.status,
    summary: r.summary,
    created_at: r.created_at,
    primary_chart_id: r.primary_chart_id,
    secondary_chart_id: r.secondary_chart_id,
    compatibility_type: r.compatibility_type as CompatibilityType,
  }));

  const uniqueChartIds = [
    ...new Set(reports.flatMap((r) => [r.primary_chart_id, r.secondary_chart_id])),
  ];

  const { data: charts } =
    uniqueChartIds.length > 0
      ? await db.from('charts').select('id, label, person_name').in('id', uniqueChartIds)
      : { data: [] };

  const chartMap: Record<string, ChartStub> = {};
  for (const c of charts ?? []) {
    chartMap[c.id] = c;
  }

  return <CompatibilityOverview reports={reports} chartMap={chartMap} />;
}
