// Tab的滚动方式
enum TabScrollMode {
  // 使用滚轮
  WHEEL = 'wheel',
  // 使用按钮
  BUTTON = 'button',
  // 两者都可以
  BOTH = 'both'
}
// 拖拽数据接口
interface DragData {
  thumbLeft: number
  startScrollLeft: number
  startThumbLeft: number
  startPageX: number
}
// 滑块数据接口
interface ScrollData {
  clientWidth: number
  scrollWidth: number
  scrollLeft: number
}
// 滚动条事件类型
type ScrollEvents = {
  ScrollUpdate: void
}
interface TabData {
  id: string
  name: string
  closable?: boolean
  src?: string
  iframe?: boolean
}

class Stack<T> {
  // 栈元素
  private items: T[] = []
  // 1.入栈

  setItems = (elements: T[]) => {
    this.items = elements
  }

  push = (element: T) => {
    this.items.push(element)
  }

  // 2.pop删除栈顶元素,并返回该元素
  pop = () => {
    return this.items.pop()
  }

  // 3.取出栈顶元素
  peek = () => {
    return this.items[this.items.length - 1]
  }

  // 4.判断栈是否为空
  isEmpty = () => {
    return this.items.length === 0
  }

  // 5.获取栈的个数
  size = (): number => {
    return this.items.length
  }

  values = (): T[] => {
    return this.items
  }

  // 6.输出栈数据,希望这种形式: 20 10 100
  toString = () => {
    let Str = ''
    for (const i of this.items) {
      Str += i + ' '
    }
    return Str
  }
}
interface TabRouteLocationRaw {
  path: string
  query?: any
}
interface PageRouteLocationRaw {
  pId: string
  path: string
  query: any
}
interface DefaultTabData extends TabData {
  to: TabRouteLocationRaw
}
export { TabScrollMode, TabData, Stack, TabRouteLocationRaw, PageRouteLocationRaw, DefaultTabData }
export type { ScrollData, ScrollEvents, DragData }
