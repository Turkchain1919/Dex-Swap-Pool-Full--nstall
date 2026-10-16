/**
 * Web leg of `AvatarCompat` — the drop-in Tailwind twin of the legacy Tamagui
 * `Avatar` compound (`@tamagui/avatar/src/Avatar.tsx`, itself a Radix fork)
 * as re-exported by the `ui/src` barrel.
 *
 * Structure is the legacy structure, transcribed element for element: the
 * root centers content and clips (`styled(Square, { position: 'relative',
 * overflow: 'hidden' })`), the image stays MOUNTED through every loading
 * state inside a z-1 fullscreen frame (`<YStack fullscreen zIndex={1}>`),
 * and the z-0 fallback frame unmounts only once the image reports `loaded` —
 * so the fallback shows while loading AND on load error, exactly the legacy
 * show-fallback-until-loaded contract. The status lifecycle, callback
 * mirroring and delayMs timer live in the shared `./hooks`, consumed by both
 * platform legs.
 *
 * Web-only deltas from a naive transcription (both pinned by tests): the img
 * stays invisible until `loaded` so the browser's broken-image glyph and alt
 * text never paint over the fallback (the legacy RN-web `Image` is a div
 * whose background paints only once loaded), and an already-complete
 * cached/data-URI image settles from `img.complete` since its load event can
 * fire before React attaches `onLoad`.
 */
// oxlint-disable react/forbid-elements -- the compat components ARE the raw
// DOM boundary, like the checkbox/segmented-control compat legs.
import { forwardRef, useCallback, useRef } from 'react'
import { cn } from '../cn'
import { markMyceliumPrimitive } from '../compat/primitive-marker'
import {
  AVATAR_IMAGE_FRAME_CLASSES,
  avatarFallbackClassName,
  avatarImageClassName,
  avatarRootClassName,
  avatarRootSizeStyle,
  DEFAULT_AVATAR_SIZE,
} from './compile'
import { AvatarCompatContext, useAvatarFallbackVisible, useAvatarImageStatus, useAvatarRootContextValue } from './hooks'
import type { AvatarCompatProps, AvatarFallbackCompatProps, AvatarImageCompatProps } from './props'

const AvatarCompatRoot = forwardRef<HTMLDivElement, AvatarCompatProps>((props, ref) => {
  const { circular, size = DEFAULT_AVATAR_SIZE, children, testID, className } = props
  const contextValue = useAvatarRootContextValue()

  return (
    <AvatarCompatContext.Provider value={contextValue}>
      <div
        ref={ref}
        className={cn(...avatarRootClassName(circular), className)}
        style={avatarRootSizeStyle(size)}
        // Conditional + last (the ButtonCompat/CheckboxCompat idiom): an
        // absent testID must not wipe an ambient `data-testid`.
        {...(testID !== undefined ? { 'data-testid': testID } : undefined)}
      >
        {children}
      </div>
    </AvatarCompatContext.Provider>
  )
})
AvatarCompatRoot.displayName = 'AvatarCompat'

const AvatarImageCompat = forwardRef<HTMLImageElement, AvatarImageCompatProps>((props, ref) => {
  const { src, alt, accessibilityLabel, onLoadingStatusChange, testID, className } = props
  const imgRef = useRef<HTMLImageElement | null>(null)

  const setRefs = useCallback(
    (node: HTMLImageElement | null): void => {
      imgRef.current = node
      if (typeof ref === 'function') {
        ref(node)
      } else if (ref !== null) {
        ref.current = node
      }
    },
    [ref],
  )

  const { status, onLoad, onError } = useAvatarImageStatus({
    src,
    onLoadingStatusChange,
    settleStatus: () => {
      const node = imgRef.current
      if (node === null || !node.complete || node.getAttribute('src') === null) {
        return undefined
      }
      if (node.naturalWidth > 0) {
        return 'loaded'
      }
      // Complete with zero intrinsic size is ambiguous: Firefox reports
      // 0×0 for a LOADED viewBox-only SVG (exactly the country-flag URL
      // shape), and broken images report 0 too. decode() separates them —
      // it rejects only for genuinely undecodable images. Without decode()
      // match legacy, which never gates on intrinsic size (the RN-web
      // Image marks loaded on the load event alone): optimistic loaded.
      if (typeof node.decode === 'function') {
        return node.decode().then(
          () => 'loaded' as const,
          () => 'error' as const,
        )
      }
      return 'loaded'
    },
  })

  return (
    <div className={AVATAR_IMAGE_FRAME_CLASSES}>
      <img
        ref={setRefs}
        src={src}
        alt={alt}
        aria-label={accessibilityLabel}
        className={cn(...avatarImageClassName(status === 'loaded'), className)}
        onError={onError}
        onLoad={onLoad}
        {...(testID !== undefined ? { 'data-testid': testID } : undefined)}
      />
    </div>
  )
})
AvatarImageCompat.displayName = 'AvatarCompat.Image'

const AvatarFallbackCompat = forwardRef<HTMLDivElement, AvatarFallbackCompatProps>((props, ref) => {
  const { backgroundColor, delayMs, children, testID, className } = props
  const visible = useAvatarFallbackVisible(delayMs)

  return visible ? (
    <div
      ref={ref}
      className={cn(...avatarFallbackClassName(backgroundColor), className)}
      {...(testID !== undefined ? { 'data-testid': testID } : undefined)}
    >
      {children}
    </div>
  ) : null
})
AvatarFallbackCompat.displayName = 'AvatarCompat.Fallback'

// Marked so legacy color-injecting wrappers (TouchableArea's clone) skip the
// compound instead of handing it Spore color guidance it takes no part in —
// the FlexCompat/TextCompat convention, pinned by the compat roster suite
// (compat/primitive-marker.roster.test.tsx). The statics are marked too: a
// legacy wrapper can clone `<AvatarCompat.Image>` directly.
export const AvatarCompat = markMyceliumPrimitive(
  Object.assign(AvatarCompatRoot, {
    Image: markMyceliumPrimitive(AvatarImageCompat),
    Fallback: markMyceliumPrimitive(AvatarFallbackCompat),
  }),
)
