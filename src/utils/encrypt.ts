import CryptoJS from 'crypto-js'

// AES Key（与 Flutter 端一致）
const AES_KEY = '2012ca940b5ceaca015ea29b5f370112f48527a7f74b27f3eb4943485901a22c'

// 生成 16 字节 Key（与 Flutter 一致）
function generateKey(): CryptoJS.lib.WordArray {
  const keyBytes = CryptoJS.enc.Utf8.parse(AES_KEY)
  // 取前 16 字节
  return CryptoJS.lib.WordArray.create(keyBytes.words, 16)
}

/**
 * AES 加密（用于请求）
 * @param data 要加密的数据对象
 * @returns { data: "Base64(AES(JSON))" }
 */
export function encryptMapToRequest(data: any): { data: string } {
  if (!data || Object.keys(data).length === 0) {
    return { data: '' }
  }

  const jsonStr = JSON.stringify(data)
  const key = generateKey()
  
  // 生成随机 IV (16 bytes)
  const iv = CryptoJS.lib.WordArray.random(16)
  
  // AES/CBC/PKCS7 加密
  const encrypted = CryptoJS.AES.encrypt(jsonStr, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  })

  // 合并 IV + 加密内容
  const combined = CryptoJS.lib.WordArray.create(iv.words.concat(encrypted.ciphertext.words))
  
  // 返回 Base64 编码
  return {
    data: CryptoJS.enc.Base64.stringify(combined)
  }
}

/**
 * AES 解密（用于响应）
 * @param response 响应数据 { data: "Base64(...)" }
 * @returns 解密后的对象
 */
export function decryptMap(response: any): any {
  if (!response || !response.data) {
    return response
  }

  const encryptedText = response.data
  if (typeof encryptedText !== 'string' || !encryptedText) {
    // data 不是字符串说明响应未加密，直接透传
    return response
  }

  try {
    // Base64 解码
    const combined = CryptoJS.enc.Base64.parse(encryptedText)
    
    // 分离 IV（前 16 字节）和加密内容
    const iv = CryptoJS.lib.WordArray.create(combined.words.slice(0, 4), 16)
    const ciphertext = CryptoJS.lib.WordArray.create(combined.words.slice(4), combined.sigBytes - 16)
    
    const key = generateKey()
    
    // 解密
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: ciphertext } as CryptoJS.lib.CipherParams,
      key,
      {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }
    )
    
    // 转换为字符串并解析 JSON
    const jsonStr = decrypted.toString(CryptoJS.enc.Utf8)
    return JSON.parse(jsonStr)
  } catch (e) {
    console.error('Decryption error:', e)
    return response
  }
}
