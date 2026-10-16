import { describe, expect, it } from 'vitest'
import {
  containerClasses,
  getIndicatorTransform,
  getOptionTextColorClass,
  indicatorPillClasses,
  optionClasses,
  ROOT_FRAME_STYLE,
  TOGGLE_PADDING,
} from './style-classes'
import { GAP_CLASS_BY_TOKEN } from './tokens'
import type { SegmentedControlSize } from './types'
import { MAX_FONT_SIZE_MULTIPLIER, NATIVE_LINE_HEIGHT_SCALE, optionFontMetrics } from './typography'

const has = (className: string, cls: string): boolean => className.split(' ').includes(cls)

const SIZES: SegmentedControlSize[] = ['xsmall', 'small', 'smallThumbnail', 'default', 'large', 'largeThumbnail']

describe('containerClasses', () => {
  // Legacy OptionsSelector size variants: minHeight / gap / borderRadius
  // (fixed height → minHeight since CONS-2311 / #37109).
  const EXPECTED: Record<SegmentedControlSize, { minHeight: string; gap: string; radius: string }> = {
    xsmall: { minHeight: 'min-h-[30px]', gap: 'gap-1', radius: 'rounded-full' },
    small: { minHeight: 'min-h-[30px]', gap: 'gap-1.5', radius: 'rounded-16' },
    smallThumbnail: { minHeight: 'min-h-[34px]', gap: 'gap-1.5', radius: 'rounded-16' },
    default: { minHeight: 'min-h-[34px]', gap: 'gap-2', radius: 'rounded-20' },
    large: { minHeight: 'min-h-[44px]', gap: 'gap-3', radius: 'rounded-24' },
    largeThumbnail: { minHeight: 'min-h-[42px]', gap: 'gap-3', radius: 'rounded-24' },
  }

  it.each(SIZES)('compiles the legacy %s size preset', (size) => {
    const className = containerClasses({ size, outlined: true })
    const expected = EXPECTED[size]
    expect(has(className, expected.minHeight)).toBe(true)
    expect(has(className, expected.gap)).toBe(true)
    expect(has(className, expected.radius)).toBe(true)
    // TOGGLE_PADDING (4px) on all sides, row flex, clipped corners.
    expect(has(className, 'p-1')).toBe(true)
    expect(has(className, 'flex-row')).toBe(true)
    expect(has(className, 'items-center')).toBe(true)
    expect(has(className, 'overflow-hidden')).toBe(true)
    expect(has(className, 'bg-transparent')).toBe(true)
    // No fixed height may sneak back in: legacy grows to fit its tallest
    // option since CONS-2311, and a fixed height would re-clamp the outlined
    // large row 2px short of current legacy (see the +2px note below).
    expect(className.split(' ').some((cls) => cls.startsWith('h-'))).toBe(false)
  })

  it('lets the outlined large row resolve 2px taller than the old fixed 44px frame (current legacy parity)', () => {
    // CONS-2311 (#37109) changed the legacy presets from `height` to
    // `minHeight`. The large preset's minimum (44) never accounted for the
    // outlined 1px border the way every other preset does, so once the clamp
    // was gone, current legacy renders the outlined large row at its content
    // height: 36px option + 2×4px container padding + 2×1px border = 46px.
    const OPTION_MIN_HEIGHT = 36
    const OUTLINED_BORDER_WIDTH = 1
    const CONTAINER_MIN_HEIGHT = 44
    const contentHeight = OPTION_MIN_HEIGHT + 2 * TOGGLE_PADDING + 2 * OUTLINED_BORDER_WIDTH
    expect(contentHeight).toBe(46)
    expect(contentHeight).toBeGreaterThan(CONTAINER_MIN_HEIGHT)
    // The rebuild reproduces that by keeping large on min-h-[44px] (not a
    // fixed h-[44px]) with the same 36px min-h-9 option, 4px padding, and
    // outlined border, letting Yoga resolve the row to 46px.
    const container = containerClasses({ size: 'large', outlined: true })
    expect(has(container, 'min-h-[44px]')).toBe(true)
    expect(has(container, 'border')).toBe(true)
    expect(has(container, 'p-1')).toBe(true)
    expect(has(optionClasses({ size: 'large' }), 'min-h-9')).toBe(true)
  })

  it('draws the 1px surface3 border when outlined, none otherwise', () => {
    const outlined = containerClasses({ size: 'default', outlined: true })
    expect(has(outlined, 'border')).toBe(true)
    expect(has(outlined, 'border-surface3')).toBe(true)

    const flat = containerClasses({ size: 'default', outlined: false })
    expect(has(flat, 'border-0')).toBe(true)
    expect(has(flat, 'border-surface3')).toBe(false)
  })

  it('reserves the legacy invisible 1px root frame with resolved, unpaintable values', () => {
    // Legacy's "unstyled" <Tabs> root still allocates borderWidth 1 with the
    // theme's transparent $borderColor (Tamagui's `bordered` variant coerces
    // `false` to 1), so the control's layout box is the painted pill plus 1px
    // on every side — the pill sits inset 1px/1px and siblings see a box 2px
    // wider and taller than the pill. The root frame pins that relationship.
    //
    // Pinned as RESOLVED style values, not class names: the previous
    // `border border-transparent` classes passed a name-based test while
    // painting a black ring on device — uniwind resolves border classes
    // through its build-time class map, and a class-map miss leaves
    // borderColor undefined, which the runtime backfills with #000000
    // whenever borderStyle is set. The inline style below cannot miss.
    expect(ROOT_FRAME_STYLE).toEqual({ borderWidth: 1, borderColor: 'transparent' })
  })

  it('keeps the container p-1 utility in lockstep with TOGGLE_PADDING', () => {
    // getIndicatorTransform subtracts TOGGLE_PADDING from option rects that
    // are measured inside the container's `p-1` padding (Tailwind 4px scale
    // × 1). The constant and the utility encode the same value from opposite
    // ends — if either changes without the other, the indicator drifts by
    // the difference. (The class stays a literal so Tailwind's scanner can
    // see it; this assertion is the cross-reference.)
    const TAILWIND_SPACING_UNIT_PX = 4
    const CONTAINER_PADDING_STEP = 1 // the `1` in the container's `p-1`
    expect(has(containerClasses({ size: 'default', outlined: true }), `p-${CONTAINER_PADDING_STEP}`)).toBe(true)
    expect(TOGGLE_PADDING).toBe(CONTAINER_PADDING_STEP * TAILWIND_SPACING_UNIT_PX)
  })

  it('stretches to the parent when fullWidth', () => {
    expect(has(containerClasses({ size: 'default', outlined: true, fullWidth: true }), 'w-full')).toBe(true)
    expect(has(containerClasses({ size: 'default', outlined: true }), 'w-full')).toBe(false)
  })

  it('lets the gap token override the size preset gap', () => {
    const className = containerClasses({ size: 'default', outlined: true, gap: '$gap12' })
    expect(has(className, 'gap-3')).toBe(true)
    // tailwind-merge drops the preset's conflicting gap-2.
    expect(has(className, 'gap-2')).toBe(false)
  })

  it('maps every legacy space token to a gap utility', () => {
    for (const cls of Object.values(GAP_CLASS_BY_TOKEN)) {
      expect(cls).toMatch(/^gap-/)
    }
    // Spot-check the 4px-scale arithmetic against the legacy pixel values.
    expect(GAP_CLASS_BY_TOKEN.$spacing4).toBe('gap-1')
    expect(GAP_CLASS_BY_TOKEN.$spacing6).toBe('gap-1.5')
    expect(GAP_CLASS_BY_TOKEN.$gap8).toBe('gap-2')
    expect(GAP_CLASS_BY_TOKEN.$gap12).toBe('gap-3')
    expect(GAP_CLASS_BY_TOKEN.$spacing60).toBe('gap-15')
  })
})

describe('optionClasses', () => {
  // Legacy OptionButton size variants: minHeight / py / px (fixed height →
  // minHeight since CONS-2311 / #37109).
  const EXPECTED: Record<SegmentedControlSize, { minHeight: string; py: string; px: string }> = {
    xsmall: { minHeight: 'min-h-5', py: 'py-0.5', px: 'px-2' },
    small: { minHeight: 'min-h-5', py: 'py-0.5', px: 'px-1.5' },
    smallThumbnail: { minHeight: 'min-h-6', py: 'py-0.5', px: 'px-1' },
    default: { minHeight: 'min-h-6', py: 'py-0.5', px: 'px-2' },
    large: { minHeight: 'min-h-9', py: 'py-2', px: 'px-3' },
    largeThumbnail: { minHeight: 'min-h-8', py: 'py-2', px: 'px-2' },
  }

  it.each(SIZES)('compiles the legacy %s option preset', (size) => {
    const className = optionClasses({ size })
    const expected = EXPECTED[size]
    expect(has(className, expected.minHeight)).toBe(true)
    expect(has(className, expected.py)).toBe(true)
    expect(has(className, expected.px)).toBe(true)
    expect(has(className, 'rounded-full')).toBe(true)
    expect(has(className, 'justify-center')).toBe(true)
    expect(has(className, 'bg-transparent')).toBe(true)
    // Options grow with content since CONS-2311 — no fixed height.
    expect(className.split(' ').some((cls) => cls.startsWith('h-'))).toBe(false)
  })

  it('flexes into the row when fullWidth', () => {
    expect(has(optionClasses({ size: 'default', fullWidth: true }), 'flex-1')).toBe(true)
    expect(has(optionClasses({ size: 'default' }), 'flex-1')).toBe(false)
  })

  it('sizes options to content when variableOptionWidths (legacy flexGrow/flexShrink/flexBasis auto)', () => {
    const className = optionClasses({ size: 'default', variableOptionWidths: true })
    for (const cls of ['grow', 'shrink', 'basis-auto']) {
      expect(has(className, cls)).toBe(true)
    }
    expect(has(className, 'flex-1')).toBe(false)
    expect(has(optionClasses({ size: 'default' }), 'grow')).toBe(false)
  })
})

describe('getOptionTextColorClass (legacy getOptionTextColor)', () => {
  it('disabled: neutral2 when active, neutral3 otherwise', () => {
    expect(getOptionTextColorClass({ active: true, hovered: false, disabled: true })).toBe('text-neutral2')
    expect(getOptionTextColorClass({ active: false, hovered: true, disabled: true })).toBe('text-neutral3')
  })

  it('active or hovered: neutral1', () => {
    expect(getOptionTextColorClass({ active: true, hovered: false })).toBe('text-neutral1')
    expect(getOptionTextColorClass({ active: false, hovered: true })).toBe('text-neutral1')
  })

  it('idle: neutral2', () => {
    expect(getOptionTextColorClass({ active: false, hovered: false })).toBe('text-neutral2')
  })
})

describe('indicatorPillClasses', () => {
  it('renders surface3, surface3-hovered on hover', () => {
    expect(has(indicatorPillClasses({ hovered: false }), 'bg-surface3')).toBe(true)
    expect(has(indicatorPillClasses({ hovered: true }), 'bg-surface3-hovered')).toBe(true)
    expect(has(indicatorPillClasses({ hovered: true }), 'bg-surface3')).toBe(false)
  })

  it('pins the dark resting fill to the translucent #ffffff1e that flattens to the #2F2F30 band', () => {
    // The pill overlays the selected option's label (absolute, zIndex 10), so
    // the dark fill must stay TRANSLUCENT for the white label to show through
    // — the opaque dark:bg-[#2F2F30] pin blanked the selected label on device.
    // #ffffff1e (30/255-alpha white, the quantized legacy
    // rgba(255,255,255,0.12)) keeps the pinned byte parity where it matters:
    // over the dark surface1 backdrop as rendered (#131314) it composites to
    // exactly rgb(47,47,48) = #2F2F30 (Charlie's exit-test band), and over
    // white glyphs it stays white. Removable when the legacy control retires.
    const resting = indicatorPillClasses({ hovered: false })
    expect(has(resting, 'dark:bg-[#ffffff1e]')).toBe(true)
    // The compositing math the alpha is calibrated for (plain bg-surface3's
    // 31/255 lands a byte high at rgb(48,48,49)):
    const alpha = 0x1e
    const over = (backdrop: number): number => Math.round(alpha + (1 - alpha / 255) * backdrop)
    expect([over(0x13), over(0x13), over(0x14)]).toEqual([0x2f, 0x2f, 0x30])
    expect(over(0xff)).toBe(0xff)
    // Light mode stays on the token (already byte-identical rgb(236,236,236)).
    expect(has(resting, 'bg-surface3')).toBe(true)
    // The hover fill is not part of the pinned exit surface.
    expect(has(indicatorPillClasses({ hovered: true }), 'dark:bg-[#ffffff1e]')).toBe(false)
  })

  it('fills the animated frame as a full pill', () => {
    const className = indicatorPillClasses({ hovered: false })
    expect(has(className, 'h-full')).toBe(true)
    expect(has(className, 'w-full')).toBe(true)
    expect(has(className, 'rounded-full')).toBe(true)
  })
})

describe('getIndicatorTransform (legacy mobile optical adjustments)', () => {
  it('applies x +2.5 / y -1.5 relative to TOGGLE_PADDING for non-large sizes', () => {
    const { translateX, translateY } = getIndicatorTransform({ x: 10, y: 5, large: false })
    expect(translateX).toBeCloseTo(10 - TOGGLE_PADDING + 2.5)
    expect(translateY).toBeCloseTo(5 - TOGGLE_PADDING - 1.5)
  })

  it('applies the measured x +3.17 and no y lift for large', () => {
    const { translateX, translateY } = getIndicatorTransform({ x: 10, y: 5, large: true })
    expect(translateX).toBeCloseTo(10 - TOGGLE_PADDING + 3.17)
    expect(translateY).toBeCloseTo(5 - TOGGLE_PADDING)
  })
})

describe('optionFontMetrics (legacy buttonLabel3/4 native ramp)', () => {
  it('uses 15px/17.25 for large (buttonLabel3) and 13px/14.95 otherwise (buttonLabel4)', () => {
    expect(optionFontMetrics({ large: true, smallFont: false })).toEqual({
      fontSize: 15,
      lineHeight: 15 * NATIVE_LINE_HEIGHT_SCALE,
    })
    expect(optionFontMetrics({ large: false, smallFont: false })).toEqual({
      fontSize: 13,
      lineHeight: 13 * NATIVE_LINE_HEIGHT_SCALE,
    })
  })

  it('skips the +1px adjustment on CJK (small-font) locales', () => {
    expect(optionFontMetrics({ large: true, smallFont: true }).fontSize).toBe(14)
    expect(optionFontMetrics({ large: false, smallFont: true }).fontSize).toBe(12)
  })

  it('caps dynamic type at the legacy 1.2 multiplier', () => {
    expect(MAX_FONT_SIZE_MULTIPLIER).toBe(1.2)
  })
})
