import mitt from 'mitt'
import type { Emitter, EventType } from 'mitt'
import { inject } from 'vue'
import type { App } from 'vue'
// const emitter = mitt()
// Cutsom type
declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $tabEmitter: Emitter<Record<EventType, unknown>>
  }
}
const emitter = mitt()

const plugin = {
  install(app: App) {
    // const emitter = mitt()
    app.provide('$tabEmitter', emitter)
    // app.config.globalProperties.$emitter = emitter
  }
}
// export const setEmitter = (mitter: Emitter<Record<EventType, unknown>>) => {
//   emitter = mitter
// }
export const useEmitter = <T extends Record<EventType, unknown>>(): Emitter<T> => {
  return inject('$tabEmitter')!
}

export default plugin
