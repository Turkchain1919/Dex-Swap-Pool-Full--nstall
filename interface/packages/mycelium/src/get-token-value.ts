/**
 * getTokenValue compat: resolves legacy `$` token names (dotted specific names first, then
 * category maps in the legacy insertion order) against the parity-pinned compat token maps.
 * Covers space/size, icon, image, radius, zIndex; `color`/`font` deliberately not (use
 * useSporeColors / fonts). Unknown tokens throw — Tamagui's silent undefined collapses to NaN/0.
 */
import {
  ICON_SIZE_TOKEN_PX,
  RADIUS_TOKEN_PX,
  SPACE_TOKEN_PX,
  Z_INDEX_TOKEN,
  type SporeIconSizeToken,
  type SporeRadiusToken,
  type SporeSpaceToken,
  type SporeZIndexToken,
} from './compat/tokens'
import { imageSizes } from './tokens'

/** Legacy `$image.*` specific-token names (the base map's keys are `image12`…, so the prefix appears twice). */
export type SporeImageSizeToken = `$image.${keyof typeof imageSizes}` | '$image.true'

/** Legacy `imageSize` token map (`ui/src/theme/tokens.ts`: `{ ...imageSizes, true: imageSizes.image40 }`), `$image.`-prefixed. */
const IMAGE_SIZE_TOKEN_PX: Readonly<Record<SporeImageSizeToken, number>> = {
  ...(Object.fromEntries(Object.entries(imageSizes).map(([key, value]) => [`$image.${key}`, value])) as Record<
    SporeImageSizeToken,
    number
  >),
  '$image.true': imageSizes.image40,
}

/** The token categories this resolver covers, keyed by Tamagui's `group` names. */
const CATEGORY_MAPS = {
  space: SPACE_TOKEN_PX as Readonly<Record<string, number>>,
  // The legacy config aliases `size` to the space map (`const size = space`).
  size: SPACE_TOKEN_PX as Readonly<Record<string, number>>,
  icon: ICON_SIZE_TOKEN_PX as Readonly<Record<string, number>>,
  // Widened for the string-indexed lookup below; the declared map type keeps
  // the members exhaustive over SporeImageSizeToken.
  image: IMAGE_SIZE_TOKEN_PX as Readonly<Record<string, number>>,
  radius: RADIUS_TOKEN_PX as Readonly<Record<string, number>>,
  zIndex: Z_INDEX_TOKEN as Readonly<Record<string, number>>,
} as const

export type GetTokenValueGroup = keyof typeof CATEGORY_MAPS

/**
 * The covered token names, per category. The compile-time half of the
 * loud-failure contract: the codemod's premise is that tsc proves a swap, so
 * a token outside the covered categories (a color/font name, 'auto') must
 * FAIL TYPECHECK at the converted call site rather than compile and throw at
 * render. The runtime throw below stays as the second line of defense for
 * values that arrive as widened strings.
 */
interface CategoryTokens {
  space: SporeSpaceToken
  size: SporeSpaceToken
  icon: SporeIconSizeToken
  image: SporeImageSizeToken
  radius: SporeRadiusToken
  zIndex: SporeZIndexToken
}

/** Every token name `getTokenValue` covers, across all categories. */
export type GetTokenValueToken = CategoryTokens[GetTokenValueGroup]

/**
 * Category-less lookup order, mirroring the legacy config's insertion order
 * (space, size, icon, image, zIndex, radius — `color`/`font` excluded, see the
 * module doc). The dotted `icon`/`image` names are unambiguous (they carry
 * their category), so only the flat names depend on this order — and `space`
 * first matches Tamagui (`$true` → 8, `$none` → 0).
 */
const CATEGORYLESS_ORDER: readonly GetTokenValueGroup[] = ['space', 'size', 'icon', 'image', 'zIndex', 'radius']

/**
 * Resolve a `$` design token to its numeric px value, like the legacy
 * Tamagui `getTokenValue` — except an unknown token or category THROWS
 * instead of silently resolving to `undefined`.
 */
export function getTokenValue(token: GetTokenValueToken): number
export function getTokenValue<G extends GetTokenValueGroup>(token: CategoryTokens[G], group: G): number
// Implementation signature deliberately wide (the overloads above govern
// call sites); the runtime throw covers widened-string escapes.
export function getTokenValue(token: string, group?: GetTokenValueGroup): number {
  if (group !== undefined) {
    const value = CATEGORY_MAPS[group][token]
    if (value !== undefined) {
      return value
    }
  } else {
    for (const category of CATEGORYLESS_ORDER) {
      const value = CATEGORY_MAPS[category][token]
      if (value !== undefined) {
        return value
      }
    }
  }
  throw new Error(
    `getTokenValue: unknown token "${token}"${group === undefined ? '' : ` in category "${group}"`} — ` +
      'covered categories: space/size ($spacing*/$padding*/$gap*/$none/$true), icon ($icon.*), ' +
      'image ($image.*), radius ($rounded*/$none/$true), zIndex. ' +
      'Legacy Tamagui returned undefined here, which arithmetic call sites collapse to NaN/0 — ' +
      'an unknown token is a call-site bug, fix the token.',
  )
}
