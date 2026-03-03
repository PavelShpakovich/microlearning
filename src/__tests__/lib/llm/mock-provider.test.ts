import { MockProvider } from '@/lib/llm/providers/mock';

describe('MockProvider', () => {
  it('returns exactly count cards', async () => {
    const provider = new MockProvider();
    const cards = await provider.generate({ theme: 'React hooks', count: 5 });
    expect(cards).toHaveLength(5);
  });

  it('includes title and body in each card', async () => {
    const provider = new MockProvider();
    const cards = await provider.generate({ theme: 'Next.js', count: 3 });
    for (const card of cards) {
      expect(card.title).toBeDefined();
      expect(card.title.length).toBeGreaterThan(0);
      expect(card.body).toBeDefined();
      expect(card.body.length).toBeGreaterThan(0);
    }
  });

  it('returns 1 card when count is 1', async () => {
    const provider = new MockProvider();
    const cards = await provider.generate({ theme: 'SQL', count: 1 });
    expect(cards).toHaveLength(1);
  });
});
