// Tiny WebAudio synth for sound effects. No audio files.
type Sfx = 'click' | 'fire' | 'missile' | 'hit' | 'shield' | 'miss' | 'jump' | 'win' | 'lose' | 'buy' | 'alarm' | 'hack';

export class Audio {
  private ctx: AudioContext | null = null;
  muted = false;

  private ensure(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol = 0.08, slide = 0, delay = 0): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noise(dur: number, vol = 0.1, delay = 0): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 900;
    src.buffer = buf;
    g.gain.value = vol;
    src.connect(f).connect(g).connect(ctx.destination);
    src.start(t);
  }

  play(s: Sfx): void {
    switch (s) {
      case 'click': this.tone(660, 0.05, 'square', 0.03); break;
      case 'fire': this.tone(900, 0.14, 'sawtooth', 0.05, -600); break;
      case 'missile': this.noise(0.35, 0.08); this.tone(220, 0.3, 'triangle', 0.05, 200); break;
      case 'hit': this.noise(0.4, 0.18); this.tone(90, 0.3, 'sine', 0.15, -40); break;
      case 'shield': this.tone(1200, 0.18, 'sine', 0.05, -500); break;
      case 'miss': this.tone(500, 0.08, 'triangle', 0.02, 200); break;
      case 'jump': this.tone(120, 0.8, 'sawtooth', 0.06, 900); this.noise(0.8, 0.05); break;
      case 'win': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.06, 0, i * 0.12)); break;
      case 'lose': [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.4, 'sawtooth', 0.05, 0, i * 0.18)); break;
      case 'buy': this.tone(880, 0.08, 'square', 0.04); this.tone(1320, 0.1, 'square', 0.04, 0, 0.07); break;
      case 'alarm': this.tone(440, 0.25, 'square', 0.04); this.tone(330, 0.25, 'square', 0.04, 0, 0.25); break;
      case 'hack': [1500, 1100, 1700, 900, 2000].forEach((f, i) => this.tone(f, 0.06, 'square', 0.03, 0, i * 0.05)); break;
    }
  }
}

export const audio = new Audio();
