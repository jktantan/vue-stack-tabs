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
})
