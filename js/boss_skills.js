/* =========================================================
   蚀月远征 · Boss 行为 / 专属技能
   ========================================================= */
import { G, shakeScreen } from './state.js';
import { RNG, rand, angTo, pick } from './utils.js';
import { PROJECTILE_POOL } from './entity_pool.js';
import { spawnBurst } from './fx.js';
import { spawnText } from './ui/hud.js';
import { AudioEngine } from './audio.js';
import { SpawnSystem } from './systems/SpawnSystem.js';
import { CombatSystem } from './systems/CombatSystem.js';

/* ---------- Boss 专属技能 ---------- */
const BOSS_SKILLS = {
  wave: bossWave, minions: bossMinions, dash: bossDash,
  /* 蚀潮巨兽：环形潮浪（3 波扩散弹幕推挤） */
  tidalWave(e) {
    for (let w = 0; w < 3; w++) {
      const base = RNG() * 6.28;
      for (let j = 0; j < 12; j++) {
        const a = (j / 12) * 6.28 + base;
        G.projectiles.push(PROJECTILE_POOL.addWith({ x: e.x, y: e.y, vx: Math.cos(a) * (170 + w * 75), vy: Math.sin(a) * (170 + w * 75), r: 5, dmg: e.dmg * 0.45, color: '#5c8a9e', hit: new Set(), enemy: true, life: 3 }));
      }
    }
  },
  /* 潮噬之母：产卵孵化潮虫群 */
  spawnTide(e) {
    for (let i = 0; i < 6; i++) {
      const m = SpawnSystem.spawnEnemy('grub', { hpMul: 0.5 });
      m.x = e.x + rand(-70, 70); m.y = e.y + rand(-70, 70);
      m.spd = 130; m.size = 7;
    }
    spawnBurst(e.x, e.y, '#6fa8a0', 16);
  },
  /* 蚀壳战车：碾压冲撞 + 撞击震地 */
  ram(e) {
    bossDash(e);
    G.projectiles.push(PROJECTILE_POOL.addWith({ ground: true, x: e.x, y: e.y, t: 0, delay: 0.5, r: 120, dmg: e.dmg, color: '#7a8aa5' }));
  },
  /* 噬月君主：月牙斩（近身扇形斩击） */
  moonSlash(e) {
    const p = G.player;
    const a = angTo(e, p);
    CombatSystem.meleeHit(e.x + Math.cos(a) * 60, e.y + Math.sin(a) * 60, 110, e.dmg * 1.4, { shake: 10 });
    for (let i = -2; i <= 2; i++) {
      const ang = a + i * 0.35;
      G.projectiles.push(PROJECTILE_POOL.addWith({ x: e.x, y: e.y, vx: Math.cos(ang) * 380, vy: Math.sin(ang) * 380, r: 8, dmg: e.dmg * 0.8, color: '#b49ae8', hit: new Set(), enemy: true, life: 1.2 }));
    }
  },
  /* 月影巫王：暗影追踪球 + 诅咒减速 */
  shadowOrb(e) {
    const p = G.player;
    for (let i = 0; i < 3; i++) {
      G.projectiles.push(PROJECTILE_POOL.addWith({ homing: true, x: e.x, y: e.y, vx: 0, vy: 0, target: p, speed: 165, r: 8, dmg: e.dmg * 0.8, color: '#9a86c8', hit: new Set(), enemy: true, t: 0, life: 4 }));
    }
    p._curseT = Math.max(p._curseT || 0, 3);
    spawnText(p.x, p.y - 40, '蚀咒', '#9a86c8');
  },
  /* 断月剑豪：三连斩（三波扇形横扫） */
  triSlash(e) {
    const p = G.player;
    const a = angTo(e, p);
    for (let w = 0; w < 3; w++) {
      for (let i = -3; i <= 3; i++) {
        const ang = a + i * 0.28 + (w - 1) * 0.55;
        G.projectiles.push(PROJECTILE_POOL.addWith({ x: e.x + Math.cos(a) * 40, y: e.y + Math.sin(a) * 40, vx: Math.cos(ang) * 430, vy: Math.sin(ang) * 430, r: 7, dmg: e.dmg * 0.7, color: '#c8c2e8', hit: new Set(), enemy: true, life: 1.1 }));
      }
    }
  },
  /* 裂空魔龙：烈焰吐息（锥形持续） */
  breath(e) {
    const a = angTo(e, G.player);
    G.projectiles.push(PROJECTILE_POOL.addWith({ breath: true, x: e.x + Math.cos(a) * 30, y: e.y + Math.sin(a) * 30,
      dir: a, t: 0, dur: 0.9, range: 260, width: 58, dmg: e.dmg * 1.1, color: '#ff6b6b' }));
  },
  /* 蚀雷巨枭：落雷（玩家位置延迟 AOE ×3） */
  lightning(e) {
    const p = G.player;
    for (let i = 0; i < 3; i++) {
      G.projectiles.push(PROJECTILE_POOL.addWith({ ground: true, x: p.x + rand(-90, 90), y: p.y + rand(-90, 90),
        t: i * 0.25, delay: 0.8, r: 68, dmg: e.dmg * 0.9, color: '#8f9aee' }));
    }
  },
  /* 深渊巢母：酸雾（扩散减速区域） */
  acidMist(e) {
    G.projectiles.push(PROJECTILE_POOL.addWith({ aoe: true, x: e.x, y: e.y, r: 0, maxR: 360, dmg: e.dmg * 0.2, color: '#7fce5a', t: 0, slow: 0.5, enemy: true, hit: new Set() }));
  },
  /* 蚀月终焉：蚀月脉冲（全向扩散弹幕） */
  eclipsePulse(e) {
    for (let j = 0; j < 14; j++) {
      const a = (j / 14) * 6.28;
      G.projectiles.push(PROJECTILE_POOL.addWith({ x: e.x, y: e.y, vx: Math.cos(a) * 210, vy: Math.sin(a) * 210, r: 6, dmg: e.dmg * 0.6, color: '#ffb84d', hit: new Set(), enemy: true, life: 3 }));
    }
  },
};

export function bossTick(e, dt) {
  const p = G.player;
  e.stateT -= dt;
  e.attT -= dt;
  if (e.state === 'enter') {
    e.y += 90 * dt;
    if (e.y >= 90) { e.state = 'chase'; e.stateT = 0; }
    return;
  }
  const a = angTo(e, p);
  e.x += Math.cos(a) * e.spd * dt;
  e.y += Math.sin(a) * e.spd * dt;

  if (e.attT <= 0) {
    e.attT = e.attCd || 3.4;
    const skill = pick(e.skills || ['wave']);
    const fn = BOSS_SKILLS[skill] || bossWave;
    fn(e);
    AudioEngine.playSfx(skill === 'minions' || skill === 'spawnTide' ? 'boss_summon' : skill === 'dash' || skill === 'ram' ? 'boss_dash' : 'boss_wave');
  }
}

export function bossWave(e) {
  const p = G.player;
  const a = angTo(e, p);
  for (let i = 0; i < 8; i++) {
    const ang = a + (i - 4) * 0.14;
    G.projectiles.push(PROJECTILE_POOL.addWith({ enemy: true, x: e.x, y: e.y, vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150, r: 7, dmg: e.dmg * 0.7, life: 3, color: '#ff9d6b', pierce: 0, hit: new Set() }));
  }
  shakeScreen(4);
}
export function bossMinions(e) {
  for (let i = 0; i < 3; i++) SpawnSystem.spawnEnemy(pick(['grub', 'rat', 'wing', 'charger']), { hpMul: 0.7 });
}
export function bossDash(e) {
  const p = G.player;
  const a = angTo(e, p);
  e.vx = Math.cos(a) * 460; e.vy = Math.sin(a) * 460;
  e.state = 'dashMove'; e.stateT = 0.5;
}