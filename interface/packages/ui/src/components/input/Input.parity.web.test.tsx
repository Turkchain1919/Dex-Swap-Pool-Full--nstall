import { fireEvent, render } from '@testing-library/react'
import { Input } from 'ui/src/components/input/Input'
import { colorsDark, colorsLight, fonts } from 'ui/src/theme'
import { afterEach, describe, expect, it } from 'vitest'

/**
 * Resolved-style parity for the rebuilt Input against the legacy Tamagui Input cascade.
 *
 * Every fixture value below was captured from the legacy `styled(TextInput)` Input
 * (tamagui's Input under ui/src/tamagui.config) rendered live under jsdom in this rebuild
 * session: atomic classes `_fontFamily-f-family _fontWeight-f-weight-me… _fontSize-f-size-medi…
 * _lineHeight-f-lineHeigh… _pr-t-space-pad… _pl-t-space-pad… _height-t-size-true
 * _border*Width-1px _outlineWidth-0px _color-color _border*Color-borderColor
 * _backgroundColor-background _minWidth-0px _border*Style-solid` resolved against the
 * config's CSS variables (`--t-size-true: 8px`, `--t-space-padding8: 8px`,
 * `--t-radius-true: 0px`, body font `--f-size-medium: 16px`, `--f-weight-medium: 535`,
 * `--f-lineHeight-medium: 22px`) and themes (background == surface1, color == neutral1,
 * borderColor/borderColorFocus/borderColorHover/outlineColor all transparent — the legacy
 * :focus/:hover/:focus-visible rules were invisible no-ops).
 *
 * One-shot migration gate, not a permanent invariant: delete this suite once the
 * INFRA-3285 rebuild lane retires the Tamagui baseline.
 */

type ThemeName = 'light' | 'dark'
const THEMES: ThemeName[] = ['light', 'dark']
const PALETTE: Record<ThemeName, typeof colorsLight> = { light: colorsLight, dark: colorsDark }

function setTheme(theme: ThemeName): void {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

afterEach(() => {
  document.documentElement.classList.remove('dark')
})

/** Color strings normalized to comparable channels (hex, rgb(), rgba(), transparent, unset). */
function normalizedColor(value: string): string {
  const trimmed = value.trim()
  if (trimmed === '' || trimmed === 'transparent') {
    return '0,0,0,0'
  }
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed) || /^#[0-9a-fA-F]{8}$/.test(trimmed)) {
    const n = Number.parseInt(trimmed.slice(1, 7), 16)
    const alpha = trimmed.length === 9 ? Number.parseInt(trimmed.slice(7), 16) / 255 : 1
    // oxlint-disable-next-line no-bitwise -- hex channel unpacking
    return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.round(alpha * 100) / 100}`
  }
  const match = /^rgba?\(([^)]+)\)$/.exec(trimmed)
  if (!match || !match[1]) {
    return trimmed
  }
  const parts = match[1].split(',').map((part) => Number.parseFloat(part.trim()))
  const [r, g, b, a = 1] = parts
  return `${r},${g},${b},${Math.round(a * 100) / 100}`
}

/** CSS initial values for the compared props, applied when the element declares nothing. */
const INITIAL_VALUES: Record<string, string> = {
  'padding-top': '0px',
  'padding-bottom': '0px',
  'padding-left': '0px',
  'padding-right': '0px',
  'margin-top': '0px',
  'margin-right': '0px',
  'margin-bottom': '0px',
  'margin-left': '0px',
  height: 'auto',
  width: 'auto',
  'min-width': 'auto',
  'border-radius': '0px',
}

function readProp(el: Element, prop: string): string {
  const raw = (el as HTMLElement).style.getPropertyValue(prop)
  if (raw === '') {
    return INITIAL_VALUES[prop] ?? ''
  }
  if (raw === '0') {
    return '0px'
  }
  return raw
}

/**
 * The legacy default frame (size '$true', unstyled=false), resolved. The legacy engine
 * declared invisible pseudo rules on top of this (border-color var(--borderColorFocus) at
 * :focus, var(--borderColorHover) at :hover, a 2px var(--outlineColor) outline at
 * :focus-visible) — all of those theme keys resolve to transparent in both themes, so the
 * base frame below is also the focus/hover/focus-visible rendering.
 */
function legacyDefaultFrame(theme: ThemeName): Record<string, string> {
  return {
    'font-family':
      'Basel, -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    'font-weight': '535', // --f-weight-medium (web app)
    'font-size': '16px', // --f-size-medium
    'line-height': '22px', // --f-lineHeight-medium
    'padding-top': '0px',
    'padding-bottom': '0px',
    'padding-left': '8px', // --t-space-padding8
    'padding-right': '8px',
    height: '8px', // --t-size-true — the legacy frame height really was 8px
    'border-radius': '0px', // --t-radius-true
    'border-top-width': '1px',
    'border-right-width': '1px',
    'border-bottom-width': '1px',
    'border-left-width': '1px',
    'border-top-style': 'solid',
    'min-width': '0px',
    'outline-width': '0px',
    'box-sizing': 'border-box',
    'margin-top': '0px',
    resize: 'none',
    'background-color': PALETTE[theme].surface1, // --background == surface1 in both themes
    color: PALETTE[theme].neutral1, // --color == neutral1
    'border-top-color': 'transparent', // --borderColor
    'outline-color': 'transparent', // --outlineColor
  }
}

const COLOR_PROPS = new Set(['background-color', 'color', 'border-top-color', 'outline-color'])

function expectFrame(el: Element, expected: Record<string, string>): void {
  for (const [prop, value] of Object.entries(expected)) {
    if (COLOR_PROPS.has(prop)) {
      expect(normalizedColor(readProp(el, prop)), prop).toBe(normalizedColor(value))
    } else {
      expect(readProp(el, prop), prop).toBe(value)
    }
  }
}

describe('Input (rebuilt) resolves the same styles as the legacy Tamagui Input emitted', () => {
  for (const theme of THEMES) {
    describe(`${theme} theme`, () => {
      it('default frame parity (size $true cascade)', () => {
        setTheme(theme)
        const { getByTestId } = render(<Input testID="rebuilt" />)
        const el = getByTestId('rebuilt')
        expect(el.tagName).toBe('INPUT')
        expectFrame(el, legacyDefaultFrame(theme))
      })

      it('token style props resolve to the legacy values', () => {
        setTheme(theme)
        const { getByTestId } = render(
          <Input
            backgroundColor="$surface2"
            borderColor="$surface3"
            borderRadius="$rounded12"
            borderWidth="$spacing1"
            color="$neutral2"
            height="$spacing40"
            px="$spacing12"
            testID="tokens"
            width={120}
          />,
        )
        const el = getByTestId('tokens')
        expect(normalizedColor(readProp(el, 'background-color'))).toBe(normalizedColor(PALETTE[theme].surface2))
        expect(normalizedColor(readProp(el, 'border-top-color'))).toBe(normalizedColor(PALETTE[theme].surface3))
        expect(normalizedColor(readProp(el, 'color'))).toBe(normalizedColor(PALETTE[theme].neutral2))
        expect(readProp(el, 'border-radius')).toBe('12px')
        expect(readProp(el, 'border-top-width')).toBe('1px')
        expect(readProp(el, 'height')).toBe('40px')
        expect(readProp(el, 'padding-left')).toBe('12px')
        expect(readProp(el, 'padding-right')).toBe('12px')
        expect(readProp(el, 'width')).toBe('120px')
      })

      it('focusStyle applies on focus and reverts on blur, with token resolution', () => {
        setTheme(theme)
        const { getByTestId } = render(
          <Input focusStyle={{ backgroundColor: '$surface3', borderColor: '$accent1' }} testID="focusable" />,
        )
        const el = getByTestId('focusable')
        expect(normalizedColor(readProp(el, 'background-color')), 'base bg').toBe(
          normalizedColor(PALETTE[theme].surface1),
        )
        fireEvent.focus(el)
        expect(normalizedColor(readProp(el, 'background-color')), 'focused bg').toBe(
          normalizedColor(PALETTE[theme].surface3),
        )
        expect(normalizedColor(readProp(el, 'border-top-color')), 'focused border').toBe(
          normalizedColor(PALETTE[theme].accent1),
        )
        fireEvent.blur(el)
        expect(normalizedColor(readProp(el, 'background-color')), 'blurred bg').toBe(
          normalizedColor(PALETTE[theme].surface1),
        )
        expect(normalizedColor(readProp(el, 'border-top-color')), 'blurred border').toBe(normalizedColor('transparent'))
      })

      it('hoverStyle applies on hover and reverts on leave', () => {
        setTheme(theme)
        const { getByTestId } = render(
          <Input hoverStyle={{ backgroundColor: '$surface1Hovered' }} testID="hoverable" />,
        )
        const el = getByTestId('hoverable')
        fireEvent.mouseEnter(el)
        expect(normalizedColor(readProp(el, 'background-color')), 'hovered bg').toBe(
          normalizedColor(PALETTE[theme].surface1Hovered),
        )
        fireEvent.mouseLeave(el)
        expect(normalizedColor(readProp(el, 'background-color')), 'unhovered bg').toBe(
          normalizedColor(PALETTE[theme].surface1),
        )
      })
    })
  }

  it('focusStyle wins over hoverStyle while both are active (legacy pseudo precedence)', () => {
    setTheme('light')
    const { getByTestId } = render(
      <Input
        focusStyle={{ backgroundColor: '$surface3' }}
        hoverStyle={{ backgroundColor: '$surface1Hovered' }}
        testID="both"
      />,
    )
    const el = getByTestId('both')
    fireEvent.mouseEnter(el)
    fireEvent.focus(el)
    expect(normalizedColor(readProp(el, 'background-color'))).toBe(normalizedColor(colorsLight.surface3))
    fireEvent.blur(el)
    expect(normalizedColor(readProp(el, 'background-color'))).toBe(normalizedColor(colorsLight.surface1Hovered))
  })

  it('font tokens resolve against the family in effect (SlippageControl surface)', () => {
    setTheme('light')
    const { getByTestId } = render(
      <Input
        fontFamily="$subHeading"
        fontSize="$small"
        fontWeight="normal"
        height="100%"
        outlineColor="$transparent"
        p="$none"
        paddingEnd="$spacing4"
        testID="slippage"
        textAlign="right"
      />,
    )
    const el = getByTestId('slippage')
    // --f-size-small of the subHeading font (legacy: var(--f-size-small) under font_subHeading)
    expect(readProp(el, 'font-size')).toBe(`${fonts.subheading2.fontSize}px`)
    expect(readProp(el, 'font-weight')).toBe('normal')
    expect(readProp(el, 'height')).toBe('100%')
    expect(readProp(el, 'padding-top')).toBe('0px')
    expect(readProp(el, 'padding-left')).toBe('0px')
    expect(readProp(el, 'padding-right')).toBe('4px')
    expect(readProp(el, 'text-align')).toBe('right')
    expect(normalizedColor(readProp(el, 'outline-color'))).toBe(normalizedColor('transparent'))
  })

  it('fontWeight $book resolves to the platform weight (485 on web app)', () => {
    setTheme('light')
    const { getByTestId } = render(<Input fontWeight="$book" testID="book" />)
    expect(readProp(getByTestId('book'), 'font-weight')).toBe('485')
  })

  it('percent lineHeight passes through and numeric lineHeight gets px (legacy emitted px)', () => {
    setTheme('light')
    const { getByTestId } = render(
      <>
        <Input lineHeight="130%" testID="percent" />
        <Input lineHeight={24} testID="numeric" />
      </>,
    )
    expect(readProp(getByTestId('percent'), 'line-height')).toBe('130%')
    expect(readProp(getByTestId('numeric'), 'line-height')).toBe('24px')
  })

  it('unstyled skips the legacy default frame (styled() wrapper base)', () => {
    setTheme('light')
    const { getByTestId } = render(<Input unstyled testID="unstyled" />)
    const el = getByTestId('unstyled')
    expect(readProp(el, 'height'), 'height').toBe('auto')
    expect(readProp(el, 'padding-left'), 'padding-left').toBe('0px')
    expect((el as HTMLElement).style.getPropertyValue('background-color'), 'background-color').toBe('')
    expect((el as HTMLElement).style.getPropertyValue('font-size'), 'font-size').toBe('')
    // The UA reset must still hold
    expect(readProp(el, 'box-sizing')).toBe('border-box')
    expect(readProp(el, 'border-top-width'), 'border width reset').toBe('0px')
  })

  it('supported prop surface pinning (resolves every style prop against known tokens)', () => {
    setTheme('dark')
    const { getByTestId } = render(
      <Input
        backgroundColor="$surface2"
        borderColor="$surface3"
        borderRadius="$rounded16"
        borderWidth={2}
        color="$neutral1"
        flex={1}
        flexShrink={1}
        fontFamily="$body"
        fontSize={28}
        fontWeight="500"
        letterSpacing={-1}
        maxHeight={44}
        maxWidth="100%"
        minHeight={20}
        minWidth={0}
        opacity={0.8}
        overflow="hidden"
        p="$spacing8"
        paddingLeft="$spacing40"
        position="relative"
        testID="pinned"
        textAlign="left"
        textOverflow="ellipsis"
        top={2}
        whiteSpace="nowrap"
        width="100%"
        zIndex={3}
      />,
    )
    const el = getByTestId('pinned')
    expect(normalizedColor(readProp(el, 'background-color'))).toBe(normalizedColor(colorsDark.surface2))
    expect(normalizedColor(readProp(el, 'border-top-color'))).toBe(normalizedColor(colorsDark.surface3))
    expect(readProp(el, 'border-radius')).toBe('16px')
    expect(readProp(el, 'border-top-width')).toBe('2px')
    expect(readProp(el, 'flex-grow')).toBe('1')
    expect(readProp(el, 'flex-shrink')).toBe('1')
    expect(readProp(el, 'font-size')).toBe('28px')
    expect(readProp(el, 'font-weight')).toBe('500')
    expect(readProp(el, 'letter-spacing')).toBe('-1px')
    expect(readProp(el, 'max-height')).toBe('44px')
    expect(readProp(el, 'max-width')).toBe('100%')
    expect(readProp(el, 'min-height')).toBe('20px')
    expect(readProp(el, 'min-width')).toBe('0px')
    expect(readProp(el, 'opacity')).toBe('0.8')
    expect(readProp(el, 'overflow')).toBe('hidden')
    expect(readProp(el, 'padding-top')).toBe('8px')
    expect(readProp(el, 'padding-left'), 'longhand wins over p').toBe('40px')
    expect(readProp(el, 'padding-right')).toBe('8px')
    expect(readProp(el, 'position')).toBe('relative')
    expect(readProp(el, 'text-align')).toBe('left')
    expect(readProp(el, 'text-overflow')).toBe('ellipsis')
    expect(readProp(el, 'top')).toBe('2px')
    expect(readProp(el, 'white-space')).toBe('nowrap')
    expect(readProp(el, 'width')).toBe('100%')
    expect(readProp(el, 'z-index')).toBe('3')
  })
})
