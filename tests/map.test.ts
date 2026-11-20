import { Rng } from '../src/game/rng';
import { generateSector, hopDistances, isConnected, isOverrun, neighbors, TOTAL_SECTORS } from '../src/game/map';
import { EVENTS } from '../src/game/data/events';

const pool = EVENTS.map((e) => e.id);

describe('sector map generation', () => {
  it('always produces 8-12 nodes, connected, with start and exit', () => {
    for (let seed = 0; seed < 400; seed++) {
      for (let sector = 1; sector <= TOTAL_SECTORS; sector++) {
        const map = generateSector(sector, new Rng(seed * 31 + sector), { eventPool: [...pool] });
        expect(map.nodes.length).toBeGreaterThanOrEqual(8);
        expect(map.nodes.length).toBeLessThanOrEqual(12);
        expect(isConnected(map)).toBe(true);
        expect(map.nodes[map.startId].type).toBe('start');
        expect(map.nodes[map.exitId].type).toBe(sector === TOTAL_SECTORS ? 'boss' : 'exit');
        // exit reachable in at least (cols-1) hops: no shortcut from start to exit
        expect(hopDistances(map, map.startId)[map.exitId]).toBeGreaterThanOrEqual(map.cols - 1);
      }
    }
  });

  it('has at least one shop and two combat nodes per sector', () => {
    for (let seed = 0; seed < 100; seed++) {
      const map = generateSector(2, new Rng(seed), { eventPool: [...pool] });
      expect(map.nodes.filter((n) => n.type === 'shop').length).toBeGreaterThanOrEqual(1);
      expect(map.nodes.filter((n) => n.type === 'combat').length).toBeGreaterThanOrEqual(2);
    }
  });

  it('gives every node a forward branch (no dead ends before the exit)', () => {
    for (let seed = 0; seed < 100; seed++) {
      const map = generateSector(3, new Rng(seed), { eventPool: [...pool] });
      for (const n of map.nodes) {
        if (n.id === map.exitId) continue;
        expect(neighbors(map, n.id).some((m) => map.nodes[m].col === n.col + 1)).toBe(true);
      }
    }
  });

  it('assigns event ids only from the pool, and combat nodes get a faction', () => {
    const map = generateSector(1, new Rng(9), { eventPool: [...pool] });
    for (const n of map.nodes) {
      if (n.type === 'event') expect(pool).toContain(n.eventId);
      if (n.type === 'combat') expect(n.faction).toBe('kristang');
    }
  });

  it('is deterministic for the same seed', () => {
    const a = generateSector(4, new Rng(123), { eventPool: [...pool] });
    const b = generateSector(4, new Rng(123), { eventPool: [...pool] });
    expect(a).toEqual(b);
  });

  it('marks nodes behind the pursuit front as overrun, never the exit', () => {
    const map = generateSector(1, new Rng(3), { eventPool: [...pool] });
    map.pursuit = 2.5;
    for (const n of map.nodes) {
      if (n.id === map.exitId) expect(isOverrun(map, n.id)).toBe(false);
      else expect(isOverrun(map, n.id)).toBe(n.col < 2.5);
    }
  });
});
