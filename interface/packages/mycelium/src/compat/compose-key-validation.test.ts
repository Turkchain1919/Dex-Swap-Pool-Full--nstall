/**
 * Pool-key validation (INFRA-3260): the media / pseudo / theme / platform
 * pool walks are table-driven, so before this gate an unknown key in those
 * namespaces compiled to NOTHING — green typecheck (spreads skip
 * excess-property checks), green lint, empty output. Each namespace's
 * rejection is pinned here alongside a green control for its mapped keys,
 * plus the animation-preset lookups (same silent-miss family) and the
 * production keep-dropping-and-report gating (error level, via
 * `reportUnknownCompatKey` and the bounded lane in `diagnostics.ts`).
 */
import { getConfig, NodeEnv, type BaseConfig } from '@universe/config'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flexCompatClassName, flexCompatEmission } from '../flex-compat/compile'
import type { FlexCompatProps } from '../flex-compat/props'
import { resetOutOfSetWarnings } from './compose'

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

/** Unknown keys cannot typecheck as literals (the unions are closed) — the runtime gap is spread-shaped, so the tests widen the same way. */
function widened(props: Record<string, unknown>): FlexCompatProps {
  return props as FlexCompatProps
}

describe('compat pool-key validation — unknown keys are loud (INFRA-3260)', () => {
  beforeEach(() => {
    mockNodeEnv(NodeEnv.Test)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    resetOutOfSetWarnings()
  })

  describe('media namespace', () => {
    it('rejects an unmapped media key under development semantics', () => {
      expect(() => flexCompatClassName(widened({ $tall: { gap: 8 } }))).toThrow(/unknown media prop "\$tall"/)
      expect(() => flexCompatEmission(widened({ $tall: { gap: 8 } }))).toThrow(/unknown media prop "\$tall"/)
      // The message is actionable: it names the mapped vocabulary.
      expect(() => flexCompatClassName(widened({ $tall: { gap: 8 } }))).toThrow(/\$md/)
    })

    it('rejects a set-but-undefined unknown media key (same semantics as unsupported $group keys)', () => {
      expect(() => flexCompatClassName(widened({ $tall: undefined }))).toThrow(/unknown media prop/)
    })

    it('keeps compiling every mapped media key', () => {
      expect(flexCompatClassName({ $md: { gap: 8 } })).toContain('media-md:gap-[8px]')
      expect(flexCompatClassName({ $lgHeight: { gap: 8 } })).toContain('media-lg-height:gap-[8px]')
    })
  })

  describe('unrecognized pool namespace (INFRA-3260 review)', () => {
    it('rejects a would-be sixth namespace as an unknown pool namespace, not an unknown media prop', () => {
      expect(() => flexCompatClassName(widened({ '$container-sm': { gap: 8 } }))).toThrow(
        /unknown pool namespace "\$container-sm"/,
      )
      expect(() => flexCompatClassName(widened({ '$container-sm': { gap: 8 } }))).not.toThrow(/unknown media prop/)
    })
  })

  describe('pseudo namespace', () => {
    it("rejects a typo'd pseudo pool key (object-valued Style-suffixed key outside the pool table)", () => {
      expect(() => flexCompatClassName(widened({ hoverStyles: { gap: 8 } }))).toThrow(
        /unknown pseudo-state prop "hoverStyles"/,
      )
      expect(() => flexCompatEmission(widened({ pressedStyle: { gap: 8 } }))).toThrow(
        /unknown pseudo-state prop "pressedStyle"/,
      )
    })

    it('keeps compiling the mapped pseudo pools', () => {
      expect(flexCompatClassName({ hoverStyle: { gap: 8 } })).toContain('hover:gap-[8px]')
      expect(flexCompatClassName({ disabledStyle: { opacity: 0.5 } })).toContain('aria-disabled:opacity-[0.5]')
    })

    it('does not trip on Style-suffixed props that are not pools (string-valued long tail, forceStyle)', () => {
      expect(flexCompatClassName({ borderStyle: 'dashed', forceStyle: 'hover', hoverStyle: { gap: 8 } })).toContain(
        'gap-[8px]',
      )
    })

    it("rejects a typo'd pseudo pool nested one level down inside a pool value (INFRA-3260 review — $md={{ hoverStyles: {...} }})", () => {
      expect(() => flexCompatClassName(widened({ $md: { hoverStyles: { gap: 8 } } }))).toThrow(
        /unknown pseudo-state prop "hoverStyles"/,
      )
      expect(() => flexCompatClassName(widened({ '$platform-web': { hoverStyles: { gap: 8 } } }))).toThrow(
        /unknown pseudo-state prop "hoverStyles"/,
      )
      expect(() => flexCompatEmission(widened({ '$theme-dark': { hoverStyles: { gap: 8 } } }))).toThrow(
        /unknown pseudo-state prop "hoverStyles"/,
      )
    })

    it('keeps compiling a correctly nested pseudo pool inside a pool value', () => {
      expect(flexCompatClassName({ $md: { hoverStyle: { gap: 8 } } })).toContain('media-md:hover:gap-[8px]')
    })
  })

  describe('enterStyle exemption (INFRA-3739)', () => {
    it('does not misfire the pseudo-shaped-key detector on a real top-level enterStyle object — the dev-mode crash this ticket fixes', () => {
      expect(() => flexCompatClassName(widened({ opacity: 1, enterStyle: { opacity: 0 } }))).not.toThrow()
      expect(() => flexCompatEmission(widened({ opacity: 1, enterStyle: { opacity: 0 } }))).not.toThrow()
    })

    it('still compiles the base pool normally alongside a top-level enterStyle object', () => {
      expect(flexCompatClassName(widened({ gap: 8, enterStyle: { opacity: 0 } }))).toContain('gap-[8px]')
    })

    it('rejects enterStyle nested one level down inside a pool value — the exemption is top-level only, since only `dom.tsx` reads a top-level enterStyle', () => {
      expect(() => flexCompatClassName(widened({ $md: { enterStyle: { opacity: 0 } } }))).toThrow(
        /unknown pseudo-state prop "enterStyle"/,
      )
      expect(() => flexCompatClassName(widened({ '$platform-web': { enterStyle: { opacity: 0 } } }))).toThrow(
        /unknown pseudo-state prop "enterStyle"/,
      )
      expect(() => flexCompatEmission(widened({ '$theme-dark': { enterStyle: { opacity: 0 } } }))).toThrow(
        /unknown pseudo-state prop "enterStyle"/,
      )
    })
  })

  describe('theme namespace', () => {
    it('rejects an unmapped theme key', () => {
      expect(() => flexCompatClassName(widened({ '$theme-midnight': { gap: 8 } }))).toThrow(
        /unknown theme prop "\$theme-midnight"/,
      )
    })

    it('keeps compiling the two theme pools', () => {
      expect(flexCompatClassName({ '$theme-dark': { gap: 8 } })).toContain('dark:gap-[8px]')
      expect(flexCompatClassName({ '$theme-light': { gap: 8 } })).toContain('light:gap-[8px]')
    })
  })

  describe('platform namespace', () => {
    it('rejects an unmapped platform key', () => {
      expect(() => flexCompatClassName(widened({ '$platform-windows': { gap: 8 } }))).toThrow(
        /unknown platform prop "\$platform-windows"/,
      )
    })

    it('keeps compiling $platform-web and keeps the documented accept-and-ignore native keys silent', () => {
      expect(flexCompatClassName({ '$platform-web': { gap: 8 } })).toContain('gap-[8px]')
      const ignored = flexCompatClassName({
        '$platform-native': { elevation: 4 },
        '$platform-ios': { shadowOpacity: 0.1 },
        '$platform-android': { elevation: 2 },
      })
      expect(ignored).toBe(flexCompatClassName({}))
    })
  })

  describe('animation preset lookups (same silent-miss family)', () => {
    it('rejects an unknown preset name instead of dropping it', () => {
      expect(() => flexCompatClassName(widened({ animateEnter: 'nope' }))).toThrow(/unknown animateEnter preset "nope"/)
      expect(() => flexCompatClassName(widened({ animateExit: 'nope' }))).toThrow(/unknown animateExit preset/)
      expect(() => flexCompatClassName(widened({ animateEnterExit: 'nope' }))).toThrow(
        /unknown animateEnterExit preset/,
      )
    })

    it('rejects a preset name that shadows a prototype property instead of crashing on it (review)', () => {
      // `presets['toString']` resolves through the prototype chain to a Function
      // (not undefined) unless the lookup is own-property-only — this must
      // report the unknown preset, not throw a TypeError from `.split` on a
      // Function further down the pipeline.
      expect(() => flexCompatClassName(widened({ animateEnter: 'toString' }))).toThrow(
        /unknown animateEnter preset "toString"/,
      )
      expect(() => flexCompatClassName(widened({ animateEnter: 'constructor' }))).toThrow(
        /unknown animateEnter preset "constructor"/,
      )
    })

    it('keeps compiling mapped presets', () => {
      expect(flexCompatClassName({ animateEnter: 'fadeIn' })).toContain('animate-spore-enter-fade-in')
    })
  })

  describe('production gating (NOT __DEV__ — same convention as the out-of-set gate)', () => {
    it('production builds keep the legacy drop, log one error per key, and never throw', () => {
      mockNodeEnv(NodeEnv.Production)
      const messages: string[] = []
      vi.spyOn(console, 'error').mockImplementation((message: unknown) => {
        messages.push(String(message))
      })
      const withUnknown = flexCompatClassName(widened({ gap: 8, $tall: { gap: 99 } }))
      expect(withUnknown).toBe(flexCompatClassName({ gap: 8 }))
      flexCompatClassName(widened({ gap: 8, $tall: { gap: 99 } }))
      expect(messages).toHaveLength(1)
      expect(messages[0]).toContain('unknown media prop "$tall"')
      // Development semantics throw again (removing the guard fails this pair).
      mockNodeEnv(NodeEnv.Development)
      expect(() => flexCompatClassName(widened({ gap: 8, $tall: { gap: 99 } }))).toThrow()
    })
  })
})
