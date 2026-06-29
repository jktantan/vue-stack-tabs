export const applyStackTabsLocale = (
  changeLocale: (locale: string) => void,
  locale?: string
): void => {
  if (!locale) return
  changeLocale(locale)
}
