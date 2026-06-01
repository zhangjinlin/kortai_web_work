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
        <label class="form-label">上传参考图片（最多 {{ config.maxImages }} 张）</label>
        <div :class="['upload-area', { 'drag-over': dragOver }]" @dragover="onDragOver" @dragleave="onDragLeave" @drop="onDrop" @click="triggerImageUpload">
          <input ref="imageInput" type="file" accept="image/*,.webp" multiple hidden @change="onImageInputChange" />
          <div class="upload-hint"><span class="upload-icon">🖼️</span><span>拖拽图片到此处或点击上传</span><span class="upload-sub">支持 JPG、PNG、WebP 格式</span></div>
          <div v-if="store.uploading" class="upload-loading-overlay">
            <span class="upload-spinner"></span>
            <span class="upload-loading-text">正在上传...</span>
          </div>
        </div>
        <div v-if="store.uploadedUrls.length > 0" class="image-list">
          <div v-for="(url, i) in store.uploadedUrls" :key="i" class="image-item">
            <img :src="url" class="thumb" />
            <button class="remove-btn" @click="store.removeImage(i)">✕</button>
          </div>
          <div v-if="store.uploading" class="image-item uploading">
            <span class="spinner-small"></span>
          </div>
        </div>
      </div>

      <div class="form-section">
        <label class="form-label">描述你的想法</label>
        <div class="mention-input-wrapper">
          <!-- @mention 建议下拉 -->
          <div v-if="showMentions && mentionItems.length > 0" class="mention-dropdown">
            <div
              v-for="(item, idx) in mentionItems"
              :key="idx"
              :class="['mention-item', { active: mentionActiveIdx === idx }]"
              @mousedown.prevent="insertMention(item.index)"
            >
              <img :src="item.url" class="mention-thumb" />
              <span class="mention-label">@image{{ item.index }}</span>
            </div>
          </div>
          <textarea
            ref="promptTextarea"
            v-model="store.prompt"
            class="prompt-input"
            rows="4"
            placeholder="请输入描述，输入 @ 可引用已上传的图片"
            @input="onPromptInput"
            @keydown="onPromptKeydown"
          ></textarea>
        </div>
        <!-- 已引用的图片标签 -->
        <div v-if="activeMentions.length > 0" class="mention-tags">
          <span
            v-for="(m, idx) in activeMentions"
            :key="idx"
            class="mention-tag"
            @click="removeMentionTag(m.token)"
          >
            🖼️ {{ m.token }} ✕
          </span>
        </div>
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
        <button class="submit-btn" :disabled="store.isProcessing || (!store.prompt.trim() && store.uploadedUrls.length === 0)" @click="onSubmit">
          <span v-if="store.isProcessing" class="spinner-small"></span>
          {{ store.isProcessing ? '生成中...' : `开始生成 (${store.selectedModel?.credits || 0} 积分)` }}
        </button>
      </div>

      <div v-if="store.taskId || store.taskResult" class="result-section">
        <div class="result-header"><h3>生成结果</h3><span :class="['status-badge', statusClass]">{{ store.taskStatusText }}</span></div>
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
import { ref, computed } from 'vue'
import { useToolPage } from '@/composables/useToolPage'
import { TaskStatus } from '@/api/index2'

const { store, config, imageInput, dragOver, onDragOver, onDragLeave, onDrop, triggerImageUpload, onImageInputChange, onSubmit } = useToolPage('referenceVideo')

const statusClass = computed(() => {
  if (store.taskStatus === TaskStatus.COMPLETED) return 'status-success'
  if (store.taskStatus === TaskStatus.QUEUING || store.taskStatus === TaskStatus.PROCESSING) return 'status-processing'
  return 'status-error'
})

function handleSelectModel(index: number) {
  store.selectModel(index)
}

// ========== @mention 功能 ==========
const promptTextarea = ref<HTMLTextAreaElement | null>(null)
const showMentions = ref(false)
const mentionQuery = ref('')
const mentionActiveIdx = ref(0)
const mentionCursorPos = ref(0) // 记录 @ 在文本中的位置

// 可用图片列表（索引+url）
const mentionItems = computed(() => {
  if (!showMentions.value) return []
  const query = mentionQuery.value.toLowerCase()
  return store.uploadedUrls
    .map((url, i) => ({ url, index: i + 1 }))
    .filter(item => {
      if (!query) return true
      return `image${item.index}`.includes(query)
    })
})

// 当前 prompt 中活跃的 @imageN 引用
const activeMentions = computed(() => {
  const matches = store.prompt.match(/@image\d+/gi) || []
  return [...new Set(matches)].map(token => ({ token: token.toLowerCase() }))
})

function getCursorPosition(el: HTMLTextAreaElement): number {
  return el.selectionStart
}

function detectMention(text: string, cursorPos: number): { show: boolean; query: string; atPos: number } {
  const beforeCursor = text.slice(0, cursorPos)
  const atIdx = beforeCursor.lastIndexOf('@')
  if (atIdx === -1) return { show: false, query: '', atPos: -1 }

  // @ 前面不能是字母数字，确保是独立的 @
  if (atIdx > 0 && /[\w\u4e00-\u9fa5]/.test(beforeCursor[atIdx - 1])) {
    return { show: false, query: '', atPos: -1 }
  }

  const query = beforeCursor.slice(atIdx + 1)

  // 已经是完整的 @imageN（后面跟空格或结尾），不弹
  if (/^image\d+$/i.test(query)) {
    const afterCursor = text.slice(cursorPos)
    if (afterCursor.startsWith(' ') || afterCursor.length === 0 || afterCursor.startsWith('\n')) {
      return { show: false, query: '', atPos: -1 }
    }
  }

  // query 不含空格、换行
  if (query.includes(' ') || query.includes('\n') || query.length > 30) {
    return { show: false, query: '', atPos: -1 }
  }

  return { show: true, query, atPos: atIdx }
}

function onPromptInput() {
  const el = promptTextarea.value
  if (!el) return

  const cursorPos = getCursorPosition(el)
  const { show, query, atPos } = detectMention(store.prompt, cursorPos)

  showMentions.value = show && store.uploadedUrls.length > 0
  mentionQuery.value = query
  mentionCursorPos.value = atPos
  mentionActiveIdx.value = 0
}

function onPromptKeydown(e: KeyboardEvent) {
  if (!showMentions.value) return

  const items = mentionItems.value
  if (items.length === 0) return

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    mentionActiveIdx.value = (mentionActiveIdx.value + 1) % items.length
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    mentionActiveIdx.value = (mentionActiveIdx.value - 1 + items.length) % items.length
  } else if (e.key === 'Enter' || e.key === 'Tab') {
    e.preventDefault()
    const item = items[mentionActiveIdx.value]
    if (item) insertMention(item.index)
  } else if (e.key === 'Escape') {
    e.preventDefault()
    showMentions.value = false
  }
}

function insertMention(imageIndex: number) {
  const el = promptTextarea.value
  if (!el) return

  const atPos = mentionCursorPos.value
  const cursorPos = getCursorPosition(el)
  const beforeAt = store.prompt.slice(0, atPos)
  const afterCursor = store.prompt.slice(cursorPos)
  const mention = `@image${imageIndex} `

  const newText = beforeAt + mention + afterCursor
  store.prompt = newText
  showMentions.value = false
  mentionQuery.value = ''

  // 恢复光标位置到 mention 后面
  requestAnimationFrame(() => {
    const newCursor = beforeAt.length + mention.length
    el.setSelectionRange(newCursor, newCursor)
    el.focus()
  })
}

function removeMentionTag(token: string) {
  store.prompt = store.prompt
    .replace(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s?', 'gi'), '')
    .trim()
}
</script>

<style>
@import './tool-common.css';
</style>
