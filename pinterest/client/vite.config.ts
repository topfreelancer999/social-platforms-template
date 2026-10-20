import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: {
    port: 5184,
    proxy: {
      '/api': { target: 'http://localhost:3012', changeOrigin: true },
      '/uploads': { target: 'http://localhost:3012', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:3012', ws: true },
    },
  },
})
