import type { InjectionKey } from 'vue'
import { hasInjectionContext, inject } from 'vue'
import type { Emitter, EventType } from 'mitt'
import { resolveStackTabsRuntimeContext } from './stackTabsContext'

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

export const tabEmitterKey: InjectionKey<Emitter<TabEventPayloadMap>> = Symbol('tabEmitter')

const plugin = {
  install(): void {
    // 事件总线由唯一 <VueStackTabs> runtime context 提供。
    // 保留 no-op plugin 仅避免内部迁移期间破坏旧安装链路。
  }
}

/** 获取标签事件总线，用于组件间通信 */
export const useTabEmitter = (): Emitter<TabEventPayloadMap> => {
  const injected = hasInjectionContext() ? inject(tabEmitterKey, null) : null
  return injected ?? resolveStackTabsRuntimeContext().eventBus
}

export default plugin
