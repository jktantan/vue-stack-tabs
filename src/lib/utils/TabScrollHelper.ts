/**
 * 滚动到指定位置
 * @export
 * @param {Element} wrap 滚动区域
 * @param {number} [left=0]
 * @param {number} [top=0]
 */
export const _scrollTo = ({
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

/**
 * 指定元素滚动到可视区域
 * @export
 * @param {Element} el 目标元素
 * @param {Element} wrap 滚动区域
 * @param {String} block 垂直方向的对齐，可选：'start', 'center', 'end', 或 'nearest'
 * @param {String} inline 水平方向的对齐，可选值同上
 */
export function _scrollIntoView({
  el,
  wrap,
  block = 'start',
  inline = 'nearest'
}: {
  el: HTMLElement
  wrap: any
  block?: any
  inline?: any
}) {
  if (!el || !wrap) return

  if (el.scrollIntoView) {
    el.scrollIntoView({ behavior: 'smooth', block, inline })
  } else {
    const { offsetLeft, offsetTop } = el
    let left, top

    if (block === 'center') {
      top = offsetTop + (el.clientHeight - wrap.clientHeight) / 2
    } else {
      top = offsetTop
    }

    if (inline === 'center') {
      left = offsetLeft + (el.clientWidth - wrap.clientWidth) / 2
    } else {
      left = offsetLeft
    }

    _scrollTo({ wrap, left, top })
  }
}

// 获取滚动条宽度
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

/**
 * 获取最大z-index
 * @returns 最大z-index的值
 */
export const getMaxZIndex = (key = '.stack-tab__container *'): number => {
  const allZIndex = Array.from(document.querySelectorAll(key)).map(
    (e) => +window.getComputedStyle(e).zIndex || 0
  )
  // 特殊处理，不高于90000的才行
  return allZIndex.length ? Math.max(...allZIndex.filter((item) => item < 90000)) + 1 : 1
}
