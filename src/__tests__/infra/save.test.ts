/* =========================================================
   infra/persistence/save · 月光烙记 + 解锁进度
   ---------------------------------------------------------
   存档系统只依赖 localStorage（已由测试宿主替换为内存版）。
   这里验证「写入 / 读取 / 清空」的原语，以及开发者模式的只读保护。
   ========================================================= */
import { describe, it, expect, beforeEach } from 'vitest';
import { saveRun, loadRunMeta, clearRun, persistUnlocked } from '../../infra/persistence/save.js';
import { enableDevMode, installPlayer } from '../_harness/index.js';
import { stageState } from '../../state/stage.js';
import { statsState } from '../../state/stats.js';

const RUN_KEY = 'eclipse_run_save_v1';
const UNLOCK_KEY = 'eclipse_cycle_save';

beforeEach(() => {
  installPlayer();
  statsState.set('gold', 50); // Store.get state 返回浅拷贝，标量必须用 .set
});

describe('saveRun / loadRunMeta', () => {
  it('非开发者模式把局内进度写入 localStorage', () => {
    saveRun();
    const raw = localStorage.getItem(RUN_KEY);
    expect(raw).not.toBeNull();
    const d = JSON.parse(raw!);
    expect(d.v).toBe(1);
    expect(d.gold).toBe(50);
    expect(d.player).toBeTruthy();
  });

  it('开发者模式下不写正式存档（与 persistUnlocked 保护一致）', () => {
    enableDevMode();
    saveRun();
    expect(localStorage.getItem(RUN_KEY)).toBeNull();
  });

  it('loadRunMeta 在空存档时返回 null', () => {
    expect(loadRunMeta()).toBeNull();
  });

  it('loadRunMeta 回读手动写入的存档', () => {
    localStorage.setItem(RUN_KEY, JSON.stringify({ stage: 4, gold: 9 }));
    expect(loadRunMeta()).toEqual({ stage: 4, gold: 9 });
  });

  it('clearRun 删除存档键', () => {
    saveRun();
    expect(localStorage.getItem(RUN_KEY)).not.toBeNull();
    clearRun();
    expect(localStorage.getItem(RUN_KEY)).toBeNull();
  });
});

describe('persistUnlocked', () => {
  it('非开发者模式持久化解锁进度', () => {
    stageState.set('unlocked', 5);
    persistUnlocked();
    expect(JSON.parse(localStorage.getItem(UNLOCK_KEY)!).unlocked).toBe(5);
  });

  it('开发者模式下不持久化解锁进度', () => {
    enableDevMode();
    persistUnlocked();
    expect(localStorage.getItem(UNLOCK_KEY)).toBeNull();
  });
});
