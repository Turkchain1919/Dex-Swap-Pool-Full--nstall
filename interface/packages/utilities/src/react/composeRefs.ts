import type { MutableRefObject, Ref } from 'react'
import { useCallback } from 'react'

type RefCleanup = () => void

/**
 * Assigns `node` to a single ref slot. For function refs, forwards the return value
 * so a React 19 cleanup function survives composition.
 */
function setRef<T>(ref: Ref<T> | undefined, node: T | null): RefCleanup | void {
  if (typeof ref === 'function') {
    return ref(node) as RefCleanup | void
  }
  if (ref !== null && ref !== undefined && typeof ref === 'object') {
    ;(ref as MutableRefObject<T | null>).current = node
  }
  return undefined
}

/**
 * Composes any number of refs into a single callback ref, so one node can feed a
 * forwarded ref, a local ref, and a cloned child's own ref at once. Empty slots
 * (`null`/`undefined`) are skipped.
 *
 * React 19 cleanup refs are composed, not dropped: when any function ref returns a
 * cleanup, React never calls the composed ref with `null` — so the composed cleanup
 * must run the child cleanups AND null out the slots that didn't return one (object
 * refs and legacy function refs). When no ref returns a cleanup, the composed ref
 * returns `undefined` and React falls back to calling it with `null` on detach.
 *
 * Returns a fresh function per call — inside a component, prefer `useComposedRefs`
 * so function refs don't see detach/attach churn every render.
 */
export function composeRefs<T>(...refs: Array<Ref<T> | undefined>): (node: T | null) => RefCleanup | void {
  return (node) => {
    const cleanups = refs.map((ref) => setRef(ref, node))
    const hasCleanup = cleanups.some((cleanup) => typeof cleanup === 'function')

    if (hasCleanup) {
      return () => {
        for (let i = 0; i < cleanups.length; i += 1) {
          const cleanup = cleanups[i]
          if (typeof cleanup === 'function') {
            cleanup()
          } else {
            setRef(refs[i], null)
          }
        }
      }
    }
    return undefined
  }
}

/**
 * Memoized `composeRefs`: the composed callback keeps a stable identity across
 * re-renders while the same refs are passed, so React doesn't detach/re-attach it
 * (function refs would otherwise see `ref(null)`/`ref(node)` churn every render).
 */
export function useComposedRefs<T>(...refs: Array<Ref<T> | undefined>): (node: T | null) => RefCleanup | void {
  // oxlint-disable-next-line react/exhaustive-deps -- the variadic refs ARE the dependency list (Radix useComposedRefs pattern)
  return useCallback(composeRefs(...refs), refs)
}
