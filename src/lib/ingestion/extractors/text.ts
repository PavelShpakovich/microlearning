import type { Extractor, ExtractedContent, ExtractorInput } from '@/lib/ingestion/extractor';
import { ValidationError } from '@/lib/errors';

export class TextExtractor implements Extractor {
  async extract(input: ExtractorInput): Promise<ExtractedContent> {
    const text = input.content ?? '';
    if (!text.trim()) {
      throw new ValidationError({ message: 'Text source content is empty' });
    }
    return { text, charCount: text.length };
  }
}
