// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { shallowRef } from 'vue'
import {
  readAdapterScrollMetrics,
  readAdapterScrollPosition,
  resolveScrollAdapter,
  writeAdapterScrollPosition
} from '@/lib/model/ScrollAdapter'

describe('ScrollAdapter', () => {
  it('直接传入 HTMLElement 时作为 scrollElement', () => {
    const element = document.createElement('div')
    const adapter = resolveScrollAdapter(element)

    expect(adapter).toEqual({ scrollElement: element })
    expect(readAdapterScrollPosition(adapter)).toEqual({ top: 0, left: 0 })
  })

  it('解析组件 expose 的 ref 元素与可选方法', () => {
    const element = document.createElement('div')
    const instance = {
      scrollElement: shallowRef<HTMLElement | null>(element),
      getPosition: vi.fn(() => ({ top: 10, left: 2 })),
      setPosition: vi.fn(),
      getMetrics: vi.fn(() => ({ scrollTop: 20, scrollHeight: 200, clientHeight: 100 })),
      onScroll: vi.fn((listener: () => void) => {
        listener()
        return () => undefined
      })
    }

    const adapter = resolveScrollAdapter(instance)
    expect(adapter?.scrollElement).toBe(element)
    expect(readAdapterScrollPosition(adapter)).toEqual({ top: 10, left: 2 })
    expect(readAdapterScrollMetrics(adapter)).toEqual({
      scrollTop: 20,
      scrollHeight: 200,
      clientHeight: 100
    })

    writeAdapterScrollPosition(adapter!, { top: 30, left: 3 })
    expect(instance.setPosition).toHaveBeenCalledWith({ top: 30, left: 3 })

    const listener = vi.fn()
    const cleanup = adapter!.onScroll!(listener)
    expect(instance.onScroll).toHaveBeenCalledWith(listener)
    expect(typeof cleanup).toBe('function')
  })

  it('缺失可选方法时回退到 scrollElement 的原生属性', () => {
    const element = document.createElement('div')
    Object.defineProperty(element, 'scrollTop', { value: 40, writable: true })
    Object.defineProperty(element, 'scrollLeft', { value: 4, writable: true })
    const adapter = resolveScrollAdapter({ scrollElement: element })

    expect(readAdapterScrollPosition(adapter)).toEqual({ top: 40, left: 4 })
    expect(writeAdapterScrollPosition(adapter!, { top: 60, left: 6 })).toBe(true)
    expect(element.scrollTop).toBe(60)
    expect(element.scrollLeft).toBe(6)
  })

  it('没有任何可用能力时返回 null', () => {
    expect(resolveScrollAdapter({})).toBeNull()
    expect(resolveScrollAdapter(null)).toBeNull()
    expect(resolveScrollAdapter(undefined)).toBeNull()
    expect(readAdapterScrollPosition(null)).toBeNull()
    expect(writeAdapterScrollPosition(null, { top: 1, left: 1 })).toBe(false)
  })
})
