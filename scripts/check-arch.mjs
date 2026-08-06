#!/usr/bin/env node
/* =========================================================
   架构守卫（Architecture Fitness Function）
   校验 src/ 下的分层依赖方向，禁止上层被下层反向引用。
   用法：node scripts/check-arch.mjs
   ========================================================= */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');

/* 层级从低到高（支持多级路径前缀，取最长匹配）。
   规则：一个模块只能 import「层级 <= 自身」的模块；同层自由。 */
const LAYERS = [
  ['types'],                 //  0 纯类型声明
  ['engine'],                //  1 引擎基础设施：ECS / 状态机 / 事件总线 / 空间索引 / 工具
  ['assets'],                //  2 静态资产叶子：图标 SVG / 调色板
  ['config'],                //  3 纯数据配置（无行为）
  ['state'],                 //  4 状态容器
  ['platform'],              //  5 横切服务：音频、特效粒子发射（无 DOM、无业务语义）
  ['infra/persistence'],     //  6 存储适配器：存档 / 图鉴 / 成就落盘
  ['domain'],                //  7 领域规则：战斗、武器、敌人、词条
  ['systems'],               //  8 ECS 系统编排
  ['commands'],              //  9 意图层：UI → 领域的唯一入口
  ['features'],              // 10 表现层：render / ui / input
  ['infra/debug'],           // 11 调试与压测工具（可俯视一切）
  ['app'],                   // 12 组装根：game loop + 状态钩子
];

const LEVEL = new Map();
LAYERS.forEach((group, i) => group.forEach((d) => LEVEL.set(d, i)));

/** 取最长前缀匹配的层级，未命中返回 null */
function levelOf(segs) {
  for (let n = Math.min(segs.length, 3); n >= 1; n--) {
    const key = segs.slice(0, n).join('/');
    if (LEVEL.has(key)) return { key, level: LEVEL.get(key) };
  }
  return null;
}

/* 显式豁免：<from 层> -> Set<允许反向引用的层> */
const ALLOW = {
  // 无。所有反向依赖都应通过端口 / 事件总线倒置。
};

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === '__tests__' || e.name === 'node_modules') continue;
      walk(p, out);
    } else if (e.name.endsWith('.ts')) {
      out.push(p);
    }
  }
  return out;
}

const IMPORT_RE = /(?:^|\n)\s*(?:import|export)\s[^;]*?from\s*['"]([^'"]+)['"]/g;

const violations = [];
const files = walk(SRC);

for (const file of files) {
  const from = levelOf(path.relative(SRC, file).split(path.sep));
  if (!from) continue;                              // main.ts 等根文件：可依赖一切

  const src = fs.readFileSync(file, 'utf8');
  for (const m of src.matchAll(IMPORT_RE)) {
    const spec = m[1];
    if (!spec.startsWith('.')) continue;            // 跳过 npm 包
    const abs = path.resolve(path.dirname(file), spec);
    const to = levelOf(path.relative(SRC, abs).split(path.sep));
    if (!to || to.key === from.key) continue;

    if (to.level > from.level && !ALLOW[from.key]?.has(to.key)) {
      violations.push({
        file: path.relative(ROOT, file).replace(/\\/g, '/'),
        from: from.key,
        to: to.key,
        spec,
      });
    }
  }
}

if (violations.length === 0) {
  console.log('✔ 分层依赖检查通过：无向上依赖。');
  process.exit(0);
}

console.error(`✖ 发现 ${violations.length} 处向上依赖（低层引用高层）：\n`);
const byPair = new Map();
for (const v of violations) {
  const k = `${v.from} → ${v.to}`;
  (byPair.get(k) ?? byPair.set(k, []).get(k)).push(v);
}
for (const [pair, list] of byPair) {
  console.error(`  ${pair}  (${list.length})`);
  for (const v of list) console.error(`    ${v.file}  ←  ${v.spec}`);
}
process.exit(1);
