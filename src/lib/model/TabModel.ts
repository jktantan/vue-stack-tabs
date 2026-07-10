import type { LocationQueryRaw } from 'vue-router'

/**
 * TabModel - 标签页数据模型
 *
 * 职责：定义标签、页面、栈结构及右键菜单的数据结构
 * 使用：useTabPanel、useTabActions、ContextMenu 等
 */

/** 标签栏滚动方式：滚轮、按钮、或两者 */
export enum TabScrollMode {
  // 使用滚轮
  WHEEL = 'wheel',
  // 使用按钮
  BUTTON = 'button',
  // 两者都可以
  BOTH = 'both'
}

/** 标签栏滚动条拖拽时的临时状态 */
export interface DragData {
  thumbLeft: number
  startScrollLeft: number
  startThumbLeft: number
  startPageX: number
}
/** 滚动条滑块计算所需的数据 */
export interface ScrollData {
  clientWidth: number
  scrollWidth: number
  scrollLeft: number
}
export type ScrollEvents = {
  ScrollUpdate: void
}

/** 打开标签时传入的完整数据（含 path、query） */
export interface ITabData extends ITabBase {
  // tab name
  title: string
  path: string
  query?: LocationQueryRaw
}
/** iframe 刷新方式：postMessage 由 iframe 内页自行刷新（不重建 DOM，动画正常）；reload 强制重载 iframe */
export type IframeRefreshMode = 'postMessage' | 'reload'

/** 标签基础信息（id、title、是否可关闭/刷新、是否 iframe） */
export interface ITabBase {
  id?: string
  title: string
  closable?: boolean
  refreshable?: boolean
  iframe?: boolean
  /** iframe 刷新方式，默认 postMessage */
  iframeRefreshMode?: IframeRefreshMode
}
/** 内部使用的标签项，含 active 状态和 pages 栈 */
export interface ITabItem extends ITabBase {
  id: string
  closable: boolean
  refreshable: boolean
  iframe: boolean
  iframeRefreshMode?: IframeRefreshMode
  url?: string
  active: boolean
  pages: Stack<ITabPage>
}

/** 标签内的单个页面（对应 keep-alive 的一个缓存实例） */
export interface ITabPage {
  id: string
  tabId: string
  path: string
  query?: LocationQueryRaw
  /** 该页面从别的页面被后退唤醒时附带的临时闭包参数，不污染 URL */
  _backParams?: Record<string, unknown>
}
/** 右键菜单项：重复或动态菜单应提供稳定 key，避免 fallback 标题/图标重复 */
export interface IContextMenu {
  key?: string
  icon?: string
  title: string
  callback(id: string): void
  disabled: (tabData: ITabBase) => boolean
}
/** 数组实现的栈结构，用于标签内的 pages 页面栈 */
export class Stack<T> {
  protected items: T[]

  constructor(items?: T[]) {
    this.items = items ? [...items] : []
  }

  push(element: T) {
    this.items.push(element)
  }

  pop(): T | undefined {
    return this.items.pop()
  }

  peek(): T | undefined {
    return this.items.length > 0 ? this.items[this.items.length - 1] : undefined
  }

  at(index: number): T | undefined {
    return this.items[index]
  }

  isEmpty(): boolean {
    return this.items.length === 0
  }

  size(): number {
    return this.items.length
  }

  clear() {
    this.items.length = 0
  }

  list(): T[] {
    return [...this.items]
  }

  readonlyList(): readonly T[] {
    return this.items
  }

  toJSON(): T[] {
    return this.list()
  }

  toString(): string {
    return this.items.toString()
  }
}
