import './ui/style.css';
import { Starfield } from './ui/starfield';
import { audio } from './ui/audio';
import { CombatView } from './ui/combatView';
import {
  endHTML, eventHTML, howToHTML, mapScreenHTML, resultHTML, shipHTML, shopHTML, titleHTML,
} from './ui/screens';
import {
  armStealth, buyItem, chooseEventOption, dismissResult, emergencySiphon, fakeWormholeJump, finishCombat, jumpTo,
  leaveSector, leaveShop, newRun, openShop, startCombat, type RunState,
} from './game/run';
import { hashSeed } from './game/rng';
import { BARKS, NAGATHA_BARKS, type BarkKey } from './game/data/barks';
import { clearRun, loadRun, saveRun, SETTINGS_KEY } from './game/save';
import type { CombatState } from './game/combat';

type Overlay = 'none' | 'ship' | 'howto';

class App {
  private stage = document.getElementById('stage')!;
  private stars = new Starfield(document.getElementById('stars') as HTMLCanvasElement);
  private run: RunState | null = null;
  private screen: 'title' | 'game' = 'title';
  private overlay: Overlay = 'none';
  private combatView: CombatView | null = null;
  private selectingFake = false;
  private bark: { text: string; speaker: 'skippy' | 'nagatha' } = { text: '', speaker: 'skippy' };
  private shopQuip = '';
  private tooltip: HTMLDivElement;
  private last = performance.now();
  private barkCounter = 0;

  constructor() {
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'tooltip';
    this.tooltip.style.display = 'none';
    this.stage.appendChild(this.tooltip);
    try {
      const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') as { muted?: boolean };
      audio.muted = !!s.muted;
    } catch { /* ignore */ }
    this.fit();
    window.addEventListener('resize', () => this.fit());
    this.stage.addEventListener('pointerdown', (e) => this.onPointer(e));
    this.stage.addEventListener('pointermove', (e) => this.onHover(e));
    window.addEventListener('keydown', (e) => this.onKey(e));
    this.render();
    requestAnimationFrame((t) => this.loop(t));
  }

  /** Scale the fixed 1280x720 stage to fit the window (letterboxed). */
  private fit(): void {
    const s = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
    this.stage.style.transform = `scale(${s})`;
  }

  private loop(t: number): void {
    const dt = Math.min(0.1, (t - this.last) / 1000);
    this.last = t;
    this.stars.speed = this.combatView ? 0.4 : 1;
    this.stars.draw(dt, t / 1000);
    if (this.run && this.screen === 'game' && this.run.phase !== 'won' && this.run.phase !== 'lost') {
      if (!(this.combatView?.paused)) this.run.stats.playSeconds += dt;
    }
    this.combatView?.update(dt);
    requestAnimationFrame((tt) => this.loop(tt));
  }

  // ---------------------------------------------------------------- barks

  pickBark(key: BarkKey): string {
    const list = BARKS[key];
    this.barkCounter++;
    // Deterministic-enough variety without touching the game RNG.
    return list[(this.barkCounter * 7 + Math.floor(performance.now() / 1000)) % list.length];
  }

  private mapBark(): void {
    const run = this.run!;
    if (run.res.mood < 25) {
      this.bark = { text: NAGATHA_BARKS[this.barkCounter++ % NAGATHA_BARKS.length], speaker: 'nagatha' };
      return;
    }
    let key: BarkKey = 'jump';
    if (run.current === run.map.startId && run.stats.jumps > 0 && run.map.nodes.filter((n) => n.visited).length === 1) key = `sector${run.sector}` as BarkKey;
    else if (run.stats.jumps === 0) key = 'sector1';
    else if (run.res.alert >= 70) key = 'alertHigh';
    else if (run.res.hull < run.res.maxHull * 0.3) key = 'hullLow';
    else if (run.map.pursuit > run.map.nodes[run.current].col - 1) key = 'pursuit';
    else if (run.res.mood >= 80) key = 'moodHigh';
    else if (run.map.nodes[run.current].type === 'empty') key = 'emptyNode';
    this.bark = { text: this.pickBark(key), speaker: 'skippy' };
  }

  // ---------------------------------------------------------------- flow

  private persist(): void {
    if (!this.run) return;
    if (this.run.phase === 'won' || this.run.phase === 'lost') clearRun(localStorage);
    else saveRun(localStorage, this.run);
  }

  private startNew(): void {
    const input = this.stage.querySelector<HTMLInputElement>('#seed');
    const typed = input?.value.trim();
    const seed = typed ? (/^\d+$/.test(typed) ? Number(typed) >>> 0 : hashSeed(typed)) : (Math.random() * 2 ** 32) >>> 0;
    this.run = newRun(seed);
    this.screen = 'game';
    this.overlay = 'none';
    this.combatView = null;
    this.bark = { text: this.pickBark('sector1'), speaker: 'skippy' };
    audio.play('jump');
    this.stars.jumpFlash();
    this.render();
  }

  private continueRun(): void {
    const run = loadRun(localStorage);
    if (!run) return;
    this.run = run;
    this.screen = 'game';
    this.overlay = 'none';
    this.mapBark();
    this.render();
  }

  private beginCombatIfNeeded(): void {
    const run = this.run!;
    if (run.phase === 'combat' && !this.combatView) {
      const c = startCombat(run);
      if (!c) return;
      this.combatView = new CombatView(this.stage, run, c, {
        onEnd: (combat) => this.endCombat(combat),
        onRunChanged: () => this.persist(),
        pickBark: (k) => this.pickBark(k),
      });
      // Debug aid: ?speed=4 runs combat 4x faster (used for automated playtests).
      this.combatView.speed = Math.max(1, Math.min(20, Number(new URLSearchParams(location.search).get('speed')) || 1));
      this.combatView.mount();
      this.stage.appendChild(this.tooltip);
    }
  }

  private endCombat(combat: CombatState): void {
    const run = this.run!;
    finishCombat(run, combat);
    this.combatView = null;
    if (combat.outcome === 'fled' || combat.outcome === 'escaped') this.stars.jumpFlash();
    this.mapBark();
    this.render();
  }

  render(): void {
    this.persist();
    if (this.combatView) return; // combat view manages its own DOM
    this.tooltip.style.display = 'none';
    const run = this.run;
    let html: string;
    if (this.screen === 'title' || !run) {
      html = titleHTML(!!loadRun(localStorage), audio.muted);
      if (this.overlay === 'howto') html += howToHTML();
    } else if (run.phase === 'won' || run.phase === 'lost') {
      html = endHTML(run, this.pickBark('victory'), this.pickBark('defeat'));
    } else if (run.phase === 'combat') {
      this.beginCombatIfNeeded();
      return;
    } else {
      if (!this.bark.text) this.mapBark();
      html = mapScreenHTML(run, { selectingFake: this.selectingFake }, this.bark);
      if (run.phase === 'event') html += eventHTML(run);
      else if (run.phase === 'result') html += resultHTML(run);
      else if (run.phase === 'shop') html += shopHTML(run, this.shopQuip || (this.shopQuip = this.pickBark('shop')));
      if (this.overlay === 'ship') html += shipHTML(run);
      if (this.overlay === 'howto') html += howToHTML();
    }
    this.stage.innerHTML = html;
    this.stage.appendChild(this.tooltip);
  }

  // ---------------------------------------------------------------- input

  private onPointer(e: PointerEvent): void {
    if (e.button !== 0) return;
    const el = (e.target as Element).closest<HTMLElement | SVGElement>('[data-act]');
    if (!el) return;
    if ((el as HTMLButtonElement).disabled) return;
    const act = el.getAttribute('data-act')!;
    const id = el.getAttribute('data-id') ?? undefined;
    if (el.tagName !== 'INPUT') e.preventDefault();
    this.dispatch(act, id);
  }

  private onHover(e: PointerEvent): void {
    const el = (e.target as Element).closest('[data-tip]');
    if (!el) {
      this.tooltip.style.display = 'none';
      return;
    }
    const rect = this.stage.getBoundingClientRect();
    const scale = rect.width / 1280;
    this.tooltip.textContent = el.getAttribute('data-tip');
    this.tooltip.style.display = 'block';
    this.tooltip.style.left = `${(e.clientX - rect.left) / scale + 14}px`;
    this.tooltip.style.top = `${(e.clientY - rect.top) / scale + 10}px`;
  }

  private dispatch(act: string, id?: string): void {
    if (this.combatView && this.combatView.act(act, id)) return;
    const run = this.run;
    switch (act) {
      case 'new': this.startNew(); return;
      case 'continue': this.continueRun(); return;
      case 'title': this.screen = 'title'; this.run = null; this.render(); return;
      case 'howto': this.overlay = 'howto'; audio.play('click'); this.render(); return;
      case 'mute':
        audio.muted = !audio.muted;
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({ muted: audio.muted }));
        this.render();
        return;
      case 'closeOverlay': this.overlay = 'none'; this.render(); return;
      case 'menu':
        if (this.combatView) return;
        this.persist();
        this.screen = 'title';
        this.render();
        return;
    }
    if (!run) return;
    switch (act) {
      case 'jump': {
        if (jumpTo(run, Number(id))) this.afterJump();
        break;
      }
      case 'fakeTo': {
        if (fakeWormholeJump(run, Number(id))) {
          this.selectingFake = false;
          this.afterJump();
          this.bark = { text: this.pickBark('fakeWormhole'), speaker: 'skippy' };
        }
        break;
      }
      case 'fakeMode': this.selectingFake = !this.selectingFake; audio.play('click'); break;
      case 'stealth':
        if (armStealth(run)) {
          this.bark = { text: this.pickBark('stealthField'), speaker: 'skippy' };
          audio.play('hack');
        }
        break;
      case 'choose': {
        const panel = chooseEventOption(run, Number(id));
        if (panel) audio.play('click');
        break;
      }
      case 'dismiss':
        dismissResult(run);
        audio.play('click');
        if (run.phase === 'map') this.mapBark();
        break;
      case 'buy':
        if (id && buyItem(run, id)) audio.play('buy');
        break;
      case 'leaveShop': leaveShop(run); this.shopQuip = ''; break;
      case 'openShop': openShop(run); break;
      case 'nextSector':
        if (leaveSector(run)) {
          audio.play('jump');
          this.stars.jumpFlash();
          this.bark = { text: this.pickBark(`sector${run.sector}` as BarkKey), speaker: 'skippy' };
        }
        break;
      case 'siphon': emergencySiphon(run); break;
      case 'ship': this.overlay = 'ship'; audio.play('click'); break;
      default: return;
    }
    this.render();
  }

  private afterJump(): void {
    audio.play('jump');
    this.stars.jumpFlash();
    this.shopQuip = '';
    this.mapBark();
  }

  private onKey(e: KeyboardEvent): void {
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (this.combatView) {
      if (this.combatView.key(k)) e.preventDefault();
      return;
    }
    const run = this.run;
    if (k === 'Escape') {
      if (this.overlay !== 'none') { this.overlay = 'none'; this.render(); return; }
      if (this.selectingFake) { this.selectingFake = false; this.render(); return; }
      if (run?.phase === 'shop') { this.dispatch('leaveShop'); return; }
    }
    if (!run || this.screen !== 'game' || this.overlay !== 'none') return;
    if (run.phase === 'event' && /^[1-4]$/.test(k)) this.dispatch('choose', String(Number(k) - 1));
    else if (run.phase === 'result' && (k === 'Enter' || k === ' ')) { e.preventDefault(); this.dispatch('dismiss'); }
  }
}

new App();
