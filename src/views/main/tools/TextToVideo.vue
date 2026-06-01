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
        <label class="form-label">描述你的想法</label>
        <textarea v-model="store.prompt" class="prompt-input" rows="4" placeholder="请输入你想要生成的视频描述..."></textarea>
        <div v-if="store.selectedModel?.hints?.length" class="hints-section">
          <span class="hints-label">试试这些：</span>
          <button v-for="(hint, i) in store.selectedModel.hints.slice(0, 5)" :key="i" class="hint-btn" @click="store.prompt = hint.prompt?.zh || hint.prompt?.en || ''">
            {{ hint.title?.zh || hint.title?.en || '' }}
          </button>
        </div>
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
        <button class="submit-btn" :disabled="store.isProcessing || !store.prompt.trim()" @click="onSubmit">
          <span v-if="store.isProcessing" class="spinner-small"></span>
          {{ store.isProcessing ? '生成中...' : `开始生成 (${store.selectedModel?.credits || 0} 积分)` }}
        </button>
      </div>

      <div v-if="store.taskId || store.taskResult" class="result-section">
        <div class="result-header">
          <h3>生成结果</h3>
          <span :class="['status-badge', statusClass]">{{ store.taskStatusText }}</span>
        </div>
        <div v-if="store.taskStatus === 1 || store.taskStatus === 2" class="progress-bar"><div class="progress-inner"></div></div>
        <div v-if="store.taskResult?.resultUrl || store.taskResult?.videoUrl" class="result-content">
          <video v-if="store.taskResult.resultUrl || store.taskResult.videoUrl" :src="store.taskResult.resultUrl || store.taskResult.videoUrl" controls class="result-video"></video>
          <div class="result-actions">
            <a :href="store.taskResult.resultUrl || store.taskResult.videoUrl" target="_blank" class="btn btn-primary">下载视频</a>
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

const { store, config, onSubmit } = useToolPage('textToVideo')

const statusClass = computed(() => {
  if (store.taskStatus === TaskStatus.COMPLETED) return 'status-success'
  if (store.taskStatus === TaskStatus.QUEUING || store.taskStatus === TaskStatus.PROCESSING) return 'status-processing'
  return 'status-error'
})

function handleSelectModel(index: number) {
  store.selectModel(index)
}
</script>

<style>
@import './tool-common.css';
</style>
