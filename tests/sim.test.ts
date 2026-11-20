// Quick-sim: the auto-player plays complete seeded runs through the real game logic.
import { simulateRun } from '../src/game/sim';
import { newRun, leaveSector } from '../src/game/run';
import { hopDistances, TOTAL_SECTORS } from '../src/game/map';

describe('quick-sim: complete runs', () => {
  it('every run terminates in a win or a loss (no soft-locks)', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const r = simulateRun(seed);
      expect(['won', 'lost'], `seed ${seed} stuck in ${r.run.phase}`).toContain(r.run.phase);
    }
  });

  it('at least some seeded runs are won by the simple bot (the game is beatable)', () => {
    const results = Array.from({ length: 120 }, (_, i) => simulateRun(5000 + i));
    const wins = results.filter((r) => r.won);
    expect(wins.length).toBeGreaterThan(0);
    for (const w of wins) {
      expect(w.sector).toBe(TOTAL_SECTORS);
      expect(w.run.stats.jumps).toBeGreaterThan(20);
    }
  });

  it('every sector map connects start -> exit, and the boss is reachable in sector 6', () => {
    for (let seed = 0; seed < 50; seed++) {
      const run = newRun(seed);
      for (let s = 1; s <= TOTAL_SECTORS; s++) {
        const d = hopDistances(run.map, run.map.startId);
        expect(d[run.map.exitId]).toBeGreaterThan(0);
        expect(d.every((x) => x >= 0)).toBe(true);
        if (s === TOTAL_SECTORS) {
          expect(run.map.nodes[run.map.exitId].type).toBe('boss');
        } else {
          run.current = run.map.exitId;
          run.phase = 'map';
          expect(leaveSector(run)).toBe(true);
          run.phase = 'map';
        }
      }
    }
  });

  it('a winning run takes a sensible amount of play time', () => {
    const wins = Array.from({ length: 150 }, (_, i) => simulateRun(8000 + i)).filter((r) => r.won);
    expect(wins.length).toBeGreaterThan(0);
    const avg = wins.reduce((s, r) => s + r.estMinutes, 0) / wins.length;
    // The bot plays at 1x with no pausing; humans take longer (target 20-30 min).
    expect(avg).toBeGreaterThan(12);
    expect(avg).toBeLessThan(35);
  });
});
