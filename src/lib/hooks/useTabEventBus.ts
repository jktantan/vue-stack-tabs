import type { Emitter, EventType } from 'mitt'
import mitt from 'mitt'
import { type App, inject } from 'vue'

declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $layerEmitter: Emitter<TabEventPayloadMap>
  }
}

/** 标签相关事件类型 */
export enum TabEventType {
  PAGE_LOADING = 'PAGE_LOADING',
  TAB_ACTIVE = 'TAB_ACTIVE',
  FORWARD = 'FORWARD',
  BACKWARD = 'BACKWARD',
  REFRESH_IFRAME_POSTMESSAGE = 'REFRESH_IFRAME_POSTMESSAGE'
}

export interface TabEventPayloadMap extends Record<EventType, unknown> {
  [TabEventType.PAGE_LOADING]: { tId: string; value: boolean }
  [TabEventType.TAB_ACTIVE]: { id: string; isRoute?: boolean }
  [TabEventType.FORWARD]: void
  [TabEventType.BACKWARD]: void
  [TabEventType.REFRESH_IFRAME_POSTMESSAGE]: string
}

/** 全局标签事件总线，用于跨组件通信（激活、加载等） */
const eventBus = mitt<TabEventPayloadMap>()

const plugin = {
  install(app: App) {
    app.provide('tabEmitter', eventBus)
  }
}

/** 获取标签事件总线，用于组件间通信 */
export const useTabEmitter = (): Emitter<TabEventPayloadMap> => {
  return inject('tabEmitter') as Emitter<TabEventPayloadMap>
}

export default plugin
