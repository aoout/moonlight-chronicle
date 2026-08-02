// @ts-check
/* =========================================================
   蚀月远征 · 渲染层：Boss 造型注册表
   按 Boss 类型区分身体造型绘制函数
   ========================================================= */
import { PALETTE } from '../../palette.js';
import { G } from '../../state.js';

/** @type {Record<string, (ctx:CanvasRenderingContext2D, e:any, s:number, wob:number, t:number) => void>} */
export const BOSS_SHAPES = {
  behemoth(ctx, e, s, wob, t) {
    ctx.fillStyle = e.color;
    ctx.beginPath(); ctx.arc(0, wob, s, 0, 6.28); ctx.fill();
    ctx.fillStyle = '#fdf6ea';
    ctx.beginPath(); ctx.moveTo(-s * 0.75, wob + s * 0.2); ctx.lineTo(-s * 0.55, wob + s * 0.85); ctx.lineTo(-s * 0.3, wob + s * 0.2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(s * 0.75, wob + s * 0.2); ctx.lineTo(s * 0.55, wob + s * 0.85); ctx.lineTo(s * 0.3, wob + s * 0.2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.65)';
    ctx.beginPath(); ctx.arc(-s * 0.42, -s * 0.3 + wob, s * 0.17, 0, 6.28); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.42, -s * 0.3 + wob, s * 0.17, 0, 6.28); ctx.fill();
  },
  lord(ctx, e, s, wob, t) {
    ctx.fillStyle = e.color;
    ctx.beginPath(); ctx.arc(0, wob, s, 0, 6.28); ctx.fill();
    ctx.fillStyle = '#f4ecd8';
    ctx.beginPath(); ctx.moveTo(-s * 0.5, -s * 0.6); ctx.lineTo(-s * 0.5, -s * 1.25);
    ctx.lineTo(-s * 0.25, -s * 0.85); ctx.lineTo(0, -s * 1.35); ctx.lineTo(s * 0.25, -s * 0.85);
    ctx.lineTo(s * 0.5, -s * 1.25); ctx.lineTo(s * 0.5, -s * 0.6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.7)';
    ctx.beginPath(); ctx.arc(-s * 0.3, -s * 0.1 + wob, s * 0.14, 0, 6.28); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.3, -s * 0.1 + wob, s * 0.14, 0, 6.28); ctx.fill();
  },
  dragon(ctx, e, s, wob, t) {
    ctx.fillStyle = e.color;
    ctx.beginPath(); ctx.arc(0, wob, s * 0.75, 0, 6.28); ctx.fill();
    ctx.save(); ctx.rotate(-0.35);
    ctx.beginPath(); ctx.moveTo(-s * 0.6, wob - s * 0.3); ctx.lineTo(-s * 1.9, wob - s * 1.15);
    ctx.lineTo(-s * 1.25, wob + s * 0.12); ctx.lineTo(-s * 0.5, wob + s * 0.25); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.rotate(0.35);
    ctx.beginPath(); ctx.moveTo(s * 0.6, wob - s * 0.3); ctx.lineTo(s * 1.9, wob - s * 1.15);
    ctx.lineTo(s * 1.25, wob + s * 0.12); ctx.lineTo(s * 0.5, wob + s * 0.25); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = PALETTE.fireBright;
    ctx.beginPath(); ctx.arc(-s * 0.35, -s * 0.1 + wob, s * 0.1, 0, 6.28); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.35, -s * 0.1 + wob, s * 0.1, 0, 6.28); ctx.fill();
  },
  tideMother(ctx, e, s, wob, t) {
    ctx.fillStyle = e.color;
    ctx.beginPath(); ctx.arc(0, wob, s, 0, 6.28); ctx.fill();
    ctx.strokeStyle = e.color; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * 6.28 + G.time * 0.8;
      ctx.globalAlpha = 0.85;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * s, wob + Math.sin(a) * s);
      ctx.quadraticCurveTo(Math.cos(a + 0.3) * s * 1.6, wob + Math.sin(a + 0.3) * s * 1.6, Math.cos(a) * s * 1.9, wob + Math.sin(a) * s * 1.9);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    ctx.beginPath(); ctx.arc(0, wob + s * 0.25, s * 0.4, 0, 6.28); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    ctx.beginPath(); ctx.arc(-s * 0.35, -s * 0.3 + wob, s * 0.15, 0, 6.28); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.35, -s * 0.3 + wob, s * 0.15, 0, 6.28); ctx.fill();
  },
  erodeChariot(ctx, e, s, wob, t) {
    ctx.fillStyle = e.color;
    ctx.beginPath(); ctx.arc(0, wob, s, 0, 6.28); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 2;
    for (let r = s * 0.4; r <= s * 0.9; r += s * 0.25) {
      ctx.beginPath(); ctx.arc(0, wob, r, 0.3, 3.0); ctx.stroke();
    }
    ctx.fillStyle = '#d9d2b8';
    ctx.beginPath(); ctx.moveTo(-s * 0.9, -s * 0.5); ctx.lineTo(-s * 1.7, -s * 1.1); ctx.lineTo(-s * 0.5, -s * 0.55); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(s * 0.9, -s * 0.5); ctx.lineTo(s * 1.7, -s * 1.1); ctx.lineTo(s * 0.5, -s * 0.55); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.65)';
    ctx.beginPath(); ctx.arc(-s * 0.4, -s * 0.05 + wob, s * 0.13, 0, 6.28); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.4, -s * 0.05 + wob, s * 0.13, 0, 6.28); ctx.fill();
  },
  moonWraith(ctx, e, s, wob, t) {
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = e.color;
    ctx.beginPath(); ctx.arc(0, wob, s, 0, 6.28); ctx.fill();
    ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.moveTo(-s * 1.1, wob + Math.sin(G.time * 2) * 6);
    ctx.quadraticCurveTo(-s * 0.5, wob + s * 1.1, 0, wob + s * 0.9);
    ctx.quadraticCurveTo(s * 0.5, wob + s * 1.1, s * 1.1, wob + Math.sin(G.time * 2 + 2) * 6);
    ctx.fillStyle = e.color; ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#b9a8e8';
    ctx.beginPath(); ctx.moveTo(-s * 0.45, -s * 0.6); ctx.lineTo(-s * 0.45, -s * 1.2);
    ctx.lineTo(-s * 0.2, -s * 0.85); ctx.lineTo(0, -s * 1.3); ctx.lineTo(s * 0.2, -s * 0.85);
    ctx.lineTo(s * 0.45, -s * 1.2); ctx.lineTo(s * 0.45, -s * 0.6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = PALETTE.fireBright;
    ctx.beginPath(); ctx.arc(-s * 0.3, -s * 0.1 + wob, s * 0.13, 0, 6.28); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.3, -s * 0.1 + wob, s * 0.13, 0, 6.28); ctx.fill();
  },
  moonSwordsman(ctx, e, s, wob, t) {
    ctx.fillStyle = e.color;
    ctx.beginPath(); ctx.arc(0, wob, s, 0, 6.28); ctx.fill();
    ctx.fillStyle = '#f6f2e8';
    ctx.beginPath(); ctx.arc(0, wob, s * 0.55, 0, 6.28); ctx.fill();
    ctx.strokeStyle = PALETTE.blood; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, wob, s * 0.55, 0.4, 2.7); ctx.stroke();
    ctx.fillStyle = '#fff6dd';
    ctx.shadowColor = PALETTE.gold; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(0, -s * 0.9, s * 0.5, 0, 6.28);
    ctx.arc(s * 0.15, -s * 0.9, s * 0.42, 0, 6.28, true);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0,0,0,.7)';
    ctx.beginPath(); ctx.arc(-s * 0.35, -s * 0.15 + wob, s * 0.14, 0, 6.28); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.35, -s * 0.15 + wob, s * 0.14, 0, 6.28); ctx.fill();
  },
  stormOwl(ctx, e, s, wob, t) {
    ctx.fillStyle = e.color;
    ctx.beginPath(); ctx.arc(0, wob, s * 0.8, 0, 6.28); ctx.fill();
    const wa = Math.sin(G.time * 4) * 0.2;
    ctx.save(); ctx.rotate(-wa);
    ctx.beginPath(); ctx.moveTo(-s * 0.5, wob - s * 0.3); ctx.lineTo(-s * 1.9, wob - s * 1.2);
    ctx.lineTo(-s * 1.5, wob - s * 0.6); ctx.lineTo(-s * 1.8, wob - s * 0.1);
    ctx.lineTo(-s * 1.2, wob + s * 0.1); ctx.lineTo(-s * 0.4, wob + s * 0.25); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.rotate(wa);
    ctx.beginPath(); ctx.moveTo(s * 0.5, wob - s * 0.3); ctx.lineTo(s * 1.9, wob - s * 1.2);
    ctx.lineTo(s * 1.5, wob - s * 0.6); ctx.lineTo(s * 1.8, wob - s * 0.1);
    ctx.lineTo(s * 1.2, wob + s * 0.1); ctx.lineTo(s * 0.4, wob + s * 0.25); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = PALETTE.fireBright;
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(G.time * 8);
    ctx.beginPath(); ctx.arc(-s * 0.3, -s * 0.1 + wob, s * 0.16, 0, 6.28); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.3, -s * 0.1 + wob, s * 0.16, 0, 6.28); ctx.fill();
    ctx.globalAlpha = 1;
  },
  abyssMother(ctx, e, s, wob, t) {
    ctx.fillStyle = e.color;
    ctx.beginPath(); ctx.arc(0, wob, s, 0, 6.28); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    [[0.35, -0.35, 0.28], [-0.35, -0.35, 0.28], [0.4, 0.35, 0.24], [-0.4, 0.35, 0.24]].forEach(([dx, dy, r]) => {
      const pulse = 1 + 0.12 * Math.sin(G.time * 3 + dx * 10);
      ctx.beginPath(); ctx.arc(dx * s, dy * s + wob, r * s * pulse, 0, 6.28); ctx.fill();
    });
    ctx.strokeStyle = e.color; ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * 6.28 + 0.5;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * s * 0.9, wob + Math.sin(a) * s * 0.9);
      ctx.quadraticCurveTo(Math.cos(a) * s * 1.5, wob + Math.sin(a) * s * 1.5 + 6, Math.cos(a) * s * 1.4, wob + Math.sin(a) * s * 1.4);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(0,0,0,.65)';
    ctx.beginPath(); ctx.arc(-s * 0.3, -s * 0.4 + wob, s * 0.14, 0, 6.28); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.3, -s * 0.4 + wob, s * 0.14, 0, 6.28); ctx.fill();
  },
  final(ctx, e, s, wob, t) {
    const g = ctx.createRadialGradient(-s * 0.3, -s * 0.3, s * 0.1, 0, wob, s);
    g.addColorStop(0, PALETTE.fireBright); g.addColorStop(1, PALETTE.gold);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, wob, s, 0, 6.28); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.beginPath(); ctx.arc(-s * 0.3, -s * 0.35, s * 0.22, 0, 6.28); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.3, s * 0.15, s * 0.16, 0, 6.28); ctx.fill();
    ctx.strokeStyle = '#0a0c1c'; ctx.lineWidth = s * 0.14;
    ctx.beginPath(); ctx.arc(0, wob, s * 0.75, t * 0.15, t * 0.15 + 2.2); ctx.stroke();
  },
};

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('../../types/core.d.ts').EnemyInstance} e
 * @param {number} s
 * @param {number} wob
 * @param {number} t
 */
export function drawBossBody(ctx, e, /** @type {number} */ s, wob, t) {
  const fn = /** @type {any} */ (BOSS_SHAPES)[e.type || ''] || BOSS_SHAPES.final;
  fn(ctx, e, s, wob, t);
}