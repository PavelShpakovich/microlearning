import { Button } from '@/components/ui/button';

const BOT_URL = process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL ?? 'https://t.me/clario_bot';

interface HeroSectionProps {
  tagline: string;
  headline: string;
  subheadline: string;
  ctaGetStarted: string;
}

export function HeroSection({ tagline, headline, subheadline, ctaGetStarted }: HeroSectionProps) {
  return (
    <section className="flex flex-col items-center justify-center text-center px-4 py-24 sm:py-32 bg-linear-to-b from-background to-muted/30">
      <span className="inline-block mb-4 text-xs font-semibold tracking-widest uppercase text-primary">
        {tagline}
      </span>
      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight max-w-3xl mb-6 text-balance">
        {headline}
      </h1>
      <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mb-10 text-balance">
        {subheadline}
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Button size="lg" asChild>
          <a href={BOT_URL} target="_blank" rel="noopener noreferrer">
            {ctaGetStarted}
          </a>
        </Button>
      </div>
    </section>
  );
}
