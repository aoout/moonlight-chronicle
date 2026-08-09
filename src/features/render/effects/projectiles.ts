/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* =========================================================
   蚀月远征 · 渲染层：投射物绘制（精细化弹头与攻击特效）
   每把武器拥有专属弹头形状、尾迹与光效
   ========================================================= */
import { HALF_PI } from '../../../engine/util/utils.js';
import { PALETTE } from '../../../assets/palette.js';
import type { RenderContext } from '../context.js';
import { shapeCache } from '../shape_cache.js';

const TAU = Math.PI * 2;

/** 共享空虚线数组：setLineDash 每次传新 [] 会分配数组，热路径复用常量 */
const NO_DASH: number[] = [];

/** 需要实时动画的弹头类型（使用 pr.t 做旋转/动画，不适合缓存） */
const ANIMATED_PROJECTILE_HEADS = new Set([
  'nova', 'shadow', 'storm',
  /* 敌方异型弹头（v0.6 实装：旋转 / 闪烁 / 脉动 / 眨眼等动画） */
  'enemy_tri', 'enemy_spoke', 'enemy_rune', 'enemy_flame',
  'enemy_feather', 'enemy_eye', 'enemy_eclip', 'enemy_drop',
  'enemy_wave', 'enemy_moon', 'enemy_blade', 'enemy_egg',
]);

/* 共用小工具：发光圆点（径向渐变替代 shadowBlur） */
function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, blur = 8): void {
  ctx.save();
  // 光晕层（径向渐变）
  const glowR = r + blur * 0.5;
  const g = ctx.createRadialGradient(x, y, 0, x, y, glowR);
  g.addColorStop(0, color);
  g.addColorStop(1, 'transparent');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, glowR, 0, TAU); ctx.fill();
  // 实心核
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.restore();
}

/* 体积光晕：径向渐变发光圆（替代 shadowBlur 高频开销）
   与 bosses.ts 中的 glow 函数一致，保持项目中统一的优化模式 */
function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, a = 1): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'transparent');
  ctx.globalAlpha = a;
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}

/* =========================================================
   线性弹头（飞行方向已旋转到 x 轴）
   ========================================================= */
const PROJ_LINEAR_HEADS: Record<string, (ctx: CanvasRenderingContext2D, pr: any) => void> = {
  /* 蚀星连弩：三角箭矢 + 箭杆 + 箭头高光 */
  crossbow(ctx, pr) {
    ctx.shadowColor = pr.color; ctx.shadowBlur = 10;
    ctx.fillStyle = pr.color;
    ctx.beginPath(); ctx.moveTo(pr.r * 2.1, 0); ctx.lineTo(-pr.r * 0.55, -pr.r * 0.9); ctx.lineTo(-pr.r * 0.1, 0); ctx.lineTo(-pr.r * 0.55, pr.r * 0.9); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = pr.r * 0.34; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(pr.r * 1.1, 0); ctx.lineTo(-pr.r * 1.5, 0); ctx.stroke();
    dot(ctx, -pr.r * 1.7, 0, pr.r * 0.22, PALETTE.white, 6);   // 尾羽光点
  },

  /* 潮涌之枪：长杆 + 枪尖 + 尾羽 + 水光 */
  lance(ctx, pr) {
    ctx.shadowColor = pr.color; ctx.shadowBlur = 12;
    ctx.strokeStyle = pr.color; ctx.lineWidth = pr.r * 0.42; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(pr.r * 0.2, 0); ctx.lineTo(-pr.r * 1.7, 0); ctx.stroke();
    // 枪尖（菱形）
    ctx.fillStyle = pr.color;
    ctx.beginPath(); ctx.moveTo(pr.r * 2.4, 0); ctx.lineTo(pr.r * 0.5, -pr.r * 0.55); ctx.lineTo(pr.r * 0.9, 0); ctx.lineTo(pr.r * 0.5, pr.r * 0.55); ctx.closePath(); ctx.fill();
    // 枪尖高光
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.beginPath(); ctx.moveTo(pr.r * 2.4, 0); ctx.lineTo(pr.r * 0.5, -pr.r * 0.55); ctx.lineTo(pr.r * 0.9, 0); ctx.closePath(); ctx.fill();
    // 尾羽（双侧羽翼）
    ctx.fillStyle = pr.color;
    ctx.beginPath(); ctx.moveTo(-pr.r * 1.15, 0); ctx.lineTo(-pr.r * 1.85, -pr.r * 0.6); ctx.lineTo(-pr.r * 2.1, 0); ctx.lineTo(-pr.r * 1.85, pr.r * 0.6); ctx.closePath(); ctx.fill();
    // 水波尾迹（双波纹）
    ctx.strokeStyle = 'rgba(159,214,232,.5)'; ctx.lineWidth = pr.r * 0.18;
    ctx.beginPath(); ctx.moveTo(-pr.r * 2.2, -pr.r * 0.5); ctx.quadraticCurveTo(-pr.r * 3, -pr.r * 0.9, -pr.r * 3.8, -pr.r * 0.4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-pr.r * 2.2, pr.r * 0.5); ctx.quadraticCurveTo(-pr.r * 3, pr.r * 0.9, -pr.r * 3.8, pr.r * 0.4); ctx.stroke();
  },

  /* 破晓之辉：旋转四角星 + 白核 + 光芒 */
  nova(ctx, pr) {
    ctx.save();
    ctx.rotate(pr.t * 3);
    ctx.shadowColor = pr.color; ctx.shadowBlur = 16;
    ctx.fillStyle = pr.color;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = i * HALF_PI, rr = i % 2 === 0 ? pr.r * 1.9 : pr.r * 0.72;
      if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = PALETTE.white;
    ctx.beginPath(); ctx.arc(0, 0, pr.r * 0.5, 0, TAU); ctx.fill();
    ctx.restore();
    // 外围光芒（十字光线）
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const a = i * HALF_PI;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * pr.r * 1.4, Math.sin(a) * pr.r * 1.4);
      ctx.lineTo(Math.cos(a) * pr.r * 2.4, Math.sin(a) * pr.r * 2.4); ctx.stroke();
    }
  },

  /* 影袭之刃：旋转月牙镰 + 暗影尾迹 */
  shadow(ctx, pr) {
    ctx.save();
    ctx.rotate(pr.t * 6);
    ctx.shadowColor = pr.color; ctx.shadowBlur = 14;
    ctx.fillStyle = pr.color;
    ctx.beginPath(); ctx.arc(0, 0, pr.r, 0, TAU); ctx.arc(pr.r * 0.42, 0, pr.r * 0.72, 0, TAU, true); ctx.fill();
    // 刃口高光
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.beginPath(); ctx.arc(-pr.r * 0.26, -pr.r * 0.26, pr.r * 0.28, 0, TAU); ctx.fill();
    ctx.restore();
  },

  /* 弧光电矢：锯齿闪电 + 电弧光晕 */
  arc(ctx, pr) {
    ctx.shadowColor = pr.color; ctx.shadowBlur = 18;
    ctx.lineCap = 'round';
    // 电弧主体（锯齿蜿蜒）
    ctx.strokeStyle = pr.color; ctx.lineWidth = pr.r * 0.85;
    ctx.beginPath();
    ctx.moveTo(-pr.r * 1.3, 0);
    for (let i = 1; i <= 4; i++) {
      ctx.lineTo(-pr.r * 1.3 + (pr.r * 3.6 / 4) * i, (i % 2 === 0 ? 1 : -1) * pr.r * 0.55);
    }
    ctx.stroke();
    // 白炽芯
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = pr.r * 0.32;
    ctx.beginPath();
    ctx.moveTo(-pr.r * 1.3, 0);
    for (let i = 1; i <= 4; i++) {
      ctx.lineTo(-pr.r * 1.3 + (pr.r * 3.6 / 4) * i, (i % 2 === 0 ? 1 : -1) * pr.r * 0.55);
    }
    ctx.stroke();
    // 尖端电弧分叉
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = pr.r * 0.22;
    ctx.beginPath(); ctx.moveTo(pr.r * 2.3, pr.r * 0.55); ctx.lineTo(pr.r * 2.9, pr.r * 0.05); ctx.stroke();
    dot(ctx, pr.r * 3.1, 0, pr.r * 0.3, PALETTE.white, 10);
  },

  /* 风暴之眼：风弹（旋转双环 + 亮核 + 光晕 + 风刃） */
  storm(ctx, pr) {
    ctx.shadowColor = pr.color; ctx.shadowBlur = 12;
    ctx.strokeStyle = pr.color; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(0, 0, pr.r, 0, TAU); ctx.stroke();
    // 内环旋转
    ctx.strokeStyle = 'rgba(143,227,216,0.75)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(0, 0, pr.r * 0.55, -pr.t * 9, -pr.t * 9 + 5.2); ctx.stroke();
    // 旋转风刃（两条弧线）
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(0, 0, pr.r * 0.8, pr.t * 6, pr.t * 6 + 1.4); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, pr.r * 0.8, pr.t * 6 + 3.14, pr.t * 6 + 4.54); ctx.stroke();
    // 亮白核心（径向渐变光晕）
    const coreR = pr.r * 0.32;
    const coreG = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR + 7);
    coreG.addColorStop(0, PALETTE.white);
    coreG.addColorStop(1, 'transparent');
    ctx.fillStyle = coreG;
    ctx.beginPath(); ctx.arc(0, 0, coreR + 7, 0, TAU); ctx.fill();
    ctx.fillStyle = PALETTE.white;
    ctx.beginPath(); ctx.arc(0, 0, coreR, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(143,227,216,0.3)';
    ctx.beginPath(); ctx.arc(0, 0, pr.r * 1.25, 0, TAU); ctx.fill();
  },

  /* 月影残像：月牙弹 + 残影拖尾 */
  phantom(ctx, pr) {
    ctx.save();
    ctx.shadowColor = pr.color; ctx.shadowBlur = 14;
    // 残影1（外层虚影）
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = pr.color;
    ctx.beginPath(); ctx.translate(-pr.r * 0.8, 0); ctx.arc(0, 0, pr.r, 0, TAU); ctx.arc(pr.r * 0.42, 0, pr.r * 0.72, 0, TAU, true); ctx.fill();
    ctx.restore();
    // 残影2（内层虚影）
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = pr.color;
    ctx.beginPath(); ctx.translate(-pr.r * 0.4, 0); ctx.arc(0, 0, pr.r, 0, TAU); ctx.arc(pr.r * 0.42, 0, pr.r * 0.72, 0, TAU, true); ctx.fill();
    ctx.restore();
    // 主体（直接绘制在原点，不受 translate 影响）
    ctx.fillStyle = pr.color;
    ctx.beginPath(); ctx.arc(0, 0, pr.r, 0, TAU); ctx.arc(pr.r * 0.42, 0, pr.r * 0.72, 0, TAU, true); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.beginPath(); ctx.arc(-pr.r * 0.25, -pr.r * 0.25, pr.r * 0.3, 0, TAU); ctx.fill();
    ctx.restore();
  },

  /* =========================================================
     敌方异型弹头 · 弹幕即世界观语言（v0.6 实装）
     通用配方：径向光晕 + 双层主体 + 白芯高光 + 动态动画
     ========================================================= */
  /* 蚀潮巨兽 · 浪花弧片（弧面朝运动方向 + 白沫 + 波光芯） */
  enemy_wave(ctx, pr) {
    const R = pr.r; const arc = pr.arc ?? 0;
    ctx.rotate(arc);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 2.4);
    g.addColorStop(0, 'rgba(127,196,216,.4)'); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R * 2.4, 0, TAU); ctx.fill();
    // 浪弧外缘（青蓝）
    ctx.fillStyle = pr.color;
    ctx.beginPath();
    ctx.arc(0, 0, R, -0.6, 0.6);
    ctx.arc(0, 0, R * 0.45, 0.6, -0.6, true);
    ctx.closePath(); ctx.fill();
    // 浪花白沫（内弧）
    ctx.fillStyle = 'rgba(255,255,255,.65)';
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.78, -0.35, 0.35);
    ctx.arc(0, 0, R * 0.55, 0.35, -0.35, true);
    ctx.closePath(); ctx.fill();
    // 波光芯
    ctx.fillStyle = 'rgba(255,255,255,.95)';
    ctx.beginPath(); ctx.arc(0, 0, R * 0.26, 0, TAU); ctx.fill();
  },

  /* 潮噬之母 · 卵囊（椭卵 + 内膜纹理 + 光泽 + 临破裂裂纹） */
  enemy_egg(ctx, pr) {
    const R = pr.r; const t = pr.t || 0;
    // 临破裂预警：t 接近 splitAt 时胀大 + 裂纹（玩家可读「要炸了」）
    const k = Math.min(1, t / (pr.splitAt || 1.1));
    const swell = 1 + Math.max(0, k - 0.6) * 0.5;
    const RR = R * swell;
    const g = ctx.createRadialGradient(-RR * 0.3, -RR * 0.45, RR * 0.2, 0, 0, RR * 1.6);
    g.addColorStop(0, 'rgba(182,240,224,.5)'); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, RR * 1.6, 0, TAU); ctx.fill();
    // 卵壳
    ctx.fillStyle = pr.color;
    ctx.beginPath(); ctx.ellipse(0, 0, RR, RR * 1.35, 0, 0, TAU); ctx.fill();
    // 内膜暗纹（弧形纹理）
    ctx.strokeStyle = 'rgba(10,13,22,.35)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(0, RR * 0.15, RR * 0.62, RR * 0.95, 0, -2.2, -0.9); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, -RR * 0.1, RR * 0.5, RR * 0.8, 0, 0.9, 2.2); ctx.stroke();
    // 临破裂裂纹（从蛋顶裂开，随 k 加深）
    if (k > 0.6) {
      ctx.strokeStyle = `rgba(255,255,255,${(k - 0.6) * 2})`;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(0, -RR * 1.3);
      ctx.lineTo(RR * 0.3, -RR * 0.4);
      ctx.lineTo(RR * 0.05, RR * 0.2);
      ctx.lineTo(RR * 0.45, RR * 0.75);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-RR * 0.2, -RR * 1.1);
      ctx.lineTo(-RR * 0.5, -RR * 0.3);
      ctx.stroke();
    }
    // 光泽高光
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.beginPath(); ctx.ellipse(-RR * 0.32, -RR * 0.55, RR * 0.28, RR * 0.4, -0.4, 0, TAU); ctx.fill();
  },

  /* 潮噬之母 · 三角幼体（锯齿小虫 + 内核） */
  enemy_tri(ctx, pr) {
    const R = pr.r; const t = pr.t || 0;
    ctx.rotate(Math.sin(t * 6) * 0.3);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 2);
    g.addColorStop(0, 'rgba(127,214,164,.4)'); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R * 2, 0, TAU); ctx.fill();
    ctx.fillStyle = pr.color;
    ctx.beginPath(); ctx.moveTo(R * 1.5, 0); ctx.lineTo(-R, -R * 1.05); ctx.lineTo(-R * 0.55, 0); ctx.lineTo(-R, R * 1.05); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.beginPath(); ctx.arc(R * 0.35, 0, R * 0.32, 0, TAU); ctx.fill();
  },

  /* 蚀壳战车 · 轮辐十字（旋转辐条 + 轮毂 + 轴心光） */
  enemy_spoke(ctx, pr) {
    const R = pr.r; const t = pr.t || 0;
    ctx.rotate(t * 5);
    glow(ctx, 0, 0, R * 3, pr.color, 0.4);
    ctx.lineCap = 'round';
    // 辐条
    ctx.strokeStyle = pr.color; ctx.lineWidth = R * 0.85;
    ctx.beginPath(); ctx.moveTo(-R * 2.3, 0); ctx.lineTo(R * 2.3, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -R * 2.3); ctx.lineTo(0, R * 2.3); ctx.stroke();
    // 辐条高光
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = R * 0.28;
    ctx.beginPath(); ctx.moveTo(-R * 1.6, 0); ctx.lineTo(R * 1.6, 0); ctx.stroke();
    // 轮毂
    ctx.fillStyle = pr.color;
    ctx.beginPath(); ctx.arc(0, 0, R * 1.05, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.beginPath(); ctx.arc(0, 0, R * 0.45, 0, TAU); ctx.fill();
  },

  /* 噬月君主 · 月牙刃（刃口亮弧 + 背弧暗 + 拖刀光） */
  enemy_moon(ctx, pr) {
    const R = pr.r;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 2.4);
    g.addColorStop(0, 'rgba(180,154,232,.35)'); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R * 2.4, 0, TAU); ctx.fill();
    // 月牙本体（刃口朝 +x）
    ctx.fillStyle = pr.color;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.arc(R * 0.48, 0, R * 0.7, 0, TAU, true); ctx.fill();
    // 刃口亮边
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = R * 0.22; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, 0, R * 0.96, -1.1, 1.1); ctx.stroke();
    // 刀光拖尾（渐隐线）
    ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = R * 0.4;
    ctx.beginPath(); ctx.moveTo(-R * 1.2, 0); ctx.lineTo(-R * 2.6, 0); ctx.stroke();
  },

  /* 月影巫王 · 八角符箓（旋转符纹 + 中央咒点 + 蓄力发亮） */
  enemy_rune(ctx, pr) {
    const R = pr.r; const t = pr.t || 0;
    const charge = pr.charge ?? 0;
    ctx.rotate(t * 2.6 + charge * 3);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 2.4);
    g.addColorStop(0, 'rgba(154,134,200,.4)'); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R * 2.4, 0, TAU); ctx.fill();
    // 八角符体
    ctx.fillStyle = pr.color;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = i * TAU / 8, rr = i % 2 === 0 ? R * 1.55 : R * 0.62;
      if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill();
    // 内符圈（咒文环）
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(0, 0, R * 0.8, 0, TAU); ctx.stroke();
    // 中央咒点（蓄力时亮白）
    ctx.fillStyle = charge > 0.55 ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.45)';
    ctx.beginPath(); ctx.arc(0, 0, R * 0.32, 0, TAU); ctx.fill();
  },

  /* 断月剑豪 · 刀气弧（半圆刀气 + 白刃 + 渐宽） */
  enemy_blade(ctx, pr) {
    const R = pr.r; const t = pr.t || 0;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 1.4);
    g.addColorStop(0, 'rgba(201,184,240,.35)'); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R * 1.4, 0, TAU); ctx.fill();
    // 刀气本体（弧面朝 +x）
    ctx.fillStyle = pr.color;
    ctx.beginPath(); ctx.arc(0, 0, R, -0.85, 0.85); ctx.lineTo(R * 0.68, 0); ctx.closePath(); ctx.fill();
    // 白刃（前缘亮弧）
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = R * 0.14; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, 0, R * 0.94, -0.72, 0.72); ctx.stroke();
    // 气浪内弧
    ctx.fillStyle = 'rgba(255,255,255,.4)';
    ctx.beginPath(); ctx.arc(0, 0, R * 0.6, -0.6, 0.6); ctx.lineTo(R * 0.42, 0); ctx.closePath(); ctx.fill();
  },

  /* 裂空魔龙 · 泪滴龙焰（光晕 + 双焰层 + 白芯 + 火星尾 + 闪烁） */
  enemy_flame(ctx, pr) {
    const R = pr.r; const t = pr.t || 0;
    const flick = 1 + Math.sin(t * 13) * 0.1 + Math.sin(t * 7 + 1) * 0.06;
    const RR = R * flick;
    // 外光晕（径向渐变 + glow 替代 shadowBlur）
    glow(ctx, 0, 0, RR * 3.2, pr.color, 0.35);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, RR * 2.8);
    g.addColorStop(0, 'rgba(255,157,107,.38)'); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, RR * 2.8, 0, TAU); ctx.fill();
    // 外焰（圆头朝 +x，尖尾朝 -x）
    ctx.fillStyle = pr.color;
    ctx.beginPath();
    ctx.moveTo(RR * 0.8, 0);
    ctx.arc(0, 0, RR * 0.8, -1.3, 1.3);
    ctx.quadraticCurveTo(-RR * 0.4, RR * 0.95, -RR * 1.7, 0);
    ctx.quadraticCurveTo(-RR * 0.4, -RR * 0.95, RR * 0.8, 0);
    ctx.closePath(); ctx.fill();
    // 内焰（亮橙）
    ctx.fillStyle = '#ffb884';
    ctx.beginPath();
    ctx.moveTo(RR * 0.5, 0);
    ctx.arc(0, 0, RR * 0.5, -1.15, 1.15);
    ctx.quadraticCurveTo(-RR * 0.25, RR * 0.55, -RR * 1.05, 0);
    ctx.quadraticCurveTo(-RR * 0.25, -RR * 0.55, RR * 0.5, 0);
    ctx.closePath(); ctx.fill();
    // 白炽芯（偏前）
    ctx.fillStyle = 'rgba(255,255,255,.95)';
    ctx.beginPath(); ctx.arc(RR * 0.18, 0, RR * 0.3, 0, TAU); ctx.fill();
    // 火星尾（抖动粒子）
    ctx.fillStyle = '#ff9d6b';
    for (let i = 1; i <= 3; i++) {
      const a2 = t * 16 + i * 2.1;
      ctx.globalAlpha = 0.4 / i;
      ctx.beginPath(); ctx.arc(-RR * (1.1 + i * 0.6) + Math.sin(a2) * 2.5, Math.sin(a2 * 1.7) * RR * 0.42, RR * (0.4 - i * 0.09), 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  },

  /* 蚀雷巨枭 · 雷羽（倒三角羽 + 电弧脉动 + 白羽脊） */
  enemy_feather(ctx, pr) {
    const R = pr.r; const t = pr.t || 0;
    const pulse = 1 + Math.sin(t * 20) * 0.12;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 2.4);
    g.addColorStop(0, 'rgba(143,154,238,.4)'); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R * 2.4, 0, TAU); ctx.fill();
    // 羽体
    ctx.fillStyle = pr.color;
    ctx.beginPath(); ctx.moveTo(0, -R * 1.9 * pulse); ctx.lineTo(R * 0.85, R * 0.95); ctx.lineTo(0, R * 0.42); ctx.lineTo(-R * 0.85, R * 0.95); ctx.closePath(); ctx.fill();
    // 羽脊（白线）
    ctx.strokeStyle = 'rgba(230,240,255,.85)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(0, -R * 1.3); ctx.lineTo(0, R * 0.8); ctx.stroke();
    // 电弧尾（锯齿闪电）
    ctx.strokeStyle = 'rgba(200,230,255,.6)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-R * 0.7, -R * 1.5); ctx.lineTo(-R * 0.2, -R * 0.8); ctx.lineTo(-R * 0.75, -R * 0.3); ctx.lineTo(-R * 0.3, R * 0.3); ctx.stroke();
  },

  /* 深渊巢母 · 深渊之眼（眼白 + 竖瞳 + 注视高光 + 微追踪转向） */
  enemy_eye(ctx, pr) {
    const R = pr.r; const t = pr.t || 0;
    const blink = Math.sin(t * 1.8) > 0.985 ? 0.15 : 1;   // 偶尔眨眼
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 2.2);
    g.addColorStop(0, 'rgba(160,90,110,.4)'); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R * 2.2, 0, TAU); ctx.fill();
    // 眼白
    ctx.fillStyle = pr.color;
    ctx.beginPath(); ctx.ellipse(0, 0, R * 1.3, R * 0.82, 0, 0, TAU); ctx.fill();
    // 竖瞳
    ctx.fillStyle = '#0a0d16';
    ctx.beginPath(); ctx.ellipse(0, 0, R * 0.3, R * 0.6 * blink, 0, 0, TAU); ctx.fill();
    // 瞳孔反光（注视感）
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.beginPath(); ctx.arc(R * 0.28, -R * 0.18, R * 0.16, 0, TAU); ctx.fill();
    // 眼周血丝
    ctx.strokeStyle = 'rgba(122,40,60,.5)'; ctx.lineWidth = 0.8;
    for (let i = 0; i < 3; i++) {
      const a = -0.6 + i * 0.6;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * R * 1.3, Math.sin(a) * R * 0.82); ctx.lineTo(Math.cos(a) * R * 1.7, Math.sin(a) * R * 1.1); ctx.stroke();
    }
  },

  /* 蚀月终焉 · 蚀月环（带缺口旋转环 + 缺口光点） */
  enemy_eclip(ctx, pr) {
    const R = pr.r; const t = pr.t || 0;
    const gap = pr.gap ?? 0;
    ctx.rotate(t * 1.8);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 1.7);
    g.addColorStop(0, 'rgba(255,184,77,.3)'); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R * 1.7, 0, TAU); ctx.fill();
    // 环带（缺一段 = 月蚀）
    ctx.strokeStyle = pr.color; ctx.lineWidth = R * 0.55; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, 0, R, gap + 0.45, gap + TAU - 0.45); ctx.stroke();
    // 缺口光点（生路标记）
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.beginPath(); ctx.arc(Math.cos(gap) * R, Math.sin(gap) * R, R * 0.22, 0, TAU); ctx.fill();
    // 内缘细线
    ctx.strokeStyle = 'rgba(255,224,160,.5)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(0, 0, R * 0.72, gap + 0.8, gap + TAU - 0.8); ctx.stroke();
  },

  /* 蚀月终焉 · 血月雨滴（泪滴 + 血光 + 下落拉丝） */
  enemy_drop(ctx, pr) {
    const R = pr.r; const t = pr.t || 0;
    const g = ctx.createRadialGradient(0, R * 0.2, 0, 0, 0, R * 2.2);
    g.addColorStop(0, 'rgba(224,106,90,.4)'); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R * 2.2, 0, TAU); ctx.fill();
    ctx.fillStyle = pr.color;
    ctx.beginPath(); ctx.moveTo(0, -R * 1.5);
    ctx.bezierCurveTo(R * 0.95, -R * 0.1, R * 0.95, R * 1.0, 0, R);
    ctx.bezierCurveTo(-R * 0.95, R * 1.0, -R * 0.95, -R * 0.1, 0, -R * 1.5); ctx.fill();
    // 血光高光
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.beginPath(); ctx.arc(-R * 0.3, -R * 0.35, R * 0.22, 0, TAU); ctx.fill();
    // 下落拉丝（尾部渐隐）
    ctx.fillStyle = 'rgba(224,106,90,.35)';
    ctx.beginPath(); ctx.moveTo(-R * 0.3, R * 0.8); ctx.lineTo(R * 0.1, R * 1.8 + Math.sin(t * 20) * 2); ctx.lineTo(R * 0.3, R * 0.8); ctx.closePath(); ctx.fill();
  },

  _default(ctx, pr) {
    // 基础光球：光晕（径向渐变）+ 高光 + 呼吸
    const glowR = pr.r + 6;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, glowR);
    g.addColorStop(0, pr.color);
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, glowR, 0, TAU); ctx.fill();
    ctx.fillStyle = pr.color;
    ctx.beginPath(); ctx.arc(0, 0, pr.r, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.beginPath(); ctx.arc(-pr.r * 0.25, -pr.r * 0.25, pr.r * 0.38, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, pr.r * 1.3, 0, TAU); ctx.stroke();
  },
};

/* =========================================================
   特殊投射物渲染
   ========================================================= */
const PROJ_RENDER: Record<string, (ctx: CanvasRenderingContext2D, pr: any) => void> = {
  /* 陨星：落点预警（旋转火环 + 内焰 + 火星） */
  meteor(ctx, pr) {
    const k = Math.min(1, pr.t / pr.delay);
    ctx.globalAlpha = 0.3 + 0.7 * k;
    // 旋转火环（虚线转动）
    ctx.save();
    ctx.setLineDash([12, 9]);
    ctx.lineDashOffset = -pr.t * 70;
    ctx.strokeStyle = PALETTE.fire; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.arc(0, 0, 10 + pr.t * 30, 0, TAU);
    glow(ctx, 0, 0, 10 + pr.t * 30 + 8, PALETTE.hot, 0.4);
    ctx.stroke();
    ctx.restore();
    ctx.setLineDash(NO_DASH);
    // 内焰
    ctx.fillStyle = 'rgba(255,107,107,.2)';
    ctx.beginPath(); ctx.arc(0, 0, 8 + pr.t * 26, 0, TAU); ctx.fill();
    // 火星（随机游走亮点）
    for (let i = 0; i < 3; i++) {
      const a = pr.t * 5 + i * 2.1;
      dot(ctx, Math.cos(a) * (14 + pr.t * 34), Math.sin(a) * (14 + pr.t * 34), 1.6, PALETTE.peach, 4);
    }
  },

  /* 蚀潮之锚：落点预警（旋转潮环 + 深潮涡心 + 潮涌波纹 + 水泡上浮） */
  tide(ctx, pr) {
    const k = Math.min(1, pr.t / (pr.delay || 0.5));
    ctx.globalAlpha = 0.3 + 0.7 * k;
    // 1. 旋转潮环（青绿虚线，回旋如漩涡）
    ctx.save();
    ctx.setLineDash([11, 8]);
    ctx.lineDashOffset = -pr.t * 55;
    ctx.strokeStyle = PALETTE.tide; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(0, 0, 10 + pr.t * 30, 0, TAU);
    glow(ctx, 0, 0, 10 + pr.t * 30 + 8, PALETTE.tide, 0.4);
    ctx.stroke();
    ctx.restore();
    ctx.setLineDash(NO_DASH);
    // 2. 深潮涡心
    ctx.fillStyle = 'rgba(44,93,104,.28)';
    ctx.beginPath(); ctx.arc(0, 0, 8 + pr.t * 26, 0, TAU); ctx.fill();
    // 3. 潮涌波纹（白色小弧，旋转如潮汐）
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = PALETTE.iceLight; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.arc(0, 0, 6 + pr.t * 20, pr.t * 3, pr.t * 3 + 1.5); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 6 + pr.t * 20, pr.t * 3 + 3.14, pr.t * 3 + 4.6); ctx.stroke();
    // 4. 水泡上浮（青白气泡）
    ctx.globalAlpha = 0.8;
    for (let i = 0; i < 4; i++) {
      const a = pr.t * 4 + i * HALF_PI;
      const rr = 13 + pr.t * 32;
      const by = -Math.abs(Math.sin(pr.t * 3.2 + i * 1.3)) * 7;
      dot(ctx, Math.cos(a) * rr, Math.sin(a) * rr + by, 1.6, PALETTE.iceWhite, 4);
    }
    // 5. 中心潮核
    ctx.globalAlpha = 1;
    dot(ctx, 0, 0, 2.4, '#dff7f2', 9);
    ctx.shadowBlur = 0;
  },

  /* 辉光审判：落点预警（旋转裁决光环 + 圣辉涡心 + 裁决十字 + 上升光尘） */
  judge(ctx, pr) {
    const k = Math.min(1, pr.t / (pr.delay || 0.5));
    ctx.globalAlpha = 0.3 + 0.7 * k;
    // 1. 旋转裁决光环（金辉虚线外环 + 淡金内环反向转动）
    ctx.save();
    ctx.setLineDash([10, 7]);
    ctx.lineDashOffset = -pr.t * 60;
    ctx.strokeStyle = PALETTE.goldBright; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.arc(0, 0, 10 + pr.t * 30, 0, TAU);
    glow(ctx, 0, 0, 10 + pr.t * 30 + 8, PALETTE.goldBright, 0.4);
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.setLineDash([4, 9]);
    ctx.lineDashOffset = pr.t * 40;
    ctx.strokeStyle = PALETTE.goldPale; ctx.lineWidth = 1.6;
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(0, 0, 17 + pr.t * 34, 0, TAU); ctx.stroke();
    ctx.restore();
    ctx.setLineDash(NO_DASH);
    // 2. 圣辉涡心
    ctx.fillStyle = 'rgba(233,201,135,.22)';
    ctx.beginPath(); ctx.arc(0, 0, 8 + pr.t * 26, 0, TAU); ctx.fill();
    // 3. 裁决十字（四芒圣光，随蓄力张放）
    ctx.strokeStyle = 'rgba(255,255,255,.65)'; ctx.lineWidth = 1.5;
    const cr = 14 + pr.t * 26;
    ctx.beginPath();
    ctx.moveTo(0, -cr); ctx.lineTo(0, cr);
    ctx.moveTo(-cr, 0); ctx.lineTo(cr, 0);
    ctx.stroke();
    // 4. 上升光尘（金色光点随蓄力升起）
    ctx.globalAlpha = 0.85;
    for (let i = 0; i < 4; i++) {
      const a = pr.t * 4 + i * HALF_PI;
      const rr = 13 + pr.t * 30;
      const by = -Math.abs(Math.sin(pr.t * 3.4 + i * 1.2)) * 8;
      dot(ctx, Math.cos(a) * rr, Math.sin(a) * rr + by, 1.7, PALETTE.goldPale, 5);
    }
    // 5. 中心辉核
    ctx.globalAlpha = 1;
    dot(ctx, 0, 0, 2.6, PALETTE.white, 10);
    ctx.shadowBlur = 0;
  },

  /* 月光束：脉动光柱（呼吸宽窄 + 三层光 + 光束粒子） */
  beam(ctx, pr) {
    const dx = Math.cos(pr.dir), dy = Math.sin(pr.dir);
    ctx.translate(-pr.x, -pr.y);
    const a = Math.max(0, 1 - pr.t / pr.dur);
    const pulse = 1 + Math.sin(pr.t * 26) * 0.1;   // 脉动
    // 外层柔光（径向渐变光晕替代 shadowBlur）
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    glow(ctx, pr.x, pr.y, pr.width * 2.5 * pulse + 10, pr.color, a * 0.4);
    ctx.restore();
    ctx.globalAlpha = a * 0.4;
    ctx.strokeStyle = pr.color; ctx.lineWidth = pr.width * 2.5 * pulse;
    ctx.beginPath(); ctx.moveTo(pr.x, pr.y); ctx.lineTo(pr.x + dx * pr.range, pr.y + dy * pr.range); ctx.stroke();
    // 主光柱
    ctx.globalAlpha = a;
    ctx.strokeStyle = pr.color; ctx.lineWidth = pr.width * pulse;
    ctx.beginPath(); ctx.moveTo(pr.x, pr.y); ctx.lineTo(pr.x + dx * pr.range, pr.y + dy * pr.range); ctx.stroke();
    // 白炽芯
    ctx.strokeStyle = PALETTE.white; ctx.lineWidth = 3.2;
    ctx.stroke();
    // 光柱内的流转粒子
    ctx.globalAlpha = a * 0.7;
    for (let i = 0; i < 3; i++) {
      const u = ((pr.t * 0.9 + i * 0.33) % 1);
      dot(ctx, pr.x + dx * pr.range * u, pr.y + dy * pr.range * u, 2, PALETTE.white, 6);
    }
  },

  /* 月辉回刃：旋转月牙 + 刃光渐变 + 尾迹星尘 */
  boomerang(ctx, pr) {
    ctx.rotate(pr.spin);
    glow(ctx, 0, 0, pr.r * 1.5, pr.color, 0.35);
    // 渐变月牙（外白内金）
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, pr.r * 1.3);
    grad.addColorStop(0, 'rgba(255,255,255,.85)');
    grad.addColorStop(0.55, pr.color);
    grad.addColorStop(1, pr.color);
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(0, 0, pr.r, 0, TAU); ctx.arc(pr.r * 0.45, 0, pr.r * 0.62, 0, TAU, true); ctx.fill();
    // 外刃白线
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.arc(0, 0, pr.r * 0.97, -1.25, 1.25); ctx.stroke();
    // 内刃光
    ctx.strokeStyle = 'rgba(233,201,135,.7)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, pr.r * 0.62, 2.5, 4.4); ctx.stroke();
    // 尾迹星尘（随旋转拖出）
    ctx.globalAlpha = 0.5;
    dot(ctx, -pr.r * 1.1, Math.sin(pr.spin * 3) * pr.r * 0.5, 1.4, pr.color, 5);
    ctx.globalAlpha = 1;
  },

  /* 酸雾（深渊巢母）：扩散腐蚀绿雾（雾团 + 毒泡 + 腐蚀波纹） */
  mist(ctx, pr) {
    const k = pr.maxR > 0 ? pr.r / pr.maxR : 0;
    // 雾团（多层半透明）
    ctx.globalAlpha = 0.16 + k * 0.14;
    ctx.fillStyle = pr.color;
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * TAU + pr.t * 0.6;
      ctx.beginPath(); ctx.arc(Math.cos(a) * pr.r * 0.55, Math.sin(a) * pr.r * 0.55, pr.r * 0.5, 0, TAU); ctx.fill();
    }
    // 毒雾外层光晕（径向渐变替代 shadowBlur）
    glow(ctx, 0, 0, pr.r + 10, PALETTE.green, 0.2);
    ctx.globalAlpha = 0.3 + k * 0.25;
    ctx.strokeStyle = PALETTE.paleGreen; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, pr.r, 0, TAU); ctx.stroke();
    // 毒泡（上浮）
    for (let i = 0; i < 5; i++) {
      const a = i * 1.26 + pr.t * 0.4;
      const rr = pr.r * (0.2 + ((i * 37) % 60) / 80);
      const by = -Math.abs(Math.sin(pr.t * 1.5 + i)) * pr.r * 0.3;
      ctx.fillStyle = 'rgba(208,245,176,.5)';
      ctx.beginPath(); ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr + by, 2 + (i % 3), 0, TAU); ctx.fill();
    }
    // 腐蚀波纹
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = PALETTE.paleGreen; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(0, 0, pr.r * 0.7, pr.t * 2, pr.t * 2 + 1.6); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  },

  /* 霜环：扩散冰环（双层环 + 冰晶散落 + 霜纹） */
  aoe(ctx, pr) {
    const fade = Math.max(0.25, 1 - pr.r / pr.maxR);
    ctx.globalAlpha = fade;
    ctx.strokeStyle = pr.color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, pr.r, 0, TAU);
    glow(ctx, 0, 0, pr.r + 8, pr.color, 0.3);
    ctx.stroke();
    // 内层冰纹
    ctx.strokeStyle = PALETTE.white; ctx.lineWidth = 1.2; ctx.globalAlpha = fade * 0.6;
    ctx.beginPath(); ctx.arc(0, 0, pr.r * 0.85, 0, TAU); ctx.stroke();
    // 冰晶颗粒（沿环随机分布，随扩散漂移）
    ctx.globalAlpha = fade;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + pr.t * 1.2;
      const rr = pr.r * (0.75 + ((i * 37) % 10) / 32);
      dot(ctx, Math.cos(a) * rr, Math.sin(a) * rr, 1.5, '#cfeefb', 4);
    }
    ctx.globalAlpha = 1;
  },

  /* 蚀潮水域：落点遗留的潮汐区域（水面 + 旋转潮纹 + 上浮气泡 + 潮压涟漪） */
  tidePool(ctx, pr) {
    const R = pr.aoe || 110;
    const tt = pr.poolT || 0;
    const dur = pr.poolDur || 2.4;
    const fade = Math.max(0, 1 - tt / dur);            // 水域临散时淡出
    const tick = pr.poolTick || 0.6;
    const phase = (tt % tick) / tick;                  // 潮压脉冲相位 0→1
    // 1. 水面（半透明青色，随 fade 淡出）
    ctx.globalAlpha = 0.16 + 0.1 * fade;
    ctx.fillStyle = '#2c5d68';
    ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
    // 2. 旋转潮纹（双层虚线，反方向回转如漩涡）
    ctx.save();
    ctx.setLineDash([10, 8]);
    ctx.lineDashOffset = -tt * 40;
    ctx.strokeStyle = 'rgba(159,214,232,0.55)'; ctx.lineWidth = 1.8;
    ctx.globalAlpha = fade;
    ctx.beginPath(); ctx.arc(0, 0, R * 0.88, 0, TAU);
    glow(ctx, 0, 0, R * 0.88 + 6, PALETTE.tide, 0.3);
    ctx.stroke();
    ctx.setLineDash([5, 10]);
    ctx.lineDashOffset = tt * 26;
    ctx.strokeStyle = 'rgba(223,247,242,0.4)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(0, 0, R * 0.62, 0, TAU); ctx.stroke();
    ctx.restore();
    // 3. 潮压涟漪（每次冲击向外扩散的亮环）
    ctx.globalAlpha = fade * (1 - phase) * 0.85;
    ctx.strokeStyle = PALETTE.iceLight; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(0, 0, R * (0.25 + phase * 0.75), 0, TAU);
    glow(ctx, 0, 0, R * (0.25 + phase * 0.75) + 8, PALETTE.iceLight, 0.3);
    ctx.stroke();
    ctx.globalAlpha = fade * (1 - phase) * 0.5;
    ctx.beginPath(); ctx.arc(0, 0, R * (0.1 + phase * 0.9), 0, TAU); ctx.stroke();
    ctx.shadowBlur = 0;
    // 4. 上浮气泡（沿径向漂浮）
    ctx.globalAlpha = fade * 0.7;
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + tt * 0.4;
      const rr = R * (0.15 + ((i * 41) % 55) / 70);
      const by = -Math.abs(Math.sin(tt * 1.6 + i * 1.7)) * R * 0.28;
      dot(ctx, Math.cos(a) * rr, Math.sin(a) * rr + by, 1.2 + (i % 3) * 0.7, PALETTE.iceWhite, 4);
    }
    // 5. 中心潮眼（缓慢呼吸）
    const br = R * 0.12 * (1 + Math.sin(tt * 3) * 0.25);
    ctx.globalAlpha = fade * 0.5;
    ctx.fillStyle = '#dff7f2';
    ctx.beginPath(); ctx.arc(0, 0, br, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  },

  /* 线性弹：尾迹（渐变双层）+ 弹头 */
  linear(ctx, pr) {
    const ang = pr.homing && pr.target
      ? Math.atan2(pr.target.y - pr.y, pr.target.x - pr.x)
      : Math.atan2(pr.vy || 0, pr.vx || 0);
    ctx.rotate(ang);
    const len = pr.trail ? pr.r * 5 : pr.r * 3;
    ctx.lineCap = 'round';
    // 尾迹：外柔光（宽低透明度，替代 shadowBlur）+ 内亮核
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = pr.color; ctx.lineWidth = pr.r * 3;
    ctx.beginPath(); ctx.moveTo(-len, 0); ctx.lineTo(0, 0); ctx.stroke();
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = pr.color; ctx.lineWidth = pr.r * 1.5;
    ctx.beginPath(); ctx.moveTo(-len, 0); ctx.lineTo(0, 0); ctx.stroke();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = pr.color; ctx.lineWidth = pr.r * 0.85;
    ctx.beginPath(); ctx.moveTo(-len * 0.7, 0); ctx.lineTo(0, 0); ctx.stroke();
    ctx.globalAlpha = 1;
    // 弹头（使用离屏缓存，对不含时间动画的弹头类型）
    const wId = pr.wId || 'default';
    if (ANIMATED_PROJECTILE_HEADS.has(wId)) {
      const head = PROJ_LINEAR_HEADS[wId] || PROJ_LINEAR_HEADS._default;
      head(ctx, pr);
    } else {
      const cacheKey = 'proj_head_' + wId + '_' + (pr.color || PALETTE.white) + '_' + Math.round(pr.r * 10);
      const cacheSize = Math.ceil(pr.r * 4) + 20;
      const cached = shapeCache.get(cacheKey, cacheSize, cacheSize, (bctx) => {
        bctx.translate(cacheSize / 2, cacheSize / 2);
        const head = PROJ_LINEAR_HEADS[wId] || PROJ_LINEAR_HEADS._default;
        head(bctx, pr);
      });
      ctx.drawImage(cached, -cacheSize / 2, -cacheSize / 2);
    }
  },

  enemy(ctx, pr) {
    const ang = Math.atan2(pr.vy || 0, pr.vx || 0);
    // 技能专属弹头
    if (pr.moonblade) {
      // 月牙斩/三连斩：旋转月牙刃
      ctx.save(); ctx.rotate(ang + pr.t * 6);
      glow(ctx, 0, 0, pr.r * 2.5, pr.color, 0.4);
      ctx.fillStyle = pr.color;
      ctx.beginPath(); ctx.arc(0, 0, pr.r, 0, TAU); ctx.arc(pr.r * 0.42, 0, pr.r * 0.7, 0, TAU, true); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      ctx.beginPath(); ctx.arc(-pr.r * 0.25, -pr.r * 0.25, pr.r * 0.3, 0, TAU); ctx.fill();
      ctx.restore();
      return;
    }
    if (pr.wave) {
      // 潮浪水弹：水泡（外环 + 波光 + 内芯 + 水尾）
      ctx.save(); ctx.rotate(ang);
      glow(ctx, 0, 0, pr.r * 2.5, pr.color, 0.35);
      ctx.strokeStyle = pr.color; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 0, pr.r, 0, TAU); ctx.stroke();
      ctx.fillStyle = 'rgba(159,214,232,.35)';
      ctx.beginPath(); ctx.arc(0, 0, pr.r * 0.72, 0, TAU); ctx.fill();
      ctx.fillStyle = PALETTE.white;
      ctx.beginPath(); ctx.arc(-pr.r * 0.2, -pr.r * 0.2, pr.r * 0.28, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(159,214,232,.5)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-pr.r, 0); ctx.lineTo(-pr.r * 2.4, 0); ctx.stroke();
      ctx.restore();
      return;
    }
    if (pr.ember) {
      // 赤潮火弹：焰心（外焰 + 白核 + 焰尾）
      glow(ctx, 0, 0, pr.r * 2.5, pr.color, 0.4);
      ctx.fillStyle = pr.color;
      ctx.beginPath(); ctx.arc(0, 0, pr.r, 0, TAU); ctx.fill();
      ctx.fillStyle = PALETTE.fireBright;
      ctx.beginPath(); ctx.arc(0, 0, pr.r * 0.55, 0, TAU); ctx.fill();
      ctx.fillStyle = PALETTE.white;
      ctx.beginPath(); ctx.arc(0, 0, pr.r * 0.28, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,157,107,.6)';
      ctx.beginPath(); ctx.moveTo(-pr.r * 0.7, -pr.r * 0.5); ctx.lineTo(-pr.r * 2.2, 0); ctx.lineTo(-pr.r * 0.7, pr.r * 0.5); ctx.closePath(); ctx.fill();
      return;
    }
    if (pr.pulse) {
      // 蚀月脉冲：旋转金色星芒
      ctx.save(); ctx.rotate(pr.t * 8);
      glow(ctx, 0, 0, pr.r * 2.5, pr.color, 0.35);
      ctx.fillStyle = pr.color;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = i * HALF_PI, rr = i % 2 === 0 ? pr.r * 1.6 : pr.r * 0.6;
        if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
        else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = PALETTE.white;
      ctx.beginPath(); ctx.arc(0, 0, pr.r * 0.4, 0, TAU); ctx.fill();
      ctx.restore();
      return;
    }
    if (pr.orb) {
      // 暗影追踪球：紫雾球（暗核 + 紫光 + 暗尾）
      glow(ctx, 0, 0, pr.r * 2.5, pr.color, 0.4);
      ctx.fillStyle = '#2a1a3a';
      ctx.beginPath(); ctx.arc(0, 0, pr.r, 0, TAU); ctx.fill();
      ctx.fillStyle = pr.color;
      ctx.beginPath(); ctx.arc(0, 0, pr.r * 0.6, 0, TAU); ctx.fill();
      ctx.fillStyle = '#e0d4ff';
      ctx.beginPath(); ctx.arc(-pr.r * 0.2, -pr.r * 0.2, pr.r * 0.25, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(122,109,158,.5)';
      ctx.beginPath(); ctx.moveTo(-pr.r * 0.6, -pr.r * 0.4); ctx.lineTo(-pr.r * 2.4, 0); ctx.lineTo(-pr.r * 0.6, pr.r * 0.4); ctx.closePath(); ctx.fill();
      return;
    }
    // 蚀涎魔毒弹：亮绿毒涎（光晕 + 毒液滴 + 拉丝拖尾）
    if (pr.spit) {
      ctx.save(); ctx.rotate(ang);
      glow(ctx, 0, 0, pr.r * 2.5, PALETTE.jade, 0.35);
      ctx.fillStyle = pr.color;
      ctx.beginPath(); ctx.ellipse(0, 0, pr.r * 1.2, pr.r * 0.85, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = PALETTE.mistyGreen;
      ctx.beginPath(); ctx.arc(-pr.r * 0.25, -pr.r * 0.22, pr.r * 0.36, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(127,214,164,.6)';
      ctx.beginPath(); ctx.moveTo(-pr.r * 0.9, 0); ctx.lineTo(-pr.r * 2.6, pr.r * 0.14); ctx.lineTo(-pr.r * 0.9, pr.r * 0.44); ctx.closePath(); ctx.fill();
      ctx.restore();
      return;
    }
    // 通用敌弹：尖刺弹
    ctx.save(); ctx.rotate(ang);
    glow(ctx, 0, 0, pr.r * 2.5, pr.color, 0.3);
    ctx.fillStyle = pr.color;
    ctx.beginPath(); ctx.arc(0, 0, pr.r, 0, TAU); ctx.fill();
    ctx.fillStyle = PALETTE.coralBright;
    ctx.beginPath(); ctx.arc(-pr.r * 0.2, -pr.r * 0.2, pr.r * 0.35, 0, TAU); ctx.fill();
    ctx.fillStyle = pr.color;
    ctx.beginPath(); ctx.moveTo(-pr.r, -pr.r * 0.5); ctx.lineTo(-pr.r * 2.2, 0); ctx.lineTo(-pr.r, pr.r * 0.5); ctx.closePath(); ctx.fill();
    ctx.restore();
  },

  dot(ctx, pr) {
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, pr.r + 6);
    g.addColorStop(0, pr.color);
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, pr.r + 6, 0, TAU); ctx.fill();
    ctx.fillStyle = pr.color;
    ctx.beginPath(); ctx.arc(0, 0, pr.r, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath(); ctx.arc(-pr.r * 0.25, -pr.r * 0.25, pr.r * 0.35, 0, TAU); ctx.fill();
  },

  /* 蚀涎酸弹：毒液滴（绿核 + 外光 + 拉丝拖尾） */
  acid(ctx, pr) {
    const ang = Math.atan2(pr.vy || 0, pr.vx || 0);
    ctx.save(); ctx.rotate(ang);
    glow(ctx, 0, 0, pr.r * 2.5, pr.color, 0.35);
    ctx.fillStyle = pr.color;
    ctx.beginPath(); ctx.ellipse(0, 0, pr.r * 1.15, pr.r * 0.8, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = PALETTE.mistyGreen;
    ctx.beginPath(); ctx.arc(-pr.r * 0.25, -pr.r * 0.22, pr.r * 0.34, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(127,214,164,.55)';
    ctx.beginPath(); ctx.moveTo(-pr.r * 0.9, 0); ctx.lineTo(-pr.r * 2.3, pr.r * 0.12); ctx.lineTo(-pr.r * 0.9, pr.r * 0.4); ctx.closePath(); ctx.fill();
    ctx.restore();
  },

  /* 地面延迟：蚀痕（裂口魔犁月灼痕）/ 落雷电纹 / 普通预警圈 */
  ground(ctx, pr) {
    const k = Math.min(1, pr.t / (pr.delay || 0.8));
    if (pr.erode) {
      drawErodeMark(ctx, pr, k);
      return;
    }
    if (pr.lightning) {
      // 蚀雷落点：紫色电纹圈 + 雷云闪光
      ctx.globalAlpha = 0.3 + 0.7 * k;
      glow(ctx, 0, 0, pr.r + 10, PALETTE.sky, 0.3);
      ctx.strokeStyle = pr.color; ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.lineDashOffset = -pr.t * 40;
      ctx.beginPath(); ctx.arc(0, 0, pr.r, 0, TAU); ctx.stroke();
      ctx.setLineDash(NO_DASH);
      // 内部电光
      ctx.fillStyle = 'rgba(168,216,255,.15)';
      ctx.beginPath(); ctx.arc(0, 0, pr.r * 0.8, 0, TAU); ctx.fill();
      // 电弧乱窜
      ctx.strokeStyle = '#cfe4ff'; ctx.lineWidth = 1.2;
      for (let i = 0; i < 3; i++) {
        const a = pr.t * 8 + i * 2.1;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * pr.r * 0.7, Math.sin(a) * pr.r * 0.7);
        ctx.lineTo(Math.cos(a + 0.3) * pr.r * 0.95 + (Math.random() - 0.5) * 8, Math.sin(a + 0.3) * pr.r * 0.95 + (Math.random() - 0.5) * 8);
        ctx.stroke();
      }
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      return;
    }
    ctx.globalAlpha = 0.35 + 0.65 * k;
    glow(ctx, 0, 0, pr.r + 10, pr.color, 0.3);
    ctx.strokeStyle = pr.color; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 0, pr.r, 0, TAU); ctx.stroke();
    ctx.fillStyle = pr.color; ctx.globalAlpha = 0.18 + 0.3 * k;
    ctx.beginPath(); ctx.arc(0, 0, pr.r, 0, TAU); ctx.fill();
  },

  /* 裂空魔龙 · 龙息（多层锥形火焰 + 滚动火舌 + 白炽根部） */
  breath(ctx, pr) {
    const k = Math.max(0, 1 - pr.t / pr.dur);
    const ang = pr.dir || 0;
    // 用 ?? 而非 ||：合法 0 值（如 range=0 表示无距离）不应被替换为默认值
    const len = pr.range ?? 260;
    const w = pr.width ?? 58;
    ctx.save();
    ctx.rotate(ang);
    ctx.globalAlpha = k;
    // 外焰底层（滚动的火舌轮廓，sin 双相扰动）
    const g0 = ctx.createLinearGradient(0, 0, len, 0);
    g0.addColorStop(0, 'rgba(226,84,106,.9)');
    g0.addColorStop(0.65, 'rgba(255,157,107,.65)');
    g0.addColorStop(1, 'rgba(255,184,132,0)');
    ctx.fillStyle = g0;
    ctx.beginPath();
    ctx.moveTo(0, -w);
    for (let i = 0; i <= 14; i++) {
      const x = i / 14 * len;
      const yy = -((w * (1 - i / 14 * 0.45)) * (0.72 + 0.28 * Math.sin(pr.t * 34 + i * 1.2)));
      ctx.lineTo(x, yy);
    }
    ctx.lineTo(len * 0.9, 0);
    for (let i = 14; i >= 0; i--) {
      const x = i / 14 * len;
      const yy = (w * (1 - i / 14 * 0.45)) * (0.72 + 0.28 * Math.sin(pr.t * 34 + i * 1.2 + 1.9));
      ctx.lineTo(x, yy);
    }
    ctx.closePath(); ctx.fill();
    // 中焰（亮橙，较短）
    const g1 = ctx.createLinearGradient(0, 0, len * 0.75, 0);
    g1.addColorStop(0, 'rgba(255,157,107,.95)');
    g1.addColorStop(1, 'rgba(255,184,132,0)');
    ctx.fillStyle = g1;
    ctx.beginPath();
    ctx.moveTo(0, -w * 0.55);
    ctx.quadraticCurveTo(len * 0.45, -w * 0.5, len * 0.78, 0);
    ctx.quadraticCurveTo(len * 0.45, w * 0.5, 0, w * 0.55);
    ctx.closePath(); ctx.fill();
    // 内焰白炽芯
    const g2 = ctx.createLinearGradient(0, 0, len * 0.5, 0);
    g2.addColorStop(0, 'rgba(255,240,200,.95)');
    g2.addColorStop(1, 'rgba(255,224,160,0)');
    ctx.fillStyle = g2;
    ctx.beginPath();
    ctx.moveTo(0, -w * 0.28);
    ctx.quadraticCurveTo(len * 0.3, -w * 0.24, len * 0.55, 0);
    ctx.quadraticCurveTo(len * 0.3, w * 0.24, 0, w * 0.28);
    ctx.closePath(); ctx.fill();
    // 根部白炽
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.beginPath(); ctx.arc(0, 0, w * 0.34, 0, TAU); ctx.fill();
    // 火星飞溅
    ctx.fillStyle = '#ffb884';
    for (let i = 0; i < 3; i++) {
      const a2 = pr.t * 24 + i * 2.4;
      ctx.globalAlpha = k * 0.5;
      ctx.beginPath(); ctx.arc(Math.cos(a2 * 1.3) * len * 0.3, Math.sin(a2 * 1.7) * w * 0.8, 2 + i, 0, TAU); ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  },
};

export function drawProjectiles(rc: RenderContext): void {
  const ctx = rc.ctx;
  if (!ctx) return;
  for (const pr of rc.projectiles) {
    if (pr.dead) continue;
    ctx.save();
    ctx.translate(pr.x, pr.y);
    if (pr.meteor) PROJ_RENDER.meteor(ctx, pr);
    else if (pr.tide) PROJ_RENDER.tide(ctx, pr);
    else if (pr.tidePool) PROJ_RENDER.tidePool(ctx, pr);
    else if (pr.judge) PROJ_RENDER.judge(ctx, pr);
    else if (pr.acid) PROJ_RENDER.acid(ctx, pr);
    else if (pr.ground) PROJ_RENDER.ground(ctx, pr);
    else if (pr.breath) PROJ_RENDER.breath(ctx, pr);
    else if (pr.aoe && pr.enemy) PROJ_RENDER.mist(ctx, pr);
    else if (pr.beam) PROJ_RENDER.beam(ctx, pr);
    else if (pr.boomerang) PROJ_RENDER.boomerang(ctx, pr);
    else if (pr.aoe && !pr.enemy) PROJ_RENDER.aoe(ctx, pr);
    else if (pr.vx !== undefined || pr.dir !== undefined) PROJ_RENDER.linear(ctx, pr);
    else if (pr.enemy) PROJ_RENDER.enemy(ctx, pr);
    else PROJ_RENDER.dot(ctx, pr);
    ctx.restore();
  }
}

/* =========================================================
   蚀痕 · 裂口魔犁月灼痕
   不规则的蚀火裂口：由暗红细纹 → 蚀火渗出 → 白炽将喷
   ========================================================= */
function drawErodeMark(ctx: CanvasRenderingContext2D, pr: any, k: number): void {
  const R = pr.r || 44;
  const t = pr.t || 0;
  const wob = 0.06 + k * 0.14;                 // 裂纹不规则度随蓄能增强
  // 1. 焦黑内芯（燃烧后的暗心）
  ctx.fillStyle = 'rgba(18,4,4,' + (0.3 + k * 0.35).toFixed(2) + ')';
  ctx.beginPath(); ctx.arc(0, 0, R * 0.55, 0, TAU); ctx.fill();
  // 蚀火辉光（径向渐变替代 shadowBlur）
  glow(ctx, 0, 0, R * (0.8 + k * 0.4), pr.color, 0.3 + k * 0.3);
  // 2. 不规则蚀火裂纹（锯齿状，随时间扩张、抖动）
  const edge = k > 0.72 ? PALETTE.peach : pr.color;
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.6 + k * 1.4;
  ctx.beginPath();
  const n = 15;
  for (let i = 0; i <= n; i++) {
    const a = i / n * TAU;
    const rr = R * (1 + Math.sin(a * 5 + t * 22) * wob + Math.sin(a * 3 + 1.7 + t * 9) * wob * 0.5);
    if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.stroke();
  ctx.shadowBlur = 0;
  // 3. 辐射蚀纹（向地层蔓延的细裂纹）
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * TAU + t * 1.6;
    const len = R * (0.22 + k * 0.4) * (0.6 + 0.4 * Math.sin(t * 9 + i * 2.4));
    ctx.strokeStyle = 'rgba(255,122,122,' + (0.22 + k * 0.3).toFixed(2) + ')';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * R * 0.8, Math.sin(a) * R * 0.8);
    ctx.lineTo(Math.cos(a) * (R * 0.8 + len), Math.sin(a) * (R * 0.8 + len));
    ctx.stroke();
  }
  // 4. 蚀火星（沿裂口翻涌的灼星）
  for (let i = 0; i < 3; i++) {
    const a = t * 7 + i * 2.1;
    const rr = R * (0.5 + 0.4 * Math.sin(t * 4 + i * 1.8));
    const sy = Math.sin(t * 11 + i * 3) * R * 0.14;
    ctx.fillStyle = 'rgba(255,' + (170 + 60 * Math.abs(Math.sin(t * 8 + i))) + ',110,.75)';
    ctx.beginPath(); ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr + sy, 1.5 + k * 1.3, 0, TAU); ctx.fill();
  }
  // 5. 临喷发白炽脉冲（k>0.6 时震颤发光）
  if (k > 0.6) {
    ctx.globalAlpha = (k - 0.6) * 1.4;
    ctx.fillStyle = 'rgba(255,226,170,.5)';
    ctx.beginPath(); ctx.arc(0, 0, R * (0.7 + 0.18 * Math.sin(t * 24)), 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }
}
