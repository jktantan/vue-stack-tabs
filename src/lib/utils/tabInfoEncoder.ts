import type { ITabBase } from '../model/TabModel'
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'

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
  const mode =
    (tabData as { iframeRefreshMode?: string }).iframeRefreshMode === 'reload' ? 'R' : 'P'
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

import { ulid } from 'ulid'

/**
 * 生成页面缓存 ID (CacheName)
 * 采用全局唯一的 ULID 确保同一个路由在栈内打开多少次都是绝对隔离的不同实例。
 */
export const createPageId = (): string => ulid()
