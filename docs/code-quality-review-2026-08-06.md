# 蚀月远征 · 代码坏味道彻查与修复报告

> 日期：2026-08-06 · 分支：`refactor/code-quality`（未提交，待 review）
> 范围：`src/` 全部 191 个 TypeScript 文件

---

## 一、审计方法

1. **量化扫描**：grep 统计颜色硬编码、事件名字符串、π 字面量、`as any`、数字字面量密度
2. **深度审计**：派探索代理做 very-thorough 级全库检索（重复代码块、硬编码 ID、长函数、死代码）
3. **性价比决策**：每种坏味道按「出现频率 × 修复成本 × 框架收益」决定建框架还是直接修

---

## 二、审计发现总览

| 坏味道 | 规模 | 决策 |
|---|---|---|
| 颜色硬编码 | **445 处**（非测试 421），调色板仅 14 文件引用 | 🏗️ 建框架（扩展现有 PALETTE） |
| 事件名裸字符串 | ~80 处 / 29 种（combat.ts 一处就 56 次 emit） | 🏗️ 建框架（EVENTS 常量表） |
| π 字面量 | 40+ 处，`6.28`/`6.2832`/`1.57`/`1.5708` 四种写法 | 🏗️ 建框架（TAU/HALF_PI） |
| 月相效果 | 8 个 case + 9 个 if 还原，数值与描述分离 | 🏗️ 建框架（数据表驱动） |
| 计时器递减+重置 | 全库约 30 处手写 | 🛠️ 直接修（tickCooldown） |
| 机制魔法数字 | combat.ts 304 / effects.ts 176 / boss_skills.ts 599 | 🛠️ 直接修（具名常量） |
| 重复代码 | pipeline 三连 AOE 逐行同构（~90 行） | 🛠️ 直接修（配置表合并） |
| 重复代码 | combat 暴击溅射 / 破晓溅射同构 | 🛠️ 直接修（aoeSplash） |
| 死代码 | phantomTick 双实现且无调用方 | 🛠️ 直接修（删除） |
| as any | ~30 处（部分合理） | 🛠️ 选择性修（收窄可消除的） |

---

## 三、建框架决策（性价比分析）

### 🏗️ 1. EVENTS 事件名常量表 —— `src/engine/core/events.ts`（新文件）

**为什么建框架**：事件总线是核心通信设施，拼错一个字母就**静默失败**（无订阅者即无响应），29 种事件名散落 40+ 文件。常量表让拼写错误在编译期暴露，支持 IDE 跳转/重命名，形成单一事实来源。

**结果**：29 个常量 + `GameEventName` 联合类型，替换 109 处硬编码。

### 🏗️ 2. 调色板扩展 —— `src/assets/palette.ts`

**为什么建框架**：PALETTE 框架已存在但未被采纳（19 色仅 14 文件引用）。扩展至 48 色并全量替换后，改一个色相只改一处，杜绝 `#e9c987` 与 `#e9c987` 变体肉眼难辨的问题。

**关键决策**：**只收 ≥3 次引用的颜色**（29 个新色），1–2 次的一次性装饰色保留字面量——防止调色板膨胀成 80+ 色的"颜色仓库"，反而失焦。

**结果**：替换 365 处；剩余 ~56 处为低频一次性色（有语义上下文，硬编码更可读）。

### 🏗️ 3. 数学常量 —— `src/engine/util/utils.ts`

**为什么建框架**：2π 在 17 个文件里四种写法（`6.28`/`6.2832`/`1.57`/`1.5708`），且与 `Math.PI*2` 混用。统一为 `TAU`/`HALF_PI` 消除精度歧义。

### 🏗️ 4. 月相效果数据表 —— `src/config/moon_phase.ts`

**为什么建框架**：效果数值（`effects.ts` 8 个 case）与效果描述（`MOON_EFFECT_DESCS`）分居两文件且极易不同步。数据表 `MOON_EFFECTS` 将 8 相效果集中为**单一事实来源**，apply/revert 用通用循环驱动。

**结果**：8 case + 9 if → 数据表 + 25 行通用逻辑（-40 行），新增月相只需改一行数据。

---

## 四、直接修清单

### `src/domain/combat.ts`
- **20+ 机制常量具名**：`CRIT_CAP`(0.9)、`LOW_HP_DMG_THRESHOLD`(0.3)、`MOON_CRIT_BONUS`(1.5)、`ARMOR_REDUCTION`(0.8)、`NEAR_DEATH_THRESHOLD`(0.25)、`MOON_WANE_SHIELD_CAP`(30)、`MOON_WANE_SHIELD_RATE`(0.12)、`HUNT_MAX_STACKS`(8) 等
- **溅射合并**：critBoom / splash 两段同构的 `queryRadius + 比例伤害 + 追踪 + 击杀` 抽为 `aoeSplash(e, radius, dmg, ratio, p, itemId, killSrc)`
- **as any 清理**：`(e as any).type/x/y` → `in` 操作符类型收窄（`'type' in e ? e.type ?? '' : ''`）

### `src/domain/effects.ts`
- **月相数据驱动**：`applyMoonEffects` / `revertMoonEffects` 改读 `MOON_EFFECTS` 表
- **计时器收敛**：starfall / achJudge / echoSlow / moonFullT 4 处 → `tickCooldown`
- **as any 清理**：`(p.effects as any)[key]` → `Record<string, unknown>` 视图

### `src/domain/player.ts`
- 4 个常量：`CRIT_CAP`、`CRIT_ATKSPD_BONUS`(0.3)、`PLAYER_RADIUS`(16)、`MIN_GOLD_RATE`(0.1)

### `src/domain/weapons/pipeline.ts`
- **三连 AOE 合并**：`tickTide`/`tickMeteor`/`tickJudge`（逐行同构 ~90 行）→ `tickAoeDelay(pr, dt, p, cfg)` + 3 个配置表（~60 行，-30 行）
- `AOE_CENTER_DMG`(1.4)、`FALL_PARTICLE_CHANCE`(0.6) 具名

### `src/domain/weapons/phantom.ts`（删除）
- `phantomTick` 与 `systems/OrbitSystem.ts` 重复实现，且**无任何调用方**（死代码），连同 `index.ts` 死导出删除

### `src/engine/util/utils.ts` + 17 文件
- 新增 `TAU`/`HALF_PI`/`tickCooldown`，替换全部 π 字面量

---

## 五、验证结果

```
✔ typecheck（tsc --noEmit）
✔ arch（13 层分层依赖检查，0 违规）
✔ check-only（无 .only 泄漏）
✔ coverage（417 测试全绿，覆盖率门禁全部过线）
```

| 指标 | 修复前 | 修复后 |
|---|---|---|
| 测试数 | 411 | **417**（+6：TAU/HALF_PI/tickCooldown） |
| 事件名硬编码 | ~80 处 | **0** |
| 颜色硬编码 | 445 处 | ~56 处（仅低频一次性色） |
| π 字面量 | 40+ 处 | **0** |

**覆盖率门禁教训**：新增 `tickCooldown` 后 `utils.ts` branches 掉到 50%（< 73% 阈值），补测「未到点/首调用/到点重置/周期性触发」4 个分支用例后过线——新代码必须同步补测试。

---

## 六、遗留建议（低性价比，未做）

| 项目 | 位置 | 说明 |
|---|---|---|
| testOf/bestOf 重复 switch | `systems/AchievementSystem.ts` | 两个近同构 switch，合并需引入度量 key 映射，且该文件有覆盖率门槛，收益/风险比一般 |
| weaponFire 回声递归 | `domain/weapons/index.ts:65` | `weaponFire(w)` 递归调用，若 `p.echo` 达 1 有栈溢出风险（当前 BASE_STATS echo:0，道具上限低，实际不可达） |
| 图鉴总数魔法数字 | `systems/AchievementSystem.ts:148` | `enemies=10/bosses=16/weapons=12/items=49` 硬编码，应随 config 数据源派生 |
| Boss 技能特效参数 | `domain/enemies/boss_skills.ts` | 599 个数字大部分为特效参数（count/speed/radius），具名收益低 |
| as any 合理保留 | 多处 | JSON 数据导入、bench 注入、泛型桥接等属合理用途 |

---

## 七、执行记录

- 改动 **60 个文件**（新建 1：events.ts；删除 1：phantom.ts；修改 58）
- 分支 `refactor/code-quality` 已创建，**未提交**，待用户 review
- 一次性迁移脚本（颜色/事件/π 替换）已完成使命并清理
