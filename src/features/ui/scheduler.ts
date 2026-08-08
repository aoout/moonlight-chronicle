/* =========================================================
   蚀月远征 · 界面调度器
   负责 UI 事件绑定和组件调度
   ========================================================= */
import { EVENTS } from '../../engine/core/events.js';
import { STATE, sm } from '../../engine/core/states.js';
import { gameState } from '../../state/flow.js';
import { stageState } from '../../state/stage.js';
import { EventBus } from '../../engine/core/event_bus.js';
import { RNG, pick } from '../../engine/util/utils.js';
import { PlayerSystem } from '../../systems/PlayerSystem.js';
import { clearRun, loadRunMeta, saveRun } from '../../infra/persistence/save.js';
import { CONFIG, STAGE_NAMES, LEVELS, CURSES } from '../../config/index.js';
import { iconSVG } from '../../assets/icons.js';
import { AudioEngine } from '../../platform/audio/engine.js';
import { $, el, html, showScreen, showStageBanner, toast } from './hud_utils.js';
import { startRun, startStage, resumeRun as resumeRunCmd } from '../../commands/run.js';
import { isDevMode } from '../../engine/env.js';
import { LevelUpPanel } from './components/LevelUpPanel.js';
import { ResultPanel } from './components/ResultPanel.js';
import { GateScreen } from './components/GateScreen.js';
import { CurseScreen } from './curse/index.js';
import { pausePanel, togglePause } from './pause_control.js';
import { initMobileActionBar, showMobileActionBar, hideMobileActionBar } from './mobile_action_bar.js';
import type { CurseDef } from '../../types/core.d.ts';

import { pSt, gSt, gmSt, iSt } from '../../state/accessors.js';

/* ---------- 组件实例 ---------- */
export const levelUpPanel = new LevelUpPanel();
export const resultPanel = new ResultPanel();
export const gateScreen = new GateScreen();
export const curseScreen = new CurseScreen();

/* ---------- 非首屏面板：惰性加载缓存 ----------
 * 图鉴 / 功勋 / 月蚀之仪均为主菜单入口，首次点击才动态 import 并绑定。
 * _mod 在 import 完成后指向模块命名空间（同步可访问其导出，供 keydown 分支判断），
 * _loading 持有 in-flight promise 保证并发点击只加载一次。
 */
let _codexMod: typeof import('./codex.js') | null = null;
let _codexLoading: Promise<typeof import('./codex.js')> | null = null;
let _achvMod: typeof import('./achievements.js') | null = null;
let _achvLoading: Promise<typeof import('./achievements.js')> | null = null;
let _settingsMod: typeof import('./settings_panel.js') | null = null;
let _settingsLoading: Promise<typeof import('./settings_panel.js')> | null = null;

/* 兼容再导出：暂停控制已下沉到 pause_control.ts */
export { pausePanel, togglePause };

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
  if (!resumeRunCmd()) return false;   // 水合存档 + 推进流程（commands 层）
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
  const b = el('div', 'curse-banner', html`
    <span class="cb-ic">${curse.icon}</span>
    <div class="cb-body"><div class="cb-title">蚀之诅咒 · ${curse.name}</div><div class="cb-desc">${curse.desc}</div></div>
  `);
  wrap.appendChild(b);
  setTimeout(() => b.classList.add('out'), 2800);
  setTimeout(() => b.remove(), 3500);
}

/* ---------- 蚀月深度数字滚动：从旧值逐个数到新值，每个数字自上滑入 ---------- */
const NUM_ROLL_STEP_MS = 130;
let numRollTimer = 0;

function rollMenuDepthNum(el: HTMLElement, to: number): void {
  window.clearTimeout(numRollTimer);
  const reduced = typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const from = parseInt(el.textContent || '1', 10) || 1;
  if (from === to || reduced) {
    el.textContent = String(to);
    return;
  }
  const step = from < to ? 1 : -1;
  let v = from;
  const bump = (): void => {
    el.textContent = String(v);
    el.classList.remove('num-roll');
    void el.offsetWidth; /* 重启动画 */
    el.classList.add('num-roll');
  };
  const tick = (): void => {
    v += step;
    bump();
    if (v !== to) numRollTimer = window.setTimeout(tick, NUM_ROLL_STEP_MS);
  };
  numRollTimer = window.setTimeout(tick, NUM_ROLL_STEP_MS);
}

export function refreshMenuDepth(): void {
  /* 静态文案（蚀月深度 · / 10）已在 HTML 中，只刷新数字与档位 tag */
  const num = $('menu-depth-num');
  if (num) rollMenuDepthNum(num, gSt().unlocked + 1);
  const tag = $('menu-depth-tag');
  if (tag) tag.textContent = LEVELS[gSt().unlocked].tag + (isDevMode() ? ' · DEV' : '');
  const save = loadRunMeta();
  const btn = $('btn-continue');
  if (btn && save && save.player && save.stage > 0) {
    btn.classList.remove('hidden');
    const info = $('continue-info');
    if (info) {
      const depth = save.depth ?? 0;
      info.textContent = '第 ' + save.stage + ' 夜 · 蚀月深度 ' + depth + ' · ' + (LEVELS[depth] ? LEVELS[depth].name : '月背远征');
    }
  } else if (btn) btn.classList.add('hidden');
}

/* ---------- 事件绑定 ---------- */
export function bindUI(): void {
  refreshMenuDepth();
  document.addEventListener('click', () => AudioEngine.start(), { once: true });

  // 移动端操作栏
  initMobileActionBar();
  sm.onEnter(STATE.PLAYING, () => showMobileActionBar());
  sm.onExit(STATE.PLAYING, () => hideMobileActionBar());

  // 监听 GateScreen 的选择事件
  window.addEventListener('gate:selected', () => {
    refreshMenuDepth();
    enterGame();
  });

  $('btn-start').onclick = () => { AudioEngine.playSfx('click'); if (gSt().unlocked > 0) openGate(); else { stageState.set('depth', 0); enterGame(); } };
  $('btn-continue').onclick = () => {
    AudioEngine.start();
    if (resumeRun()) AudioEngine.playSfx('open');
    else { toast('没有可追忆的月痕'); $('btn-continue').classList.add('hidden'); }
  };
  $('btn-retry').onclick = () => { AudioEngine.playSfx('click'); enterGame(); };
  $('btn-gate-close').onclick = () => { AudioEngine.playSfx('close'); closeOverlay('levelselect'); };
  $('btn-how').onclick = () => { AudioEngine.playSfx('click'); $('howto').classList.remove('hidden'); };
  $('btn-close-how').onclick = () => { AudioEngine.playSfx('close'); $('howto').classList.add('hidden'); };
  const goNext = () => {
    closeOverlay('shop');
    gameState.set('shopOpen', false);
    EventBus.emit(EVENTS.SHOP_CLOSE, { stage: gSt().stage + 1 });
    stageState.set('stage', gSt().stage + 1);
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
    // 月蚀之仪：设置面板打开时 Escape 优先关闭面板。
    // 惰性引用：面板未加载过则必然未打开，直接落入下方战斗分支。
    if (k === 'escape') {
      if (_settingsMod && _settingsMod.isSettingsOpen()) {
        AudioEngine.playSfx('close');
        _settingsMod.closeSettings();
        return;
      }
      if (sm.current === STATE.SHOP) { goNext(); return; }
      if (sm.current === STATE.PLAYING) { togglePause(); return; }
    } else if ((k === '1' || k === '2' || k === '3') && sm.current === STATE.LEVELUP) {
      const cards = document.querySelectorAll('#levelup-cards .card');
      const idx = +k - 1;
      if (cards[idx]) { (cards[idx] as HTMLElement).click(); AudioEngine.playSfx('click'); }
    } else if (k === 'p' && sm.current === STATE.PLAYING) togglePause();
    else if (k === 'm') {
      AudioEngine.toggleMode();
      toast('音频：' + AudioEngine.getModeLabel());
    }
  });
  window.addEventListener('keyup', e => { iSt().keys[e.key.toLowerCase()] = false; });
  // 窗口失焦时清零所有按键，防止 WASD 卡键。
  // 必须原地清空：iSt() 返回的是状态浅拷贝，给它的顶层属性赋值
  // 只改到副本上 —— 这个防卡键其实一直没生效。
  // 其余按键读写走的都是 keys 这个共享子对象，原地清才对得上。
  window.addEventListener('blur', () => {
    const keys = iSt().keys;
    for (const k in keys) delete keys[k];
  });
  // 蚀之图鉴 / 蚀月功勋 / 月蚀之仪：主菜单入口，点击时才加载面板模块并绑定。
  // 首次 import 完成后 bind* 会覆盖本处 handler（直接调用对应 open*），后续点击零额外开销。
  $('btn-codex').onclick = () => {
    AudioEngine.playSfx('open');
    _codexLoading ??= import('./codex.js').then(m => { _codexMod = m; return m; });
    void _codexLoading.then(m => { m.bindCodex(); m.openCodex(); });
  };
  $('btn-achievements').onclick = () => {
    AudioEngine.playSfx('open');
    _achvLoading ??= import('./achievements.js').then(m => { _achvMod = m; return m; });
    void _achvLoading.then(m => { m.bindAchievements(); m.openAchievements(); });
  };
  $('btn-settings').onclick = () => {
    AudioEngine.playSfx('click');
    _settingsLoading ??= import('./settings_panel.js').then(m => { _settingsMod = m; return m; });
    void _settingsLoading.then(m => { m.bindSettingsUI(); m.openSettings(); });
  };
  // 功勋达成提示：常驻轻量监听（面板模块懒加载，提示必须游戏运行期即时生效）
  EventBus.on(EVENTS.ACHIEVEMENT_UNLOCKED, (d: any) => {
    toast('功勋达成 · ' + d.name);
    AudioEngine.playSfx('unlock');
  });
}
