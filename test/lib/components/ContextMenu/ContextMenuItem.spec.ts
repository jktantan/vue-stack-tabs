// @vitest-environment happy-dom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ContextMenuItem from '@/lib/components/ContextMenu/ContextMenuItem.vue'

const stackTabStyles = readFileSync(resolve(process.cwd(), 'src/lib/assets/style/stackTab.scss'), 'utf8')

describe('ContextMenuItem accessibility', () => {
  it('渲染为 menuitem button', () => {
    const wrapper = mount(ContextMenuItem, {
      props: {
        icon: 'stack-tab__icon-reload svg-mask',
        title: '刷新'
      }
    })

    const button = wrapper.get('button[role="menuitem"]')
    expect(button.attributes('type')).toBe('button')
    expect(button.text()).toContain('刷新')
  })

  it('disabled 使用原生禁用语义', () => {
    const wrapper = mount(ContextMenuItem, {
      props: {
        title: '不可用',
        disabled: true
      }
    })

    expect(wrapper.get('button').attributes()).toHaveProperty('disabled')
  })

  it('button 原生 reset 放在全局菜单样式层', () => {
    expect(stackTabStyles).toContain('font: inherit')
    expect(stackTabStyles).toContain('border: 0')
    expect(stackTabStyles).toContain('appearance: none')
    expect(stackTabStyles).toContain('background: transparent')
    expect(stackTabStyles).toContain('text-align: inherit')
  })
})
