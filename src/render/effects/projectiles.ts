/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* =========================================================
   蚀月远征 · 渲染层：投射物绘制（精细化弹头与攻击特效）
   每把武器拥有专属弹头形状、尾迹与光效
   ========================================================= */
import { PALETTE } from '../../data/palette.js';
import type { RenderContext } from '../context.js';
import { shapeCache } from '../shape_cache.js';

const TAU = Math.PI * 2;

/** 需要实时动画的弹头类型（使用 pr.t 做旋转/动画，不适合缓存） */
const ANIMATED_PROJECTILE_HEADS = new Set(['nova', 'shadow', 'storm']);

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
    dot(ctx, -pr.r * 1.7, 0, pr.r * 0.22, '#ffffff', 6);   // 尾羽光点
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
      const a = i * 1.5708, rr = i % 2 === 0 ? pr.r * 1.9 : pr.r * 0.72;
      if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(0, 0, pr.r * 0.5, 0, TAU); ctx.fill();
    ctx.restore();
    // 外围光芒（十字光线）
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const a = i * 1.5708;
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
    dot(ctx, pr.r * 3.1, 0, pr.r * 0.3, '#ffffff', 10);
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
    coreG.addColorStop(0, '#ffffff');
    coreG.addColorStop(1, 'transparent');
    ctx.fillStyle = coreG;
    ctx.beginPath(); ctx.arc(0, 0, coreR + 7, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(0, 0, coreR, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(143,227,216,0.3)';
    ctx.beginPath(); ctx.arc(0, 0, pr.r * 1.25, 0, TAU); ctx.fill();
  },

  /* 月影残像：月牙弹 + 残影拖尾 */
  phantom(ctx, pr) {
    ctx.shadowColor = pr.color; ctx.shadowBlur = 14;
    // 残影（两层虚影）
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = pr.color;
    ctx.beginPath(); ctx.translate(-pr.r * 0.8, 0); ctx.arc(0, 0, pr.r, 0, TAU); ctx.arc(pr.r * 0.42, 0, pr.r * 0.72, 0, TAU, true); ctx.fill();
    ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.translate(-pr.r * 0.4, 0); ctx.arc(0, 0, pr.r, 0, TAU); ctx.arc(pr.r * 0.42, 0, pr.r * 0.72, 0, TAU, true); ctx.fill();
    ctx.globalAlpha = 1;
    // 主体
    ctx.fillStyle = pr.color;
    ctx.beginPath(); ctx.arc(0, 0, pr.r, 0, TAU); ctx.arc(pr.r * 0.42, 0, pr.r * 0.72, 0, TAU, true); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.beginPath(); ctx.arc(-pr.r * 0.25, -pr.r * 0.25, pr.r * 0.3, 0, TAU); ctx.fill();
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
    ctx.shadowColor = PALETTE.hot; ctx.shadowBlur = 22;
    ctx.beginPath(); ctx.arc(0, 0, 10 + pr.t * 30, 0, TAU); ctx.stroke();
    ctx.restore();
    ctx.setLineDash([]);
    // 内焰
    ctx.fillStyle = 'rgba(255,107,107,.2)';
    ctx.beginPath(); ctx.arc(0, 0, 8 + pr.t * 26, 0, TAU); ctx.fill();
    // 火星（随机游走亮点）
    for (let i = 0; i < 3; i++) {
      const a = pr.t * 5 + i * 2.1;
      dot(ctx, Math.cos(a) * (14 + pr.t * 34), Math.sin(a) * (14 + pr.t * 34), 1.6, '#ffd9a8', 4);
    }
  },

  /* 月光束：脉动光柱（呼吸宽窄 + 三层光 + 光束粒子） */
  beam(ctx, pr) {
    const dx = Math.cos(pr.dir), dy = Math.sin(pr.dir);
    ctx.translate(-pr.x, -pr.y);
    const a = Math.max(0, 1 - pr.t / pr.dur);
    const pulse = 1 + Math.sin(pr.t * 26) * 0.1;   // 脉动
    // 外层柔光
    ctx.globalAlpha = a * 0.4;
    ctx.strokeStyle = pr.color; ctx.lineWidth = pr.width * 2.5 * pulse;
    ctx.shadowColor = pr.color; ctx.shadowBlur = 30;
    ctx.beginPath(); ctx.moveTo(pr.x, pr.y); ctx.lineTo(pr.x + dx * pr.range, pr.y + dy * pr.range); ctx.stroke();
    // 主光柱
    ctx.globalAlpha = a;
    ctx.strokeStyle = pr.color; ctx.lineWidth = pr.width * pulse;
    ctx.shadowColor = pr.color; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.moveTo(pr.x, pr.y); ctx.lineTo(pr.x + dx * pr.range, pr.y + dy * pr.range); ctx.stroke();
    // 白炽芯
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3.2;
    ctx.stroke();
    // 光柱内的流转粒子
    ctx.globalAlpha = a * 0.7;
    for (let i = 0; i < 3; i++) {
      const u = ((pr.t * 0.9 + i * 0.33) % 1);
      dot(ctx, pr.x + dx * pr.range * u, pr.y + dy * pr.range * u, 2, '#ffffff', 6);
    }
  },

  /* 月辉回刃：旋转月牙 + 刃光渐变 + 尾迹星尘 */
  boomerang(ctx, pr) {
    ctx.rotate(pr.spin);
    // 光晕
    ctx.shadowColor = pr.color; ctx.shadowBlur = 18;
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
    ctx.globalAlpha = 0.3 + k * 0.25;
    ctx.strokeStyle = '#a8e88a'; ctx.lineWidth = 2;
    ctx.shadowColor = '#7fce5a'; ctx.shadowBlur = 12;
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
    ctx.strokeStyle = '#a8e88a'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(0, 0, pr.r * 0.7, pr.t * 2, pr.t * 2 + 1.6); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  },

  /* 霜环：扩散冰环（双层环 + 冰晶散落 + 霜纹） */
  aoe(ctx, pr) {
    const fade = Math.max(0.25, 1 - pr.r / pr.maxR);
    ctx.shadowColor = pr.color; ctx.shadowBlur = 18;
    ctx.globalAlpha = fade;
    ctx.strokeStyle = pr.color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, pr.r, 0, TAU); ctx.stroke();
    // 内层冰纹
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2; ctx.globalAlpha = fade * 0.6;
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

  /* 线性弹：尾迹（渐变双层）+ 弹头 */
  linear(ctx, pr) {
    const ang = pr.homing && pr.target
      ? Math.atan2(pr.target.y - pr.y, pr.target.x - pr.x)
      : Math.atan2(pr.vy || 0, pr.vx || 0);
    ctx.rotate(ang);
    const len = pr.trail ? pr.r * 5 : pr.r * 3;
    ctx.lineCap = 'round';
    // 尾迹：外柔光 + 内亮核
    ctx.shadowColor = pr.color; ctx.shadowBlur = 12;
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
      const cacheKey = 'proj_head_' + wId + '_' + (pr.color || '#fff') + '_' + Math.round(pr.r * 10);
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
      ctx.shadowColor = pr.color; ctx.shadowBlur = 14;
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
      ctx.strokeStyle = pr.color; ctx.lineWidth = 1.5;
      ctx.shadowColor = pr.color; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(0, 0, pr.r, 0, TAU); ctx.stroke();
      ctx.fillStyle = 'rgba(159,214,232,.35)';
      ctx.beginPath(); ctx.arc(0, 0, pr.r * 0.72, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(-pr.r * 0.2, -pr.r * 0.2, pr.r * 0.28, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(159,214,232,.5)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-pr.r, 0); ctx.lineTo(-pr.r * 2.4, 0); ctx.stroke();
      ctx.restore();
      return;
    }
    if (pr.ember) {
      // 赤潮火弹：焰心（外焰 + 白核 + 焰尾）
      ctx.shadowColor = pr.color; ctx.shadowBlur = 14;
      ctx.fillStyle = pr.color;
      ctx.beginPath(); ctx.arc(0, 0, pr.r, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffe9a8';
      ctx.beginPath(); ctx.arc(0, 0, pr.r * 0.55, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(0, 0, pr.r * 0.28, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,157,107,.6)';
      ctx.beginPath(); ctx.moveTo(-pr.r * 0.7, -pr.r * 0.5); ctx.lineTo(-pr.r * 2.2, 0); ctx.lineTo(-pr.r * 0.7, pr.r * 0.5); ctx.closePath(); ctx.fill();
      return;
    }
    if (pr.pulse) {
      // 蚀月脉冲：旋转金色星芒
      ctx.save(); ctx.rotate(pr.t * 8);
      ctx.shadowColor = pr.color; ctx.shadowBlur = 12;
      ctx.fillStyle = pr.color;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = i * 1.5708, rr = i % 2 === 0 ? pr.r * 1.6 : pr.r * 0.6;
        if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
        else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(0, 0, pr.r * 0.4, 0, TAU); ctx.fill();
      ctx.restore();
      return;
    }
    if (pr.orb) {
      // 暗影追踪球：紫雾球（暗核 + 紫光 + 暗尾）
      ctx.shadowColor = pr.color; ctx.shadowBlur = 14;
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
      ctx.shadowColor = '#7fd6a4'; ctx.shadowBlur = 12;
      ctx.fillStyle = pr.color;
      ctx.beginPath(); ctx.ellipse(0, 0, pr.r * 1.2, pr.r * 0.85, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#eafff4';
      ctx.beginPath(); ctx.arc(-pr.r * 0.25, -pr.r * 0.22, pr.r * 0.36, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(127,214,164,.6)';
      ctx.beginPath(); ctx.moveTo(-pr.r * 0.9, 0); ctx.lineTo(-pr.r * 2.6, pr.r * 0.14); ctx.lineTo(-pr.r * 0.9, pr.r * 0.44); ctx.closePath(); ctx.fill();
      ctx.restore();
      return;
    }
    // 通用敌弹：尖刺弹
    ctx.save(); ctx.rotate(ang);
    ctx.fillStyle = pr.color;
    ctx.shadowColor = pr.color; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(0, 0, pr.r, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ff8a8a';
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
    ctx.shadowColor = pr.color; ctx.shadowBlur = 10;
    ctx.fillStyle = pr.color;
    ctx.beginPath(); ctx.ellipse(0, 0, pr.r * 1.15, pr.r * 0.8, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#eafff4';
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
      ctx.strokeStyle = pr.color; ctx.lineWidth = 2;
      ctx.shadowColor = '#a8d8ff'; ctx.shadowBlur = 14;
      ctx.setLineDash([8, 6]);
      ctx.lineDashOffset = -pr.t * 40;
      ctx.beginPath(); ctx.arc(0, 0, pr.r, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
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
    ctx.strokeStyle = pr.color; ctx.lineWidth = 2.5;
    ctx.shadowColor = pr.color; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(0, 0, pr.r, 0, TAU); ctx.stroke();
    ctx.fillStyle = pr.color; ctx.globalAlpha = 0.18 + 0.3 * k;
    ctx.beginPath(); ctx.arc(0, 0, pr.r, 0, TAU); ctx.fill();
  },

  breath(ctx, pr) {
    ctx.globalAlpha = Math.max(0, 1 - pr.t / pr.dur);
    ctx.strokeStyle = pr.color; ctx.lineWidth = pr.width;
    ctx.shadowColor = pr.color; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(pr.dir) * pr.range, Math.sin(pr.dir) * pr.range);
    ctx.stroke();
    ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = pr.width * 0.5;
    ctx.beginPath(); ctx.moveTo(Math.cos(pr.dir) * pr.range * 0.2, Math.sin(pr.dir) * pr.range * 0.2);
    ctx.lineTo(Math.cos(pr.dir) * pr.range, Math.sin(pr.dir) * pr.range);
    ctx.stroke();
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
  // 2. 不规则蚀火裂纹（锯齿状，随时间扩张、抖动）
  const edge = k > 0.72 ? '#ffd9a8' : pr.color;
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.6 + k * 1.4;
  ctx.shadowColor = pr.color;
  ctx.shadowBlur = 8 + k * 16;
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
