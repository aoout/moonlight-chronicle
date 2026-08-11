# Bug 深度排查与修复报告 · 2026-08-11

排查范围：全仓 218 个 TS 文件，含核心引擎、领域层、命令层、敌人/Boss、渲染层、输入层与存档链路。已修复 17 处缺陷（含 1 处被测试锁定的已知生产缺陷），新增回归测试 12 个。

## 验证结果

- `npm run verify` 全绿：**599 tests 通过**（此前 587，+12 新增），typecheck / arch / check-only 全部通过
- 覆盖率：Statements 39.75% / Branches 30.44% / Functions 34.44% / Lines 39.87%，全部高于阈值门禁
- `vite build` 通过（补装缺失依赖 `vite-plugin-compression2`，lock 已有声明，非代码问题）
- 美术硬约束满足：`css/`、`index.html`、`favicon.svg` 字节级零改动

## 修复清单（按严重度）

### 高严重度（玩法/数据级缺陷）

| # | 位置 | 现象 | 修复 |
|---|------|------|------|
| 1 | `domain/combat.ts` | **oath 守月之约免伤后未 early return**（此前被测试「现状锁定」）：触发时仍飘 "-0" 伤害字、播放受击音效，且函数尾部的 `p.invuln = 0.45` 覆盖了保命设定的 1s 无敌 | oath 分支加 `return`，更新锁定测试期望为 ≥1s 无敌 |
| 2 | `domain/weapons/movement.ts` + `enemies/boss_skills.ts` + `enemies/behaviors/charger.ts` | **敌方地面封锁技能（蚀痕/落雷/战车蚀痕/冲撞震地）缺 `enemy: true`，且 `explodeGround` 无条件打敌人** → 对玩家的走位封锁完全失效，持续误伤己方小怪 | 4 处创建补 `enemy: true`；`explodeGround` 按敌我分派：敌方落点 hurtPlayer，玩家落点才 damageEnemy |
| 3 | `commands/run.ts` + `infra/persistence/save.ts` | **月契经济生命周期泄漏**：`startRun` 不重置 fortuneState（页内重开，上一局月契与强化印记带入新局）；存档不保存、续局不恢复（追忆月痕丢月契） | 开局重置；`saveRun` 增加 `fortune` 字段；`resumeRun` 恢复（旧档无字段回退初始，兼容 v1） |
| 4 | `domain/weapons/projectile_types.ts` | **aoe 类型弹 pierce 被 patterns 归一为 0** → 霜华之环命中第一个敌人即被穿透判死，群伤武器退化为单体 | aoe `createFlags` 显式置 `pierce: Infinity`（持续扩展 AOE 不被穿透机制判死） |

### 中严重度（行为/数据错误）

| # | 位置 | 现象 | 修复 |
|---|------|------|------|
| 5 | `enemies/boss_skills.ts` | **dashMove 的 stateT 每帧被扣两次**（函数开头统一递减 + dashMove 分支再递减）→ 冲撞段时长减半（0.75s → ≈0.375s） | 删除分支内的重复递减 |
| 6 | `domain/weapons/hit_detection.ts` | **敌方酸雾 AOE 敌人循环未排除敌方弹** → 毒雾伤害并减速己方小怪 | aoe hit 的敌人检测仅玩家弹执行，敌方弹只检测玩家 |
| 7 | `domain/weapons/movement.ts` | **enemyRune 符箓弹乘性加速** `vx *= (1+2.4dt)` → 指数爆炸（≈e^2.4t，2s 内 ~120 倍）且帧率相关 | 改线性加速（保持方向，300px/s²） |
| 8 | `commands/fortune.ts` | **sieveTake 未校验 prevSlots**：缺轮盘时自建新轮盘、旧索引错位指向错误格子 | 要求 prevSlots 必须提供，缺失返回 `reason: 'wheel'` 且不减队列 |
| 9 | `commands/run.ts` | **resumeRun 裸水合存档 player**：跨版本旧档缺字段（effects 子项/派生属性）→ computeDerived 产出 NaN、combat 访问 p.effects 崩溃 | 以 `createPlayer()` 完整默认值为基座水合，`effects` 深拷贝补默认 |

### 低严重度（一致性 / 防御 / 死代码）

| # | 位置 | 现象 | 修复 |
|---|------|------|------|
| 10 | `config/blessings.ts` | **b_hp2 不朽之脉 +10% 上限不同步回血**，与 b_hp（+12 同回 12 血）、道具 hp1（+25 同回 25 血）语义不一致，拿到后血量百分比隐降 | 按旧上限的 10% 同步回血，不越过新上限 |
| 11 | `config/blessings.ts` + `domain/fortune_wheel.ts` | **pickBlessings / substituteBlessing 权重抽取无浮点兜底**：rng≈1 时累减永不 ≤0 → 错选首位（spinWheel 有兜底，不对称） | 默认指向末位（与 spinWheel 的 `slots.length-1` 语义一致） |
| 12 | `domain/fortune_wheel.ts` | **doubleDescNums 正则不认负号**：未来含负值 desc 的 common 祝福翻倍显示会丢负号 | 符号匹配改为 `[+-]?`，负值翻倍保留负号 |
| 13 | `commands/levelup.ts` | `applyBlessing(blessing: any)` 类型漏洞 | 收口为 `BlessingDef` |
| 14 | `features/ui/scheduler.ts` | enterGame 诅咒横幅死代码（startRun 已清空 curse，banner 由 state_hooks 的 CURSE 退出钩子负责） | 删除死分支 |
| 15 | `features/input/gamepad.ts` | 方向键长按首重复双倍延迟（实际 ≈0.7s，注释承诺 350ms） | 重复定时器从 0 起算，hold 达标当帧即触发 |
| 16 | `features/ui/gamepad_nav.ts` | 同一上下文 items 从空变非空时 `min(-1, len-1) = -1` 焦点不落到 0 | items 非空且索引 <0 时归 0 |
| 17 | `features/render/effects/projectiles.ts` + `entities.ts` | breath 渲染 `||` 兜底会吞合法 0 值（改 `??`）；Boss 低血狂暴 `hp/maxHp` 无分母防御 | 防御性修正 |

## 回归测试（+12）

- `combat.test.ts`：oath 保命后 1s 无敌不再被覆盖
- `run.test.ts`：重开清空月契/强化印记；续局恢复月契与强化印记；旧档无 fortune 字段兼容
- `player.test.ts`：b_hp / b_hp2 生命祝福语义（+10% 上限同步回 10% 血、满血不溢）
- `fortune_wheel.test.ts`：doubleDescNums 负值翻倍保留负号
- `fortune.test.ts`：sieveTake 缺轮盘拒绝且不减队列
- `enemy_proj_behavior.test.ts`：敌方 ground 落点炸玩家、玩家落点不伤己；酸雾不误伤己方；aoe 弹 pierce=Infinity

## 遗留（有意不修）

- 回旋镖回程段「前移+回返」同帧叠加（疑似有意的加速手感）
- 影袭 shadow 闪现落点距玩家固定 70px、判定 78px 必中（设计为必中打击）
- `hud.ts` 进度条 `stageMax` 除零防护：`CONFIG.STAGE_TIME` 恒为 30，无实际触发路径
