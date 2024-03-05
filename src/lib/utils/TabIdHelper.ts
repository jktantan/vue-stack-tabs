// import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
// import { blake3 } from 'hash-wasm'
// import { compress, decompress } from 'brotli-compress'
// import { fromUint8Array, toUint8Array } from 'js-base64'
// import { compress, decompress } from 'lzw-compressor'
import type { ITabBase } from '@/lib/model/TabModel'
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import { v5 as uuidv5 } from 'uuid'
/**
 * compress tab info to string
 * format:
 * {tab id}{current timestamp}{tab name}{tab closable}
 * @param tabData
 */
export const encodeTabInfo = (tabData: ITabBase): string => {
  // const info: ITabBase = {
  //   id: tabData.id,
  //   title: tabData.title,
  //   iframe: tabData.iframe,
  //   closable: tabData.closable,
  //   refreshable: tabData.refreshable
  // }
  const info = `${tabData.id}|${tabData.title}|${tabData.iframe ? 'Y' : 'N'}|${tabData.closable ? 'Y' : 'N'}|${tabData.refreshable ? 'Y' : 'N'}`
  return compressToEncodedURIComponent(info)
  // const compressed = await compress(new TextEncoder().encode(info))
  // return fromUint8Array(compressed, true)
  // return compressToEncodedURIComponent(
  //   `${tabData.id}|${tabData.title}|${tabData.iframe ? 'Y' : 'N'}|${tabData.closable ? 'Y' : 'N'}|${tabData.refreshable ? 'Y' : 'N'}`
  // )
}

export const decodeTabInfo = (tab: string): ITabBase => {
  // const decompressed = await decompress(toUint8Array(tab))
  const tabString = decompressFromEncodedURIComponent(tab)
  // const tabString = new TextDecoder().decode(decompressed)
  // return JSON.parse(new TextDecoder().decode(decompressed))
  // const tabString = decompressFromEncodedURIComponent(tab)
  const tabValues: string[] = tabString.split('|')
  return {
    id: tabValues[0],
    title: tabValues[1],
    iframe: tabValues[2] === 'Y',
    closable: tabValues[3] === 'Y',
    refreshable: tabValues[4] === 'Y'
  }
}

export const createPageId = (tabId: string, path: string, query: Object): string => {
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
  return uuidv5(`${tabId}|${path}|${JSON.stringify(queryArray)}`, uuidv5.URL).replaceAll('-', '')
  // return await blake3(`${tabId}|${path}|${JSON.stringify(queryArray)}`)
}
