import { api as http } from './index'
import { getBaseUrl } from '@/utils/env'

interface ApiResponse<T = any> {
  code: number
  data: T
  message?: string
}

// ========== 类型定义 ==========

// 任务状态
export enum TaskStatus {
  QUEUING = 1,       // 排队中
  PROCESSING = 2,    // 处理中
  COMPLETED = 22,    // 完成
  TIMEOUT = 54,      // 超时
  OFFLINE = 96,      // 机器离线
  DAILY_LIMIT = 97,  // 每日额度用完
  INVALID_IMAGE = 98,// 无效图片
  INTERNAL_ERROR = 99,// 内部错误
  BUSY = 503,        // 服务繁忙
}

export const TaskStatusMessage: Record<number, string> = {
  [TaskStatus.QUEUING]: '排队中...',
  [TaskStatus.PROCESSING]: '生成中...',
  [TaskStatus.COMPLETED]: '已完成',
  [TaskStatus.TIMEOUT]: '任务超时',
  [TaskStatus.OFFLINE]: '服务离线',
  [TaskStatus.DAILY_LIMIT]: '今日额度已用完',
  [TaskStatus.INVALID_IMAGE]: '图片无效',
  [TaskStatus.INTERNAL_ERROR]: '服务内部错误',
  [TaskStatus.BUSY]: '服务繁忙',
}

// 支持的模型
export interface SupportedModel {
  name: string
  modelType: string
  model: string
  singleModel?: string
  credits: number
  imageCount?: number
  supportedParam: SupportedParam[]
  hints: HintsModel[]
}

// 支持的参数
export interface SupportedParam {
  displayName: string
  paramName: string
  values: string[]
  selectedIndex: number
}

// 提示词建议
export interface HintsModel {
  title: Record<string, string>
  prompt: Record<string, string>
  cover: string
  images: string[]
}

// 功能配置
export interface FunctionModel {
  name: string
  agent: string
  icon: string
  supportedModel: SupportedModel[]
}

// 配置数据
export interface ConfigDataModel {
  type: string
  function: FunctionModel[]
  filters?: any[]
  hints?: any[]
}

// ========== 任务结果 ==========

// 子任务结果
export interface TaskResultSubItem {
  taskId: string
  taskStatus: number
  resultUrl?: string
  fileType?: string
  coverUrl?: string
  title?: string
  createdAt?: string
  template?: string
}

// 历史记录分组（一组任务共享相同的 prompt/图片）
export interface TaskResultHistoryModel {
  model?: string
  agent?: string
  modelName?: string
  modelType?: string
  aspectRatio?: string
  resolution?: string
  quality?: string
  imageUrls?: string[]
  prompt?: string
  items?: TaskResultSubItem[]
  createdAt?: string
  duration?: string
  credits?: number
}

// 任务结果（单任务查询，兼容旧字段）
export interface TaskResultItem {
  taskId: string
  taskStatus: number
  resultUrl?: string
  fileType?: string
  coverUrl?: string
  title?: string
  videoUrl?: string
  originalVideoUrl?: string
  originalImageUrls?: string[]
  originalImage?: string
  firstFrameUrl?: string
  numberOfQueue?: number
  taskType?: number
  remainedTime?: number
  images?: any[]
  videoSize?: string
  videoDuration?: string
  aspectRatio?: string
  prompt?: string
}

// 历史记录列表响应
export interface HistoryListResponse {
  items: TaskResultHistoryModel[]
}

// ========== 文件上传 ==========

// 生成上传路径
const generateObjectKey = (isVideo: boolean): string => {
  const now = new Date()
  const uuid = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  if (isVideo) {
    return `app-upload/web/${dateStr}/${uuid}.mp4`
  }
  return `app-upload/web/${dateStr}/${uuid}.webp`
}

// 获取 Token
const getToken = (): string => {
  const cookies = document.cookie
  if (!cookies) return ''
  const cookieList = cookies.split('; ')
  for (const cookie of cookieList) {
    const parts = cookie.split('=')
    if (parts[0] === 'USER_STORE') {
      try {
        const userStore = JSON.parse(decodeURIComponent(parts[1]))
        return userStore.accessToken || userStore.token || ''
      } catch (e) {}
      break
    }
  }
  return ''
}

// 图片转 WebP
const convertToWebp = (file: File, maxSize: number = 2000): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()
    reader.onload = (e) => { img.src = e.target?.result as string }
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let w = img.naturalWidth
      let h = img.naturalHeight
      if (w > maxSize || h > maxSize) {
        const ratio = Math.min(maxSize / w, maxSize / h)
        w = Math.round(w * ratio)
        h = Math.round(h * ratio)
      }
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('无法获取 Canvas')); return }
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, w, h)
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error('WebP 转换失败'))
      }, 'image/webp', 0.92)
    }
    img.onerror = () => reject(new Error('图片加载失败'))
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsDataURL(file)
  })
}

// 上传文件到 S3
export const uploadFile = async (file: File): Promise<string | null> => {
  try {
    const token = getToken()
    const isVideo = file.type.startsWith('video/')
    const objectKey = generateObjectKey(isVideo)
    const contentType = isVideo ? 'video/mp4' : 'image/webp'

    // 处理图片：转 WebP
    let fileToUpload: Blob | File = file
    if (!isVideo && file.type !== 'image/webp') {
      try {
        fileToUpload = await convertToWebp(file)
      } catch (e) {
        console.error('WebP 转换失败，使用原文件:', e)
      }
    }

    // 获取预签名 URL
    const baseUrl = getBaseUrl()
    const presignedRes = await fetch(`${baseUrl}/api/s3/presigned-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify({ objectKey, contentType })
    })

    const presignedData = await presignedRes.json()
    if (presignedData.code !== 200 || !presignedData.data) {
      console.error('获取预签名URL失败:', presignedData.message)
      return null
    }

    const { presignedUrl, resourceUrl } = presignedData.data

    // 上传到 S3
    const uploadRes = await fetch(presignedUrl, {
      method: 'PUT',
      body: fileToUpload,
      headers: { 'Content-Type': contentType }
    })

    if (!uploadRes.ok) {
      console.error('上传失败:', uploadRes.status)
      return null
    }

    return resourceUrl || presignedUrl.split('?')[0]
  } catch (error) {
    console.error('上传出错:', error)
    return null
  }
}

// ========== API 方法 ==========

export const api = {
  // 登录
  login(email: string, password: string) {
    return http.post<ApiResponse>('/api/auth/login/email', { email, password })
  },

  // 退出登录
  logout() {
    return http.post<ApiResponse>('/api/auth/logout')
  },

  // 创建任务
  createTask(params: Record<string, any>) {
    return http.post<{ data: string }>('/api/task/create', params)
  },

  // 获取单个任务结果
  getTaskResult(taskId: string) {
    return http.get<TaskResultItem>('/api/task/get', { taskId })
  },

  // 获取任务配置
  getTaskConfig(category: string) {
    return http.get<ConfigDataModel>('/api/task/config/query', { category })
  },

  // ========== 历史记录 ==========

  // 获取历史记录列表（分组）
  getCreatorHistory(pageNum: number, pageSize: number = 10, type: string = '') {
    const params: Record<string, string> = {
      pageNum: String(pageNum),
      pageSize: String(pageSize)
    }
    if (type) params.type = type
    return http.get<HistoryListResponse>('/api/task/group/history', params)
  },

  // 批量删除任务
  batchDeleteTasks(taskIds: string[]) {
    return http.post<ApiResponse>('/api/task/batchDel', { taskIds })
  },

  // 批量获取任务结果（用于轮询进行中的任务）
  batchGetTasks(taskIds: string[]) {
    return http.post<TaskResultSubItem[]>('/api/task/batchGet', { taskIds })
  }
}
