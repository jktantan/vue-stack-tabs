# Vue-stack-tabs 页签边框缩放差异设计

## 目标

修复 vue-stack-tabs 在 Chrome 浏览器缩放下 inactive 页签底边显示不稳定的问题，同时保留 header 分隔线、active 无异色下边框，以及 Firefox 的既有视觉效果。

## 现象与假设

用户在 source-linked standalone Demo 报告 Chrome 100% 下 inactive 底边不见、非 100% 可见，并在 m16319 确认根因与 `content-visibility: auto` 有关。源码中该属性原本同时用于 `.stack-tab__nav` 与边框所在的 `.stack-tab__item`；此前仅把 header 边线改成 inset shadow 并未解决现象。此次从 nav 与 item 上移除该优化，保留原有边框颜色、40px 几何和 active 覆盖规则。用户已定位因果并在最终修复后手工测试，反馈无问题（m16459）；本会话未记录其具体浏览器、主题与缩放矩阵。

## 方案

在 `src/lib/assets/style/stack-tab.scss` 中，header 分隔线继续使用不占布局的 inset box-shadow；从 `.stack-tab__nav` 与 `.stack-tab__item` 移除 `content-visibility: auto`，让 1px inactive 底边参与常规绘制；active 底边仍与 active 背景同色。保留原有颜色、40px 尺寸、滚动逻辑与 API。以源码测试验证样式契约，并在实际 Chrome/Firefox 浏览器缩放下验证视觉结果；记录 browser zoom 与 devicePixelRatio，不能用 device scale factor 替代 browser zoom。

## 范围与非目标

- 修改库 SCSS、针对该样式的回归测试、CHANGELOG；dist 只通过 lib:build 生成。
- 不改公开 API、页签高度、滚动逻辑、边框颜色或背景设计；移除 nav 与 item 的离屏绘制跳过优化，确保边线常规绘制。
- 按用户后续确认将 package patch 版本升级至 3.3.4 并本地提交；不发布 npm 包、不改 conductor 依赖。
- conductor 暗色动态背景的视觉接缝需与真实 CSS border 分开分析，不通过遮挡背景来满足本次验收。

## 验收标准

1. header 仍有 1px 等色分隔线，绘制不压缩 40px border-box 的布局尺寸。
2. active 下边框颜色仍与 active 背景一致；inactive 自身底边在 Chrome 与 Firefox 的 100% 和 110% browser zoom 下均可辨认。
3. 明暗主题均验证；报告记录浏览器版本、browser zoom 与 devicePixelRatio。
4. 回归测试、库规范/类型/预打包检查、库构建和打包后验证通过。
