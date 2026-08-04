/* =========================================================
   蚀月远征 · Boss 行为 / 专属技能
   攻击设计原则：弹幕密度 + 交叉封锁 + 追踪压制 + 连发组合
   让玩家必须持续走位与规划路线，而非站着不动即可全躲
   ========================================================= */
import { shakeScreen } from '../state/render.js';
import { RNG, rand, angTo, pick } from '../utils.js';
import { PROJECTILE_POOL } from '../ecs/entity_pool.js';
import { spawnBurst, spawnRing, spawnSpark, spawnStar, spawnShard, spawnStreak, spawnGlow } from '../render/effects/fx.js';
import { spawnText } from '../ui/hud_utils.js';
import { AudioEngine } from '../audio/engine.js';
import { spawnEnemy } from '../domain/spawn.js';
import { meleeHit } from '../domain/combat.js';
import type { EnemyInstance } from '../types/core.d.ts';

import { eSt, pSt } from '../state/accessors.js';

const TAU = Math.PI * 2;

/* =========================================================
   弹幕形态工具（密度 / 封锁 / 追踪）
   ========================================================= */

/** 单发敌弹 */
function shot(e: any, ang: number, speed: number, color: string, opts: any = {}): void {
  const mark: any = opts.mark ? { [opts.mark]: true } : {};
  eSt().projectiles.push(PROJECTILE_POOL.addWith({
    x: opts.x ?? e.x, y: opts.y ?? e.y,
    vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
    r: opts.r ?? 6, dmg: e.dmg * (opts.dmgMul ?? 0.7),
    color, hit: new Set(), enemy: true, life: opts.life ?? 2.5,
    ...mark,
  }));
}

/** 全向 N 弹（offset 错位角） */
function ringShot(e: any, n: number, speed: number, color: string, opts: any = {}): void {
  const off = opts.offset ?? 0;
  for (let j = 0; j < n; j++) shot(e, (j / n) * TAU + off, speed, color, opts);
}

/** 双层全向（第二层错位半格，消除固定间隙） */
function ringLayerShot(e: any, n: number, speed: number, color: string, opts: any = {}): void {
  ringShot(e, n, speed, color, opts);
  ringShot(e, n, speed, color, { ...opts, offset: (opts.offset ?? 0) + Math.PI / n });
}

/** 扇形 N 弹（spread = 总弧宽） */
function fanShot(e: any, baseAng: number, n: number, spread: number, speed: number, color: string, opts: any = {}): void {
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1) - 0.5;
    shot(e, baseAng + t * spread, speed, color, opts);
  }
}

/** 螺旋圈（多圈递增角，漩涡般持续压迫） */
function spiralBurst(e: any, circles: number, n: number, speed: number, color: string, opts: any = {}): void {
  for (let c = 0; c < circles; c++) {
    ringShot(e, n, speed, color, { ...opts, offset: c * 0.36 });
  }
}

/** X 形夹击：四斜向扇形（封锁斜向走位） */
function crossShot(e: any, n: number, spread: number, speed: number, color: string, opts: any = {}): void {
  for (const ang of [Math.PI / 4, 3 * Math.PI / 4, 5 * Math.PI / 4, 7 * Math.PI / 4]) {
    fanShot(e, ang, n, spread, speed, color, opts);
  }
}

/** 追踪球（accel 越追越快，玩家难以甩脱） */
function trackBalls(e: any, n: number, speed: number, accel: number, color: string, opts: any = {}): void {
  const p = pSt().player; if (!p) return;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + RNG() * 0.6;
    eSt().projectiles.push(PROJECTILE_POOL.addWith({
      homing: true, x: e.x, y: e.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
      target: p, speed, accel, r: opts.r ?? 8, dmg: e.dmg * (opts.dmgMul ?? 0.8),
      color, hit: new Set(), enemy: true, t: 0, life: opts.life ?? 4, orb: true,
    }));
  }
}

/** 地面封锁：玩家附近 n 道延迟落点（交叉封锁走位） */
function groundStrike(e: any, n: number, r: number, delay: number, color: string, opts: any = {}): void {
  const p = pSt().player; if (!p) return;
  const spread = opts.spread ?? 110;
  for (let i = 0; i < n; i++) {
    eSt().projectiles.push(PROJECTILE_POOL.addWith({
      ground: true, x: p.x + rand(-spread, spread), y: p.y + rand(-spread, spread),
      t: i * (opts.stagger ?? 0.15), delay, r, dmg: e.dmg * (opts.dmgMul ?? 0.8),
      color, lightning: !!opts.lightning,
    }));
  }
}

/* ---------- Boss 专属技能 ---------- */
const BOSS_SKILLS: Record<string, (e: EnemyInstance) => void> = {
  wave: bossWave, minions: bossMinions, dash: bossDash,
  /* 蚀潮巨兽：环形潮浪（双层全向弹 + 螺旋潮圈 + 追踪潮球） */
  tidalWave(e: any) {
    // 潮浪喷涌：碧潮冲击环 + 浪花迸溅
    spawnRing(e.x, e.y, '#5c8a9e', 0.5, 90, 3.5);
    spawnBurst(e.x, e.y, '#7fc4d8', 14);
    spawnStreak(e.x, e.y, 0, 60, 3, '#9fd6e8', 0.4);
    const base = RNG() * TAU;
    // 双层潮弹（错位消除间隙）+ 快层推挤
    ringLayerShot(e, 12, 210, '#9fd6e8', { offset: base, r: 5, dmgMul: 0.45, life: 3, mark: 'wave' });
    ringLayerShot(e, 12, 300, '#5c8a9e', { offset: base + 0.2, r: 5, dmgMul: 0.4, life: 3, mark: 'wave' });
    // 螺旋潮圈（持续漩涡压迫）
    spiralBurst(e, 2, 10, 260, '#7fc4d8', { r: 4, dmgMul: 0.35, life: 3, mark: 'wave' });
    // 追踪潮球
    trackBalls(e, 2, 211, 60, '#5c8a9e', { dmgMul: 0.53, life: 3.5 });
  },
  /* 潮噬之母：产卵孵化 + 全向压制弹 + 追踪 */
  spawnTide(e: EnemyInstance) {
    // 产卵囊迸裂：翠潮光爆 + 六道破囊
    spawnGlow(e.x, e.y, 24, '#6fa8a0', 0.4);
    spawnRing(e.x, e.y, '#6fa8a0', 0.45, 55, 3);
    spawnBurst(e.x, e.y, '#8fd8c8', 18);
    spawnSpark(e.x, e.y, '#b6f0e0', 8, 160);
    for (let i = 0; i < 6; i++) {
      const m = spawnEnemy('grub', { hpMul: 0.5 });
      m.x = e.x + rand(-70, 70); m.y = e.y + rand(-70, 70);
      m.spd = 130; m.size = 7;
      spawnRing(m.x, m.y, '#8fd8c8', 0.22, 16, 1.4);
      spawnBurst(m.x, m.y, '#8fd8c8', 4);
    }
    // 产卵时也不忘压制：全向翠弹 + 追踪泡
    ringShot(e, 12, 240, '#6fa8a0', { r: 5, dmgMul: 0.5, life: 2.5, mark: 'wave' });
    trackBalls(e, 2, 194, 50, '#8fd8c8', { dmgMul: 0.53 });
  },
  /* 蚀壳战车：连续冲撞（转向追踪）×3 + 撞击震地 */
  ram(e: EnemyInstance) {
    spawnRing(e.x, e.y, '#7a8aa5', 0.4, 70, 3);
    spawnBurst(e.x, e.y, '#9aa5b8', 12);
    e.dashCount = 3;
    bossDash(e);
    eSt().projectiles.push(PROJECTILE_POOL.addWith({ ground: true, x: e.x, y: e.y, t: 0, delay: 0.5, r: 120, dmg: e.dmg * 0.88, color: '#7a8aa5' }));
  },
  /* 噬月君主：双波扇形斩 + X 形弹网 + 追踪 */
  moonSlash(e: EnemyInstance) {
    const p = pSt().player; if (!p) return;
    const a = angTo(e, p);
    // 斩击起手：金色月弧 + 剑气扫掠
    spawnRing(e.x, e.y, '#ffe9a8', 0.35, 70, 2.6);
    spawnStreak(e.x, e.y, a, 70, 3, '#fff5d6', 0.3);
    spawnSpark(e.x, e.y, '#ffe9a8', 8, 200);
    meleeHit(e.x + Math.cos(a) * 60, e.y + Math.sin(a) * 60, 110, e.dmg * 1.4, { shake: 10 });
    // 双波月刃（错位横扫，覆盖更广）
    for (let w = 0; w < 2; w++) {
      fanShot(e, a + (w - 0.5) * 0.35, 6, 1.15, 380 + w * 70, '#b49ae8', { r: 8, dmgMul: 0.8, life: 1.4, mark: 'moonblade' });
    }
    // X 形弹网（封锁斜向走位）
    crossShot(e, 3, 0.7, 300, '#c9b8f0', { r: 6, dmgMul: 0.6, life: 1.8, mark: 'moonblade' });
    trackBalls(e, 2, 220, 70, '#b49ae8', { dmgMul: 0.53 });
  },
  /* 月影巫王：加速追踪球 ×5（两组错时）+ 全向弹 + 诅咒 */
  shadowOrb(e: EnemyInstance) {
    const p = pSt().player; if (!p) return;
    spawnRing(e.x, e.y, '#9a86c8', 0.5, 50, 3);
    spawnRing(e.x, e.y, '#b49ae8', 0.4, 32, 2);
    spawnBurst(e.x, e.y, '#7c6d9e', 12);
    spawnSpark(e.x, e.y, '#b49ae8', 8, 140);
    // 快球先行 + 慢球后发（前后夹击，玩家无单一躲避方向）
    trackBalls(e, 3, 220, 90, '#9a86c8', { dmgMul: 0.7, life: 4 });
    trackBalls(e, 2, 158, 60, '#b49ae8', { dmgMul: 0.62, life: 4.5 });
    ringShot(e, 12, 230, '#7c6d9e', { r: 6, dmgMul: 0.55, life: 3, mark: 'wave' });
    p.effects.curseTimer = Math.max(p.effects.curseTimer || 0, 3);
    spawnText(p.x, p.y - 40, '蚀咒', '#9a86c8');
  },
  /* 断月剑豪：三连斩（双排扇形横扫 + 斜向封锁弹 + 收尾追踪） */
  triSlash(e: any) {
    const p = pSt().player; if (!p) return;
    const a = angTo(e, p);
    spawnGlow(e.x, e.y, 20, '#c8c2e8', 0.35);
    spawnRing(e.x, e.y, '#e4e0f5', 0.4, 55, 2.4);
    for (let w = 0; w < 3; w++) {
      spawnStreak(e.x, e.y, a + (w - 1) * 0.55, 60, 2.5, '#d8d2f0', 0.3);
      // 双排剑芒（错位加密）
      const wa = a + (w - 1) * 0.55;
      fanShot(e, wa, 7, 1.75, 430, '#c8c2e8', { x: e.x + Math.cos(a) * 40, y: e.y + Math.sin(a) * 40, r: 7, dmgMul: 0.7, life: 1.3, mark: 'moonblade' });
      fanShot(e, wa + 0.08, 6, 1.6, 340, '#d8d2f0', { x: e.x + Math.cos(a) * 40, y: e.y + Math.sin(a) * 40, r: 6, dmgMul: 0.55, life: 1.6, mark: 'moonblade' });
      // 斜向封锁弹（封死横向走位）
      for (const da of [-1.35, 1.35]) {
        fanShot(e, wa + da, 3, 0.5, 300, '#d8d2f0', { r: 5, dmgMul: 0.5, life: 1.7, mark: 'moonblade' });
      }
    }
    trackBalls(e, 2, 229, 80, '#c8c2e8', { dmgMul: 0.53 });
  },
  /* 裂空魔龙：烈焰吐息 + 双侧绕后扇形 + 追踪火球 */
  breath(e: EnemyInstance) {
    const p = pSt().player; if (!p) return;
    const a = angTo(e, p);
    spawnGlow(e.x + Math.cos(a) * 30, e.y + Math.sin(a) * 30, 22, '#ff8a5c', 0.4);
    spawnRing(e.x, e.y, '#ff6b6b', 0.35, 60, 3);
    spawnBurst(e.x, e.y, '#ffb84d', 12);
    spawnSpark(e.x, e.y, '#ffd9a8', 8, 180);
    eSt().projectiles.push(PROJECTILE_POOL.addWith({ breath: true, x: e.x + Math.cos(a) * 30, y: e.y + Math.sin(a) * 30,
      dir: a, t: 0, dur: 0.9, range: 260, width: 58, dmg: e.dmg * 1.1, color: '#ff6b6b' }));
    // 双侧绕后扇形（玩家闪避吐息时被侧翼夹击）
    for (const side of [-1, 1]) {
      fanShot(e, a + side * 1.9, 5, 1.2, 300, '#ffb84d', { r: 6, dmgMul: 0.55, life: 2, mark: 'ember' });
    }
    trackBalls(e, 3, 202, 70, '#ff8a5c', { dmgMul: 0.62 });
  },
  /* 蚀雷巨枭：五道落雷（快速交错）+ 全向电弹 + 追踪 */
  lightning(e: EnemyInstance) {
    const p = pSt().player; if (!p) return;
    spawnGlow(e.x, e.y, 18, '#8f9aee', 0.4);
    spawnRing(e.x, e.y, '#a8d8ff', 0.5, 46, 2.6);
    spawnSpark(e.x, e.y, '#cfe4ff', 10, 200);
    // 五道落雷封锁（更快交错，覆盖玩家前后左右）
    groundStrike(e, 5, 68, 0.8, '#8f9aee', { stagger: 0.12, spread: 120, dmgMul: 0.9, lightning: true });
    // 全向电弹（逼迫玩家在落雷间隙中走位）
    ringShot(e, 16, 250, '#8f9aee', { r: 5, dmgMul: 0.6, life: 2.5, mark: 'pulse' });
    trackBalls(e, 2, 211, 80, '#a8d8ff', { dmgMul: 0.53 });
  },
  /* 深渊巢母：酸雾 + 扇形酸弹 + 追踪 */
  acidMist(e: EnemyInstance) {
    const p = pSt().player; if (!p) return;
    spawnGlow(e.x, e.y, 26, '#7fce5a', 0.5);
    spawnRing(e.x, e.y, '#7fce5a', 0.5, 60, 3);
    spawnBurst(e.x, e.y, '#a8e88a', 14);
    spawnSpark(e.x, e.y, '#d0f5b0', 8, 120);
    eSt().projectiles.push(PROJECTILE_POOL.addWith({ aoe: true, x: e.x, y: e.y, r: 0, maxR: 360, dmg: e.dmg * 0.2, color: '#7fce5a', t: 0, slow: 0.5, enemy: true, hit: new Set(), mist: true }));
    // 酸弹扇形（毒雾掩护下的齐射）
    fanShot(e, angTo(e, p), 12, 2.0, 240, '#7fce5a', { r: 6, dmgMul: 0.55, life: 2.2, mark: 'acid' });
    trackBalls(e, 2, 176, 60, '#a8e88a', { dmgMul: 0.53 });
  },
  /* 蚀月终焉：双层全向 + 螺旋 + 追踪 + 地面封锁（终焉级弹幕） */
  eclipsePulse(e: EnemyInstance) {
    spawnRing(e.x, e.y, '#ffb84d', 0.55, 95, 4);
    spawnRing(e.x, e.y, '#ffe9a8', 0.4, 60, 2.6);
    spawnGlow(e.x, e.y, 30, '#ffd54a', 0.5);
    spawnBurst(e.x, e.y, '#ffe9a8', 16);
    spawnSpark(e.x, e.y, '#fff5d6', 12, 220);
    // 双层全向金弹（错位无间隙）
    ringLayerShot(e, 12, 220, '#ffb84d', { r: 6, dmgMul: 0.6, life: 3, mark: 'pulse' });
    // 快速外圈（里慢外快，双速压迫）
    ringLayerShot(e, 12, 330, '#ffe9a8', { r: 5, dmgMul: 0.5, life: 3, mark: 'pulse' });
    // 螺旋金芒
    spiralBurst(e, 2, 10, 280, '#ffd54a', { r: 5, dmgMul: 0.45, life: 3, mark: 'pulse' });
    // 追踪蚀球
    trackBalls(e, 4, 220, 100, '#ffb84d', { dmgMul: 0.62 });
    // 地面封锁（落点切割走位路线）
    groundStrike(e, 4, 78, 1.0, '#ffb84d', { stagger: 0.18, spread: 160, dmgMul: 0.7 });
  },
};

export function bossTick(e: EnemyInstance, dt: number): void {
  const p = pSt().player;
  if (!p) return;
  e.stateT -= dt;
  e.attT -= dt;
  if (e.state === 'enter') {
    e.y += 90 * dt;
    if (e.y >= 90) { e.state = 'chase'; e.stateT = 0; }
    return;
  }
  const a = angTo(e, p);
  if (e.state === 'dashMove') {
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    e.stateT -= dt;
    if (e.stateT <= 0) {
      // 连续冲撞：剩余次数内重新瞄准玩家，形成追击压制
      if ((e.dashCount || 0) > 0) {
        e.dashCount = (e.dashCount || 0) - 1;
        const da = angTo(e, p);
        e.vx = Math.cos(da) * 460; e.vy = Math.sin(da) * 460;
        e.stateT = 0.5;
        eSt().projectiles.push(PROJECTILE_POOL.addWith({ ground: true, x: e.x, y: e.y, t: 0, delay: 0.45, r: 110, dmg: e.dmg * 0.79, color: '#7a8aa5' }));
        shakeScreen(6);
      } else {
        e.state = 'chase';
      }
    }
  } else {
    // 蓄势逼近：攻击冷却末尾加速冲向玩家，杜绝安逸风筝
    const closing = e.attT < 0.5 ? 1.9 : 1;
    e.x += Math.cos(a) * e.spd * closing * dt;
    e.y += Math.sin(a) * e.spd * closing * dt;
  }

  if (e.attT <= 0) {
    e.attT = e.attCd || 3.4;
    const skill = pick(e.skills || ['wave']);
    const fn = BOSS_SKILLS[skill as string] || bossWave;
    fn(e);
    AudioEngine.playSfx(skill === 'minions' || skill === 'spawnTide' ? 'boss_summon' : skill === 'dash' || skill === 'ram' ? 'boss_dash' : 'boss_wave');
  }
}

export function bossWave(e: any): void {
  const p = pSt().player; if (!p) return;
  const a = angTo(e, p);
  // 弹幕起手：赤潮冲击 + 扇形火弧
  spawnRing(e.x, e.y, '#ff9d6b', 0.4, 65, 3);
  spawnBurst(e.x, e.y, '#ffb884', 12);
  spawnStreak(e.x, e.y, a, 55, 2.5, '#ffd9a8', 0.3);
  // 双排扇形（错位加密，横向位移无法全躲）
  fanShot(e, a, 8, 1.1, 170, '#ff9d6b', { r: 7, dmgMul: 0.7, life: 3, mark: 'ember' });
  fanShot(e, a + 0.07, 7, 1.0, 260, '#ffb84d', { r: 6, dmgMul: 0.6, life: 3, mark: 'ember' });
  // 尾随追踪火球
  trackBalls(e, 1, 211, 70, '#ff9d6b', { dmgMul: 0.53 });
  shakeScreen(4);
}
export function bossMinions(e: EnemyInstance): void {
  // 召唤法阵：暗金召唤圈 + 三处落地光柱
  spawnRing(e.x, e.y, '#e9c987', 0.6, 80, 3);
  spawnRing(e.x, e.y, '#b49ae8', 0.45, 52, 2);
  spawnGlow(e.x, e.y, 22, '#e9c987', 0.5);
  for (let i = 0; i < 3; i++) spawnEnemy(pick(['grub', 'rat', 'wing', 'charger']), { hpMul: 0.7 });
  spawnBurst(e.x, e.y, '#e9c987', 12);
  spawnSpark(e.x, e.y, '#ffe9a8', 8, 150);
  // 召唤间隙的全向压制
  ringShot(e, 10, 220, '#e9c987', { r: 5, dmgMul: 0.5, life: 2.6, mark: 'pulse' });
  trackBalls(e, 1, 202, 70, '#b49ae8', { dmgMul: 0.53 });
}
export function bossDash(e: EnemyInstance): void {
  const p = pSt().player; if (!p) return;
  const a = angTo(e, p);
  // 冲撞起手：尘土迸扬 + 速度线
  spawnBurst(e.x, e.y, '#9aa5b8', 10);
  spawnRing(e.x, e.y, '#9aa5b8', 0.3, 45, 2.4);
  spawnStreak(e.x, e.y, a, 50, 2.5, '#c8ced8', 0.35);
  e.vx = Math.cos(a) * 460; e.vy = Math.sin(a) * 460;
  e.state = 'dashMove'; e.stateT = 0.5;
}
