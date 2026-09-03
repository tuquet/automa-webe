import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    vue(),
  ],
  root: path.resolve(__dirname, 'src/studio'),
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'webextension-polyfill': path.resolve(__dirname, 'src/studio/standalone-browser-mock.js'),
      '@/utils/api': path.resolve(__dirname, 'business/dev/utils/api-runner-mock.js'),
      '@business$': path.resolve(__dirname, 'business/dev/index.js'),
      '@business': path.resolve(__dirname, 'business/dev'),
      secrets: path.resolve(__dirname, 'secrets.blank.js'),
      vue: 'vue/dist/vue.esm-bundler.js',
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    BROWSER_TYPE: JSON.stringify(process.env.BROWSER || 'chrome'),
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
  },
  build: {
    outDir: path.resolve(__dirname, 'dist/studio'),
    emptyOutDir: true,
    target: 'esnext',
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      input: path.resolve(__dirname, 'src/studio/index.html'),
      onwarn(warning, warn) {
        if (warning.code === 'INEFFECTIVE_DYNAMIC_IMPORT') return;
        warn(warning);
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
  server: {
    port: 5173,
  },
});
