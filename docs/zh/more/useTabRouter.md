# useTabRouter

用于在页签内进入路由前进后退等操作，只能在页签内的页面使用

```typescript
import { useTabRouter } from 'vue-stack-tabs'

const { forward, backward, addScroller } = useTabRouter()
```

## forward

页签内前进

**调用：** forward(to: RouteLocationPathRaw)

## backward

页签内回退

**调用：** backward(to:number|string, query:Record<string,string>)

**参数定义：**

|  参数   |          类型           | 必填 | 说明                                                          |
|:-----:|:---------------------:|:--:|:------------------------------------------------------------|
|  to   |    string 或 number    | 否  | 数字情况：如果为0，不做任何操作，非零情况为向前跳abs(x)步。<br/>URL情况：向前跳转到第一个符合条件的页面 |
| query | Record<string,string> | 否  | 一次性参数，用于向上一页面传递参数。上一页面需要在onActived中使用props来接收。              |


to:

## addScroller

设置当前页面的滚动元素。

**调用：** addScroller(...scroller:string[])

**说明：**

```typescript:line-numbers
import { useTabRouter } from 'vue-stack-tabs'
const { addScroller } = useTabRouter()
// 单个元素
addScroller('.custom-scroller')
// 多个元素
addScroller(['.custom-scroller','.custom-scroller-2'])
// 使用元素ID
addScroller('#panel')
```