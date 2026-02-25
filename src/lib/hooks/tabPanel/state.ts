/**
 * tabPanel/state - 标签页核心共享状态
 *
 * 职责：集中管理 tabs、caches、components、驱逐集合、滚动位置等
 * 被 useTabPanel、evict、scroll、session 导入使用
 */
import type { ITabItem } from '../../model/TabModel'
import { ref } from 'vue'

/** 当前打开的标签列表（含每个标签的页面栈） */
export const tabs = ref<ITabItem[]>([])
/** 初始化时传入的默认标签（用于对比 session 恢复） */
export const defaultTabs: ITabItem[] = []
/** keep-alive include 数组，与 Vue 的 keep-alive :include 绑定 */
export const caches = ref<string[]>([])
/** 页面缓存 ID -> 包装后的 DefineComponent */
export const components = new Map<string, import('vue').DefineComponent>()
/** 待驱逐的页面缓存 ID 集合 */
export const cacheIdsToEvict = new Set<string>()
/** 待驱逐的标签 ID 集合 */
export const tabIdsToEvict = new Set<string>()
/** 刷新计数器，变更时触发 component :key 变化 */
export const refreshKey = ref<number>(0)
/** 刷新时临时加入 keep-alive exclude 的缓存 ID */
// 改用 ULID 的新架构，无需黑名单隔离机制
/** pageCacheId -> Map<selector, { top, left }> 滚动位置存储 */
export const scrollPositionsByPageId = new Map<string, Map<string, { top: number; left: number }>>()
/** 是否已完成初始化 */
export const isInitialized = ref<boolean>(false)

/** sessionStorage 中存储当前激活标签的 key 前缀 */
export const SESSION_TAB_NAME = 'stacktab-active-tab'

/** iframe 标签 tabId -> 刷新序号，变更时触发 iframe 重载 */
export const iframeRefreshKeys = ref<Record<string, number>>({})

/** 最大标签数量，0 表示不限制 */
export let maxTabCount = 0
/** 是否使用页面级滚动 */
export let useGlobalScroll = false
/** sessionStorage key 前缀 */
export let sessionPrefix = ''

export const setMaxTabCount = (n: number) => {
  maxTabCount = n
}
export const setUseGlobalScroll = (v: boolean) => {
  useGlobalScroll = v
}
export const setSessionPrefix = (p: string) => {
  sessionPrefix = p
}
