/**
 * tabPanel/state - 标签页运行时状态 factory
 *
 * 职责：创建 tabs、caches、components、驱逐集合、滚动位置等运行时状态。
 * 注意：本文件不导出模块级可变状态；每个 Vue app 只有一个 StackTabsRuntimeContext 持有这些状态。
 */
import type { DefineComponent, Ref, ShallowRef } from 'vue'
import { ref, shallowRef } from 'vue'
import type { ITabItem } from '../../model/TabModel'

export interface ScrollPosition {
  top: number
  left: number
}

export interface TabPanelRuntimeState {
  tabs: Ref<ITabItem[]>
  defaultTabs: Ref<ITabItem[]>
  caches: ShallowRef<string[]>
  components: Map<string, DefineComponent>
  cacheIdsToEvict: Set<string>
  tabIdsToEvict: Set<string>
  refreshKey: Ref<number>
  scrollPositionsByPageId: Map<string, Map<string, ScrollPosition>>
  isInitialized: Ref<boolean>
  iframeRefreshKeys: Ref<Record<string, number>>
  maxTabCount: Ref<number>
  useGlobalScroll: Ref<boolean>
  sessionPrefix: Ref<string>
}

/** sessionStorage 中存储当前激活标签的 key 后缀 */
export const SESSION_TAB_NAME = 'stacktab-active-tab'

export const createTabPanelRuntimeState = (): TabPanelRuntimeState => ({
  tabs: ref<ITabItem[]>([]) as Ref<ITabItem[]>,
  defaultTabs: ref<ITabItem[]>([]) as Ref<ITabItem[]>,
  caches: shallowRef<string[]>([]),
  components: new Map<string, DefineComponent>(),
  cacheIdsToEvict: new Set<string>(),
  tabIdsToEvict: new Set<string>(),
  refreshKey: ref<number>(0),
  scrollPositionsByPageId: new Map<string, Map<string, ScrollPosition>>(),
  isInitialized: ref<boolean>(false),
  iframeRefreshKeys: ref<Record<string, number>>({}),
  maxTabCount: ref<number>(0),
  useGlobalScroll: ref<boolean>(false),
  sessionPrefix: ref<string>('')
})
