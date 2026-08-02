/* =========================================================
   蚀月远征 · 渲染层：敌人 / Boss / 玩家 / 残像
   ========================================================= */
import { PALETTE } from '../palette.js';
import { clamp } from '../utils.js';
import { ENEMY_POOL } from '../entity_pool.js';
import { drawEnemyBody } from './layers/enemies.js';
import { drawBossBody } from './layers/bosses.js';
import type { RenderContext } from './context.js';

export function drawEnemies(rc: RenderContext): void {
  const ctx = rc.ctx;
  const p = rc.player;
  if (!ctx || !p) return;
  const pool = ENEMY_POOL;
  const data = pool._data;
  const stride = pool._stride;
  const off = pool._offsets;
  const count = pool.count;
  const views = pool._views;

  for (let i = 0; i < count; i++) {
    const base = i * stride;
    // 直接读取 TypedArray：跳过死实体
    if (data[base + off.dead]) continue;
    // 视图对象持有非数值属性（type, color, state, boss, name 等）
    const e = views[i];

    // 从 TypedArray 批量读取热数值属性
    const ex = data[base + off.x], ey = data[base + off.y];
    const s = data[base + off.size];
    const t = rc.time * 3 + (data[base + off.t] || 0) * 4;
    const wob = Math.sin(t) * 2;
    const fa = Math.atan2(p.y - ey, p.x - ex);
    const flash = data[base + off.flash];
    const slow = data[base + off.slow];
    const hp = data[base + off.hp];
    const maxHp = data[base + off.maxHp];

    ctx.save();
    ctx.translate(ex, ey);
    // Boss 呼吸光环
    if (e.boss) {
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = e.color;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, s + 10 + Math.sin(rc.time * 3) * 4, 0, 6.28); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // 脚下阴影（俯视投影）
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath(); ctx.ellipse(0, s * 0.92, s * 1.15, s * 0.42, 0, 0, 6.28); ctx.fill();
    // 身体造型
    ctx.save();
    ctx.shadowColor = e.color; ctx.shadowBlur = e.boss ? 18 : 8;
    if (e.boss) drawBossBody(ctx, e, s, wob, t, rc.time);
    else drawEnemyBody(ctx, e, s, wob, fa, t, flash, rc.time);
    ctx.restore();
    // 减速结霜（霜华之环命中反馈）
    if (slow > 0) {
      ctx.globalAlpha = Math.min(0.55, slow);
      ctx.fillStyle = '#bfe9f6';
      ctx.beginPath(); ctx.arc(0, wob, s + 1, 0, 6.28); ctx.fill();
      ctx.globalAlpha = 0.8;
      for (let i = 0; i < 5; i++) {
        const a = i * 1.256 + rc.time * 0.6;
        ctx.beginPath(); ctx.arc(Math.cos(a) * s * 0.62, wob + Math.sin(a) * s * 0.62, 1.2, 0, 6.28); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // 裂口魔蓄力预警（windup 阶段红闪）
    if (e.type === 'charger' && e.state === 'windup') {
      ctx.globalAlpha = 0.35 + 0.4 * Math.sin(rc.time * 14);
      ctx.strokeStyle = '#ff5c5c';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, wob, s + 5 + Math.sin(rc.time * 14) * 2, 0, 6.28); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // Boss 低血狂暴（红环）
    if (e.boss && hp / maxHp < 0.3) {
      ctx.globalAlpha = 0.3 + 0.3 * Math.sin(rc.time * 10);
      ctx.strokeStyle = PALETTE.blood;
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, wob, s + 14 + Math.sin(rc.time * 10) * 3, 0, 6.28); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // 血条
    if (hp < maxHp) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(6,8,20,.8)';
      ctx.fillRect(-s, -s - 11, s * 2, 4);
      ctx.fillStyle = e.boss ? PALETTE.ember : PALETTE.blood;
      ctx.fillRect(-s, -s - 11, s * 2 * clamp(hp / maxHp, 0, 1), 4);
    }
    ctx.restore();
  }
}

/* 月影残像：半透明月轮分身 */
export function drawPhantoms(rc: RenderContext): void {
  const ctx = rc.ctx;
  if (!ctx) return;
  for (const ph of rc.phantoms) {
    ctx.save();
    ctx.translate(ph.x, ph.y);
    ctx.globalAlpha = 0.5 + 0.18 * Math.sin(rc.time * 4 + ph.t * 6);
    ctx.fillStyle = '#c9b8f0';
    ctx.shadowColor = '#c9b8f0'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(0, 0, 12, 0, 6.28); ctx.fill();
    // 月牙蚀刻（轮廓）
    ctx.strokeStyle = 'rgba(22,16,44,.55)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 10, 0.4, 5.88); ctx.stroke();
    ctx.beginPath(); ctx.arc(ph.t > 2 ? 6 : 5, 0, 7.5, 0.4, 5.88, true); ctx.stroke();
    ctx.restore();
  }
}

export function drawPlayer(rc: RenderContext): void {
  const ctx = rc.ctx;
  const p = rc.player;
  if (!ctx || !p) return;
  // 脚下阴影（俯视投影）
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = 'rgba(0,0,0,.32)';
  ctx.beginPath(); ctx.ellipse(0, p.r * 0.95, p.r * 1.2, p.r * 0.5, 0, 0, 6.28); ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.facing);
  // 月轮渐变
  const g = ctx.createRadialGradient(-p.r * 0.3, -p.r * 0.35, p.r * 0.1, 0, 0, p.r);
  g.addColorStop(0, '#fff8e0'); g.addColorStop(0.6, PALETTE.goldPale); g.addColorStop(1, '#d9b26d');
  ctx.fillStyle = g;
  ctx.shadowColor = PALETTE.gold; ctx.shadowBlur = 20;
  ctx.beginPath(); ctx.arc(0, 0, p.r, 0, 6.28); ctx.fill();
  // 月牙蚀刻（缺口朝 facing）
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(20,16,6,.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, p.r - 2.5, 0.35, 6.28 - 0.35);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(p.r * 0.38, 0, p.r * 0.72, 0.35, 6.28 - 0.35, true);
  ctx.stroke();
  // 月海暗斑
  ctx.fillStyle = 'rgba(180,150,90,.22)';
  [[0.25, 0.2, 0.14], [0.1, 0.55, 0.1], [-0.2, 0.35, 0.12]].forEach(([dx, dy, r]) => {
    ctx.beginPath(); ctx.arc(dx * p.r, dy * p.r, r * p.r, 0, 6.28); ctx.fill();
  });
  // 朝向眼（光点）
  ctx.fillStyle = '#241a08';
  ctx.beginPath(); ctx.arc(p.r * 0.5, 0, 2.4, 0, 6.28); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  ctx.beginPath(); ctx.arc(p.r * 0.5 + 0.8, -0.8, 0.9, 0, 6.28); ctx.fill();
  ctx.restore();
  // 无敌光环
  if (p.invuln > 0) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.globalAlpha = Math.min(1, p.invuln) * 0.6;
    ctx.strokeStyle = PALETTE.ice;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, p.r + 5 + Math.sin(rc.time * 8) * 2, 0, 6.28); ctx.stroke();
    ctx.restore();
  }
  // 受击红闪
  if (rc.hitFlash > 0) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.globalAlpha = Math.min(1, rc.hitFlash * 3) * 0.5;
    ctx.fillStyle = PALETTE.blood;
    ctx.beginPath(); ctx.arc(0, 0, p.r, 0, 6.28); ctx.fill();
    ctx.restore();
  }
}
