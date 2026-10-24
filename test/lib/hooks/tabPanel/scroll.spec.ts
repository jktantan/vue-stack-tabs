// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { createStackTabsRuntimeContext } from '@/lib/hooks/stackTabsContext'
import { createTabPanelScroll } from '@/lib/hooks/tabPanel/scroll'

afterEach(() => {
  document.body.replaceChildren()
})

describe('tabPanel scroll', () => {
  it('保存并恢复带 data-stack-tab-scroll 标记的嵌套滚动容器', () => {
    const pageId = 'page-1'
    const root = document.createElement('div')
    root.id = `W-${pageId}`
    const outerScroller = document.createElement('div')
    const innerScroller = document.createElement('div')
    outerScroller.dataset.stackTabScroll = ''
    innerScroller.dataset.stackTabScroll = ''
    outerScroller.append(innerScroller)
    root.append(outerScroller)
    document.body.append(root)

    outerScroller.scrollTop = 120
    outerScroller.scrollLeft = 12
    innerScroller.scrollTop = 240
    innerScroller.scrollLeft = 24

    const scroll = createTabPanelScroll(createStackTabsRuntimeContext())
    // 页面根容器仍由既有生命周期自动注册。
    scroll.addPageScroller(pageId, `#W-${pageId}`)
    scroll.saveScroller(pageId)

    outerScroller.scrollTop = 0
    outerScroller.scrollLeft = 0
    innerScroller.scrollTop = 0
    innerScroller.scrollLeft = 0
    scroll.restoreScroller(pageId)

    expect(outerScroller.scrollTop).toBe(120)
    expect(outerScroller.scrollLeft).toBe(12)
    expect(innerScroller.scrollTop).toBe(240)
    expect(innerScroller.scrollLeft).toBe(24)
  })

  it('自定义滚动容器通过 scrollElement 保存与恢复位置，且不写 wrapper', () => {
    const pageId = 'page-custom-element'
    const root = document.createElement('div')
    root.id = `W-${pageId}`
    const scrollElement = document.createElement('div')
    root.append(scrollElement)
    document.body.append(root)

    const scroll = createTabPanelScroll(createStackTabsRuntimeContext())
    scroll.setPageScrollAdapter(pageId, () => ({ scrollElement }))

    scrollElement.scrollTop = 88
    scrollElement.scrollLeft = 8
    // wrapper 的 scrollTop 始终为 0，不能被误当作主滚动位置。
    root.scrollTop = 0
    scroll.saveScroller(pageId)

    scrollElement.scrollTop = 0
    scrollElement.scrollLeft = 0
    scroll.restoreScroller(pageId)

    expect(scrollElement.scrollTop).toBe(88)
    expect(scrollElement.scrollLeft).toBe(8)
    expect(root.scrollTop).toBe(0)
  })

  it('命令式滚动组件优先使用 getPosition / setPosition', () => {
    const pageId = 'page-custom-position'
    let position = { top: 0, left: 0 }
    const scroll = createTabPanelScroll(createStackTabsRuntimeContext())
    scroll.setPageScrollAdapter(pageId, () => ({
      getPosition: () => position,
      setPosition: (next) => {
        position = { ...next }
      }
    }))

    position = { top: 42, left: 4 }
    scroll.saveScroller(pageId)
    position = { top: 0, left: 0 }
    scroll.restoreScroller(pageId)

    expect(position).toEqual({ top: 42, left: 4 })
  })

  it('适配器被移除后回退到默认 wrapper 恢复位置', () => {
    const pageId = 'page-custom-fallback'
    const root = document.createElement('div')
    root.id = `W-${pageId}`
    document.body.append(root)
    const scrollElement = document.createElement('div')

    const scroll = createTabPanelScroll(createStackTabsRuntimeContext())
    scroll.setPageScrollAdapter(pageId, () => ({ scrollElement }))
    scrollElement.scrollTop = 66
    scroll.saveScroller(pageId)

    // 模拟运行时切回默认路径：移除适配器并重新注册 wrapper。
    scroll.setPageScrollAdapter(pageId, null)
    scroll.addPageScroller(pageId, `#W-${pageId}`)
    scroll.restoreScroller(pageId)

    expect(root.scrollTop).toBe(66)
  })
})
