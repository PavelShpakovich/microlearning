import { Link } from '@/navigation';
import { Button } from '@/components/ui/button';

interface HeroSectionProps {
  tagline: string;
  headline: string;
  subheadline: string;
  ctaGetStarted: string;
  ctaLogin: string;
}

export function HeroSection({
  tagline,
  headline,
  subheadline,
  ctaGetStarted,
  ctaLogin,
}: HeroSectionProps) {
  return (
    <section className="relative flex flex-col items-center justify-center overflow-hidden text-center px-4 py-28 sm:py-36">
      {/* Deep cosmos radial glow background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 0%, oklch(0.28 0.08 268 / 55%) 0%, transparent 70%), radial-gradient(ellipse 50% 40% at 80% 80%, oklch(0.20 0.06 295 / 30%) 0%, transparent 60%)',
        }}
      />
      {/* Decorative star dots */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-40"
        xmlns="http://www.w3.org/2000/svg"
      >
        {[
          [8, 14],
          [15, 72],
          [22, 38],
          [35, 88],
          [42, 21],
          [55, 60],
          [63, 8],
          [70, 45],
          [78, 78],
          [85, 30],
          [92, 55],
          [50, 95],
          [28, 52],
          [60, 25],
        ].map(([cx, cy], i) => (
          <circle
            key={i}
            cx={`${cx}%`}
            cy={`${cy}%`}
            r={i % 3 === 0 ? '1.2' : '0.7'}
            fill="white"
            opacity={i % 4 === 0 ? '0.6' : '0.3'}
          />
        ))}
      </svg>

      <div className="relative z-10 flex flex-col items-center">
        {/* Tagline pill */}
        <div className="flex items-center gap-2 mb-6 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          <p className=" flex-1 text-xs font-semibold uppercase text-primary">{tagline}</p>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight max-w-3xl mb-6 text-balance leading-[1.1]">
          {headline}
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-xl mb-10 text-balance leading-relaxed">
          {subheadline}
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button size="lg" asChild className="px-8 shadow-lg shadow-primary/20">
            <Link href="/register">{ctaGetStarted}</Link>
          </Button>
          <Button size="lg" variant="outline" asChild className="px-8">
            <Link href="/login">{ctaLogin}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
