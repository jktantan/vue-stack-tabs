import type { ITabBase } from '../model/TabModel'
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import Hex from 'hex-encoding'
import { blake3 } from '@noble/hashes/blake3.js'

/**
 * 标签信息编解码器
 *
 * 职责：将标签元数据压缩为 URL query 可用的短字符串，用于 __tab 参数
 * 格式: id|title|iframe|closable|refreshable，压缩后写入 query.__tab
 */

/**
 * 编码标签基础信息为压缩字符串（用于 query.__tab）
 * @param tabData 标签基础数据
 */
export const encodeTabInfo = (tabData: ITabBase): string => {
  const mode = (tabData as { iframeRefreshMode?: string }).iframeRefreshMode === 'reload' ? 'R' : 'P'
  const info = `${tabData.id}|${tabData.title}|${tabData.iframe ? 'Y' : 'N'}|${tabData.closable ? 'Y' : 'N'}|${tabData.refreshable ? 'Y' : 'N'}|${mode}`
  return compressToEncodedURIComponent(info)
}

/** 从 query.__tab 解压并解析为 ITabBase */
export const decodeTabInfo = (encoded: string): ITabBase => {
  const tabString = decompressFromEncodedURIComponent(encoded)
  const tabValues: string[] = tabString.split('|')
  const refreshMode = tabValues[5] === 'R' ? ('reload' as const) : ('postMessage' as const)
  return {
    id: tabValues[0] ?? '',
    title: tabValues[1] ?? '',
    iframe: tabValues[2] === 'Y',
    closable: tabValues[3] === 'Y',
    refreshable: tabValues[4] === 'Y',
    iframeRefreshMode: refreshMode
  }
}

/**
 * 根据 tabId + path + query 生成页面缓存 ID
 * 用于 keep-alive 的 include 和 exclude，需稳定且唯一
 */
export const createPageId = (tabId: string, path: string, query: object): string => {
  const queryEntries: { key: string; value: string }[] = []
  type ObjectKey = keyof typeof query
  for (const key in query) {
    if (!key.startsWith('__')) {
      queryEntries.push({
        key,
        value: query[key as ObjectKey]
      })
    }
  }
  queryEntries.sort((a, b) => {
    let result = 0
    if (a.key > b.key) {
      result = 1
    } else if (a.key < b.key) {
      result = -1
    }
    return result
  })
  const msg = new TextEncoder().encode(`${tabId}|${path}|${JSON.stringify(queryEntries)}`)
  const hash = blake3(msg)
  return Hex.encode(hash)
}
