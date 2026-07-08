import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/chat": "http://localhost:3000",
      "/health": "http://localhost:3000",
      "/swap-model": "http://localhost:3000",
      "/swap-provider": "http://localhost:3000",
    },
  },
})
