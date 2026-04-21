'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { MessageSquarePlus, X, Send, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type State = 'closed' | 'open' | 'submitting' | 'success';

export function FeedbackWidget() {
  const pathname = usePathname();
  const [state, setState] = useState<State>('closed');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isOpen = state !== 'closed';

  useEffect(() => {
    if (state === 'open') {
      setTimeout(() => textareaRef.current?.focus(), 200);
    }
  }, [state]);

  useEffect(() => {
    if (state === 'success') {
      const t = setTimeout(() => {
        setState('closed');
        setMessage('');
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [state]);

  async function handleSubmit() {
    const text = message.trim();
    if (text.length < 5) {
      setError('Минимум 5 символов');
      return;
    }
    setError(null);
    setState('submitting');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? 'Ошибка');
      }
      setState('success');
    } catch (err) {
      setError((err as Error).message ?? 'Не удалось отправить');
      setState('open');
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void handleSubmit();
    }
  }

  function toggle() {
    if (state === 'submitting' || state === 'success') return;
    if (state === 'closed') setState('open');
    else {
      setState('closed');
      setError(null);
    }
  }

  if (pathname.startsWith('/chat')) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Panel */}
      <div
        className={[
          'w-80 rounded-2xl border bg-card shadow-lg shadow-black/10 overflow-hidden',
          'transition-all duration-200 origin-bottom-right',
          isOpen
            ? 'opacity-100 scale-100 pointer-events-auto'
            : 'opacity-0 scale-95 pointer-events-none',
        ].join(' ')}
      >
        {state === 'success' ? (
          <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30">
              <Check className="size-6" />
            </span>
            <p className="text-sm font-semibold">Спасибо за отзыв!</p>
            <p className="text-xs text-muted-foreground">Мы обязательно прочитаем</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <p className="text-sm font-semibold">Обратная связь</p>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-foreground"
                onClick={toggle}
              >
                <X className="size-4" />
              </Button>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Расскажите, что думаете или что можно улучшить…"
                rows={4}
                maxLength={2000}
                disabled={state === 'submitting'}
                className="w-full resize-none rounded-xl border bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
              />
              {error ? <p className="text-xs text-destructive">{error}</p> : null}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-muted-foreground">
                  {message.length > 0 ? `${message.length}/2000` : '⌘↵ для отправки'}
                </span>
                <Button
                  size="sm"
                  onClick={() => void handleSubmit()}
                  disabled={state === 'submitting' || message.trim().length < 5}
                  className="gap-1.5"
                >
                  {state === 'submitting' ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Send className="size-3.5" />
                  )}
                  Отправить
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={toggle}
        aria-label="Обратная связь"
        className={[
          'flex size-10 items-center justify-center rounded-full border bg-background/80 backdrop-blur-sm',
          'text-muted-foreground shadow-sm',
          'opacity-30 transition-all duration-200 hover:opacity-100 hover:shadow-md hover:text-foreground hover:border-border',
          'active:scale-95',
          isOpen && 'opacity-100 border-border text-foreground',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {isOpen ? <X className="size-4" /> : <MessageSquarePlus className="size-4" />}
      </button>
    </div>
  );
}
