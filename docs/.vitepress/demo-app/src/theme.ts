/**
 * 在线演示的主题控制。
 *
 * 深色沿用库的约定：`html.dark` / `html[data-theme="dark"]`。
 * 主色通过 `html[data-accent="…"]` 同时覆盖 demo 自身 token（--demo-*）
 * 与库的主题变量（--stack-tab-accent*），这样页签栏和演示控制台一起换色。
 */
export type DemoTheme = 'light' | 'dark'
export type DemoAccent = 'blue' | 'green' | 'violet'

const THEME_STORAGE_KEY = 'vue-stack-tabs-demo-theme'
const ACCENT_STORAGE_KEY = 'vue-stack-tabs-demo-accent'

const isTheme = (value: string | null): value is DemoTheme => value === 'light' || value === 'dark'

const isAccent = (value: string | null): value is DemoAccent =>
  value === 'blue' || value === 'green' || value === 'violet'

const readQuery = (key: string): string | null => {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get(key)
}

const readStorage = (key: string): string | null => {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export const resolveInitialTheme = (): DemoTheme => {
  const fromQuery = readQuery('theme')
  if (isTheme(fromQuery)) return fromQuery

  const stored = readStorage(THEME_STORAGE_KEY)
  if (isTheme(stored)) return stored

  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

export const resolveInitialAccent = (): DemoAccent => {
  const fromQuery = readQuery('accent')
  if (isAccent(fromQuery)) return fromQuery

  const stored = readStorage(ACCENT_STORAGE_KEY)
  return isAccent(stored) ? stored : 'blue'
}

/**
 * 应用主题。persist=false 用于初始化，避免把系统偏好或 URL 参数误写入 localStorage。
 */
export const applyDemoTheme = (theme: DemoTheme, accent: DemoAccent, persist = true): void => {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  if (theme === 'dark') {
    root.setAttribute('data-theme', 'dark')
  } else {
    root.removeAttribute('data-theme')
  }
  root.setAttribute('data-accent', accent)

  if (!persist) return
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
    window.localStorage.setItem(ACCENT_STORAGE_KEY, accent)
  } catch {
    // 隐私模式或存储被禁用时忽略
  }
}

/** 在挂载前调用，让首屏就使用正确的主题，避免闪烁。 */
export const initDemoTheme = (): void => {
  applyDemoTheme(resolveInitialTheme(), resolveInitialAccent(), false)
}
