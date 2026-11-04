# useTabScrollShadow

读取和控制当前页面的上下滚动阴影。可在缓存页内的任意组件中调用，包括包在页面内容外层的布局组件。

```typescript
import { useTabScrollShadow } from 'vue-stack-tabs'

const shadow = useTabScrollShadow()
```

::: warning
请在 `<VueStackTabs>` 的缓存页内部调用。控制器由缓存包装组件 provide；在页签外调用会抛出错误。
:::

阴影由库根据主滚动容器自动计算。`state` 描述的是**当前应该显示哪一侧**，不是滚动方向：

| 值         | 含义                             | 显示效果           |
| ---------- | -------------------------------- | ------------------ |
| `'none'`   | 内容不足一屏，或已经贴边         | 不显示阴影         |
| `'top'`    | 上方还有内容（通常已离开顶部）   | 只显示顶部阴影     |
| `'bottom'` | 下方还有内容（通常尚未滚到底部） | 只显示底部阴影     |
| `'both'`   | 上下都有内容                     | 顶部和底部同时显示 |

判定阈值默认 5px：距离边界 ≤ 5px 视为已贴边，不显示该侧阴影。

## 成员

| 成员                 | 说明                                                          |
| -------------------- | ------------------------------------------------------------- |
| `state`              | 当前应显示哪一侧的阴影（只读响应式）                          |
| `enabled`            | 当前页是否允许库渲染阴影；任一侧启用即为 `true`（只读响应式） |
| `enabledSides`       | 当前页上下两侧的渲染开关（只读响应式 `{ top, bottom }`）      |
| `setEnabled(config)` | 手动开关当前页阴影；`boolean` 控制两侧，对象可单独控制某一侧  |
| `reset()`            | 清除手动开关，回退到 `scroll-shadow` 全局配置                 |
| `getState()`         | 同步读取当前方向                                              |
| `onStateChange(cb)`  | 订阅方向变化；返回取消订阅函数                                |

## 示例

```vue:line-numbers
<script setup lang="ts">
import { useTabScrollShadow } from 'vue-stack-tabs'

const shadow = useTabScrollShadow()

// 'none' | 'top' | 'bottom' | 'both'
console.log(shadow.state.value)

// 手动关闭当前页阴影；state 仍会继续更新
shadow.setEnabled(false)

// 只关闭底部阴影，顶部阴影仍由库渲染
shadow.setEnabled({ bottom: false })

// 读取当前两侧的渲染开关（已解析为确定的布尔值）
console.log(shadow.enabledSides.value) // { top: true, bottom: false }

// 恢复自动计算
shadow.reset()

// 回调订阅，返回取消订阅函数
const stop = shadow.onStateChange((state) => {
  console.log(state)
})
</script>
```

## 与全局配置的关系

- 页面级设置优先于 `<VueStackTabs :scroll-shadow="...">` 的全局配置。
- `setEnabled(false)` / `setEnabled({ top: false })` 只关闭库的阴影渲染；`state` 仍然按滚动位置更新，适合业务自绘滚动条或阴影。
- `setEnabled(true)` / `reset()` 恢复由库渲染。
- `enabled` 在任一侧启用时为 `true`；需要精确判断某一侧时读取 `enabledSides`。
- `pageScroll="none"` 且没有注册滚动源时，阴影状态保持 `none`；用 [`useTabPageScroll`](./useTabPageScroll.md) 注册后会重新计算。

相关：[滚动位置](../advance/scroll.md)、[配置属性](./properties.md)、[useTabPageScroll](./useTabPageScroll.md)
