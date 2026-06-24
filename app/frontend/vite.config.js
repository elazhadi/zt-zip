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
    // Surveiller les fichiers du package moteur (symlink workspace) pour
    // invalider le cache de pré-compilation quand une gamme est ajoutée.
    watch: {
      ignored: ['!**/node_modules/@ulysse70/**'],
    },
  },
  optimizeDeps: {
    include: ['@ulysse70/moteur'],
  },
  build: {
    commonjsOptions: {
      // Le moteur est résolu via un symlink workspace : matcher son chemin réel.
      include: [/@ulysse70\/moteur/, /packages\/moteur/, /node_modules/],
    },
  },
})
