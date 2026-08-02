# 蚀月远征 · 重构计划 & 日志 V2

> 目标：在现有 ECS 架构基础上，引入现代工程化工具链、类型系统、组件化 UI、自动化测试，将项目提升到工业级质量标准。
> 核心哲学：**工具链先行，类型安全，组件化架构，测试驱动重构**。

---

## 当前架构总览（重构前 V2）

| 指标 | 数据 |
|------|------|
| 总文件数 | ~60 JS 文件 + 8 CSS 文件 |
| 架构模式 | ECS 架构 + 领域切片状态 + 可组合武器管线 |
| 导入图 | DAG（有向无环图），无循环依赖 |
| 状态管理 | 6 个领域切片 + `G` 聚合层 |
| 武器系统 | 可组合行为管线（5 个模块） |
| 构建工具 | 无（原生 ES Modules） |
| 类型系统 | 无 |
| 测试 | 无 |
| 打包 | 无 |

---

## 总体计划

### Phase 1: Vite 构建系统（基础）

> 引入 Vite 作为构建工具，获得 HMR、打包、环境管理能力。这是所有后续阶段的基础。

**步骤：**
- [x] 1.1 初始化 `package.json`，配置 `npm run dev` / `npm run build`
- [x] 1.2 安装 Vite 作为 dev dependency
- [x] 1.3 创建 `vite.config.js`（配置开发服务器、CSS、路径别名）
- [x] 1.4 验证 `npm run dev` 启动正常，HMR 工作
- [x] 1.5 验证 `npm run build` 生产构建正常
- [x] 1.6 清理：删除 `?v=45` 缓存参数（Vite 自带 hash）

**风险：** 低。Vite 对原生 ES Modules 项目迁移成本极低，只需调整少量配置。

**预期效果：** 开发热更新、生产构建打包、环境变量管理。

---

### Phase 2: CSS 工程化

> 利用 Vite 的 CSS 能力，引入 PostCSS 和 CSS 变量统一管理，为后续 UI 组件化做准备。

**步骤：**
- [x] 2.1 安装 PostCSS 插件（autoprefixer, cssnano）
- [x] 2.2 创建 `postcss.config.js`
- [x] 2.3 建立 CSS 设计令牌系统（`css/tokens.css`）
  - 从各 CSS 文件中提取共享变量（颜色、字体、间距、圆角）
  - 统一 `--gold`, `--moon`, `--ice`, `--fire` 等语义色
- [x] 2.4 验证设计令牌覆盖所有 CSS 文件
- [x] 2.5 验证构建后 CSS 压缩正常

**风险：** 低。纯 CSS 重构，不影响 JS 逻辑。

---

### Phase 3: TypeScript 渐进式迁移

> 在 Vite 基础上引入 TypeScript，从数据层开始逐步覆盖整个项目。**不做全量重写，而是渐进式迁移。**

**策略：** 先类型定义，再数据文件，最后逻辑文件。使用 `allowJs` 和 `checkJs` 实现渐进式。

**步骤：**
- [x] 3.1 安装 TypeScript + 相关依赖
- [x] 3.2 创建 `tsconfig.json`（`allowJs: true`, `checkJs: true`, `strict: true`）
- [x] 3.3 创建核心类型定义文件 `js/types/core.d.ts`
  - `Player` 类型
  - `WeaponDef` / `WeaponInstance` 类型
  - `EnemyDef` / `EnemyInstance` 类型
  - `Entity` 类型
  - `G` 全局状态类型
- [x] 3.4 创建游戏数据类型定义 `js/types/data.d.ts`
  - 武器配置、敌人配置、道具配置、祝福配置
- [x] 3.5 将数据文件（`js/data/*.js`）添加 `// @ts-check` 并修复类型错误
- [x] 3.6 将系统文件（`js/systems/*.js`）添加 `// @ts-check` 并修复
- [x] 3.7 将核心文件（`js/state.js`, `js/game.js`）添加 `// @ts-check` 并修复
- [x] 3.8 将渲染文件（`js/render/*.js`）添加 `// @ts-check` 并修复
- [x] 3.9 将 UI 文件（`js/ui.js`, `js/ui/*.js`）添加 `// @ts-check` 并修复
- [x] 3.10 在 `npm run build` 中添加 TypeScript 检查

**风险：** 中。TypeScript 的 strict 模式可能暴露大量隐式 any 问题，需要逐步修复。

**预期效果：** 编辑器智能提示、编译时类型检查、重构安全。

---

### Phase 4: UI 组件化重构

> 将 `js/ui.js`（250 行）和 `js/ui/` 目录下的 DOM 操作重构为轻量级组件系统，使 UI 可组合、可测试、可维护。

**方案：** 自建轻量级组件系统（不引入框架依赖），每个组件 = 类 + render() + 生命周期。

**步骤：**
- [x] 4.1 创建组件基类 `js/ui/component.js`
  - `render()` — 返回 HTML 字符串或 DOM 节点
  - `onMount()` — 挂载后调用
  - `onDestroy()` — 销毁前调用
  - `update(props)` — 更新属性并重新渲染
- [x] 4.2 拆分为独立组件文件
  - `js/ui/components/LevelUpPanel.js` — 升级选择面板
  - `js/ui/components/ResultPanel.js` — 结算面板
  - `js/ui/components/PausePanel.js` — 暂停面板
  - `js/ui/components/GateScreen.js` — 远征之门
- [x] 4.3 创建组件注册表 `js/ui/registry.js`
  - 管理组件实例化、挂载、卸载
  - 提供 `mount(container, component)` / `unmount(component)` API
- [x] 4.4 重构 `js/ui.js` 为组件调度器
  - 移除大部分 DOM 操作，改为组件挂载/卸载
  - 事件绑定委托给组件生命周期
- [x] 4.5 验证：`npm run build` 零错误

**现有组件映射：**

| 当前函数 | 目标组件 | 行数 | 复杂度 |
|---------|---------|------|--------|
| `openLevelUp()` | `LevelUpPanel` | 42 | 中 |
| `openResult()` | `ResultPanel` | 22 | 低 |
| `togglePause()` / `renderPausePanel()` | `PausePanel` | 28 | 低 |
| `openGate()` | `GateScreen` | 20 | 低 |
| `bindUI()` | 事件调度器 | 65 | 高 |
| `enterGame()` / `resumeRun()` | 流程控制器 | 20 | 中 |

**风险：** 中。UI 逻辑与游戏状态耦合较深，需要小心处理状态转换。

**预期效果：** UI = 组件树，每个组件独立可测试，新 UI 组件可插拔。

---

### Phase 5: 渲染系统重构

> 将 `render/entities.js`（522 行）按实体类型拆分为独立渲染模块，引入渲染管线概念。

**步骤：**
- [x] 5.1 创建 `js/render/layers/` 目录
- [x] 5.2 按敌人类型拆分渲染函数
  - `js/render/layers/enemies.js` — 敌人造型注册表
  - `js/render/layers/bosses.js` — Boss 造型注册表
- [x] 5.3 精简 `render/entities.js`：移除重复定义，改为从 layers/ 导入
- [x] 5.4 更新 `render/index.js` 再导出路径
- [x] 5.5 验证：`npm run build` 零错误

**风险：** 低。纯搬移 + 引用更新，不改变渲染逻辑。

**预期效果：** 新增敌人类型只需添加渲染文件，渲染管线可控可测。

---

### Phase 6: 测试基础设施

> 引入 Vitest 测试框架，为游戏核心逻辑编写单元测试，确保重构安全。

**步骤：**
- [x] 6.1 安装 Vitest 作为 dev dependency
- [x] 6.2 创建 `vitest.config.js`（与 Vite 共享配置）
- [x] 6.3 创建测试目录 `js/__tests__/`
- [x] 6.4 为核心战斗系统编写测试
  - `js/__tests__/combat.test.js` — 伤害计算、暴击、穿透
- [x] 6.5 为空间哈希网格编写测试
  - `js/__tests__/spatial.test.js` — 邻居查询、范围查询
- [x] 6.6 为实体池编写测试
  - `js/__tests__/entity_pool.test.js` — 添加、压缩、重置
- [x] 6.7 在 `npm test` 中集成 Vitest
- [x] 6.8 最终验证：`npm test` 23 个测试全部通过

**风险：** 低。纯新增文件，不影响现有代码。

**预期效果：** 核心逻辑有测试保障，重构时 `npm test` 即可回归。

---

### Phase 7: 开发工具链

> 在开发模式下内置调试工具，包括性能监控、实体计数、空间网格可视化。

**步骤：**
- [x] 7.1 创建 `js/debug/` 目录
- [x] 7.2 创建性能监控器 `js/debug/performance.js`
  - FPS 计数器
  - 各系统耗时统计
  - draw call 计数
- [x] 7.3 创建实体监视器 `js/debug/entity_monitor.js`
  - 显示当前实体数量（敌人/投射物/粒子/掉落物）
  - 显示实体池使用率
- [x] 7.4 创建空间网格可视化 `js/debug/spatial_debug.js`
  - 绘制网格边界
  - 跟随摄像机位置
- [x] 7.5 创建调试面板 `js/debug/panel.js`
  - 集成所有调试工具
  - 按 F3 切换显示，F4 切换网格
- [x] 7.6 集成到游戏（main.js 绑定键盘，render/index.js 渲染）
- [x] 7.7 安装 ESLint + Prettier
  - 创建 `.eslintrc.cjs` 和 `.prettierrc`
  - 配置 `npm run lint` / `npm run format`

**风险：** 低。纯新增功能，不影响游戏逻辑。

**预期效果：** 开发时按 F3 即可看到完整的性能数据，优化有据可依。

---

### Phase 8: 数据驱动引擎（可选，高价值）

> 将武器、敌人、道具的数值配置 JSON 化，引入公式解析器，实现数据与逻辑分离。

**步骤：**
- [x] 8.1 设计公式 DSL
  - 支持：`effAtk * (0.55 + 0.12 * level) + speed * 0.12`
  - 公式解析器：`js/data/parser.js`
  - 支持 6 个内置函数：floor/ceil/round/abs/max/min
- [x] 8.2 将武器数据 JSON 化
  - `js/data/weapons.json` + `js/data/upgrade_cost.json`
  - 移除 `dmg` 函数，替换为 `formulaDmg` 公式字符串
  - `cd` 从函数转为常量，`pierce: -1` 表示无限穿透
  - `fire.count` 支持公式字符串
- [x] 8.3 将敌人数据 JSON 化
  - `js/data/enemies.json`
- [x] 8.4 将道具/祝福/Boss 数据 JSON 化
  - `js/data/items.json` — 元数据 JSON，`apply` 函数保持 JS 注册表
  - `js/data/blessings.json` — 同上
  - `js/data/bosses.json` — 纯数据
- [x] 8.5 更新 JS 加载器，从 JSON 加载数据
  - 武器/敌人/Boss 通过 JSON + 图标映射 + 公式解析器生成运行时对象
  - 道具/祝福通过 JSON 元数据 + apply 函数注册表合并
  - 所有图标键名统一为字符串，运行时由 ICON_MAP 解析为 SVG
- [x] 8.6 验证构建和测试通过
  - `npm run build` 零错误（TS 检查 + Vite 构建）
  - `npm test` 23 个测试全部通过
  - 开发服务器启动正常

**风险：** 高。替换 `dmg` 函数为公式解析器可能引入性能开销和精度差异。

---

## 执行顺序与依赖关系

```
Phase 1: Vite 构建系统
  └── Phase 2: CSS 工程化 (依赖 Vite)
       └── Phase 3: TypeScript (依赖 Vite)
            ├── Phase 4: UI 组件化 (依赖 TS 类型)
            ├── Phase 5: 渲染系统重构 (独立，可与 Phase 4 并行)
            ├── Phase 6: 测试基础设施 (依赖 Vite)
            └── Phase 7: 开发工具链 (依赖 Vite)
                 └── Phase 8: 数据驱动引擎 (依赖 TS 类型)
```

**并行执行策略：**
- Phase 4 (UI 组件化) 和 Phase 5 (渲染系统重构) 已并行执行完成
- Phase 6 (测试) 和 Phase 7 (工具链) 已并行执行完成
- Phase 8 (数据驱动) 依赖 Phase 3 (TS) 完成，尚未开始

---

## 时间线与里程碑

| 阶段 | 预计步数 | 核心交付物 | 可验证 | 状态 |
|------|---------|-----------|--------|------|
| Phase 1 | 6 | `npm run dev` 启动 | 浏览器打开游戏 | ✅ 完成 |
| Phase 2 | 5 | CSS 令牌系统 | 游戏样式不变 | ✅ 完成 |
| Phase 3 | 10 | TypeScript 编译通过 | `npm run build` 成功 | ✅ 完成 |
| Phase 4 | 5 | 组件化 UI | 所有 UI 功能正常 | ✅ 完成 |
| Phase 5 | 6 | 渲染管线 | 渲染效果不变 | ✅ 完成 |
| Phase 6 | 9 | 测试套件 | `npm test` 全绿 | ✅ 完成 |
| Phase 7 | 6 | 调试面板 F3 | 调试面板显示 | ✅ 完成 |
| Phase 8 | 6 | JSON 数据驱动 | 游戏玩法不变 | ✅ 完成 |

---

## 执行原则

1. **每步可运行** — 每完成一个步骤，游戏必须可运行
2. **每阶段可回滚** — 每个阶段完成后用 git commit 标记
3. **先基础设施，后业务逻辑** — 构建工具 → 类型系统 → 测试 → 重构
4. **不破坏向后兼容** — 重构期间不改变游戏玩法
5. **日志记录** — 每个步骤完成后更新本日志

---

## 日志

### 2026-08-02 — V2 计划制定 + Phase 1 完成

- 完成项目全面审查
- 制定 8 阶段重构计划
- 等待用户确认后开始实施

### 2026-08-03 — Phase 1 完成：Vite 构建系统

- [x] 1.1 初始化 `package.json`
- [x] 1.2 安装 Vite（v8.2.0）
- [x] 1.3 创建 `vite.config.js`（端口 3000，自动打开，CSS sourcemap）
- [x] 1.4 验证 `npm run dev` 正常（HTTP 200，HMR 注入）
- [x] 1.5 验证 `npm run build` 正常（89 模块，JS 130KB，CSS 41KB）
- [x] 1.6 清理 `?v=45` 缓存参数（8 CSS + 1 JS 全部移除）
- [x] 创建 `.gitignore`（排除 node_modules/ dist/ *.tmp）

### 2026-08-03 — Phase 2 完成：CSS 工程化

- [x] 2.1 安装 PostCSS 插件（autoprefixer, cssnano）
- [x] 2.2 创建 `postcss.config.js`
- [x] 2.3 建立 CSS 设计令牌系统（`css/tokens.css`）
  - 从各 CSS 文件中提取共享变量（颜色、字体、间距、圆角）
  - 统一 `--gold`, `--moon`, `--ice`, `--fire` 等语义色
- [x] 2.4 验证设计令牌覆盖所有 CSS 文件
- [x] 2.5 验证构建后 CSS 压缩正常

### 2026-08-03 — Phase 3 完成：TypeScript 渐进式迁移

- [x] 3.1 安装 TypeScript + 相关依赖
- [x] 3.2 创建 `tsconfig.json`（`allowJs: true`, `checkJs: true`, `strict: true`）
- [x] 3.3 创建核心类型定义文件 `js/types/core.d.ts`
- [x] 3.4 创建游戏数据类型定义 `js/types/data.d.ts`
- [x] 3.5 将数据文件添加 `// @ts-check` 并修复类型错误
- [x] 3.6 将系统文件添加 `// @ts-check` 并修复
- [x] 3.7 将核心文件添加 `// @ts-check` 并修复
- [x] 3.8 将渲染文件添加 `// @ts-check` 并修复
- [x] 3.9 将 UI 文件添加 `// @ts-check` 并修复
- [x] 3.10 在 `npm run build` 中添加 TypeScript 检查
- [x] 修复剩余类型错误：entity_pool.js 索引签名、effects.js 颜色类型、entities.js 参数类型、CombatSystem.js 类型守卫
- [x] 最终验证：`npx tsc --noEmit` 零错误通过

### 2026-08-03 — Phase 4 完成：UI 组件化重构

- [x] 4.1 创建组件基类 `js/ui/component.js`（render/mount/update/destroy 生命周期）
- [x] 4.2 创建 4 个独立组件：LevelUpPanel、ResultPanel、PausePanel、GateScreen
- [x] 4.3 创建组件注册表 `js/ui/registry.js`（mount/unmount API）
- [x] 4.4 重构 `js/ui.js` 为组件调度器，移除直接 DOM 操作
- [x] 4.5 验证：`npm run build` 零错误通过

### 2026-08-03 — Phase 5 完成：渲染系统重构

- [x] 5.1 创建 `js/render/layers/` 目录
- [x] 5.2 按敌人类型拆分为独立渲染模块
  - `js/render/layers/enemies.js` — 敌人造型注册表（ENEMY_SHAPES + drawEnemyBody）
  - `js/render/layers/bosses.js` — Boss 造型注册表（BOSS_SHAPES + drawBossBody）
- [x] 5.3 重构 `render/entities.js`：移除重复的 ENEMY_SHAPES/BOSS_SHAPES 定义，改为从 layers/ 导入
- [x] 5.4 更新 `render/index.js` 的再导出路径：`./entities.js` → `./layers/enemies.js` + `./layers/bosses.js`
- [x] 5.5 验证：`npm run build` 零错误通过（TS 检查 + Vite 构建），渲染效果不变

### 2026-08-03 — Phase 6 完成：测试基础设施

- [x] 6.1 安装 Vitest（v4.1.10）
- [x] 6.2 创建 `vitest.config.js`（与 Vite 共享配置）
- [x] 6.3 创建测试目录 `js/__tests__/`
- [x] 6.4 为核心战斗系统编写测试：`js/__tests__/combat.test.js`
  - 伤害计算、暴击、低血量加成、0 伤害边界
  - 使用 `vi.mock` 模拟 RNG 和模块依赖
- [x] 6.5 为空间哈希网格编写测试：`js/__tests__/spatial.test.js`
  - 邻居查询、范围查询、死实体跳过、最近邻
  - 使用 `vi.hoisted` 模拟 G 对象
- [x] 6.6 为实体池编写测试：`js/__tests__/entity_pool.test.js`
  - 添加、压缩、重置、字段读写、复用索引
  - 9 个测试覆盖所有核心功能
- [x] 6.7 在 `npm test` 中集成 Vitest
- [x] 最终验证：`npm test` 23 个测试全部通过

### 2026-08-03 — Phase 7 完成：开发工具链

- [x] 7.1 创建 `js/debug/` 目录
- [x] 7.2 创建性能监控器 `js/debug/performance.js`
  - FPSCounter（FPS 计数器，颜色编码）
  - SystemProfiler（各系统耗时统计）
  - DrawCallCounter（draw call 计数）
- [x] 7.3 创建实体监视器 `js/debug/entity_monitor.js`
  - 显示当前实体数量（敌人/投射物/粒子/掉落物/残像）
- [x] 7.4 创建空间网格可视化 `js/debug/spatial_debug.js`
  - 绘制网格边界，跟随摄像机
- [x] 7.5 创建调试面板 `js/debug/panel.js`
  - 集成所有调试工具
  - 按 F3 切换显示，F4 切换网格
- [x] 7.6 集成调试面板到游戏
  - `main.js` 调用 `bindDebugKeys()`
  - `render/index.js` 调用 `renderDebug()` 和 `renderSpatialDebug()`
- [x] 7.7 安装 ESLint + Prettier
  - 创建 `.eslintrc.cjs` 和 `.prettierrc`
  - 配置 `npm run lint` / `npm run format`
- [x] 最终验证：`npm run build` 零错误通过

### 2026-08-03 — Phase 8 完成：数据驱动引擎

- [x] 8.1 创建公式解析器 `js/data/parser.js`
  - 递归下降解析器，支持 + - * / ( ) 和 6 个内置函数
  - `evalFormula(formula, context)` 接口
- [x] 8.2 创建 `js/data/weapons.json` + `js/data/upgrade_cost.json`
  - 12 把武器的 `dmg` 函数全部替换为 `formulaDmg` 公式字符串
  - `cd` 从函数转为常量，`pierce: -1` 表示无限穿透
  - `fire.count` 支持公式字符串（如 `"1 + floor(projCount * 0.5)"`）
- [x] 8.3 创建 `js/data/enemies.json`（10 种敌人纯数据）
- [x] 8.4 创建 `js/data/items.json`（48 个道具）、`js/data/blessings.json`（18 种祝福）、`js/data/bosses.json`（10 个 Boss）
  - 道具/祝福的 `apply` 函数保持 JS 注册表模式
- [x] 8.5 更新所有 JS 加载器
  - `weapons.js` / `enemies.js` / `bosses.js` — JSON + 图标映射
  - `items.js` / `blessings.js` — JSON 元数据 + apply 函数注册表
  - `patterns.js` — 支持公式字符串的 `count` 解析
  - 类型定义更新：`formulaDmg` 字段、`fire.count` 支持 string
- [x] 8.6 最终验证
  - `npm run build` 零错误通过（TS 检查 + Vite 构建）
  - `npm test` 23 个测试全部通过
  - 开发服务器启动正常