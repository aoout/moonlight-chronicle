/* =========================================================
   systems/index · ECS 系统调度中枢
   ---------------------------------------------------------
   验证 getSysMan 惰性单例、createSystemManager 注册全部系统、
   以及「在填充的世界上逐帧 update 不抛异常」这一最关键的冒烟。

   不逐个测系统内部逻辑（那属于各 System 自己的职责，且大多只是
   转发 domain 函数，domain 层已被各自的测试覆盖）；这里只守「调度
   本身不塌」。
   ========================================================= */
import { describe, it, expect, beforeEach } from 'vitest';
import { getSysMan, createSystemManager } from '../../systems/index.js';
import { bindWorld, installPlayer, spawnEnemies, makeEnemy } from '../_harness/index.js';

beforeEach(() => {
  bindWorld();
  installPlayer();
});

describe('systems hub', () => {
  it('getSysMan 是惰性单例（多次调用返回同一实例）', () => {
    const a = getSysMan();
    expect(a).toBeDefined();
    expect(getSysMan()).toBe(a);
  });

  it('getWorld 返回已绑定的 World', () => {
    expect(getSysMan().getWorld()).toBeDefined();
  });

  it('createSystemManager 注册全部系统并返回可用调度器', () => {
    const mgr = createSystemManager();
    expect(mgr).toBeDefined();
    expect(mgr.getWorld()).toBeDefined();
  });

  it('update 在填充的世界上逐帧推进不抛异常', () => {
    spawnEnemies(
      makeEnemy({ x: 100, y: 100 }),
      makeEnemy({ x: 200, y: 200, boss: true }),
    );
    const sys = getSysMan();
    expect(() => sys.update(1 / 60)).not.toThrow();
    expect(() => sys.update(0.5)).not.toThrow(); // 大步长也不该崩
  });
});
