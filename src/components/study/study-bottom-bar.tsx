'use client';

import Link from 'next/link';
import { Loader2, RefreshCw, Plus, Infinity, LogOut, AlertTriangle, List } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CARD_COUNT_OPTIONS, LOW_CARDS_THRESHOLD } from '@/lib/constants';

interface StudyBottomBarProps {
  totalCards: number;
  currentCardIndex: number;
  isGenerating: boolean;
  isManualGenerating: boolean;
  infiniteMode: boolean;
  cardCount: number;
  fontSize: number;
  onToggleInfiniteMode: () => void;
  onGenerateMore: (count: number) => void;
  onSetCardCount: (count: number) => void;
  onIncreaseFontSize: () => void;
  onDecreaseFontSize: () => void;
  canIncreaseFontSize: boolean;
  canDecreaseFontSize: boolean;
  canGenerate?: boolean;
  cardsRemaining?: number | null;
  onScrollToCard: (index: number) => void;
}

export function StudyBottomBar({
  totalCards,
  currentCardIndex,
  isGenerating,
  isManualGenerating,
  infiniteMode,
  cardCount,
  fontSize,
  onToggleInfiniteMode,
  onGenerateMore,
  onSetCardCount,
  onIncreaseFontSize,
  onDecreaseFontSize,
  canIncreaseFontSize,
  canDecreaseFontSize,
  canGenerate = true,
  cardsRemaining,
  onScrollToCard,
}: StudyBottomBarProps) {
  const t = useTranslations();
  const anyGenerating = isGenerating || isManualGenerating;
  const isLowOnCards =
    cardsRemaining != null && cardsRemaining > 0 && cardsRemaining <= LOW_CARDS_THRESHOLD;

  return (
    <div
      className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 flex items-center gap-1.5 md:gap-3 px-3 md:px-6 py-1.5 md:py-3 bg-background/70 backdrop-blur-md border border-border rounded-full shadow-lg max-w-[90vw] overflow-x-auto no-scrollbar"
      style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* Progress */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            title={t('study.jumpToCard')}
            className="shrink-0 flex items-center gap-1 text-xs md:text-sm font-semibold text-foreground tabular-nums hover:text-primary transition-colors cursor-pointer"
          >
            {totalCards > 0 ? `${Math.min(currentCardIndex + 1, totalCards)}/${totalCards}` : '—'}
            <List className="w-3 h-3 opacity-60" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-40 p-1.5 max-h-60 overflow-y-auto" align="center" side="top">
          <div className="flex flex-col gap-0.5">
            {Array.from({ length: totalCards }, (_, i) => (
              <button
                key={i}
                onClick={() => onScrollToCard(i)}
                className={`w-full px-3 py-1.5 rounded text-sm font-medium text-left transition-colors cursor-pointer ${
                  i === currentCardIndex
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-muted'
                }`}
              >
                {t('study.cardNumber', { number: i + 1 })}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <div className="shrink-0 w-px h-3 md:h-4 bg-border" />

      {/* Font size controls */}
      <div className="shrink-0 flex items-center gap-0.5">
        <button
          onClick={onDecreaseFontSize}
          disabled={!canDecreaseFontSize}
          title={t('study.decreaseFontSize')}
          className="flex items-center justify-center w-6 h-6 rounded text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          A
        </button>
        <span className="text-[10px] text-muted-foreground tabular-nums w-3 text-center">
          {fontSize + 1}
        </span>
        <button
          onClick={onIncreaseFontSize}
          disabled={!canIncreaseFontSize}
          title={t('study.increaseFontSize')}
          className="flex items-center justify-center w-6 h-6 rounded text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          A
        </button>
      </div>

      <div className="shrink-0 w-px h-3 md:h-4 bg-border" />

      {/* Generation status (shown in both modes while active) */}
      {anyGenerating && (
        <>
          <div className="shrink-0 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span className="hidden sm:inline">{t('study.generating')}</span>
          </div>
          <div className="shrink-0 w-px h-3 md:h-4 bg-border" />
        </>
      )}

      {/* Manual mode: generate popover — hidden while generating */}
      {canGenerate && !infiniteMode && !anyGenerating && (
        <>
          <Popover>
            <PopoverTrigger asChild>
              <button
                title={t('study.generateMore')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border cursor-pointer ${
                  isLowOnCards
                    ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30 hover:border-yellow-500/60'
                    : 'bg-background text-muted-foreground border-border hover:text-foreground hover:border-foreground/30'
                }`}
              >
                {isLowOnCards ? (
                  <AlertTriangle className="w-3 h-3" />
                ) : (
                  <Plus className="w-3 h-3" />
                )}
                <span className="hidden sm:inline">
                  {isLowOnCards
                    ? t('study.generateCountLow', { count: cardCount, remaining: cardsRemaining })
                    : t('study.generateCount', { count: cardCount })}
                </span>
                <span className="sm:hidden">
                  {isLowOnCards ? `${cardsRemaining ?? ''}` : cardCount}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-36 p-1.5" align="center" side="top">
              <div className="flex flex-col gap-0.5">
                {CARD_COUNT_OPTIONS.map((n) => (
                  <button
                    key={n}
                    onClick={() => {
                      onSetCardCount(n);
                      onGenerateMore(n);
                    }}
                    className={`w-full px-3 py-1.5 rounded text-sm font-medium text-left transition-colors cursor-pointer ${
                      cardCount === n
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    {n} {t('dashboard.cards').toLowerCase()}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <div className="w-px h-4 bg-border" />
        </>
      )}

      {/* Auto / Manual toggle */}
      {canGenerate ? (
        <button
          onClick={onToggleInfiniteMode}
          title={infiniteMode ? t('study.disableAutoGenerate') : t('study.enableAutoGenerate')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border cursor-pointer ${
            infiniteMode
              ? 'bg-primary text-primary-foreground border-primary hover:opacity-90'
              : isLowOnCards
                ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30 hover:border-yellow-500/60'
                : 'bg-background text-muted-foreground border-border hover:text-foreground hover:border-foreground/30'
          }`}
        >
          {infiniteMode ? (
            <Infinity className="w-3 h-3" />
          ) : isLowOnCards ? (
            <AlertTriangle className="w-3 h-3" />
          ) : (
            <RefreshCw className="w-3 h-3" />
          )}
          <span className="hidden sm:inline">
            {infiniteMode ? t('study.auto') : t('study.manual')}
          </span>
        </button>
      ) : (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
          <span className="hidden sm:inline">{t('study.readOnly')}</span>
          <span className="sm:hidden">RO</span>
        </div>
      )}

      <Link
        href="/dashboard"
        className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
        title={t('study.exit')}
      >
        <LogOut className="w-3 h-3" />
        <span className="hidden sm:inline">{t('study.exit')}</span>
      </Link>
    </div>
  );
}
