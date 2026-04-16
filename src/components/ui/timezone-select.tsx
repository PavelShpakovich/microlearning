'use client';

import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';

// Normalize legacy IANA aliases
const ALIASES: Record<string, string> = {
  'Europe/Kiev': 'Europe/Kyiv',
  'Asia/Calcutta': 'Asia/Kolkata',
  'Asia/Rangoon': 'Asia/Yangon',
};

export const TIMEZONES = [
  { value: 'Pacific/Honolulu', label: 'Гонолулу (UTC−10)' },
  { value: 'America/Anchorage', label: 'Анкоридж (UTC−9)' },
  { value: 'America/Los_Angeles', label: 'Лос-Анджелес (UTC−8)' },
  { value: 'America/Denver', label: 'Денвер (UTC−7)' },
  { value: 'America/Chicago', label: 'Чикаго (UTC−6)' },
  { value: 'America/New_York', label: 'Нью-Йорк (UTC−5)' },
  { value: 'America/Toronto', label: 'Торонто (UTC−5)' },
  { value: 'America/Sao_Paulo', label: 'Сан-Паулу (UTC−3)' },
  { value: 'America/Buenos_Aires', label: 'Буэнос-Айрес (UTC−3)' },
  { value: 'Atlantic/Azores', label: 'Азорские о-ва (UTC−1)' },
  { value: 'Europe/London', label: 'Лондон (UTC+0)' },
  { value: 'Europe/Lisbon', label: 'Лиссабон (UTC+0)' },
  { value: 'Europe/Berlin', label: 'Берлин (UTC+1)' },
  { value: 'Europe/Paris', label: 'Париж (UTC+1)' },
  { value: 'Europe/Warsaw', label: 'Варшава (UTC+1)' },
  { value: 'Europe/Vilnius', label: 'Вильнюс (UTC+2)' },
  { value: 'Europe/Riga', label: 'Рига (UTC+2)' },
  { value: 'Europe/Tallinn', label: 'Таллинн (UTC+2)' },
  { value: 'Europe/Helsinki', label: 'Хельсинки (UTC+2)' },
  { value: 'Europe/Kyiv', label: 'Киев (UTC+2)' },
  { value: 'Europe/Bucharest', label: 'Бухарест (UTC+2)' },
  { value: 'Europe/Athens', label: 'Афины (UTC+2)' },
  { value: 'Africa/Cairo', label: 'Каир (UTC+2)' },
  { value: 'Africa/Johannesburg', label: 'Йоханнесбург (UTC+2)' },
  { value: 'Europe/Kaliningrad', label: 'Калининград (UTC+2)' },
  { value: 'Europe/Minsk', label: 'Минск (UTC+3)' },
  { value: 'Europe/Moscow', label: 'Москва (UTC+3)' },
  { value: 'Europe/Istanbul', label: 'Стамбул (UTC+3)' },
  { value: 'Africa/Nairobi', label: 'Найроби (UTC+3)' },
  { value: 'Asia/Tbilisi', label: 'Тбилиси (UTC+4)' },
  { value: 'Asia/Baku', label: 'Баку (UTC+4)' },
  { value: 'Asia/Yerevan', label: 'Ереван (UTC+4)' },
  { value: 'Asia/Dubai', label: 'Дубай (UTC+4)' },
  { value: 'Asia/Tashkent', label: 'Ташкент (UTC+5)' },
  { value: 'Asia/Karachi', label: 'Карачи (UTC+5)' },
  { value: 'Asia/Yekaterinburg', label: 'Екатеринбург (UTC+5)' },
  { value: 'Asia/Kolkata', label: 'Мумбаи (UTC+5:30)' },
  { value: 'Asia/Almaty', label: 'Алматы (UTC+6)' },
  { value: 'Asia/Omsk', label: 'Омск (UTC+6)' },
  { value: 'Asia/Dhaka', label: 'Дакка (UTC+6)' },
  { value: 'Asia/Yangon', label: 'Янгон (UTC+6:30)' },
  { value: 'Asia/Bangkok', label: 'Бангкок (UTC+7)' },
  { value: 'Asia/Krasnoyarsk', label: 'Красноярск (UTC+7)' },
  { value: 'Asia/Shanghai', label: 'Шанхай (UTC+8)' },
  { value: 'Asia/Hong_Kong', label: 'Гонконг (UTC+8)' },
  { value: 'Asia/Singapore', label: 'Сингапур (UTC+8)' },
  { value: 'Asia/Irkutsk', label: 'Иркутск (UTC+8)' },
  { value: 'Australia/Perth', label: 'Перт (UTC+8)' },
  { value: 'Asia/Seoul', label: 'Сеул (UTC+9)' },
  { value: 'Asia/Tokyo', label: 'Токио (UTC+9)' },
  { value: 'Asia/Yakutsk', label: 'Якутск (UTC+9)' },
  { value: 'Australia/Sydney', label: 'Сидней (UTC+10)' },
  { value: 'Australia/Melbourne', label: 'Мельбурн (UTC+10)' },
  { value: 'Asia/Vladivostok', label: 'Владивосток (UTC+10)' },
  { value: 'Asia/Magadan', label: 'Магадан (UTC+11)' },
  { value: 'Pacific/Auckland', label: 'Окленд (UTC+12)' },
  { value: 'Asia/Kamchatka', label: 'Камчатка (UTC+12)' },
  { value: 'UTC', label: 'UTC' },
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
  const normalized = ALIASES[value] ?? value;
  const knownEntry = normalized ? TIMEZONES.find((tz) => tz.value === normalized) : undefined;
  const displayLabel = knownEntry?.label ?? (normalized || undefined);

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
            {tz.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
