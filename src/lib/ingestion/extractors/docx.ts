import type { Extractor, ExtractedContent, ExtractorInput } from '@/lib/ingestion/extractor';
import { IngestionError, ValidationError } from '@/lib/errors';

export class DocxExtractor implements Extractor {
  async extract(input: ExtractorInput): Promise<ExtractedContent> {
    if (!input.buffer) {
      throw new ValidationError({ message: 'DOCX extractor requires a buffer' });
    }

    const mammoth = await import('mammoth');

    let result: { value: string };
    try {
      result = await mammoth.extractRawText({ buffer: input.buffer });
    } catch (err) {
      throw new IngestionError({
        message: 'Failed to parse DOCX file',
        cause: err,
      });
    }

    const text = result.value.trim();
    if (!text) {
      throw new IngestionError({ message: 'DOCX contains no extractable text' });
    }

    return { text, charCount: text.length };
  }
}
