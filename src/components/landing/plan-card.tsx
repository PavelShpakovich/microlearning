import Link from 'next/link';
import { Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface PlanCardProps {
  name: string;
  price: string;
  features: string[];
  popular: boolean;
  popularLabel: string;
  perMonth: string;
  cta: string;
}

export function PlanCard({
  name,
  price,
  features,
  popular,
  popularLabel,
  perMonth,
  cta,
}: PlanCardProps) {
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
          <span className="text-4xl font-bold">{price}</span>
          <span className="text-muted-foreground pb-1">{perMonth}</span>
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
        <Link href="/register">{cta}</Link>
      </Button>
    </div>
  );
}
