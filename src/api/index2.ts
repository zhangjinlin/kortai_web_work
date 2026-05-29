import { api as http } from './index'

interface ApiResponse<T = any> {
  code: number
  data: T
  message?: string
}

export const api = {
  // 登录
  login(email: string, password: string) {
    return http.post<ApiResponse>('/api/auth/login/email', { email, password })
  },

  // 退出登录
  logout() {
    return http.post<ApiResponse>('/api/auth/logout')
  }
}
