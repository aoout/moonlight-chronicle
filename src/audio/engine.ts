/* =========================================================
   蚀月远征 · 音频引擎编排层
   整合 BGM 弦乐合成与音效合成器，提供统一对外接口
   ========================================================= */
import { createBgmState, bgmScheduler, setupReverb } from './bgm.js';
import { createSfxTable, type SfxContext } from './sfx.js';

type AudioCtx = AudioContext;

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

    // 音效总线
    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.5;
    sfxBus.connect(ctx.destination);
    sfxTable = createSfxTable(ctx, sfxBus);

    // 混响（BGM 空间效果）
    reverbBus = setupReverb(ctx, master);
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
  }

  function playSfx(name: string): void {
    if (!ctx || ctx.state !== 'running' || !sfxTable) return;
    const fn = sfxTable[name];
    if (fn) fn();
  }

  return {
    start, stop, playSfx, toggleMode, getModeLabel,
    get mode() { return mode; },
    get playing() { return playing; },
  };
})();