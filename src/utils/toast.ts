interface ToastItem {
  id: number
  message: string
  timer: any
}

let toastId = 0
let toastQueue: ToastItem[] = []
let isShowing = false

function showNextToast() {
  if (toastQueue.length === 0) {
    isShowing = false
    return
  }
  
  isShowing = true
  const toast = toastQueue.shift()!
  
  // 清除之前的 DOM toast
  const existingToast = document.querySelector('.toast')
  if (existingToast) {
    existingToast.remove()
  }
  
  // 创建新 Toast
  const toastEl = document.createElement('div')
  toastEl.className = 'toast'
  toastEl.textContent = toast.message
  document.body.appendChild(toastEl)
  
  toast.timer = setTimeout(() => {
    toastEl.remove()
    showNextToast()
  }, 2000)
}

export function showToast(message: string, _duration: number = 2000) {
  const id = ++toastId
  
  // 清除同一消息的重复提示
  const existing = toastQueue.find(t => t.message === message)
  if (existing) {
    return
  }
  
  const toast: ToastItem = {
    id,
    message,
    timer: null
  }
  
  toastQueue.push(toast)
  
  // 如果当前没有显示 toast，开始显示
  if (!isShowing) {
    showNextToast()
  }
}
