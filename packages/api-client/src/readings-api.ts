import type { ReadingType } from '@clario/types';
import { fetchJson } from './api-client';

export interface ReadingSummary {
  id: string;
}

export interface ReadingRecord {
  id: string;
  chart_id: string;
  reading_type: string;
  title: string;
  summary: string | null;
  status: string;
  created_at: string;
}

export interface ReadingSection {
  id: string;
  section_key: string;
  title: string;
  content: string;
  sort_order: number;
}

export interface ReadingDetail extends ReadingRecord {
  error_message: string | null;
  rendered_content_json: {
    placementHighlights?: string[];
    advice?: string[];
    disclaimers?: string[];
    [key: string]: unknown;
  } | null;
  reading_sections: ReadingSection[];
}

class ReadingsApi {
  async listReadings(): Promise<{ readings: ReadingRecord[] }> {
    const data = await fetchJson<{ readings?: ReadingRecord[] }>('/api/readings', {
      cache: 'no-store',
    });
    return { readings: data.readings ?? [] };
  }

  async getReading(readingId: string): Promise<{ reading: ReadingDetail }> {
    const data = await fetchJson<{ reading?: ReadingDetail; status?: string }>(
      `/api/readings/${readingId}`,
    );
    if (data.reading) return { reading: data.reading };
    // Fallback: server returned minimal { status } shape — construct a partial object
    return {
      reading: {
        id: readingId,
        chart_id: '',
        reading_type: '',
        title: '',
        summary: null,
        status: data.status ?? 'pending',
        created_at: '',
        error_message: null,
        rendered_content_json: null,
        reading_sections: [],
      },
    };
  }

  async createReading(payload: {
    chartId: string;
    readingType: ReadingType | string;
    locale?: string;
    replaceReadingId?: string;
  }): Promise<{ reading: ReadingSummary }> {
    return fetchJson<{ reading: ReadingSummary }>('/api/readings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  async startGeneration(readingId: string): Promise<void> {
    await fetchJson<{ ok: true }>(`/api/readings/${readingId}/generate`, { method: 'POST' });
  }

  async resetForRetry(readingId: string): Promise<void> {
    await fetchJson<{ ok: true }>(`/api/readings/${readingId}/retry`, { method: 'POST' });
  }

  async deleteReading(readingId: string): Promise<void> {
    await fetchJson<{ ok: true }>(`/api/readings/${readingId}`, { method: 'DELETE' });
  }
}

export const readingsApi = new ReadingsApi();
