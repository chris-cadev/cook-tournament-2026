import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.resolve(__dirname, '../.env')
try {
  process.loadEnvFile(envPath)
} catch {
  // .env is optional — production uses environment variables
}

const frontendPort = Number(process.env.PORT) || 3000
const backendPort = Number(process.env.BACKEND_PORT) || 3001

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: frontendPort,
    proxy: {
      '/api': `http://localhost:${backendPort}`,
      '/socket.io': {
        target: `http://localhost:${backendPort}`,
        ws: true,
      },
    },
  },
})
