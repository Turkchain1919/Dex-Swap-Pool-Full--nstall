/**
 * The prop contract for the avatar compat compound (INFRA-3591), transcribed
 * from the legacy Tamagui `Avatar` (`@tamagui/avatar/src/Avatar.tsx`, a Radix
 * fork) as re-exported by the `ui/src` barrel:
 *
 * - `AvatarCompatProps`         ← `AvatarFrame = styled(Square, …)` — `size`
 *   defaults to `'$true'`, `circular` is the Square/View shape variant.
 * - `AvatarImageCompatProps`    ← `AvatarImageProps` (`src`,
 *   `onLoadingStatusChange`, plus the Tamagui `Image` pass-through — the one
 *   blocked call site uses `src`/`alt`/`accessibilityLabel`).
 * - `AvatarFallbackCompatProps` ← `AvatarFallbackProps` (`delayMs` plus the
 *   YStack style surface; the blocked call site passes token
 *   `backgroundColor`).
 *
 * Token-shaped props stay token-shaped (`size` accepts the `$space` token set
 * plus raw numbers — legacy `tokens.size` IS the space scale,
 * `ui/src/theme/tokens.ts:15` `const size = space`; `backgroundColor` accepts
 * `ColorValue`, never the annotation-only `ColorTokens`). Shared by all
 * platform legs — no `react-native` value import here (the sole held
 * consumer is apps/web; the native leg is a real RN implementation so the
 * compound never throws on import or render, the INFRA-3517 hazard).
 */
import type { ReactNode } from 'react'
import type { ColorValue } from '../compat/props'
import type { SporeSpaceToken } from '../compat/tokens'

/**
 * Legacy `Square` size: the `$size` token scale (which is the `$space` scale,
 * `ui/src/theme/tokens.ts:15`) or a raw pixel number — the blocked call site
 * passes `iconSizes.icon32` (the number 32).
 */
export type AvatarCompatSize = SporeSpaceToken | number

/**
 * Verbatim legacy union. `'loading'` is a TYPE-PARITY member only — legacy
 * never emits it either: `@tamagui/avatar`'s `onLoadStart={() =>
 * setStatus('loading')}` is commented out (v1.136.1 source and shipped
 * dist), so the real sequence on both sides is `idle` → `loaded`/`error`.
 */
export type AvatarImageLoadingStatus = 'idle' | 'loading' | 'loaded' | 'error'

export interface AvatarCompatProps {
  /** Legacy shape variant: fully rounded frame (Tamagui `circular`). */
  circular?: boolean
  /** Width and height of the frame. Defaults to `'$true'` (8px), like legacy. */
  size?: AvatarCompatSize
  children?: ReactNode
  /** Legacy RN testID; `data-testid` on web. */
  testID?: string
  className?: string
}

export interface AvatarImageCompatProps {
  src?: string
  alt?: string
  /** Legacy RN a11y label (an `Image` pass-through prop); `aria-label` on web. */
  accessibilityLabel?: string
  /**
   * Fires on every image loading-status transition, exactly like legacy
   * (`Avatar.tsx` mirrors each `setStatus` into this callback and into the
   * root's context).
   */
  onLoadingStatusChange?: (status: AvatarImageLoadingStatus) => void
  testID?: string
  className?: string
}

export interface AvatarFallbackCompatProps {
  /**
   * Token or raw CSS color for the fallback surface — the blocked call site
   * passes `"$neutral3"`. Unknown `$` tokens fail fast at render
   * (`colorClasses`), matching the compat unmappable-token convention.
   */
  backgroundColor?: ColorValue
  /** Delay before the fallback may render, like legacy (guards fast-connection flashes). */
  delayMs?: number
  children?: ReactNode
  testID?: string
  className?: string
}
