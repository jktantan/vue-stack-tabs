# useStackTab

用于`打开`、`激活`、`重置`页签，可以在页签内外使用。

```typescript
import { useStackTab } from 'vue-stack-tabs'

const { openNewTab, active, reset } = useStackTab()
```

## openNewTab

打开一个新的页签

**调用：** openNewTab(tab: ITabData)

**返回值：** 页签ID

**参数定义：**

| 属性 | 类型|必填 | 默认值|说明 |
|:------:|:------:|:------:|:------:|:------------------------------------------------------------|
| id | string| 否 | |页签ID，可不指定。 在指定ID的情况下，VueStackTabs有相同ID页签的情况下为激活此页签，否则打开新的页签 |
| title | string| 是 || 页签名称 |
| path | string| 是 | |跳转地址 |
| query | Record<String,String>|| 否 | URL参数 |
| closable | boolean| 否 | true |是否可关闭 |
| refreshable | boolean| 否 | true|是否可刷新 |
| iframe | boolean| 否 | true |是否iframe打开 |

## active

激活一个页签

**调用：** active(tabId:string)

## reset

重置 VueStackTabs

**调用：** reset()