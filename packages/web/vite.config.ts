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
        "connect-src 'self' https://* https://*.* wss://* ws://* https://auth.privy.io https://api.privy.io",
        "font-src 'self' data:",
        "frame-src 'self' https://auth.privy.io https://www.reown.com https://*.walletconnect.com",
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
        "connect-src 'self' https://* https://*.* wss://* ws://* https://auth.privy.io https://api.privy.io",
        "font-src 'self' data:",
        "frame-src 'self' https://auth.privy.io https://www.reown.com https://*.walletconnect.com",
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
      include: [/node_modules/],
    },
    rollupOptions: {
      external: ['@privy-io/react-auth'],
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'firebase': ['firebase/app', 'firebase/auth'],
          'appkit': ['@reown/appkit', '@reown/appkit-adapter-ethers'],
          'router': ['react-router-dom'],
          'charts': ['chart.js', 'react-chartjs-2', 'lightweight-charts'],
          'pdf': ['jspdf', 'jspdf-autotable', 'html2canvas'],
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
      'uuid',
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
