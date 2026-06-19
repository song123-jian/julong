import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import { VitePWA } from 'vite-plugin-pwa';

const host = process.env.TAURI_DEV_HOST;

// v8 修复：统一 base 计算，PWA manifest 引用此变量
const pwaBase = process.env.TAURI_ENV_PLATFORM ? '/' : (process.env.CAPACITOR_BUILD ? './' : (process.env.NODE_ENV === 'production' ? '/julong/' : '/'));

// https://vite.dev/config/
export default defineConfig({
  base: pwaBase,
  build: {
    sourcemap: 'hidden',
    target: process.env.TAURI_ENV_PLATFORM ? 'es2021' : 'es2020',
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    rollupOptions: {
      output: {
        manualChunks: {
          // React 核心 - 单独分包，浏览器缓存友好
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // UI 图标库 - 较大，独立分包
          'vendor-lucide': ['lucide-react'],
          // Supabase 数据库 - 按需加载
          'vendor-supabase': ['@supabase/supabase-js'],
        },
      },
    },
  },
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    host: host || false,
    hmr: host ? {
      protocol: "ws",
      host,
      port: 5174,
    } : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  plugins: [
    react({
      babel: {
        plugins: [
          'react-dev-locator',
        ],
      },
    }),
    tsconfigPaths(),
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
        start_url: pwaBase,
        scope: pwaBase,
        categories: ['business', 'productivity'],
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webmanifest}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          }
        ]
      }
    })
  ],
})
