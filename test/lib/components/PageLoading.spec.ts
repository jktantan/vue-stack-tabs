// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import mitt from 'mitt'
import { describe, expect, it, vi } from 'vitest'
import PageLoading from '@/lib/components/PageLoading.vue'
import { TabEventType, tabEmitterKey } from '@/lib/hooks/useTabEventBus'

vi.mock('@/lib/utils/scrollUtils', () => ({
  getMaxZIndex: () => 10,
  invalidateZIndexCache: () => undefined
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
    expect((status.element as HTMLElement).style.zIndex).toBe('10')
    expect(status.attributes('aria-live')).toBe('polite')
    expect(status.attributes('aria-label')).toBe('VueStackTab.loading')
    expect(wrapper.get('.stack-tab-loading__spin').attributes('aria-hidden')).toBe('true')
  })

  it('受控 visible 时忽略 PAGE_LOADING 事件', async () => {
    const emitter = mitt()
    const wrapper = mount(PageLoading, {
      props: {
        tabId: 'tab-1',
        visible: true
      },
      global: {
        provide: {
          [tabEmitterKey as symbol]: emitter
        }
      }
    })

    await wrapper.vm.$nextTick()
    expect(wrapper.find('[role="status"]').exists()).toBe(true)

    emitter.emit(TabEventType.PAGE_LOADING, { tId: 'tab-1', value: false })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[role="status"]').exists()).toBe(true)

    await wrapper.setProps({ visible: false })
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  })
})
