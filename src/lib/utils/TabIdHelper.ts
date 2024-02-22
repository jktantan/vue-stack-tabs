import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import { blake3 } from 'hash-wasm'
import type { ITabBase, ITabData } from '@/lib/model/TabModel'

/**
 * compress tab info to string
 * format:
 * {tab id}{current timestamp}{tab name}{tab closable}
 * @param tabData
 */
export const encodeTabInfo = (tabData: ITabBase): String => {
  return compressToEncodedURIComponent(
    `${tabData.id}|${tabData.title}|${tabData.iframe ? 'Y' : 'N'}|${tabData.closable ? 'Y' : 'N'}|${tabData.refreshable ? 'Y' : 'N'}`
  )
}

export const decodeTabInfo = (tab: string): ITabBase => {
  const tabString = decompressFromEncodedURIComponent(tab)
  const tabValues: string[] = tabString.split('|')
  return {
    id: tabValues[0],
    title: tabValues[2],
    iframe: tabValues[3] === 'Y',
    closable: tabValues[4] === 'Y',
    refreshable: tabValues[5] === 'Y'
  }
}

export const createPageId = (tabId: string, path: string, query: Object): Promise<string> => {
  const queryArray = []
  console.log(query)
  type ObjectKey = keyof typeof query
  for (const key in query) {
    if (!key.startsWith('__')) {
      queryArray.push({
        key,
        value: query[key as ObjectKey]
      })
    }
  }
  queryArray.sort((a, b) => {
    let result = 0
    if (a.key > b.key) {
      result = 1
    } else if (a.key < b.key) {
      result = -1
    }
    return result
  })
  // return uuidv5(`${tabId}|${path}|${JSON.stringify(queryArray)}`, uuidv5.URL).replaceAll('-', '')
  return blake3(`${tabId}|${path}|${JSON.stringify(queryArray)}`)
}
