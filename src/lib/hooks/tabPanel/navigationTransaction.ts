/**
 * 导航事务管理器。
 *
 * 将「乐观 UI 更新 → 路由导航 → 确认/回滚」包装为原子事务：
 * 1. apply()  — 先对 UI 状态做乐观修改，返回快照
 * 2. navigate() — 执行 router.push 等异步导航
 * 3. 成功 → commit()；失败/异常 → rollback(snapshot) 恢复快照
 *
 * 当连续快速操作导致事务过期时（isCurrent 返回 false），
 * 不回滚而是调用 cleanupStale() 清理残留状态，避免覆盖新事务的结果。
 */
interface NavigationTransactionOptions<TSnapshot, TResult> {
  /** 乐观应用 UI 变更，返回可用于 rollback 的快照 */
  apply: () => TSnapshot
  /** 执行异步路由导航 */
  navigate: () => Promise<TResult>
  /** 导航失败时回滚到快照状态 */
  rollback: (snapshot: TSnapshot) => void
  /** 导航成功后的确认回调（如驱逐旧缓存） */
  commit?: () => void
  /** 判断导航结果是否为失败（如 vue-router 返回的 NavigationFailure） */
  isFailureResult?: (result: TResult) => boolean
  /** 若为失败结果，是否将其作为异常抛出 */
  rejectFailureResult?: boolean
  /** 检查当前事务是否仍然有效（防止过期事务覆盖新状态） */
  isCurrent?: () => boolean
  /** 事务已过期时的清理回调（替代 rollback） */
  cleanupStale?: () => void
}

/**
 * 执行一次导航事务：apply → navigate → commit/rollback。
 * 保证乐观更新在导航失败时能安全回滚。
 */
export const runNavigationTransaction = async <TSnapshot, TResult>(
  options: NavigationTransactionOptions<TSnapshot, TResult>
): Promise<TResult> => {
  const snapshot = options.apply()

  try {
    const result = await options.navigate()
    if (options.isFailureResult?.(result)) {
      if (options.isCurrent?.() ?? true) {
        options.rollback(snapshot)
      } else {
        options.cleanupStale?.()
      }
      if (options.rejectFailureResult) throw result
      return result
    }
    if (options.isCurrent?.() ?? true) options.commit?.()
    return result
  } catch (error) {
    if (options.isCurrent?.() ?? true) {
      options.rollback(snapshot)
    } else {
      options.cleanupStale?.()
    }
    throw error
  }
}
