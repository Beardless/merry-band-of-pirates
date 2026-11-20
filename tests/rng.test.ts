import { Rng, hashSeed } from '../src/game/rng';

describe('Rng', () => {
  it('is deterministic for a seed', () => {
    const a = new Rng(42);
    const b = new Rng(42);
    const xs = Array.from({ length: 20 }, () => a.next());
    const ys = Array.from({ length: 20 }, () => b.next());
    expect(xs).toEqual(ys);
  });

  it('resumes from a saved state', () => {
    const a = new Rng(7);
    a.next(); a.next();
    const saved = a.state;
    const expected = a.next();
    const b = new Rng(0);
    b.state = saved;
    expect(b.next()).toBe(expected);
  });

  it('int stays within bounds and covers the range', () => {
    const r = new Rng(1);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) {
      const v = r.int(3, 6);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(6);
      seen.add(v);
    }
    expect(seen.size).toBe(4);
  });

  it('weighted never picks zero-weight items', () => {
    const r = new Rng(5);
    for (let i = 0; i < 200; i++) expect(r.weighted(['a', 'b'], (x) => (x === 'a' ? 0 : 1))).toBe('b');
  });

  it('hashSeed is stable', () => {
    expect(hashSeed('skippy')).toBe(hashSeed('skippy'));
    expect(hashSeed('skippy')).not.toBe(hashSeed('joe'));
  });
});
