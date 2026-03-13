import type { LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  desc: string;
}

export function FeatureCard({ icon: Icon, title, desc }: FeatureCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-card p-6 shadow-sm">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <h3 className="font-semibold text-lg text-balance">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed text-balance">{desc}</p>
    </div>
  );
}
