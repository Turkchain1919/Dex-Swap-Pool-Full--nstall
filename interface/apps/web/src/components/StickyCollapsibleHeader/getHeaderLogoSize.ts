import { fonts, iconSizes } from '@universe/mycelium'
import type { MediaState as MediaQueryState } from '@universe/mycelium/theme-hooks-compat'
import { getStackedLogoWidth } from 'uniswap/src/components/CurrencyLogo/SplitLogo'
import { HEADER_LOGO_SIZE } from '~/components/StickyCollapsibleHeader/constants'

type TextVariantTokens = keyof typeof fonts

/** `useMedia()`-shaped input; only `sm` / `md` are read (others optional for tests). */
type HeaderLayoutMedia = Partial<Pick<MediaQueryState, 'sm' | 'md'>>

/**
 * Resolves header logo size from sticky collapsible header state and viewport.
 * Used by token/pool/auction headers and skeletons for consistent sizing.
 */
export function getHeaderLogoSize({
  isCompact,
  media,
  scaleMobileOnScroll = false,
}: {
  isCompact: boolean
  media: HeaderLayoutMedia
  // TDP grows the logo at rest and shrinks it on scroll; other headers keep a fixed small size on mobile web.
  scaleMobileOnScroll?: boolean
}): number {
  if (media.sm) {
    if (scaleMobileOnScroll) {
      return isCompact ? HEADER_LOGO_SIZE.mobileCompact : HEADER_LOGO_SIZE.mobile
    }
    return HEADER_LOGO_SIZE.small
  }

  // on medium-large screens, animate between medium/full size at the top scroll position and compact size on scroll down
  if (isCompact) {
    return HEADER_LOGO_SIZE.compact
  }
  if (media.md) {
    return HEADER_LOGO_SIZE.medium
  }
  return HEADER_LOGO_SIZE.expanded
}

/**
 * Per-logo size for the detail headers (pool double logo + skeleton, and the position detail header +
 * loader): 36px on mWeb (≤640) so both pages match, otherwise the resting size. The pool passes no
 * `restingSize` and falls back to the shared sticky-header size; the position header passes its own fixed
 * size. One helper for both call sites keeps the mWeb value and breakpoint from drifting apart.
 *
 * Overloaded rather than one optional-both signature because above md only one input applies to each
 * caller — the pool animates on scroll (`isCompact`), the position holds a fixed `restingSize` — so
 * passing both is a mistake worth rejecting at the call site instead of silently ignoring one.
 */
export function getDetailHeaderLogoSize(options: { media: HeaderLayoutMedia; restingSize: number }): number
export function getDetailHeaderLogoSize(options: { media: HeaderLayoutMedia; isCompact: boolean }): number
export function getDetailHeaderLogoSize({
  media,
  isCompact = false,
  restingSize,
}: {
  media: HeaderLayoutMedia
  isCompact?: boolean
  restingSize?: number
}): number {
  if (media.md) {
    return iconSizes.icon36
  }
  return restingSize ?? getHeaderLogoSize({ isCompact, media })
}

/**
 * The stacked double logo's footprint at the header's resting size, i.e. the width of the box it is drawn
 * into before CSS scaling. `getPoolHeaderLogoWidth` is the scaled width that box occupies on screen.
 */
export const POOL_HEADER_STACKED_LOGO_WIDTH = getStackedLogoWidth(HEADER_LOGO_SIZE.expanded)

/**
 * Footprint width the pool detail header reserves for its stacked double logo, shared by the loaded header
 * and its skeleton so the title starts at the same x in both — the height invariant above is useless on its
 * own if the widths drift.
 *
 * Always the full two-logo footprint, never narrowed to a single logo: the skeleton renders before the
 * tokens resolve and so cannot know whether both logos will load, and a data-dependent reservation shifts
 * the row on load. The cost is a wider gap between a collapsed logo and the pool name (fallback-only).
 */
export function getPoolHeaderLogoWidth({ isCompact, media }: { isCompact: boolean; media: HeaderLayoutMedia }): number {
  return POOL_HEADER_STACKED_LOGO_WIDTH * (getDetailHeaderLogoSize({ isCompact, media }) / HEADER_LOGO_SIZE.expanded)
}

/**
 * Vertical gap for the pool header's title column, shared by the loaded header and its skeleton so the
 * reserved layout matches the loaded one — an unmirrored gap here shifts the badges row on load. Returned
 * as props rather than a value to keep the mWeb override a CSS media query instead of a JS branch. mWeb
 * collapses it to zero because the badges sit directly under the title once row 2 is dropped.
 */
// Literal token types (valid in both Tamagui and mycelium) so the props spread onto either system's Flex
// while the PoolDetails consumers are still on ui/src.
export function getPoolHeaderColumnGapProps(isCompact: boolean): { gap: '$gap4' | '$gap8'; $md: { gap: '$none' } } {
  return { gap: isCompact ? '$gap4' : '$gap8', $md: { gap: '$none' } }
}

/** Subset of UI text variants used for details header title. */
type HeaderTitleVariant = Extract<TextVariantTokens, 'heading3' | 'subheading1' | 'subheading2'>

/**
 * Resolves header title Text variant from sticky collapsible header state and viewport.
 */
export function getHeaderTitleVariant({
  isCompact,
  media,
}: {
  isCompact: boolean
  media: HeaderLayoutMedia
}): HeaderTitleVariant {
  if (media.sm) {
    return 'subheading2'
  }
  if (media.md) {
    return 'subheading1'
  }
  if (isCompact) {
    return 'subheading2'
  }
  return 'heading3'
}

/**
 * Resolves header title line height in px for skeleton/placeholder sizing.
 * Uses theme fonts for the variant from getHeaderTitleVariant.
 */
export function getHeaderTitleLineHeight({
  isCompact,
  media,
}: {
  isCompact: boolean
  media: HeaderLayoutMedia
}): number {
  const variant = getHeaderTitleVariant({ isCompact, media })
  return fonts[variant].lineHeight
}
