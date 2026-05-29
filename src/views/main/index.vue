<template>
  <div class="main-layout">
    <!-- 顶部导航栏 -->
    <header class="main-header">
      <div class="header-left">
        <div class="header-logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#1890ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="header-title">Kort AI 工作台</span>
        </div>
      </div>
      <div class="header-right">
        <span class="user-info">admin@kortai.com</span>
        <button class="btn btn-default" @click="handleLogout">退出登录</button>
      </div>
    </header>

    <!-- 内容区域 -->
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { api } from '@/api/index2'
import { showToast } from '@/utils/toast'

const router = useRouter()
const userStore = useUserStore()

const handleLogout = async () => {
  try {
    await api.logout()
  } catch (e) {
    // 即使接口失败也清除本地状态
  } finally {
    userStore.clearToken()
    document.cookie = 'USER_STORE=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    showToast('已退出登录')
    router.push('/login')
  }
}
</script>

<style scoped>
.main-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f0f2f5;
}

.main-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 56px;
  padding: 0 24px;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  z-index: 100;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
}

.header-logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-info {
  font-size: 14px;
  color: #666;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}
</style>
