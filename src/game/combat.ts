/**
 * Real-time-with-pause combat, simplified FTL style. Pure logic: the UI calls
 * `tickCombat(state, dt, rng)` with real elapsed seconds (0 while paused) and
 * the player commands below. Everything is deterministic given the RNG.
 */
import { SYSTEM_IDS, type Faction, type ShipLoadout, type ShipSystem, type SystemId, type WeaponDef } from './types';
import { WEAPONS, type EnemyTemplate } from './data/ships';
import type { Rng } from './rng';

export type Side = 'player' | 'enemy';

export interface WeaponState {
  def: WeaponDef;
  powered: boolean;
  /** Player intent: re-power automatically after repairs. */
  want: boolean;
  charge: number; // seconds charged
  target: SystemId | null;
}

export interface CombatShip {
  side: Side;
  name: string;
  faction: Faction | 'human';
  variant: number;
  hull: number;
  maxHull: number;
  reactor: number;
  systems: Record<SystemId, ShipSystem>;
  weapons: WeaponState[];
  shieldLayers: number;
  shieldProgress: number;
  stealthTime: number;
  stealthCooldown: number;
  jumpCharge: number; // 0..1
  crew: number;
  /** Seconds the shields stay offline after a Skippy hack. */
  hackedTime: number;
  /** Weapon charge speed multiplier. */
  chargeRate: number;
  /** Power the crew wants in each system; restored automatically after repairs. */
  desired: Record<SystemId, number>;
  repairProgress: Record<SystemId, number>;
}

export interface Projectile {
  from: Side;
  weapon: WeaponDef;
  target: SystemId;
  damage: number;
  /** Seconds remaining until impact. */
  eta: number;
  flight: number;
}

export type CombatFx =
  | { kind: 'fire'; from: Side; weapon: WeaponDef['kind'] }
  | { kind: 'hit'; on: Side; system: SystemId; damage: number }
  | { kind: 'miss'; on: Side; system: SystemId }
  | { kind: 'shield'; on: Side; system: SystemId }
  | { kind: 'crewLost'; on: Side }
  | { kind: 'hack' }
  | { kind: 'stealth'; side: Side };

export type FireMode = 'volley' | 'each' | 'hold';

export type CombatOutcome = 'destroyed' | 'surrendered' | 'fled' | 'escaped' | 'lost' | 'transmitted';

export interface CombatState {
  time: number;
  player: CombatShip;
  enemy: CombatShip;
  projectiles: Projectile[];
  log: string[];
  fx: CombatFx[];
  outcome: CombatOutcome | null;
  isBoss: boolean;
  /** Boss only: relay uplink progress 0..1 (1 = aliens learn about humans). */
  uplink: number;
  uplinkTime: number;
  canFlee: boolean;
  missilesUsed: number;
  crewLost: number;
  skippyUsed: { hack: boolean; fake: boolean };
  /** Seconds the enemy weapons have been fully disabled (surrender check). */
  disabledFor: number;
  /** 'volley': hold until every powered weapon is charged, then fire together. 'each': fire as ready. 'hold': manual only. */
  fireMode: FireMode;
  /** Player missiles in stock (combat consumes them). */
  missiles: number;
  /** Skippy's mood multiplies jump charge speed: sulking Skippy won't help. */
  jumpMultiplier: number;
  /** Bonus evasion penalty applied to enemy (Skippy's targeting assist). */
  targetingAssist: number;
}

export const SHIELD_RECHARGE = 2.2; // seconds per layer at base
export const PROJECTILE_FLIGHT = 0.9;
export const MISSILE_FLIGHT = 1.4;
export const MAX_CREW_PER_SYSTEM = 2;
export const STEALTH_COOLDOWN = 20;

function makeSystems(levels: Record<SystemId, number>): Record<SystemId, ShipSystem> {
  const out = {} as Record<SystemId, ShipSystem>;
  for (const id of SYSTEM_IDS) out[id] = { id, level: levels[id] ?? 0, damage: 0, power: 0, crew: 0 };
  return out;
}

function zeroRecord(): Record<SystemId, number> {
  return { shields: 0, weapons: 0, engines: 0, stealth: 0, jump: 0 };
}

export function capacity(sys: ShipSystem): number {
  return Math.max(0, sys.level - sys.damage);
}

export function powerUsed(ship: CombatShip): number {
  return SYSTEM_IDS.reduce((s, id) => s + ship.systems[id].power, 0);
}

export function freePower(ship: CombatShip): number {
  return ship.reactor - powerUsed(ship);
}

export function maxShieldLayers(ship: CombatShip): number {
  if (ship.hackedTime > 0) return 0;
  return Math.floor(ship.systems.shields.power / 2);
}

export function evasion(ship: CombatShip): number {
  const eng = ship.systems.engines;
  if (eng.power <= 0) return 0;
  const crewBonus = Math.min(eng.crew, MAX_CREW_PER_SYSTEM) * 0.05;
  return Math.min(0.6, eng.power * 0.06 + crewBonus);
}

function crewMult(sys: ShipSystem, per = 0.12): number {
  return 1 + Math.min(sys.crew, MAX_CREW_PER_SYSTEM) * per;
}

function weaponsPowerNeeded(ship: CombatShip): number {
  return ship.weapons.reduce((s, w) => s + (w.powered ? w.def.power : 0), 0);
}

/** Re-derive weapon system power from powered weapons, unpowering weapons that no longer fit. */
function syncWeaponPower(ship: CombatShip): void {
  const cap = capacity(ship.systems.weapons);
  let used = weaponsPowerNeeded(ship);
  for (let i = ship.weapons.length - 1; i >= 0 && used > cap; i--) {
    const w = ship.weapons[i];
    if (w.powered) {
      w.powered = false;
      w.charge = 0;
      used -= w.def.power;
    }
  }
  ship.systems.weapons.power = used;
}

/** Clamp every system's power to its (possibly damaged) capacity. */
function clampPower(ship: CombatShip): void {
  for (const id of SYSTEM_IDS) {
    if (id === 'weapons') continue;
    const sys = ship.systems[id];
    sys.power = Math.min(sys.power, capacity(sys));
  }
  syncWeaponPower(ship);
  // If over the reactor (shouldn't happen) drop power from the end.
  let over = powerUsed(ship) - ship.reactor;
  for (const id of ['stealth', 'jump', 'engines', 'shields'] as SystemId[]) {
    while (over > 0 && ship.systems[id].power > 0) {
      ship.systems[id].power--;
      over--;
    }
  }
}

/** Greedy power allocation in priority order. */
function autoPower(ship: CombatShip, order: SystemId[]): void {
  for (const id of order) {
    if (id === 'weapons') {
      for (const w of ship.weapons) {
        if (!w.powered && w.def.power <= freePower(ship) && weaponsPowerNeeded(ship) + w.def.power <= capacity(ship.systems.weapons)) {
          w.powered = true;
          syncWeaponPower(ship);
        }
      }
    } else {
      const sys = ship.systems[id];
      while (sys.power < capacity(sys) && freePower(ship) > 0) sys.power++;
    }
  }
}

export interface PlayerSetup {
  loadout: ShipLoadout;
  hull: number;
  maxHull: number;
  crew: number;
  missiles: number;
}

export interface CombatOptions {
  isBoss?: boolean;
  canFlee?: boolean;
  /** Skippy's mood 0-100 (affects jump charge rate and targeting). */
  mood: number;
}

export function createCombat(setup: PlayerSetup, enemyT: EnemyTemplate, opts: CombatOptions): CombatState {
  const player: CombatShip = {
    side: 'player',
    name: 'Flying Dutchman',
    faction: 'human',
    variant: 0,
    hull: setup.hull,
    maxHull: setup.maxHull,
    reactor: setup.loadout.reactor,
    systems: makeSystems(setup.loadout.systems),
    weapons: setup.loadout.weapons.map((k) => ({ def: WEAPONS[k], powered: false, want: false, charge: 0, target: null })),
    shieldLayers: 0,
    shieldProgress: 0,
    stealthTime: 0,
    stealthCooldown: 0,
    jumpCharge: 0,
    crew: setup.crew,
    hackedTime: 0,
    chargeRate: 1,
    desired: zeroRecord(),
    repairProgress: zeroRecord(),
  };
  const enemy: CombatShip = {
    side: 'enemy',
    name: enemyT.name,
    faction: enemyT.faction,
    variant: enemyT.variant,
    hull: enemyT.hull,
    maxHull: enemyT.hull,
    reactor: enemyT.reactor,
    systems: makeSystems(enemyT.systems),
    weapons: enemyT.weapons.map((k) => ({ def: WEAPONS[k], powered: false, want: false, charge: 0, target: null })),
    shieldLayers: 0,
    shieldProgress: 0,
    stealthTime: 0,
    stealthCooldown: 0,
    jumpCharge: 0,
    crew: enemyT.crew,
    hackedTime: 0,
    chargeRate: enemyT.chargeRate,
    desired: zeroRecord(),
    repairProgress: zeroRecord(),
  };
  // Default power: shields, weapons, engines, jump. Stealth is manual.
  autoPower(player, ['shields', 'weapons', 'engines', 'jump']);
  autoPower(enemy, ['shields', 'weapons', 'engines', 'jump']);
  for (const ship of [player, enemy]) {
    ship.shieldLayers = maxShieldLayers(ship);
    rememberPower(ship);
  }
  // Default crew: spread over weapons, shields, engines, jump.
  autoCrew(player);
  autoCrew(enemy);
  const defaultTarget: SystemId = 'weapons';
  for (const w of player.weapons) w.target = defaultTarget;

  const mood = opts.mood;
  return {
    time: 0,
    player,
    enemy,
    projectiles: [],
    log: [`Contact: ${enemy.name}.`],
    fx: [],
    outcome: null,
    isBoss: !!opts.isBoss,
    uplink: 0,
    uplinkTime: enemyT.uplinkTime ?? 0,
    canFlee: opts.canFlee ?? !opts.isBoss,
    missilesUsed: 0,
    crewLost: 0,
    skippyUsed: { hack: false, fake: false },
    disabledFor: 0,
    fireMode: 'volley',
    missiles: setup.missiles,
    jumpMultiplier: mood < 25 ? 0.6 : mood >= 75 ? 1.15 : 1,
    targetingAssist: mood >= 75 ? 0.1 : 0,
  };
}

function rememberPower(ship: CombatShip): void {
  for (const id of SYSTEM_IDS) ship.desired[id] = ship.systems[id].power;
  for (const w of ship.weapons) w.want = w.powered;
}

/** After repairs, bring systems and weapons back up to the power the crew wanted. */
function restorePower(ship: CombatShip): void {
  for (const id of ['shields', 'engines', 'jump', 'stealth'] as SystemId[]) {
    const sys = ship.systems[id];
    while (sys.power < Math.min(ship.desired[id], capacity(sys)) && freePower(ship) > 0) sys.power++;
  }
  for (const w of ship.weapons) {
    if (w.want && !w.powered && w.def.power <= freePower(ship) && weaponsPowerNeeded(ship) + w.def.power <= capacity(ship.systems.weapons)) {
      w.powered = true;
      syncWeaponPower(ship);
    }
  }
}

export function autoCrew(ship: CombatShip): void {
  for (const id of SYSTEM_IDS) ship.systems[id].crew = 0;
  const order: SystemId[] = ['weapons', 'shields', 'engines', 'jump', 'weapons', 'shields', 'engines', 'jump', 'stealth', 'stealth'];
  let left = ship.crew;
  for (const id of order) {
    if (left <= 0) break;
    if (ship.systems[id].level <= 0) continue;
    if (ship.systems[id].crew >= MAX_CREW_PER_SYSTEM) continue;
    ship.systems[id].crew++;
    left--;
  }
}

export function assignedCrew(ship: CombatShip): number {
  return SYSTEM_IDS.reduce((s, id) => s + ship.systems[id].crew, 0);
}

// ------------------------------------------------------------- commands

export function changePower(state: CombatState, id: SystemId, delta: 1 | -1): boolean {
  const ship = state.player;
  const sys = ship.systems[id];
  if (id === 'weapons') {
    // Power the next weapon in order (or unpower the last powered one).
    if (delta > 0) {
      const w = ship.weapons.find((x) => !x.powered);
      return w ? toggleWeapon(state, ship.weapons.indexOf(w)) : false;
    }
    const powered = ship.weapons.filter((x) => x.powered);
    const last = powered[powered.length - 1];
    return last ? toggleWeapon(state, ship.weapons.indexOf(last)) : false;
  }
  if (delta > 0) {
    if (sys.power >= capacity(sys) || freePower(ship) <= 0) return false;
    sys.power++;
  } else {
    if (sys.power <= 0) return false;
    sys.power--;
    if (id === 'stealth' && sys.power === 0) ship.stealthTime = 0;
  }
  if (id === 'shields') ship.shieldLayers = Math.min(ship.shieldLayers, maxShieldLayers(ship));
  ship.desired[id] = sys.power;
  return true;
}

export function toggleWeapon(state: CombatState, index: number): boolean {
  const ship = state.player;
  const w = ship.weapons[index];
  if (!w) return false;
  if (w.powered) {
    w.powered = false;
    w.want = false;
    w.charge = 0;
    syncWeaponPower(ship);
    return true;
  }
  if (w.def.power > freePower(ship)) return false;
  if (weaponsPowerNeeded(ship) + w.def.power > capacity(ship.systems.weapons)) return false;
  w.powered = true;
  w.want = true;
  syncWeaponPower(ship);
  return true;
}

export function setTarget(state: CombatState, index: number | 'all', target: SystemId): void {
  const ws = index === 'all' ? state.player.weapons : [state.player.weapons[index]].filter(Boolean);
  for (const w of ws) w.target = target;
}

export function changeCrew(state: CombatState, id: SystemId, delta: 1 | -1): boolean {
  const ship = state.player;
  const sys = ship.systems[id];
  if (delta > 0) {
    if (sys.level <= 0 || sys.crew >= MAX_CREW_PER_SYSTEM || assignedCrew(ship) >= ship.crew) return false;
    sys.crew++;
  } else {
    if (sys.crew <= 0) return false;
    sys.crew--;
  }
  return true;
}

export function canActivateStealth(ship: CombatShip): boolean {
  return ship.systems.stealth.power > 0 && ship.stealthCooldown <= 0 && ship.stealthTime <= 0;
}

export function activateStealth(state: CombatState): boolean {
  const ship = state.player;
  if (!canActivateStealth(ship)) return false;
  ship.stealthTime = 3 + 2.5 * ship.systems.stealth.power;
  ship.stealthCooldown = STEALTH_COOLDOWN;
  state.fx.push({ kind: 'stealth', side: 'player' });
  state.log.push('Stealth field engaged. Enemy sensors are chasing ghosts.');
  return true;
}

/** Fire all charged player weapons now (manual volley). */
export function fireAll(state: CombatState, rng: Rng): number {
  let n = 0;
  for (const w of state.player.weapons) {
    if (w.powered && w.charge >= w.def.charge && w.target) {
      if (fireWeapon(state, state.player, w, rng)) n++;
    }
  }
  return n;
}

export function tryJump(state: CombatState): boolean {
  if (!state.canFlee || state.outcome) return false;
  if (state.player.jumpCharge < 1) return false;
  state.outcome = 'fled';
  state.log.push('Jump drive engaged. We are out of here!');
  return true;
}

/** Skippy hacks the enemy shields: drops all layers and blocks recharge. */
export function skippyHack(state: CombatState): boolean {
  if (state.skippyUsed.hack || state.outcome) return false;
  state.skippyUsed.hack = true;
  state.enemy.hackedTime = state.isBoss ? 10 : 14;
  state.enemy.shieldLayers = 0;
  state.enemy.shieldProgress = 0;
  state.fx.push({ kind: 'hack' });
  state.log.push('Skippy hacked the enemy shield generators.');
  return true;
}

/** Skippy fakes a wormhole: instant escape (not possible at the relay). */
export function skippyFakeWormhole(state: CombatState): boolean {
  if (state.skippyUsed.fake || state.outcome || !state.canFlee) return false;
  state.skippyUsed.fake = true;
  state.outcome = 'escaped';
  state.log.push('Skippy opened a fake wormhole. The enemy is very confused.');
  return true;
}

// ------------------------------------------------------------- simulation

function chooseEnemyTarget(rng: Rng, player: CombatShip): SystemId {
  const options: SystemId[] = ['weapons', 'weapons', 'shields', 'shields', 'engines', 'jump'];
  if (player.systems.stealth.level > 0) options.push('stealth');
  return rng.pick(options);
}

function fireWeapon(state: CombatState, ship: CombatShip, w: WeaponState, rng: Rng): boolean {
  if (!w.target) return false;
  if (w.def.usesMissile && ship.side === 'player') {
    if (state.missiles <= 0) return false;
    state.missiles--;
    state.missilesUsed++;
  }
  const flight = w.def.usesMissile ? MISSILE_FLIGHT : PROJECTILE_FLIGHT;
  for (let i = 0; i < w.def.shots; i++) {
    state.projectiles.push({
      from: ship.side,
      weapon: w.def,
      target: w.target,
      damage: w.def.damage,
      eta: flight + i * 0.18,
      flight: flight + i * 0.18,
    });
  }
  w.charge = 0;
  state.fx.push({ kind: 'fire', from: ship.side, weapon: w.def.kind });
  if (ship.side === 'enemy') w.target = chooseEnemyTarget(rng, state.player);
  return true;
}

function resolveImpact(state: CombatState, p: Projectile, rng: Rng): void {
  const target = p.from === 'player' ? state.enemy : state.player;
  const sideOn: Side = target.side;
  if (target.stealthTime > 0) {
    state.fx.push({ kind: 'miss', on: sideOn, system: p.target });
    return;
  }
  let ev = evasion(target);
  if (p.from === 'player') ev = Math.max(0, ev - state.targetingAssist);
  if (rng.next() < ev) {
    state.fx.push({ kind: 'miss', on: sideOn, system: p.target });
    return;
  }
  if (!p.weapon.usesMissile && target.shieldLayers > (p.weapon.pierce ?? 0)) {
    target.shieldLayers--;
    target.shieldProgress = 0;
    state.fx.push({ kind: 'shield', on: sideOn, system: p.target });
    return;
  }
  target.hull = Math.max(0, target.hull - p.damage);
  const sys = target.systems[p.target];
  if (sys.level > 0) {
    sys.damage = Math.min(sys.level, sys.damage + p.damage);
    target.repairProgress[p.target] = 0;
    clampPower(target);
    if (p.target === 'shields') target.shieldLayers = Math.min(target.shieldLayers, maxShieldLayers(target));
    if (p.target === 'stealth' && sys.power === 0) target.stealthTime = 0;
  }
  state.fx.push({ kind: 'hit', on: sideOn, system: p.target, damage: p.damage });
  // Crew stationed in the hit system may be killed.
  if (sys.crew > 0 && rng.chance(0.08 * p.damage)) {
    sys.crew--;
    target.crew = Math.max(0, target.crew - 1);
    if (target.side === 'player') {
      state.crewLost++;
      state.log.push(`A crew member was killed in the ${p.target} compartment.`);
    }
    state.fx.push({ kind: 'crewLost', on: sideOn });
  }
}

function tickShip(state: CombatState, ship: CombatShip, dt: number, rng: Rng): void {
  // Shields
  if (ship.hackedTime > 0) {
    ship.hackedTime = Math.max(0, ship.hackedTime - dt);
    ship.shieldLayers = 0;
  } else {
    const maxL = maxShieldLayers(ship);
    if (ship.shieldLayers < maxL) {
      ship.shieldProgress += (dt / SHIELD_RECHARGE) * crewMult(ship.systems.shields, 0.15);
      if (ship.shieldProgress >= 1) {
        ship.shieldProgress = 0;
        ship.shieldLayers++;
      }
    } else {
      ship.shieldProgress = 0;
      ship.shieldLayers = maxL;
    }
  }
  // Stealth
  if (ship.stealthTime > 0) ship.stealthTime = Math.max(0, ship.stealthTime - dt);
  else if (ship.stealthCooldown > 0) ship.stealthCooldown = Math.max(0, ship.stealthCooldown - dt);
  // Jump drive
  const jump = ship.systems.jump;
  if (jump.power > 0 && ship.jumpCharge < 1) {
    const mult = ship.side === 'player' ? state.jumpMultiplier : 1;
    ship.jumpCharge = Math.min(1, ship.jumpCharge + dt * jump.power * 0.02 * crewMult(jump, 0.25) * mult);
  }
  // Weapons
  const wMult = crewMult(ship.systems.weapons, 0.1) * ship.chargeRate;
  const usable = (w: WeaponState) => w.powered && !(w.def.usesMissile && ship.side === 'player' && state.missiles <= 0);
  // Missiles ignore shields, so only shield-stripping guns need to sync up.
  const volleyReady = ship.weapons.filter((w) => usable(w) && !w.def.usesMissile).every((w) => w.charge >= w.def.charge);
  for (const w of ship.weapons) {
    if (!w.powered) {
      w.charge = Math.max(0, w.charge - dt * 2);
      continue;
    }
    if (w.charge < w.def.charge) w.charge = Math.min(w.def.charge, w.charge + dt * wMult);
    if (w.charge >= w.def.charge) {
      if (ship.side === 'enemy') {
        if (!w.target) w.target = chooseEnemyTarget(rng, state.player);
        fireWeapon(state, ship, w, rng);
      } else if (w.target && usable(w)) {
        const go = state.fireMode === 'each' || (state.fireMode === 'volley' && (volleyReady || w.def.usesMissile));
        if (go) fireWeapon(state, ship, w, rng);
      }
    }
  }
  // Repairs: crew in a damaged system repair it; Nagatha slowly helps on the player ship.
  for (const id of SYSTEM_IDS) {
    const sys = ship.systems[id];
    if (sys.damage <= 0) continue;
    const rate = Math.min(sys.crew, MAX_CREW_PER_SYSTEM) / 7;
    ship.repairProgress[id] += dt * rate;
  }
  if (ship.side === 'player') {
    const worst = SYSTEM_IDS.filter((id) => ship.systems[id].damage > 0).sort(
      (a, b) => ship.systems[b].damage - ship.systems[a].damage,
    )[0];
    if (worst) ship.repairProgress[worst] += dt / 18;
  }
  for (const id of SYSTEM_IDS) {
    const sys = ship.systems[id];
    if (sys.damage > 0 && ship.repairProgress[id] >= 1) {
      ship.repairProgress[id] = 0;
      sys.damage--;
      restorePower(ship);
    }
  }
}

export function tickCombat(state: CombatState, dt: number, rng: Rng): void {
  if (state.outcome || dt <= 0) return;
  // Sub-step for stability when the frame was long.
  const steps = Math.max(1, Math.ceil(dt / 0.05));
  const h = dt / steps;
  for (let s = 0; s < steps && !state.outcome; s++) {
    state.time += h;
    tickShip(state, state.player, h, rng);
    tickShip(state, state.enemy, h, rng);
    for (const p of state.projectiles) p.eta -= h;
    const arrived = state.projectiles.filter((p) => p.eta <= 0);
    state.projectiles = state.projectiles.filter((p) => p.eta > 0);
    for (const p of arrived) resolveImpact(state, p, rng);

    if (state.isBoss && state.uplinkTime > 0) {
      const up = state.enemy.systems.jump;
      const eff = up.level > 0 ? capacity(up) / up.level : 0;
      state.uplink = Math.min(1, state.uplink + (h / state.uplinkTime) * (0.25 + 0.75 * eff));
    }

    // Surrender: enemy weapons completely knocked out for a while.
    if (!state.isBoss && state.enemy.faction !== 'maxolhx' && capacity(state.enemy.systems.weapons) === 0) {
      state.disabledFor += h;
    } else {
      state.disabledFor = 0;
    }

    if (state.player.hull <= 0 || state.player.crew <= 0) {
      state.outcome = 'lost';
      state.log.push('The Flying Dutchman has been lost.');
    } else if (state.enemy.hull <= 0) {
      state.outcome = 'destroyed';
      state.log.push(`${state.enemy.name} destroyed!`);
    } else if (state.disabledFor >= 4) {
      state.outcome = 'surrendered';
      state.log.push(`${state.enemy.name} is dead in space. Their crew surrenders and hands over supplies.`);
    } else if (state.isBoss && state.uplink >= 1) {
      state.outcome = 'transmitted';
      state.log.push('The relay finished its transmission. The aliens know about us.');
    }
  }
}

export function drainFx(state: CombatState): CombatFx[] {
  const out = state.fx;
  state.fx = [];
  return out;
}
