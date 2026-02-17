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

  /** 点击菜单外部时关闭菜单并移除监听 */
  const handleClickOutside = (ev: MouseEvent) => {
    const target = ev.target as Element
    if (target.closest?.('.stack-tab__contextmenu')) return
    shown.value = false
    document.removeEventListener('click', handleClickOutside)
  }

  onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
  })

  /** 显示右键菜单；nextTick 后设置位置与数据，避免与关闭逻辑冲突 */
  const showContextMenu = async (e: MouseEvent, item: ITabItem, index: number, max: number) => {
    shown.value = false
    document.removeEventListener('click', handleClickOutside)

    await nextTick(() => {
      const { clientY: top, clientX: left } = e
      shown.value = true
      Object.assign(contextMenuData, { item, index, top, left, max })
      nextTick(() => document.addEventListener('click', handleClickOutside))
    })
  }

  return {
    shown,
    contextMenuData,
    showContextMenu
  }
}
