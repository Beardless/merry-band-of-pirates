import type { ShipLoadout, SystemId, WeaponKind, Resources } from './types';
import { SYSTEM_IDS } from './types';
import { REACTOR_MAX, SYSTEM_MAX, SYSTEM_NAMES, WEAPONS } from './data/ships';
import { MAX_CREW, MAX_FUEL, MAX_MISSILES } from './resources';
import type { Rng } from './rng';

export type ShopItemKind = 'armor' | 'fuel' | 'missiles' | 'repair' | 'crew' | 'mood' | 'system' | 'reactor' | 'weapon';

export interface ShopItem {
  id: string;
  kind: ShopItemKind;
  label: string;
  description: string;
  cost: number;
  system?: SystemId;
  weapon?: WeaponKind;
  /** Limited items disappear once bought. */
  limited?: boolean;
  sold?: boolean;
}

export const MAX_WEAPONS = 4;

export function systemUpgradeCost(id: SystemId, currentLevel: number): number {
  const base: Record<SystemId, number> = { shields: 14, weapons: 12, engines: 10, stealth: 20, jump: 12 };
  return base[id] + currentLevel * 6;
}

export function reactorCost(reactor: number): number {
  return 16 + (reactor - 9) * 3;
}

export function generateShop(rng: Rng, sector: number): ShopItem[] {
  const items: ShopItem[] = [
    { id: 'fuel', kind: 'fuel', label: 'Fuel cell', description: '+1 fuel (one jump).', cost: 3 },
    { id: 'missiles', kind: 'missiles', label: 'Missile', description: '+1 missile.', cost: 6 },
    { id: 'repair', kind: 'repair', label: 'Hull patch', description: 'Repair 4 hull.', cost: 8 },
    { id: 'crew', kind: 'crew', label: 'Recruit a pirate', description: '+1 crew. Ex-Kristang slave, very motivated.', cost: 28 },
    { id: 'mood', kind: 'mood', label: 'Show-tune data crystal', description: "Skippy Mood +20. He'll sing. Badly.", cost: 14 },
    { id: 'armor', kind: 'armor', label: 'Hull reinforcement', description: '+5 max hull (and +5 hull). One per shipyard.', cost: 30, limited: true },
    { id: 'reactor', kind: 'reactor', label: 'Reactor coupling', description: '+1 reactor power.', cost: 0 },
  ];
  // Every shipyard offers every system upgrade.
  for (const s of SYSTEM_IDS) {
    items.push({ id: `sys-${s}`, kind: 'system', label: `${SYSTEM_NAMES[s]} upgrade`, description: `+1 ${SYSTEM_NAMES[s]} level.`, cost: 0, system: s });
  }
  const weaponPool: WeaponKind[] = sector >= 3 ? ['maser', 'twinMaser', 'heavyMaser', 'missile', 'railgun'] : ['maser', 'twinMaser', 'heavyMaser', 'missile'];
  const w = rng.pick(weaponPool);
  items.push({
    id: `weapon-${w}`, kind: 'weapon', label: WEAPONS[w].name, description: WEAPONS[w].description,
    cost: WEAPONS[w].cost, weapon: w, limited: true,
  });
  // Prices creep up slightly in later sectors.
  for (const it of items) it.cost = Math.round(it.cost * (1 + (sector - 1) * 0.04));
  return items;
}

/** Current price, which for upgrades depends on the loadout. */
export function priceOf(item: ShopItem, loadout: ShipLoadout, sector: number): number {
  const mult = 1 + (sector - 1) * 0.04;
  if (item.kind === 'system' && item.system) return Math.round(systemUpgradeCost(item.system, loadout.systems[item.system]) * mult);
  if (item.kind === 'reactor') return Math.round(reactorCost(loadout.reactor) * mult);
  return item.cost;
}

export function canBuy(item: ShopItem, res: Resources, loadout: ShipLoadout, sector: number): { ok: boolean; reason?: string } {
  if (item.sold) return { ok: false, reason: 'Sold out' };
  const cost = priceOf(item, loadout, sector);
  if (res.scrap < cost) return { ok: false, reason: 'Not enough scrap' };
  switch (item.kind) {
    case 'armor': if (res.maxHull >= 60) return { ok: false, reason: 'Maxed' }; break;
    case 'fuel': if (res.fuel >= MAX_FUEL) return { ok: false, reason: 'Tanks full' }; break;
    case 'missiles': if (res.missiles >= MAX_MISSILES) return { ok: false, reason: 'Magazine full' }; break;
    case 'repair': if (res.hull >= res.maxHull) return { ok: false, reason: 'Hull intact' }; break;
    case 'crew': if (res.crew >= MAX_CREW) return { ok: false, reason: 'No bunks left' }; break;
    case 'mood': if (res.mood >= 100) return { ok: false, reason: 'Skippy is insufferable enough' }; break;
    case 'reactor': if (loadout.reactor >= REACTOR_MAX) return { ok: false, reason: 'Maxed' }; break;
    case 'system': if (item.system && loadout.systems[item.system] >= SYSTEM_MAX[item.system]) return { ok: false, reason: 'Maxed' }; break;
    case 'weapon': if (loadout.weapons.length >= MAX_WEAPONS) return { ok: false, reason: 'No free hardpoint' }; break;
  }
  return { ok: true };
}

/** Apply a purchase. Returns false if not allowed. */
export function buy(item: ShopItem, res: Resources, loadout: ShipLoadout, sector: number): boolean {
  if (!canBuy(item, res, loadout, sector).ok) return false;
  res.scrap -= priceOf(item, loadout, sector);
  switch (item.kind) {
    case 'fuel': res.fuel += 1; break;
    case 'missiles': res.missiles += 1; break;
    case 'repair': res.hull = Math.min(res.maxHull, res.hull + 4); break;
    case 'armor': res.maxHull += 5; res.hull += 5; break;
    case 'crew': res.crew += 1; break;
    case 'mood': res.mood = Math.min(100, res.mood + 20); break;
    case 'reactor': loadout.reactor += 1; break;
    case 'system': if (item.system) loadout.systems[item.system] += 1; break;
    case 'weapon': if (item.weapon) loadout.weapons.push(item.weapon); break;
  }
  if (item.limited) item.sold = true;
  return true;
}
