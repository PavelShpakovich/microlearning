import { z } from 'zod';
import { ASTROLOGY_SUPPORTED_LOCALES, READING_TYPES } from '@/lib/astrology/constants';

export const readingSectionSchema = z.object({
  key: z.string().trim().min(1),
  title: z.string().trim().min(1).max(120),
  content: z.string().trim().min(1),
});

export const structuredReadingSchema = z.object({
  title: z.string().trim().min(1).max(180),
  summary: z.string().trim().min(1),
  sections: z.array(readingSectionSchema).min(1),
  placementHighlights: z.array(z.string().trim().min(1)).default([]),
  advice: z.array(z.string().trim().min(1)).default([]),
  disclaimers: z.array(z.string().trim().min(1)).default([]),
  metadata: z.object({
    locale: z.enum(ASTROLOGY_SUPPORTED_LOCALES),
    readingType: z.enum(READING_TYPES),
    promptVersion: z.string().trim().min(1),
    schemaVersion: z.string().trim().min(1),
  }),
});

export type StructuredReadingOutput = z.infer<typeof structuredReadingSchema>;
