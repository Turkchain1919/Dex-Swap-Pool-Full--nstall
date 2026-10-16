/**
 * `@universe/mycelium/avatar-compat` — the compat twin of the legacy Tamagui
 * `Avatar` compound (INFRA-3591): `AvatarCompat` root with `.Image` and
 * `.Fallback` static members, `circular`, token/number `size`, and the legacy
 * show-fallback-until-loaded behavior.
 *
 * Deliberately NOT named `Avatar`: mycelium already exports a different,
 * web-only Radix `Avatar`/`AvatarImage`/`AvatarFallback` from
 * `@universe/mycelium/components` (`components/avatar.tsx`), which is left
 * entirely alone — it is not the compat target (named exports, className-based
 * sizing, no `circular`, no token surface).
 *
 * `AvatarCompat` is imported by its BASE specifier so Metro resolves the
 * `.native.tsx` leg and vite the `.web.tsx` leg; the platform-neutral modules
 * (`./props`, `./compile`, `./hooks`) are shared by both legs.
 */
export { AvatarCompat } from './AvatarCompat'
export {
  AVATAR_FALLBACK_BASE_CLASSES,
  AVATAR_IMAGE_CLASSES,
  AVATAR_IMAGE_FRAME_CLASSES,
  AVATAR_ROOT_BASE_CLASSES,
  avatarFallbackClassName,
  avatarImageClassName,
  avatarRootClassName,
  avatarRootSizeStyle,
  avatarSizePx,
  DEFAULT_AVATAR_SIZE,
} from './compile'
export type {
  AvatarCompatProps,
  AvatarCompatSize,
  AvatarFallbackCompatProps,
  AvatarImageCompatProps,
  AvatarImageLoadingStatus,
} from './props'
