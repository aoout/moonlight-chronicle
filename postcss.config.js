export default {
  plugins: {
    autoprefixer: {},
    // normalizeUrl:false —— 保留 url() 引号。data:image/png;base64 的「;」在无引号
    // url() 里会被 CSS 解析器当成声明结束，导致 base64 内容被截断、噪点贴图失效。
    cssnano: process.env.NODE_ENV === 'production'
      ? { preset: ['default', { normalizeUrl: false }] }
      : false,
  },
};