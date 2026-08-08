/* =========================================================
   蚀月远征 · Boss 行为 / 专属技能
   攻击设计原则：弹幕密度 + 交叉封锁 + 追踪压制 + 连发组合
   让玩家必须持续走位与规划路线，而非站着不动即可全躲
   ========================================================= */
import { PALETTE } from '../../assets/palette.js';
import { EVENTS } from '../../engine/core/events.js';
import { shakeScreen } from '../../state/render.js';
import { RNG, rand, angTo, pick } from '../../engine/util/utils.js';
import { PROJECTILE_POOL } from '../../engine/ecs/entity_pool.js';
import { HOMING_TUNE } from '../../config/homing_tune.js';
import { spawnBurst, spawnRing, spawnSpark, spawnStar, spawnShard, spawnStreak, spawnGlow } from '../../platform/fx/fx.js';
import { EventBus } from '../../engine/core/event_bus.js';
import { AudioEngine } from '../../platform/audio/engine.js';
import { spawnEnemy } from '../spawn.js';
import { meleeHit } from '../combat.js';
import type { EnemyInstance } from '../../types/core.d.ts';

import { eSt, pSt } from '../../state/accessors.js';

const TAU = Math.PI * 2;

/* =========================================================
   弹幕形态工具（密度 / 封锁 / 追踪）
   ========================================================= */

/** 单发敌弹（wId 指定异型弹头：enemy_wave/enemy_flame/...；arc/charge/gap 为弹头参数） */
function shot(e: any, ang: number, speed: number, color: string, opts: any = {}): void {
  const mark: any = opts.mark ? { [opts.mark]: true } : {};
  eSt().projectiles.push(PROJECTILE_POOL.addWith({
    x: opts.x ?? e.x, y: opts.y ?? e.y,
    vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
    r: opts.r ?? 6, dmg: e.dmg * (opts.dmgMul ?? 0.7),
    color, hit: new Set(), enemy: true, life: opts.life ?? 2.5,
    wId: opts.wId, arc: opts.arc, charge: opts.charge, gap: opts.gap,
    baseSpeed: opts.baseSpeed ?? speed, splitAt: opts.splitAt, chargeT: opts.chargeT, phase: opts.phase,
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

/** 追踪球（accel 越追越快；turnRate/speedMax/lockT 由 HOMING_TUNE 差异化调校——
    每个 Boss 的追踪弹都可被走位应对，只是手法不同。漏传时兜底为可甩默认值，
    绝不允许退回"瞬时转向+无限锁定"的必中税） */
function trackBalls(e: any, n: number, speed: number, accel: number, color: string, opts: any = {}): void {
  const p = pSt().player; if (!p) return;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + RNG() * 0.6;
    eSt().projectiles.push(PROJECTILE_POOL.addWith({
      homing: true, x: e.x, y: e.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
      target: p, speed, accel, r: opts.r ?? 8, dmg: e.dmg * (opts.dmgMul ?? 0.8),
      color, hit: new Set(), enemy: true, t: 0, life: opts.life ?? 4, orb: true,
      speedMax: opts.speedMax ?? 340, turnRate: opts.turnRate ?? 3.0, lockT: opts.lockT ?? 2.8,
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
    spawnRing(e.x, e.y, PALETTE.skyDark, 0.5, 90, 3.5);
    spawnBurst(e.x, e.y, '#7fc4d8', 14);
    spawnStreak(e.x, e.y, 0, 60, 3, PALETTE.ice, 0.4);
    const base = RNG() * TAU;
    // 潮汐呼吸：涨潮(breath>1)推快 / 退潮(<1)滞涩——节奏随 attT 相位波动
    const breath = 1 + 0.30 * Math.sin(e.attT * 2.4);
    // 浪花弧片双层（错位消除间隙）+ 快层推挤
    ringLayerShot(e, 12, 164 * breath, PALETTE.ice, { offset: base, r: 6, dmgMul: 0.45, life: 3, mark: 'wave', wId: 'enemy_wave', arc: (RNG() - 0.5) * 0.3, phase: RNG() * TAU });
    ringLayerShot(e, 12, 235 * breath, PALETTE.skyDark, { offset: base + 0.2, r: 6, dmgMul: 0.4, life: 3, mark: 'wave', wId: 'enemy_wave', arc: (RNG() - 0.5) * 0.3, phase: RNG() * TAU });
    // 螺旋潮圈（持续漩涡压迫）
    spiralBurst(e, 2, 10, 203 * breath, '#7fc4d8', { r: 5, dmgMul: 0.35, life: 3, mark: 'wave', wId: 'enemy_wave', arc: (RNG() - 0.5) * 0.3, phase: RNG() * TAU });
    // 追踪潮球（绕圈甩）
    trackBalls(e, 2, 179, 49, PALETTE.skyDark, { dmgMul: 0.53, life: 3.5, ...HOMING_TUNE.tidalWave });
  },
  /* 潮噬之母：产卵孵化 + 全向压制弹 + 追踪 */
  spawnTide(e: EnemyInstance) {
    // 产卵囊迸裂：翠潮光爆 + 六道破囊
    spawnGlow(e.x, e.y, 24, PALETTE.tideDark, 0.4);
    spawnRing(e.x, e.y, PALETTE.tideDark, 0.45, 55, 3);
    spawnBurst(e.x, e.y, PALETTE.teal, 18);
    spawnSpark(e.x, e.y, '#b6f0e0', 8, 160);
    for (let i = 0; i < 6; i++) {
      const m = spawnEnemy('grub', { hpMul: 0.5 });
      m.x = e.x + rand(-70, 70); m.y = e.y + rand(-70, 70);
      m.spd = 130; m.size = 7;
      spawnRing(m.x, m.y, PALETTE.teal, 0.22, 16, 1.4);
      spawnBurst(m.x, m.y, PALETTE.teal, 4);
    }
    // 产卵时也不忘压制：卵囊弹（母体孕育，飞散中挣出幼体）+ 三角幼体 + 追踪泡
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + RNG() * 0.5;
      shot(e, a, 121, PALETTE.teal, { r: 7, dmgMul: 0.5, life: 3, wId: 'enemy_egg', splitAt: 1.1 });
    }
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + RNG() * 0.6;
      shot(e, a, 189, PALETTE.paleGreen, { r: 5, dmgMul: 0.45, life: 2.6, wId: 'enemy_tri' });
    }
    trackBalls(e, 2, 153, 34, PALETTE.teal, { dmgMul: 0.53, ...HOMING_TUNE.spawnTide });
  },
  /* 蚀壳战车：连续冲撞（转向追踪）×2 + 撞击震地 */
  ram(e: EnemyInstance) {
    spawnRing(e.x, e.y, PALETTE.slate, 0.4, 70, 3);
    spawnBurst(e.x, e.y, PALETTE.steel, 12);
    e.dashCount = 2;    // 连段 3→2：总追击时长下降，玩家有喘息窗口
    bossDash(e);
    // 轮辐弹：旋转十字辐条凌空碾过（车轮意象）
    ringShot(e, 5, 145, PALETTE.steel, { r: 6, dmgMul: 0.55, life: 3, wId: 'enemy_spoke' });
    eSt().projectiles.push(PROJECTILE_POOL.addWith({ ground: true, x: e.x, y: e.y, t: 0, delay: 0.5, r: 120, dmg: e.dmg * 0.88, color: PALETTE.slate }));
  },
  /* 噬月君主：双波扇形斩 + X 形弹网 + 追踪 */
  moonSlash(e: EnemyInstance) {
    const p = pSt().player; if (!p) return;
    const a = angTo(e, p);
    // 斩击起手：金色月弧 + 剑气扫掠
    spawnRing(e.x, e.y, PALETTE.fireBright, 0.35, 70, 2.6);
    spawnStreak(e.x, e.y, a, 70, 3, PALETTE.warmWhite, 0.3);
    spawnSpark(e.x, e.y, PALETTE.fireBright, 8, 200);
    meleeHit(e.x + Math.cos(a) * 60, e.y + Math.sin(a) * 60, 110, e.dmg * 1.4, { shake: 10 });
    // 月相月刃：弹幕数量即月相（满月 8 道 / 新月 2 道且更快）
    const moonPhase = Math.sin(e.attT * 1.6);
    const blades = moonPhase > 0.3 ? 8 : moonPhase < -0.3 ? 2 : 5;
    const bladeSpd = blades <= 2 ? 400 : 323;
    const bladeBase = RNG() * TAU;
    for (let i = 0; i < blades; i++) {
      shot(e, bladeBase + (i / blades) * TAU, bladeSpd, PALETTE.violet, { r: 9, dmgMul: 0.8, life: 1.6, mark: 'moonblade', wId: 'enemy_moon' });
    }
    // 双波月刃（错位横扫，覆盖更广）
    for (let w = 0; w < 2; w++) {
      fanShot(e, a + (w - 0.5) * 0.35, 5, 1.15, 323 + w * 60, PALETTE.violet, { r: 8, dmgMul: 0.8, life: 1.4, mark: 'moonblade', wId: 'enemy_moon' });
    }
    // X 形弹网（封锁斜向走位）
    crossShot(e, 3, 0.7, 255, '#c9b8f0', { r: 6, dmgMul: 0.6, life: 1.8, mark: 'moonblade', wId: 'enemy_moon' });
    trackBalls(e, 2, 187, 57, PALETTE.violet, { dmgMul: 0.53, ...HOMING_TUNE.moonSlash });
  },
  /* 月影巫王：加速追踪球 ×5（两组错时）+ 全向弹 + 诅咒 */
  shadowOrb(e: EnemyInstance) {
    const p = pSt().player; if (!p) return;
    spawnRing(e.x, e.y, PALETTE.orchid, 0.5, 50, 3);
    spawnRing(e.x, e.y, PALETTE.violet, 0.4, 32, 2);
    spawnBurst(e.x, e.y, PALETTE.violetDark, 12);
    spawnSpark(e.x, e.y, PALETTE.violet, 8, 140);
    // 快球先行 + 慢球后发（前后夹击；转向受限可被急转甩开）
    trackBalls(e, 3, 179, 45, PALETTE.orchid, { dmgMul: 0.7, life: 4, ...HOMING_TUNE.shadowOrbF });
    trackBalls(e, 2, 128, 29, PALETTE.violet, { dmgMul: 0.62, life: 4.5, ...HOMING_TUNE.shadowOrbS });
    // 咒文符箓：旋转符箓飞散（蓄力发亮由渲染层 charge 表达）
    ringShot(e, 10, 196, PALETTE.violetDark, { r: 7, dmgMul: 0.55, life: 3, mark: 'pulse', wId: 'enemy_rune', chargeT: 0.9 });
    p.effects.curseTimer = Math.max(p.effects.curseTimer || 0, 3);
    EventBus.emit(EVENTS.UI_SPAWN_TEXT, { x: p.x, y: p.y - 40, text: '蚀咒', color: PALETTE.orchid });
  },
  /* 断月剑豪：三连斩（双排扇形横扫 + 斜向封锁弹 + 收尾追踪） */
  triSlash(e: any) {
    const p = pSt().player; if (!p) return;
    const a = angTo(e, p);
    spawnGlow(e.x, e.y, 20, PALETTE.periwinkle, 0.35);
    spawnRing(e.x, e.y, '#e4e0f5', 0.4, 55, 2.4);
    for (let w = 0; w < 3; w++) {
      spawnStreak(e.x, e.y, a + (w - 1) * 0.55, 60, 2.5, PALETTE.lavender, 0.3);
      // 双排剑芒（错位加密）——刀气弧
      const wa = a + (w - 1) * 0.55;
      fanShot(e, wa, 6, 1.75, 366, PALETTE.periwinkle, { x: e.x + Math.cos(a) * 40, y: e.y + Math.sin(a) * 40, r: 7, dmgMul: 0.7, life: 1.3, mark: 'moonblade', wId: 'enemy_blade' });
      fanShot(e, wa + 0.08, 5, 1.6, 289, PALETTE.lavender, { x: e.x + Math.cos(a) * 40, y: e.y + Math.sin(a) * 40, r: 6, dmgMul: 0.55, life: 1.6, mark: 'moonblade', wId: 'enemy_blade' });
      // 斜向封锁弹（封死横向走位）
      for (const da of [-1.35, 1.35]) {
        fanShot(e, wa + da, 3, 0.5, 255, PALETTE.lavender, { r: 5, dmgMul: 0.5, life: 1.7, mark: 'moonblade', wId: 'enemy_blade' });
      }
    }
    trackBalls(e, 2, 195, 66, PALETTE.periwinkle, { dmgMul: 0.53, ...HOMING_TUNE.triSlash });
  },
  /* 裂空魔龙：烈焰吐息 + 双侧绕后扇形 + 追踪火球 */
  breath(e: EnemyInstance) {
    const p = pSt().player; if (!p) return;
    const a = angTo(e, p);
    spawnGlow(e.x + Math.cos(a) * 30, e.y + Math.sin(a) * 30, 22, PALETTE.fire, 0.4);
    spawnRing(e.x, e.y, PALETTE.hot, 0.35, 60, 3);
    spawnBurst(e.x, e.y, PALETTE.ember, 12);
    spawnSpark(e.x, e.y, PALETTE.peach, 8, 180);
    eSt().projectiles.push(PROJECTILE_POOL.addWith({ breath: true, x: e.x + Math.cos(a) * 30, y: e.y + Math.sin(a) * 30,
      dir: a, t: 0, dur: 0.9, range: 235, width: 58, dmg: e.dmg * 1.1, color: PALETTE.hot }));
    // 双侧绕后扇形（玩家闪避吐息时被侧翼夹击）——泪滴龙焰
    for (const side of [-1, 1]) {
      fanShot(e, a + side * 1.9, 4, 1.2, 255, PALETTE.ember, { r: 8, dmgMul: 0.55, life: 2, mark: 'ember', wId: 'enemy_flame' });
    }
    // 翼展 V 弹：双翼各扇出 5 颗（从两翼方向夹击，正面躲吐息会被夹）
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        shot(e, a + side * (0.9 + i * 0.3), 221, '#ff9d6b', { r: 6, dmgMul: 0.5, life: 2.4, wId: 'enemy_flame' });
      }
    }
    trackBalls(e, 3, 172, 57, PALETTE.fire, { dmgMul: 0.62, ...HOMING_TUNE.breath });
  },
  /* 蚀雷巨枭：五道落雷（快速交错）+ 全向电弹 + 追踪 */
  lightning(e: EnemyInstance) {
    const p = pSt().player; if (!p) return;
    spawnGlow(e.x, e.y, 18, PALETTE.periwinkleBright, 0.4);
    spawnRing(e.x, e.y, PALETTE.sky, 0.5, 46, 2.6);
    spawnSpark(e.x, e.y, '#cfe4ff', 10, 200);
    // 五道落雷封锁（更快交错，覆盖玩家前后左右）
    groundStrike(e, 4, 68, 0.8, PALETTE.periwinkleBright, { stagger: 0.12, spread: 120, dmgMul: 0.9, lightning: true });
    // 全向雷羽（逼迫玩家在落雷间隙中走位）
    ringShot(e, 13, 213, PALETTE.periwinkleBright, { r: 6, dmgMul: 0.6, life: 2.5, mark: 'pulse', wId: 'enemy_feather' });
    trackBalls(e, 2, 179, 66, PALETTE.sky, { dmgMul: 0.53, ...HOMING_TUNE.lightning });
  },
  /* 深渊巢母：酸雾 + 扇形酸弹 + 追踪 */
  acidMist(e: EnemyInstance) {
    const p = pSt().player; if (!p) return;
    spawnGlow(e.x, e.y, 26, PALETTE.green, 0.5);
    spawnRing(e.x, e.y, PALETTE.green, 0.5, 60, 3);
    spawnBurst(e.x, e.y, PALETTE.paleGreen, 14);
    spawnSpark(e.x, e.y, '#d0f5b0', 8, 120);
    eSt().projectiles.push(PROJECTILE_POOL.addWith({ aoe: true, x: e.x, y: e.y, r: 0, maxR: 320, dmg: e.dmg * 0.2, color: PALETTE.green, t: 0, slow: 0.5, enemy: true, hit: new Set(), mist: true }));
    // 深渊之眼：微追踪凝视（转向率低，急转可甩；被「看着」是心理压力）
    for (let i = 0; i < 4; i++) {
      const a = angTo(e, p) + (i - 1.5) * 0.45;
      eSt().projectiles.push(PROJECTILE_POOL.addWith({
        homing: true, x: e.x, y: e.y, vx: Math.cos(a) * 145, vy: Math.sin(a) * 145,
        target: p, speed: 145, accel: 0, r: 8, dmg: e.dmg * 0.55,
        color: PALETTE.paleGreen, hit: new Set(), enemy: true, t: 0, life: 3.2,
        speedMax: 187, turnRate: 1.2, lockT: 3, wId: 'enemy_eye',
      }));
    }
    trackBalls(e, 2, 150, 49, PALETTE.paleGreen, { dmgMul: 0.53, ...HOMING_TUNE.acidMist });
  },
  /* 蚀月终焉：双层全向 + 螺旋 + 追踪 + 地面封锁（终焉级弹幕） */
  eclipsePulse(e: EnemyInstance) {
    spawnRing(e.x, e.y, PALETTE.ember, 0.55, 95, 4);
    spawnRing(e.x, e.y, PALETTE.fireBright, 0.4, 60, 2.6);
    spawnGlow(e.x, e.y, 30, PALETTE.goldVivid, 0.5);
    spawnBurst(e.x, e.y, PALETTE.fireBright, 16);
    spawnSpark(e.x, e.y, PALETTE.warmWhite, 12, 220);
    // 蚀相轮转：attT 相位决定血雨密度（满相疏 / 渐蚀密）
    const ph = Math.floor((e.attT || 0) * 1.5) % 3;
    // 蚀月环（带缺口旋转，缺口即生路）
    ringLayerShot(e, 12, 187, PALETTE.ember, { r: 12, dmgMul: 0.6, life: 3, mark: 'pulse', wId: 'enemy_eclip', gap: RNG() * TAU });
    // 血月雨：从 Boss 上空倾泻（下落弹，落地前可读落点）
    const rainN = ph === 1 ? 10 : 5;
    for (let i = 0; i < rainN; i++) {
      eSt().projectiles.push(PROJECTILE_POOL.addWith({
        x: e.x + rand(-180, 180), y: e.y - rand(40, 160),
        vx: 0, vy: 162 + rand(0, 68), r: 6, dmg: e.dmg * 0.5,
        color: '#e06a5a', hit: new Set(), enemy: true, life: 3.4, wId: 'enemy_drop',
      }));
    }
    // 快速外圈（里慢外快，双速压迫）
    ringLayerShot(e, 12, 281, PALETTE.fireBright, { r: 10, dmgMul: 0.5, life: 3, mark: 'pulse', wId: 'enemy_eclip', gap: RNG() * TAU });
    // 螺旋金芒
    spiralBurst(e, 2, 10, 238, PALETTE.goldVivid, { r: 5, dmgMul: 0.45, life: 3, mark: 'pulse' });
    // 追踪蚀球（终焉级：难甩但撑过 lockT 即失锁）
    trackBalls(e, 4, 187, 82, PALETTE.ember, { dmgMul: 0.62, ...HOMING_TUNE.eclipse });
    // 地面封锁（落点切割走位路线）
    groundStrike(e, 3, 78, 1.0, PALETTE.ember, { stagger: 0.18, spread: 160, dmgMul: 0.7 });
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
      // 连续冲撞：剩余次数内重新瞄准玩家（转弯限幅：弧形追击可预判、可侧甩）
      if ((e.dashCount || 0) > 0) {
        e.dashCount = (e.dashCount || 0) - 1;
        const da = angTo(e, p);
        // 转弯限幅：从当前方向最多转 1.6 rad（≈92°）——第二撞是「折返」而非「瞬移追」
        const cur = Math.atan2(e.vy || 0, e.vx || 0);
        let diff = da - cur;
        while (diff > Math.PI) diff -= TAU;
        while (diff < -Math.PI) diff += TAU;
        const na = cur + Math.max(-1.6, Math.min(1.6, diff));
        e.vx = Math.cos(na) * 366; e.vy = Math.sin(na) * 366;
        e.stateT = 0.75;   // 冲撞间隔 0.5→0.75s：玩家躲完一撞后有走位窗口
        eSt().projectiles.push(PROJECTILE_POOL.addWith({ ground: true, x: e.x, y: e.y, t: 0, delay: 0.45, r: 110, dmg: e.dmg * 0.79, color: PALETTE.slate }));
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
  spawnRing(e.x, e.y, PALETTE.heavy, 0.4, 65, 3);
  spawnBurst(e.x, e.y, '#ffb884', 12);
  spawnStreak(e.x, e.y, a, 55, 2.5, PALETTE.peach, 0.3);
  // 双排扇形（错位加密，横向位移无法全躲）
  fanShot(e, a, 7, 1.1, 145, PALETTE.heavy, { r: 7, dmgMul: 0.7, life: 3, mark: 'ember' });
  fanShot(e, a + 0.07, 6, 1.0, 221, PALETTE.ember, { r: 6, dmgMul: 0.6, life: 3, mark: 'ember' });
  // 尾随追踪火球（通用波：中规中矩）
  trackBalls(e, 1, 179, 57, PALETTE.heavy, { dmgMul: 0.53, ...HOMING_TUNE.wave });
  shakeScreen(4);
}
export function bossMinions(e: EnemyInstance): void {
  // 召唤法阵：暗金召唤圈 + 三处落地光柱
  spawnRing(e.x, e.y, PALETTE.gold, 0.6, 80, 3);
  spawnRing(e.x, e.y, PALETTE.violet, 0.45, 52, 2);
  spawnGlow(e.x, e.y, 22, PALETTE.gold, 0.5);
  for (let i = 0; i < 3; i++) spawnEnemy(pick(['grub', 'rat', 'wing', 'charger']), { hpMul: 0.7 });
  spawnBurst(e.x, e.y, PALETTE.gold, 12);
  spawnSpark(e.x, e.y, PALETTE.fireBright, 8, 150);
  // 召唤间隙的全向压制
  ringShot(e, 9, 187, PALETTE.gold, { r: 5, dmgMul: 0.5, life: 2.6, mark: 'pulse' });
  trackBalls(e, 1, 172, 57, PALETTE.violet, { dmgMul: 0.53, ...HOMING_TUNE.minions });
}
export function bossDash(e: EnemyInstance): void {
  const p = pSt().player; if (!p) return;
  const a = angTo(e, p);
  // 冲撞起手：尘土迸扬 + 速度线
  spawnBurst(e.x, e.y, PALETTE.steel, 10);
  spawnRing(e.x, e.y, PALETTE.steel, 0.3, 45, 2.4);
  spawnStreak(e.x, e.y, a, 50, 2.5, '#c8ced8', 0.35);
  e.vx = Math.cos(a) * 366; e.vy = Math.sin(a) * 366;
  e.state = 'dashMove'; e.stateT = 0.75;
}
