interface StepItemProps {
  number: string;
  title: string;
  desc: string;
}

export function StepItem({ number, title, desc }: StepItemProps) {
  return (
    <div className="flex gap-6 items-start">
      <div className="w-12 h-12 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold">
        {number}
      </div>
      <div>
        <h3 className="font-semibold text-xl mb-1 text-balance">{title}</h3>
        <p className="text-muted-foreground leading-relaxed text-balance">{desc}</p>
      </div>
    </div>
  );
}
