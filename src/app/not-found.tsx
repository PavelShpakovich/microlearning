import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LandingFooter } from '@/components/layout/landing-footer';

export const metadata = {
  title: '404 — Страница не найдена',
};

export default function NotFound() {
  return (
    <div className="flex flex-col flex-1">
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
        {/* Big number */}
        <p className="text-[8rem] sm:text-[12rem] font-black leading-none tracking-tighter text-primary/10 select-none">
          404
        </p>

        {/* Content — overlaid to tuck into the number visually */}
        <div className="-mt-6 sm:-mt-10 space-y-4 max-w-md">
          <h1 className="text-2xl sm:text-3xl font-bold">Страница не найдена</h1>
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
            Такой страницы не существует или она была перемещена. Проверьте адрес или вернитесь на
            главную.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button asChild size="lg">
              <Link href="/">На главную</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/dashboard">Мои темы</Link>
            </Button>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
