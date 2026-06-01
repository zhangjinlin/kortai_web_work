import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api, type TaskResultHistoryModel, TaskStatus } from '@/api/index2'
import { showToast } from '@/utils/toast'

/** 判断是否视频类型 */
export function isVideoAgent(agent: string): boolean {
  return ['Image2Video', 'Frame2Video', 'Text2Video', 'MultiImage2Video', 'Reference2Video', 'VideoEdit', 'VideoReplace'].includes(agent)
}

/** 根据 fileType 判断 */
export function isVideoByFileType(fileType?: string): boolean {
  return fileType === 'video' || fileType === 'mp4'
}

export type FilterType = 'all' | 'image' | 'video'

export const useCreatorStore = defineStore('creator', () => {
  // ========== 状态 ==========
  const list = ref<TaskResultHistoryModel[]>([])
  const pageNum = ref(1)
  const pageSize = 10
  const hasMore = ref(true)
  const isLoading = ref(false)
  const isRefreshing = ref(false)
  const filterType = ref<FilterType>('all')
  const layoutState = ref<'loading' | 'success' | 'empty' | 'error'>('loading')

  // 轮询中的 taskId
  const pollingTaskIds = ref<Set<string>>(new Set())
  let pollingTimer: ReturnType<typeof setInterval> | null = null

  // 本地缓存 key
  const CACHE_KEY = 'creator_history_cache'

  // ========== 计算属性 ==========
  const filteredList = computed(() => {
    if (filterType.value === 'all') return list.value
    return list.value.filter(item => {
      const agent = item.agent || ''
      const isVideo = isVideoAgent(agent)
      return filterType.value === 'video' ? isVideo : !isVideo
    })
  })

  // ========== 缓存 ==========
  function loadCache() {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        const data = JSON.parse(cached) as TaskResultHistoryModel[]
        if (data.length > 0) {
          list.value = data
          layoutState.value = 'success'
          // 检查是否有进行中的任务
          startPollingIfNeeded(data)
        }
      }
    } catch (e) {
      console.error('读取缓存失败:', e)
    }
  }

  function saveCache() {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(list.value))
    } catch (e) {
      console.error('缓存写入失败:', e)
    }
  }

  // ========== 加载历史 ==========
  async function loadHistory(isRefresh: boolean = false) {
    if (isLoading.value) return
    if (!isRefresh && !hasMore.value) return

    if (isRefresh) {
      isRefreshing.value = true
      pageNum.value = 1
    } else {
      isLoading.value = true
    }

    const typeParam = filterType.value === 'all' ? '' : filterType.value

    try {
      const res = await api.getCreatorHistory(pageNum.value, pageSize, typeParam)

      if (res.code === 200 && res.data) {
        const items = res.data.items || []

        if (isRefresh || pageNum.value === 1) {
          list.value = items
        } else {
          // 去重合并
          const existingIds = new Set(list.value.map(it => {
            const firstItem = it.items?.[0]
            return firstItem?.taskId ?? ''
          }))
          const newItems = items.filter(it => {
            const firstItem = it.items?.[0]
            return !existingIds.has(firstItem?.taskId ?? '')
          })
          list.value = [...list.value, ...newItems]
        }

        hasMore.value = items.length >= pageSize
        layoutState.value = list.value.length > 0 ? 'success' : 'empty'

        // 首页数据缓存
        if (pageNum.value === 1) {
          saveCache()
        }

        pageNum.value++

        // 轮询进行中的任务
        startPollingIfNeeded(items)
      } else {
        if (pageNum.value === 1) {
          layoutState.value = 'empty'
        }
      }
    } catch (e) {
      console.error('加载历史记录失败:', e)
      if (pageNum.value === 1 && list.value.length === 0) {
        layoutState.value = 'error'
      }
    } finally {
      isLoading.value = false
      isRefreshing.value = false
    }
  }

  // 加载更多
  async function loadMore() {
    if (isLoading.value || !hasMore.value) return
    await loadHistory(false)
  }

  // ========== 设置筛选 ==========
  function setFilter(type: FilterType) {
    if (filterType.value === type) return
    filterType.value = type
    pageNum.value = 1
    hasMore.value = true
    layoutState.value = 'loading'
    loadHistory(true)
  }

  // ========== 删除历史 ==========
  async function deleteHistory(item: TaskResultHistoryModel) {
    const taskId = item.items?.[0]?.taskId
    if (!taskId) return

    try {
      const res = await api.batchDeleteTasks([taskId])
      if (res.code === 200) {
        list.value = list.value.filter(it => {
          const id = it.items?.[0]?.taskId
          return id !== taskId
        })
        saveCache()
        showToast('已删除')
      } else {
        showToast(res.message || '删除失败')
      }
    } catch (e) {
      console.error('删除失败:', e)
      showToast('删除失败')
    }
  }

  // ========== 重新生成 ==========
  async function reGenerate(item: TaskResultHistoryModel) {
    try {
      const params: Record<string, any> = {
        agent: item.agent,
        model: item.model,
        modelType: item.modelType,
        modelName: item.modelName,
        prompt: item.prompt || '',
        credits: item.credits || 10,
      }
      if (item.imageUrls?.length) {
        params.imageUrls = [...item.imageUrls]
      }
      if (item.aspectRatio) params.aspectRatio = item.aspectRatio
      if (item.resolution) params.resolution = item.resolution
      if (item.quality) params.quality = item.quality

      const res = await api.createTask(params)
      if (res.code === 200) {
        showToast('重新生成任务已创建')
        loadHistory(true)
      } else {
        showToast(res.message || '创建失败')
      }
    } catch (e) {
      console.error('重新生成失败:', e)
      showToast('重新生成失败')
    }
  }

  // ========== 轮询进行中的任务 ==========
  function startPollingIfNeeded(items: TaskResultHistoryModel[]) {
    for (const item of items) {
      const subItem = item.items?.[0]
      if (subItem) {
        const status = subItem.taskStatus
        if ((status === TaskStatus.QUEUING || status === TaskStatus.PROCESSING) && subItem.taskId) {
          pollingTaskIds.value.add(subItem.taskId)
        }
      }
    }
    if (pollingTaskIds.value.size > 0) {
      startPolling()
    }
  }

  function startPolling() {
    stopPolling()
    pollingTimer = setInterval(async () => {
      if (pollingTaskIds.value.size === 0) {
        stopPolling()
        return
      }

      try {
        const ids = Array.from(pollingTaskIds.value)
        let hasCompleted = false

        // 逐个查询（batchGet 服务端不可用，改用 getTaskResult）
        for (const taskId of ids) {
          try {
            const res = await api.getTaskResult(taskId)
            if (res.code === 200 && res.data) {
              const status = res.data.taskStatus
              if (status !== TaskStatus.QUEUING && status !== TaskStatus.PROCESSING) {
                pollingTaskIds.value.delete(taskId)
                hasCompleted = true
              }

              // 更新列表中的状态
              for (const item of list.value) {
                const sub = item.items?.[0]
                if (sub?.taskId === taskId) {
                  sub.taskStatus = status
                  sub.resultUrl = res.data.resultUrl
                  sub.coverUrl = res.data.coverUrl
                  sub.fileType = res.data.fileType
                  break
                }
              }
            }
          } catch {
            // 单个查询失败，跳过
          }
        }

        if (hasCompleted) {
          saveCache()
        }
      } catch (e) {
        console.error('轮询任务状态失败:', e)
      }
    }, 3000)
  }

  function stopPolling() {
    if (pollingTimer) {
      clearInterval(pollingTimer)
      pollingTimer = null
    }
  }

  function reset() {
    stopPolling()
    list.value = []
    pageNum.value = 1
    hasMore.value = true
    pollingTaskIds.value = new Set()
    layoutState.value = 'loading'
  }

  // 初始化时加载缓存
  loadCache()

  return {
    // 状态
    list,
    filteredList,
    pageNum,
    hasMore,
    isLoading,
    isRefreshing,
    filterType,
    layoutState,
    pollingTaskIds,
    // 方法
    loadHistory,
    loadMore,
    setFilter,
    deleteHistory,
    reGenerate,
    reset,
    stopPolling,
  }
})
