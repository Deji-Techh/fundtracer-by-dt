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
                    'appkit': ['@reown/appkit', '@reown/appkit-adapter-ethers'],
                },
            },
        },
    },
    optimizeDeps: {
        include: [
            '@reown/appkit',
            '@reown/appkit-adapter-ethers',
            '@reown/appkit/networks',
            '@walletconnect/universal-provider',
            'ethers',
        ],
        esbuildOptions: {
            target: 'es2020',
        },
    },
});
