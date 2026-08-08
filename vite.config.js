import { defineConfig } from 'vite';
import { compression } from 'vite-plugin-compression2';

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
  // 传输预压缩：brotli 为主（现代浏览器压缩率最优），gzip 兜底（旧环境/仅 gzip 的宿主）。
  // 构建时生成 .br / .gz 静态文件，由静态托管 / CDN / nginx 优先服务，避免服务器实时压缩开销。
  plugins: [
    compression({ algorithm: 'brotliCompress', threshold: 1024 }),
    compression({ algorithm: 'gzip', threshold: 1024 }),
  ],
  // CSS 配置
  css: {
    devSourcemap: true,
  },
});