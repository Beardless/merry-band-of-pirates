import type { Faction, MapNode, NodeType, SectorMap } from './types';
import type { Rng } from './rng';

export const SECTOR_NAMES = [
  'Paradise Approach',
  'Kristang Border Clans',
  'The Contested Wormholes',
  'Thuranin Frontier',
  'Maxolhx Shadow',
  'The Relay Nexus',
];

export const TOTAL_SECTORS = 6;

/** Faction for a hostile node in a given sector. */
export function factionForSector(sector: number, rng: Rng): Faction {
  if (sector <= 2) return 'kristang';
  if (sector === 3) return rng.chance(0.5) ? 'kristang' : 'thuranin';
  if (sector === 4) return rng.chance(0.25) ? 'kristang' : 'thuranin';
  // Late sectors: mostly Thuranin, occasionally a Maxolhx hunter you should flee.
  return rng.chance(0.12) ? 'maxolhx' : 'thuranin';
}

/** Pursuit fleet faction when you are caught behind the front. */
export function pursuitFaction(sector: number): Faction {
  if (sector <= 2) return 'kristang';
  if (sector <= 4) return 'thuranin';
  return 'maxolhx';
}

/** Choose how many nodes go in each middle column so the total is 8-12. */
function columnCounts(rng: Rng): number[] {
  const middleCols = rng.int(3, 4);
  const total = middleCols === 3 ? rng.int(8, 11) : rng.int(10, 12);
  let remaining = total - 2;
  const counts = new Array(middleCols).fill(2) as number[];
  remaining -= 2 * middleCols;
  const order = rng.shuffle([...counts.keys()]);
  for (const i of order) {
    if (remaining <= 0) break;
    counts[i]++;
    remaining--;
  }
  return counts;
}

export interface GenerateOptions {
  /** Event ids that may be assigned to event nodes (already filtered for sector). */
  eventPool: string[];
}

export function generateSector(index: number, rng: Rng, opts: GenerateOptions): SectorMap {
  const counts = [1, ...columnCounts(rng), 1];
  const cols = counts.length;
  const nodes: MapNode[] = [];
  const byCol: number[][] = [];
  let id = 0;
  for (let c = 0; c < cols; c++) {
    byCol.push([]);
    const n = counts[c];
    for (let i = 0; i < n; i++) {
      const baseY = n === 1 ? 0.5 : 0.12 + (0.76 * i) / (n - 1);
      const jitterY = n === 1 ? 0 : (rng.next() - 0.5) * 0.08;
      const jitterX = c === 0 || c === cols - 1 ? 0 : (rng.next() - 0.5) * 0.06;
      nodes.push({
        id, col: c,
        x: 0.06 + (0.88 * c) / (cols - 1) + jitterX,
        y: baseY + jitterY,
        type: 'empty',
        visited: false,
      });
      byCol[c].push(id);
      id++;
    }
  }

  const edgeSet = new Set<string>();
  const edges: [number, number][] = [];
  const addEdge = (a: number, b: number) => {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (a === b || edgeSet.has(key)) return;
    edgeSet.add(key);
    edges.push([Math.min(a, b), Math.max(a, b)]);
  };

  // Connect consecutive columns by relative rank so lines rarely cross.
  for (let c = 0; c < cols - 1; c++) {
    const left = byCol[c];
    const right = byCol[c + 1];
    const rank = (i: number, len: number) => (len === 1 ? 0.5 : i / (len - 1));
    left.forEach((a, i) => {
      // nearest by rank on the right
      let best = 0;
      let bestD = Infinity;
      right.forEach((_, j) => {
        const d = Math.abs(rank(i, left.length) - rank(j, right.length));
        if (d < bestD) { bestD = d; best = j; }
      });
      addEdge(a, right[best]);
      // occasional branch to a neighbour
      if (rng.chance(0.45)) {
        const j2 = Math.min(right.length - 1, Math.max(0, best + (rng.chance(0.5) ? 1 : -1)));
        addEdge(a, right[j2]);
      }
    });
    right.forEach((b, j) => {
      let best = 0;
      let bestD = Infinity;
      left.forEach((_, i) => {
        const d = Math.abs(rank(i, left.length) - rank(j, right.length));
        if (d < bestD) { bestD = d; best = i; }
      });
      addEdge(left[best], b);
    });
  }
  // Occasional vertical links inside a middle column.
  for (let c = 1; c < cols - 1; c++) {
    const col = byCol[c];
    for (let i = 0; i < col.length - 1; i++) {
      if (rng.chance(0.25)) addEdge(col[i], col[i + 1]);
    }
  }

  const startId = byCol[0][0];
  const exitId = byCol[cols - 1][0];
  nodes[startId].type = 'start';
  nodes[startId].visited = true;
  nodes[exitId].type = index === TOTAL_SECTORS ? 'boss' : 'exit';
  if (index === TOTAL_SECTORS) nodes[exitId].faction = 'relay';

  // Assign middle node types. Guarantee one shop and two combats per sector.
  const middle = nodes.filter((n) => n.type === 'empty');
  const shuffled = rng.shuffle([...middle]);
  const forced: NodeType[] = ['shop', 'combat', 'combat', 'combat', 'event', 'event'];
  const pool = [...opts.eventPool];
  rng.shuffle(pool);
  shuffled.forEach((n, i) => {
    let type: NodeType;
    if (i < forced.length) type = forced[i];
    else {
      type = rng.weighted<NodeType>(['event', 'combat', 'shop', 'empty'], (t) =>
        ({ event: 38, combat: 36, shop: 12, empty: 14 } as Record<string, number>)[t]);
    }
    if (type === 'event' && pool.length === 0) type = 'empty';
    n.type = type;
    if (type === 'event') n.eventId = pool.pop();
    if (type === 'combat') n.faction = factionForSector(index, rng);
  });

  return {
    index,
    name: SECTOR_NAMES[index - 1] ?? `Sector ${index}`,
    nodes,
    edges,
    startId,
    exitId,
    pursuit: -1.2,
    cols,
  };
}

export function neighbors(map: SectorMap, id: number): number[] {
  const out: number[] = [];
  for (const [a, b] of map.edges) {
    if (a === id) out.push(b);
    else if (b === id) out.push(a);
  }
  return out;
}

/** Breadth-first hop distance from `from` to every node (-1 = unreachable). */
export function hopDistances(map: SectorMap, from: number): number[] {
  const dist = new Array(map.nodes.length).fill(-1) as number[];
  dist[from] = 0;
  const queue = [from];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const nb of neighbors(map, cur)) {
      if (dist[nb] === -1) {
        dist[nb] = dist[cur] + 1;
        queue.push(nb);
      }
    }
  }
  return dist;
}

export function isConnected(map: SectorMap): boolean {
  return hopDistances(map, map.startId).every((d) => d >= 0);
}

export function isOverrun(map: SectorMap, nodeId: number): boolean {
  const n = map.nodes[nodeId];
  return n.col < map.pursuit && n.id !== map.exitId;
}
