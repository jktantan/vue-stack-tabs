import { h, render } from 'vue'

export const removeElement = (el: HTMLElement) => {
  if (typeof el.remove !== 'undefined') {
    el.remove()
  } else {
    el.parentNode?.removeChild(el)
  }
}

// Taken from https://github.com/moyoujun/vue3-loading-overlay/blob/master/src/index.ts
export function createComponent(
  component: any,
  props: any,
  parentContainer: HTMLElement,
  slots = {}
) {
  const vNode = h(component, props, slots)
  const container = document.createElement('div')
  container.classList.add('vld-container')
  parentContainer.appendChild(container)
  render(vNode, container)

  return vNode.component
}

export const hasWindow = () => {
  return typeof window !== 'undefined'
}

export const MayBeHTMLElement = hasWindow() ? window.HTMLElement : Object
