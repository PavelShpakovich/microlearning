interface SectionHeaderProps {
  title: string;
  subtitle: string;
  /** Restricts subtitle width — use for narrower sections like FAQ / How It Works */
  narrow?: boolean;
}

export function SectionHeader({ title, subtitle, narrow }: SectionHeaderProps) {
  return (
    <div className="text-center mb-14">
      <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-balance">{title}</h2>
      <p
        className={`text-muted-foreground text-lg text-balance ${narrow ? '' : 'max-w-2xl mx-auto'}`}
      >
        {subtitle}
      </p>
    </div>
  );
}
