import { describe, expect, it } from 'vitest'
import { runNavigationTransaction } from '@/lib/hooks/tabPanel/navigationTransaction'

describe('runNavigationTransaction', () => {
  it('导航失败时回滚已应用的状态变更并继续抛出错误', async () => {
    const error = new Error('navigation cancelled')
    let pages = ['root']

    await expect(
      runNavigationTransaction({
        apply: () => {
          const snapshot = [...pages]
          pages = [...pages, 'detail']
          return snapshot
        },
        navigate: () => Promise.reject(error),
        rollback: (snapshot) => {
          pages = snapshot
        }
      })
    ).rejects.toBe(error)

    expect(pages).toEqual(['root'])
  })

  it('导航以 failure 结果 resolve 时回滚状态且不执行提交回调', async () => {
    const failure = { type: 'aborted' }
    let pages = ['root']
    let committed = false

    await expect(
      runNavigationTransaction({
        apply: () => {
          const snapshot = [...pages]
          pages = [...pages, 'detail']
          return snapshot
        },
        navigate: () => Promise.resolve(failure),
        rollback: (snapshot) => {
          pages = snapshot
        },
        commit: () => {
          committed = true
        },
        isFailureResult: (result) => result === failure
      })
    ).resolves.toBe(failure)

    expect(pages).toEqual(['root'])
    expect(committed).toBe(false)
  })

  it('配置为 rejectFailureResult 时，resolved failure 会回滚并 reject', async () => {
    const failure = { type: 'aborted' }
    let pages = ['root']

    await expect(
      runNavigationTransaction({
        apply: () => {
          const snapshot = [...pages]
          pages = [...pages, 'detail']
          return snapshot
        },
        navigate: () => Promise.resolve(failure),
        rollback: (snapshot) => {
          pages = snapshot
        },
        isFailureResult: (result) => result === failure,
        rejectFailureResult: true
      })
    ).rejects.toBe(failure)

    expect(pages).toEqual(['root'])
  })

  it('事务过期时不回滚也不提交，避免旧导航覆盖新导航状态', async () => {
    const error = new Error('stale navigation')
    let pages = ['newer-success']
    let committed = false
    let rolledBack = false

    await expect(
      runNavigationTransaction({
        apply: () => ['old-root'],
        navigate: () => Promise.reject(error),
        rollback: () => {
          rolledBack = true
          pages = ['old-root']
        },
        commit: () => {
          committed = true
        },
        isCurrent: () => false
      })
    ).rejects.toBe(error)

    expect(pages).toEqual(['newer-success'])
    expect(rolledBack).toBe(false)
    expect(committed).toBe(false)
  })

  it('事务过期时执行过期清理但不做整栈回滚', async () => {
    const failure = { type: 'cancelled' }
    let pages = ['root', 'stale-optimistic', 'newer-success']
    let rolledBack = false

    await expect(
      runNavigationTransaction({
        apply: () => ['root'],
        navigate: () => Promise.resolve(failure),
        rollback: () => {
          rolledBack = true
          pages = ['root']
        },
        cleanupStale: () => {
          pages = pages.filter((page) => page !== 'stale-optimistic')
        },
        isFailureResult: (result) => result === failure,
        isCurrent: () => false
      })
    ).resolves.toBe(failure)

    expect(rolledBack).toBe(false)
    expect(pages).toEqual(['root', 'newer-success'])
  })

  it('导航成功时保留状态变更并执行提交回调', async () => {
    let pages = ['root']
    let committed = false

    await expect(
      runNavigationTransaction({
        apply: () => {
          const snapshot = [...pages]
          pages = [...pages, 'detail']
          return snapshot
        },
        navigate: () => Promise.resolve('ok'),
        rollback: (snapshot) => {
          pages = snapshot
        },
        commit: () => {
          committed = true
        }
      })
    ).resolves.toBe('ok')

    expect(pages).toEqual(['root', 'detail'])
    expect(committed).toBe(true)
  })
})
