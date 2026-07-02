// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { IContextMenu, ITabItem } from '@/lib/model/TabModel'
import ContextMenu from '@/lib/components/ContextMenu/index.vue'

const refreshTabMock = vi.fn()
const refreshAllTabsMock = vi.fn()
const closeTabMock = vi.fn()
const closeAllTabsMock = vi.fn()
const openInNewWindowMock = vi.fn()
const removeLeftTabsMock = vi.fn()
const removeRightTabsMock = vi.fn()
const removeOtherTabsMock = vi.fn()

vi.mock('vue-i18n-lite', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}))

vi.mock('@/lib/hooks/useTabActions', () => ({
  default: () => ({
    closeTab: closeTabMock,
    closeAllTabs: closeAllTabsMock,
    refreshTab: refreshTabMock,
    refreshAllTabs: refreshAllTabsMock,
    openInNewWindow: openInNewWindowMock
  })
}))

vi.mock('@/lib/hooks/useTabPanel', () => ({
  default: () => ({
    removeLeftTabs: removeLeftTabsMock,
    removeRightTabs: removeRightTabsMock,
    removeOtherTabs: removeOtherTabsMock
  })
}))

vi.mock('@/lib/utils/scrollUtils', () => ({
  getMaxZIndex: () => 100
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

function mountMenu(contextMenu: IContextMenu[] = []) {
  return mount(ContextMenu, {
    props: {
      index: 0,
      left: 12,
      top: 24,
      tabItem: makeTab(),
      max: 2,
      contextMenu
    },
    attachTo: document.body
  })
}

beforeEach(() => {
  document.body.innerHTML = ''
  refreshTabMock.mockReset()
  refreshAllTabsMock.mockReset()
  closeTabMock.mockReset()
  closeAllTabsMock.mockReset()
  openInNewWindowMock.mockReset()
  removeLeftTabsMock.mockReset()
  removeRightTabsMock.mockReset()
  removeOtherTabsMock.mockReset()
})

describe('ContextMenu accessibility', () => {
  it('根节点是 menu，菜单项是 menuitem button，并自动聚焦第一个可用项', async () => {
    const wrapper = mountMenu()

    expect(wrapper.get('[role="menu"]').attributes('tabindex')).toBe('-1')
    const items = wrapper.findAll('[role="menuitem"]')
    expect(items.length).toBeGreaterThan(0)
    expect(document.activeElement).toBe(items[0]?.element)
  })

  it('Escape 关闭菜单', async () => {
    const wrapper = mountMenu()

    await wrapper.get('[role="menu"]').trigger('keydown', { key: 'Escape' })

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('ArrowDown 和 ArrowUp 在可用菜单项间移动焦点', async () => {
    const wrapper = mountMenu()
    const menu = wrapper.get('[role="menu"]')
    const items = wrapper.findAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')

    expect(document.activeElement).toBe(items[0]?.element)

    await menu.trigger('keydown', { key: 'ArrowDown' })
    expect(document.activeElement).toBe(items[1]?.element)

    await menu.trigger('keydown', { key: 'ArrowUp' })
    expect(document.activeElement).toBe(items[0]?.element)
  })

  it('Home、End 和方向键只在可用菜单项间移动焦点', async () => {
    const wrapper = mountMenu()
    const menu = wrapper.get('[role="menu"]')
    const enabledItems = wrapper.findAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')
    const disabledItem = wrapper.get<HTMLButtonElement>('[role="menuitem"]:disabled')

    await menu.trigger('keydown', { key: 'End' })
    expect(document.activeElement).toBe(enabledItems.at(-1)?.element)

    await menu.trigger('keydown', { key: 'Home' })
    expect(document.activeElement).toBe(enabledItems[0]?.element)

    enabledItems[2]?.element.focus()
    await menu.trigger('keydown', { key: 'ArrowDown' })

    expect(document.activeElement).not.toBe(disabledItem.element)
    expect(document.activeElement).toBe(enabledItems[3]?.element)
  })

  it('ArrowUp 从菜单根节点聚焦到最后一个可用菜单项', async () => {
    const wrapper = mountMenu()
    const menu = wrapper.get<HTMLElement>('[role="menu"]')
    const items = wrapper.findAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')

    menu.element.focus()
    await menu.trigger('keydown', { key: 'ArrowUp' })

    expect(document.activeElement).toBe(items.at(-1)?.element)
  })

  it('自定义菜单分隔线使用 separator 语义', () => {
    const wrapper = mountMenu([
      {
        key: 'pin-tab',
        title: 'Pin tab',
        callback: vi.fn(),
        disabled: () => false
      }
    ])

    const separator = wrapper.get('[role="separator"]')

    expect(separator.classes()).toContain('divider')
    expect(separator.attributes('aria-orientation')).toBe('horizontal')
  })

  it('未设置 key 的自定义菜单 fallback key 不包含 index', () => {
    const wrapper = mountMenu([
      {
        title: 'Duplicate',
        icon: 'stack-tab__icon-pin svg-mask',
        callback: vi.fn(),
        disabled: () => false
      }
    ])

    const keys = wrapper.findAll('[data-menu-key]').map((item) => item.attributes('data-menu-key'))

    expect(keys).toEqual(['Duplicate-stack-tab__icon-pin svg-mask'])
  })

  it('自定义菜单使用稳定 key 并点击后关闭菜单', async () => {
    const customCallback = vi.fn()
    const wrapper = mountMenu([
      {
        key: 'pin-tab',
        title: 'Pin tab',
        callback: customCallback,
        disabled: () => false
      }
    ])

    await wrapper.get('[data-menu-key="pin-tab"]').trigger('click')

    expect(customCallback).toHaveBeenCalledWith('tab-1')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
