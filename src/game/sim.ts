/**
 * Headless auto-player. Plays complete runs through the same pure logic the UI
 * uses. Used by tests ("a run can be completed") and for balance tuning.
 */
import { Rng } from './rng';
import type { SystemId } from './types';
import { hopDistances, isOverrun } from './map';
import {
  armStealth, atExit, availableChoices, buyItem, chooseEventOption, dismissResult, emergencySiphon,
  finishCombat, jumpTargets, jumpTo, leaveSector, leaveShop, newRun, payForAbility, startCombat,
  type RunState,
} from './run';
import {
  activateStealth, canActivateStealth, maxShieldLayers, setTarget, skippyFakeWormhole, skippyHack,
  tickCombat, type CombatState,
} from './combat';
import { canUseAbility } from './resources';
import { canBuy, priceOf } from './shop';
import { WEAPONS } from './data/ships';

export interface SimResult {
  seed: number;
  won: boolean;
  sector: number;
  reason?: string;
  jumps: number;
  combats: number;
  combatSeconds: number;
  /** Rough estimate of human play time in minutes. */
  estMinutes: number;
  run: RunState;
  fights: { sector: number; faction: string; hullLost: number; outcome: string; seconds: number }[];
  eventHull: number;
}

export interface SimOptions {
  /** Max decisions before aborting (guards against infinite loops). */
  maxSteps?: number;
  /** How the bot picks event choices. */
  eventPolicy?: 'random' | 'first';
}

function combatPolicy(run: RunState, c: CombatState): void {
  const e = c.enemy;
  const p = c.player;
  const dangerous = e.faction === 'maxolhx';
  // Escape from hopeless fights.
  if (c.canFlee && (dangerous || (p.hull < p.maxHull * 0.3 && e.hull > e.maxHull * 0.5))) {
    if (!c.skippyUsed.fake && canUseAbility(run.res.mood, 'fake') && payForAbility(run, 'fake')) {
      skippyFakeWormhole(c);
      return;
    }
    if (p.jumpCharge >= 1) {
      c.outcome = 'fled';
      return;
    }
  }
  // Hack strong shields once.
  if (!c.skippyUsed.hack && maxShieldLayers(e) >= 2 && canUseAbility(run.res.mood, 'hack') && payForAbility(run, 'hack')) {
    skippyHack(c);
  }
  if (canActivateStealth(p) && c.projectiles.some((pr) => pr.from === 'enemy')) activateStealth(c);
  // Targeting: knock out the uplink at the relay, else shields if they're thick, else weapons.
  let target: SystemId = 'weapons';
  if (c.isBoss && c.uplink > 0.5) target = 'jump';
  else if (maxShieldLayers(e) >= 2 && e.systems.shields.damage < 2) target = 'shields';
  setTarget(c, 'all', target);
}

type Stats = { combats: number; combatSeconds: number; fights: SimResult['fights'] };

function runCombat(run: RunState, stats: Stats): void {
  const hullBefore = run.res.hull;
  const faction = run.pendingCombat?.faction ?? '?';
  const c = startCombat(run);
  if (!c) throw new Error('combat expected');
  const rng = new Rng(0);
  rng.state = run.rngState;
  stats.combats++;
  let t = 0;
  while (!c.outcome && t < 900) {
    combatPolicy(run, c);
    if (c.outcome) break;
    tickCombat(c, 0.1, rng);
    t += 0.1;
  }
  if (!c.outcome) c.outcome = 'lost';
  run.rngState = rng.state;
  stats.combatSeconds += t;
  finishCombat(run, c);
  stats.fights.push({ sector: run.sector, faction, hullLost: hullBefore - c.player.hull, outcome: c.outcome, seconds: Math.round(t) });
}

function shopPolicy(run: RunState): void {
  const shop = run.shop ?? [];
  const tryBuy = (id: string) => {
    const it = shop.find((i) => i.id === id);
    return !!it && canBuy(it, run.res, run.loadout, run.sector).ok && buyItem(run, id);
  };
  let guard = 0;
  while (guard++ < 40) {
    let bought = false;
    if (run.res.hull < run.res.maxHull * 0.75) bought = tryBuy('repair');
    if (!bought && run.res.fuel < 4) bought = tryBuy('fuel');
    if (!bought && run.res.missiles < 3) bought = tryBuy('missiles');
    if (!bought && run.res.mood < 50) bought = tryBuy('mood');
    if (!bought) {
      // Upgrades: shields in pairs, a third/fourth gun, weapons capacity, reactor to power it all, engines.
      const L = run.loadout;
      const need = L.weapons.reduce((s, w) => s + WEAPONS[w].power, 0);
      const wantPower = L.systems.shields + need + L.systems.engines + L.systems.jump;
      const order: string[] = [];
      const weaponIds = shop.filter((i) => i.kind === 'weapon' && i.weapon !== 'missile').map((i) => i.id);
      if (L.systems.shields % 2 === 1) order.push('sys-shields');
      if (L.weapons.length < 3) order.push(...weaponIds);
      if (L.systems.weapons < need) order.push('sys-weapons');
      if (L.reactor < wantPower) order.push('reactor');
      if (L.systems.shields < 4) order.push('sys-shields');
      if (run.sector >= 3) order.push('armor');
      if (L.weapons.length < 4) order.push(...weaponIds);
      if (L.systems.shields < 6) order.push('sys-shields');
      if (L.systems.engines < 4) order.push('sys-engines');
      order.push('reactor', 'sys-shields', 'sys-engines', 'sys-jump');
      for (const id of order) {
        const it = shop.find((i) => i.id === id);
        // Keep a small reserve for fuel.
        if (it && run.res.scrap - priceOf(it, run.loadout, run.sector) >= 6 && tryBuy(id)) { bought = true; break; }
      }
    }
    if (!bought) break;
  }
  leaveShop(run);
}

function mapPolicy(run: RunState, rng: Rng): void {
  if (atExit(run)) {
    leaveSector(run);
    return;
  }
  if (run.res.fuel <= 0) {
    emergencySiphon(run);
    return;
  }
  if (run.res.mood >= 80 && run.res.alert >= 40 && !run.stealthArmed) armStealth(run);
  const dist = hopDistances(run.map, run.map.exitId);
  const here = dist[run.current];
  const options = jumpTargets(run);
  // Score each neighbour: progress toward the exit matters most; detour for loot if the front allows.
  const scored = options.map((id) => {
    const n = run.map.nodes[id];
    let score = (here - dist[id]) * 10;
    if (isOverrun(run.map, id)) score -= 30;
    if (!n.visited) {
      if (n.type === 'shop') score += run.res.scrap >= 25 || run.res.hull < run.res.maxHull * 0.5 ? 16 : 2;
      if (n.type === 'event') score += 6;
      if (n.type === 'combat') score += run.res.hull > run.res.maxHull * 0.45 ? 9 : -5;
    }
    if (n.col <= run.map.pursuit + 1) score -= 8;
    score += rng.next() * 3;
    return { id, score };
  });
  scored.sort((a, b) => b.score - a.score);
  jumpTo(run, scored[0].id);
}

export function simulateRun(seed: number, opts: SimOptions = {}): SimResult {
  const run = newRun(seed);
  const botRng = new Rng(seed ^ 0x9e3779b9);
  const stats: Stats = { combats: 0, combatSeconds: 0, fights: [] };
  let eventHull = 0;
  let events = 0;
  let shops = 0;
  const maxSteps = opts.maxSteps ?? 2000;
  for (let step = 0; step < maxSteps; step++) {
    if (run.phase === 'won' || run.phase === 'lost') break;
    switch (run.phase) {
      case 'map':
        mapPolicy(run, botRng);
        break;
      case 'event': {
        events++;
        const avail = availableChoices(run).map((ok, i) => (ok ? i : -1)).filter((i) => i >= 0);
        const pick = opts.eventPolicy === 'first' ? avail[0] : botRng.pick(avail);
        if (pick === undefined) throw new Error(`event ${run.eventId} has no available choice`);
        const before = run.res.hull;
        chooseEventOption(run, pick);
        eventHull += before - run.res.hull;
        break;
      }
      case 'result':
        dismissResult(run);
        break;
      case 'combat':
        runCombat(run, stats);
        break;
      case 'shop':
        shops++;
        shopPolicy(run);
        break;
    }
  }
  const estMinutes = (stats.combatSeconds * 1.3 + events * 30 + run.stats.jumps * 8 + shops * 30) / 60;
  return {
    seed,
    won: run.phase === 'won',
    sector: run.sector,
    reason: run.lossReason,
    jumps: run.stats.jumps,
    combats: stats.combats,
    combatSeconds: Math.round(stats.combatSeconds),
    estMinutes: Math.round(estMinutes * 10) / 10,
    run,
    fights: stats.fights,
    eventHull,
  };
}
