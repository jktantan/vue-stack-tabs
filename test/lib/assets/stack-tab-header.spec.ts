import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const stackTabSass = readFileSync(
  new URL('../../../src/lib/assets/style/stack-tab.scss', import.meta.url),
  'utf8'
)

describe('StackTab header border styles', () => {
  it('header divider does not consume layout height', () => {
    const headerStart = stackTabSass.indexOf('&__header {')
    const buttonComment = stackTabSass.indexOf('// tab header 上面的按钮', headerStart)
    const headerRule = stackTabSass.slice(headerStart, buttonComment)

    expect(headerStart).toBeGreaterThanOrEqual(0)
    expect(buttonComment).toBeGreaterThan(headerStart)
    expect(headerRule).toContain('box-shadow: inset 0 -1px 0 $stack-tab-border-color-token;')
    expect(headerRule).not.toContain('border-bottom:')
  })

  it('tab navigation avoids auto content visibility', () => {
    const navStart = stackTabSass.indexOf('&__nav {')
    const itemComment = stackTabSass.indexOf('// 页签项', navStart)
    const navRule = stackTabSass.slice(navStart, itemComment)

    expect(navStart).toBeGreaterThanOrEqual(0)
    expect(itemComment).toBeGreaterThan(navStart)
    expect(navRule).not.toContain('content-visibility: auto;')
  })

  it('tab items avoid auto content visibility around their borders', () => {
    const itemStart = stackTabSass.indexOf('&__item {')
    const firstChildStart = stackTabSass.indexOf('&:first-child {', itemStart)
    const itemRule = stackTabSass.slice(itemStart, firstChildStart)

    expect(itemStart).toBeGreaterThanOrEqual(0)
    expect(firstChildStart).toBeGreaterThan(itemStart)
    expect(itemRule).toContain('border: $stack-tab-border-token;')
    expect(itemRule).not.toContain('content-visibility: auto;')
  })

  it('active tab border matches its background', () => {
    const activeStart = stackTabSass.indexOf('&--active {')
    const activeEnd = stackTabSass.indexOf('\n    }', activeStart)
    const activeRule = stackTabSass.slice(activeStart, activeEnd)

    expect(activeStart).toBeGreaterThanOrEqual(0)
    expect(activeEnd).toBeGreaterThan(activeStart)
    expect(activeRule).toContain('background-color: $stack-tab-tab-active-bg;')
    expect(activeRule).toContain('border-bottom-color: $stack-tab-tab-active-bg;')
  })
})
