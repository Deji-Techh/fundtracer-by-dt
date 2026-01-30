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
        sourcemap: true,
        commonjsOptions: {
            transformMixedEsModules: true,
        },
        rollupOptions: {
            output: {
                manualChunks: {
                    'rainbowkit': ['@rainbow-me/rainbowkit', 'wagmi', 'viem'],
                },
            },
        },
    },
    optimizeDeps: {
        include: [
            '@rainbow-me/rainbowkit',
            'wagmi',
            'viem',
            'ethers',
        ],
        esbuildOptions: {
            target: 'es2020',
        },
    },
});
