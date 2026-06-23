import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['@ulysse70/moteur'],
  },
  build: {
    commonjsOptions: {
      include: [/@ulysse70\/moteur/, /node_modules/],
    },
  },
})
