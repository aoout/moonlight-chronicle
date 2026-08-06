import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/__tests__/**/*.test.ts'],
    environment: 'node',
    // Windows 下默认 forks 池的子进程 stdio 会被吞掉导致假死，统一用 threads
    pool: 'threads',
  },
});