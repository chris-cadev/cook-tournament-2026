import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@backend': path.resolve(__dirname, 'backend/src'),
      '@': path.resolve(__dirname, 'frontend/src'),
    },
  },
  test: {
    include: ['backend/tests/**/*.test.ts', 'frontend/tests/**/*.{test.ts,test.tsx}'],
    environment: 'node',
    environmentMatchGlobs: [
      ['**/frontend/tests/**', 'jsdom'],
    ],
    setupFiles: ['frontend/tests/setup.ts'],
  },
})
