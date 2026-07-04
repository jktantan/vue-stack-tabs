// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TabHeaderButton from '@/lib/components/TabHeader/TabHeaderButton.vue'

describe('TabHeaderButton accessibility', () => {
  it('渲染为原生 button，并使用 title 作为默认 aria-label', () => {
    const wrapper = mount(TabHeaderButton, {
      props: {
        title: '向左滚动',
        iconClass: 'stack-tab__icon-left-arrow'
      }
    })

    const button = wrapper.get('button.stack-tab__header-button')
    expect(button.attributes('type')).toBe('button')
    expect(button.attributes('aria-label')).toBe('向左滚动')
    expect(button.attributes('title')).toBe('向左滚动')
  })

  it('disabled 使用原生 button 禁用语义', () => {
    const wrapper = mount(TabHeaderButton, {
      props: {
        disabled: true,
        title: '不可用'
      }
    })

    const button = wrapper.get('button.stack-tab__header-button')
    expect(button.attributes()).toHaveProperty('disabled')
  })

  it('ariaLabel 优先于 title', () => {
    const wrapper = mount(TabHeaderButton, {
      props: {
        title: '图标按钮',
        ariaLabel: '最大化标签容器'
      }
    })

    expect(wrapper.get('button').attributes('aria-label')).toBe('最大化标签容器')
  })
})
