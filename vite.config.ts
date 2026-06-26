import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { VitePWA } from 'vite-plugin-pwa';

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const productionEnv = mode === 'capacitor' ? loadEnv('production', process.cwd(), '') : {};
  const isTauriBuild = Boolean(process.env.TAURI_ENV_PLATFORM);
  const isCapacitorBuild = mode === 'capacitor';
  const appBase = isTauriBuild ? '/' : isCapacitorBuild ? './' : mode === 'production' ? '/julong/' : '/';

  process.env = {
    ...process.env,
    ...productionEnv,
    ...env,
  };

  return {
    base: appBase,
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      sourcemap: 'hidden',
      target: isTauriBuild ? 'es2021' : 'es2020',
      minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-lucide': ['lucide-react'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-xlsx': ['xlsx'],
            'vendor-pdfjs': ['pdfjs-dist'],
            'vendor-mammoth': ['mammoth'],
            'vendor-mammoth-deps': ['underscore', 'bluebird', 'jszip', 'lop', 'dingbat-to-unicode'],
            'vendor-jspdf': ['jspdf'],
            'vendor-html2canvas': ['html2canvas'],
            'vendor-docx': ['docx'],
            'vendor-tesseract': ['tesseract.js'],
          },
        },
      },
    },
    clearScreen: false,
    server: {
      port: 5173,
      strictPort: true,
      host: host || false,
      hmr: host
        ? {
            protocol: 'ws',
            host,
            port: 5174,
          }
        : undefined,
      watch: {
        ignored: ['**/src-tauri/**'],
      },
    },
    plugins: [
      react({
        babel: {
          plugins: ['react-dev-locator'],
        },
      }),
      tsconfigPaths(),
      ...(!isCapacitorBuild
        ? [
            VitePWA({
              registerType: 'autoUpdate',
              includeAssets: ['favicon.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
              manifestFilename: 'manifest.webmanifest',
              manifest: {
                name: '聚隆科技 - 产品牌号解析系统',
                short_name: '聚隆科技',
                description: '产品牌号解析、报价单管理、发货记录',
                theme_color: '#D97706',
                background_color: '#F8F9FA',
                display: 'standalone',
                orientation: 'portrait',
                start_url: appBase,
                scope: appBase,
                categories: ['business', 'productivity'],
                icons: [
                  {
                    src: 'pwa-192x192.png',
                    sizes: '192x192',
                    type: 'image/png',
                  },
                  {
                    src: 'pwa-512x512.png',
                    sizes: '512x512',
                    type: 'image/png',
                  },
                  {
                    src: 'pwa-512x512.png',
                    sizes: '512x512',
                    type: 'image/png',
                    purpose: 'any maskable',
                  },
                ],
              },
              workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webmanifest}'],
                runtimeCaching: [
                  {
                    urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                    handler: 'CacheFirst',
                    options: {
                      cacheName: 'google-fonts-cache',
                      expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                    },
                  },
                  {
                    urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                    handler: 'CacheFirst',
                    options: {
                      cacheName: 'gstatic-fonts-cache',
                      expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                    },
                  },
                ],
              },
            }),
          ]
        : []),
    ],
  };
});
