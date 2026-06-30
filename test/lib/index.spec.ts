/**
 * @vitest-environment happy-dom
 */
import { defineComponent, h } from 'vue'
import { createRouter, createMemoryHistory } from 'vue-router'
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import VueStackTabsPlugin, { useTabActions } from '@/lib/index'
import {
  getActiveStackTabsRuntimeContext,
  unregisterStackTabsRuntimeContext
} from '@/lib/hooks/stackTabsContext'

const cleanupRuntimeContext = (): void => {
  const active = getActiveStackTabsRuntimeContext()
  if (active) unregisterStackTabsRuntimeContext(active)
}

describe('VueStackTabs plugin runtime context', () => {
  afterEach(() => {
    cleanupRuntimeContext()
  })

  it('允许根组件 setup 在 <VueStackTabs> 挂载前创建 useTabActions', async () => {
    cleanupRuntimeContext()

    const Root = defineComponent({
      name: 'RootUsesTabActionsEarly',
      setup() {
        const { openTab } = useTabActions()
        return () =>
          h('button', { onClick: () => openTab({ id: 'demo', title: 'Demo', path: '/demo' }) })
      }
    })
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/',
          component: Root
        },
        {
          path: '/demo',
          component: defineComponent({ setup: () => () => h('div', 'demo') })
        }
      ]
    })
    router.push('/')
    await router.isReady()

    expect(() =>
      mount(Root, {
        global: {
          plugins: [router, VueStackTabsPlugin]
        }
      })
    ).not.toThrow()
  })
})
