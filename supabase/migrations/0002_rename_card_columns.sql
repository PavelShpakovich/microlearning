-- Rename card columns from Q&A format to microlearning info card format
ALTER TABLE public.cards RENAME COLUMN question TO title;
ALTER TABLE public.cards RENAME COLUMN answer TO body;

-- Update column comments
COMMENT ON COLUMN public.cards.title IS 'Microlearning headline (≤ 10 words)';
COMMENT ON COLUMN public.cards.body IS 'Info card body (2–4 sentences)';
