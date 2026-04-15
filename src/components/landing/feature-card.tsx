import type { LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  desc: string;
}

export function FeatureCard({ icon: Icon, title, desc }: FeatureCardProps) {
  return (
    <div className="group flex flex-col gap-4 rounded-2xl border border-border/60 bg-card p-6 transition-all duration-200 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20 group-hover:bg-primary/15 transition-colors">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <h3 className="font-semibold text-base text-balance">{title}</h3>
      </div>
      <p className="text-muted-foreground text-sm leading-relaxed text-balance">{desc}</p>
    </div>
  );
}
