import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  define: {
    global: 'globalThis',
    'process.env': {},
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@fundtracer/core': path.resolve(__dirname, '../core/src'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    target: 'es2020',
    chunkSizeWarningLimit: 1000,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'firebase': ['firebase/app', 'firebase/auth'],
          'wagmi': ['wagmi', 'viem'],
          'appkit': ['@reown/appkit', '@reown/appkit-adapter-wagmi'],
        },
      },
    },
    reportCompressedSize: false,
    cssCodeSplit: true,
  },
  optimizeDeps: {
    include: [
      '@reown/appkit',
      '@reown/appkit-adapter-wagmi',
      '@reown/appkit-wallet-button',
      'wagmi',
      'viem',
      'ethers',
      'firebase/app',
      'firebase/auth',
    ],
    esbuildOptions: {
      target: 'es2020',
    },
  },
  esbuild: {
    legalComments: 'none',
    treeShaking: true,
  },
});
