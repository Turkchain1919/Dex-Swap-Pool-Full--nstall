import { heights } from '@universe/mycelium'
import { useSyncExternalStore } from 'react'

// Singleton to share observation across all consumers
let headerHeight: number = heights['interface-nav']
const listeners: Set<() => void> = new Set()
let resizeObserver: ResizeObserver | null = null

function subscribe(callback: () => void): () => void {
  // Initialize observer on first subscription
  if (listeners.size === 0) {
    const header = document.getElementById('AppHeader')
    if (header) {
      headerHeight = header.clientHeight
      resizeObserver = new ResizeObserver((entries) => {
        const newHeight = entries[0]?.target.clientHeight
        if (newHeight !== headerHeight) {
          headerHeight = newHeight
          listeners.forEach((listener) => listener())
        }
      })
      resizeObserver.observe(header)
    }
  }

  listeners.add(callback)

  return () => {
    listeners.delete(callback)
    // Cleanup when no more subscribers
    if (listeners.size === 0 && resizeObserver) {
      resizeObserver.disconnect()
      resizeObserver = null
    }
  }
}

function getSnapshot(): number {
  return headerHeight
}

/**
 * Hook to get the current height of the AppHeader element (including top-level banners).
 * Uses a shared ResizeObserver to efficiently track height changes across all consumers.
 *
 * @returns The current height of the AppHeader element
 */
export function useAppHeaderHeight(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
