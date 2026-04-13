export type ChartRecord = {
  id: string;
  label: string;
  person_name: string;
  subject_type: string;
  birth_date: string;
  birth_time: string | null;
  birth_time_known: boolean;
  timezone: string | null;
  city: string;
  country: string;
  house_system: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type ChartCreatePayload = {
  label: string;
  personName: string;
  subjectType: 'self' | 'partner' | 'child' | 'client' | 'other';
  birthDate: string;
  birthTime?: string;
  birthTimeKnown: boolean;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  houseSystem: 'placidus' | 'whole_sign' | 'koch' | 'equal';
  notes?: string;
  locale?: 'en' | 'ru';
};

class ChartsApi {
  async listCharts(): Promise<ChartRecord[]> {
    const response = await fetch('/api/charts', { cache: 'no-store' });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string; message?: string };
      throw new Error(data.error || data.message || 'Failed to load charts');
    }

    const data = (await response.json()) as { charts: ChartRecord[] };
    return data.charts;
  }

  async createChart(payload: ChartCreatePayload): Promise<{ chart: ChartRecord }> {
    const response = await fetch('/api/charts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as {
      chart?: ChartRecord;
      error?: string;
      message?: string;
    };

    if (!response.ok || !data.chart) {
      throw new Error(data.error || data.message || 'Failed to create chart');
    }

    return { chart: data.chart };
  }
}

export const chartsApi = new ChartsApi();
