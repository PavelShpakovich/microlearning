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
}

const FONT_CONFIG = [
  // 0 — small
  { title: 'text-lg md:text-xl', container: 'text-sm' },
  // 1 — default
  { title: 'text-2xl md:text-3xl', container: 'text-base' },
  // 2 — large
  { title: 'text-3xl md:text-4xl', container: 'text-lg' },
  // 3 — extra-large
  { title: 'text-4xl md:text-5xl', container: 'text-xl' },
] as const;

export function InfoCard({ card, fontSize = 1 }: InfoCardProps) {
  const cfg = FONT_CONFIG[fontSize];
  return (
    <div className="w-full flex flex-col bg-background relative" data-card-id={card.id}>
      {/* Content — flows naturally, no inner scroll */}
      <div className={`px-5 py-6 pt-6 md:px-10 md:py-8 md:pt-10 ${cfg.container}`}>
        <div className="max-w-3xl mx-auto pb-28">
          {/* Title */}
          <h1
            className={`${cfg.title} font-bold text-foreground mb-4 md:mb-6 leading-snug text-balance`}
          >
            {card.title}
          </h1>

          {/* Markdown body */}
          <div
            className={`prose dark:prose-invert max-w-none
            prose-p:text-foreground/80 prose-p:leading-relaxed
            prose-headings:font-semibold prose-headings:text-foreground prose-headings:mt-6 prose-headings:mb-2
            prose-h2:border-b prose-h2:border-border prose-h2:pb-1
            prose-strong:text-foreground prose-strong:font-semibold
            prose-a:text-foreground prose-a:no-underline hover:prose-a:opacity-70
            prose-ul:text-foreground/80 prose-ol:text-foreground/80
            prose-li:text-foreground/80 prose-li:leading-relaxed prose-li:my-0.5
            prose-code:text-foreground prose-code:bg-muted prose-code:rounded prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[0.875em] prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
            prose-blockquote:border-l-[3px] prose-blockquote:border-primary/40 prose-blockquote:bg-primary/5 prose-blockquote:rounded-r-lg prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:not-italic prose-blockquote:text-foreground/70
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
