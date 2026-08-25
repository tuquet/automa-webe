module.exports = {
  plugins: [
    require(require.resolve('tailwindcss', { paths: [__dirname] })),
    require('autoprefixer'),
  ],
};
