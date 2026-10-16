/**
 * Native leg of the `useDeviceDimensions` compat (INFRA-2353): the same
 * metrics as `ui/src/hooks/useDeviceDimensions/useDeviceDimensions.native.ts`
 * — SCREEN height (window height excludes the Android status bar) and WINDOW
 * width (screen width goes stale on foldables) — kept live across dimension
 * changes via `useSyncExternalStore` (the reference reads per render; the
 * values are identical for any given device state).
 */
import { useSyncExternalStore } from 'react'
import { Dimensions } from 'react-native'
import type { DeviceDimensions } from './useDeviceDimensions'

export type { DeviceDimensions } from './useDeviceDimensions'

function compute(): DeviceDimensions {
  return {
    fullHeight: Dimensions.get('screen').height,
    fullWidth: Dimensions.get('window').width,
  }
}

let snapshot: DeviceDimensions | undefined

function invalidate(): void {
  const next = compute()
  if (snapshot === undefined || snapshot.fullHeight !== next.fullHeight || snapshot.fullWidth !== next.fullWidth) {
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

function getDimensionsSnapshot(): DeviceDimensions {
  invalidate()
  return snapshot as DeviceDimensions
}

export function useDeviceDimensions(): DeviceDimensions {
  return useSyncExternalStore(subscribeToDimensions, getDimensionsSnapshot, getDimensionsSnapshot)
}
