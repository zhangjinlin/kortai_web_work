import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 3001,
    open: true,
    proxy: {
      '/api': {
        target: 'https://api-test.kortai.info',
        changeOrigin: true,
        secure: false
      },
      // 代理图片资源，避免跨域/防盗链拦截
      '/res': {
        target: 'https://res.kortai.info',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/res/, '')
      }
    }
  }
})
