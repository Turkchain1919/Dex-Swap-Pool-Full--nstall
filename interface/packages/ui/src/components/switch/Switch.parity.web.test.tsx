/**
 * Resolved-style parity and behavior pins for the Tamagui-free Switch web leg (INFRA-3318).
 *
 * The fixtures below are the legacy Tamagui-wrapping web leg's resolved output (main @
 * 26f9dd52 `Switch.web.tsx`): its explicit state→token tables (frameBackgroundColor /
 * thumbBackgroundColor / iconColor closures, hoverStyle, disabledStyle, focus-ring
 * `$group-item-focusVisible` borders) and geometry constants, written out per state and
 * resolved through the same ui/src/theme maps Tamagui was configured with. Layout values
 * are hard-pinned literals.
 *
 * One-shot migration gate, not a permanent invariant: delete this suite once the
 * INFRA-3285 rebuild lane retires the Tamagui baseline.
 */
import { act, fireEvent, render, type RenderResult } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type ReactNode, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

// expo-blur is a transitive dep reached through the icons barrel and ships JSX in a `.js`
// file that Vite refuses to parse (same workaround as SpinningLoader.parity.web.test.tsx).
vi.mock('expo-blur', () => ({
  BlurView: () => null,
}))

import { Switch } from 'ui/src/components/switch/Switch'
import type { SwitchProps } from 'ui/src/components/switch/types'
import { colorsDark, colorsLight } from 'ui/src/theme'

type ThemeName = 'light' | 'dark'
const THEMES: ThemeName[] = ['light', 'dark']
const PALETTE: Record<ThemeName, typeof colorsLight> = { light: colorsLight, dark: colorsDark }

/**
 * The rebuilt Switch reads the root `light`/`dark` class via useSporeColors — the same
 * root-class store the app theme providers drive (INFRA-3317). No Tamagui component
 * composition remains in the rebuilt tree (useSporeColors still resolves colors through
 * @tamagui/core's useTheme, so the app-level provider participates in color resolution).
 * The class is set per render and cleared after every test so no theme state leaks into
 * or out of this suite.
 */
function renderThemed(theme: ThemeName, children: ReactNode): RenderResult {
  document.documentElement.classList.remove('light', 'dark')
  document.documentElement.classList.add(theme)
  return render(children)
}

afterEach(() => {
  document.documentElement.classList.remove('light', 'dark')
})

/** jsdom normalizes inline-style colors (hex → rgb) — round-trip expected values through the same CSSOM. */
function cssColor(value: string): string {
  const probe = document.createElement('div')
  probe.style.color = value
  return probe.style.color
}

/** jsdom stores `borderColor` verbatim (no hex → rgb normalization) — round-trip through the same property. */
function cssBorderColor(value: string): string {
  const probe = document.createElement('div')
  probe.style.borderColor = value
  return probe.style.borderColor
}

function getParts(container: HTMLElement): {
  track: HTMLElement
  thumb: HTMLElement
  iconBox: HTMLElement
  icon: HTMLElement
  fakeThumb: HTMLElement
  outerRing: HTMLElement
  innerRing: HTMLElement
} {
  const track = container.querySelector('button[role="switch"]') as HTMLElement
  const thumb = track.children[0] as HTMLElement
  const iconBox = thumb.children[0] as HTMLElement
  // An <svg> in the browser; this suite's shared react-native-svg mock renders a div with the
  // same resolved inline style, so select positionally instead of by tag.
  const icon = iconBox.children[0] as HTMLElement
  const fakeThumb = thumb.children[1] as HTMLElement
  const outerRing = track.children[1] as HTMLElement
  const innerRing = track.children[2] as HTMLElement
  return { track, thumb, iconBox, icon, fakeThumb, outerRing, innerRing }
}

/**
 * The legacy state→token grid, one row per (variant × checked × disabled) combination,
 * transcribed from the legacy leg's color closures rather than shared with the rebuilt
 * implementation — an implementation bug cannot silently rewrite its own expectation.
 * `trackOpacity` is the legacy `disabledStyle: { ...(checked && { opacity: 0.6 }) }`;
 * disabled+unchecked drew the muted surface3/neutral3 pair instead of fading.
 */
const STATE_GRID: {
  name: string
  variant: SwitchProps['variant']
  checked: boolean
  disabled: boolean
  track: keyof typeof colorsLight
  thumb: keyof typeof colorsLight
  icon: keyof typeof colorsLight
  trackOpacity: string
}[] = [
  // default variant
  {
    name: 'default unchecked',
    variant: 'default',
    checked: false,
    disabled: false,
    track: 'neutral3',
    thumb: 'white',
    icon: 'neutral1',
    trackOpacity: '',
  },
  {
    name: 'default checked',
    variant: 'default',
    checked: true,
    disabled: false,
    track: 'accent3',
    thumb: 'surface1',
    icon: 'neutral1',
    trackOpacity: '',
  },
  {
    name: 'default unchecked disabled',
    variant: 'default',
    checked: false,
    disabled: true,
    track: 'surface3',
    thumb: 'neutral3',
    icon: 'white',
    trackOpacity: '',
  },
  {
    name: 'default checked disabled',
    variant: 'default',
    checked: true,
    disabled: true,
    track: 'accent3',
    thumb: 'surface1',
    icon: 'neutral1',
    trackOpacity: '0.6',
  },
  // branded variant
  {
    name: 'branded unchecked',
    variant: 'branded',
    checked: false,
    disabled: false,
    track: 'neutral3',
    thumb: 'white',
    icon: 'accent1',
    trackOpacity: '',
  },
  {
    name: 'branded checked',
    variant: 'branded',
    checked: true,
    disabled: false,
    track: 'accent1',
    thumb: 'white',
    icon: 'accent1',
    trackOpacity: '',
  },
  {
    name: 'branded unchecked disabled',
    variant: 'branded',
    checked: false,
    disabled: true,
    track: 'surface3',
    thumb: 'neutral3',
    icon: 'white',
    trackOpacity: '',
  },
  {
    name: 'branded checked disabled',
    variant: 'branded',
    checked: true,
    disabled: true,
    track: 'accent1',
    thumb: 'white',
    icon: 'accent1',
    trackOpacity: '0.6',
  },
]

// Legacy geometry: SWITCH_TRACK_HEIGHT/WIDTH 32/60, $spacing4 padding, $spacing24 thumb,
// 14px Check icon, thumb travel = 60 - 24 - 2*4 = 28px.
const TRACK_MIN_HEIGHT = '32px'
const TRACK_MIN_WIDTH = '60px'
const TRACK_HEIGHT = '32px'
const TRACK_WIDTH = '60px'
const TRACK_PADDING = '4px'
const THUMB_SIZE = '24px'
const THUMB_TRAVEL_TRANSFORM = 'translateX(28px)'
const THUMB_REST_TRANSFORM = 'translateX(0px)'

describe('Switch (rebuilt web leg) resolves the same styles as the legacy Tamagui leg', () => {
  for (const theme of THEMES) {
    describe(`${theme} theme`, () => {
      for (const state of STATE_GRID) {
        it(`parity: ${state.name}`, () => {
          const { container } = renderThemed(
            theme,
            <Switch checked={state.checked} disabled={state.disabled} variant={state.variant} testID="subject" />,
          )
          const { track, thumb, iconBox, icon, fakeThumb } = getParts(container)
          const palette = PALETTE[theme]

          // track
          expect(track.style.backgroundColor, 'track background').toBe(cssColor(palette[state.track]))
          expect(track.style.minHeight, 'track min-height').toBe(TRACK_MIN_HEIGHT)
          expect(track.style.minWidth, 'track min-width').toBe(TRACK_MIN_WIDTH)
          // Definite cross-size, not only a floor: min-* alone lets a flex parent stretch the track.
          expect(track.style.height, 'track height').toBe(TRACK_HEIGHT)
          expect(track.style.width, 'track width').toBe(TRACK_WIDTH)
          expect(track.style.flexShrink, 'track flex-shrink').toBe('0')
          expect(track.style.padding, 'track padding').toBe(TRACK_PADDING)
          expect(track.style.opacity, 'track opacity').toBe(state.trackOpacity)
          expect(track.style.pointerEvents, 'track pointer-events').toBe(state.disabled ? 'none' : 'auto')
          expect(track.style.cursor, 'track cursor').toBe(state.disabled ? '' : 'pointer')
          expect(track.getAttribute('aria-checked'), 'aria-checked').toBe(String(state.checked))

          // thumb: geometry, color, travel endpoints (the same 0→28px the native leg interpolates)
          expect(thumb.style.backgroundColor, 'thumb background').toBe(cssColor(palette[state.thumb]))
          expect(thumb.style.minHeight, 'thumb min-height').toBe(THUMB_SIZE)
          expect(thumb.style.width, 'thumb width').toBe(THUMB_SIZE)
          expect(thumb.style.transform, 'thumb transform').toBe(
            state.checked ? THUMB_TRAVEL_TRANSFORM : THUMB_REST_TRANSFORM,
          )
          expect(fakeThumb.style.backgroundColor, 'fake thumb background').toBe(cssColor(palette[state.thumb]))

          // check icon: revealed only when checked, colored per legacy iconColor closure
          expect(iconBox.style.opacity, 'icon reveal opacity').toBe(state.checked ? '1' : '0')
          expect(icon.style.color, 'icon color').toBe(cssColor(palette[state.icon]))
          expect(icon.style.width, 'icon width').toBe('14px')
          expect(icon.style.height, 'icon height').toBe('14px')
        })
      }

      it('parity: hover recolors the track per the legacy hoverStyle cascade', () => {
        const palette = PALETTE[theme]
        const hoverCases: { props: SwitchProps; hovered: keyof typeof colorsLight }[] = [
          { props: { checked: false, variant: 'default' }, hovered: 'neutral3Hovered' },
          { props: { checked: true, variant: 'default' }, hovered: 'accent3Hovered' },
          { props: { checked: false, variant: 'branded' }, hovered: 'neutral3Hovered' },
          { props: { checked: true, variant: 'branded' }, hovered: 'accent1Hovered' },
        ]
        for (const { props, hovered } of hoverCases) {
          const { container, unmount } = renderThemed(theme, <Switch {...props} testID="subject" />)
          const { track } = getParts(container)
          fireEvent.mouseEnter(track)
          expect(track.style.backgroundColor, JSON.stringify(props)).toBe(cssColor(palette[hovered]))
          fireEvent.mouseLeave(track)
          unmount()
        }
      })
    })
  }
})

describe('Switch (rebuilt web leg) keeps its own size inside a stretching flex row', () => {
  /**
   * The settings-row shape that regressed: `align-items: stretch` (the flex default) on a row
   * whose text wraps to several lines. jsdom does not lay out, so the pin is on the resolved
   * cross-size the track declares — a floor alone (`min-height` with no `height`) is exactly
   * what let the row stretch the toggle to the label's height.
   *
   * Durable coverage, unlike the parity fixtures above: this case and the resolved
   * height/width/flex-shrink pins in the matrix guard the stretch regression itself, not the
   * Tamagui baseline, so move them into a permanent web Switch suite in packages/ui when the
   * INFRA-3285 retirement deletes this file instead of dropping them with it.
   */
  it('a multi-line label row cannot stretch the track past 32x60', () => {
    const { container } = renderThemed(
      'dark',
      <div style={{ display: 'flex', flexDirection: 'row', width: 320 }}>
        <span>
          Allow this site to see your wallet address and suggest transactions, and to keep doing so on every subsequent
          visit until you revoke it here.
        </span>
        <Switch checked variant="branded" testID="subject" />
      </div>,
    )
    const { track } = getParts(container)
    const resolved = window.getComputedStyle(track)
    expect(resolved.height, 'resolved track height').toBe(TRACK_HEIGHT)
    expect(resolved.width, 'resolved track width').toBe(TRACK_WIDTH)
    expect(resolved.flexShrink, 'resolved track flex-shrink').toBe('0')
  })
})

describe('Switch (rebuilt web leg) behavior', () => {
  it('uncontrolled: click toggles state and reports through onCheckedChange', () => {
    const onCheckedChange = vi.fn()
    const { container } = renderThemed(
      'light',
      <Switch variant="default" onCheckedChange={onCheckedChange} testID="subject" />,
    )
    const { track } = getParts(container)

    expect(track.getAttribute('aria-checked')).toBe('false')
    fireEvent.click(track)
    expect(track.getAttribute('aria-checked')).toBe('true')
    expect(onCheckedChange).toHaveBeenLastCalledWith(true)
    fireEvent.click(track)
    expect(track.getAttribute('aria-checked')).toBe('false')
    expect(onCheckedChange).toHaveBeenLastCalledWith(false)
  })

  it('uncontrolled: defaultChecked seeds the initial state', () => {
    const { container } = renderThemed('light', <Switch defaultChecked variant="default" testID="subject" />)
    expect(getParts(container).track.getAttribute('aria-checked')).toBe('true')
  })

  it('controlled: click reports the next value but only the checked prop moves the state', () => {
    const onCheckedChange = vi.fn()
    const { container, rerender } = renderThemed(
      'light',
      <Switch checked={false} variant="default" onCheckedChange={onCheckedChange} testID="subject" />,
    )
    const { track } = getParts(container)

    fireEvent.click(track)
    expect(onCheckedChange).toHaveBeenLastCalledWith(true)
    // no state change until the owner echoes the prop back
    expect(track.getAttribute('aria-checked')).toBe('false')

    rerender(<Switch checked={true} variant="default" onCheckedChange={onCheckedChange} testID="subject" />)
    expect(track.getAttribute('aria-checked')).toBe('true')
  })

  it('controlled: works end-to-end with a stateful owner', () => {
    function Owner(): JSX.Element {
      const [checked, setChecked] = useState(false)
      return <Switch checked={checked} variant="default" testID="subject" onCheckedChange={setChecked} />
    }
    const { container } = renderThemed('light', <Owner />)
    const { track } = getParts(container)
    fireEvent.click(track)
    expect(track.getAttribute('aria-checked')).toBe('true')
    fireEvent.click(track)
    expect(track.getAttribute('aria-checked')).toBe('false')
  })

  it('keyboard: space and enter toggle the focused switch', async () => {
    const user = userEvent.setup()
    const onCheckedChange = vi.fn()
    const { container } = renderThemed(
      'light',
      <Switch variant="default" onCheckedChange={onCheckedChange} testID="subject" />,
    )
    const { track } = getParts(container)

    await user.tab()
    expect(document.activeElement, 'native button is keyboard-focusable').toBe(track)

    await user.keyboard(' ')
    expect(track.getAttribute('aria-checked'), 'space toggles on').toBe('true')
    expect(onCheckedChange).toHaveBeenLastCalledWith(true)

    await user.keyboard('{Enter}')
    expect(track.getAttribute('aria-checked'), 'enter toggles off').toBe('false')
    expect(onCheckedChange).toHaveBeenLastCalledWith(false)
  })

  it('disabled: no toggle from click or keyboard, and the tree is inert to pointers', async () => {
    const user = userEvent.setup()
    const onCheckedChange = vi.fn()
    const { container } = renderThemed(
      'light',
      <Switch disabled checked={false} variant="default" onCheckedChange={onCheckedChange} testID="subject" />,
    )
    const { track } = getParts(container)

    fireEvent.click(track)
    await user.keyboard(' ')
    expect(onCheckedChange).not.toHaveBeenCalled()
    expect(track.getAttribute('aria-checked')).toBe('false')
    expect(track.getAttribute('aria-disabled')).toBe('true')
    expect(track.style.pointerEvents).toBe('none')
  })

  it('focus ring: both legacy ring layers appear on focus-visible and clear on blur', () => {
    const palette = PALETTE.light
    const ringCases: { props: SwitchProps; outer: keyof typeof colorsLight }[] = [
      // legacy $group-item-focusVisible borders: accent1Hovered only for checked+branded
      { props: { checked: true, variant: 'branded' }, outer: 'accent1Hovered' },
      { props: { checked: false, variant: 'branded' }, outer: 'neutral3Hovered' },
      { props: { checked: true, variant: 'default' }, outer: 'neutral3Hovered' },
      { props: { checked: false, variant: 'default' }, outer: 'neutral3Hovered' },
    ]
    for (const { props, outer } of ringCases) {
      const { container, unmount } = renderThemed('light', <Switch {...props} testID="subject" />)
      const { track, outerRing, innerRing } = getParts(container)

      expect(outerRing.style.borderColor, 'outer ring at rest').toBe('transparent')
      expect(innerRing.style.borderColor, 'inner ring at rest').toBe('transparent')

      act(() => track.focus())
      expect(outerRing.style.borderColor, `outer ring ${JSON.stringify(props)}`).toBe(cssBorderColor(palette[outer]))
      expect(innerRing.style.borderColor, 'inner ring is surface1').toBe(cssBorderColor(palette.surface1))
      expect(outerRing.style.borderWidth, 'outer ring width').toBe('1px')
      expect(innerRing.style.borderWidth, 'inner ring width').toBe('2px')
      expect(outerRing.style.pointerEvents, 'rings never intercept').toBe('none')

      act(() => track.blur())
      expect(outerRing.style.borderColor, 'outer ring after blur').toBe('transparent')
      expect(innerRing.style.borderColor, 'inner ring after blur').toBe('transparent')
      unmount()
    }
  })

  it('press without hover stretches the thumb but never recolors the track (legacy scoped recolor to :hover)', () => {
    const palette = PALETTE.light
    const pressCases: { props: SwitchProps; track: keyof typeof colorsLight; shift: string }[] = [
      // a hoverless touch tap: legacy stretched the thumb on press but recolored only on CSS :hover
      { props: { checked: false, variant: 'default' }, track: 'neutral3', shift: 'translateX(0px)' },
      { props: { checked: true, variant: 'branded' }, track: 'accent1', shift: 'translateX(-4px)' },
    ]
    for (const { props, track: trackToken, shift } of pressCases) {
      const { container, unmount } = renderThemed('light', <Switch {...props} testID="subject" />)
      const { track, fakeThumb } = getParts(container)

      fireEvent.pointerDown(track)
      expect(track.style.backgroundColor, `track keeps rest color ${JSON.stringify(props)}`).toBe(
        cssColor(palette[trackToken]),
      )
      expect(fakeThumb.style.width, 'thumb stretches on press').toBe('28px')
      expect(fakeThumb.style.transform, 'stretched pill pins its right edge when checked').toBe(shift)

      fireEvent.pointerUp(track)
      expect(fakeThumb.style.width, 'thumb rests after release').toBe('24px')
      expect(track.style.backgroundColor, 'track color untouched across the tap').toBe(cssColor(palette[trackToken]))
      unmount()
    }
  })

  it('backgroundColor override wins at rest; hover still recolors (legacy hoverStyle precedence)', () => {
    const { container } = renderThemed(
      'light',
      <Switch backgroundColor="$statusCritical" checked={false} variant="default" testID="subject" />,
    )
    const { track } = getParts(container)
    expect(track.style.backgroundColor).toBe(cssColor(colorsLight.statusCritical))
    fireEvent.mouseEnter(track)
    expect(track.style.backgroundColor).toBe(cssColor(colorsLight.neutral3Hovered))
  })

  it('pointerEvents="none" makes an enabled switch inert (SettingsBiometricModal contract)', () => {
    const { container } = renderThemed('light', <Switch pointerEvents="none" variant="default" testID="subject" />)
    expect(getParts(container).track.style.pointerEvents).toBe('none')
  })

  it('forwards id and testID to the switch element', () => {
    const { getByTestId } = renderThemed('light', <Switch id="switch-id" variant="default" testID="switch-test-id" />)
    const track = getByTestId('switch-test-id')
    expect(track.getAttribute('id')).toBe('switch-id')
    expect(track.getAttribute('role')).toBe('switch')
    expect((track as HTMLButtonElement).type, 'type=button so it never submits forms').toBe('button')
  })

  it('disabledStyle applies only while disabled (legacy escape hatch)', () => {
    const { container, rerender } = renderThemed(
      'light',
      <Switch disabled checked={true} variant="default" disabledStyle={{ opacity: 0.3 }} testID="subject" />,
    )
    const { track } = getParts(container)
    // legacy merged disabledStyle after the checked opacity, so the consumer value wins
    expect(track.style.opacity).toBe('0.3')
    rerender(<Switch checked={true} variant="default" disabledStyle={{ opacity: 0.3 }} testID="subject" />)
    expect(track.style.opacity).toBe('')
  })
})
