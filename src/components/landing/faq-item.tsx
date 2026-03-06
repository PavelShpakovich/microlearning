import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface FaqItemProps {
  value: string;
  question: string;
  answer: string;
}

export function FaqItem({ value, question, answer }: FaqItemProps) {
  return (
    <AccordionItem value={value} className="rounded-xl border bg-card px-4">
      <AccordionTrigger className="text-left font-medium py-4">{question}</AccordionTrigger>
      <AccordionContent className="text-muted-foreground pb-4 leading-relaxed">
        {answer}
      </AccordionContent>
    </AccordionItem>
  );
}
