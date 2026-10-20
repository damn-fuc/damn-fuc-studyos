import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const projectRoot = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  base: '/studyos/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(projectRoot, 'src'),
    },
  },
})
