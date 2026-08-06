import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/__tests__/**/*.test.ts'],
    environment: 'node',
    // 本环境沙箱会拦截 vite 依赖优化缓存的 rm（genie-safe-delete），导致 vitest
    // 起不来；关掉 dep optimization 即可在沙箱内正常启动 worker。
    pool: 'threads',
    deps: {
      optimizer: {
        web: { enabled: false },
        ssr: { enabled: false },
      },
    },

    // 顺序有语义，不能交换：
    //   install.ts —— 零业务依赖，抢在 utils.ts 捕获 Math.random 之前接管全局
    //   setup.ts   —— 之后才允许 import 业务模块，注册每个用例前的复位钩子
    setupFiles: [
      './src/__tests__/_harness/install.ts',
      './src/__tests__/setup.ts',
    ],

    // 用例之间不残留 mock 状态：忘记手动清理不再是失败来源
    clearMocks: true,
    restoreMocks: true,
    unstubGlobals: true,
    unstubEnvs: true,

    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'json-summary', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/__tests__/**',
        'src/types/**',
        '**/*.d.ts',
        // 组装根：只有 import 与 game loop，单测无意义，由运行时冒烟覆盖
        'src/main.ts',
      ],
      // ── 覆盖率阈值（质量门禁）────────────────────────────────────
      // 设计原则：
      //  1) global 是一道地板，挡住「整套测试整体塌方」。未测的 UI / 音频 /
      //     输入层会拉低均值，新增未测代码会逐渐击穿这道地板 —— 这正是意图。
      //  2) 其余是按「我们已刻意测深的层 / 文件」逐一锁定的门槛，比当前覆盖
      //     低几格：既锁住已有收益，又容忍小幅漂移，不会一改就红。
      //  3) 未测层（features/ui、platform/audio、features/input）故意不单独
      //     设门槛 —— 它们由 render_smoke 等冒烟测试覆盖，而非覆盖率门槛。
      // 所有 glob 用 `**/` 前缀，兼容 Windows 绝对路径的匹配。
      thresholds: {
        statements: 34,
        branches: 24,
        functions: 29,
        lines: 34,

        '**/src/commands/**': { statements: 92, branches: 82, functions: 98, lines: 92 },
        '**/src/domain/combat.ts': { statements: 83, branches: 80, functions: 88, lines: 88 },
        '**/src/domain/erosion.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
        '**/src/domain/item_effects.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
        '**/src/domain/player.ts': { statements: 94, branches: 90, functions: 98, lines: 98 },
        '**/src/domain/spawn.ts': { statements: 88, branches: 72, functions: 98, lines: 95 },
        '**/src/domain/weapons/{movement,storm,orbit}.ts': { statements: 96, branches: 76, functions: 98, lines: 96 },
        '**/src/engine/core/{store,state_machine,event_bus,states}.ts': { statements: 76, branches: 72, functions: 68, lines: 80 },
        '**/src/engine/ecs/{entity_pool,World}.ts': { statements: 77, branches: 60, functions: 54, lines: 78 },
        '**/src/engine/util/utils.ts': { statements: 69, branches: 73, functions: 64, lines: 53 },
        '**/src/engine/spatial/SpatialSystem.ts': { statements: 64, functions: 78, lines: 64 },
        '**/src/state/settings.ts': { statements: 98, branches: 92, functions: 98, lines: 98 },
        '**/src/infra/persistence/**': { statements: 82, branches: 84, functions: 66, lines: 82 },
        '**/src/systems/AchievementSystem.ts': { statements: 68, branches: 56, functions: 60, lines: 68 },
        '**/src/systems/index.ts': { statements: 98, branches: 98, functions: 98, lines: 98 },
        '**/src/features/render/layers/**': { statements: 95, branches: 55, functions: 90, lines: 95 },
      },
    },
  },
});
