/** 朋友圈工具：时间格式化、发布选项、本地图片压缩 */

export const NO_LOCATION = '不显示位置'

export const MOMENT_LOCATION_OPTIONS = [
  NO_LOCATION,
  '星野工作室',
  '上海天文馆',
  '上海 · 徐汇',
  '杭州 · 西湖',
  '深圳 · 南山'
]

export const MOMENT_VISIBILITY_OPTIONS = ['公开 · 所有人可见', '仅好友可见', '仅自己可见']

export const MOMENT_MAX_IMAGES = 9
export const MOMENT_MAX_LENGTH = 200

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/** 朋友圈时间：刚刚 / n 分钟前 / n 小时前 / 昨天 HH:mm / MM-DD HH:mm */
export function formatMomentTime(value?: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const diff = Date.now() - date.getTime()
  if (diff < 60 * 1000) return '刚刚'
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))} 分钟前`
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))} 小时前`

  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const clock = `${pad(date.getHours())}:${pad(date.getMinutes())}`
  if (isSameDay(date, yesterday)) return `昨天 ${clock}`
  if (date.getFullYear() === now.getFullYear()) {
    return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${clock}`
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * 读取并压缩图片为 data URL，避免原图撑爆 localStorage。
 * 默认最长边 960px、JPEG 质量 0.7。
 */
export function readImageFile(file: File, maxSize = 960, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('仅支持选择图片文件'))
      return
    }

    const reader = new FileReader()
    reader.onerror = () => reject(new Error('图片读取失败'))
    reader.onload = () => {
      const source = typeof reader.result === 'string' ? reader.result : ''
      if (!source) {
        reject(new Error('图片读取失败'))
        return
      }

      const image = new Image()
      image.onerror = () => reject(new Error('图片格式暂不支持'))
      image.onload = () => {
        const ratio = Math.min(1, maxSize / Math.max(image.width, image.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(image.width * ratio))
        canvas.height = Math.max(1, Math.round(image.height * ratio))
        const context = canvas.getContext('2d')
        if (!context) {
          reject(new Error('图片处理失败'))
          return
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      image.src = source
    }
    reader.readAsDataURL(file)
  })
}
