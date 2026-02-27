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
    headers: {
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https:",
        "connect-src 'self' https://api.helius-rpc.com https://api.coingecko.com https://api.alchemy.com https://*.alchemy.com https://mainnet.base.org https://*.public.blob.vercel-storage.com",
        "font-src 'self' data:",
        "frame-src 'self' https://www.reown.com",
      ].join('; '),
    },
  },
  preview: {
    headers: {
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https:",
        "connect-src 'self' https://api.helius-rpc.com https://api.coingecko.com https://api.alchemy.com https://*.alchemy.com https://mainnet.base.org https://*.public.blob.vercel-storage.com",
        "font-src 'self' data:",
        "frame-src 'self' https://www.reown.com",
      ].join('; '),
    },
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
          'appkit': ['@reown/appkit', '@reown/appkit-adapter-ethers'],
        },
      },
    },
    reportCompressedSize: false,
    cssCodeSplit: true,
  },
  optimizeDeps: {
    include: [
      '@reown/appkit',
      '@reown/appkit-adapter-ethers',
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
