/* =========================================================
   蚀月远征 · 音效合成器
   所有音效通过 Web Audio API 实时合成，无需外部音频文件
   ========================================================= */

type AudioCtx = AudioContext;

/* ---------- 基础合成器 ---------- */
let lastHitAt = 0;

function makeNoiseBuffer(ctx: AudioCtx, sec: number): AudioBuffer {
  const buf = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function tone(ctx: AudioCtx, sfxBus: GainNode, freq: number, dur: number, type?: OscillatorType, vol?: number, glide?: number, delay?: number): void {
  const t = ctx.currentTime + (delay || 0);
  const o = ctx.createOscillator();
  o.type = type || 'triangle';
  o.frequency.setValueAtTime(freq, t);
  if (glide) o.frequency.exponentialRampToValueAtTime(Math.max(30, glide), t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol || 0.1, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(sfxBus);
  o.start(t); o.stop(t + dur + 0.05);
  o.onended = () => { try { o.disconnect(); g.disconnect(); } catch (e) {} };
}

let sfxNoiseBuf: AudioBuffer | null = null;

function noiseHit(ctx: AudioCtx, sfxBus: GainNode, dur: number, vol: number, hp?: number, lp?: number, delay?: number): void {
  const t = ctx.currentTime + (delay || 0);
  if (!sfxNoiseBuf) sfxNoiseBuf = makeNoiseBuffer(ctx, 0.4);
  const src = ctx.createBufferSource(); src.buffer = sfxNoiseBuf;
  const f = ctx.createBiquadFilter();
  if (lp) { f.type = 'lowpass'; f.frequency.value = lp; }
  else { f.type = 'highpass'; f.frequency.value = hp || 4000; }
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(sfxBus);
  src.start(t); src.stop(t + dur + 0.05);
  src.onended = () => { try { src.disconnect(); f.disconnect(); g.disconnect(); } catch (e) {} };
}

/* ---------- 音效表 ---------- */
export interface SfxContext {
  ctx: AudioCtx;
  sfxBus: GainNode;
}

export function createSfxTable(ctx: AudioCtx, sfxBus: GainNode): Record<string, () => void> {
  const c = ctx;
  const b = sfxBus;
  return {
    click:   () => tone(c, b, 720, 0.06, 'triangle', 0.16, 540),
    open:    () => { tone(c, b, 400, 0.13, 'sine', 0.14, 820); tone(c, b, 600, 0.13, 'sine', 0.08, 900, 0.04); },
    close:   () => tone(c, b, 640, 0.11, 'sine', 0.12, 320),
    buy:     () => { tone(c, b, 980, 0.08, 'square', 0.09); tone(c, b, 1310, 0.09, 'square', 0.07, 0, 0.05); },
    sell:    () => { tone(c, b, 420, 0.1, 'square', 0.1, 240); tone(c, b, 300, 0.14, 'square', 0.08, 190, 0.06); },
    upgrade: () => { tone(c, b, 520, 0.09, 'triangle', 0.13, 780); tone(c, b, 780, 0.09, 'triangle', 0.11, 1170, 0.07); tone(c, b, 1170, 0.13, 'triangle', 0.1, 1560, 0.14); },
    levelup: () => { [660, 880, 1100, 1320].forEach((f, i) => tone(c, b, f, 0.14, 'triangle', 0.11, 0, i * 0.06)); },
    unlock:  () => { [523, 659, 784, 1046].forEach((f, i) => tone(c, b, f, 0.22, 'sine', 0.13, 0, i * 0.09)); noiseHit(c, b, 0.5, 0.08, undefined, 2600, 0.3); },
    curse:   () => { tone(c, b, 220, 0.5, 'sawtooth', 0.1, 140); tone(c, b, 110, 0.6, 'sine', 0.12, 70, 0.05); },
    pickup:  () => tone(c, b, 1180, 0.07, 'triangle', 0.09, 1520),
    hurt:    () => { tone(c, b, 180, 0.22, 'sawtooth', 0.16, 90); noiseHit(c, b, 0.16, 0.1, 2400); },
    kill:    () => { noiseHit(c, b, 0.18, 0.12, 3000); tone(c, b, 260, 0.16, 'sawtooth', 0.08, 90); },
    hit:     () => { const t = ctx.currentTime; if (t - lastHitAt < 0.06) return; lastHitAt = t; noiseHit(c, b, 0.06, 0.07, 3600); },
    w_moon:     () => noiseHit(c, b, 0.3, 0.1, undefined, 1400),
    w_crossbow: () => { noiseHit(c, b, 0.08, 0.12, 5000); tone(c, b, 1500, 0.07, 'triangle', 0.07, 1100); },
    w_arc:      () => { noiseHit(c, b, 0.18, 0.14, undefined, 2000); tone(c, b, 880, 0.2, 'sawtooth', 0.08, 220); },
    w_meteor:   () => { tone(c, b, 160, 0.55, 'sawtooth', 0.12, 60); noiseHit(c, b, 0.5, 0.1, undefined, 700, 0.1); },
    w_frost:    () => { tone(c, b, 1250, 0.24, 'sine', 0.1, 880); tone(c, b, 1660, 0.2, 'sine', 0.07, 1240, 0.05); },
    w_beam:     () => { tone(c, b, 1400, 0.22, 'square', 0.07, 900); tone(c, b, 700, 0.22, 'square', 0.06, 500, 0.02); },
    w_orbit:    () => tone(c, b, 330, 0.12, 'sine', 0.06, 300),
    w_lance:    () => { tone(c, b, 520, 0.16, 'triangle', 0.11, 260); noiseHit(c, b, 0.12, 0.09, 3200, undefined, 0.04); },
    w_shadow:   () => { tone(c, b, 300, 0.24, 'sawtooth', 0.09, 120); tone(c, b, 150, 0.3, 'sine', 0.08, 80, 0.06); },
    w_storm:    () => noiseHit(c, b, 0.2, 0.08, undefined, 1800),
    w_nova:     () => { tone(c, b, 440, 0.3, 'sawtooth', 0.12, 220); noiseHit(c, b, 0.28, 0.12, undefined, 1500, 0.02); [660, 880, 1320].forEach((f, i) => tone(c, b, f, 0.2, 'triangle', 0.08, 0, 0.05 + i * 0.05)); },
    w_phantom:  () => { [880, 660, 440].forEach((f, i) => tone(c, b, f, 0.3, 'sine', 0.08, f * 0.5, i * 0.12)); },
    boss_wave:  () => { tone(c, b, 300, 0.3, 'sawtooth', 0.12, 700); noiseHit(c, b, 0.22, 0.1, undefined, 1800); },
    boss_dash:  () => tone(c, b, 200, 0.35, 'sawtooth', 0.14, 880),
    boss_summon:() => { tone(c, b, 140, 0.4, 'sine', 0.12, 70); tone(c, b, 210, 0.4, 'sine', 0.08, 100, 0.1); },
  };
}