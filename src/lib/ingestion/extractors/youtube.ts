import type { Extractor, ExtractedContent, ExtractorInput } from '@/lib/ingestion/extractor';
import { IngestionError, ValidationError } from '@/lib/errors';

const YOUTUBE_ID_REGEX =
  /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;

function extractVideoId(url: string): string {
  const match = YOUTUBE_ID_REGEX.exec(url);
  if (!match?.[1]) {
    throw new ValidationError({
      message: 'Could not extract YouTube video ID from the provided URL',
      context: { url },
    });
  }
  return match[1];
}

export class YoutubeExtractor implements Extractor {
  async extract(input: ExtractorInput): Promise<ExtractedContent> {
    if (!input.url) {
      throw new ValidationError({ message: 'YouTube extractor requires a url' });
    }

    const videoId = extractVideoId(input.url);

    // Dynamic import — youtube-transcript is a server-only lib
    const { YoutubeTranscript } = await import('youtube-transcript');

    let segments: Array<{ text: string }>;
    try {
      segments = await YoutubeTranscript.fetchTranscript(videoId);
    } catch (err) {
      throw new IngestionError({
        message: 'Failed to fetch YouTube transcript — captions may be disabled for this video',
        cause: err,
        context: { videoId },
      });
    }

    const text = segments
      .map((s) => s.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!text) {
      throw new IngestionError({ message: 'YouTube transcript is empty' });
    }

    return { text, charCount: text.length };
  }
}
