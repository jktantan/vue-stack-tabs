import type { Emitter, EventType } from 'mitt'
import mitt from 'mitt'
import { type App, inject } from 'vue'

declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $layerEmitter: Emitter<Record<EventType, unknown>>
  }
}

/** 全局标签事件总线，用于跨组件通信（激活、加载等） */
const eventBus = mitt<Record<EventType, unknown>>()

const plugin = {
  install(app: App) {
    app.provide('tabEmitter', eventBus)
  }
}

/** 获取标签事件总线，用于组件间通信 */
export const useTabEmitter = <T extends Record<EventType, unknown>>(): Emitter<T> => {
  return inject('tabEmitter')!
}

/** 标签相关事件类型 */
export enum TabEventType {
  PAGE_LOADING = 'PAGE_LOADING',
  TAB_ACTIVE = 'TAB_ACTIVE'
}

export default plugin
