import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // accessible depuis la tablette sur le réseau local
    proxy: {
      // En dev, /api est proxifié vers le backend Express.
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: ['@ulysse70/moteur'],
  },
  build: {
    commonjsOptions: {
      include: [/@ulysse70\/moteur/, /node_modules/],
    },
  },
})
