/**
 * 演示应用的双语文案。
 *
 * 语言来源：文档站把 VitePress 的 `locale.lang` 通过 iframe 的 `?lang=` 传进来
 * （见 docs/.vitepress/theme/DemoPreview.vue），取值与文档站一致：`zh-CN` | `en`。
 *
 * 这些文案会注册进库的 i18n 实例（main.ts 里 app.use(VueStackTabs, [{ locale, messages }])），
 * 组件内用 vue-i18n-lite 的 useI18n().t('Demo.…') 读取；这样库自身的文案（标签栏右键菜单、
 * 最大化/还原等）也会随同一个 locale 一起切换。
 *
 * 文案里允许内联 HTML（<code>/<b>），渲染时用 v-html。
 */
export type DemoLocale = 'zh-CN' | 'en'

const zh = {
  tabs: {
    home: '首页',
    report: '报表列表',
    form: '表单',
    scroll: '长列表',
    shadow: '阴影状态',
    notice: '公告',
    loading: '页面加载',
    reportShort: '报表',
    iframe: 'iframe'
  },
  console: {
    title: '演示控制台',
    desc: '标签栏支持拖拽排序与右键菜单；所有按钮都调用公开 API <code>useTabActions</code>。',
    openGroup: '打开标签',
    cacheGroup: '缓存隔离',
    current: '当前',
    none: '无',
    openReports: '打开 3 个报表标签',
    openIframe: '打开 iframe 标签',
    openLoading: '打开 Loading 演示',
    refreshCurrent: '刷新当前',
    refreshAll: '刷新全部',
    closeAll: '关闭全部',
    themeGroup: '外观',
    themeLight: '浅色',
    themeDark: '深色',
    accentGroup: '主色',
    accentBlue: '蓝色',
    accentGreen: '绿色',
    accentViolet: '紫色',
    sizeGroup: '尺寸',
    sizeSmall: '小',
    sizeNormal: '正常',
    sizeLarge: '大'
  },
  home: {
    eyebrow: '在线演示',
    title: '每个标签页，都是一份独立的 Vue 作用域',
    lead: '左侧标签栏里的每个标签都持有自己的页面实例、缓存与导航栈，互不干扰——这就是 <code>vue-stack-tabs</code> 用 Vue 作用域替代「一个标签一个 iframe」的方式。',
    card1Title: '打开标签',
    card1Body: '用 <code>openTab</code> 打开任意路由；同 id 会复用并激活已有标签。',
    card2Title: '标签内前进 / 后退',
    card2Body: '标签内是栈式导航，前进压栈、后退出栈并驱逐缓存。',
    card3Title: '状态不会丢',
    card3Body: '表单输入与滚动位置会随标签缓存保留，切走再回来还在原处。',
    stepsTitle: '建议的体验顺序',
    step1: '点下方「报表列表」，再点其中一行的<b>查看详情</b>，然后后退——观察标签内的前进/后退栈。',
    step2: '点「打开 3 个报表标签」——三个标签指向同一路由的不同参数，各自独立缓存。',
    step3: '点「表单」输入一些内容，切到别的标签再切回来，输入仍在。',
    step4: '点「长列表」滚到中段，切走再切回来——滚动位置被记住。',
    step5: '点「打开 iframe 标签」——iframe 内的页面可反过来请求父窗口打开新标签。'
  },
  report: {
    eyebrow: '报表',
    title: '报表列表',
    lead: '点「查看详情」会在<b>当前标签内前进</b>（<code>useTabRouter().forward</code>）——同一个标签里形成一条页面栈，而不是新开标签。',
    backPrefix: '收到回退参数：',
    backBody: '详情页通过 <code>backward(path, params)</code> 传回了',
    colId: '单号',
    colCustomer: '客户',
    colAmount: '金额',
    colState: '状态',
    viewDetail: '查看详情',
    forwardPrefix: '连续前进：详情',
    stateSettled: '已结算',
    statePending: '待审核',
    stateVoid: '已作废',
    customer1: '蓝湾科技',
    customer2: '长汀制造',
    customer3: '南屿物流',
    customer4: '合溪能源',
    customer5: '禾间材料'
  },
  detail: {
    eyebrow: '报表详情',
    lead: '这是压在当前标签页面栈上的一层。后退会出栈并驱逐该页缓存，重新进入时是全新实例。',
    cardRouteTitle: '路由参数',
    cardTabTitle: '所属标签',
    cardTabBody: '本页与报表列表在同一个标签的栈里，不占用额外标签。',
    cardResultTitle: '回传结果',
    cardResultBody: '后退时可携带一次性参数，目标页用 <code>props._back</code> 接收。',
    backWithResult: '后退并回传',
    backOneStep: '后退 1 步'
  },
  form: {
    eyebrow: '表单',
    title: '状态保持',
    lead: '输入一些内容，然后切到别的标签（或点关闭其它标签）再切回来——这些值不会丢，因为标签的页面实例被 keep-alive 缓存着。',
    name: '姓名',
    namePlaceholder: '试试输入你的名字',
    role: '角色',
    roleViewer: '只读',
    roleEditor: '编辑',
    roleAdmin: '管理员',
    scope: '可见范围',
    scopeDept: '本部门',
    scopeCompany: '本公司',
    scopeAll: '全部',
    remark: '备注',
    remarkPlaceholder: '多行内容同样会被保留',
    valuesTitle: '当前表单值',
    empty: '（空）'
  },
  scroll: {
    eyebrow: '长列表',
    title: '滚动位置记忆',
    leadPrefix: '往下滚到中段，切到别的标签再切回来——会回到原来的位置。滚动容器通过',
    leadTail: '注册给库。',
    rowPrefix: '第 ',
    rowMid: ' 行 · 记录 '
  },
  shadow: {
    eyebrow: '阴影状态',
    title: '外部组件读取阴影状态',
    lead: '这个页面用一个包在内容外层的组件读取 <code>useTabScrollShadow()</code>。<code>state</code> 表示哪一侧还有内容，不是滚动方向；滚动页面时状态栏和下面的图例会同步变化。点「关闭库阴影」后库不再渲染阴影，但 <code>state</code> 仍会继续更新。',
    probeTitle: '外层组件读取',
    state: 'state',
    enabled: 'enabled',
    disable: '关闭库阴影',
    restore: '恢复自动',
    none: '无',
    top: '上',
    bottom: '下',
    both: '上下',
    noneHint: '无阴影',
    topHint: '上方还有内容',
    bottomHint: '下方还有内容',
    bothHint: '上下都有内容',
    rowPrefix: '滚动内容第 ',
    rowSuffix: ' 项'
  },
  notice: {
    eyebrow: '公告',
    title: 'v2.0.0 发布说明',
    lead: '这是一个普通的内容页，用来演示「同一路由可以被多个标签分别打开」。',
    tipPrefix: '提示：',
    tipBody: '从控制台可以再打开一个「公告」标签，两个标签互不影响。',
    changesTitle: '本次变更',
    change1: '标签内前进 / 后退改为导航事务模型，失败时自动回滚栈与缓存。',
    change2: '缓存驱逐统一在 <code>onActivated</code> / <code>evictMarkedCaches</code> 阶段处理。',
    change3: '新增 <code>vue-stack-tabs/iframe-bridge</code> 子入口，iframe 内页无需引入样式。',
    change4:
      'iframe 标签支持 <code>iframeRefreshMode</code>：<code>postMessage</code> 或 <code>reload</code>。',
    nextTitle: '接下来',
    nextBody:
      '回到「首页」标签，或从下方控制台继续打开其它演示标签。关闭标签后缓存会被驱逐，下次打开是全新的实例。'
  },
  loading: {
    eyebrow: '页签内加载',
    title: '页面加载遮罩',
    lead: '页面里的异步操作可以用 <code>useTabLoading()</code> 打开页签级遮罩：遮罩只覆盖当前页签，切到别的标签不受影响，也不会阻塞整个应用。',
    button: '模拟 2 秒加载',
    busy: '加载中…',
    tipPrefix: '提示：',
    tipBody:
      '遮罩由库按 <code>tabId</code> 渲染，所以只能在页签内的页面组件里调用；页面卸载时库会自动关闭它。',
    codeTitle: '页面内调用'
  },
  notFound: {
    title: '没有找到这个路由',
    lead: '演示应用里没有这个地址，可以从上方标签栏切回「首页」继续体验。'
  }
}

const en: typeof zh = {
  tabs: {
    home: 'Home',
    report: 'Reports',
    form: 'Form',
    scroll: 'Long list',
    shadow: 'Shadow state',
    notice: 'Notice',
    loading: 'Page loading',
    reportShort: 'Report',
    iframe: 'iframe'
  },
  console: {
    title: 'Demo console',
    desc: 'The tab bar supports drag-to-reorder and a context menu; every button calls the public <code>useTabActions</code> API.',
    openGroup: 'Open tabs',
    cacheGroup: 'Cache isolation',
    current: 'Active',
    none: 'none',
    openReports: 'Open 3 report tabs',
    openIframe: 'Open an iframe tab',
    openLoading: 'Open the loading demo',
    refreshCurrent: 'Refresh active',
    refreshAll: 'Refresh all',
    closeAll: 'Close all',
    themeGroup: 'Appearance',
    themeLight: 'Light',
    themeDark: 'Dark',
    accentGroup: 'Accent',
    accentBlue: 'Blue',
    accentGreen: 'Green',
    accentViolet: 'Violet',
    sizeGroup: 'Size',
    sizeSmall: 'Small',
    sizeNormal: 'Normal',
    sizeLarge: 'Large'
  },
  home: {
    eyebrow: 'Live demo',
    title: 'Every tab is its own Vue scope',
    lead: 'Each tab in the bar on the left keeps its own page instance, cache and navigation stack, and none of them interfere — that is how <code>vue-stack-tabs</code> replaces "one iframe per tab" with Vue scopes.',
    card1Title: 'Open tabs',
    card1Body:
      'Use <code>openTab</code> with any route; the same id reuses and activates the existing tab.',
    card2Title: 'Forward / backward in a tab',
    card2Body:
      'Navigation inside a tab is stack-based: forward pushes, backward pops and evicts the cache.',
    card3Title: 'State is never lost',
    card3Body:
      'Form input and scroll position stay with the cached page, so they are still there when you come back.',
    stepsTitle: 'What to try, in order',
    step1:
      'Click <b>Reports</b> below, then <b>View detail</b> on a row and go back — watch the forward/backward stack inside that tab.',
    step2:
      'Click <b>Open 3 report tabs</b>: three tabs point at the same route with different params, each with its own cache.',
    step3:
      'Open <b>Form</b>, type something, switch tabs and come back — your input is still there.',
    step4:
      'Open <b>Long list</b>, scroll to the middle, switch away and back — the position is restored.',
    step5:
      'Click <b>Open an iframe tab</b>: the page inside the iframe can ask the parent to open a new tab.'
  },
  report: {
    eyebrow: 'Reports',
    title: 'Report list',
    lead: 'Clicking <b>View detail</b> moves <b>forward inside the current tab</b> (<code>useTabRouter().forward</code>) — it builds a page stack in that tab instead of opening a new one.',
    backPrefix: 'Backward params received:',
    backBody: 'the detail page passed this back through <code>backward(path, params)</code>',
    colId: 'No.',
    colCustomer: 'Customer',
    colAmount: 'Amount',
    colState: 'State',
    viewDetail: 'View detail',
    forwardPrefix: 'Forward again: detail',
    stateSettled: 'Settled',
    statePending: 'Pending',
    stateVoid: 'Void',
    customer1: 'Bluebay Tech',
    customer2: 'Changting Mfg.',
    customer3: 'Nanyu Logistics',
    customer4: 'Hexi Energy',
    customer5: 'Hejian Materials'
  },
  detail: {
    eyebrow: 'Report detail',
    lead: 'This is one layer pushed onto the current tab stack. Going back pops it and evicts its cache, so re-entering creates a fresh instance.',
    cardRouteTitle: 'Route params',
    cardTabTitle: 'Owning tab',
    cardTabBody:
      'This page shares the tab stack with the report list — it does not take an extra tab.',
    cardResultTitle: 'Passing a result back',
    cardResultBody:
      'Going back can carry one-shot params; the target receives them as <code>props._back</code>.',
    backWithResult: 'Go back with',
    backOneStep: 'Go back 1 step'
  },
  form: {
    eyebrow: 'Form',
    title: 'State preserved',
    lead: 'Type something, switch to another tab (or close the others) and come back — the values survive because the tab page instance is cached by keep-alive.',
    name: 'Name',
    namePlaceholder: 'Try typing your name',
    role: 'Role',
    roleViewer: 'Viewer',
    roleEditor: 'Editor',
    roleAdmin: 'Admin',
    scope: 'Visible to',
    scopeDept: 'Department',
    scopeCompany: 'Company',
    scopeAll: 'Everyone',
    remark: 'Note',
    remarkPlaceholder: 'Multi-line content is preserved too',
    valuesTitle: 'Current values',
    empty: '(empty)'
  },
  scroll: {
    eyebrow: 'Long list',
    title: 'Scroll position memory',
    leadPrefix:
      'Scroll down to the middle, switch to another tab and come back — the position is restored. The scroll container is registered with',
    leadTail: '.',
    rowPrefix: 'Row ',
    rowMid: ' · record '
  },
  shadow: {
    eyebrow: 'Shadow state',
    title: 'Read shadow state from an outer component',
    lead: 'This page reads <code>useTabScrollShadow()</code> from a component that wraps the page content. <code>state</code> tells you which side still has content, not the scroll direction; scroll the page and the bar and legend update together. After "Disable library shadows" the library stops rendering them, but <code>state</code> keeps updating.',
    probeTitle: 'Outer component',
    state: 'state',
    enabled: 'enabled',
    disable: 'Disable library shadows',
    restore: 'Restore automatic',
    none: 'none',
    top: 'top',
    bottom: 'bottom',
    both: 'both',
    noneHint: 'no shadow',
    topHint: 'content above',
    bottomHint: 'content below',
    bothHint: 'content above and below',
    rowPrefix: 'Scroll row ',
    rowSuffix: ''
  },
  notice: {
    eyebrow: 'Notice',
    title: 'Release notes for v2.0.0',
    lead: 'A plain content page, used to show that the same route can be opened in several tabs at once.',
    tipPrefix: 'Tip:',
    tipBody: 'You can open another "Notice" tab from the console — the two do not interfere.',
    changesTitle: 'What changed',
    change1:
      'Forward / backward inside a tab now runs as a navigation transaction, rolling back the stack and cache on failure.',
    change2:
      'Cache eviction is handled uniformly in the <code>onActivated</code> / <code>evictMarkedCaches</code> phase.',
    change3:
      'Added the <code>vue-stack-tabs/iframe-bridge</code> sub-entry, so iframe pages need no styles.',
    change4:
      'iframe tabs support <code>iframeRefreshMode</code>: <code>postMessage</code> or <code>reload</code>.',
    nextTitle: 'Next',
    nextBody:
      'Go back to the "Home" tab, or keep opening demo tabs from the console below. Closing a tab evicts its cache, so the next open is a fresh instance.'
  },
  loading: {
    eyebrow: 'In-tab loading',
    title: 'Page loading overlay',
    lead: 'Async work inside a page can open a tab-level overlay with <code>useTabLoading()</code>: the overlay covers only the current tab, other tabs keep working, and the rest of the app is never blocked.',
    button: 'Simulate a 2s request',
    busy: 'Loading…',
    tipPrefix: 'Tip:',
    tipBody:
      'The overlay is rendered per <code>tabId</code>, so it only works inside a page component rendered by vue-stack-tabs; the library closes it automatically when the page unmounts.',
    codeTitle: 'Call it from the page'
  },
  notFound: {
    title: 'This route does not exist',
    lead: 'There is no such address in the demo app — switch back to "Home" from the tab bar to keep exploring.'
  }
}

/** 注册给库的 i18n 实例（命名空间 Demo），与内置的 VueStackTab 文案深度合并 */
export const demoMessages: Record<DemoLocale, Record<string, unknown>> = {
  'zh-CN': { Demo: zh },
  en: { Demo: en }
}

/**
 * 读取文档站传来的语言。文档站切换语言会整页跳转、iframe 随之重建，
 * 因此这里只需在启动时读一次 URL（`?lang=en`）。
 */
export const resolveDemoLocale = (): DemoLocale => {
  if (typeof window === 'undefined') return 'zh-CN'
  const lang = new URLSearchParams(window.location.search).get('lang') ?? ''
  return lang.toLowerCase().startsWith('en') ? 'en' : 'zh-CN'
}
