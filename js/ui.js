// @ts-check
/* =========================================================
   蚀月远征 · 界面调度器
   负责 UI 事件绑定和组件调度
   ========================================================= */
import { G, STATE, sm } from './state.js';
import { EventBus } from './core/event_bus.js';
import { RNG, pick } from './utils.js';
import { PlayerSystem } from './systems/PlayerSystem.js';
import { clearRun, loadRun, loadRunMeta, saveRun } from './save.js';
import { CONFIG, STAGE_NAMES, LEVELS, CURSES } from './data/index.js';
import { iconSVG } from './icons.js';
import { AudioEngine } from './audio.js';
import { $, el, showScreen, showStageBanner, toast } from './ui/hud.js';
import { openShop, renderStatGroupsInto } from './ui/shop.js';
import { bindCodex } from './ui/codex.js';
import { startRun, startStage } from './game.js';
import { LevelUpPanel } from './ui/components/LevelUpPanel.js';
import { ResultPanel } from './ui/components/ResultPanel.js';
import { PausePanel } from './ui/components/PausePanel.js';
import { GateScreen } from './ui/components/GateScreen.js';

/* ---------- 组件实例 ---------- */
export const levelUpPanel = new LevelUpPanel();
export const resultPanel = new ResultPanel();
export const pausePanel = new PausePanel();
export const gateScreen = new GateScreen();

/* ---------- 升级祝福选择（委托给组件） ---------- */
export function openLevelUp() {
  const p = G.player;
  if (p) levelUpPanel.open(p);
}

/* ---------- 结算 ---------- */
/** @param {boolean} win */
export function openResult(win) {
  resultPanel.open(win);
}

/** @param {string} id */
export function closeOverlay(id) { $(id).classList.add('hidden'); }

/* ---------- 界面切换 ---------- */
export function enterGame() {
  clearRun();
  ['result', 'pause', 'levelup', 'shop', 'levelselect'].forEach(id => closeOverlay(id));
  startRun();
  showScreen('game');
  if (G.curse) { showCurseBanner(G.curse); AudioEngine.playSfx('curse'); }
  showStageBanner(G.stageName, false);
  toast('第 1 夜 · ' + STAGE_NAMES[0] + ' —— 撑住！');
}

/* ---------- 追忆月痕：读档继续远征 ---------- */
export function resumeRun() {
  if (!loadRun()) return false;
  showScreen('game');
  const isBoss = CONFIG.BOSS_STAGES.includes(G.stage) || G.stage === CONFIG.FINAL_STAGE;
  showStageBanner(G.stageName, isBoss, isBoss && G.boss ? G.boss.name : null);
  if (G.curse) showCurseBanner(G.curse);
  toast('追忆月痕 · 第 ' + G.stage + ' 夜');
  return true;
}

/* ---------- 远征之门（委托给组件） ---------- */
export function openGate() {
  gateScreen.open();
}

/* 蚀之诅咒横幅（深度 ≥1 开场展示） */
/** @param {import('./types/core.d.ts').CurseDef} curse */
export function showCurseBanner(curse) {
  const wrap = document.getElementById('game');
  if (!wrap) return;
  const b = el('div', 'curse-banner',
    '<span class="cb-ic">' + curse.icon + '</span>' +
    '<div class="cb-body"><div class="cb-title">蚀之诅咒 · ' + curse.name + '</div><div class="cb-desc">' + curse.desc + '</div></div>');
  wrap.appendChild(b);
  setTimeout(() => b.classList.add('out'), 2800);
  setTimeout(() => b.remove(), 3500);
}

export function refreshMenuDepth() {
  const md = $('menu-depth');
  if (md) md.textContent = '蚀月深度 · ' + (G.unlocked + 1) + ' / 10 · ' + LEVELS[G.unlocked].tag;
  const bg = $('btn-gate');
  if (bg) {
    bg.classList.toggle('gate-locked', G.unlocked === 0);
    bg.title = G.unlocked === 0 ? '通关当前远征，蚀月之门便会开启' : '选择蚀月深度';
  }
  const save = loadRunMeta();
  const btn = $('btn-continue');
  if (btn && save && save.player && save.stage > 0) {
    btn.classList.remove('hidden');
    const info = $('continue-info');
    if (info) info.textContent = '第 ' + save.stage + ' 夜 · ' + (LEVELS[save.depth] ? LEVELS[save.depth].name : '月背远征');
  } else if (btn) btn.classList.add('hidden');
}

/* ---------- 暂停（委托给组件） ---------- */
export function togglePause() {
  pausePanel.open();
}

/* ---------- 事件绑定 ---------- */
export function bindUI() {
  refreshMenuDepth();
  document.addEventListener('click', () => AudioEngine.start(), { once: true });

  // 监听 GateScreen 的选择事件
  window.addEventListener('gate:selected', () => {
    refreshMenuDepth();
    enterGame();
  });

  $('btn-start').onclick = () => { AudioEngine.playSfx('click'); if (G.unlocked > 0) openGate(); else { G.depth = 0; enterGame(); } };
  $('btn-continue').onclick = () => {
    AudioEngine.start();
    if (resumeRun()) AudioEngine.playSfx('open');
    else { toast('没有可追忆的月痕'); $('btn-continue').classList.add('hidden'); }
  };
  $('btn-retry').onclick = () => { AudioEngine.playSfx('click'); enterGame(); };
  $('btn-gate').onclick = () => {
    if (G.unlocked > 0) { AudioEngine.playSfx('click'); openGate(); }
    else {
      AudioEngine.playSfx('click');
      toast('通关当前远征，蚀月之门便会开启');
      const bg = $('btn-gate');
      bg.classList.remove('shake');
      void bg.offsetWidth;
      bg.classList.add('shake');
    }
  };
  $('btn-gate-close').onclick = () => { AudioEngine.playSfx('close'); closeOverlay('levelselect'); };
  $('btn-how').onclick = () => { AudioEngine.playSfx('click'); $('howto').classList.remove('hidden'); };
  $('btn-close-how').onclick = () => { AudioEngine.playSfx('close'); $('howto').classList.add('hidden'); };
  const goNext = () => {
    closeOverlay('shop');
    G.shopOpen = false;
    EventBus.emit('shop:close', { stage: G.stage + 1 });
    G.stage++;
    startStage(G.stage);
    sm.transition(STATE.PLAYING);
    saveRun();
    const isBoss = CONFIG.BOSS_STAGES.includes(G.stage) || G.stage === CONFIG.FINAL_STAGE;
    showStageBanner(G.stageName, isBoss, isBoss && G.boss ? G.boss.name : null);
    toast('第 ' + G.stage + ' 夜 · ' + G.stageName);
  };
  $('btn-shop-next').onclick = () => { AudioEngine.playSfx('click'); goNext(); };
  $('btn-resume').onclick = () => { AudioEngine.playSfx('click'); togglePause(); };
  $('btn-pause-quit').onclick = () => {
    AudioEngine.playSfx('close');
    pausePanel.close();
    sm.transition(STATE.MENU);
    showScreen('menu');
    refreshMenuDepth();
  };
  window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    G.keys[k] = true;
    if ((k === '1' || k === '2' || k === '3') && G.state === STATE.LEVELUP) {
      const cards = document.querySelectorAll('#levelup-cards .card');
      const idx = +k - 1;
      if (cards[idx]) { /** @type {HTMLElement} */ (cards[idx]).click(); AudioEngine.playSfx('click'); }
    } else if (k === 'escape' && G.state === STATE.SHOP) goNext();
    else if (k === 'escape' && G.state === STATE.PLAYING) togglePause();
    else if (k === 'p' && G.state === STATE.PLAYING) togglePause();
    else if (k === 'm') {
      AudioEngine.toggleMode();
      toast('音频：' + AudioEngine.getModeLabel());
    }
  });
  window.addEventListener('keyup', e => { G.keys[e.key.toLowerCase()] = false; });
  bindCodex();
}