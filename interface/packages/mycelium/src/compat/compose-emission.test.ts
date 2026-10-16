/**
 * The strict emission path (INFRA-3217): values outside the closed class set
 * swap to safelisted var-indirection twins reading inline `--c*` custom
 * properties — in the base tier AND, per the round-2 CSS ruling, under every
 * reachable variant prefix (token values included: the variant tiers carry
 * no per-value enumeration). The probe tables from the review rounds (dead
 * classes, precedence flips, shorthand collisions, raw-path renders,
 * container-name, the composite-axis cases) are pinned here, plus the
 * development-semantics throw gate and the bounded production warn set.
 */
import { getConfig, NodeEnv, type BaseConfig } from '@universe/config'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { filterSelectCardEmission } from '../filter-select-compat/compile'
import { flexCompatEmission } from '../flex-compat/compile'
import type { FlexCompatProps } from '../flex-compat/props'
import {
  dropdownMenuSheetItemFrameEmission,
  dropdownMenuSheetItemLabelEmission,
  menuContentContainerEmission,
} from '../menu-compat/compile'
import { textCompatEmission } from '../text-compat/compile'
import { touchableAreaCompatEmission } from '../touchable-area/compile'
import { resetOutOfSetWarnings } from './compose'
import { decodeFixture } from './emitted-classes'
import { decodeArbitraryValue } from './inline-style'

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

describe('composeCompatEmission — inline-value lane (var-indirection)', () => {
  it('ships the #37844 arbitrary numerics as var twins + custom properties, not dead classes', () => {
    const minWidth = flexCompatEmission({ minWidth: 180 })
    expect(minWidth.className).not.toContain('min-w-[180px]')
    expect(minWidth.className).toContain('min-w-[var(--c-min-w)]')
    expect(minWidth.style).toEqual({ '--c-min-w': '180px' })

    const margin = flexCompatEmission({ my: 10 })
    expect(margin.className).not.toContain('my-[10px]')
    expect(margin.className).toContain('my-[var(--c-my)]')
    expect(margin.style).toEqual({ '--c-my': '10px' })

    const weight = textCompatEmission({ fontWeight: 500 })
    expect(weight.className).not.toContain('[font-weight:500]')
    expect(weight.className).toContain('[font-weight:var(--c-fowe)]')
    expect(weight.style).toMatchObject({ '--c-fowe': '500' })
  })

  it('keeps base-tier token/enum values as classes with no style lane', () => {
    const emission = flexCompatEmission({
      gap: '$spacing28',
      mt: '$spacing12',
      minWidth: 24,
      height: 36,
      py: 40,
      pt: 2,
      backgroundColor: '$surface2',
      alignItems: 'center',
    })
    for (const cls of [
      'gap-[28px]',
      'mt-[12px]',
      'min-w-[24px]',
      'h-[36px]',
      'py-[40px]',
      'pt-[2px]',
      'bg-surface2',
      'items-center',
    ]) {
      expect(emission.className, cls).toContain(cls)
    }
    expect(emission.style).toBeUndefined()
  })

  it('emits the overscroll-behavior family enumerated and WebkitMaskImage as a var twin (INFRA-3673)', () => {
    // The INFRA-3166 chips-scroller shape: enumerated values stay exact classes.
    const overscroll = flexCompatEmission({ '$platform-web': { overscrollBehaviorX: 'none' } })
    expect(overscroll.className).toContain('[overscroll-behavior-x:none]')
    expect(overscroll.style).toBeUndefined()

    const shorthand = flexCompatEmission({ overscrollBehavior: 'contain', overscrollBehaviorY: 'auto' })
    // Asserts both classes ship, not which wins the cascade — tailwind-merge doesn't dedupe this shorthand/longhand pair (a pre-existing long-tail characteristic; Tailwind's utility sort decides).
    expect(shorthand.className).toContain('[overscroll-behavior:contain]')
    expect(shorthand.className).toContain('[overscroll-behavior-y:auto]')

    // Open value domain: rides the base var twin, value verbatim on the style lane.
    const mask = flexCompatEmission({ WebkitMaskImage: 'linear-gradient(to left, black 80%, transparent)' })
    expect(mask.className).toContain('[-webkit-mask-image:var(--c-wmi)]')
    expect(mask.style).toEqual({ '--c-wmi': 'linear-gradient(to left, black 80%, transparent)' })
  })

  it('emits textAlign under $platform-web on non-Text primitives (INFRA-3673 folded-in scope)', () => {
    // The INFRA-3143 blocked-call-site shape: centers text children via CSS
    // inheritance. Only reachable under `$platform-web` — `InheritedTextStyleProps`
    // widens that pool specifically, not Flex's top-level surface (RN has no
    // cascade, so a top-level cross-platform prop would mislead on native).
    const flex = flexCompatEmission({ '$platform-web': { textAlign: 'center' } })
    expect(flex.className).toContain('text-center')
    expect(flex.style).toBeUndefined()

    // TouchableArea inherits this for free: its compiler delegates to
    // `flexStyleClasses` for the shared surface.
    const touchable = touchableAreaCompatEmission({ '$platform-web': { textAlign: 'center' } })
    expect(touchable.className).toContain('text-center')

    // Reuses Text's own enum/class pairing byte-for-byte — already in the
    // closed-set base tier via Text, so no new safelist entries.
    const justify = flexCompatEmission({ '$platform-web': { textAlign: 'justify' } })
    expect(justify.className).toContain('text-justify')
  })

  it('rides the batch-one media payload on variant twins (the media tier has no per-value enumeration)', () => {
    const emission = flexCompatEmission({ $md: { flexDirection: 'column', alignItems: 'stretch', gap: 16 } })
    expect(emission.className).toContain('media-md:[flex-direction:var(--cE-fd)]')
    expect(emission.className).toContain('media-md:[align-items:var(--cE-ai)]')
    expect(emission.className).toContain('media-md:gap-[var(--cE-gap)]')
    expect(emission.className).not.toContain('media-md:flex-col')
    expect(emission.style).toEqual({ '--cE-fd': 'column', '--cE-ai': 'stretch', '--cE-gap': '16px' })
  })

  it('converts raw colors and long-tail values in the base pool to var twins', () => {
    const emission = flexCompatEmission({
      backgroundColor: 'rgba(0,0,0,0.5)',
      width: '85%',
      aspectRatio: 2,
      transform: 'translateX(3px) rotate(2deg)',
    })
    expect(emission.className).toContain('bg-[color:var(--c-bg)]')
    expect(emission.className).toContain('w-[var(--c-w)]')
    expect(emission.style).toEqual({
      '--c-bg': 'rgba(0,0,0,0.5)',
      '--c-w': '85%',
      '--c-ar': '2',
      '--c-tr': 'translateX(3px) rotate(2deg)',
    })
  })

  it('long-tail color tokens ride safelisted var twins on web — the rule ships, the color paints (INFRA-3339)', () => {
    // The raw compiler emits the runtime-composed ⟦border-top-color¦var(--neutral2)⟧
    // — invisible to Tailwind's static scanner (and pinned bundle-ABSENT for the
    // NATIVE scan in the tailwind parity package's BUNDLE_ABSENT_COLOR_UTILITIES,
    // which is why every class string here is encoded: this test file is inside
    // the harness's scanned tree). The emission path swaps it for the safelisted
    // twin — compat-classes.gen.txt carries ⟦border-top-color¦var(--c-btc)⟧ — so
    // a real web bundle DOES ship the rule and the color paints.
    const emission = flexCompatEmission({ borderTopColor: '$neutral2', caretColor: '$accent1' })
    expect(emission.className).not.toContain(decodeFixture('⟦border-top-color¦var(--neutral2)⟧'))
    expect(emission.className).toContain(decodeFixture('⟦border-top-color¦var(--c-btc)⟧'))
    expect(emission.className).not.toContain(decodeFixture('⟦caret-color¦var(--accent1)⟧'))
    expect(emission.className).toContain(decodeFixture('⟦caret-color¦var(--c-cc)⟧'))
    expect(emission.style).toEqual({ '--c-btc': 'var(--neutral2)', '--c-cc': 'var(--accent1)' })

    // outline-color twins are enumerated per token in the family safelist, so
    // that one keeps its exact class with no inline lane.
    const outline = flexCompatEmission({ outlineColor: '$accent1' })
    expect(outline.className).toContain(decodeFixture('⟦outline-color¦var(--accent1)⟧'))
    expect(outline.style).toBeUndefined()
  })

  it('a later pool class re-owns a surface an earlier pool inlined (custom property pruned)', () => {
    const emission = flexCompatEmission({ width: 180, '$platform-web': { width: '$spacing16' } })
    expect(emission.className).toContain('w-[16px]')
    expect(emission.className).not.toContain('w-[var(--c-w)]')
    expect(emission.style).toBeUndefined()
  })

  it('user className passthrough is untouched', () => {
    const emission = flexCompatEmission({ minWidth: 180, className: 'custom-marker' })
    expect(emission.className).toContain('custom-marker')
  })
})

describe('composeCompatEmission — legacy cascade parity (review probes)', () => {
  it('a variant twin over an inlined base surface works like legacy (hover is NOT dead)', () => {
    const emission = flexCompatEmission({
      backgroundColor: 'rgba(0,0,0,0.5)',
      hoverStyle: { backgroundColor: '$surface2' },
    })
    expect(emission.className).toContain('bg-[color:var(--c-bg)]')
    expect(emission.className).toContain('hover:bg-[color:var(--ch-bg)]')
    expect(emission.style).toEqual({ '--c-bg': 'rgba(0,0,0,0.5)', '--ch-bg': 'var(--surface2)' })
  })

  it('$platform-web precedence matches legacy (token class wins over raw base color)', () => {
    const emission = flexCompatEmission({
      backgroundColor: 'rgba(0,0,0,0.5)',
      '$platform-web': { backgroundColor: '$surface2' },
    })
    expect(emission.className).toContain('bg-surface2')
    expect(emission.className).not.toContain('bg-[color:var(--c-bg)]')
    expect(emission.style).toBeUndefined()
  })

  it('forceStyle precedence matches legacy', () => {
    const emission = flexCompatEmission({
      backgroundColor: 'rgba(0,0,0,0.5)',
      forceStyle: 'hover',
      hoverStyle: { backgroundColor: '$surface2' },
    })
    expect(emission.className).toContain('bg-surface2')
    expect(emission.className).not.toContain('bg-[color:var(--c-bg)]')
  })

  it('shorthand/longhand collisions keep both surfaces, like legacy classes', () => {
    // {m:7, mt:'$spacing12'} — legacy rendered 12px on top (mt beats m in the
    // stylesheet); the var twin keeps that cascade because it IS the m utility.
    const marginTop = flexCompatEmission({ m: 7, mt: '$spacing12' })
    expect(marginTop.className).toContain('m-[var(--c-m)]')
    expect(marginTop.className).toContain('mt-[12px]')
    expect(marginTop.style).toEqual({ '--c-m': '7px' })

    const paddingTop = flexCompatEmission({ p: 7, pt: '$spacing12' })
    expect(paddingTop.className).toContain('p-[var(--c-p)]')
    expect(paddingTop.className).toContain('pt-[12px]')

    // Media-tier longhands ride the media twins now — same cascade shape.
    const mediaMt = flexCompatEmission({ my: 10, $md: { mt: '$spacing12' } })
    expect(mediaMt.className).toContain('my-[var(--c-my)]')
    expect(mediaMt.className).toContain('media-md:mt-[var(--cE-mt)]')
    expect(mediaMt.style).toMatchObject({ '--c-my': '10px', '--cE-mt': '12px' })
  })

  it('themed color pairs collapse to one auto-switching twin under variants', () => {
    const emission = flexCompatEmission({ hoverStyle: { backgroundColor: '$surface1Hovered' } })
    expect(emission.className).toContain('hover:bg-[color:var(--ch-bg)]')
    // The dark: sibling is redundant (the --surface1-hovered var theme-switches) and dropped.
    expect(emission.className).not.toContain('dark:bg-surface1-hovered-dark')
    expect(emission.style).toEqual({ '--ch-bg': 'var(--surface1-hovered)' })
  })

  it('the base tier keeps the enumerated themed pair (byte-stable base behavior)', () => {
    const emission = flexCompatEmission({ backgroundColor: '$surface1Hovered' })
    expect(emission.className).toContain('bg-surface1-hovered')
    expect(emission.className).toContain('dark:bg-surface1-hovered-dark')
    expect(emission.style).toBeUndefined()
  })

  it('rides a dynamic fontSize token outside the font size map on the length twin — inherited size, like the legacy pass-through', () => {
    // fontSize tokens resolve per font family: $subHeading defines only
    // small/large/true, so a dynamic override token from a legacy call site
    // resolves in neither system. Legacy web passed the literal token through
    // and the browser discarded the declaration (inherited size); the
    // emission must ride the same pass-through on the safelisted length twin
    // — the non-length var() value is invalid at computed-value time, so
    // font-size inherits — instead of throwing mid-render. Every asserted
    // class is fixture-encoded so the scanners never see a raw `$` candidate.
    const dynamicOverride = ['$micro', '$small'][0] as string
    const emission = textCompatEmission({ variant: 'subheading2', fontSize: dynamicOverride })
    expect(emission.className).not.toContain(decodeFixture('text-⟦$micro⟧'))
    expect(emission.className).toContain(decodeFixture('text-⟦length:var(--c-text)⟧'))
    // The variant's own size class yields, exactly like the legacy style merge.
    expect(emission.className).not.toContain(decodeFixture('text-⟦16px⟧'))
    expect(emission.style).toEqual({ '--c-text': '$micro' })

    // The other branch of the same dynamic call site stays a resolved class.
    const resolved = textCompatEmission({ variant: 'subheading2', fontSize: '$small' })
    expect(resolved.className).toContain(decodeFixture('text-⟦16px⟧'))
    expect(resolved.style).toBeUndefined()
  })
})

describe('composeCompatEmission — the composite axis rides the var lane (round-2 ruling)', () => {
  it('token values under every pseudo pool ride the pseudo twins', () => {
    const cases: [FlexCompatProps, string, Record<string, string>][] = [
      [{ hoverStyle: { gap: '$spacing8' } }, 'hover:gap-[var(--ch-gap)]', { '--ch-gap': '8px' }],
      [{ hoverStyle: { p: '$spacing8' } }, 'hover:p-[var(--ch-p)]', { '--ch-p': '8px' }],
      [{ hoverStyle: { flexDirection: 'row' } }, 'hover:[flex-direction:var(--ch-fd)]', { '--ch-fd': 'row' }],
      [{ pressStyle: { width: '$spacing40' } }, 'active:w-[var(--ca-w)]', { '--ca-w': '40px' }],
      [{ '$group-hover': { display: 'flex' } }, 'group-hover:[display:var(--cgh-di)]', { '--cgh-di': 'flex' }],
      [{ '$theme-dark': { gap: '$spacing8' } }, 'dark:gap-[var(--ck-gap)]', { '--ck-gap': '8px' }],
      [{ focusStyle: { borderWidth: 0 } }, 'focus:border-[length:var(--cf-border)]', { '--cf-border': '0px' }],
    ]
    for (const [props, cls, style] of cases) {
      const emission = flexCompatEmission(props as never)
      expect(emission.className, cls).toContain(cls)
      expect(emission.style, cls).toMatchObject(style)
    }
  })

  it('cursor rides the twin under every pseudo pool (the disabledStyle cursor crash class)', () => {
    for (const [pool, code] of [
      ['hoverStyle', 'h'],
      ['pressStyle', 'a'],
      ['focusStyle', 'f'],
      ['focusVisibleStyle', 'v'],
      ['focusWithinStyle', 'w'],
      ['disabledStyle', 'd'],
    ] as const) {
      const pointer = flexCompatEmission({ [pool]: { cursor: 'default' } })
      expect(pointer.className, pool).toContain(`[cursor:var(--c${code}-c)]`)
      expect(pointer.style, pool).toMatchObject({ [`--c${code}-c`]: 'default' })
    }
  })

  it('media × pseudo composites ride the composite twins — the round-2 probe list, by execution', () => {
    const hoverGap = flexCompatEmission({ $md: { hoverStyle: { gap: '$spacing8' } } })
    expect(hoverGap.className).toContain('media-md:hover:gap-[var(--cEh-gap)]')
    expect(hoverGap.style).toEqual({ '--cEh-gap': '8px' })

    const hoverBg = flexCompatEmission({ $md: { hoverStyle: { backgroundColor: '$surface2' } } })
    expect(hoverBg.className).toContain('media-md:hover:bg-[color:var(--cEh-bg)]')

    const active = flexCompatEmission({ $md: { pressStyle: { opacity: 0.5 } } })
    expect(active.className).toContain('media-md:active:opacity-[var(--cEa-opacity)]')

    // Focus-under-media (0 of 26 enumerated in round 2 — now covered).
    const focus = flexCompatEmission({ $sm: { focusVisibleStyle: { outlineWidth: 1 } } })
    expect(focus.className).toContain('media-sm:focus-visible:[outline-width:var(--cFv-ow)]')
    expect(focus.style).toEqual({ '--cFv-ow': '1px' })
  })

  it('$platform-web nested in a media pool rides the media prefix — never unprefixed (INFRA-3589)', () => {
    // The LaunchFilterBar hold shape. The media prefix must survive: an
    // unprefixed twin would apply unconditionally on web.
    const emission = flexCompatEmission({ $md: { '$platform-web': { overflowX: 'auto' } } })
    expect(emission.className).toContain('media-md:[overflow-x:var(--cE-ox)]')
    expect(emission.className).not.toMatch(/(^|\s)\[overflow-x:/)
    expect(emission.style).toEqual({ '--cE-ox': 'auto' })
  })

  it("nested $platform-web wins conflicts against the media pool's own props (top-level order mirrored)", () => {
    const emission = flexCompatEmission({ $md: { overflowX: 'hidden', '$platform-web': { overflowX: 'auto' } } })
    expect(emission.className).toContain('media-md:[overflow-x:var(--cE-ox)]')
    expect(emission.style).toEqual({ '--cE-ox': 'auto' })
  })

  it('pseudo pools nested in $platform-web nested in media compose the full composite prefix', () => {
    const emission = flexCompatEmission({ $md: { '$platform-web': { hoverStyle: { backgroundColor: '$surface2' } } } })
    expect(emission.className).toContain('media-md:hover:bg-[color:var(--cEh-bg)]')
    expect(emission.style).toEqual({ '--cEh-bg': 'var(--surface2)' })
  })

  it('native platform pools nested in media are accepted and ignored on web, like top level', () => {
    const emission = flexCompatEmission({ $md: { '$platform-native': { overflowX: 'scroll' } } })
    expect(emission.className).not.toContain('overflow-x')
    expect(emission.style).toBeUndefined()
  })

  it('$theme-dark pseudo pools compile instead of silently dropping (emission lane only)', () => {
    const emission = flexCompatEmission({ '$theme-dark': { hoverStyle: { backgroundColor: '$surface2' } } })
    expect(emission.className).toContain('dark:hover:bg-[color:var(--ckh-bg)]')
    expect(emission.style).toEqual({ '--ckh-bg': 'var(--surface2)' })
  })

  it('review blast-radius shapes compile through the twin matrix (filter/boxShadow/borderWidth included)', () => {
    expect(flexCompatEmission({ hoverStyle: { filter: 'brightness(1.1)' } }).className).toContain(
      'hover:[filter:var(--ch-f)]',
    )
    expect(flexCompatEmission({ hoverStyle: { boxShadow: '0 1px 2px red' } }).className).toContain(
      'hover:[box-shadow:var(--ch-bosh)]',
    )
    expect(flexCompatEmission({ $md: { borderWidth: 7 } }).className).toContain(
      'media-md:border-[length:var(--cE-border)]',
    )
    const focusReset = flexCompatEmission({
      focusStyle: { outlineWidth: 0, outlineStyle: 'none', borderWidth: 0, boxShadow: 'none' },
    })
    expect(focusReset.className).toContain('focus:[outline-width:var(--cf-ow)]')
    expect(focusReset.className).toContain('focus:[box-shadow:var(--cf-bosh)]')
  })
})

describe('composeCompatEmission — the open set (unregistered named groups) and throw gating', () => {
  beforeEach(() => {
    mockNodeEnv(NodeEnv.Test)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    resetOutOfSetWarnings()
  })

  it('throws under development semantics for UNREGISTERED named group pools (the documented open set)', () => {
    // Mocked to NodeEnv.Test above — development semantics. `nav` is not in
    // REGISTERED_GROUP_NAMES; registered names ride twins (INFRA-3481).
    expect(() => flexCompatEmission({ '$group-nav-hover': { opacity: 1 } })).toThrow(/group-hover\/nav:opacity-\[1\]/)
    expect(() => flexCompatEmission({ '$group-nav-hover': { opacity: 1 } })).toThrow(/compat-classes\.gen\.txt/)
    expect(() => flexCompatEmission({ '$group-nav-hover': { opacity: 1 } })).toThrow(/REGISTERED_GROUP_NAMES/)
  })

  it('registered named group pools ride name-parameterized twins instead of the throw (INFRA-3481)', () => {
    // The INFRA-3143 repro shape: group="item" reveal via a display flip.
    const reveal = flexCompatEmission({ display: 'none', '$group-item-hover': { display: 'flex' } })
    expect(reveal.className).toContain('hidden')
    expect(reveal.className).toContain('group-hover/item:[display:var(--cghi-di)]')
    expect(reveal.style).toEqual({ '--cghi-di': 'flex' })
    // Every registered name × group state carries its own namespace.
    const press = flexCompatEmission({ '$group-card-press': { opacity: 0.5 } })
    expect(press.className).toContain('group-active/card:opacity-[var(--cgac-opacity)]')
    expect(press.style).toEqual({ '--cgac-opacity': '0.5' })
  })

  it('the throw gates on development semantics, NOT __DEV__: staging/preview/production builds keep-and-warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    for (const mode of ['production', 'staging']) {
      mockNodeEnv(mode)
      const emission = flexCompatEmission({ '$group-nav-hover': { opacity: 0.63 } })
      expect(emission.className, mode).toContain('group-hover/nav:opacity-[0.63]')
    }
    expect(warn).toHaveBeenCalled()
    // Dev server semantics throw again (removing the guard fails this pair).
    mockNodeEnv(NodeEnv.Development)
    expect(() => flexCompatEmission({ '$group-nav-hover': { opacity: 0.63 } })).toThrow()
  })

  it('production warns once per unique class, BOUNDED with a final suppression notice', () => {
    mockNodeEnv(NodeEnv.Production)
    const messages: string[] = []
    vi.spyOn(console, 'warn').mockImplementation((message: unknown) => {
      messages.push(String(message))
    })
    flexCompatEmission({ '$group-nav-hover': { opacity: 0.63 } })
    flexCompatEmission({ '$group-nav-hover': { opacity: 0.63 } })
    expect(messages).toHaveLength(1) // deduped per class
    for (let i = 0; i < 60; i++) {
      flexCompatEmission({ '$group-nav-hover': { opacity: Number((i * 0.011).toFixed(3)) } })
    }
    // 50-class cap + one suppression notice; the 3,000-warning stream from
    // the round-2 measurement is structurally impossible now.
    expect(messages.length).toBeLessThanOrEqual(51)
    expect(messages[messages.length - 1]).toContain('further warnings suppressed')
    // And the dedupe set stopped growing.
    const before = messages.length
    flexCompatEmission({ '$group-nav-hover': { opacity: 0.987 } })
    expect(messages).toHaveLength(before)
  })

  it('exotic long-tail props under variant prefixes stay on the documented dev-throw (curation boundary)', () => {
    // The variant twin matrix is curated (crossing the FULL long tail with
    // all reachable prefixes measures ~323 KB gzip at 102 prefixes vs the
    // ~126 KB target). Adding
    // a prop to VARIANT_TWIN_PROPS + regenerating closes any one of these.
    expect(() => flexCompatEmission({ hoverStyle: { maskImage: 'url(x.png)' } })).toThrow(/hover:\[mask-image/)
  })
})

describe('composeCompatEmission — component fixed classes', () => {
  it('TouchableArea variant defaults compile without inline values or throws', () => {
    for (const variant of ['unstyled', 'none', 'outlined', 'filled', 'raised', 'floating'] as const) {
      const emission = touchableAreaCompatEmission({ variant })
      expect(emission.className).toContain('active:[transform:scale(0.98)]')
      expect(emission.className).toContain('active:opacity-[0.75]')
      // The floating hover fill is a raw rgba pinned from the legacy theme;
      // the frame's backdrop blur is a base-pool arbitrary value — both stay
      // CLASSES because the component's fixed provider safelists them.
      if (variant === 'floating') {
        expect(emission.className).toContain('hover:bg-[rgba(0,0,0,0.06)]')
        expect(emission.className).toContain('[backdrop-filter:blur(12px)]')
        expect(emission.style).toBeUndefined()
      }
    }
  })

  it('non-default container-name rides the inline lane (fixed chunks are membership-checked)', () => {
    const emission = touchableAreaCompatEmission({ group: 'item' })
    expect(emission.className).not.toContain('[container-name:item]')
    expect(emission.className).toContain('[container-name:var(--c-cn)]')
    expect(emission.style).toEqual({ '--c-cn': 'item' })
    expect(emission.className).toContain('group/item')
  })

  it('group markers stay classes (they emit no CSS by design)', () => {
    const emission = flexCompatEmission({ group: 'item' })
    expect(emission.className).toContain('group/item')
  })
})

describe('composeCompatEmission — raw-path components now guarded (review critical 5 + round-2 item 4)', () => {
  it('MenuContent containerStyles maxHeight rides the inline lane', () => {
    const emission = menuContentContainerEmission({ maxHeight: 400 })
    expect(emission.className).not.toContain('max-h-[400px]')
    expect(emission.className).toContain('max-h-[var(--c-max-h)]')
    expect(emission.style).toEqual({ '--c-max-h': '400px' })
    // The defaults stay classes (safelisted by the menu fixed provider).
    expect(emission.className).toContain('min-w-[200px]')
  })

  it('DropdownMenuSheetItem height rides the inline lane', () => {
    const emission = dropdownMenuSheetItemFrameEmission({ variant: 'small', height: 44 })
    expect(emission.className).not.toContain('h-[44px]')
    expect(emission.className).toContain('h-[var(--c-h)]')
    expect(emission.style).toEqual({ '--c-h': '44px' })
  })

  it('DropdownMenuSheetItem textColor rides the inline lane (the round-2 surviving raw path)', () => {
    const emission = dropdownMenuSheetItemLabelEmission({ variant: 'small', textColor: '#ABCDEF' })
    expect(emission.className).not.toContain('[color:#ABCDEF]')
    expect(emission.className).toContain('[color:var(--c-col)]')
    expect(emission.style).toEqual({ '--c-col': '#ABCDEF' })
    // Palette inputs keep their pinned classes and no style lane.
    const pinned = dropdownMenuSheetItemLabelEmission({ variant: 'small', textColor: '$accent1' })
    expect(pinned.className).toContain('[color:var(--stext-accent1)]')
    expect(pinned.style).toBeUndefined()
  })

  it('FilterSelect dropdownStyle width/maxHeight ride the inline lane', () => {
    const emission = filterSelectCardEmission({ maxHeight: 320, width: 280 })
    expect(emission.className).not.toContain('w-[280px]')
    expect(emission.className).not.toContain('max-h-[320px]')
    expect(emission.style).toEqual({ '--c-w': '280px', '--c-max-h': '320px' })
    expect(emission.className).toContain('w-[var(--c-w)]')
    expect(emission.className).toContain('max-h-[var(--c-max-h)]')
  })
})

describe('decodeArbitraryValue', () => {
  it('restores spaces while preserving dashed-ident underscores', () => {
    expect(decodeArbitraryValue('0px_6px_12px_color-mix(in_srgb,var(--surface3)_4%,transparent)')).toBe(
      '0px 6px 12px color-mix(in srgb,var(--surface3) 4%,transparent)',
    )
    expect(decodeArbitraryValue('var(--stext-chain_1)')).toBe('var(--stext-chain_1)')
    expect(decodeArbitraryValue('var(--stext-DEP_accentSoft)')).toBe('var(--stext-DEP_accentSoft)')
    expect(decodeArbitraryValue('a\\_b')).toBe('a_b')
  })

  it('preserves underscores inside url() like real Tailwind', () => {
    expect(decodeArbitraryValue('url(a_b.png)')).toBe('url(a_b.png)')
    expect(decodeArbitraryValue('url(a_b.png)_no-repeat')).toBe('url(a_b.png) no-repeat')
    expect(decodeArbitraryValue('linear-gradient(to_right,red,blue),url(x_y.png)')).toBe(
      'linear-gradient(to right,red,blue),url(x_y.png)',
    )
  })
})
