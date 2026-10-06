// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import useContextMenu from '@/lib/hooks/useContextMenu'

describe('useContextMenu', () => {
  it('点击 iframe 后收起菜单', async () => {
    let contextMenu: ReturnType<typeof useContextMenu> | undefined
    const wrapper = mount(
      defineComponent({
        setup() {
          contextMenu = useContextMenu()
          return () => h('div')
        }
      })
    )
    const iframe = document.createElement('iframe')
    document.body.append(iframe)

    await contextMenu!.showContextMenu(
      new MouseEvent('contextmenu', { clientX: 8, clientY: 12 }),
      { id: 'iframe-tab' } as never,
      0,
      1
    )
    await nextTick()
    expect(contextMenu!.shown.value).toBe(true)

    iframe.focus()

    expect(contextMenu!.shown.value).toBe(false)
    iframe.remove()
    wrapper.unmount()
  })
})
