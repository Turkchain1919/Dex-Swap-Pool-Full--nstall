/**
 * Drift + structure gates for the generated compat class safelist
 * (INFRA-3217): regenerating `packages/mycelium/compat-classes.gen.txt` AND
 * the runtime membership literal must be byte-identical no-ops; the set must
 * keep covering the class families the first app conversion batch (#37844 /
 * INFRA-3175) measured as missing; and the var-indirection twin matrix must
 * hold the conditions the round-2 CSS ruling attached: short custom-property
 * names, an injective per-prefix var namespace (the variant-tier
 * cascade-collision proof), and full prefix coverage.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { flexCompatEmission } from '../flex-compat/compile'
import { textCompatEmission } from '../text-compat/compile'
import { BORDER_WIDTH_PX, compatFamilyClassEntries, compatTwinClassEntries } from './closed-set'
import { compatClassesFileContents, compatClosedSetEntries, familyClassesFileContents } from './closed-set-manifest'
import { compatClosedFamilySet } from './closed-set-runtime'
import {
  BATCH_ONE_BASE_FIXTURE,
  BATCH_ONE_VARIANT_TWINS,
  CURATED_SURFACE_3496_FIXTURE,
  NAMED_GROUP_REVEAL_TWINS,
  POINTER_EVENTS_BOX_POLYFILL,
  PROBE_LEAK_CANARIES,
} from './emitted-classes'
import { REGISTERED_GROUP_NAMES } from './group'
import {
  ARBITRARY_VAR_PROPS,
  arbitraryPropertyVarClass,
  classToInlineStyle,
  DROP_CLASS,
  INLINE_UTILITY_PREFIXES,
  NAMED_GROUP_TWIN_PROPS,
  NAMED_GROUP_TWIN_UTILITIES,
  REACHABLE_VARIANT_PREFIXES,
  twinVarNames,
  VARIANT_TWIN_PROPS,
  variantPrefixCode,
} from './inline-style'
import type { OverflowValue } from './props'
import { ENUM_DECLARATION, ENUM_UTILITY_VALUE, SEMANTIC_COLOR_SUFFIXES, THEMED_TABLES } from './twin-tables'

const GEN_FILE = join(__dirname, '..', '..', 'compat-classes.gen.txt')
const FAMILY_FILE = join(__dirname, 'family-classes.generated.ts')

const INLINE_LANE_CLASSES = ['min-w-[180px]', 'my-[10px]', '[font-weight:500]']

describe('compat closed set', () => {
  it('checked-in compat-classes.gen.txt matches a fresh regeneration byte-for-byte', () => {
    expect(readFileSync(GEN_FILE, 'utf8')).toBe(compatClassesFileContents())
  })

  it('checked-in family-classes.generated.ts (the runtime membership literal) matches byte-for-byte', () => {
    expect(readFileSync(FAMILY_FILE, 'utf8')).toBe(familyClassesFileContents())
    expect([...compatClosedFamilySet()].sort()).toEqual(compatFamilyClassEntries())
  })

  it('covers every base-tier class the first conversion batch measured as missing', () => {
    const entries = new Set(compatClosedSetEntries())
    for (const cls of BATCH_ONE_BASE_FIXTURE) {
      expect(entries, cls).toContain(cls)
    }
  })

  it('safelists the variant twins carrying the batch media-tier cases, and the emission uses them', () => {
    const entries = new Set(compatClosedSetEntries())
    for (const cls of BATCH_ONE_VARIANT_TWINS) {
      expect(entries, cls).toContain(cls)
    }
    // By execution: the batch's $md payload rides exactly those twins.
    const emission = flexCompatEmission({ $md: { flexDirection: 'column', alignItems: 'stretch', gap: 16 } })
    for (const cls of BATCH_ONE_VARIANT_TWINS) {
      expect(emission.className, cls).toContain(cls)
    }
    expect(emission.style).toEqual({ '--cE-fd': 'column', '--cE-ai': 'stretch', '--cE-gap': '16px' })
  })

  // INFRA-3274: border widths are NOT tokenless in the legacy API — space
  // tokens are the common case (326 production call sites at the time of the
  // sweep, $spacing1/$spacing2/$none/$spacing8), and four literal values
  // (0.25 / 1.3 / 1.6, plus token-reached 8) were in use but off the ladder.
  // Off-ladder widths still render via the base var twin, so this pins the
  // static-class path for the in-use set rather than fixing breakage. The
  // pin is an INDEPENDENT literal list: trimming the ladder reds this test
  // instead of shrinking it.
  const PINNED_BORDER_WIDTH_LADDER = [0, 0.25, 0.5, 1, 1.3, 1.5, 1.6, 2, 3, 8]

  it('the border-width ladder pins every in-use value, token-reached or literal (INFRA-3274)', () => {
    expect([...BORDER_WIDTH_PX]).toEqual(PINNED_BORDER_WIDTH_LADDER)
    const entries = new Set(compatClosedSetEntries())
    for (const px of PINNED_BORDER_WIDTH_LADDER) {
      for (const prefix of ['border', 'border-t', 'border-b', 'border-l', 'border-r']) {
        expect(entries, `${prefix}-[${px}px]`).toContain(`${prefix}-[${px}px]`)
      }
    }
    // By execution: the space-token lane (the $spacing8 call site) and the
    // literal lane both land on enumerated classes, no inline var twin.
    const tokenEmission = flexCompatEmission({ borderWidth: '$spacing8' })
    expect(tokenEmission.className).toContain('border-[8px]')
    expect(tokenEmission.style).toBeUndefined()
    const literalEmission = flexCompatEmission({ borderWidth: 1.6 })
    expect(literalEmission.className).toContain('border-[1.6px]')
    expect(literalEmission.style).toBeUndefined()
  })

  // `overflow` is a curated enum prop: the compiler emits `overflow-<value>`
  // for the whole `OverflowValue` union with no var twin to fall back on, so a
  // union member missing from the base pool renders a class no stylesheet
  // carries (`clip` did, on the Explore stocks issuer panel). The
  // `Record<OverflowValue, …>` sweep is exhaustive by TYPECHECK — a new union
  // member reds here until it is enumerated in closed-set.ts and regenerated.
  const OVERFLOW_CLASS: Record<OverflowValue, string> = {
    visible: 'overflow-visible',
    hidden: 'overflow-hidden',
    clip: 'overflow-clip',
    scroll: 'overflow-scroll',
    auto: 'overflow-auto',
    unset: '[overflow:unset]',
  }

  it('compiles every OverflowValue to a base-pool class (exhaustive over the union)', () => {
    const entries = new Set(compatClosedSetEntries())
    for (const [value, cls] of Object.entries(OVERFLOW_CLASS)) {
      expect(entries, cls).toContain(cls)
      // By execution: dev semantics throw on an out-of-set class, so this also
      // pins that no value reaches the reporter.
      expect(flexCompatEmission({ overflow: value as OverflowValue }).className, value).toContain(cls)
    }
  })

  it('keeps arbitrary numerics (the inline-style lane) out of the closed set', () => {
    const entries = new Set(compatClosedSetEntries())
    for (const cls of INLINE_LANE_CLASSES) {
      expect(entries, cls).not.toContain(cls)
    }
  })

  it('keeps the probe-leak canaries out of the set (per-value variant enumeration must not creep back)', () => {
    const entries = new Set(compatClosedSetEntries())
    for (const cls of PROBE_LEAK_CANARIES) {
      expect(entries, cls).not.toContain(cls)
    }
  })

  // INTENTIONAL FLIP of the round-2 assertion that `media-md:hover:gap-[8px]`
  // is ABSENT (closed-set.test.ts:119 @ 579f7b4d, review comment
  // https://github.com/Uniswap/universe/pull/37880#discussion_r3707701166):
  // that green test pinned the composite-axis gap. Per the INFRA-3217 ruling
  // the gap is closed via the var lane, so the VALUE-ENUMERATED class stays
  // out of the set while the composite is covered by a safelisted twin.
  it('covers the composite axis via twins: media × pseudo spacing compiles, no enumerated class', () => {
    const emission = flexCompatEmission({ $md: { hoverStyle: { gap: '$spacing8' } } })
    expect(emission.className).not.toContain('media-md:hover:gap-[8px]')
    expect(emission.className).toContain('media-md:hover:gap-[var(--cEh-gap)]')
    expect(emission.style).toEqual({ '--cEh-gap': '8px' })
    const entries = new Set(compatClosedSetEntries())
    expect(entries).toContain('media-md:hover:gap-[var(--cEh-gap)]')
  })

  it('enumerates the full reachable prefix matrix (utility-twin × variant-prefix)', () => {
    // 6 pseudos + 11 media + 66 media×pseudo + 2 themes + 12 theme×pseudo
    // + 5 unnamed group states + 10 registered named group states (2 names × 5 states, INFRA-3481).
    expect(REACHABLE_VARIANT_PREFIXES).toHaveLength(112)
    const entries = new Set(compatClosedSetEntries())
    for (const prefix of REACHABLE_VARIANT_PREFIXES) {
      const code = variantPrefixCode(prefix)
      expect(code, prefix).toBeDefined()
      expect(entries, prefix).toContain(`${prefix}:bg-[color:var(--c${code}-bg)]`)
      if (prefix.includes('/')) {
        // Named group prefixes carry the curated named-group row (INFRA-3481).
        expect(entries, prefix).toContain(`${prefix}:[display:var(--c${code}-di)]`)
        expect(entries, prefix).toContain(`${prefix}:opacity-[var(--c${code}-opacity)]`)
        expect(entries, prefix).toContain(`${prefix}:[cursor:var(--c${code}-c)]`)
        expect(entries, prefix).not.toContain(`${prefix}:gap-[var(--c${code}-gap)]`)
        continue
      }
      expect(entries, prefix).toContain(`${prefix}:gap-[var(--c${code}-gap)]`)
      expect(entries, prefix).toContain(`${prefix}:[cursor:var(--c${code}-c)]`)
    }
  })

  it('registered named group prefixes carry a twin namespace; unregistered names stay the open set (INFRA-3481)', () => {
    expect(variantPrefixCode('group-hover/item')).toBe('ghi')
    expect(variantPrefixCode('group-active/item')).toBe('gai')
    expect(variantPrefixCode('group-hover/card')).toBe('ghc')
    expect(variantPrefixCode('group-active/nav')).toBeUndefined()
    expect(variantPrefixCode('group-hover/unregistered')).toBeUndefined()
    // A slash alone is not a namespace: only group-state variants take names.
    expect(variantPrefixCode('hover/item')).toBeUndefined()
  })

  it('REGISTERED_GROUP_NAMES codes are unique — a reused letter would merge two var namespaces (INFRA-3481)', () => {
    // The injectivity walk below would also trip on the composed prefixes,
    // but pin the root cause directly: `twinVarNames` builds a Map, so a
    // collision VANISHES there instead of failing loudly.
    const codes = Object.values(REGISTERED_GROUP_NAMES)
    expect(new Set(codes).size).toBe(codes.length)
  })

  // INFRA-3481 regression pin: the named-group reveal twins must stay in the
  // generated safelist. Before this fix the manifest had ZERO
  // name-parameterized group entries, so `group="item"` + `$group-item-hover`
  // display reveals rendered a class with no rule in any built stylesheet —
  // a silent no-op every CI gate missed (INFRA-3143). The fixture is an
  // independent literal list, so emptying REGISTERED_GROUP_NAMES (or trimming
  // the twin matrix) reds this pin instead of shrinking it.
  it('safelists the named-group reveal twins, and the emission uses them (INFRA-3481)', () => {
    const entries = new Set(compatClosedSetEntries())
    for (const cls of NAMED_GROUP_REVEAL_TWINS) {
      expect(entries, cls).toContain(cls)
    }
    // By execution: the HookCard/HookSearchModal reveal shape.
    const emission = flexCompatEmission({ display: 'none', '$group-item-hover': { display: 'flex' } })
    expect(emission.className).toContain('hidden')
    expect(emission.className).toContain('group-hover/item:[display:var(--cghi-di)]')
    expect(emission.style).toEqual({ '--cghi-di': 'flex' })
  })

  // Regression pin for INFRA-3490: the RN-only pointerEvents values used to
  // pass through the long-tail lane as CSS values — `pointer-events: box-none`
  // is invalid CSS, the browser dropped it (on the emission path, the base
  // var twin shipped `--c-pe: box-none`, invalid at computed-value time), and
  // a converted overlay silently blocked every click underneath. The fixture
  // is an independent literal list: trimming POINTER_EVENTS_BOX_CLASSES or
  // the closed-set family reds this pin instead of shrinking it.
  it('safelists the pointerEvents box-none/box-only polyfill pair, and the emission uses it (INFRA-3490)', () => {
    const entries = new Set(compatClosedSetEntries())
    for (const cls of POINTER_EVENTS_BOX_POLYFILL) {
      expect(entries, cls).toContain(cls)
    }
    // By execution: the INFRA-3102 QuickSelectDefaultTokenOptions overlay
    // shape — element pointer-events none, direct children re-enabled, no
    // inline lane (both classes are enumerated, never twinned).
    const boxNone = flexCompatEmission({ pointerEvents: 'box-none' })
    expect(boxNone.className).toContain('[pointer-events:none]')
    expect(boxNone.className).toContain('[&>*]:[pointer-events:auto]')
    expect(boxNone.className).not.toContain('var(--c-pe)')
    expect(boxNone.style).toBeUndefined()
    const boxOnly = flexCompatEmission({ pointerEvents: 'box-only' })
    expect(boxOnly.className).toContain('[pointer-events:auto]')
    expect(boxOnly.className).toContain('[&>*]:[pointer-events:none]')
    expect(boxOnly.style).toBeUndefined()
    // Plain CSS values keep the generic long-tail path.
    expect(flexCompatEmission({ pointerEvents: 'none' }).className).toContain('[pointer-events:none]')
    // Under variant prefixes the children half has no var twin (a child
    // combinator cannot ride the inline custom-property lane), so a
    // variant-scoped box value DEV-THROWS instead of silently shipping the
    // pre-INFRA-3490 invalid twin value.
    expect(() => flexCompatEmission({ hoverStyle: { pointerEvents: 'box-none' } })).toThrow(/pointer-events/)
  })

  // The INFRA-2962 P6-P8 curated-surface escalations, filed as INFRA-3496:
  // legacy Tamagui passed these through and the curated unions/maps did not,
  // holding DisplayNameText.tsx and the BridgedAsset batch. Enumerated values
  // (never a widening to string); the fixture is an independent literal list.
  it('safelists the P6-P8 curated-surface classes, and the emissions stay inline-free (INFRA-3496)', () => {
    const entries = new Set(compatClosedSetEntries())
    for (const cls of CURATED_SURFACE_3496_FIXTURE) {
      expect(entries, cls).toContain(cls)
    }
    // By execution: the held call sites' shapes, each fully static (no
    // inline var lane needed for enumerated base-tier values).
    const cases = [
      {
        name: 'whiteSpace initial (DisplayNameText)',
        emission: textCompatEmission({ whiteSpace: 'initial' }),
        cls: '[white-space:initial]',
      },
      {
        name: 'whiteSpace wrap (BridgedAsset)',
        emission: textCompatEmission({ whiteSpace: 'wrap' }),
        cls: '[white-space:wrap]',
      },
      { name: 'Flex display grid', emission: flexCompatEmission({ display: 'grid' }), cls: 'grid' },
      {
        name: 'Text display inline-grid',
        emission: textCompatEmission({ display: 'inline-grid' }),
        cls: '[display:inline-grid]',
      },
      {
        name: 'overflowWrap anywhere (StandardTypedDataContent)',
        emission: textCompatEmission({ '$platform-web': { overflowWrap: 'anywhere' } }),
        cls: '[overflow-wrap:anywhere]',
      },
      {
        name: 'textDecoration none (PositionsHeroHeader)',
        emission: textCompatEmission({ '$platform-web': { textDecoration: 'none' } }),
        cls: '[text-decoration:none]',
      },
    ]
    for (const { name, emission, cls } of cases) {
      expect(emission.className, name).toContain(cls)
      expect(emission.style, name).toBeUndefined()
    }
    // The frame defaults lose to the pool values in the merge — without the
    // cn() whitespace/wrap groups these pairs both survive and the
    // arbitrary-property rule sorts BEFORE the utility it must override.
    expect(textCompatEmission({ whiteSpace: 'wrap' }).className).not.toContain('whitespace-pre-wrap')
    expect(textCompatEmission({ '$platform-web': { overflowWrap: 'anywhere' } }).className).not.toContain(
      '[word-wrap:break-word]',
    )
  })

  // Ruling condition 1: SHORT custom-property names, pinned by a gate.
  // Holding the shipped property set constant, descriptive names cost
  // +2.4% gzip (round-3 review) — the earlier 347 KB figure conflated
  // naming with the full property long tail. Short names are kept as a
  // debuggability tradeoff per the reviewer's call; this gate pins the
  // choice so it cannot drift silently.
  it('pins the short var-name discipline: every twin var is unique and ≤ 15 chars', () => {
    const names = twinVarNames()
    expect(names.size).toBeGreaterThan(0)
    for (const [name, { prefix, key }] of names) {
      // `--c` + ≤3-char prefix code + `-` + ≤8-char key (utilities keep their
      // names). The 3-char codes are the named group states (INFRA-3481).
      expect(name.length, `${name} (${prefix})`).toBeLessThanOrEqual(15)
      expect(key.length, name).toBeLessThanOrEqual(8)
    }
  })

  // Ruling condition 2: the cascade-collision proof for the variant twins —
  // a twin under prefix P reads ONLY P's namespace, so no variant twin can
  // consume a base custom property (and vice versa). Injectivity of the
  // prefix-code map makes cross-tier collisions structurally impossible.
  it('proves the variant-twin namespaces collision-free: prefix→code is injective over all reachable prefixes', () => {
    const codes = new Map<string, string>()
    for (const prefix of ['', ...REACHABLE_VARIANT_PREFIXES]) {
      const code = variantPrefixCode(prefix) as string
      expect(codes.has(code), `${prefix} vs ${codes.get(code)}`).toBe(false)
      codes.set(code, prefix)
    }
    // And every generated twin class references exactly its own namespace.
    for (const cls of compatTwinClassEntries()) {
      const variantEnd = cls.lastIndexOf(':', cls.indexOf('[') === -1 ? undefined : cls.indexOf('['))
      const prefix = cls.startsWith('[') || !cls.includes(':') ? '' : cls.slice(0, Math.max(variantEnd, 0))
      const expectedCode = variantPrefixCode(prefix)
      const match = /var\(--c([A-Za-z]*)-/.exec(cls)
      expect(match, cls).not.toBeNull()
      expect(match?.[1], cls).toBe(expectedCode)
    }
  })

  it('keeps a sane floor so a gutted generator cannot pass silently', () => {
    // ~9.6k after the round-3 var-lane pivot (down from 30.5k enumerated).
    expect(compatClosedSetEntries().length).toBeGreaterThanOrEqual(9_000)
  })

  // ── Round-3 item 4: the variant-twin invariant, gated from both directions.
  //
  // A conversion path that emits a variant class for a property outside
  // VARIANT_TWIN_PROPS ships a class the stylesheet never carries — the exact
  // outcome this PR exists to prevent. Two halves make tampering red:
  //
  //  (a) SOUNDNESS — every conversion `classToInlineStyle` can return, across
  //      ALL paths (enum, enum-utility, themed, semantic-color, outline,
  //      arbitrary-property, bracketed-utility) and every reachable prefix,
  //      must be a class present in the generated safelist. Removing a gate
  //      from a conversion path fails here after regeneration.
  //  (b) COMPLETENESS — every class the compilers' own conversion tables can
  //      emit is emitter-reachable under every pseudo/media/theme pool, so
  //      each must still HAVE a conversion there. Trimming a table-reachable
  //      prop (e.g. `overflow`) out of VARIANT_TWIN_PROPS fails here
  //      immediately, before any regeneration.

  const conversionTableClasses = (): string[] => [
    ...ENUM_DECLARATION.keys(),
    ...ENUM_UTILITY_VALUE.keys(),
    ...THEMED_TABLES.rewrite.keys(),
    ...[...SEMANTIC_COLOR_SUFFIXES].flatMap((suffix) => [`bg-${suffix}`, `border-${suffix}`]),
  ]

  it('soundness: every conversion any path can return is in the safelist, under every reachable prefix', () => {
    const entries = new Set(compatClosedSetEntries())
    const domain = [
      ...conversionTableClasses(),
      ...ARBITRARY_VAR_PROPS.map((prop) => `[${prop}:0]`),
      ...INLINE_UTILITY_PREFIXES.map((util) => `${util}-[7px]`),
      ...['red]'].map((value) => `border-[${value}`), // the color-shape border twin
    ]
    for (const prefix of ['', ...REACHABLE_VARIANT_PREFIXES]) {
      for (const cls of domain) {
        const conversion = classToInlineStyle(cls, prefix)
        if (conversion === undefined || conversion === DROP_CLASS) {
          continue // no twin (documented open set / curation boundary) or a dropped themed sibling
        }
        expect(entries.has(conversion.varClass), `${cls} @ "${prefix}" → ${conversion.varClass}`).toBe(true)
      }
    }
  })

  it('completeness: every table-emittable class converts under every reachable non-named prefix', () => {
    for (const prefix of REACHABLE_VARIANT_PREFIXES.filter((p) => !p.includes('/'))) {
      for (const cls of conversionTableClasses()) {
        expect(classToInlineStyle(cls, prefix), `${cls} @ "${prefix}"`).toBeDefined()
      }
    }
  })

  // INFRA-3481: the named-group tier is curated one step further than the
  // variant tier (the full row × 10 named prefixes measures +13 KB gzip on
  // the synthetic compile — over the apps/web CSS budget; the curated row
  // measures ~1.2 KB). Pinned from INDEPENDENT literal lists in both
  // directions, like the variant tier's 44-prop pin below.
  const PINNED_NAMED_GROUP_TWIN_PROPS = ['display', 'color', 'transform', 'filter', 'cursor']
  const PINNED_NAMED_GROUP_TWIN_UTILITIES = ['opacity', 'bg', 'border']

  it('the named-group tier converts exactly the pinned curated surface, under every registered named prefix', () => {
    expect([...NAMED_GROUP_TWIN_PROPS].sort()).toEqual([...PINNED_NAMED_GROUP_TWIN_PROPS].sort())
    expect([...NAMED_GROUP_TWIN_UTILITIES].sort()).toEqual([...PINNED_NAMED_GROUP_TWIN_UTILITIES].sort())
    const pinnedProps = new Set(PINNED_NAMED_GROUP_TWIN_PROPS)
    const pinnedUtils = new Set(PINNED_NAMED_GROUP_TWIN_UTILITIES)
    const entries = new Set(compatClosedSetEntries())
    for (const prefix of REACHABLE_VARIANT_PREFIXES.filter((p) => p.includes('/'))) {
      for (const prop of ARBITRARY_VAR_PROPS) {
        const conversion = classToInlineStyle(`[${prop}:0]`, prefix)
        if (pinnedProps.has(prop)) {
          expect(conversion, `${prop} @ "${prefix}" must convert (pinned named-group prop)`).toBeDefined()
          expect(entries.has((conversion as { varClass: string }).varClass), `${prop} @ "${prefix}"`).toBe(true)
        } else {
          expect(conversion, `${prop} @ "${prefix}" is outside the named-group tier`).toBeUndefined()
        }
      }
      for (const util of INLINE_UTILITY_PREFIXES) {
        const conversion = classToInlineStyle(`${util}-[7px]`, prefix)
        if (pinnedUtils.has(util)) {
          expect(conversion, `${util} @ "${prefix}" must convert (pinned named-group utility)`).toBeDefined()
        } else {
          expect(conversion, `${util} @ "${prefix}" is outside the named-group tier`).toBeUndefined()
        }
      }
      // The color tables stay complete under the named tier: semantic +
      // themed colors all convert through the bg/border/bdc twins.
      for (const cls of [...SEMANTIC_COLOR_SUFFIXES].flatMap((suffix) => [`bg-${suffix}`, `border-${suffix}`])) {
        expect(classToInlineStyle(cls, prefix), `${cls} @ "${prefix}"`).toBeDefined()
      }
      for (const [cls, entry] of THEMED_TABLES.rewrite) {
        const conversion = classToInlineStyle(cls, prefix)
        if (entry.kind === 'outline') {
          expect(conversion, `${cls} @ "${prefix}" (outline is outside the named-group tier)`).toBeUndefined()
        } else {
          expect(conversion, `${cls} @ "${prefix}"`).toBeDefined()
        }
      }
    }
  })

  // ── Round-4 review: the completeness test above only reaches the 16 twin
  // props the conversion TABLES emit; `word-wrap` / `-webkit-box-orient`
  // (arbitrary-property-only surfaces) could be trimmed from
  // VARIANT_TWIN_PROPS with the whole suite green. The pin below covers all
  // 46 uniformly, from an INDEPENDENT literal list — building the domain
  // from VARIANT_TWIN_PROPS itself would shrink with the mutation and stay
  // vacuously green.
  const PINNED_VARIANT_TWIN_PROPS = [
    'flex-direction',
    'align-items',
    'align-self',
    'justify-content',
    'flex-wrap',
    'display',
    'position',
    'overflow',
    'overflow-x',
    'overflow-y',
    'line-height',
    'font-weight',
    'font-family',
    'font-style',
    'letter-spacing',
    'text-align',
    'text-transform',
    'text-decoration-line',
    'text-decoration-color',
    'white-space',
    'text-overflow',
    'word-wrap',
    'word-break',
    'color',
    'background-color',
    'background',
    'border-color',
    'border-bottom-color',
    'border-top-color',
    'border-left-color',
    'border-right-color',
    'cursor',
    'pointer-events',
    'user-select',
    'transition',
    'transform',
    'box-shadow',
    'filter',
    'outline-color',
    'outline-width',
    'outline-offset',
    'outline-style',
    '-webkit-line-clamp',
    '-webkit-box-orient',
    'border-style',
    'grid-template-columns',
    'scrollbar-width',
  ]

  it('completeness over the full arbitrary-property surface: exactly the pinned 46 twin props convert under variants', () => {
    // The pinned list and the shipped list must agree in both directions, so
    // a silent trim (or an undocumented addition) reds here even after a
    // byte-clean regeneration.
    expect([...VARIANT_TWIN_PROPS].sort()).toEqual([...PINNED_VARIANT_TWIN_PROPS].sort())
    // Every pinned prop must be an ARBITRARY_VAR_PROPS member — the loop
    // below walks the independent superset, so a pinned prop outside it
    // would silently skip its own check.
    const arbitraryProps = new Set(ARBITRARY_VAR_PROPS)
    for (const prop of PINNED_VARIANT_TWIN_PROPS) {
      expect(arbitraryProps.has(prop), prop).toBe(true)
    }
    const pinned = new Set(PINNED_VARIANT_TWIN_PROPS)
    // Named group prefixes carry their own, narrower tier — pinned by the
    // named-group test above (INFRA-3481).
    for (const prefix of REACHABLE_VARIANT_PREFIXES.filter((p) => !p.includes('/'))) {
      for (const prop of ARBITRARY_VAR_PROPS) {
        const conversion = classToInlineStyle(`[${prop}:0]`, prefix)
        if (pinned.has(prop)) {
          expect(conversion, `${prop} @ "${prefix}" must convert (pinned twin prop)`).toBeDefined()
        } else {
          // Outside the curated set: dev-throw semantics, one table entry +
          // regeneration away (see inline-style.ts VARIANT_TWIN_PROPS docs).
          expect(conversion, `${prop} @ "${prefix}" is outside the pinned set`).toBeUndefined()
        }
      }
    }
  })

  // ── Round-4 review: reverting either variant gate (enum path /
  // themed-outline path) left the suite green because every gated prop is in
  // VARIANT_TWIN_PROPS today. Pin each gate directly via the injectable
  // twin-prop set: a prop OUTSIDE the set must convert to undefined under a
  // non-empty prefix on every gated path (and still convert on the base
  // tier, which is ungated by design).
  it('pins the variant gates: a prop outside the twin set converts to undefined under a prefix, on every gated path', () => {
    const without = (prop: string): ReadonlySet<string> => new Set(VARIANT_TWIN_PROPS.filter((p) => p !== prop))
    // Enum-declaration path (`flex-row` → flex-direction).
    expect(classToInlineStyle('flex-row', 'hover', without('flex-direction'))).toBeUndefined()
    expect(classToInlineStyle('flex-row', '', without('flex-direction'))).toBeDefined()
    expect(classToInlineStyle('flex-row', 'hover')).toBeDefined()
    // Themed-outline path (the one rewrite kind that rides an
    // arbitrary-property twin; bg/border ride ungated utility twins).
    const themedOutline = [...THEMED_TABLES.rewrite.entries()].find(([, entry]) => entry.kind === 'outline')?.[0]
    expect(themedOutline).toBeDefined()
    expect(classToInlineStyle(themedOutline as string, 'hover', without('outline-color'))).toBeUndefined()
    expect(classToInlineStyle(themedOutline as string, '', without('outline-color'))).toBeDefined()
    expect(classToInlineStyle(themedOutline as string, 'hover')).toBeDefined()
    // Arbitrary-property path (the pre-existing gate, pinned the same way).
    expect(classToInlineStyle('[word-wrap:break-word]', 'hover', without('word-wrap'))).toBeUndefined()
    expect(classToInlineStyle('[word-wrap:break-word]', '', without('word-wrap'))).toBeDefined()
    expect(classToInlineStyle('[word-wrap:break-word]', 'hover')).toBeDefined()
  })

  // The round-3 repro, by execution: remove `overflow` from
  // VARIANT_TWIN_PROPS and this throws (dev semantics) instead of staying
  // green while an unsafelisted class ships.
  it('the round-3 repro rides a safelisted twin: hoverStyle overflow', () => {
    const emission = flexCompatEmission({ hoverStyle: { overflow: 'hidden' } })
    const twin = arbitraryPropertyVarClass('overflow', 'hover')
    expect(emission.className).toContain(twin)
    expect(new Set(compatClosedSetEntries())).toContain(twin)
  })

  // ── Round-3 item 2: `grid-template-columns` + `scrollbar-width` joined
  // VARIANT_TWIN_PROPS — the review measured six live variant-pool call
  // sites on main compiling to dead classes without these twins (responsive
  // gridTemplateColumns grids under $sm/$md/$lg/$xl — e.g.
  // FeeTierSelector, DefaultPriceStrategies, TopVerifiedAuctionsSection,
  // NewsletterEtc — and PositionsSummaryChips' $sm scrollbarWidth). Pinned
  // by execution with the live payload shapes.
  it('grid/scrollbar variant pools ride safelisted twins by execution', () => {
    const entries = new Set(compatClosedSetEntries())
    const cases = [
      {
        name: 'gridTemplateColumns @ $md (FeeTierSelector shape)',
        emission: flexCompatEmission({ $md: { gridTemplateColumns: 'repeat(2, 1fr)' } }),
        twin: arbitraryPropertyVarClass('grid-template-columns', 'media-md'),
      },
      {
        name: 'gridTemplateColumns @ $sm (DefaultPriceStrategies shape)',
        emission: flexCompatEmission({ $sm: { gridTemplateColumns: 'repeat(2, 1fr)' } }),
        twin: arbitraryPropertyVarClass('grid-template-columns', 'media-sm'),
      },
      {
        name: 'gridTemplateColumns @ $lg (TopVerifiedAuctionsSection shape)',
        emission: flexCompatEmission({ $lg: { gridTemplateColumns: 'repeat(3, 1fr)' } }),
        twin: arbitraryPropertyVarClass('grid-template-columns', 'media-lg'),
      },
      {
        name: 'gridTemplateColumns @ $xl (NewsletterEtc shape)',
        emission: flexCompatEmission({ $xl: { gridTemplateColumns: '180px 1fr' } }),
        twin: arbitraryPropertyVarClass('grid-template-columns', 'media-xl'),
      },
      {
        name: 'scrollbarWidth @ $sm (PositionsSummaryChips shape)',
        emission: flexCompatEmission({ $sm: { overflow: 'scroll', scrollbarWidth: 'none' } }),
        twin: arbitraryPropertyVarClass('scrollbar-width', 'media-sm'),
      },
    ]
    for (const { name, emission, twin } of cases) {
      expect(emission.className, name).toContain(twin)
      expect(entries.has(twin), `${name}: ${twin} not in the safelist`).toBe(true)
      expect(emission.style, name).toBeDefined()
    }
  })
})
