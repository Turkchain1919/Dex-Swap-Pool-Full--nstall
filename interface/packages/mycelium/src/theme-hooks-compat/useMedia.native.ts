/**
 * Native leg of the `useMedia` compat (INFRA-2353): the same breakpoint
 * booleans Tamagui's react-native media driver reports, evaluated against
 * `Dimensions.get('window')` with the max-width/max-height queries
 * `ui/src/theme/media.ts` declares (max-* bounds are inclusive, like CSS).
 * Subscribes to dimension changes via `useSyncExternalStore`.
 */
import { useSyncExternalStore } from 'react'
import { Dimensions } from 'react-native'
import { BREAKPOINT_PX, HEIGHT_BREAKPOINT_PX, type MediaQueryKey } from './tokens'
import type { MediaState } from './useMedia'

export type { MediaState } from './useMedia'

function computeState(): MediaState {
  const { width, height } = Dimensions.get('window')
  const state = {} as Record<MediaQueryKey, boolean>
  for (const [key, maxWidth] of Object.entries(BREAKPOINT_PX)) {
    state[key as MediaQueryKey] = width <= maxWidth
  }
  for (const [key, maxHeight] of Object.entries(HEIGHT_BREAKPOINT_PX)) {
    state[key as MediaQueryKey] = height <= maxHeight
  }
  return state
}

let snapshot: MediaState | undefined

function invalidate(): void {
  const next = computeState()
  const previous = snapshot
  if (
    previous === undefined ||
    Object.keys(next).some((key) => next[key as MediaQueryKey] !== previous[key as MediaQueryKey])
  ) {
    snapshot = next
  }
}

function subscribeToDimensions(onChange: () => void): () => void {
  const subscription = Dimensions.addEventListener('change', () => {
    invalidate()
    onChange()
  })
  return () => subscription.remove()
}

function getMediaSnapshot(): MediaState {
  // Read-through: recompute on demand so a dimension change that happened
  // outside the subscription window (e.g. before first subscribe) is seen.
  invalidate()
  return snapshot as MediaState
}

export function useMedia(): MediaState {
  return useSyncExternalStore(subscribeToDimensions, getMediaSnapshot, getMediaSnapshot)
}
