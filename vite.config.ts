import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': import.meta.dirname + '/src' },
  },
  server: {
    port: 8443,
    proxy: {
      // API do agente (agente/agents): uvicorn api.main:app --port 8000
      '/api': 'http://localhost:8000',
    },
  },
})
