// HTML builders for the non-combat screens. Every clickable element carries a
// `data-act` attribute that the App dispatches on.
import type { RunState } from '../game/run';
import { atExit, eventById, fakeWormholeTargets, jumpTargets, scannerOffline, availableChoices } from '../game/run';
import { isOverrun, TOTAL_SECTORS } from '../game/map';
import { ABILITIES, canUseAbility, describeDelta, moodBand } from '../game/resources';
import { SYSTEM_IDS, type DialogueLine, type MapNode, type ResourceDelta, type Speaker } from '../game/types';
import { SYSTEM_MAX, SYSTEM_NAMES, WEAPONS } from '../game/data/ships';
import { canBuy, priceOf } from '../game/shop';
import { dutchmanSVG, portraitSVG, skippySVG, systemIconSVG } from '../art/sprites';

export const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export const DISCLAIMER =
  '<b>Unofficial, non-commercial fan project.</b> Expeditionary Force and its characters belong to Craig Alanson. ' +
  'This game is not affiliated with or endorsed by the author or publishers. All art, code and dialogue are original fan work.';

const SPEAKER_NAMES: Record<Speaker, string> = {
  skippy: 'Skippy the Magnificent',
  joe: 'Col. Joe Bishop',
  adams: 'Gunnery Sgt. Adams',
  simms: 'Major Simms',
  smythe: 'Smythe',
  nagatha: 'Nagatha',
  narrator: '',
  alien: 'Alien comms',
};

// --------------------------------------------------------------- HUD

export function hudHTML(run: RunState): string {
  const r = run.res;
  const hullPct = (r.hull / r.maxHull) * 100;
  return `<div class="hud">
    <div class="res" title="Hull integrity">🛡️ <div class="hullbar ${hullPct < 35 ? 'low' : ''}"><div style="width:${hullPct}%"></div></div> <b>${r.hull}/${r.maxHull}</b></div>
    <div class="res" title="Fuel: one per jump">⛽ <b>${r.fuel}</b></div>
    <div class="res" title="Missiles">🚀 <b>${r.missiles}</b></div>
    <div class="res" title="Scrap (currency)">⚙️ <b>${r.scrap}</b></div>
    <div class="res" title="Crew">👥 <b>${r.crew}</b></div>
    <div class="res moodchip" title="Skippy Mood: ${moodBand(r.mood)}. High mood unlocks his abilities.">
      <div class="face">${skippySVG(r.mood)}</div>
      <div><div style="font-size:11px;color:var(--dim)">SKIPPY ${moodBand(r.mood).toUpperCase()}</div>
      <div class="moodbar"><div style="width:${r.mood}%"></div></div></div><b>${r.mood}</b>
    </div>
    <div class="alert" title="Alien Alert. At 100% the aliens learn humans have a starship and the run is lost.">
      <span style="font-size:12px;color:${r.alert >= 70 ? 'var(--red)' : 'var(--dim)'};letter-spacing:.1em">ALIEN ALERT</span>
      <div class="alertbar"><div style="width:${r.alert}%"></div></div><b class="mono">${r.alert}%</b>
    </div>
    <div class="res mono" style="color:var(--dim)">S${run.sector}/${TOTAL_SECTORS}</div>
    <button class="small" data-act="menu" title="Save and return to title (Esc)">☰</button>
  </div>`;
}

// --------------------------------------------------------------- title

export function titleHTML(hasSave: boolean, muted: boolean): string {
  return `<div class="title-screen">
    <div class="title-logo">MERRY BAND OF PIRATES</div>
    <div class="title-sub">An Expeditionary Force fan roguelite</div>
    <div class="title-art">
      <div class="ship">${dutchmanSVG()}</div>
      <div class="skippy">${skippySVG(90)}</div>
    </div>
    <div class="title-buttons">
      <button class="primary" data-act="new">New Run</button>
      <button data-act="continue" ${hasSave ? '' : 'disabled'}>Continue</button>
      <button data-act="howto">How to Play</button>
      <button class="small" data-act="mute">${muted ? '🔇 Sound off' : '🔊 Sound on'}</button>
    </div>
    <div class="seed-row">Seed (optional): <input id="seed" class="mono" maxlength="24" placeholder="random" /></div>
    <div class="disclaimer">${DISCLAIMER}</div>
  </div>`;
}

export function howToHTML(): string {
  return `<div class="modal-back"><div class="modal panel" style="width:900px">
    <h2>How to play</h2>
    <div class="howto">
      <p>You command the <b>Flying Dutchman</b>, a stolen, battered Thuranin star carrier, with a crew of humans and <b>Skippy the Magnificent</b>, an ancient and extremely smug AI. Cross <b>6 sectors</b> of the wormhole network and destroy the Kristang/Thuranin <b>relay</b> before the aliens learn that humans have a starship.</p>
      <h3>The starmap</h3>
      <ul>
        <li>Click a connected beacon to jump. Each jump costs <b>1 fuel</b> and raises the <b>Alien Alert</b>. Alert at 100% ends the run.</li>
        <li>A pursuit fleet sweeps across each sector from the left (the red zone). Beacons it has overrun hold nasty pursuit ships.</li>
        <li>Beacons: <b>?</b> events, <b>⚔</b> hostiles, <b>$</b> shipyards, empty space, and the <b>EXIT</b>. In sector 6 the exit is the <b>relay</b>.</li>
        <li>Out of fuel? Use <b>Siphon fuel</b>. It always works, but it raises the alert.</li>
      </ul>
      <h3>Skippy's mood</h3>
      <ul>
        <li>Mood (0-100) goes up when you praise him, win fights or buy him show-tune data crystals. It goes down when you ignore him, run away, or make him do chores.</li>
        <li><b>${ABILITIES.hack.name}</b> (mood ${ABILITIES.hack.minMood}+, costs ${ABILITIES.hack.cost}): drops enemy shields in combat.</li>
        <li><b>${ABILITIES.stealth.name}</b> (mood ${ABILITIES.stealth.minMood}+, costs ${ABILITIES.stealth.cost}): your next jump raises no alert and may slip past hostiles.</li>
        <li><b>${ABILITIES.fake.name}</b> (mood ${ABILITIES.fake.minMood}+, costs ${ABILITIES.fake.cost}): escape any fight instantly, or jump up to 2 beacons away for free.</li>
        <li>At 75+ he helps with targeting and the jump drive. Below 25 he <b>sulks</b>: no scans of beacons, a slower jump drive, and no abilities.</li>
      </ul>
      <h3>Combat (real time with pause)</h3>
      <ul>
        <li><b>Space</b> pauses. Route reactor power with the <b>+/-</b> buttons. Shields give 1 layer per 2 power; engines give evasion; the jump drive charges your escape.</li>
        <li>Weapons fire automatically at their target. Click a weapon card to select it, then click a system on the enemy ship to target it. Click the enemy without a selection to retarget all weapons. <b>Volley</b> mode holds guns until all are charged, which helps punch through shields.</li>
        <li>Crew (yellow) speed up systems and repair damage. Nagatha also slowly repairs things.</li>
        <li>Win by destroying the enemy, or by knocking out its weapons until it surrenders. Escape once the jump drive is charged. <b>Maxolhx</b> hunters are nearly unbeatable: run.</li>
        <li>Keys: <span class="kbd">Space</span> pause, <span class="kbd">1-4</span> toggle weapons, <span class="kbd">V</span> fire mode, <span class="kbd">F</span> fire now, <span class="kbd">S</span> stealth, <span class="kbd">H</span> hack, <span class="kbd">G</span> fake wormhole, <span class="kbd">J</span> jump away.</li>
      </ul>
    </div>
    <div style="text-align:right"><button class="primary" data-act="closeOverlay">Got it</button></div>
  </div></div>`;
}

// --------------------------------------------------------------- map

const NODE_COLORS: Record<string, string> = {
  start: '#7d8da6', event: '#5fe1ff', combat: '#ff6b6b', shop: '#ffc857', empty: '#5a6a80', exit: '#7dffb0', boss: '#ff3d8b', unknown: '#8a93a6',
};

function nodeGlyph(n: MapNode, hidden: boolean): string {
  if (hidden) return '?';
  switch (n.type) {
    case 'event': return '?';
    case 'combat': return n.faction === 'maxolhx' ? '☠' : '⚔';
    case 'shop': return '$';
    case 'exit': return '⇥';
    case 'boss': return '◎';
    case 'start': return '•';
    default: return '';
  }
}

function nodeLabel(n: MapNode, hidden: boolean): string {
  if (hidden) return 'Unknown beacon (Skippy refuses to scan)';
  switch (n.type) {
    case 'event': return n.visited ? 'Event (visited)' : 'Distress signal / anomaly';
    case 'combat': return n.visited ? 'Hostile (visited)' : n.faction === 'maxolhx' ? 'MAXOLHX SIGNATURE. Do not engage.' : `Hostile ship (${n.faction === 'thuranin' ? 'Thuranin' : 'Kristang'})`;
    case 'shop': return 'Shipyard / salvage station';
    case 'exit': return 'Wormhole to the next sector';
    case 'boss': return 'THE RELAY: final target';
    case 'start': return 'Arrival point';
    default: return n.visited ? 'Empty space (visited)' : 'Empty space';
  }
}

export interface MapUi {
  selectingFake: boolean;
}

export function mapSVG(run: RunState, ui: MapUi): string {
  const W = 860, H = 642;
  const m = run.map;
  const px = (n: MapNode) => n.x * (W - 40) + 20;
  const py = (n: MapNode) => 70 + n.y * (H - 140);
  const targets = new Set(ui.selectingFake ? fakeWormholeTargets(run) : jumpTargets(run));
  const scanner = scannerOffline(run);
  const colX = (c: number) => 20 + (0.06 + (0.88 * c) / (m.cols - 1)) * (W - 40);
  const frontX = Math.max(0, m.pursuit < 0 ? colX(0) + m.pursuit * (colX(1) - colX(0)) : colX(Math.floor(m.pursuit)) + (m.pursuit % 1) * (colX(1) - colX(0)));
  const edges = m.edges
    .map(([a, b]) => {
      const A = m.nodes[a], B = m.nodes[b];
      const hot = (a === run.current && targets.has(b)) || (b === run.current && targets.has(a));
      return `<line x1="${px(A)}" y1="${py(A)}" x2="${px(B)}" y2="${py(B)}" stroke="${hot ? '#5fe1ff' : '#2f4462'}" stroke-width="${hot ? 2.5 : 1.5}" ${hot ? '' : 'stroke-dasharray="4 5"'} />`;
    })
    .join('');
  const nodes = m.nodes
    .map((n) => {
      const reach = targets.has(n.id) && (ui.selectingFake || run.res.fuel > 0);
      const isCur = n.id === run.current;
      const hidden = scanner && !n.visited && n.type !== 'exit' && n.type !== 'boss' && n.type !== 'start';
      const over = isOverrun(m, n.id);
      const col = hidden ? NODE_COLORS.unknown : NODE_COLORS[n.type];
      const r = n.type === 'exit' || n.type === 'boss' ? 17 : 13;
      return `<g class="map-node ${reach ? 'reachable' : ''}" ${reach ? `data-act="${ui.selectingFake ? 'fakeTo' : 'jump'}" data-id="${n.id}"` : ''} data-tip="${esc(nodeLabel(n, hidden) + (over ? ' · OVERRUN by pursuers!' : ''))}">
        ${reach ? `<circle cx="${px(n)}" cy="${py(n)}" r="${r + 9}" fill="none" stroke="${ui.selectingFake ? '#7dffb0' : '#5fe1ff'}" stroke-width="1.5" opacity=".7"><animate attributeName="r" values="${r + 6};${r + 11};${r + 6}" dur="1.6s" repeatCount="indefinite"/></circle>` : ''}
        <circle class="ring" cx="${px(n)}" cy="${py(n)}" r="${r}" fill="${n.visited ? '#0d1626' : '#101b2e'}" stroke="${over ? '#ff3d3d' : col}" stroke-width="2.2" opacity="${n.visited && !isCur ? 0.6 : 1}"/>
        <text x="${px(n)}" y="${py(n) + 5}" text-anchor="middle" font-size="${n.type === 'boss' ? 18 : 15}" fill="${col}" font-weight="700" pointer-events="none">${nodeGlyph(n, hidden)}</text>
        ${n.type === 'exit' || n.type === 'boss' ? `<text x="${px(n)}" y="${py(n) + r + 16}" text-anchor="middle" font-size="11" fill="${col}" letter-spacing="2" pointer-events="none">${n.type === 'boss' ? 'RELAY' : 'EXIT'}</text>` : ''}
        ${isCur ? `<g pointer-events="none"><circle cx="${px(n)}" cy="${py(n)}" r="${r + 4}" fill="none" stroke="#fff" stroke-width="2"/><path d="M ${px(n) - 9} ${py(n) - r - 18} l 18 0 l -9 10 z" fill="#7dffb0"/></g>` : ''}
      </g>`;
    })
    .join('');
  return `<svg class="map" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="front" x1="0" x2="1"><stop offset="0" stop-color="#ff2d2d" stop-opacity=".28"/><stop offset="1" stop-color="#ff2d2d" stop-opacity=".05"/></linearGradient></defs>
    <rect x="0" y="0" width="${W}" height="${H}" rx="12" fill="rgba(8,12,22,0.55)" stroke="#22324a"/>
    ${frontX > 0 ? `<rect x="0" y="0" width="${frontX}" height="${H}" rx="12" fill="url(#front)"/><line x1="${frontX}" y1="0" x2="${frontX}" y2="${H}" stroke="#ff4d4d" stroke-width="2" stroke-dasharray="6 6"/><text x="${Math.max(10, frontX - 8)}" y="${H - 44}" text-anchor="end" fill="#ff7d7d" font-size="12" letter-spacing="2">PURSUIT ▶</text>` : ''}
    ${edges}${nodes}
  </svg>`;
}

function skippyBubble(run: RunState, text: string, speaker: 'skippy' | 'nagatha' = 'skippy'): string {
  return `<div class="skippy-box"><div class="face">${speaker === 'nagatha' ? portraitSVG('nagatha') : skippySVG(run.res.mood)}</div>
    <div class="bubble ${speaker}">${esc(text)}</div></div>`;
}

export function mapScreenHTML(run: RunState, ui: MapUi, bark: { text: string; speaker: 'skippy' | 'nagatha' }): string {
  const exit = atExit(run);
  const shopHere = !!run.shops[run.current];
  const mood = run.res.mood;
  const ab = (id: 'stealth' | 'fake', armed: boolean) => {
    const a = ABILITIES[id];
    const ok = canUseAbility(mood, id);
    return `<button data-act="${id === 'stealth' ? 'stealth' : 'fakeMode'}" class="${armed ? 'armed' : ''}" ${ok && !(id === 'stealth' && run.stealthArmed) ? '' : 'disabled'} title="${id === 'stealth' ? 'Next jump raises no alert, no pursuit advance; 50% chance to slip past hostiles.' : 'Jump up to 2 beacons away, free and silent.'}">
      ${a.name}<span class="req">mood ${a.minMood}+ · costs ${a.cost}</span></button>`;
  };
  const nextLabel = run.sector >= TOTAL_SECTORS ? '' : `<button class="primary" data-act="nextSector">⇥ Jump to sector ${run.sector + 1}</button>`;
  return `${hudHTML(run)}
  <div class="map-wrap">
    <div class="map-title"><div class="sector">Sector ${run.sector} of ${TOTAL_SECTORS}</div><div class="name">${esc(run.map.name)}</div></div>
    ${mapSVG(run, ui)}
    <div class="map-legend">
      <span><i style="background:${NODE_COLORS.event}"></i>Event</span>
      <span><i style="background:${NODE_COLORS.combat}"></i>Hostile</span>
      <span><i style="background:${NODE_COLORS.shop}"></i>Shipyard</span>
      <span><i style="background:${NODE_COLORS.empty}"></i>Empty</span>
      <span><i style="background:${NODE_COLORS.exit}"></i>Exit</span>
      <span><i style="background:#ff3d3d"></i>Overrun by pursuit</span>
      <span style="margin-left:auto">${ui.selectingFake ? '<b style="color:var(--green)">Pick a beacon for the fake wormhole</b>' : run.res.fuel > 0 ? 'Click a highlighted beacon to jump (1 fuel)' : '<b style="color:var(--amber)">Out of fuel!</b>'}</span>
    </div>
  </div>
  <div class="side">
    <div class="panel">${skippyBubble(run, bark.text, bark.speaker)}</div>
    <div class="panel">
      <h3 class="label">Skippy's tricks</h3>
      <div class="ability-row">${ab('stealth', run.stealthArmed)}${ab('fake', ui.selectingFake)}</div>
      ${mood < 25 ? '<div class="notice" style="margin-top:6px;color:var(--amber)">Skippy is sulking. He will not scan beacons or help until his mood improves.</div>' : ''}
      ${run.stealthArmed ? '<div class="notice" style="margin-top:6px;color:var(--green)">Stealth field armed for the next jump.</div>' : ''}
    </div>
    <div class="panel actions">
      <h3 class="label">Orders</h3>
      ${exit ? nextLabel : ''}
      ${shopHere ? '<button data-act="openShop">$ Visit the shipyard</button>' : ''}
      ${run.res.fuel <= 0 ? '<button class="warn" data-act="siphon">⛽ Siphon fuel from a gas giant (+2 fuel, alert +6)</button>' : ''}
      <button data-act="ship">🛠 Ship &amp; crew</button>
      <div class="notice">Jumps: <b>${run.stats.jumps}</b> · Alert per jump: <b>+${2 + (run.sector >= 4 ? 1 : 0)}%</b> · Pursuit at column <b>${Math.max(0, run.map.pursuit).toFixed(1)}</b></div>
    </div>
  </div>`;
}

// --------------------------------------------------------------- dialog

export function lineHTML(l: DialogueLine, delay: number): string {
  const name = SPEAKER_NAMES[l.speaker];
  return `<div class="line ${l.speaker}" style="animation-delay:${delay}s">
    ${l.speaker === 'narrator' ? '' : `<div class="pt">${portraitSVG(l.speaker)}</div>`}
    <div>${name ? `<div class="who">${esc(name)}</div>` : ''}<div class="say">${esc(l.text)}</div></div>
  </div>`;
}

function reqText(req?: Record<string, number | undefined>): string {
  if (!req) return '';
  const names: Record<string, string> = { scrap: 'scrap', fuel: 'fuel', missiles: 'missiles', crew: 'crew', mood: 'Skippy mood' };
  return Object.entries(req).map(([k, v]) => `${names[k] ?? k} ${v}+`).join(', ');
}

export function eventHTML(run: RunState): string {
  const ev = run.eventId ? eventById(run.eventId) : undefined;
  if (!ev) return '';
  const avail = availableChoices(run);
  return `<div class="modal-back"><div class="modal panel">
    <h2>${esc(ev.title)}</h2>
    <div class="event-head">
      <div class="skippy-portrait-big">${skippySVG(run.res.mood)}</div>
      <div class="dialog">${ev.intro.map((l, i) => lineHTML(l, i * 0.25)).join('')}</div>
    </div>
    <div class="choices">
      ${ev.choices.map((c, i) => `<button data-act="choose" data-id="${i}" ${avail[i] ? '' : 'disabled'}>
        <span class="num">${i + 1}.</span>${esc(c.label)}${c.requires ? `<span class="reqs">[requires ${reqText(c.requires)}]</span>` : ''}</button>`).join('')}
    </div>
  </div></div>`;
}

export function deltaChips(d: ResourceDelta): string {
  return describeDelta(d)
    .map((txt, i) => {
      const key = Object.keys(d).filter((k) => d[k as keyof ResourceDelta])[i] as keyof ResourceDelta;
      const v = d[key] ?? 0;
      const good = key === 'alert' ? v < 0 : v > 0;
      return `<span class="chip ${good ? 'good' : 'bad'}">${esc(txt)}</span>`;
    })
    .join('');
}

export function resultHTML(run: RunState): string {
  const r = run.result;
  if (!r) return '';
  return `<div class="modal-back"><div class="modal panel">
    <h2>${esc(r.title || 'Outcome')}</h2>
    <div class="event-head">
      <div class="skippy-portrait-big">${skippySVG(run.res.mood)}</div>
      <div class="dialog">${r.lines.map((l, i) => lineHTML(l, i * 0.25)).join('')}</div>
    </div>
    <div class="deltas">${deltaChips(r.applied)}${r.extras.map((e) => `<span class="chip info">${esc(e)}</span>`).join('')}</div>
    <div style="text-align:right"><button class="primary" data-act="dismiss">${run.pendingCombat ? '⚔ Battle stations!' : 'Continue'} <span class="kbd">Enter</span></button></div>
  </div></div>`;
}

// --------------------------------------------------------------- shop

export function shopHTML(run: RunState, quip: string): string {
  const items = run.shop ?? [];
  return `<div class="modal-back"><div class="modal panel" style="width:960px">
    <div style="display:flex;justify-content:space-between;align-items:center"><h2>Shipyard &amp; salvage station</h2><div style="color:var(--amber);font-size:18px">⚙️ ${run.res.scrap} scrap</div></div>
    ${skippyBubble(run, quip)}
    <div class="shop-grid">
      ${items.map((it) => {
        const check = canBuy(it, run.res, run.loadout, run.sector);
        const price = priceOf(it, run.loadout, run.sector);
        let extra = '';
        if (it.kind === 'system' && it.system) extra = ` (now ${run.loadout.systems[it.system]}/${SYSTEM_MAX[it.system]})`;
        if (it.kind === 'reactor') extra = ` (now ${run.loadout.reactor})`;
        if (it.kind === 'weapon' && it.weapon) {
          const w = WEAPONS[it.weapon];
          extra = ` · ${w.power}⚡ ${w.shots}×${w.damage} dmg / ${w.charge}s`;
        }
        return `<div class="shop-item ${it.sold ? 'sold' : ''}"><div><div class="t">${esc(it.label)}</div><div class="d">${esc(it.description + extra)}</div></div>
          <div style="text-align:right"><div class="price">${it.sold ? 'SOLD' : `${price} ⚙️`}</div>
          <button class="small" data-act="buy" data-id="${esc(it.id)}" ${check.ok ? '' : `disabled title="${esc(check.reason ?? '')}"`}>Buy</button></div></div>`;
      }).join('')}
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div class="notice">Hull ${run.res.hull}/${run.res.maxHull} · Fuel ${run.res.fuel} · Missiles ${run.res.missiles} · Crew ${run.res.crew} · Weapons ${run.loadout.weapons.length}/4 hardpoints</div>
      <button class="primary" data-act="leaveShop">Undock <span class="kbd">Esc</span></button>
    </div>
  </div></div>`;
}

// --------------------------------------------------------------- ship & crew

export function shipHTML(run: RunState): string {
  const L = run.loadout;
  const used = SYSTEM_IDS.reduce((s, id) => s + L.systems[id], 0);
  const sysDesc: Record<string, string> = {
    shields: '1 shield layer per 2 power. Each layer blocks one maser hit.',
    weapons: 'Power for weapons. Each weapon needs its own power.',
    engines: '+6% evasion per power. Crew add more.',
    stealth: 'Activate in combat: enemy shots miss for a few seconds.',
    jump: 'Charges your escape jump in combat.',
  };
  const band = moodBand(run.res.mood);
  const moodText = {
    gleeful: 'Gleeful. He helps with targeting (-10% enemy evasion) and supercharges the jump drive.',
    pleased: 'Pleased with himself (as always). Abilities available if his mood is high enough.',
    annoyed: 'Annoyed. Grumbles, but still technically helpful.',
    sulking: 'SULKING. Refuses to scan beacons, slows the jump drive by 40%, and refuses every ability.',
  }[band];
  return `<div class="modal-back"><div class="modal panel" style="width:1000px">
    <h2>The Flying Dutchman</h2>
    <div class="ship-screen">
      <div>
        <div class="ship-art">${dutchmanSVG({ damaged: 1 - run.res.hull / run.res.maxHull })}</div>
        <h3 class="label">Systems · reactor ${L.reactor} power (installed levels: ${used})</h3>
        ${SYSTEM_IDS.map((id) => `<div class="sys-row"><div class="ico">${systemIconSVG(id)}</div><div class="nm">${SYSTEM_NAMES[id]}</div>
          <div class="pips">${Array.from({ length: SYSTEM_MAX[id] }, (_, i) => `<div class="pip ${i < L.systems[id] ? 'on' : ''}"></div>`).join('')}</div>
          <div style="font-size:12px;color:var(--dim);margin-left:auto;max-width:200px;text-align:right">${sysDesc[id]}</div></div>`).join('')}
        <h3 class="label" style="margin-top:10px">Weapons (${L.weapons.length}/4)</h3>
        ${L.weapons.map((k) => { const w = WEAPONS[k]; return `<div class="sys-row"><b style="width:160px">${w.name}</b><span style="color:var(--dim);font-size:12px">${w.power}⚡ · ${w.shots}×${w.damage} dmg · ${w.charge}s${w.usesMissile ? ' · uses missiles' : ''}${w.pierce ? ' · pierces 1 shield' : ''}</span></div>`; }).join('')}
      </div>
      <div>
        <h3 class="label">Crew (${run.res.crew} aboard)</h3>
        <div class="crew-list">
          <div><b>Col. Joe Bishop</b>, commanding. Has plans. Some of them work.</div>
          <div><b>Gunnery Sgt. Adams</b>, Marines. Runs the gun deck and argues with Skippy.</div>
          <div><b>Major Simms</b>, executive officer. Keeps the ship supplied and the captain honest.</div>
          <div><b>Smythe</b>, special operations. Boarding actions and quiet problem-solving.</div>
          <div><b>${Math.max(0, run.res.crew - 4)}</b> more pirates: Marines, pilots, techs.</div>
          <div style="margin-top:6px"><b style="color:var(--purple)">Nagatha</b>, the ship's second AI. Unfailingly polite. Slowly repairs damaged systems in battle.</div>
        </div>
        <h3 class="label" style="margin-top:12px">Skippy the Magnificent</h3>
        <div class="skippy-box"><div class="face">${skippySVG(run.res.mood)}</div><div class="bubble">Mood ${run.res.mood}/100: ${moodText}</div></div>
        <div class="notice" style="margin-top:8px">
          ${(['hack', 'stealth', 'fake'] as const).map((id) => `${canUseAbility(run.res.mood, id) ? '✅' : '⛔'} <b>${ABILITIES[id].name}</b> (mood ${ABILITIES[id].minMood}+, costs ${ABILITIES[id].cost})`).join('<br>')}
        </div>
        <h3 class="label" style="margin-top:12px">Run</h3>
        <div class="notice">Seed <b class="mono">${run.seed}</b> · ships destroyed <b>${run.stats.shipsDestroyed}</b> · surrenders <b>${run.stats.surrenders}</b> · escapes <b>${run.stats.escapes}</b> · events <b>${run.stats.eventsSeen}</b></div>
      </div>
    </div>
    <div style="text-align:right"><button class="primary" data-act="closeOverlay">Close <span class="kbd">Esc</span></button></div>
  </div></div>`;
}

// --------------------------------------------------------------- end

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

export function endHTML(run: RunState, winLine: string, loseLine: string): string {
  const won = run.phase === 'won';
  const st = run.stats;
  const stat = (v: string | number, k: string) => `<div class="stat"><div class="v">${v}</div><div class="k">${k}</div></div>`;
  return `<div class="end"><div class="panel">
    <h1 class="${won ? 'win' : 'lose'}">${won ? 'RELAY DESTROYED' : 'RUN OVER'}</h1>
    <p style="color:var(--dim);font-size:16px">${won ? 'The relay is space dust. The aliens are none the wiser. Humanity still has its secret, and a starship held together with duct tape and attitude.' : esc(run.lossReason ?? 'The Merry Band of Pirates is no more.')}</p>
    <div class="skippy-box" style="max-width:600px;margin:0 auto;text-align:left"><div class="face">${skippySVG(won ? 100 : 10)}</div><div class="bubble">${esc(won ? winLine : loseLine)}</div></div>
    <div class="stats">
      ${stat(`${run.sector}/${TOTAL_SECTORS}`, 'Sector reached')}
      ${stat(st.jumps, 'Jumps')}
      ${stat(st.shipsDestroyed, 'Ships destroyed')}
      ${stat(st.surrenders, 'Surrenders')}
      ${stat(st.escapes, 'Escapes')}
      ${stat(st.eventsSeen, 'Events')}
      ${stat(st.scrapEarned, 'Scrap earned')}
      ${stat(fmtTime(st.playSeconds), 'Play time')}
      ${stat(run.res.alert + '%', 'Final alert')}
      ${stat(st.crewLost, 'Crew lost')}
      ${stat(`${run.res.hull}/${run.res.maxHull}`, 'Hull')}
      ${stat(`<span class="mono" style="font-size:14px">${run.seed}</span>`, 'Seed')}
    </div>
    <div style="display:flex;gap:12px;justify-content:center"><button class="primary" data-act="new">New run</button><button data-act="title">Title screen</button></div>
  </div></div>`;
}
