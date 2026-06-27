import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const API_TARGET = 'https://script.google.com/macros/s/AKfycbxzsnN_MPNpbkpWFRwB7dDDNNn5Yh1qXHaiFKR76zBn9FzSciaR6Vagtu12e0gsY0Qc'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, '/exec'),
      },
    },
  },
})
