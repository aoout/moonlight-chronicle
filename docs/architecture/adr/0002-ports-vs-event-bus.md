# ADR-0002: 依赖倒置用端口还是事件总线

## 状态

已接受 · 2026-08-06

## 背景

分层规则确立后（ADR-0001），有一批低层模块确实需要触达高层能力：

- `domain/combat.ts` 每次造成伤害要通知成就系统累计
- `engine/core/system_manager.ts` 每帧要写性能采样
- `systems/*System.ts` 要知道当前是不是基准压测的固定负载模式
- `domain/*` 要在玩家头顶弹一行飘字

项目里已经有一个 `EventBus`（`engine/core/event_bus.ts`），
最省事的做法是全部改成事件。但 `achOnDamage(dmg, crit)`
在战斗高峰期每秒会被调用数百次，`EventBus.emit` 需要为每次调用
分配一个事件对象字面量。这个项目有专门的 benchmark 目录和帧性能面板，
说明帧稳定性是被认真对待的指标。

## 决策

按**调用频率**和**是否需要返回值**分流：

### 用端口（Port）

低层定义 `interface` + `setXxx()` 注册函数 + 一个 NOOP 默认实现；
高层在模块加载时调用 `setXxx()` 注册真实实现。

适用条件（满足任一）：

- 每帧或高频调用 —— 避免事件对象分配
- 需要返回值 —— 事件总线是单向的
- 只有一个实现方 —— 一对多广播是浪费

已落地的端口：

| 端口 | 定义处 | 注册处 | 选它的理由 |
|---|---|---|---|
| `AchievementSink` | `domain/ports/achievements.ts` | `systems/AchievementSystem.ts` | 高频 + `earnedTotal()` 需返回值 |
| `FrameProfiler` | `engine/core/profiler_port.ts` | `infra/debug/performance.ts` | 每帧调用 |
| `isFixedLoad()` | `engine/env.ts` | `infra/debug/bench/state.ts` | 需返回 boolean |
| 渲染叠加层槽位 | `features/render/overlays.ts` | `infra/debug/panel.ts` | 需保持 z-order，注册即插槽 |

### 用事件总线（EventBus）

适用条件（同时满足）：

- 低频（每关一次、每次击杀一次这个量级）
- 单向通知，不要返回值
- 潜在多个订阅方

已落地的事件见 [`../README.md`](../README.md#2-事件总线eventbus--低频一对多无返回值)。

### 用共享叶子（Shared Leaf）

同层两个模块互相 import 时，不用端口也不用事件 —— 把双方共用的那一小块
抽成第三个叶子模块。这是最简单的解，优先考虑。

- `platform/audio/dsp.ts` ← `engine.ts` ↔ `bgm.ts` 共用的 `makeImpulse`
- `features/ui/pause_control.ts` ← `scheduler.ts` ↔ `mobile_action_bar.ts`
  共用的 `pausePanel` / `togglePause`

## 考虑过的替代方案

| 方案 | 放弃原因 |
|---|---|
| 全部走 EventBus | 高频路径的对象分配会给 GC 加压；且 `earnedTotal()` 这类查询天然不适合单向广播 |
| 全部走端口 | 一对多场景（一个 `ui:spawnText` 可能同时驱动飘字和音效）用端口要维护订阅者数组，等于手搓一个事件总线 |
| 依赖注入容器（DI Container） | 168 文件的项目引入容器是典型的架构宇航员行为：多一层间接、多一份启动顺序心智负担，换不到可测性以外的收益 |
| 构造函数注入（把依赖当参数传） | 调用链太深，`domain/weapons/orbit.ts` 拿到 sink 要穿过五六层函数签名，改动面远大于收益 |

## 后果

**变好的：**

- 低层模块可以脱离高层单独测试（默认 NOOP 实现让它们直接可跑）。
- 高频路径零额外分配，性能不因架构解耦而退化。
- 两种手段各有清晰的适用条件，不需要每次都重新纠结。

**变差的 / 需要承担的：**

- **端口的注册依赖模块被加载**。`AchievementSystem.ts` 底部的
  `setAchievementSink(...)` 只有在该模块被 import 时才执行。
  如果哪天成就系统被 tree-shake 掉或改成懒加载，领域层会静默退化成
  NOOP —— 不报错，只是成就不再累计。这是这个方案最大的风险。
  缓解：`commands/run.ts` 的 `startRun()` 直接 import 并调用
  `initAchievements()`，保证模块一定被加载。
- 调试时"谁在响应这个调用"多了一跳，需要靠文档表格定位。
- 两套机制并存，新增倒置点时要先判断走哪条路。
