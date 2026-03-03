import { BLOCKED_IP_RANGES } from '@/lib/constants';
import type { Extractor, ExtractedContent, ExtractorInput } from '@/lib/ingestion/extractor';
import { IngestionError, ValidationError } from '@/lib/errors';

/** Validates URL is HTTP/HTTPS and not pointing at a private/internal IP (SSRF protection). */
function validateUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new ValidationError({ message: `Invalid URL: ${rawUrl}` });
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new ValidationError({ message: `URL must use HTTP or HTTPS, got: ${url.protocol}` });
  }

  const hostname = url.hostname;
  for (const pattern of BLOCKED_IP_RANGES) {
    if (pattern.test(hostname)) {
      throw new ValidationError({
        message: 'URL points to a private or reserved IP range (SSRF protection)',
        context: { hostname },
      });
    }
  }

  return url;
}

export class UrlExtractor implements Extractor {
  async extract(input: ExtractorInput): Promise<ExtractedContent> {
    if (!input.url) {
      throw new ValidationError({ message: 'URL extractor requires a url' });
    }

    const url = validateUrl(input.url);

    let html: string;
    try {
      const res = await fetch(url.toString(), {
        headers: { 'User-Agent': 'MicrolearningBot/1.0' },
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        throw new IngestionError({
          message: `Failed to fetch URL: ${res.status} ${res.statusText}`,
          context: { url: url.toString(), status: res.status },
        });
      }
      html = await res.text();
    } catch (err) {
      if (err instanceof IngestionError || err instanceof ValidationError) throw err;
      throw new IngestionError({
        message: 'Network error while fetching URL',
        cause: err,
        context: { url: url.toString() },
      });
    }

    const { load } = await import('cheerio');
    const $ = load(html);
    // Remove scripts, styles, and nav elements
    $('script, style, nav, header, footer, aside, noscript').remove();

    const text = $('body').text().replace(/\s+/g, ' ').trim();
    if (!text) {
      throw new IngestionError({ message: 'No readable text found at the provided URL' });
    }

    return { text, charCount: text.length };
  }
}
