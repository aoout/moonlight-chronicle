import { defineConfig } from 'vite';

export default defineConfig({
  // 开发服务器配置
  server: {
    port: 3000,
    host: true,   // 监听所有网络接口，输出局域网链接
    open: true,
  },
  // 构建配置
  build: {
    outDir: 'dist',
    // 小于 4KB 的本地资源（如 noise.png 噪点贴图 3.4KB）内联为 data URI，
    // 减少首屏独立请求数；Google Fonts 等外部 URL 不受此限制影响。
    assetsInlineLimit: 4096,
  },
  // CSS 配置
  css: {
    devSourcemap: true,
  },
});