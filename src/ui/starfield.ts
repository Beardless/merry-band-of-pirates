// Animated parallax starfield on a full-window canvas. Purely cosmetic.
interface Star { x: number; y: number; z: number; tw: number }

export class Starfield {
  private ctx: CanvasRenderingContext2D;
  private stars: Star[] = [];
  private nebulae: { x: number; y: number; r: number; hue: number }[] = [];
  /** Horizontal drift speed multiplier; spikes briefly during a jump. */
  speed = 1;
  private warp = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    let seed = 1337;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 420; i++) this.stars.push({ x: rnd(), y: rnd(), z: 0.2 + rnd() * 0.8, tw: rnd() * Math.PI * 2 });
    for (let i = 0; i < 4; i++) this.nebulae.push({ x: rnd(), y: rnd(), r: 0.25 + rnd() * 0.3, hue: [200, 260, 170, 300][i] });
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize(): void {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.floor(window.innerWidth * dpr);
    this.canvas.height = Math.floor(window.innerHeight * dpr);
  }

  jumpFlash(): void {
    this.warp = 1;
  }

  draw(dt: number, time: number): void {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#04060c';
    ctx.fillRect(0, 0, w, h);
    for (const n of this.nebulae) {
      const g = ctx.createRadialGradient(n.x * w, n.y * h, 0, n.x * w, n.y * h, n.r * Math.max(w, h));
      g.addColorStop(0, `hsla(${n.hue}, 70%, 35%, 0.13)`);
      g.addColorStop(1, 'hsla(0,0%,0%,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    this.warp = Math.max(0, this.warp - dt * 0.9);
    const v = (0.006 * this.speed + this.warp * 0.6) * dt;
    for (const s of this.stars) {
      s.x -= v * s.z;
      if (s.x < 0) s.x += 1;
      const tw = 0.6 + 0.4 * Math.sin(time * 1.5 + s.tw);
      const size = s.z * 1.6 * (w / 1600) + 0.4;
      ctx.globalAlpha = Math.min(1, s.z * tw);
      ctx.fillStyle = s.z > 0.85 ? '#cfe8ff' : '#ffffff';
      if (this.warp > 0.05) {
        const len = this.warp * 200 * s.z * (w / 1600);
        ctx.fillRect(s.x * w, s.y * h, len, size * 0.7);
      } else {
        ctx.fillRect(s.x * w, s.y * h, size, size);
      }
    }
    ctx.globalAlpha = 1;
  }
}
