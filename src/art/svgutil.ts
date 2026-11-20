// Small helpers for building procedural SVG strings.

let counter = 0;

/** Unique id with a short readable prefix, so several SVGs can share a page. */
export function uid(prefix: string): string {
  counter = (counter + 1) % 1_000_000;
  return `${prefix}${counter.toString(36)}_`;
}

/** Deterministic xorshift32 PRNG returning values in [0, 1). */
export function rng(seed: number): () => number {
  let s = seed >>> 0 || 0x9e3779b9;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

/** Round to one decimal to keep markup compact. */
export const r1 = (n: number): number => Math.round(n * 10) / 10;

export const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

export function svgDoc(viewBox: string, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="100%" height="100%">${body}</svg>`;
}

/** Gradient stop list: [offset, color, opacity?]. */
export type Stop = [number, string, number?];

function stopTags(stops: Stop[]): string {
  return stops
    .map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a === undefined ? '' : ` stop-opacity="${a}"`}/>`)
    .join('');
}

export function lin(id: string, stops: Stop[], x1 = 0, y1 = 0, x2 = 0, y2 = 1): string {
  return `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stopTags(stops)}</linearGradient>`;
}

export function rad(id: string, stops: Stop[], cx = 0.5, cy = 0.5, r = 0.5): string {
  return `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stopTags(stops)}</radialGradient>`;
}

/** Gaussian blur glow filter that keeps the source on top. */
export function glowFilter(id: string, sd: number): string {
  return `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${sd}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
}

/** Tiny rivet dots, drawn as zero-length round-capped strokes for compactness. */
export function rivets(pts: [number, number][], fill = '#1b1b1b', r = 0.9): string {
  const d = pts.map(([x, y]) => `M${r1(x)} ${r1(y)}h0`).join('');
  return `<path d="${d}" stroke="${fill}" stroke-width="${r * 2}" stroke-linecap="round" opacity=".75"/>`;
}

/** Path data for a four-pointed sparkle star centred on (x, y). */
export function sparkleD(x: number, y: number, s: number): string {
  const q = r1(s * 0.22);
  const p = r1(s - q);
  return `M${r1(x)} ${r1(y - s)}l${q} ${p} ${p} ${q}-${p} ${q}-${q} ${p}-${q}-${p}-${p}-${q} ${p}-${q}z`;
}

/** Four-pointed sparkle star centred on (x, y). */
export function sparkle(x: number, y: number, s: number, fill: string): string {
  return `<path d="${sparkleD(x, y, s)}" fill="${fill}"/>`;
}
