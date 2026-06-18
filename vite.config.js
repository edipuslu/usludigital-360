import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash]-gpt5.js',
        chunkFileNames: 'assets/[name]-[hash]-gpt5.js',
        assetFileNames: 'assets/[name]-[hash]-gpt5[extname]',
      },
    },
  },
  server: {
    allowedHosts: ['prognosticatively-spectroscopic-isaiah.ngrok-free.dev', 'localhost'],
  },
})
