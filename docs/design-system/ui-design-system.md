# 蚀月远征 · UI 设计系统规范

> 本规范不是另起炉灶，而是对既有视觉语言的**提炼与对齐**——
> 世界观的根（蚀月、守月人、月幕集市）与总体美术风格保持原样，
> 只把散落在各处的优秀设计收拢为单一权威来源（Single Source of Truth），
> 并定义「如何正确使用」，让后续界面长在同一棵树上。

- 版本：1.0
- 适用：所有 DOM/CSS 界面（主菜单、覆盖层、HUD、商店、图鉴、成就、设置、结算）
- 关联文档：[月蚀玻璃材质专题](./eclipse-glass.md)
- 权威源文件：`css/tokens.css`

---

## 1. 设计原则

1. **月蚀至上**：所有界面是蚀月之下的「玻璃橱窗」——面板必须透出背后的星夜与月华，
   用「月蚀玻璃」材质（而非纯色块）承载内容。
2. **金色是光线**：金（`--gold`）代表月华与神性，只用于**重要**信息——
   标题、主按钮、数值高亮、稀有度。金色泛滥等于没有金色。
3. **青色是呼吸**：冰青（`--ice`）代表蚀的侵蚀与生命，用于辅助标签、进度、次级强调。
4. **三档节奏**：内容层级用玻璃三等级表达——`ghost`（HUD 徽章）< `frost`（卡片/面板）< `deep`（模态/暂停）。
   模糊半径越大，层级越高。
5. **动效为叙事**：入场动画必须存在（`riseIn`/`cardIn` 系），但只出现一次；
   常驻动画（呼吸、扫光）克制使用；尊重 `prefers-reduced-motion`。
6. **性能即体面**：一切视觉都必须能随「蚀相档位」降级，默认档位不妥协；
   玻璃模糊是性能税，按档位缴纳（见 §9）。

---

## 2. 色彩系统

### 2.1 语义色板（唯一权威：`css/tokens.css`）

| 令牌 | 值 | 用途 |
|---|---|---|
| `--bg-0` | `#04050d` | 最深夜空（页面底色） |
| `--bg-1` | `#0a0c1c` | 次级夜空 |
| `--bg-2` | `#12142b` | 表层层 |
| `--gold` | `#e9c987` | 月华金：标题/主按钮/稀有度 legend/强调数值 |
| `--gold-deep` | `#c8a05f` | 暗金：渐变收尾、次级金色 |
| `--gold-glow` | `rgba(233,201,135,.55)` | 金色辉光（text-shadow / drop-shadow） |
| `--moon` | `#f4ecd8` | 月白：正文、卡片名 |
| `--ice` | `#9fd6e8` | 冰青：标签、进度、次级强调 |
| `--blood` | `#e2546a` | 血红：负面、危险、侵蚀扣减 |
| `--jade` | `#7fd6a4` | 翡翠：转化、增益、特殊词条 |
| `--violet` | `#b49ae8` | 紫罗兰：稀有度 epic、蚀之神秘 |
| `--panel` | `rgba(13,16,38,.72)` | 纯色面板底（极少用，玻璃的兜底） |
| `--panel-solid` | `#0d1030` | 纯色面板（极少用） |
| `--line` | `rgba(233,201,135,.22)` | 细分隔线、ghost 按钮描边 |

### 2.2 双轨配色对照（Canvas ↔ CSS）

游戏画面由 Canvas 绘制，界面由 CSS 绘制，**两套色值必须保持一致**：

| 语义 | CSS token | Canvas `src/assets/palette.ts` |
|---|---|---|
| 金 | `--gold` `#e9c987` | `gold: '#e9c987'` |
| 金亮 | 卡片 rarity-legend 顶线 `#ffd98a` | `goldBright: '#ffd98a'` |
| 金淡 | `menu-btn.primary` 渐变起点 `#f6e3b8` | `goldPale: '#f6e3b8'` |
| 金深 | `--gold-deep` `#c8a05f` | `goldDeep: '#c8a05f'` |
| 冰青 | `--ice` `#9fd6e8` | `ice: '#9fd6e8'` |
| 紫 | `--violet` `#b49ae8` | `violet: '#b49ae8'` |
| 血红 | `--blood` `#e2546a` | `blood: '#e2546a'` |
| 翡翠 | `--jade` `#7fd6a4` | `jade: '#7fd6a4'` |

> 规范：新增配色时**必须同时登记** CSS token 与 `palette.ts`，并在 §2.1 表中补行。
> 特效专属色（`fire/shadow/ember` 等）仅 Canvas 使用，可不必进 CSS。

### 2.3 文本对比度（WCAG AA）

- 正文 `--moon` 在玻璃底（约 12% 透明度夜空）上对比度 > 7:1 ✓
- 次要文字统一用 `rgba(244,236,216,.55~.76)` 阶梯：`.72` 正文 / `.6` 副标题 / `.4` 提示
- 金色文字仅用于大字或粗体（≥ 18px 或 700），避免小字号金字的对比度风险

---

## 3. 字体与排版

| 令牌 | 字体 | 用途 |
|---|---|---|
| `--font-title` | `Cinzel` → `Noto Serif SC`（衬线回退） | 大标题、卡片名、按钮 |
| `--font-body` | `Inter` → `Noto Serif SC` | 正文、数值 |

排版规则：

- 标题：`letter-spacing: .2em~.3em`（史诗感来自字距，不是字号）
- 正文行高 ≥ 1.55；说明文字 10.5~14px
- 数字/数值：使用 `--font-body` 的 600~800 字重，与中文混排时字形协调
- 金色渐变文字用 `.gold-text`（`linear-gradient(180deg,#fbf4dd,var(--gold))`），不要手写

---

## 4. 间距与圆角

### 4.1 间距（8 点思维，单位为 4px 的倍数）

| 令牌 | 值 | 典型用途 |
|---|---|---|
| `--gap-xs` | 6px | 徽章内距、图标距 |
| `--gap-sm` | 10px | 卡片内距、小间隔 |
| `--gap-md` | 14px | 组件间默认间隔 |
| `--gap-lg` | 20px | 卡片间、区块间 |
| `--gap-xl` | 24px | 大区块、覆盖层留白 |

### 4.2 圆角

| 令牌 | 值 | 典型用途 |
|---|---|---|
| `--radius-sm` | 6px | 小徽章、tooltip |
| `--radius-md` | 10px | 列表项、小卡 |
| `--radius-lg` | 14px | 卡片、面板（默认） |
| `--radius-xl` | 16px | 大面板 |
| `--radius-pill` | 999px | 标签、pill 按钮 |

> 规范：所有新组件的圆角必须取以上令牌。**禁止**散落 4px / 8px / 12px 等游离值。

---

## 5. 层级与阴影

### 5.1 z-index 图谱（`--z-*`）

`bg(0) < bg-canvas(4) < game-canvas(5) < screen(10) < hud(20) < fx(25) < overlay(30) < banner(35) < vignette(40) < modal(50) < toast(60)`

规则：新浮层先对号入座，禁止发明新数值。

### 5.2 阴影语义

- **玻璃面板**：阴影由月蚀玻璃材质统一提供（见材质专题），禁止另写阴影
- **悬停抬升**：`translateY(-2px~-6px)` + 辉光加强，用 `--ease-out-expo`
- **内嵌高光**：`--glass-edge-inset`（`inset 0 1px 0 rgba(255,255,255,.07)`）是玻璃质感的「釉面」，所有玻璃都必须有

---

## 6. 月蚀玻璃材质

> 材质是项目视觉的皇冠，单独立档：[eclipse-glass.md](./eclipse-glass.md)。
> 此处只给快速参考：

- 三等级：`.eclipse-glass-ghost / -frost / -deep`（模糊 6 / 12 / 18px）
- 装饰：`.eclipse-edge-top`（顶部蚀痕高光线）+ `.eclipse-top-glow`（顶部柔光）
- 色相变体：`.eclipse-glass--violet / --blood / --jade / --ice`（覆盖光晕色）
- **毛玻璃质感层**：`.eclipse-glass--frosted`（磨砂噪点 + 色彩透出，叠加任意等级之上）
- 性能档位：`html[data-preset="low|medium|high|ultra"]` 联动（§9）

---

## 7. 组件规范

### 7.1 按钮 `.menu-btn`

| 变体 | 视觉 | 用途 |
|---|---|---|
| `primary` | 金渐变 `#f6e3b8→#8a6a34` + 深色字 + 外辉光 | 唯一主行动（开始远征/继续/下一夜） |
| `ghost` | 透明底 + `--line` 描边，hover 金底晕染 | 次级行动 |
| `continue` | 双行结构 + 金内辉光 | 局内存档继续 |
| `small` | 缩小版 | 覆盖层底部返回 |

规范：
- 圆角 4px（保留现状，作为「仪式感直角」的标识，不并入 `--radius-*`）
- 主行动一屏至多一个；hover 扫光 `::after` 是品牌动作，必须保留
- `letter-spacing: .22em`，字号 15px / small 13px

### 7.2 卡片 `.card`

- 尺寸 218×276（武器 256 高），圆角 14，`frost` 材质
- 结构：稀有度行 → 卡名 → 图标 → 描述 → 价格/标签
- 稀有度：`rarity-epic`（紫光晕）/ `rarity-legend`（金光晕）通过**覆盖 `--eclipse-glow-*` 变量**实现色相，勿硬编码
- 入场 `cardIn`；hover 抬升 `-6px` + 金描边 + 顶线亮起

### 7.3 进度条（HUD/暂停/商店）

- 槽：`frost` 玻璃；填充：金橙渐变（HP）/ 青渐变（XP）
- `.bar-gloss` 扫光（`barShine`）是品牌动效，保留
- 填充宽度由 JS 每帧写入 `style.width`，过渡在 CSS 控制（`width .2s` 内）

### 7.4 徽章（HUD 右上/中）

- `ghost` 材质 + `--radius-pill`，图标 + 数值
- 数值用 800 字重；图标 `drop-shadow` 辉光

### 7.5 覆盖层 `.overlay`

- 背景：深色径向渐变 + `blur(14px)`（保留现状，作为「镜头失焦」的表达，区别于 deep 面板）
- 标题 `.overlay-title`：金色渐变大字 + `letter-spacing: .3em`
- 打开动画 `fadeIn .45s`；关闭直接 `hidden`

### 7.6 Tab / 标签

- Tab：pill 形，active 用金渐变（保留 codex 现状）
- 稀有度标签（`ach-tag` / codex）：**必须**用 §2.1 语义色，禁止硬编码 `#9fd6e8` 之类

### 7.7 Toast

- `ghost` 材质、圆角 6、`toastIn` 入场；错误态可用 `--blood` 描边

---

## 8. 动效规范

### 8.1 关键帧唯一权威

所有关键帧**只允许**定义在 `css/tokens.css`。组件文件不得重复定义
（历史遗留的重复定义见 §11 迁移计划）。权威清单：

| 关键帧 | 用途 |
|---|---|
| `fadeIn` | 覆盖层淡入 |
| `riseIn` | 从下浮起（26px） |
| `cardIn` | 卡片入场（22px + 缩放 .94） |
| `slotIn` | 武器槽入场 |
| `toastIn` | Toast 滑入 |
| `barShine` | 进度条扫光 |
| `dmgFloat` | 伤害数字飘字 |
| `bannerIn` | 战斗横幅（Boss 提示） |
| `cdPulse` | 冷却就绪脉冲 |
| `orbPulse` | 主菜单光球呼吸 |
| `twinkle` / `auroraShift` | 背景星闪 / 极光漂移 |
| `titleShine` | 标题流光 |
| `iconPulse` / `iconPop` | 图标强调 |
| `statFlash` | 属性变化闪烁 |
| `erodeIn` | 侵蚀卡出场（金被暗蚀吞噬） |
| `curseIn` / `curseOut` | 诅咒横幅 |
| `waveBossPulse` | Boss 降临波次文字警示脉动 |
| `numRollIn` | 数字滚动 |
| `orbFade` / `pageIn` | 光球虚影 / 整页载入 |
| `waveShift` / `orientPulse` | 波纹 / 横屏提示 |

### 8.2 动效纪律

- 入场：`cubic-bezier(.22,1,.36,1)`（`--ease-out-expo`），时长 0.4~1.2s
- 悬停：0.25~0.35s；常驻动画（呼吸/扫光）时长 ≥ 1.5s 且不打扰阅读
- **尊重 `prefers-reduced-motion: reduce`**：关闭入场与常驻动画（参考 menu.css 的降级段）

---

## 9. 性能规范

### 9.1 玻璃的代价

`backdrop-filter` 每帧重采样其后全部底层内容，成本随**模糊半径**与**覆盖面积**上升。
HUD 玻璃（背后是每帧运动的 Canvas）是最大热点。

### 9.2 档位联动（`html[data-preset]`）

玻璃强度必须随玩家「蚀相档位」降级（玩家取舍，非硬编码降级）：

| 档位 | 玻璃表现 |
|---|---|
| `high`（默认）/ `ultra` | 完整玻璃（blur 6/12/18px） |
| `medium` | 模糊减半（3/6/9px），光晕减淡 |
| `low` | 关闭模糊（`backdrop-filter: none`），光晕收束为纯色衬底 |

实现：`css/tokens.css` 底部按 `html[data-preset=...]` 覆盖 `--glass-blur-*` 与 `--eclipse-glow-*`；
DOM 侧由 `src/features/ui/glass_quality.ts` 把 `settingsState` 的档位同步到 `documentElement.dataset.preset`。

### 9.3 编写纪律

- 新组件一律复用玻璃工具类，不要手写 `backdrop-filter`
- 玻璃容器内避免再叠玻璃（嵌套 blur 开销翻倍）
- 动画元素（抬升/扫光）用 `transform`/`opacity`，不触发重排重绘
- 大列表（图鉴/成就网格）滚动容器不加 `backdrop-filter`

---

## 10. 无障碍规范

- 交互目标 ≥ 44px（`--touch-target`）；小目标 ≥ 36px（`--touch-target-sm`）
- 焦点可见：`focus-visible` 时金描边 + 辉光（不得 `outline: none` 裸奔）
- 键盘可达：所有覆盖层可 `Esc` 关闭，Tab 顺序与视觉顺序一致
- 语义：图标按钮带 `aria-label`；状态变化（稀有度/已达成）用文字而非纯色传达
- 对比度：正文 ≥ 4.5:1，大字 ≥ 3:1（§2.3）

---

## 11. 迁移计划（现状 → 规范）

| 项 | 现状 | 目标 | 状态 |
|---|---|---|---|
| 关键帧重复定义 | 14 组双份（tokens + 组件） | 收敛到 tokens.css | ✅ 本次 |
| `riseIn` 漂移 | menu 20px / tokens 26px | 统一 26px | ✅ 本次 |
| 成就卡片材质 | 纯色渐变（未走玻璃） | `frost` 玻璃 + 稀有度色相 | ✅ 本次 |
| 设置面板硬编码 | 内联 `rgba(233,201,135,…)` | token 化 | ✅ 本次 |
| 图鉴稀有度标签 | 硬编码 `#9fd6e8` 等 | 语义色 token | ✅ 本次 |
| 摇杆玻璃 | 手写 rgba + blur | 玻璃 token | ✅ 本次 |
| 玻璃性能档位 | 无 DOM 钩子 | `data-preset` 联动 | ✅ 本次 |
| 侵蚀卡 `eroded` | 紫红纯色渐变 | 归类为「侵蚀色相变体」，保留 | 保留（有意设计） |
| 毛玻璃质感层 | 无 | `.eclipse-glass--frosted` 修饰类 | ✅ v1.1 |
| 战斗阶段指示器 | 手写透蚀玻璃 | 毛玻璃化（chip 挂载 frosted） | ✅ v1.1 |
| 全局滚动条 | 浏览器默认 | 金细滚动条统一 | ✅ v1.1 |
| 键盘焦点 | 部分组件 `outline: none` | `:focus-visible` 金描边统一 | ✅ v1.1 |
| Boss 波次文字 | 单态 | 降临血色警示态 `waveBossPulse` | ✅ v1.1 |
| 主菜单月轮 | 柔光球 | ~~蚀月之轮~~ **回退**（保持原柔光球，用户选择） | ↩️ 回退 |
| 主菜单标题 | 静态光晕 | 常驻月华呼吸 `titleGlow` | ✅ v1.2 |
| 主菜单按钮 | 平板幽灵钮 | 渐变底 + hover 金辉光 + 主钮内阴影 | ✅ v1.2 |
| 蚀月深度 | 纯文字 | 透蚀玻璃徽章（pill） | ✅ v1.2 |
| 血条/徽章 | 手写玻璃 | 毛玻璃化（frosted）+ 数值 pop `numPop` | ✅ v1.2 |
| 武器空槽 | 灰虚线 | 蚀刻月纹呼吸 `slotEmptyBreath` | ✅ v1.2 |
| 覆盖层背景 | 深色渐变 | 蚀月氛围（顶部金晕 + 底部紫蚀影） | ✅ v1.2 |
| 卡片图标 | 纯色方块 | 玻璃底座 + 辉光脉动 `cardIconGlow` + hover 放大 | ✅ v1.2 |
| 暂停面板 | 手写深蚀玻璃 | 毛玻璃化 + 统计组玻璃化 | ✅ v1.2 |

---

## 12. 验收清单（新增界面必须满足）

- [ ] 面板使用玻璃工具类（非手写 backdrop-filter）
- [ ] 颜色全部来自 token（Canvas 侧同时登记 palette）
- [ ] 圆角/间距取令牌值
- [ ] 关键帧引用 tokens.css（未重复定义）
- [ ] 入场动画存在且尊重 reduced-motion
- [ ] 低档位（low）下玻璃正确降级
- [ ] 对比度达标、键盘可达、焦点可见

---

*「蚀月远征」UI 设计系统 · 保持蚀月之下的美学不变，只让秩序生长。*
