'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { CardRow } from '@/lib/supabase/types';
import type { CardFontSize } from '@/hooks/use-card-font-size';
import 'highlight.js/styles/github-dark.css';

interface InfoCardProps {
  card: Pick<CardRow, 'id' | 'title' | 'body'>;
  fontSize?: CardFontSize;
  reserveBottomBarSpace?: boolean;
  actions?: React.ReactNode;
}

const FONT_CONFIG = [
  // 0 — small
  { title: 'text-base md:text-xl', container: 'text-xs md:text-sm' },
  // 1 — default
  { title: 'text-xl md:text-3xl', container: 'text-sm md:text-base' },
  // 2 — large
  { title: 'text-2xl md:text-4xl', container: 'text-base md:text-lg' },
  // 3 — extra-large
  { title: 'text-3xl md:text-5xl', container: 'text-lg md:text-xl' },
] as const;

export function InfoCard({
  card,
  fontSize = 1,
  reserveBottomBarSpace = true,
  actions,
}: InfoCardProps) {
  const cfg = FONT_CONFIG[fontSize];
  return (
    <div className="w-full flex flex-col bg-background relative" data-card-id={card.id}>
      {/* Content — flows naturally, no inner scroll */}
      <div className={`px-4 py-4 pt-4 md:px-10 md:py-8 md:pt-10 ${cfg.container}`}>
        <div className={`max-w-3xl mx-auto ${reserveBottomBarSpace ? 'pb-28' : ''}`}>
          {/* Title */}
          <div className="mb-3 md:mb-6 space-y-3">
            <h1 className={`${cfg.title} font-bold text-foreground leading-snug text-balance`}>
              {card.title}
            </h1>

            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
          </div>

          {/* Markdown body */}
          <div
            className={`prose dark:prose-invert max-w-none
            prose-p:my-2 md:prose-p:my-4 prose-p:text-foreground/80 prose-p:leading-6 md:prose-p:leading-7
            prose-headings:font-bold prose-headings:text-foreground prose-headings:tracking-tight prose-headings:mt-4 prose-headings:mb-2 md:prose-headings:mt-6 md:prose-headings:mb-3
            prose-h2:text-lg md:prose-h2:text-2xl prose-h2:border-b prose-h2:border-border/50 prose-h2:pb-1
            prose-h3:text-base md:prose-h3:text-xl
            prose-strong:text-foreground prose-strong:font-semibold
            prose-a:text-foreground prose-a:no-underline hover:prose-a:opacity-70
            prose-ul:my-2 md:prose-ul:my-4 prose-ul:text-foreground/80 prose-ol:my-2 md:prose-ol:my-4 prose-ol:text-foreground/80
            prose-li:text-foreground/80 prose-li:leading-6 md:prose-li:leading-7 prose-li:my-0.5 md:prose-li:my-1
            prose-code:text-foreground prose-code:bg-muted prose-code:rounded prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[0.875em] prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
            prose-blockquote:my-2 md:prose-blockquote:my-4 prose-blockquote:border-l-[3px] prose-blockquote:border-primary/40 prose-blockquote:bg-primary/5 prose-blockquote:rounded-r-lg prose-blockquote:py-1.5 md:prose-blockquote:py-2 prose-blockquote:px-3 md:prose-blockquote:px-4 prose-blockquote:not-italic prose-blockquote:text-foreground/70
            prose-table:w-full
            prose-th:bg-muted prose-th:font-semibold prose-th:border prose-th:border-border prose-th:px-3 prose-th:py-2
            prose-td:border prose-td:border-border prose-td:px-3 prose-td:py-2
          `}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                pre: ({ children }) => (
                  <div className="not-prose my-4 rounded-xl overflow-hidden shadow-md">
                    <pre className="text-sm leading-relaxed p-0">{children}</pre>
                  </div>
                ),
                table: ({ children }) => (
                  <div className="not-prose my-4 overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-sm border-collapse">{children}</table>
                  </div>
                ),
                thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
                code: ({ className, children, ...props }) => {
                  const isBlock = !!className?.includes('language-');
                  if (isBlock) {
                    return (
                      <code
                        className={`${className ?? ''} block p-5 text-sm leading-relaxed`}
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  }
                  return (
                    <code
                      className="bg-muted text-foreground/80 rounded px-1.5 py-0.5 text-sm font-mono not-prose"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
              }}
            >
              {card.body}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
