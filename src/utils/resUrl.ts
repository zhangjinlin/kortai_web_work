/**
 * 将 res.kortai.info 的资源 URL 转换为代理路径（仅开发环境）
 *
 * 开发环境：vite.config.ts 的 /res 代理可彻底绕过 CDN 防盗链，
 * 将完整域名 URL 替换为 /res 前缀，让浏览器通过 dev server 请求资源。
 *
 * 生产环境：保留原始 CDN URL，配合 img 标签的 referrerpolicy="no-referrer"
 * 即可正常显示（线上已验证可行）。
 *
 * 示例：
 *   开发: 'https://res.kortai.info/images/abc.png' → '/res/images/abc.png'
 *   生产: 'https://res.kortai.info/images/abc.png' → 'https://res.kortai.info/images/abc.png'
 */
const RES_DOMAIN = 'https://res.kortai.info'

export function resProxy(url: string): string {
  if (!url) return url
  if (!url.startsWith(RES_DOMAIN)) return url
  // 开发环境走 Vite 代理，生产环境保留原始 CDN 直链
  if (import.meta.env.DEV) {
    return '/res' + url.slice(RES_DOMAIN.length)
  }
  return url
}
