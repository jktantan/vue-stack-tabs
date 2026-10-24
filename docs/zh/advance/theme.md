# 主题定制

组件内所有界面颜色与阴影都通过 CSS 变量控制。浅色模式的默认值与旧版硬编码值完全一致，升级后无需任何配置；需要换肤时，覆盖变量即可，不需要覆盖内部类名。

## 快速换肤

在样式入口或任意作用域覆盖变量：

```css
:root {
  --stack-tab-accent: #4f46e5;
  --stack-tab-accent-active: #4338ca;
  --stack-tab-accent-contrast: #fff;
}
```

只改主色即可同时影响页签 hover、拖拽指示条、滚动条拖拽、badge 主色和右键菜单悬停态。

## 深色主题

内置一套中性深色默认值，支持三种触发方式：

```html
<!-- Element Plus / VueUse 生态的常见约定 -->
<html class="dark"></html>

<!-- 显式主题标记 -->
<html data-theme="dark"></html>

<!-- 局部深色容器 -->
<div data-theme="dark">
  <vue-stack-tabs />
</div>
```

深色块会同时设置 `color-scheme: dark`，让原生滚动条和表单控件跟随变深。

库内所有主题块（浅色默认值、尺寸预设、深色）都包在 `:where()` 里，特异性为 0。因此宿主用普通 `:root` 覆盖即可同时压过浅色默认值和深色值，不需要 `:root:root` 之类的高特异性补丁：

```css
/* 同时作用于浅色与深色 */
:root {
  --stack-tab-accent: #4f46e5;
}

/* 只覆盖深色 */
:root.dark {
  --stack-tab-accent: #818cf8;
  --stack-tab-surface: #0b1120;
  --stack-tab-surface-muted: #172033;
  --stack-tab-border: #263244;
}
```

## 变量清单

### 主色

| 变量                          | 浅色默认值  | 用途                                            |
| ----------------------------- | ----------- | ----------------------------------------------- |
| `--stack-tab-accent`          | `#409eff`   | 页签 hover/激活、拖拽指示、滚动条拖拽、菜单悬停 |
| `--stack-tab-accent-active`   | `#337ecc`   | 主色按下态                                      |
| `--stack-tab-accent-contrast` | `#ffffff`   | 主色背景上的文字与图标、badge 文字              |
| `--stack-tab-accent-shadow`   | `#409effcc` | 拖拽指示条光晕                                  |
| `--stack-tab-menu-hover-bg`   | `#409eff`   | 右键菜单悬停背景（深色自动改用按下态主色）      |
| `--stack-tab-menu-hover-text` | `#ffffff`   | 右键菜单悬停文字与图标（深色为 `#f8fafc`）      |

### 表面与边框

| 变量                        | 浅色默认值 | 用途                                             |
| --------------------------- | ---------- | ------------------------------------------------ |
| `--stack-tab-surface`       | `#fff`     | 内容区、激活页签、页签头按钮、右键菜单、重试按钮 |
| `--stack-tab-surface-muted` | `#fafafa`  | 非激活页签、禁用按钮                             |
| `--stack-tab-overlay`       | `#fff`     | 全局 loading 遮罩                                |
| `--stack-tab-border`        | `#f0f0f0`  | 页签头下边框、页签/菜单/按钮边框                 |
| `--stack-tab-divider`       | `#a9a9a9`  | 右键菜单分隔线                                   |

### 文字与图标

| 变量                        | 浅色默认值  | 用途                              |
| --------------------------- | ----------- | --------------------------------- |
| `--stack-tab-text`          | `#4d4d4d`   | 页签文字、菜单项、iframe 重试按钮 |
| `--stack-tab-text-strong`   | `#000`      | 右键菜单激活页签的文字            |
| `--stack-tab-text-disabled` | `#aaa`      | 禁用态文字与图标                  |
| `--stack-tab-mask`          | `#4d4d4d`   | 关闭图标、滚动遮罩按钮、菜单图标  |
| `--stack-tab-scrollbar`     | `#0000001a` | 横向滚动条                        |

### 阴影

阴影分两层：颜色层负责透明度，整体层负责几何。宿主优先覆盖整体层；只调深浅时改颜色层即可。

| 变量                                | 浅色默认值               | 用途                          |
| ----------------------------------- | ------------------------ | ----------------------------- |
| `--stack-tab-shadow-color`          | `#0009`                  | 页签与 inset 工具类的阴影颜色 |
| `--stack-tab-shadow-soft`           | `#0000001a`              | 菜单软阴影颜色                |
| `--stack-tab-shadow-tab`            | 左右各 `-5px 0 5px -5px` | 激活页签整体阴影              |
| `--stack-tab-shadow-tab-left`       | `-5px 0 5px -5px`        | `.stack-tab__shadow-left`     |
| `--stack-tab-shadow-tab-right`      | `5px 0 5px -5px`         | `.stack-tab__shadow-right`    |
| `--stack-tab-shadow-menu`           | `5px 5px 5px`            | 右键菜单整体阴影              |
| `--stack-tab-shadow-drop`           | `0 0 6px`                | 拖拽指示条整体光晕            |
| `--stack-tab-shadow-inset-top`      | `inset 0 5px 5px -5px`   | 内容区顶部滚动阴影            |
| `--stack-tab-shadow-inset-bottom`   | `inset 0 -5px 5px -5px`  | 内容区底部滚动阴影            |
| `--stack-tab-shadow-inset-vertical` | 上下各一条               | 内容区上下滚动阴影            |
| `--stack-tab-shadow-inset-left`     | `inset 5px 0 5px -5px`   | 内容区左侧滚动阴影            |
| `--stack-tab-shadow-inset-right`    | `inset -5px 0 5px -5px`  | 内容区右侧滚动阴影            |
| `--stack-tab-shadow-inset-all`      | 左右各一条               | 内容区左右滚动阴影            |

`.stack-tab__shadow-inset-*` 工具类消费对应的 `--stack-tab-shadow-inset-*` 整体变量；深色下几何会自动加宽到 12/14px，颜色仍由 `--stack-tab-shadow-color` 控制。

### badge、loading 与 iframe

| 变量                               | 浅色默认值    | 用途                   |
| ---------------------------------- | ------------- | ---------------------- |
| `--stack-tab-badge-default`        | `#ef4f4f`     | badge 默认色           |
| `--stack-tab-badge-primary`        | `#409eff`     | badge 主色             |
| `--stack-tab-loading-accent`       | 主色 60% 透明 | loading 圆环，跟随主色 |
| `--stack-tab-iframe-loading-bg`    | `#f5f5f5`     | iframe 加载背景        |
| `--stack-tab-iframe-loading-color` | `#999`        | iframe 加载文字        |
| `--stack-tab-iframe-error-bg`      | `#ffffffeb`   | iframe 错误背景        |
| `--stack-tab-iframe-error-color`   | `#666`        | iframe 错误文字        |

### 布局与尺寸

| 变量                                   | 默认值 | 用途                            |
| -------------------------------------- | ------ | ------------------------------- |
| `--stack-tab-font-size`                | `14px` | 页签、右键菜单、iframe 文本字号 |
| `--stack-tab-head-height`              | `40px` | 页签头高度                      |
| `--stack-tab-context-menu-item-height` | `30px` | 右键菜单项高度                  |
| `--stack-tab-context-menu-padding`     | `8px`  | 右键菜单内边距                  |

内置三档尺寸，通过 `data-stack-tab-size` 激活（也支持局部容器）：

```html
<html data-stack-tab-size="small"></html>
<!-- normal / large 同理；也可以直接覆盖上面的变量 -->
```

尺寸预设同样包在 `:where()` 里，宿主在 `:root` 覆盖 `--stack-tab-font-size` 等变量时会压过预设值。

| 预设     | 字号 | 页签头高度 | 菜单项高度 | 菜单内边距 |
| -------- | ---- | ---------- | ---------- | ---------- |
| `small`  | 12px | 32px       | 26px       | 6px        |
| `normal` | 14px | 40px       | 30px       | 8px        |
| `large`  | 16px | 48px       | 36px       | 10px       |

## 局部覆盖

变量定义在 `:where(:root)`（特异性 0），任何作用域覆盖都只影响其内部：

```css
.side-layout {
  --stack-tab-accent: #10b981;
}
```

## 注意事项

- 浅色模式的变量默认值等于旧版硬编码值，升级后视觉不变。
- 深色背景会吞掉纯黑阴影，因此深色默认改用“描边 + 主色光晕 + 顶部高光”表达层次，并把 `--stack-tab-border` 调亮到 `#334155`。需要更强或更弱的阴影时，覆盖 `--stack-tab-shadow-tab` / `--stack-tab-shadow-menu` 即可。
- 这些变量从 `2.4.0` 起视为公开 API：只新增，不重命名。
- 主题选择器使用 `:where()` 归零特异性，宿主普通 `:root` 覆盖在浅色与深色下都生效；请勿再使用 `:root:root` 之类的高特异性写法。`:where()` 支持 Chrome 88+ / Safari 14+ / Firefox 78+，与库内已使用的 `color-mix()`（Chrome 111+）相比不构成额外限制。
