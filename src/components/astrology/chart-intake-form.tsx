'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { chartsApi } from '@/services/charts-api';

const subjectOptions = [
  { value: 'self', label: 'Моя карта' },
  { value: 'partner', label: 'Партнёр' },
  { value: 'child', label: 'Ребёнок' },
  { value: 'client', label: 'Клиент' },
  { value: 'other', label: 'Другое' },
] as const;

const houseSystemOptions = [
  { value: 'placidus', label: 'Placidus' },
  { value: 'whole_sign', label: 'Целый знак' },
  { value: 'koch', label: 'Koch' },
  { value: 'equal', label: 'Равнодомная' },
] as const;

export function ChartIntakeForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [birthTimeKnown, setBirthTimeKnown] = useState(true);
  const [form, setForm] = useState({
    label: '',
    personName: '',
    subjectType: 'self',
    birthDate: '',
    birthTime: '',
    city: '',
    country: '',
    timezone: '',
    houseSystem: 'placidus',
    notes: '',
  });

  const update = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      try {
        await chartsApi.createChart({
          label: form.label,
          personName: form.personName,
          subjectType: form.subjectType as 'self' | 'partner' | 'child' | 'client' | 'other',
          birthDate: form.birthDate,
          birthTime: birthTimeKnown ? form.birthTime : undefined,
          birthTimeKnown,
          city: form.city,
          country: form.country,
          timezone: form.timezone || undefined,
          houseSystem: form.houseSystem as 'placidus' | 'whole_sign' | 'koch' | 'equal',
          notes: form.notes || undefined,
          locale: 'ru',
        });

        toast.success(
          'Карта создана. Теперь расчёт натальной карты является основным пользовательским потоком.',
        );
        router.push('/charts');
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Не удалось создать карту');
      }
    });
  };

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Onboarding
        </p>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Создайте первую астрологическую карту
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
          Эта форма заменяет старое создание тем. Сначала мы сохраняем структурированные данные
          рождения, затем рассчитываем карту и строим разборы на её основе.
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Данные рождения</CardTitle>
          <CardDescription>
            Неизвестное время рождения поддерживается, но часть разборов будет ограничена, пока
            детерминированный астрологический движок не подключён полностью.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-5" onSubmit={submit}>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="label">Название карты</Label>
                <Input
                  id="label"
                  value={form.label}
                  onChange={(event) => update('label', event.target.value)}
                  placeholder="Натальная карта Анны"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="personName">Имя человека</Label>
                <Input
                  id="personName"
                  value={form.personName}
                  onChange={(event) => update('personName', event.target.value)}
                  placeholder="Anna"
                  required
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Тип карты</Label>
                <Select
                  value={form.subjectType}
                  onValueChange={(value) => update('subjectType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите тип карты" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjectOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Система домов</Label>
                <Select
                  value={form.houseSystem}
                  onValueChange={(value) => update('houseSystem', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите систему домов" />
                  </SelectTrigger>
                  <SelectContent>
                    {houseSystemOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="birthDate">Дата рождения</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={form.birthDate}
                  onChange={(event) => update('birthDate', event.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="birthTime">Время рождения</Label>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                    onClick={() => setBirthTimeKnown((value) => !value)}
                  >
                    {birthTimeKnown ? 'Я не знаю точное время' : 'Я знаю точное время'}
                  </button>
                </div>
                <Input
                  id="birthTime"
                  type="time"
                  value={form.birthTime}
                  onChange={(event) => update('birthTime', event.target.value)}
                  disabled={!birthTimeKnown}
                  required={birthTimeKnown}
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="city">Город</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(event) => update('city', event.target.value)}
                  placeholder="Minsk"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="country">Страна</Label>
                <Input
                  id="country"
                  value={form.country}
                  onChange={(event) => update('country', event.target.value)}
                  placeholder="Беларусь"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="timezone">Часовой пояс</Label>
                <Input
                  id="timezone"
                  value={form.timezone}
                  onChange={(event) => update('timezone', event.target.value)}
                  placeholder="Europe/Minsk"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Контекст и заметки</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(event) => update('notes', event.target.value)}
                placeholder="Необязательный контекст для будущих разборов, например фокус на отношениях или текущий жизненный этап"
                rows={4}
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Создаём карту...' : 'Создать карту'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
