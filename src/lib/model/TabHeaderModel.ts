import { ContainerType } from './TabContainerModel'

export class TabItemData {
  id = ''
  title = ''
  active = false
  closable? = true
  type: ContainerType = ContainerType.PAGE
  url?: string = ''
}
