'use client';

import { Globe, Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useUiLanguage } from '@/hooks/use-ui-language';

export function TgSettingsBar() {
  const t = useTranslations();
  const { theme: colorTheme, setTheme: setColorTheme } = useTheme();
  const { locale, setLanguage } = useUiLanguage();

  return (
    <div className="mb-4 flex items-center justify-end gap-2">
      {/* Language */}
      <div className="flex items-center gap-1 rounded-full border border-border bg-background px-1 py-1">
        <Globe className="mx-1.5 h-3.5 w-3.5 text-muted-foreground" />
        {(['en', 'ru'] as const).map((l) => (
          <button
            key={l}
            onClick={() => void setLanguage(l)}
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${
              locale === l
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>
      {/* Colour scheme */}
      <button
        onClick={() => setColorTheme(colorTheme === 'dark' ? 'light' : 'dark')}
        className="flex items-center justify-center rounded-full border border-border bg-background p-2 text-muted-foreground hover:text-foreground transition-colors"
        title={colorTheme === 'dark' ? t('settings.lightMode') : t('settings.darkMode')}
      >
        {colorTheme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
