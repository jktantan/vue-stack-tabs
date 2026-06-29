import { createI18n } from 'vue-i18n-lite'

export interface LocaleMessageOption {
  locale: string
  messages?: Record<string, unknown>
}

const DANGEROUS_MESSAGE_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const mergeMessageRecord = (
  baseMessage: Record<string, unknown>,
  overrideMessage: Record<string, unknown>
): Record<string, unknown> => {
  const mergedMessage = { ...baseMessage }
  for (const [key, value] of Object.entries(overrideMessage)) {
    if (DANGEROUS_MESSAGE_KEYS.has(key)) continue
    const existing = mergedMessage[key]
    mergedMessage[key] =
      isRecord(existing) && isRecord(value) ? mergeMessageRecord(existing, value) : value
  }
  return mergedMessage
}

export const mergeLocaleMessages = (
  baseMessages: Record<string, Record<string, unknown>>,
  localeI18n?: LocaleMessageOption[]
): Record<string, Record<string, unknown>> => {
  const combinedMessages = { ...baseMessages }
  if (!localeI18n) return combinedMessages

  for (const item of localeI18n) {
    if (!item.messages || DANGEROUS_MESSAGE_KEYS.has(item.locale)) continue
    combinedMessages[item.locale] = mergeMessageRecord(
      combinedMessages[item.locale] ?? {},
      item.messages
    )
  }

  return combinedMessages
}

export default () => {
  // 引入lang目录下文件
  // 此处使用了 VITE 的 import.meta.globEager。非 VITE 的 可以使用 require.context
  const modules = import.meta.glob('./lang/*', { eager: true })

  /**
   * 获取所有语言文件
   * @param {Object} mList
   */
  function getLangFiles(
    mList: Record<string, { default?: Record<string, unknown> }>,
    msg: Record<string, Record<string, unknown>>
  ) {
    for (const path in mList) {
      const mod = mList[path] as { default?: Record<string, unknown> }
      if (mod?.default) {
        const pathName = path.substring(path.lastIndexOf('/') + 1, path.lastIndexOf('.'))
        const existing = msg[pathName] as Record<string, unknown> | undefined
        msg[pathName] = existing ? { ...existing, ...mod.default } : mod.default
      }
    }
  }

  /**
   * 注册i18n实例并引入语言文件
   */
  // const i18n = createI18n({
  //   fallbackLocale: 'zh-CN',
  //   // 定义默认语言为中文
  //   locale: 'zh-CN',
  //   legacy: false,
  //   // 挂载到全局，不然会报错
  //   // globalInjection: true,
  //   messages: getAllLang(),
  // })
  /**
   * 局部使用i18n
   */
  // const i18n = useI18n({
  //   useScope: 'local',
  //   locale: 'zh-CN',
  //   messages: getAllLang(),
  // })

  // 假设你还有其他目录下的语言文件 它的路径是 src/views/home/locales/en-US.ts
  // 那么你就可以 使用 :lower:（小写） :upper:（大写） 来引入文件
  // const viewModules = import.meta.globEager('../views/**/locales/[[:lower:]][[:lower:]]-[[:upper:]][[:upper:]].ts')

  const allLangs = (): Record<string, Record<string, unknown>> => {
    const message: Record<string, Record<string, unknown>> = {}
    getLangFiles(modules as Record<string, { default?: Record<string, unknown> }>, message)
    return message
  }
  // const localeI18n = inject('locales') as { locale: string; messages: object }
  const getI18n = (localeI18n?: LocaleMessageOption[]) => {
    const combinateMessage = mergeLocaleMessages(allLangs(), localeI18n)

    return createI18n({
      locale: localeI18n?.[0]?.locale ?? 'zh-CN',
      fallbackLocale: 'en',
      messages: combinateMessage as Record<string, Record<string, string>>
    })
    // const combinateMessage = { ...allLangs(), ...localeI18n.messages }
    // return useI18n({
    //   useScope: 'local',
    //   locale: localeI18n.locale,
    //   messages: combinateMessage
    // })
  }
  return {
    getI18n
  }
}
