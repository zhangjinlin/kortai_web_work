import { ref, onMounted, onUnmounted } from 'vue'
import { useToolStore, type ToolType, ToolConfig } from '@/stores/tool'
import { showToast } from '@/utils/toast'

export function useToolPage(toolType: ToolType) {
  const store = useToolStore()
  const config = ToolConfig[toolType]
  const imageInput = ref<HTMLInputElement | null>(null)
  const videoInput = ref<HTMLInputElement | null>(null)
  const dragOver = ref(false)

  onMounted(() => {
    store.setCurrentTool(toolType)
  })

  onUnmounted(() => {
    store.stopPolling()
  })

  // 文件拖拽上传
  function onDragOver(e: DragEvent) {
    e.preventDefault()
    dragOver.value = true
  }

  function onDragLeave() {
    dragOver.value = false
  }

  async function onDrop(e: DragEvent) {
    e.preventDefault()
    dragOver.value = false
    const files = Array.from(e.dataTransfer?.files || [])
    if (files.length > 0) {
      await handleFiles(files)
    }
  }

  // 文件选择
  async function handleFiles(files: File[]) {
    // 辅助：判断是否图片文件（MIME + 扩展名双保险）
    const isImageFile = (f: File): boolean => {
      if (f.type.startsWith('image/')) return true
      // 部分浏览器对 webp 不报告正确 MIME，用扩展名兜底
      const ext = f.name.split('.').pop()?.toLowerCase() || ''
      return ['webp', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'].includes(ext)
    }

    if (config.needVideo) {
      const videoFile = files.find(f => f.type.startsWith('video/'))
      if (videoFile) {
        store.uploadedUrls = ['']
        const url = await store.uploadVideo(videoFile)
        if (url) store.uploadedUrls = [url]
      } else {
        showToast('请选择视频文件')
      }
      return
    }

    if (config.needImage) {
      const imageFiles = files.filter(f => isImageFile(f))
      if (imageFiles.length === 0) {
        showToast('请选择图片文件')
        return
      }
      const remaining = config.maxImages - store.uploadedUrls.length
      if (remaining <= 0) {
        showToast(`最多上传 ${config.maxImages} 张图片`)
        return
      }
      await store.uploadImages(imageFiles.slice(0, remaining))
    }
  }

  // 点击上传
  function triggerImageUpload() {
    imageInput.value?.click()
  }

  function triggerVideoUpload() {
    videoInput.value?.click()
  }

  function onImageInputChange(e: Event) {
    const input = e.target as HTMLInputElement
    const files = Array.from(input.files || [])
    handleFiles(files)
    input.value = ''
  }

  // 提交
  async function onSubmit() {
    await store.submitTask()
  }

  return {
    store,
    config,
    imageInput,
    videoInput,
    dragOver,
    onDragOver,
    onDragLeave,
    onDrop,
    handleFiles,
    triggerImageUpload,
    triggerVideoUpload,
    onImageInputChange,
    onSubmit,
  }
}
