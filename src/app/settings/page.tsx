import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const metadata = {
  title: 'Настройки',
  description: 'Управление астрологическим аккаунтом, предпочтениями и настройками приватности.',
};

export const dynamic = 'force-dynamic';

const db = supabaseAdmin;

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const [{ data: profile }, { data: preferences }, { data: authUserData }] = await Promise.all([
    db
      .from('profiles')
      .select(
        'display_name, locale, timezone, birth_data_consent_at, onboarding_completed_at, marketing_opt_in',
      )
      .eq('id', session.user.id)
      .maybeSingle(),
    db
      .from('user_preferences')
      .select(
        'tone_style, content_focus_love, content_focus_career, content_focus_growth, allow_spiritual_tone',
      )
      .eq('user_id', session.user.id)
      .maybeSingle(),
    supabaseAdmin.auth.admin.getUserById(session.user.id),
  ]);

  const authEmail = authUserData.user?.email ?? '';

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Настройки аккаунта
        </p>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Настройки аккаунта и предпочтений
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
          Управляйте профилем, согласием на данные рождения и предпочтениями, которые влияют на
          структуру и тон астрологических разборов.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Профиль</CardTitle>
            <CardDescription>
              Основные поля аккаунта и профиля, используемые новым продуктом.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Email:</span> {authEmail || 'Недоступно'}
            </p>
            <p>
              <span className="font-medium">Имя:</span>{' '}
              {profile?.display_name || session.user.name || 'Не задано'}
            </p>
            <p>
              <span className="font-medium">Локаль:</span> {profile?.locale || 'ru'}
            </p>
            <p>
              <span className="font-medium">Часовой пояс:</span> {profile?.timezone || 'Не задан'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Onboarding и приватность</CardTitle>
            <CardDescription>
              Состояние согласия на обработку данных рождения и маркетинг.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Onboarding завершён:</span>{' '}
              {profile?.onboarding_completed_at ? 'Да' : 'Нет'}
            </p>
            <p>
              <span className="font-medium">Согласие на данные рождения:</span>{' '}
              {profile?.birth_data_consent_at ? 'Зафиксировано' : 'Не зафиксировано'}
            </p>
            <p>
              <span className="font-medium">Маркетинговые уведомления:</span>{' '}
              {profile?.marketing_opt_in ? 'Включены' : 'Выключены'}
            </p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Предпочтения для разборов</CardTitle>
          <CardDescription>
            Здесь отображается новая модель астрологических предпочтений.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm md:grid-cols-2">
          <p>
            <span className="font-medium">Тон:</span> {preferences?.tone_style || 'balanced'}
          </p>
          <p>
            <span className="font-medium">Духовный тон:</span>{' '}
            {preferences?.allow_spiritual_tone ? 'Разрешён' : 'Выключен'}
          </p>
          <p>
            <span className="font-medium">Фокус на отношениях:</span>{' '}
            {preferences?.content_focus_love ? 'Включён' : 'Выключен'}
          </p>
          <p>
            <span className="font-medium">Фокус на карьере:</span>{' '}
            {preferences?.content_focus_career ? 'Включён' : 'Выключен'}
          </p>
          <p>
            <span className="font-medium">Фокус на росте:</span>{' '}
            {preferences?.content_focus_growth ? 'Включён' : 'Выключен'}
          </p>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button asChild>
          <Link href="/onboarding">Обновить данные карты</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/charts">Открыть карты</Link>
        </Button>
      </div>
    </main>
  );
}
