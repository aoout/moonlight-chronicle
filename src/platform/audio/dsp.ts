/* =========================================================
   蚀月远征 · 音频 DSP 工具（无状态叶子模块）
   被 engine.ts 与 bgm.ts 共用；独立成模块以消除两者的循环引用。
   ========================================================= */

/** 生成混响用脉冲响应：指数衰减白噪声 */
export function makeImpulse(ctx: AudioContext, sec: number, decay: number): AudioBuffer {
  const buf = ctx.createBuffer(2, ctx.sampleRate * sec, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, decay);
  }
  return buf;
}
