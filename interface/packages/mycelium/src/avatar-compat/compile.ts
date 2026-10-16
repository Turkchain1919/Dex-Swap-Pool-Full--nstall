/**
 * Pure class/style builders for the avatar compat compound (INFRA-3591) —
 * each a direct transcription of the legacy Tamagui frame it replaces
 * (`@tamagui/avatar/src/Avatar.tsx`), on the shared compat token maps.
 */
import type { ColorValue } from '../compat/props'
import { type ClassList, colorClasses } from '../compat/style-classes'
import { lookupToken, SPACE_TOKEN_PX } from '../compat/tokens'
import type { AvatarCompatSize } from './props'

/** Legacy default: `size = '$true'` on the Avatar root (8px on this theme's scale). */
export const DEFAULT_AVATAR_SIZE: AvatarCompatSize = '$true'

/**
 * The `AvatarFrame` = `styled(Square, { position: 'relative', overflow:
 * 'hidden' })` — Square centers its content on the View base (flex column,
 * basis auto, shrink 0; the same RN-default reset FlexCompat's BASE_CLASSES
 * carries).
 */
export const AVATAR_ROOT_BASE_CLASSES =
  'box-border relative flex flex-col basis-auto shrink-0 min-h-[0px] min-w-[0px] items-center justify-center overflow-hidden'

/**
 * The legacy image wrapper: `<YStack fullscreen zIndex={1}>` around the image,
 * stacking it ABOVE the z-0 fallback frame.
 */
export const AVATAR_IMAGE_FRAME_CLASSES = 'absolute inset-0 z-[1]'

/**
 * The image fills its frame edge to edge (`fullscreen` on both legs); shared
 * so the two legs cannot drift on geometry.
 */
export const AVATAR_IMAGE_FILL_CLASSES = 'absolute inset-0 h-full w-full'

/**
 * Web only: `object-cover` is the CSS spelling of RN's default
 * `resizeMode: 'cover'` (which the native leg gets for free), matching the
 * legacy Tamagui `Image`'s undefined `objectFit`.
 */
export const AVATAR_IMAGE_CLASSES = `${AVATAR_IMAGE_FILL_CLASSES} object-cover`

/**
 * Web only: a raw `<img>` paints the browser's broken-image glyph + alt text
 * while loading/on error, which the legacy react-native-web `Image` (a div
 * whose background paints only once loaded) never does — so the img stays
 * MOUNTED (load/error events must fire) but fully transparent until
 * `loaded`. Opacity, deliberately not `invisible`: `visibility: hidden`
 * drops the img's alt/aria-label from the accessibility tree in the
 * idle/error states, while legacy's div keeps its accessible name exposed
 * in every state — `opacity-0` hides the same pixels without the a11y
 * removal.
 */
export function avatarImageClassName(loaded: boolean): ClassList {
  return [AVATAR_IMAGE_CLASSES, !loaded && 'opacity-0']
}

/** `AvatarFallbackFrame` = `styled(YStack, { position: 'absolute', fullscreen: true, zIndex: 0 })`. */
export const AVATAR_FALLBACK_BASE_CLASSES =
  'box-border absolute inset-0 z-0 flex flex-col basis-auto shrink-0 min-h-[0px] min-w-[0px]'

export function avatarRootClassName(circular: boolean | undefined): ClassList {
  // Tamagui `circular` resolves to borderRadius 100_000; on a square frame
  // `rounded-full` is the same shape.
  return [AVATAR_ROOT_BASE_CLASSES, circular === true && 'rounded-full']
}

/**
 * Legacy Square sizing: number → px, `$token` → px off the space scale
 * (legacy `tokens.size` IS the space scale), unknown token → throw (the
 * shared compat unmappable-token convention). Numeric so BOTH platform legs
 * can consume it — React DOM appends `px`, React Native wants the number.
 */
export function avatarSizePx(size: AvatarCompatSize): number {
  if (typeof size === 'number') {
    return size
  }
  const px = lookupToken(SPACE_TOKEN_PX, size)
  if (px === undefined) {
    throw new Error(`compat: unknown avatar size token "${size}"`)
  }
  return px
}

/**
 * Width and height from the size token; open-ended (any space token or raw
 * number), so it lands in the inline-style lane rather than a
 * class-per-token table.
 */
export function avatarRootSizeStyle(size: AvatarCompatSize): { width: number; height: number } {
  const px = avatarSizePx(size)
  return { width: px, height: px }
}

export function avatarFallbackClassName(backgroundColor: ColorValue | undefined): ClassList {
  return [AVATAR_FALLBACK_BASE_CLASSES, ...(backgroundColor !== undefined ? colorClasses('bg', backgroundColor) : [])]
}
