/** 在浏览器控制台输出带样式的库版本标识 */
const logVersion = (version: string) => {
  if (typeof window === 'undefined') return

  window.console.log(
    '%c vue-stack-tabs %c v' + version + ' %c',
    'background:#306fff; padding:2px 8px; border-radius:3px 0 0 3px; color:#fff;',
    'background:#00d797; padding:2px 8px; border-radius:0 3px 3px 0; color:#fff;',
    'background:transparent'
  )
}

export default logVersion
