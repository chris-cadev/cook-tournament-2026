import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
process.loadEnvFile(path.resolve(__dirname, '../.env'))

const frontendPort = Number(process.env.PORT) || 3000
const backendPort = Number(process.env.BACKEND_PORT) || 3001

export default defineConfig({
  plugins: [react()],
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
