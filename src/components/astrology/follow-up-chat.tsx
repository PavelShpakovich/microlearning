'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';

export interface ChatMessageItem {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

interface FollowUpChatProps {
  readingId: string;
  readingTitle: string;
  initialMessages: ChatMessageItem[];
  initialUsed: number;
  limit: number;
}

export function FollowUpChat({
  readingId,
  readingTitle,
  initialMessages,
  initialUsed,
  limit,
}: FollowUpChatProps) {
  const t = useTranslations('chat');
  const [messages, setMessages] = useState<ChatMessageItem[]>(initialMessages);
  const [used, setUsed] = useState(initialUsed);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const limitReached = used >= limit;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || isPending || limitReached) return;

    setInput('');
    setError(null);

    const optimisticUser: ChatMessageItem = {
      id: `optimistic-${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticUser]);
    setUsed((prev) => prev + 1);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/chat/${readingId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text }),
        });

        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          throw new Error(data.error ?? 'Error');
        }

        const data = (await res.json()) as {
          message: ChatMessageItem;
          messagesUsed: number;
          messagesLimit: number;
        };

        setMessages((prev) => [...prev, data.message]);
        setUsed(data.messagesUsed);
      } catch {
        setError(t('errorSending'));
        // Rollback optimistic user message
        setMessages((prev) => prev.filter((m) => m.id !== optimisticUser.id));
        setUsed((prev) => Math.max(0, prev - 1));
        setInput(text);
      }
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
            <Link href={`/readings/${readingId}`}>
              <ArrowLeft className="mr-1" />
              {t('backToReading')}
            </Link>
          </Button>
          <h1 className="text-xl font-semibold tracking-tight">{readingTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('pageTitle')}</p>
        </div>
        <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
          {t('limitHint', { used, max: limit })}
        </span>
      </div>

      {/* Messages */}
      <div className="flex min-h-[300px] flex-col gap-4 pb-4">
        {messages.length === 0 && (
          <p className="mt-8 text-center text-sm text-muted-foreground">{t('emptyState')}</p>
        )}

        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  isUser
                    ? 'rounded-br-sm bg-primary text-primary-foreground'
                    : 'rounded-bl-sm border bg-card text-card-foreground'
                }`}
              >
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider opacity-60">
                  {isUser ? t('you') : t('assistant')}
                </p>
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          );
        })}

        {isPending && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border bg-card px-4 py-3 text-sm text-muted-foreground">
              <Loader2 className="animate-spin" />
              <span>{t('assistant')}</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {error && (
        <p className="mb-3 rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Input */}
      {limitReached ? (
        <div className="rounded-2xl border bg-muted/40 px-4 py-4 text-center text-sm text-muted-foreground">
          {t('limitReached')}
        </div>
      ) : (
        <div className="flex items-end gap-2 rounded-2xl border bg-card p-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('askPlaceholder')}
            rows={2}
            className="flex-1 resize-none bg-transparent px-2 py-1 text-sm outline-none placeholder:text-muted-foreground"
            disabled={isPending}
          />
          <Button
            size="sm"
            onClick={() => void handleSend()}
            disabled={!input.trim() || isPending}
            className="shrink-0"
          >
            {isPending ? <Loader2 className="animate-spin" /> : <Send />}
          </Button>
        </div>
      )}
    </div>
  );
}
