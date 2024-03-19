# 签内操作
:::warning
以下引用及功能只能在页签内页面使用
:::
## 加载动画
**示例：**

```typescript:line-numbers
// 引用useStackTab方法
import { useTabLoading } from 'vue-stack-tabs'

const { openTabLoading,closeTabLoading } = useTabLoading()

//打开加载动画
openTabLoading()
//关闭加载动画
closeTabLoading()
```

## 路由

### 前进
```typescript:line-numbers
// 引用useStackTab方法
import { useTabRouter } from 'vue-stack-tabs'

const { forward } = useTabRouter()

forward({
    path: '/next',
    query:{
      a: 'xxxx',
      b: 'xxxx'
    }
})
```

### 后退
```typescript:line-numbers
// 引用useStackTab方法
import { useTabRouter } from 'vue-stack-tabs'

const { backward } = useTabRouter()

//使用步数，即回退3步
backward(3,{
  refresh: true,
})
//使用地址
backward('/next/1',{
  refresh: true
})
```