import logoRaw from './assets/image/logo.svg?raw'

/**
 * 控制台专用 viewBox：原图 400×400 四周留白较多，
 * 缩到 40px 左右时主体偏小；裁到内容区后同样尺寸更清晰。
 */
const CONSOLE_LOGO_VIEWBOX = '60 70 280 220'
/** logo 显示尺寸（px），实际由 padding 的一半撑出 */
const LOGO_SIZE = 48
/** logo 存在时，第二行文字相对 logo 右侧的缩进（logo 宽度 + 间距） */
const TEXT_INDENT = LOGO_SIZE + 8
/** 品牌副标题 */
const SUBTITLE = 'Vue Router multi-tab manager'

let logoDataUri: string | undefined

/** 把 SVG 内联成 data URI；失败时返回空串，降级为纯文字版本 */
const getLogoDataUri = (): string => {
  if (logoDataUri !== undefined) return logoDataUri
  try {
    const svg = logoRaw.replace('viewBox="0 0 400 400"', `viewBox="${CONSOLE_LOGO_VIEWBOX}"`)
    logoDataUri = `data:image/svg+xml;base64,${btoa(svg)}`
  } catch {
    logoDataUri = ''
  }
  return logoDataUri
}

/** 在浏览器控制台输出带样式的库版本标识 */
const logVersion = (version?: string) => {
  if (typeof window === 'undefined') return

  // 兜底：Vitest / SSR 等环境下 import.meta.env.PACKAGE_VERSION 缺失，
  // 避免打印出 "vundefined" 这种丑陋的版本号。
  const displayVersion = typeof version === 'string' && version.length > 0 ? version : 'dev'
  const logo = getLogoDataUri()

  // 第一行：品牌 logo。空内容 + padding 撑出 LOGO_SIZE 的方块，
  // DevTools 的控制台样式是 CSS 子集，不能用 flex / width+height 布局。
  if (logo) {
    window.console.log(
      // 末尾的空格不能省：DevTools 只会给包含文本的 %c 片段应用样式，
      // 空的 %c 在部分 Chrome 版本里会被直接忽略，导致看不到图片。
      '%c ',
      [
        'display:inline-block',
        `padding:${LOGO_SIZE / 2}px`,
        'line-height:0',
        'font-size:0',
        // 深色控制台下 logo 的深蓝主体几乎隐形，垫一层浅色底衬
        'background-color:#f1f5f9',
        'border-radius:8px',
        `background-image:url("${logo}")`,
        'background-repeat:no-repeat',
        'background-position:center',
        'background-size:contain'
      ].join(';')
    )
  }

  // 第二行：库名 + 版本胶囊 + 副标题。
  // 注意：必须用 window.console.log。库构建开启了 terser 的 drop_console，
  // 裸 console.log 会被整句移除，window.console.log 不在剔除规则内，发布版才会保留。
  window.console.log(
    `%c vue-stack-tabs %c v${displayVersion} %c ${SUBTITLE} `,
    [
      // `padding-left:${logo ? TEXT_INDENT : 0}px`,
      `padding-left:0px`,
      'color:#42b883',
      'font-size:14px',
      'font-weight:700',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif',
      'vertical-align:middle'
    ].join(';'),
    [
      'background:#42b883',
      'background:linear-gradient(135deg,#42b883,#00d797)',
      'color:#0f172a',
      'font-size:11px',
      'font-weight:700',
      'font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace',
      'padding:2px 8px',
      'border-radius:999px',
      'vertical-align:middle'
    ].join(';'),
    [
      'color:#7d8590',
      'font-size:11px',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif',
      'vertical-align:middle'
    ].join(';')
  )
}

export default logVersion
