/** 将指定的 locale 应用到 vue-stack-tabs 内部 i18n 实例 */
export const applyStackTabsLocale = (
  changeLocale: (locale: string) => void,
  locale?: string
): void => {
  if (!locale) return
  changeLocale(locale)
}
