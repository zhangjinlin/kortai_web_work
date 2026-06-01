import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api, type SupportedModel, type ConfigDataModel, type TaskResultItem, TaskStatus, TaskStatusMessage } from '@/api/index2'
import { uploadFile } from '@/api/index2'
import { showToast } from '@/utils/toast'

// 工具类型定义
export type ToolType = 'textToImage' | 'imageToImage' | 'textToVideo' | 'imageToVideo' | 'frameToVideo' | 'referenceVideo'

export const ToolConfig: Record<ToolType, { name: string; agent: string; icon: string; needImage: boolean; maxImages: number; needVideo: boolean; desc: string }> = {
  textToImage: { name: '文生图片', agent: 'Text2Image', icon: '🖼️', needImage: false, maxImages: 0, needVideo: false, desc: '输入文字描述，AI 为你生成图片' },
  imageToImage: { name: '图生图片', agent: 'Image2Image', icon: '🎨', needImage: true, maxImages: 5, needVideo: false, desc: '上传一张或多张图片，AI 根据图片和描述生成新图片' },
  textToVideo: { name: '文生视频', agent: 'Text2Video', icon: '📝', needImage: false, maxImages: 0, needVideo: false, desc: '输入文字描述，AI 为你生成视频' },
  imageToVideo: { name: '图生视频', agent: 'Image2Video', icon: '🎬', needImage: true, maxImages: 5, needVideo: false, desc: '上传一张或多张图片，AI 根据图片生成视频' },
  frameToVideo: { name: '首尾帧生视频', agent: 'Frame2Video', icon: '🎞️', needImage: true, maxImages: 2, needVideo: false, desc: '上传首帧和尾帧图片，AI 生成中间过渡视频' },
  referenceVideo: { name: '参考生视频', agent: 'Reference2Video', icon: '🖼️', needImage: true, maxImages: 9, needVideo: false, desc: '上传参考图片，AI 根据图片生成风格一致的视频' },
}

export const useToolStore = defineStore('tool', () => {
  // 当前工具
  const currentTool = ref<ToolType>('textToImage')

  // 配置数据缓存
  const imageConfig = ref<ConfigDataModel | null>(null)
  const videoConfig = ref<ConfigDataModel | null>(null)
  const configLoading = ref(false)

  // 当前选中的模型
  const selectedModel = ref<SupportedModel | null>(null)
  const selectedModelIndex = ref(0)

  // 用户输入
  const prompt = ref('')
  const uploadedUrls = ref<string[]>([])
  const uploading = ref(false)

  // 参数选择（paramName -> selectedValue）
  const selectedParams = ref<Record<string, string>>({})

  // 任务状态
  const taskId = ref('')
  const taskResult = ref<TaskResultItem | null>(null)
  const taskStatus = ref<TaskStatus>(TaskStatus.COMPLETED)
  const isProcessing = ref(false)
  const pollingTimer = ref<ReturnType<typeof setInterval> | null>(null)

  // ========== 计算属性 ==========
  const currentConfig = computed(() => {
    if (['textToImage', 'imageToImage'].includes(currentTool.value)) {
      return imageConfig.value
    }
    return videoConfig.value
  })

  const availableModels = computed(() => {
    if (!currentConfig.value?.function?.length) return []
    const toolAgent = ToolConfig[currentTool.value].agent
    const func = currentConfig.value.function.find(f => f.agent === toolAgent)
    return func?.supportedModel || []
  })

  const currentModelParams = computed(() => {
    if (!selectedModel.value) return []
    return selectedModel.value.supportedParam || []
  })

  const taskStatusText = computed(() => {
    if (taskStatus.value === TaskStatus.COMPLETED && !taskResult.value) return ''
    if (taskStatus.value === TaskStatus.COMPLETED) return '已完成'
    if (taskStatus.value === TaskStatus.QUEUING) return '排队中...'
    if (taskStatus.value === TaskStatus.PROCESSING) return '生成中...'
    return '处理失败'
  })

  // ========== 方法 ==========

  // 防止重复请求
  let configPromise: Promise<void> | null = null

  // 获取配置（对齐 Flutter DataManager.requestFunctionsData：一次请求 category=functions）
  async function fetchConfig() {
    if (configPromise) return configPromise

    configLoading.value = true
    configPromise = (async () => {
      try {
        // 一次请求拿到所有 function 配置（Flutter 也是用 category=functions）
        const res = await api.getTaskConfig('functions')
        if (res.code === 200 && res.data) {
          // API 返回的 data 是 ConfigDataModel 数组：[{ type:"AI Image", function:[...] }, { type:"AI Video", function:[...] }]
          const configs = Array.isArray(res.data) ? res.data : [res.data]
          const imageCfg = (configs as ConfigDataModel[]).find(c => c.type === 'AI Image')
          const videoCfg = (configs as ConfigDataModel[]).find(c => c.type === 'AI Video')
          if (imageCfg) imageConfig.value = imageCfg
          if (videoCfg) videoConfig.value = videoCfg
        }
      } catch (e) {
        console.error('获取配置失败:', e)
      } finally {
        configLoading.value = false
        configPromise = null
      }
    })()
    return configPromise
  }

  // 设置当前工具
  async function setCurrentTool(tool: ToolType) {
    currentTool.value = tool
    resetTask()

    // 确保配置已加载
    const isImage = ['textToImage', 'imageToImage'].includes(tool)
    const config = isImage ? imageConfig.value : videoConfig.value
    if (!config) {
      await fetchConfig()
    }

    // 自动选择第一个模型
    const latestConfig = isImage ? imageConfig.value : videoConfig.value
    const toolAgent = ToolConfig[tool].agent
    if (latestConfig?.function) {
      const func = latestConfig.function.find(f => f.agent === toolAgent)
      if (func?.supportedModel?.length) {
        selectedModel.value = func.supportedModel[0]
        selectedModelIndex.value = 0
        initParams()
      }
    }
  }

  // 选择模型
  function selectModel(index: number) {
    const models = availableModels.value
    if (index >= 0 && index < models.length) {
      selectedModel.value = models[index]
      selectedModelIndex.value = index
      initParams()
    }
  }

  // 初始化参数默认值
  function initParams() {
    selectedParams.value = {}
    if (selectedModel.value) {
      for (const param of selectedModel.value.supportedParam) {
        if (param.values.length > 0) {
          selectedParams.value[param.paramName] = param.values[0]
        }
      }
    }
  }

  // 设置参数
  function setParam(paramName: string, value: string) {
    selectedParams.value[paramName] = value
  }

  // 上传图片
  async function uploadImages(files: File[]) {
    uploading.value = true
    const urls: string[] = []
    try {
      for (const file of files) {
        const url = await uploadFile(file)
        if (url) urls.push(url)
      }
      uploadedUrls.value = [...uploadedUrls.value, ...urls]
    } catch (e) {
      console.error('上传失败:', e)
      showToast('上传失败')
    } finally {
      uploading.value = false
    }
    return urls
  }

  // 上传视频
  async function uploadVideoFile(file: File): Promise<string | null> {
    uploading.value = true
    try {
      const url = await uploadFile(file)
      return url
    } catch (e) {
      console.error('视频上传失败:', e)
      showToast('视频上传失败')
      return null
    } finally {
      uploading.value = false
    }
  }

  // 清除已上传的图片
  function clearUploaded() {
    uploadedUrls.value = []
  }

  // 移除单张图片
  function removeImage(index: number) {
    uploadedUrls.value.splice(index, 1)
  }

  // 提交任务
  async function submitTask(): Promise<boolean> {
    if (!selectedModel.value) {
      showToast('请选择模型')
      return false
    }
    if (!prompt.value.trim() && uploadedUrls.value.length === 0) {
      showToast('请输入描述或上传图片')
      return false
    }

    const toolAgent = ToolConfig[currentTool.value].agent
    const params: Record<string, any> = {
      agent: toolAgent,
      modelType: selectedModel.value.modelType,
      model: selectedModel.value.model,
      modelName: selectedModel.value.name,
      prompt: prompt.value.trim(),
      credits: selectedModel.value.credits,
    }

    // 添加图片 URL
    if (uploadedUrls.value.length > 0) {
      params.imageUrls = [...uploadedUrls.value]
    }

    // 添加动态参数
    for (const [key, value] of Object.entries(selectedParams.value)) {
      if (value) params[key] = value
    }

    // 特殊处理：参考生视频 prompt 占位符替换
    if (currentTool.value === 'referenceVideo' && prompt.value.trim()) {
      const modelName = selectedModel.value.name?.toLowerCase() || ''
      const isWan = modelName.includes('wan')
      params.prompt = params.prompt.replace(/@image(\d+)/gi, (_: string, n: string) => isWan ? `图${n}` : `[Image ${n}]`)
      if (uploadedUrls.value.length > 0) {
        params.resolution = '1:1'
      }
    }

    isProcessing.value = true
    taskStatus.value = TaskStatus.QUEUING

    try {
      const res = await api.createTask(params)
      if (res.code === 200 && res.data?.data) {
        taskId.value = res.data.data
        startPolling()
        return true
      } else {
        showToast(res.message || '任务创建失败')
        isProcessing.value = false
        taskStatus.value = TaskStatus.COMPLETED
        return false
      }
    } catch (e: any) {
      console.error('提交任务失败:', e)
      showToast(e.message || '网络请求失败')
      isProcessing.value = false
      taskStatus.value = TaskStatus.COMPLETED
      return false
    }
  }

  // 轮询任务结果
  function startPolling() {
    let pollCount = 0
    const maxPoll = 300 // 最多轮询 10 分钟

    pollingTimer.value = setInterval(async () => {
      pollCount++
      try {
        const res = await api.getTaskResult(taskId.value)
        if (res.code === 200 && res.data) {
          const result = res.data
          const status = Number(result.taskStatus)
          taskStatus.value = status
          taskResult.value = result

          // 完成或失败
          if (status !== TaskStatus.QUEUING && status !== TaskStatus.PROCESSING) {
            stopPolling()
            isProcessing.value = false
            if (status === TaskStatus.COMPLETED) {
              showToast('生成完成！')
            } else {
              const msg = TaskStatusMessage[status] || '处理失败'
              showToast(msg)
            }
          }
        }
      } catch (e) {
        console.error('轮询失败:', e)
      }

      if (pollCount >= maxPoll) {
        stopPolling()
        isProcessing.value = false
        showToast('任务超时，请重试')
      }
    }, 2000)
  }

  // 停止轮询
  function stopPolling() {
    if (pollingTimer.value) {
      clearInterval(pollingTimer.value)
      pollingTimer.value = null
    }
  }

  // 重置任务
  function resetTask() {
    stopPolling()
    taskId.value = ''
    taskResult.value = null
    taskStatus.value = TaskStatus.COMPLETED
    isProcessing.value = false
    prompt.value = ''
    uploadedUrls.value = []
    selectedParams.value = {}
    initParams()
  }

  return {
    // 状态
    currentTool,
    imageConfig,
    videoConfig,
    configLoading,
    selectedModel,
    selectedModelIndex,
    prompt,
    uploadedUrls,
    uploading,
    selectedParams,
    taskId,
    taskResult,
    taskStatus,
    isProcessing,
    // 计算属性
    currentConfig,
    availableModels,
    currentModelParams,
    taskStatusText,
    // 方法
    fetchConfig,
    setCurrentTool,
    selectModel,
    initParams,
    setParam,
    uploadImages,
    uploadVideo: uploadVideoFile,
    clearUploaded,
    removeImage,
    submitTask,
    resetTask,
    stopPolling,
  }
})
