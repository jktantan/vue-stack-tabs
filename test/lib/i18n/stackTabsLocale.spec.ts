import { describe, expect, it, vi } from 'vitest'
import { applyStackTabsLocale } from '@/lib/i18n/stackTabsLocale'

describe('applyStackTabsLocale', () => {
  it('未显式传入组件 locale 时不覆盖插件级 locale', () => {
    const changeLocale = vi.fn()

    applyStackTabsLocale(changeLocale, undefined)

    expect(changeLocale).not.toHaveBeenCalled()
  })

  it('显式传入组件 locale 时才切换语言', () => {
    const changeLocale = vi.fn()

    applyStackTabsLocale(changeLocale, 'en')

    expect(changeLocale).toHaveBeenCalledWith('en')
  })
})
