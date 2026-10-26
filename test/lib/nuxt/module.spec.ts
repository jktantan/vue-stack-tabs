import { describe, expect, test, vi } from 'vitest'

/**
 * Nuxt 模块的配置透传。
 *
 * @nuxt/kit 在单元测试里没有 Nuxt 构建上下文，这里只保留模块定义本身，
 * 让 setup() 针对一个最小的 nuxt 对象执行。
 */
const kit = vi.hoisted(() => ({
  addPlugin: vi.fn(),
  addComponent: vi.fn(),
  addImports: vi.fn()
}))

vi.mock('nuxt/kit', () => ({
  defineNuxtModule: (definition: unknown) => definition,
  createResolver: () => ({ resolve: (path: string) => path }),
  addPlugin: kit.addPlugin,
  addComponent: kit.addComponent,
  addImports: kit.addImports
}))

import nuxtModule from '@/lib/nuxt/module'

interface NuxtStub {
  options: {
    runtimeConfig: { public: Record<string, unknown> }
  }
}

const createNuxt = (): NuxtStub => ({
  options: {
    runtimeConfig: { public: {} }
  }
})

const runSetup = (options: Record<string, unknown>, nuxt: NuxtStub) => {
  const module = nuxtModule as unknown as {
    setup: (options: Record<string, unknown>, nuxt: NuxtStub) => void
  }
  module.setup(options, nuxt)
}

describe('nuxt module setup', () => {
  test('writes locale and an empty messages list by default', () => {
    const nuxt = createNuxt()

    runSetup({ locale: 'zh-CN' }, nuxt)

    expect(nuxt.options.runtimeConfig.public.vueStackTabs).toEqual({
      locale: 'zh-CN',
      messages: []
    })
    expect(kit.addPlugin).toHaveBeenCalled()
    expect(kit.addComponent).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'VueStackTabs', export: 'VueStackTabs' })
    )
    expect(kit.addImports).toHaveBeenCalled()
  })

  test('passes custom messages through runtimeConfig', () => {
    const nuxt = createNuxt()
    const messages = [
      {
        locale: 'zh-TW',
        messages: {
          VueStackTab: { close: '關閉' }
        }
      }
    ]

    runSetup({ locale: 'zh-CN', messages }, nuxt)

    expect(nuxt.options.runtimeConfig.public.vueStackTabs).toEqual({
      locale: 'zh-CN',
      messages
    })
  })
})
