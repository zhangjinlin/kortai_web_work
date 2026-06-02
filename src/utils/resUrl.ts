/**
 * 将 res.kortai.info 的资源 URL 转换为开发代理路径
 *
 * 原理：vite.config.ts 配置了 /res → https://res.kortai.info 的代理，
 * 将完整域名 URL 替换为 /res 前缀，让浏览器通过 dev server 请求资源，
 * 彻底绕过 CDN 防盗链（CDN 收到的请求不带 Referer 头）。
 *
 * 示例：
 *   'https://res.kortai.info/images/abc.png' → '/res/images/abc.png'
 *   '' → ''
 *   'https://other.com/x.jpg' → 'https://other.com/x.jpg' (不匹配则原样返回)
 */
const RES_DOMAIN = 'https://res.kortai.info'

export function resProxy(url: string): string {
  if (!url) return url
  if (url.startsWith(RES_DOMAIN)) {
    return '/res' + url.slice(RES_DOMAIN.length)
  }
  return url
}
