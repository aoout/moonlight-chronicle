export default {
  plugins: {
    autoprefixer: {},
    cssnano: process.env.NODE_ENV === 'production' ? { preset: 'default' } : false,
  },
};