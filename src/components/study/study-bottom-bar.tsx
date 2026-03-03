'use client';

import { Loader2, RefreshCw, Plus, Infinity, LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const GENERATE_COUNT_OPTIONS = [5, 10, 15, 20];

interface StudyBottomBarProps {
  totalCards: number;
  currentCardIndex: number;
  isGenerating: boolean;
  isManualGenerating: boolean;
  infiniteMode: boolean;
  hasCards: boolean;
  cardCount: number;
  onToggleInfiniteMode: () => void;
  onGenerateMore: (count: number) => void;
  onSetCardCount: (count: number) => void;
  canGenerate?: boolean;
}

export function StudyBottomBar({
  totalCards,
  currentCardIndex,
  isGenerating,
  isManualGenerating,
  infiniteMode,
  hasCards: _hasCards, // eslint-disable-line @typescript-eslint/no-unused-vars
  cardCount,
  onToggleInfiniteMode,
  onGenerateMore,
  onSetCardCount,
  canGenerate = true,
}: StudyBottomBarProps) {
  const t = useTranslations();
  const anyGenerating = isGenerating || isManualGenerating;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 flex items-center gap-2 md:gap-3 px-4 md:px-6 py-2 md:py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full shadow-lg max-w-[90vw] overflow-x-auto no-scrollbar">
      {/* Progress */}
      <span className="shrink-0 text-xs md:text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
        {totalCards > 0 ? `${Math.min(currentCardIndex + 1, totalCards)}/${totalCards}` : '—'}
      </span>

      <div className="shrink-0 w-px h-3 md:h-4 bg-gray-200 dark:bg-gray-700" />

      {/* Generation status (shown in both modes while active) */}
      {anyGenerating && (
        <>
          <div className="shrink-0 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <Loader2 className="w-3 h-3 animate-spin text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">{t('study.generating')}</span>
          </div>
          <div className="shrink-0 w-px h-3 md:h-4 bg-gray-200 dark:bg-gray-700" />
        </>
      )}

      {/* Manual mode: generate popover — hidden while generating */}
      {canGenerate && !infiniteMode && !anyGenerating && (
        <>
          <Popover>
            <PopoverTrigger asChild>
              <button
                title={t('study.generateMore')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:text-blue-600 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span className="hidden sm:inline">
                  {t('study.generateCount', { count: cardCount })}
                </span>
                <span className="sm:hidden">{cardCount}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-36 p-1.5" align="center" side="top">
              <div className="flex flex-col gap-0.5">
                {GENERATE_COUNT_OPTIONS.map((n) => (
                  <button
                    key={n}
                    onClick={() => {
                      onSetCardCount(n);
                      onGenerateMore(n);
                    }}
                    className={`w-full px-3 py-1.5 rounded text-sm font-medium text-left transition-colors cursor-pointer ${
                      cardCount === n
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    {n} {t('dashboard.cards').toLowerCase()}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <div className="w-px h-4 bg-gray-200 dark:bg-gray-700" />
        </>
      )}

      {/* Auto / Manual toggle */}
      {canGenerate ? (
        <button
          onClick={onToggleInfiniteMode}
          title={infiniteMode ? t('study.disableAutoGenerate') : t('study.enableAutoGenerate')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border cursor-pointer ${
            infiniteMode
              ? 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }`}
        >
          {infiniteMode ? <Infinity className="w-3 h-3" /> : <RefreshCw className="w-3 h-3" />}
          <span className="hidden sm:inline">
            {infiniteMode ? t('study.auto') : t('study.manual')}
          </span>
        </button>
      ) : (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 border border-gray-200 dark:border-gray-700">
          <span className="hidden sm:inline">{t('study.readOnly')}</span>
          <span className="sm:hidden">RO</span>
        </div>
      )}

      <a
        href="/dashboard"
        className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors font-medium"
        title={t('study.exit')}
      >
        <LogOut className="w-3 h-3" />
        <span className="hidden sm:inline">{t('study.exit')}</span>
      </a>
    </div>
  );
}
