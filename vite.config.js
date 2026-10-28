import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false, // 使用自维护的 public/manifest.json + <link rel="manifest">
      includeAssets: ['icon-192.png', 'icon-512.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,json}'],
        navigateFallback: null,
        cleanupOutdatedCaches: true
      }
    })
  ]
})
