import { UrlExtractor } from '@/lib/ingestion/extractors/url';
import { ValidationError } from '@/lib/errors';

describe('UrlExtractor — SSRF protection', () => {
  const extractor = new UrlExtractor();

  it.each([
    ['http://localhost/secret'],
    ['http://127.0.0.1/etc/passwd'],
    ['http://192.168.1.1/admin'],
    ['http://10.0.0.1/internal'],
    ['http://172.16.0.1/private'],
  ])('blocks private/reserved URL: %s', async (url) => {
    await expect(extractor.extract({ url })).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects non-http protocols', async () => {
    await expect(extractor.extract({ url: 'ftp://example.com/file' }))
      .rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects invalid URLs', async () => {
    await expect(extractor.extract({ url: 'not-a-url' }))
      .rejects.toBeInstanceOf(ValidationError);
  });

  it('requires a url', async () => {
    await expect(extractor.extract({}))
      .rejects.toBeInstanceOf(ValidationError);
  });
});
