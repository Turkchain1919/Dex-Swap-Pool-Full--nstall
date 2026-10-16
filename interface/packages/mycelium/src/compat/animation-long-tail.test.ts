/**
 * The compat `animation-*` long tail (INFRA-3330).
 *
 * Three contracts:
 *  1. every CSS animation LONGHAND compiles generically to its
 *     `[animation-*:value]` arbitrary-property utility, in every bucket `S`
 *     flows through (direct, `$platform-web`, pseudo, `$media`);
 *  2. the VALUE GUARD: a value referencing a theme token or a custom property
 *     throws (animations stay scoped to non-color properties), a bare number
 *     on the time-valued props throws (a px suffix is not a valid CSS time),
 *     and no token family may claim an animation prop (this suite goes red if
 *     one ever does). The guard sees PROP VALUES only — keyframe bodies are
 *     the review surface (see the guard's docstring; INFRA-3597 tracks
 *     tooling enforcement);
 *  3. the `animation` SHORTHAND stays OUT of the long tail — the spelling is
 *     the Tamagui animation-driver prop on the compat surface — and the
 *     enter/exit PRESETS, whose classes declare the CSS shorthand, refuse to
 *     combine with the longhands on one element, so the shorthand/longhand
 *     cascade inversion (stylesheet order beats JSX prop order once both
 *     classes ship) cannot be composed.
 */
import { getConfig, NodeEnv, type BaseConfig } from '@universe/config'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flexCompatClassName, flexCompatEmission } from '../flex-compat/compile'
import { textCompatClassName } from '../text-compat/compile'
import { resetOutOfSetWarnings } from './compose'
import { REJECTED_LONG_TAIL_TOKEN_PROPS } from './long-tail-token-coverage'
import {
  ANIMATION_LONG_TAIL_PROPS,
  COLOR_LONG_TAIL_PROPS,
  LONG_TAIL_STYLE_PROP_SET,
  RADIUS_LONG_TAIL_PROPS,
  SIZE_LONG_TAIL_PROPS,
  SPACE_LONG_TAIL_PROPS,
} from './style-props'

const has = (className: string, cls: string): boolean => className.split(' ').includes(cls)

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
// fail-closed catch silently resolves to production keep-and-warn semantics.
beforeEach(() => {
  mockNodeEnv(NodeEnv.Test)
})

describe('animation-* longhand emission', () => {
  it.each([
    [{ animationName: 'spin' }, '[animation-name:spin]'],
    [{ animationDuration: '300ms' }, '[animation-duration:300ms]'],
    [{ animationDelay: '150ms' }, '[animation-delay:150ms]'],
    [{ animationTimingFunction: 'ease-in-out' }, '[animation-timing-function:ease-in-out]'],
    [{ animationIterationCount: 'infinite' }, '[animation-iteration-count:infinite]'],
    [{ animationDirection: 'alternate' }, '[animation-direction:alternate]'],
    [{ animationFillMode: 'both' }, '[animation-fill-mode:both]'],
    [{ animationPlayState: 'paused' }, '[animation-play-state:paused]'],
  ] as const)('compiles %o to %s', (props, cls) => {
    expect(has(flexCompatClassName(props), cls)).toBe(true)
  })

  it('numeric animationIterationCount is unitless (no px suffix)', () => {
    expect(has(flexCompatClassName({ animationIterationCount: 2 }), '[animation-iteration-count:2]')).toBe(true)
  })

  it('compiles the full longhand family together (the AnimatedEmblems shape)', () => {
    const className = flexCompatClassName({
      animationName: 'emblem-float',
      animationDuration: '1.2s',
      animationDelay: '0.3s',
      animationTimingFunction: 'cubic-bezier(0.4,0,0.2,1)',
      animationFillMode: 'both',
    })
    expect(has(className, '[animation-name:emblem-float]')).toBe(true)
    expect(has(className, '[animation-duration:1.2s]')).toBe(true)
    expect(has(className, '[animation-delay:0.3s]')).toBe(true)
    expect(has(className, '[animation-timing-function:cubic-bezier(0.4,0,0.2,1)]')).toBe(true)
    expect(has(className, '[animation-fill-mode:both]')).toBe(true)
  })

  it('flows through $platform-web (the INFRA-3330 repro bucket)', () => {
    expect(has(flexCompatClassName({ '$platform-web': { animationName: 'spin' } }), '[animation-name:spin]')).toBe(true)
  })

  it('flows through pseudo buckets', () => {
    const className = flexCompatClassName({ hoverStyle: { animationPlayState: 'paused' } })
    expect(has(className, 'hover:[animation-play-state:paused]')).toBe(true)
  })

  it('flows through $media buckets', () => {
    const className = flexCompatClassName({ $md: { animationDuration: '1s' } })
    expect(className.split(' ').some((cls) => cls === 'media-md:[animation-duration:1s]')).toBe(true)
  })

  it('Text rides the shared table: the longhands compile on the Text lane too', () => {
    expect(has(textCompatClassName({ animationName: 'spin' }), '[animation-name:spin]')).toBe(true)
  })
})

describe('the emission lane (validates against the safelist) per bucket tier', () => {
  beforeEach(() => {
    mockNodeEnv(NodeEnv.Test)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('base-tier animation longhands ride the safelisted var twins', () => {
    const emission = flexCompatEmission({ animationName: 'parity-spin' })
    expect(has(emission.className, '[animation-name:var(--c-an)]')).toBe(true)
    expect(emission.style).toEqual({ '--c-an': 'parity-spin' })
  })

  it('$platform-web merges into the base tier and rides the same twins', () => {
    const emission = flexCompatEmission({ '$platform-web': { animationName: 'parity-spin' } })
    expect(has(emission.className, '[animation-name:var(--c-an)]')).toBe(true)
    expect(emission.style).toEqual({ '--c-an': 'parity-spin' })
  })

  it('var twins carry space-bearing values verbatim — no underscore encode/decode on this lane', () => {
    const emission = flexCompatEmission({ animationTimingFunction: 'steps(4, end)' })
    expect(has(emission.className, '[animation-timing-function:var(--c-atf)]')).toBe(true)
    expect(emission.style).toEqual({ '--c-atf': 'steps(4, end)' })
  })

  // The animation family has BASE-TIER var twins only (the safelist gained
  // eight): variant-prefixed animation values sit outside the curated variant
  // twin tier — the long-tail family baseline for props outside that tier —
  // so the emission lane rejects them as out-of-set under dev semantics.
  // These pins flip the day the family joins the variant twin tier; the
  // preset collision guard's pseudo behavior (compose.ts) leans on this gap.
  it.each([
    ['pseudo', { hoverStyle: { animationPlayState: 'paused' } }],
    ['$media', { $md: { animationDuration: '1s' } }],
    ['$theme-dark', { '$theme-dark': { animationName: 'parity-spin' } }],
    ['$theme-light', { '$theme-light': { animationName: 'parity-spin' } }],
  ] as const)('%s animation longhands are out-of-set on the emission lane today', (_tier, props) => {
    // The error names the real boundary (base-tier-only twins) and its
    // revisit condition, not the generic group/closed-set drift guidance.
    expect(() => flexCompatEmission(props)).toThrow(/base-tier var twins only/)
    expect(() => flexCompatEmission(props)).toThrow(/INFRA-3597/)
  })
})

describe('the value guard: nothing admitted may animate a theme color', () => {
  it.each([
    ['theme token', { animationName: '$accent1' }],
    ['theme token on a timing prop', { animationDuration: '$spacing4' }],
    ['custom-property reference', { animationName: 'var(--accent1)' }],
  ] as const)('rejects a %s', (_label, props) => {
    expect(() => flexCompatClassName(props)).toThrow(/non-color properties/)
  })

  it('the guard runs inside buckets too', () => {
    expect(() => flexCompatClassName({ hoverStyle: { animationName: '$accent1' } })).toThrow(/non-color properties/)
    expect(() => flexCompatClassName({ '$platform-web': { animationName: 'var(--surface1)' } })).toThrow(
      /non-color properties/,
    )
  })

  it.each([
    ['animationDuration', { animationDuration: 200 }],
    ['animationDelay', { animationDelay: 300 }],
  ] as const)('rejects a bare number on time-valued %s (px is not a valid CSS time)', (_label, props) => {
    expect(() => flexCompatClassName(props)).toThrow(/CSS time units/)
  })

  it.each([
    ['numeric string', { animationDuration: '200' }],
    ['decimal string', { animationDuration: '.5' }],
    ['numeric string on animationDelay', { animationDelay: '300' }],
  ] as const)('rejects a unitless %s on a time-valued prop', (_label, props) => {
    expect(() => flexCompatClassName(props)).toThrow(/CSS time units/)
  })

  it('unit-bearing time strings still compile', () => {
    expect(has(flexCompatClassName({ animationDuration: '200ms' }), '[animation-duration:200ms]')).toBe(true)
    expect(has(flexCompatClassName({ animationDuration: '0.2s' }), '[animation-duration:0.2s]')).toBe(true)
    expect(has(flexCompatClassName({ animationDelay: '.5s' }), '[animation-delay:.5s]')).toBe(true)
  })

  it('numeric time values are rejected inside buckets too', () => {
    expect(() => flexCompatClassName({ '$platform-web': { animationDuration: 200 } })).toThrow(/CSS time units/)
  })

  it.each([
    ['direct', { animationName: 'fade_in' }],
    ['inside a bucket', { '$platform-web': { animationName: 'fade_in' } }],
    ['on a non-name prop', { animationTimingFunction: 'steps(4,_end)' }],
  ] as const)('rejects an underscored value (%s) — it would decode to a space and silently drop', (_label, props) => {
    expect(() => flexCompatClassName(props)).toThrow(/underscore/)
  })

  it('keyframe identifiers are names the author picks — color-ish names are not property references', () => {
    // The guard never inspects name shape: `animation-*` grammar has no
    // property-name values (that is transition territory), so identifiers
    // like these must compile. Keyframe BODIES are the review surface.
    for (const name of ['multicolor-pulse', 'highlight-color', 'fade-color']) {
      expect(has(flexCompatClassName({ animationName: name }), `[animation-name:${name}]`)).toBe(true)
    }
  })

  it('no token family claims an animation prop — the red line for admitting colors', () => {
    for (const prop of ANIMATION_LONG_TAIL_PROPS) {
      expect(COLOR_LONG_TAIL_PROPS.has(prop), `${prop} must never join the color token family`).toBe(false)
      expect(RADIUS_LONG_TAIL_PROPS.has(prop as never), prop).toBe(false)
      expect(SPACE_LONG_TAIL_PROPS.has(prop), prop).toBe(false)
      expect(SIZE_LONG_TAIL_PROPS.has(prop), prop).toBe(false)
      expect(REJECTED_LONG_TAIL_TOKEN_PROPS[prop], `${prop} must sit in the rejected token ledger`).toBeDefined()
    }
  })
})

describe('the animation shorthand boundary', () => {
  beforeEach(() => {
    mockNodeEnv(NodeEnv.Test)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    resetOutOfSetWarnings()
  })

  // The preset classes declare the CSS animation shorthand, so pairing one
  // with any longhand would reintroduce the cascade inversion the shorthand
  // exclusion exists to prevent — the compose walk fails loud instead.
  // Pseudo pools stay guarded even though their variant outranks the preset
  // by specificity: the emission lane cannot express a variant-prefixed
  // animation longhand today (see the emission-lane suite above), so the
  // combination is unrenderable regardless of the cascade.
  it.each([
    ['animateEnter + bucket longhand', { animateEnter: 'fadeIn', '$platform-web': { animationName: 'pulse' } }],
    ['animateExit + direct longhand', { animateExit: 'fadeOut', animationDuration: '1s' }],
    [
      'animateEnterExit + pseudo longhand',
      { animateEnterExit: 'fadeInOut', hoverStyle: { animationPlayState: 'paused' } },
    ],
  ] as const)('a preset never combines with a longhand: %s throws', (_label, props) => {
    expect(() => flexCompatClassName(props)).toThrow(/animation shorthand/)
  })

  it('the collision guard gates on development semantics: production keeps both classes and warns once', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockNodeEnv(NodeEnv.Production)
    const combo = { animateEnter: 'fadeIn', '$platform-web': { animationName: 'parity-spin' } } as const
    const className = flexCompatClassName(combo)
    expect(has(className, '[animation-name:parity-spin]')).toBe(true)
    expect(has(className, 'animate-spore-enter-fade-in')).toBe(true)
    flexCompatClassName(combo)
    expect(warn).toHaveBeenCalledTimes(1) // deduped per prop/pool pair
    // Dev server semantics throw again (removing the gate fails this pair).
    mockNodeEnv(NodeEnv.Development)
    expect(() => flexCompatClassName(combo)).toThrow(/animation shorthand/)
  })

  it('a preset alone still compiles', () => {
    expect(has(flexCompatClassName({ animateEnter: 'fadeIn' }), 'animate-spore-enter-fade-in')).toBe(true)
  })

  it('production collision warns are bounded: interpolated group pool names cannot grow the dedupe set unboundedly', () => {
    mockNodeEnv(NodeEnv.Production)
    const messages: string[] = []
    vi.spyOn(console, 'warn').mockImplementation((message: unknown) => {
      messages.push(String(message))
    })
    for (let i = 0; i < 55; i++) {
      flexCompatClassName({
        animateEnter: 'fadeIn',
        [`$group-g${i}-hover`]: { animationName: 'parity-spin' },
      } as Parameters<typeof flexCompatClassName>[0])
    }
    expect(messages).toHaveLength(51) // 50 distinct pool/prop pairs + one suppression notice
    expect(messages.at(-1)).toContain('suppressed')
  })

  it('every longhand is in the long tail; the shorthand is not', () => {
    for (const prop of ANIMATION_LONG_TAIL_PROPS) {
      expect(LONG_TAIL_STYLE_PROP_SET.has(prop), prop).toBe(true)
    }
    // `animation` stays the Tamagui driver prop (CompatAnimationProps) — see
    // ANIMATION_LONG_TAIL_PROPS docs for why the CSS shorthand is excluded.
    expect(LONG_TAIL_STYLE_PROP_SET.has('animation')).toBe(false)
    expect(ANIMATION_LONG_TAIL_PROPS.has('animation')).toBe(false)
  })
})
