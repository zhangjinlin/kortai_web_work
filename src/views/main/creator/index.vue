<template>
  <div class="creator-page">
    <!-- 标题栏 -->
    <div class="creator-header">
      <h2 class="creator-title">生成结果</h2>
      <button class="btn btn-default btn-sm" @click="handleRefresh" :disabled="store.isRefreshing">
        {{ store.isRefreshing ? '刷新中...' : '刷新' }}
      </button>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <button
        v-for="tab in filterTabs"
        :key="tab.key"
        :class="['filter-tab', { active: store.filterType === tab.key }]"
        @click="store.setFilter(tab.key)"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- 加载中 -->
    <div v-if="store.layoutState === 'loading'" class="state-box">
      <span class="spinner"></span>
      <span>加载中...</span>
    </div>

    <!-- 空状态 -->
    <div v-else-if="store.layoutState === 'empty'" class="state-box">
      <div class="empty-icon">📭</div>
      <p class="empty-text">暂无生成记录</p>
      <p class="empty-hint">去首页开始创作吧</p>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="store.layoutState === 'error'" class="state-box">
      <p class="error-text">加载失败</p>
      <button class="btn btn-primary btn-sm" @click="handleRefresh">重试</button>
    </div>

    <!-- 历史列表 -->
    <div v-else class="history-grid">
      <div
        v-for="item in store.filteredList"
        :key="item.items?.[0]?.taskId || Math.random()"
        class="history-card"
      >
        <!-- 缩略图 -->
        <div class="card-media" @click="previewItem(item)">
          <template v-if="isVideo(item)">
            <img
              v-if="coverUrl(item) && !coverFail(item)"
              :src="coverUrl(item)"
              class="card-img"
              alt="视频封面"
              loading="lazy"
              referrerpolicy="no-referrer"
              @error="onImgError"
            />
            <!-- 封面加载失败或无封面 -->
            <div v-else class="card-video-placeholder">
              <span class="video-icon">▶</span>
            </div>
            <span class="media-badge video-badge">视频</span>
          </template>
          <template v-else>
            <img
              v-if="resultUrl(item) && !imageFail(item)"
              :src="resultUrl(item)"
              class="card-img"
              alt="生成结果"
              loading="lazy"
              referrerpolicy="no-referrer"
              @error="onImgError"
            />
            <div v-else class="card-img-placeholder">
              <span>{{ imageFail(item) ? '加载失败' : '生成中...' }}</span>
            </div>
            <span class="media-badge image-badge">图片</span>
          </template>

          <!-- 下载按钮（悬浮显示，已完成的任务才显示） -->
          <button
            v-if="!isRunning(item) && !isFailed(item) && (resultUrl(item) || coverUrl(item))"
            class="download-btn"
            title="下载"
            @click.stop="handleDownload(item)"
          >
            ⬇
          </button>

          <!-- 状态标签 -->
          <span v-if="isRunning(item)" class="status-overlay">
            <span class="spinner-small"></span>
            {{ statusText(item) }}
          </span>
          <span v-else-if="isFailed(item)" class="status-overlay status-failed">
            {{ statusText(item) }}
          </span>
        </div>

        <!-- 信息 -->
        <div class="card-body">
          <!-- 模型信息 -->
          <div class="card-meta">
            <span class="model-tag">{{ item.modelName || item.model || '-' }}</span>
            <span class="agent-tag">{{ agentLabel(item.agent) }}</span>
            <span class="credits-tag">{{ item.credits || '-' }} 积分</span>
          </div>

          <!-- Task ID -->
          <div v-if="getTaskId(item)" class="card-taskid">
            <span class="taskid-label">TaskID:</span>
            <span class="taskid-text">{{ getTaskId(item) }}</span>
            <button
              class="taskid-copy"
              title="复制 TaskID"
              @click.stop="copyTaskId(getTaskId(item)!)"
            >
              {{ copiedId === getTaskId(item) ? '已复制' : '复制' }}
            </button>
          </div>

          <!-- prompt -->
          <p v-if="item.prompt" class="card-prompt">{{ item.prompt }}</p>

          <!-- 时间 -->
          <div class="card-footer">
            <span class="card-time">{{ formatTime(item.createdAt) }}</span>
            <div class="card-actions">
              <button
                class="action-btn"
                title="删除"
                @click.stop="handleDelete(item)"
              >
                🗑️
              </button>
              <button
                v-if="!isRunning(item)"
                class="action-btn action-btn-primary"
                title="重新生成"
                @click.stop="handleReGenerate(item)"
              >
                🔄
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 加载更多 -->
    <div v-if="store.layoutState === 'success' && store.isLoading" class="load-more">
      <span class="spinner-small"></span>
      <span>加载更多...</span>
    </div>

    <div v-if="store.layoutState === 'success' && !store.hasMore && store.filteredList.length > 0" class="no-more">
      没有更多了
    </div>

    <!-- 删除确认弹窗 -->
    <div v-if="deleteTarget" class="confirm-overlay" @click="deleteTarget = null">
      <div class="confirm-dialog" @click.stop>
        <p class="confirm-title">确认删除</p>
        <p class="confirm-msg">确定要删除这个生成记录吗？删除后不可恢复。</p>
        <div class="confirm-actions">
          <button class="btn btn-default" @click="deleteTarget = null">取消</button>
          <button class="btn btn-danger" @click="confirmDelete">确认删除</button>
        </div>
      </div>
    </div>

    <!-- 预览弹窗 -->
    <div v-if="previewData" class="preview-overlay" @click="previewData = null">
      <div class="preview-container" @click.stop>
        <button class="preview-close" @click="previewData = null">✕</button>
        <button class="preview-download" title="下载" @click="handleDownload(previewData)">
          ⬇ 下载
        </button>
        <video
          v-if="isVideo(previewData)"
          :src="resultUrl(previewData)"
          class="preview-video"
          controls
          autoplay
        />
        <img
          v-else
          :src="resultUrl(previewData)"
          class="preview-img"
          alt="预览"
          referrerpolicy="no-referrer"
        />
        <div class="preview-info">
          <p><strong>提示词：</strong>{{ previewData.prompt || '无' }}</p>
          <p><strong>模型：</strong>{{ previewData.modelName || previewData.model || '-' }}</p>
          <p><strong>智能体：</strong>{{ agentLabel(previewData.agent) }}</p>
          <p><strong>积分：</strong>{{ previewData.credits || '-' }}</p>
          <p><strong>时间：</strong>{{ formatTime(previewData.createdAt) }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useCreatorStore, isVideoAgent, isVideoByFileType } from '@/stores/creator'
import { TaskStatus, TaskStatusMessage, type TaskResultHistoryModel } from '@/api/index2'
import { showToast } from '@/utils/toast'
import { resProxy } from '@/utils/resUrl'

const store = useCreatorStore()
const previewData = ref<TaskResultHistoryModel | null>(null)
const deleteTarget = ref<TaskResultHistoryModel | null>(null)
const imgErrorSet = reactive(new Set<string>())
const copiedId = ref<string>('')
let scrollEl: HTMLElement | null = null

function onImgError(e: Event) {
  const img = e.target as HTMLImageElement
  const url = img.src
  console.warn('[Creator] 图片加载失败:', url)
  imgErrorSet.add(url)
}

function coverFail(item: TaskResultHistoryModel): boolean {
  const url = coverUrl(item)
  return !!url && imgErrorSet.has(url)
}

function imageFail(item: TaskResultHistoryModel): boolean {
  const url = resultUrl(item)
  return !!url && imgErrorSet.has(url)
}

const filterTabs: { key: 'all' | 'image' | 'video'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'image', label: '图片' },
  { key: 'video', label: '视频' },
]

// ========== 辅助方法 ==========

function isVideo(item: TaskResultHistoryModel): boolean {
  const sub = item.items?.[0]
  if (sub?.fileType) return isVideoByFileType(sub.fileType)
  return isVideoAgent(item.agent || '')
}

function resultUrl(item: TaskResultHistoryModel): string {
  return resProxy(item.items?.[0]?.resultUrl || '')
}

function coverUrl(item: TaskResultHistoryModel): string {
  return resProxy(item.items?.[0]?.coverUrl || '')
}

function isRunning(item: TaskResultHistoryModel): boolean {
  const status = item.items?.[0]?.taskStatus
  return status === TaskStatus.QUEUING || status === TaskStatus.PROCESSING
}

function isFailed(item: TaskResultHistoryModel): boolean {
  const status = item.items?.[0]?.taskStatus
  // status 0 是初始状态，不视为失败
  if (status === undefined || status === 0) return false
  return status !== TaskStatus.COMPLETED && status !== TaskStatus.QUEUING && status !== TaskStatus.PROCESSING
}

function statusText(item: TaskResultHistoryModel): string {
  const status = item.items?.[0]?.taskStatus
  if (status === undefined) return ''
  return TaskStatusMessage[status] || `状态码: ${status}`
}

function agentLabel(agent?: string): string {
  const map: Record<string, string> = {
    Text2Image: '文生图片',
    Image2Image: '图生图片',
    Text2Video: '文生视频',
    Image2Video: '图生视频',
    Frame2Video: '首尾帧生视频',
    Reference2Video: '参考生视频',
    MultiImage2Video: '多图生视频',
    MultiImage2Image: '多图生图片',
    VideoEdit: '视频编辑',
    VideoReplace: '视频替换',
  }
  return map[agent || ''] || agent || '-'
}

function formatTime(time?: string): string {
  if (!time) return '-'
  try {
    const d = new Date(time)
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const mins = String(d.getMinutes()).padStart(2, '0')
    return `${month}-${day} ${hours}:${mins}`
  } catch {
    return time
  }
}

function getTaskId(item: TaskResultHistoryModel): string {
  return item.items?.[0]?.taskId || ''
}

async function copyTaskId(taskId: string) {
  try {
    await navigator.clipboard.writeText(taskId)
    copiedId.value = taskId
    showToast('TaskID 已复制')
    setTimeout(() => {
      if (copiedId.value === taskId) {
        copiedId.value = ''
      }
    }, 1500)
  } catch {
    // fallback
    const ta = document.createElement('textarea')
    ta.value = taskId
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    copiedId.value = taskId
    showToast('TaskID 已复制')
    setTimeout(() => {
      if (copiedId.value === taskId) {
        copiedId.value = ''
      }
    }, 1500)
  }
}

// ========== 操作 ==========

function handleRefresh() {
  store.loadHistory(true)
}

function handleDelete(item: TaskResultHistoryModel) {
  deleteTarget.value = item
}

function confirmDelete() {
  if (deleteTarget.value) {
    store.deleteHistory(deleteTarget.value)
    deleteTarget.value = null
  }
}

function handleReGenerate(item: TaskResultHistoryModel) {
  store.reGenerate(item)
}

function previewItem(item: TaskResultHistoryModel) {
  const sub = item.items?.[0]
  if (!sub?.resultUrl && !sub?.coverUrl) return
  if (isRunning(item)) {
    showToast('任务还在生成中...')
    return
  }
  previewData.value = item
}

// ========== 下载 ==========
async function handleDownload(item: TaskResultHistoryModel | null) {
  if (!item) return
  const sub = item.items?.[0]
  if (!sub) return

  const isVideoFile = isVideo(item)
  // 原始 URL（用于提取文件名）
  const rawUrl = isVideoFile ? (sub.resultUrl || sub.coverUrl) : sub.resultUrl
  if (!rawUrl) return
  // 走代理的 URL（用于请求）
  const url = resProxy(rawUrl)

  try {
    showToast('下载中...')
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const blob = await res.blob()

    // 从原始 URL 提取文件名
    const urlPath = new URL(rawUrl).pathname
    let filename = urlPath.split('/').pop() || (isVideoFile ? 'video.mp4' : 'image.png')
    // 确保有正确扩展名
    if (!filename.includes('.')) {
      filename += isVideoFile ? '.mp4' : '.png'
    }

    // 触发下载
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
    console.error('[Creator] 下载失败:', url, e)
    // fallback：直接打开
    window.open(rawUrl, '_blank')
  }
}

// ========== 滚动加载更多 ==========
function onScroll() {
  if (store.isLoading || !store.hasMore || !scrollEl) return
  const scrollTop = scrollEl.scrollTop
  const clientHeight = scrollEl.clientHeight
  const scrollHeight = scrollEl.scrollHeight

  if (scrollTop + clientHeight >= scrollHeight - 200) {
    store.loadMore()
  }
}

onMounted(() => {
  store.loadHistory(true)
  // 真正的滚动容器是父级 .main-content，不是 window
  scrollEl = document.querySelector('.main-content')
  if (scrollEl) {
    scrollEl.addEventListener('scroll', onScroll, { passive: true })
  }
})

onUnmounted(() => {
  store.stopPolling()
  if (scrollEl) {
    scrollEl.removeEventListener('scroll', onScroll)
  }
})
</script>

<style scoped>
.creator-page {
  max-width: 1200px;
  margin: 0 auto;
}

/* 标题栏 */
.creator-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.creator-title {
  font-size: 22px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.btn-sm {
  padding: 4px 14px;
  font-size: 13px;
}

/* 筛选栏 */
.filter-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.filter-tab {
  padding: 6px 18px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  background: #fff;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-tab:hover {
  color: #1890ff;
  border-color: #1890ff;
}

.filter-tab.active {
  background: #1890ff;
  color: #fff;
  border-color: #1890ff;
}

/* 状态占位 */
.state-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  color: #999;
  gap: 12px;
  font-size: 14px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 8px;
}

.empty-text {
  font-size: 16px;
  color: #666;
  font-weight: 500;
}

.empty-hint {
  font-size: 13px;
  color: #bbb;
  margin: 0;
}

.error-text {
  color: #ff4d4f;
  font-size: 15px;
  margin: 0;
}

/* 历史卡片网格 */
.history-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

.history-card {
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.2s, transform 0.2s;
}

.history-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

/* 媒体区域 */
.card-media {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  background: #f5f5f5;
  cursor: pointer;
  overflow: hidden;
}

.card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-video-placeholder,
.card-img-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #bbb;
  font-size: 13px;
}

.card-video-placeholder {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
}

.video-icon {
  font-size: 32px;
  color: rgba(255, 255, 255, 0.6);
}

.media-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.video-badge {
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
}

.image-badge {
  background: rgba(255, 255, 255, 0.85);
  color: #333;
}

/* 下载按钮（卡片悬浮） */
.download-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s, background 0.2s;
}
.card-media:hover .download-btn {
  opacity: 1;
}
.download-btn:hover {
  background: rgba(0, 0, 0, 0.75);
}

.status-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 8px 12px;
  background: linear-gradient(transparent, rgba(24, 144, 255, 0.85));
  color: #fff;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-failed {
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.65));
}

/* 卡片信息 */
.card-body {
  padding: 10px 12px;
}

.card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 6px;
}

.model-tag {
  display: inline-block;
  padding: 1px 6px;
  background: #e6f7ff;
  color: #1890ff;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 500;
}

.agent-tag {
  display: inline-block;
  padding: 1px 6px;
  background: #f6ffed;
  color: #52c41a;
  border-radius: 3px;
  font-size: 11px;
}

.credits-tag {
  display: inline-block;
  padding: 1px 6px;
  background: #fff7e6;
  color: #fa8c16;
  border-radius: 3px;
  font-size: 11px;
  margin-left: auto;
}

/* Task ID */
.card-taskid {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 6px;
  font-size: 12px;
}

.taskid-label {
  color: #999;
  flex-shrink: 0;
}

.taskid-text {
  color: #999;
  font-family: monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.taskid-copy {
  flex-shrink: 0;
  padding: 1px 6px;
  border: 1px solid #d9d9d9;
  border-radius: 3px;
  background: #fff;
  color: #666;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.taskid-copy:hover {
  border-color: #1890ff;
  color: #1890ff;
}

.card-prompt {
  font-size: 13px;
  color: #555;
  line-height: 1.5;
  margin: 0 0 8px 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-time {
  font-size: 12px;
  color: #aaa;
}

.card-actions {
  display: flex;
  gap: 2px;
}

.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 2px 4px;
  opacity: 0.5;
  transition: opacity 0.2s;
}

.action-btn:hover {
  opacity: 1;
}

.action-btn-primary {
  font-size: 15px;
}

/* 加载更多 */
.load-more,
.no-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  gap: 8px;
  font-size: 13px;
  color: #999;
}

/* 删除确认弹窗 */
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.confirm-dialog {
  background: #fff;
  border-radius: 12px;
  padding: 28px 32px 20px;
  min-width: 360px;
  max-width: 420px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
}

.confirm-title {
  font-size: 17px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 10px;
}

.confirm-msg {
  font-size: 14px;
  color: #666;
  margin: 0 0 24px;
  line-height: 1.6;
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn-danger {
  background: #ff4d4f;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 8px 20px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-danger:hover {
  background: #e04345;
}

/* 预览弹窗 */
.preview-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 40px;
}

.preview-container {
  position: relative;
  background: #fff;
  border-radius: 12px;
  max-width: 780px;
  max-height: 90vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.preview-close {
  position: absolute;
  top: 10px;
  right: 14px;
  background: rgba(0, 0, 0, 0.5);
  border: none;
  color: #fff;
  font-size: 18px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-download {
  position: absolute;
  top: 10px;
  left: 14px;
  background: rgba(0, 0, 0, 0.5);
  border: none;
  color: #fff;
  font-size: 13px;
  padding: 4px 12px;
  border-radius: 14px;
  cursor: pointer;
  z-index: 1;
  transition: background 0.2s;
}
.preview-download:hover {
  background: #1890ff;
}

.preview-img,
.preview-video {
  width: 100%;
  max-height: 65vh;
  object-fit: contain;
  background: #000;
}

.preview-info {
  padding: 16px 20px;
  font-size: 13px;
  color: #555;
  line-height: 1.8;
}

.preview-info p {
  margin: 0;
}

/* Spinner */
.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid #e0e0e0;
  border-top-color: #1890ff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

.spinner-small {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 通用按钮 */
.btn {
  padding: 6px 16px;
  border-radius: 6px;
  border: 1px solid #d9d9d9;
  background: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:hover {
  border-color: #1890ff;
  color: #1890ff;
}

.btn-primary {
  background: #1890ff;
  color: #fff;
  border-color: #1890ff;
}

.btn-primary:hover {
  background: #40a9ff;
  border-color: #40a9ff;
}

.btn-default {
  background: #fff;
  color: #333;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
