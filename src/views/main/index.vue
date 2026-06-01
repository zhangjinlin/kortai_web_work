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

    <div class="main-body">
      <!-- 侧边栏 -->
      <aside class="sidebar">
        <nav class="sidebar-nav">
          <router-link to="/main" class="nav-item" exact-active-class="active">
            <span class="nav-icon">🏠</span>
            <span class="nav-label">首页</span>
          </router-link>

          <div class="nav-group">
            <div class="nav-group-title">AI 图片生成</div>
            <router-link to="/main/text-to-image" class="nav-item" active-class="active">
              <span class="nav-icon">🖼️</span>
              <span class="nav-label">文生图片</span>
            </router-link>
            <router-link to="/main/image-to-image" class="nav-item" active-class="active">
              <span class="nav-icon">🎨</span>
              <span class="nav-label">图生图片</span>
            </router-link>
          </div>

          <div class="nav-group">
            <div class="nav-group-title">AI 视频生成</div>
            <router-link to="/main/text-to-video" class="nav-item" active-class="active">
              <span class="nav-icon">📝</span>
              <span class="nav-label">文生视频</span>
            </router-link>
            <router-link to="/main/image-to-video" class="nav-item" active-class="active">
              <span class="nav-icon">🎬</span>
              <span class="nav-label">图生视频</span>
            </router-link>
            <router-link to="/main/frame-to-video" class="nav-item" active-class="active">
              <span class="nav-icon">🎞️</span>
              <span class="nav-label">首尾帧生视频</span>
            </router-link>
            <router-link to="/main/reference-video" class="nav-item" active-class="active">
              <span class="nav-icon">📹</span>
              <span class="nav-label">参考生视频</span>
            </router-link>
          </div>

          <div class="nav-group">
            <div class="nav-group-title">记录</div>
            <router-link to="/main/creator" class="nav-item" active-class="active">
              <span class="nav-icon">📋</span>
              <span class="nav-label">生成结果</span>
            </router-link>
          </div>
        </nav>
      </aside>

      <!-- 内容区域 -->
      <main class="main-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToolStore } from '@/stores/tool'
import { api } from '@/api/index2'
import { showToast } from '@/utils/toast'

const router = useRouter()
const userStore = useUserStore()
const toolStore = useToolStore()

onMounted(() => {
  toolStore.fetchConfig()
})

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

.main-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* 侧边栏 */
.sidebar {
  width: 220px;
  background: #fff;
  border-right: 1px solid #e8e8e8;
  overflow-y: auto;
  flex-shrink: 0;
}

.sidebar-nav {
  padding: 12px 0;
}

.nav-group {
  margin-top: 8px;
}

.nav-group-title {
  padding: 8px 20px 4px;
  font-size: 11px;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px;
  color: #555;
  text-decoration: none;
  font-size: 14px;
  transition: all 0.15s;
  border-left: 3px solid transparent;
}

.nav-item:hover {
  background: #f5f7fa;
  color: #1890ff;
}

.nav-item.active {
  background: #e6f7ff;
  color: #1890ff;
  border-left-color: #1890ff;
  font-weight: 500;
}

.nav-icon {
  font-size: 16px;
  width: 20px;
  text-align: center;
}

.nav-label {
  white-space: nowrap;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background: #f0f2f5;
}
</style>
