# 月蚀玻璃 · 材质研究与应用规范

> 蚀月之下的玻璃：透出星夜，却不失深邃。这是蚀月远征最具辨识度的材质语言，
> 本文档将其实现原理、三等级体系、色相变体与性能策略完整归档，
> 并定义如何把这份质感发扬到项目每一处界面。

- 版本：1.0
- 权威定义：`css/tokens.css`（第 28~169 行）
- 上位规范：[UI 设计系统](./ui-design-system.md)

---

## 1. 材质哲学：为什么是「玻璃」

世界观的根是**蚀月**：月亮被侵蚀、月光被稀释，但守月人仍在月幕下作战。
玻璃恰好是这个意象的视觉化——

- **它透光**：面板背后是星夜与极光（`starfield`/`aurora`），内容仿佛悬浮在夜空中，而不是贴在一张纸上。
- **它磨砂**：模糊把背后的星夜柔化成「月晕」，形成「近实远虚」的纵深感。
- **它有釉光**：顶部 1px 的蚀痕高光线（`--glass-edge-top`）像月光扫过玻璃边缘。
- **它有重量**：深色底（夜空的压缩）+ 深阴影，让面板在星夜之上「沉得住」。

> 反模式：把玻璃做成纯色卡片，等于把玻璃贴上了黑纸——材质死亡，世界观失焦。

---

## 2. 三等级体系：透蚀 / 凝蚀 / 深蚀

材质按「雾度」分三档，对应内容层级（与蚀相深浅的意象呼应）：

| 等级 | 工具类 | 背景透明度 | 模糊半径 | 描边 | 适用 |
|---|---|---|---|---|---|
| 透蚀 | `.eclipse-glass-ghost` | 32% | 6px | 金 18% | HUD 徽章、Toast、浮层提示 |
| 凝蚀 | `.eclipse-glass-frost` | 55% | 12px | 金 28% | 卡片、铭牌、商店面板 |
| 深蚀 | `.eclipse-glass-deep` | 78% | 18px | 金 36% | 模态层、暂停面板、设置 |

**决策规则**：内容越需要「专注」（暂停、设置），雾度越高；越需要「时刻可见」（HUD），雾度越低。
三个等级之间不设中间档——少即是秩序。

### 2.1 参数表（token 级）

```css
--glass-bg-ghost:   rgba(10, 12, 28, .32);   /* 夜空蓝，32% 雾 */
--glass-bg-frost:   rgba(12, 15, 38, .55);
--glass-bg-deep:    rgba(8, 10, 24, .78);

--glass-blur-ghost: 6px;
--glass-blur-frost: 12px;
--glass-blur-deep:  18px;

--glass-border-ghost: rgba(233,201,135,.18);
--glass-border-frost: rgba(233,201,135,.28);
--glass-border-deep:  rgba(233,201,135,.36);
```

### 2.2 结构解剖：一张玻璃 = 5 层

```
┌─────────────────────────────────────┐
│ 1. 顶部蚀痕高光线 .eclipse-edge-top  │ ← 月光滑过釉面（1px 金渐变线）
├─────────────────────────────────────┤
│ 2. 顶部柔光 .eclipse-top-glow        │ ← 径向渐变，光源从顶部落下
│                                     │
│ 3. 玻璃底 --glass-bg-*              │ ← 半透明夜空蓝（真正的"玻璃"）
│ 4. backdrop-filter blur(--glass-*)  │ ← 磨砂：柔化背后的星夜
│ 5. 描边 + 阴影                      │ ← 金描边 + 深投影 + 内嵌釉光
└─────────────────────────────────────┘
```

阴影组合（frost 示例）：

```css
box-shadow:
  var(--glass-edge-inset),                        /* 内嵌釉光：玻璃的"厚度" */
  0 6px 32px rgba(0, 0, 0, .5),                   /* 深投影：把面板压进夜空 */
  0 0 var(--eclipse-glow-spread) var(--eclipse-glow-mid), /* 外辉光：月华渗出 */
  var(--eclipse-glow-inner);                      /* 内辉光：玻璃内的微光 */
```

---

## 3. 月蚀光晕系统（可参数化）

光晕是玻璃的「发光内脏」，全部走变量，**任何组件可覆盖**：

```css
--eclipse-glow-color:   var(--gold);
--eclipse-glow-soft:    rgba(233,201,135,.10);  /* 弥散 */
--eclipse-glow-mid:     rgba(233,201,135,.22);  /* 标准 */
--eclipse-glow-strong:  rgba(233,201,135,.38);  /* 强调 */
--eclipse-glow-spread:  24px;                    /* 外辉光扩散半径 */
--eclipse-glow-inner:   inset 0 0 30px rgba(233,201,135,.06); /* 内辉光 */
```

**关键技法——色相变体**：在同一组件内覆盖这几个变量，即可整体变色而不动结构。
这正是卡片稀有度的实现方式（`cards.css`）：

```css
.card.rarity-epic {
  --eclipse-glow-soft:  rgba(180,154,232,.10);
  --eclipse-glow-mid:   rgba(180,154,232,.24);
  --eclipse-glow-inner: inset 0 0 30px rgba(180,154,232,.07);
}
.card.rarity-legend { /* 金色系覆盖 ... */ }
```

---

## 4. 色相变体工具类（v1.0 新增）

从卡片的 `rarity-epic/legend` 模式提炼为**通用工具类**，供图鉴、成就、商店等复用：

```css
/* 紫蚀（史诗/蚀之神秘） */
.eclipse-glass--violet {
  --eclipse-glow-soft:  rgba(180,154,232,.10);
  --eclipse-glow-mid:   rgba(180,154,232,.24);
  --eclipse-glow-inner: inset 0 0 30px rgba(180,154,232,.07);
}
/* 血蚀（危险/侵蚀） */
.eclipse-glass--blood { /* --blood 系 */ }
/* 青蚀（冰寒/进阶） */
.eclipse-glass--ice   { /* --ice 系 */ }
/* 翠蚀（自然/恢复） */
.eclipse-glass--jade  { /* --jade 系 */ }
```

用法：`class="eclipse-glass-frost eclipse-glass--violet"`。
规则：色相变体只改光晕与描边色，**不改**模糊半径与背景透明度——层级感不因颜色而变。

---

## 5. 月蚀毛玻璃 · 质感层（v1.1 新增）

### 5.1 月蚀玻璃 vs 毛玻璃：结构层 × 质感层

- **月蚀玻璃**是项目的**品牌结构层**：夜空蓝半透明底、金描边、顶部蚀痕高光线、月蚀光晕。
  它回答「这是什么世界观」——暗色、金色光线、仪式感。
- **毛玻璃**（Frosted Glass，macOS 风）是**通用质感层**：磨砂颗粒、背景色彩透出（saturate）、
  厚度内影。它回答「摸起来什么手感」——通透、细腻、有颗粒。
- **集成关系**：毛玻璃不另起一套材质，而是作为**修饰类**叠加在月蚀玻璃等级之上——
  `月蚀毛玻璃 = 月蚀玻璃（结构） + 磨砂质感（纹理）`。既守住蚀月世界观，又获得磨砂的细腻通透。

### 5.2 实现（css/tokens.css）

```css
/* 三个等级类均支持饱和度透出（默认 1 = 关闭） */
.eclipse-glass-frost {
  backdrop-filter: blur(var(--glass-blur-frost)) saturate(var(--glass-saturate, 1));
}

/* 毛玻璃修饰类：只加纹理层，不碰模糊半径/透明度/阴影组合 */
.eclipse-glass--frosted {
  --glass-saturate: 1.5;                /* 背后星夜色彩透出 */
  background-image: var(--glass-noise); /* 磨砂噪点颗粒 */
}
```

**噪点实现（跨浏览器）**：`--glass-noise` 引用 `css/noise.png`（64×64 白色低 alpha 随机颗粒，
PNG 位图，Firefox/Chrome 均正常渲染）。⚠️ 不要改回 SVG `feTurbulence` data-URI——Firefox
不渲染 CSS 背景图内部的 SVG filter 引用，且 data-URI 的 `;` 会被 cssnano 去引号后截断
（postcss.config.js 已设 `normalizeUrl: false` 防护）。

### 5.3 使用

```html
<!-- 已启用毛玻璃的组件（v1.1 / v1.2）：
     战斗阶段指示器（夜之铭牌）、血条/经验条、金币/击杀徽章、暂停面板 -->
<div class="stage-chip eclipse-glass-ghost eclipse-glass--frosted">…</div>
<div class="hud-bar hp-bar eclipse-glass-frost eclipse-glass--frosted">…</div>
<div class="coin eclipse-glass-ghost eclipse-glass--frosted">…</div>
<div class="pause-stage eclipse-glass-deep eclipse-glass--frosted">…</div>

<!-- 其他需要「磨砂通透」的面板/徽章同理 -->
<div class="eclipse-glass-frost eclipse-glass--frosted">…</div>
```

### 5.4 规则

- 毛玻璃只改**纹理与色彩**，层级由等级类决定——`frosted` 不影响 ghost/frost/deep 的选择逻辑。
- 性能：毛玻璃的 `saturate` 随蚀相档位降级（medium/low 归位为 1），
  与模糊、光晕同进退；`prefers-reduced-transparency` 时整体收束为纯色衬底。
- 战斗 HUD 中的毛玻璃（背后是运动的 Canvas）默认档位（high/ultra）下质感最足，
  低档位自动退化为普通玻璃，玩家可取舍。

---

## 6. 使用指南

### 6.1 正确姿势

```html
<div class="set-panel eclipse-glass-deep">
  <div class="eclipse-edge-top"></div>
  <div class="eclipse-top-glow"></div>
  <!-- 内容 -->
</div>
```

### 6.2 反模式（禁止）

| 反模式 | 后果 | 正确做法 |
|---|---|---|
| 手写 `backdrop-filter: blur(12px)` | 令牌失效、档位无法联动 | 用工具类 |
| 嵌套玻璃（玻璃里再叠玻璃） | blur 成本平方级上涨 | 内层用纯色/ghost |
| 玻璃上跑全屏动画 | 每帧全屏重采样 | 动画元素与玻璃分层 |
| 滚动容器加玻璃 | 滚动时持续重模糊 | 容器外框玻璃，内容区不玻璃 |
| 改模糊半径不走变量 | 三等级秩序被打破 | 覆盖 `--glass-blur-*` |

### 6.3 何时用纯色（刻意为之）

- **进度条填充**：内部填充需要高对比，用渐变而非玻璃
- **覆盖层背景**：`.overlay` 用深色径向渐变 + blur（表达"镜头失焦"，与 deep 面板区分）
- **侵蚀卡 `.card.eroded`**：紫红纯色渐变是「被蚀之物」的叙事表达，**保留**——它是有意的色相变体，不是遗漏

---

## 7. 性能策略（玻璃的税）

`backdrop-filter` 不是免费的：每帧需把其后内容绘制到离屏缓冲再模糊。
半径越大、面积越大、背后越动（Canvas 游戏），税越重。

### 7.1 档位联动（v1.0 落地，v1.1 加入 saturate 归位）

| 档位 `html[data-preset]` | `--glass-blur-*` | `--glass-saturate` | `--eclipse-glow-*` | backdrop-filter |
|---|---|---|---|---|
| `ultra` / `high`（默认） | 6 / 12 / 18px（原值） | 1.5（毛玻璃可透色） | 原值 | 保留 |
| `medium` | 3 / 6 / 9px | 1（归位） | 减淡 | 保留 |
| `low` | 0px | 1 | 收束为极淡 | **关闭**（工具类 `backdrop-filter: none`） |

> 设计立场：这是**玩家可选**的取舍，不是硬编码降级——默认档位（high）保留完整材质，
> 低档位由玩家在「月蚀之仪」中主动选择。符合项目「性能与表现交由玩家取舍」的约定。

### 7.2 定位热点

- HUD 玻璃（hp/xp 条、stage-chip、金币）背后是每帧运动的 Canvas → 低档位收益最大
- 暂停/设置深蚀面板只在静态时出现 → 收益有限，重点是 deep 的 18px 模糊

### 7.3 优化清单

1. 复用工具类，让档位能一键控制
2. 避免嵌套玻璃
3. 玻璃上的交互用 transform/opacity（不触发布局）
4. 大列表滚动容器不玻璃（图鉴/成就网格）
5. 低档位 `backdrop-filter: none` 后仍保留背景色与描边，视觉秩序不塌
6. 系统 `prefers-reduced-transparency` 时玻璃整体收束为纯色衬底

---

## 8. 材质演进备忘（未来可期）

- ~~**磨砂噪点**~~：**v1.1 已落地**——`--glass-noise` 噪点贴图 + `.eclipse-glass--frosted` 修饰类
  （纳入档位：saturate 随档位归位；`prefers-reduced-transparency` 时收束）
- **动态蚀相**：让玻璃光晕色随「蚀月深度」（1~10）缓慢漂移（gold → violet → blood）
- **玻璃反光**：hover 时顶部高光线跟随光标横向移动（`--eclipse-edge-x` 变量）

---

*月蚀玻璃 · 让每一块面板都成为蚀月夜空的一扇窗。*
