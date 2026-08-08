/* =========================================================
   蚀月远征 · 渲染层：Boss 造型注册表（v0.8 立像实装 + 精细度加强）
   每位领主的立像按 v0.8 设定重绘：
   体积渐变（4+ stop）/ 高光暗部 / 纹样系统 / 环境粒子 / 蓄力姿态联动
   通用动效：呼吸 / 旋转 / 脉动 / 流动 / 随机放电 / 受击闪白
   ========================================================= */
import { PALETTE } from '../../../assets/palette.js';

const TAU = Math.PI * 2;

/* 技能蓄力进度 0→1（attT 越接近 0 越接近释放） */
function chargeOf(e: any): number {
  if (e.attT === undefined || !e.attCd) return 0;
  return Math.max(0, Math.min(1, 1 - e.attT / e.attCd));
}
function clamp(v: number, a: number, b: number): number { return v < a ? a : v > b ? b : v; }
function shade(hex: string, amt: number): string {
  const c = String(hex || PALETTE.gray).replace('#', '');
  if (c.length < 6) return hex;
  return 'rgb(' +
    clamp(parseInt(c.substr(0, 2), 16) + amt, 0, 255) + ',' +
    clamp(parseInt(c.substr(2, 2), 16) + amt, 0, 255) + ',' +
    clamp(parseInt(c.substr(4, 2), 16) + amt, 0, 255) + ')';
}
function eye(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color?: string): void {
  ctx.fillStyle = color || 'rgba(0,0,0,.7)';
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  ctx.beginPath(); ctx.arc(x + r * 0.3, y - r * 0.3, r * 0.42, 0, TAU); ctx.fill();
}

/* 体积光晕：径向渐变圆（模拟辉光，替代 shadowBlur 高频开销） */
function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, a: number): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color); g.addColorStop(1, 'transparent');
  ctx.globalAlpha = a;
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.globalAlpha = 1;
}

/* 受击闪白：fa > 0 时整体白闪（alpha = fa × 5） */
function hitFlash(ctx: CanvasRenderingContext2D, fa: number, s: number, wob: number): void {
  if (fa <= 0) return;
  ctx.globalAlpha = Math.min(1, fa * 5);
  ctx.fillStyle = PALETTE.white;
  ctx.beginPath(); ctx.arc(0, wob, s * 1.6, 0, TAU); ctx.fill();
  ctx.globalAlpha = 1;
}

export const BOSS_SHAPES: Record<string, (ctx: CanvasRenderingContext2D, e: any, s: number, wob: number, fa: number, t: number, time: number) => void> = {

  /* ============ 蚀潮巨兽 · 潮汐之魂 ============ */
  behemoth(ctx, e, s, wob, fa, t, time) {
    const c = e.color;
    const ch = chargeOf(e);
    const breathe = 1 + Math.sin(time * 2.4) * 0.035;
    // 环境：潮光 + 上浮水泡
    glow(ctx, 0, wob, s * 2.4, c, 0.12 + ch * 0.08);
    for (let i = 0; i < 3; i++) {
      const a = Math.sin(time * 1.3 + i * 2.1) * 0.4;
      glow(ctx, Math.cos(time * 0.7 + i * 2.4) * s * 2.0, wob - s * 1.4 + a * s * 0.3, s * 0.07, '#bfe8f2', 0.5);
    }
    // 鳍鬃（两侧水浪，摆动）
    ctx.fillStyle = 'rgba(191,232,242,.8)';
    for (const side of [-1, 1]) {
      const sw = Math.sin(time * 2.8 + side) * s * 0.06;
      ctx.beginPath();
      ctx.moveTo(side * s * 0.55, wob - s * 0.5);
      ctx.quadraticCurveTo(side * (s * 0.9 + sw), wob - s * 0.15, side * (s * 0.75 + sw), wob + s * 0.25);
      ctx.quadraticCurveTo(side * s * 0.6, wob + s * 0.05, side * s * 0.45, wob - s * 0.25);
      ctx.closePath(); ctx.fill();
    }
    // 尾迹潮波（流动）
    ctx.strokeStyle = 'rgba(127,196,216,.35)'; ctx.lineWidth = s * 0.06; ctx.lineCap = 'round';
    for (let i = 0; i < 2; i++) {
      const ph = time * 1.6 + i * 2.2;
      ctx.globalAlpha = 0.4 - i * 0.1;
      ctx.beginPath();
      ctx.moveTo(-s * 0.8, wob + s * 0.55);
      ctx.quadraticCurveTo(-s * 1.3, wob + s * 0.5 + Math.sin(ph) * s * 0.08, -s * 1.7, wob + s * 0.6);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // 主体（水滴形，体积渐变）
    const g = ctx.createRadialGradient(-s * 0.3, wob - s * 0.35, s * 0.15, 0, wob, s * 1.25);
    g.addColorStop(0, '#c8eef5');
    g.addColorStop(0.3, '#8fd0e0');
    g.addColorStop(0.65, c);
    g.addColorStop(1, '#17303e');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, wob - s * 1.05 * breathe);
    ctx.bezierCurveTo(s * 0.85 * breathe, wob - s * 0.5, s * 0.9, wob + s * 0.45, 0, wob + s * 0.85 * breathe);
    ctx.bezierCurveTo(-s * 0.9, wob + s * 0.45, -s * 0.85 * breathe, wob - s * 0.5, 0, wob - s * 1.05 * breathe);
    ctx.closePath(); ctx.fill();
    // 下缘暗部
    ctx.fillStyle = 'rgba(10,30,40,.5)';
    ctx.beginPath(); ctx.ellipse(0, wob + s * 0.5, s * 0.62, s * 0.3, 0, 0, TAU); ctx.fill();
    // 受光高光
    ctx.fillStyle = 'rgba(232,248,251,.45)';
    ctx.beginPath(); ctx.ellipse(-s * 0.3, wob - s * 0.42, s * 0.34, s * 0.2, -0.4, 0, TAU); ctx.fill();
    // 浪脊纹（三道波峰 + 白沫高光）
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const yy = wob - s * 0.62 + i * s * 0.24;
      const wdt = s * (0.55 - i * 0.08);
      ctx.strokeStyle = i === 0 ? 'rgba(232,248,251,.85)' : 'rgba(143,208,224,.6)';
      ctx.lineWidth = s * (0.1 - i * 0.02);
      ctx.beginPath(); ctx.moveTo(-wdt, yy); ctx.quadraticCurveTo(0, yy - s * 0.16, wdt, yy); ctx.stroke();
    }
    // 身侧鳞纹
    ctx.strokeStyle = 'rgba(60,110,130,.5)'; ctx.lineWidth = s * 0.03;
    for (let i = 0; i < 3; i++) {
      const yy = wob + s * 0.2 + i * s * 0.2;
      ctx.beginPath(); ctx.arc(s * 0.35, yy, s * 0.2, -1.2, 1.2); ctx.stroke();
      ctx.beginPath(); ctx.arc(-s * 0.35, yy, s * 0.2, Math.PI - 1.2, Math.PI + 1.2); ctx.stroke();
    }
    // 漩涡眼（双圈 + 旋转弧 + 蓄力亮）
    const er = s * 0.17 + ch * s * 0.04;
    const eg = ctx.createRadialGradient(-er * 0.3, wob - s * 0.32 - er * 0.3, er * 0.2, 0, wob - s * 0.32, er);
    eg.addColorStop(0, '#ffffff'); eg.addColorStop(0.5, '#bfe8f2'); eg.addColorStop(1, '#17303e');
    ctx.fillStyle = eg;
    ctx.beginPath(); ctx.arc(0, wob - s * 0.32, er, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(20,50,60,.8)'; ctx.lineWidth = s * 0.03;
    ctx.beginPath(); ctx.arc(0, wob - s * 0.32, er * 0.66, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, wob - s * 0.32, er * 0.4, time * 2, time * 2 + 3.6); ctx.stroke();
    // 浪花白沫（底部）
    ctx.strokeStyle = 'rgba(232,248,251,.7)'; ctx.lineWidth = s * 0.035;
    ctx.beginPath(); ctx.moveTo(-s * 0.4, wob + s * 0.72); ctx.quadraticCurveTo(-s * 0.25, wob + s * 0.66, -s * 0.1, wob + s * 0.72); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * 0.1, wob + s * 0.74); ctx.quadraticCurveTo(s * 0.28, wob + s * 0.67, s * 0.42, wob + s * 0.74); ctx.stroke();
    // 蓄力潮涌（身体外圈亮起）
    if (ch > 0) glow(ctx, 0, wob, s * (1.4 + ch * 0.5), PALETTE.coralBright, ch * 0.22);
    hitFlash(ctx, fa, s, wob);
  },

  /* ============ 潮噬之母 · 孕育之躯 ============ */
  tideMother(ctx, e, s, wob, fa, t, time) {
    const c = e.color;
    const ch = chargeOf(e);
    // 环境：孕育光 + 漂浮孢子
    glow(ctx, 0, wob, s * 2.3, c, 0.12 + ch * 0.08);
    for (let i = 0; i < 3; i++) {
      const px = Math.cos(time * 0.6 + i * 2.2) * s * 1.9;
      const py = wob - s * 1.1 + Math.sin(time * 1.1 + i) * s * 0.3;
      glow(ctx, px, py, s * 0.06, '#c8f0e4', 0.6);
    }
    // 产卵触手（带吸盘，蓄力高举）
    ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * TAU + 0.4;
      const lift = ch * s * 0.4;
      const tg = ctx.createLinearGradient(Math.cos(a) * s * 0.7, wob + Math.sin(a) * s * 0.7, Math.cos(a) * s * 2.0, wob + Math.sin(a) * s * 2.0);
      tg.addColorStop(0, c); tg.addColorStop(1, '#2e5a50');
      ctx.strokeStyle = tg; ctx.lineWidth = s * 0.12;
      ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * s * 0.75, wob + Math.sin(a) * s * 0.75);
      ctx.quadraticCurveTo(Math.cos(a + 0.3) * s * 1.6, wob + Math.sin(a + 0.3) * s * 1.6 - lift, Math.cos(a) * s * 2.05 + Math.sin(time * 2.4 + i) * 5, wob + Math.sin(a) * s * 2.05 - lift); ctx.stroke();
      // 吸盘
      ctx.fillStyle = 'rgba(20,60,50,.7)';
      ctx.beginPath(); ctx.arc(Math.cos(a) * s * 1.75, wob + Math.sin(a) * s * 1.75 - lift, s * 0.04, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
    // 背甲（壳纹网格）
    const bg = ctx.createLinearGradient(0, wob - s * 1.0, 0, wob + s * 0.4);
    bg.addColorStop(0, '#8ec0b4'); bg.addColorStop(0.55, c); bg.addColorStop(1, '#1f3e38');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(0, wob, s * 0.95, 0, TAU); ctx.fill();
    // 背甲纹
    ctx.strokeStyle = 'rgba(168,220,200,.5)'; ctx.lineWidth = s * 0.03;
    ctx.beginPath(); ctx.arc(0, wob, s * 0.72, 0.5, 2.6); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, wob, s * 0.5, 0.9, 2.2); ctx.stroke();
    // 卵腹（透明，四层光影 + 腹中卵搏动）
    const bellyG = ctx.createRadialGradient(0, wob + s * 0.35, s * 0.1, 0, wob + s * 0.42, s * 0.5);
    bellyG.addColorStop(0, 'rgba(200,240,228,.95)');
    bellyG.addColorStop(0.5, 'rgba(126,196,180,.85)');
    bellyG.addColorStop(1, 'rgba(28,58,52,.6)');
    ctx.fillStyle = bellyG;
    const sac = 1 + 0.1 * Math.sin(time * 3) + ch * 0.12;
    ctx.beginPath(); ctx.ellipse(0, wob + s * 0.42, s * 0.45 * sac, s * 0.4 * sac, 0, 0, TAU); ctx.fill();
    // 腹中卵（搏动，蓄力越多越亮）
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * TAU + 0.8;
      const pr = s * (0.1 + 0.03 * Math.sin(time * 4 + i * 1.6) + ch * 0.03);
      const ox = Math.cos(a) * s * 0.2, oy = wob + s * 0.42 + Math.sin(a) * s * 0.16;
      ctx.globalAlpha = 0.85;
      ctx.beginPath(); ctx.ellipse(ox, oy, pr, pr * 1.25, 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.ellipse(ox - pr * 0.3, oy - pr * 0.3, pr * 0.5, pr * 0.6, 0, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // 腹膜线
    ctx.strokeStyle = 'rgba(200,240,228,.4)'; ctx.lineWidth = s * 0.02;
    ctx.beginPath(); ctx.arc(0, wob + s * 0.42, s * 0.35 * sac, 0.4, 2.7); ctx.stroke();
    // 卵腹高光
    ctx.fillStyle = 'rgba(232,248,240,.5)';
    ctx.beginPath(); ctx.ellipse(-s * 0.16, wob + s * 0.28, s * 0.12, s * 0.07, -0.5, 0, TAU); ctx.fill();
    // 头（低伏）+ 眼
    ctx.fillStyle = '#4a7d70';
    ctx.beginPath(); ctx.ellipse(0, wob - s * 0.55, s * 0.34, s * 0.22, 0, 0, TAU); ctx.fill();
    eye(ctx, -s * 0.16, wob - s * 0.55, s * 0.05, '#e8f8f0');
    eye(ctx, s * 0.16, wob - s * 0.55, s * 0.05, '#e8f8f0');
    // 蓄力：腹部剧亮
    if (ch > 0) glow(ctx, 0, wob + s * 0.42, s * (0.5 + ch * 0.4), '#e0f5ec', ch * 0.35);
    hitFlash(ctx, fa, s, wob);
  },

  /* ============ 蚀壳战车 · 碾压之械 ============ */
  erodeChariot(ctx, e, s, wob, fa, t, time) {
    const c = e.color;
    const ch = chargeOf(e);
    const roll = time * 5;
    // 环境：钢尘 + 火屑
    glow(ctx, 0, wob, s * 2.2, c, 0.12);
    for (let i = 0; i < 3; i++) {
      const a = time * 2 + i * 2.1;
      glow(ctx, Math.cos(a) * s * 1.9, wob - s * 0.8 + Math.sin(a * 1.3) * s * 0.3, s * 0.05, i % 2 ? '#e8a060' : '#c8ced8', 0.45);
    }
    // 蚀轮（6 辐条 + 轮毂 + 蚀纹，反向滚动）
    for (const [side, dir] of [[-1, 1], [1, -1]] as Array<[number, number]>) {
      const wx = side * s * 1.05, wy = wob + s * 0.55;
      const wg = ctx.createRadialGradient(wx - s * 0.1, wy - s * 0.1, s * 0.05, wx, wy, s * 0.44);
      wg.addColorStop(0, '#d8dee8'); wg.addColorStop(0.55, '#6a7a94'); wg.addColorStop(1, '#1e2434');
      ctx.fillStyle = wg;
      ctx.beginPath(); ctx.arc(wx, wy, s * 0.42, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(30,36,52,.8)'; ctx.lineWidth = s * 0.05;
      ctx.beginPath(); ctx.arc(wx, wy, s * 0.35, 0, TAU); ctx.stroke();
      // 辐条
      ctx.strokeStyle = 'rgba(138,154,180,.8)'; ctx.lineWidth = s * 0.035;
      for (let i = 0; i < 6; i++) {
        const a = roll * dir + i / 6 * TAU;
        ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + Math.cos(a) * s * 0.34, wy + Math.sin(a) * s * 0.34); ctx.stroke();
      }
      ctx.fillStyle = '#1e2434';
      ctx.beginPath(); ctx.arc(wx, wy, s * 0.11, 0, TAU); ctx.fill();
      ctx.fillStyle = '#d8dee8';
      ctx.beginPath(); ctx.arc(wx, wy, s * 0.045, 0, TAU); ctx.fill();
    }
    // 车身（层叠蚀甲 + 体积渐变）
    const bg = ctx.createLinearGradient(0, wob - s * 1.0, 0, wob + s * 0.6);
    bg.addColorStop(0, '#a8b8cc'); bg.addColorStop(0.35, c); bg.addColorStop(0.8, '#45516a'); bg.addColorStop(1, '#1e2434');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(-s * 1.12, wob + s * 0.5); ctx.lineTo(-s * 0.82, wob - s * 0.78);
    ctx.quadraticCurveTo(0, wob - s * 1.0, s * 0.82, wob - s * 0.78); ctx.lineTo(s * 1.12, wob + s * 0.5);
    ctx.closePath(); ctx.fill();
    // 甲片缝线（层叠）
    ctx.strokeStyle = 'rgba(168,184,204,.6)'; ctx.lineWidth = s * 0.035;
    ctx.beginPath(); ctx.moveTo(-s * 0.95, wob + s * 0.25); ctx.quadraticCurveTo(0, wob - s * 0.1, s * 0.95, wob + s * 0.25); ctx.stroke();
    ctx.strokeStyle = 'rgba(30,36,52,.6)'; ctx.lineWidth = s * 0.025;
    ctx.beginPath(); ctx.moveTo(-s * 0.6, wob - s * 0.62); ctx.lineTo(-s * 0.72, wob + s * 0.38); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * 0.6, wob - s * 0.62); ctx.lineTo(s * 0.72, wob + s * 0.38); ctx.stroke();
    // 甲片高光
    ctx.fillStyle = 'rgba(216,222,232,.35)';
    ctx.beginPath(); ctx.ellipse(-s * 0.2, wob - s * 0.68, s * 0.5, s * 0.08, -0.08, 0, TAU); ctx.fill();
    // 铆钉
    ctx.fillStyle = 'rgba(200,206,216,.9)';
    for (const [rx, ry] of [[-0.62, 0.3], [0.62, 0.3], [-0.78, -0.05], [0.78, -0.05]] as Array<[number, number]>) {
      ctx.beginPath(); ctx.arc(rx * s, wob + ry * s, s * 0.03, 0, TAU); ctx.fill();
    }
    // 蚀纹（锈蚀分支裂纹，蓄力发热光）
    ctx.strokeStyle = '#e8a060'; ctx.lineWidth = s * 0.03; ctx.lineCap = 'round';
    ctx.globalAlpha = 0.85 + ch * 0.15;
    ctx.beginPath(); ctx.moveTo(-s * 0.25, wob - s * 0.6); ctx.quadraticCurveTo(-s * 0.18, wob - s * 0.3, -s * 0.3, wob - s * 0.05); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-s * 0.18, wob - s * 0.3); ctx.lineTo(-s * 0.02, wob - s * 0.38); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * 0.3, wob - s * 0.55); ctx.quadraticCurveTo(s * 0.25, wob - s * 0.2, s * 0.35, wob + s * 0.05); ctx.stroke();
    ctx.globalAlpha = 1;
    // 双撞角（高光）
    const hg = ctx.createLinearGradient(-s * 0.4, 0, s * 0.4, 0);
    hg.addColorStop(0, '#e8a060'); hg.addColorStop(1, '#5a3018');
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.moveTo(-s * 0.3, wob - s * 0.78); ctx.lineTo(-s * 0.55, wob - s * 1.5); ctx.lineTo(-s * 0.08, wob - s * 0.86); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(s * 0.3, wob - s * 0.78); ctx.lineTo(s * 0.55, wob - s * 1.5); ctx.lineTo(s * 0.08, wob - s * 0.86); ctx.closePath(); ctx.fill();
    // 车头警示灯（蓄力闪烁）
    const warn = 0.4 + ch * 0.6 + Math.sin(time * 6) * 0.2;
    glow(ctx, 0, wob - s * 0.95, s * 0.25, '#ffd95a', warn * 0.6);
    ctx.fillStyle = '#fff8d8';
    ctx.beginPath(); ctx.arc(0, wob - s * 0.95, s * 0.055 + ch * 0.02, 0, TAU); ctx.fill();
    // 碾尘
    ctx.fillStyle = 'rgba(30,36,52,.5)';
    ctx.beginPath(); ctx.ellipse(0, wob + s * 0.8, s * 0.9, s * 0.1, 0, 0, TAU); ctx.fill();
    hitFlash(ctx, fa, s, wob);
  },

  /* ============ 噬月君主 · 月神王者 ============ */
  lord(ctx, e, s, wob, fa, t, time) {
    const c = e.color;
    const ch = chargeOf(e);
    // 环境：月辉 + 金粉
    glow(ctx, 0, wob - s * 0.1, s * 2.5, '#fff3d6', 0.1 + ch * 0.1);
    for (let i = 0; i < 3; i++) {
      const a = time * 1.4 + i * 2.1;
      glow(ctx, Math.cos(a) * s * 2.1, wob - s * 1.0 + Math.sin(a * 1.7) * s * 0.4, s * 0.04, '#eec97a', 0.7);
    }
    // 月轮背景（双圈月相环纹）
    const mg = ctx.createRadialGradient(0, wob - s * 0.2, s * 0.2, 0, wob, s * 1.2);
    mg.addColorStop(0, 'rgba(248,240,255,.28)');
    mg.addColorStop(0.75, 'rgba(200,184,236,.14)');
    mg.addColorStop(1, 'rgba(200,184,236,0)');
    ctx.fillStyle = mg;
    ctx.beginPath(); ctx.arc(0, wob, s * 1.2, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(238,201,122,.25)'; ctx.lineWidth = s * 0.02;
    ctx.beginPath(); ctx.arc(0, wob, s * 1.05, 0, TAU); ctx.stroke();
    // 披风（摆动 + 褶皱）
    ctx.fillStyle = shade(c, -14);
    ctx.beginPath(); ctx.moveTo(-s * 0.72, wob - s * 0.5);
    ctx.quadraticCurveTo(-s * 1.3, wob + s * 0.15, -s * 0.95 + Math.sin(time * 1.8) * s * 0.08, wob + s * 0.95);
    ctx.quadraticCurveTo(0, wob + s * 0.8, s * 0.95 - Math.sin(time * 1.8) * s * 0.08, wob + s * 0.95);
    ctx.quadraticCurveTo(s * 1.3, wob + s * 0.15, s * 0.72, wob - s * 0.5);
    ctx.closePath(); ctx.fill();
    // 披风褶皱
    ctx.strokeStyle = 'rgba(60,45,90,.5)'; ctx.lineWidth = s * 0.025;
    ctx.beginPath(); ctx.moveTo(-s * 0.4, wob - s * 0.3); ctx.quadraticCurveTo(-s * 0.55, wob + s * 0.2, -s * 0.4, wob + s * 0.75); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * 0.4, wob - s * 0.3); ctx.quadraticCurveTo(s * 0.55, wob + s * 0.2, s * 0.4, wob + s * 0.75); ctx.stroke();
    // 身体（王袍体积渐变）
    const bg = ctx.createRadialGradient(-s * 0.25, wob - s * 0.35, s * 0.1, 0, wob, s * 0.85);
    bg.addColorStop(0, '#e0d4f8'); bg.addColorStop(0.4, c); bg.addColorStop(1, '#2a2450');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(0, wob, s * 0.8, 0, TAU); ctx.fill();
    // 袍面星图（星座连线）
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-s * 0.28, wob - s * 0.12); ctx.lineTo(-s * 0.08, wob - s * 0.28); ctx.lineTo(s * 0.12, wob - s * 0.12); ctx.lineTo(-s * 0.02, wob + s * 0.08); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (const [sx, sy] of [[-0.28, -0.12], [-0.08, -0.28], [0.12, -0.12], [-0.02, 0.08]] as Array<[number, number]>) {
      ctx.beginPath(); ctx.arc(sx * s, wob + sy * s, s * 0.03, 0, TAU); ctx.fill();
    }
    // 肩甲
    ctx.fillStyle = shade(c, 22);
    ctx.beginPath(); ctx.arc(0, wob - s * 0.48, s * 0.46, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    ctx.beginPath(); ctx.ellipse(-s * 0.2, wob - s * 0.56, s * 0.28, s * 0.06, -0.15, 0, TAU); ctx.fill();
    // 王冠（三层尖 + 宝石，蓄力点亮）
    ctx.fillStyle = '#eec97a';
    ctx.shadowColor = PALETTE.gold; ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(-s * 0.42, wob - s * 0.72);
    ctx.lineTo(-s * 0.42, wob - s * 1.25); ctx.lineTo(-s * 0.18, wob - s * 0.95);
    ctx.lineTo(0, wob - s * 1.42); ctx.lineTo(s * 0.18, wob - s * 0.95);
    ctx.lineTo(s * 0.42, wob - s * 1.25); ctx.lineTo(s * 0.42, wob - s * 0.72);
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = ch > 0.4 ? '#ff5a6a' : '#8a4a5a';
    ctx.beginPath(); ctx.arc(0, wob - s * 1.44, s * 0.07 + ch * 0.02, 0, TAU); ctx.fill();
    // 面部（月辉目）
    ctx.fillStyle = '#f8f0ff';
    ctx.shadowColor = '#f8f0ff'; ctx.shadowBlur = 6 + ch * 6;
    ctx.beginPath(); ctx.arc(-s * 0.26, wob - s * 0.24, s * 0.07, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.26, wob - s * 0.24, s * 0.07, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    // 月刃剑（斜持 + 剑格 + 剑光，蓄力发亮）
    ctx.save();
    ctx.translate(s * 0.55, wob - s * 0.5); ctx.rotate(-0.6 + Math.sin(time * 1.2) * 0.03);
    const bl = ctx.createLinearGradient(0, 0, s * 0.9, -s * 0.5);
    bl.addColorStop(0, '#ffe8b0'); bl.addColorStop(0.5, '#eec97a'); bl.addColorStop(1, '#fff8e8');
    ctx.fillStyle = bl;
    ctx.beginPath(); ctx.moveTo(s * 0.9, -s * 0.5); ctx.lineTo(-s * 0.2, s * 0.12); ctx.lineTo(-s * 0.05, s * 0.28); ctx.lineTo(s * 1.0, -s * 0.35); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#eec97a';
    ctx.fillRect(-s * 0.18, s * 0.08, s * 0.1, s * 0.12);
    ctx.strokeStyle = 'rgba(255,248,232,.6)'; ctx.lineWidth = s * 0.02;
    ctx.beginPath(); ctx.moveTo(s * 0.05, s * 0.05); ctx.lineTo(s * 0.7, -s * 0.35); ctx.stroke();
    ctx.restore();
    if (ch > 0) glow(ctx, s * 0.7, wob - s * 0.7, s * (0.4 + ch * 0.4), '#fff3d6', ch * 0.4);
    // 地面月辉
    ctx.fillStyle = 'rgba(180,154,232,.15)';
    ctx.beginPath(); ctx.ellipse(0, wob + s * 0.85, s * 0.95, s * 0.1, 0, 0, TAU); ctx.fill();
    hitFlash(ctx, fa, s, wob);
  },

  /* ============ 月影巫王 · 幽灵咒师 ============ */
  moonWraith(ctx, e, s, wob, fa, t, time) {
    const c = e.color;
    const ch = chargeOf(e);
    // 环境：影雾 + 漂浮符文
    glow(ctx, 0, wob, s * 2.3, c, 0.12 + ch * 0.08);
    for (let i = 0; i < 3; i++) {
      const a = time * 1.8 + i * 2.1;
      const px = Math.cos(a) * s * 1.9, py = wob - s * 0.7 + Math.sin(a * 1.5) * s * 0.5;
      ctx.strokeStyle = 'rgba(200,184,236,.5)'; ctx.lineWidth = s * 0.03;
      ctx.save(); ctx.translate(px, py); ctx.rotate(time * 2 + i);
      ctx.strokeRect(-s * 0.06, -s * 0.06, s * 0.12, s * 0.12);
      ctx.restore();
    }
    // 影雾裙（多层半透明，飘动）
    for (let layer = 0; layer < 3; layer++) {
      ctx.fillStyle = layer === 0 ? 'rgba(138,120,184,.4)' : layer === 1 ? 'rgba(90,70,140,.3)' : 'rgba(60,45,110,.2)';
      ctx.beginPath();
      ctx.moveTo(-s * (0.9 - layer * 0.15), wob - s * 0.2);
      for (let i = 0; i <= 5; i++) {
        const u = i / 5;
        ctx.lineTo(-s * (0.9 - layer * 0.15) + u * s * (1.8 - layer * 0.3), wob + s * (0.9 - layer * 0.2) + Math.sin(time * 3 + i * 1.7 + layer) * s * 0.14);
      }
      ctx.closePath(); ctx.fill();
    }
    // 袍身（雾体体积渐变）
    const bg = ctx.createRadialGradient(-s * 0.25, wob - s * 0.45, s * 0.1, 0, wob, s * 0.85);
    bg.addColorStop(0, 'rgba(200,184,236,.95)');
    bg.addColorStop(0.5, 'rgba(138,120,184,.8)');
    bg.addColorStop(1, 'rgba(34,28,56,.35)');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.ellipse(0, wob, s * 0.78, s * 0.85, 0, 0, TAU); ctx.fill();
    // 兜帽（罩头 + 内暗）
    ctx.fillStyle = shade(c, 14);
    ctx.beginPath(); ctx.arc(0, wob - s * 0.38, s * 0.56, Math.PI * 0.15, Math.PI * 0.85); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#0a0718';
    ctx.beginPath(); ctx.arc(0, wob - s * 0.34, s * 0.4, Math.PI * 0.2, Math.PI * 0.8); ctx.closePath(); ctx.fill();
    // 兜帽褶皱
    ctx.strokeStyle = 'rgba(74,63,120,.6)'; ctx.lineWidth = s * 0.02;
    ctx.beginPath(); ctx.moveTo(-s * 0.3, wob - s * 0.55); ctx.quadraticCurveTo(-s * 0.4, wob - s * 0.4, -s * 0.33, wob - s * 0.28); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * 0.3, wob - s * 0.55); ctx.quadraticCurveTo(s * 0.4, wob - s * 0.4, s * 0.33, wob - s * 0.28); ctx.stroke();
    // 咒火双瞳（双层光晕 + 内焰核，蓄力膨胀）
    const eyeR = s * (0.1 + ch * 0.04);
    for (const side of [-1, 1]) {
      glow(ctx, side * s * 0.22, wob - s * 0.36, eyeR * 2.2, '#ffd700', 0.3 + ch * 0.3);
      ctx.fillStyle = '#fffbe0';
      ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 8 + ch * 10;
      ctx.beginPath(); ctx.arc(side * s * 0.22, wob - s * 0.36, eyeR, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
    }
    // 符箓环（旋转，蓄力加速 + 显形）
    const ringA = time * (1.2 + ch * 2);
    for (let i = 0; i < 4; i++) {
      const a = ringA + i / 4 * TAU;
      const px = Math.cos(a) * s * 1.05, py = wob + Math.sin(a) * s * 1.05;
      ctx.save(); ctx.translate(px, py); ctx.rotate(Math.PI / 4 + a);
      ctx.strokeStyle = 'rgba(200,184,236,.75)'; ctx.lineWidth = s * 0.035;
      ctx.strokeRect(-s * 0.07, -s * 0.07, s * 0.14, s * 0.14);
      ctx.strokeStyle = 'rgba(255,215,0,.6)';
      ctx.beginPath(); ctx.moveTo(-s * 0.04, 0); ctx.lineTo(s * 0.04, 0); ctx.moveTo(0, -s * 0.04); ctx.lineTo(0, s * 0.04); ctx.stroke();
      ctx.restore();
    }
    // 法杖（悬浮 + 宝石，蓄力膨胀）
    ctx.strokeStyle = shade(c, -20); ctx.lineWidth = s * 0.06; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-s * 0.95, wob + s * 0.45); ctx.lineTo(-s * 1.15, wob - s * 0.8); ctx.stroke();
    glow(ctx, -s * 1.1, wob - s * 0.9, s * (0.2 + ch * 0.2), PALETTE.violet, 0.6 + ch * 0.3);
    ctx.fillStyle = PALETTE.violet;
    ctx.shadowColor = PALETTE.violet; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(-s * 1.1, wob - s * 0.9, s * 0.09 + ch * s * 0.05, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    // 脚下咒圈（双圈反向）
    ctx.strokeStyle = 'rgba(106,90,148,.6)'; ctx.lineWidth = s * 0.025;
    ctx.setLineDash([s * 0.1, s * 0.12]);
    ctx.lineDashOffset = -time * s * 0.8;
    ctx.beginPath(); ctx.ellipse(0, wob + s * 0.85, s * 0.75, s * 0.14, 0, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    hitFlash(ctx, fa, s, wob);
  },

  /* ============ 断月剑豪 · 月白剑客 ============ */
  moonSwordsman(ctx, e, s, wob, fa, t, time) {
    const c = e.color;
    const ch = chargeOf(e);
    // 环境：剑气残影（三连弧光）+ 月辉
    glow(ctx, 0, wob, s * 2.2, '#e8f4ff', 0.1 + ch * 0.12);
    ctx.strokeStyle = 'rgba(232,244,255,.4)'; ctx.lineWidth = s * 0.03;
    for (let i = 0; i < 2; i++) {
      ctx.globalAlpha = 0.5 - i * 0.2;
      ctx.beginPath(); ctx.arc(0, wob - s * 0.2, s * (1.2 + i * 0.3), time * 2.4 + i * 2, time * 2.4 + i * 2 + 3.4); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // 长衣摆（刀气边缘，双段飘动 + 褶皱）
    ctx.fillStyle = shade(c, -12);
    ctx.beginPath();
    ctx.moveTo(-s * 0.62, wob - s * 0.3);
    ctx.quadraticCurveTo(-s * 0.75, wob + s * 0.4, -s * 0.55 + Math.sin(time * 2.2) * s * 0.06, wob + s * 0.92);
    ctx.quadraticCurveTo(0, wob + s * 0.8, s * 0.55 - Math.sin(time * 2.2) * s * 0.06, wob + s * 0.92);
    ctx.quadraticCurveTo(s * 0.75, wob + s * 0.4, s * 0.62, wob - s * 0.3);
    ctx.closePath(); ctx.fill();
    // 衣摆褶皱 + 白描（刀气感）
    ctx.strokeStyle = 'rgba(138,132,184,.55)'; ctx.lineWidth = s * 0.025;
    ctx.beginPath(); ctx.moveTo(-s * 0.22, wob - s * 0.2); ctx.quadraticCurveTo(-s * 0.3, wob + s * 0.3, -s * 0.18, wob + s * 0.78); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * 0.22, wob - s * 0.2); ctx.quadraticCurveTo(s * 0.3, wob + s * 0.3, s * 0.18, wob + s * 0.78); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = s * 0.02;
    ctx.beginPath(); ctx.moveTo(-s * 0.4, wob + s * 0.4); ctx.quadraticCurveTo(-s * 0.35, wob + s * 0.7, -s * 0.4, wob + s * 0.88); ctx.stroke();
    // 躯干（束腰，体积渐变）
    const bg = ctx.createRadialGradient(-s * 0.2, wob - s * 0.35, s * 0.08, 0, wob, s * 0.8);
    bg.addColorStop(0, '#f8f6ff'); bg.addColorStop(0.45, c); bg.addColorStop(1, '#5a5490');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.ellipse(0, wob, s * 0.72, s * 0.8, 0, 0, TAU); ctx.fill();
    // 甲片竖线 + 护心镜
    ctx.strokeStyle = 'rgba(90,84,144,.5)'; ctx.lineWidth = s * 0.025;
    ctx.beginPath(); ctx.moveTo(-s * 0.24, wob - s * 0.6); ctx.lineTo(-s * 0.24, wob + s * 0.6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * 0.24, wob - s * 0.6); ctx.lineTo(s * 0.24, wob + s * 0.6); ctx.stroke();
    const mg = ctx.createRadialGradient(-s * 0.1, wob + s * 0.05, s * 0.05, 0, wob + s * 0.12, s * 0.3);
    mg.addColorStop(0, '#ffffff'); mg.addColorStop(1, shade(c, 24));
    ctx.fillStyle = mg;
    ctx.beginPath(); ctx.arc(0, wob + s * 0.12, s * 0.3, 0, TAU); ctx.fill();
    ctx.strokeStyle = PALETTE.blood; ctx.lineWidth = s * 0.03;
    ctx.beginPath(); ctx.arc(0, wob + s * 0.12, s * 0.3, 0.4, 2.7); ctx.stroke();
    // 束发红带（飘动 + 流苏）
    ctx.strokeStyle = '#e2546a'; ctx.lineWidth = s * 0.05; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(s * 0.18, wob - s * 0.66); ctx.quadraticCurveTo(s * 0.42, wob - s * 0.75, s * 0.55 + Math.sin(time * 3) * s * 0.05, wob - s * 0.68); ctx.stroke();
    // 头（低眉锐目）
    ctx.fillStyle = shade(c, -14);
    ctx.beginPath(); ctx.ellipse(0, wob - s * 0.62, s * 0.22, s * 0.24, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#4a4480'; ctx.lineWidth = s * 0.03; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-s * 0.1, wob - s * 0.63); ctx.lineTo(s * 0.1, wob - s * 0.63); ctx.stroke();
    // 月刃（头顶旋转 + 刃光，蓄力加速）
    ctx.save();
    ctx.translate(0, wob - s * 0.85);
    ctx.rotate(time * (1.2 + ch * 2));
    const bl = ctx.createLinearGradient(-s * 0.5, 0, s * 0.5, 0);
    bl.addColorStop(0, '#ffffff'); bl.addColorStop(0.5, '#d0e4ff'); bl.addColorStop(1, '#eef6ff');
    ctx.fillStyle = bl;
    ctx.shadowColor = PALETTE.gold; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(0, 0, s * 0.5, 0, TAU); ctx.arc(s * 0.13, 0, s * 0.42, 0, TAU, true); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
    // 刀光蓄力
    if (ch > 0) {
      glow(ctx, 0, wob - s * 0.85, s * (0.5 + ch * 0.5), '#e8f4ff', ch * 0.5);
      ctx.strokeStyle = 'rgba(232,244,255,.7)'; ctx.lineWidth = s * 0.03;
      ctx.beginPath(); ctx.arc(0, wob - s * 0.85, s * (0.55 + ch * 0.4), time * 4, time * 4 + 2.2); ctx.stroke();
    }
    // 地面月辉
    ctx.fillStyle = 'rgba(200,194,232,.13)';
    ctx.beginPath(); ctx.ellipse(0, wob + s * 0.85, s * 0.8, s * 0.08, 0, 0, TAU); ctx.fill();
    hitFlash(ctx, fa, s, wob);
  },

  /* ============ 裂空魔龙 · 天空霸主 ============ */
  dragon(ctx, e, s, wob, fa, t, time) {
    const c = e.color;
    const ch = chargeOf(e);
    const flap = Math.sin(time * 3.2) * 0.3;
    // 环境：火光 + 火星
    glow(ctx, 0, wob, s * 2.5, '#e2546a', 0.12 + ch * 0.1);
    for (let i = 0; i < 4; i++) {
      const a = time * 3 + i * 1.6;
      glow(ctx, Math.cos(a) * s * 2.1, wob - s * 0.6 + Math.sin(a * 2.3) * s * 0.5, s * (0.04 + (i % 2) * 0.02), i % 2 ? '#ffb84d' : '#ff9d6b', 0.6);
    }
    // 双翼（翼膜 + 骨线 + 膜纹，扑扇）
    for (const side of [-1, 1]) {
      ctx.save(); ctx.rotate(side * flap * 0.5);
      const wg = ctx.createLinearGradient(side * s * 0.5, 0, side * s * 2.5, 0);
      wg.addColorStop(0, 'rgba(255,157,107,.95)');
      wg.addColorStop(0.6, 'rgba(160,58,74,.7)');
      wg.addColorStop(1, 'rgba(42,16,24,.4)');
      ctx.fillStyle = wg;
      ctx.beginPath();
      ctx.moveTo(side * s * 0.5, wob - s * 0.2);
      ctx.quadraticCurveTo(side * s * 1.8, wob - s * 1.2, side * s * 2.5, wob - s * 0.8);
      ctx.lineTo(side * s * 2.0, wob - s * 0.1);
      ctx.quadraticCurveTo(side * s * 1.3, wob + s * 0.2, side * s * 0.5, wob - s * 0.2);
      ctx.closePath(); ctx.fill();
      // 翼骨
      ctx.strokeStyle = 'rgba(255,208,160,.6)'; ctx.lineWidth = s * 0.07; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(side * s * 0.5, wob - s * 0.2);
      ctx.quadraticCurveTo(side * s * 1.7, wob - s * 1.0, side * s * 2.45, wob - s * 0.75); ctx.stroke();
      // 膜纹
      ctx.strokeStyle = 'rgba(255,157,107,.4)'; ctx.lineWidth = s * 0.02;
      ctx.beginPath(); ctx.moveTo(side * s * 0.9, wob - s * 0.5); ctx.quadraticCurveTo(side * s * 1.7, wob - s * 0.7, side * s * 2.2, wob - s * 0.45); ctx.stroke();
      ctx.restore();
    }
    // 龙头（体积渐变）
    const hg = ctx.createRadialGradient(-s * 0.2, wob - s * 0.25, s * 0.1, 0, wob, s * 0.9);
    hg.addColorStop(0, '#f07a88'); hg.addColorStop(0.45, c); hg.addColorStop(1, '#24101a');
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.ellipse(0, wob, s * 0.85, s * 0.72, 0, 0, TAU); ctx.fill();
    // 口鼻（前伸 + 高光）
    ctx.fillStyle = shade(c, 12);
    ctx.beginPath(); ctx.ellipse(s * 0.55, wob, s * 0.5, s * 0.4, -0.1, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,208,200,.35)';
    ctx.beginPath(); ctx.ellipse(s * 0.35, wob - s * 0.18, s * 0.3, s * 0.1, -0.2, 0, TAU); ctx.fill();
    // 熔岩鳞纹（弧线网格）
    ctx.strokeStyle = 'rgba(255,208,160,.4)'; ctx.lineWidth = s * 0.02;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.arc(0, wob + s * 0.1 + i * s * 0.18, s * 0.5 - i * s * 0.05, 0.5, 2.6); ctx.stroke();
    }
    // 熔岩裂纹（发光，蓄力增强）
    ctx.strokeStyle = '#ffb84d'; ctx.lineWidth = s * 0.035; ctx.lineCap = 'round';
    ctx.globalAlpha = 0.75 + ch * 0.25;
    ctx.beginPath(); ctx.moveTo(-s * 0.15, wob - s * 0.45); ctx.quadraticCurveTo(-s * 0.05, wob - s * 0.1, -s * 0.2, wob + s * 0.15); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-s * 0.05, wob - s * 0.1); ctx.lineTo(s * 0.1, wob - s * 0.2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * 0.2, wob - s * 0.5); ctx.quadraticCurveTo(s * 0.28, wob - s * 0.15, s * 0.15, wob + s * 0.12); ctx.stroke();
    ctx.globalAlpha = 1;
    // 火喉（口部三层，蓄力喷发）
    const fireP = 0.35 + ch * 0.5 + Math.sin(time * 8) * (0.05 + ch * 0.1);
    glow(ctx, s * 1.0, wob + s * 0.05, s * 0.8 * fireP, '#ffb84d', 0.35 + ch * 0.3);
    ctx.fillStyle = PALETTE.ember;
    ctx.shadowColor = PALETTE.tangerine; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.ellipse(s * 1.0, wob + s * 0.05, s * 0.3 * fireP * 2.4, s * 0.22 * fireP * 2.4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff0c8'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.ellipse(s * 0.92, wob + s * 0.05, s * 0.16 * fireP * 2.4, s * 0.1 * fireP * 2.4, 0, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    // 蚀月弯角（带高光）
    ctx.fillStyle = '#ffb84d';
    ctx.shadowColor = '#ffb84d'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.moveTo(-s * 0.4, wob - s * 0.6); ctx.quadraticCurveTo(-s * 0.62, wob - s * 1.1, -s * 0.72, wob - s * 1.25); ctx.lineTo(-s * 0.2, wob - s * 0.78); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(s * 0.1, wob - s * 0.64); ctx.quadraticCurveTo(s * 0.02, wob - s * 1.2, -s * 0.05, wob - s * 1.35); ctx.lineTo(s * 0.36, wob - s * 0.84); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    // 眼（绯红）
    eye(ctx, -s * 0.35, wob - s * 0.3, s * 0.13, PALETTE.darkCrimson);
    eye(ctx, s * 0.35, wob - s * 0.3, s * 0.13, PALETTE.darkCrimson);
    // 尾（摆动 + 尾焰）
    ctx.strokeStyle = shade(c, -20); ctx.lineWidth = s * 0.16; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-s * 0.7, wob + s * 0.3);
    ctx.quadraticCurveTo(-s * 1.8, wob + s * 1.0, -s * 2.2 + Math.sin(time * 3) * 4, wob + s * 0.4); ctx.stroke();
    glow(ctx, -s * 2.3, wob + s * 0.4, s * 0.25, '#ffb84d', 0.5 + Math.sin(time * 10) * 0.2);
    // 地面火光
    ctx.fillStyle = 'rgba(226,84,106,.12)';
    ctx.beginPath(); ctx.ellipse(0, wob + s * 0.8, s * 1.0, s * 0.1, 0, 0, TAU); ctx.fill();
    hitFlash(ctx, fa, s, wob);
  },

  /* ============ 蚀雷巨枭 · 雷暴之枭 ============ */
  stormOwl(ctx, e, s, wob, fa, t, time) {
    const c = e.color;
    const ch = chargeOf(e);
    const flap = Math.sin(time * 4.2) * 0.25;
    // 环境：雷光 + 电弧粒子
    glow(ctx, 0, wob, s * 2.4, c, 0.12 + ch * 0.1);
    for (let i = 0; i < 3; i++) {
      const a = time * 4 + i * 2.1;
      ctx.strokeStyle = 'rgba(207,228,255,.5)'; ctx.lineWidth = s * 0.025;
      const px = Math.cos(a) * s * 1.9, py = wob - s * 0.7 + Math.sin(a * 1.8) * s * 0.4;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a * 3) * s * 0.12, py + Math.sin(a * 3) * s * 0.12); ctx.stroke();
    }
    // 双翼（三层羽毛 + 次级飞羽 + 闪电纹）
    for (const side of [-1, 1]) {
      ctx.save(); ctx.rotate(side * flap * 0.55);
      for (let layer = 0; layer < 3; layer++) {
        const wg = ctx.createLinearGradient(side * s * 0.4, 0, side * s * 2.0, 0);
        wg.addColorStop(0, c); wg.addColorStop(1, '#1e2248');
        ctx.fillStyle = wg;
        ctx.beginPath();
        ctx.moveTo(side * s * 0.45, wob - s * 0.1);
        ctx.quadraticCurveTo(side * s * (1.5 + layer * 0.35), wob - s * (1.0 + layer * 0.15), side * s * (1.9 + layer * 0.3), wob - s * 0.6);
        ctx.lineTo(side * s * (1.5 + layer * 0.3), wob + s * 0.1);
        ctx.quadraticCurveTo(side * s * 1.0, wob + s * 0.3, side * s * 0.45, wob - s * 0.1);
        ctx.closePath(); ctx.fill();
      }
      // 翼羽闪电纹（锯齿，蓄力放电增强）
      ctx.strokeStyle = 'rgba(207,228,255,.75)'; ctx.lineWidth = s * 0.03; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(side * s * 0.7, wob - s * 0.5);
      ctx.lineTo(side * s * 1.0, wob - s * 0.65);
      ctx.lineTo(side * s * 0.85, wob - s * 0.4);
      ctx.lineTo(side * s * 1.2, wob - s * 0.5);
      ctx.stroke();
      ctx.restore();
    }
    // 身体（雷云体积渐变 + 胸羽纹）
    const bg = ctx.createRadialGradient(-s * 0.2, wob - s * 0.35, s * 0.08, 0, wob, s * 0.8);
    bg.addColorStop(0, '#a8b4f4'); bg.addColorStop(0.5, c); bg.addColorStop(1, '#1e2248');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.ellipse(0, wob, s * 0.75, s * 0.85, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(168,180,244,.5)'; ctx.lineWidth = s * 0.025;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(-s * 0.35, wob + s * 0.1 + i * s * 0.18);
      ctx.quadraticCurveTo(0, wob + s * 0.28 + i * s * 0.18, s * 0.35, wob + s * 0.1 + i * s * 0.18); ctx.stroke();
    }
    // 尖喙
    ctx.fillStyle = PALETTE.bone;
    ctx.beginPath(); ctx.moveTo(0, wob - s * 0.45); ctx.lineTo(s * 0.14, wob - s * 0.85); ctx.lineTo(-s * 0.14, wob - s * 0.45); ctx.closePath(); ctx.fill();
    // 雷核目（三层：白炽→鎏金→暗核，蓄力放电）
    for (const side of [-1, 1]) {
      const eg = ctx.createRadialGradient(side * s * 0.28 - s * 0.03, wob - s * 0.35 - s * 0.03, s * 0.02, side * s * 0.28, wob - s * 0.35, s * 0.15);
      eg.addColorStop(0, '#ffffff'); eg.addColorStop(0.5, '#ffd95a'); eg.addColorStop(1, c);
      ctx.fillStyle = eg;
      ctx.shadowColor = '#ffd95a'; ctx.shadowBlur = 6 + ch * 10;
      ctx.beginPath(); ctx.arc(side * s * 0.28, wob - s * 0.35, s * 0.14, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#1a1208';
      ctx.beginPath(); ctx.arc(side * s * 0.28, wob - s * 0.35, s * 0.06, 0, TAU); ctx.fill();
      // 放电小叉（随机）
      if (Math.random() < 0.4 + ch * 0.5) {
        ctx.strokeStyle = '#ffd95a'; ctx.lineWidth = s * 0.02;
        ctx.beginPath(); ctx.moveTo(side * s * 0.28 + side * s * 0.1, wob - s * 0.42);
        ctx.lineTo(side * s * 0.28 + side * s * (0.16 + Math.random() * 0.1), wob - s * (0.5 + Math.random() * 0.15)); ctx.stroke();
      }
    }
    // 爪握雷光
    ctx.strokeStyle = '#ffd95a'; ctx.lineWidth = s * 0.045; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-s * 0.25, wob + s * 0.55); ctx.lineTo(-s * 0.4, wob + s * 0.8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * 0.25, wob + s * 0.55); ctx.lineTo(s * 0.4, wob + s * 0.8); ctx.stroke();
    // 地面雷光
    ctx.fillStyle = 'rgba(143,154,238,.13)';
    ctx.beginPath(); ctx.ellipse(0, wob + s * 0.85, s * 0.85, s * 0.09, 0, 0, TAU); ctx.fill();
    hitFlash(ctx, fa, s, wob);
  },

  /* ============ 深渊巢母 · 凝视之巢 ============ */
  abyssMother(ctx, e, s, wob, fa, t, time) {
    const c = e.color;
    const ch = chargeOf(e);
    // 环境：深渊光 + 飘浮眼粒子
    glow(ctx, 0, wob, s * 2.4, c, 0.12 + ch * 0.08);
    for (let i = 0; i < 3; i++) {
      const a = time * 0.8 + i * 2.1;
      const px = Math.cos(a) * s * 1.9, py = wob - s * 0.8 + Math.sin(a * 1.3) * s * 0.4;
      ctx.fillStyle = 'rgba(232,216,216,.5)';
      ctx.beginPath(); ctx.ellipse(px, py, s * 0.05, s * 0.035, 0, 0, TAU); ctx.fill();
    }
    // 八触须（内弯摆动，蓄力聚拢 + 黏液滴）
    ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU + time * 0.3;
      const bend = ch * 0.9;
      const tg = ctx.createLinearGradient(Math.cos(a) * s * 0.7, wob + Math.sin(a) * s * 0.7, Math.cos(a) * s * 2.0, wob + Math.sin(a) * s * 2.0);
      tg.addColorStop(0, c); tg.addColorStop(0.5, '#4a8a60'); tg.addColorStop(1, '#1c3a28');
      ctx.strokeStyle = tg; ctx.lineWidth = s * 0.1;
      ctx.globalAlpha = 0.85;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * s * 0.8, wob + Math.sin(a) * s * 0.8);
      ctx.quadraticCurveTo(Math.cos(a + 0.2) * s * 1.6, wob + Math.sin(a + 0.2) * s * 1.6,
        Math.cos(a) * s * (2.0 - bend * 0.5) + Math.sin(time * 2 + i) * 4, wob + Math.sin(a) * s * (2.0 - bend * 0.5)); ctx.stroke();
      // 黏液滴
      if (i % 2 === 0) {
        ctx.fillStyle = 'rgba(127,214,164,.7)';
        ctx.beginPath(); ctx.arc(Math.cos(a) * s * 1.85, wob + Math.sin(a) * s * 1.85 + Math.sin(time * 2 + i) * 4, s * 0.03, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // 巨体（深渊体积渐变）
    const bg = ctx.createRadialGradient(-s * 0.25, wob - s * 0.3, s * 0.1, 0, wob, s * 1.0);
    bg.addColorStop(0, '#c08090'); bg.addColorStop(0.5, c); bg.addColorStop(1, '#1a0a14');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(0, wob, s * 0.95, 0, TAU); ctx.fill();
    // 体表疱群（眼群，独立眨动）
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * TAU + 0.6;
      const px = Math.cos(a) * s * 0.55, py = wob + Math.sin(a) * s * 0.55;
      const blinkS = 1 - (Math.sin(time * 2 + i * 1.7) > 0.92 ? 0.85 : 0);
      ctx.fillStyle = 'rgba(232,216,216,.5)';
      ctx.beginPath(); ctx.ellipse(px, py, s * 0.14, s * 0.11 * blinkS, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(20,10,20,.8)';
      ctx.beginPath(); ctx.ellipse(px, py, s * 0.055, s * 0.05 * blinkS, 0, 0, TAU); ctx.fill();
    }
    // 中心口器（多层环 + 獠牙，蓄力张开）
    const mouth = 0.5 + ch * 0.42;
    const mg = ctx.createRadialGradient(0, wob, s * 0.1, 0, wob, s * 0.5 * mouth);
    mg.addColorStop(0, '#0e040c'); mg.addColorStop(0.6, '#3a1a28'); mg.addColorStop(1, c);
    ctx.fillStyle = mg;
    ctx.beginPath(); ctx.arc(0, wob, s * 0.42 * mouth, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#ff6a8a'; ctx.lineWidth = s * 0.025;
    ctx.globalAlpha = 0.45 + ch * 0.4;
    ctx.beginPath(); ctx.arc(0, wob, s * 0.3 * mouth, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 1;
    // 獠牙环（上下两排）
    ctx.fillStyle = PALETTE.bone;
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU + 0.15;
      const out = 1.15 + (i % 2 ? 0.25 : 0.35);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * s * 0.4 * mouth, wob + Math.sin(a) * s * 0.4 * mouth);
      ctx.lineTo(Math.cos(a + 0.07) * s * 0.52 * mouth * out, wob + Math.sin(a + 0.07) * s * 0.52 * mouth * out);
      ctx.lineTo(Math.cos(a - 0.07) * s * 0.52 * mouth * out, wob + Math.sin(a - 0.07) * s * 0.52 * mouth * out);
      ctx.closePath(); ctx.fill();
    }
    // 蓄力：口器深处亮起
    if (ch > 0) glow(ctx, 0, wob, s * (0.15 + ch * 0.25), '#ff6a8a', ch * 0.5);
    hitFlash(ctx, fa, s, wob);
  },

  /* ============ 蚀月终焉 · 蚀月本体 ============ */
  final(ctx, e, s, wob, fa, t, time) {
    const ch = chargeOf(e);
    const pulse = 1 + 0.05 * Math.sin(time * 3) + ch * 0.08;
    // 环境：金光 + 血雨（蓄力加剧）
    glow(ctx, 0, wob, s * 2.6, '#ffb84d', 0.16 + ch * 0.1);
    for (let i = 0; i < 4; i++) {
      const px = Math.cos(time * 0.6 + i * 1.7) * s * 1.8;
      const py = wob - s * 1.3 + ((time * s * 0.5 + i * s * 0.4) % (s * 1.2));
      ctx.fillStyle = 'rgba(224,106,90,.6)';
      ctx.beginPath(); ctx.ellipse(px, py, s * 0.035, s * 0.06, 0, 0, TAU); ctx.fill();
    }
    // 外蚀环（旋转 + 缺口光点，蓄力加速）
    const ringR = s * 1.35;
    ctx.strokeStyle = PALETTE.ember; ctx.lineWidth = s * 0.12;
    ctx.globalAlpha = 0.85;
    ctx.setLineDash([s * 0.9, s * 0.45]);
    ctx.lineDashOffset = -time * (30 + ch * 60);
    ctx.beginPath(); ctx.arc(0, wob, ringR, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    // 缺口光点（生路）
    const gapA = time * (0.6 + ch * 0.8);
    glow(ctx, Math.cos(gapA) * ringR, wob + Math.sin(gapA) * ringR, s * 0.2, '#fff', 0.6);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(Math.cos(gapA) * ringR, wob + Math.sin(gapA) * ringR, s * 0.07, 0, TAU); ctx.fill();
    // 环上眼（3 颗，随环转）
    for (let i = 0; i < 3; i++) {
      const a = gapA + 1.2 + i / 3 * TAU;
      ctx.fillStyle = PALETTE.goldVivid; ctx.shadowColor = PALETTE.goldVivid; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(Math.cos(a) * ringR, wob + Math.sin(a) * ringR, s * 0.09, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
    }
    // 月轮核心（体积渐变：外金内炽白）
    const g = ctx.createRadialGradient(-s * 0.25, wob - s * 0.25, s * 0.1, 0, wob, s * pulse);
    g.addColorStop(0, '#fffbe8');
    g.addColorStop(0.35, '#ffc46a');
    g.addColorStop(0.7, PALETTE.fireBright);
    g.addColorStop(1, PALETTE.gold);
    ctx.fillStyle = g;
    ctx.shadowColor = PALETTE.gold; ctx.shadowBlur = 26;
    ctx.beginPath(); ctx.arc(0, wob, s * pulse, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    // 月面高光弧
    ctx.fillStyle = 'rgba(255,244,220,.4)';
    ctx.beginPath(); ctx.ellipse(-s * 0.35, wob - s * 0.35, s * 0.4, s * 0.15, -0.5, 0, TAU); ctx.fill();
    // 蚀纹（被蚀缺口，锯齿边缘）
    ctx.fillStyle = 'rgba(20,10,26,.92)';
    ctx.beginPath();
    ctx.moveTo(s * 0.3, wob - s * 0.85 * pulse);
    ctx.quadraticCurveTo(s * 0.9, wob - s * 0.3, s * 0.75, wob + s * 0.7 * pulse);
    ctx.quadraticCurveTo(0, wob + s * 0.9 * pulse, -s * 0.8, wob + s * 0.6 * pulse);
    ctx.quadraticCurveTo(-s * 1.0, wob - s * 0.2, -s * 0.5, wob - s * 0.75 * pulse);
    ctx.closePath(); ctx.fill();
    // 蚀纹燃烧边
    ctx.strokeStyle = 'rgba(224,106,90,.4)'; ctx.lineWidth = s * 0.025;
    ctx.beginPath(); ctx.moveTo(s * 0.3, wob - s * 0.85 * pulse);
    ctx.quadraticCurveTo(s * 0.9, wob - s * 0.3, s * 0.75, wob + s * 0.7 * pulse); ctx.stroke();
    // 陨坑群
    ctx.strokeStyle = 'rgba(138,74,32,.55)'; ctx.lineWidth = s * 0.035;
    for (const [cx, cy, cr] of [[-0.35, 0.1, 0.16], [0.05, -0.4, 0.12], [0.3, 0.42, 0.09]] as Array<[number, number, number]>) {
      ctx.beginPath(); ctx.arc(cx * s, wob + cy * s, cr * s, 0, TAU); ctx.stroke();
    }
    // 中央蚀眼（蓄力扩张）
    const eR = s * 0.16 + ch * s * 0.08;
    ctx.fillStyle = '#1a0c1c';
    ctx.beginPath(); ctx.arc(0, wob, eR, 0, TAU); ctx.fill();
    ctx.fillStyle = PALETTE.goldVivid; ctx.shadowColor = PALETTE.goldVivid; ctx.shadowBlur = 10 + ch * 8;
    ctx.beginPath(); ctx.arc(0, wob, eR * 0.45, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    hitFlash(ctx, fa, s, wob);
  },
};

export function drawBossBody(ctx: CanvasRenderingContext2D, e: any, s: number, wob: number, fa: number, t: number, time?: number): void {
  const fn: any = BOSS_SHAPES[e.type || ''] || BOSS_SHAPES.final;
  fn(ctx, e, s, wob, fa, t, time || 0);
}
