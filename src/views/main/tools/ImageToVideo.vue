<template>
  <div class="tool-page">
    <div class="tool-header">
      <h2 class="tool-title">{{ config.icon }} {{ config.name }}</h2>
      <p class="tool-desc">{{ config.desc }}</p>
    </div>

    <div class="tool-body">
      <div class="form-section">
        <label class="form-label">选择模型</label>
        <div class="model-list">
          <div v-if="store.configLoading" class="model-loading">
            <span class="spinner-small" style="border-color: #e0e0e0; border-top-color: #1890ff;"></span>
            <span>正在加载模型列表...</span>
          </div>
          <div v-else-if="store.availableModels.length === 0" class="model-empty">
            <span>暂无可用模型</span>
            <button class="btn btn-default" style="margin-left:12px" @click="store.fetchConfig()">重新加载</button>
          </div>
          <button v-for="(model, index) in store.availableModels" :key="model.model" :class="['model-item', { active: store.selectedModelIndex === index }]" @click.prevent="handleSelectModel(index)">
            <span class="model-name">{{ model.name }}</span>
            <span class="model-credits">{{ model.credits }} 积分</span>
          </button>
        </div>
        <div v-if="store.selectedModel" class="model-info">
          当前模型：<strong>{{ store.selectedModel.name }}</strong>
        </div>
      </div>

      <div class="form-section">
        <label class="form-label">上传图片（最多 {{ config.maxImages }} 张）</label>
        <div :class="['upload-area', { 'drag-over': dragOver }]" @dragover="onDragOver" @dragleave="onDragLeave" @drop="onDrop" @click="triggerImageUpload">
          <input ref="imageInput" type="file" accept="image/*,.webp" multiple hidden @change="onImageInputChange" />
          <div class="upload-hint"><span class="upload-icon">📁</span><span>拖拽图片到此处或点击上传</span><span class="upload-sub">支持 JPG、PNG、WebP 格式</span></div>
          <div v-if="store.uploading" class="upload-loading-overlay">
            <span class="upload-spinner"></span>
            <span class="upload-loading-text">正在上传...</span>
          </div>
        </div>
        <div v-if="store.uploadedUrls.length > 0" class="image-list">
          <div v-for="(url, i) in store.uploadedUrls" :key="i" class="image-item">
            <img :src="resProxy(url)" class="thumb" referrerpolicy="no-referrer" />
            <button class="remove-btn" @click="store.removeImage(i)">✕</button>
          </div>
          <div v-if="store.uploading" class="image-item uploading">
            <span class="spinner-small"></span>
          </div>
        </div>
      </div>

      <div class="form-section">
        <label class="form-label">描述（可选）</label>
        <textarea v-model="store.prompt" class="prompt-input" rows="4" placeholder="输入描述来引导生成方向（可选）..."></textarea>
      </div>

      <div v-if="store.currentModelParams.length > 0" class="form-section">
        <label class="form-label">参数设置</label>
        <div class="param-grid">
          <div v-for="param in store.currentModelParams" :key="param.paramName" class="param-item">
            <span class="param-label">{{ param.displayName }}</span>
            <div class="param-options">
              <button v-for="val in param.values" :key="val" :class="['param-btn', { active: store.selectedParams[param.paramName] === val }]" @click="store.setParam(param.paramName, val)">{{ val }}</button>
            </div>
          </div>
        </div>
      </div>

      <div class="form-section">
        <button class="submit-btn" :disabled="store.isProcessing || (!store.prompt.trim() && store.uploadedUrls.length === 0)" @click="onSubmit">
          <span v-if="store.isProcessing" class="spinner-small"></span>
          {{ store.isProcessing ? '生成中...' : `开始生成 (${store.selectedModel?.credits || 0} 积分)` }}
        </button>
      </div>

      <div v-if="store.taskId || store.taskResult" class="result-section">
        <div class="result-header"><h3>生成结果</h3><span :class="['status-badge', statusClass]">{{ store.taskStatusText }}</span></div>
        <div v-if="store.taskStatus === 1 || store.taskStatus === 2" class="progress-bar"><div class="progress-inner"></div></div>
        <div v-if="store.taskResult?.resultUrl || store.taskResult?.videoUrl" class="result-content">
          <video v-if="store.taskResult.resultUrl || store.taskResult.videoUrl" :src="resProxy(store.taskResult.resultUrl || store.taskResult.videoUrl)" controls class="result-video"></video>
          <div class="result-actions">
            <button class="btn btn-primary" @click="handleDownloadVideo">下载视频</button>
            <button class="btn btn-default" @click="store.resetTask()">重新生成</button>
          </div>
        </div>
        <div v-if="store.taskStatus > 2 && store.taskStatus !== 22 && store.taskResult" class="error-info">
          <p>生成失败（状态码: {{ store.taskStatus }}），请重试</p>
          <button class="btn btn-default" @click="store.resetTask()">重新生成</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useToolPage } from '@/composables/useToolPage'
import { TaskStatus } from '@/api/index2'
import { showToast } from '@/utils/toast'
import { resProxy } from '@/utils/resUrl'

const { store, config, imageInput, dragOver, onDragOver, onDragLeave, onDrop, triggerImageUpload, onImageInputChange, onSubmit } = useToolPage('imageToVideo')

const statusClass = computed(() => {
  if (store.taskStatus === TaskStatus.COMPLETED) return 'status-success'
  if (store.taskStatus === TaskStatus.QUEUING || store.taskStatus === TaskStatus.PROCESSING) return 'status-processing'
  return 'status-error'
})

function handleSelectModel(index: number) {
  store.selectModel(index)
}

async function handleDownloadVideo() {
  const rawUrl = store.taskResult?.resultUrl || store.taskResult?.videoUrl
  if (!rawUrl) return
  try {
    showToast('下载中...')
    const res = await fetch(resProxy(rawUrl))
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const blob = await res.blob()
    const filename = new URL(rawUrl).pathname.split('/').pop() || 'video.mp4'
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(blobUrl)
    showToast('下载完成')
  } catch (e) {
    console.error('下载失败:', e)
    window.open(rawUrl, '_blank')
  }
}
</script>

<style>
@import './tool-common.css';
</style>
