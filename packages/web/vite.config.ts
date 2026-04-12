import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  define: {
    global: 'globalThis',
    'process.env': {},
    React: 'React',
    'React.Fragment': 'React.Fragment',
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
        "default-src 'self' https://*",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.google.com https://static.cloudflareinsights.com",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https: https://www.fundtracer.xyz https://fundtracer.xyz",
        "media-src 'self' data:",
        "connect-src 'self' https://* https://*.* wss://* ws://* https://auth.privy.io https://api.privy.io",
        "font-src 'self' data:",
        "frame-src 'self' https://auth.privy.io https://www.reown.com https://*.walletconnect.com",
      ].join('; '),
    },
  },
  preview: {
    headers: {
      'Content-Security-Policy': [
        "default-src 'self' https://*",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.google.com https://static.cloudflareinsights.com",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https: https://www.fundtracer.xyz https://fundtracer.xyz",
        "media-src 'self' data:",
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
    },
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('react') || id.includes('react-dom')) return 'vendor';
          if (id.includes('firebase')) return 'firebase';
          if (id.includes('react-router') || id.includes('react-router-dom')) return 'router';
          if (id.includes('chart') || id.includes('lightweight-charts')) return 'charts';
          if (id.includes('jspdf') || id.includes('html2canvas')) return 'pdf';
        },
      },
    },
    reportCompressedSize: false,
    cssCodeSplit: true,
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2020',
    },
  },
});
