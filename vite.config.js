import { defineConfig } from 'vite';

export default defineConfig({
  // 开发服务器配置
  server: {
    port: 3000,
    open: true,
  },
  // 构建配置
  build: {
    outDir: 'dist',
    // 确保 Google Fonts 等外部资源不被 Vite 内联
    assetsInlineLimit: 0,
  },
  // CSS 配置
  css: {
    devSourcemap: true,
  },
});