// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ContextMenuItem from '@/lib/components/ContextMenu/ContextMenuItem.vue'

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
})
