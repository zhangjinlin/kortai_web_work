<template>
  <div class="home-page">
    <div class="welcome-container">
      <div class="welcome-icon">
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#1890ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"/>
        </svg>
      </div>
      <h1 class="welcome-title">欢迎使用 Kort AI 工作台</h1>
      <p class="welcome-desc">登录成功，请开始你的工作</p>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.home-page {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: calc(100vh - 104px);
}

.welcome-container {
  text-align: center;
  padding: 60px 40px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.welcome-icon {
  margin-bottom: 24px;
}

.welcome-title {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}

.welcome-desc {
  font-size: 16px;
  color: #999;
}
</style>
