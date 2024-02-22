import type { ITabBase, ITabItem } from '@/lib/model/TabModel'
import { ref, unref } from 'vue'
import type { DefineComponent } from 'vue'
import { useRouter } from 'vue-router'

const tabs = ref<ITabItem[]>([])
const defaultTabs: ITabItem[] = []
// cache
const caches = ref<string[]>([])
// Dynamic components
const components = new Map<string, DefineComponent>()
const deletableCache = new Set<String>()
const pageShown = ref<boolean>(true)
export default () => {
  const router = useRouter()
  const hasTab = (id: string) => {
    for (const tab of tabs.value) {
      if (tab.id === id) {
        return true
      }
    }
    return false
  }
  const addTab = (tab: ITabBase) => {}
  /**
   * if id is null , then remove all tab that deleted is true
   * @param id
   */
  const removeTab = (id: string) => {
    for (let i = tabs.value.length - 1; i >= 0; i--) {
      if (id === unref(tabs)[i].id) {
        for (const item of unref(tabs)[i].pages.list()) {
          removeComponent(item.id)
          markDeletableCache(item.id)
        }
        unref(tabs)[i].pages.clear()
        unref(tabs).splice(i, 1)
      }
    }
  }
  const addComponent = (id: string, comp: DefineComponent) => {
    components.set(id, comp)
  }
  const removeComponent = (id: string) => {
    components.delete(id)
  }

  /**
   * Delete the cache after new Page loaded.
   * @param cacheName
   */
  const markDeletableCache = (cacheName: string) => {
    deletableCache.add(cacheName)
  }
  const removeDeletableCache = () => {
    for (let i = caches.value.length - 1; i >= 0; i--) {
      if (deletableCache.has(caches.value[i])) {
        unref(caches).splice(i, 1)
      }
    }
    deletableCache.clear()
  }
  const removeCache = (cacheName: string) => {
    for (let i = caches.value.length - 1; i >= 0; i--) {
      if (cacheName === caches.value[i]) {
        unref(caches).splice(i, 1)
      }
    }
  }
  const addCache = (cacheName: string) => {
    const cacheSet = new Set(caches.value)
    if (!cacheSet.has(cacheName)) {
      caches.value.push(cacheName)
    }
  }

  /**
   * active the tab,
   * @param id
   * @return true if already actived
   */
  const active = (id: string, route = true) => {
    for (let i = tabs.value.length - 1; i >= 0; i--) {
      const tab = tabs.value[i]
      if (tab.id === id) {
        if (tab.active) {
          break
        } else {
          tab.active = true
          pageShown.value = false
          if (route) {
            const top = tab.pages.peek()
            router.push({
              path: top!.path,
              query: top!.query
            })
          }
        }
      } else {
        tabs.value[i].active = false
      }
    }
  }
  /**
   * save current tab info into Browser's session
   * @param id
   */
  const updateSession = (tab: ITabItem) => {
    // window.sessionStorage.setItem('tabItems', JSON.stringify(currentItems?.values()))
    window.sessionStorage.setItem('tab', JSON.stringify(tab))
  }
  const reset = () => {
    destroy()
    unref(tabs).push(...defaultTabs)
    active(defaultTabs[0].id)
  }
  const destroy = () => {
    unref(tabs).splice(0)
    components.clear()
    deletableCache.clear()
    unref(caches).splice(0)
    pageShown.value = true
  }

  return {
    tabs,
    caches,
    pageShown,
    active,
    destroy,
    reset,
    addCache,
    removeCache,
    addTab,
    removeTab,
    hasTab,
    addComponent,
    removeComponent,
    markDeletableCache,
    removeDeletableCache
  }
}
