import { useLoading } from './js/api'
import Component from './js/Component.vue'
import type { App } from 'vue'

const LoadingPlugin = (app: App, props = {}, slots = {}) => {
  const instance = useLoading(props, slots)
  // app.config.globalProperties.$loading = instance
  app.provide('$loading', instance)
}

export default Component
export { useLoading, LoadingPlugin, Component }