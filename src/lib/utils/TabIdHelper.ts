import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import { v5 as uuidv5 } from 'uuid'
import type { TabData } from '@/lib/model/TabModel'
export const encodeTabid = (tabData: TabData) => {
  return compressToEncodedURIComponent(`${tabData.id}|${new Date().getTime()}|${tabData.name}|${tabData.closable ? 'Y' : 'N'}`)
}

export const decodeTabId = (tabId: string): TabData => {
  const tabString = decompressFromEncodedURIComponent(tabId)
  const tabValues: string[] = tabString.split('|')
  const tabInfo: TabData = {
    id: tabValues[0],
    name: tabValues[2],
    closable: tabValues[3] === 'Y'
  }
  return tabInfo
}

export const getPageId = (tabId: string, path: string, query: Object) => {
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
}
