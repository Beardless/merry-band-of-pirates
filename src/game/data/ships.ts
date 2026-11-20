import type { Faction, ShipLoadout, SystemId, WeaponDef, WeaponKind } from '../types';

export const WEAPONS: Record<WeaponKind, WeaponDef> = {
  maser: {
    kind: 'maser', name: 'Maser Cannon', power: 1, charge: 8, damage: 1, shots: 2, cost: 35,
    description: 'Two quick maser pulses. Reliable shield-stripper.',
  },
  twinMaser: {
    kind: 'twinMaser', name: 'Maser Battery', power: 2, charge: 10, damage: 1, shots: 3, cost: 60,
    description: 'Three-pulse burst. Overwhelms layered shields.',
  },
  heavyMaser: {
    kind: 'heavyMaser', name: 'Heavy Maser', power: 1, charge: 10, damage: 2, shots: 1, cost: 50,
    description: 'One big hit. Great once shields are down.',
  },
  missile: {
    kind: 'missile', name: 'Missile Launcher', power: 1, charge: 11, damage: 3, shots: 1, usesMissile: true, cost: 45,
    description: 'Ignores shields. Uses one missile per shot.',
  },
  railgun: {
    kind: 'railgun', name: 'Thuranin Railgun', power: 3, charge: 13, damage: 2, shots: 2, pierce: 1, cost: 90,
    description: 'Two slugs that punch through one shield layer each.',
  },
};

export const SYSTEM_MAX: Record<SystemId, number> = {
  shields: 8,
  weapons: 8,
  engines: 6,
  stealth: 3,
  jump: 4,
};

export const SYSTEM_NAMES: Record<SystemId, string> = {
  shields: 'Shields',
  weapons: 'Weapons',
  engines: 'Engines',
  stealth: 'Stealth Field',
  jump: 'Jump Drive',
};

export const REACTOR_MAX = 20;

export const START_LOADOUT: ShipLoadout = {
  reactor: 9,
  systems: { shields: 2, weapons: 3, engines: 2, stealth: 1, jump: 2 },
  weapons: ['twinMaser', 'missile'],
};

export interface EnemyTemplate {
  name: string;
  faction: Faction;
  hull: number;
  reactor: number;
  systems: Record<SystemId, number>;
  weapons: WeaponKind[];
  crew: number;
  variant: number;
  /** Boss-only: seconds until the relay finishes broadcasting at full uplink. */
  uplinkTime?: number;
  /** Weapon charge speed multiplier (early-sector crews are sloppier). */
  chargeRate: number;
}

/** Enemy gunnery gets sharper the deeper you go. */
export function enemyChargeRate(sector: number): number {
  return [0.6, 0.66, 0.71, 0.74, 0.76, 0.8][Math.max(0, Math.min(5, sector - 1))];
}

const KRISTANG_NAMES = ['Clan Warbird "Gutripper"', 'Kristang Frigate "Skullhammer"', 'Kristang Destroyer "Bonecrusher"', 'Clan Raider "Bloodtusk"', 'Kristang Cruiser "Ironjaw"'];
const THURANIN_NAMES = ['Thuranin Survey Cutter', 'Thuranin Picket Ship', 'Thuranin Destroyer', 'Thuranin Frigate', 'Thuranin Escort'];

/**
 * Build an enemy for a sector. Scaling: hull grows with sector and alert,
 * Thuranin get better shields and evasion, Maxolhx are absurdly strong.
 */
export function makeEnemy(faction: Faction, sector: number, alert: number, roll: number): EnemyTemplate {
  const alertBonus = Math.floor(alert / 25);
  const variant = Math.floor(roll * 3) % 3;
  switch (faction) {
    case 'kristang': {
      const big = sector >= 3 || variant === 2;
      const weapons: WeaponKind[] = ['maser', 'heavyMaser'];
      if (sector >= 2) weapons.push(variant === 1 ? 'missile' : 'maser');
      if (sector >= 4) weapons.push('heavyMaser');
      return {
        name: KRISTANG_NAMES[Math.floor(roll * KRISTANG_NAMES.length) % KRISTANG_NAMES.length],
        faction, variant,
        hull: 6 + Math.round(sector * 2.5) + (big ? 2 : 0) + alertBonus,
        chargeRate: enemyChargeRate(sector),
        reactor: 20,
        systems: { shields: sector >= 3 ? 4 : 2, weapons: 6, engines: 1, stealth: 0, jump: 1 },
        weapons, crew: 4 + sector,
      };
    }
    case 'thuranin': {
      const weapons: WeaponKind[] = ['twinMaser', 'maser'];
      if (sector >= 5) weapons.push(sector >= 6 && variant === 0 ? 'railgun' : 'heavyMaser');
      if (sector >= 6 && variant === 2) weapons.push('missile');
      return {
        name: THURANIN_NAMES[Math.floor(roll * THURANIN_NAMES.length) % THURANIN_NAMES.length],
        faction, variant,
        hull: 6 + sector * 2 + alertBonus,
        chargeRate: enemyChargeRate(sector),
        reactor: 20,
        systems: { shields: sector >= 5 ? 5 : 4, weapons: 8, engines: sector >= 5 ? 3 : 2, stealth: 0, jump: 2 },
        weapons, crew: 3 + sector,
      };
    }
    case 'maxolhx':
      return {
        name: 'Maxolhx Hunter',
        faction, variant,
        hull: 45 + alertBonus * 3,
        chargeRate: 1,
        reactor: 25,
        systems: { shields: 7, weapons: 8, engines: 5, stealth: 0, jump: 3 },
        weapons: ['railgun', 'twinMaser', 'heavyMaser'],
        crew: 12,
      };
    case 'relay':
      return {
        name: 'Kristang-Thuranin Relay Station',
        faction, variant: 0,
        hull: 40 + alertBonus * 2,
        chargeRate: 0.9,
        reactor: 25,
        systems: { shields: 5, weapons: 8, engines: 0, stealth: 0, jump: 3 },
        weapons: ['twinMaser', 'heavyMaser', 'missile'],
        crew: 12,
        uplinkTime: 210,
      };
  }
}
