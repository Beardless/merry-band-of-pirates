// Core shared types for game logic. Pure data – no DOM.

export type SystemId = 'shields' | 'weapons' | 'engines' | 'stealth' | 'jump';
export const SYSTEM_IDS: SystemId[] = ['shields', 'weapons', 'engines', 'stealth', 'jump'];

export type Faction = 'kristang' | 'thuranin' | 'maxolhx' | 'relay';

/** Resource deltas used by events, shops and rewards. */
export interface ResourceDelta {
  hull?: number;
  fuel?: number;
  missiles?: number;
  scrap?: number;
  crew?: number;
  mood?: number;
  /** Alien Alert meter (0-100). Positive = aliens closer to learning about humans. */
  alert?: number;
}

export interface Resources {
  hull: number;
  maxHull: number;
  fuel: number;
  missiles: number;
  scrap: number;
  crew: number;
  /** Skippy Mood 0-100 */
  mood: number;
  /** Alien Alert 0-100. Reaching 100 loses the run. */
  alert: number;
}

export type WeaponKind = 'maser' | 'twinMaser' | 'heavyMaser' | 'missile' | 'railgun';

export interface WeaponDef {
  kind: WeaponKind;
  name: string;
  /** Power needed while armed. */
  power: number;
  /** Seconds to charge. */
  charge: number;
  /** Damage per projectile. */
  damage: number;
  /** Projectiles per volley. */
  shots: number;
  /** Consumes a missile per volley and ignores shields. */
  usesMissile?: boolean;
  /** Ignores this many shield layers. */
  pierce?: number;
  cost: number;
  description: string;
}

export interface ShipSystem {
  id: SystemId;
  /** Installed level (max power that can be routed). */
  level: number;
  /** Damage taken; usable capacity = level - damage. */
  damage: number;
  /** Power currently routed. */
  power: number;
  /** Crew stationed here. */
  crew: number;
}

/** Persistent ship configuration across the run (out of combat). */
export interface ShipLoadout {
  reactor: number;
  systems: Record<SystemId, number>; // levels
  weapons: WeaponKind[];
}

// ---------------------------------------------------------------- events

export type Speaker = 'skippy' | 'joe' | 'adams' | 'simms' | 'smythe' | 'nagatha' | 'narrator' | 'alien';

export interface DialogueLine {
  speaker: Speaker;
  text: string;
}

export interface EventOutcome {
  /** Relative weight when a choice has several possible outcomes. Default 1. */
  weight?: number;
  lines: DialogueLine[];
  effects?: ResourceDelta;
  /** Start a combat against an enemy of this faction after the dialog. */
  combat?: Faction;
  /** Upgrade a ship system by one level (free). */
  upgradeSystem?: SystemId;
  /** Grant a weapon. */
  weapon?: WeaponKind;
  /** Increase reactor power by this amount. */
  reactor?: number;
}

export interface EventChoice {
  label: string;
  /** Choice only enabled if resources meet these minimums (and is shown as a hint). */
  requires?: Partial<Pick<Resources, 'scrap' | 'fuel' | 'missiles' | 'crew' | 'mood'>>;
  outcomes: EventOutcome[];
}

export interface GameEvent {
  id: string;
  title: string;
  /** Inclusive sector range (1-6) where the event may appear. Default all. */
  minSector?: number;
  maxSector?: number;
  intro: DialogueLine[];
  choices: EventChoice[];
}

// ---------------------------------------------------------------- map

export type NodeType = 'start' | 'event' | 'combat' | 'shop' | 'empty' | 'exit' | 'boss';

export interface MapNode {
  id: number;
  col: number;
  /** Layout coordinates in 0..1 */
  x: number;
  y: number;
  type: NodeType;
  visited: boolean;
  /** Event id for event nodes (pre-rolled for determinism). */
  eventId?: string;
  /** Faction for combat nodes. */
  faction?: Faction;
}

export interface SectorMap {
  index: number; // 1-6
  name: string;
  nodes: MapNode[];
  edges: [number, number][];
  startId: number;
  exitId: number;
  /** Pursuit front, in column units. Nodes with col < pursuit are overrun. */
  pursuit: number;
  cols: number;
}
