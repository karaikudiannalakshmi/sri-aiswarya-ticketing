import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'Sri Aishwarya Lakshmi Temple Ticketing',
        short_name: 'SAL Ticketing',
        description: 'Ticket and donation issuing system for Sri Aishwarya Lakshmi Temple, Colombo',
        theme_color: '#7A1F2B',
        background_color: '#FFF8E7',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      // Precache the app shell (HTML/JS/CSS/font) so the app still opens
      // (though it needs network for Firestore/printing to actually work)
      // even on a flaky connection, and so repeat opens are instant.
      workbox: {
        globPatterns: ['**/*.{js,css,html,ttf,png,svg}'],
        // Never cache Firebase/Firestore requests - always hit the network
        // so ticket sales, prices, and totals are always current.
        navigateFallbackDenylist: [/^\/__/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.hostname.includes('firestore') || url.hostname.includes('googleapis'),
            handler: 'NetworkOnly'
          }
        ]
      }
    })
  ],
  server: {
    host: true // allows testing from a phone on the same wifi during dev
  }
})
