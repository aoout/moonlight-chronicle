# ADR-0003: 引入 `platform/` 层，让音频与特效下沉

## 状态

已接受 · 2026-08-06

## 背景

架构守卫第一次跑出的 50 处向上依赖里，有 **22 处是同一个形态**：

```
domain/weapons/orbit.ts        →  features/render/effects/fx.js
domain/weapons/storm.ts        →  features/audio/engine.js
domain/enemies/behaviors/*.ts  →  features/render/effects/fx.js
systems/OrbitSystem.ts         →  features/render/effects/fx.js
...
```

领域逻辑在打出一击时顺手 `spawnHitFx(...)` 和 `AudioEngine.playSfx('hit')`。
这在游戏代码里是极其常见的写法，改成事件要动 22 个文件的调用点，
而且高频路径会引入对象分配。

但把它们留着不管，`domain → features` 这条边就永远存在，
分层就是一句空话。

## 决策

**重新分类，而不是重新布线。**

检查这两个模块的实际依赖后发现：

- `features/audio/`（engine / bgm / sfx / dsp）—— **零外部依赖**。
  纯 WebAudio 调用，不碰 DOM，不知道"武器""敌人"是什么。
- `features/render/effects/fx.ts` —— 只依赖 `engine/util`、`engine/ecs`、
  `engine/core/event_bus`、`state/settings`。它是**粒子发射器 + 对象池**，
  **不含任何绘制代码**（绘制在同目录的 `particles.ts`，那个才是渲染层）。

也就是说：它们被放在 `features/` 里是**分类错误**。
它们不是"表现层"，而是**被领域直接调用的横切服务**。

于是新建 `src/platform/` 层，位于 `state/`(4) 与 `infra/persistence/`(6) 之间：

```
src/platform/
├── audio/     ← features/audio/       （零依赖，纯 WebAudio）
└── fx/fx.ts   ← features/render/effects/fx.ts  （粒子发射，无绘制）
```

`domain → platform` 从此是合法的向下依赖，22 处违规归零，
**调用点一行没改**，只改了 import 路径（44 处，codemod 完成）。

同批下沉的还有两个同样分类错误的模块：

- `systems/SpatialSystem.ts` → `engine/spatial/SpatialSystem.ts`
  纯空间索引，只依赖 `engine/core/system` 和 `engine/ecs/World`，
  却被 11 个 `domain/` 文件反向依赖。它是引擎设施，不是业务系统。
- `infra/debug/dev_mode.ts` → `engine/env.ts`
  零依赖的环境开关（`?dev=1` / localStorage / `VITE_GOD_MODE`），
  被 `commands/`、`features/`、`infra/persistence/` 共 5 处引用。
  它是环境探测，不是调试工具。

## 考虑过的替代方案

| 方案 | 放弃原因 |
|---|---|
| 把 22 处调用改成 `EventBus.emit('fx:hit', {...})` | 高频路径的对象分配；22 个文件的行为改动，回归风险远高于改 import 路径 |
| 定义 `domain/ports/presentation.ts` 端口，把 `addFx` `playSfx` 都倒置进去 | 端口接口会有十几个方法（`spawnBurst` `spawnRing` `spawnSpark` `spawnShard`...），本质是把一个模块的公开 API 抄一遍，纯粹的间接层 |
| 承认"领域可以调用表现服务"，给分层规则开豁免 | 豁免一旦开口就会被滥用；而且这次的诊断结论是**分类错了**，不是**规则太严** |
| 把整个 `features/audio/` 留在原地，只调整层级序号 | `features/` 里同时存在层 5 和层 10 的东西，目录不再等于层级，守卫脚本要为每个子目录写规则，可读性崩坏 |

## 后果

**变好的：**

- 22 + 11 + 5 = **38 处违规通过纯粹的文件移动消除**，零行为改动，
  测试 100 用例全绿，构建产物正常。
- `platform/` 这个名字本身传达了正确的心智模型：
  "这里放不含业务语义、可被任何层调用的服务"。
- `engine/spatial/` 的归位让 `domain/` 使用空间查询变成天经地义的向下依赖。

**变差的 / 需要承担的：**

- 多了一层。层数从 12 变 13，新人要多记一个概念。
- `platform/` 是个容易变成杂物间的名字。**约束**：进 `platform/` 的模块
  必须同时满足"不碰 DOM"和"不知道任何游戏名词"。
  `fx.ts` 里出现 `spawnHitFx(x, y, dmg, crit)` 已经在边界上（它知道"暴击"），
  下次它再长出业务判断就该拆分了。
- `features/render/effects/` 目录现在少了 `fx.ts`，
  发射（platform）与绘制（features）分居两地，读代码要多跳一次。
  这是为了换取依赖方向正确性付出的代价，接受。
