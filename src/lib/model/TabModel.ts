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

// export enum EventType {
//   I18N_LOCALES = 'I18N_LOCALES',
//   PANEL_MAXIMUM = 'PANEL_MAXIMUM',
//   TAB_ACTIVE = 'TAB_ACTIVE',
//   TAB_CLOSE = 'TAB_CLOSE',
//   TAB_CLOSE_ALL = 'TAB_CLOSE_ALL',
//   TAB_CLOSE_RIGHT = 'TAB_CLOSE_RIGHT',
//   TAB_CLOSE_LEFT = 'TAB_CLOSE_LEFT',
//   TAB_REFRESH = 'TAB_REFRESH',
//   TAB_REFRESH_ALL = 'TAB_REFRESH_ALL'
// }
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
  query?: Record<string, string>
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
  query?: Record<string, string>
  /** 该页面从别的页面被后退唤醒时附带的临时闭包参数，不污染 URL */
  _backParams?: Record<string, unknown>
}
/** 右键菜单项：图标、标题、回调、禁用条件 */
export interface IContextMenu {
  icon?: string
  title: string
  callback(id: string): void
  disabled: (tabData: ITabBase) => boolean
}
// export interface TabRouteLocationRaw {
//   path: string
//   query?: any
// }
// export interface PageRouteLocationRaw {
//   pId: string
//   path: string
//   query: any
// }
/** 使用 Map 实现的栈结构，用于标签内的 pages 页面栈 */
export class Stack<T> {
  protected items: Map<number, T>

  constructor(items?: T[]) {
    this.items = new Map()
    if (items) {
      for (const item of items) {
        this.push(item)
      }
    }
  }

  /**
   * @description: 入栈
   * @param {T} element 要入栈的元素
   */
  push(element: T) {
    this.items.set(this.items.size, element)
  }

  /**
   * @description: 出栈
   * @return {T} 返回出栈的元素
   */
  pop(): T | undefined {
    if (this.isEmpty()) {
      return undefined
    }
    const result = this.items.get(this.items.size - 1)
    this.items.delete(this.items.size - 1)
    return result
  }

  /**
   * @description: 返回栈顶的元素
   * @return {T}
   */
  peek(): T | undefined {
    if (this.isEmpty()) {
      return undefined
    }
    return this.items.get(this.items.size - 1)
  }

  /**
   * @description: 返回栈是否为空
   * @return {Boolean}
   */
  isEmpty(): boolean {
    return this.items.size === 0
  }

  /**
   * @description: 返回栈里的元素个数
   * @return {Number}
   */
  size(): number {
    return this.items.size
  }

  /**
   * @description: 清空栈内存
   */
  clear() {
    this.items.clear()
  }

  /**
   * @description: 将栈中的元素转换为数组
   * @return {T[]}
   */
  list(): T[] {
    return Array.from(this.items.values())
  }

  /**
   * @description: 用于控制 JSON.stringify 时的序列化输出
   * @return {T[]}
   */
  toJSON(): T[] {
    return this.list()
  }

  /**
   * @description: 覆盖Object默认的toString
   * @return {String}
   */
  toString(): string {
    return this.list().toString()
  }
}
