import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root: __dirname,
  base: './',
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'ui'),
      'highlight.js': path.resolve(__dirname, 'node_modules/highlight.js/lib/index.js')
    },
    dedupe: ['vue', 'highlight.js']
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    commonjsOptions: {
      include: [/highlight\.js/, /node_modules/]
    }
  },
  optimizeDeps: {
    include: ['highlight.js', '@edward-dev/editor-markdown-vue > highlight.js'],
    needsInterop: ['highlight.js']
  }
})
