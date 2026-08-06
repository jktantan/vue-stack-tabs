# StackTabs Vue Performance Optimization Design

## Overview
This specification outlines performance optimizations for the `StackTabs.vue` component and under `@src/lib` in the `vue-stack-tabs` project. The primary focus is reducing Reactivity churn, eliminating redundant watchers, optimizing Vue re-renders in templates (especially around iframe attributes), and correctly applying Vue Transition best practices.

## Identified Inefficiencies

### 1. Watcher Merging & Elimination of `deep: true`
- **Current State**: Two parallel watchers observe the computed property `activeIframesWithUrl`. Both utilize `deep: true`, traversing array elements exhaustively.
- **Proposed Solution**: 
  - Merge the logic into a single `watch`.
  - Remove `deep: true`. Since `activeIframesWithUrl` relies on a `filter()` operation derived from `iframeTabs`, any change in source reactivity triggers a new array reference. The default shallow watch is sufficient.

### 2. Method Invocations in Templates
- **Current State**: `:src="getIframeSrc(frame, getIframeRefreshKey(frame.id))"` is bound directly in the template. Every non-related render cycle causes this somewhat expensive URL/Hash concatenation logic to run repeatedly format strings.
- **Proposed Solution**: 
  - Move the logic to a `computed` object map `computedIframeSrcs` or leverage lightweight local component state where `src` is updated only when specific properties (like activation or refresh key) change. This prevents arbitrary re-renders from executing string concatenation functions.

### 3. Redundant `transition-group` for `v-show` 
- **Current State**: The `iframeTabs` container uses `<transition-group>` but toggles visibility natively with `v-show` on individual transitions.
- **Proposed Solution**: 
  - Change `<transition-group>` to `<div class="stack-tab__iframes">`.
  - The nested `<Transition>` components wrapped around `v-show` manage entry/leave independently. Removing the `transition-group` spares Vue's virtual DOM from tracking node positions inside a structural directive, reducing unnecessary reconciliation overhead.

### 4. Optimize Map/Set Reallocation on Tab Closing
- **Current State**: An observer running on `iframeTabs` filters out IDs for closed tabs and runs a cleanup procedure iterating over all possible iframe state dictionaries (`iframeLoadStates`, `iframeEverActivated`, `iframeElRefs`).
- **Proposed Solution**:
  - Keep the observer but rewrite it to diff correctly, or handle destruction actively via the component hooks or the event emitter (e.g., when a close is detected). If sticking to the observer, ensure we don't recreate sets and Maps arbitrarily on each structural change if possible, although for <=20 items `Set` creation is fast. The main issue is iterating `Object.keys()` over the dictionaries unnecessarily out-of-sync. 
  - Use accurate teardown to ensure garbage collection operates linearly `O(1)` per close event.

## Target Impact
- Reduced main-thread blocking time during tab switches.
- Eliminated redundant `URLSearchParams` and string allocations during minor state tweaks.
- Zero extra Reactivity traversal cycles for iframe monitoring.
- Smoother animation due to simplified VDOM structural layout in transitions.
