import type { Emitter, EventType } from 'mitt'
import mitt from 'mitt'
import { type App, inject } from 'vue'
// const emitter = mitt()
// Cutsom type
declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $layerEmitter: Emitter<Record<EventType, unknown>>
  }
}
const emitter: Emitter<Record<EventType, unknown>> = mitt()

const plugin = {
  install(app: App) {
    // const emitter = mitt()
    app.provide('tabEmitter', emitter)
    // app.config.globalProperties.$emitter = emitter
  }
}
// export const setEmitter = (mitter: Emitter<Record<EventType, unknown>>) => {
//   emitter = mitter
// }
export const useEmitter = <T extends Record<EventType, unknown>>(): Emitter<T> => {
  return inject('tabEmitter')!
}
export enum MittType {
  PAGE_LOADING = 'PAGE_LOADING',
  TAB_ACTIVE = 'TAB_ACTIVE'
}
export default plugin
