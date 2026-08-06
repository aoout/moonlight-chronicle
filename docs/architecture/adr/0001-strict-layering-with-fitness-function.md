# ADR-0001: 严格分层 + 可执行的架构守卫

## 状态

已接受 · 2026-08-06

## 背景

重构前 `src/` 是 12 个平铺目录（`core/ ecs/ data/ render/ ui/ audio/ input/
persistence/ debug/ weapons/ enemies/ systems/`），没有任何依赖方向约束。
实测结果：

- **14 个循环依赖**（madge）
- **50 处向上依赖**：`config/` 里塞着 `apply(p)` 行为函数并反过来 import
  `state/`；`engine/core/states.ts` 直接 import `systems/AchievementSystem`；
  `domain/` 直接 import `features/ui/hud_utils` 操作 DOM；
  `infra/persistence/save.ts` 直接 import `app/game.ts` 推进关卡流程。

后果是任何一处改动的影响范围都无法靠读代码判断，
新增功能倾向于"就近插入"，进一步加剧纠缠。

## 决策

1. 把 `src/` 重组为 **13 个有明确层级序号的目录**，依赖只能自上而下。
   层级定义见 [`../README.md`](../README.md)。
2. 写一个**架构适应度函数** `scripts/check-arch.mjs`：
   解析每个 `.ts` 文件的相对 import，按目录前缀（支持二级，如
   `infra/persistence` 与 `infra/debug` 分属不同层）判定层级，
   发现 `to.level > from.level` 即报错退出。
3. 把它接进 `npm run build`：`build = verify && vite build`，
   `verify = typecheck && arch && test`。**违反分层的代码无法构建。**

## 考虑过的替代方案

| 方案 | 放弃原因 |
|---|---|
| 只写文档约定，靠 code review 守 | 已经有过一版目录约定，事实证明守不住 |
| ESLint `import/no-restricted-paths` | 需要为每层写 N² 条 zone 规则，可读性差；且本项目 ESLint 配置极简，引入 `eslint-plugin-import` 是更大的依赖负担 |
| dependency-cruiser | 功能足够但配置 DSL 学习成本高，且对这个规模（168 文件）是杀鸡用牛刀；自写脚本 100 行，规则一目了然 |
| 拆成 monorepo 用包边界强制隔离 | 单人/小团队的浏览器小游戏，构建复杂度收益不成正比 |

## 后果

**变好的：**

- 依赖方向从"读代码猜"变成"跑一条命令"。
- 层级序号本身就是文档：看到 `domain/` 就知道它不可能碰 DOM。
- 新人（或半年后的自己）加代码时，放错位置会立刻被 CI 拦住。

**变差的 / 需要承担的：**

- 每次要跨层调用都得想清楚方向，短期内比"直接 import"慢。
- 层级划分本身是判断题，`platform/` 与 `infra/persistence/` 的位置
  是权衡的结果（见 ADR-0003），不是唯一正解；未来若判断变化，
  改 `LAYERS` 数组即可，但会一次性暴露一批违规。
- 脚本只看**静态 import**。通过端口注册产生的运行时耦合它看不见，
  仍需人工守住"端口实现只在组装期注册一次"这条纪律。

## 数据

| 指标 | 重构前 | 重构后 |
|---|---|---|
| 循环依赖 | 14 | 0 |
| 向上依赖 | 50 | 0 |
| 测试 | 100 通过 | 100 通过（未改断言） |
| 构建产物 | — | 297.86 kB / gzip 93.46 kB |
