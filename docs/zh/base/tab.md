# 页签操作

## 打开

VueStackTabs 提供 useTabActions 来打开或切换页签

**示例：**

```typescript
// 引用 useTabActions
import { useTabActions } from 'vue-stack-tabs'

const { openTab } = useTabActions()

/**
 * 如果没传ID，则新建页答
 * ID相同时，则只切换页签
 * return 页签ID
 */
const tabId = openTab({
  id: 'dashboard',
  title: '首页',
  path: '/dashboard',
  closable: false
})
```

## 切换页签

**示例：**

```typescript
// 引用 useTabActions
import { useTabActions } from 'vue-stack-tabs'

const { activeTab } = useTabActions()

// 传入页签ID
activeTab('dashboard')
```

## 重置页签

**示例：**

```typescript:line-numbers
// 引用 useTabActions
import { useTabActions } from 'vue-stack-tabs'

const { reset } = useTabActions()

reset()
```

## 页签页面加载动画

**示例：**

```typescript:line-numbers
// 引用 useTabActions
import { useTabLoading } from 'vue-stack-tabs'

const { openTabLoading,closeTabLoading } = useTabLoading()

//打开加载动画
openTabLoading()
//关闭加载动画
closeTabLoading()
```
