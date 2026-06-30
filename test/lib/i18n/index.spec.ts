import { describe, expect, it } from 'vitest'
import { mergeLocaleMessages } from '@/lib/i18n/index'

describe('mergeLocaleMessages', () => {
  it('缺少 messages 时只切换 locale，不覆盖内置语言包', () => {
    const builtin = {
      'zh-CN': { hello: '你好' },
      en: { hello: 'Hello' }
    }

    expect(mergeLocaleMessages(builtin, [{ locale: 'zh-CN' }])).toEqual(builtin)
  })

  it('存在 messages 时合并到指定 locale', () => {
    const builtin = {
      'zh-CN': { hello: '你好' },
      en: { hello: 'Hello' }
    }

    expect(
      mergeLocaleMessages(builtin, [
        {
          locale: 'zh-CN',
          messages: { goodbye: '再见' }
        }
      ])
    ).toEqual({
      'zh-CN': { hello: '你好', goodbye: '再见' },
      en: { hello: 'Hello' }
    })
  })

  it('递归合并同名 namespace，保留未覆盖的内置子键', () => {
    const builtin = {
      'zh-CN': {
        VueStackTab: {
          loading: '加载中',
          close: '关闭'
        }
      },
      en: { hello: 'Hello' }
    }

    expect(
      mergeLocaleMessages(builtin, [
        {
          locale: 'zh-CN',
          messages: {
            VueStackTab: {
              close: 'Close'
            }
          }
        }
      ])
    ).toEqual({
      'zh-CN': {
        VueStackTab: {
          loading: '加载中',
          close: 'Close'
        }
      },
      en: { hello: 'Hello' }
    })
  })

  it('忽略 prototype pollution 相关危险 key', () => {
    const builtin = {
      'zh-CN': { hello: '你好' }
    }
    const dangerousMessages = JSON.parse(
      '{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}},"safe":"ok"}'
    ) as Record<string, unknown>

    const merged = mergeLocaleMessages(builtin, [
      {
        locale: 'zh-CN',
        messages: dangerousMessages
      }
    ])

    expect(merged['zh-CN']).toEqual({ hello: '你好', safe: 'ok' })
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })

  it('忽略危险 locale key', () => {
    const builtin = {
      'zh-CN': { hello: '你好' }
    }

    const merged = mergeLocaleMessages(builtin, [
      {
        locale: '__proto__',
        messages: { polluted: true }
      },
      {
        locale: 'constructor',
        messages: { polluted: true }
      }
    ])

    expect(Object.keys(merged)).toEqual(['zh-CN'])
    expect((merged as Record<string, unknown>).polluted).toBeUndefined()
  })
})
