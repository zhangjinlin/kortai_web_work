// 环境配置
export type EnvType = 'prod' | 'test'

export const Environment = {
  // 测试环境
  test: {
    baseUrl: 'https://api-test.kortai.info',
    webBaseUrl: 'https://console-test.kortai.com'
  },
  // 生产环境
  prod: {
    baseUrl: 'https://api-prod.kortai.info',
    webBaseUrl: 'https://console.kortai.com'
  }
}

// 当前运行时环境（默认测试环境）
const getStoredEnv = (): EnvType => {
  const stored = localStorage.getItem('APP_ENV')
  if (stored === 'prod' || stored === 'test') {
    return stored
  }
  return 'test'
}

const setStoredEnv = (env: EnvType) => {
  localStorage.setItem('APP_ENV', env)
}

// 当前环境
let currentEnv: EnvType = getStoredEnv()

// 获取当前环境
export function getCurrentEnv(): EnvType {
  return currentEnv
}

// 设置当前环境（切换时会刷新页面）
export function setCurrentEnv(env: EnvType) {
  if (env === currentEnv) return
  currentEnv = env
  setStoredEnv(env)
  // 刷新页面以应用新环境
  window.location.reload()
}

// 别名：切换环境
export const switchEnv = setCurrentEnv

// 判断是否是正式环境
export function isProdEnv(): boolean {
  return currentEnv === 'prod'
}

// 根据环境获取配置
export function getEnvConfig() {
  return Environment[currentEnv]
}

export function getBaseUrl() {
  return getEnvConfig().baseUrl
}

export function getWebBaseUrl() {
  return getEnvConfig().webBaseUrl
}
