import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      'use-sync-external-store/shim/with-selector': 'use-sync-external-store/shim/with-selector.js'
    }
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'lucide-react',
      'recharts',
      'xlsx',
      'canvas-confetti'
    ]
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: false,
    watch: {
      ignored: [
        '**/.env*',
        '**/vite.config.*',
        '**/prisma/**',
        '**/dist-electron/**',
        '**/scratch/**',
        '**/backups/**'
      ]
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:9999',
        changeOrigin: true,
        secure: false
      },
      '/uploads': {
        target: 'http://127.0.0.1:9999',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
