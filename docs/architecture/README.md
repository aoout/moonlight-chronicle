# 蚀月远征 · 架构总览

> 本文档描述 `src/` 的分层结构、依赖规则与验证方式。
> 决策的**理由**记录在 [`adr/`](./adr/) 中；本文只讲**现状**。

## 一、分层

依赖只能自上而下（高层 → 低层），**同层自由，禁止反向**。

```
┌──────────────────────────────────────────────────────────┐
│ 12  app/            组装根：主循环 + 状态机钩子            │  2 文件
├──────────────────────────────────────────────────────────┤
│ 11  infra/debug/    调试与压测工具（可俯视一切）           │ 11 文件
├──────────────────────────────────────────────────────────┤
│ 10  features/       表现层：render / ui / input           │ 44 文件
├──────────────────────────────────────────────────────────┤
│  9  commands/       意图层：UI → 领域的唯一入口            │  4 文件
├──────────────────────────────────────────────────────────┤
│  8  systems/        ECS 系统编排                          │ 12 文件
├──────────────────────────────────────────────────────────┤
│  7  domain/         领域规则：战斗 / 武器 / 敌人 / 词条     │ 30 文件
├──────────────────────────────────────────────────────────┤
│  6  infra/persistence/  存储适配器：存档 / 图鉴 / 成就      │  4 文件
├──────────────────────────────────────────────────────────┤
│  5  platform/       横切服务：音频、特效粒子发射            │  5 文件
├──────────────────────────────────────────────────────────┤
│  4  state/          状态容器（Store 切片）                 │  9 文件
├──────────────────────────────────────────────────────────┤
│  3  config/         纯数据配置（无行为）                   │ 12 文件
├──────────────────────────────────────────────────────────┤
│  2  assets/         静态资产叶子：图标 SVG / 调色板         │  2 文件
├──────────────────────────────────────────────────────────┤
│  1  engine/         ECS / 状态机 / 事件总线 / 空间索引 / 工具 │ 13 文件
├──────────────────────────────────────────────────────────┤
│  0  types/          纯类型声明                            │  2 文件
└──────────────────────────────────────────────────────────┘
                      src/main.ts  ← 唯一的启动入口，可依赖一切
```

### 各层职责边界

| 层 | 可以做 | 不可以做 |
|---|---|---|
| `types/` | 声明形状 | 任何运行时代码 |
| `engine/` | ECS、状态机、事件总线、对象池、空间索引、随机数、环境开关 | 任何游戏业务语义 |
| `assets/` | 导出 SVG 字符串、颜色常量 | 碰 DOM、读状态 |
| `config/` | 加载 JSON、声明数值表 | 包含行为函数（已迁至 `domain/`） |
| `state/` | 持有可订阅的状态切片 | 计算业务规则 |
| `platform/` | 播放音频、发射粒子 | 碰 DOM、知道"武器""敌人"是什么 |
| `infra/persistence/` | 序列化读写 localStorage | 水合运行时状态、推进流程（属 `commands/`） |
| `domain/` | 伤害公式、词条效果、敌人行为 | 碰 DOM、直接调用系统或 UI |
| `systems/` | 每帧驱动领域逻辑 | 被领域反向依赖 |
| `commands/` | 编排一次用户意图（买、升级、开局、续局） | 碰 DOM |
| `features/` | 渲染画面、绑定 DOM 事件 | 直接改 state（走 `commands/`） |
| `infra/debug/` | 覆盖层、性能面板、基准压测 | 被生产代码直接依赖（走端口） |
| `app/` | 装配主循环 | 承载业务流程 |

## 二、依赖倒置的三种手段

低层需要触达高层能力时，**不允许反向 import**，只能走以下三种：

### 1. 端口（Port）— 高频、需返回值

低层定义接口 + 注册函数，高层在模块加载时注册实现。
零对象分配，适合每帧调用。

| 端口 | 定义处 | 实现注册处 |
|---|---|---|
| 成就汇报 | `domain/ports/achievements.ts` | `systems/AchievementSystem.ts` |
| 帧性能探针 | `engine/core/profiler_port.ts` | `infra/debug/performance.ts` |
| 固定负载闸门 | `engine/env.ts` | `infra/debug/bench/state.ts` |
| 渲染叠加层槽位 | `features/render/overlays.ts` | `infra/debug/panel.ts` |

### 2. 事件总线（EventBus）— 低频、一对多、无返回值

`engine/core/event_bus.ts`。领域只管发生了什么，不关心谁在听。

| 事件 | 发出方 | 订阅方 |
|---|---|---|
| `stage:cleared` | `engine/core/states.ts` | `systems/AchievementSystem.ts` |
| `progress:unlocked` | `domain/combat.ts` | `infra/persistence/event_bridge.ts` |
| `ui:spawnText` / `ui:dmgNumber` | `domain/*` | `features/ui/event_bridge.ts` |
| `audio:sfx` | `domain/*` | `features/ui/event_bridge.ts` |
| `shop:panelRefresh` | `features/ui/shop/weapon_detail.ts` | `features/ui/shop/panel.ts` |

### 3. 提取共享叶子 — 同层双向依赖

两个同级模块互相需要对方的一小块东西时，把那块东西抽成第三个叶子模块。
例：`platform/audio/dsp.ts`（engine ↔ bgm 共用的 `makeImpulse`）、
`features/ui/pause_control.ts`（scheduler ↔ mobile_action_bar 共用的 `togglePause`）。

## 三、如何验证

```bash
npm run typecheck    # tsc --noEmit
npm run arch         # 分层方向检查（scripts/check-arch.mjs）
npm run arch:cycles  # 循环依赖检查（madge）
npm run test         # vitest
npm run verify       # 以上三项（typecheck + arch + test）
npm run build        # verify 通过后才打包
```

`npm run arch` 是一个**架构适应度函数**：分层规则写在
`scripts/check-arch.mjs` 顶部的 `LAYERS` 数组里，改层级或加豁免都在那里。
它已接入 `npm run build`，违反分层的代码无法构建通过。

## 四、当前状态

- 循环依赖：**0**（重构前 14）
- 向上依赖：**0**（重构前 50）
- 测试：16 文件 / 100 用例全绿
- 生产构建：297.86 kB（gzip 93.46 kB）

## 五、已知的遗留项

- `src/__tests__/` 有 100 个用例，但集中在领域计算与配置解析；
  `features/` 与 `app/` 基本无测试覆盖。
- `scripts/check-arch.mjs` 只检查**静态 import 方向**，不检查
  运行时通过端口/事件产生的实际耦合强度。端口注册点需要人工守。
- 若干导出符号疑似无人使用（约 100 个候选，含大量类型与调试 API 误报），
  未做批量清理，避免误删动态引用。
