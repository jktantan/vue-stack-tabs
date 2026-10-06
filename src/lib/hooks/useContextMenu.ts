import { onUnmounted, ref, reactive, nextTick } from 'vue'
import type { ITabItem } from '../model/TabModel'

/**
 * useContextMenu - 标签右键菜单 Hook
 *
 * 职责：管理右键菜单的显示/隐藏、定位，点击菜单外区域关闭
 * 使用：TabHeader 中右键标签时调用 showContextMenu
 */
export default () => {
  /** 菜单展示所需数据：当前标签、索引、坐标、最大数量 */
  const contextMenuData = reactive({
    item: {},
    index: -1,
    left: 0,
    top: 0,
    max: 0
  })
  /** 菜单是否显示 */
  const shown = ref<boolean>(false)

  /** 关闭菜单并清理全局事件。 */
  const hideContextMenu = () => {
    shown.value = false
    document.removeEventListener('click', handleClickOutside)
    document.removeEventListener('focusin', handleDocumentFocusIn, true)
    window.removeEventListener('blur', handleWindowBlur)
  }

  /** 点击菜单外部时关闭菜单。 */
  const handleClickOutside = (ev: MouseEvent) => {
    const target = ev.target as Element
    if (target.closest?.('.stack-tab__contextmenu')) return
    hideContextMenu()
  }

  /**
   * iframe 内的点击不会冒泡到父页面，但 iframe 自身会在父文档中获得焦点。
   * 捕获 focusin 仅处理该元素，避免 window.blur 干扰菜单内部的焦点管理。
   */
  const handleDocumentFocusIn = (event: FocusEvent) => {
    if (event.target instanceof HTMLIFrameElement) hideContextMenu()
  }

  /**
   * 部分浏览器不会把 iframe 内部点击的 focusin 派发到父文档；此时父窗口
   * 会失焦。等待焦点完成切换后，只在 activeElement 确实为 iframe 时收起。
   */
  const handleWindowBlur = () => {
    window.requestAnimationFrame(() => {
      if (document.activeElement instanceof HTMLIFrameElement) hideContextMenu()
    })
  }

  onUnmounted(() => {
    hideContextMenu()
  })

  /** 显示右键菜单；nextTick 后设置位置与数据，避免与关闭逻辑冲突 */
  const showContextMenu = async (e: MouseEvent, item: ITabItem, index: number, max: number) => {
    shown.value = false
    document.removeEventListener('click', handleClickOutside)
    document.removeEventListener('focusin', handleDocumentFocusIn, true)
    window.removeEventListener('blur', handleWindowBlur)

    await nextTick(() => {
      const { clientY: top, clientX: left } = e
      shown.value = true
      Object.assign(contextMenuData, { item, index, top, left, max })
      nextTick(() => {
        document.addEventListener('click', handleClickOutside)
        document.addEventListener('focusin', handleDocumentFocusIn, true)
        window.addEventListener('blur', handleWindowBlur)
      })
    })
  }

  return {
    shown,
    contextMenuData,
    showContextMenu
  }
}
