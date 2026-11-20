// Procedural SVG sprites for ships, Skippy, portraits and icons.
// Every function is pure apart from the gradient-id counter, which only makes
// ids unique so that several sprites can live on one page.

import type { Faction, Speaker, SystemId } from '../game/types';
import { clamp, glowFilter, lin, r1, rad, rivets, rng, sparkle, sparkleD, svgDoc, uid } from './svgutil';

// ------------------------------------------------------------------ slots

/** Normalized (0..1) system positions on the ship images. Enemy slots fit inside every faction hull. */
export const SYSTEM_SLOTS: {
  player: Record<SystemId, { x: number; y: number }>;
  enemy: Record<SystemId, { x: number; y: number }>;
} = {
  player: {
    engines: { x: 0.17, y: 0.5 },
    stealth: { x: 0.38, y: 0.52 },
    shields: { x: 0.55, y: 0.38 },
    jump: { x: 0.66, y: 0.56 },
    weapons: { x: 0.84, y: 0.48 },
  },
  enemy: {
    weapons: { x: 0.36, y: 0.52 },
    shields: { x: 0.46, y: 0.43 },
    stealth: { x: 0.53, y: 0.57 },
    jump: { x: 0.6, y: 0.45 },
    engines: { x: 0.68, y: 0.52 },
  },
};

// ------------------------------------------------------------------ shared bits

const SCORCH = (id: string): string =>
  rad(id, [
    [0, '#070504', 0.9],
    [0.45, '#2b1a10', 0.55],
    [1, '#2b1a10', 0],
  ]);

function scorch(id: string, x: number, y: number, rx: number, ry: number): string {
  return `<ellipse cx="${r1(x)}" cy="${r1(y)}" rx="${r1(rx)}" ry="${r1(ry)}" fill="url(#${id})"/>`;
}

function blink(dur: number, begin = 0): string {
  return `<animate attributeName="opacity" values="1;.15;1" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/>`;
}

function light(x: number, y: number, color: string, r = 1.6, anim = ''): string {
  return `<g fill="${color}">${anim}<circle cx="${x}" cy="${y}" r="${r1(r * 2.6)}" opacity=".25"/><circle cx="${x}" cy="${y}" r="${r}"/></g>`;
}

// ------------------------------------------------------------------ Flying Dutchman

/** The Flying Dutchman, a battered stolen Thuranin star carrier. Faces right, viewBox 0 0 400 200. */
export function dutchmanSVG(opts: { damaged?: number } = {}): string {
  const dmg = clamp(opts.damaged ?? 0, 0, 1);
  const k = uid('fd');
  const hull = 'M88 72L150 65L236 62L300 67L346 78L388 95L393 102L374 112L332 122L252 128L150 131L92 127Z';

  const defs =
    lin(`${k}h`, [
      [0, '#b3c2b2'],
      [0.18, '#8c9c8d'],
      [0.55, '#5f6f63'],
      [1, '#262f2a'],
    ]) +
    lin(`${k}e`, [
      [0, '#8a948b'],
      [0.5, '#48514b'],
      [1, '#1a201d'],
    ]) +
    lin(`${k}d`, [
      [0, '#c5d0c3'],
      [1, '#5b6a5e'],
    ]) +
    lin(`${k}r`, [
      [0, '#b0663a'],
      [1, '#5a2c17'],
    ]) +
    lin(`${k}b`, [
      [0, '#8b97a5'],
      [1, '#47515d'],
    ]) +
    lin(`${k}p`, [
      [0, '#00a6d6', 0],
      [0.55, '#36e4ff', 0.55],
      [1, '#eaffff', 0.95],
    ], 0, 0, 1, 0) +
    rad(`${k}g`, [
      [0, '#ffffff'],
      [0.3, '#7ff4ff', 0.9],
      [1, '#00b8ff', 0],
    ]) +
    rad(`${k}f`, [
      [0, '#fff3b0'],
      [0.35, '#ff9a2e', 0.85],
      [1, '#ff3d00', 0],
    ]) +
    SCORCH(`${k}s`) +
    glowFilter(`${k}w`, 1.6) +
    `<clipPath id="${k}c"><path id="${k}H" d="${hull}"/></clipPath>`;

  // Engine plumes (pointing left, behind the engine block); one template reused per nozzle.
  const plumes =
    `<g id="${k}n"><path d="M24 64L2 69V75L24 80Z" fill="url(#${k}p)"/><ellipse cx="22" cy="72" rx="9" ry="12" fill="url(#${k}g)"/></g>` +
    `<use href="#${k}n" y="26"/><use href="#${k}n" y="50"/>`;

  // Docking bay arms on the underside.
  const arms =
    `<g id="${k}a"><path d="M135 124H149L153 160H139Z" fill="#3c4640" stroke="#161b18"/>` +
    `<path d="M138 130L149 138L140 146L151 154" fill="none" stroke="#7d877e" stroke-width=".8"/>` +
    `<path d="M133 158h24v5h-4v9h-4v-9h-8v9h-4v-9h-4Z" fill="#59625b" stroke="#161b18" stroke-width=".8"/>` +
    `<circle cx="146" cy="160.5" r="1.2" fill="#ffb347"/></g><use href="#${k}a" x="64"/><use href="#${k}a" x="130"/>`;
  const rail = `<path d="M138 132H280V138H138Z" fill="#2c3430" stroke="#121614" stroke-width=".8"/><path d="M140 137L150 133L160 137L170 133L180 137L190 133L200 137L210 133L220 137L230 133L240 137L250 133L260 137L270 133L278 137" fill="none" stroke="#69726b" stroke-width=".7"/>`;
  // A small dropship parked in the middle clamp.
  const dropship = `<path d="M196 172L222 170L232 176L220 182L196 181L192 176Z" fill="#7b7466" stroke="#1d1b17" stroke-width=".8"/><path d="M200 175H220" stroke="#3a372f" stroke-width=".8"/><circle cx="226" cy="176" r="1" fill="#8ff"/>`;

  // Engine block (left).
  const engine =
    `<path d="M34 58L96 52L106 62L106 134L96 144L34 138L28 126L28 70Z" fill="url(#${k}e)" stroke="#121614" stroke-width="1.2"/>` +
    `<g id="${k}z"><path d="M18 61L32 59V85L18 83Z" fill="#2d3430" stroke="#0e1210"/><ellipse cx="19" cy="72" rx="3" ry="9" fill="#bff" opacity=".9"/></g>` +
    `<use href="#${k}z" y="26"/><use href="#${k}z" y="50"/>` +
    `<g stroke="#1c221f" stroke-width=".8" fill="none"><path d="M50 56V140M74 54V142M34 86H106M34 110H106"/></g>` +
    `<path d="M80 65h18m-18 4h18m-18 4h18m-18 4h18M54 117h16m-16 4h16m-16 4h16m-16 4h16" stroke="#151a17" stroke-width="1.8"/>` +
    `<path d="M36 90H48V106H36Z" fill="url(#${k}r)" stroke="#2a150b" stroke-width=".6"/>` +
    rivets([[38, 92], [46, 92], [38, 104], [46, 104]]) +
    `<path d="M36 60L96 54L98 58L38 63Z" fill="#fff" opacity=".18"/>`;

  // Mismatched patch plates, all clipped to the hull.
  const patches =
    `<g stroke="#d6b06a" stroke-opacity=".55" stroke-width=".7" stroke-dasharray="2 1.4">` +
    `<path d="M108 76H146V92H108Z" fill="url(#${k}r)"/>` +
    `<path d="M228 96L268 94L270 116L230 118Z" fill="url(#${k}b)"/>` +
    `<path d="M296 70L330 76L328 92L296 88Z" fill="#7f9a62"/>` +
    `<path d="M120 108H150V122H120Z" fill="#454b51"/></g>` +
    `<path d="M262 72H286V84H262Z" fill="#6b5e4c"/>` +
    rivets([
      [110, 78], [144, 78], [110, 90], [144, 90], [127, 78], [127, 90],
      [231, 98], [266, 96], [232, 115], [267, 114],
      [298, 72], [328, 78], [298, 86], [326, 90],
      [122, 110], [148, 110], [122, 120], [148, 120],
      [264, 74], [284, 74], [264, 82], [284, 82],
    ]) +
    `<g stroke="#8a4a24" stroke-width="1.4" opacity=".45" stroke-linecap="round"><path d="M114 92V101M131 92V99M141 92V104M246 117V125M312 90V100"/></g>`;

  // Hole in the plating with exposed girders.
  const girders =
    `<path d="M166 94L188 91L214 92L218 118L196 121L172 122L169 108Z" fill="#0f1311" stroke="#5a3b25" stroke-width="1.2"/>` +
    `<g stroke="#77807a" stroke-width="1.1" fill="none"><path d="M170 98H215M171 116H216"/><path d="M172 98L182 116L192 98L202 116L212 98"/></g>` +
    `<g stroke="#3b443f" stroke-width=".6"><path d="M178 92V122M198 92V122"/></g>`;

  const panelLines = `<g stroke="#1f2622" stroke-width=".7" fill="none" opacity=".8"><path d="M130 60V135M160 60V135M226 58V135M292 60V135M338 70V130M88 100H392M150 84H230M300 110H370"/></g><path d="M88 72L150 65L236 62L300 67L346 78L388 95L388 98L346 81L300 70L236 65L150 68L88 75Z" fill="#fff" opacity=".2"/><path d="M92 127L150 131L252 128L332 122L374 112L374 106L332 116L252 122L150 125L92 121Z" fill="#000" opacity=".3"/>`;

  const baseScorch =
    scorch(`${k}s`, 192, 74, 18, 6) + scorch(`${k}s`, 318, 110, 14, 7) + scorch(`${k}s`, 126, 98, 10, 8) + scorch(`${k}s`, 360, 100, 8, 5);

  const windows = `<path d="M242 87h4.5m3.5 0h4.5m3.5 0h4.5M304 87h4.5m3.5 0h4.5m3.5 0h4.5" stroke="#9ff3ff" stroke-width="2.2" opacity=".85"/>`;

  // Dorsal spine + bridge bump + antenna.
  const top =
    `<path d="M160 66L178 57L300 57L314 67Z" fill="url(#${k}d)" stroke="#1d2420" stroke-width=".9"/>` +
    `<path d="M180 60H300" stroke="#3a443e" stroke-width=".6"/>` +
    `<path d="M256 58Q260 44 278 42L300 43Q311 48 312 58Z" fill="url(#${k}d)" stroke="#1d2420" stroke-width=".9"/>` +
    `<path d="M270 50L300 49L304 54L270 55Z" fill="#7ff4ff" opacity=".85" filter="url(#${k}w)"/>` +
    `<path d="M276 51H298" stroke="#1d2420" stroke-width=".5" stroke-dasharray="3 1.5"/>` +
    `<path d="M290 43L296 26M296 26L300 30" stroke="#2a312d" stroke-width="1.2" fill="none"/>` +
    light(296, 26, '#ff4b3e', 1.2, blink(1.6)) +
    // Shield emitter dish.
    `<path d="M212 62Q222 50 232 62Z" fill="#9fb0a2" stroke="#1d2420" stroke-width=".8"/><circle cx="222" cy="55" r="2" fill="#7ff" filter="url(#${k}w)"/>`;

  // Bolted-on nose cap and twin gun turret.
  const nose =
    `<path d="M346 78L388 95L393 102L374 112L342 118L338 96Z" fill="#7b7f84" stroke="#1d2420" stroke-width="1"/>` +
    `<path d="M346 78L388 95L386 98L344 82Z" fill="#fff" opacity=".25"/>` +
    rivets([[346, 84], [358, 89], [370, 94], [346, 110], [362, 110], [376, 104]]) +
    `<g fill="#3a413c" stroke="#121614" stroke-width=".7"><rect x="332" y="70" width="34" height="2.6"/><rect x="332" y="74.5" width="30" height="2.6"/></g>` +
    `<path d="M322 78Q324 68 336 68Q344 70 344 79Z" fill="#59625b" stroke="#121614" stroke-width=".9"/>` +
    // Missile pod on the chin.
    `<path d="M300 118H322L320 128H302Z" fill="#4e554f" stroke="#121614" stroke-width=".7"/><path d="M306 123h0m5 0h0m5 0h0" stroke="#1a1f1c" stroke-width="3.2" stroke-linecap="round"/>`;

  const lights =
    light(98, 54, '#ff4b3e', 1.4, blink(2.1, 0.5)) +
    light(386, 97, '#5dff8b', 1.3, blink(1.9)) +
    light(150, 130, '#ffb347', 1.1) +
    light(250, 127, '#ffb347', 1.1);

  // Damage overlay.
  let damage = '';
  if (dmg > 0) {
    const rand = rng(1337);
    const nScorch = Math.round(dmg * 5);
    for (let i = 0; i < nScorch; i++) {
      damage += scorch(`${k}s`, Math.round(110 + rand() * 260), Math.round(74 + rand() * 46), Math.round(6 + rand() * 12), Math.round(4 + rand() * 6));
    }
    const nCrack = Math.round(dmg * 3);
    let cracks = '';
    for (let i = 0; i < nCrack; i++) {
      let x = 120 + rand() * 240;
      let y = 76 + rand() * 40;
      let d = `M${Math.round(x)} ${Math.round(y)}`;
      for (let j = 0; j < 4; j++) {
        x += 3 + rand() * 6;
        y += (rand() - 0.5) * 10;
        d += `L${Math.round(x)} ${Math.round(y)}`;
      }
      cracks += d;
    }
    damage += `<g fill="none"><g stroke="#0a0705" stroke-width="2"><path id="${k}x" d="${cracks}"/></g><use href="#${k}x" stroke="#ff8a2a" stroke-width=".6"/></g>`;
  }
  let overlay = '';
  if (dmg > 0) {
    const rand = rng(4242);
    if (dmg > 0.35) {
      const nFire = Math.round(dmg * 2.4);
      for (let i = 0; i < nFire; i++) {
        const x = Math.round(130 + rand() * 220);
        const y = Math.round(70 + rand() * 50);
        overlay += `<ellipse cx="${x - 6}" cy="${y - 8}" rx="${Math.round(10 + rand() * 6)}" ry="5" fill="#555" opacity=".35"/><ellipse cx="${x}" cy="${y}" rx="${Math.round(5 + rand() * 4)}" ry="${Math.round(4 + rand() * 3)}" fill="url(#${k}f)"/>`;
      }
    }
    const nSpark = Math.round(dmg * 6);
    const sp = ['', ''];
    for (let i = 0; i < nSpark; i++) {
      sp[i % 2] += sparkleD(Math.round(110 + rand() * 270), Math.round(68 + rand() * 56), 3 + Math.round(rand() * 3));
    }
    overlay += `<path d="${sp[0]}" fill="#ffc54a"/><path d="${sp[1]}" fill="#fff6c0"/>`;
  }

  const body =
    `<defs>${defs}</defs>` +
    plumes +
    rail +
    arms +
    dropship +
    `<use href="#${k}H" fill="url(#${k}h)"/>` +
    `<g clip-path="url(#${k}c)">${panelLines}${patches}${baseScorch}${girders}${windows}${damage}</g>` +
    `<use href="#${k}H" fill="none" stroke="#141a17" stroke-width="1.3"/>` +
    engine +
    top +
    nose +
    lights +
    overlay;
  return svgDoc('0 0 400 200', body);
}

// ------------------------------------------------------------------ Kristang

function kristangSVG(variant: number): string {
  const k = uid(`kr${variant}`);
  const P = [
    { x0: 60, x1: 244, t: 64, b: 122 },
    { x0: 40, x1: 260, t: 58, b: 126 },
    { x0: 26, x1: 270, t: 46, b: 136 },
  ][variant];
  const { x0, x1, t, b } = P;
  const m = (t + b) / 2;
  const defs =
    lin(`${k}i`, [
      [0, '#7a6a60'],
      [0.25, '#55463f'],
      [0.7, '#2f2522'],
      [1, '#161110'],
    ]) +
    lin(`${k}r`, [
      [0, '#a24a22'],
      [0.6, '#6b2c14'],
      [1, '#3a170b'],
    ]) +
    lin(`${k}p`, [
      [0, '#fff2b0', 0.95],
      [0.35, '#ff8c1a', 0.7],
      [1, '#ff3c00', 0],
    ], 0, 0, 1, 0) +
    rad(`${k}g`, [
      [0, '#fff5c8'],
      [0.35, '#ff9a2a', 0.85],
      [1, '#ff4400', 0],
    ]) +
    SCORCH(`${k}s`) +
    glowFilter(`${k}w`, 1.4);

  const hull = `M${x0} ${m - 8}L${x0 + 26} ${t + 6}L${x1 - 34} ${t}L${x1} ${t + 6}L${x1} ${b - 6}L${x1 - 34} ${b}L${x0 + 30} ${b - 3}L${x0 + 8} ${m + 12}Z`;

  // Engines (right side, pointing right).
  const nEng = variant + 2;
  let engines = '';
  for (let i = 0; i < nEng; i++) {
    const y = t + 10 + ((b - t - 20) * (i + 0.5)) / nEng;
    const h = Math.min(14, (b - t - 20) / nEng - 2);
    engines += `<path d="M${x1 + 18} ${r1(y - h / 2)}L${Math.min(299, x1 + 44)} ${r1(y - h / 4)}L${Math.min(299, x1 + 44)} ${r1(y + h / 4)}L${x1 + 18} ${r1(y + h / 2)}Z" fill="url(#${k}p)"/>`;
    engines += `<path d="M${x1 - 2} ${r1(y - h / 2 - 2)}H${x1 + 14}L${x1 + 18} ${r1(y - h / 2)}V${r1(y + h / 2)}L${x1 + 14} ${r1(y + h / 2 + 2)}H${x1 - 2}Z" fill="#2a2220" stroke="#0b0807"/>`;
    engines += `<ellipse cx="${x1 + 18}" cy="${r1(y)}" rx="5" ry="${r1(h / 2 + 2)}" fill="url(#${k}g)"/>`;
  }

  // Nose ram and spinal gun.
  const ram =
    `<path d="M${x0 - 22} ${m + 2}L${x0 + 18} ${m - 10}L${x0 + 26} ${m + 4}L${x0 + 14} ${m + 16}Z" fill="#3b3330" stroke="#0c0908"/>` +
    `<path d="M${x0 - 22} ${m + 2}L${x0 + 18} ${m - 10}L${x0 + 20} ${m - 6}Z" fill="#c9a28a" opacity=".45"/>`;
  const spinal =
    `<rect x="${x0 - 30}" y="${m - 21}" width="${70}" height="${7 + variant}" fill="#2c2523" stroke="#0c0908"/>` +
    `<rect x="${x0 - 36}" y="${m - 23}" width="9" height="${11 + variant}" fill="#4a3f3a" stroke="#0c0908"/>` +
    `<rect x="${x0 - 28}" y="${m - 20}" width="66" height="1.5" fill="#8a7a70" opacity=".6"/>`;

  // Armor slabs.
  const rand = rng(77 + variant * 13);
  let slabs = '';
  const nSlab = 4 + variant * 2;
  const span = x1 - 40 - (x0 + 34);
  for (let i = 0; i < nSlab; i++) {
    const sx = x0 + 34 + (span * i) / nSlab;
    const w = span / nSlab - 3;
    const rust = rand() < 0.45;
    const top = i % 2 ? t + 5 : t + 2;
    slabs += `<path d="M${r1(sx)} ${top}H${r1(sx + w)}L${r1(sx + w + 3)} ${m - 4}H${r1(sx - 2)}Z" fill="url(#${k}${rust ? 'r' : 'i'})" stroke="#0e0a09" stroke-width=".9"/>`;
    slabs += `<path d="M${r1(sx)} ${top}H${r1(sx + w)}L${r1(sx + w)} ${top + 2}H${r1(sx)}Z" fill="#e0a07a" opacity=".3"/>`;
    slabs += rivets([[sx + 3, top + 4], [sx + w - 3, top + 4], [sx + 3, m - 7], [sx + w - 2, m - 7]], '#0e0a09', 1);
    if (i % 2 === 0) {
      slabs += `<path d="M${r1(sx + 2)} ${m + 4}H${r1(sx + w + 8)}L${r1(sx + w + 4)} ${b - 6}H${r1(sx + 4)}Z" fill="url(#${k}i)" stroke="#0e0a09" stroke-width=".8" opacity=".85"/>`;
    }
  }

  // Spikes on top and bottom.
  let spikes = '';
  for (let x = x0 + 40; x < x1 - 40; x += 22 - variant * 2) {
    spikes += `<path d="M${x} ${t + 4}L${x + 4} ${t - 10 - variant * 2}L${x + 9} ${t + 3}Z"/>`;
  }
  for (let x = x0 + 50; x < x1 - 50; x += 34) {
    spikes += `<path d="M${x} ${b - 2}L${x + 3} ${b + 9}L${x + 8} ${b - 2}Z"/>`;
  }
  spikes = `<g fill="#3a302c" stroke="#0c0908" stroke-width=".7">${spikes}</g>`;

  // Turrets with crude gun barrels pointing left.
  let turrets = '';
  const nTur = variant + 1;
  for (let i = 0; i < nTur; i++) {
    const tx = x0 + 70 + i * ((x1 - x0 - 120) / Math.max(1, nTur));
    const ty = t - 2;
    turrets +=
      `<rect x="${r1(tx - 34)}" y="${ty - 6}" width="34" height="3.4" fill="#2a2321" stroke="#0c0908" stroke-width=".7"/>` +
      `<rect x="${r1(tx - 30)}" y="${ty - 1.6}" width="30" height="3.4" fill="#2a2321" stroke="#0c0908" stroke-width=".7"/>` +
      `<path d="M${r1(tx - 4)} ${ty + 6}L${r1(tx - 2)} ${ty - 10}H${r1(tx + 18)}L${r1(tx + 22)} ${ty + 6}Z" fill="url(#${k}r)" stroke="#0c0908"/>` +
      `<rect x="${r1(tx + 2)}" y="${ty - 6}" width="5" height="2" fill="#ffb347" filter="url(#${k}w)"/>`;
  }

  // Command tower for larger ships.
  const tower =
    variant > 0
      ? `<path d="M${x1 - 92} ${t + 2}L${x1 - 86} ${t - 18}H${x1 - 50}L${x1 - 44} ${t + 2}Z" fill="url(#${k}i)" stroke="#0c0908"/><rect x="${x1 - 84}" y="${t - 12}" width="32" height="2.4" fill="#ffae3a" filter="url(#${k}w)"/>` +
        rivets([[x1 - 84, t - 4], [x1 - 70, t - 4], [x1 - 56, t - 4]], '#0c0908', 1)
      : '';

  const detail =
    `<g stroke="#120d0b" stroke-width=".8" opacity=".9"><path d="M${x0 + 30} ${m}H${x1 - 6}M${x0 + 26} ${m + 12}H${x1 - 4}"/></g>` +
    `<g fill="#ff7a1a">${[0.3, 0.45, 0.6, 0.75].map((f) => `<rect x="${r1(x0 + (x1 - x0) * f)}" y="${m + 6}" width="5" height="1.8"/>`).join('')}</g>` +
    scorch(`${k}s`, x0 + (x1 - x0) * 0.35, m + 16, 14, 6) +
    scorch(`${k}s`, x0 + (x1 - x0) * 0.7, t + 10, 10, 5) +
    `<path d="M${x0 + 8} ${m + 12}L${x0 + 30} ${b - 3}L${x1 - 34} ${b}L${x1} ${b - 6}L${x1} ${b - 14}L${x1 - 34} ${b - 8}L${x0 + 30} ${b - 10}Z" fill="#000" opacity=".35"/>`;

  const lights = light(x1 - 6, t + 6, '#ff3b2e', 1.3, blink(1.3)) + light(x0 + 4, m + 4, '#ffb347', 1.1);

  const body =
    `<defs>${defs}</defs>` +
    engines +
    spikes +
    `<path d="${hull}" fill="url(#${k}i)" stroke="#0c0908" stroke-width="1.3"/>` +
    slabs +
    detail +
    tower +
    turrets +
    spinal +
    ram +
    lights;
  return svgDoc('0 0 300 180', body);
}

// ------------------------------------------------------------------ Thuranin

function thuraninSVG(variant: number): string {
  const k = uid(`th${variant}`);
  const shapes = [
    'M40 92C90 60 190 52 240 70C264 78 264 104 240 112C190 128 90 124 40 92Z',
    'M54 90C100 64 190 60 236 74C254 80 254 100 236 106C190 120 100 116 54 90Z',
    'M30 90C60 74 100 60 150 60C200 60 230 74 236 90C230 106 200 120 150 120C100 120 60 106 30 90Z',
  ];
  const hull = shapes[variant];
  const defs =
    lin(`${k}h`, [
      [0, '#d5e2d6'],
      [0.3, '#9db2a2'],
      [0.65, '#5b7064'],
      [1, '#26332c'],
    ]) +
    lin(`${k}c`, [
      [0, '#e8fff0', 0.9],
      [1, '#5fa883', 0.5],
    ]) +
    rad(`${k}g`, [
      [0, '#f0fff4'],
      [0.35, '#9dffc6', 0.85],
      [1, '#2dff9a', 0],
    ]) +
    lin(`${k}p`, [
      [0, '#cfffe2', 0.9],
      [1, '#5fffb0', 0],
    ], 0, 0, 1, 0) +
    glowFilter(`${k}w`, 1.2) +
    `<clipPath id="${k}k"><path id="${k}H" d="${hull}"/></clipPath>`;

  let extras: string;
  let lines: string;
  let engineX = 252;
  if (variant === 0) {
    extras =
      `<path d="M178 64L226 36L242 38L214 70Z" fill="url(#${k}h)" stroke="#1d2a23" stroke-width=".8"/>` +
      `<path d="M178 118L226 146L242 144L214 112Z" fill="url(#${k}h)" stroke="#1d2a23" stroke-width=".8"/>`;
    lines = 'M60 92C100 70 180 64 230 76M60 92C100 112 180 118 230 106M120 80C160 74 200 74 236 82';
  } else if (variant === 1) {
    extras =
      `<path d="M150 70L162 50H172L176 72ZM150 110L162 130H172L176 108Z" fill="#4c5f53" stroke="#1d2a23" stroke-width=".8"/>` +
      `<ellipse cx="174" cy="46" rx="44" ry="8" fill="url(#${k}h)" stroke="#1d2a23" stroke-width=".8"/>` +
      `<ellipse cx="174" cy="134" rx="44" ry="8" fill="url(#${k}h)" stroke="#1d2a23" stroke-width=".8"/>` +
      `<path d="M134 44H210M134 132H210" stroke="#c8ffd8" stroke-width=".7" opacity=".8" filter="url(#${k}w)"/>` +
      `<ellipse cx="218" cy="46" rx="4" ry="5" fill="url(#${k}g)"/><ellipse cx="218" cy="134" rx="4" ry="5" fill="url(#${k}g)"/>`;
    lines = 'M74 90C110 72 180 68 228 80M74 90C110 108 180 112 228 100';
    engineX = 248;
  } else {
    extras =
      `<path d="M150 60C110 40 60 40 30 52C70 50 110 56 140 66ZM150 120C110 140 60 140 30 128C70 130 110 124 140 114Z" fill="url(#${k}h)" stroke="#1d2a23" stroke-width=".8"/>` +
      `<path d="M226 76L262 70V110L226 104Z" fill="#4c5f53" stroke="#1d2a23" stroke-width=".8"/>`;
    lines = 'M50 90C80 76 110 68 150 68C190 68 214 78 226 90M50 90C80 104 110 112 150 112C190 112 214 102 226 90M40 50C80 46 115 54 140 64';
    engineX = 262;
  }

  const engine =
    `<path d="M${engineX} 84L298 88V92L${engineX} 96Z" fill="url(#${k}p)"/>` +
    `<ellipse cx="${engineX}" cy="90" rx="5" ry="10" fill="#33443a" stroke="#1d2a23"/>` +
    `<ellipse cx="${engineX + 1}" cy="90" rx="6" ry="11" fill="url(#${k}g)"/>`;

  const body =
    `<defs>${defs}</defs>` +
    extras +
    engine +
    `<use href="#${k}H" fill="url(#${k}h)"/>` +
    `<g clip-path="url(#${k}k)">` +
    `<ellipse cx="140" cy="70" rx="90" ry="12" fill="#fff" opacity=".22"/>` +
    `<ellipse cx="150" cy="118" rx="110" ry="14" fill="#000" opacity=".25"/>` +
    `<path d="M100 60V125M170 56V128M210 60V125" stroke="#2c3a32" stroke-width=".5" opacity=".6"/>` +
    `</g>` +
    `<use href="#${k}H" fill="none" stroke="#1a2620" stroke-width="1"/>` +
    `<path d="${lines}" fill="none" stroke="#c8ffd8" stroke-width=".8" opacity=".85" filter="url(#${k}w)"/>` +
    // Canopy lens.
    `<path d="M88 82C110 70 150 68 172 74C152 82 112 86 88 82Z" fill="url(#${k}c)" stroke="#2c3a32" stroke-width=".6"/>` +
    `<path d="M100 79C120 73 145 72 160 74" stroke="#fff" stroke-width="1" opacity=".7" fill="none"/>` +
    `<g fill="#b8ffd4" filter="url(#${k}w)"><circle cx="118" cy="98" r="1.3"/><circle cx="134" cy="99" r="1.3"/><circle cx="150" cy="99.5" r="1.3"/><circle cx="166" cy="99" r="1.3"/></g>` +
    light(variant === 2 ? 34 : 50, 91, '#b8ffd4', 1.2, blink(2.4));
  return svgDoc('0 0 300 180', body);
}

// ------------------------------------------------------------------ Maxolhx

function maxolhxSVG(variant: number): string {
  const k = uid(`mx${variant}`);
  const tipX = 276 + variant * 6;
  const tipY = 14 - variant * 4;
  const outer = `M10 90L120 70L212 ${22 - variant * 2}L${tipX} ${tipY}L246 48L230 90L246 132L${tipX} ${180 - tipY}L212 ${158 + variant * 2}L120 110Z`;
  const upper = `M10 90L120 70L212 ${22 - variant * 2}L${tipX} ${tipY}L246 48L230 90Z`;
  const defs =
    lin(`${k}u`, [
      [0, '#3a3348'],
      [0.5, '#1a1622'],
      [1, '#0a080e'],
    ]) +
    lin(`${k}l`, [
      [0, '#100d16'],
      [1, '#030205'],
    ]) +
    rad(`${k}g`, [
      [0, '#f6e6ff'],
      [0.3, '#b65cff', 0.9],
      [1, '#5a00c8', 0],
    ]) +
    lin(`${k}p`, [
      [0, '#e9c8ff', 0.85],
      [1, '#7a1cff', 0],
    ], 0, 0, 1, 0) +
    glowFilter(`${k}w`, 1.8);

  const prongs =
    variant === 1
      ? `<path d="M120 70L60 52L40 54L100 76ZM120 110L60 128L40 126L100 104Z" fill="url(#${k}u)" stroke="#000"/>` +
        `<path d="M110 72L56 55M110 108L56 125" stroke="#a24dff" stroke-width=".7" filter="url(#${k}w)"/>`
      : variant === 2
        ? `<path d="M150 66L176 30L188 32L172 70ZM150 114L176 150L188 148L172 110Z" fill="url(#${k}u)" stroke="#000"/>`
        : '';

  const seams =
    `M30 90L120 78L200 44L${tipX - 20} ${tipY + 8}` +
    `M30 90L120 102L200 136L${tipX - 20} ${180 - tipY - 8}` +
    `M140 82L196 82L214 70M140 98L196 98L214 110`;

  const body =
    `<defs>${defs}</defs>` +
    `<path d="M236 80L298 86V94L236 100Z" fill="url(#${k}p)"/>` +
    prongs +
    `<path d="${outer}" fill="url(#${k}l)" stroke="#000" stroke-width="1.2"/>` +
    `<path d="${upper}" fill="url(#${k}u)"/>` +
    `<path d="M10 90L120 70L212 ${22 - variant * 2}" fill="none" stroke="#6e6185" stroke-width=".8" opacity=".7"/>` +
    `<path d="M10 90H230" stroke="#4b4060" stroke-width="1.2"/>` +
    `<path d="${seams}" fill="none" stroke="#b665ff" stroke-width="1" filter="url(#${k}w)"/>` +
    `<g fill="#cf9bff" filter="url(#${k}w)">${[60, 76, 92].map((x) => `<path d="M${x} 86L${x + 8} 85L${x + 8} 86.6Z"/>`).join('')}</g>` +
    // Core eye.
    `<path d="M150 82L180 90L150 98L134 90Z" fill="#0a070f" stroke="#4a3466"/>` +
    `<ellipse cx="160" cy="90" rx="14" ry="7" fill="url(#${k}g)"/>` +
    `<ellipse cx="160" cy="90" rx="3" ry="2" fill="#fff"/>` +
    // Rear engine slit.
    `<path d="M228 74L240 72L236 90L240 108L228 106L224 90Z" fill="#14101b" stroke="#000"/>` +
    `<ellipse cx="236" cy="90" rx="4" ry="16" fill="url(#${k}g)"/>` +
    light(tipX - 6, tipY + 3, '#c27aff', 1.1, blink(3)) +
    light(tipX - 6, 177 - tipY, '#c27aff', 1.1, blink(3, 1.5));
  return svgDoc('0 0 300 180', body);
}

// ------------------------------------------------------------------ Relay station (boss)

function relaySVG(): string {
  const k = uid('rl');
  const hub = 'M110 56H200L214 70V114L200 128H110L96 114V70Z';
  const defs =
    lin(`${k}h`, [
      [0, '#c3d1c5'],
      [0.35, '#86998b'],
      [1, '#2a352f'],
    ]) +
    lin(`${k}r`, [
      [0, '#a24a22'],
      [1, '#3d1a0c'],
    ]) +
    lin(`${k}d`, [
      [0, '#4c5651'],
      [0.5, '#c9d4cc'],
      [1, '#59645d'],
    ], 0, 0, 1, 0) +
    lin(`${k}m`, [
      [0, '#3d4842'],
      [0.5, '#a8b5ab'],
      [1, '#2b332f'],
    ], 0, 0, 1, 0) +
    rad(`${k}e`, [
      [0, '#fff0f0'],
      [0.3, '#ff3a3a', 0.9],
      [1, '#c00000', 0],
    ]) +
    SCORCH(`${k}s`) +
    glowFilter(`${k}w`, 1.5);

  const ringBack = `<path d="M40 92A120 34 0 0 1 280 92" fill="none" stroke="#33403a" stroke-width="7"/><path d="M40 92A120 34 0 0 1 280 92" fill="none" stroke="#8fa596" stroke-width="1" opacity=".6"/>`;
  const ringFront = `<path d="M40 92A120 34 0 0 0 280 92" fill="none" stroke="#5a6b60" stroke-width="7"/><path d="M40 92A120 34 0 0 0 280 92" fill="none" stroke="#c8ffd8" stroke-width=".8" opacity=".75" filter="url(#${k}w)"/>`;

  // Spire up top, short keel below.
  const spire =
    `<path d="M150 56L153 6H157L160 56Z" fill="url(#${k}m)" stroke="#121614" stroke-width=".8"/>` +
    `<path d="M141 40H169M144 26H166M147 14H163" stroke="#3a443e" stroke-width="2"/>` +
    `<path d="M150 128L152 172H158L160 128Z" fill="url(#${k}m)" stroke="#121614" stroke-width=".8"/>` +
    light(155, 6, '#ff3a3a', 2, blink(1)) +
    light(155, 172, '#ff3a3a', 1.6, blink(1, 0.5));

  // Dish array (faces left).
  const dish =
    `<path d="M88 84H70V100H88Z" fill="#3b4540" stroke="#121614"/>` +
    `<ellipse cx="64" cy="92" rx="16" ry="58" fill="url(#${k}d)" stroke="#121614"/>` +
    `<ellipse cx="60" cy="92" rx="11" ry="50" fill="#2c3531"/>` +
    `<path d="M60 42L22 92L60 142M58 70L22 92L58 114" fill="none" stroke="#7d8a81" stroke-width="1.1"/>` +
    `<circle cx="22" cy="92" r="9" fill="url(#${k}e)"/>` +
    `<circle cx="22" cy="92" r="3" fill="#2b2b2b" stroke="#ff5a5a"/>`;

  // Radiator / antenna panels on the right.
  const panels =
    `<path d="M214 86H250V98H214Z" fill="#3a443e" stroke="#121614"/>` +
    `<path d="M248 52H284V82H248ZM248 102H284V132H248Z" fill="#2c3a4a" stroke="#121614"/>` +
    `<path d="M248 62H284M248 72H284M260 52V82M272 52V82M248 112H284M248 122H284M260 102V132M272 102V132" stroke="#5f7a96" stroke-width=".6"/>` +
    `<path d="M252 82V102M280 82V102" stroke="#59625b" stroke-width="2"/>`;

  // Kristang plates bolted crudely onto the Thuranin hub.
  const kplates =
    `<path d="M104 72L136 66L140 90L102 94Z" fill="url(#${k}r)" stroke="#120a06"/>` +
    `<path d="M172 98L208 94L210 120L176 124Z" fill="url(#${k}r)" stroke="#120a06"/>` +
    `<path d="M150 104H170V122H150Z" fill="#4a3f3a" stroke="#120a06"/>` +
    rivets([[106, 74], [134, 68], [137, 88], [104, 92], [120, 70], [175, 100], [206, 96], [208, 118], [178, 122], [152, 106], [168, 106], [152, 120], [168, 120]], '#120a06', 1.1) +
    `<path d="M104 80L102 94M120 68L124 92" stroke="#e0a07a" stroke-width=".6" opacity=".4"/>`;

  // Crude Kristang guns.
  const guns =
    `<g fill="#2a2321" stroke="#0c0908" stroke-width=".8"><rect x="66" y="60" width="40" height="4"/><rect x="66" y="120" width="40" height="4"/><rect x="62" y="58" width="6" height="8"/><rect x="62" y="118" width="6" height="8"/></g>` +
    `<path d="M100 56H114V68H100ZM100 116H114V128H100Z" fill="url(#${k}r)" stroke="#0c0908"/>`;

  const core =
    `<circle cx="165" cy="80" r="10" fill="#1b2420" stroke="#c8ffd8" stroke-width=".8"/>` +
    `<circle cx="165" cy="80" r="6" fill="url(#${k}e)"/>` +
    `<path d="M110 60H200M100 112H210" stroke="#c8ffd8" stroke-width=".7" opacity=".7" filter="url(#${k}w)"/>` +
    `<path d="M110 56H200L204 60H106Z" fill="#fff" opacity=".3"/>` +
    scorch(`${k}s`, 190, 76, 12, 7) +
    scorch(`${k}s`, 124, 112, 10, 6);

  const warn =
    light(98, 72, '#ff3a3a', 1.4, blink(1.2)) +
    light(212, 72, '#ff3a3a', 1.4, blink(1.2, 0.6)) +
    light(280, 92, '#ff3a3a', 1.6, blink(0.9, 0.3)) +
    light(40, 92, '#ff3a3a', 1.6, blink(0.9)) +
    light(266, 50, '#ffb347', 1.1) +
    light(266, 134, '#ffb347', 1.1);

  const body =
    `<defs>${defs}</defs>` +
    ringBack +
    spire +
    panels +
    dish +
    `<path d="${hub}" fill="url(#${k}h)" stroke="#121614" stroke-width="1.3"/>` +
    `<path d="M96 92H214M155 56V128" stroke="#2c3732" stroke-width=".7"/>` +
    kplates +
    guns +
    core +
    ringFront +
    warn;
  return svgDoc('0 0 300 180', body);
}

/** Enemy ship sprite, facing left. viewBox 0 0 300 180. */
export function enemyShipSVG(faction: Faction, variant = 0): string {
  const v = clamp(Math.floor(Math.abs(variant)) % 3, 0, 2);
  switch (faction) {
    case 'kristang':
      return kristangSVG(v);
    case 'thuranin':
      return thuraninSVG(v);
    case 'maxolhx':
      return maxolhxSVG(v);
    case 'relay':
      return relaySVG();
  }
}

// ------------------------------------------------------------------ Skippy

function skippyBody(mood: number): string {
  const md = clamp(mood, 0, 100);
  const m = md / 100;
  const k = uid('sk');
  const holo = '#7fe8ff';
  const defs =
    lin(`${k}c`, [
      [0, '#4d5660'],
      [0.18, '#c9d2db'],
      [0.32, '#ffffff'],
      [0.45, '#dfe6ec'],
      [0.75, '#7d8893'],
      [1, '#39414a'],
    ], 0, 0, 1, 0) +
    lin(`${k}t`, [
      [0, '#ffffff'],
      [1, '#8e99a4'],
    ]) +
    rad(`${k}h`, [
      [0, '#9fe9ff', 0.9],
      [0.5, '#3fa9ff', 0.35],
      [1, '#1f6bff', 0],
    ]) +
    lin(`${k}b`, [
      [0, '#7fe8ff', 0],
      [1, '#7fe8ff', r1(0.15 + 0.3 * m)],
    ]) +
    `<pattern id="${k}s" width="4" height="2.6" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="#dffaff" opacity=".35"/></pattern>` +
    glowFilter(`${k}w`, r1(0.8 + 1.4 * m)) +
    `<clipPath id="${k}k"><ellipse cx="60" cy="70" rx="28" ry="25"/></clipPath>`;

  // Facial expression.
  let face: string;
  let extra = '';
  let tilt = 0;
  const st = `fill="none" stroke="${holo}" stroke-width="2.2" stroke-linecap="round"`;
  if (md >= 75) {
    face =
      `<path d="M43 68Q49 59 55 68M65 68Q71 59 77 68" ${st}/>` +
      `<path d="M41 54Q48 47 56 52M64 51Q72 45 79 53" ${st}/>` +
      `<path d="M43 77Q60 98 77 77Z" fill="${holo}" fill-opacity=".45" stroke="${holo}" stroke-width="1.6" stroke-linejoin="round"/>` +
      `<path d="M46 79.5H74" stroke="#e8fdff" stroke-width="1.2"/>`;
    extra =
      sparkle(16, 66, 5, '#fff7c2') + sparkle(104, 60, 6, '#fff7c2') + sparkle(100, 98, 4, '#bff4ff') + sparkle(20, 100, 3.5, '#bff4ff') + sparkle(92, 8, 3.5, '#fff7c2');
    tilt = 5;
  } else if (md >= 50) {
    face =
      `<ellipse cx="49" cy="66" rx="4" ry="4.6" fill="${holo}" fill-opacity=".85"/><ellipse cx="71" cy="66" rx="4" ry="4.6" fill="${holo}" fill-opacity=".85"/>` +
      `<path d="M44 63.5H54M66 63.5H76" stroke="#0b3b55" stroke-width="2"/>` +
      `<circle cx="50.5" cy="67" r="1.2" fill="#fff"/><circle cx="72.5" cy="67" r="1.2" fill="#fff"/>` +
      `<path d="M42 56Q49 52 56 55M64 54Q71 50 78 54" ${st}/>` +
      `<path d="M48 82Q61 87 73 77" ${st}/>`;
    tilt = 2;
  } else if (md >= 25) {
    face =
      `<ellipse cx="49" cy="67" rx="4" ry="3" fill="${holo}" fill-opacity=".85"/><ellipse cx="71" cy="67" rx="4" ry="3" fill="${holo}" fill-opacity=".85"/>` +
      `<path d="M44 65H54M66 65H76" stroke="${holo}" stroke-width="2"/>` +
      `<path d="M42 56L56 60M64 58H78" ${st}/>` +
      `<path d="M50 83H70" ${st}/>`;
    extra = `<path d="M90 58l6-4M92 64h7" stroke="${holo}" stroke-width="1.4" stroke-linecap="round" opacity=".7"/>`;
  } else {
    face =
      `<path d="M44 66Q49 72 55 68M65 68Q71 72 76 66" ${st}/>` +
      `<circle cx="50" cy="70" r="1.8" fill="${holo}"/><circle cx="70" cy="70" r="1.8" fill="${holo}"/>` +
      `<path d="M42 58L55 54M65 54L78 58" ${st}/>` +
      `<path d="M47 87Q60 77 73 87" ${st}/>`;
    extra =
      `<g transform="translate(82 24)"><path d="M2 12Q0 6 6 6Q8 0 14 2Q20 0 21 7Q26 8 24 12Z" fill="#5d6b80" stroke="#9fb0c8" stroke-width=".8"/>` +
      `<path d="M12 12L9 18H13L10 24" fill="none" stroke="#ffe066" stroke-width="1.3"/><path d="M5 14L4 18M19 14L18 18" stroke="#7fb8ff" stroke-width=".9"/></g>` +
      `<text x="4" y="104" font-family="sans-serif" font-size="9" font-style="italic" fill="${holo}" opacity=".85">hmph</text>`;
    tilt = -9;
  }

  // Orbiting ring around the hologram (tilt follows mood) plus an antenna glint.
  const ringBack = `<g transform="rotate(${tilt} 60 70)"><path d="M22 70A38 9 0 0 1 98 70" fill="none" stroke="${holo}" stroke-opacity=".35" stroke-width="1.4"/></g>`;
  const ringFront =
    `<g transform="rotate(${tilt} 60 70)" filter="url(#${k}w)"><path d="M22 70A38 9 0 0 0 98 70" fill="none" stroke="${holo}" stroke-opacity=".8" stroke-width="1.6"/>` +
    `<circle cx="${r1(60 + 38 * Math.cos(0.6 + m * 2))}" cy="${r1(70 + 9 * Math.sin(0.6 + m * 2))}" r="2.4" fill="#e8fdff"/></g>` +
    `<path d="M60 40V34" stroke="${holo}" stroke-opacity=".6" stroke-width="1.2"/>` +
    sparkle(60, 31, r1(2.5 + 2.5 * m), '#e8fdff');

  return (
    `<defs>${defs}</defs>` +
    `<ellipse cx="60" cy="128" rx="${r1(34 + 14 * m)}" ry="${r1(30 + 10 * m)}" fill="url(#${k}h)" opacity="${r1(0.25 + 0.65 * m)}"/>` +
    // Projection beam from the can top.
    `<path d="M54 108L28 72H92L66 108Z" fill="url(#${k}b)"/>` +
    // Can.
    `<path d="M42 108V150A18 5 0 0 0 78 150V108Z" fill="url(#${k}c)" stroke="#2c333a" stroke-width=".8"/>` +
    `<path d="M42 116A18 5 0 0 0 78 116M42 142A18 5 0 0 0 78 142" fill="none" stroke="#5c6772" stroke-width=".9"/>` +
    `<path d="M42 145A18 5 0 0 0 78 145" fill="none" stroke="#fff" stroke-width=".6" opacity=".5"/>` +
    `<rect x="50" y="112" width="3" height="34" fill="#fff" opacity=".55"/>` +
    `<ellipse cx="60" cy="108" rx="18" ry="5" fill="url(#${k}t)" stroke="#59636d" stroke-width="1"/>` +
    `<ellipse cx="60" cy="108" rx="14" ry="3.4" fill="none" stroke="#9aa5af" stroke-width=".8"/>` +
    `<circle cx="60" cy="108" r="2.2" fill="#c8f6ff" filter="url(#${k}w)"/>` +
    // Hologram head.
    ringBack +
    `<g filter="url(#${k}w)">` +
    `<ellipse cx="60" cy="70" rx="28" ry="25" fill="${holo}" fill-opacity="${r1(0.1 + 0.12 * m)}" stroke="${holo}" stroke-opacity=".75" stroke-width="1.2"/>` +
    `<rect x="30" y="44" width="60" height="52" fill="url(#${k}s)" clip-path="url(#${k}k)"/>` +
    face +
    `</g>` +
    ringFront +
    extra
  );
}

/** Skippy: a glowing silver cylinder with a floating holographic face. viewBox 0 0 120 160. */
export function skippySVG(mood: number): string {
  return svgDoc('0 0 120 160', skippyBody(mood));
}

// ------------------------------------------------------------------ portraits

const BUST = 'M8 66Q10 47 32 45Q54 47 56 66Z';

function bust(skin: string, uniform: string, extra: string): string {
  return (
    `<path d="${BUST}" fill="${uniform}"/>` +
    `<path d="M28 40H36V47Q32 50 28 47Z" fill="${skin}"/>` +
    `<ellipse cx="32" cy="31" rx="9" ry="11" fill="${skin}"/>` +
    `<path d="M24 52L32 58L40 52" fill="none" stroke="#000" stroke-opacity=".3" stroke-width="1"/>` +
    extra
  );
}

/** Small circular portrait badge for dialog. viewBox 0 0 64 64. */
export function portraitSVG(speaker: Speaker): string {
  const k = uid('pt');
  const palette: Record<Speaker, [string, string, string]> = {
    skippy: ['#1d3c66', '#0a1426', '#7fe8ff'],
    joe: ['#56603a', '#1e2414', '#c9c08a'],
    adams: ['#4b5a3a', '#1a2012', '#d8b25a'],
    simms: ['#3a4e66', '#121a26', '#a9c4e6'],
    smythe: ['#6a5a3e', '#241c10', '#d9c18a'],
    nagatha: ['#4a3a6e', '#160f26', '#d6c2ff'],
    narrator: ['#1c2440', '#05070f', '#9fb4ff'],
    alien: ['#2c1a2e', '#0a050c', '#ff4a4a'],
  };
  const [c1, c2, ring] = palette[speaker];
  const sil = '#11140e';
  let inner = '';
  switch (speaker) {
    case 'skippy':
      inner = `<svg x="4" y="3" width="56" height="62" viewBox="0 0 120 160">${skippyBody(70)}</svg>`;
      break;
    case 'joe':
      inner = bust(
        sil,
        '#4c5530',
        `<path d="M22 27Q22 17 32 17Q42 17 42 27L44 28H20Z" fill="#3e4628"/>` +
          // Silver eagle insignia (colonel).
          `<path d="M24 40L26 39L28 40L30 38L32 41L34 38L36 40L38 39L40 40L32 44Z" fill="#d9dde2" transform="translate(0 15)"/>` +
          `<path d="M14 58L20 56M44 56L50 58" stroke="#c9c08a" stroke-width="1.4"/>`,
      );
      break;
    case 'adams':
      inner = bust(
        sil,
        '#3e4a2c',
        `<path d="M21 25Q21 15 32 15Q43 15 43 25Z" fill="#5b6a3e"/><path d="M19 25H45L41 28H23Z" fill="#20260f"/>` +
          `<g fill="none" stroke="#d8b25a" stroke-width="1.4"><path d="M12 54L15 51L18 54M12 57L15 54L18 57M12 60L15 57L18 60"/><path d="M12 62Q15 64 18 62"/></g>` +
          `<circle cx="32" cy="20" r="1.6" fill="#d8b25a"/>`,
      );
      break;
    case 'simms':
      inner = bust(
        sil,
        '#2e3e56',
        `<path d="M23 30Q22 18 32 18Q42 18 41 30Q38 22 32 22Q26 22 23 30Z" fill="#1d1f24"/><circle cx="40" cy="22" r="3.4" fill="#1d1f24"/>` +
          `<rect x="34" y="47" width="14" height="17" rx="1.5" fill="#1b2533" stroke="#a9c4e6" stroke-width="1" transform="rotate(-12 41 55)"/>` +
          `<path d="M37 52H45M37 55H44M37 58H42" stroke="#7fe8ff" stroke-width=".9" transform="rotate(-12 41 55)"/>` +
          `<path d="M14 56H22" stroke="#a9c4e6" stroke-width="1.4"/>`,
      );
      break;
    case 'smythe':
      inner = bust(
        sil,
        '#5a4c32',
        `<path d="M20 25Q18 15 30 14Q44 13 47 22Q42 21 40 24Q32 22 20 25Z" fill="#7a2230"/><path d="M21 24Q32 21 42 24" stroke="#2a0b10" stroke-width="1.6" fill="none"/>` +
          `<circle cx="25" cy="21" r="1.7" fill="#d9c18a"/>` +
          `<path d="M16 52L24 50M40 50L48 52" stroke="#3a2f1c" stroke-width="2"/>`,
      );
      break;
    case 'nagatha':
      inner =
        `<g fill="none" stroke="#d6c2ff">` +
        [24, 19, 14, 9]
          .map((r, i) => `<circle cx="32" cy="32" r="${r}" stroke-opacity="${r1(0.25 + i * 0.18)}" stroke-width="${r1(1 + i * 0.3)}"/>`)
          .join('') +
        `<path d="M14 32Q32 20 50 32M14 32Q32 44 50 32" stroke-opacity=".5" stroke-width=".8"/></g>` +
        `<circle cx="32" cy="32" r="5" fill="#f2e9ff"/><circle cx="32" cy="32" r="9" fill="#cdb4ff" opacity=".35"/>`;
      break;
    case 'narrator':
      inner =
        `<g fill="#fff" opacity=".7"><circle cx="14" cy="18" r=".8"/><circle cx="48" cy="14" r=".9"/><circle cx="52" cy="44" r=".7"/><circle cx="18" cy="48" r=".8"/><circle cx="40" cy="52" r=".6"/></g>` +
        sparkle(32, 32, 20, '#9fb4ff') +
        sparkle(32, 32, 11, '#e6ecff') +
        `<path d="M22 40L44 30L40 36L46 38L24 44Z" fill="#1c2440" stroke="#e6ecff" stroke-width=".8"/>`;
      break;
    case 'alien':
      inner =
        `<path d="M6 66Q10 48 32 46Q54 48 58 66Z" fill="#120a14"/>` +
        `<path d="M32 8Q48 8 48 26Q48 40 32 48Q16 40 16 26Q16 8 32 8Z" fill="#1a1020" stroke="#3c2340"/>` +
        `<path d="M20 26Q25 22 30 28Q25 31 20 26ZM44 26Q39 22 34 28Q39 31 44 26Z" fill="#ff2e2e"/>` +
        `<circle cx="25" cy="27" r="5" fill="#ff2e2e" opacity=".25"/><circle cx="39" cy="27" r="5" fill="#ff2e2e" opacity=".25"/>` +
        `<path d="M28 40Q32 42 36 40" stroke="#3c2340" fill="none"/>`;
      break;
  }
  const body =
    `<defs>${rad(`${k}b`, [
      [0, c1],
      [1, c2],
    ], 0.5, 0.35, 0.65)}<clipPath id="${k}c"><circle cx="32" cy="32" r="29"/></clipPath></defs>` +
    `<circle cx="32" cy="32" r="31.5" fill="${ring}"/>` +
    `<circle cx="32" cy="32" r="29" fill="url(#${k}b)"/>` +
    `<g clip-path="url(#${k}c)">${inner}</g>` +
    `<circle cx="32" cy="32" r="29" fill="none" stroke="#000" stroke-opacity=".4" stroke-width="1.2"/>` +
    `<path d="M10 22A24 24 0 0 1 42 6" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="1.6" stroke-linecap="round"/>`;
  return svgDoc('0 0 64 64', body);
}

// ------------------------------------------------------------------ icons

const ICONS: Record<SystemId, string> = {
  shields:
    '<path d="M12 2L20 5V11C20 16 16.5 20 12 22C7.5 20 4 16 4 11V5Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 6V18M8 10H16" stroke="currentColor" stroke-width="1.5" opacity=".6"/>',
  weapons:
    '<circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="2" fill="currentColor"/><path d="M12 1V7M12 17V23M1 12H7M17 12H23" stroke="currentColor" stroke-width="2"/>',
  engines:
    '<path d="M12 2C15 6 17 9 17 13A5 5 0 0 1 7 13C7 10 9 9 10 6C11 8 12 9 12.5 9C12.5 7 12 4 12 2Z" fill="currentColor"/><path d="M8 19L6 23M12 19V23M16 19L18 23" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  stealth:
    '<path d="M2 12Q12 3 22 12Q12 21 2 12Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" fill="currentColor"/><path d="M4 20L20 4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  jump:
    '<path d="M12 12C12 10.5 14 10.5 14 12C14 14.5 10 14.5 10 12C10 8 16 8 16.5 12C17 17 8 17 7.5 12C7 5.5 18.5 5 19.5 12C20 19.5 5 20 4.5 12C4.2 6.5 8 3 12 3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
};

/** Monochrome system icon using currentColor. viewBox 0 0 24 24. */
export function systemIconSVG(id: SystemId): string {
  return svgDoc('0 0 24 24', ICONS[id]);
}

/** Antenna icon for the relay on the sector map. viewBox 0 0 24 24. */
export function relayIconSVG(): string {
  return svgDoc(
    '0 0 24 24',
    '<path d="M12 10L7 22M12 10L17 22M9 17H15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/><circle cx="12" cy="9" r="2" fill="currentColor"/><path d="M8 5A5.5 5.5 0 0 0 8 13M16 5A5.5 5.5 0 0 1 16 13M5 2.5A9 9 0 0 0 5 15.5M19 2.5A9 9 0 0 1 19 15.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/>',
  );
}
