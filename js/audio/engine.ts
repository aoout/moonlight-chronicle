/* =========================================================
   蚀月远征 · 配乐引擎（Web Audio 实时合成）
   曲目《月表礼赞》—— 纯弦乐古典，月表风格：宁静、空旷、回响
   调性 A 小调 · BPM 58 · 4 小节梦幻和声循环
   和弦：Am9 → Fmaj7 → Cmaj9/E → Gsus4（低音下行，月光下的月表）
   声部：弦乐群和声 + 弦乐低音 + 独奏旋律 + 对位副旋律 + 竖琴点缀
   ========================================================= */

type AudioCtx = AudioContext;
type AnyNode = AudioNode;

export const AudioEngine = (() => {
  let ctx: AudioCtx | null = null;
  let master: GainNode | null = null, reverbBus: GainNode | null = null;
  let playing = false, timer: any = null;
  let nextNoteTime = 0, step = 0;

  /* 音频模式：'full'（音效+BGM）| 'sfx'（仅音效）| 'mute'（静音） */
  const MODES = ['full', 'sfx', 'mute'] as const;
  let mode: typeof MODES[number] = 'full';

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
  function now(): number { return (ctx as AudioCtx).currentTime; }
  function midi(m: number): number { return 440 * Math.pow(2, (m - 69) / 12); }
  function makeImpulse(sec: number, decay: number): AudioBuffer {
    const c = ctx as AudioCtx;
    const buf = c.createBuffer(2, c.sampleRate * sec, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < d.length; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, decay);
      }
    }
    return buf;
  }
  function makeNoiseBuffer(sec: number): AudioBuffer {
    const c = ctx as AudioCtx;
    const buf = c.createBuffer(1, c.sampleRate * sec, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  /* ---------- 弦乐群：多失谐锯齿 + 低通 + 缓慢起音 ---------- */
  function stringNote(freq: number, t: number, dur: number, vel: number, filt?: number): void {
    const c = ctx as AudioCtx;
    const rb = reverbBus as GainNode;
    const oscs: OscillatorNode[] = [];
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.5);
    g.gain.setValueAtTime(vel, t + Math.max(0.3, dur - 0.6));
    g.gain.linearRampToValueAtTime(0, t + dur);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(filt || 900, t);
    lp.frequency.linearRampToValueAtTime((filt || 900) * 0.7, t + dur);
    lp.Q.value = 0.7;
    [-8, 0, 8].forEach(d => {
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = freq;
      o.detune.value = d;
      o.connect(lp);
      o.start(t);
      o.stop(t + dur + 0.15);
      oscs.push(o);
    });
    lp.connect(g);
    g.connect(rb);
    // 节点释放：全部振荡器停止（真实音频时间）后断开滤镜/增益，防止音频图累积
    oscs[oscs.length - 1].onended = () => { try { lp.disconnect(); g.disconnect(); } catch (e) {} };
  }

  /* ---------- 竖琴拨弦：正弦快速衰减 + 混响 ---------- */
  function harpNote(freq: number, t: number, vel: number): void {
    const c = ctx as AudioCtx;
    const rb = reverbBus as GainNode;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq;
    o.connect(g);
    g.connect(rb);
    o.start(t);
    o.stop(t + 1.5);
    // 节点释放
    o.onended = () => { try { o.disconnect(); g.disconnect(); } catch (e) {} };
  }

  /* ---------- 编排：纯弦乐，四声部 ---------- */
  function playStep(stepIndex: number, t: number): void {
    const barIndex = Math.floor(stepIndex / 16) % 4;
    const stepInBar = stepIndex % 16;
    const ch = CHORDS[barIndex];
    const rootF = midi(ch.root);

    // 弦乐和声全奏（每小节起音，长音）
    if (stepInBar === 0) {
      ch.intervals.forEach(iv => stringNote(midi(ch.root + iv), t, BAR * 0.98, 0.085, 800));
      // 弦乐低音（大提琴声部，根音下行）
      stringNote(rootF / 2, t, BAR * 0.98, 0.075, 420);
    }
    // 主旋律（弦乐独奏，每 2 步一音）
    if (stepInBar % 2 === 0) {
      const mel = MELODY[barIndex * 8 + stepInBar / 2];
      if (mel !== null && mel !== undefined) {
        stringNote(midi(mel), t, STEP * 2.6, 0.12, 2000);
      }
    }
    // 对位副旋律（中提琴声部，小节中部与结尾）
    if (stepInBar === 6 || stepInBar === 14) {
      const cont = COUNTER[barIndex][stepInBar === 6 ? 0 : 1];
      if (cont !== null && cont !== undefined) {
        stringNote(midi(cont), t, STEP * 3.2, 0.055, 1300);
      }
    }
    // 竖琴点缀（小节末，分解和弦上行）
    if (stepInBar === 12 || stepInBar === 14) {
      ch.intervals.slice(1, 4).forEach((iv, i) => {
        harpNote(midi(ch.root + iv + 12), t + i * 0.08, 0.05);
      });
    }
  }

  function scheduler(): void {
    const c = ctx as AudioCtx;
    while (nextNoteTime < c.currentTime + 0.5) {
      playStep(step, nextNoteTime);
      nextNoteTime += STEP;
      step++;
    }
  }

  /* ================= 音效合成器 ================= */
  let sfxBus: GainNode | null = null, lastHitAt = 0;

  function tone(freq: number, dur: number, type?: OscillatorType, vol?: number, glide?: number, delay?: number): void {
    if (!sfxBus) return;
    const c = ctx as AudioCtx;
    const t = c.currentTime + (delay || 0);
    const o = c.createOscillator();
    o.type = type || 'triangle';
    o.frequency.setValueAtTime(freq, t);
    if (glide) o.frequency.exponentialRampToValueAtTime(Math.max(30, glide), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.1, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(sfxBus);
    o.start(t); o.stop(t + dur + 0.05);
    // 节点释放：短音效结束后断开（onended 按真实音频时间触发）
    o.onended = () => { try { o.disconnect(); g.disconnect(); } catch (e) {} };
  }

  let sfxNoiseBuf: AudioBuffer | null = null;
  function noiseHit(dur: number, vol: number, hp?: number, lp?: number, delay?: number): void {
    if (!sfxBus) return;
    const c = ctx as AudioCtx;
    const t = c.currentTime + (delay || 0);
    if (!sfxNoiseBuf) sfxNoiseBuf = makeNoiseBuffer(0.4);
    const src = c.createBufferSource(); src.buffer = sfxNoiseBuf;
    const f = c.createBiquadFilter();
    if (lp) { f.type = 'lowpass'; f.frequency.value = lp; }
    else { f.type = 'highpass'; f.frequency.value = hp || 4000; }
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(sfxBus);
    src.start(t); src.stop(t + dur + 0.05);
    // 节点释放
    src.onended = () => { try { src.disconnect(); f.disconnect(); g.disconnect(); } catch (e) {} };
  }

  /* 音效表：名称 → 合成（短音效） */
  const SFX: Record<string, () => void> = {
    click:   () => tone(720, 0.06, 'triangle', 0.16, 540),
    open:    () => { tone(400, 0.13, 'sine', 0.14, 820); tone(600, 0.13, 'sine', 0.08, 900, 0.04); },
    close:   () => tone(640, 0.11, 'sine', 0.12, 320),
    buy:     () => { tone(980, 0.08, 'square', 0.09); tone(1310, 0.09, 'square', 0.07, 0, 0.05); },
    sell:    () => { tone(420, 0.1, 'square', 0.1, 240); tone(300, 0.14, 'square', 0.08, 190, 0.06); },
    upgrade: () => { tone(520, 0.09, 'triangle', 0.13, 780); tone(780, 0.09, 'triangle', 0.11, 1170, 0.07); tone(1170, 0.13, 'triangle', 0.1, 1560, 0.14); },
    levelup: () => { [660, 880, 1100, 1320].forEach((f, i) => tone(f, 0.14, 'triangle', 0.11, 0, i * 0.06)); },
    unlock:  () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'sine', 0.13, 0, i * 0.09)); noiseHit(0.5, 0.08, undefined, 2600, 0.3); },
    curse:   () => { tone(220, 0.5, 'sawtooth', 0.1, 140); tone(110, 0.6, 'sine', 0.12, 70, 0.05); },
    pickup:  () => tone(1180, 0.07, 'triangle', 0.09, 1520),
    hurt:    () => { tone(180, 0.22, 'sawtooth', 0.16, 90); noiseHit(0.16, 0.1, 2400); },
    kill:    () => { noiseHit(0.18, 0.12, 3000); tone(260, 0.16, 'sawtooth', 0.08, 90); },
    hit:     () => { const t = ctx ? ctx.currentTime : 0; if (t - lastHitAt < 0.06) return; lastHitAt = t; noiseHit(0.06, 0.07, 3600); },
    w_moon:     () => noiseHit(0.3, 0.1, undefined, 1400),
    w_crossbow: () => { noiseHit(0.08, 0.12, 5000); tone(1500, 0.07, 'triangle', 0.07, 1100); },
    w_arc:      () => { noiseHit(0.18, 0.14, undefined, 2000); tone(880, 0.2, 'sawtooth', 0.08, 220); },
    w_meteor:   () => { tone(160, 0.55, 'sawtooth', 0.12, 60); noiseHit(0.5, 0.1, undefined, 700, 0.1); },
    w_frost:    () => { tone(1250, 0.24, 'sine', 0.1, 880); tone(1660, 0.2, 'sine', 0.07, 1240, 0.05); },
    w_beam:     () => { tone(1400, 0.22, 'square', 0.07, 900); tone(700, 0.22, 'square', 0.06, 500, 0.02); },
    w_orbit:    () => tone(330, 0.12, 'sine', 0.06, 300),
    w_lance:    () => { tone(520, 0.16, 'triangle', 0.11, 260); noiseHit(0.12, 0.09, 3200, undefined, 0.04); },
    w_shadow:   () => { tone(300, 0.24, 'sawtooth', 0.09, 120); tone(150, 0.3, 'sine', 0.08, 80, 0.06); },
    w_storm:    () => noiseHit(0.2, 0.08, undefined, 1800),
    w_nova:     () => { tone(440, 0.3, 'sawtooth', 0.12, 220); noiseHit(0.28, 0.12, undefined, 1500, 0.02); [660, 880, 1320].forEach((f, i) => tone(f, 0.2, 'triangle', 0.08, 0, 0.05 + i * 0.05)); },
    w_phantom:  () => { [880, 660, 440].forEach((f, i) => tone(f, 0.3, 'sine', 0.08, f * 0.5, i * 0.12)); },
    boss_wave:  () => { tone(300, 0.3, 'sawtooth', 0.12, 700); noiseHit(0.22, 0.1, undefined, 1800); },
    boss_dash:  () => tone(200, 0.35, 'sawtooth', 0.14, 880),
    boss_summon:() => { tone(140, 0.4, 'sine', 0.12, 70); tone(210, 0.4, 'sine', 0.08, 100, 0.1); },
  };

  function playSfx(name: string): void {
    if (!ctx || ctx.state !== 'running') return;
    const fn = SFX[name];
    if (fn) fn();
  }

  /* ---------- 对外接口 ---------- */
  function applyMode(): void {
    if (!ctx || !master || !sfxBus) return;
    master.gain.value = mode === 'full' ? 0.9 : 0;
    sfxBus.gain.value = mode === 'mute' ? 0 : 0.5;
  }
  function toggleMode(): string {
    mode = MODES[(MODES.indexOf(mode) + 1) % 3];
    if (!ctx) return mode;
    applyMode();
    if (mode === 'full' && !playing) {
      playing = true;
      nextNoteTime = ctx.currentTime + 0.1;
      step = 0;
      timer = setInterval(scheduler, 90);
    }
    if (mode !== 'full' && playing) stop();
    return mode;
  }
  function getModeLabel(): string {
    return mode === 'mute' ? '静音' : mode === 'sfx' ? '仅音效' : '音效 + BGM';
  }

  function start(): void {
    if (playing) return;
    if (!ctx) {
      const Ctor: typeof AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);
      // 音效总线（独立音量）
      sfxBus = ctx.createGain();
      sfxBus.gain.value = 0.5;
      sfxBus.connect(ctx.destination);
      // 混响（弦乐空间：大而空旷的月表回响）
      const conv = ctx.createConvolver();
      conv.buffer = makeImpulse(4.2, 2.8);
      const wet = ctx.createGain(); wet.gain.value = 0.42;
      reverbBus = ctx.createGain(); reverbBus.gain.value = 0.6;
      reverbBus.connect(conv); conv.connect(wet); wet.connect(master);
    }
    if (ctx.state === 'suspended') ctx.resume();
    applyMode();
    // 仅当模式为 full 时启动 BGM 调度
    if (mode === 'full') {
      playing = true;
      nextNoteTime = ctx.currentTime + 0.1;
      step = 0;
      timer = setInterval(scheduler, 90);
    }
  }

  function stop(): void {
    playing = false;
    if (timer) { clearInterval(timer); timer = null; }
  }

  return { start, stop, playSfx, toggleMode, getModeLabel, get mode() { return mode; }, get playing() { return playing; } };
})();
