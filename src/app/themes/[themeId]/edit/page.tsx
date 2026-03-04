'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CARD_COUNT_OPTIONS } from '@/lib/constants';
import {
  Upload,
  FileText,
  Link as LinkIcon,
  AlertCircle,
  Loader,
  Settings,
  Database,
  Trash2,
} from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { useSourceUpload } from '@/hooks/use-source-upload';
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
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmationDialog } from '@/components/common/confirmation-dialog';

interface EditThemePageProps {
  params: Promise<{ themeId: string }>;
}

const themeSchema = z.object({
  name: z.string().min(1, 'Theme name is required').max(100),
  description: z.string().max(500).optional(),
});

type ThemeFormValues = z.infer<typeof themeSchema>;

interface Theme {
  id: string;
  name: string;
  description?: string;
  language: 'en' | 'ru';
  is_public?: boolean;
}

export default function EditThemePage({ params }: EditThemePageProps) {
  const t = useTranslations();
  const { themeId } = use(params);
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { sources, isUploading, error, uploadText, uploadUrl, uploadFile } =
    useSourceUpload(themeId);

  // Theme & Form State
  const [theme, setTheme] = useState<Theme | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [themeToDelete, setThemeToDelete] = useState<Theme | null>(null);

  // Upload State
  const [textContent, setTextContent] = useState('');
  const [textName, setTextName] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [urlType, setUrlType] = useState<'url' | 'youtube'>('url');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [cardCount, setCardCount] = useState(10);
  const [isGenerating, setIsGenerating] = useState(false);

  const form = useForm<ThemeFormValues>({
    resolver: zodResolver(themeSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Fetch theme data
  useEffect(() => {
    const fetchTheme = async () => {
      try {
        const res = await fetch(`/api/themes/${themeId}`);
        if (res.ok) {
          const data = await res.json();
          setTheme(data.theme);
          form.reset({
            name: data.theme.name,
            description: data.theme.description || '',
          });
        } else {
          toast.error(t('messages.error'));
          router.push('/dashboard');
        }
      } catch (err) {
        console.error('Failed to fetch theme:', err);
        toast.error(t('messages.error'));
        router.push('/dashboard');
      }
    };
    if (themeId) {
      void fetchTheme();
    }
  }, [themeId, form, router, t]);

  // Handlers for Settings
  async function onSettingsSubmit(values: ThemeFormValues) {
    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/themes/${themeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name,
          description: values.description,
        }),
      });

      if (!response.ok) {
        throw new Error(t('messages.error'));
      }

      toast.success(t('messages.success'));
      // Update local state
      setTheme((prev) => (prev ? { ...prev, ...values } : null));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('messages.error'));
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleDeleteTheme = async () => {
    if (!themeToDelete) return;

    try {
      const res = await fetch(`/api/themes/${themeToDelete.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error(t('messages.failedDelete'));

      toast.success(t('messages.themeDeleted'));
      router.push('/dashboard');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('messages.failedDelete'));
    } finally {
      setThemeToDelete(null);
    }
  };

  // Handlers for Source Upload
  const handleTextSubmit = async () => {
    if (!textContent.trim()) {
      setLocalError(t('sources.emptyText'));
      return;
    }
    try {
      setLocalError(null);
      await uploadText(textContent, textName || 'Pasted Text');
      toast.success(t('sources.textUploadedSuccess'));
      setTextContent('');
      setTextName('');
    } catch (err) {
      toast.error(t('sources.uploadTextError'));
      setLocalError(err instanceof Error ? err.message : t('sources.uploadTextError'));
    }
  };

  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) {
      setLocalError(t('sources.emptyUrl'));
      return;
    }
    try {
      setLocalError(null);
      const name = `${urlType === 'youtube' ? 'YouTube' : 'Web'} Source`;
      await uploadUrl(urlInput, name);
      toast.success(t('sources.urlAddedSuccess'));
      setUrlInput('');
    } catch (err) {
      toast.error(t('sources.addUrlError'));
      setLocalError(err instanceof Error ? err.message : t('sources.addUrlError'));
    }
  };

  const handleFileSubmit = async () => {
    if (!selectedFile) {
      setLocalError(t('sources.emptyFile'));
      return;
    }
    try {
      setLocalError(null);
      await uploadFile(selectedFile);
      toast.success(t('sources.fileUploadedSuccess'));
      setSelectedFile(null);
    } catch (err) {
      toast.error(t('sources.uploadFileError'));
      setLocalError(err instanceof Error ? err.message : t('sources.uploadFileError'));
    }
  };

  const handleGenerateCards = async () => {
    const toastId = toast.loading(t('themes.generating'));
    try {
      setIsGenerating(true);
      const response = await fetch('/api/generate/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeId, count: cardCount }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string; message?: string };
        throw new Error(data.error || data.message || t('messages.error'));
      }

      toast.success(t('themes.success'), { id: toastId });
      router.push(`/study/${themeId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('themes.error'), { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return <Badge className="bg-green-100 text-green-800">{t('sources.statusReady')}</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800">{t('sources.statusProcessing')}</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800">{t('sources.statusError')}</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{t('sources.statusPending')}</Badge>;
    }
  };

  if (authLoading || !theme) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-6 md:py-10">
        <div className="mb-6 md:mb-8">
          <Skeleton className="h-4 w-32 mb-4" />
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-[400px] w-full" />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 md:py-10">
      <div className="mb-6 md:mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          {t('sources.backToDashboard')}
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold break-words">{theme.name}</h1>
            <p className="mt-2 text-sm md:text-base text-muted-foreground">
              {theme.description || t('sources.description')}
            </p>
          </div>
          {isGenerating ? (
            <Button disabled className="w-full sm:w-auto">
              <Loader className="mr-2 h-4 w-4 animate-spin" />
              {t('buttons.generating')}
            </Button>
          ) : (
            <Link href={`/study/${themeId}`} className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto">{t('sources.studyButton')}</Button>
            </Link>
          )}
        </div>
      </div>

      <Tabs defaultValue="content" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
          <TabsTrigger value="content" className="flex gap-2">
            <Database className="h-4 w-4" />
            {t('dashboard.sources')}
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex gap-2">
            <Settings className="h-4 w-4" />
            {t('navigation.settings')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-6">
          {(error || localError) && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">{error || localError}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Left Column: Upload */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('sources.uploadTitle')}</CardTitle>
                  <CardDescription>{t('sources.uploadDescription')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="text" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-4">
                      <TabsTrigger value="text" className="flex gap-2">
                        <FileText className="h-4 w-4" />
                        {t('sources.textTab')}
                      </TabsTrigger>
                      <TabsTrigger value="url" className="flex gap-2">
                        <LinkIcon className="h-4 w-4" />
                        {t('sources.linkTab')}
                      </TabsTrigger>
                      <TabsTrigger value="file" className="flex gap-2">
                        <Upload className="h-4 w-4" />
                        {t('sources.fileTab')}
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="text" className="space-y-4">
                      <div className="p-3 bg-muted rounded-lg border border-border text-sm text-muted-foreground">
                        {t('sourceLanguage.textLanguageHint', {
                          language:
                            theme.language === 'en' ? t('common.english') : t('common.russian'),
                        })}
                      </div>
                      <div>
                        <Label htmlFor="textName">{t('sources.sourceName')}</Label>
                        <Input
                          id="textName"
                          placeholder={t('sources.sourceNamePlaceholder')}
                          value={textName}
                          onChange={(e) => setTextName(e.target.value)}
                          disabled={isUploading}
                        />
                      </div>
                      <div>
                        <Label htmlFor="textContent">{t('sources.pasteText')}</Label>
                        <Textarea
                          id="textContent"
                          placeholder={t('sources.textPlaceholder')}
                          rows={8}
                          value={textContent}
                          onChange={(e) => setTextContent(e.target.value)}
                          disabled={isUploading}
                        />
                      </div>
                      <Button
                        onClick={handleTextSubmit}
                        disabled={isUploading || !textContent.trim()}
                        className="w-full"
                      >
                        {isUploading ? (
                          <>
                            <Loader className="mr-2 h-4 w-4 animate-spin" />
                            {t('sources.processing')}
                          </>
                        ) : (
                          t('sources.uploadText')
                        )}
                      </Button>
                    </TabsContent>

                    <TabsContent value="url" className="space-y-4">
                      <div className="p-3 bg-muted rounded-lg border border-border text-sm text-muted-foreground">
                        {urlType === 'youtube'
                          ? t('sourceLanguage.youtubeLanguageHint', {
                              language:
                                theme.language === 'en' ? t('common.english') : t('common.russian'),
                            })
                          : t('sourceLanguage.webLanguageHint', {
                              language:
                                theme.language === 'en' ? t('common.english') : t('common.russian'),
                            })}
                      </div>
                      <div>
                        <Label>{t('sources.sourceType')}</Label>
                        <div className="flex gap-4 mt-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              checked={urlType === 'url'}
                              onChange={() => setUrlType('url')}
                              disabled={isUploading}
                            />
                            <span className="text-sm">{t('sources.webPage')}</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              checked={urlType === 'youtube'}
                              onChange={() => setUrlType('youtube')}
                              disabled={isUploading}
                            />
                            <span className="text-sm">{t('sources.youtubeVideo')}</span>
                          </label>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="urlInput">
                          {urlType === 'youtube' ? t('sources.youtubeUrl') : t('sources.webUrl')}
                        </Label>
                        <Input
                          id="urlInput"
                          placeholder={
                            urlType === 'youtube'
                              ? t('sources.youtubeUrlPlaceholder')
                              : t('sources.webUrlPlaceholder')
                          }
                          value={urlInput}
                          onChange={(e) => setUrlInput(e.target.value)}
                          disabled={isUploading}
                        />
                        <p className="mt-2 text-xs text-muted-foreground">
                          {urlType === 'youtube' ? t('sources.youtubeHelp') : t('sources.webHelp')}
                        </p>
                      </div>
                      <Button
                        onClick={handleUrlSubmit}
                        disabled={isUploading || !urlInput.trim()}
                        className="w-full"
                      >
                        {isUploading ? (
                          <>
                            <Loader className="mr-2 h-4 w-4 animate-spin" />
                            {t('sources.processing')}
                          </>
                        ) : (
                          t('sources.addLink')
                        )}
                      </Button>
                    </TabsContent>

                    <TabsContent value="file" className="space-y-4">
                      <div className="p-3 bg-muted rounded-lg border border-border text-sm text-muted-foreground">
                        {t('sourceLanguage.noteText', {
                          language:
                            theme.language === 'en' ? t('common.english') : t('common.russian'),
                        })}
                      </div>
                      <div>
                        <Label htmlFor="file">{t('sources.selectFile')}</Label>
                        <div className="mt-2 border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-foreground/30 hover:bg-muted transition">
                          <input
                            id="file"
                            type="file"
                            accept=".pdf,.docx,.doc"
                            onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                            disabled={isUploading}
                            className="hidden"
                          />
                          <label htmlFor="file" className="cursor-pointer block">
                            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                            <p className="font-medium text-foreground">
                              {selectedFile ? selectedFile.name : t('sources.dragDrop')}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {t('sources.fileHelp')}
                            </p>
                          </label>
                        </div>
                      </div>
                      <Button
                        onClick={handleFileSubmit}
                        disabled={isUploading || !selectedFile}
                        className="w-full"
                      >
                        {isUploading ? (
                          <>
                            <Loader className="mr-2 h-4 w-4 animate-spin" />
                            {t('sources.processing')}
                          </>
                        ) : (
                          t('sources.uploadFile')
                        )}
                      </Button>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: List & Stats */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {t('sources.sourcesCount', { count: sources.length })}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {sources.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {t('sources.noSources')}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {sources.map((source) => (
                        <div
                          key={source.id}
                          className="flex items-start justify-between gap-2 p-2 rounded border border-border"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{source.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(source.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          {getStatusBadge(source.status)}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Card Generation */}
              <Card className="border-border bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-base">{t('themes.generateMore')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="mb-3 block">{t('themes.cardCount')}</Label>
                    <div className="flex gap-2">
                      {CARD_COUNT_OPTIONS.map((n) => (
                        <button
                          key={n}
                          onClick={() => setCardCount(n)}
                          disabled={isGenerating}
                          className={`flex-1 rounded-lg border-2 py-2 text-sm font-semibold transition-all cursor-pointer ${
                            cardCount === n
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button
                    onClick={() => void handleGenerateCards()}
                    disabled={isGenerating || sources.length === 0}
                    className="w-full"
                  >
                    {isGenerating
                      ? `${t('buttons.generating')} ${cardCount}...`
                      : `${t('buttons.createAndGenerate', { count: cardCount })}`}
                  </Button>
                  {sources.length === 0 && (
                    <p className="text-xs text-center text-muted-foreground mt-2">
                      {t('sources.noSources')}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>{t('navigation.settings')}</CardTitle>
              <CardDescription>{t('themes.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSettingsSubmit)} className="space-y-6">
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

                  <div className="space-y-2 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 text-sm text-blue-700 dark:text-blue-300">
                    <p>
                      <strong>{t('themes.language')}:</strong>{' '}
                      {theme.language === 'en' ? t('common.english') : t('common.russian')}
                    </p>
                    <p className="text-xs text-muted-foreground">{t('themes.languageLocked')}</p>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button
                      type="submit"
                      disabled={isSubmitting || form.formState.isSubmitting}
                      className="min-w-[120px]"
                    >
                      {isSubmitting ? t('buttons.saving') : t('buttons.save')}
                    </Button>
                  </div>
                </form>
              </Form>

              <div className="mt-10 pt-10 border-t border-gray-200 dark:border-gray-800">
                <h3 className="text-lg font-semibold text-red-600 mb-4">
                  {t('dialog.deleteTheme')}
                </h3>
                <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-200 dark:border-red-900 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-red-800 dark:text-red-300">
                    {t('dialog.deleteThemeDescription')}
                  </p>
                  <Button
                    variant="destructive"
                    onClick={() => setThemeToDelete(theme)}
                    className="shrink-0"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('buttons.delete')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ConfirmationDialog
        open={!!themeToDelete}
        onOpenChange={(open) => {
          if (!open) setThemeToDelete(null);
        }}
        onConfirm={() => void handleDeleteTheme()}
        title={t('dialog.deleteTheme')}
        description={t('dialog.deleteThemeDescription')}
        confirmLabel={t('dialog.delete')}
        cancelLabel={t('dialog.cancel')}
      />
    </main>
  );
}
