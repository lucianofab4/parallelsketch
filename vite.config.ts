import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [react(), nodePolyfills()],
  server: {
    port: 5174,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
