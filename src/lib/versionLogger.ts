/** 在浏览器控制台输出带样式的库版本标识 */
const logVersion = (version?: string) => {
  if (typeof window === 'undefined') return

  // 兜底：Vitest / SSR 等环境下 import.meta.env.PACKAGE_VERSION 缺失，
  // 避免打印出 "vundefined" 这种丑陋的版本号。
  const displayVersion = typeof version === 'string' && version.length > 0 ? version : 'dev'

  window.console.log(
    '%c vue-stack-tabs %c v' + displayVersion + ' %c',
    'background:#306fff; padding:2px 8px; border-radius:3px 0 0 3px; color:#fff;',
    'background:#00d797; padding:2px 8px; border-radius:0 3px 3px 0; color:#fff;',
    'background:transparent'
  )
}

export default logVersion
