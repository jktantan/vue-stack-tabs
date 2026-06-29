interface NavigationTransactionOptions<TSnapshot, TResult> {
  apply: () => TSnapshot
  navigate: () => Promise<TResult>
  rollback: (snapshot: TSnapshot) => void
  commit?: () => void
  isFailureResult?: (result: TResult) => boolean
  rejectFailureResult?: boolean
  isCurrent?: () => boolean
  cleanupStale?: () => void
}

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
