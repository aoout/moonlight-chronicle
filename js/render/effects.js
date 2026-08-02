// @ts-check
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* =========================================================
   蚀月远征 · 渲染层：投射物 / 环绕武器 / 粒子 / 掉落
   ========================================================= */
import { PALETTE } from '../palette.js';

/* ---------- 掉落物 ---------- */
/**
 * @param {import('./context.js').RenderContext} rc
 */
export function drawDrops(rc) {
  const ctx = rc.ctx;
  if (!ctx) return;
  for (const d of rc.drops) {
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.t * 2);
    if (d.kind === 'gold') {
      // 星形金币 + 内芯
      ctx.fillStyle = PALETTE.gold;
      ctx.shadowColor = PALETTE.gold; ctx.shadowBlur = 10;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * 6.28 - 1.57;
        const r = 5.5;
        if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fdf6dd';
      ctx.beginPath(); ctx.arc(0, 0, 2.2, 0, 6.28); ctx.fill();
    } else {
      // 菱形经验
      ctx.fillStyle = PALETTE.ice;
      ctx.shadowColor = PALETTE.ice; ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(0, -6); ctx.lineTo(4.5, 0); ctx.lineTo(0, 6); ctx.lineTo(-4.5, 0);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
}

/** @type {Record<string, (ctx:CanvasRenderingContext2D, pr:any) => void>} */
const PROJ_LINEAR_HEADS = {
  crossbow(ctx, pr) {
if (pr.wId === 'crossbow') {
        // 蚀星连弩：三角箭矢 + 箭杆
        ctx.fillStyle = pr.color;
        ctx.beginPath(); ctx.moveTo(pr.r * 2, 0); ctx.lineTo(-pr.r * 0.6, -pr.r * 0.85); ctx.lineTo(-pr.r * 0.15, 0); ctx.lineTo(-pr.r * 0.6, pr.r * 0.85); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(pr.r * 0.9, 0); ctx.lineTo(-pr.r * 1.3, 0); ctx.stroke();
      }
  },
  lance(ctx, pr) {
if (pr.wId === 'lance') {
        // 潮涌之枪：长杆 + 尖头 + 尾羽
        ctx.strokeStyle = pr.color; ctx.lineWidth = pr.r * 0.44; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(pr.r * 0.3, 0); ctx.lineTo(-pr.r * 1.7, 0); ctx.stroke();
        ctx.fillStyle = pr.color;
        ctx.beginPath(); ctx.moveTo(pr.r * 2.3, 0); ctx.lineTo(pr.r * 0.4, -pr.r * 0.5); ctx.lineTo(pr.r * 0.4, pr.r * 0.5); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.moveTo(-pr.r * 1.2, 0); ctx.lineTo(-pr.r * 1.85, -pr.r * 0.55); ctx.lineTo(-pr.r * 2.05, 0); ctx.lineTo(-pr.r * 1.85, pr.r * 0.55); ctx.closePath(); ctx.fill();
      }
  },
  nova(ctx, pr) {
if (pr.wId === 'nova') {
        // 破晓之辉：四角星核 + 白芯
        ctx.fillStyle = pr.color;
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          const a = i * 1.5708, rr = i % 2 === 0 ? pr.r * 1.85 : pr.r * 0.7;
          if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
          else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(0, 0, pr.r * 0.48, 0, 6.28); ctx.fill();
      }
  },
  shadow(ctx, pr) {
if (pr.wId === 'shadow') {
        // 影袭之刃：旋转月牙镰
        ctx.fillStyle = pr.color;
        ctx.beginPath(); ctx.arc(0, 0, pr.r, 0, 6.28); ctx.arc(pr.r * 0.42, 0, pr.r * 0.72, 0, 6.28, true); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.55)';
        ctx.beginPath(); ctx.arc(-pr.r * 0.26, -pr.r * 0.26, pr.r * 0.3, 0, 6.28); ctx.fill();
      }
  },
  storm(ctx, pr) {
    // 风暴之眼：旋转双环风弹
    ctx.strokeStyle = pr.color; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(0, 0, pr.r, 0, 6.28); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, pr.r * 0.5, 0, 6.28); ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(0, 0, pr.r * 0.22, 0, 6.28); ctx.fill();
  },
  phantom(ctx, pr) {
    // 月影残像：小型月牙弹
    ctx.fillStyle = pr.color;
    ctx.beginPath(); ctx.arc(0, 0, pr.r, 0, 6.28); ctx.arc(pr.r * 0.42, 0, pr.r * 0.72, 0, 6.28, true); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.beginPath(); ctx.arc(-pr.r * 0.25, -pr.r * 0.25, pr.r * 0.3, 0, 6.28); ctx.fill();
  },
  _default(ctx, pr) {
{
      ctx.fillStyle = pr.color;
      ctx.beginPath(); ctx.arc(0, 0, pr.r, 0, 6.28); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.beginPath(); ctx.arc(-pr.r * 0.22, -pr.r * 0.22, pr.r * 0.34, 0, 6.28); ctx.fill();
    }
  },
};

/** @type {Record<string, (ctx:CanvasRenderingContext2D, pr:any) => void>} */
const PROJ_RENDER = {
  meteor(ctx, pr) {
      // 落点预警：收缩光圈 + 内焰
      const k = Math.min(1, pr.t / pr.delay);
      ctx.globalAlpha = 0.3 + 0.7 * k;
      ctx.shadowColor = PALETTE.hot; ctx.shadowBlur = 24;
      ctx.strokeStyle = PALETTE.fire; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, 0, 10 + pr.t * 30, 0, 6.28); ctx.stroke();
      ctx.fillStyle = 'rgba(255,107,107,.22)';
      ctx.beginPath(); ctx.arc(0, 0, 10 + pr.t * 30, 0, 6.28); ctx.fill();

  },
  beam(ctx, pr) {
      const dx = Math.cos(pr.dir), dy = Math.sin(pr.dir);
      ctx.translate(-pr.x, -pr.y);
      const a = Math.max(0, 1 - pr.t / pr.dur);
      // 外层柔光
      ctx.globalAlpha = a * 0.4;
      ctx.strokeStyle = pr.color; ctx.lineWidth = pr.width * 2.4;
      ctx.shadowColor = pr.color; ctx.shadowBlur = 26;
      ctx.beginPath();
      ctx.moveTo(pr.x, pr.y);
      ctx.lineTo(pr.x + dx * pr.range, pr.y + dy * pr.range);
      ctx.stroke();
      // 主光柱
      ctx.globalAlpha = a;
      ctx.strokeStyle = pr.color; ctx.lineWidth = pr.width;
      ctx.shadowColor = pr.color; ctx.shadowBlur = 18;
      ctx.stroke();
      // 白炽芯
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
      ctx.stroke();

  },
  boomerang(ctx, pr) {
      // 月牙回旋刃：旋转 + 光晕
      ctx.rotate(pr.spin);
      ctx.shadowColor = pr.color; ctx.shadowBlur = 16;
      ctx.fillStyle = pr.color;
      ctx.beginPath();
      ctx.arc(0, 0, pr.r, 0, 6.28);
      ctx.arc(pr.r * 0.45, 0, pr.r * 0.62, 0, 6.28, true);
      ctx.fill();
      // 刃口高光
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      ctx.beginPath(); ctx.arc(-pr.r * 0.28, -pr.r * 0.28, pr.r * 0.26, 0, 6.28); ctx.fill();

  },
  aoe(ctx, pr) {
      // 霜环：双层光圈
      ctx.shadowColor = pr.color; ctx.shadowBlur = 18;
      ctx.globalAlpha = Math.max(0.25, 1 - pr.r / pr.maxR);
      ctx.strokeStyle = pr.color; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, pr.r, 0, 6.28); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2;
      ctx.globalAlpha *= 0.6;
      ctx.beginPath(); ctx.arc(0, 0, pr.r * 0.85, 0, 6.28); ctx.stroke();

  },
  linear(ctx, pr) {
      const ang = pr.homing && pr.target
        ? Math.atan2(pr.target.y - pr.y, pr.target.x - pr.x)
        : Math.atan2(pr.vy || 0, pr.vx || 0);
      ctx.rotate(ang);
      const len = pr.trail ? pr.r * 5 : pr.r * 3;
      ctx.lineCap = 'round';
      ctx.shadowColor = pr.color; ctx.shadowBlur = 12;
      // 尾迹
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = pr.color; ctx.lineWidth = pr.r * 0.8;
      ctx.beginPath(); ctx.moveTo(-len, 0); ctx.lineTo(0, 0); ctx.stroke();
      ctx.globalAlpha = 1;
      const head = PROJ_LINEAR_HEADS[pr.wId] || PROJ_LINEAR_HEADS._default;
      head(ctx, pr);
  },
  enemy(ctx, pr) {
      ctx.fillStyle = pr.color;
      ctx.shadowColor = pr.color; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(0, 0, pr.r, 0, 6.28); ctx.fill();
      ctx.fillStyle = '#ff8a8a';
      ctx.beginPath(); ctx.arc(-pr.r * 0.2, -pr.r * 0.2, pr.r * 0.35, 0, 6.28); ctx.fill();
      const ea = Math.atan2(pr.vy || 0, pr.vx || 0);
      ctx.save(); ctx.rotate(ea);
      ctx.fillStyle = pr.color;
      ctx.beginPath(); ctx.moveTo(-pr.r, -pr.r * 0.5); ctx.lineTo(-pr.r * 2.2, 0); ctx.lineTo(-pr.r, pr.r * 0.5); ctx.closePath(); ctx.fill();
      ctx.restore();
  },
  dot(ctx, pr) {
      ctx.shadowColor = pr.color; ctx.shadowBlur = 12;
      ctx.fillStyle = pr.color;
      ctx.beginPath(); ctx.arc(0, 0, pr.r, 0, 6.28); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath(); ctx.arc(-pr.r * 0.25, -pr.r * 0.25, pr.r * 0.35, 0, 6.28); ctx.fill();
  },
  acid(ctx, pr) {
    // 蚀蛆酸液弹：绿核 + 白芯
    ctx.fillStyle = pr.color;
    ctx.shadowColor = pr.color; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(0, 0, pr.r, 0, 6.28); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.beginPath(); ctx.arc(-pr.r * 0.25, -pr.r * 0.25, pr.r * 0.35, 0, 6.28); ctx.fill();
  },
  ground(ctx, pr) {
      const k = Math.min(1, pr.t / (pr.delay || 0.8));
      ctx.globalAlpha = 0.35 + 0.65 * k;
      ctx.strokeStyle = pr.color; ctx.lineWidth = 2.5;
      ctx.shadowColor = pr.color; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(0, 0, pr.r, 0, 6.28); ctx.stroke();
      ctx.fillStyle = pr.color; ctx.globalAlpha = 0.18 + 0.3 * k;
      ctx.beginPath(); ctx.arc(0, 0, pr.r, 0, 6.28); ctx.fill();
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

/**
 * @param {import('./context.js').RenderContext} rc
 */
export function drawProjectiles(rc) {
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
    else if (pr.beam) PROJ_RENDER.beam(ctx, pr);
    else if (pr.boomerang) PROJ_RENDER.boomerang(ctx, pr);
    else if (pr.aoe && !pr.enemy) PROJ_RENDER.aoe(ctx, pr);
    else if (pr.vx !== undefined || pr.dir !== undefined) PROJ_RENDER.linear(ctx, pr);
    else if (pr.enemy) PROJ_RENDER.enemy(ctx, pr);
    else PROJ_RENDER.dot(ctx, pr);
    ctx.restore();
  }
}

/**
 * @param {import('./context.js').RenderContext} rc
 */
export function drawOrbitWeapons(rc) {
  const p = rc.player;
  if (!p || !p.orbits || !p.orbits.length) return;
  const ctx = rc.ctx;
  if (!ctx) return;
  for (const o of p.orbits) {
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.rotate(o.a + 1.57);
    ctx.shadowColor = PALETTE.gold; ctx.shadowBlur = 14;
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, 6.28);
    ctx.arc(3.5, 0, 4.5, 0, 6.28, true);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.beginPath(); ctx.arc(-2, -2, 1.8, 0, 6.28); ctx.fill();
    ctx.restore();
  }
}

/**
 * @param {import('./context.js').RenderContext} rc
 */
export function drawParticles(rc) {
  const ctx = rc.ctx;
  if (!ctx) return;
  const list = rc.particles;

  // ---- 批量绘制简单圆形粒子 ----
  ctx.save();
  for (const pa of list) {
    if (pa.chain || pa.ring || pa.spark || pa.star || pa.shard || pa.streak || pa.glow || pa.timestop || pa.echo) continue;
    const life = 1 - (pa.t || 0) / (pa.max || 0.7);
    ctx.globalAlpha = life;
    ctx.fillStyle = pa.color || '#fff';
    ctx.beginPath(); ctx.arc(pa.x, pa.y, pa.size, 0, 6.28); ctx.fill();
  }
  ctx.restore();

  // ---- 单独绘制复杂粒子 ----
  for (const pa of list) {
    if (!(pa.chain || pa.ring || pa.spark || pa.star || pa.shard || pa.streak || pa.glow || pa.timestop || pa.echo)) continue;
    const life = 1 - (pa.t || 0) / (pa.max || 0.7);
    ctx.save();
    if (pa.chain) {
      ctx.globalAlpha = life;
      ctx.strokeStyle = pa.color || '#fff'; ctx.lineWidth = 3;
      ctx.shadowColor = pa.color || '#fff'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.moveTo(pa.x1, pa.y1); ctx.lineTo(pa.x2, pa.y2); ctx.stroke();
      // 电弧白芯
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pa.x1, pa.y1); ctx.lineTo(pa.x2, pa.y2); ctx.stroke();
    } else if (pa.ring) {
      const k = pa.t / pa.max;
      ctx.globalAlpha = life * 0.9;
      ctx.strokeStyle = pa.color || '#fff'; ctx.lineWidth = Math.max(0.5, (pa.lw || 3) * (1 - k));
      ctx.shadowColor = pa.color || '#fff'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(pa.x, pa.y, (pa.r0 || 4) + ((pa.r1 || 60) - (pa.r0 || 4)) * k, 0, 6.28); ctx.stroke();
    } else if (pa.spark) {
      ctx.globalAlpha = life;
      ctx.strokeStyle = pa.color || '#fff'; ctx.lineWidth = pa.size || 1.6;
      ctx.lineCap = 'round';
      ctx.shadowColor = pa.color || '#fff'; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pa.x - pa.vx * 0.055, pa.y - pa.vy * 0.055); ctx.stroke();
    } else if (pa.star) {
      ctx.globalAlpha = life;
      ctx.translate(pa.x, pa.y); ctx.rotate(pa.t * 6);
      ctx.fillStyle = pa.color || '#fff'; ctx.shadowColor = pa.color || '#fff'; ctx.shadowBlur = 14;
      const s = (pa.size || 10) * (0.4 + 0.6 * life);
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = i * 1.5708, r = i % 2 === 0 ? s : s * 0.35;
        if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath(); ctx.fill();
    } else if (pa.shard) {
      ctx.globalAlpha = life;
      ctx.translate(pa.x, pa.y); ctx.rotate(pa.rot + pa.t * pa.vr);
      ctx.fillStyle = pa.color || '#fff'; ctx.shadowColor = pa.color || '#fff'; ctx.shadowBlur = 8;
      const s = (pa.size || 3) * (0.5 + 0.5 * life);
      ctx.beginPath();
      ctx.moveTo(0, -s); ctx.lineTo(s * 0.72, 0); ctx.lineTo(0, s); ctx.lineTo(-s * 0.72, 0);
      ctx.closePath(); ctx.fill();
    } else if (pa.streak) {
      ctx.globalAlpha = life;
      ctx.translate(pa.x, pa.y); ctx.rotate(pa.ang);
      ctx.strokeStyle = pa.color || '#fff'; ctx.lineCap = 'round';
      ctx.shadowColor = pa.color || '#fff'; ctx.shadowBlur = 10;
      ctx.lineWidth = pa.w || 2;
      ctx.beginPath(); ctx.moveTo(-(pa.len || 26), 0); ctx.lineTo(0, 0); ctx.stroke();
    } else if (pa.glow) {
      const k = pa.t / pa.max;
      ctx.globalAlpha = life * 0.45;
      ctx.fillStyle = pa.color || '#fff';
      ctx.shadowColor = pa.color || '#fff'; ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.arc(pa.x, pa.y, Math.max(0.5, (pa.size || 14) * (0.5 + k * 0.8)), 0, 6.28); ctx.fill();
    } else if (pa.timestop) {
      ctx.globalAlpha = life * 0.25;
      ctx.fillStyle = PALETTE.ice;
      ctx.fillRect(0, 0, rc.width, rc.height);
    } else if (pa.echo) {
      ctx.globalAlpha = life;
      ctx.strokeStyle = PALETTE.gold; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(pa.x, pa.y, Math.max(2, 14 + (0.7 - pa.t) * 30), 0, 6.28); ctx.stroke();
    }
    ctx.restore();
  }
}