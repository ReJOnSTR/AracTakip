import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
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
