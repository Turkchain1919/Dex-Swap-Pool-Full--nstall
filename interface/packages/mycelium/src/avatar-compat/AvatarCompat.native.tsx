/**
 * Native leg of `AvatarCompat` — React Native `View`/`Image` on uniwind
 * classNames, following the shipped `CheckboxCompat.native.tsx` precedent
 * (plain `react-native`, ZERO new dependencies — the earlier gap analysis'
 * `@rn-primitives/avatar` suggestion would be a net-new package for a
 * component with no native consumer yet).
 *
 * Same structure and behavior as the web leg, both transcribed from the
 * legacy Tamagui compound: always-mounted image in a z-1 fullscreen frame,
 * z-0 fallback that unmounts only on `loaded` (so it shows while loading and
 * on error). The status lifecycle, callback mirroring and delayMs timer live
 * in the shared `./hooks`, consumed by both legs; the image geometry comes
 * from the shared `AVATAR_IMAGE_FILL_CLASSES` (the RN `Image`'s undefined
 * `resizeMode` default is already `'cover'`, the web leg's `object-cover`).
 * No `invisible` gate here: a failed RN Image paints nothing, so the legacy
 * broken-glyph hazard is web-only.
 *
 * The held INFRA-3591 consumer is web-only; this leg exists so the compound
 * is safe (never throws on import or render — the INFRA-3517 hazard) if a
 * native surface adopts it, and to satisfy the repo's web/native split rule.
 */
import { forwardRef } from 'react'
import { Image, View } from 'react-native'
import { cn } from '../cn'
import { markMyceliumPrimitive } from '../compat/primitive-marker'
import {
  AVATAR_IMAGE_FILL_CLASSES,
  AVATAR_IMAGE_FRAME_CLASSES,
  avatarFallbackClassName,
  avatarRootClassName,
  avatarRootSizeStyle,
  DEFAULT_AVATAR_SIZE,
} from './compile'
import { AvatarCompatContext, useAvatarFallbackVisible, useAvatarImageStatus, useAvatarRootContextValue } from './hooks'
import type { AvatarCompatProps, AvatarFallbackCompatProps, AvatarImageCompatProps } from './props'

const AvatarCompatRoot = forwardRef<View, AvatarCompatProps>((props, ref) => {
  const { circular, size = DEFAULT_AVATAR_SIZE, children, testID, className } = props
  const contextValue = useAvatarRootContextValue()

  return (
    <AvatarCompatContext.Provider value={contextValue}>
      <View
        ref={ref}
        className={cn(...avatarRootClassName(circular), className)}
        style={avatarRootSizeStyle(size)}
        testID={testID}
      >
        {children}
      </View>
    </AvatarCompatContext.Provider>
  )
})
AvatarCompatRoot.displayName = 'AvatarCompat'

const AvatarImageCompat = forwardRef<Image, AvatarImageCompatProps>((props, ref) => {
  const { src, alt, accessibilityLabel, onLoadingStatusChange, testID, className } = props
  const { onLoad, onError } = useAvatarImageStatus({ src, onLoadingStatusChange })

  return (
    // The frame keeps its own classes; the caller's className goes to the
    // inner Image so both legs target the same logical element (the web leg
    // merges it onto the <img>).
    <View className={AVATAR_IMAGE_FRAME_CLASSES}>
      {/* TODO(INFRA-3708): swap to mycelium's universal-image once INFRA-3682 lands — Avatar's fallback state machine stays the single source of truth. */}
      <Image
        ref={ref}
        accessibilityLabel={accessibilityLabel}
        alt={alt}
        className={cn(AVATAR_IMAGE_FILL_CLASSES, className)}
        source={src !== undefined ? { uri: src } : undefined}
        testID={testID}
        onError={onError}
        onLoad={onLoad}
      />
    </View>
  )
})
AvatarImageCompat.displayName = 'AvatarCompat.Image'

const AvatarFallbackCompat = forwardRef<View, AvatarFallbackCompatProps>((props, ref) => {
  const { backgroundColor, delayMs, children, testID, className } = props
  const visible = useAvatarFallbackVisible(delayMs)

  return visible ? (
    <View ref={ref} className={cn(...avatarFallbackClassName(backgroundColor), className)} testID={testID}>
      {children}
    </View>
  ) : null
})
AvatarFallbackCompat.displayName = 'AvatarCompat.Fallback'

// Same marking as the web leg (the FlexCompat.native precedent) so both legs
// present one contract to legacy color-injecting wrappers.
export const AvatarCompat = markMyceliumPrimitive(
  Object.assign(AvatarCompatRoot, {
    Image: markMyceliumPrimitive(AvatarImageCompat),
    Fallback: markMyceliumPrimitive(AvatarFallbackCompat),
  }),
)
