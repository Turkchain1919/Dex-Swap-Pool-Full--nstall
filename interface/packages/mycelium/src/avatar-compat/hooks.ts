/**
 * The platform-neutral React state machinery of the avatar compound — the
 * load-status lifecycle, callback mirroring, and the fallback delayMs timer —
 * shared so the two legs cannot duplicate this state and drift.
 *
 * Pure React (plus the utilities timing hook), no platform imports: safe
 * from any leg.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useTimeout } from 'utilities/src/time/timing'
import type { AvatarImageLoadingStatus } from './props'

export interface AvatarCompatContextValue {
  imageLoadingStatus: AvatarImageLoadingStatus
  onImageLoadingStatusChange: (status: AvatarImageLoadingStatus) => void
}

/**
 * Default value stands in for the legacy hard requirement that Image/Fallback
 * render inside the root (legacy throws via `useAvatarContext`); out-of-root
 * children degrade to the never-loaded state instead of crashing.
 */
export const AvatarCompatContext = createContext<AvatarCompatContextValue>({
  imageLoadingStatus: 'idle',
  onImageLoadingStatusChange: () => {},
})

/** Root-side status store, exposed to Image/Fallback through the context. */
export function useAvatarRootContextValue(): AvatarCompatContextValue {
  const [imageLoadingStatus, setImageLoadingStatus] = useState<AvatarImageLoadingStatus>('idle')
  // setState identity is stable, so consumers keying effects on
  // `onImageLoadingStatusChange` only re-fire on real status changes.
  return useMemo(
    () => ({ imageLoadingStatus, onImageLoadingStatusChange: setImageLoadingStatus }),
    [imageLoadingStatus],
  )
}

export interface UseAvatarImageStatusOptions {
  src: string | undefined
  /**
   * Mirrors every status transition, like legacy. NOTE: `'loading'` is never
   * emitted — legacy's own `onLoadStart={() => setStatus('loading')}` is
   * commented out in `@tamagui/avatar` (v1.136.1 source and shipped dist), so
   * the real legacy sequence is `idle` → `loaded`/`error`; the union keeps
   * `'loading'` for type parity only.
   */
  onLoadingStatusChange?: (status: AvatarImageLoadingStatus) => void
  /**
   * Reads the host element's already-settled state on mount and src swap —
   * the web leg's `img.complete` lane (a cached/data-URI image can complete
   * before React attaches onLoad, so the load event never fires). Return
   * `undefined` when nothing has settled; return a Promise when settling
   * needs an async signal (the web leg's `decode()` lane) — a src swap
   * cancels an in-flight settle.
   */
  settleStatus?: () => AvatarImageLoadingStatus | Promise<AvatarImageLoadingStatus> | undefined
}

export interface AvatarImageStatus {
  status: AvatarImageLoadingStatus
  onLoad: () => void
  onError: () => void
}

/**
 * Image-side status lifecycle: reset to `idle` on src swap (legacy's
 * `useEffect` on src), settle from the host element when it finished early,
 * and mirror every transition into the root context and the caller's
 * callback. The caller's callback routes through a ref so only real status
 * TRANSITIONS fire it — legacy's effect deps are `[status]` alone, so a
 * fresh callback identity per parent render must not re-fire it.
 */
export function useAvatarImageStatus({
  src,
  onLoadingStatusChange,
  settleStatus,
}: UseAvatarImageStatusOptions): AvatarImageStatus {
  const context = useContext(AvatarCompatContext)
  const [status, setStatus] = useState<AvatarImageLoadingStatus>('idle')

  const settleStatusRef = useRef(settleStatus)
  const onLoadingStatusChangeRef = useRef(onLoadingStatusChange)
  useEffect(() => {
    settleStatusRef.current = settleStatus
    onLoadingStatusChangeRef.current = onLoadingStatusChange
  })

  useEffect(() => {
    setStatus('idle')
    const settled = settleStatusRef.current?.()
    if (settled === undefined) {
      return undefined
    }
    if (settled instanceof Promise) {
      let cancelled = false
      void settled.then((resolved) => {
        if (!cancelled) {
          setStatus(resolved)
        }
      })
      return () => {
        cancelled = true
      }
    }
    setStatus(settled)
    return undefined
  }, [src])

  const { onImageLoadingStatusChange } = context
  useEffect(() => {
    onLoadingStatusChangeRef.current?.(status)
    onImageLoadingStatusChange(status)
  }, [status, onImageLoadingStatusChange])

  const onLoad = useCallback(() => setStatus('loaded'), [])
  const onError = useCallback(() => setStatus('error'), [])
  return { status, onLoad, onError }
}

/**
 * Fallback-side visibility: `delayMs` gates the first render (legacy's
 * fast-connection flash guard), and the fallback unmounts once the image
 * reports `loaded` — staying up through `idle` and `error`.
 */
export function useAvatarFallbackVisible(delayMs: number | undefined): boolean {
  const context = useContext(AvatarCompatContext)
  const [canRender, setCanRender] = useState(delayMs === undefined)
  const enable = useCallback(() => setCanRender(true), [])

  // useTimeout skips scheduling for negative delays, giving the legacy
  // no-timer-when-undefined shape; defined values clamp at 0 like setTimeout.
  useTimeout(enable, delayMs === undefined ? -1 : Math.max(delayMs, 0))

  return canRender && context.imageLoadingStatus !== 'loaded'
}
