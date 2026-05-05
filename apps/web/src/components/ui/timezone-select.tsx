'use client';

import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { useLocale } from 'next-intl';

// Normalize legacy IANA aliases
const ALIASES: Record<string, string> = {
  'Europe/Kiev': 'Europe/Kyiv',
  'Asia/Calcutta': 'Asia/Kolkata',
  'Asia/Rangoon': 'Asia/Yangon',
};

export const TIMEZONES = [
  { value: 'Pacific/Honolulu', label: { en: 'Honolulu (UTC−10)', ru: 'Гонолулу (UTC−10)' } },
  { value: 'America/Anchorage', label: { en: 'Anchorage (UTC−9)', ru: 'Анкоридж (UTC−9)' } },
  {
    value: 'America/Los_Angeles',
    label: { en: 'Los Angeles (UTC−8)', ru: 'Лос-Анджелес (UTC−8)' },
  },
  { value: 'America/Denver', label: { en: 'Denver (UTC−7)', ru: 'Денвер (UTC−7)' } },
  { value: 'America/Chicago', label: { en: 'Chicago (UTC−6)', ru: 'Чикаго (UTC−6)' } },
  { value: 'America/New_York', label: { en: 'New York (UTC−5)', ru: 'Нью-Йорк (UTC−5)' } },
  { value: 'America/Toronto', label: { en: 'Toronto (UTC−5)', ru: 'Торонто (UTC−5)' } },
  { value: 'America/Sao_Paulo', label: { en: 'São Paulo (UTC−3)', ru: 'Сан-Паулу (UTC−3)' } },
  {
    value: 'America/Buenos_Aires',
    label: { en: 'Buenos Aires (UTC−3)', ru: 'Буэнос-Айрес (UTC−3)' },
  },
  { value: 'Atlantic/Azores', label: { en: 'Azores (UTC−1)', ru: 'Азорские о-ва (UTC−1)' } },
  { value: 'Europe/London', label: { en: 'London (UTC+0)', ru: 'Лондон (UTC+0)' } },
  { value: 'Europe/Lisbon', label: { en: 'Lisbon (UTC+0)', ru: 'Лиссабон (UTC+0)' } },
  { value: 'Europe/Berlin', label: { en: 'Berlin (UTC+1)', ru: 'Берлин (UTC+1)' } },
  { value: 'Europe/Paris', label: { en: 'Paris (UTC+1)', ru: 'Париж (UTC+1)' } },
  { value: 'Europe/Warsaw', label: { en: 'Warsaw (UTC+1)', ru: 'Варшава (UTC+1)' } },
  { value: 'Europe/Vilnius', label: { en: 'Vilnius (UTC+2)', ru: 'Вильнюс (UTC+2)' } },
  { value: 'Europe/Riga', label: { en: 'Riga (UTC+2)', ru: 'Рига (UTC+2)' } },
  { value: 'Europe/Tallinn', label: { en: 'Tallinn (UTC+2)', ru: 'Таллинн (UTC+2)' } },
  { value: 'Europe/Helsinki', label: { en: 'Helsinki (UTC+2)', ru: 'Хельсинки (UTC+2)' } },
  { value: 'Europe/Kyiv', label: { en: 'Kyiv (UTC+2)', ru: 'Киев (UTC+2)' } },
  { value: 'Europe/Bucharest', label: { en: 'Bucharest (UTC+2)', ru: 'Бухарест (UTC+2)' } },
  { value: 'Europe/Athens', label: { en: 'Athens (UTC+2)', ru: 'Афины (UTC+2)' } },
  { value: 'Africa/Cairo', label: { en: 'Cairo (UTC+2)', ru: 'Каир (UTC+2)' } },
  {
    value: 'Africa/Johannesburg',
    label: { en: 'Johannesburg (UTC+2)', ru: 'Йоханнесбург (UTC+2)' },
  },
  { value: 'Europe/Kaliningrad', label: { en: 'Kaliningrad (UTC+2)', ru: 'Калининград (UTC+2)' } },
  { value: 'Europe/Minsk', label: { en: 'Minsk (UTC+3)', ru: 'Минск (UTC+3)' } },
  { value: 'Europe/Moscow', label: { en: 'Moscow (UTC+3)', ru: 'Москва (UTC+3)' } },
  { value: 'Europe/Istanbul', label: { en: 'Istanbul (UTC+3)', ru: 'Стамбул (UTC+3)' } },
  { value: 'Africa/Nairobi', label: { en: 'Nairobi (UTC+3)', ru: 'Найроби (UTC+3)' } },
  { value: 'Asia/Tbilisi', label: { en: 'Tbilisi (UTC+4)', ru: 'Тбилиси (UTC+4)' } },
  { value: 'Asia/Baku', label: { en: 'Baku (UTC+4)', ru: 'Баку (UTC+4)' } },
  { value: 'Asia/Yerevan', label: { en: 'Yerevan (UTC+4)', ru: 'Ереван (UTC+4)' } },
  { value: 'Asia/Dubai', label: { en: 'Dubai (UTC+4)', ru: 'Дубай (UTC+4)' } },
  { value: 'Asia/Tashkent', label: { en: 'Tashkent (UTC+5)', ru: 'Ташкент (UTC+5)' } },
  { value: 'Asia/Karachi', label: { en: 'Karachi (UTC+5)', ru: 'Карачи (UTC+5)' } },
  {
    value: 'Asia/Yekaterinburg',
    label: { en: 'Yekaterinburg (UTC+5)', ru: 'Екатеринбург (UTC+5)' },
  },
  { value: 'Asia/Kolkata', label: { en: 'Mumbai (UTC+5:30)', ru: 'Мумбаи (UTC+5:30)' } },
  { value: 'Asia/Almaty', label: { en: 'Almaty (UTC+6)', ru: 'Алматы (UTC+6)' } },
  { value: 'Asia/Omsk', label: { en: 'Omsk (UTC+6)', ru: 'Омск (UTC+6)' } },
  { value: 'Asia/Dhaka', label: { en: 'Dhaka (UTC+6)', ru: 'Дакка (UTC+6)' } },
  { value: 'Asia/Yangon', label: { en: 'Yangon (UTC+6:30)', ru: 'Янгон (UTC+6:30)' } },
  { value: 'Asia/Bangkok', label: { en: 'Bangkok (UTC+7)', ru: 'Бангкок (UTC+7)' } },
  { value: 'Asia/Krasnoyarsk', label: { en: 'Krasnoyarsk (UTC+7)', ru: 'Красноярск (UTC+7)' } },
  { value: 'Asia/Shanghai', label: { en: 'Shanghai (UTC+8)', ru: 'Шанхай (UTC+8)' } },
  { value: 'Asia/Hong_Kong', label: { en: 'Hong Kong (UTC+8)', ru: 'Гонконг (UTC+8)' } },
  { value: 'Asia/Singapore', label: { en: 'Singapore (UTC+8)', ru: 'Сингапур (UTC+8)' } },
  { value: 'Asia/Irkutsk', label: { en: 'Irkutsk (UTC+8)', ru: 'Иркутск (UTC+8)' } },
  { value: 'Australia/Perth', label: { en: 'Perth (UTC+8)', ru: 'Перт (UTC+8)' } },
  { value: 'Asia/Seoul', label: { en: 'Seoul (UTC+9)', ru: 'Сеул (UTC+9)' } },
  { value: 'Asia/Tokyo', label: { en: 'Tokyo (UTC+9)', ru: 'Токио (UTC+9)' } },
  { value: 'Asia/Yakutsk', label: { en: 'Yakutsk (UTC+9)', ru: 'Якутск (UTC+9)' } },
  { value: 'Australia/Sydney', label: { en: 'Sydney (UTC+10)', ru: 'Сидней (UTC+10)' } },
  { value: 'Australia/Melbourne', label: { en: 'Melbourne (UTC+10)', ru: 'Мельбурн (UTC+10)' } },
  { value: 'Asia/Vladivostok', label: { en: 'Vladivostok (UTC+10)', ru: 'Владивосток (UTC+10)' } },
  { value: 'Asia/Magadan', label: { en: 'Magadan (UTC+11)', ru: 'Магадан (UTC+11)' } },
  { value: 'Pacific/Auckland', label: { en: 'Auckland (UTC+12)', ru: 'Окленд (UTC+12)' } },
  { value: 'Asia/Kamchatka', label: { en: 'Kamchatka (UTC+12)', ru: 'Камчатка (UTC+12)' } },
  { value: 'UTC', label: { en: 'UTC', ru: 'UTC' } },
] as const;

interface TimezoneSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  triggerClassName?: string;
}

export function TimezoneSelect({
  value,
  onValueChange,
  placeholder = 'Выберите часовой пояс',
  disabled = false,
  triggerClassName,
}: TimezoneSelectProps) {
  const locale = useLocale() as 'en' | 'ru';
  const normalized = ALIASES[value] ?? value;
  const knownEntry = normalized ? TIMEZONES.find((tz) => tz.value === normalized) : undefined;
  const displayLabel = knownEntry?.label[locale] ?? (normalized || undefined);

  return (
    <Select value={normalized} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={triggerClassName}>
        {displayLabel ? (
          <span className="truncate">{displayLabel}</span>
        ) : (
          <span className="truncate text-muted-foreground">{placeholder}</span>
        )}
      </SelectTrigger>
      <SelectContent className="max-h-60">
        {TIMEZONES.map((tz) => (
          <SelectItem key={tz.value} value={tz.value}>
            {tz.label[locale]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
