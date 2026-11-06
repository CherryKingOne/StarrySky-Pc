import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    // 让渲染进程读取项目根目录的 .env / .env.local
    envDir: resolve('.'),
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [vue()]
  }
})
