# UI 设计系统规范化 · 验收报告

> 分支：`style/ui-design-system`
> 日期：2026-08-06
> 目标：**不改变世界观与总体美术风格**，挖掘项目既有优秀设计（尤以「月蚀玻璃」材质为皇冠），
> 对齐规范、消除漂移、形成规范文档，并把玻璃材质发扬到更多界面与性能维度。

---

## 一、交付物

| 文档 | 说明 |
|---|---|
| [ui-design-system.md](./ui-design-system.md) | UI 设计系统规范：设计原则、色彩、字体、间距圆角、层级、组件、动效、性能、无障碍、迁移计划、验收清单 |
| [eclipse-glass.md](./eclipse-glass.md) | 「月蚀玻璃」材质专题：三等级体系、五层结构解剖、光晕参数化、色相变体、性能策略、反模式、演进备忘 |

## 二、代码变更清单

### 1. 关键帧收敛（消除漂移）
- **删除 14 组重复 keyframes**：base / menu / hud / cards / weapons / result / shop 中与 tokens.css 重复的定义全部移除，统一以 `tokens.css` 为唯一权威。
- **修复 `riseIn` 漂移**：menu.css 的 `20px` 与 tokens 的 `26px` 不一致，统一为 tokens 的 `26px`。
- **`erodeIn` 迁入 tokens**（侵蚀卡专属动画，原散落在 shop.css）。
- **删除死代码 `gateShake`**（CSS/TS 均无引用）。

### 2. 月蚀玻璃 · 发扬
- **色相变体工具类**（v1.0 新增）：`.eclipse-glass--violet / --blood / --ice / --jade`，
  从卡片 `rarity` 模式提炼为通用能力——覆盖光晕变量整体变色，不动模糊半径与透明度。
- **性能档位联动**（v1.0 新增）：
  - CSS：`html[data-preset="medium|low"]` 降级规则（medium 模糊减半；low 关闭 backdrop-filter、收束纯色衬底）
  - TS：`src/features/ui/glass_quality.ts` 订阅「蚀相档位」→ 同步 `<html data-preset>`（features/ui 层，不碰 state 高门槛文件）
  - 立场：**玩家取舍，非硬编码降级**——默认档位（high/ultra）保留完整材质，符合项目约定。

### 3. 对齐规范（消除魔法值）
- **RGB 片段 token**：新增 `--gold-rgb` / `--moon-rgb` / `--ice-rgb` / `--violet-rgb` / `--blood-rgb` / `--jade-rgb`，
  全局所有 `rgba(语义色, a)` 改为 `rgba(var(--x-rgb), a)`——颜色仅需维护一处，视觉零变化。
- **成就面板玻璃化**（最大不一致点）：`.ach-card` 从纯色渐变升级为凝蚀玻璃 + 顶部蚀痕高光线 + 稀有度色相光晕（沿用卡片 rarity 模式）。
- **图鉴类型色 token**：`--swift / --heavy / --lord` 新增，替换 codex-tag 硬编码；palette.ts 双轨登记。
- **蚀月赤红**：`--eclipsed` token 替换 `#ff6b6b`。
- **摇杆玻璃化**：joystick-base 改用玻璃 token（并随档位联动降级）。
- 侵蚀卡 `eroded` 紫红系：**刻意保留**（叙事变体，非遗漏），文档已归类说明。

## 三、验证结果

| 门禁 | 结果 |
|---|---|
| `npm run typecheck` | ✅ 通过 |
| `npm run arch`（13 层分层守卫） | ✅ 无向上依赖 |
| `npm run check-only`（.only 泄漏） | ✅ 无泄漏 |
| `npx vite build`（postcss/cssnano 全量解析 CSS） | ✅ 成功（CSS 82.30 kB，较前略降） |
| 关键帧完整性（引用 ↔ 定义 diff） | ✅ 无悬空引用 |

> 说明：`features/ui` 层不参与覆盖率门槛（由冒烟测试覆盖），新增 `glass_quality.ts` 不触发 coverage 变更；
> 未改动任何状态层（settings.ts 的 98% 覆盖率门槛不受影响）。

## 四、未纳入本次（有意为之 / 后续建议）

- **成就/图鉴网格滚动容器**：保持不玻璃（性能纪律，文档 §9.3）
- **覆盖层 `.overlay` 背景**：保留深色径向渐变 + blur（"镜头失焦"表达，区别于 deep 面板）
- **侵蚀卡紫红纯色**：保留（叙事变体）
- **材质演进**（文档 §7）：磨砂噪点、动态蚀相、玻璃反光——均为"未来可期"，本次不动，避免改变既有观感

## 五、后续建议

1. 所有新界面必须过 `ui-design-system.md` §12 验收清单
2. 新增配色双轨登记（CSS token + palette.ts）
3. 可考虑把 glass_quality 的档位同步扩展为 `data-preset` 驱动其它 CSS 降级（如粒子密度）——留给性能专项

---

# v1.1 增补（同日 20:12）：月蚀毛玻璃 + UI 细腻化

## 关系澄清
- **月蚀玻璃 = 品牌结构层**（夜空蓝 + 金描边 + 蚀痕线 + 光晕）
- **毛玻璃 = 通用质感层**（磨砂颗粒 + 色彩透出 saturate + 厚度内影）
- **集成**：毛玻璃作为修饰类叠加在等级之上，`月蚀毛玻璃 = 结构层 + 质感层`。

## 变更清单
1. **毛玻璃体系**（tokens.css）
   - 三等级类 `backdrop-filter` 增加 `saturate(var(--glass-saturate, 1))`
   - 新增 `--glass-noise`（SVG feTurbulence 噪点 data-URI）、`--glass-saturate` 参数
   - 新增修饰类 `.eclipse-glass--frosted`（--glass-saturate: 1.5 + 噪点）
   - 档位联动补 saturate 归位（medium/low → 1）；新增 `prefers-reduced-transparency` 收束
2. **战斗阶段指示器毛玻璃化**：stage-chip 挂载 `eclipse-glass-ghost eclipse-glass--frosted`（index.html + hud.css），手写玻璃属性收敛给工具类
3. **细腻化**：
   - 全局金细滚动条（webkit 8px 内缩 thumb）
   - `:focus-visible` 金色蚀痕焦点统一；移除 menu-btn / mech-toggle 的 `outline: none` 屏蔽
   - `menu-btn:active` 按下下压手感
   - `::selection` 月华金晕染
   - Boss 降临波次文字血色警示态 `.wave-text.boss`（hud.ts class 切换 + 新关键帧 `waveBossPulse` 迁入 tokens）

## 验证
typecheck / arch / check-only / vite build 全绿（CSS 83.66 kB，噪点贴图 + 新增规则所致，属预期）。

---

# v1.2 增补（同日 20:36，分支 style/ui-elevate）：UI 大刀阔斧升级

> 用户澄清：美术风格（暗色月蚀、金色光线、玻璃语言）不变，具体 UI 元素鼓励大胆升级。

## 变更清单（全部"看得见"）
1. **主菜单**（menu.css）
   - 月轮 → 蚀月之轮：~~多层径向渐变（金+紫）+ 旋转蚀环（`orbRing`）+ 下缘紫蚀影脉动（`orbEclipse`）~~ **用户反馈后已回退**（保留原柔光球；标题/按钮/徽章升级保留）
   - 标题 → 常驻月华呼吸（`titleGlow`，替代静态 drop-shadow）✅ 保留
   - ghost 按钮：渐变底 + hover 金辉光内晕；主按钮：内阴影层次 + hover 强辉光 ✅ 保留
   - 蚀月深度 → 透蚀玻璃徽章（pill + blur + 边缘光）✅ 保留
2. **战斗 HUD**（hud.css + index.html + hud.ts）
   - 血条/经验条、金币/击杀徽章 → 毛玻璃化（挂 frosted 工具类，手写玻璃属性收敛）
   - 血量数字变化 → `numPop` 弹跳反馈（hud.ts 变化才触发）
   - 武器空槽 → 蚀刻月纹呼吸（`slotEmptyBreath`）
3. **覆盖层与卡片**（cards.css）
   - overlay 背景 → 蚀月氛围（顶部金晕 + 底部紫蚀影，多层径向渐变）
   - 卡片图标 → 玻璃底座（blur + 内影 + 辉光脉动 `cardIconGlow`，辉光色随 `--card-ic-glow` 变量适配武器金/冰青）+ hover 放大
4. **暂停面板**：深蚀毛玻璃化 + 统计组玻璃化

## 验证
typecheck / arch / check-only / vite build 全绿（CSS 86.21 kB，含新动画与渐变）。

---

# v1.2 补充（20:56）：噪点跨浏览器修复 + 作战手记重构

## 噪点 Firefox 兼容修复
- 根因：SVG feTurbulence data-URI 噪点 Firefox 不渲染（背景图内 filter 引用失效）；且 data-URI 的 `;` 被 cssnano 去引号后截断（Chrome 也失效）
- 修复：噪点改独立 PNG 文件 `css/noise.png`（64×64 白霜颗粒）；`--glass-noise: url('noise.png')`（vite 打包）；postcss.config.js 加 `normalizeUrl: false` 防护

## 作战手记（howto）重构为月蚀之仪规范
- 面板：`.set-panel eclipse-glass-deep` + `eclipse-edge-top/top-glow`（复用 settings 组件类）
- 头部：剑徽 set-emblem + set-title「作战手记」+ set-sub
- 内容：5 个 set-group（征程/兵刃/命运/强敌/集市），sg-name + sg-sub + `.howto-item` 说明段
- 底部：set-note「月光铸刃，蚀潮难侵」+ 关闭按钮
- 遮罩：升级为覆盖层同款月蚀氛围（金顶晕 + 紫蚀影 + blur 14px）
- 层叠注意：`.set-panel.howto-panel` 双类提升特异性（settings.css 后加载）



