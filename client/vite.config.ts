import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const isBuild = process.argv.includes("build");

// https://vite.dev/config/
export default defineConfig({
  cacheDir: isBuild ? ".vite-cache/build" : `.vite-cache/dev-${Date.now()}`,
  build: {
    emptyOutDir: false,
  },
  plugins: [react()],
  server: {
    allowedHosts: [
      "demetrice-atomistical-georgene.ngrok-free.dev",
      "hesitant-aerobics-striving.ngrok-free.dev",
    ],
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    pool: 'threads',
  },
})
