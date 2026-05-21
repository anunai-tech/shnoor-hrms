import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    host: true,
    port: 5173,
    allowedHosts: [
      'shnoor.test',
      '.shnoor.test'   // the dot prefix means ALL subdomains are allowed
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: false,
        secure: false
      }
    }
  }
})