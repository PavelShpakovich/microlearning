import { ValidationError } from '@/lib/errors';
import type { ExtractedContent, ExtractorInput } from '@/lib/ingestion/extractor';

type IngestionSourceType = 'text' | 'pdf' | 'docx' | 'url';

// ─── Barrel re-exports ────────────────────────────────────────────────────────
export type { ExtractedContent, ExtractorInput } from '@/lib/ingestion/extractor';

/**
 * Dispatches extraction to the correct extractor based on source type.
 * All extractors are lazy-loaded to avoid bundling heavy libs unnecessarily.
 */
export async function extractContent(
  type: IngestionSourceType,
  input: ExtractorInput,
): Promise<ExtractedContent> {
  switch (type) {
    case 'text': {
      const { TextExtractor } = await import('@/lib/ingestion/extractors/text');
      return new TextExtractor().extract(input);
    }
    case 'pdf': {
      const { PdfExtractor } = await import('@/lib/ingestion/extractors/pdf');
      return new PdfExtractor().extract(input);
    }
    case 'docx': {
      const { DocxExtractor } = await import('@/lib/ingestion/extractors/docx');
      return new DocxExtractor().extract(input);
    }
    case 'url': {
      const { UrlExtractor } = await import('@/lib/ingestion/extractors/url');
      return new UrlExtractor().extract(input);
    }
    default: {
      throw new ValidationError({
        message: `Unsupported data source type: ${String(type)}`,
      });
    }
  }
}
