/* =========================================================
   蚀月远征 · 音频引擎编排层
   整合 BGM 弦乐合成与音效合成器，提供统一对外接口
   ========================================================= */
import { createBgmState, bgmScheduler, setupReverb } from './bgm.js';
import { createSfxTable, type SfxContext } from './sfx.js';

type AudioCtx = AudioContext;

/* ---------- 共享工具：生成混响脉冲响应 ---------- */
export function makeImpulse(ctx: AudioContext, sec: number, decay: number): AudioBuffer {
  const buf = ctx.createBuffer(2, ctx.sampleRate * sec, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, decay);
  }
  return buf;
}

export const AudioEngine = (() => {
  let ctx: AudioCtx | null = null;
  let master: GainNode | null = null, reverbBus: GainNode | null = null;
  let sfxBus: GainNode | null = null;
  let playing = false, bgmTimer: ReturnType<typeof setInterval> | null = null;

  const bgmState = createBgmState();

  /* 音频模式：'full'（音效+BGM）| 'sfx'（仅音效）| 'mute'（静音） */
  const MODES = ['full', 'sfx', 'mute'] as const;
  let mode: typeof MODES[number] = 'full';

  /* 音效表（延迟初始化） */
  let sfxTable: Record<string, () => void> | null = null;

  /* SFX 并发限流：每秒最多 30 次调用 */
  let _sfxCount = 0;
  let _sfxResetTime = 0;
  const MAX_SFX_PER_SEC = 30;

  function applyMode(): void {
    if (!ctx || !master || !sfxBus) return;
    master.gain.value = mode === 'full' ? 0.9 : 0;
    sfxBus.gain.value = mode === 'mute' ? 0 : 0.5;
  }

  function toggleMode(): string {
    mode = MODES[(MODES.indexOf(mode) + 1) % 3];
    if (!ctx) return mode;
    applyMode();
    if (mode === 'full' && !playing) startBgm();
    if (mode !== 'full' && playing) stopBgm();
    return mode;
  }

  function getModeLabel(): string {
    return mode === 'mute' ? '静音' : mode === 'sfx' ? '仅音效' : '音效 + BGM';
  }

  function startBgm(): void {
    if (playing || !ctx) return;
    playing = true;
    bgmState.nextNoteTime = ctx.currentTime + 0.1;
    bgmState.step = 0;
    bgmTimer = setInterval(() => {
      if (ctx && reverbBus) bgmScheduler(ctx, reverbBus, bgmState);
    }, 90);
  }

  function stopBgm(): void {
    playing = false;
    if (bgmTimer) { clearInterval(bgmTimer); bgmTimer = null; }
  }

  function initAudio(): void {
    const Ctor: typeof AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);

    // 音效总线：干声直连 + 短混响（月表空寂的回响，不再是干声合成器）
    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.5;
    const sfxDry = ctx.createGain(); sfxDry.gain.value = 0.8; sfxDry.connect(ctx.destination);
    const sfxConv = ctx.createConvolver();
    sfxConv.buffer = makeImpulse(ctx, 1.1, 2.0);
    const sfxWet = ctx.createGain(); sfxWet.gain.value = 0.3;
    sfxConv.connect(sfxWet); sfxWet.connect(ctx.destination);
    sfxBus.connect(sfxDry); sfxBus.connect(sfxConv);
    sfxTable = createSfxTable(ctx, sfxBus);

    // 混响（BGM 空间效果）
    reverbBus = setupReverb(ctx, master);

    // 自动恢复：切回页面时 AudioContext 被 suspend 则自动 resume
    ctx.onstatechange = () => {
      if (ctx?.state === 'suspended') ctx.resume();
    };
  }

  function start(): void {
    if (playing) return;
    if (!ctx) initAudio();
    if (ctx && ctx.state === 'suspended') ctx.resume();
    applyMode();
    if (mode === 'full') startBgm();
  }

  function stop(): void {
    stopBgm();
    if (ctx) {
      ctx.close();
      ctx = null;
      master = null;
      reverbBus = null;
      sfxBus = null;
      sfxTable = null;
    }
  }

  function playSfx(name: string): void {
    if (!ctx || ctx.state !== 'running' || !sfxTable) return;
    // 每秒限流，防止弹幕密集时 AudioNode 超限
    const now = performance.now();
    if (now - _sfxResetTime > 1000) {
      _sfxCount = 0;
      _sfxResetTime = now;
    }
    _sfxCount++;
    if (_sfxCount > MAX_SFX_PER_SEC) return;
    const fn = sfxTable[name];
    if (fn) fn();
  }

  return {
    start, stop, playSfx, toggleMode, getModeLabel,
    get mode() { return mode; },
    get playing() { return playing; },
  };
})();