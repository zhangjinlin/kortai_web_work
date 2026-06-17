/**
 * API 响应解密脚本
 *
 * 用法：
 *   node scripts/decrypt-api.js '{"data":"BASE64_STRING"}'
 *   node scripts/decrypt-api.js response.json
 *   curl ... | node scripts/decrypt-api.js
 *
 * 加密方案：AES-128/CBC/PKCS7，IV(16字节)拼接在密文前面一起 Base64 编码
 * 响应格式：{ "data": "Base64(IV + Ciphertext)" }
 */

const crypto = require('crypto')

// ---- 密钥（与 src/utils/encrypt.ts 保持一致） ----
const AES_KEY_STR = '2012ca940b5ceaca015ea29b5f370112f48527a7f74b27f3eb4943485901a22c'

// 取 AES_KEY_STR 的前 16 个 UTF-8 字节作为 AES-128 密钥
function getKey() {
  return Buffer.from(AES_KEY_STR, 'utf8').slice(0, 16)
}

/**
 * 解密单个响应
 * @param {object} response - { data: "Base64..." }
 * @returns {object} 解密后的 JSON
 */
function decryptResponse(response) {
  if (!response || typeof response.data !== 'string' || !response.data) {
    return response
  }

  const combined = Buffer.from(response.data, 'base64')

  if (combined.length < 17) {
    throw new Error('数据长度不足（至少需要 17 字节：16 字节 IV + 至少 1 字节密文）')
  }

  // 前 16 字节是 IV
  const iv = combined.subarray(0, 16)
  // 剩余字节是密文
  const ciphertext = combined.subarray(16)

  const key = getKey()

  const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv)
  decipher.setAutoPadding(true) // PKCS7

  let decrypted = decipher.update(ciphertext)
  decrypted = Buffer.concat([decrypted, decipher.final()])

  return JSON.parse(decrypted.toString('utf8'))
}

/**
 * 递归遍历对象，解密所有嵌套的 data 字段
 * （如果响应本身就是嵌套加密的）
 */
function deepDecrypt(obj) {
  if (!obj || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(deepDecrypt)

  // 如果当前对象有 data 字段且是字符串，尝试解密
  if (typeof obj.data === 'string' && obj.data.length > 0) {
    try {
      return decryptResponse(obj)
    } catch (_) {
      // 不是加密数据，原样返回
    }
  }

  // 递归处理每个字段
  const result = {}
  for (const key of Object.keys(obj)) {
    result[key] = deepDecrypt(obj[key])
  }
  return result
}

// ========== 入口 ==========
async function main() {
  let input = ''

  // 从命令行参数或 stdin 读取
  const arg = process.argv[2]

  if (arg) {
    // 尝试作为文件路径读取
    const fs = require('fs')
    const path = require('path')
    const filePath = path.resolve(arg)
    if (fs.existsSync(filePath)) {
      input = fs.readFileSync(filePath, 'utf8')
    } else {
      // 不是文件，当作 JSON 字符串
      input = arg
    }
  } else {
    // 从 stdin 读取（支持管道输入）
    const chunks = []
    for await (const chunk of process.stdin) {
      chunks.push(chunk)
    }
    input = Buffer.concat(chunks).toString('utf8')
  }

  if (!input.trim()) {
    console.error('用法: node decrypt-api.js \'{"data":"..."}\'')
    console.error('  或: node decrypt-api.js response.json')
    console.error('  或: curl ... | node decrypt-api.js')
    process.exit(1)
  }

  try {
    const response = JSON.parse(input)
    const decrypted = deepDecrypt(response)
    console.log(JSON.stringify(decrypted, null, 2))
  } catch (e) {
    console.error('解密失败:', e.message)
    process.exit(1)
  }
}

main()
