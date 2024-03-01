import { onUnmounted, onMounted, ref, reactive, nextTick } from 'vue'
import type { ITabItem } from '@/lib/model/TabModel'
export default () => {
  const contextMenuData = reactive({
    item: {},
    index: -1,
    left: 0,
    top: 0,
    max: 0
  })
  const shown = ref<boolean>(false)

  onMounted(() => {
    document.addEventListener('click', clickOutSide)
  })
  onUnmounted(() => {
    document.removeEventListener('click', clickOutSide)
  })

  const showContextMenu = async (e: MouseEvent, item: ITabItem, index: number, max: number) => {
    // 关闭已打开的菜单
    shown.value = false

    await nextTick(() => {
      const { clientY: top, clientX: left } = e
      shown.value = true
      Object.assign(contextMenuData, { item, index, top, left, max })

      console.log('showContextMenu in callback')
    })

    // .then(() => {

    // })
  }

  const clickOutSide = (ev: MouseEvent) => {
    const classList = (ev.target as Element).classList
    if (classList.contains('stack-tab__contextmenu')) {
      return
    }
    shown.value = false
  }

  return {
    shown,
    contextMenuData,
    showContextMenu
  }
}
