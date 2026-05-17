import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // Automatically updates in background, no annoying popups
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'robots.txt', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-96.png'],
      manifest: {
        name: 'Parley Delivery System',
        short_name: 'Parley',
        description: 'Route-based delivery collection system',
        theme_color: '#0c4a6e',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        categories: ['productivity', 'business'],
        shortcuts: [
          {
            name: 'View Bills',
            short_name: 'Bills',
            description: 'View assigned bills',
            url: '/dashboard',
            icons: [
              {
                src: '/icons/icon-96.png',
                sizes: '96x96',
                type: 'image/png'
              }
            ]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg}'],
        runtimeCaching: [
          {
            urlPattern: /\.(js|css)$/,
            handler: 'CacheFirst',
            options: { cacheName: 'static-cache' }
          },
          {
            urlPattern: /\.(woff|woff2|ttf|otf|eot)$/,
            handler: 'CacheFirst',
            options: { cacheName: 'font-cache' }
          }
          // Intentionally omitting Supabase URLs to prevent service worker conflicts 
          // with your custom IndexedDB offline syncing logic.
        ]
      }
    })
  ]
})