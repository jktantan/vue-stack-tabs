/**
 * 国际化模块。
 *
 * 自动加载 lang/ 目录下的语言文件，支持用户通过 plugin options
 * 传入自定义语言包并与内置语言深度合并。
 */
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

  /** 从 glob 导入结果中提取语言文件并合并到 msg 对象 */
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

  const allLangs = (): Record<string, Record<string, unknown>> => {
    const message: Record<string, Record<string, unknown>> = {}
    getLangFiles(modules as Record<string, { default?: Record<string, unknown> }>, message)
    return message
  }
  /** 创建 i18n 实例，合并内置语言与用户自定义语言包 */
  const getI18n = (localeI18n?: LocaleMessageOption[]) => {
    const combinateMessage = mergeLocaleMessages(allLangs(), localeI18n)

    return createI18n({
      locale: localeI18n?.[0]?.locale ?? 'zh-CN',
      fallbackLocale: 'en',
      messages: combinateMessage as Record<string, Record<string, string>>
    })
  }
  return {
    getI18n
  }
}
