/**
 * 滚动工具函数
 *
 * 职责：页面/标签切换时保存与恢复滚动位置，以及 z-index 计算
 * 使用：useTabPanel 的 scrollPositionsByPageId、TabHeader 滚动条
 */

/**
 * 将指定容器滚动到 (left, top)，支持 smooth
 */
export const scrollTo = ({
  wrap,
  left = 0,
  top = 0,
  smooth = true
}: {
  wrap: HTMLElement | null
  left?: number
  top?: number
  smooth?: boolean
}) => {
  if (!wrap) return

  if (wrap.scrollTo) {
    wrap.scrollTo({
      left,
      top,
      behavior: smooth ? 'smooth' : 'auto'
    })
  } else {
    wrap.scrollLeft = left
    wrap.scrollTop = top
  }
}

/** 将指定元素滚动到容器可视区域内，支持 block/inline 对齐方式 */
export function scrollIntoView({
  el,
  wrap,
  block = 'start',
  inline = 'nearest'
}: {
  el: HTMLElement
  wrap: HTMLElement | { value: HTMLElement | null } | null
  block?: ScrollLogicalPosition
  inline?: ScrollLogicalPosition
}) {
  const wrapEl = wrap && typeof wrap === 'object' && 'value' in wrap ? wrap.value : wrap
  if (!el || !wrapEl) return

  if (el.scrollIntoView) {
    el.scrollIntoView({ behavior: 'smooth', block, inline })
  } else {
    const { offsetLeft, offsetTop } = el
    let left: number
    let top: number

    if (block === 'center') {
      top = offsetTop + (el.clientHeight - wrapEl.clientHeight) / 2
    } else {
      top = offsetTop
    }

    if (inline === 'center') {
      left = offsetLeft + (el.clientWidth - wrapEl.clientWidth) / 2
    } else {
      left = offsetLeft
    }

    scrollTo({ wrap: wrapEl, left, top })
  }
}

/** 获取系统滚动条宽度（用于布局计算） */
export const getScrollbarWidth = (function () {
  let width: number | null = null

  return function () {
    if (width !== null) return width

    const div = document.createElement('div')

    div.style.cssText = 'width: 100px; height: 100px;overflow-y: scroll'
    document.body.appendChild(div)
    width = div.offsetWidth - div.clientWidth
    div.parentElement?.removeChild(div)

    return width
  }
})()

/** 获取指定选择器下元素的最大 z-index + 1，用于最大化时置顶 */
export const getMaxZIndex = (key = '.stack-tab__container *'): number => {
  const allZIndex = Array.from(document.querySelectorAll(key)).map(
    (e) => +window.getComputedStyle(e).zIndex || 0
  )
  return allZIndex.length ? Math.max(...allZIndex.filter((item) => item < 90000)) + 1 : 1
}
