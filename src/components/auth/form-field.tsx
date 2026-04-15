import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}

export function FormField({ id, label, error, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      <p
        id={`${id}-error`}
        aria-live="polite"
        className={cn(
          'h-4 truncate text-xs leading-4',
          error ? 'text-destructive' : 'select-none text-transparent',
        )}
      >
        {error || '\u00A0'}
      </p>
    </div>
  );
}
