import type { IngestionError } from '@/lib/errors';

export interface ExtractedContent {
  text: string;
  /** Approximate character count of the extracted content. */
  charCount: number;
}

/** Contract every extractor must implement. */
export interface Extractor {
  extract(source: ExtractorInput): Promise<ExtractedContent>;
}

export interface ExtractorInput {
  /** Raw text (for type=text) or base64-encoded buffer (for files). */
  content?: string;
  /** Public URL (for type=url | youtube). */
  url?: string;
  /** Raw buffer (for type=pdf | docx). */
  buffer?: Buffer;
}
