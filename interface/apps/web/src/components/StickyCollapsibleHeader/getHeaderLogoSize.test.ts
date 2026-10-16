import { fonts, iconSizes } from '@universe/mycelium'
import { getStackedLogoWidth } from 'uniswap/src/components/CurrencyLogo/SplitLogo'
import { HEADER_LOGO_SIZE } from '~/components/StickyCollapsibleHeader/constants'
import {
  getDetailHeaderLogoSize,
  getHeaderLogoSize,
  getHeaderTitleLineHeight,
  getHeaderTitleVariant,
  getPoolHeaderLogoWidth,
  POOL_HEADER_STACKED_LOGO_WIDTH,
} from '~/components/StickyCollapsibleHeader/getHeaderLogoSize'

describe('getHeaderLogoSize', () => {
  it('returns fixed small size when sm breakpoint matches and scaleMobileOnScroll is off', () => {
    expect(getHeaderLogoSize({ isCompact: false, media: { sm: true } })).toBe(HEADER_LOGO_SIZE.small)
    expect(getHeaderLogoSize({ isCompact: true, media: { sm: true } })).toBe(HEADER_LOGO_SIZE.small)
  })

  it('returns mobile size on sm with scaleMobileOnScroll, shrinking to mobileCompact on scroll', () => {
    expect(getHeaderLogoSize({ isCompact: false, media: { sm: true }, scaleMobileOnScroll: true })).toBe(
      HEADER_LOGO_SIZE.mobile,
    )
    expect(getHeaderLogoSize({ isCompact: true, media: { sm: true }, scaleMobileOnScroll: true })).toBe(
      HEADER_LOGO_SIZE.mobileCompact,
    )
  })

  it('returns compact size when isCompact is true', () => {
    expect(getHeaderLogoSize({ isCompact: true, media: { md: false } })).toBe(HEADER_LOGO_SIZE.compact)
    expect(getHeaderLogoSize({ isCompact: true, media: { md: true } })).toBe(HEADER_LOGO_SIZE.compact)
  })

  it('returns medium size when not compact and media.md is true (sm off)', () => {
    expect(getHeaderLogoSize({ isCompact: false, media: { sm: false, md: true } })).toBe(HEADER_LOGO_SIZE.medium)
  })

  it('returns expanded size when not compact and below sm/md breakpoints', () => {
    expect(getHeaderLogoSize({ isCompact: false, media: { sm: false, md: false } })).toBe(HEADER_LOGO_SIZE.expanded)
  })

  it('returns fixed small size when sm and md both match (sm is checked first)', () => {
    expect(getHeaderLogoSize({ isCompact: false, media: { sm: true, md: true } })).toBe(HEADER_LOGO_SIZE.small)
  })
})

describe('getDetailHeaderLogoSize', () => {
  it('pins both detail headers at 36px at and below the md breakpoint, ignoring isCompact', () => {
    // Both detail headers switch to their mWeb treatment at md (640px), where the logo is a fixed 36px.
    // Scroll state deliberately does not shrink it any further — this is why the collapse animation only
    // applies above 640px. `restingSize` is ignored here, which is what keeps the two pages from drifting.
    expect(getDetailHeaderLogoSize({ isCompact: false, media: { md: true } })).toBe(iconSizes.icon36)
    expect(getDetailHeaderLogoSize({ isCompact: true, media: { md: true } })).toBe(iconSizes.icon36)
    expect(getDetailHeaderLogoSize({ isCompact: false, media: { sm: true, md: true } })).toBe(iconSizes.icon36)
    // The position header's resting size loses to the shared mWeb value — that is what pins the two pages
    // to the same 36px. 44 is its real resting size, so this fails if the md guard is dropped.
    expect(getDetailHeaderLogoSize({ media: { md: true }, restingSize: 44 })).toBe(iconSizes.icon36)
  })

  it('defers to the shared header sizing above md, where isCompact still animates the logo', () => {
    // The pool header passes no restingSize.
    expect(getDetailHeaderLogoSize({ isCompact: false, media: { sm: false, md: false } })).toBe(
      HEADER_LOGO_SIZE.expanded,
    )
    expect(getDetailHeaderLogoSize({ isCompact: true, media: { sm: false, md: false } })).toBe(HEADER_LOGO_SIZE.compact)
    // The two differ above md — that difference is the scroll animation.
    expect(getDetailHeaderLogoSize({ isCompact: true, media: { md: false } })).not.toBe(
      getDetailHeaderLogoSize({ isCompact: false, media: { md: false } }),
    )
    // ...and are identical at md, which is the documented limit of that animation.
    expect(getDetailHeaderLogoSize({ isCompact: true, media: { md: true } })).toBe(
      getDetailHeaderLogoSize({ isCompact: false, media: { md: true } }),
    )
  })

  it('holds restingSize fixed above md, so the position header does not animate on scroll', () => {
    // The position detail header passes its own fixed size and has no collapse animation above 640px.
    // `isCompact` is not passable alongside `restingSize` — the union in the signature rules out the
    // ignored-argument case this used to assert.
    expect(getDetailHeaderLogoSize({ media: { sm: false, md: false }, restingSize: 44 })).toBe(44)
    // A resting size that is not one of the shared header tokens, so this cannot pass by coincidence.
    expect(getDetailHeaderLogoSize({ media: { sm: false, md: false }, restingSize: 52 })).toBe(52)
  })
})

describe('getPoolHeaderLogoWidth', () => {
  it('scales the stacked footprint with the logo size, per breakpoint', () => {
    // Above md the logo rests at expanded size, so the width is the unscaled stacked footprint.
    expect(getPoolHeaderLogoWidth({ isCompact: false, media: { sm: false, md: false } })).toBeCloseTo(
      POOL_HEADER_STACKED_LOGO_WIDTH,
      5,
    )
    // At md the logo is pinned to 36px, so the footprint scales by 36/expanded.
    expect(getPoolHeaderLogoWidth({ isCompact: false, media: { md: true } })).toBeCloseTo(
      POOL_HEADER_STACKED_LOGO_WIDTH * (iconSizes.icon36 / HEADER_LOGO_SIZE.expanded),
      5,
    )
    // Scroll-collapsing above md narrows it too, by the compact/expanded ratio.
    expect(getPoolHeaderLogoWidth({ isCompact: true, media: { md: false } })).toBeCloseTo(
      POOL_HEADER_STACKED_LOGO_WIDTH * (HEADER_LOGO_SIZE.compact / HEADER_LOGO_SIZE.expanded),
      5,
    )
  })

  it('reserves two overlapping logos, not one, so the skeleton matches the loaded pair', () => {
    // The whole point of the shared helper: a single-logo reservation would shift the title on load.
    expect(POOL_HEADER_STACKED_LOGO_WIDTH).toBeGreaterThan(HEADER_LOGO_SIZE.expanded)
    expect(POOL_HEADER_STACKED_LOGO_WIDTH).toBe(getStackedLogoWidth(HEADER_LOGO_SIZE.expanded))
  })
})

describe('getHeaderTitleVariant', () => {
  it('returns subheading2 when media.sm is true (before md and isCompact)', () => {
    expect(getHeaderTitleVariant({ isCompact: false, media: { sm: true } })).toBe('subheading2')
    // sm is checked first — same variant as compact-only, but guard order matters when combined with md
    expect(getHeaderTitleVariant({ isCompact: true, media: { sm: true } })).toBe('subheading2')
    expect(getHeaderTitleVariant({ isCompact: false, media: { sm: true, md: true } })).toBe('subheading2')
  })

  it('returns subheading1 when media.md is true (sm off)', () => {
    expect(getHeaderTitleVariant({ isCompact: false, media: { sm: false, md: true } })).toBe('subheading1')
    expect(getHeaderTitleVariant({ isCompact: true, media: { sm: false, md: true } })).toBe('subheading1')
  })

  it('returns subheading2 when not mobile and isCompact is true', () => {
    expect(getHeaderTitleVariant({ isCompact: true, media: { sm: false, md: false } })).toBe('subheading2')
  })

  it('returns heading3 when not mobile and not compact', () => {
    expect(getHeaderTitleVariant({ isCompact: false, media: { sm: false, md: false } })).toBe('heading3')
  })
})

describe('getHeaderTitleLineHeight', () => {
  it('returns theme line height for subheading2 when media.sm is true', () => {
    expect(getHeaderTitleLineHeight({ isCompact: false, media: { sm: true } })).toBe(fonts.subheading2.lineHeight)
    expect(getHeaderTitleLineHeight({ isCompact: true, media: { sm: true } })).toBe(fonts.subheading2.lineHeight)
  })

  it('returns theme line height for subheading1 when media.md is true (sm off)', () => {
    expect(getHeaderTitleLineHeight({ isCompact: false, media: { sm: false, md: true } })).toBe(
      fonts.subheading1.lineHeight,
    )
    expect(getHeaderTitleLineHeight({ isCompact: true, media: { sm: false, md: true } })).toBe(
      fonts.subheading1.lineHeight,
    )
  })

  it('returns theme line height for subheading2 when media.md is false and is compact', () => {
    expect(getHeaderTitleLineHeight({ isCompact: true, media: { sm: false, md: false } })).toBe(
      fonts.subheading2.lineHeight,
    )
  })

  it('returns theme line height for heading3 when media.md is false and not compact', () => {
    expect(getHeaderTitleLineHeight({ isCompact: false, media: { sm: false, md: false } })).toBe(
      fonts.heading3.lineHeight,
    )
  })
})
