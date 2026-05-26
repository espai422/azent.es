import { defineConfig } from 'vitest/config'
import viteReact from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [viteReact()],
  resolve: {
    alias: {
      '#': '/Users/andreugarcia/Documents/AZENT/azent-es/src',
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
  },
})
