/* =========================================================
   测试反模式守卫：拦截遗留的 `.only`
   ---------------------------------------------------------
   vitest 遇到 `.only` 会**只跑那一个用例**，静默跳过其余所有用例。
   一旦随提交溜进仓库，CI 看似全绿，实则只验证了极少一部分 ——
   这是最阴险的"假绿灯"之一。

   本脚本扫描全部测试文件，发现 `.only(` 立即非零退出。
   它已接入 `npm run verify`，是构建门禁的一环。
   （`.skip` 是显式跳过单条，不影响其余，不在此拦截。）
   ========================================================= */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('src/__tests__');
const ONLY_RE = /\.only\s*\(/;

const leaks = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (!entry.name.endsWith('.test.ts')) continue;
    const lines = fs.readFileSync(full, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (ONLY_RE.test(line)) {
        leaks.push(`${path.relative(process.cwd(), full)}:${i + 1}  ${line.trim()}`);
      }
    });
  }
}

if (fs.existsSync(ROOT)) walk(ROOT);

if (leaks.length) {
  console.error('✗ 发现遗留的 .only 测试（会悄悄跳过其余用例）：');
  for (const l of leaks) console.error('   ' + l);
  process.exit(1);
}
console.log('✓ 未发现 .only 泄漏');
