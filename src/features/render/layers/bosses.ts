/* =========================================================
   蚀月远征 · 渲染层：Boss 造型注册表（精细化重制）
   每位领主拥有独特躯体结构与专属动画；
   技能蓄力（attT 倒计时）驱动发光/膨胀姿态。
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

export const BOSS_SHAPES: Record<string, (ctx: CanvasRenderingContext2D, e: any, s: number, wob: number, fa: number, t: number, time: number) => void> = {

  /* 蚀潮巨兽：巨鲸形体 + 双鳍 + 尾 + 触须环 + 潮光鳞纹 */
  behemoth(ctx, e, s, wob, fa, t, time) {
    const c = e.color;
    const ch = chargeOf(e);
    const breathe = 1 + Math.sin(time * 2.4) * 0.03;
    // 触须环（根部摆动）
    ctx.strokeStyle = c; ctx.lineWidth = s * 0.09; ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU + time * 0.5;
      ctx.globalAlpha = 0.75;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * s * 0.85, wob + Math.sin(a) * s * 0.85);
      ctx.quadraticCurveTo(Math.cos(a + 0.25) * s * 1.6, wob + Math.sin(a + 0.25) * s * 1.6, Math.cos(a) * s * 1.85 + Math.sin(time * 3 + i) * 4, wob + Math.sin(a) * s * 1.85); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // 巨体
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(0, wob, s * 1.15 * breathe, s * 0.92 * breathe, 0, 0, TAU); ctx.fill();
    // 潮光鳞纹
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = s * 0.05;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath(); ctx.ellipse(i * s * 0.35, wob + s * 0.1, s * 0.42, s * 0.3, 0.2, 0, TAU); ctx.stroke();
    }
    // 背脊
    ctx.fillStyle = shade(c, 22);
    ctx.beginPath(); ctx.moveTo(0, wob - s * 0.92 * breathe); ctx.lineTo(s * 0.14, wob - s * 0.6); ctx.lineTo(-s * 0.14, wob - s * 0.6); ctx.closePath(); ctx.fill();
    // 双鳍
    ctx.fillStyle = shade(c, -14);
    ctx.beginPath(); ctx.moveTo(-s * 0.85, wob + s * 0.1); ctx.quadraticCurveTo(-s * 1.7, wob + s * 0.75, -s * 1.35, wob + s * 0.95); ctx.lineTo(-s * 0.6, wob + s * 0.45); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(s * 0.85, wob + s * 0.1); ctx.quadraticCurveTo(s * 1.7, wob + s * 0.75, s * 1.35, wob + s * 0.95); ctx.lineTo(s * 0.6, wob + s * 0.45); ctx.closePath(); ctx.fill();
    // 尾
    ctx.fillStyle = shade(c, 10);
    ctx.beginPath(); ctx.moveTo(0, wob + s * 0.8); ctx.quadraticCurveTo(0, wob + s * 1.6, Math.sin(time * 2) * s * 0.4, wob + s * 1.75); ctx.lineTo(s * 0.22, wob + s * 1.1); ctx.closePath(); ctx.fill();
    // 眼 + 蓄力红光
    eye(ctx, -s * 0.42, wob - s * 0.3, s * 0.16);
    eye(ctx, s * 0.42, wob - s * 0.3, s * 0.16);
    if (ch > 0) {
      ctx.globalAlpha = ch * 0.5;
      ctx.fillStyle = PALETTE.coralBright;
      ctx.beginPath(); ctx.arc(0, wob, s * 1.5, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
  },

  /* 潮噬之母：母兽 + 八触手 + 产卵囊（发光搏动）+ 潮纹 */
  tideMother(ctx, e, s, wob, fa, t, time) {
    const c = e.color;
    // 八触手（摆动，蓄力时高举）
    const ch = chargeOf(e);
    ctx.strokeStyle = c; ctx.lineWidth = s * 0.1; ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU;
      const lift = ch * s * 0.5;
      ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * s * 0.8, wob + Math.sin(a) * s * 0.8);
      ctx.quadraticCurveTo(Math.cos(a + 0.3) * s * 1.7, wob + Math.sin(a + 0.3) * s * 1.7 - lift, Math.cos(a) * s * 2.05 + Math.sin(time * 2.6 + i) * 5, wob + Math.sin(a) * s * 2.05 - lift); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // 母体
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(0, wob, s * 0.92, 0, TAU); ctx.fill();
    // 潮纹
    ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, wob, s * 0.62, 0.4, 2.7); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, wob, s * 0.3, 1.1, 2.0); ctx.stroke();
    // 产卵囊（腹部，发光搏动）
    const sac = 1 + 0.12 * Math.sin(time * 3) + ch * 0.15;
    ctx.fillStyle = '#d9fff2';
    ctx.globalAlpha = 0.5 + ch * 0.3;
    ctx.beginPath(); ctx.arc(0, wob + s * 0.45, s * 0.32 * sac, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#d9fff2'; ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.6;
    ctx.beginPath(); ctx.arc(0, wob + s * 0.45, s * 0.38 * sac, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 1;
    // 眼
    eye(ctx, -s * 0.34, wob - s * 0.3, s * 0.14);
    eye(ctx, s * 0.34, wob - s * 0.3, s * 0.14);
  },

  /* 蚀潮战车：装甲战车（车体 + 双撞角 + 转轮 + 甲片） */
  erodeChariot(ctx, e, s, wob, fa, t, time) {
    const c = e.color;
    const roll = time * 6;
    // 转轮（两侧，滚动）
    ctx.strokeStyle = shade(c, -20); ctx.lineWidth = s * 0.14;
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.arc(side * s * 1.05, wob + s * 0.55, s * 0.42, 0, TAU); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(side * s * 1.05, wob + s * 0.55); ctx.lineTo(side * s * 1.05 + Math.cos(roll) * s * 0.32, wob + s * 0.55 + Math.sin(roll) * s * 0.32); ctx.stroke();
    }
    // 车体（斜顶甲）
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.moveTo(-s * 1.1, wob + s * 0.5); ctx.lineTo(-s * 0.8, wob - s * 0.75);
    ctx.lineTo(0, wob - s * 0.95); ctx.lineTo(s * 0.8, wob - s * 0.75); ctx.lineTo(s * 1.1, wob + s * 0.5); ctx.closePath(); ctx.fill();
    // 甲片缝线
    ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-s * 0.55, wob - s * 0.6); ctx.lineTo(-s * 0.72, wob + s * 0.4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * 0.55, wob - s * 0.6); ctx.lineTo(s * 0.72, wob + s * 0.4); ctx.stroke();
    // 中央撞角（前方尖刺）
    ctx.fillStyle = shade(c, 26);
    ctx.beginPath(); ctx.moveTo(0, wob - s * 0.9); ctx.lineTo(s * 0.16, wob - s * 1.75); ctx.lineTo(-s * 0.16, wob - s * 0.9); ctx.closePath(); ctx.fill();
    // 锈蚀斑点
    ctx.fillStyle = 'rgba(90,60,30,.4)';
    ctx.beginPath(); ctx.arc(-s * 0.5, wob + s * 0.15, s * 0.12, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.62, wob + s * 0.2, s * 0.09, 0, TAU); ctx.fill();
    // 眼（前甲）
    eye(ctx, -s * 0.32, wob - s * 0.4, s * 0.11);
    eye(ctx, s * 0.32, wob - s * 0.4, s * 0.11);
  },

  /* 月下君王：王冠 + 披风（摆动）+ 月轮 + 权杖 */
  lord(ctx, e, s, wob, fa, t, time) {
    const c = e.color;
    const ch = chargeOf(e);
    // 月轮背景（圣光）
    ctx.globalAlpha = 0.22 + ch * 0.2;
    ctx.fillStyle = '#fff3d6';
    ctx.shadowColor = '#fff3d6'; ctx.shadowBlur = 24;
    ctx.beginPath(); ctx.arc(0, wob, s * 1.15, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    // 披风（摆动）
    ctx.fillStyle = shade(c, -10);
    ctx.beginPath(); ctx.moveTo(-s * 0.7, wob - s * 0.5);
    ctx.quadraticCurveTo(-s * 1.25, wob + s * 0.2, -s * 0.9 + Math.sin(time * 2) * s * 0.08, wob + s * 0.95);
    ctx.quadraticCurveTo(0, wob + s * 0.75, s * 0.9 - Math.sin(time * 2) * s * 0.08, wob + s * 0.95);
    ctx.quadraticCurveTo(s * 1.25, wob + s * 0.2, s * 0.7, wob - s * 0.5);
    ctx.closePath(); ctx.fill();
    // 身体（王袍）
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(0, wob, s * 0.8, 0, TAU); ctx.fill();
    // 肩甲
    ctx.fillStyle = shade(c, 22);
    ctx.beginPath(); ctx.arc(0, wob - s * 0.45, s * 0.45, Math.PI, 0); ctx.closePath(); ctx.fill();
    // 王冠（三层尖）
    ctx.fillStyle = PALETTE.fireBright;
    ctx.shadowColor = PALETTE.gold; ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(-s * 0.42, wob - s * 0.72);
    ctx.lineTo(-s * 0.42, wob - s * 1.25); ctx.lineTo(-s * 0.18, wob - s * 0.95);
    ctx.lineTo(0, wob - s * 1.4); ctx.lineTo(s * 0.18, wob - s * 0.95);
    ctx.lineTo(s * 0.42, wob - s * 1.25); ctx.lineTo(s * 0.42, wob - s * 0.72);
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    // 冠顶宝石（蓄力点亮）
    ctx.fillStyle = ch > 0.5 ? '#ff5a6a' : '#8a4a5a';
    ctx.beginPath(); ctx.arc(0, wob - s * 1.42, s * 0.08, 0, TAU); ctx.fill();
    // 面部
    eye(ctx, -s * 0.28, wob - s * 0.25, s * 0.11);
    eye(ctx, s * 0.28, wob - s * 0.25, s * 0.11);
    ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-s * 0.1, wob - s * 0.05); ctx.lineTo(s * 0.1, wob - s * 0.05); ctx.stroke();
    // 权杖（身侧）
    ctx.strokeStyle = PALETTE.fireBright; ctx.lineWidth = s * 0.07; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(s * 0.8, wob + s * 0.5); ctx.lineTo(s * 1.25, wob - s * 1.1); ctx.stroke();
    ctx.fillStyle = PALETTE.fireBright;
    ctx.beginPath(); ctx.arc(s * 1.25, wob - s * 1.1, s * 0.1, 0, TAU); ctx.fill();
  },

  /* 月影巫王：长袍（飘动）+ 兜帽 + 月牙冠 + 幽光眼 + 法杖 */
  moonWraith(ctx, e, s, wob, fa, t, time) {
    const c = e.color;
    const ch = chargeOf(e);
    // 长袍下摆（气流飘动）
    ctx.fillStyle = shade(c, -16);
    ctx.beginPath();
    ctx.moveTo(-s * 0.85, wob - s * 0.2);
    for (let i = 0; i <= 4; i++) {
      const u = i / 4;
      ctx.lineTo(-s * 0.85 + u * s * 1.7, wob + s * 0.85 + Math.sin(time * 3 + i * 1.6) * s * 0.12);
    }
    ctx.closePath(); ctx.fill();
    // 袍身
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(0, wob, s * 0.78, s * 0.85, 0, 0, TAU); ctx.fill();
    // 兜帽（罩头）
    ctx.fillStyle = shade(c, 12);
    ctx.beginPath(); ctx.arc(0, wob - s * 0.35, s * 0.55, Math.PI * 0.15, Math.PI * 0.85); ctx.closePath(); ctx.fill();
    // 兜帽内暗影
    ctx.fillStyle = '#0a0718';
    ctx.beginPath(); ctx.arc(0, wob - s * 0.32, s * 0.38, Math.PI * 0.2, Math.PI * 0.8); ctx.closePath(); ctx.fill();
    // 幽光眼（蓄力更亮）
    ctx.fillStyle = '#a99bff';
    ctx.shadowColor = '#a99bff'; ctx.shadowBlur = 8 + ch * 10;
    ctx.beginPath(); ctx.arc(-s * 0.2, wob - s * 0.36, s * 0.1 + ch * 0.04, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.2, wob - s * 0.36, s * 0.1 + ch * 0.04, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    // 月牙冠（头顶弯月）
    ctx.strokeStyle = PALETTE.fireBright; ctx.lineWidth = s * 0.09; ctx.lineCap = 'round';
    ctx.shadowColor = PALETTE.gold; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(0, wob - s * 0.75, s * 0.3, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke();
    ctx.shadowBlur = 0;
    // 法杖（悬浮光球，蓄力膨胀）
    ctx.fillStyle = PALETTE.violet; ctx.shadowColor = PALETTE.violet; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(-s * 0.95, wob + s * 0.3, s * 0.12 + ch * s * 0.1, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
  },

  /* 月下剑士：铠甲 + 旋转月刃 + 剑鞘 + 头冠 */
  moonSwordsman(ctx, e, s, wob, fa, t, time) {
    const c = e.color;
    // 剑气环（旋转）
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = PALETTE.gold; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, wob, s * 1.25, time * 2, time * 2 + 4.5); ctx.stroke();
    ctx.globalAlpha = 1;
    // 铠甲
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(0, wob, s * 0.85, s * 0.9, 0, 0, TAU); ctx.fill();
    // 甲片（竖排）
    ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-s * 0.3, wob - s * 0.75); ctx.lineTo(-s * 0.3, wob + s * 0.75); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * 0.3, wob - s * 0.75); ctx.lineTo(s * 0.3, wob + s * 0.75); ctx.stroke();
    // 护心镜
    ctx.fillStyle = shade(c, 30);
    ctx.beginPath(); ctx.arc(0, wob + s * 0.1, s * 0.32, 0, TAU); ctx.fill();
    ctx.strokeStyle = PALETTE.blood; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(0, wob + s * 0.1, s * 0.32, 0.4, 2.7); ctx.stroke();
    // 月刃（头顶，缓慢旋转）
    ctx.save();
    ctx.translate(0, wob - s * 0.85);
    ctx.rotate(time * 1.2);
    ctx.fillStyle = '#fff6dd';
    ctx.shadowColor = PALETTE.gold; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(0, 0, s * 0.52, 0, TAU); ctx.arc(s * 0.14, 0, s * 0.44, 0, TAU, true); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
    // 头冠（武士）
    ctx.fillStyle = shade(c, 24);
    ctx.beginPath(); ctx.moveTo(-s * 0.4, wob - s * 0.7); ctx.lineTo(0, wob - s * 1.05); ctx.lineTo(s * 0.4, wob - s * 0.7); ctx.closePath(); ctx.fill();
    // 眼
    eye(ctx, -s * 0.3, wob - s * 0.3, s * 0.11);
    eye(ctx, s * 0.3, wob - s * 0.3, s * 0.11);
    // 剑鞘（腰侧）
    ctx.strokeStyle = shade(c, -20); ctx.lineWidth = s * 0.09; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(s * 0.75, wob + s * 0.2); ctx.lineTo(s * 0.55, wob + s * 1.0); ctx.stroke();
  },

  /* 噬月魔龙：龙头 + 双翼扑扇 + 长尾 + 火喉（蓄力喷火） */
  dragon(ctx, e, s, wob, fa, t, time) {
    const c = e.color;
    const ch = chargeOf(e);
    const flap = Math.sin(time * 3.2) * 0.3;
    // 双翼
    for (const side of [-1, 1]) {
      ctx.save(); ctx.rotate(side * flap * 0.5);
      ctx.fillStyle = shade(c, -6);
      ctx.beginPath();
      ctx.moveTo(side * s * 0.5, wob - s * 0.2);
      ctx.quadraticCurveTo(side * s * 1.8, wob - s * 1.2, side * s * 2.5, wob - s * 0.8);
      ctx.lineTo(side * s * 2.0, wob - s * 0.1);
      ctx.quadraticCurveTo(side * s * 1.3, wob + s * 0.2, side * s * 0.5, wob - s * 0.2);
      ctx.closePath(); ctx.fill();
      // 翼骨
      ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = s * 0.08;
      ctx.beginPath(); ctx.moveTo(side * s * 0.5, wob - s * 0.2);
      ctx.quadraticCurveTo(side * s * 1.7, wob - s * 1.0, side * s * 2.45, wob - s * 0.75); ctx.stroke();
      ctx.restore();
    }
    // 龙头
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(0, wob, s * 0.85, s * 0.7, 0, 0, TAU); ctx.fill();
    // 口鼻（前伸）
    ctx.fillStyle = shade(c, 10);
    ctx.beginPath(); ctx.ellipse(s * 0.55, wob, s * 0.5, s * 0.4, -0.1, 0, TAU); ctx.fill();
    // 火喉（口部蓄力：越接近释放越亮越大）
    const fireP = 0.3 + ch * 0.5 + Math.sin(time * 8) * (0.05 + ch * 0.1);
    ctx.fillStyle = PALETTE.ember; ctx.shadowColor = PALETTE.tangerine; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.ellipse(s * 1.0, wob + s * 0.05, s * 0.3 * fireP * 2.4, s * 0.22 * fireP * 2.4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = PALETTE.cream; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.ellipse(s * 0.92, wob + s * 0.05, s * 0.16 * fireP * 2.4, s * 0.1 * fireP * 2.4, 0, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    // 龙角
    ctx.fillStyle = PALETTE.bone;
    ctx.beginPath(); ctx.moveTo(-s * 0.4, wob - s * 0.62); ctx.lineTo(-s * 0.7, wob - s * 1.2); ctx.lineTo(-s * 0.2, wob - s * 0.8); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(s * 0.1, wob - s * 0.66); ctx.lineTo(-s * 0.05, wob - s * 1.28); ctx.lineTo(s * 0.35, wob - s * 0.85); ctx.closePath(); ctx.fill();
    // 长尾
    ctx.strokeStyle = c; ctx.lineWidth = s * 0.14; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-s * 0.7, wob + s * 0.3);
    ctx.quadraticCurveTo(-s * 1.8, wob + s * 1.0, -s * 2.2 + Math.sin(time * 3) * 4, wob + s * 0.4); ctx.stroke();
    // 眼
    eye(ctx, -s * 0.35, wob - s * 0.3, s * 0.13, PALETTE.darkCrimson);
    eye(ctx, s * 0.35, wob - s * 0.3, s * 0.13, PALETTE.darkCrimson);
  },

  /* 蚀月枭：羽翼扑扇 + 尖喙 + 电光羽毛（落雷蓄力） */
  stormOwl(ctx, e, s, wob, fa, t, time) {
    const c = e.color;
    const ch = chargeOf(e);
    const flap = Math.sin(time * 4.2) * 0.25;
    // 双翼（羽状多层）
    for (const side of [-1, 1]) {
      ctx.save(); ctx.rotate(side * flap * 0.55);
      for (let layer = 0; layer < 3; layer++) {
        ctx.fillStyle = shade(c, -6 - layer * 10);
        ctx.beginPath();
        ctx.moveTo(side * s * 0.45, wob - s * 0.1);
        ctx.quadraticCurveTo(side * s * (1.5 + layer * 0.35), wob - s * (1.0 + layer * 0.15), side * s * (1.9 + layer * 0.3), wob - s * 0.6);
        ctx.lineTo(side * s * (1.5 + layer * 0.3), wob + s * 0.1);
        ctx.quadraticCurveTo(side * s * 1.0, wob + s * 0.3, side * s * 0.45, wob - s * 0.1);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    // 身体
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(0, wob, s * 0.75, s * 0.85, 0, 0, TAU); ctx.fill();
    // 腹羽纹
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(-s * 0.35, wob + s * 0.1 + i * s * 0.2);
      ctx.quadraticCurveTo(0, wob + s * 0.28 + i * s * 0.2, s * 0.35, wob + s * 0.1 + i * s * 0.2); ctx.stroke();
    }
    // 尖喙
    ctx.fillStyle = PALETTE.bone;
    ctx.beginPath(); ctx.moveTo(0, wob - s * 0.45); ctx.lineTo(s * 0.14, wob - s * 0.85); ctx.lineTo(-s * 0.14, wob - s * 0.45); ctx.closePath(); ctx.fill();
    // 电光羽毛（蓄力时羽毛尖端放电）
    if (ch > 0) {
      ctx.globalAlpha = ch;
      ctx.strokeStyle = PALETTE.sky; ctx.lineWidth = 1.2;
      for (const side of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(side * s * 0.7, wob - s * 0.4);
        ctx.lineTo(side * s * (1.1 + ch * 0.3), wob - s * (0.6 + Math.random() * 0.3)); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    // 眼（金瞳）
    ctx.fillStyle = PALETTE.goldVivid; ctx.shadowColor = PALETTE.goldVivid; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(-s * 0.28, wob - s * 0.35, s * 0.13, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.28, wob - s * 0.35, s * 0.13, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#1a1208';
    ctx.beginPath(); ctx.arc(-s * 0.28, wob - s * 0.35, s * 0.06, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.28, wob - s * 0.35, s * 0.06, 0, TAU); ctx.fill();
  },

  /* 深渊之母：巨体 + 八触须 + 中心口器 + 眼群 */
  abyssMother(ctx, e, s, wob, fa, t, time) {
    const c = e.color;
    const ch = chargeOf(e);
    // 八触须（内弯摆动，蓄力时向中心聚拢）
    ctx.strokeStyle = c; ctx.lineWidth = s * 0.1; ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU + time * 0.3;
      const bend = ch * 0.9;   // 蓄力聚拢
      ctx.globalAlpha = 0.85;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * s * 0.8, wob + Math.sin(a) * s * 0.8);
      ctx.quadraticCurveTo(Math.cos(a + 0.2) * s * 1.6, wob + Math.sin(a + 0.2) * s * 1.6,
        Math.cos(a) * s * (2.0 - bend * 0.5) + Math.sin(time * 2 + i) * 4, wob + Math.sin(a) * s * (2.0 - bend * 0.5)); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // 巨体
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(0, wob, s * 0.95, 0, TAU); ctx.fill();
    // 体表疱群（眼群）
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * TAU + 0.6;
      const pulse = 1 + 0.1 * Math.sin(time * 3 + i * 1.4);
      ctx.fillStyle = 'rgba(255,255,255,.16)';
      ctx.beginPath(); ctx.arc(Math.cos(a) * s * 0.55, wob + Math.sin(a) * s * 0.55, s * 0.16 * pulse, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.5)';
      ctx.beginPath(); ctx.arc(Math.cos(a) * s * 0.55, wob + Math.sin(a) * s * 0.55, s * 0.07, 0, TAU); ctx.fill();
    }
    // 中心口器（多层环，蓄力张开）
    const mouth = 0.5 + ch * 0.4;
    ctx.fillStyle = '#1a0a14';
    ctx.beginPath(); ctx.arc(0, wob, s * 0.4 * mouth, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#ff6a8a'; ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.5 + ch * 0.3;
    ctx.beginPath(); ctx.arc(0, wob, s * 0.26 * mouth, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 1;
    // 尖牙环（口器内）
    ctx.fillStyle = PALETTE.bone;
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * TAU;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * s * 0.4 * mouth, wob + Math.sin(a) * s * 0.4 * mouth);
      ctx.lineTo(Math.cos(a + 0.1) * s * 0.52 * mouth, wob + Math.sin(a + 0.1) * s * 0.52 * mouth);
      ctx.lineTo(Math.cos(a - 0.1) * s * 0.52 * mouth, wob + Math.sin(a - 0.1) * s * 0.52 * mouth);
      ctx.closePath(); ctx.fill();
    }
  },

  /* 蚀月终焉：月蚀核心（渐变月轮 + 转动蚀环 + 环上眼 + 光芒脉冲） */
  final(ctx, e, s, wob, fa, t, time) {
    const ch = chargeOf(e);
    const pulse = 1 + 0.05 * Math.sin(time * 3) + ch * 0.08;
    // 外蚀环（转动，随蓄力加速）
    ctx.strokeStyle = PALETTE.ember; ctx.lineWidth = s * 0.1;
    ctx.globalAlpha = 0.7;
    ctx.setLineDash([s * 0.5, s * 0.35]);
    ctx.lineDashOffset = -time * (30 + ch * 60);
    ctx.beginPath(); ctx.arc(0, wob, s * 1.35, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    // 蚀环上的眼（3 颗，随环转动）
    for (let i = 0; i < 3; i++) {
      const a = time * (0.6 + ch * 0.8) + i / 3 * TAU;
      ctx.fillStyle = PALETTE.goldVivid; ctx.shadowColor = PALETTE.goldVivid; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(Math.cos(a) * s * 1.35, wob + Math.sin(a) * s * 1.35, s * 0.11, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
    }
    // 月轮核心（渐变：外金内炽白）
    const g = ctx.createRadialGradient(-s * 0.25, wob - s * 0.25, s * 0.1, 0, wob, s * pulse);
    g.addColorStop(0, '#fffbe8');
    g.addColorStop(0.5, PALETTE.fireBright);
    g.addColorStop(1, PALETTE.gold);
    ctx.fillStyle = g;
    ctx.shadowColor = PALETTE.gold; ctx.shadowBlur = 26;
    ctx.beginPath(); ctx.arc(0, wob, s * pulse, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    // 蚀痕（月面暗斑，缓慢转动）
    ctx.fillStyle = 'rgba(90,60,20,.5)';
    ctx.beginPath(); ctx.arc(s * 0.3, wob - s * 0.15, s * 0.3, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(90,60,20,.35)';
    ctx.beginPath(); ctx.arc(-s * 0.35, wob + s * 0.3, s * 0.2, 0, TAU); ctx.fill();
    // 中央蚀眼（蓄力时扩张）
    const eR = s * 0.16 + ch * s * 0.08;
    ctx.fillStyle = '#1a0c1c';
    ctx.beginPath(); ctx.arc(0, wob, eR, 0, TAU); ctx.fill();
    ctx.fillStyle = PALETTE.goldVivid; ctx.shadowColor = PALETTE.goldVivid; ctx.shadowBlur = 10 + ch * 8;
    ctx.beginPath(); ctx.arc(0, wob, eR * 0.45, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
  },
};

export function drawBossBody(ctx: CanvasRenderingContext2D, e: any, s: number, wob: number, fa: number, t: number, time?: number): void {
  const fn: any = BOSS_SHAPES[e.type || ''] || BOSS_SHAPES.final;
  fn(ctx, e, s, wob, fa, t, time || 0);
}
