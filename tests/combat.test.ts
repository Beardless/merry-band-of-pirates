import { Rng } from '../src/game/rng';
import {
  activateStealth, capacity, changeCrew, changePower, createCombat, evasion, freePower, maxShieldLayers,
  setTarget, skippyFakeWormhole, skippyHack, tickCombat, toggleWeapon, tryJump, type CombatState,
} from '../src/game/combat';
import { START_LOADOUT, makeEnemy } from '../src/game/data/ships';

function fight(seed = 1, faction: 'kristang' | 'thuranin' | 'maxolhx' | 'relay' = 'kristang', sector = 1): CombatState {
  return createCombat(
    { loadout: START_LOADOUT, hull: 30, maxHull: 30, crew: 8, missiles: 6 },
    makeEnemy(faction, sector, 0, new Rng(seed).next()),
    { mood: 60, isBoss: faction === 'relay' },
  );
}

function run(c: CombatState, seconds: number, rng = new Rng(2)) {
  for (let t = 0; t < seconds && !c.outcome; t += 0.1) tickCombat(c, 0.1, rng);
}

describe('combat setup', () => {
  it('never routes more power than the reactor has', () => {
    const c = fight();
    expect(freePower(c.player)).toBeGreaterThanOrEqual(0);
    expect(freePower(c.enemy)).toBeGreaterThanOrEqual(0);
  });

  it('starts with shields up (2 power = 1 layer)', () => {
    const c = fight();
    expect(c.player.systems.shields.power).toBe(2);
    expect(c.player.shieldLayers).toBe(1);
  });

  it('power changes respect capacity and the reactor', () => {
    const c = fight();
    const before = c.player.systems.engines.power;
    expect(changePower(c, 'engines', 1)).toBe(before < capacity(c.player.systems.engines) && freePower(c.player) > 0);
    // Drain all power from shields, then can't go below zero.
    while (changePower(c, 'shields', -1));
    expect(c.player.systems.shields.power).toBe(0);
    expect(maxShieldLayers(c.player)).toBe(0);
    expect(changePower(c, 'shields', -1)).toBe(false);
  });

  it('weapons toggle on and off and consume weapon-system power', () => {
    const c = fight();
    const w = c.player.weapons[0];
    expect(w.powered).toBe(true);
    expect(toggleWeapon(c, 0)).toBe(true);
    expect(w.powered).toBe(false);
    expect(c.player.systems.weapons.power).toBe(c.player.weapons.filter((x) => x.powered).reduce((s, x) => s + x.def.power, 0));
  });

  it('crew assignment is capped by total crew and per-system slots', () => {
    const c = fight();
    let added = 0;
    while (changeCrew(c, 'engines', 1)) added++;
    expect(c.player.systems.engines.crew).toBeLessThanOrEqual(2);
    void added;
    expect(evasion(c.player)).toBeGreaterThan(0);
  });
});

describe('combat simulation', () => {
  it('weapons charge and fire on their own (volley mode)', () => {
    const c = fight();
    setTarget(c, 'all', 'weapons');
    run(c, 12);
    expect(c.log.length).toBeGreaterThan(0);
    expect(c.missilesUsed + c.enemy.maxHull - c.enemy.hull + c.enemy.shieldLayers).toBeGreaterThan(0);
  });

  it('a starting ship beats a sector-1 Kristang most of the time', () => {
    let wins = 0;
    for (let seed = 0; seed < 40; seed++) {
      const c = fight(seed);
      run(c, 300, new Rng(seed + 100));
      if (c.outcome === 'destroyed' || c.outcome === 'surrendered') wins++;
    }
    expect(wins).toBeGreaterThanOrEqual(34);
  });

  it('missiles ignore shields and consume ammo', () => {
    const c = fight();
    c.player.weapons[0].powered = false; // only missiles
    c.enemy.systems.engines.power = 0; // no evasion
    setTarget(c, 'all', 'shields');
    const hull = c.enemy.hull;
    run(c, 13);
    expect(c.missilesUsed).toBeGreaterThanOrEqual(1);
    expect(c.enemy.hull).toBeLessThan(hull);
  });

  it('no missiles means the launcher does not fire', () => {
    const c = fight();
    c.missiles = 0;
    run(c, 15);
    expect(c.missilesUsed).toBe(0);
  });

  it('jump drive charges and allows escape; not at the relay', () => {
    const c = fight();
    expect(tryJump(c)).toBe(false);
    c.player.jumpCharge = 1;
    expect(tryJump(c)).toBe(true);
    expect(c.outcome).toBe('fled');

    const boss = fight(1, 'relay', 6);
    boss.player.jumpCharge = 1;
    expect(tryJump(boss)).toBe(false);
    expect(skippyFakeWormhole(boss)).toBe(false);
  });

  it('Skippy hack strips shields and blocks recharge for a while', () => {
    const c = fight(3, 'thuranin', 4);
    expect(c.enemy.shieldLayers).toBe(2);
    expect(skippyHack(c)).toBe(true);
    expect(c.enemy.shieldLayers).toBe(0);
    run(c, 5);
    expect(c.enemy.shieldLayers).toBe(0);
    expect(skippyHack(c)).toBe(false); // once per fight
  });

  it('stealth makes enemy shots miss and goes on cooldown', () => {
    const c = fight();
    if (!changePower(c, 'stealth', 1)) {
      changePower(c, 'engines', -1);
      changePower(c, 'stealth', 1);
    }
    expect(activateStealth(c)).toBe(true);
    expect(activateStealth(c)).toBe(false);
    const hull = c.player.hull;
    run(c, c.player.stealthTime - 0.2);
    expect(c.player.hull).toBe(hull);
  });

  it('fake wormhole escapes instantly', () => {
    const c = fight();
    expect(skippyFakeWormhole(c)).toBe(true);
    expect(c.outcome).toBe('escaped');
  });

  it('damaged systems lose capacity and get repaired, then power is restored', () => {
    const c = fight();
    const sh = c.player.systems.shields;
    sh.damage = 2;
    // emulate the power clamp a hit performs
    tickCombat(c, 0.05, new Rng(1));
    sh.power = Math.min(sh.power, capacity(sh));
    c.enemy.weapons.forEach((w) => (w.powered = false));
    run(c, 40);
    expect(sh.damage).toBe(0);
    expect(sh.power).toBe(2);
  });

  it('the relay uplink completes if ignored', () => {
    const c = fight(1, 'relay', 6);
    c.enemy.weapons.forEach((w) => (w.powered = false));
    c.player.weapons.forEach((w) => (w.powered = false));
    run(c, 400);
    expect(c.outcome).toBe('transmitted');
  });

  it('is deterministic with the same seed', () => {
    const a = fight(5); const b = fight(5);
    run(a, 60, new Rng(9)); run(b, 60, new Rng(9));
    expect(a.player.hull).toBe(b.player.hull);
    expect(a.enemy.hull).toBe(b.enemy.hull);
    expect(a.outcome).toBe(b.outcome);
  });
});
