import { cn } from '@/lib/utils';

describe('cn (Tailwind class merge helper)', () => {
  it('returns a single class unchanged', () => {
    expect(cn('flex')).toBe('flex');
  });

  it('merges multiple classes', () => {
    expect(cn('flex', 'items-center')).toBe('flex items-center');
  });

  it('resolves conflicting Tailwind utilities (last wins)', () => {
    // tailwind-merge: p-4 and p-2 → last one wins
    expect(cn('p-4', 'p-2')).toBe('p-2');
  });

  it('ignores falsy values', () => {
    // tailwind-merge keeps non-conflicting classes; flex + block conflict (display utilities),
    // so 'block' wins. Test with non-conflicting classes instead.
    expect(cn('text-sm', false, undefined, null, 'font-bold')).toBe('text-sm font-bold');
  });

  it('handles conditional object syntax', () => {
    expect(cn({ 'text-red-500': true, 'text-blue-500': false })).toBe('text-red-500');
  });

  it('handles array inputs', () => {
    expect(cn(['flex', 'gap-2'])).toBe('flex gap-2');
  });

  it('returns empty string for no inputs', () => {
    expect(cn()).toBe('');
  });
});
