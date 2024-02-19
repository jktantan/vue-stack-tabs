import { TabItemData } from './TabHeaderModel'

export interface ContextMenu {
  icon?: string
  title: string
  callback(id: string): void
  disabled: (tabData: TabItemData) => boolean
}
