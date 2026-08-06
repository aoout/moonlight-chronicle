/* =========================================================
   蚀月远征 · BGM 弦乐合成
   曲目《月表礼赞》—— 纯弦乐古典，月表风格：宁静、空旷、回响
   调性 A 小调 · BPM 58 · 4 小节梦幻和声循环
   和弦：Am9 → Fmaj7 → Cmaj9/E → Gsus4（低音下行，月光下的月表）
   声部：弦乐群和声 + 弦乐低音 + 独奏旋律 + 对位副旋律 + 竖琴点缀
   ========================================================= */
import { makeImpulse } from './dsp.js';

type AudioCtx = AudioContext;

const BPM = 58;
const SPB = 60 / BPM;
const STEP = SPB / 4;
const BAR = SPB * 4;

/* 和弦进行（根音 MIDI / 音级）：Am9 Fmaj7 Cmaj9/E Gsus4 */
const CHORDS = [
  { root: 57, intervals: [0, 3, 7, 14, 16] },    // A2 + C4 E4 A4 B4
  { root: 53, intervals: [0, 4, 7, 11, 14] },    // F2 + A3 C4 E4 A4
  { root: 48, intervals: [0, 4, 7, 11, 16] },    // C2 + E3 G3 B3 E4
  { root: 55, intervals: [0, 5, 7, 10, 14] },    // G2 + B3 D4 F4 A4
];

/* 主旋律（4 小节 × 8 步，休止留白，抒情缓奏） */
const MELODY: (number | null)[] = [
  69, null, 72, 76, null, 74, 72, null,      // Am9：A C E D C
  65, null, 69, 72, null, 71, null, 69,      // Fmaj7：F A C B A
  64, null, 67, 71, null, 69, null, null,    // Cmaj9/E：E G B A
  67, 71, 74, null, null, null, null, null,  // Gsus4：G B D 悬停
];

/* 对位副旋律（每小节 2 个音，绝对 MIDI） */
const COUNTER = [
  [76, 79],   // E5 G5
  [72, 74],   // C5 D5
  [71, 74],   // B4 D5
  [74, 71],   // D5 B4
];

/* ---------- 基础工具 ---------- */
function midi(m: number): number { return 440 * Math.pow(2, (m - 69) / 12); }

/* ---------- 弦乐群：多失谐锯齿 + 低通 + 缓慢起音 ---------- */
function stringNote(ctx: AudioCtx, reverbBus: GainNode, freq: number, t: number, dur: number, vel: number, filt?: number): void {
  const oscs: OscillatorNode[] = [];
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vel, t + 0.5);
  g.gain.setValueAtTime(vel, t + Math.max(0.3, dur - 0.6));
  g.gain.linearRampToValueAtTime(0, t + dur);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(filt || 900, t);
  lp.frequency.linearRampToValueAtTime((filt || 900) * 0.7, t + dur);
  lp.Q.value = 0.7;
  [-8, 0, 8].forEach(d => {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = freq;
    o.detune.value = d;
    o.connect(lp);
    o.start(t);
    o.stop(t + dur + 0.15);
    oscs.push(o);
  });
  lp.connect(g);
  g.connect(reverbBus);
  // 最后一个 oscillator 停止时清理整个链，避免 AudioNode 泄漏
  oscs[oscs.length - 1].onended = () => {
    for (const o of oscs) try { o.disconnect(); } catch (e) {/* ignore */ }
    try { lp.disconnect(); g.disconnect(); } catch (e) {/* ignore */ }
  };
}

/* ---------- 竖琴拨弦：正弦快速衰减 + 混响 ---------- */
function harpNote(ctx: AudioCtx, reverbBus: GainNode, freq: number, t: number, vel: number): void {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vel, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.value = freq;
  o.connect(g);
  g.connect(reverbBus);
  o.start(t);
  o.stop(t + 1.5);
  o.onended = () => { try { o.disconnect(); g.disconnect(); } catch (e) {/* ignore */ } };
}

/* ---------- 编排 ---------- */
function playStep(ctx: AudioCtx, reverbBus: GainNode, stepIndex: number, t: number): void {
  const barIndex = Math.floor(stepIndex / 16) % 4;
  const stepInBar = stepIndex % 16;
  const ch = CHORDS[barIndex];
  const rootF = midi(ch.root);

  // 弦乐和声全奏（每小节起音，长音）
  if (stepInBar === 0) {
    ch.intervals.forEach(iv => stringNote(ctx, reverbBus, midi(ch.root + iv), t, BAR * 0.98, 0.085, 800));
    stringNote(ctx, reverbBus, rootF / 2, t, BAR * 0.98, 0.075, 420);
  }
  // 主旋律（弦乐独奏，每 2 步一音）
  if (stepInBar % 2 === 0) {
    const mel = MELODY[barIndex * 8 + stepInBar / 2];
    if (mel !== null && mel !== undefined) {
      stringNote(ctx, reverbBus, midi(mel), t, STEP * 2.6, 0.12, 2000);
    }
  }
  // 对位副旋律（中提琴声部，小节中部与结尾）
  if (stepInBar === 6 || stepInBar === 14) {
    const cont = COUNTER[barIndex][stepInBar === 6 ? 0 : 1];
    if (cont !== null && cont !== undefined) {
      stringNote(ctx, reverbBus, midi(cont), t, STEP * 3.2, 0.055, 1300);
    }
  }
  // 竖琴点缀（小节末，分解和弦上行）
  if (stepInBar === 12 || stepInBar === 14) {
    ch.intervals.slice(1, 4).forEach((iv, i) => {
      harpNote(ctx, reverbBus, midi(ch.root + iv + 12), t + i * 0.08, 0.05);
    });
  }
}

export interface BgmState {
  step: number;
  nextNoteTime: number;
  timer: ReturnType<typeof setInterval> | null;
  playing: boolean;
}

export function createBgmState(): BgmState {
  return { step: 0, nextNoteTime: 0, timer: null, playing: false };
}

export function bgmScheduler(ctx: AudioCtx, reverbBus: GainNode, state: BgmState): void {
  while (state.nextNoteTime < ctx.currentTime + 0.5) {
    playStep(ctx, reverbBus, state.step, state.nextNoteTime);
    state.nextNoteTime += STEP;
    state.step++;
  }
}

export function setupReverb(ctx: AudioCtx, master: GainNode): GainNode {
  const conv = ctx.createConvolver();
  conv.buffer = makeImpulse(ctx, 4.2, 2.8);
  const wet = ctx.createGain(); wet.gain.value = 0.42;
  const reverbBus = ctx.createGain(); reverbBus.gain.value = 0.6;
  reverbBus.connect(conv); conv.connect(wet); wet.connect(master);
  return reverbBus;
}