'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { signIn } from 'next-auth/react';
import { z } from 'zod';
import Link from 'next/link';
import { toast } from 'sonner';

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
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/use-auth';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated, isLoading: sessionLoading } = useAuth();

  // Normalise callbackUrl: treat bare "/" as "/dashboard" to avoid the
  // root-redirect loop, and decode the value just once.
  const rawCallback = searchParams.get('callbackUrl') || '/dashboard';
  const callbackUrl = rawCallback === '/' ? '/dashboard' : rawCallback;

  // If the user is already authenticated, send them to the destination
  // immediately — prevents the login form flashing for logged-in users.
  useEffect(() => {
    if (isAuthenticated) {
      window.location.href = callbackUrl;
    }
  }, [isAuthenticated, callbackUrl]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: LoginFormValues) {
    try {
      setIsLoading(true);
      const result = await signIn('credentials', {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (!result?.ok) {
        toast.error(result?.error || t('auth.invalidCredentials'));
        return;
      }

      toast.success(t('auth.loginSuccess'));
      // Hard-navigate so the session cookie is fully committed before the
      // middleware processes the next request (soft navigation races with it).
      window.location.href = callbackUrl;
    } catch {
      toast.error(t('auth.error'));
    } finally {
      setIsLoading(false);
    }
  }

  // Don't render the form while we're checking the session or redirecting.
  if (sessionLoading || isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">{t('auth.loginTitle')}</CardTitle>
          <CardDescription>{t('auth.loginDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth.email')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('auth.emailPlaceholder')}
                        type="email"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth.password')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('auth.passwordPlaceholder')}
                        type="password"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t('auth.signingIn') : t('auth.signIn')}
              </Button>
            </form>
          </Form>

          <div className="mt-6 space-y-2 text-center text-sm">
            <p className="text-gray-600">
              {t('auth.noAccount')}{' '}
              <Link href="/register" className="font-semibold text-blue-600 hover:underline">
                {t('auth.signUpLink')}
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
