import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Quiz Platform',
        short_name: 'QuizApp',
        description: 'Test your knowledge and track your progress',
        theme_color: '#ffffff',
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
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 3000000
      }
    })
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        // Timeout adapted for both development and production
        // In production (Vercel), API calls are handled serverlessly with enforced timeouts
        // In development, we allow up to 5 minutes for AI generation
        timeout: process.env.NODE_ENV === 'production' ? 120000 : 300000,  // 2 min prod, 5 min dev
        proxyTimeout: process.env.NODE_ENV === 'production' ? 120000 : 300000,
      },
    },
  },
})
