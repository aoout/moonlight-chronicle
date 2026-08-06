# ADR-0004: 测试策略与覆盖率门禁

## 状态

已接受 · 2026-08-06

## 背景

重构后测试套件从 100 个散落用例演进到 375 个，但痛点是"覆盖面"而非"数字"：

- 许多遗留测试用 `vi.mock` 挡住真实链路、手写 `any` fixture，绿灯是假的；
- 确定性随机（`Math.random`）被 ESM 提升陷阱在 setup 期提前捕获，概率测试
  静默退化为抽奖，表现为偶发 flaky；
- `commands/`、`systems/`、`infra/persistence/` 这些"心脏"层几乎零覆盖。

用户要求"彻底完善、深化、优雅化测试部分"，明确允许大刀阔斧改动，
唯一硬约束是**不碰 UI 美术**（`css/`、`index.html`、`favicon.svg` 字节级不变）。

## 决策

1. **测试地基（harness）统一收口**：所有测试只 `import` `src/__tests__/_harness/index.js`，
   提供 `makePlayer` / `makeEnemy` / `bindWorld` / `createCanvasRecorder` / 确定性随机 等。
   零依赖的 `install.ts` 抢在业务模块求值前接管 `Math.random`，
   从根上消除"概率测试偶发变红"。
2. **不变量守卫**：`rng_takeover.test.ts` 把"RNG 已被确定性接管"钉成断言；
   任何让 `install.ts` 意外 `import` 业务模块的改动都会让这条测试红。
3. **跑真实链路**：迁移掉所有 `vi.mock` / `vi.hoisted(window)` / 手写 `any`；
   领域与引擎测试走真实 store + 真实 World + 真实 EntityPool。
4. **分层覆盖策略**：
   - `domain` / `engine-core` / `commands` / `systems` / `infra-persistence`：
     高覆盖 + 行为断言（不只"不抛"）。
   - `features/render`：只做冒烟（assert 不抛、遍历全部造型/分支），
     不像素快照、不改美术。
   - `features/ui`、`platform/audio`、`features/input`：暂不在覆盖率门槛内
     （由运行时冒烟覆盖）。
5. **覆盖率门禁**：`vitest.config.js` 的 `coverage.thresholds` 设两层 ——
   全局地板（挡整体塌方）+ 按已测深文件/层锁定（比当前覆盖低几格，
   锁收益且容忍小幅漂移）。接入 `npm run verify`，未达门槛无法构建。
6. **反模式守卫**：`scripts/check-only.mjs` 扫描测试文件，发现 `.only` 立即失败，
   防止"只跑一个用例"的提交悄悄跳过其余。

## 考虑过的替代方案

| 方案 | 放弃原因 |
|---|---|
| 只追覆盖率数字、补一堆低价值用例 | 用户明确要"能抓 bug 的测试"，不是刷数；低价值用例是噪音 |
| 给 `features/ui` 也设高门槛 | 会逼出像素快照测试，直接威胁"不碰 UI 美术"硬约束 |
| 用 NYC/istanbul 全局 hook | vite 项目里 v8 provider 与 vitest 原生集成更顺，零额外依赖 |
| 覆盖率门槛全自动生成 | 全自动会把"现状"钉死，连 0% 的未测文件都锁住，失去"逼出覆盖"的意义 |

## 后果

**变好的：**

- 概率类测试从"偶发 flaky"变成确定性可复现。
- `commands/run`（开局/开夜/续局）、`save`（月光烙记读写）、`levelup`、
  `systems` 调度 首次被真实链路覆盖。
- 覆盖率门槛让"改坏已测逻辑"会在 CI 红，而不是等线上爆。

**变差的 / 需要承担的：**

- 测试对生产代码形状更敏感（fixture 复用真实类型），生产改字段时测试会跟着红 ——
  这正是意图。
- coverage 门槛是手工标定的（基于当前基线减缓冲），新测深一层需同步调阈值；
  这是有意为之的小维护成本。

## 数据

| 指标 | 深化前 | 深化后 |
|---|---|---|
| 测试文件 | 16 | 22 |
| 用例数 | 100 | 375 |
| Statements | 31.14% | 36.26% |
| Branches | 21.22% | 26.84% |
| Functions | 24.87% | 31.69% |
| Lines | 30.16% | 36.26% |

## 已知生产缺陷（已被测试"现状锁定"，不在本次授权范围内改动）

- `domain/combat.ts` 的 oath 分支：`p.invuln = Math.max(p.invuln, 1)` 无 early return，
  被结尾 `p.invuln = 0.45` 覆盖，导致"保命无敌帧"实际只有 0.45s
  （`nearDeath` 分支有 return 故 3s 生效）。
  `combat.test.ts` 以 `oath 保命后的无敌帧被结尾赋值覆盖，实际只有 0.45s（现状锁定）`
  用例文档化，改动前请先读该注释。

## 相关

- [`../README.md`](../README.md) · 分层总览与验证方式
- [`0001-strict-layering-with-fitness-function.md`](./0001-strict-layering-with-fitness-function.md) · 分层守卫
