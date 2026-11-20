// Balance report: `npm run balance [-- count]`. Simulates many seeded runs with the auto-player.
import { simulateRun } from '../src/game/sim';

const count = Number(process.argv[2] ?? 200);
const results = Array.from({ length: count }, (_, i) => simulateRun(1000 + i));
const wins = results.filter((r) => r.won);
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const reasons = new Map<string, number>();
for (const r of results) if (!r.won) reasons.set(`${(r.reason ?? 'unknown').slice(0, 40)} @S${r.sector}`, (reasons.get(`${(r.reason ?? 'unknown').slice(0, 40)} @S${r.sector}`) ?? 0) + 1);
console.log(`runs: ${count}  win rate: ${((wins.length / count) * 100).toFixed(1)}%`);
console.log(`avg sector reached: ${avg(results.map((r) => r.sector)).toFixed(2)}`);
console.log(`avg est. minutes (wins): ${avg(wins.map((r) => r.estMinutes)).toFixed(1)}  (all): ${avg(results.map((r) => r.estMinutes)).toFixed(1)}`);
console.log(`avg combats: ${avg(results.map((r) => r.combats)).toFixed(1)}  avg combat s: ${avg(results.map((r) => r.combatSeconds / Math.max(1, r.combats))).toFixed(0)}`);
console.log(`avg jumps: ${avg(results.map((r) => r.jumps)).toFixed(1)}  avg final alert: ${avg(results.map((r) => r.run.res.alert)).toFixed(0)}`);
console.log('losses:', [...reasons.entries()].sort((a, b) => b[1] - a[1]));

const bySector = new Map<string, { n: number; hull: number; secs: number; wins: number }>();
for (const r of results) for (const f of r.fights) {
  const k = `S${f.sector} ${f.faction}`;
  const e = bySector.get(k) ?? { n: 0, hull: 0, secs: 0, wins: 0 };
  e.n++; e.hull += f.hullLost; e.secs += f.seconds; if (f.outcome === 'destroyed' || f.outcome === 'surrendered') e.wins++;
  bySector.set(k, e);
}
for (const [k, e] of [...bySector.entries()].sort()) console.log(k.padEnd(14), `n=${e.n}`.padEnd(7), `hull/fight=${(e.hull / e.n).toFixed(1)}`, `secs=${(e.secs / e.n).toFixed(0)}`, `win=${((e.wins / e.n) * 100).toFixed(0)}%`);
console.log('avg event hull loss/run', avg(results.map((r) => r.eventHull)).toFixed(1));
