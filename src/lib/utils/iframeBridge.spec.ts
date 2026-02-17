/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from 'vitest'
import { MSG_REFRESH, MSG_OPEN_TAB, postOpenTab, onRefreshRequest } from './iframeBridge'

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
  })

  describe('onRefreshRequest', () => {
    it('注册监听并返回取消函数', () => {
      const cb = vi.fn()
      const off = onRefreshRequest(cb)
      expect(typeof off).toBe('function')
      window.dispatchEvent(new MessageEvent('message', { data: { type: MSG_REFRESH } }))
      expect(cb).toHaveBeenCalled()
      off()
      window.dispatchEvent(new MessageEvent('message', { data: { type: MSG_REFRESH } }))
      expect(cb).toHaveBeenCalledTimes(1)
    })
  })
})
