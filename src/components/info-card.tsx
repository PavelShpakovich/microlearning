'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { CardRow } from '@/lib/supabase/types';
import 'highlight.js/styles/github-dark.css';

interface InfoCardProps {
  card: Pick<CardRow, 'id' | 'title' | 'body'>;
}

export function InfoCard({ card }: InfoCardProps) {
  return (
    <div
      className="w-full h-full flex flex-col bg-background relative overflow-hidden"
      data-card-id={card.id}
    >
      {/* Scrollable body — title inline with content */}
      <div className="flex-1 overflow-y-auto px-5 py-6 pt-6 md:px-10 md:py-8 md:pt-10 touch-pan-y">
        <div className="max-w-3xl mx-auto pb-28 md:pb-28">
          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-4 md:mb-6 leading-snug">
            {card.title}
          </h1>

          {/* Markdown body */}
          <div
            className="prose dark:prose-invert max-w-none
            prose-p:text-foreground/80 prose-p:leading-relaxed prose-p:text-base md:prose-p:text-lg
            prose-headings:font-semibold prose-headings:text-foreground
            prose-strong:text-foreground prose-strong:font-semibold
            prose-a:text-foreground prose-a:no-underline hover:prose-a:opacity-70
            prose-ul:text-foreground/80 prose-ol:text-foreground/80
            prose-li:text-base md:prose-li:text-lg prose-li:leading-relaxed
            prose-blockquote:border-l-2 prose-blockquote:border-border prose-blockquote:bg-muted/50 prose-blockquote:rounded-r-lg prose-blockquote:py-1 prose-blockquote:not-italic
            prose-table:rounded-xl prose-table:overflow-hidden
            prose-th:bg-muted prose-th:font-semibold
            prose-td:border-border
          "
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
