/* =========================================================
   蚀月远征 · 调试：性能监控器
   FPS 计数器、各系统耗时统计、draw call 计数
   ========================================================= */

/** FPS 计数器 */
export class FPSCounter {
  _frames: number;
  _lastTime: number;
  _fps: number;
  _el: any;

  constructor() {
    this._frames = 0;
    this._lastTime = performance.now();
    this._fps = 0;
    this._el = null;
  }

  get fps(): number { return this._fps; }

  update(ctx: any): void {
    this._frames++;
    const now = performance.now();
    if (now - this._lastTime >= 1000) {
      this._fps = Math.round(this._frames * 1000 / (now - this._lastTime));
      this._frames = 0;
      this._lastTime = now;
    }
  }

  draw(ctx: any): void {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(4, 4, 80, 20);
    ctx.fillStyle = this._fps >= 50 ? '#7fd6a4' : this._fps >= 30 ? '#f6e3b8' : '#e2546a';
    ctx.font = '12px monospace';
    ctx.textBaseline = 'top';
    ctx.fillText('FPS: ' + this._fps, 10, 8);
    ctx.restore();
  }
}

/** 系统耗时统计 */
export class SystemProfiler {
  _times: Record<string, number[]>;
  _current: string;

  constructor() {
    this._times = {};
    this._current = '';
  }

  begin(name: string): void {
    this._current = name;
    if (!this._times[name]) this._times[name] = [];
    this._times[name].push(performance.now());
  }

  end(): void {
    const name = this._current;
    if (!name || !this._times[name]) return;
    const arr = this._times[name];
    arr[arr.length - 1] = performance.now() - arr[arr.length - 1];
    if (arr.length > 120) arr.shift();
  }

  avg(name: string): number {
    const arr = this._times[name];
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  draw(ctx: any): void {
    const names = Object.keys(this._times);
    if (names.length === 0) return;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(4, 28, 160, names.length * 16 + 6);
    ctx.font = '11px monospace';
    ctx.textBaseline = 'top';
    names.forEach((name, i) => {
      const avg = this.avg(name);
      ctx.fillStyle = avg > 5 ? '#e2546a' : avg > 2 ? '#f6e3b8' : '#7fd6a4';
      ctx.fillText(name + ': ' + avg.toFixed(1) + 'ms', 10, 32 + i * 16);
    });
    ctx.restore();
  }
}

/** Draw call 计数器 */
export class DrawCallCounter {
  count: number;

  constructor() {
    this.count = 0;
  }

  reset(): void { this.count = 0; }
  inc(): void { this.count++; }

  draw(ctx: any): void {
    const prof = (window as any).__profiler;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(4, 52 + Object.keys(prof?.avg || {}).length * 16 + 10, 100, 20);
    ctx.fillStyle = '#ccc';
    ctx.font = '12px monospace';
    ctx.textBaseline = 'top';
    ctx.fillText('Draws: ' + this.count, 10, 56 + Object.keys(prof?.avg || {}).length * 16 + 14);
    ctx.restore();
  }
}
