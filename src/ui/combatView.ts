// Combat screen: canvas for ships/projectiles/effects + DOM control panel.
import {
  activateStealth, assignedCrew, canActivateStealth, capacity, changeCrew, changePower, drainFx, evasion, fireAll,
  freePower, maxShieldLayers, MISSILE_FLIGHT, PROJECTILE_FLIGHT, setTarget, skippyFakeWormhole, skippyHack,
  tickCombat, toggleWeapon, tryJump, type CombatShip, type CombatState, type FireMode, type Side,
} from '../game/combat';
import { ABILITIES, canUseAbility } from '../game/resources';
import { payForAbility, type RunState } from '../game/run';
import { Rng } from '../game/rng';
import { SYSTEM_IDS, type SystemId } from '../game/types';
import { SYSTEM_NAMES } from '../game/data/ships';
import type { BarkKey } from '../game/data/barks';
import { dutchmanSVG, enemyShipSVG, skippySVG, systemIconSVG, SYSTEM_SLOTS } from '../art/sprites';
import { hudHTML, esc } from './screens';
import { audio } from './audio';

const CW = 1280;
const CH = 430;

function svgImage(svg: string, w: number, h: number): HTMLImageElement {
  const sized = svg.replace(/width="100%"\s+height="100%"/, `width="${w}" height="${h}"`);
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sized);
  return img;
}

interface Rect { x: number; y: number; w: number; h: number }
interface Floater { x: number; y: number; text: string; color: string; life: number }
interface Boom { x: number; y: number; life: number; color: string; size: number }

export interface CombatHooks {
  onEnd: (combat: CombatState) => void;
  onRunChanged: () => void;
  pickBark: (key: BarkKey) => string;
}

export class CombatView {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private panel!: HTMLElement;
  private hud!: HTMLElement;
  private cards!: HTMLElement;
  private banner!: HTMLElement;
  paused = true;
  private selected: number | null = null;
  private rng: Rng;
  private playerImgs: HTMLImageElement[] = [];
  private enemyImg: HTMLImageElement;
  private iconImgs: Record<string, HTMLImageElement> = {};
  private floaters: Floater[] = [];
  private booms: Boom[] = [];
  private shieldFlash: Record<Side, number> = { player: 0, enemy: 0 };
  private hackFlash = 0;
  private bark: string;
  private barkTimer = 0;
  private panelTimer = 0;
  private endTimer = -1;
  private hullWarned = false;
  private time = 0;
  readonly playerRect: Rect = { x: 60, y: 110, w: 470, h: 235 };
  readonly enemyRect: Rect = { x: 770, y: 100, w: 430, h: 258 };

  constructor(private root: HTMLElement, private run: RunState, readonly combat: CombatState, private hooks: CombatHooks) {
    this.rng = new Rng(0);
    this.rng.state = run.rngState;
    for (const d of [0, 0.5, 1]) this.playerImgs.push(svgImage(dutchmanSVG({ damaged: d }), 400, 200));
    const e = combat.enemy;
    this.enemyImg = svgImage(enemyShipSVG(e.faction === 'human' ? 'kristang' : e.faction, e.variant), 300, 180);
    for (const id of SYSTEM_IDS) {
      for (const [k, col] of [['ok', '#bfefff'], ['dmg', '#ff8080']] as const) {
        this.iconImgs[`${id}-${k}`] = svgImage(systemIconSVG(id).replace(/currentColor/g, col), 24, 24);
      }
    }
    const key: BarkKey = combat.isBoss ? 'boss' : e.faction === 'maxolhx' ? 'maxolhx' : 'combatStart';
    this.bark = hooks.pickBark(key);
    if (e.faction === 'maxolhx' || combat.isBoss) audio.play('alarm');
  }

  mount(): void {
    this.root.innerHTML = `<div class="combat">
      <div id="c-hud"></div>
      <canvas class="cv"></canvas>
      <div id="c-cards"></div>
      <div class="paused-banner" id="c-banner">PAUSED · SPACE TO RESUME</div>
      <div class="c-panel" id="c-panel"></div>
    </div>`;
    this.hud = this.root.querySelector('#c-hud')!;
    this.canvas = this.root.querySelector('canvas')!;
    this.cards = this.root.querySelector('#c-cards')!;
    this.banner = this.root.querySelector('#c-banner')!;
    this.panel = this.root.querySelector('#c-panel')!;
    const dpr = Math.min(2, window.devicePixelRatio || 1) * 1.25;
    this.canvas.width = CW * dpr;
    this.canvas.height = CH * dpr;
    this.ctx = this.canvas.getContext('2d')!;
    this.ctx.scale(dpr, dpr);
    this.canvas.addEventListener('pointerdown', (ev) => this.onCanvasClick(ev));
    this.canvas.addEventListener('contextmenu', (ev) => ev.preventDefault());
    this.refresh();
  }

  // ------------------------------------------------------------ input

  private stagePoint(ev: PointerEvent): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return { x: ((ev.clientX - r.left) / r.width) * CW, y: ((ev.clientY - r.top) / r.height) * CH };
  }

  slot(side: Side, id: SystemId): { x: number; y: number } {
    const rect = side === 'player' ? this.playerRect : this.enemyRect;
    const s = SYSTEM_SLOTS[side][id];
    return { x: rect.x + s.x * rect.w, y: rect.y + s.y * rect.h };
  }

  private onCanvasClick(ev: PointerEvent): void {
    const p = this.stagePoint(ev);
    for (const id of SYSTEM_IDS) {
      if (this.combat.enemy.systems[id].level <= 0) continue;
      const s = this.slot('enemy', id);
      if (Math.hypot(s.x - p.x, s.y - p.y) < 22) {
        setTarget(this.combat, this.selected ?? 'all', id);
        this.toast(`${this.selected === null ? 'All weapons' : this.combat.player.weapons[this.selected].def.name} → enemy ${SYSTEM_NAMES[id]}`);
        this.selected = null;
        audio.play('click');
        this.refresh();
        return;
      }
    }
  }

  private toast(text: string): void {
    this.floaters.push({ x: CW / 2, y: 40, text, color: '#ffc857', life: 1.6 });
  }

  /** Handle a data-act from the panel. Returns true if handled. */
  act(action: string, id?: string): boolean {
    const c = this.combat;
    if (c.outcome) return false;
    const sys = id as SystemId;
    switch (action) {
      case 'pw+': changePower(c, sys, 1); break;
      case 'pw-': changePower(c, sys, -1); break;
      case 'cr+': changeCrew(c, sys, 1); break;
      case 'cr-': changeCrew(c, sys, -1); break;
      case 'wsel': {
        const i = Number(id);
        this.selected = this.selected === i ? null : i;
        break;
      }
      case 'wpow': toggleWeapon(c, Number(id)); break;
      case 'fireMode': {
        const order: FireMode[] = ['volley', 'each', 'hold'];
        c.fireMode = order[(order.indexOf(c.fireMode) + 1) % order.length];
        break;
      }
      case 'fireNow': if (fireAll(c, this.rng) === 0) this.toast('No weapons charged'); break;
      case 'cstealth':
        if (activateStealth(c)) { this.say(this.hooks.pickBark('stealthField')); audio.play('hack'); }
        else this.toast(c.player.systems.stealth.power <= 0 ? 'Stealth field has no power' : 'Stealth field recharging');
        break;
      case 'hack':
        if (c.skippyUsed.hack) break;
        if (!canUseAbility(this.run.res.mood, 'hack')) { this.say(this.hooks.pickBark('refuse')); break; }
        if (payForAbility(this.run, 'hack') && skippyHack(c)) {
          this.say(this.hooks.pickBark('hackShields'));
          this.hackFlash = 1.5;
          audio.play('hack');
          this.hooks.onRunChanged();
        }
        break;
      case 'fake':
        if (c.skippyUsed.fake || !c.canFlee) break;
        if (!canUseAbility(this.run.res.mood, 'fake')) { this.say(this.hooks.pickBark('refuse')); break; }
        if (payForAbility(this.run, 'fake') && skippyFakeWormhole(c)) {
          this.say(this.hooks.pickBark('fakeWormhole'));
          audio.play('jump');
          this.hooks.onRunChanged();
        }
        break;
      case 'flee':
        if (tryJump(c)) { this.say(this.hooks.pickBark('combatFlee')); audio.play('jump'); }
        break;
      case 'pause':
        this.paused = !this.paused;
        break;
      default:
        return false;
    }
    if (action !== 'pause') audio.play('click');
    this.refresh();
    return true;
  }

  key(k: string): boolean {
    switch (k) {
      case ' ': return this.act('pause');
      case '1': case '2': case '3': case '4': return this.act('wpow', String(Number(k) - 1));
      case 'v': return this.act('fireMode');
      case 'f': return this.act('fireNow');
      case 's': return this.act('cstealth');
      case 'h': return this.act('hack');
      case 'g': return this.act('fake');
      case 'j': return this.act('flee');
      default: return false;
    }
  }

  private say(text: string): void {
    this.bark = text;
    this.barkTimer = 0;
  }

  // ------------------------------------------------------------ loop

  /** Debug: combat time multiplier (from the ?speed= URL parameter). */
  speed = 1;

  update(dt: number): void {
    this.time += dt;
    const c = this.combat;
    if (!this.paused && !c.outcome) {
      tickCombat(c, Math.min(dt, 0.1) * this.speed, this.rng);
      this.run.rngState = this.rng.state;
    }
    for (const fx of drainFx(c)) this.handleFx(fx);
    if (!this.hullWarned && c.player.hull < c.player.maxHull * 0.3 && !c.outcome) {
      this.hullWarned = true;
      this.say(this.hooks.pickBark('hullLow'));
      audio.play('alarm');
    }
    this.barkTimer += dt;
    if (c.outcome && this.endTimer < 0) {
      this.endTimer = 1.6;
      this.paused = false;
      if (c.outcome === 'destroyed' || c.outcome === 'surrendered') {
        this.say(this.hooks.pickBark('combatWin'));
        audio.play('win');
        for (let i = 0; i < 6; i++) this.booms.push({ x: this.enemyRect.x + this.enemyRect.w * (0.2 + Math.random() * 0.6), y: this.enemyRect.y + this.enemyRect.h * (0.3 + Math.random() * 0.4), life: 1 + i * 0.12, color: '#ffb347', size: 50 });
      } else if (c.outcome === 'lost' || c.outcome === 'transmitted') audio.play('lose');
      this.refresh();
    }
    if (this.endTimer >= 0) {
      this.endTimer -= dt;
      if (this.endTimer < 0) {
        this.endTimer = -2;
        this.hooks.onEnd(c);
        return;
      }
    }
    this.draw(dt);
    this.panelTimer += dt;
    if (this.panelTimer > 0.12) {
      this.panelTimer = 0;
      this.refresh();
    }
  }

  private handleFx(fx: ReturnType<typeof drainFx>[number]): void {
    switch (fx.kind) {
      case 'fire': audio.play(fx.weapon === 'missile' ? 'missile' : 'fire'); break;
      case 'hit': {
        const s = this.slot(fx.on, fx.system);
        this.booms.push({ x: s.x, y: s.y, life: 0.8, color: '#ff8a3d', size: 26 + fx.damage * 8 });
        this.floaters.push({ x: s.x, y: s.y - 20, text: `-${fx.damage}`, color: '#ff6b6b', life: 1.2 });
        audio.play('hit');
        break;
      }
      case 'shield': {
        this.shieldFlash[fx.on] = 0.5;
        audio.play('shield');
        break;
      }
      case 'miss': {
        const s = this.slot(fx.on, fx.system);
        this.floaters.push({ x: s.x, y: s.y - 30, text: 'MISS', color: '#9fb4cc', life: 1 });
        audio.play('miss');
        break;
      }
      case 'crewLost': {
        const r = fx.on === 'player' ? this.playerRect : this.enemyRect;
        this.floaters.push({ x: r.x + r.w / 2, y: r.y + 10, text: fx.on === 'player' ? 'Crew member killed!' : 'Enemy crew down', color: '#ffc857', life: 1.8 });
        break;
      }
      default: break;
    }
  }

  // ------------------------------------------------------------ drawing

  private draw(dt: number): void {
    const { ctx } = this;
    const c = this.combat;
    ctx.clearRect(0, 0, CW, CH);
    // Player ship
    const dmg = 1 - c.player.hull / c.player.maxHull;
    const pImg = this.playerImgs[dmg > 0.66 ? 2 : dmg > 0.33 ? 1 : 0];
    const bobP = Math.sin(this.time * 1.2) * 3;
    const bobE = Math.sin(this.time * 1.1 + 1) * 3;
    ctx.save();
    if (c.player.stealthTime > 0) ctx.globalAlpha = 0.3 + 0.1 * Math.sin(this.time * 12);
    if (pImg.complete) ctx.drawImage(pImg, this.playerRect.x, this.playerRect.y + bobP, this.playerRect.w, this.playerRect.h);
    ctx.restore();
    // Enemy ship
    ctx.save();
    if (c.outcome === 'destroyed') ctx.globalAlpha = Math.max(0, this.endTimer / 1.6);
    if (this.enemyImg.complete) ctx.drawImage(this.enemyImg, this.enemyRect.x, this.enemyRect.y + bobE, this.enemyRect.w, this.enemyRect.h);
    ctx.restore();
    // Shields
    this.drawShield(c.player, this.playerRect, '#5fc8ff', this.shieldFlash.player);
    const eCol = c.enemy.faction === 'maxolhx' ? '#b98bff' : c.enemy.faction === 'thuranin' ? '#7dffb0' : '#ffb36b';
    this.drawShield(c.enemy, this.enemyRect, eCol, this.shieldFlash.enemy);
    this.shieldFlash.player = Math.max(0, this.shieldFlash.player - dt);
    this.shieldFlash.enemy = Math.max(0, this.shieldFlash.enemy - dt);
    if (this.hackFlash > 0) {
      this.hackFlash -= dt;
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.hackFlash);
      ctx.strokeStyle = '#66e0ff';
      for (let i = 0; i < 8; i++) {
        const y = this.enemyRect.y + Math.random() * this.enemyRect.h;
        ctx.beginPath();
        ctx.moveTo(this.enemyRect.x - 10, y);
        ctx.lineTo(this.enemyRect.x + this.enemyRect.w + 10, y + (Math.random() - 0.5) * 6);
        ctx.stroke();
      }
      ctx.fillStyle = '#66e0ff';
      ctx.font = 'bold 16px ui-monospace, Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('SHIELDS HACKED', this.enemyRect.x + this.enemyRect.w / 2, this.enemyRect.y - 6);
      ctx.restore();
    }
    // System markers
    for (const side of ['player', 'enemy'] as Side[]) {
      const ship = side === 'player' ? c.player : c.enemy;
      for (const id of SYSTEM_IDS) {
        const sys = ship.systems[id];
        if (sys.level <= 0) continue;
        const s = this.slot(side, id);
        const targeted = side === 'enemy' && c.player.weapons.some((w) => w.target === id && w.powered);
        const selTarget = side === 'enemy' && this.selected !== null && c.player.weapons[this.selected]?.target === id;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 14, 0, Math.PI * 2);
        ctx.fillStyle = sys.damage >= sys.level ? 'rgba(120,20,20,0.85)' : sys.damage > 0 ? 'rgba(90,40,20,0.85)' : 'rgba(10,20,35,0.8)';
        ctx.fill();
        ctx.lineWidth = targeted ? 2.5 : 1.5;
        ctx.strokeStyle = selTarget ? '#7dffb0' : targeted ? '#ffc857' : side === 'enemy' ? '#ff9b9b' : '#5fe1ff';
        ctx.stroke();
        const icon = this.iconImgs[`${id}-${sys.damage > 0 ? 'dmg' : 'ok'}`];
        if (icon.complete) ctx.drawImage(icon, s.x - 9, s.y - 9, 18, 18);
        if (targeted) {
          ctx.save();
          ctx.strokeStyle = '#ffc857';
          ctx.setLineDash([4, 4]);
          ctx.lineDashOffset = -this.time * 20;
          ctx.beginPath();
          ctx.arc(s.x, s.y, 20, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
        if (side === 'enemy' && this.selected !== null) {
          ctx.save();
          ctx.globalAlpha = 0.4 + 0.3 * Math.sin(this.time * 6);
          ctx.strokeStyle = '#7dffb0';
          ctx.beginPath();
          ctx.arc(s.x, s.y, 24, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }
    }
    // Projectiles
    for (const p of c.projectiles) {
      const base = p.weapon.usesMissile ? MISSILE_FLIGHT : PROJECTILE_FLIGHT;
      const t = 1 - p.eta / base;
      if (t < 0) continue;
      const from = this.slot(p.from, 'weapons');
      const toSide: Side = p.from === 'player' ? 'enemy' : 'player';
      const to = this.slot(toSide, p.target);
      const x = from.x + (to.x - from.x) * t;
      const y = from.y + (to.y - from.y) * t - Math.sin(t * Math.PI) * 40 * (p.from === 'player' ? 1 : -1);
      const ang = Math.atan2(to.y - from.y, to.x - from.x);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      if (p.weapon.usesMissile) {
        ctx.fillStyle = '#e8e8e8';
        ctx.fillRect(-8, -2.5, 16, 5);
        ctx.fillStyle = '#ff9a3d';
        ctx.fillRect(-16, -2, 8, 4);
      } else {
        const col = p.from === 'player' ? '#66e0ff' : this.combat.enemy.faction === 'maxolhx' ? '#c18bff' : this.combat.enemy.faction === 'thuranin' ? '#7dffb0' : '#ff7a3d';
        ctx.shadowColor = col;
        ctx.shadowBlur = 12;
        ctx.fillStyle = col;
        const len = p.weapon.kind === 'railgun' ? 26 : p.weapon.kind === 'heavyMaser' ? 22 : 16;
        ctx.fillRect(-len / 2, -2, len, p.weapon.kind === 'heavyMaser' ? 5 : 3);
      }
      ctx.restore();
    }
    // Explosions
    for (const b of this.booms) {
      b.life -= dt;
      if (b.life > 1) continue;
      const k = 1 - Math.max(0, b.life) / 0.8;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - k);
      const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.size * (0.4 + k));
      g.addColorStop(0, '#fff6d0');
      g.addColorStop(0.4, b.color);
      g.addColorStop(1, 'rgba(255,60,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size * (0.4 + k), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    this.booms = this.booms.filter((b) => b.life > 0);
    // Floaters
    ctx.textAlign = 'center';
    for (const f of this.floaters) {
      f.life -= dt;
      f.y -= dt * 22;
      ctx.globalAlpha = Math.max(0, Math.min(1, f.life));
      ctx.fillStyle = f.color;
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
    this.floaters = this.floaters.filter((f) => f.life > 0);
    // Outcome text
    if (c.outcome) {
      const txt: Record<string, [string, string]> = {
        destroyed: ['TARGET DESTROYED', '#7dffb0'],
        surrendered: ['ENEMY SURRENDERS', '#7dffb0'],
        fled: ['JUMP!', '#b98bff'],
        escaped: ['FAKE WORMHOLE: ESCAPED', '#66e0ff'],
        lost: ['THE DUTCHMAN IS LOST', '#ff5d5d'],
        transmitted: ['RELAY TRANSMISSION COMPLETE', '#ff5d5d'],
      };
      const [t, col] = txt[c.outcome];
      ctx.font = 'bold 40px system-ui, sans-serif';
      ctx.fillStyle = col;
      ctx.shadowColor = col;
      ctx.shadowBlur = 20;
      ctx.fillText(t, CW / 2, CH / 2);
      ctx.shadowBlur = 0;
    }
  }

  private drawShield(ship: CombatShip, r: Rect, color: string, flash: number): void {
    const { ctx } = this;
    const layers = ship.shieldLayers;
    if (layers <= 0 && flash <= 0) return;
    ctx.save();
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    for (let i = 0; i < Math.max(layers, flash > 0 ? 1 : 0); i++) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, r.w / 2 + 14 + i * 9, r.h / 2 + 4 + i * 8, 0, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.25 + flash + 0.08 * Math.sin(this.time * 3 + i);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 0.04 + flash * 0.2;
      ctx.fillStyle = color;
      ctx.fill();
    }
    ctx.restore();
  }

  // ------------------------------------------------------------ DOM panel

  refresh(): void {
    const c = this.combat;
    const p = c.player;
    const e = c.enemy;
    this.banner.style.display = this.paused && !c.outcome ? 'block' : 'none';
    this.hud.innerHTML = hudHTML(this.run).replace('<div class="hud">', '<div class="hud" style="pointer-events:auto">');
    const shieldPips = (s: CombatShip) =>
      `<span class="shieldpips">${Array.from({ length: Math.max(1, Math.floor(s.systems.shields.level / 2)) }, (_, i) => `<i class="${i < s.shieldLayers ? 'on' : ''}"></i>`).join('')}</span>`;
    this.cards.innerHTML = `
      <div class="panel player-card"><b>Flying Dutchman</b>
        <div class="bar green"><div style="width:${(p.hull / p.maxHull) * 100}%"></div></div>
        Hull ${p.hull}/${p.maxHull} · Shields ${shieldPips(p)} · Evasion ${Math.round(evasion(p) * 100)}%${p.stealthTime > 0 ? ' · <b style="color:var(--cyan)">STEALTHED</b>' : ''}</div>
      <div class="panel enemy-card"><b style="color:${e.faction === 'maxolhx' ? 'var(--purple)' : '#ff9b9b'}">${esc(e.name)}</b>
        <div class="bar"><div style="width:${(e.hull / e.maxHull) * 100}%"></div></div>
        Hull ${e.hull}/${e.maxHull} · Shields ${shieldPips(e)} · Evasion ${Math.round(Math.max(0, evasion(e) - c.targetingAssist) * 100)}%
        ${e.hackedTime > 0 ? `<div style="color:var(--cyan)">Shields hacked: ${e.hackedTime.toFixed(0)}s</div>` : ''}
        ${c.isBoss ? `<div style="margin-top:4px;color:var(--amber)">UPLINK TRANSMITTING: ${Math.floor(c.uplink * 100)}%. Hit its <b>jump/uplink</b> system to slow it!</div><div class="bar uplink"><div style="width:${c.uplink * 100}%"></div></div>` : ''}
        ${e.faction === 'maxolhx' ? '<div style="color:var(--purple)">Nearly unbeatable. Charge the jump drive and RUN.</div>' : ''}
        ${c.disabledFor > 0 ? `<div style="color:var(--green)">Weapons offline: surrendering in ${Math.max(0, 4 - c.disabledFor).toFixed(1)}s</div>` : ''}
      </div>`;

    const sysRow = (id: SystemId) => {
      const s = p.systems[id];
      if (s.level <= 0) return '';
      const pips = Array.from({ length: s.level }, (_, i) => {
        const dmgStart = s.level - s.damage;
        const cls = i >= dmgStart ? 'dmg' : i < s.power ? 'on' : '';
        return `<div class="pip ${cls}"></div>`;
      }).join('');
      const extra = id === 'shields' ? ` ${maxShieldLayers(p)}L` : id === 'engines' ? ` ${Math.round(evasion(p) * 100)}%` : '';
      const pm = id === 'weapons' ? '' : `<span class="pm"><button data-act="pw-" data-id="${id}">−</button><button data-act="pw+" data-id="${id}">+</button></span>`;
      return `<div class="c-sys" title="${SYSTEM_NAMES[id]}: ${s.power}/${capacity(s)} power${s.damage ? `, ${s.damage} damaged` : ''}">
        <div class="ico">${systemIconSVG(id)}</div><div>${SYSTEM_NAMES[id]}<span style="color:var(--dim);font-size:11px">${extra}</span></div>
        <div class="pips">${pips}</div>
        <div style="display:flex;gap:6px;align-items:center">${pm}
          <span class="crewbox" title="Crew stationed (max 2)"><button class="small" data-act="cr-" data-id="${id}" style="padding:0 5px">−</button>👤${s.crew}<button class="small" data-act="cr+" data-id="${id}" style="padding:0 5px">+</button></span></div>
      </div>`;
    };
    const fp = freePower(p);
    const weaponsHtml = p.weapons.map((w, i) => {
      const pct = (w.charge / w.def.charge) * 100;
      const ready = w.powered && w.charge >= w.def.charge;
      const noAmmo = w.def.usesMissile && c.missiles <= 0;
      return `<div class="wcard ${this.selected === i ? 'sel' : ''} ${w.powered ? '' : 'off'}" data-act="wsel" data-id="${i}">
        <div style="display:flex;justify-content:space-between;align-items:center"><span class="nm">${w.def.name}</span><span class="kbd">${i + 1}</span></div>
        <div style="color:var(--dim)">${w.def.power}⚡ · ${w.def.shots}×${w.def.damage}${w.def.usesMissile ? ` · 🚀${c.missiles}` : ''}${w.def.pierce ? ' · pierce' : ''}</div>
        <div class="chg ${ready ? 'ready' : ''}"><div style="width:${pct}%"></div></div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span class="tgt">${noAmmo ? '<span style="color:var(--red)">NO MISSILES</span>' : w.target ? `⌖ ${SYSTEM_NAMES[w.target]}` : 'no target'}</span>
          <button class="small" data-act="wpow" data-id="${i}">${w.powered ? 'ON' : 'OFF'}</button></div>
      </div>`;
    }).join('');
    const mood = this.run.res.mood;
    const hackOk = !c.skippyUsed.hack && canUseAbility(mood, 'hack');
    const fakeOk = !c.skippyUsed.fake && c.canFlee && canUseAbility(mood, 'fake');
    const stealthOk = canActivateStealth(p);
    const jumpReady = p.jumpCharge >= 1;
    const modeLabel = { volley: 'Fire mode: VOLLEY', each: 'Fire mode: AS READY', hold: 'Fire mode: HOLD' }[c.fireMode];
    this.panel.innerHTML = `
      <div class="panel">
        <div class="reactor-row">REACTOR <div class="pips">${Array.from({ length: p.reactor }, (_, i) => `<div class="pip ${i < p.reactor - fp ? 'on' : ''}"></div>`).join('')}</div> ${fp} free · crew ${assignedCrew(p)}/${p.crew}</div>
        ${SYSTEM_IDS.map(sysRow).join('')}
      </div>
      <div class="panel">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
          <h3 class="label" style="margin:0">Weapons ${this.selected !== null ? '· <span style="color:var(--green)">click an enemy system to target</span>' : '· click a card, then an enemy system'}</h3>
          <span style="display:flex;gap:6px"><button class="small" data-act="fireMode" title="Volley: hold guns until all are charged (best vs shields)">${modeLabel} <span class="kbd">V</span></button><button class="small" data-act="fireNow">Fire now <span class="kbd">F</span></button><button class="small" data-act="pause">${this.paused ? '▶ Resume' : '⏸ Pause'} <span class="kbd">Space</span></button></span>
        </div>
        <div class="weapons">${weaponsHtml}</div>
        <div class="log" style="margin-top:6px">${c.log.slice(-3).map((l) => esc(l)).join('<br>')}</div>
      </div>
      <div class="panel">
        <div class="c-skippy"><div class="face">${skippySVG(mood)}</div><div class="bubble">${esc(this.bark)}</div></div>
        <div class="cbtns">
          <button data-act="hack" ${hackOk ? '' : 'disabled'} title="Drop enemy shields (mood ${ABILITIES.hack.minMood}+, costs ${ABILITIES.hack.cost})">🧠 Hack shields <span class="kbd">H</span></button>
          <button data-act="fake" ${fakeOk ? '' : 'disabled'} title="Instant escape (mood ${ABILITIES.fake.minMood}+, costs ${ABILITIES.fake.cost})">🌀 Fake wormhole <span class="kbd">G</span></button>
          <button data-act="cstealth" ${stealthOk ? '' : 'disabled'} title="Ship stealth field: enemy shots miss">👁 Stealth ${p.stealthTime > 0 ? p.stealthTime.toFixed(0) + 's' : p.stealthCooldown > 0 ? '(' + p.stealthCooldown.toFixed(0) + 's)' : ''} <span class="kbd">S</span></button>
          <button data-act="flee" class="${jumpReady && c.canFlee ? 'primary' : ''}" ${jumpReady && c.canFlee ? '' : 'disabled'}>⇥ Jump away <span class="kbd">J</span></button>
        </div>
        <div style="font-size:11px;color:var(--dim);margin-top:4px">${c.canFlee ? `Jump drive ${Math.floor(p.jumpCharge * 100)}%${c.jumpMultiplier < 1 ? ' (Skippy sulking: slow)' : ''}` : 'No escape from the relay!'}</div>
        <div class="jumpbar ${jumpReady ? 'ready' : ''}"><div style="width:${p.jumpCharge * 100}%"></div></div>
      </div>`;
  }
}
