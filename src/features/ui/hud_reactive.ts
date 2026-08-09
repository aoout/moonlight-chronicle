/* =========================================================
   蚀月远征 · HUD 响应式绑定
   使用 Store.on() 订阅状态变更，替代轮询
   ========================================================= */
import { playerState } from '../../state/player.js';
import { statsState } from '../../state/stats.js';
import { stageState } from '../../state/stage.js';
import { clamp } from '../../engine/util/utils.js';
import { CONFIG } from '../../config/index.js';
import { $ } from './hud_utils.js';
import { iconSVG } from '../../assets/icons.js';

import { sSt } from '../../state/accessors.js';

/** 保存所有 Store.on() 取消订阅函数，供 destroyHudReactive 清理 */
let _hudUnsubs: (() => void)[] = [];

/** 注册所有 HUD 响应式绑定 */
export function initHudReactive(): void {
  destroyHudReactive();
  _hudUnsubs = [
    /* ----- 金币 ----- */
    statsState.on('gold', (gold) => {
      $('gold-text').textContent = String(Math.floor(gold));
    }),

    /* ----- 击杀数 ----- */
    statsState.on('kills', (kills) => {
      $('kill-text').textContent = String(kills);
    }),

    /* ----- 经验条 ----- */
    statsState.on('xp', () => {
      $('xp-fill').style.width = clamp(sSt().xp / sSt().xpNeeded * 100, 0, 100) + '%';
    }),
    statsState.on('xpNeeded', () => {
      $('xp-fill').style.width = clamp(sSt().xp / sSt().xpNeeded * 100, 0, 100) + '%';
    }),

    /* ----- 等级 ----- */
    statsState.on('level', (level) => {
      $('xp-text').textContent = 'Lv.' + level;
    }),

    /* ----- 关卡编号 ----- */
    stageState.on('stage', (stage) => {
      $('stage-num').textContent = '第 ' + stage + ' 夜';
      // 月相图标也随 stage 变化
      const mp = $('moonphase');
      mp.innerHTML = iconSVG(stage >= CONFIG.FINAL_STAGE ? 'moonFull' : 'moon');
      mp.classList.toggle('eclipsed', stage >= CONFIG.FINAL_STAGE);
    }),

    /* ----- 关卡名称 ----- */
    stageState.on('stageName', (name) => {
      $('stage-name').textContent = name;
    }),

    /* ----- 武器栏（仅武器列表变化时重建） ----- */
    // 监听 player 引用变化，对比 weapons 签名决定是否重绘
    (() => {
      let lastWeaponSig = '';
      return playerState.on('player', (p) => {
        if (!p) return;
        const sig = p.weapons.map((w: any) => w.id + ':' + w.lv).join(',') + '|' + p.weapons.length;
        if (sig === lastWeaponSig) return;
        lastWeaponSig = sig;
        // 触发武器栏重建标记清除（下次 uiTick 检测到 sig 变化会重建）
        // 直接调用 renderWeaponBar 会引入循环依赖，通过标记机制
        const bar = $('weapon-bar') as any;
        if (bar) bar._sig = '';  // 清空签名强制重建
      });
    })(),
  ];
}

/** 销毁所有 HUD 订阅，防止重复累积 */
export function destroyHudReactive(): void {
  for (const unsub of _hudUnsubs) unsub();
  _hudUnsubs = [];
}