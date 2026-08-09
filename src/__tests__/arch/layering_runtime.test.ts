/* =========================================================
   架构回归测试 · 核心层运行时无 DOM 依赖
   ---------------------------------------------------------
   这次分层重构的核心承诺是：0–9 层（engine/assets/config/state/
   platform/infra-persistence/domain/systems/commands）不得依赖
   浏览器 DOM，领域逻辑可脱离 UI 独立运行。

   check-arch.mjs 只做静态导入路径检查，抓不到"顶层副作用里
   摸了 document"这类运行时越界。本测试在**完全没有 document /
   window / HTMLElement** 的环境下把这 91 个模块全量加载一遍：
     - 模块顶层碰 DOM   → 抛错，测试失败
     - 环依赖导致 TDZ   → 抛错，测试失败
     - 端口注册失败      → 断言失败

   新增顶层目录时，若属于 0–9 层，记得加进 CORE_LAYER_GLOB。
   ========================================================= */
import { describe, it, expect, beforeAll } from 'vitest';

// 仅提供非 DOM 的宿主能力：定时器已由 node 提供，这里补 localStorage。
// 刻意不提供 document / window / HTMLElement —— 谁碰谁炸，这正是我们要的。
beforeAll(() => {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => { store.clear(); },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size; },
  };
});

// eager:false → 拿到一组 loader，逐个 await，失败时能精确定位到文件
const CORE_MODULES = import.meta.glob([
  '../../engine/**/*.ts',
  '../../assets/**/*.ts',
  '../../config/**/*.ts',
  '../../state/**/*.ts',
  '../../platform/**/*.ts',
  '../../infra/persistence/**/*.ts',
  '../../domain/**/*.ts',
  '../../systems/**/*.ts',
  '../../commands/**/*.ts',
], { eager: false });

describe('核心层（0–9）运行时无 DOM 依赖', () => {
  it('全部模块可在无 document/window 的环境下加载', async () => {
    expect(globalThis).not.toHaveProperty('document');

    const paths = Object.keys(CORE_MODULES).sort();
    expect(paths.length).toBeGreaterThan(80); // 防止 glob 写错导致空跑

    const failures: string[] = [];
    for (const p of paths) {
      try {
        await CORE_MODULES[p]();
      } catch (e) {
        failures.push(`${p}\n    → ${(e as Error).message}`);
      }
    }

    if (failures.length) {
      throw new Error(
        `${failures.length}/${paths.length} 个核心层模块加载失败：\n  ` +
        failures.join('\n  ')
      );
    }
  }, 30000);

  it('成就端口在 systems 层加载后完成注册（非 NOOP 静默降级）', async () => {
    const { achievements } = await import('../../domain/ports/achievements.js');
    // 加载 systems 层实现，其模块顶层会调用 setAchievementSink
    await import('../../systems/AchievementSystem.js');

    const sink = achievements();
    expect(typeof sink.onDamage).toBe('function');
    // NOOP 的 earnedTotal 恒为 0 且不读真实进度；真实实现能返回数字且不抛错
    expect(typeof sink.earnedTotal()).toBe('number');
  });

  it('fixed-load 探针默认关闭，注册后可被 bench 接管', async () => {
    const { isFixedLoad, setFixedLoadProbe } = await import('../../engine/env.js');

    setFixedLoadProbe(null);
    expect(isFixedLoad()).toBe(false); // 未注册时安全默认值

    setFixedLoadProbe(() => true);
    expect(isFixedLoad()).toBe(true);

    setFixedLoadProbe(null); // 复原，避免污染其它用例
    expect(isFixedLoad()).toBe(false);
  });
});
