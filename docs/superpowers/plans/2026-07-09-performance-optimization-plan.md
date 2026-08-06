# Performance Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Optimize `StackTabs.vue` for performance by merging watchers, caching computed methods, removing structural transition group for `v-show`, and preventing redundant loop allocations.

**Architecture:** We are refactoring existing reactive state (`watch`, `computed`, template interpolations) in `src/lib/StackTabs.vue` without altering the user-facing API or functional behavior.

**Tech Stack:** Vue 3 Composition API, TypeScript

## Global Constraints

- Never mutate array/objects directly without Vue reactivity safeguards.
- Immutability patterns for creating new arrays.
- Keep exact formatting for HTML/Vue templates matching the project's Prettier/ESLint configs.

---

### Task 1: Remove Redundant `<transition-group>`

**Files:**
- Modify: `src/lib/StackTabs.vue`

**Interfaces:**
- Consumes: `pageTransition` class, `iframeTabs` ref
- Produces: Correct DOM wrapper for iframes avoiding virtual DOM re-reordering overhead

- [ ] **Step 1: Write the failing DOM test (or inspect baseline)**
Since we are refactoring template code without affecting logic natively tested, we ensure the build passes and inspect visually. For agentic testing in Vue, we verify the template tag changes.

- [ ] **Step 2: Modify template `<transition-group>` to `<div>`**

```vue
<!-- BEFORE -->
<transition-group :name="pageTransition" tag="div" class="stack-tab__iframes" appear>
<!-- AFTER -->
<div class="stack-tab__iframes">
```
And replace the closing tag from `</transition-group>` to `</div>`.

- [ ] **Step 3: Run linter/build to confirm valid template**

Run: `pnpm eslint src/lib/StackTabs.vue` or `pnpm tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/StackTabs.vue
git commit -m "perf: strip redundant transition-group for v-show iframe list"
```

---

### Task 2: Merge and Optimize `activeIframesWithUrl` Watchers

**Files:**
- Modify: `src/lib/StackTabs.vue`

**Interfaces:**
- Consumes: `activeIframesWithUrl`, `iframeEverActivated`, `setIframeLoading`
- Produces: A single watcher without `deep: true`

- [ ] **Step 1: Locate existing separate watchers**
Locate the two watchers for `activeIframesWithUrl`.

- [ ] **Step 2: Apply optimization to script tag**

```typescript
// Replace the two watches with a single consolidated watch
watch(
  activeIframesWithUrl,
  (frames) => {
    for (const f of frames) {
      iframeEverActivated[f.id] = true
      setIframeLoading(f.id)
    }
  },
  { immediate: true } // Removed deep: true
)
```

- [ ] **Step 3: Check types and build**

Run: `vue-tsc --noEmit` or equivalent command like `pnpm tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/StackTabs.vue
git commit -m "perf: consolidate iframe active state watchers and drop deep traversal"
```

---

### Task 3: Cache `iframeSrc` Output to Avoid Template Execution

**Files:**
- Modify: `src/lib/StackTabs.vue`

**Interfaces:**
- Consumes: `getIframeSrc()`, `getIframeRefreshKey()`, `iframeTabs`
- Produces: A computed map `iframeSrcMap` retaining computed strings

- [ ] **Step 1: Extract src logic into a computed map**

```typescript
// Add inside the setup script block
const iframeSrcMap = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {}
  for (const frame of iframeTabs.value) {
    const refreshKey = getIframeRefreshKey(frame.id)
    map[frame.id] = getIframeSrc(frame, refreshKey)
  }
  return map
})
```

- [ ] **Step 2: Update template**

```vue
<!-- BEFORE -->
:src="getIframeSrc(frame, getIframeRefreshKey(frame.id))"
<!-- AFTER -->
:src="iframeSrcMap[frame.id] || 'about:blank'"
```

- [ ] **Step 3: Verify build**

Run: `pnpm tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/StackTabs.vue
git commit -m "perf: cache iframe src evaluation in computed map"
```

---

### Task 4: Optimize Closed Iframe Memory Cleanup

**Files:**
- Modify: `src/lib/StackTabs.vue`

**Interfaces:**
- Consumes: `iframeTabs`, `iframeLoadStates`, `iframeEverActivated`, `iframeElRefs`
- Produces: More efficient garbage collection skipping untouched keys

- [ ] **Step 1: Simplify logic in the `iframeTabs` watcher**
Avoid constantly calling `Object.keys(iframeLoadStates)` unless the length changed or using manual triggers.

```typescript
// Modify the old watch block:
watch(
  iframeTabs,
  (frames, oldFrames) => {
    // Only diff if length decreased or items actually removed
    if (oldFrames && frames.length < oldFrames.length) {
      const activeIds = new Set(frames.map((frame) => frame.id))
      // It's cheaper to look at what was removed instead of all existing states
      const removedFrames = oldFrames.filter(f => !activeIds.has(f.id))
      for (const removed of removedFrames) {
        const id = removed.id
        clearIframeLoadTimeout(id)
        delete iframeLoadStates[id]
        delete iframeEverActivated[id]
        delete iframeElRefs[id]
      }
    } else if (!oldFrames) { // immediate initial run cleanup just in case
      const activeIds = new Set(frames.map((frame) => frame.id))
      for (const id of Object.keys(iframeLoadStates)) {
         if (!activeIds.has(id)) {
            clearIframeLoadTimeout(id)
            delete iframeLoadStates[id]
            delete iframeEverActivated[id]
            delete iframeElRefs[id]
         }
      }
    }
  },
  { immediate: true }
)
```

- [ ] **Step 2: Run verify**

Run: `pnpm tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/StackTabs.vue
git commit -m "perf: optimize iframe resource eviction algorithm"
```
