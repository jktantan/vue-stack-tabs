# useTabRouter

用于在页签内进入路由前进后退等操作，只能在页签内的页面使用

```typescript
import { useTabRouter } from 'vue-stack-tabs'

const { forward, backward, addScrollTarget, tabId, pageId } = useTabRouter()
```

## tabId / pageId

当前页面所属的标签 id 与缓存页 id，只读。`pageId` 可以配合
`useTabActions().getWrapper({ pageId })` 精确定位当前页面的内容容器。

## forward

页签内前进

**调用：** forward(to: RouteLocationPathRaw)

## backward

页签内回退

**调用：** backward(to: number|string, backQuery?: Record<string, unknown>)

**参数定义：**

| 参数      |          类型           | 必填 | 说明                                                                                    |
| :-------- | :---------------------: | :--: | :-------------------------------------------------------------------------------------- |
| to        |    string 或 number     |  是  | 数字：回退 abs(x) 步（0 不做任何操作，返回 false）；URL：回退到栈中第一个路径匹配的页面 |
| backQuery | Record<string, unknown> |  否  | 一次性参数，随回退传给目标页面，目标页通过 `props._back` 接收                           |

**返回：** 成功开始导航事务后返回 `true`；标签不存在、步数为 0、或目标路径不在栈中时返回 `false`。

页面上下文由缓存包装组件通过 `tabPageContextKey` provide。页面内任意层级的组件可以直接读取：

```typescript:line-numbers
import { inject } from 'vue'
import { tabPageContextKey } from 'vue-stack-tabs'

const context = inject(tabPageContextKey, null)
// { tabId, pageId } | null
```

`resolveTabPageContext()` 是同一份上下文的兼容解析函数（同时兼容旧版 attrs / props 注入），适合在不能直接 `inject` 的辅助函数里使用。

## addScrollTarget

设置当前页面的滚动元素。

**调用：** addScrollTarget(...scroller:string[])

**说明：**

```typescript:line-numbers
import { useTabRouter } from 'vue-stack-tabs'
const { addScrollTarget } = useTabRouter()
// 单个元素
addScrollTarget('.custom-scroller')
// 多个元素
addScrollTarget('.custom-scroller', '.custom-scroller-2')
// 使用元素ID
addScrollTarget('#panel')
```
