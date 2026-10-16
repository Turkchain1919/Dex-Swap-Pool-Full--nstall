/**
 * Resolved-style parity and behavior pins for the Tamagui-free Tooltip web leg
 * (INFRA-3318), plus the native leg's pass-through/null contract.
 *
 * The style fixtures below are the legacy Tamagui web leg's resolved output (main @
 * 92de6e3e `Tooltip.web.tsx`): the `TooltipRoot` styled defaults (offset/delay/restMs),
 * the `ContentInner` frame literals, the light-only shadow (the legacy `$theme-dark`
 * block only zeroed offset/radius, which Tamagui-web emitted as NO box-shadow), and
 * the z-index stacking bridge — written out per state and resolved through the same
 * ui/src/theme maps Tamagui was configured with. Layout values are hard-pinned
 * literals. Behavior pins mirror the tooltip-compat behavior contract
 * (packages/tailwind/src/parity/tooltip/tooltip-behavior.test.tsx).
 *
 * One-shot migration gate, not a permanent invariant: delete this suite once the
 * INFRA-3285 rebuild lane retires the Tamagui baseline.
 */
import { act, cleanup, fireEvent, render, type RenderResult, screen } from '@testing-library/react'
import { type ReactNode, useContext } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

// expo-blur is a transitive dep reached through the AdaptiveWebModal import chain and ships
// JSX in a `.js` file that Vite refuses to parse (same workaround as Switch.parity.web.test.tsx).
vi.mock('expo-blur', () => ({
  BlurView: () => null,
}))

// Real env behavior by default; the vi.fn wrapper lets the prod pass-through pin flip
// isProdEnv to true for one test (mockReset restores the wrapped original).
vi.mock('@universe/environment', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@universe/environment')>()
  return { ...actual, isProdEnv: vi.fn(actual.isProdEnv) }
})

import { isProdEnv } from '@universe/environment'
import { EffectiveModalOrSheetZIndexContext } from 'ui/src/components/modal/AdaptiveWebModal'
import {
  mapOffsetToAnchorPosition,
  mapPlacementToAnchorPosition,
  mapTooltipDelay,
  TOOLTIP_DEFAULT_DELAY,
  TOOLTIP_DEFAULT_REST_MS,
} from 'ui/src/components/tooltip/shared'
import { Tooltip } from 'ui/src/components/tooltip/Tooltip'
import { Tooltip as TooltipNative } from 'ui/src/components/tooltip/Tooltip.native'
import { colorsDark, colorsLight, zIndexes } from 'ui/src/theme'

type ThemeName = 'light' | 'dark'
const THEMES: ThemeName[] = ['light', 'dark']
const PALETTE: Record<ThemeName, typeof colorsLight> = { light: colorsLight, dark: colorsDark }

const TRIGGER_SELECTOR = '[data-slot="ui-tooltip-trigger"]'
const POSITIONER_SELECTOR = '[data-slot="ui-tooltip-positioner"]'
const POPUP_SELECTOR = '[data-slot="ui-tooltip-popup"]'
const ARROW_SELECTOR = '[data-slot="ui-tooltip-arrow"]'
const ARROW_INNER_SELECTOR = '[data-slot="ui-tooltip-arrow-inner"]'

/**
 * The rebuilt Tooltip reads the root `light`/`dark` class via useSporeColors /
 * useIsDarkMode — the same root-class store the app theme providers drive
 * (INFRA-3317). The class is set per render and cleared after every test so no theme
 * state leaks into or out of this suite.
 */
function renderThemed(theme: ThemeName, children: ReactNode): RenderResult {
  document.documentElement.classList.remove('light', 'dark')
  document.documentElement.classList.add(theme)
  return render(children)
}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  document.documentElement.classList.remove('light', 'dark')
})

/** jsdom normalizes inline-style colors (hex → rgb) — round-trip expected values through the same CSSOM. */
function cssColor(value: string): string {
  const probe = document.createElement('div')
  probe.style.color = value
  return probe.style.color
}

/** rgba alpha fold matching the web leg's shadow composition (legacy shadowOpacity). */
function foldAlpha(rgba: string, opacity: number): string {
  const match = /^rgba?\(([^)]+)\)$/.exec(rgba)
  if (!match?.[1]) {
    throw new Error(`expected rgb(a) color, got ${rgba}`)
  }
  const [r, g, b, a = '1'] = match[1].split(',').map((part) => part.trim())
  return `rgba(${r}, ${g}, ${b}, ${Number.parseFloat(a) * opacity})`
}

function renderTooltip({
  theme = 'light',
  rootProps = {},
  contentProps = {},
  triggerProps = {},
  arrow = false,
  hostZIndex,
}: {
  theme?: ThemeName
  rootProps?: Partial<React.ComponentProps<typeof Tooltip>>
  contentProps?: Partial<React.ComponentProps<typeof Tooltip.Content>>
  triggerProps?: Partial<React.ComponentProps<typeof Tooltip.Trigger>>
  arrow?: boolean
  hostZIndex?: number
} = {}): RenderResult {
  const tree = (
    <Tooltip {...rootProps}>
      <Tooltip.Trigger {...triggerProps}>
        <span>trigger</span>
      </Tooltip.Trigger>
      <Tooltip.Content {...contentProps}>
        {arrow ? <Tooltip.Arrow /> : null}
        <div data-testid="tooltip-content">tip</div>
      </Tooltip.Content>
    </Tooltip>
  )
  return renderThemed(
    theme,
    hostZIndex === undefined ? (
      tree
    ) : (
      <EffectiveModalOrSheetZIndexContext.Provider value={hostZIndex}>
        {tree}
      </EffectiveModalOrSheetZIndexContext.Provider>
    ),
  )
}

/**
 * jsdom 20 has no PointerEvent, so testing-library's fireEvent falls back to the bare
 * Event constructor, which silently DROPS `pointerType` — a plain
 * `fireEvent.pointerDown(el, { pointerType })` reaches every handler as `undefined`.
 * Attach the field explicitly so the trigger's mouse/non-mouse guard (and Base UI's
 * own pointerType bookkeeping) sees the real device kind.
 */
function firePointerEvent({
  target,
  type,
  pointerType,
}: {
  target: Element
  type: 'pointerdown' | 'pointerup' | 'pointerleave'
  pointerType: 'mouse' | 'touch'
}): void {
  const event = new Event(type, { bubbles: type !== 'pointerleave', cancelable: true })
  Object.defineProperty(event, 'pointerType', { value: pointerType })
  fireEvent(target, event)
}

function getPopup(): HTMLElement {
  const popup = document.querySelector(POPUP_SELECTOR) as HTMLElement | null
  if (!popup) {
    throw new Error('tooltip popup not rendered')
  }
  return popup
}

describe('shared mappers — the legacy popper vocabulary onto the positioner', () => {
  it('maps the ui/src styled defaults (delay {close: 500, open: 0} + restMs 200 → open 200 / close 500)', () => {
    expect(mapTooltipDelay({ delay: TOOLTIP_DEFAULT_DELAY, restMs: TOOLTIP_DEFAULT_REST_MS })).toEqual({
      openDelayMs: 200,
      closeDelayMs: 500,
    })
  })

  it('a nonzero open delay wins over restMs; a numeric delay applies to both edges', () => {
    expect(mapTooltipDelay({ delay: { open: 300, close: 50 }, restMs: 200 })).toEqual({
      openDelayMs: 300,
      closeDelayMs: 50,
    })
    expect(mapTooltipDelay({ delay: 250, restMs: 200 })).toEqual({ openDelayMs: 250, closeDelayMs: 250 })
  })

  it('placement defaults to bottom-center and splits side-align pairs', () => {
    expect(mapPlacementToAnchorPosition(undefined)).toEqual({ side: 'bottom', align: 'center' })
    expect(mapPlacementToAnchorPosition('top-end')).toEqual({ side: 'top', align: 'end' })
    expect(mapPlacementToAnchorPosition('left')).toEqual({ side: 'left', align: 'center' })
  })

  it('offset maps mainAxis → sideOffset and pre-flips crossAxis for end alignment (physical offset parity)', () => {
    expect(mapOffsetToAnchorPosition({ offset: { mainAxis: 16 }, align: 'center' })).toEqual({
      sideOffset: 16,
      alignOffset: 0,
    })
    expect(mapOffsetToAnchorPosition({ offset: { mainAxis: 8, crossAxis: -4 }, align: 'end' })).toEqual({
      sideOffset: 8,
      alignOffset: 4,
    })
    expect(mapOffsetToAnchorPosition({ offset: 10, align: 'start' })).toEqual({ sideOffset: 10, alignOffset: 0 })
  })
})

describe.each(THEMES)('Tooltip.Content — legacy ContentInner frame parity (%s)', (theme) => {
  it('renders the legacy styled defaults as inline styles', () => {
    renderTooltip({ theme, rootProps: { open: true } })
    const popup = getPopup()
    const palette = PALETTE[theme]

    expect(popup.style.display).toBe('flex')
    expect(popup.style.flexDirection).toBe('column')
    expect(popup.style.alignItems).toBe('center')
    expect(popup.style.justifyContent).toBe('center')
    expect(popup.style.gap).toBe('8px')
    expect(popup.style.backgroundColor).toBe(cssColor(palette.surface1))
    expect(popup.style.borderColor).toBe(palette.surface3)
    expect(popup.style.borderWidth).toBe('1px')
    expect(popup.style.borderStyle).toBe('solid')
    expect(popup.style.borderRadius).toBe('12px')
    expect(popup.style.maxWidth).toBe('350px')
    expect(popup.style.paddingTop).toBe('12px')
    expect(popup.style.paddingBottom).toBe('12px')
    expect(popup.style.paddingLeft).toBe('12px')
    expect(popup.style.paddingRight).toBe('12px')
    expect(popup.style.pointerEvents).toBe('none')

    // Legacy: light-only shadow (shadowColor $surface3, offset 0/6, opacity 0.04,
    // radius 12); the dark block zeroed offset/radius only, which emitted nothing.
    if (theme === 'light') {
      expect(popup.style.boxShadow).toBe(`0px 6px 12px ${foldAlpha(palette.surface3, 0.04)}`)
    } else {
      expect(popup.style.boxShadow).toBe('')
    }

    // Motion stays scoped to transform/opacity (no color transitions on theme flips).
    expect(popup.style.transition).toBe('transform 150ms ease-out, opacity 150ms ease-out')
  })
})

describe('Tooltip.Content — caller style-prop overrides (legacy alias folding)', () => {
  it('p: 0 zeroes all four edges while paddingVertical: 8 keeps the default horizontal 12', () => {
    renderTooltip({ rootProps: { open: true }, contentProps: { p: 0 } })
    const zeroed = getPopup()
    for (const edge of ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight'] as const) {
      expect(zeroed.style[edge]).toBe('0px')
    }
    cleanup()
    renderTooltip({ rootProps: { open: true }, contentProps: { paddingVertical: 8 } })
    const partial = getPopup()
    expect(partial.style.paddingTop).toBe('8px')
    expect(partial.style.paddingBottom).toBe('8px')
    expect(partial.style.paddingLeft).toBe('12px')
    expect(partial.style.paddingRight).toBe('12px')
  })

  it('folds spacing aliases in prop insertion order, like Tamagui (later alias wins the shared edges)', () => {
    // px BEFORE p: the later p wins everywhere.
    renderTooltip({ rootProps: { open: true }, contentProps: { px: 8, p: 0 } })
    const allZero = getPopup()
    for (const edge of ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight'] as const) {
      expect(allZero.style[edge]).toBe('0px')
    }
    cleanup()
    // p BEFORE px: the later px wins the horizontal edges only.
    renderTooltip({ rootProps: { open: true }, contentProps: { p: 0, px: 8 } })
    const horizontal = getPopup()
    expect(horizontal.style.paddingTop).toBe('0px')
    expect(horizontal.style.paddingBottom).toBe('0px')
    expect(horizontal.style.paddingLeft).toBe('8px')
    expect(horizontal.style.paddingRight).toBe('8px')
  })

  it('resolves the $padding*/$gap* token families like $spacing* (the PermissionedTokenTooltip shape, INFRA-3657)', () => {
    // Values deliberately differ from the frame defaults (padding 12 / gap 8) so an
    // omit-and-fall-back regression can't render the default and stay green.
    renderTooltip({
      rootProps: { open: true },
      contentProps: { px: '$padding16', py: '$padding8', gap: '$gap16' },
    })
    const popup = getPopup()
    expect(popup.style.paddingLeft).toBe('16px')
    expect(popup.style.paddingRight).toBe('16px')
    expect(popup.style.paddingTop).toBe('8px')
    expect(popup.style.paddingBottom).toBe('8px')
    expect(popup.style.gap).toBe('16px')
  })

  it('an unknown $ space token throws outside prod (dev/test/staging) instead of leaking invalid inline CSS (silent geometry fallback)', () => {
    // Silence React's render-error reporting; the throw itself is the pin.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    try {
      expect(() => renderTooltip({ rootProps: { open: true }, contentProps: { p: '$notARealToken' } })).toThrow(
        'unknown space token "$notARealToken"',
      )
    } finally {
      consoleError.mockRestore()
    }
  })

  it('in prod an unknown $ space token passes through instead of throwing', () => {
    vi.mocked(isProdEnv).mockReturnValue(true)
    try {
      // The render itself is half the pin: no throw with the env gate closed. The
      // invalid literal reaching the inline style verbatim is the other half — the
      // legacy pass-through (a real browser's CSSOM then rejects it silently).
      renderTooltip({ rootProps: { open: true }, contentProps: { gap: '$notARealToken' } })
      expect(getPopup().style.gap).toBe('$notARealToken')
    } finally {
      vi.mocked(isProdEnv).mockReset()
    }
  })

  it('an unrecognized radius token falls back to the frame default instead of erasing the radius', () => {
    renderTooltip({ rootProps: { open: true }, contentProps: { borderRadius: '$notARealToken' } })
    expect(getPopup().style.borderRadius).toBe('12px')
  })

  it('resolves token and passthrough values (the BidMarker/AnalyticsToggle/InfoTooltip call-site shapes)', () => {
    renderTooltip({
      rootProps: { open: true },
      contentProps: {
        backgroundColor: 'transparent',
        borderWidth: 0,
        maxWidth: '290px',
        mx: '$spacing24',
        pointerEvents: 'auto',
        gap: '$spacing4',
      },
    })
    const popup = getPopup()
    expect(popup.style.backgroundColor).toBe('transparent')
    expect(popup.style.borderWidth).toBe('0px')
    expect(popup.style.maxWidth).toBe('290px')
    expect(popup.style.marginLeft).toBe('24px')
    expect(popup.style.marginRight).toBe('24px')
    expect(popup.style.pointerEvents).toBe('auto')
    expect(popup.style.gap).toBe('4px')
  })

  it('$token colors and $platform-web styles resolve like the legacy engine', () => {
    renderTooltip({
      theme: 'dark',
      rootProps: { open: true },
      contentProps: {
        backgroundColor: '$surface2',
        '$platform-web': { boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.5)' },
      },
    })
    const popup = getPopup()
    expect(popup.style.backgroundColor).toBe(cssColor(colorsDark.surface2))
    expect(popup.style.boxShadow).toBe('0px 1px 2px rgba(0, 0, 0, 0.5)')
  })

  it('folds RN shadow keys into boxShadow when no $platform-web slice is present (the extension shape of useShadowPropsMedium)', () => {
    // In the extension, useShadowPropsMedium's runtime isWebApp check is false even in
    // .web files, so callers like Coachmark.web forward only the RN keys.
    renderTooltip({
      rootProps: { open: true },
      contentProps: {
        shadowColor: 'rgba(19, 19, 19, 0.04)',
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 12,
      },
    })
    expect(getPopup().style.boxShadow).toBe('0px 6px 12px rgba(19, 19, 19, 0.04)')
  })
})

describe('Tooltip — controlled open state (legacy TooltipBase semantics)', () => {
  it('renders nothing while closed and the portal content while open', () => {
    renderTooltip({ rootProps: { open: false } })
    expect(screen.queryByTestId('tooltip-content')).toBeNull()
    cleanup()
    renderTooltip({ rootProps: { open: true } })
    expect(screen.getByTestId('tooltip-content')).toBeTruthy()
  })

  it('requests close through onOpenChange on Escape without self-closing (stays controlled)', () => {
    const onOpenChange = vi.fn()
    renderTooltip({ rootProps: { open: true, onOpenChange } })
    fireEvent.keyDown(document.body, { key: 'Escape' })
    expect(onOpenChange).toHaveBeenCalled()
    expect(onOpenChange.mock.calls[0]?.[0]).toBe(false)
    expect(screen.getByTestId('tooltip-content')).toBeTruthy()
  })
})

describe('Tooltip — uncontrolled hover timing (legacy delay/restMs defaults)', () => {
  it('opens after the mapped open delay on hover (defaults: restMs 200), not before', () => {
    vi.useFakeTimers()
    renderTooltip()
    const trigger = document.querySelector(TRIGGER_SELECTOR) as HTMLElement
    fireEvent.mouseEnter(trigger)
    fireEvent.mouseMove(trigger)
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(screen.queryByTestId('tooltip-content')).toBeNull()
    act(() => {
      vi.advanceTimersByTime(150)
    })
    expect(screen.getByTestId('tooltip-content')).toBeTruthy()
  })

  it('closes after the mapped close delay on hover-out (defaults: 500ms)', () => {
    vi.useFakeTimers()
    renderTooltip()
    const trigger = document.querySelector(TRIGGER_SELECTOR) as HTMLElement
    fireEvent.mouseEnter(trigger)
    fireEvent.mouseMove(trigger)
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(screen.getByTestId('tooltip-content')).toBeTruthy()
    fireEvent.mouseLeave(trigger)
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(screen.getByTestId('tooltip-content')).toBeTruthy()
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(screen.queryByTestId('tooltip-content')).toBeNull()
  })

  it('honors a call-site delay pair (the InfoTooltip timings: open restMs 20, close 100)', () => {
    vi.useFakeTimers()
    renderTooltip({ rootProps: { delay: { close: 100, open: 0 }, restMs: 20 } })
    const trigger = document.querySelector(TRIGGER_SELECTOR) as HTMLElement
    fireEvent.mouseEnter(trigger)
    fireEvent.mouseMove(trigger)
    act(() => {
      vi.advanceTimersByTime(30)
    })
    expect(screen.getByTestId('tooltip-content')).toBeTruthy()
    fireEvent.mouseLeave(trigger)
    act(() => {
      vi.advanceTimersByTime(150)
    })
    expect(screen.queryByTestId('tooltip-content')).toBeNull()
  })
})

describe('Tooltip — touch and click affordances (legacy floating-ui hover was not mouse-only)', () => {
  it('a non-mouse pointerdown opens the uncontrolled tooltip (Base UI trigger hover is mouseOnly)', () => {
    renderTooltip()
    const trigger = document.querySelector(TRIGGER_SELECTOR) as HTMLElement
    expect(screen.queryByTestId('tooltip-content')).toBeNull()
    firePointerEvent({ target: trigger, type: 'pointerdown', pointerType: 'touch' })
    expect(screen.getByTestId('tooltip-content')).toBeTruthy()
  })

  it('a mouse pointerdown does NOT open the tooltip — the mouse path is hover, behind the rest delay', () => {
    vi.useFakeTimers()
    renderTooltip()
    const trigger = document.querySelector(TRIGGER_SELECTOR) as HTMLElement
    firePointerEvent({ target: trigger, type: 'pointerdown', pointerType: 'mouse' })
    expect(screen.queryByTestId('tooltip-content')).toBeNull()
    act(() => {
      // Well past the mapped open delay (restMs 200) — proves no delayed open armed either.
      vi.advanceTimersByTime(2000)
    })
    expect(screen.queryByTestId('tooltip-content')).toBeNull()
  })

  // jsdom cannot reproduce a real device's tap gesture, so the UA's tap output is
  // transcribed event by event: the pointer events (pointerleave fires as the finger
  // lifts), then the compat mouse events. Base UI's hover engine binds native
  // mouseenter/mousemove/mouseleave only (floating-ui-react
  // useHoverReferenceInteraction — it has no pointerleave listener), with the open
  // paths gated mouseOnly — so the tap sequence must arm no close, while the compat
  // mouseleave (which the UA holds until the user moves on) closes the tooltip.
  it('the full event sequence a tap emits (pointerleave at finger lift + compat mouse events) arms no close', () => {
    vi.useFakeTimers()
    renderTooltip()
    const trigger = document.querySelector(TRIGGER_SELECTOR) as HTMLElement
    firePointerEvent({ target: trigger, type: 'pointerdown', pointerType: 'touch' })
    firePointerEvent({ target: trigger, type: 'pointerup', pointerType: 'touch' })
    firePointerEvent({ target: trigger, type: 'pointerleave', pointerType: 'touch' })
    fireEvent.mouseOver(trigger)
    fireEvent.mouseEnter(trigger)
    fireEvent.mouseMove(trigger)
    fireEvent.mouseDown(trigger)
    fireEvent.mouseUp(trigger)
    fireEvent.click(trigger)
    act(() => {
      // Well past every mapped close delay (default 500ms, InfoTooltip 100ms).
      vi.advanceTimersByTime(2000)
    })
    expect(screen.getByTestId('tooltip-content')).toBeTruthy()
  })

  it('the compat mouseleave a device fires when the user moves on closes the touch-opened tooltip', () => {
    renderTooltip()
    const trigger = document.querySelector(TRIGGER_SELECTOR) as HTMLElement
    firePointerEvent({ target: trigger, type: 'pointerdown', pointerType: 'touch' })
    expect(screen.getByTestId('tooltip-content')).toBeTruthy()
    // Immediate, not the mouse 500ms closeDelay: the engine zeroes hover delays for
    // non-mouse pointers (useHoverShared.js resolveValue), and the trigger's
    // pointerdown recorded pointerType 'touch'.
    fireEvent.mouseLeave(trigger)
    expect(screen.queryByTestId('tooltip-content')).toBeNull()
  })

  it('an outside pointerdown closes a touch-opened tooltip (the legacy tap-away lifecycle)', () => {
    renderTooltip()
    const trigger = document.querySelector(TRIGGER_SELECTOR) as HTMLElement
    firePointerEvent({ target: trigger, type: 'pointerdown', pointerType: 'touch' })
    expect(screen.getByTestId('tooltip-content')).toBeTruthy()
    firePointerEvent({ target: document.body, type: 'pointerdown', pointerType: 'touch' })
    expect(screen.queryByTestId('tooltip-content')).toBeNull()
  })

  it('a pointerdown inside the popup does not dismiss a touch-opened tooltip', () => {
    renderTooltip({ contentProps: { pointerEvents: 'auto' } })
    const trigger = document.querySelector(TRIGGER_SELECTOR) as HTMLElement
    firePointerEvent({ target: trigger, type: 'pointerdown', pointerType: 'touch' })
    const content = screen.getByTestId('tooltip-content')
    firePointerEvent({ target: content, type: 'pointerdown', pointerType: 'touch' })
    expect(screen.getByTestId('tooltip-content')).toBeTruthy()
  })

  it('a repeat tap on an already-open trigger emits no duplicate onOpenChange(true)', () => {
    const onOpenChange = vi.fn()
    renderTooltip({ rootProps: { onOpenChange } })
    const trigger = document.querySelector(TRIGGER_SELECTOR) as HTMLElement
    firePointerEvent({ target: trigger, type: 'pointerdown', pointerType: 'touch' })
    expect(screen.getByTestId('tooltip-content')).toBeTruthy()
    firePointerEvent({ target: trigger, type: 'pointerdown', pointerType: 'touch' })
    // Only real transitions emit (Base UI's mouse path parity) — WarningInfo counts
    // TooltipOpened analytics off this callback.
    expect(onOpenChange).toHaveBeenCalledTimes(1)
    expect(onOpenChange).toHaveBeenCalledWith(true)
    expect(screen.getByTestId('tooltip-content')).toBeTruthy()
  })

  it('a touch pointerdown on an asChild trigger opens the tooltip (composedPointerDown routing), child handler first', () => {
    const childOnPointerDown = vi.fn()
    renderThemed(
      'light',
      <Tooltip>
        <Tooltip.Trigger asChild>
          <button type="button" data-testid="as-child-trigger" onPointerDown={childOnPointerDown}>
            trigger
          </button>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <div data-testid="tooltip-content">tip</div>
        </Tooltip.Content>
      </Tooltip>,
    )
    expect(screen.queryByTestId('tooltip-content')).toBeNull()
    firePointerEvent({ target: screen.getByTestId('as-child-trigger'), type: 'pointerdown', pointerType: 'touch' })
    // If the render-element merge ever favored Base UI's internal handler over the
    // composed one, tap-to-open would die for asChild call sites with the suite green.
    expect(screen.getByTestId('tooltip-content')).toBeTruthy()
    expect(childOnPointerDown).toHaveBeenCalledTimes(1)
  })

  it('a controlled tooltip only REQUESTS the touch open through onOpenChange', () => {
    const onOpenChange = vi.fn()
    renderTooltip({ rootProps: { open: false, onOpenChange } })
    const trigger = document.querySelector(TRIGGER_SELECTOR) as HTMLElement
    firePointerEvent({ target: trigger, type: 'pointerdown', pointerType: 'touch' })
    expect(onOpenChange).toHaveBeenCalledWith(true)
    expect(screen.queryByTestId('tooltip-content')).toBeNull()
  })

  it('clicking the trigger does not close an open tooltip (legacy hover engine had no click-close)', () => {
    vi.useFakeTimers()
    renderTooltip()
    const trigger = document.querySelector(TRIGGER_SELECTOR) as HTMLElement
    fireEvent.mouseEnter(trigger)
    fireEvent.mouseMove(trigger)
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(screen.getByTestId('tooltip-content')).toBeTruthy()
    fireEvent.click(trigger)
    expect(screen.getByTestId('tooltip-content')).toBeTruthy()
  })
})

describe('Tooltip.Trigger — legacy Tamagui stack contract', () => {
  it('renders a plain div wrapper (not a native button) with the Tamagui View base + resolved style props', () => {
    renderTooltip({ triggerProps: { flex: 1, width: '100%', cursor: 'pointer' } })
    const trigger = document.querySelector(TRIGGER_SELECTOR) as HTMLElement
    expect(trigger.tagName).toBe('DIV')
    expect(trigger.style.display).toBe('flex')
    expect(trigger.style.flexDirection).toBe('column')
    expect(trigger.style.alignItems).toBe('stretch')
    // RN `flex: 1` semantics, expanded like RNW/Tamagui did: grow 1 / shrink 1 / basis 0%.
    expect(trigger.style.flexGrow).toBe('1')
    expect(trigger.style.flexShrink).toBe('1')
    expect(trigger.style.flexBasis).toBe('0%')
    expect(trigger.style.width).toBe('100%')
    expect(trigger.style.cursor).toBe('pointer')
    expect(trigger.textContent).toBe('trigger')
  })

  it('asChild renders the child element itself as the trigger, content preserved, handlers composed child-first', () => {
    const calls: string[] = []
    const childOnClick = vi.fn(() => calls.push('child'))
    const onPress = vi.fn(() => calls.push('onPress'))
    renderThemed(
      'light',
      <Tooltip open>
        <Tooltip.Trigger asChild onPress={onPress}>
          <button type="button" data-testid="as-child-trigger" onClick={childOnClick}>
            trigger
          </button>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <div data-testid="tooltip-content">tip</div>
        </Tooltip.Content>
      </Tooltip>,
    )
    const trigger = screen.getByTestId('as-child-trigger')
    expect(trigger.getAttribute('data-slot')).toBe('ui-tooltip-trigger')
    expect(document.querySelectorAll(TRIGGER_SELECTOR)).toHaveLength(1)
    expect(trigger.textContent).toBe('trigger')
    fireEvent.click(trigger)
    expect(calls).toEqual(['child', 'onPress'])
  })
})

describe('Tooltip.Content — stacking bridge (EffectiveModalOrSheetZIndexContext)', () => {
  function ZIndexProbe(): JSX.Element {
    const layer = useContext(EffectiveModalOrSheetZIndexContext)
    return <div data-testid="z-probe">{String(layer)}</div>
  }

  it('floors at zIndexes.tooltip with no host, and re-provides the layer to children', () => {
    renderThemed(
      'light',
      <Tooltip open>
        <Tooltip.Trigger>
          <span>trigger</span>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <ZIndexProbe />
        </Tooltip.Content>
      </Tooltip>,
    )
    const positioner = document.querySelector(POSITIONER_SELECTOR) as HTMLElement
    expect(positioner.style.zIndex).toBe(String(zIndexes.tooltip))
    expect(screen.getByTestId('z-probe').textContent).toBe(String(zIndexes.tooltip))
  })

  it('renders one layer above a hosting modal/sheet', () => {
    renderTooltip({ rootProps: { open: true }, hostZIndex: zIndexes.tooltip + 350 })
    const positioner = document.querySelector(POSITIONER_SELECTOR) as HTMLElement
    expect(positioner.style.zIndex).toBe(String(zIndexes.tooltip + 351))
  })

  it('the legacy zIndex escape hatch wins', () => {
    renderTooltip({ rootProps: { open: true }, contentProps: { zIndex: 4242 }, hostZIndex: 9000 })
    const positioner = document.querySelector(POSITIONER_SELECTOR) as HTMLElement
    expect(positioner.style.zIndex).toBe('4242')
  })
})

describe('Tooltip — click-through while open (legacy pointerEvents contract)', () => {
  it('the positioner is pointer-inert while open — Base UI only inerts it while closed, so without the explicit style an open tooltip swallows clicks aimed beneath its rect', () => {
    renderTooltip({ rootProps: { open: true } })
    const positioner = document.querySelector(POSITIONER_SELECTOR) as HTMLElement
    expect(positioner.style.pointerEvents).toBe('none')
    expect(getPopup().style.pointerEvents).toBe('none')
  })

  it('pointerEvents="auto" content keeps the popup interactive under the inert positioner (the DisconnectButton/FeeTierSelector hoverable call sites)', () => {
    renderTooltip({ rootProps: { open: true }, contentProps: { pointerEvents: 'auto' } })
    const positioner = document.querySelector(POSITIONER_SELECTOR) as HTMLElement
    expect(positioner.style.pointerEvents).toBe('none')
    expect(getPopup().style.pointerEvents).toBe('auto')
  })
})

describe('Tooltip.Arrow — the legacy 12px rotated-square, two-element geometry', () => {
  it('renders the clip window and the rotated inner square with theme colors (default placement bottom)', () => {
    renderTooltip({ rootProps: { open: true }, arrow: true })
    const window_ = document.querySelector(ARROW_SELECTOR) as HTMLElement
    const inner = document.querySelector(ARROW_INNER_SELECTOR) as HTMLElement
    expect(window_).toBeTruthy()
    expect(inner).toBeTruthy()
    expect(window_.style.overflow).toBe('hidden')
    expect(window_.style.pointerEvents).toBe('none')
    // Popup side 'bottom' → arrow protrudes from the popup's top edge.
    expect(window_.style.top).toBe('-12px')
    expect(window_.style.height).toBe('13px')
    expect(window_.style.width).toBe('24px')
    expect(inner.style.transform).toBe('rotate(45deg)')
    expect(inner.style.width).toBe('12px')
    expect(inner.style.height).toBe('12px')
    expect(inner.style.backgroundColor).toBe(cssColor(colorsLight.surface1))
    expect(inner.style.borderColor).toBe(colorsLight.surface3)
    // Border only on the two OUTER edges for side 'bottom' (top/left after rotation).
    expect(inner.style.borderTopWidth).toBe('1px')
    expect(inner.style.borderLeftWidth).toBe('1px')
    expect(inner.style.borderBottomWidth).toBe('0px')
    expect(inner.style.borderRightWidth).toBe('0px')
  })
})

describe('Tooltip.Arrow — color overrides (the Coachmark inverse-theme path)', () => {
  it('honors backgroundColor/borderColor while the rest of the style surface stays inert', () => {
    renderThemed(
      'light',
      <Tooltip open>
        <Tooltip.Trigger>
          <span>trigger</span>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <Tooltip.Arrow backgroundColor={colorsDark.surface1} borderColor={colorsDark.surface3} />
          <div data-testid="tooltip-content">tip</div>
        </Tooltip.Content>
      </Tooltip>,
    )
    const inner = document.querySelector(ARROW_INNER_SELECTOR) as HTMLElement
    expect(inner.style.backgroundColor).toBe(cssColor(colorsDark.surface1))
    expect(inner.style.borderColor).toBe(colorsDark.surface3)
  })
})

describe('Tooltip.native — the Tamagui v1.136.1 native contract (pass-through/null compound)', () => {
  it('Root and Trigger render children unchanged; Content and Arrow render nothing', () => {
    render(
      <TooltipNative delay={{ close: 500 }} placement="top" open>
        <TooltipNative.Trigger flex={1}>
          <span data-testid="native-trigger-child">live mobile UI</span>
        </TooltipNative.Trigger>
        <TooltipNative.Content>
          <TooltipNative.Arrow />
          <div data-testid="native-content-child">must never mount</div>
        </TooltipNative.Content>
      </TooltipNative>,
    )
    expect(screen.getByTestId('native-trigger-child').textContent).toBe('live mobile UI')
    // Trigger is a pass-through: no wrapper element around the child.
    expect(screen.getByTestId('native-trigger-child').parentElement?.tagName).toBe('DIV') // the RTL container
    expect(screen.queryByTestId('native-content-child')).toBeNull()
    expect(document.querySelector(ARROW_SELECTOR)).toBeNull()
  })
})
