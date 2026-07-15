/**
 * WAI-ARIA 无障碍 ID 生成工具。
 * 为 tab/panel 元素生成符合 ARIA tablist 模式的关联 ID。
 */

/** 生成 tab 触发器的 DOM id，用于 aria-controls 关联 */
export const getStackTabTabId = (tabId: string): string =>
  `stack-tab-tab-${encodeURIComponent(tabId)}`

/** 生成 tab 面板的 DOM id，用于 aria-labelledby 关联 */
export const getStackTabPanelId = (tabId: string): string =>
  `stack-tab-panel-${encodeURIComponent(tabId)}`
