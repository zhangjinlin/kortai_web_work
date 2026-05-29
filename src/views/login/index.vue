<template>
  <div class="login-page">
    <!-- 正式环境警告条 -->
    <div v-if="isProd" class="prod-warning">
      <span>⚠️ 现在是正式环境，修改数据，请小心修改</span>
    </div>

    <div class="login-card">
      <div class="login-header">
        <div class="logo">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#1890ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <h1>欢迎登录</h1>
        <p class="subtitle">Kort AI 工作台</p>

        <!-- 环境切换 -->
        <div class="env-switch">
          <span class="env-label">环境:</span>
          <button
            :class="['env-btn', { active: currentEnv === 'test' }]"
            @click="handleEnvSwitch('test')"
          >
            测试
          </button>
          <button
            :class="['env-btn', { active: currentEnv === 'prod' }]"
            @click="handleEnvSwitch('prod')"
          >
            正式
          </button>
        </div>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-item">
          <label>电子邮箱</label>
          <input
            v-model="email"
            type="email"
            class="input"
            placeholder="请输入邮箱地址"
            required
          />
        </div>

        <div class="form-item">
          <label>密码</label>
          <input
            v-model="password"
            type="password"
            class="input"
            placeholder="请输入密码"
            maxlength="20"
            required
          />
        </div>

        <div class="error-message" v-if="errorMsg">
          {{ errorMsg }}
        </div>

        <button type="submit" class="btn btn-primary login-btn" :disabled="loading">
          {{ loading ? '登录中...' : '登 录' }}
        </button>

        <button 
          v-if="isLoggedIn" 
          type="button" 
          class="btn btn-default logout-btn" 
          @click="handleLogout"
          :disabled="logoutLoading"
        >
          {{ logoutLoading ? '退出中...' : '退出登录' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { api } from '@/api/index2'
import { showToast } from '@/utils/toast'
import { getCurrentEnv, switchEnv, type EnvType } from '@/utils/env'

const router = useRouter()
const userStore = useUserStore()

const email = ref('')
const password = ref('')
const errorMsg = ref('')
const loading = ref(false)
const logoutLoading = ref(false)

// 当前环境
const currentEnv = ref<EnvType>(getCurrentEnv())
const isProd = computed(() => currentEnv.value === 'prod')

// 初始化
onMounted(() => {
  currentEnv.value = getCurrentEnv()
})

// 切换环境
const handleEnvSwitch = (env: EnvType) => {
  if (env === currentEnv.value) return

  // 切换环境
  currentEnv.value = env
  switchEnv(env)

  // 刷新页面以应用新环境
  window.location.reload()
}

// 检查是否已登录（通过 Cookie 中的 token）
const isLoggedIn = ref(!!userStore.accessToken)

const handleLogout = async () => {
  logoutLoading.value = true
  try {
    await api.logout()
  } catch (e) {
    // 即使接口失败也清除本地状态
  } finally {
    // 清除本地存储
    userStore.clearToken()
    // 清除 Cookie
    document.cookie = 'USER_STORE=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    isLoggedIn.value = false
    showToast('已退出登录')
    logoutLoading.value = false
  }
}

const handleLogin = async () => {
  errorMsg.value = ''

  // 限制只有特定账号才能登录
  if (email.value !== '421377983@qq.com') {
    errorMsg.value = '该账号没有登录权限'
    return
  }

  if (!email.value.includes('@') || password.value.length < 6) {
    errorMsg.value = '邮箱或密码错误'
    return
  }

  loading.value = true
  try {
    const res = await api.login(email.value, password.value)
    console.log('登录页面收到 res:', res)
    
    // 兼容两种响应格式：
    // 1. 标准格式: {code: 200, data: {accessToken: '...'}}
    // 2. 直接返回: {accessToken: '...', refreshToken: '...'}
    const tokenData = (res.data || res) as any
    const token = tokenData?.accessToken || tokenData?.token || (res as any)?.accessToken || (res as any)?.token
    const userId = (res as any)?.userUid || tokenData?.userUid || ''

    if (token) {
      // 保存到 store
      userStore.setToken(token, userId)

      // 保存到 Cookie
      const userStoreData = {
        accessToken: token,
        userUid: userId
      }
      document.cookie = `USER_STORE=${encodeURIComponent(JSON.stringify(userStoreData))}; path=/`

      // 跳转主页
      router.push('/main')
    } else {
      errorMsg.value = '登录失败：未获取到 Token'
    }
  } catch (e: any) {
    console.error('登录请求异常:', e)
    errorMsg.value = e.message || '网络请求失败'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding-top: 60px;
}

/* 正式环境警告条 */
.prod-warning {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: linear-gradient(90deg, #ff4d4f, #ff7875);
  color: white;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  text-align: center;
  z-index: 1000;
  animation: pulse-warning 2s ease-in-out infinite;
}

@keyframes pulse-warning {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

.login-card {
  width: 450px;
  background: white;
  border-radius: 16px;
  padding: 48px 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.login-header {
  text-align: center;
  margin-bottom: 40px;
}

.logo {
  margin-bottom: 16px;
}

.login-header h1 {
  font-size: 28px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
}

.subtitle {
  color: #999;
  font-size: 14px;
}

/* 环境切换 */
.env-switch {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
}

.env-label {
  color: #666;
  font-size: 12px;
}

.env-btn {
  padding: 4px 16px;
  font-size: 12px;
  border-radius: 4px;
  border: 1px solid #d9d9d9;
  background: white;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.env-btn:hover {
  border-color: #1890ff;
  color: #1890ff;
}

.env-btn.active {
  background: #1890ff;
  border-color: #1890ff;
  color: white;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-item label {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.form-item .input {
  width: 100%;
  height: 44px;
  padding: 0 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.2s;
}

.form-item .input:focus {
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
  outline: none;
}

.error-message {
  color: #ff4d4f;
  font-size: 14px;
  text-align: center;
  padding: 8px;
  background: #fff2f0;
  border-radius: 4px;
}

.login-btn {
  width: 100%;
  height: 48px;
  font-size: 16px;
  border-radius: 8px;
  margin-top: 8px;
}

.login-btn:disabled {
  background-color: #d9d9d9;
  cursor: not-allowed;
}

.logout-btn {
  width: 100%;
  height: 40px;
  font-size: 14px;
  border-radius: 6px;
  margin-top: 8px;
  background: #f5f5f5;
  color: #666;
  border: 1px solid #d9d9d9;
}

.logout-btn:hover {
  background: #e5e5e5;
  color: #333;
}

.logout-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>
