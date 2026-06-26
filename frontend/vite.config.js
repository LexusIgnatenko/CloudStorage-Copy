import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Если мы собираем проект (build), то используем /static/, если запускаем сервер разработки (dev) — /
  base: command === 'serve' ? '/' : '/static/',
  build: {
    manifest: true,
    outDir: path.resolve(__dirname, '../backend/myapp/static'),
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'src/main.jsx'),
    },
  },
  server: {
    port: 5173,
    host: '127.0.0.1', // Заставляет Vite работать на IPv4
    origin: 'http://127.0.0.1:5173',
    // port: 8000,
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
}))
