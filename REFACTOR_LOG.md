# 蚀月远征 · 重构计划 & 日志

> 目标：通过 5 个阶段的大规模重构，提升代码质量、可维护性和扩展性。
> 核心哲学：**可组合行为管线** 替代硬编码，**ECS 架构** 统一游戏循环，**领域切片** 管理状态。

---

## 现状总览（重构前）

| 指标 | 数据 |
|------|------|
| 总文件数 | ~60 JS 文件 + 8 CSS 文件 |
| 最大文件 | `render/entities.js` (522行), `systems/CombatSystem.js` (197行) |
| 架构模式 | ECS 架构 + 领域切片状态 + 可组合武器管线 |
| 导入图 | DAG（有向无环图），无循环依赖 |
| 状态管理 | 6 个领域切片 + `G` 聚合层 |
| 武器系统 | 可组合行为管线（5 个模块：瞄准/模式/运动/碰撞/命中） |

---

## Phase 1: 武器可组合行为管线 ✅（基本完成，遗留修复）

> 将武器行为从硬编码函数拆解为可组合的模块，武器定义 = 数据 + 行为模块组合。

### 步骤

- [x] 1.1 创建行为模块注册表
  - `js/weapons/targeting.js` — 瞄准策略（nearest, random, denseArea, none）
  - `js/weapons/patterns.js` — 发射模式（single, spread, volley, nova, burst）
  - `js/weapons/movement.js` — 投射物运动（linear, homing, boomerang, stationary）
  - `js/weapons/hit_detection.js` — 碰撞检测（point, radius, beam, aoe）
  - `js/weapons/on_hit.js` — 命中效果（damage, slow, explosion, chain）
- [x] 1.2 创建管线执行器 `js/weapons/pipeline.js`
- [x] 1.3 重构武器数据定义 `js/data/weapons.js`
- [x] 1.4 拆分 `weapons/index.js` 为独立模块文件
- [x] 1.5 修复弧光引雷（arc）连锁闪电未正确触发的 bug
  - 问题：`fire` 配置中 `chain:3` 导致仅命中 3 个敌人（初始+2链），但描述"连锁3次"应命中 4 个（初始+3链）
  - 修复：将 `projectile.chain` 从 `3` 改为 `4`，移除 fire 层冗余的 `chain/chainFall/chainRange` 属性
- [x] 1.6 清除 `WEAPON_FIRE_LEGACY` 空注册表及冗余注释
  - 经搜索确认，代码库中已无 `WEAPON_FIRE_LEGACY` 引用

### 预期效果

- 新武器 = 组合现有模块，几行数据定义
- 新行为模块 = 一次编写，所有武器可用
- 所有武器统一使用管线，消除遗留代码

---

## Phase 2: 状态管理 — 拆分 `G` 为领域切片

> 将 `G` 平面对象拆分为独立的领域切片，每个切片管理自己的状态变更。

### 详细步骤

- [x] 2.1 创建 `js/state/` 目录结构
  - `js/state.js` — 统一导出，聚合所有切片为 `G`（实际实现，等同计划中的 `state/index.js`）
  - `js/state/player.js` — 玩家状态切片
    - 迁移：`G.player`, `G.weaponCd`, `G.weaponCdFull`
  - `js/state/stage.js` — 关卡状态切片
    - 迁移：`G.stage`, `G.stageTime`, `G.stageMax`, `G.stageName`, `G.time`, `G.spawnAcc`, `G.boss`, `G.depth`, `G.curse`, `G.unlocked`, `G.paused`
  - `js/state/stats.js` — 战斗统计切片
    - 迁移：`G.kills`, `G.gold`, `G.xp`, `G.xpNeeded`, `G.level`, `G.levelQueue`, `G.runStats`
  - `js/state/render.js` — 渲染状态切片
    - 迁移：`G.shake`, `G.hitFlash`, `G.timestopTimer`, `G.width`, `G.height`, `G.canvas`, `G.ctx`, `G.ctxBg`
  - `js/state/input.js` — 输入状态切片
    - 迁移：`G.keys`
  - `js/state/entities.js` — 实体列表切片
    - 迁移：`G.enemies`, `G.projectiles`, `G.drops`, `G.particles`, `G.phantoms`
- [x] 2.2 逐步迁移 `G.*` 引用到对应切片
  - `state.js` 通过 `...playerState` 等展开运算符聚合所有切片
  - 保留 `G` 作为向后兼容的聚合层，所有 `import { G } from '../state.js'` 继续有效
  - 新代码可直接导入特定切片（如 `import { playerState } from '../state/player.js'`）
- [x] 2.3 验证所有模块导入正确
  - 手动验证全部 8 个导入 `combat.js` 的模块、3 个导入 `spawn.js` 的模块、5 个导入 `player_fn.js` 的模块路径正确

### 迁移策略

- 每个切片文件独立管理自己领域的默认值
- `state/index.js` 将各切片合并为 `G` 对象
- 现有模块通过 `G.*` 访问，不需修改任何引用
- 新增模块可直接导入需要的切片，减少依赖

### 预期效果

- 状态变更可追踪
- 依赖关系清晰（模块只导入需要的切片）
- 为未来引入响应式状态打好基础

---

## Phase 3: 完成 ECS 迁移 — 消灭上帝模块

> 将剩余的全局模块（combat.js, player_fn.js, spawn.js, enemies.js）拆分为 System。

### 详细步骤

- [x] 3.1 拆分 `combat.js` (182行)
  - 创建 `js/systems/CombatSystem.js` — 集中管理战斗相关逻辑
    - `calcDamage()` — 纯函数伤害计算
    - `damageEnemy()` — 对敌伤害 + 连锁效果（暴击爆裂、溅射、吸血等）
    - `killEnemy()` — 击杀处理 + 掉落生成 + Boss 结算
    - `hurtPlayer()` — 玩家受伤（闪避、护盾、守月之约、濒死月魄）
    - `healPlayer()` — 治疗
    - `meleeHit()` — 近战打击
    - `spawnDrop()` — 掉落物生成
    - `boomExplosion()` — 爆裂之核
  - 遗留 `combat.js` 作为重导出入口（向后兼容）
- [x] 3.2 迁移 `player_fn.js` 到 `PlayerSystem`
  - `createPlayer()` → `PlayerSystem.createPlayer()`
  - `computeDerived()` → `PlayerSystem.computeDerived()`
  - `addWeapon()` / `upgradeWeapon()` / `removeWeapon()` → `PlayerSystem` 方法
  - `addGold()` / `gainXp()` → `PlayerSystem` 方法
  - 遗留 `player_fn.js` 作为重导出入口
- [x] 3.3 迁移 `spawn.js` 到 `SpawnSystem`
  - `spawnEnemy()` → `SpawnSystem.spawnEnemy()`
  - `spawnBoss()` → `SpawnSystem.spawnBoss()`
  - `spawnEnemyProjectile()` → `SpawnSystem.spawnEnemyProjectile()`
  - 遗留 `spawn.js` 作为重导出入口
- [x] 3.4 精简 `enemies.js` 为纯重导出入口
  - 将 `enemyTick()` 函数实现迁移至 `systems/EnemySystem.js`
  - `enemies.js` 现为纯重导出：仅保留 `export { ... } from '...'` 语句
  - 消除了 `enemies.js` → `combat.js` → `CombatSystem.js` 的隐性依赖
- [x] 3.5 更新 `systems/index.js` 注册顺序
  - 确保 CombatSystem 在 PlayerSystem 之后注册
  - 注册顺序：BossCheck → Player → Combat → Spawn → Spatial → Projectile → Drop → Enemy → Orbit → Particle → StageTimer

### 依赖关系

```
systems/index.js
  ├── BossCheckSystem
  ├── PlayerSystem (player_fn.js 迁入)
  ├── SpawnSystem (spawn.js 迁入)
  ├── SpatialSystem
  ├── ProjectileSystem
  ├── DropSystem
  ├── EnemySystem
  ├── CombatSystem (combat.js 迁入)
  ├── OrbitSystem
  ├── ParticleSystem
  └── StageTimerSystem
```

---

## Phase 4: 解耦导入图 — 消除循环依赖 ✅（已被 Phase 3 解决）

> 通过 ECS 迁移（Phase 3）已将原有循环依赖切断，无需额外 EventBus 解耦。

### 分析结论

原有的循环依赖已被 ECS 架构自然消除：

| 原循环路径 | 当前状态 | 说明 |
|-----------|---------|------|
| `weapons → enemies → combat → weapons` | ✅ 已切断 | `combat.js` 为纯重导出 → `CombatSystem`，`CombatSystem` 不导入任何武器模块 |
| `combat → spawn → enemies → combat` | ✅ 已切断 | `CombatSystem` → `spawn.js`(重导出) → `SpawnSystem`，`SpawnSystem` 不导入任何战斗模块 |

### 当前导入图状态

- `enemies.js` 为纯重导出（无实现），仅作为向后兼容的便利入口
- 所有 `weapons/*.js` 通过 `enemies.js` → `combat.js` → `CombatSystem.js` 调用战斗逻辑，无回路
- 所有 System 类之间通过 `systems/index.js` 调度，无直接交叉依赖
- 鉴于此，**EventBus 解耦不再必要**，直接函数调用更为简洁高效

### 预期效果

- 导入图 DAG（有向无环图）
- 模块可独立测试
- 新增功能不破坏现有依赖

---

## Phase 5: Entity-Component 模式 ✅

> 将松散实体规范化为组件组合，使用轻量级工厂函数。

### 详细步骤

- [x] 5.1 定义组件类型
  - `js/ecs/components.js` — 组件定义工厂函数
    - `Position(x, y)` — 位置
    - `Health(hp, maxHp)` — 生命值
    - `Renderable(color, size, shape?)` — 渲染属性
    - `Velocity(vx, vy)` — 速度
    - `Combat(dmg, pierce?, crit?)` — 战斗属性
    - `Timer(t, life?)` — 计时器
    - `Status(slow?, stun?, bleed?, flash?)` — 状态效果
    - `Enemy(type, boss)` — 敌方标记
    - `Projectile(wId, range, speed, radius?)` — 投射物标记
    - `createEntity(...components)` — 辅助函数，合并组件为平面对象
- [x] 5.2 重构实体创建函数
  - 更新 `SpawnSystem.js`：`spawnEnemy`, `spawnBoss`, `spawnEnemyProjectile`
  - 更新 `weapons/patterns.js`：`createProjectile`, `phantom`
  - 更新 `CombatSystem.js`：`spawnDrop`
  - 实体 = 组件组合：`createEntity(Position, Health, Renderable, Combat, ...)`
- [ ] 5.3 优化 EntityPool（后续可选）
  - 当前 EntityPool 的 TypedArray 存储与组件系统兼容
  - 组件工厂返回的平面对象可直接传入 `addWith()`
  - 按组件类型批量处理可作为未来优化方向

### 预期效果

- 实体组成一目了然
- 新增组件类型不影响现有实体
- 批量处理（如渲染）可跳过不需要的组件

---

## 阶段日志

### 2026-08-02 — 项目启动

- 完成代码库全面审查（60+ JS 文件）
- 制定 5 阶段重构计划
- 完成 Phase 1 大部分工作：创建行为模块、管线执行器、更新武器数据

### 2026-08-03 — Phase 1 收尾 + Phase 2 完成 + Phase 3 完成 + Phase 4 分析

- [x] **Phase 1 收尾**：
  - 修复弧光引雷连锁计数（`chain:3` → `chain:4`），移除 fire 层冗余属性
  - 确认 `WEAPON_FIRE_LEGACY` 已清理
- [x] **Phase 2 完成**：
  - 创建 6 个状态切片文件（`player.js`, `stage.js`, `stats.js`, `render.js`, `input.js`, `entities.js`）
  - `state.js` 聚合所有切片为 `G` 对象，向后兼容
  - 验证所有 16 个模块的导入路径正确
- [x] **Phase 3 完成**：
  - `combat.js` → `CombatSystem`（重导出代理）
  - `player_fn.js` → `PlayerSystem`（重导出代理）
  - `spawn.js` → `SpawnSystem`（重导出代理）
  - `enemies.js` 精简为纯重导出（`enemyTick` 迁移至 `EnemySystem`）
  - `systems/index.js` 注册顺序已优化
- [x] **Phase 4 分析**：确认循环依赖已被 Phase 3 自然消除，无需 EventBus 解耦
- [x] **Phase 5 完成**：
  - 创建 `js/ecs/components.js`（9 个组件工厂 + `createEntity` 辅助函数）
  - 更新 `SpawnSystem.js`、`weapons/patterns.js`、`CombatSystem.js` 使用组件组合
  - EntityPool 5.3 保留为未来优化方向

---

## 执行原则

1. **每阶段多次提交** — 每个功能步骤完成后 git commit
2. **保持向后兼容** — 重构期间不破坏现有功能，随时可运行
3. **先拆后改** — 先拆分文件/模块，再修改内部逻辑
4. **日志记录** — 每个阶段完成后更新本日志
5. **可回滚** — 每步可独立回滚