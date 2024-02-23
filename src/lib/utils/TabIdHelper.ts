// import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import { blake3 } from 'hash-wasm'
import { compress, decompress } from 'brotli-compress'
import { fromUint8Array, toUint8Array } from 'js-base64'
import type { ITabBase } from '@/lib/model/TabModel'

/**
 * compress tab info to string
 * format:
 * {tab id}{current timestamp}{tab name}{tab closable}
 * @param tabData
 */
export const encodeTabInfo = async (tabData: ITabBase): Promise<string> => {
  const info: ITabBase = {
    id: tabData.id,
    title: tabData.title,
    iframe: tabData.iframe,
    closable: tabData.closable,
    refreshable: tabData.refreshable
  }
  const compressed = await compress(new TextEncoder().encode(JSON.stringify(info)))
  return fromUint8Array(compressed, true)
  // return compressToEncodedURIComponent(
  //   `${tabData.id}|${tabData.title}|${tabData.iframe ? 'Y' : 'N'}|${tabData.closable ? 'Y' : 'N'}|${tabData.refreshable ? 'Y' : 'N'}`
  // )
}

export const decodeTabInfo = async (tab: string): Promise<ITabBase> => {
  const decompressed = await decompress(toUint8Array(tab))
  return JSON.parse(new TextDecoder().decode(decompressed))
  // const tabString = decompressFromEncodedURIComponent(tab)
  // const tabValues: string[] = tabString.split('|')
  // return {
  //   id: tabValues[0],
  //   title: tabValues[2],
  //   iframe: tabValues[3] === 'Y',
  //   closable: tabValues[4] === 'Y',
  //   refreshable: tabValues[5] === 'Y'
  // }
}

export const createPageId = async (tabId: string, path: string, query: Object): Promise<string> => {
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
  return await blake3(`${tabId}|${path}|${JSON.stringify(queryArray)}`)
}
