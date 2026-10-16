/**
 * The widened icon styling surface (INFRA-3320): the census-hot legacy style
 * props resolve first-class — CSS-lane props onto inline style (the same
 * channel the token contract test pins for size/color), pool props through
 * the shared deterministic-emission engine, ledger-rejected props onto the
 * NODE_ENV-gated throw.
 *
 * Assertions read `renderToStaticMarkup` output (the INFRA-2971 repro
 * mechanism): jsdom's CSSOM drops `var()` inline-style values, so the
 * serialized markup is the only honest view of the style channel.
 *
 * Running the pool cases under NODE_ENV=test is itself a safelist gate: the
 * emission engine THROWS here on any class outside the generated closed set
 * (compat-classes.gen.txt) that has no var-indirection twin — so a green run
 * proves the icon pool lane emits only safelisted classes.
 *
 * Lives in compat/ (not next to createIcon.tsx): the pool-lane cases spell
 * `$group-*` literals, which the INFRA-2958 new-Tamagui gate (oxlint
 * no-tamagui-styling + dangerfile) only permits under the shared
 * tamagui-migration exempt paths — the same carve-out the other compat
 * tests rely on.
 */
import { getConfig, NodeEnv, type BaseConfig } from '@universe/config'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Check } from '../components/icons/Check'
import { resetBoundedReportBudgets } from './diagnostics'
import { resetRejectedIconPropWarnings } from './icon-props'

// The dev-gate reads `getConfig().nodeEnv` (INFRA-3260 review), not raw
// `process.env.NODE_ENV` — mock the primitive instead of stubbing the env var.
vi.mock('@universe/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@universe/config')>()
  return { ...actual, getConfig: vi.fn() }
})

const mockGetConfig = vi.mocked(getConfig)

function mockNodeEnv(nodeEnv: string): void {
  mockGetConfig.mockReturnValue({ nodeEnv } as BaseConfig)
}

// File-level default (INFRA-3260 review): restores the pre-PR behavior where
// every block ran under real dev/test throw semantics unless it explicitly
// overrode NODE_ENV. Without this, blocks that never call `mockNodeEnv` get
// `getConfig()` returning `undefined`, which `isDevelopmentBuild()`'s
// fail-closed catch silently resolves to production keep-and-report semantics.
beforeEach(() => {
  mockNodeEnv(NodeEnv.Test)
})

interface RenderedSvg {
  tag: string
  attr: (name: string) => string
  styleDecl: (prop: string) => string
}

function renderCheckSvg(props: Record<string, unknown>): RenderedSvg {
  const markup = renderToStaticMarkup(createElement(Check, props))
  const tag = /<svg\b[^>]*>/.exec(markup)?.[0]
  if (tag === undefined) {
    throw new Error(`expected a rendered svg, got ${markup}`)
  }
  const attr = (name: string): string => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1] ?? ''
  const styleDecl = (prop: string): string =>
    new RegExp(`(?:^|;)\\s*${prop}:\\s*([^;]+)`).exec(attr('style'))?.[1]?.trim() ?? ''
  return { tag, attr, styleDecl }
}

describe('CSS-lane props resolve onto inline style (the legacy channel: props beat container CSS)', () => {
  it('resolves $spacing margin tokens to px', () => {
    const svg = renderCheckSvg({ ml: '$spacing8', mr: '$spacing12', mt: '$spacing2' })
    expect(svg.styleDecl('margin-left')).toBe('8px')
    expect(svg.styleDecl('margin-right')).toBe('12px')
    expect(svg.styleDecl('margin-top')).toBe('2px')
  })

  it('accepts the censused raw margin strings ("auto", "16px") and negative numbers', () => {
    expect(renderCheckSvg({ ml: 'auto' }).styleDecl('margin-left')).toBe('auto')
    expect(renderCheckSvg({ ml: '16px' }).styleDecl('margin-left')).toBe('16px')
    const mx = renderCheckSvg({ mx: -2 })
    expect(mx.styleDecl('margin-left')).toBe('-2px')
    expect(mx.styleDecl('margin-right')).toBe('-2px')
  })

  it('resolves the padding-family tokens legacy accepted in margin/padding slots', () => {
    const svg = renderCheckSvg({ margin: '$padding8', padding: '$padding12' })
    expect(svg.styleDecl('margin')).toBe('8px')
    expect(svg.styleDecl('padding')).toBe('12px')
    // The one live `padding` call site carries "$padding1" — a token in
    // NEITHER system (ui/src padding tokens start at padding6). It throws,
    // per compat convention, instead of rendering a fabricated value.
    expect(() => renderCheckSvg({ padding: '$padding1' })).toThrow(/unknown size token/)
  })

  it('maps marginEnd to margin-inline-end (the react-native-web mapping)', () => {
    expect(renderCheckSvg({ marginEnd: '$spacing2' }).styleDecl('margin-inline-end')).toBe('2px')
  })

  it('longhands beat the margin/mx shorthands regardless of JSX order (shorthands resolve first)', () => {
    // The verbatim-import-swap hazard: `margin` landing after `mt` in the
    // style object would reset it (CSS shorthands clobber longhands).
    const svg = renderCheckSvg({ mt: '$spacing8', margin: 0 })
    expect(svg.styleDecl('margin')).toBe('0px')
    expect(svg.styleDecl('margin-top')).toBe('8px')
    const mx = renderCheckSvg({ ml: 0, mx: '$spacing8' })
    expect(mx.styleDecl('margin-left')).toBe('0px')
    expect(mx.styleDecl('margin-right')).toBe('8px')
    expect(renderCheckSvg({ margin: '$spacing4', marginEnd: 0 }).styleDecl('margin-inline-end')).toBe('0px')
  })

  it('throws on unknown $ space tokens instead of rendering them raw', () => {
    expect(() => renderCheckSvg({ ml: '$notAToken' })).toThrow(/unknown size token/)
  })

  it('carries the layout and long-tail props inline (flexShrink/alignSelf/display/verticalAlign/cursor/pointerEvents/opacity)', () => {
    const svg = renderCheckSvg({
      flexShrink: 0,
      alignSelf: 'center',
      display: 'inline',
      verticalAlign: 'middle',
      cursor: 'pointer',
      pointerEvents: 'none',
      opacity: 0.8,
    })
    expect(svg.styleDecl('flex-shrink')).toBe('0')
    expect(svg.styleDecl('align-self')).toBe('center')
    expect(svg.styleDecl('display')).toBe('inline')
    expect(svg.styleDecl('vertical-align')).toBe('middle')
    expect(svg.styleDecl('cursor')).toBe('pointer')
    expect(svg.styleDecl('pointer-events')).toBe('none')
    expect(svg.styleDecl('opacity')).toBe('0.8')
  })

  it('renders rotate as a CSS transform; an explicit transform string replaces it (Tamagui semantics)', () => {
    expect(renderCheckSvg({ rotate: '180deg' }).styleDecl('transform')).toBe('rotate(180deg)')
    expect(renderCheckSvg({ rotate: '90deg', transform: 'rotate(180deg)' }).styleDecl('transform')).toBe(
      'rotate(180deg)',
    )
  })

  it('supports the legacy { width, height } size object form on the inline channel (LoadingPriceCurve call sites)', () => {
    const svg = renderCheckSvg({ size: { width: 120, height: 34 } })
    expect(svg.styleDecl('width')).toBe('120px')
    expect(svg.styleDecl('height')).toBe('34px')
    expect(svg.attr('width'), 'must not emit the low-specificity attribute').toBe('')
    expect(svg.attr('height')).toBe('')
  })

  it('explicit width/height (now typed first-class) beat the resolved size per axis', () => {
    const svg = renderCheckSvg({ size: '$icon.18', width: 30 })
    expect(svg.styleDecl('width')).toBe('30px')
    expect(svg.styleDecl('height')).toBe('18px')
    expect(renderCheckSvg({ height: '100%' }).styleDecl('height')).toBe('100%')
  })

  it('resolves minWidth/maxWidth (token string and raw number) like width/height', () => {
    const svg = renderCheckSvg({ minWidth: '$spacing8', maxWidth: '$spacing60' })
    expect(svg.styleDecl('min-width')).toBe('8px')
    expect(svg.styleDecl('max-width')).toBe('60px')
    const raw = renderCheckSvg({ minWidth: 24, maxWidth: 120 })
    expect(raw.styleDecl('min-width')).toBe('24px')
    expect(raw.styleDecl('max-width')).toBe('120px')
    expect(() => renderCheckSvg({ minWidth: '$notAToken' })).toThrow(/unknown size token/)
  })

  it('resolves token fills onto inline style (var() is unreliable in presentation attributes)', () => {
    const svg = renderCheckSvg({ fill: '$neutral2' })
    expect(svg.styleDecl('fill')).toBe('var(--neutral2)')
    expect(svg.attr('fill'), 'the template attribute stays; the wrapper must not add one').toBe('none')
  })

  it('resolves $spacing strokeWidth tokens to px numbers on the attribute (legacy resolved values)', () => {
    expect(renderCheckSvg({ strokeWidth: '$spacing2' }).attr('stroke-width')).toBe('2')
    expect(renderCheckSvg({ strokeWidth: 1.5 }).attr('stroke-width')).toBe('1.5')
    expect(() => renderCheckSvg({ strokeWidth: '$nope' })).toThrow(/unknown strokeWidth token/)
  })

  it('the caller style still wins over every resolved value', () => {
    const svg = renderCheckSvg({ ml: '$spacing8', style: { marginLeft: 3 } })
    expect(svg.styleDecl('margin-left')).toBe('3px')
  })
})

describe('pool props ride the shared emission machinery (classes + var-indirection twins)', () => {
  beforeEach(() => {
    mockNodeEnv(NodeEnv.Test)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('$xs size pools compile to media-xs classes and hoist the base sizing onto the class channel', () => {
    const svg = renderCheckSvg({ size: '$icon.24', $xs: { size: 16 } })
    const className = svg.attr('class')
    expect(className).toMatch(/media-xs:w-\[/)
    expect(className).toMatch(/media-xs:h-\[/)
    // Base sizing hoisted: the variant class must be able to win, so the base
    // width/height leave the inline channel for this render.
    expect(svg.styleDecl('width')).toBe('')
    expect(svg.styleDecl('height')).toBe('')
    expect(className).toMatch(/(?:^|\s)w-\[/)
    // The value rides the emission (in-set class or twin custom property).
    expect(svg.attr('style')).toContain('16px')
  })

  it('$group-hover color pools compile to group-hover classes and hoist the base color', () => {
    const svg = renderCheckSvg({ color: '$neutral2', '$group-hover': { color: '$neutral1' } })
    const className = svg.attr('class')
    expect(className).toMatch(/group-hover:\[color:/)
    expect(className).toMatch(/(?:^|\s)\[color:/)
    expect(svg.styleDecl('color'), 'base color must leave the inline channel so the variant can win').toBe('')
    // Both resolved values ride the emission — as an in-set class or a twin
    // custom property; either way they are in the rendered tag.
    expect(svg.tag).toContain('var(--neutral1)')
    expect(svg.tag).toContain('var(--neutral2)')
  })

  it('$group-hover opacity pools need no hoist — the base keeps its inline channel', () => {
    const svg = renderCheckSvg({ '$group-hover': { opacity: 0.6 } })
    expect(svg.attr('class')).toMatch(/group-hover:opacity-\[/)
    // color/size were not pooled: they keep the pinned inline channel.
    expect(svg.styleDecl('color')).toBe('currentColor')
    expect(svg.styleDecl('width')).toBe('8px')
  })

  it('a pooled margin prop hoists the whole base margin family onto the class channel', () => {
    // Shorthands and longhands are one CSS channel: a base `mr` left inline
    // would beat the pooled `margin` reset unconditionally.
    const svg = renderCheckSvg({ mr: '$spacing8', $xs: { margin: 0 } })
    expect(svg.attr('class')).toMatch(/media-xs:m-\[/)
    expect(svg.styleDecl('margin-right'), 'base mr must leave the inline channel so the variant can win').toBe('')
    expect(svg.attr('class')).toMatch(/(?:^|\s)mr-\[/)
    // The base value rides the emission (in-set class or twin custom property).
    expect(svg.tag).toContain('8px')
  })

  it('an undefined pool entry is not an override — the base keeps the inline channel (renders as no-pool)', () => {
    // `$xs={{ size: cond ? 16 : undefined }}`: the pool emits no class for the
    // entry, so hoisting for key presence alone would only knock the base off
    // the pinned inline channel with no variant class to win.
    const pooled = renderCheckSvg({ size: '$icon.24', $xs: { size: undefined } })
    const noPool = renderCheckSvg({ size: '$icon.24' })
    expect(pooled.styleDecl('width')).toBe('24px')
    expect(pooled.styleDecl('height')).toBe('24px')
    expect(pooled.attr('style')).toBe(noPool.attr('style'))
    expect(pooled.attr('class')).toBe('')
  })

  it('an undefined pooled margin entry does not hoist a raw-CSS base margin into the class lane', () => {
    // Key-presence hoisting would push the base `mr` through the class-lane
    // spacing compiler, which rejects raw CSS strings like "16px" — a render
    // throw for a pool that emits nothing.
    const svg = renderCheckSvg({ mr: '16px', $xs: { margin: undefined } })
    expect(svg.styleDecl('margin-right')).toBe('16px')
    expect(svg.attr('class')).toBe('')
  })

  it('a raw-CSS base margin ("16px") hoists through the emission when a pooled margin overrides it', () => {
    // Round-6: the base IconSpaceValue admits raw CSS strings (census-live),
    // and the margin-family hoist must carry them — as an in-set class or a
    // var twin — never the class-lane space-token throw.
    const svg = renderCheckSvg({ mr: '16px', $xs: { margin: 0 } })
    expect(svg.attr('class')).toMatch(/(?:^|\s)mr-\[16px\]/)
    expect(svg.attr('class')).toMatch(/media-xs:m-\[/)
    expect(svg.styleDecl('margin-right'), 'hoisted off the inline channel so the pool can win').toBe('')
  })

  it('a raw-CSS base margin with no in-set class rides the safelisted base var twin when hoisted', () => {
    const svg = renderCheckSvg({ mr: '2em', $xs: { margin: 0 } })
    expect(svg.attr('class')).toMatch(/(?:^|\s)mr-\[var\(--c-mr\)\]/)
    expect(svg.styleDecl('--c-mr')).toBe('2em')
    expect(svg.styleDecl('margin-right')).toBe('')
  })

  it('an "auto" base margin hoists as its in-set class when a pooled margin overrides it', () => {
    const svg = renderCheckSvg({ ml: 'auto', $xs: { margin: 0 } })
    expect(svg.attr('class')).toMatch(/(?:^|\s)ml-\[auto\]/)
    expect(svg.attr('class')).toMatch(/media-xs:m-\[/)
    expect(svg.styleDecl('margin-left')).toBe('')
  })

  it('a non-token size object hoists through the safelisted var twins when a sizing pool overrides it', () => {
    // Round-6 axis 2: `w-[120px]`/`h-[34px]` are outside the closed set — the
    // base tier swaps its var twins by construction; no dead class, no throw.
    const svg = renderCheckSvg({ size: { width: 120, height: 34 }, $xs: { size: 16 } })
    expect(svg.attr('class')).toMatch(/(?:^|\s)w-\[var\(--c-w\)\]/)
    expect(svg.attr('class')).toMatch(/(?:^|\s)h-\[var\(--c-h\)\]/)
    expect(svg.styleDecl('--c-w')).toBe('120px')
    expect(svg.styleDecl('--c-h')).toBe('34px')
    expect(svg.styleDecl('width')).toBe('')
  })

  it('base marginEnd stays inline when a pooled margin prop hoists the margin family (marginEnd is base-lane-only)', () => {
    // marginEnd is the one margin writer with no spacing utility: hoisting it
    // would push it through the long tail, which cannot express it in the
    // class lane (the INFRA-3320 round-3 blocker — a $ token there threw in
    // prod). It is excluded from MARGIN_FAMILY and the pool type instead, so
    // the base value keeps the inline channel even while the rest of the
    // family hoists. The residual (a pooled margin reset cannot beat it at
    // that breakpoint) matches the census: no call site pools over marginEnd.
    const svg = renderCheckSvg({ marginEnd: '$spacing2', $xs: { margin: 0 } })
    expect(svg.attr('class')).toMatch(/media-xs:m-\[/)
    expect(svg.styleDecl('margin-inline-end'), 'must not hoist — the class lane cannot express it').toBe('2px')
  })

  it('a pooled marginEnd smuggled past the narrowed pool type fails closed (never a silent drop)', () => {
    // The typed surface makes this a compile error (icon-pool-surface.test.tsx
    // pins that); a cast/spread call site still meets the compat dev-throw.
    // Since INFRA-3339 the long-tail lane resolves the token first, so the
    // throw moved from the marginEnd resolver to the closed-set emission
    // gate; since INFRA-3654 that gate names the variant-tier property gap.
    expect(() => renderCheckSvg({ $xs: { marginEnd: '$spacing2' } })).toThrow(/base-tier var twin only/)
  })

  it('a pooled verticalAlign smuggled past the narrowed pool type fails closed (no vertical-align variant twin)', () => {
    expect(() => renderCheckSvg({ $xs: { verticalAlign: 'middle' } })).toThrow(/base-tier var twin only/)
  })

  it('merges a caller className through the emission path', () => {
    const svg = renderCheckSvg({ className: 'probe', $sm: { size: '$icon.20' } })
    expect(svg.attr('class')).toContain('probe')
  })

  // Was a throw pin. The error report is the surviving signal now an unmapped
  // token no longer blanks the page, so it is asserted alongside the drop. The
  // channel assertions are the other half: a dropped pool colour emits no
  // variant class, so the base must NOT be hoisted out of inline style for it.
  it('logs an error and drops an unmapped pool colour, leaving the base inline', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    resetBoundedReportBudgets()
    const svg = renderCheckSvg({ color: '$neutral2', '$group-hover': { color: '$accent3' } })
    expect(svg.attr('class')).not.toMatch(/group-hover:\[color:/)
    expect(svg.styleDecl('color'), 'no variant class to lose to — container CSS must not get the base').toBe(
      'var(--neutral2)',
    )
    expect(svg.attr('class'), 'the base colour must not ride the class channel either').not.toMatch(/\[color:/)
    // Base unmapped too: inline `currentColor`, not an SVG with no colour declaration at all.
    expect(renderCheckSvg({ color: '$accent3', '$group-hover': { color: '$accent3' } }).styleDecl('color')).toBe(
      'currentColor',
    )
    expect(error.mock.calls.map((call) => String(call[0])).join('\n')).toContain(
      '"$accent3" has no @universe/tailwind counterpart',
    )
    error.mockRestore()
  })

  // The ASYMMETRIC case: the pool colour compiles, so the hoist correctly
  // fires, but the base token does not. Hoisting the raw token would leave the
  // SVG with no colour declaration at all, which is the one outcome this lane
  // promises never to produce, so the resolved fallback is hoisted instead.
  it('hoists currentColor when the pool colour resolves but the base token does not', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    resetBoundedReportBudgets()
    const svg = renderCheckSvg({ color: '$accent3', '$group-hover': { color: '$neutral1' } })
    expect(svg.attr('class')).toMatch(/group-hover:\[color:/)
    expect(svg.styleDecl('color'), 'the hoist fired, so the base leaves inline style').toBe('')
    expect(svg.tag, 'and rides the class channel as currentColor, not as nothing').toContain('currentColor')
    expect(error.mock.calls.map((call) => String(call[0])).join('\n')).toContain(
      '"$accent3" has no @universe/tailwind counterpart',
    )
    error.mockRestore()
  })
})

describe("hoverColor rides the emission engine as the icon's own hover pool", () => {
  it('emits a hover: color class and hoists the base color onto the class channel', () => {
    const svg = renderCheckSvg({ color: '$neutral2', hoverColor: '$neutral1' })
    const className = svg.attr('class')
    expect(className).toMatch(/(?:^|\s)hover:\[color:/)
    expect(className).toMatch(/(?:^|\s)\[color:/)
    expect(svg.styleDecl('color'), 'base color must leave the inline channel so the hover class can win').toBe('')
    // Both resolved values ride the emission — as an in-set class or a twin
    // custom property; either way they are in the rendered tag.
    expect(svg.tag).toContain('var(--neutral1)')
    expect(svg.tag).toContain('var(--neutral2)')
  })

  it('hoists the defaulted base color (currentColor) when only hoverColor is set', () => {
    const svg = renderCheckSvg({ hoverColor: '$neutral1' })
    expect(svg.attr('class')).toMatch(/(?:^|\s)hover:\[color:/)
    expect(svg.styleDecl('color')).toBe('')
    expect(svg.tag).toContain('currentColor')
  })

  it('hoists only the color channel — sizing keeps the pinned inline channel', () => {
    const svg = renderCheckSvg({ size: '$icon.24', hoverColor: '$neutral1' })
    expect(svg.styleDecl('width')).toBe('24px')
    expect(svg.styleDecl('height')).toBe('24px')
  })

  it('null and empty hoverColor are no-ops (legacy truthiness: no hover behavior)', () => {
    const noPool = renderCheckSvg({})
    for (const hoverColor of [null, '']) {
      const svg = renderCheckSvg({ hoverColor })
      expect(svg.attr('class')).toBe('')
      expect(svg.styleDecl('color')).toBe('currentColor')
      expect(svg.attr('style')).toBe(noPool.attr('style'))
    }
  })

  it('composes with pool props — both variants emit through the one engine', () => {
    const svg = renderCheckSvg({ color: '$neutral2', hoverColor: '$neutral1', '$group-hover': { opacity: 0.6 } })
    expect(svg.attr('class')).toMatch(/(?:^|\s)hover:\[color:/)
    expect(svg.attr('class')).toMatch(/group-hover:opacity-\[/)
  })

  it('logs an error and drops an unmapped hoverColor, leaving the base inline', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    resetBoundedReportBudgets()
    const svg = renderCheckSvg({ color: '$neutral2', hoverColor: '$accent3' })
    expect(svg.attr('class')).not.toMatch(/hover:\[color:/)
    // No hover class materialises, so the hoist must not fire: a hoisted base
    // rides the class channel, where `[&_svg]:text-…` beats it.
    expect(svg.styleDecl('color')).toBe('var(--neutral2)')
    expect(svg.attr('class'), 'the base colour must not ride the class channel either').not.toMatch(/\[color:/)
    // Base unmapped too: inline `currentColor`, not an SVG with no colour declaration at all.
    expect(renderCheckSvg({ color: '$accent3', hoverColor: '$accent3' }).styleDecl('color')).toBe('currentColor')
    expect(error.mock.calls.map((call) => String(call[0])).join('\n')).toContain(
      '"$accent3" has no @universe/tailwind counterpart',
    )
    error.mockRestore()
  })

  // The negative half of the pin above: a hover colour that DOES compile keeps
  // hoisting, so the fix cannot degrade into "never hoist".
  it('still hoists the base colour when the hover colour resolves', () => {
    const svg = renderCheckSvg({ color: '$neutral2', hoverColor: '$neutral1' })
    expect(svg.styleDecl('color')).toBe('')
    expect(svg.attr('class')).toMatch(/(?:^|\s)hover:\[color:/)
  })

  it('hoists currentColor when the hover colour resolves but the base token does not', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    resetBoundedReportBudgets()
    const svg = renderCheckSvg({ color: '$accent3', hoverColor: '$neutral1' })
    expect(svg.attr('class')).toMatch(/(?:^|\s)hover:\[color:/)
    expect(svg.styleDecl('color')).toBe('')
    expect(svg.tag, 'the hoisted base must be currentColor, not an unmapped token that compiles to nothing').toContain(
      'currentColor',
    )
    error.mockRestore()
  })
})

describe('ledger-rejected props (the runtime half of the boundary)', () => {
  beforeEach(() => {
    mockNodeEnv(NodeEnv.Test)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    resetRejectedIconPropWarnings()
  })

  // `position`/`left` moved to the supported half (INFRA-3320 widening,
  // packages/wallet ChooseNftModal.tsx); `borderRadius` is still rejected
  // (BADGE_BOX_ON_WRAPPER) and stands in for the still-ledger-rejected case.
  it('throws in development/test builds with the ledger reason', () => {
    expect(() => renderCheckSvg({ borderRadius: 8 })).toThrow(/deliberately rejected/)
    expect(() => renderCheckSvg({ animation: '200ms' })).toThrow(/animation-driver/)
  })

  it('production builds drop the prop and warn once (bounded), never crash', () => {
    mockNodeEnv(NodeEnv.Production)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const first = renderCheckSvg({ borderRadius: 8 })
    expect(first.attr('borderRadius')).toBe('')
    renderCheckSvg({ borderRadius: 8 })
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('borderRadius')
  })
})
