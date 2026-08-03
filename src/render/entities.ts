/* =========================================================
   蚀月远征 · 渲染层：敌人 / Boss / 玩家 / 残像
   ========================================================= */
import { PALETTE } from '../data/palette.js';
import { clamp } from '../utils.js';
import { ENEMY_POOL } from '../ecs/entity_pool.js';
import { drawEnemyBody } from './layers/enemies.js';
import { drawBossBody } from './layers/bosses.js';
import type { RenderContext } from './context.js';
import { shapeCache } from './shape_cache.js';

/** 敌人身体离屏缓存刷新计数器（每4帧刷新一次，以支持身体动画） */
let _enemyCacheFrame = 0;

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
  const w = rc.width, h = rc.height;

  // 每帧递增一次缓存刷新计数器
  _enemyCacheFrame++;
  const doRefresh = _enemyCacheFrame % 4 === 0;

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

    // 视口裁剪：跳过屏幕外的敌人
    const margin = s * 4 + 40;
    if (ex < -margin || ex > w + margin || ey < -margin || ey > h + margin) continue;

    ctx.save();
    ctx.translate(ex, ey + wob);
    // Boss 呼吸光环
    if (e.boss) {
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = e.color || '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, s + 10 + Math.sin(rc.time * 3) * 4, 0, 6.28); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // 脚下阴影（俯视投影）
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath(); ctx.ellipse(0, s * 0.92, s * 1.15, s * 0.42, 0, 0, 6.28); ctx.fill();
    // 身体造型（使用离屏缓存，每4帧刷新以支持动画）
    ctx.save();
    const cacheKey = 'enemy_' + (e.type || 'default') + '_' + (e.color || '#888') + '_' + Math.round(s);
    const cacheSize = Math.ceil(s * 4) + 40;
    const drawBody = (bctx: CanvasRenderingContext2D) => {
      bctx.translate(cacheSize / 2, cacheSize / 2);
      bctx.shadowColor = e.color || '#fff'; bctx.shadowBlur = e.boss ? 18 : 8;
      if (e.boss) drawBossBody(bctx, e, s, 0, 0, t, rc.time);
      else drawEnemyBody(bctx, e, s, 0, 0, t, 0, rc.time);
    };
    const cacheCanvas = doRefresh
      ? shapeCache.refresh(cacheKey, cacheSize, cacheSize, drawBody)
      : shapeCache.get(cacheKey, cacheSize, cacheSize, drawBody);
    ctx.drawImage(cacheCanvas, -cacheSize / 2, -cacheSize / 2);
    ctx.restore();
    // 受击白闪（不缓存，实时绘制）
    if (flash > 0) {
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = Math.min(1, flash * 5);
      ctx.beginPath(); ctx.arc(0, 0, s + 1, 0, 6.28); ctx.fill();
      ctx.restore();
    }
    // 减速结霜（霜华之环命中反馈）
    if (slow > 0) {
      ctx.globalAlpha = Math.min(0.55, slow);
      ctx.fillStyle = '#bfe9f6';
      ctx.beginPath(); ctx.arc(0, 0, s + 1, 0, 6.28); ctx.fill();
      ctx.globalAlpha = 0.8;
      for (let i = 0; i < 5; i++) {
        const a = i * 1.256 + rc.time * 0.6;
        ctx.beginPath(); ctx.arc(Math.cos(a) * s * 0.62, Math.sin(a) * s * 0.62, 1.2, 0, 6.28); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // 裂口魔蓄力预警（windup 阶段红闪）
    if (e.type === 'charger' && e.state === 'windup') {
      ctx.globalAlpha = 0.35 + 0.4 * Math.sin(rc.time * 14);
      ctx.strokeStyle = '#ff5c5c';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, s + 5 + Math.sin(rc.time * 14) * 2, 0, 6.28); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // Boss 低血狂暴（红环）
    if (e.boss && hp / maxHp < 0.3) {
      ctx.globalAlpha = 0.3 + 0.3 * Math.sin(rc.time * 10);
      ctx.strokeStyle = PALETTE.blood;
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, 0, s + 14 + Math.sin(rc.time * 10) * 3, 0, 6.28); ctx.stroke();
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

  // 预渲染玩家月轮身体（不含朝向和阴影等动态元素）
  const playerSize = Math.ceil(p.r * 2.5) + 30;
  const playerCache = shapeCache.get('player_' + Math.round(p.r), playerSize, playerSize, (bctx) => {
    const cx = playerSize / 2, cy = playerSize / 2;
    // 月轮渐变
    const g = bctx.createRadialGradient(cx - p.r * 0.3, cy - p.r * 0.35, p.r * 0.1, cx, cy, p.r);
    g.addColorStop(0, '#fff8e0'); g.addColorStop(0.6, PALETTE.goldPale); g.addColorStop(1, '#d9b26d');
    bctx.fillStyle = g;
    bctx.shadowColor = PALETTE.gold; bctx.shadowBlur = 20;
    bctx.beginPath(); bctx.arc(cx, cy, p.r, 0, 6.28); bctx.fill();
    // 月牙蚀刻（缺口朝默认方向）
    bctx.shadowBlur = 0;
    bctx.strokeStyle = 'rgba(20,16,6,.55)';
    bctx.lineWidth = 2;
    bctx.beginPath();
    bctx.arc(cx, cy, p.r - 2.5, 0.35, 6.28 - 0.35);
    bctx.stroke();
    bctx.beginPath();
    bctx.arc(cx + p.r * 0.38, cy, p.r * 0.72, 0.35, 6.28 - 0.35, true);
    bctx.stroke();
    // 月海暗斑
    bctx.fillStyle = 'rgba(180,150,90,.22)';
    [[0.25, 0.2, 0.14], [0.1, 0.55, 0.1], [-0.2, 0.35, 0.12]].forEach(([dx, dy, r]) => {
      bctx.beginPath(); bctx.arc(cx + dx * p.r, cy + dy * p.r, r * p.r, 0, 6.28); bctx.fill();
    });
    // 朝向眼（光点）
    bctx.fillStyle = '#241a08';
    bctx.beginPath(); bctx.arc(cx + p.r * 0.5, cy, 2.4, 0, 6.28); bctx.fill();
    bctx.fillStyle = 'rgba(255,255,255,.9)';
    bctx.beginPath(); bctx.arc(cx + p.r * 0.5 + 0.8, cy - 0.8, 0.9, 0, 6.28); bctx.fill();
  });
  // 脚下阴影（俯视投影）
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = 'rgba(0,0,0,.32)';
  ctx.beginPath(); ctx.ellipse(0, p.r * 0.95, p.r * 1.2, p.r * 0.5, 0, 0, 6.28); ctx.fill();
  ctx.restore();
  // 玩家身体（使用离屏缓存，旋转朝向）
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.facing);
  ctx.drawImage(playerCache, -playerSize / 2, -playerSize / 2);
  ctx.restore();
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
