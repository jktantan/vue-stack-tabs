import mitt from 'mitt'
import type { Emitter, EventType } from 'mitt'
import { inject } from 'vue'
import type { App } from 'vue'
// Cutsom type
declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $tabEmitter: Emitter<Record<EventType, unknown>>
  }
}
const emitter = mitt()

const plugin = {
  install(app: App) {
    app.provide('tabEmitter', emitter)
  }
}
// export const setEmitter = (mitter: Emitter<Record<EventType, unknown>>) => {
//   emitter = mitter
// }
export const useEmitter = <T extends Record<EventType, unknown>>(): Emitter<T> => {
  return inject('tabEmitter')!
}

export default plugin
