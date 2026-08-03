/* =========================================================
   蚀月远征 · 音效合成器（精细化音色库）
   全部音效通过 Web Audio API 实时合成，月表弦乐设定：
   —— 弦乐拨弦 / 冰晶钟音 / 暗蚀铺底 / 低频轰鸣 / 风声
   ========================================================= */

type AudioCtx = AudioContext;

/* ---------- 噪声缓冲 ---------- */
let sfxNoiseBuf: AudioBuffer | null = null;

function makeNoiseBuffer(ctx: AudioCtx, sec: number): AudioBuffer {
  const buf = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function noiseBuffer(ctx: AudioCtx): AudioBuffer {
  if (!sfxNoiseBuf) sfxNoiseBuf = makeNoiseBuffer(ctx, 0.6);
  return sfxNoiseBuf;
}

/* ---------- 立体声声像（层次感） ---------- */
function panTo(ctx: AudioCtx, bus: AudioNode, pan?: number): AudioNode {
  if (pan === undefined || !ctx.createStereoPanner) return bus;
  const p = ctx.createStereoPanner();
  p.pan.value = Math.max(-0.8, Math.min(0.8, pan));
  p.connect(bus);
  return p;
}

/* ---------- 音色一：拨弦 pluck（弦乐/弹拨，快速衰减 + 谐波群） ---------- */
interface PluckOpts { vol?: number; bright?: number; detune?: number; delay?: number; pan?: number; harm?: number[]; type?: OscillatorType; }
function pluck(ctx: AudioCtx, bus: AudioNode, freq: number, dur: number, opts: PluckOpts = {}): void {
  const t = ctx.currentTime + (opts.delay || 0);
  const vol = opts.vol ?? 0.1;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = opts.bright ?? 2200;
  lp.Q.value = 0.6;
  const out = panTo(ctx, bus, opts.pan);
  const harm = opts.harm ?? [1, 2, 3.01];
  harm.forEach((h, i) => {
    const o = ctx.createOscillator();
    o.type = i === 0 ? (opts.type || 'triangle') : 'sine';
    o.frequency.value = freq * h;
    o.detune.value = (opts.detune || 0) + (Math.random() * 6 - 3);
    o.connect(lp);
    o.start(t);
    o.stop(t + dur + 0.08);
    o.onended = () => { try { o.disconnect(); } catch (e) {} };
  });
  lp.connect(g); g.connect(out);
  setTimeout(() => { try { g.disconnect(); } catch (e) {} }, (dur + 0.2) * 1000);
}

/* ---------- 音色二：钟音 bell（冰晶/秘宝，失谐泛音 + 长衰减 + 微颤音） ---------- */
interface BellOpts { vol?: number; delay?: number; pan?: number; shimmer?: number; }
function bell(ctx: AudioCtx, bus: AudioNode, freq: number, dur: number, opts: BellOpts = {}): void {
  const t = ctx.currentTime + (opts.delay || 0);
  const vol = opts.vol ?? 0.1;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const out = panTo(ctx, bus, opts.pan);
  // 钟声泛音比：1 : 2.76 : 5.4（带失谐，冰冷金属感）
  [[1, 1], [2.76, 0.45], [5.4, 0.22], [8.1, 0.1]].forEach(([h, amp]) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq * h;
    o.detune.value = (Math.random() * 10 - 5) + (opts.shimmer || 0);
    const og = ctx.createGain();
    og.gain.value = amp;
    o.connect(og); og.connect(g);
    o.start(t); o.stop(t + dur + 0.1);
    o.onended = () => { try { o.disconnect(); og.disconnect(); } catch (e) {} };
  });
  g.connect(out);
}

/* ---------- 音色三：弦乐铺底 pad（长音，失谐锯齿 + 颤音 + 慢起音） ---------- */
interface PadOpts { vol?: number; delay?: number; pan?: number; dark?: number; vibrato?: number; }
function pad(ctx: AudioCtx, bus: AudioNode, freq: number, dur: number, opts: PadOpts = {}): void {
  const t = ctx.currentTime + (opts.delay || 0);
  const vol = opts.vol ?? 0.08;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.25);          // 慢起音
  g.gain.setValueAtTime(vol, t + Math.max(0.25, dur - 0.5));
  g.gain.linearRampToValueAtTime(0.0001, t + dur);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = opts.dark ?? 1400;
  lp.frequency.linearRampToValueAtTime((opts.dark ?? 1400) * 0.7, t + dur);
  lp.Q.value = 0.5;
  const out = panTo(ctx, bus, opts.pan);
  [-9, 0, 9].forEach(d => {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = freq;
    o.detune.value = d;
    o.connect(lp);
    o.start(t); o.stop(t + dur + 0.1);
    o.onended = () => { try { o.disconnect(); } catch (e) {} };
  });
  // 颤音（长音细腻感）
  const vib = opts.vibrato ?? 0;
  if (vib > 0) {
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 4.6;
    const lfoG = ctx.createGain();
    lfoG.gain.value = freq * vib;
    lfo.connect(lfoG); lfoG.connect(lp.frequency);
    lfo.start(t); lfo.stop(t + dur + 0.1);
    lfo.onended = () => { try { lfo.disconnect(); lfoG.disconnect(); } catch (e) {} };
  }
  lp.connect(g); g.connect(out);
}

/* ---------- 音色四：低频冲击 thump（轰鸣/陨星/受击） ---------- */
interface ThumpOpts { vol?: number; delay?: number; pan?: number; glide?: number; }
function thump(ctx: AudioCtx, bus: AudioNode, freq: number, dur: number, opts: ThumpOpts = {}): void {
  const t = ctx.currentTime + (opts.delay || 0);
  const vol = opts.vol ?? 0.14;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(24, opts.glide ?? freq * 0.5), t + dur);
  const out = panTo(ctx, bus, opts.pan);
  o.connect(g); g.connect(out);
  o.start(t); o.stop(t + dur + 0.1);
  o.onended = () => { try { o.disconnect(); g.disconnect(); } catch (e) {} };
}

/* ---------- 音色五：风声 whoosh（风暴/浪潮，带通噪声扫频） ---------- */
interface WhooshOpts { vol?: number; delay?: number; pan?: number; up?: boolean; }
function whoosh(ctx: AudioCtx, bus: AudioNode, dur: number, opts: WhooshOpts = {}): void {
  const t = ctx.currentTime + (opts.delay || 0);
  const vol = opts.vol ?? 0.1;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 0.9;
  const from = opts.up ? 420 : 2400;
  const to = opts.up ? 2600 : 420;
  bp.frequency.setValueAtTime(from, t);
  bp.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + dur * 0.3);
  g.gain.linearRampToValueAtTime(0.0001, t + dur);
  const out = panTo(ctx, bus, opts.pan);
  src.connect(bp); bp.connect(g); g.connect(out);
  src.start(t); src.stop(t + dur + 0.1);
  src.onended = () => { try { src.disconnect(); bp.disconnect(); g.disconnect(); } catch (e) {} };
}

/* ---------- 音色六：噪声打击 click（机括/命中/敲击） ---------- */
interface ClickOpts { vol?: number; delay?: number; pan?: number; hp?: number; lp?: number; }
function noiseClick(ctx: AudioCtx, bus: AudioNode, dur: number, opts: ClickOpts = {}): void {
  const t = ctx.currentTime + (opts.delay || 0);
  const vol = opts.vol ?? 0.08;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  const f = ctx.createBiquadFilter();
  if (opts.lp) { f.type = 'lowpass'; f.frequency.value = opts.lp; }
  else { f.type = 'highpass'; f.frequency.value = opts.hp ?? 3600; }
  f.Q.value = 0.7;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const out = panTo(ctx, bus, opts.pan);
  src.connect(f); f.connect(g); g.connect(out);
  src.start(t); src.stop(t + dur + 0.08);
  src.onended = () => { try { src.disconnect(); f.disconnect(); g.disconnect(); } catch (e) {} };
}

/* =========================================================
   音效表 —— 每个音效组合多种音色，贴合月表弦乐世界观
   ========================================================= */
let lastHitAt = 0;

export interface SfxContext {
  ctx: AudioCtx;
  sfxBus: GainNode;
}

export function createSfxTable(ctx: AudioCtx, sfxBus: GainNode): Record<string, () => void> {
  const c = ctx;
  const b = sfxBus;
  return {
    /* ---------- UI ---------- */
    click:   () => pluck(c, b, 760, 0.05, { vol: 0.11, bright: 2600, pan: 0.1 }),
    open:    () => { pluck(c, b, 440, 0.2, { vol: 0.1, bright: 1900 }); pluck(c, b, 660, 0.24, { vol: 0.09, bright: 2200, delay: 0.06 }); pluck(c, b, 880, 0.28, { vol: 0.07, bright: 2500, delay: 0.12 }); },
    close:   () => { pluck(c, b, 660, 0.16, { vol: 0.09, bright: 1800 }); thump(c, b, 220, 0.2, { vol: 0.08, glide: 130 }); },
    buy:     () => { bell(c, b, 1568, 0.28, { vol: 0.11, pan: -0.2 }); bell(c, b, 2093, 0.3, { vol: 0.09, delay: 0.05, pan: 0.15 }); bell(c, b, 2637, 0.34, { vol: 0.07, delay: 0.1 }); },
    sell:    () => { pluck(c, b, 392, 0.14, { vol: 0.1, bright: 1400 }); thump(c, b, 200, 0.22, { vol: 0.1, glide: 120, delay: 0.04 }); },
    upgrade: () => { pluck(c, b, 523, 0.14, { vol: 0.11, bright: 2000 }); pluck(c, b, 784, 0.14, { vol: 0.1, bright: 2200, delay: 0.06 }); pluck(c, b, 1046, 0.2, { vol: 0.09, bright: 2600, delay: 0.12 }); bell(c, b, 2093, 0.3, { vol: 0.05, delay: 0.18 }); },
    levelup: () => { [523, 659, 784, 1046].forEach((f, i) => pluck(c, b, f, 0.22, { vol: 0.1, bright: 2100, delay: i * 0.07 })); bell(c, b, 2093, 0.4, { vol: 0.06, delay: 0.3 }); },
    unlock:  () => { [523, 659, 784, 1046, 1318].forEach((f, i) => bell(c, b, f, 0.5, { vol: 0.09, delay: i * 0.08, pan: (i - 2) * 0.1 })); pad(c, b, 262, 0.8, { vol: 0.05, dark: 2000, delay: 0.15 }); noiseClick(c, b, 0.4, { vol: 0.05, lp: 2200, delay: 0.1 }); },
    curse:   () => { pad(c, b, 110, 1.1, { vol: 0.11, dark: 600, vibrato: 0.012 }); thump(c, b, 82, 0.8, { vol: 0.13, glide: 50, delay: 0.05 }); noiseClick(c, b, 0.5, { vol: 0.05, lp: 500, delay: 0.1 }); },
    pickup:  () => bell(c, b, 2093, 0.1, { vol: 0.07, pan: 0.25 }),

    /* ---------- 战斗反馈 ---------- */
    hurt:    () => { thump(c, b, 170, 0.24, { vol: 0.17, glide: 90 }); noiseClick(c, b, 0.14, { vol: 0.1, hp: 2300 }); },
    kill:    () => { noiseClick(c, b, 0.16, { vol: 0.11, hp: 3200 }); thump(c, b, 150, 0.2, { vol: 0.1, glide: 80, delay: 0.02 }); },
    hit:     () => { const t = ctx.currentTime; if (t - lastHitAt < 0.05) return; lastHitAt = t; noiseClick(c, b, 0.05, { vol: 0.06, hp: 3900, pan: (Math.random() * 0.5 - 0.25) }); },

    /* ---------- 武器开火（每把独特音色） ---------- */
    w_moonRing: () => { pluck(c, b, 880, 0.26, { vol: 0.1, bright: 2400, pan: -0.15 }); pluck(c, b, 660, 0.22, { vol: 0.09, bright: 1900, delay: 0.03, pan: 0.15 }); },   // 回旋刃双弦拨奏
    w_crossbow: () => { noiseClick(c, b, 0.05, { vol: 0.11, hp: 5200, pan: -0.2 }); pluck(c, b, 1568, 0.07, { vol: 0.08, bright: 4200, pan: 0.2 }); },            // 机括嗒响 + 高弦 ping
    w_arc:      () => { pluck(c, b, 880, 0.22, { vol: 0.09, bright: 3800, type: 'sawtooth' }); pluck(c, b, 1320, 0.16, { vol: 0.07, bright: 4600, delay: 0.03 }); noiseClick(c, b, 0.1, { vol: 0.06, hp: 6000, delay: 0.02 }); },  // 电弧噼啪
    w_meteor:   () => { thump(c, b, 150, 0.6, { vol: 0.16, glide: 55 }); noiseClick(c, b, 0.5, { vol: 0.09, lp: 700, delay: 0.06 }); },                        // 陨星轰鸣落地
    w_frost:    () => { bell(c, b, 1250, 0.3, { vol: 0.1, pan: -0.2 }); bell(c, b, 1660, 0.26, { vol: 0.08, delay: 0.05, pan: 0.1 }); bell(c, b, 2093, 0.22, { vol: 0.06, delay: 0.1, pan: 0.3 }); },  // 冰晶散落
    w_beam:     () => { pad(c, b, 700, 0.35, { vol: 0.08, dark: 2600, vibrato: 0.004 }); pluck(c, b, 1400, 0.2, { vol: 0.05, bright: 3200, delay: 0.02 }); },  // 光束嗡鸣
    w_orbit:    () => { [440, 554, 659].forEach((f, i) => bell(c, b, f, 0.22, { vol: 0.07, delay: i * 0.04, pan: (i - 1) * 0.2 })); },                        // 环绕空灵琶音
    w_lance:    () => { pluck(c, b, 420, 0.18, { vol: 0.1, bright: 1600, type: 'sawtooth' }); noiseClick(c, b, 0.09, { vol: 0.09, hp: 3800, delay: 0.05 }); },  // 破空穿刺
    w_shadow:   () => { pad(c, b, 150, 0.4, { vol: 0.1, dark: 800, vibrato: 0.01 }); noiseClick(c, b, 0.2, { vol: 0.06, lp: 600, delay: 0.05 }); },            // 暗影吞没
    w_storm:    () => { whoosh(c, b, 0.32, { vol: 0.12, pan: -0.2 }); whoosh(c, b, 0.26, { vol: 0.09, delay: 0.08, pan: 0.25 }); },                            // 风卷
    w_nova:     () => { [523, 659, 784, 1046].forEach((f, i) => bell(c, b, f, 0.3, { vol: 0.08, delay: i * 0.05, pan: (i - 1.5) * 0.12 })); pad(c, b, 262, 0.5, { vol: 0.05, dark: 1800, delay: 0.1 }); },  // 月辉绽放
    w_phantom:  () => { bell(c, b, 880, 0.4, { vol: 0.07, shimmer: 6, pan: -0.2 }); bell(c, b, 660, 0.5, { vol: 0.06, shimmer: -6, delay: 0.1, pan: 0.2 }); },  // 幻影空灵

    /* ---------- Boss ---------- */
    boss_wave:  () => { thump(c, b, 190, 0.5, { vol: 0.14, glide: 70 }); whoosh(c, b, 0.4, { vol: 0.08, delay: 0.05 }); },
    boss_dash:  () => { pluck(c, b, 240, 0.4, { vol: 0.12, bright: 900, type: 'sawtooth' }); whoosh(c, b, 0.35, { vol: 0.1, up: true, delay: 0.03 }); },
    boss_summon:() => { thump(c, b, 130, 0.5, { vol: 0.13, glide: 70 }); pad(c, b, 98, 0.6, { vol: 0.09, dark: 500, delay: 0.08, vibrato: 0.01 }); },
  };
}
