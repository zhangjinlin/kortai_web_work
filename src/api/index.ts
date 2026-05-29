import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import { getBaseUrl, getWebBaseUrl, isProdEnv } from '@/utils/env'
import { encryptMapToRequest, decryptMap } from '@/utils/encrypt'

// 动态获取 webBaseUrl
export const getDynamicWebBaseUrl = () => {
  return getWebBaseUrl()
}

interface ApiResponse<T = any> {
  code: number
  data: T
  message?: string
}

class HttpClient {
  private instance: AxiosInstance

  constructor() {
    this.instance = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Application-Type': 'video'
      }
    })

    // 请求拦截器 - 动态设置 baseURL、Token 和加密
    this.instance.interceptors.request.use(
      (config) => {
        // 动态设置 baseURL
        const baseUrl = getBaseUrl()
        if (baseUrl) {
          config.baseURL = baseUrl
        }

        // 从 Cookie 获取 Token（兼容两种格式：token 和 accessToken）
        const cookies = document.cookie
        let token = ''
        if (cookies) {
          const cookieList = cookies.split('; ')
          for (const cookie of cookieList) {
            const parts = cookie.split('=')
            if (parts[0] === 'USER_STORE') {
              try {
                const userStore = JSON.parse(decodeURIComponent(parts[1]))
                token = userStore.token || userStore.accessToken || ''
              } catch (e) {}
              break
            }
          }
        }

        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }

        // 正式环境下加密 POST/PUT 请求数据（排除 config/update 接口，该接口服务器未做解密处理）
        const isProd = isProdEnv()
        const method = config.method?.toUpperCase()
        const isConfigUpdate = config.url?.includes('/api/task/config/update')
        if (isProd && (method === 'POST' || method === 'PUT') && config.data && !isConfigUpdate) {
          config.data = encryptMapToRequest(config.data)
        }

        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // 响应拦截器 - 处理解密和响应数据提取
    this.instance.interceptors.response.use(
      (response) => {
        // 正式环境下需要解密响应数据
        const isProd = isProdEnv()
        if (isProd && response.data) {
          // 正式环境响应格式: { data: "加密字符串" }，需要解密
          const decrypted = decryptMap(response.data)
          return decrypted as any
        }
        // 测试环境直接返回 {code, message, data} 结构
        return response.data
      },
      (error) => {
        console.error('响应错误:', error)
        if (error.response?.status === 401) {
          window.location.href = `${getDynamicWebBaseUrl()}/login`
        }
        return Promise.reject(error)
      }
    )
  }

  async get<T = any>(url: string, params?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.get<ApiResponse<T>>(url, {
      params,
      ...config
    })
    return response as unknown as ApiResponse<T>
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.post<ApiResponse<T>>(url, data, {
      ...config,
      headers: {
        'Content-Type': 'application/json',
        ...config?.headers
      }
    })
    return response as unknown as ApiResponse<T>
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.put<ApiResponse<T>>(url, data, config)
    return response as unknown as ApiResponse<T>
  }

  async delete<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.delete<ApiResponse<T>>(url, {
      data,
      ...config
    })
    return response as unknown as ApiResponse<T>
  }
}

export const api = new HttpClient()
