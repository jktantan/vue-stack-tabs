import type { LocationQueryRaw, LocationQueryValueRaw } from 'vue-router'
import type { ITabData, IframeRefreshMode } from '../model/TabModel'
import { isAllowedTabUrl } from './urlParser'

type ManagedSourceChecker = (source: MessageEventSource | null) => boolean

interface StackTabsMessageEnvelope {
  type?: unknown
  payload?: unknown
}

const OPEN_TAB_MESSAGE_TYPES = new Set(['vue-stack-tabs:openTab', 'openTab'])

import { isRecord } from './typeGuards'

const isLocationQueryValueRaw = (value: unknown): value is LocationQueryValueRaw =>
  typeof value === 'string' || typeof value === 'number' || value === null || value === undefined

const pickLocationQueryRaw = (value: unknown): LocationQueryRaw | undefined => {
  if (!isRecord(value)) return undefined

  const query: LocationQueryRaw = {}
  for (const [key, item] of Object.entries(value)) {
    if (isLocationQueryValueRaw(item)) {
      query[key] = item
      continue
    }
    if (Array.isArray(item) && item.every(isLocationQueryValueRaw)) {
      query[key] = item
    }
  }

  return Object.keys(query).length > 0 ? query : undefined
}

const pickBoolean = (value: unknown): boolean | undefined =>
  typeof value === 'boolean' ? value : undefined

const pickRefreshMode = (value: unknown): IframeRefreshMode | undefined => {
  if (value === 'reload' || value === 'postMessage') return value
  return undefined
}

const normalizeOpenTabPayload = (payload: unknown): ITabData | null => {
  if (!isRecord(payload)) return null

  const { id, title, path, query, iframe, closable, refreshable, iframeRefreshMode } = payload
  if (typeof title !== 'string' || title.trim() === '') return null
  if (typeof path !== 'string' || path.trim() === '' || !isAllowedTabUrl(path)) return null

  const normalizedQuery = pickLocationQueryRaw(query)
  const normalizedIframe = pickBoolean(iframe)
  const normalizedClosable = pickBoolean(closable)
  const normalizedRefreshable = pickBoolean(refreshable)
  const normalizedRefreshMode = pickRefreshMode(iframeRefreshMode)

  return {
    ...(typeof id === 'string' && id ? { id } : {}),
    title,
    path,
    ...(normalizedQuery ? { query: normalizedQuery } : {}),
    ...(normalizedIframe !== undefined ? { iframe: normalizedIframe } : {}),
    ...(normalizedClosable !== undefined ? { closable: normalizedClosable } : {}),
    ...(normalizedRefreshable !== undefined ? { refreshable: normalizedRefreshable } : {}),
    ...(normalizedRefreshMode ? { iframeRefreshMode: normalizedRefreshMode } : {})
  }
}

export const isStackTabsOpenTabMessage = (
  event: MessageEvent,
  isManagedSource: ManagedSourceChecker
): ITabData | null => {
  if (!isManagedSource(event.source)) return null
  if (!isRecord(event.data)) return null

  const envelope = event.data as StackTabsMessageEnvelope
  if (typeof envelope.type !== 'string' || !OPEN_TAB_MESSAGE_TYPES.has(envelope.type)) return null

  return normalizeOpenTabPayload(envelope.payload)
}

export const getPostMessageTargetOrigin = (url: string, fallbackOrigin?: string): string | null => {
  if (!url || !isAllowedTabUrl(url)) return null

  try {
    const base =
      fallbackOrigin ?? (typeof window !== 'undefined' ? window.location.origin : undefined)
    if (!base && !/^https?:\/\//i.test(url)) return null

    const parsed = new URL(url, base)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.origin
  } catch {
    return null
  }

  return null
}
