import { searchCities, CIS_CITIES } from '@/lib/cities/cis-cities';

describe('CIS_CITIES dataset', () => {
  it('contains at least 30 Belarusian cities', () => {
    const by = CIS_CITIES.filter((c) => c.country === 'Беларусь');
    expect(by.length).toBeGreaterThanOrEqual(30);
  });

  it('Minsk is the first Belarusian entry', () => {
    const by = CIS_CITIES.filter((c) => c.country === 'Беларусь');
    expect(by[0].city).toBe('Минск');
  });

  it('all entries have valid lat/lon ranges', () => {
    for (const entry of CIS_CITIES) {
      expect(entry.lat).toBeGreaterThanOrEqual(-90);
      expect(entry.lat).toBeLessThanOrEqual(90);
      expect(entry.lon).toBeGreaterThanOrEqual(-180);
      expect(entry.lon).toBeLessThanOrEqual(180);
    }
  });

  it('all entries have a non-empty IANA timezone', () => {
    for (const entry of CIS_CITIES) {
      expect(entry.tz.length).toBeGreaterThan(0);
      expect(entry.tz).toMatch(/\//); // IANA tz always has a slash, e.g. Europe/Minsk
    }
  });

  it('all Belarusian cities use Europe/Minsk timezone', () => {
    const by = CIS_CITIES.filter((c) => c.country === 'Беларусь');
    for (const entry of by) {
      expect(entry.tz).toBe('Europe/Minsk');
    }
  });
});

describe('searchCities', () => {
  it('returns empty array for empty input', () => {
    expect(searchCities('')).toEqual([]);
    expect(searchCities('   ')).toEqual([]);
  });

  it('finds Минск by prefix "Мин"', () => {
    const results = searchCities('Мин');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].city).toBe('Минск');
    expect(results[0].country).toBe('Беларусь');
  });

  it('is case-insensitive', () => {
    const upper = searchCities('МОС');
    const lower = searchCities('мос');
    expect(upper.map((c) => c.city)).toEqual(lower.map((c) => c.city));
  });

  it('returns Belarus matches before other countries', () => {
    // "Б" should match Беларусь cities before non-BY cities
    const results = searchCities('Б');
    const firstNonBy = results.findIndex((c) => c.country !== 'Беларусь');
    const lastBy = results.map((c) => c.country === 'Беларусь').lastIndexOf(true);
    if (firstNonBy !== -1 && lastBy !== -1) {
      expect(lastBy).toBeLessThan(firstNonBy);
    }
  });

  it('respects the limit parameter', () => {
    const results = searchCities('М', 3);
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it('default limit is 8', () => {
    const results = searchCities('М'); // should match many
    expect(results.length).toBeLessThanOrEqual(8);
  });

  it('returns Гомель when searching "Гом"', () => {
    const results = searchCities('Гом');
    expect(results.some((c) => c.city === 'Гомель')).toBe(true);
  });

  it('finds Russian cities (Москва) when searching "Мос"', () => {
    const results = searchCities('Мос');
    expect(results.some((c) => c.city === 'Москва')).toBe(true);
  });

  it('returns correct lat/lon for Минск', () => {
    const results = searchCities('Минск');
    const minsk = results.find((c) => c.city === 'Минск')!;
    expect(minsk.lat).toBeCloseTo(53.9045, 2);
    expect(minsk.lon).toBeCloseTo(27.5615, 2);
    expect(minsk.tz).toBe('Europe/Minsk');
  });

  it('returns empty array for a query with no matches', () => {
    expect(searchCities('ZZZZZZZZZ')).toEqual([]);
  });
});
