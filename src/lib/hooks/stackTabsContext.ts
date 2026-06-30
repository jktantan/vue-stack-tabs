import type { App, DefineComponent, InjectionKey, Ref, ShallowRef } from 'vue'
import { hasInjectionContext, inject, ref } from 'vue'
import type { Emitter } from 'mitt'
import mitt from 'mitt'
import type { ITabItem } from '../model/TabModel'
import type { TabEventPayloadMap } from './useTabEventBus'
import { createTabPanelRuntimeState } from './tabPanel/state'
import type { ScrollPosition } from './tabPanel/state'

export const STACK_TABS_CONTEXT_UNAVAILABLE_MESSAGE =
  'VueStackTabs runtime context is not available. Render <VueStackTabs> before using vue-stack-tabs composables.'

export const STACK_TABS_DUPLICATE_INSTANCE_MESSAGE =
  'VueStackTabs only supports one <VueStackTabs> instance per Vue app.'

export interface StackTabsRuntimeContext {
  tabs: Ref<ITabItem[]>
  defaultTabs: Ref<ITabItem[]>
  caches: ShallowRef<string[]>
  components: Map<string, DefineComponent>
  cacheIdsToEvict: Set<string>
  tabIdsToEvict: Set<string>
  refreshKey: Ref<number>
  scrollPositionsByPageId: Map<string, Map<string, ScrollPosition>>
  isInitialized: Ref<boolean>
  iframeRefreshKeys: Ref<Record<string, number>>
  maxTabCount: Ref<number>
  useGlobalScroll: Ref<boolean>
  sessionPrefix: Ref<string>
  iframePath: Ref<string>
  eventBus: Emitter<TabEventPayloadMap>
}

export interface CreateStackTabsRuntimeContextOptions {
  iframePath?: string
  maxTabCount?: number
  useGlobalScroll?: boolean
  sessionPrefix?: string
}

export interface RegisterStackTabsRuntimeContextOptions {
  app?: App
  isProduction?: boolean
}

export interface UnregisterStackTabsRuntimeContextOptions {
  app?: App
}

export const stackTabsContextKey: InjectionKey<StackTabsRuntimeContext> = Symbol('stackTabsContext')
export const maximumKey: InjectionKey<Ref<boolean>> = Symbol('stackTabsMaximum')

let activeRuntimeContext: StackTabsRuntimeContext | null = null
let isFallbackRuntimeContextOwnerRegistered = false
const runtimeContextOwnersByApp = new WeakSet<App>()

export const createStackTabsRuntimeContext = (
  options: CreateStackTabsRuntimeContextOptions = {}
): StackTabsRuntimeContext => {
  const state = createTabPanelRuntimeState()

  return {
    ...state,
    maxTabCount: ref(options.maxTabCount ?? state.maxTabCount.value),
    useGlobalScroll: ref(options.useGlobalScroll ?? state.useGlobalScroll.value),
    sessionPrefix: ref(options.sessionPrefix ?? state.sessionPrefix.value),
    iframePath: ref(options.iframePath ?? ''),
    eventBus: mitt<TabEventPayloadMap>()
  }
}

export const getActiveStackTabsRuntimeContext = (): StackTabsRuntimeContext | null =>
  activeRuntimeContext

export const registerStackTabsRuntimeContext = (
  context: StackTabsRuntimeContext,
  options: RegisterStackTabsRuntimeContextOptions = {}
): boolean => {
  if (!activeRuntimeContext) {
    activeRuntimeContext = context
  }

  if (options.app && !runtimeContextOwnersByApp.has(options.app)) {
    runtimeContextOwnersByApp.add(options.app)
    return true
  }

  if (
    !options.app &&
    activeRuntimeContext === context &&
    !isFallbackRuntimeContextOwnerRegistered
  ) {
    isFallbackRuntimeContextOwnerRegistered = true
    return true
  }

  const isProduction = options.isProduction ?? import.meta.env.PROD
  if (isProduction) {
    console.warn(STACK_TABS_DUPLICATE_INSTANCE_MESSAGE)
    return false
  }

  throw new Error(STACK_TABS_DUPLICATE_INSTANCE_MESSAGE)
}

export const unregisterStackTabsRuntimeContext = (
  context: StackTabsRuntimeContext,
  options: UnregisterStackTabsRuntimeContextOptions = {}
): void => {
  if (options.app) runtimeContextOwnersByApp.delete(options.app)
  if (!options.app && activeRuntimeContext === context)
    isFallbackRuntimeContextOwnerRegistered = false
  if (activeRuntimeContext === context) activeRuntimeContext = null
}

export const resolveStackTabsRuntimeContext = (): StackTabsRuntimeContext => {
  const injected = hasInjectionContext() ? inject(stackTabsContextKey, null) : null
  const context = injected ?? activeRuntimeContext

  if (!context) throw new Error(STACK_TABS_CONTEXT_UNAVAILABLE_MESSAGE)

  return context
}
