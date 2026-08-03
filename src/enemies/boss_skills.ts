/* =========================================================
   蚀月远征 · Boss 行为 / 专属技能
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

/* ---------- Boss 专属技能 ---------- */
const BOSS_SKILLS: Record<string, (e: EnemyInstance) => void> = {
  wave: bossWave, minions: bossMinions, dash: bossDash,
  /* 蚀潮巨兽：环形潮浪（3 波扩散弹幕推挤） */
  tidalWave(e: any) {
    // 潮浪喷涌：碧潮冲击环 + 浪花迸溅
    spawnRing(e.x, e.y, '#5c8a9e', 0.5, 90, 3.5);
    spawnBurst(e.x, e.y, '#7fc4d8', 14);
    spawnStreak(e.x, e.y, 0, 60, 3, '#9fd6e8', 0.4);
    for (let w = 0; w < 3; w++) {
      const base = RNG() * 6.28;
      // 每波扩散：浪花环 + 潮纹
      if (w === 0) spawnRing(e.x, e.y, '#9fd6e8', 0.4, 60, 2.4);
      for (let j = 0; j < 12; j++) {
        const a = (j / 12) * 6.28 + base;
        eSt().projectiles.push(PROJECTILE_POOL.addWith({ x: e.x, y: e.y, vx: Math.cos(a) * (170 + w * 75), vy: Math.sin(a) * (170 + w * 75), r: 5, dmg: e.dmg * 0.45, color: w === 0 ? '#9fd6e8' : '#5c8a9e', hit: new Set(), enemy: true, life: 3, wave: true }));
      }
    }
  },
  /* 潮噬之母：产卵孵化潮虫群 */
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
      // 破囊落地溅沫
      spawnRing(m.x, m.y, '#8fd8c8', 0.22, 16, 1.4);
      spawnBurst(m.x, m.y, '#8fd8c8', 4);
    }
  },
  /* 蚀壳战车：碾压冲撞 + 撞击震地 */
  ram(e: EnemyInstance) {
    // 冲撞前：战车震地扬尘
    spawnRing(e.x, e.y, '#7a8aa5', 0.4, 70, 3);
    spawnBurst(e.x, e.y, '#9aa5b8', 12);
    bossDash(e);
    eSt().projectiles.push(PROJECTILE_POOL.addWith({ ground: true, x: e.x, y: e.y, t: 0, delay: 0.5, r: 120, dmg: e.dmg, color: '#7a8aa5' }));
  },
  /* 噬月君主：月牙斩（近身扇形斩击） */
  moonSlash(e: EnemyInstance) {
    const p = pSt().player; if (!p) return;
    const a = angTo(e, p);
    // 斩击起手：金色月弧 + 剑气扫掠
    spawnRing(e.x, e.y, '#ffe9a8', 0.35, 70, 2.6);
    spawnStreak(e.x, e.y, a, 70, 3, '#fff5d6', 0.3);
    spawnSpark(e.x, e.y, '#ffe9a8', 8, 200);
    meleeHit(e.x + Math.cos(a) * 60, e.y + Math.sin(a) * 60, 110, e.dmg * 1.4, { shake: 10 });
    for (let i = -2; i <= 2; i++) {
      const ang = a + i * 0.35;
      eSt().projectiles.push(PROJECTILE_POOL.addWith({ x: e.x, y: e.y, vx: Math.cos(ang) * 380, vy: Math.sin(ang) * 380, r: 8, dmg: e.dmg * 0.8, color: '#b49ae8', hit: new Set(), enemy: true, life: 1.2, moonblade: true }));
    }
  },
  /* 月影巫王：暗影追踪球 + 诅咒减速 */
  shadowOrb(e: EnemyInstance) {
    const p = pSt().player; if (!p) return;
    // 召唤暗影漩涡：紫雾螺旋 + 三个鬼火升腾
    spawnRing(e.x, e.y, '#9a86c8', 0.5, 50, 3);
    spawnRing(e.x, e.y, '#b49ae8', 0.4, 32, 2);
    spawnBurst(e.x, e.y, '#7c6d9e', 12);
    spawnSpark(e.x, e.y, '#b49ae8', 8, 140);
    for (let i = 0; i < 3; i++) {
      eSt().projectiles.push(PROJECTILE_POOL.addWith({ homing: true, x: e.x, y: e.y, vx: 0, vy: 0, target: p, speed: 165, r: 8, dmg: e.dmg * 0.8, color: '#9a86c8', hit: new Set(), enemy: true, t: 0, life: 4, orb: true }));
      spawnGlow(e.x + rand(-20, 20), e.y + rand(-20, 20), 10, '#b49ae8', 0.4);
    }
    p.effects.curseTimer = Math.max(p.effects.curseTimer || 0, 3);
    spawnText(p.x, p.y - 40, '蚀咒', '#9a86c8');
  },
  /* 断月剑豪：三连斩（三波扇形横扫） */
  triSlash(e: any) {
    const p = pSt().player; if (!p) return;
    const a = angTo(e, p);
    // 三连斩：剑豪起手亮剑 + 三道月弧残影
    spawnGlow(e.x, e.y, 20, '#c8c2e8', 0.35);
    spawnRing(e.x, e.y, '#e4e0f5', 0.4, 55, 2.4);
    for (let w = 0; w < 3; w++) {
      spawnStreak(e.x, e.y, a + (w - 1) * 0.55, 60, 2.5, '#d8d2f0', 0.3);
      for (let i = -3; i <= 3; i++) {
        const ang = a + i * 0.28 + (w - 1) * 0.55;
        eSt().projectiles.push(PROJECTILE_POOL.addWith({ x: e.x + Math.cos(a) * 40, y: e.y + Math.sin(a) * 40, vx: Math.cos(ang) * 430, vy: Math.sin(ang) * 430, r: 7, dmg: e.dmg * 0.7, color: '#c8c2e8', hit: new Set(), enemy: true, life: 1.1, moonblade: true }));
      }
    }
  },
  /* 裂空魔龙：烈焰吐息（锥形持续） */
  breath(e: EnemyInstance) {
    const p = pSt().player; if (!p) return;
    const a = angTo(e, p);
    // 吐息起手：喉部火球 + 龙焰引燃
    spawnGlow(e.x + Math.cos(a) * 30, e.y + Math.sin(a) * 30, 22, '#ff8a5c', 0.4);
    spawnRing(e.x, e.y, '#ff6b6b', 0.35, 60, 3);
    spawnBurst(e.x, e.y, '#ffb84d', 12);
    spawnSpark(e.x, e.y, '#ffd9a8', 8, 180);
    eSt().projectiles.push(PROJECTILE_POOL.addWith({ breath: true, x: e.x + Math.cos(a) * 30, y: e.y + Math.sin(a) * 30,
      dir: a, t: 0, dur: 0.9, range: 260, width: 58, dmg: e.dmg * 1.1, color: '#ff6b6b' }));
  },
  /* 蚀雷巨枭：落雷（玩家位置延迟 AOE ×3） */
  lightning(e: EnemyInstance) {
    const p = pSt().player; if (!p) return;
    // 落雷前兆：枭翼电光 + 三道雷云闪光
    spawnGlow(e.x, e.y, 18, '#8f9aee', 0.4);
    spawnRing(e.x, e.y, '#a8d8ff', 0.5, 46, 2.6);
    spawnSpark(e.x, e.y, '#cfe4ff', 10, 200);
    for (let i = 0; i < 3; i++) {
      eSt().projectiles.push(PROJECTILE_POOL.addWith({ ground: true, x: p.x + rand(-90, 90), y: p.y + rand(-90, 90),
        t: i * 0.25, delay: 0.8, r: 68, dmg: e.dmg * 0.9, color: '#8f9aee', lightning: true }));
      // 落点电光预兆
      spawnRing(p.x + rand(-90, 90), p.y + rand(-90, 90), '#a8d8ff', 0.3, 40, 2);
    }
  },
  /* 深渊巢母：酸雾（扩散减速区域） */
  acidMist(e: EnemyInstance) {
    // 酸雾喷涌：翠雾扩散 + 腐蚀气泡
    spawnGlow(e.x, e.y, 26, '#7fce5a', 0.5);
    spawnRing(e.x, e.y, '#7fce5a', 0.5, 60, 3);
    spawnBurst(e.x, e.y, '#a8e88a', 14);
    spawnSpark(e.x, e.y, '#d0f5b0', 8, 120);
    eSt().projectiles.push(PROJECTILE_POOL.addWith({ aoe: true, x: e.x, y: e.y, r: 0, maxR: 360, dmg: e.dmg * 0.2, color: '#7fce5a', t: 0, slow: 0.5, enemy: true, hit: new Set(), mist: true }));
  },
  /* 蚀月终焉：蚀月脉冲（全向扩散弹幕） */
  eclipsePulse(e: EnemyInstance) {
    // 蚀月脉冲：金色光环爆发 + 中央蚀眼闪光
    spawnRing(e.x, e.y, '#ffb84d', 0.55, 95, 4);
    spawnRing(e.x, e.y, '#ffe9a8', 0.4, 60, 2.6);
    spawnGlow(e.x, e.y, 30, '#ffd54a', 0.5);
    spawnBurst(e.x, e.y, '#ffe9a8', 16);
    spawnSpark(e.x, e.y, '#fff5d6', 12, 220);
    for (let j = 0; j < 14; j++) {
      const a = (j / 14) * 6.28;
      eSt().projectiles.push(PROJECTILE_POOL.addWith({ x: e.x, y: e.y, vx: Math.cos(a) * 210, vy: Math.sin(a) * 210, r: 6, dmg: e.dmg * 0.6, color: '#ffb84d', hit: new Set(), enemy: true, life: 3, pulse: true }));
    }
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
    if (e.stateT <= 0) { e.state = 'chase'; }
  } else {
    e.x += Math.cos(a) * e.spd * dt;
    e.y += Math.sin(a) * e.spd * dt;
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
  for (let i = 0; i < 8; i++) {
    const ang = a + (i - 4) * 0.14;
    eSt().projectiles.push(PROJECTILE_POOL.addWith({ enemy: true, x: e.x, y: e.y, vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150, r: 7, dmg: e.dmg * 0.7, life: 3, color: '#ff9d6b', pierce: 0, hit: new Set(), ember: true }));
  }
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
