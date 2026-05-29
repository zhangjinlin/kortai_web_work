import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getCurrentEnv, isProdEnv, setCurrentEnv, type EnvType } from '@/utils/env'

export const useUserStore = defineStore('user', () => {
  const token = ref('')
  const userId = ref('')
  const isLogin = ref(false)

  // 当前环境
  const currentEnv = ref<EnvType>(getCurrentEnv())

  // 是否是正式环境
  const isProd = computed(() => isProdEnv())

  // 从 Cookie 获取 Token
  function getTokenFromCookie() {
    const cookies = document.cookie
    if (!cookies) return

    const cookieList = cookies.split('; ')
    for (const cookie of cookieList) {
      const parts = cookie.split('=')
        if (parts.length === 2 && parts[0] === 'USER_STORE') {
        try {
          const userStore = JSON.parse(decodeURIComponent(parts[1]))
          token.value = userStore.accessToken || userStore.token || ''
          userId.value = userStore.userUid || ''
          isLogin.value = !!token.value
        } catch (e) {
          console.error('解析 USER_STORE 失败:', e)
          token.value = ''
          userId.value = ''
          isLogin.value = false
        }
        break
      }
    }
  }

  // 设置 Token
  function setToken(newToken: string, newUserId: string) {
    token.value = newToken
    userId.value = newUserId
    isLogin.value = true
  }

  // 清除登录状态
  function logout() {
    token.value = ''
    userId.value = ''
    isLogin.value = false
    document.cookie = 'USER_STORE=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
  }

  // 别名：清除 Token
  function clearToken() {
    logout()
  }

  // 获取当前 token（兼容）
  function getAccessToken() {
    return token.value
  }

  // 切换环境
  function switchEnv(env: EnvType) {
    currentEnv.value = env
    setCurrentEnv(env)
  }

  // 初始化环境
  function initEnv() {
    currentEnv.value = getCurrentEnv()
  }

  return {
    token,
    userId,
    isLogin,
    currentEnv,
    isProd,
    getTokenFromCookie,
    setToken,
    logout,
    clearToken,
    accessToken: token,
    getAccessToken,
    switchEnv,
    initEnv
  }
})
