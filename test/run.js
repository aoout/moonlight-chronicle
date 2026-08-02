/* =========================================================
   蚀月远征 · 自动化回归测试
   运行：node test/run.js（退出码 0 = 全过）
   ========================================================= */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

/* ---------- DOM / canvas / localStorage stub ---------- */
function mkCtx() {
  return new Proxy({}, {
    get(t, k) {
      if (k === 'createRadialGradient' || k === 'createLinearGradient') return () => ({ addColorStop(){} });
      return () => {};
    },
    set() { return true; },
  });
}
const els = {};
function makeEl(tag) {
  return { tagName: tag, children: [], _html: '', _text: '', style: { setProperty(k, v){ this[k] = v; } }, dataset: {}, offsetHeight: 62,
    classList: { _s: new Set(),
      add(...c){ c.forEach(x => this._s.add(x)); },
      remove(...c){ c.forEach(x => this._s.delete(x)); },
      toggle(c, f){ if (f === undefined) f = !this._s.has(c); f ? this._s.add(c) : this._s.delete(c); return f; },
      contains(c){ return this._s.has(c); } },
    get className(){ return [...this.classList._s].join(' '); },
    set className(v){ this.classList._s = new Set(String(v).split(/\s+/).filter(Boolean)); },
    get innerHTML(){ return this._html + this.children.map(c => c.innerHTML).join(''); },
    set innerHTML(v){ this._html = v; this.children = []; },
    get textContent(){ return this._text; },
    set textContent(v){ this._text = String(v); },
    appendChild(c){ this.children.push(c); return c; },
    remove(){}, addEventListener(){}, onclick: null, title: '', id: '',
    getContext(){ return mkCtx(); },
    getBoundingClientRect(){ return { top: 0, height: 62, left: 0, width: 62 }; },
    querySelector(sel){ const cls = String(sel).replace('.', ''); if (!this._qs) this._qs = {}; if (!this._qs[cls]) { const e = makeEl('div'); e.classList.add(cls); this._qs[cls] = e; } return this._qs[cls]; },
  };
}
global.document = { getElementById(id){ return els[id] || (els[id] = makeEl('div')); }, createElement(t){ return makeEl(t); }, querySelectorAll(){ return []; } };
global.window = { addEventListener(){}, innerWidth: 1280, innerHeight: 800 };
global.requestAnimationFrame = () => {};
const store = {};
global.localStorage = { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = v; } };

/* ---------- 加载源码（生产顺序） ---------- */
const order = ['js/icons.js','js/data.js','js/core.js','js/spatial.js','js/audio.js','js/fx.js','js/enemies.js','js/weapons.js','js/render.js','js/game.js','js/ui/hud.js','js/ui/shop.js','js/ui.js'];
const sandbox = { console, document: global.document, window: global.window, requestAnimationFrame: global.requestAnimationFrame, Math, setTimeout, clearTimeout, localStorage: global.localStorage, mkCtx };
vm.createContext(sandbox);
const src = order.map(f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8')).join('\n');

/* ---------- 测试主体 ---------- */
const test = `
function addDmgNumber(){}
let fails = 0, passed = 0;
function chk(cond, msg){ if (cond) { passed++; } else { fails++; console.log('  FAIL: ' + msg); } }
function section(t){ console.log('== ' + t + ' =='); }

G.width = 800; G.height = 600; G.keys = {}; G.ctx = mkCtx();

section('核心：战斗运行');
startRun();
for (let i = 0; i < 120; i++) update(0.016);
render();
chk(G.enemies.length > 0 && G.player.hp > 0, '战斗 120 帧，敌人存在且玩家存活');

section('武器：查表与升级上限');
chk(typeof WEAPON_FIRE === 'object' && Object.keys(WEAPON_FIRE).length === 11, 'WEAPON_FIRE 注册表 11 项');
chk(typeof PROJ_TICK === 'object' && Object.keys(PROJ_TICK).length === 9, 'PROJ_TICK 注册表 9 项');
const w = G.player.weapons[0];
for (let i = 0; i < 10; i++) upgradeWeapon('moonRing');
chk(w.lv === 10 && !upgradeWeapon('moonRing'), '武器可升到 Lv.10 且封顶');
chk(WEAPONS.moonRing.dmg(G.player, 10) > 0, 'Lv.10 伤害正常');

section('渲染：注册表');
chk(Object.keys(ENEMY_SHAPES).length === 10, 'ENEMY_SHAPES 10 项');
chk(Object.keys(BOSS_SHAPES).length === 10, 'BOSS_SHAPES 10 项');
chk(typeof PROJ_RENDER === 'object' && typeof PROJ_LINEAR_HEADS === 'object', '投射物渲染注册表存在');
G.enemies = [];
for (const t of Object.keys(ENEMIES)) G.enemies.push(spawnEnemy(t));
for (const t of Object.keys(BOSSES)) G.enemies.push(spawnBoss(t));
G.projectiles = [
  {x:100,y:100,vx:200,vy:0,r:5,color:'#9fd6e8',wId:'crossbow',hit:new Set()},
  {boomerang:true,x:300,y:100,dir:0,r:9,color:'#e9c987',spin:1,hit:new Set()},
  {beam:true,x:400,y:100,dir:0,t:0,dur:0.2,color:'#f4ecd8',width:14,range:200},
  {meteor:true,x:500,y:100,t:0.2,delay:0.5,color:'#ff6b6b'},
  {x:700,y:100,vx:-100,vy:0,r:5,color:'#e2546a',enemy:true},
];
try { render(); chk(true, '全量渲染无异常'); } catch (e) { chk(false, '渲染异常: ' + e.message); }

section('Boss 池：三选一');
chk(BOSS_POOLS[6].length === 3 && BOSS_POOLS[12].length === 3 && BOSS_POOLS[18].length === 3, '节点 6/12/18 各 3 Boss');
const seen = new Set();
for (let i = 0; i < 60; i++) { G.boss = null; G.enemies = []; startStage(6); seen.add(G.boss.type); }
chk(seen.size === 3, '第 6 夜随机出 3 种 Boss');

section('蚀月深度：成长与诅咒');
const sc9 = levelEnemyScale(9);
chk(sc9.hp === 3.25 && sc9.dmg === 1.72, '深度成长：生命×3.25 / 伤害×1.72');
G.depth = 3; startRun();
chk(G.curse !== null && CURSES.includes(G.curse), '深度≥1 随机诅咒');
G.depth = 0; startRun();
chk(G.curse === null, '深度 0 无诅咒');

section('商店：卡片/详情/公式');
G.depth = 0; G.gold = 500; G.stage = 2; G.state = 'shop'; computeDerived(G.player);
openShop();
chk(document.getElementById('shop-cards').children.length === 6, '商店 6 张卡');
chk(document.getElementById('shop-stats').children.length === 4, '铭牌 4 组属性');
showWeaponDetail('moonRing');
chk(!document.getElementById('pw-detail').classList.contains('hidden'), '武器详情显示');
for (const id of Object.keys(WEAPONS)) {
  const st = weaponFormulaBreakdown(WEAPONS[id], G.player, 1);
  const parts = st.filter(x => x.kind !== 'param').reduce((a, x) => a + x.value, 0);
  chk(Math.abs(parts - WEAPONS[id].dmg(G.player, 1)) < 0.6, '公式预览一致：' + id);
}
chk(Object.keys(WEAPON_FORMULAS).length === 12, 'WEAPON_FORMULAS 12 项');

section('伤害：buff 生效');
G.player.critDmg = 2.0; G.player.lowHpDmg = 1; G.player.hp = 10;
const e3 = spawnEnemy('grub'); e3.hp = 10000; e3.x = 500; e3.y = 300;
G.runStats.totalDmg = 0;
damageEnemy(e3, 100, true, 'proj', 'moonRing');
chk(G.runStats.totalDmg === 400, 'critDmg×lowHpDmg 生效（100→400）');

section('解锁：通关最高深度');
G.depth = 0; G.unlocked = 0; G.state = 'playing'; G.stage = 20;
const fb = spawnBoss('final'); fb.hp = 1;
damageEnemy(fb, 5, false, 'proj', 'moonRing');
chk(G.unlocked === 1, '通关深度 0 解锁深度 1');

console.log('\\n=== 结果：' + passed + ' 通过 / ' + fails + ' 失败 ===');
if (fails > 0) process.exitCode = 1;
`;
vm.runInContext(src + '\n' + test, sandbox, { filename: 'all.js' });
