/**
 * Curated list of Belarusian cities (full coverage) + major CIS cities.
 * Used for city autocomplete in the chart intake form.
 * lat/lon are WGS-84 city-centre approximations.
 * tz follows IANA timezone database.
 */
export interface CityEntry {
  city: string;
  country: string;
  lat: number;
  lon: number;
  tz: string;
}

/** Primary lookup key for fast prefix matching. */
export const CIS_CITIES: CityEntry[] = [
  // ─── Belarus ──────────────────────────────────────────────────────────────
  { city: 'Минск', country: 'Беларусь', lat: 53.9045, lon: 27.5615, tz: 'Europe/Minsk' },
  { city: 'Гомель', country: 'Беларусь', lat: 52.4412, lon: 30.9877, tz: 'Europe/Minsk' },
  { city: 'Могилёв', country: 'Беларусь', lat: 53.9168, lon: 30.3449, tz: 'Europe/Minsk' },
  { city: 'Витебск', country: 'Беларусь', lat: 55.1904, lon: 30.2049, tz: 'Europe/Minsk' },
  { city: 'Гродно', country: 'Беларусь', lat: 53.6884, lon: 23.8258, tz: 'Europe/Minsk' },
  { city: 'Брест', country: 'Беларусь', lat: 52.0976, lon: 23.734, tz: 'Europe/Minsk' },
  { city: 'Бобруйск', country: 'Беларусь', lat: 53.1384, lon: 29.2211, tz: 'Europe/Minsk' },
  { city: 'Барановичи', country: 'Беларусь', lat: 53.1334, lon: 25.9994, tz: 'Europe/Minsk' },
  { city: 'Борисов', country: 'Беларусь', lat: 54.234, lon: 28.4937, tz: 'Europe/Minsk' },
  { city: 'Пинск', country: 'Беларусь', lat: 52.118, lon: 26.1013, tz: 'Europe/Minsk' },
  { city: 'Орша', country: 'Беларусь', lat: 54.5083, lon: 30.4201, tz: 'Europe/Minsk' },
  { city: 'Молодечно', country: 'Беларусь', lat: 54.3097, lon: 26.8535, tz: 'Europe/Minsk' },
  { city: 'Мозырь', country: 'Беларусь', lat: 52.0507, lon: 29.2417, tz: 'Europe/Minsk' },
  { city: 'Солигорск', country: 'Беларусь', lat: 52.7933, lon: 27.5397, tz: 'Europe/Minsk' },
  { city: 'Жлобин', country: 'Беларусь', lat: 52.8942, lon: 30.032, tz: 'Europe/Minsk' },
  { city: 'Слоним', country: 'Беларусь', lat: 53.0914, lon: 25.3098, tz: 'Europe/Minsk' },
  { city: 'Светлогорск', country: 'Беларусь', lat: 52.6303, lon: 29.7349, tz: 'Europe/Minsk' },
  { city: 'Новополоцк', country: 'Беларусь', lat: 55.5349, lon: 28.6461, tz: 'Europe/Minsk' },
  { city: 'Полоцк', country: 'Беларусь', lat: 55.4868, lon: 28.7782, tz: 'Europe/Minsk' },
  { city: 'Лида', country: 'Беларусь', lat: 53.8879, lon: 25.2988, tz: 'Europe/Minsk' },
  { city: 'Жодино', country: 'Беларусь', lat: 54.0987, lon: 28.3483, tz: 'Europe/Minsk' },
  { city: 'Пружаны', country: 'Беларусь', lat: 52.557, lon: 24.4633, tz: 'Europe/Minsk' },
  { city: 'Кобрин', country: 'Беларусь', lat: 52.2128, lon: 24.3616, tz: 'Europe/Minsk' },
  { city: 'Лунинец', country: 'Беларусь', lat: 52.2512, lon: 26.8092, tz: 'Europe/Minsk' },
  { city: 'Речица', country: 'Беларусь', lat: 52.3589, lon: 30.3916, tz: 'Europe/Minsk' },
  { city: 'Волковыск', country: 'Беларусь', lat: 53.1657, lon: 24.4528, tz: 'Europe/Minsk' },
  { city: 'Осиповичи', country: 'Беларусь', lat: 53.3059, lon: 28.6409, tz: 'Europe/Minsk' },
  { city: 'Дзержинск', country: 'Беларусь', lat: 53.6881, lon: 27.1318, tz: 'Europe/Minsk' },
  { city: 'Смолевичи', country: 'Беларусь', lat: 54.0225, lon: 28.0933, tz: 'Europe/Minsk' },
  { city: 'Слуцк', country: 'Беларусь', lat: 53.0275, lon: 27.5565, tz: 'Europe/Minsk' },
  // ─── Russia ────────────────────────────────────────────────────────────────
  { city: 'Москва', country: 'Россия', lat: 55.7558, lon: 37.6173, tz: 'Europe/Moscow' },
  { city: 'Санкт-Петербург', country: 'Россия', lat: 59.9311, lon: 30.3609, tz: 'Europe/Moscow' },
  { city: 'Новосибирск', country: 'Россия', lat: 54.9833, lon: 82.8964, tz: 'Asia/Novosibirsk' },
  { city: 'Екатеринбург', country: 'Россия', lat: 56.8389, lon: 60.6057, tz: 'Asia/Yekaterinburg' },
  { city: 'Казань', country: 'Россия', lat: 55.8304, lon: 49.0661, tz: 'Europe/Moscow' },
  { city: 'Нижний Новгород', country: 'Россия', lat: 56.2965, lon: 43.9361, tz: 'Europe/Moscow' },
  { city: 'Краснодар', country: 'Россия', lat: 45.0448, lon: 38.976, tz: 'Europe/Moscow' },
  { city: 'Воронеж', country: 'Россия', lat: 51.6604, lon: 39.2003, tz: 'Europe/Moscow' },
  { city: 'Ростов-на-Дону', country: 'Россия', lat: 47.2358, lon: 39.7015, tz: 'Europe/Moscow' },
  { city: 'Уфа', country: 'Россия', lat: 54.7388, lon: 55.9721, tz: 'Asia/Yekaterinburg' },
  { city: 'Самара', country: 'Россия', lat: 53.2001, lon: 50.15, tz: 'Europe/Samara' },
  { city: 'Пермь', country: 'Россия', lat: 58.0105, lon: 56.2502, tz: 'Asia/Yekaterinburg' },
  { city: 'Калининград', country: 'Россия', lat: 54.7048, lon: 20.453, tz: 'Europe/Kaliningrad' },
  { city: 'Смоленск', country: 'Россия', lat: 54.7826, lon: 32.0453, tz: 'Europe/Moscow' },
  { city: 'Брянск', country: 'Россия', lat: 53.2434, lon: 34.3642, tz: 'Europe/Moscow' },
  { city: 'Псков', country: 'Россия', lat: 57.8136, lon: 28.3496, tz: 'Europe/Moscow' },
  // ─── Ukraine ───────────────────────────────────────────────────────────────
  { city: 'Киев', country: 'Украина', lat: 50.4501, lon: 30.5234, tz: 'Europe/Kiev' },
  { city: 'Харьков', country: 'Украина', lat: 49.9935, lon: 36.2304, tz: 'Europe/Kiev' },
  { city: 'Одесса', country: 'Украина', lat: 46.4825, lon: 30.7233, tz: 'Europe/Kiev' },
  { city: 'Львов', country: 'Украина', lat: 49.8397, lon: 24.0297, tz: 'Europe/Kiev' },
  // ─── Kazakhstan ────────────────────────────────────────────────────────────
  { city: 'Алматы', country: 'Казахстан', lat: 43.2567, lon: 76.9286, tz: 'Asia/Almaty' },
  { city: 'Астана', country: 'Казахстан', lat: 51.1811, lon: 71.446, tz: 'Asia/Almaty' },
  // ─── Other CIS ─────────────────────────────────────────────────────────────
  { city: 'Ташкент', country: 'Узбекистан', lat: 41.2995, lon: 69.2401, tz: 'Asia/Tashkent' },
  { city: 'Баку', country: 'Азербайджан', lat: 40.4093, lon: 49.8671, tz: 'Asia/Baku' },
  { city: 'Тбилиси', country: 'Грузия', lat: 41.6938, lon: 44.8015, tz: 'Asia/Tbilisi' },
  { city: 'Ереван', country: 'Армения', lat: 40.1872, lon: 44.5152, tz: 'Asia/Yerevan' },
  { city: 'Кишинёв', country: 'Молдова', lat: 47.0105, lon: 28.8638, tz: 'Europe/Chisinau' },
  { city: 'Бишкек', country: 'Кыргызстан', lat: 42.8746, lon: 74.5698, tz: 'Asia/Bishkek' },
];

/**
 * Return city entries whose `city` field starts with the given prefix (case-insensitive).
 * Belarus entries are always shown first.
 */
export function searchCities(prefix: string, limit = 8): CityEntry[] {
  if (!prefix.trim()) return [];
  const lowerPrefix = prefix.toLowerCase();
  const belarusMatches = CIS_CITIES.filter(
    (c) => c.country === 'Беларусь' && c.city.toLowerCase().startsWith(lowerPrefix),
  );
  const otherMatches = CIS_CITIES.filter(
    (c) => c.country !== 'Беларусь' && c.city.toLowerCase().startsWith(lowerPrefix),
  );
  return [...belarusMatches, ...otherMatches].slice(0, limit);
}
