/* =========================================================
   蚀月远征 · 渲染层：敌人造型注册表
   按敌人类型区分身体造型绘制函数
   ========================================================= */
import { PALETTE } from '../../data/palette.js';

/* 敌人眼睛（朝向玩家，带高光） */
function enemyEye(ctx: CanvasRenderingContext2D, x: number, y: number, r?: number): void {
  const rr = r || 2.2;
  ctx.fillStyle = 'rgba(0,0,0,.72)';
  ctx.beginPath(); ctx.arc(x, y, rr, 0, 6.28); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  ctx.beginPath(); ctx.arc(x + rr * 0.3, y - rr * 0.3, rr * 0.42, 0, 6.28); ctx.fill();
}

export const ENEMY_SHAPES: Record<string, (ctx: CanvasRenderingContext2D, e: any, s: number, wob: number, fa: number, t: number, time: number) => void> = {
  _default(ctx, e, s, wob, fa, t) {
    ctx.fillStyle = e.color;
    ctx.beginPath(); ctx.arc(0, wob, s, 0, 6.28); ctx.fill();
    enemyEye(ctx, 0, -s * 0.1);
  },
  grub(ctx, e, s, wob, fa, t) {
    const color = e.color;
    ctx.fillStyle = color;
    const squish = 0.1 * Math.sin(t * 2);
    ctx.beginPath(); ctx.ellipse(0, wob, s * 1.25 * (1 + squish), s * 0.8 * (1 - squish), 0, 0, 6.28); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = 1;
    for (let i = -0.7; i <= 0.7; i += 0.45) {
      ctx.beginPath(); ctx.moveTo(i * s, -s * 0.6); ctx.quadraticCurveTo(i * s + s * 0.25, 0, i * s, s * 0.6); ctx.stroke();
    }
    ctx.strokeStyle = color; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(s * 0.95, -s * 0.3); ctx.quadraticCurveTo(s * 1.55, -s * 0.95, s * 1.85, -s * 0.5); ctx.stroke();
    enemyEye(ctx, s * 0.72, -s * 0.08);
  },
  rat(ctx, e, s, wob, fa, t, time) {
    const color = e.color;
    ctx.translate(Math.sin(time * 10) * 0.9, 0);
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(0, wob, s, 0, 6.28); ctx.fill();
    ctx.beginPath(); ctx.arc(-s * 0.6, -s * 0.72, s * 0.42, 0, 6.28); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.55, -s * 0.8, s * 0.36, 0, 6.28); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.32)';
    ctx.beginPath(); ctx.arc(-s * 0.6, -s * 0.72, s * 0.2, 0, 6.28); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = s * 0.26; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-s * 0.7, wob); ctx.quadraticCurveTo(-s * 1.65, wob - s, -s * 1.85, wob + s * 0.55); ctx.stroke();
    enemyEye(ctx, s * 0.35, -s * 0.15);
  },
  armored(ctx, e, s, wob, fa, t) {
    const color = e.color;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(0, wob, s, 0, 6.28); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.32)'; ctx.lineWidth = 1.2;
    for (let r = s * 0.35; r <= s * 0.88; r += s * 0.26) {
      ctx.beginPath(); ctx.arc(0, wob, r, 0.25, 3.05); ctx.stroke();
    }
    ctx.fillStyle = '#d9c9a8';
    ctx.beginPath(); ctx.moveTo(-s * 0.72, -s * 0.62); ctx.lineTo(-s * 1.05, -s * 1.35); ctx.lineTo(-s * 0.4, -s * 0.85); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(s * 0.72, -s * 0.62); ctx.lineTo(s * 1.05, -s * 1.35); ctx.lineTo(s * 0.4, -s * 0.85); ctx.closePath(); ctx.fill();
    enemyEye(ctx, 0, -s * 0.08);
  },
  wing(ctx, e, s, wob, fa, t, time) {
    const color = e.color;
    const wa = Math.sin(time * 5) * 0.28;
    ctx.save(); ctx.rotate(fa * 0.35 + wa);
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(-s, wob); ctx.lineTo(-s * 2.3, wob - s * 1.3); ctx.lineTo(-s * 0.55, wob - s * 0.2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(s, wob); ctx.lineTo(s * 2.3, wob - s * 1.3); ctx.lineTo(s * 0.55, wob - s * 0.2); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.beginPath(); ctx.arc(0, wob, s * 0.8, 0, 6.28); ctx.fill();
    enemyEye(ctx, s * 0.28, -s * 0.12);
  },
  charger(ctx, e, s, wob, fa, t) {
    const color = e.color;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(0, wob, s, 0, 6.28); ctx.fill();
    ctx.fillStyle = '#fdf6ea';
    ctx.beginPath(); ctx.arc(0, wob, s * 0.58, 0, 6.28); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.65)'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(-s * 0.55, wob); ctx.lineTo(s * 0.55, wob); ctx.stroke();
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(i * s * 0.3, wob - 1); ctx.lineTo(i * s * 0.3 + s * 0.1, wob + s * 0.25); ctx.stroke();
    }
    ctx.fillStyle = '#e8ddc8';
    ctx.beginPath(); ctx.moveTo(0, -s * 0.8); ctx.lineTo(s * 0.38, -s * 1.55); ctx.lineTo(-s * 0.1, -s * 1.1); ctx.closePath(); ctx.fill();
    enemyEye(ctx, -s * 0.32, -s * 0.38);
  },
  spitter(ctx, e, s, wob, fa, t, time) {
    const color = e.color;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(0, wob, s, 0, 6.28); ctx.fill();
    ctx.save(); ctx.rotate(fa);
    ctx.fillStyle = color;
    ctx.fillRect(s * 0.35, -s * 0.24, s * 1.15, s * 0.48);
    ctx.fillStyle = '#eafff4';
    ctx.beginPath(); ctx.arc(s * 1.55, 0, s * 0.24, 0, 6.28); ctx.fill();
    ctx.globalAlpha = 0.45 + 0.45 * Math.sin(time * 6);
    ctx.beginPath(); ctx.arc(s * 1.55, 0, s * 0.14, 0, 6.28); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
    enemyEye(ctx, -s * 0.2, -s * 0.2);
  },
  splitter(ctx, e, s, wob, fa, t, time) {
    const color = e.color;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(0, wob, s, 0, 6.28); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.2)';
    [[0.3, -0.4, 0.3], [-0.42, 0.22, 0.36], [0.15, 0.52, 0.26]].forEach(([dx, dy, r], i) => {
      const pulse = 1 + 0.18 * Math.sin(time * 3 + i * 2);
      ctx.beginPath(); ctx.arc(dx * s, dy * s + wob, r * s * pulse, 0, 6.28); ctx.fill();
    });
    enemyEye(ctx, 0, -s * 0.15);
  },
  shadow(ctx, e, s, wob, fa, t) {
    const color = e.color;
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(0, wob + s * 0.2, s * 1.2, s * 0.85, 0, 0, 6.28); ctx.fill();
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(-s * 1.25, wob + s * 0.2 + Math.sin(t * 2) * s * 0.2);
    for (let i = 1; i <= 14; i++) {
      const a = i / 14 * 6.28;
      const rr = s * 1.2 * (1 + Math.sin(t * 2 + i * 1.8) * 0.16);
      ctx.lineTo(Math.cos(a) * rr, wob + s * 0.2 + Math.sin(a) * s * 0.85);
    }
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = PALETTE.hot;
    ctx.beginPath(); ctx.arc(-s * 0.3, -s * 0.1 + wob, s * 0.18, 0, 6.28); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.3, -s * 0.1 + wob, s * 0.18, 0, 6.28); ctx.fill();
  },
  giant(ctx, e, s, wob, fa, t, time) {
    const color = e.color;
    const gs = s * (1 + 0.03 * Math.sin(time * 2));
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(0, wob, gs, 0, 6.28); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = gs * 0.1;
    ctx.beginPath(); ctx.arc(0, wob, gs * 0.6, 0, 6.28); ctx.stroke();
    ctx.fillStyle = '#160b05';
    ctx.beginPath(); ctx.arc(0, wob + gs * 0.32, gs * 0.5, 0, 6.28); ctx.fill();
    ctx.fillStyle = '#fdf6ea';
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath(); ctx.moveTo(i * gs * 0.18, wob + gs * 0.1); ctx.lineTo(i * gs * 0.18, wob - gs * 0.22); ctx.stroke();
    }
    enemyEye(ctx, -gs * 0.38, -gs * 0.36, gs * 0.13);
    enemyEye(ctx, gs * 0.38, -gs * 0.36, gs * 0.13);
  },
  bomber(ctx, e, s, wob, fa, t, time) {
    const color = e.color;
    const bs = s * (1 + 0.07 * Math.sin(time * 4));
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(0, wob, bs, 0, 6.28); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, -bs); ctx.quadraticCurveTo(bs * 0.32, -bs * 1.45, bs * 0.1, -bs * 1.75); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(bs * 0.1, -bs * 1.75, bs * 0.17, 0, 6.28); ctx.fill();
    ctx.globalAlpha = 0.35 + 0.4 * Math.sin(t * 6);
    ctx.strokeStyle = PALETTE.blood;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, wob, bs + 2.5 + Math.sin(t * 4) * 1.5, 0, 6.28); ctx.stroke();
    ctx.globalAlpha = 1;
    enemyEye(ctx, bs * 0.2, -bs * 0.12);
  },
};

export function drawEnemyBody(ctx: CanvasRenderingContext2D, e: any, s: number, wob: number, fa: number, t: number, flash?: number, time?: number): void {
  const fn: any = ENEMY_SHAPES[e.type || ''] || ENEMY_SHAPES._default;
  fn(ctx, e, s, wob, fa, t, time || 0);
  if (flash != null && flash > 0) {
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = Math.min(1, flash * 5);
    ctx.beginPath(); ctx.arc(0, wob, s + 1, 0, 6.28); ctx.fill();
    ctx.globalAlpha = 1;
  }
}
