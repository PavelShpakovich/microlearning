'use client';

import Link from 'next/link';
import { Coins } from 'lucide-react';
import { useCredits } from '@/components/providers/credits-provider';
import { cn } from '@/lib/utils';

export function CreditBalance() {
  const { balance } = useCredits();

  if (balance === null) return null;

  return (
    <Link
      href="/store"
      className={cn(
        'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
        'bg-primary/10 text-primary hover:bg-primary/20',
      )}
      title="Кредиты"
    >
      <Coins className="size-3.5" />
      <span>{balance}</span>
    </Link>
  );
}
