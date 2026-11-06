import type { Directive } from 'vue'

const SHOW_DELAY = 260

interface Handlers {
  enter: () => void
  leave: () => void
  press: () => void
}

const handlers = new WeakMap<HTMLElement, Handlers>()
const texts = new WeakMap<HTMLElement, string>()

let tipEl: HTMLDivElement | null = null
let showTimer: ReturnType<typeof setTimeout> | undefined
let activeTarget: HTMLElement | null = null

function ensureTip(): HTMLDivElement | null {
  const app = document.getElementById('app')
  if (!app) return null
  if (!tipEl || !tipEl.isConnected) {
    tipEl = document.createElement('div')
    tipEl.className = 'app-tooltip'
    tipEl.setAttribute('role', 'tooltip')
    tipEl.style.display = 'none'
    app.appendChild(tipEl)
  }
  return tipEl
}

function hide(): void {
  if (showTimer) {
    clearTimeout(showTimer)
    showTimer = undefined
  }
  activeTarget = null
  if (tipEl) tipEl.style.display = 'none'
}

/** 以 #app 为坐标原点定位，优先显示在目标上方，空间不足时翻到下方 */
function position(target: HTMLElement): void {
  const tip = ensureTip()
  const app = document.getElementById('app')
  if (!tip || !app) return

  const root = app.getBoundingClientRect()
  const rect = target.getBoundingClientRect()

  tip.style.display = 'block'
  tip.style.left = '0px'
  tip.style.top = '0px'

  const size = tip.getBoundingClientRect()
  let left = rect.left - root.left + rect.width / 2 - size.width / 2
  let top = rect.top - root.top - size.height - 8
  let placement: 'top' | 'bottom' = 'top'

  if (top < 6) {
    top = rect.bottom - root.top + 8
    placement = 'bottom'
  }

  left = Math.max(8, Math.min(left, root.width - size.width - 8))
  top = Math.min(top, root.height - size.height - 8)

  tip.dataset.placement = placement
  tip.style.left = `${left}px`
  tip.style.top = `${top}px`
}

function scheduleShow(target: HTMLElement): void {
  const text = texts.get(target)?.trim()
  if (!text) return
  if (showTimer) clearTimeout(showTimer)
  showTimer = setTimeout(() => {
    showTimer = undefined
    const tip = ensureTip()
    if (!tip) return
    tip.textContent = text
    position(target)
    activeTarget = target
  }, SHOW_DELAY)
}

if (typeof window !== 'undefined') {
  window.addEventListener('scroll', hide, true)
  window.addEventListener('resize', hide)
}

export const tooltip: Directive<HTMLElement, string | undefined> = {
  mounted(el, binding) {
    const value = typeof binding.value === 'string' ? binding.value : el.getAttribute('title') || ''
    if (value) {
      texts.set(el, value)
      // 移除原生 title，避免和自定义气泡重复
      el.removeAttribute('title')
    }

    const enter = (): void => scheduleShow(el)
    const leave = (): void => hide()
    const press = (): void => hide()

    el.addEventListener('mouseenter', enter)
    el.addEventListener('mouseleave', leave)
    el.addEventListener('focusin', enter)
    el.addEventListener('focusout', leave)
    el.addEventListener('mousedown', press)
    el.addEventListener('click', press)
    handlers.set(el, { enter, leave, press })
  },
  updated(el, binding) {
    if (typeof binding.value === 'string') {
      texts.set(el, binding.value)
      el.removeAttribute('title')
    }
  },
  unmounted(el) {
    const handler = handlers.get(el)
    if (handler) {
      el.removeEventListener('mouseenter', handler.enter)
      el.removeEventListener('mouseleave', handler.leave)
      el.removeEventListener('focusin', handler.enter)
      el.removeEventListener('focusout', handler.leave)
      el.removeEventListener('mousedown', handler.press)
      el.removeEventListener('click', handler.press)
      handlers.delete(el)
    }
    if (activeTarget === el) hide()
  }
}
