/**
 * Web leg of the `useDeviceDimensions` compat
 * (`ui/src/hooks/useDeviceDimensions`): the window's inner dimensions, live
 * across resizes. Serves BOTH web-app and extension runtimes on a single code
 * path: it tracks `window.inner*` via the window `resize` event — exactly what
 * the reference's plain-web branch reads — while the reference's extension
 * branch sizes via react-native-web's `useWindowDimensions`, i.e.
 * `visualViewport` metrics.
 * One bounded divergence: `window.inner*` includes classic scrollbar width
 * (~17px on Windows) and pinch-zoom scale, which the extension branch's
 * `visualViewport` metrics exclude — pinned, together with extension parity,
 * in `packages/tailwind/src/parity/device-dimensions-extension/`.
 */
import { useSyncExternalStore } from 'react'
import type { DeviceDimensions } from './useDeviceDimensions'

const SERVER_DIMENSIONS: DeviceDimensions = { fullHeight: 0, fullWidth: 0 }

const subscribers = new Set<() => void>()
let listening = false
let snapshot: DeviceDimensions | undefined

function invalidate(): void {
  const next: DeviceDimensions = { fullHeight: window.innerHeight, fullWidth: window.innerWidth }
  if (snapshot === undefined || snapshot.fullHeight !== next.fullHeight || snapshot.fullWidth !== next.fullWidth) {
    snapshot = next
  }
  for (const notify of subscribers) {
    notify()
  }
}

function subscribeToDimensions(onChange: () => void): () => void {
  if (!listening) {
    listening = true
    window.addEventListener('resize', invalidate)
  }
  subscribers.add(onChange)
  return () => {
    subscribers.delete(onChange)
  }
}

function getDimensionsSnapshot(): DeviceDimensions {
  snapshot ??= { fullHeight: window.innerHeight, fullWidth: window.innerWidth }
  return snapshot
}

function getServerDimensionsSnapshot(): DeviceDimensions {
  return SERVER_DIMENSIONS
}

export function useDeviceDimensions(): DeviceDimensions {
  return useSyncExternalStore(subscribeToDimensions, getDimensionsSnapshot, getServerDimensionsSnapshot)
}
