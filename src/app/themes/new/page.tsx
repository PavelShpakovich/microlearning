'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { revalidateDashboard } from '@/actions/revalidate';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Wand2, PenLine } from 'lucide-react';
import { CARD_COUNT_OPTIONS } from '@/lib/constants';
import { BackLink } from '@/components/common/back-link';

import { useUiLanguage } from '@/hooks/use-ui-language';
import { useSubscription } from '@/hooks/use-subscription';
import { themeApi } from '@/services/theme-api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const themeSchema = z.object({
  name: z.string().min(1, 'Theme name is required').max(100),
  description: z.string().max(500).optional(),
  language: z.enum(['en', 'ru']),
  autoGenerate: z.boolean(),
  cardCount: z.number().int().min(5).max(20),
});

type ThemeFormValues = z.infer<typeof themeSchema>;

export default function NewThemePage() {
  const t = useTranslations();
  const router = useRouter();
  const { locale } = useUiLanguage();
  const { status: subscriptionStatus } = useSubscription();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if at theme limit — prevents direct URL access bypass
  const atThemeLimit =
    subscriptionStatus !== null &&
    subscriptionStatus.plan.maxThemes !== null &&
    subscriptionStatus.themesUsed >= subscriptionStatus.plan.maxThemes;

  useEffect(() => {
    if (atThemeLimit) {
      toast.error(t('usage.themeLimitReachedBannerTitle'));
      router.replace('/dashboard');
    }
  }, [atThemeLimit, router, t]);

  const form = useForm<ThemeFormValues>({
    resolver: zodResolver(themeSchema),
    defaultValues: {
      name: '',
      description: '',
      language: 'en',
      autoGenerate: true,
      cardCount: 10,
    },
  });

  const autoGenerate = form.watch('autoGenerate');
  const cardCount = form.watch('cardCount');

  // Sync card language default with UI language once the cookie is read
  useEffect(() => {
    form.setValue('language', locale);
  }, [locale, form]);

  async function onSubmit(values: ThemeFormValues) {
    try {
      setIsSubmitting(true);
      const theme = await themeApi.createTheme({
        name: values.name,
        description: values.description,
        language: values.language,
      });

      if (!theme.id) {
        router.push('/dashboard');
        return;
      }

      if (values.autoGenerate) {
        // Navigate immediately — study hook auto-triggers generation on mount
        // when infiniteMode=true and there are 0 cards
        await revalidateDashboard();
        router.push(`/study/${theme.id}?count=${values.cardCount}`);
      } else {
        await revalidateDashboard();
        toast.success(t('messages.success'));
        router.push(`/themes/${theme.id}/edit`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('errors.generic'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 md:py-10">
      <BackLink />
      <Card>
        <CardHeader>
          <CardTitle>{t('themes.createNew')}</CardTitle>
          <CardDescription>{t('themes.cardLanguage')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* 1. Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('themes.name')} *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('themes.namePlaceholder')}
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 2. Card Language — compact EN/RU toggle */}
              <FormField
                control={form.control}
                name="language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('themes.language')}</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        {(['en', 'ru'] as const).map((lang) => (
                          <button
                            key={lang}
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => field.onChange(lang)}
                            className={`flex-1 rounded-lg border-2 py-2 text-sm font-semibold transition-all cursor-pointer ${
                              field.value === lang
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
                            }`}
                          >
                            {lang === 'en' ? t('common.english') : t('common.russian')}
                          </button>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 3. Generation mode — card count lives inside the Auto card */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">
                  {t('themes.generationMode')}
                </label>
                <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3">
                  {/* Auto Generate card */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => !isSubmitting && form.setValue('autoGenerate', true)}
                    className={`flex flex-col items-start gap-1 rounded-lg border-2 p-4 text-left transition-all cursor-pointer outline-none focus:ring-2 focus:ring-ring ${
                      autoGenerate
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-foreground/30'
                    } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        form.setValue('autoGenerate', true);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0 w-full">
                      <Wand2
                        className={`h-4 w-4 shrink-0 ${autoGenerate ? 'text-primary' : 'text-muted-foreground'}`}
                      />
                      <span
                        className={`text-sm font-semibold min-w-0 wrap-break-word ${autoGenerate ? 'text-foreground' : 'text-foreground'}`}
                      >
                        {t('buttons.autoGenerate')}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{t('themes.autoGenerateDesc')}</p>

                    {/* Count picker — embedded in this card, only when active */}
                    {autoGenerate && (
                      <div
                        className="flex gap-1.5 mt-3 pt-2 border-t border-border w-full"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {CARD_COUNT_OPTIONS.map((n) => (
                          <button
                            key={n}
                            type="button"
                            disabled={isSubmitting}
                            onClick={(e) => {
                              e.stopPropagation();
                              form.setValue('cardCount', n);
                            }}
                            className={`flex-1 rounded py-1 text-xs font-bold transition-all cursor-pointer ${
                              cardCount === n
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-background text-muted-foreground border border-border hover:border-foreground/40'
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Manual card */}
                  <button
                    type="button"
                    onClick={() => form.setValue('autoGenerate', false)}
                    disabled={isSubmitting}
                    className={`flex flex-col items-start gap-1 rounded-lg border-2 p-4 text-left transition-all cursor-pointer ${
                      !autoGenerate
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-foreground/30'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 w-full">
                      <PenLine
                        className={`h-4 w-4 shrink-0 ${!autoGenerate ? 'text-primary' : 'text-muted-foreground'}`}
                      />
                      <span
                        className={`text-sm font-semibold min-w-0 wrap-break-word text-foreground`}
                      >
                        {t('buttons.manual')}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{t('themes.manualDesc')}</p>
                  </button>
                </div>
              </div>

              {/* 4. Description — optional, last */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('themes.description')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('themes.descriptionPlaceholder')}
                        rows={3}
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <Button
                  type="submit"
                  className="flex-1 h-auto whitespace-normal py-2 leading-snug"
                  disabled={isSubmitting || form.formState.isSubmitting}
                >
                  {isSubmitting
                    ? autoGenerate
                      ? t('buttons.generating')
                      : t('buttons.creating')
                    : autoGenerate
                      ? t('buttons.createAndGenerate')
                      : t('buttons.createTheme')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => router.back()}
                  disabled={isSubmitting}
                >
                  {t('buttons.cancel')}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
