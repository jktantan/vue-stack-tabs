/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from 'vitest'
import { MSG_REFRESH, MSG_OPEN_TAB, postOpenTab, onRefreshRequest } from '@/lib/utils/iframeBridge'

describe('iframeBridge', () => {
  it('MSG_REFRESH 和 MSG_OPEN_TAB 为预期常量', () => {
    expect(MSG_REFRESH).toBe('vue-stack-tabs:refresh')
    expect(MSG_OPEN_TAB).toBe('vue-stack-tabs:openTab')
  })

  describe('postOpenTab', () => {
    it('有 window.parent 时调用 postMessage', () => {
      const spy = vi.spyOn(window.parent, 'postMessage')
      postOpenTab({ title: 't', path: '/p' })
      expect(spy).toHaveBeenCalledWith(
        { type: MSG_OPEN_TAB, payload: { title: 't', path: '/p' } },
        '*'
      )
      spy.mockRestore()
    })

    it('postOpenTab 使用显式 targetOrigin 发送消息', () => {
      const spy = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => undefined)

      postOpenTab({ title: 'secure', path: '/secure' }, { targetOrigin: 'https://parent.example.com' })

      expect(spy).toHaveBeenCalledWith(
        { type: MSG_OPEN_TAB, payload: { title: 'secure', path: '/secure' } },
        'https://parent.example.com'
      )

      spy.mockRestore()
    })
  })

  describe('onRefreshRequest', () => {
    it('只接受 window.parent 发来的刷新消息', () => {
      const cb = vi.fn()
      const off = onRefreshRequest(cb)
      const otherSource = window.open('', '_blank')

      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: MSG_REFRESH },
          source: otherSource
        })
      )
      expect(cb).not.toHaveBeenCalled()

      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: MSG_REFRESH },
          source: window.parent
        })
      )
      expect(cb).toHaveBeenCalledTimes(1)

      otherSource?.close()
      off()
    })

    it('onRefreshRequest 配置 allowedOrigins 后拒绝不匹配的父窗口消息', () => {
      const cb = vi.fn()
      const off = onRefreshRequest(cb, { allowedOrigins: ['https://trusted.example.com'] })

      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: MSG_REFRESH },
          source: window.parent,
          origin: 'https://evil.example.com'
        })
      )

      expect(cb).not.toHaveBeenCalled()
      off()
    })

    it('onRefreshRequest 配置 allowedOrigins 后接受匹配的父窗口消息', () => {
      const cb = vi.fn()
      const off = onRefreshRequest(cb, { allowedOrigins: ['https://trusted.example.com'] })

      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: MSG_REFRESH },
          source: window.parent,
          origin: 'https://trusted.example.com'
        })
      )

      expect(cb).toHaveBeenCalledTimes(1)
      off()
    })
  })
})
