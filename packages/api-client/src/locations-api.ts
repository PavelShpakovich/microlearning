import { fetchJson } from './api-client';

interface NominatimResult {
  display_name: string;
  name: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    country?: string;
  };
  lat: string;
  lon: string;
}

export interface CityOption {
  city: string;
  country: string;
  lat: number;
  lon: number;
  displayName: string;
}

class LocationsApi {
  async searchCities(query: string, locale = 'en'): Promise<CityOption[]> {
    if (query.length < 2) return [];

    try {
      const url = new URL('https://nominatim.openstreetmap.org/search');
      url.searchParams.set('q', query);
      url.searchParams.set('format', 'json');
      url.searchParams.set('limit', '6');
      url.searchParams.set('addressdetails', '1');
      url.searchParams.set('featuretype', 'settlement');

      const acceptLanguage = locale === 'ru' ? 'ru,en' : 'en,ru';
      const results = await fetchJson<NominatimResult[]>(url, {
        headers: { 'Accept-Language': acceptLanguage, 'User-Agent': 'Clario/1.0' },
      });

      return results.map((result) => ({
        city: result.address.city ?? result.address.town ?? result.address.village ?? result.name,
        country: result.address.country ?? '',
        lat: parseFloat(result.lat),
        lon: parseFloat(result.lon),
        displayName: result.display_name,
      }));
    } catch {
      return [];
    }
  }

  async lookupTimezone(lat: number, lon: number): Promise<string | null> {
    try {
      const data = await fetchJson<{ timezone?: string | null }>(
        `/api/timezone?lat=${lat}&lon=${lon}`,
      );
      return data.timezone ?? null;
    } catch {
      return null;
    }
  }
}

export const locationsApi = new LocationsApi();
