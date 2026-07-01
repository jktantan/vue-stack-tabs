// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import mitt from 'mitt'
import { describe, expect, it, vi } from 'vitest'
import type { ITabItem } from '@/lib/model/TabModel'
import { tabEmitterKey } from '@/lib/hooks/useTabEventBus'
import TabHeaderItem from '@/lib/components/TabHeader/TabHeaderItem.vue'

vi.mock('vue-i18n-lite', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}))

function makeTab(overrides: Partial<ITabItem> = {}): ITabItem {
  return {
    id: 'tab-1',
    title: 'Dashboard',
    closable: true,
    refreshable: true,
    iframe: false,
    active: true,
    pages: { list: () => [] } as unknown as ITabItem['pages'],
    ...overrides
  }
}

function mountItem(item: ITabItem) {
  return mount(TabHeaderItem, {
    props: { item },
    global: {
      provide: {
        [tabEmitterKey as symbol]: mitt()
      }
    }
  })
}

describe('TabHeaderItem accessibility', () => {
  it('渲染为 tab button，并反映 active 状态', () => {
    const wrapper = mountItem(makeTab({ active: true }))
    const tab = wrapper.get('[role="tab"]')

    expect(tab.element.tagName).toBe('BUTTON')
    expect(tab.attributes('type')).toBe('button')
    expect(tab.attributes('aria-selected')).toBe('true')
    expect(tab.attributes('tabindex')).toBe('0')
  })

  it('非 active tab 通过箭头键获得焦点，但不进入普通 Tab 顺序', () => {
    const wrapper = mountItem(makeTab({ active: false }))

    expect(wrapper.get('[role="tab"]').attributes('tabindex')).toBe('-1')
  })

  it('Enter 和 Space 会激活 tab', async () => {
    const wrapper = mountItem(makeTab())
    const tab = wrapper.get('[role="tab"]')

    await tab.trigger('keydown', { key: 'Enter' })
    await tab.trigger('keydown', { key: ' ' })

    expect(wrapper.emitted('active')).toHaveLength(2)
  })

  it('Delete 和 Backspace 会关闭可关闭 tab', async () => {
    const wrapper = mountItem(makeTab({ closable: true }))
    const tab = wrapper.get('[role="tab"]')

    await tab.trigger('keydown', { key: 'Delete' })
    await tab.trigger('keydown', { key: 'Backspace' })

    expect(wrapper.emitted('close')).toHaveLength(2)
  })

  it('点击可见 li 区域也会激活 tab', async () => {
    const wrapper = mountItem(makeTab())

    await wrapper.get('.stack-tab__item').trigger('click')

    expect(wrapper.emitted('active')).toHaveLength(1)
  })

  it('关闭按钮是带 aria-label 的原生 button', async () => {
    const wrapper = mountItem(makeTab({ title: 'Dashboard', closable: true }))
    const closeButton = wrapper.get('button.stack-tab__item-button')

    expect(closeButton.attributes('type')).toBe('button')
    expect(closeButton.attributes('aria-label')).toBe('VueStackTab.close Dashboard')

    await closeButton.trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('inactive tab 的关闭按钮不进入普通 Tab 顺序', () => {
    const wrapper = mountItem(makeTab({ active: false, closable: true }))
    const closeButton = wrapper.get('button.stack-tab__item-button')

    expect(closeButton.attributes('tabindex')).toBe('-1')
  })
})
