/**
 * INVERSE emission property (INFRA-3217): the forward gate proves closed-set
 * ⊆ emitted CSS; this suite proves the compilers over a prop×pool matrix
 * stay inside the contract from the other direction — post-ruling shape:
 *
 *  - value-bearing props produce ZERO unstyled-fallback outcomes under EVERY
 *    reachable variant prefix: no dev throw, no kept out-of-safelist class,
 *    and every inline custom property has a safelisted twin reader;
 *  - the ONE remaining open set is UNREGISTERED named group pools
 *    (`$group-<name>-*` with a name outside `REGISTERED_GROUP_NAMES`,
 *    INFRA-3481): dev-throw, production keep-and-warn; registered names are
 *    covered pools like every other variant prefix;
 *  - the same property holds for every compat emitter, not just Flex/Text
 *    (round-2 item 4: the textColor raw path hid exactly there) — including
 *    the named-group tier, whose dominant real usage is `color` swaps on
 *    text/icon elements through TextCompat (INFRA-3481).
 */
import { getConfig, NodeEnv, type BaseConfig } from '@universe/config'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { filterSelectButtonStyleEmission, filterSelectCardEmission } from '../filter-select-compat/compile'
import { flexCompatEmission, flexFixedCompatClasses } from '../flex-compat/compile'
import type { FlexCompatProps } from '../flex-compat/props'
import {
  dropdownMenuSheetItemFrameEmission,
  dropdownMenuSheetItemLabelEmission,
  menuContentContainerEmission,
} from '../menu-compat/compile'
import { optionListFixedCompatClasses } from '../option-list-compat/compile'
import { adaptiveWebPopoverContentCompatEmission } from '../popover-compat/compile'
import { textCompatEmission, textFixedCompatClasses } from '../text-compat/compile'
import type { TextCompatStyleProps } from '../text-compat/props'
import { tooltipContentCompatEmission } from '../tooltip-compat/compile'
import { touchableAreaCompatEmission } from '../touchable-area/compile'
import { viewCompatEmission } from '../view-compat/compile'
import { compatClosedSetEntries } from './closed-set-manifest'
import { collectCompatClassNames, isCompatMarkerClass } from './closed-set-runtime'
import { resetOutOfSetWarnings, type CompatEmission } from './compose'

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

interface Payload {
  name: string
  style: FlexCompatProps
}

/** Value-bearing payloads: tokens, enums, and runtime-computed values (the round-2 blast radius). */
const PAYLOADS: Payload[] = [
  { name: 'gap token', style: { gap: '$spacing8' } },
  { name: 'gap off-token', style: { gap: 9 } },
  { name: 'padding token', style: { p: '$spacing8' } },
  { name: 'margin numeric', style: { m: 7 } },
  { name: 'flexDirection enum', style: { flexDirection: 'row' } },
  { name: 'display enum', style: { display: 'flex' } },
  { name: 'semantic color', style: { backgroundColor: '$surface2' } },
  { name: 'themed color', style: { backgroundColor: '$surface1Hovered' } },
  { name: 'raw color', style: { backgroundColor: 'rgba(0,0,0,0.5)' } },
  { name: 'opacity on-grid', style: { opacity: 0.5 } },
  { name: 'opacity off-grid', style: { opacity: 0.63 } },
  { name: 'width token', style: { width: '$spacing40' } },
  { name: 'width numeric', style: { width: 181 } },
  { name: 'cursor pointer', style: { cursor: 'pointer' } },
  { name: 'cursor grab', style: { cursor: 'grab' } },
  { name: 'pointerEvents', style: { pointerEvents: 'none' } },
  { name: 'border width ladder', style: { borderWidth: 1 } },
  { name: 'border width off-ladder', style: { borderWidth: 7 } },
  { name: 'boxShadow none', style: { boxShadow: 'none' } },
  { name: 'boxShadow value', style: { boxShadow: '0 1px 2px red' } },
  { name: 'filter (unbounded)', style: { filter: 'brightness(1.1)' } },
  { name: 'rotate transform', style: { rotate: '90deg' } },
  { name: 'radius token', style: { borderRadius: '$rounded12' } },
  { name: 'maxHeight numeric', style: { maxHeight: 400 } },
  { name: 'outline quartet', style: { outlineWidth: 1, outlineStyle: 'solid', outlineOffset: 1, outlineColor: 'red' } },
]

type PoolKind = 'covered' | 'named-group'

interface Pool {
  name: string
  kind: PoolKind
  wrap: (style: FlexCompatProps) => FlexCompatProps
}

/** Every reachable pool shape the orchestration composes, plus the unregistered-named-group open set. */
const POOLS: Pool[] = [
  { name: 'base', kind: 'covered', wrap: (s) => s },
  { name: '$platform-web', kind: 'covered', wrap: (s) => ({ '$platform-web': s }) },
  { name: 'hoverStyle', kind: 'covered', wrap: (s) => ({ hoverStyle: s }) },
  { name: 'pressStyle', kind: 'covered', wrap: (s) => ({ pressStyle: s }) },
  { name: 'focusStyle', kind: 'covered', wrap: (s) => ({ focusStyle: s }) },
  { name: 'focusVisibleStyle', kind: 'covered', wrap: (s) => ({ focusVisibleStyle: s }) },
  { name: 'focusWithinStyle', kind: 'covered', wrap: (s) => ({ focusWithinStyle: s }) },
  { name: 'disabledStyle', kind: 'covered', wrap: (s) => ({ disabledStyle: s }) },
  { name: '$md', kind: 'covered', wrap: (s) => ({ $md: s }) },
  { name: '$short', kind: 'covered', wrap: (s) => ({ $short: s }) },
  { name: '$theme-dark', kind: 'covered', wrap: (s) => ({ '$theme-dark': s }) },
  { name: '$theme-light', kind: 'covered', wrap: (s) => ({ '$theme-light': s }) },
  { name: '$group-hover', kind: 'covered', wrap: (s) => ({ '$group-hover': s }) },
  { name: '$group-press', kind: 'covered', wrap: (s) => ({ '$group-press': s }) },
  { name: '$md.hoverStyle', kind: 'covered', wrap: (s) => ({ $md: { hoverStyle: s } }) },
  { name: '$md.focusVisibleStyle', kind: 'covered', wrap: (s) => ({ $md: { focusVisibleStyle: s } }) },
  { name: '$theme-dark.hoverStyle', kind: 'covered', wrap: (s) => ({ '$theme-dark': { hoverStyle: s } }) },
  // An UNREGISTERED name is the remaining open set; registered names
  // ($group-item-*, $group-card-*) are covered over their curated tier —
  // see the named-group describe below (INFRA-3481).
  { name: '$group-nav-hover', kind: 'named-group', wrap: (s) => ({ '$group-nav-hover': s }) },
]

/**
 * The named-group tier's payloads (INFRA-3481): the curated
 * reveal/interaction surfaces (NAMED_GROUP_TWIN_PROPS/-UTILITIES in
 * inline-style.ts). Value shapes mirror the repo's real `$group-<name>-*`
 * call sites.
 */
const NAMED_GROUP_PAYLOADS: Payload[] = [
  { name: 'display reveal', style: { display: 'flex' } },
  { name: 'semantic color', style: { backgroundColor: '$surface2' } },
  { name: 'themed color', style: { backgroundColor: '$surface1Hovered' } },
  { name: 'raw color', style: { backgroundColor: 'rgba(0,0,0,0.5)' } },
  { name: 'border color', style: { borderColor: '$surface3' } },
  { name: 'opacity on-grid', style: { opacity: 0.5 } },
  { name: 'opacity off-grid', style: { opacity: 0.63 } },
  { name: 'scale transform', style: { scale: 0.98 } },
  { name: 'x nudge transform', style: { x: 4 } },
  { name: 'filter', style: { filter: 'brightness(1.1)' } },
  { name: 'cursor affordance', style: { cursor: 'pointer' } },
]

/**
 * The named-group tier through the TEXT emitter: the dominant real-world
 * `$group-<name>-*` usage is a `color` swap on text/icon elements
 * (CustomButtonText's variantEmphasisHash, DropdownButtonText,
 * RotatableChevron, createIcon) — the same emitter surface the round-2
 * textColor raw path hid in, so the tier is pinned through
 * `textCompatEmission`, not just Flex (INFRA-3481).
 */
const TEXT_NAMED_GROUP_PAYLOADS: { name: string; style: TextCompatStyleProps }[] = [
  { name: 'semantic color', style: { color: '$neutral1' } },
  { name: 'themed color', style: { color: '$accent1Hovered' } },
  { name: 'raw color', style: { color: 'rgba(0,0,0,0.5)' } },
  { name: 'display reveal', style: { display: 'flex' } },
  { name: 'opacity dim', style: { opacity: 0.5 } },
]

let entriesCache: Set<string> | undefined
function safelist(): Set<string> {
  entriesCache ??= new Set(compatClosedSetEntries())
  return entriesCache
}

/** Classes the emission returned that are guaranteed-in-CSS: safelist ∪ markers ∪ the emitter's fixed set. */
function outOfSafelistTokens(emission: CompatEmission, fixed: ReadonlySet<string>): string[] {
  return emission.className
    .split(/\s+/)
    .filter((cls) => cls !== '' && !safelist().has(cls) && !fixed.has(cls) && !isCompatMarkerClass(cls))
}

/** Every inline custom property must have a reader class in the same emission. */
function unreadStyleProps(emission: CompatEmission): string[] {
  if (emission.style === undefined) {
    return []
  }
  return Object.keys(emission.style).filter((prop) => !emission.className.includes(`var(${prop})`))
}

describe('emission inverse property (prop × pool matrix, all reachable prefixes)', () => {
  beforeEach(() => {
    mockNodeEnv(NodeEnv.Test)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    resetOutOfSetWarnings()
  })

  it('zero unstyled-fallback outcomes: no case throws, keeps a dead class, or ships an unread value — except unregistered named groups', () => {
    const fixed = new Set(collectCompatClassNames(flexFixedCompatClasses()))
    for (const payload of PAYLOADS) {
      for (const pool of POOLS) {
        const key = `${payload.name} @ ${pool.name}`
        const props = pool.wrap(payload.style)
        if (pool.kind === 'named-group') {
          expect(() => flexCompatEmission(props as never), key).toThrow()
          continue
        }
        const emission = flexCompatEmission(props as never)
        expect(outOfSafelistTokens(emission, fixed), key).toEqual([])
        expect(unreadStyleProps(emission), key).toEqual([])
      }
    }
  })

  // INFRA-3490: the RN-only pointerEvents values are a BASE-pool contract —
  // the polyfill's children half is a `>*` rule, which no inline
  // custom-property twin can express — so base pools are fully covered and
  // variant pools dev-throw (instead of the pre-fix silent invalid twin).
  it('pointerEvents box-none/box-only: zero unstyled-fallback outcomes on base-tier pools, dev-throw under variant prefixes', () => {
    const fixed = new Set(collectCompatClassNames(flexFixedCompatClasses()))
    for (const value of ['box-none', 'box-only'] as const) {
      for (const pool of POOLS.filter((p) => p.name === 'base' || p.name === '$platform-web')) {
        const key = `pointerEvents ${value} @ ${pool.name}`
        const emission = flexCompatEmission(pool.wrap({ pointerEvents: value }) as never)
        expect(outOfSafelistTokens(emission, fixed), key).toEqual([])
        expect(unreadStyleProps(emission), key).toEqual([])
        expect(emission.style, key).toBeUndefined()
      }
      expect(() => flexCompatEmission({ hoverStyle: { pointerEvents: value } }), `${value} @ hoverStyle`).toThrow()
      expect(() => flexCompatEmission({ $md: { pointerEvents: value } }), `${value} @ $md`).toThrow()
    }
  })

  it('registered named group pools: zero unstyled-fallback outcomes over the curated tier, dev-throw outside it (INFRA-3481)', () => {
    const fixed = new Set(collectCompatClassNames(flexFixedCompatClasses()))
    for (const pool of ['$group-item-hover', '$group-item-press', '$group-card-hover'] as const) {
      for (const payload of NAMED_GROUP_PAYLOADS) {
        const key = `${payload.name} @ ${pool}`
        const emission = flexCompatEmission({ [pool]: payload.style } as never)
        expect(outOfSafelistTokens(emission, fixed), key).toEqual([])
        expect(unreadStyleProps(emission), key).toEqual([])
      }
      // Outside the curated named-group tier: the documented dev-throw, one
      // NAMED_GROUP_TWIN_PROPS/-UTILITIES entry + regeneration away.
      expect(() => flexCompatEmission({ [pool]: { gap: '$spacing8' } } as never), pool).toThrow()
    }
    // The cursor affordance pinned by execution, not just absence-of-fallback:
    // the payload above would pass vacuously if the emitter DROPPED the prop,
    // so assert the safelisted twin and its inline custom property directly.
    const cursorEmission = flexCompatEmission({ '$group-item-hover': { cursor: 'pointer' } })
    expect(cursorEmission.className).toContain('group-hover/item:[cursor:var(--cghi-c)]')
    expect(cursorEmission.style).toEqual({ '--cghi-c': 'pointer' })
  })

  it('TextCompat named group pools: zero unstyled-fallback outcomes over the curated tier, dev-throw outside it (INFRA-3481)', () => {
    const fixed = new Set(collectCompatClassNames(textFixedCompatClasses()))
    for (const pool of ['$group-item-hover', '$group-item-press', '$group-card-hover'] as const) {
      for (const payload of TEXT_NAMED_GROUP_PAYLOADS) {
        const key = `${payload.name} @ ${pool}`
        const emission = textCompatEmission({ [pool]: payload.style } as never)
        expect(outOfSafelistTokens(emission, fixed), key).toEqual([])
        expect(unreadStyleProps(emission), key).toEqual([])
      }
    }
    // The dominant call-site shape, pinned by execution: the color swap rides
    // the REAL safelisted twin reading the inline custom property. Removing
    // the name from REGISTERED_GROUP_NAMES (or `color` from
    // NAMED_GROUP_TWIN_PROPS) dev-throws here instead of no-opping.
    const emission = textCompatEmission({ '$group-item-hover': { color: '$accent1Hovered' } })
    expect(emission.className).toContain('group-hover/item:[color:var(--cghi-col)]')
    expect(emission.style).toEqual({ '--cghi-col': 'var(--stext-accent1Hovered)' })
    // Outside the curated named-group tier: the documented dev-throw.
    expect(() => textCompatEmission({ '$group-item-hover': { letterSpacing: 2 } })).toThrow()
  })

  it('production never throws, and unregistered-named-group fallbacks are the only kept out-of-safelist classes — warned', () => {
    mockNodeEnv(NodeEnv.Production)
    const warned: string[] = []
    vi.spyOn(console, 'warn').mockImplementation((message: unknown) => {
      warned.push(String(message))
    })
    const fixed = new Set(collectCompatClassNames(flexFixedCompatClasses()))
    for (const payload of PAYLOADS.slice(0, 6)) {
      const key = `${payload.name} @ $group-nav-hover`
      const emission = flexCompatEmission({ '$group-nav-hover': payload.style })
      const outTokens = outOfSafelistTokens(emission, fixed)
      expect(outTokens.length, key).toBeGreaterThan(0)
      for (const cls of outTokens) {
        expect(cls.startsWith('group-hover/nav:'), `${key}: ${cls}`).toBe(true)
        expect(
          warned.some((message) => message.includes(`"${cls}"`)),
          `${key}: "${cls}" kept without a warning`,
        ).toBe(true)
      }
    }
  })
})

describe('emission inverse property — every emitter (round-2 item 4)', () => {
  interface EmitterCase {
    name: string
    /**
     * Emit with a value-bearing prop under a variant pool + a runtime base
     * value + a registered NAMED-GROUP pool wherever the emitter's public
     * contract carries one (INFRA-3481) — so the named-group tier is covered
     * per emitter by the same zero-unstyled-fallback assertions.
     */
    run: () => CompatEmission
    fixed: () => readonly string[]
    /**
     * The safelisted named-group twin the run's `$group-<name>-*` pool must
     * produce — asserted present so a silently DROPPED pool (not just a
     * dev-throw) fails the guard. Omitted only for emitters whose public
     * contract is a fixed input vocabulary with no group-pool surface.
     */
    namedGroupTwin?: string
  }

  const EMITTERS: EmitterCase[] = [
    {
      name: 'view',
      run: () =>
        viewCompatEmission({
          minWidth: 181,
          hoverStyle: { backgroundColor: 'rgba(1,2,3,0.4)' },
          '$group-item-hover': { backgroundColor: '$surface2' },
        }),
      fixed: () => [],
      namedGroupTwin: 'group-hover/item:bg-[color:var(--cghi-bg)]',
    },
    {
      name: 'text',
      run: () =>
        textCompatEmission({
          variant: 'body2',
          letterSpacing: 3,
          hoverStyle: { color: '$neutral1', letterSpacing: 4 },
          $md: { hoverStyle: { color: '#123456' } },
          '$group-item-hover': { color: '$accent1Hovered' },
        }),
      fixed: () => [],
      namedGroupTwin: 'group-hover/item:[color:var(--cghi-col)]',
    },
    {
      name: 'touchable-area',
      run: () =>
        touchableAreaCompatEmission({
          variant: 'filled',
          hoverStyle: { backgroundColor: 'rgba(9,9,9,0.1)' },
          $md: { pressStyle: { opacity: 0.42 } },
          width: 181,
          '$group-card-hover': { opacity: 0.42 },
        }),
      fixed: () => [],
      namedGroupTwin: 'group-hover/card:opacity-[var(--cghc-opacity)]',
    },
    {
      name: 'menu content',
      run: () =>
        menuContentContainerEmission({
          maxHeight: 400,
          hoverStyle: { backgroundColor: '$surface2' },
          '$group-item-hover': { borderColor: '$surface3' },
        }),
      fixed: () => [],
      namedGroupTwin: 'group-hover/item:border-[color:var(--cghi-bdc)]',
    },
    {
      // Fixed input vocabulary (variant/disabled/height) — no group-pool
      // surface to cover; the named-group tier is unreachable through it.
      name: 'menu sheet item frame',
      run: () => dropdownMenuSheetItemFrameEmission({ variant: 'medium', height: 44 }),
      fixed: () => [],
    },
    {
      // Fixed input vocabulary (variant/destructive/textColor) — see above.
      name: 'menu sheet item label (the round-2 textColor path)',
      run: () => dropdownMenuSheetItemLabelEmission({ variant: 'small', textColor: '#ABCDEF' }),
      fixed: () => [],
    },
    {
      name: 'filter-select card',
      run: () =>
        filterSelectCardEmission({
          maxHeight: 320,
          width: 280,
          hoverStyle: { borderColor: '$surface3' },
          '$group-card-hover': { display: 'flex' },
        }),
      fixed: () => [],
      namedGroupTwin: 'group-hover/card:[display:var(--cghc-di)]',
    },
    {
      name: 'filter-select button style',
      run: () =>
        filterSelectButtonStyleEmission({
          px: 11,
          hoverStyle: { backgroundColor: '$surface1Hovered' },
          '$group-item-press': { opacity: 0.8 },
        }),
      fixed: () => [],
      namedGroupTwin: 'group-active/item:opacity-[var(--cgai-opacity)]',
    },
    {
      name: 'tooltip content',
      run: () =>
        tooltipContentCompatEmission({
          maxWidth: 280,
          $md: { p: 5 },
          '$group-item-hover': { filter: 'brightness(1.2)' },
        }),
      fixed: () => [],
      namedGroupTwin: 'group-hover/item:[filter:var(--cghi-f)]',
    },
    {
      name: 'popover content',
      run: () =>
        adaptiveWebPopoverContentCompatEmission({
          maxHeight: 333,
          hoverStyle: { opacity: 0.9 },
          '$group-card-press': { x: 2 },
        }),
      fixed: () => [],
      namedGroupTwin: 'group-active/card:[transform:var(--cgac-tr)]',
    },
  ]

  it('no emitter throws, keeps a dead class, or ships an unread value for value-bearing props — named-group pools included', () => {
    for (const emitter of EMITTERS) {
      const emission = emitter.run()
      const fixed = new Set(collectCompatClassNames([...emitter.fixed()]))
      expect(outOfSafelistTokens(emission, fixed), emitter.name).toEqual([])
      expect(unreadStyleProps(emission), emitter.name).toEqual([])
      expect(emission.style, emitter.name).toBeDefined()
      if (emitter.namedGroupTwin !== undefined) {
        expect(emission.className, `${emitter.name}: named-group twin`).toContain(emitter.namedGroupTwin)
      }
    }
  })

  it('the textColor probe from the round-2 review passes by execution', () => {
    const emission = dropdownMenuSheetItemLabelEmission({ variant: 'small', textColor: '#ABCDEF' })
    expect(emission.className).not.toContain('[color:#ABCDEF]')
    expect(emission.className).toContain('[color:var(--c-col)]')
    expect(emission.style).toEqual({ '--c-col': '#ABCDEF' })
  })

  it('option-list fixed chrome stays inside the safelist (no value-bearing emitter surface)', () => {
    const fixed = collectCompatClassNames(optionListFixedCompatClasses())
    const missing = fixed.filter((cls) => !safelist().has(cls))
    expect(missing).toEqual([])
  })
})
