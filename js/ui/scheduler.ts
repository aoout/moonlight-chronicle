/* =========================================================
   蚀月远征 · 界面调度器
   负责 UI 事件绑定和组件调度
   ========================================================= */
import { STATE, sm } from '../state.js';
import { playerState } from '../state/player.js';
import { gameState } from '../state/game.js';
import { stageState } from '../state/stage.js';
import { inputState } from '../state/input.js';
import { EventBus } from '../core/event_bus.js';
import { RNG, pick } from '../utils.js';
import { PlayerSystem } from '../systems/PlayerSystem.js';
import { clearRun, loadRun, loadRunMeta, saveRun } from '../persistence/save.js';
import { CONFIG, STAGE_NAMES, LEVELS, CURSES } from '../data/index.js';
import { iconSVG } from './icons.js';
import { AudioEngine } from '../audio/engine.js';
import { $, el, showScreen, showStageBanner, toast } from './hud.js';
import { openShop, renderStatGroupsInto } from './shop/index.js';
import { bindCodex } from './codex.js';
import { startRun, startStage } from '../game.js';
import { LevelUpPanel } from './components/LevelUpPanel.js';
import { ResultPanel } from './components/ResultPanel.js';
import { PausePanel } from './components/PausePanel.js';
import { GateScreen } from './components/GateScreen.js';
import type { CurseDef } from '../types/core.d.ts';

const pSt = () => playerState.state;
const gSt = () => stageState.state;
const gmSt = () => gameState.state;
const iSt = () => inputState.state;

/* ---------- 组件实例 ---------- */
export const levelUpPanel = new LevelUpPanel();
export const resultPanel = new ResultPanel();
export const pausePanel = new PausePanel();
export const gateScreen = new GateScreen();

/* ---------- 升级祝福选择（委托给组件） ---------- */
export function openLevelUp(): void {
  const p = pSt().player;
  if (p) levelUpPanel.open(p);
}

/* ---------- 结算 ---------- */
export function openResult(win: boolean): void {
  resultPanel.open(win);
}

export function closeOverlay(id: string): void { $(id).classList.add('hidden'); }

/* ---------- 界面切换 ---------- */
export function enterGame(): void {
  clearRun();
  ['result', 'pause', 'levelup', 'shop', 'levelselect'].forEach(id => closeOverlay(id));
  startRun();
  showScreen('game');
  const curse = gSt().curse;
  if (curse) { showCurseBanner(curse); AudioEngine.playSfx('curse'); }
  showStageBanner(gSt().stageName, false);
  toast('第 1 夜 · ' + STAGE_NAMES[0] + ' —— 撑住！');
}

/* ---------- 追忆月痕：读档继续远征 ---------- */
export function resumeRun(): boolean {
  if (!loadRun()) return false;
  showScreen('game');
  const isBoss = CONFIG.BOSS_STAGES.includes(gSt().stage) || gSt().stage === CONFIG.FINAL_STAGE;
  const boss = gSt().boss;
  showStageBanner(gSt().stageName, isBoss, isBoss && boss ? boss.name : null);
  const curse = gSt().curse;
  if (curse) showCurseBanner(curse);
  toast('追忆月痕 · 第 ' + gSt().stage + ' 夜');
  return true;
}

/* ---------- 远征之门（委托给组件） ---------- */
export function openGate(): void {
  gateScreen.open();
}

/* 蚀之诅咒横幅（深度 ≥1 开场展示） */
export function showCurseBanner(curse: CurseDef): void {
  const wrap = document.getElementById('game');
  if (!wrap) return;
  const b = el('div', 'curse-banner',
    '<span class="cb-ic">' + curse.icon + '</span>' +
    '<div class="cb-body"><div class="cb-title">蚀之诅咒 · ' + curse.name + '</div><div class="cb-desc">' + curse.desc + '</div></div>');
  wrap.appendChild(b);
  setTimeout(() => b.classList.add('out'), 2800);
  setTimeout(() => b.remove(), 3500);
}

export function refreshMenuDepth(): void {
  const md = $('menu-depth');
  if (md) md.textContent = '蚀月深度 · ' + (gSt().unlocked + 1) + ' / 10 · ' + LEVELS[gSt().unlocked].tag;
  const bg = $('btn-gate');
  if (bg) {
    bg.classList.toggle('gate-locked', gSt().unlocked === 0);
    bg.title = gSt().unlocked === 0 ? '通关当前远征，蚀月之门便会开启' : '选择蚀月深度';
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
export function togglePause(): void {
  pausePanel.open();
}

/* ---------- 事件绑定 ---------- */
export function bindUI(): void {
  refreshMenuDepth();
  document.addEventListener('click', () => AudioEngine.start(), { once: true });

  // 监听 GateScreen 的选择事件
  window.addEventListener('gate:selected', () => {
    refreshMenuDepth();
    enterGame();
  });

  $('btn-start').onclick = () => { AudioEngine.playSfx('click'); if (gSt().unlocked > 0) openGate(); else { gSt().depth = 0; enterGame(); } };
  $('btn-continue').onclick = () => {
    AudioEngine.start();
    if (resumeRun()) AudioEngine.playSfx('open');
    else { toast('没有可追忆的月痕'); $('btn-continue').classList.add('hidden'); }
  };
  $('btn-retry').onclick = () => { AudioEngine.playSfx('click'); enterGame(); };
  $('btn-gate').onclick = () => {
    if (gSt().unlocked > 0) { AudioEngine.playSfx('click'); openGate(); }
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
    gmSt().shopOpen = false;
    EventBus.emit('shop:close', { stage: gSt().stage + 1 });
    gSt().stage++;
    startStage(gSt().stage);
    sm.transition(STATE.PLAYING);
    saveRun();
    const isBoss = CONFIG.BOSS_STAGES.includes(gSt().stage) || gSt().stage === CONFIG.FINAL_STAGE;
    const boss = gSt().boss;
    showStageBanner(gSt().stageName, isBoss, isBoss && boss ? boss.name : null);
    toast('第 ' + gSt().stage + ' 夜 · ' + gSt().stageName);
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
    iSt().keys[k] = true;
    if ((k === '1' || k === '2' || k === '3') && sm.current === STATE.LEVELUP) {
      const cards = document.querySelectorAll('#levelup-cards .card');
      const idx = +k - 1;
      if (cards[idx]) { (cards[idx] as HTMLElement).click(); AudioEngine.playSfx('click'); }
    } else if (k === 'escape' && sm.current === STATE.SHOP) goNext();
    else if (k === 'escape' && sm.current === STATE.PLAYING) togglePause();
    else if (k === 'p' && sm.current === STATE.PLAYING) togglePause();
    else if (k === 'm') {
      AudioEngine.toggleMode();
      toast('音频：' + AudioEngine.getModeLabel());
    }
  });
  window.addEventListener('keyup', e => { iSt().keys[e.key.toLowerCase()] = false; });
  bindCodex();
}
