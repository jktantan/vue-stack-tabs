// @vitest-environment happy-dom
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { TabEventType, tabEmitterKey } from '@/lib/hooks/useTabEventBus'
import { tabPageContextKey } from '@/lib/hooks/tabPageContext'
import useTabLoading from '@/lib/hooks/useTabLoading'

enableAutoUnmount(afterEach)

const mountPage = (provide: Record<symbol, unknown>, attrs: Record<string, string> = {}) => {
  let controls: ReturnType<typeof useTabLoading> | null = null

  const Page = defineComponent({
    setup() {
      controls = useTabLoading()
      return () => h('div')
    }
  })

  mount(Page, {
    attrs,
    global: { provide }
  })

  return controls as unknown as ReturnType<typeof useTabLoading>
}

describe('useTabLoading', () => {
  it('通过页面上下文把 PAGE_LOADING 发送到所属标签', () => {
    const emit = vi.fn()
    const controls = mountPage({
      [tabEmitterKey as symbol]: { emit },
      [tabPageContextKey as symbol]: { tabId: 'tab-context', pageId: 'page-context' }
    })

    controls.openTabLoading()

    expect(emit).toHaveBeenCalledWith(TabEventType.PAGE_LOADING, {
      tId: 'tab-context',
      value: true
    })
  })

  it('兼容旧版 attrs.tId 注入', () => {
    const emit = vi.fn()
    const controls = mountPage({ [tabEmitterKey as symbol]: { emit } }, { tId: 'tab-attrs' })

    controls.closeTabLoading()

    expect(emit).toHaveBeenCalledWith(TabEventType.PAGE_LOADING, {
      tId: 'tab-attrs',
      value: false
    })
  })
})
