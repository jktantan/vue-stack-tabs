# 页签操作

## 打开

VueStackTab提供函数来打开或切换页签

**示例：**

```typescript
// 引用useStackTab方法
import { useStackTab } from 'vue-stack-tabs'

const { openNewTab } = useStackTab()

/**
 * 如果没传ID，则新建页答
 * ID相同时，则只切换页签
 * return 页签ID
 */
const tabId = openNewTab({
  id: 'dashboard',
  title: '首页',
  path: '/dashboard',
  closable: false
})
```

## 切换页签
**示例：**

```typescript
// 引用useStackTab方法
import { useStackTab } from 'vue-stack-tabs'

const { active } = useStackTab()

// 传入页签ID
active("dashboard")
```

## 重置页签
**示例：**

```typescript:line-numbers
// 引用useStackTab方法
import { useStackTab } from 'vue-stack-tabs'

const { reset } = useStackTab()

reset()
```

## 页签页面加载动画
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