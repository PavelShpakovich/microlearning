'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageSquarePlus, Send, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

type FormState = 'idle' | 'submitting' | 'success';

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [formState, setFormState] = useState<FormState>('idle');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && formState === 'idle') {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [open, formState]);

  useEffect(() => {
    if (formState === 'success') {
      const t = setTimeout(() => {
        setOpen(false);
        setFormState('idle');
        setMessage('');
      }, 2500);
      return () => clearTimeout(t);
    }
  }, [formState]);

  async function handleSubmit() {
    const text = message.trim();
    if (text.length < 5) {
      setError('Минимум 5 символов');
      return;
    }
    setError(null);
    setFormState('submitting');
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
      setFormState('success');
    } catch (err) {
      setError((err as Error).message ?? 'Не удалось отправить');
      setFormState('idle');
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void handleSubmit();
    }
  }

  function handleOpenChange(next: boolean) {
    if (formState === 'submitting') return;
    setOpen(next);
    if (!next && formState !== 'success') {
      setError(null);
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Обратная связь">
          <MessageSquarePlus className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        collisionPadding={8}
        className="w-80 max-w-[calc(100vw-16px)] p-0"
      >
        {formState === 'success' ? (
          <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30">
              <Check className="size-6" />
            </span>
            <p className="text-sm font-semibold">Спасибо за отзыв!</p>
            <p className="text-xs text-muted-foreground">Мы обязательно прочитаем</p>
          </div>
        ) : (
          <>
            <div className="border-b px-4 py-3">
              <p className="text-sm font-semibold">Обратная связь</p>
              <p className="text-xs text-muted-foreground mt-0.5">Что думаете о Clario?</p>
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
                disabled={formState === 'submitting'}
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
                  disabled={formState === 'submitting' || message.trim().length < 5}
                  className="gap-1.5"
                >
                  {formState === 'submitting' ? (
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
      </PopoverContent>
    </Popover>
  );
}
