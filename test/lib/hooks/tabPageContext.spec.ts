// @vitest-environment happy-dom
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, provide } from 'vue'
import { resolveTabPageContext, tabPageContextKey } from '@/lib/hooks/tabPageContext'

enableAutoUnmount(afterEach)

describe('tabPageContext', () => {
  it('优先读取缓存包装组件 provide 的上下文', () => {
    let resolved: ReturnType<typeof resolveTabPageContext> = null

    const Page = defineComponent({
      setup() {
        resolved = resolveTabPageContext()
        return () => h('div')
      }
    })

    const CacheWrapper = defineComponent({
      setup() {
        provide(tabPageContextKey, { tabId: 'tab-provided', pageId: 'page-provided' })
        return () => h(Page)
      }
    })

    mount(CacheWrapper)

    expect(resolved).toEqual({ tabId: 'tab-provided', pageId: 'page-provided' })
  })

  it('没有 provide 时兼容旧版 attrs 注入', () => {
    let resolved: ReturnType<typeof resolveTabPageContext> = null

    const Page = defineComponent({
      setup() {
        resolved = resolveTabPageContext()
        return () => h('div')
      }
    })

    mount(Page, {
      attrs: { tId: 'tab-attrs', pId: 'page-attrs' }
    })

    expect(resolved).toEqual({ tabId: 'tab-attrs', pageId: 'page-attrs' })
  })

  it('页面把上下文声明为 props 时也能回退读取', () => {
    let resolved: ReturnType<typeof resolveTabPageContext> = null

    const Page = defineComponent({
      props: {
        tId: { type: String, required: true },
        pId: { type: String, required: true }
      },
      setup() {
        resolved = resolveTabPageContext()
        return () => h('div')
      }
    })

    mount(Page, {
      props: { tId: 'tab-props', pId: 'page-props' }
    })

    expect(resolved).toEqual({ tabId: 'tab-props', pageId: 'page-props' })
  })

  it('不在组件 setup 中调用时返回 null', () => {
    expect(resolveTabPageContext()).toBeNull()
  })
})
