# 架构重构验收报告

- **分支**：`refactor/architecture-2026-08-06`
- **基线**：`97d31d7`（重构前）
- **验收日期**：2026-08-06
- **结论**：通过（自动化部分），人工试玩待确认

---

## 1. 提交清单

| 提交 | 内容 |
|---|---|
| `b73f7af` | 13 层严格分层架构（185 文件，+2520 / −995） |
| `b25cc6c` | 移除旧 `js/` 布局遗留死文件 |
| `64f0ccf` | 核心层运行时无 DOM 依赖回归测试 |

工作区状态：干净（`git status --porcelain` 为空）。

---

## 2. 自动化验证

```
npm run verify = typecheck + arch + test
```

| 项 | 工具 | 基线 | 当前 | 结果 |
|---|---|---|---|---|
| 类型检查 | `tsc --noEmit` | — | 无错误 | 通过 |
| 向上依赖 | `scripts/check-arch.mjs` | 50 | **0** | 通过 |
| 循环依赖 | `madge --circular` | 14 | **0** | 通过 |
| 单元测试 | `vitest run` | 16 文件 / 100 用例 | **17 文件 / 103 用例** | 全绿 |
| 生产构建 | `vite build` | — | 297.29 kB（gzip 93.30 kB） | 成功 |

产物较重构前小 0.57 kB，为死代码清理的净收益。

---

## 3. 静态检查覆盖不到的部分

`check-arch.mjs` 只解析导入路径，以下三类问题必须另行验证。

### 3.1 依赖倒置的注册链路（防 NOOP 静默降级）

依赖倒置引入的风险是：接口留了 NOOP 默认实现，若实现方模块从未被加载，
调用端不会报错，功能会静默失效。逐条核查加载链路：

| 端口 | 注册方 | 触发链路 | 结论 |
|---|---|---|---|
| `domain/ports/achievements.ts` | `systems/AchievementSystem.ts`（模块顶层） | `main.ts → app/game.ts → commands/run.ts` 顶层静态 import | 早于第一帧，成立 |
| `engine/env.ts` fixed-load 探针 | `infra/debug/bench/state.ts`（模块顶层） | `main.ts → app/game.ts` 顶层静态 import | 成立 |

事件桥接模块（`features/render`、`features/ui`、`infra/persistence` 各一个）
在 `main.ts` 中以显式 `initXxxBridge()` 调用，而非依赖裸 import 的副作用，
可靠性优于后者。

### 3.2 EventBus 收发配对

与基线 `97d31d7` 逐项 diff：

- **重构新增 3 对事件**：`progress:unlocked`、`ui:dmgNumber`、`stage:cleared` —— 全部收发配对。
- **孤儿 emit 6 个**：`combat:hit`、`game:runStart`、`player:heal`、`player:hurt`、`shop:open`、`shop:close`
  —— 基线中已存在，属预留扩展点，非本次回归。

> 提取事件名时注意：单行多语句（如 `combat.ts:172` 一行内两个 `emit`）
> 会被简单的 `sed` 切分漏掉，据此误判为孤儿。

### 3.3 运行时无 DOM 依赖（新增回归测试）

`src/__tests__/layering_runtime.test.ts`：在**不提供 `document` / `window` /
`HTMLElement`**、仅补 `localStorage` 的环境下，用 `import.meta.glob`（`eager: false`）
把 0–9 层共 **91 个模块**逐个动态 import。

覆盖的失效模式：

- 模块顶层副作用访问 DOM → 抛错并精确报出文件名
- 环依赖残留导致的 TDZ 错误 → 抛错
- 端口降级为 NOOP → 断言失败

结果：91/91 加载成功。这是"领域逻辑已脱离 UI"这一重构目标最直接的运行时证据。

---

## 4. UI 美术约束

硬约束为「UI 美术完全保持原样」。验收方式不止于工作区干净，
而是与**重构起点**做全量 diff：

```
$ git diff --stat 97d31d7 HEAD -- css/ index.html favicon.svg
（空）
```

`css/` 下 12 个样式文件、`index.html`、`favicon.svg` 相对基线零字节改动。
canvas 绘制逻辑（`features/render/`）仅发生文件位置与导入路径变化，
绘制代码本身未改。

---

## 5. 人工验收

开发服务器：`npx vite --port 5199` → http://localhost:5199/

建议重点试玩项（覆盖本次改动风险面）：

| 验收项 | 关联改动 |
|---|---|
| 开局、通关一层、进入商店 | `commands/run.ts` 抽出的 `startRun` / `startStage` |
| 读取存档继续游戏 | `resumeRun` 从 `save.ts` 迁至 `commands/` |
| 商店买卖后面板刷新 | `shop:panelRefresh` 事件替代直接函数调用 |
| 暂停/恢复（含移动端按钮） | `pause_control.ts` 共享叶子模块 |
| 击杀敌人的伤害数字与飘字 | `ui:dmgNumber`、`ui:spawnText` 事件 |
| Boss「蚀咒」技能飘字 | `boss_skills.ts` 改用 EventBus |
| 成就解锁与进度统计 | 成就 Port 依赖倒置 |
| 音效与 BGM | `platform/audio/` 层迁移 |
| 深度解锁后存档 | `progress:unlocked` 事件 |

---

## 6. 维护须知

- **新增顶层目录时，必须同步更新 `scripts/check-arch.mjs` 的 `LAYERS` 数组**，
  否则该目录不受分层管控，会成为架构腐化的入口。
  若属 0–9 层，同时加入 `layering_runtime.test.ts` 的 `CORE_LAYER_GLOB`。
- `npm run build` 已等于 `verify && vite build`，出现向上依赖会直接阻断构建。
- 本机环境：`vite build` 清空 `dist/` 会被沙箱 safe-delete 拦截，
  需先手动清空 `dist/` 或加 `--emptyOutDir false`。此为环境问题，非项目问题。
