# useTabPageScroll

把页面自己的滚动源注册给库，让滚动位置记忆和上下阴影继续工作。适用于 `page-scroll="none"`（默认值），也适用于自定义滚动组件、虚拟列表等命令式滚动实现。

```typescript
import { useTabPageScroll } from 'vue-stack-tabs'

const pageScroll = useTabPageScroll()

pageScroll.attach(scrollElement.value)
pageScroll.detach()
```

::: warning
请在 `<VueStackTabs>` 的缓存页内部调用。控制器由缓存包装组件 provide；在页签外调用会抛出错误。
:::

## attach

注册当前页面的主滚动源。传入 `HTMLElement` 时按原生 `scrollTop` / `scrollLeft` 读写；传入适配器时可以使用完整的位置读写、尺寸读取与滚动订阅能力；传 `null` 等价于 `detach()`。

**调用：** `attach(source: HTMLElement | StackTabsScrollAdapter | null)`

```typescript:line-numbers
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useTabPageScroll } from 'vue-stack-tabs'

const pageScroll = useTabPageScroll()
const scrollElement = ref<HTMLElement | null>(null)

onMounted(() => pageScroll.attach(scrollElement.value))
onBeforeUnmount(() => pageScroll.detach())
```

命令式滚动组件（BetterScroll、虚拟滚动）实现适配器即可：

```typescript
pageScroll.attach({
  getPosition: () => ({ top, left }),
  setPosition: (position) => {
    top = position.top
    left = position.left
  },
  getMetrics: () => ({ scrollTop: top, scrollHeight, clientHeight }),
  onScroll: (listener) => {
    // 订阅自己的滚动事件
    return () => {
      // 取消订阅
    }
  }
})
```

## detach

取消当前页面的主滚动源，回退到页面工厂的默认策略。

**调用：** `detach()`

## 优先级

页面内注册的滚动源优先级最高：

```text
useTabPageScroll > pageScroll 组件 > 原生 wrapper
```

注册后，滚动位置记忆（`addScrollTarget` / `data-stack-tab-scroll` 之外的主滚动源）和 `useTabScrollShadow()` 的阴影状态都会使用它。

## 适配器契约

```typescript
interface StackTabsScrollAdapter {
  scrollElement?: HTMLElement | null
  getPosition?: () => { top: number; left: number } | null | undefined
  setPosition?: (position: { top: number; left: number }) => void
  getMetrics?: () =>
    { scrollTop: number; scrollHeight: number; clientHeight: number } | null | undefined
  onScroll?: (listener: () => void) => () => void
}
```

| 成员            | 用途                       | 缺失时的回退                              |
| --------------- | -------------------------- | ----------------------------------------- |
| `scrollElement` | 真实的原生滚动元素         | 无回退；没有它时对应能力不可用            |
| `getPosition`   | 读取滚动位置               | 读 `scrollElement.scrollTop / scrollLeft` |
| `setPosition`   | 写入滚动位置               | 写 `scrollElement.scrollTop / scrollLeft` |
| `getMetrics`    | 阴影计算所需的滚动尺寸     | 读 `scrollElement` 的原生尺寸属性         |
| `onScroll`      | 订阅滚动，返回取消订阅函数 | 监听 `scrollElement` 的 `scroll` 事件     |

所有可选项缺失时都会回退到 `scrollElement`；两者都不可用时只关闭阴影与位置恢复，不影响页面渲染。

相关：[滚动位置](../advance/scroll.md)、[useTabScrollShadow](./useTabScrollShadow.md)、[配置属性](./properties.md)
