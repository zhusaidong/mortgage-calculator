import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import {VitePWA} from 'vite-plugin-pwa'
import {viteSingleFile} from "vite-plugin-singlefile";

export default defineConfig(({mode}) => {
    const isSingle = mode === 'single'

    return {
        plugins: [
            vue(),
            // 只有 mode=single 才开启单文件插件
            ...(isSingle ? [
                viteSingleFile({
                    useRecommendedBuildConfig: true, // 默认true，推荐保留
                    removeViteModuleLoader: true
                })
            ] : [
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
            ])
        ],
        build: {
            // 单文件输出到 dist-single，避免覆盖普通dist
            outDir: isSingle ? 'dist-single' : 'dist'
        }
    }
})
