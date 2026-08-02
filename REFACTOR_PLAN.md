# 蚀月远征 · 重构计划 & 日志 V3

> 目标：在 V2（工具链 + 数据驱动）基础上，重塑核心架构的优雅性。
> 核心哲学：**真正的 ECS** 替代伪 ECS，**依赖注入**消除全局 G 依赖，**策略模式**消除条件爆炸。

---

## 当前架构总览（V3 重构前）

| 指标 | 数据 |
|------|------|
| 架构模式 | 伪 ECS — 有 System 基类但所有系统直接读写 `G` 全局对象 |
| 核心问题 | `G` 是 God Object，系统间通过 `G` 隐式耦合 |
| 渲染层 | 直接访问 `EntityPool._data` 等私有字段 |
| 武器系统 | 管线架构良好，但 `createProjectile` 有巨大条件展开 |
| 最大文件 | `ui/shop.js` (494行), `render/effects.js` (356行) |

---

## V3 重构计划（5 个 Phase）✅ 全部完成

### Phase 1: 核心基础设施 — ECS World + 依赖注入 ✅

> 创建真正的 ECS World 类，改造 System/SystemManager 实现依赖注入，为消除 G 依赖奠定基础。

**步骤：**
- [x] 1.1 创建 `js/ecs/World.js` — ECS World 类
  - 封装所有 EntityPool，提供 `add()`, `query()`, `compact()` API
  - 统一管理实体生命周期
- [x] 1.2 改造 `System` 基类 — 支持依赖注入
  - 构造函数接收 `(world, eventBus, config)`
  - 提供 `this.world`, `this.eventBus`, `this.config` 属性
- [x] 1.3 改造 `SystemManager` — 依赖注入容器
  - 创建 World 实例
  - 在 `add()` 时自动注入依赖
- [x] 1.4 验证：`npm run build` 零错误，`npm test` 全绿

**风险：** 中。新增基础设施不改变现有代码，但需要确保所有系统正确接收依赖。

---

### Phase 2: 武器系统简化 — 策略模式注册表 ✅

> 用策略注册表替代 `createProjectile` 中的条件爆炸，用类型注册表替代 `pipeline.js` 的手工分派链。

**步骤：**
- [x] 2.1 创建 `PROJECTILE_TYPE_REGISTRY` — 投射物类型策略注册表
  - 每种类型定义：`movement`, `hit`, `onHit`, `defaults`
  - 替代 `createProjectile` 中的 8 个条件展开
- [x] 2.2 简化 `pipeline.js` — 用注册表替代 if-else 链
  - `getMoveType()`, `getHitType()`, `getOnHitEffects()` 从注册表读取
- [x] 2.3 验证：`npm run build` 零错误

**风险：** 低。纯重构，不改变行为。

---

### Phase 3: 系统迁移 — 消除 G 全局依赖 ✅

> 逐个将系统从直接读写 `G` 改为通过 `World` + 依赖注入操作。

**步骤：**
- [x] 3.1 迁移简单系统（StageTimerSystem, BossCheckSystem, SpatialSystem）
- [x] 3.2 迁移中等系统（DropSystem, ParticleSystem, OrbitSystem）
- [x] 3.3 迁移复杂系统（EnemySystem, SpawnSystem, ProjectileSystem）
- [x] 3.4 迁移 CombatSystem（事件驱动，复杂副作用）
- [x] 3.5 迁移 PlayerSystem（最复杂系统）
- [x] 3.6 更新 `game.js` 入口 — 使用新的 SystemManager
- [x] 3.7 验证：`npm run build` 零错误，`npm test` 全绿

**风险：** 高。每个系统迁移后需要确保游戏逻辑不变。

---

### Phase 4: 渲染与逻辑分离 ✅

> 渲染层通过纯数据接口获取内容，不再直接接触 EntityPool 内部实现。

**步骤：**
- [x] 4.1 创建渲染数据接口定义（`RenderContext`）
- [x] 4.2 重构渲染函数，通过参数接收数据
- [x] 4.3 更新 `render/index.js` 调度
- [x] 4.4 验证：`npm run build` 零错误

**风险：** 中。渲染是视觉核心，需要确保视觉效果不变。

---

### Phase 5: 大文件拆分 ✅

> 拆分超过 200 行的大文件为聚焦的模块。

**步骤：**
- [x] 5.1 拆分 `ui/shop.js` (494行) → `ui/shop/` 目录
  - `open_shop.js` — 集市打开与卡牌渲染
  - `panel.js` — 守月人铭牌面板
  - `formulas.js` — 武器公式与投射物数量计算
  - `weapon_detail.js` — 武器详情与出售
  - `item_detail.js` — 道具详情
  - `index.js` — 统一导出
  - `shop.js` 降级为纯重导出入口
- [x] 5.2 拆分 `render/effects.js` (356行) → `render/effects/` 目录
  - `projectiles.js` — 投射物渲染
  - `drops.js` — 掉落物渲染
  - `orbit.js` — 轨道物渲染
  - `particles.js` — 粒子渲染
  - `index.js` — 统一导出
- [x] 5.3 验证：`npm run build` 零错误，游戏功能完整

**风险：** 低。纯搬移 + 引用更新。

---

## 执行原则

1. **每步可运行** — 每完成一个步骤，游戏必须可运行
2. **每步可回滚** — 每步后 git commit
3. **先基础设施，后业务逻辑** — 先建好 ECS World + DI，再迁移系统
4. **不破坏向后兼容** — 重构期间不改变游戏玩法
5. **日志记录** — 每个步骤完成后更新本日志

---

## 日志

### 2026-08-02 — V3 计划制定 + 基线建立

- [x] 初始化 git 仓库
- [x] 创建初始基线提交（V2 重构完成状态）
- [x] 制定 V3 重构计划（5 个 Phase）

### 2026-08-03 — Phase 1~4 完成 + Phase 5 收尾

- [x] **Phase 1 完成**：创建 `World.js`，改造 `System`/`SystemManager` 支持依赖注入
- [x] **Phase 2 完成**：创建 `PROJECTILE_TYPE_REGISTRY` 策略注册表，简化 `pipeline.js`
- [x] **Phase 3 完成**：逐个迁移所有系统到 `World` + 依赖注入模式，消除 `G` 直接依赖
- [x] **Phase 4 完成**：创建 `RenderContext`，渲染层通过纯数据接口获取内容
- [x] **Phase 5.2 完成**：拆分 `render/effects.js` → `render/effects/` 目录（5 个子模块）
- [x] **Phase 5.1 完成**：拆分 `ui/shop.js` → `ui/shop/` 目录（6 个子模块），`shop.js` 降级为纯重导出入口
- [x] 验证：`npm run build` 零错误，生产构建成功

### 变更总结

| 指标 | 重构前 | 重构后 |
|------|--------|--------|
| 架构模式 | 伪 ECS — 系统直接读写 `G` | 真 ECS — `World` + 依赖注入 |
| 最大文件 | `ui/shop.js` (494行) | `render/entities.js` (~200行) |
| 渲染层耦合 | 直接访问 `EntityPool._data` | 通过 `RenderContext` 纯数据接口 |
| 武器系统 | `createProjectile` 8 个条件展开 | 策略注册表，一行配置 |
| 文件总数 | ~60 JS 文件 | ~75 JS 文件（更聚焦的模块） |