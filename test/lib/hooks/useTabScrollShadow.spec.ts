// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, provide, ref } from 'vue'
import useTabScrollShadow from '@/lib/hooks/useTabScrollShadow'
import {
  tabScrollShadowKey,
  type TabScrollShadowController,
  type TabScrollShadowState
} from '@/lib/hooks/tabScrollShadowContext'

const createController = () => {
  const state = ref<TabScrollShadowState>('top')
  const enabled = ref(true)
  const listeners = new Set<(value: TabScrollShadowState) => void>()
  const controller: TabScrollShadowController = {
    state,
    enabled,
    setEnabled: (value) => {
      enabled.value = value
    },
    reset: () => {
      enabled.value = true
    },
    getState: () => state.value,
    onStateChange: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    }
  }
  return { controller, state, enabled, listeners }
}

describe('useTabScrollShadow', () => {
  it('注入页面级控制器并暴露状态、开关与订阅', () => {
    const { controller, state, enabled, listeners } = createController()
    let captured!: TabScrollShadowController

    const Child = defineComponent({
      name: 'ShadowConsumer',
      setup() {
        captured = useTabScrollShadow()
        return () => h('div')
      }
    })
    const Host = defineComponent({
      name: 'ShadowProvider',
      setup() {
        provide(tabScrollShadowKey, controller)
        return () => h(Child)
      }
    })

    mount(Host)

    expect(captured).toBe(controller)
    expect(captured.getState()).toBe('top')
    expect(captured.state.value).toBe('top')

    captured.setEnabled(false)
    expect(captured.enabled.value).toBe(false)
    captured.reset()
    expect(enabled.value).toBe(true)

    let notified = 0
    const unsubscribe = captured.onStateChange(() => {
      notified++
    })

    state.value = 'bottom'
    for (const listener of listeners) listener(state.value)
    expect(notified).toBe(1)

    unsubscribe()
    state.value = 'none'
    for (const listener of listeners) listener(state.value)
    expect(notified).toBe(1)
  })

  it('不在页面作用域内调用时抛出明确错误', () => {
    expect(() => useTabScrollShadow()).toThrow(/useTabScrollShadow/)
  })
})
