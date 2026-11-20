import type { ResourceDelta, Resources } from './types';

export const START_RESOURCES: Resources = {
  hull: 30,
  maxHull: 30,
  fuel: 8,
  missiles: 6,
  scrap: 25,
  crew: 8,
  mood: 60,
  alert: 0,
};

export const MAX_FUEL = 20;
export const MAX_MISSILES = 20;
export const MAX_CREW = 14;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Apply a delta, clamping each resource to its legal range. Returns the delta actually applied. */
export function applyDelta(res: Resources, d: ResourceDelta): ResourceDelta {
  const before = { ...res };
  if (d.hull) res.hull = clamp(res.hull + d.hull, 0, res.maxHull);
  if (d.fuel) res.fuel = clamp(res.fuel + d.fuel, 0, MAX_FUEL);
  if (d.missiles) res.missiles = clamp(res.missiles + d.missiles, 0, MAX_MISSILES);
  if (d.scrap) res.scrap = Math.max(0, res.scrap + d.scrap);
  if (d.crew) res.crew = clamp(res.crew + d.crew, 0, MAX_CREW);
  if (d.mood) res.mood = clamp(res.mood + d.mood, 0, 100);
  if (d.alert) res.alert = clamp(res.alert + d.alert, 0, 100);
  const applied: ResourceDelta = {};
  for (const k of ['hull', 'fuel', 'missiles', 'scrap', 'crew', 'mood', 'alert'] as const) {
    const diff = res[k] - before[k];
    if (diff !== 0) applied[k] = diff;
  }
  return applied;
}

export function meetsRequirements(res: Resources, req?: Partial<Resources>): boolean {
  if (!req) return true;
  return Object.entries(req).every(([k, v]) => (res[k as keyof Resources] ?? 0) >= (v ?? 0));
}

export type MoodBand = 'gleeful' | 'pleased' | 'annoyed' | 'sulking';

export function moodBand(mood: number): MoodBand {
  if (mood >= 75) return 'gleeful';
  if (mood >= 50) return 'pleased';
  if (mood >= 25) return 'annoyed';
  return 'sulking';
}

/** Skippy ability thresholds and mood costs. */
export const ABILITIES = {
  hack: { name: 'Hack Shields', minMood: 50, cost: 10 },
  stealth: { name: 'Stealth Field', minMood: 60, cost: 12 },
  fake: { name: 'Fake Wormhole', minMood: 70, cost: 18 },
} as const;

export type AbilityId = keyof typeof ABILITIES;

export function canUseAbility(mood: number, id: AbilityId): boolean {
  return mood >= ABILITIES[id].minMood;
}

export function describeDelta(d: ResourceDelta): string[] {
  const names: Record<keyof ResourceDelta, string> = {
    hull: 'Hull', fuel: 'Fuel', missiles: 'Missiles', scrap: 'Scrap', crew: 'Crew', mood: 'Skippy Mood', alert: 'Alien Alert',
  };
  return (Object.keys(d) as (keyof ResourceDelta)[])
    .filter((k) => d[k])
    .map((k) => `${names[k]} ${d[k]! > 0 ? '+' : ''}${d[k]}`);
}
