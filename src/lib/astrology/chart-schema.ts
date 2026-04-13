import { z } from 'zod';
import {
  ASTROLOGY_SUPPORTED_LOCALES,
  CHART_SUBJECT_TYPES,
  HOUSE_SYSTEMS,
  TONE_STYLES,
} from '@/lib/astrology/constants';

export const birthLocationSchema = z.object({
  city: z.string().trim().min(1).max(120),
  country: z.string().trim().min(1).max(120),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  timezone: z.string().trim().min(1).max(80).optional(),
});

export const chartCreateSchema = z
  .object({
    label: z.string().trim().min(1).max(120),
    personName: z.string().trim().min(1).max(120),
    subjectType: z.enum(CHART_SUBJECT_TYPES),
    birthDate: z.iso.date(),
    birthTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/)
      .optional(),
    birthTimeKnown: z.boolean().default(true),
    houseSystem: z.enum(HOUSE_SYSTEMS).default('placidus'),
    notes: z.string().trim().max(500).optional(),
    locale: z.enum(ASTROLOGY_SUPPORTED_LOCALES).default('en'),
  })
  .and(birthLocationSchema)
  .superRefine((value, ctx) => {
    if (value.birthTimeKnown && !value.birthTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['birthTime'],
        message: 'Birth time is required when birthTimeKnown is true',
      });
    }

    if (!value.birthTimeKnown && value.birthTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['birthTime'],
        message: 'Birth time must be omitted when birthTimeKnown is false',
      });
    }
  });

export const userPreferencesSchema = z.object({
  toneStyle: z.enum(TONE_STYLES).default('balanced'),
  contentFocusLove: z.boolean().default(true),
  contentFocusCareer: z.boolean().default(true),
  contentFocusGrowth: z.boolean().default(true),
  allowSpiritualTone: z.boolean().default(true),
});

export type ChartCreateInput = z.infer<typeof chartCreateSchema>;
export type UserPreferencesInput = z.infer<typeof userPreferencesSchema>;
