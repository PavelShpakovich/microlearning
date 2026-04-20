'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send, Loader2, Square } from 'lucide-react';

export interface ChatMessageItem {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

interface FollowUpChatProps {
  readingId: string;
  readingTitle: string;
  readingType?: string;
  initialMessages: ChatMessageItem[];
  initialUsed: number;
  limit: number;
}

// Starter question keys — grouped by reading type
const STARTER_KEYS = [
  'natal',
  'natal_overview',
  'personality',
  'love',
  'career',
  'strengths',
  'transit',
  'compatibility',
] as const;

export function FollowUpChat({
  readingId,
  readingTitle,
  readingType,
  initialMessages,
  initialUsed,
  limit,
}: FollowUpChatProps) {
  const t = useTranslations('chat');
  const [messages, setMessages] = useState<ChatMessageItem[]>(initialMessages);
  const [used, setUsed] = useState(initialUsed);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const limitReached = used >= limit;
  const remaining = Math.max(0, limit - used);

  const typeKey =
    readingType && (STARTER_KEYS as readonly string[]).includes(readingType)
      ? (readingType as (typeof STARTER_KEYS)[number])
      : null;

  const starters: string[] = typeKey
    ? [t(`starters.${typeKey}.q0`), t(`starters.${typeKey}.q1`), t(`starters.${typeKey}.q2`)]
    : [t('starters.default.q0'), t('starters.default.q1'), t('starters.default.q2')];

  useEffect(() => {
    if (messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Auto-resize the textarea as content grows
  function resizeTextarea() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    resizeTextarea();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  function handleAbort() {
    abortRef.current?.abort();
  }

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text || isStreaming || limitReached) return;

      setError(null);

      const optimisticUser: ChatMessageItem = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text,
        created_at: new Date().toISOString(),
      };

      const streamingId = `stream-${Date.now()}`;
      const streamingMsg: ChatMessageItem = {
        id: streamingId,
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, optimisticUser, streamingMsg]);
      setUsed((prev) => prev + 1);
      setIsStreaming(true);

      const abort = new AbortController();
      abortRef.current = abort;

      try {
        const res = await fetch(`/api/chat/${readingId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text }),
          signal: abort.signal,
        });

        if (!res.ok || !res.body) {
          const data = (await res.json()) as { error?: string };
          throw new Error(data.error ?? 'Error');
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          setMessages((prev) =>
            prev.map((m) => (m.id === streamingId ? { ...m, content: accumulated } : m)),
          );
          bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }

        setMessages((prev) =>
          prev.map((m) => (m.id === streamingId ? { ...m, id: `final-${Date.now()}` } : m)),
        );
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setError(t('errorSending'));
        setMessages((prev) =>
          prev.filter((m) => m.id !== optimisticUser.id && m.id !== streamingId),
        );
        setUsed((prev) => Math.max(0, prev - 1));
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isStreaming, limitReached, readingId],
  );

  async function handleSend() {
    const text = input.trim();
    if (!text) return;
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    await sendMessage(text);
  }

  async function handleStarterClick(question: string) {
    await sendMessage(question);
  }

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      {/* ── Header (pinned top) ── */}
      <div className="z-10 shrink-0 border-b bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="-ml-2 shrink-0">
              <Link href={`/readings/${readingId}`}>
                <ArrowLeft />
                {t('backToReading')}
              </Link>
            </Button>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold leading-tight">{readingTitle}</h1>
              <p className="text-xs text-muted-foreground">{t('pageTitle')}</p>
            </div>
          </div>

          {/* Visual limit dots */}
          <div className="flex shrink-0 flex-col items-end gap-1">
            <div className="flex gap-1.5">
              {Array.from({ length: limit }).map((_, i) => (
                <span
                  key={i}
                  className={`h-2 w-2 rounded-full transition-colors ${
                    i < used ? 'bg-muted-foreground/25' : 'bg-primary'
                  }`}
                />
              ))}
            </div>
            <span className="text-[11px] text-muted-foreground">
              {remaining > 0
                ? remaining === 1
                  ? t('questionsRemainingOne', { count: remaining })
                  : remaining < 5
                    ? t('questionsRemainingFew', { count: remaining })
                    : t('questionsRemainingMany', { count: remaining })
                : t('limitReached')}
            </span>
          </div>
        </div>
      </div>

      {/* ── Messages (scrollable) ── */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6">
          {/* Starter questions — shown only before first message */}
          {messages.length === 0 && !isStreaming ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('whereToStart')}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {starters.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => void handleStarterClick(q)}
                    disabled={limitReached}
                    className="min-h-11 rounded-full border bg-card px-4 py-2.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-40"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            const isStreamingMsg = isStreaming && msg.id.startsWith('stream-');
            return (
              <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    isUser
                      ? 'rounded-br-sm bg-primary text-primary-foreground'
                      : 'rounded-bl-sm border bg-card text-card-foreground'
                  }`}
                >
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider opacity-60">
                    {isUser ? t('you') : t('assistant')}
                  </p>
                  {isUser ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                      {msg.content ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      ) : isStreamingMsg ? (
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Loader2 className="size-3.5 animate-spin" />
                          <span className="text-xs">{t('assistant')}…</span>
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Input (pinned bottom) ── */}
      <div className="z-10 shrink-0 border-t bg-background/95 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-3xl px-4 py-3 sm:px-6">
          {error ? (
            <p className="mb-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {limitReached ? (
            <div className="rounded-2xl border bg-muted/40 px-4 py-4 text-center text-sm text-muted-foreground">
              {t('limitReached')}
            </div>
          ) : (
            <div className="flex items-end gap-2 rounded-2xl border bg-card p-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder={t('askPlaceholder')}
                aria-label={t('askPlaceholder')}
                rows={1}
                style={{ maxHeight: '128px' }}
                className="flex-1 resize-none overflow-y-auto bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
                disabled={isStreaming}
              />
              {isStreaming ? (
                <Button
                  variant="ghost"
                  onClick={handleAbort}
                  className="size-11 shrink-0 text-muted-foreground hover:text-destructive"
                  title={t('stopButton')}
                >
                  <Square className="size-4 fill-current" />
                </Button>
              ) : (
                <Button
                  onClick={() => void handleSend()}
                  disabled={!input.trim()}
                  className="size-11 shrink-0"
                >
                  <Send />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
