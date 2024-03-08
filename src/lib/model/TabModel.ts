// Tab的滚动方式
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
// 拖拽数据接口
export interface DragData {
  thumbLeft: number
  startScrollLeft: number
  startThumbLeft: number
  startPageX: number
}
// 滑块数据接口
export interface ScrollData {
  clientWidth: number
  scrollWidth: number
  scrollLeft: number
}
// 滚动条事件类型
export type ScrollEvents = {
  ScrollUpdate: void
}

/**
 * Tab data for open
 */
export interface ITabData extends ITabBase {
  // tab name
  title: string
  path: string
  query?: Record<string, string>
}
export interface ITabBase {
  id?: string
  title: string
  closable?: boolean
  refreshable?: boolean
  iframe?: boolean
}
export interface ITabItem extends ITabBase {
  id: string
  closable: boolean
  refreshable: boolean
  iframe: boolean
  url?: string
  active: boolean
  pages: Stack<ITabPage>
}

export interface ITabPage {
  id: string
  tabId: string
  path: string
  query?: Record<string, string>
}
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
export class Stack<T> {
  // 存储的Map
  private items: Map<number, T>

  //
  constructor() {
    this.items = new Map()
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
   * @description: 清空栈
   */
  clear() {
    this.items.clear()
  }

  list() {
    return Array.from(this.items.values())
  }

  /**
   * @description: 覆盖Object默认的toString
   * @return {String}
   */
  toString(): string {
    if (this.isEmpty()) {
      return ''
    }
    let result: string = ''
    this.items.forEach((value, key) => {
      result = `${result}${key === 0 ? '' : ', '}${value}`
    })
    return result
  }
}
