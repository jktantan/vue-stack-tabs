// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import mitt from 'mitt'
import { describe, expect, it, vi } from 'vitest'
import PageLoading from '@/lib/components/PageLoading.vue'
import { TabEventType, tabEmitterKey } from '@/lib/hooks/useTabEventBus'

vi.mock('@/lib/utils/scrollUtils', () => ({
  getMaxZIndex: () => 10
}))

vi.mock('vue-i18n-lite', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}))

describe('PageLoading accessibility', () => {
  it('显示 loading 时使用 status 和 aria-live', async () => {
    const emitter = mitt()
    const wrapper = mount(PageLoading, {
      props: {
        tabId: 'tab-1'
      },
      global: {
        provide: {
          [tabEmitterKey as symbol]: emitter
        }
      }
    })

    emitter.emit(TabEventType.PAGE_LOADING, { tId: 'tab-1', value: true })
    await wrapper.vm.$nextTick()

    const status = wrapper.get('[role="status"]')
    expect(status.attributes('aria-live')).toBe('polite')
    expect(status.attributes('aria-label')).toBe('VueStackTab.loading')
  })
})
