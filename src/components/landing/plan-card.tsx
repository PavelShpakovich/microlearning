import Link from 'next/link';
import { Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FLAGS } from '@/lib/feature-flags';

const BOT_URL = process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL ?? 'https://t.me/clario_bot';

interface PlanCardProps {
  name: string;
  starsPrice: number; // 0 = free
  features: string[];
  popular: boolean;
  popularLabel: string;
  freeLabel: string;
  perMonth: string;
  cta: string;
}

export function PlanCard({
  name,
  starsPrice,
  features,
  popular,
  popularLabel,
  freeLabel,
  perMonth,
  cta,
}: PlanCardProps) {
  const isFree = starsPrice === 0;
  const priceDisplay = isFree ? freeLabel : starsPrice.toLocaleString();
  const priceSuffix = isFree ? null : '⭐';
  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-6 shadow-sm ${
        popular ? 'border-primary bg-primary/5 ring-2 ring-primary' : 'bg-card'
      }`}
    >
      {popular && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">{popularLabel}</Badge>
      )}
      <div className="mb-4">
        <p className="text-sm font-medium text-muted-foreground mb-1">{name}</p>
        <div className="flex items-end gap-1">
          <span className="text-4xl font-bold">{priceDisplay}</span>
          {priceSuffix && <span className="text-2xl font-bold pb-0.5">{priceSuffix}</span>}
          {!isFree && <span className="text-muted-foreground pb-1">{perMonth}</span>}
        </div>
      </div>
      <ul className="flex flex-col gap-2 mb-6 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm">
            <Check className="w-4 h-4 text-primary shrink-0" />
            {f}
          </li>
        ))}
      </ul>
      <Button asChild variant={popular ? 'default' : 'outline'} className="w-full">
        {FLAGS.WEB_AUTH_ENABLED ? (
          <Link href="/register">{cta}</Link>
        ) : (
          <a href={BOT_URL} target="_blank" rel="noopener noreferrer">
            {cta}
          </a>
        )}
      </Button>
    </div>
  );
}
