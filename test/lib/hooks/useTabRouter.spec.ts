import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Stack } from '@/lib/model/TabModel'
import type { ITabItem } from '@/lib/model/TabModel'

const push = vi.fn()
const emit = vi.fn()
const evictPageCache = vi.fn()
const active = vi.fn()
let currentTab: ITabItem

vi.mock('vue', async () => {
  const actual = await vi.importActual<typeof import('vue')>('vue')
  return {
    ...actual,
    getCurrentInstance: () => ({
      attrs: { tId: 'tab-1', pId: 'page-detail' },
      props: {}
    })
  }
})

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: { __tab: 'encoded-tab' } }),
  useRouter: () => ({ push }),
  isNavigationFailure: (value: unknown) =>
    typeof value === 'object' && value !== null && 'type' in value
}))

vi.mock('@/lib/hooks/useTabPanel', () => ({
  default: () => ({
    getTab: () => currentTab,
    evictPageCache,
    addPageScroller: vi.fn(),
    active
  })
}))

vi.mock('@/lib/hooks/useTabEventBus', () => ({
  TabEventType: {
    FORWARD: 'FORWARD',
    BACKWARD: 'BACKWARD'
  },
  useTabEmitter: () => ({ emit })
}))

describe('useTabRouter', () => {
  beforeEach(() => {
    vi.resetModules()
    push.mockReset()
    emit.mockReset()
    evictPageCache.mockReset()
    active.mockReset()
    currentTab = {
      id: 'tab-1',
      title: 'Tab',
      closable: true,
      refreshable: true,
      iframe: false,
      active: true,
      pages: new Stack([
        { id: 'page-root', tabId: 'tab-1', path: '/root', query: { __tab: 'encoded-tab' } },
        { id: 'page-detail', tabId: 'tab-1', path: '/detail', query: { __tab: 'encoded-tab' } }
      ])
    }
  })

  it('backward 事务过期失败时清理本次弹出的缓存但不整栈回滚', async () => {
    const failure = { type: 'cancelled' }
    let rejectBackward!: (error: unknown) => void
    push
      .mockReturnValueOnce(
        new Promise((_, reject) => {
          rejectBackward = reject
        })
      )
      .mockResolvedValueOnce(undefined)

    const { default: useTabRouter } = await import('@/lib/hooks/useTabRouter')
    const router = useTabRouter()

    expect(router.backward(1)).toBe(true)
    router.forward({ path: '/newer' })
    await Promise.resolve()
    rejectBackward(failure)
    await Promise.resolve()
    await Promise.resolve()

    const pageIds = currentTab.pages.list().map((page) => page.id)
    expect(pageIds).toContain('page-root')
    expect(pageIds).not.toContain('page-detail')
    expect(evictPageCache).toHaveBeenCalledWith('page-detail')
  })

  it('forward optimistic page 保存 query 拷贝，不保留传入 to.query 引用', async () => {
    const { default: useTabRouter } = await import('@/lib/hooks/useTabRouter')
    const router = useTabRouter()
    const targetQuery = { filter: 'open' }

    router.forward({ path: '/detail-next', query: targetQuery })

    const pushedPage = currentTab.pages.peek()
    expect(pushedPage?.query).toEqual({ filter: 'open' })
    expect(pushedPage?.query).not.toBe(targetQuery)

    targetQuery.filter = 'closed'
    expect(pushedPage?.query?.filter).toBe('open')
  })

  it('forward optimistic page 会浅拷贝 to.query 中的数组值', async () => {
    const { default: useTabRouter } = await import('@/lib/hooks/useTabRouter')
    const router = useTabRouter()
    const tags = ['a', 'b']

    router.forward({ path: '/detail-next', query: { tags } })

    const pushedPage = currentTab.pages.peek()
    expect(pushedPage?.query?.tags).toEqual(['a', 'b'])
    expect(pushedPage?.query?.tags).not.toBe(tags)

    if (Array.isArray(pushedPage?.query?.tags)) {
      pushedPage.query.tags.push('internal-only')
    }
    expect(tags).toEqual(['a', 'b'])
  })
})
