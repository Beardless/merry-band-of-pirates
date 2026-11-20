/**
 * Run state machine: map navigation, encounters, events, combat results,
 * shops and Skippy's out-of-combat abilities. Pure – the UI only reads the
 * state and calls these functions.
 */
import { Rng } from './rng';
import type { DialogueLine, EventOutcome, Faction, GameEvent, ResourceDelta, Resources, SectorMap, ShipLoadout } from './types';
import { generateSector, hopDistances, isOverrun, neighbors, pursuitFaction, TOTAL_SECTORS } from './map';
import { ABILITIES, START_RESOURCES, applyDelta, canUseAbility, meetsRequirements } from './resources';
import { START_LOADOUT, SYSTEM_MAX, REACTOR_MAX, WEAPONS, makeEnemy } from './data/ships';
import { EVENTS } from './data/events';
import { generateShop, buy, type ShopItem } from './shop';
import { createCombat, type CombatState } from './combat';

export const SAVE_VERSION = 1;

export type Phase = 'map' | 'event' | 'result' | 'combat' | 'shop' | 'won' | 'lost';

export interface RunStats {
  jumps: number;
  shipsDestroyed: number;
  surrenders: number;
  escapes: number;
  eventsSeen: number;
  scrapEarned: number;
  crewLost: number;
  playSeconds: number;
}

export interface PendingCombat {
  faction: Faction;
  isBoss: boolean;
  pursuit: boolean;
}

/** A message panel shown on the map / after events and fights. */
export interface ResultPanel {
  title: string;
  lines: DialogueLine[];
  applied: ResourceDelta;
  extras: string[];
}

export interface RunState {
  version: number;
  seed: number;
  rngState: number;
  sector: number;
  map: SectorMap;
  current: number;
  res: Resources;
  loadout: ShipLoadout;
  stats: RunStats;
  usedEvents: string[];
  phase: Phase;
  eventId?: string;
  pendingCombat?: PendingCombat;
  result?: ResultPanel;
  shop?: ShopItem[];
  /** Shop inventories by node id for the current sector, so revisits keep stock. */
  shops: Record<number, ShopItem[]>;
  stealthArmed: boolean;
  lossReason?: string;
  /** Last Skippy remark to show on the map. */
  bark?: string;
}

export function eventById(id: string): GameEvent | undefined {
  return EVENTS.find((e) => e.id === id);
}

function eventPoolFor(sector: number, used: string[]): string[] {
  const fits = EVENTS.filter((e) => (e.minSector ?? 1) <= sector && (e.maxSector ?? TOTAL_SECTORS) >= sector);
  const fresh = fits.filter((e) => !used.includes(e.id)).map((e) => e.id);
  // If we're running low on unseen events, allow repeats rather than empty beacons.
  return fresh.length >= 5 ? fresh : fits.map((e) => e.id);
}

function withRng<T>(run: RunState, fn: (rng: Rng) => T): T {
  const rng = new Rng(0);
  rng.state = run.rngState;
  const out = fn(rng);
  run.rngState = rng.state;
  return out;
}

function buildSector(run: RunState, index: number): SectorMap {
  return withRng(run, (rng) => {
    const map = generateSector(index, rng, { eventPool: eventPoolFor(index, run.usedEvents) });
    for (const n of map.nodes) if (n.eventId) run.usedEvents.push(n.eventId);
    return map;
  });
}

export function newRun(seed: number): RunState {
  const run: RunState = {
    version: SAVE_VERSION,
    seed: seed >>> 0,
    rngState: seed >>> 0,
    sector: 1,
    map: undefined as unknown as SectorMap,
    current: 0,
    res: { ...START_RESOURCES },
    loadout: { reactor: START_LOADOUT.reactor, systems: { ...START_LOADOUT.systems }, weapons: [...START_LOADOUT.weapons] },
    stats: { jumps: 0, shipsDestroyed: 0, surrenders: 0, escapes: 0, eventsSeen: 0, scrapEarned: 0, crewLost: 0, playSeconds: 0 },
    usedEvents: [],
    phase: 'map',
    shops: {},
    stealthArmed: false,
  };
  run.map = buildSector(run, 1);
  run.current = run.map.startId;
  return run;
}

// ------------------------------------------------------------ queries

export function isOver(run: RunState): boolean {
  return run.phase === 'won' || run.phase === 'lost';
}

export function jumpTargets(run: RunState): number[] {
  return neighbors(run.map, run.current);
}

export function canJumpTo(run: RunState, nodeId: number): boolean {
  if (run.phase !== 'map') return false;
  if (!jumpTargets(run).includes(nodeId)) return false;
  return run.res.fuel > 0;
}

/** Nodes reachable with Skippy's fake wormhole (within two hops, not the current node). */
export function fakeWormholeTargets(run: RunState): number[] {
  const d = hopDistances(run.map, run.current);
  return run.map.nodes.filter((n) => d[n.id] >= 1 && d[n.id] <= 2).map((n) => n.id);
}

export function atExit(run: RunState): boolean {
  return run.current === run.map.exitId && run.map.nodes[run.current].type === 'exit';
}

/** True when the sulking Skippy refuses to scan beacons. */
export function scannerOffline(run: RunState): boolean {
  return run.res.mood < 25;
}

export function alertGainPerJump(run: RunState): number {
  return 2 + (run.sector >= 4 ? 1 : 0);
}

// ------------------------------------------------------------ loss checks

export function checkLoss(run: RunState): boolean {
  if (isOver(run)) return true;
  let reason: string | undefined;
  if (run.res.hull <= 0) reason = 'The Flying Dutchman broke apart. Skippy was last seen drifting away, complaining.';
  else if (run.res.crew <= 0) reason = 'No crew left to fly the ship. Skippy cannot run it alone (he says he could, he just will not).';
  else if (run.res.alert >= 100) reason = 'The Alien Alert hit 100%. The relay network spread the word: the humans have a starship.';
  if (reason) {
    run.phase = 'lost';
    run.lossReason = reason;
    return true;
  }
  return false;
}

// ------------------------------------------------------------ jumping

export interface JumpOptions {
  /** Fake wormhole: no fuel, no alert, no pursuit advance; may skip a hop. */
  fake?: boolean;
}

export function jumpTo(run: RunState, nodeId: number, opts: JumpOptions = {}): boolean {
  if (run.phase !== 'map') return false;
  if (opts.fake) {
    if (!fakeWormholeTargets(run).includes(nodeId)) return false;
  } else if (!canJumpTo(run, nodeId)) return false;

  const stealthy = run.stealthArmed || !!opts.fake;
  if (!opts.fake) run.res.fuel -= 1;
  run.stats.jumps++;
  run.current = nodeId;
  run.result = undefined;
  run.bark = undefined;
  if (!stealthy) {
    applyDelta(run.res, { alert: alertGainPerJump(run) });
    run.map.pursuit += 0.7 + (run.res.alert >= 50 ? 0.2 : 0);
  }
  run.stealthArmed = false;
  // Skippy gets bored on long trips.
  if (run.res.mood > 40 && run.stats.jumps % 2 === 0) applyDelta(run.res, { mood: -1 });
  if (checkLoss(run)) return true;
  enterNode(run, stealthy);
  return true;
}

function enterNode(run: RunState, stealthy: boolean): void {
  const node = run.map.nodes[run.current];
  const firstVisit = !node.visited;
  node.visited = true;

  if (isOverrun(run.map, node.id)) {
    const slip = stealthy && withRng(run, (r) => r.chance(0.5));
    if (!slip) {
      run.pendingCombat = { faction: pursuitFaction(run.sector), isBoss: false, pursuit: true };
      applyDelta(run.res, { alert: 3 });
      run.phase = 'combat';
      return;
    }
  }
  if (node.type === 'boss') {
    run.pendingCombat = { faction: 'relay', isBoss: true, pursuit: false };
    run.phase = 'combat';
    return;
  }
  if (!firstVisit) {
    run.phase = 'map';
    return;
  }
  switch (node.type) {
    case 'event':
      if (node.eventId && eventById(node.eventId)) {
        run.eventId = node.eventId;
        run.phase = 'event';
        run.stats.eventsSeen++;
      } else run.phase = 'map';
      return;
    case 'combat': {
      if (stealthy && withRng(run, (r) => r.chance(0.5))) {
        run.result = {
          title: 'Slipped past',
          lines: [{ speaker: 'skippy', text: 'A hostile ship is right there and it has no idea we exist. You are welcome, monkeys.' }],
          applied: {}, extras: [],
        };
        run.phase = 'result';
        return;
      }
      run.pendingCombat = { faction: node.faction ?? 'kristang', isBoss: false, pursuit: false };
      run.phase = 'combat';
      return;
    }
    case 'shop':
      if (!run.shops[node.id]) run.shops[node.id] = withRng(run, (r) => generateShop(r, run.sector));
      run.shop = run.shops[node.id];
      run.phase = 'shop';
      return;
    case 'empty': {
      const find = withRng(run, (r) => (r.chance(0.35) ? r.int(3, 9) : 0));
      if (find > 0) {
        const applied = applyDelta(run.res, { scrap: find });
        run.stats.scrapEarned += find;
        run.result = {
          title: 'Drifting debris',
          lines: [{ speaker: 'narrator', text: 'The beacon is quiet. A cloud of old wreckage drifts nearby; the crew scoops up what they can.' }],
          applied, extras: [],
        };
        run.phase = 'result';
      } else run.phase = 'map';
      return;
    }
    default:
      run.phase = 'map';
  }
}

/** Revisit the shop at the current node from the map. */
export function openShop(run: RunState): boolean {
  if (run.phase !== 'map') return false;
  const shop = run.shops[run.current];
  if (!shop) return false;
  run.shop = shop;
  run.phase = 'shop';
  return true;
}

export function leaveShop(run: RunState): void {
  if (run.phase === 'shop') run.phase = 'map';
}

export function buyItem(run: RunState, itemId: string): boolean {
  if (run.phase !== 'shop' || !run.shop) return false;
  const item = run.shop.find((i) => i.id === itemId);
  if (!item) return false;
  return buy(item, run.res, run.loadout, run.sector);
}

// ------------------------------------------------------------ events

export function availableChoices(run: RunState): boolean[] {
  const ev = run.eventId ? eventById(run.eventId) : undefined;
  if (!ev) return [];
  return ev.choices.map((c) => meetsRequirements(run.res, c.requires));
}

function applyOutcome(run: RunState, out: EventOutcome): ResultPanel {
  const extras: string[] = [];
  const applied = applyDelta(run.res, out.effects ?? {});
  if (applied.scrap && applied.scrap > 0) run.stats.scrapEarned += applied.scrap;
  if (applied.crew && applied.crew < 0) run.stats.crewLost -= applied.crew;
  if (out.upgradeSystem) {
    const s = out.upgradeSystem;
    if (run.loadout.systems[s] < SYSTEM_MAX[s]) {
      run.loadout.systems[s]++;
      extras.push(`${s[0].toUpperCase()}${s.slice(1)} system upgraded to level ${run.loadout.systems[s]}.`);
    } else {
      applyDelta(run.res, { scrap: 15 });
      extras.push('System already maxed: salvaged for 15 scrap instead.');
    }
  }
  if (out.weapon) {
    if (run.loadout.weapons.length < 4) {
      run.loadout.weapons.push(out.weapon);
      extras.push(`New weapon installed: ${WEAPONS[out.weapon].name}.`);
    } else {
      applyDelta(run.res, { scrap: 25 });
      extras.push(`No free hardpoint for the ${WEAPONS[out.weapon].name}: sold for 25 scrap.`);
    }
  }
  if (out.reactor) {
    run.loadout.reactor = Math.min(REACTOR_MAX, run.loadout.reactor + out.reactor);
    extras.push(`Reactor output increased to ${run.loadout.reactor}.`);
  }
  return { title: '', lines: out.lines, applied, extras };
}

export function chooseEventOption(run: RunState, index: number): ResultPanel | null {
  if (run.phase !== 'event' || !run.eventId) return null;
  const ev = eventById(run.eventId);
  const choice = ev?.choices[index];
  if (!ev || !choice || !meetsRequirements(run.res, choice.requires)) return null;
  const out = withRng(run, (r) => r.weighted(choice.outcomes, (o) => o.weight ?? 1));
  const panel = applyOutcome(run, out);
  panel.title = ev.title;
  run.result = panel;
  run.eventId = undefined;
  if (out.combat) run.pendingCombat = { faction: out.combat, isBoss: false, pursuit: false };
  run.phase = 'result';
  checkLoss(run);
  return panel;
}

/** Dismiss the result panel: go to a pending combat or back to the map. */
export function dismissResult(run: RunState): void {
  if (run.phase !== 'result') return;
  run.result = undefined;
  run.phase = run.pendingCombat ? 'combat' : 'map';
  checkLoss(run);
}

// ------------------------------------------------------------ combat

export function startCombat(run: RunState): CombatState | null {
  if (run.phase !== 'combat' || !run.pendingCombat) return null;
  const pc = run.pendingCombat;
  const template = withRng(run, (r) => makeEnemy(pc.faction, run.sector, run.res.alert, r.next()));
  if (pc.pursuit) {
    template.name = `Pursuit: ${template.name}`;
    template.hull += 4;
  }
  return createCombat(
    { loadout: run.loadout, hull: run.res.hull, maxHull: run.res.maxHull, crew: run.res.crew, missiles: run.res.missiles },
    template,
    { isBoss: pc.isBoss, canFlee: !pc.isBoss, mood: run.res.mood },
  );
}

/** Spend mood for a Skippy combat ability. Returns false if he refuses. */
export function payForAbility(run: RunState, id: 'hack' | 'fake'): boolean {
  if (!canUseAbility(run.res.mood, id)) return false;
  applyDelta(run.res, { mood: -ABILITIES[id].cost });
  return true;
}

export function finishCombat(run: RunState, combat: CombatState): ResultPanel {
  const pc = run.pendingCombat;
  run.pendingCombat = undefined;
  // Sync persistent resources from the fight.
  run.res.hull = Math.max(0, combat.player.hull);
  run.res.crew = Math.max(0, combat.player.crew);
  run.res.missiles = combat.missiles;
  run.stats.crewLost += combat.crewLost;

  const lines: DialogueLine[] = [];
  let delta: ResourceDelta = {};
  const s = run.sector;
  const isMax = pc?.faction === 'maxolhx';
  switch (combat.outcome) {
    case 'destroyed':
    case 'surrendered': {
      const surrender = combat.outcome === 'surrendered';
      const scrap = withRng(run, (r) => (isMax ? 80 : 16 + 5 * s + r.int(0, 10)) * (surrender ? 1.4 : 1));
      const fuel = withRng(run, (r) => (surrender ? 2 : r.chance(0.55) ? 1 : 0));
      const missiles = withRng(run, (r) => (surrender ? 2 : r.chance(0.35) ? r.int(1, 2) : 0));
      delta = { scrap: Math.round(scrap), fuel, missiles, mood: isMax ? 20 : 3, hull: 2 };
      if (surrender) run.stats.surrenders++;
      else run.stats.shipsDestroyed++;
      lines.push({
        speaker: 'skippy',
        text: isMax
          ? 'We... beat a Maxolhx ship? Okay, I was a LITTLE bit involved. Fine, mostly involved. I am awesome.'
          : surrender
            ? 'They surrendered! To monkeys! I am recording this for my memoirs.'
            : 'Target destroyed. Another triumph for me, and you were there too, I guess.',
      });
      break;
    }
    case 'fled':
      run.stats.escapes++;
      delta = { mood: -2 };
      lines.push({ speaker: 'skippy', text: 'Running away. Bold strategy, Joe. Truly the stuff of legends.' });
      break;
    case 'escaped':
      run.stats.escapes++;
      lines.push({ speaker: 'skippy', text: 'One fake wormhole, served piping hot. They are still scanning the empty space we left behind.' });
      break;
    case 'transmitted':
      applyDelta(run.res, { alert: 100 });
      break;
    default:
      break;
  }
  const applied = applyDelta(run.res, delta);
  if (applied.scrap && applied.scrap > 0) run.stats.scrapEarned += applied.scrap;

  if (pc?.isBoss && combat.outcome === 'destroyed') {
    run.phase = 'won';
  } else if (!checkLoss(run)) {
    run.phase = 'result';
    run.result = {
      title: combat.outcome === 'fled' || combat.outcome === 'escaped' ? 'Escaped' : 'Victory',
      lines,
      applied,
      extras: [],
    };
  }
  return run.result ?? { title: '', lines, applied, extras: [] };
}

// ------------------------------------------------------------ Skippy map abilities

export function armStealth(run: RunState): boolean {
  if (run.phase !== 'map' || run.stealthArmed) return false;
  if (!canUseAbility(run.res.mood, 'stealth')) return false;
  applyDelta(run.res, { mood: -ABILITIES.stealth.cost });
  run.stealthArmed = true;
  return true;
}

export function fakeWormholeJump(run: RunState, nodeId: number): boolean {
  if (run.phase !== 'map' || !canUseAbility(run.res.mood, 'fake')) return false;
  if (!fakeWormholeTargets(run).includes(nodeId)) return false;
  applyDelta(run.res, { mood: -ABILITIES.fake.cost });
  return jumpTo(run, nodeId, { fake: true });
}

/** Out of fuel: Skippy (or Nagatha, if he sulks) siphons fuel from a gas giant. Never soft-locks. */
export function emergencySiphon(run: RunState): ResultPanel | null {
  if (run.phase !== 'map' || run.res.fuel > 0) return null;
  const sulking = run.res.mood < 25;
  const applied = applyDelta(run.res, { fuel: 2, alert: 6, mood: sulking ? 0 : -8 });
  run.map.pursuit += 0.7;
  run.result = {
    title: 'Running on fumes',
    lines: sulking
      ? [{ speaker: 'nagatha', text: 'Skippy is not speaking to anyone, dear, so I have skimmed some fuel from the gas giant myself. It took rather a long time, I am afraid.' }]
      : [{ speaker: 'skippy', text: 'You ran out of gas. In a starship. I am siphoning a gas giant for you like some kind of cosmic gas station attendant. Remember this.' }],
    applied,
    extras: ['The pursuit fleet gained ground while you refuelled.'],
  };
  run.phase = 'result';
  checkLoss(run);
  return run.result;
}

export function leaveSector(run: RunState): boolean {
  if (run.phase !== 'map' || !atExit(run)) return false;
  if (run.sector >= TOTAL_SECTORS) return false;
  run.sector++;
  run.map = buildSector(run, run.sector);
  run.current = run.map.startId;
  run.shops = {};
  run.shop = undefined;
  run.stats.jumps++;
  const applied = applyDelta(run.res, { alert: -4, hull: 3 });
  run.result = {
    title: `Sector ${run.sector}: ${run.map.name}`,
    lines: [{ speaker: 'nagatha', text: 'We have emerged safely, everyone. I have patched a few of the worst hull breaches while we were in transit. You are most welcome.' }],
    applied,
    extras: ['The wormhole transit shook off some of the pursuit.'],
  };
  run.phase = 'result';
  return true;
}
