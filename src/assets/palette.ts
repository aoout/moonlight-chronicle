/* =========================================================
   蚀月远征 · 调色板（特效/渲染统一色值）
   全库所有出现 >=3 次的语义色都登记于此，代码引用 PALETTE.xxx
   而非硬编码色值；一次性局部颜色可保留字面量。
   ========================================================= */

export const PALETTE = {
  /* ---- 基础语义色 ---- */
  gold:'#e9c987', goldBright:'#ffd98a', goldPale:'#f6e3b8', goldDeep:'#c8a05f',
  ice:'#9fd6e8', iceLight:'#cfeff8', iceWhite:'#eafcff',
  violet:'#b49ae8', violetDark:'#7c6d9e',
  shadow:'#6b5cf0', shadowDark:'#4a3fcc',
  blood:'#e2546a', bloodDark:'#a0284a',
  fire:'#ff8a5c', fireBright:'#ffe9a8', ember:'#ffb84d', hot:'#ff6b6b',
  jade:'#7fd6a4', white:'#ffffff',
  /* 类型强调色（与 CSS tokens --swift/--heavy/--lord 双轨一致） */
  swift:'#8fe3d8', heavy:'#ff9d6b', lord:'#ff7a8a',

  /* ---- 扩展：高频语义色（全库 >=3 处引用） ---- */
  goldVivid:'#ffd54a',      // 金黄（Boss / 敌人特效）
  peach:'#ffd9a8',          // 浅橙（碎屑 / 火花）
  warmWhite:'#fff5d6',      // 暖白（金色系光晕）
  cream:'#fff2cc',          // 奶油白（光爆内环）
  icePale:'#dbe8ff',        // 淡蓝白（月影残像）
  sky:'#a8d8ff',            // 天蓝
  skyDark:'#5c8a9e',        // 深天蓝
  tide:'#5fb8a8',           // 潮汐青（蚀潮之锚）
  tideDark:'#6fa8a0',       // 深潮青
  teal:'#8fd8c8',           // 青绿
  mint:'#b6ffd8',           // 薄荷绿
  green:'#7fce5a',          // 草绿
  paleGreen:'#a8e88a',      // 嫩绿
  mistyGreen:'#eafff4',     // 雾绿
  coral:'#ff7a7a',          // 珊瑚红
  coralBright:'#ff8a8a',    // 亮珊瑚
  tangerine:'#ff7a3c',      // 橘红（爆炸光晕）
  rose:'#d98a8a',           // 玫瑰红
  bone:'#f4e9d0',           // 骨白（装甲敌人）
  steel:'#9aa5b8',          // 钢灰蓝
  slate:'#7a8aa5',          // 石板灰蓝
  slateDark:'#8890a8',      // 深石板灰
  gray:'#888',              // 中性灰
  darkCrimson:'#2a0c0c',    // 暗血红
  maroon:'#3d1216',         // 栗褐
  lavender:'#d8d2f0',       // 淡紫
  periwinkle:'#c8c2e8',     // 蓝紫
  periwinkleBright:'#8f9aee', // 亮蓝紫
  orchid:'#9a86c8',         // 兰花紫
};
