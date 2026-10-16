/**
 * The pool-surface emission gate (INFRA-3320 round 3; per-prop shapes round
 * 7): every prop the typed pool surface admits (`IconCompatPoolStyleProps`)
 * must land in the rendered class attribute as its EXPECTED emission — the
 * variant-composed in-set class, or the safelisted var-indirection twin
 * carrying the value on its `--c*` custom property — under both variant
 * tiers (media + group-state). A bare `.not.toThrow()` render would stay
 * green if a compiler silently SKIPPED a prop: the NODE_ENV=test throw only
 * catches classes that exist but are out-of-set. `marginEnd` shipped the
 * throw-side bug class (pool-typed prop crashing at render); the silent skip
 * is its complement, and the per-prop shape assertions close both.
 *
 * Both sides derive from the runtime tables: `ICON_POOL_STYLE_PROPS` from
 * the resolver maps, the tier prefixes from `MEDIA_VARIANT` /
 * `groupStateVariant`, the twin shapes from `classToInlineStyle` (the
 * emission engine's own table), token values from the compat resolvers
 * (`sizeValue`, `iconSizeAxes`, `resolveIconColor`). The per-prop case map is
 * the only literal, and its key set is pinned to the derived list so a new
 * resolver cannot land without an expected shape here.
 *
 * Lives in compat/ for the same INFRA-2958 exempt-path reason as
 * createIcon.style-surface.test.tsx (the `$group-*`/`$xs` literals).
 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Check } from '../components/icons/Check'
import { groupStateVariant } from './group'
import {
  ICON_BASE_LANE_ONLY_PROPS,
  ICON_CSS_LANE_RESOLVERS,
  ICON_POOL_STYLE_PROPS,
  iconSizeAxes,
  MARGIN_FAMILY,
  resolveIconColor,
  type IconCompatPoolStyleProps,
  type IconInlineStyle,
} from './icon-props'
import { classToInlineStyle, DROP_CLASS } from './inline-style'
import { MEDIA_VARIANT } from './media'
import { arbitrary, sizeValue, spacePx } from './style-classes'

type IconPoolStyleProp = (typeof ICON_POOL_STYLE_PROPS)[number]
type IconCssLaneProp = keyof typeof ICON_CSS_LANE_RESOLVERS

/** `true` only when `A` and `B` are mutually assignable — exact union equality. */
type MutuallyAssignable<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false

/**
 * One pool case: a value riding the prop's real compiler lane (tokens where
 * the census shape is a token), plus the base-tier classes its emission must
 * produce — non-empty by type, so no case can assert nothing.
 */
interface PoolPropCase<K extends IconPoolStyleProp> {
  value: NonNullable<IconCompatPoolStyleProps[K]>
  emits: readonly [string, ...string[]]
}

/**
 * `resolveIconColor` returns `undefined` for a token with no counterpart (it
 * logs an error and drops instead of throwing). A fixture must not coerce that
 * away: a dropped token would silently build an expectation for the wrong class, so
 * demand resolution here and fail loudly if a mapped token ever stops mapping.
 */
function mappedIconColor(token: string): string {
  const resolved = resolveIconColor(token)
  if (resolved === undefined) {
    throw new Error(`test fixture requires "${token}" to resolve to a colour`)
  }
  return resolved
}

const sizeAxes = iconSizeAxes('$icon.20')
const spacing8 = sizeValue('$spacing8')

/**
 * The expected emission per pool-admissible prop. The per-key mapped type
 * keeps every value legal for its prop, and the completeness pin below keeps
 * the key set identical to the derived list.
 */
const POOL_PROP_CASES: { [K in IconPoolStyleProp]: PoolPropCase<K> } = {
  size: { value: '$icon.20', emits: [`w-[${sizeAxes.width}px]`, `h-[${sizeAxes.height}px]`] },
  color: { value: '$neutral2', emits: [`[color:${arbitrary(mappedIconColor('$neutral2'))}]`] },
  flexShrink: { value: 0, emits: ['shrink-[0]'] },
  alignSelf: { value: 'center', emits: ['self-center'] },
  // 'inline' is the shipping branch: every censused icon display use is
  // 'inline' (INFRA-3320 census). 'flex' rides SECONDARY_POOL_CASES below.
  display: { value: 'inline', emits: ['inline'] },
  margin: { value: '$spacing8', emits: [`m-[${spacing8}]`] },
  mx: { value: '$spacing8', emits: [`mx-[${spacing8}]`] },
  ml: { value: '$spacing8', emits: [`ml-[${spacing8}]`] },
  mr: { value: '$spacing8', emits: [`mr-[${spacing8}]`] },
  mt: { value: '$spacing8', emits: [`mt-[${spacing8}]`] },
  padding: { value: '$spacing8', emits: [`p-[${spacing8}]`] },
  width: { value: 24, emits: [`w-[${sizeValue(24)}]`] },
  height: { value: 24, emits: [`h-[${sizeValue(24)}]`] },
  minWidth: { value: 24, emits: [`min-w-[${sizeValue(24)}]`] },
  maxWidth: { value: 24, emits: [`max-w-[${sizeValue(24)}]`] },
  opacity: { value: 0.5, emits: ['opacity-[0.5]'] },
  cursor: { value: 'pointer', emits: ['[cursor:pointer]'] },
  pointerEvents: { value: 'none', emits: ['[pointer-events:none]'] },
  rotate: { value: '90deg', emits: ['[transform:rotate(90deg)]'] },
  transform: { value: 'rotate(90deg)', emits: ['[transform:rotate(90deg)]'] },
  // INFRA-3320 widening (packages/wallet ChooseNftModal.tsx): neither prop is
  // special-cased in `iconStyleClasses` — both fall through its `commonStyleClasses(rest)`
  // call, the same path `opacity`/`cursor`/`pointerEvents` above already ride.
  position: { value: 'absolute', emits: ['absolute'] },
  left: { value: 0, emits: [`left-[${spacePx(0)}]`] },
}

/**
 * Second case where the representative alone would leave a compiler branch
 * unproven: `display` maps through the `flexDisplayClass` enum, whose 'flex'
 * branch is the Flex/View default — keep it emitting under the pool tiers
 * even though no censused icon uses it.
 */
const SECONDARY_POOL_CASES: { [K in IconPoolStyleProp]?: PoolPropCase<K> } = {
  display: { value: 'flex', emits: ['flex'] },
}

/** The two variant tiers the gate proves, prefixes from the engine's own tables. */
const TIERS = [
  { pool: '$xs', variant: MEDIA_VARIANT.$xs },
  { pool: '$group-hover', variant: groupStateVariant({ state: 'hover' }) },
] as const

/**
 * Assert one expected base-tier class landed under the variant: either the
 * composed class itself (in the closed set) or its safelisted var-indirection
 * twin with the value on the twin's custom property — the only two outcomes
 * `composeCompatEmission` allows. Anything else, in particular a compiler
 * silently skipping the prop, fails.
 */
function expectEmittedUnderVariant({
  markup,
  variant,
  baseClass,
  context,
}: {
  markup: string
  variant: string
  baseClass: string
  context: string
}): void {
  const classTokens = (/class="([^"]*)"/.exec(markup)?.[1] ?? '').split(/\s+/)
  const composed = `${variant}:${baseClass}`
  if (classTokens.includes(composed)) {
    return
  }
  const twin = classToInlineStyle(baseClass, variant)
  expect(twin !== undefined && twin !== DROP_CLASS, `${context}: "${composed}" has no var twin`).toBe(true)
  if (twin === undefined || twin === DROP_CLASS) {
    return
  }
  expect(classTokens, `${context}: expected "${composed}" or its var twin among the emitted classes`).toContain(
    twin.varClass,
  )
  const style = /style="([^"]*)"/.exec(markup)?.[1] ?? ''
  expect(style, `${context}: the twin's custom property must carry the value`).toContain(
    `${twin.varProp}:${twin.value}`,
  )
}

describe('the pool-surface emission gate (every admitted prop emits its expected class shape)', () => {
  it('the derived list and IconCompatPoolStyleProps admit exactly the same props (compile-time pin)', () => {
    // A one-sided change — the type narrowed without the runtime tables, or a
    // base-lane-only entry added without the type Omit — flips this to false
    // and fails typecheck.
    const exact: MutuallyAssignable<IconPoolStyleProp, keyof IconCompatPoolStyleProps> = true
    expect(exact).toBe(true)
  })

  it('the case map covers exactly the derived pool surface', () => {
    expect(Object.keys(POOL_PROP_CASES).sort()).toEqual([...ICON_POOL_STYLE_PROPS].sort())
  })

  // One render per (tier, prop). NODE_ENV=test still makes out-of-set classes
  // throw at render; the shape assertions additionally fail a compiler that
  // silently skips the prop (an empty emission was green under the gate's
  // former `.not.toThrow()`).
  for (const { pool, variant } of TIERS) {
    it(`every pool-admissible prop lands as its expected emission under ${pool}`, () => {
      for (const prop of ICON_POOL_STYLE_PROPS) {
        const poolCase = POOL_PROP_CASES[prop]
        const markup = renderToStaticMarkup(createElement(Check, { [pool]: { [prop]: poolCase.value } }))
        for (const baseClass of poolCase.emits) {
          expectEmittedUnderVariant({ markup, variant, baseClass, context: `${pool}={{ ${prop}: … }}` })
        }
      }
      for (const [prop, poolCase] of Object.entries(SECONDARY_POOL_CASES)) {
        const markup = renderToStaticMarkup(createElement(Check, { [pool]: { [prop]: poolCase.value } }))
        for (const baseClass of poolCase.emits) {
          expectEmittedUnderVariant({ markup, variant, baseClass, context: `${pool}={{ ${prop}: … }} (secondary)` })
        }
      }
    })
  }

  it('the base-lane-only props are exactly the CSS-lane props absent from the pool surface', () => {
    const poolSet = new Set<string>(ICON_POOL_STYLE_PROPS)
    const absent = Object.keys(ICON_CSS_LANE_RESOLVERS).filter((prop) => !poolSet.has(prop))
    expect(absent.sort()).toEqual([...ICON_BASE_LANE_ONLY_PROPS].sort())
  })

  it('marginEnd and verticalAlign are compile errors inside a pool object (base-lane-only)', () => {
    const pins: IconCompatPoolStyleProps[] = [
      // @ts-expect-error -- marginEnd is base-lane-only: no spacing utility; its long-tail token lane belongs to INFRA-3339 (#38916)
      { marginEnd: '$spacing2' },
      // @ts-expect-error -- verticalAlign is base-lane-only: vertical-align has no variant-tier twin (VARIANT_TWIN_PROPS)
      { verticalAlign: 'middle' },
    ]
    expect(pins).toHaveLength(2)
  })
})

describe('MARGIN_FAMILY derives from the resolvers (the hoist link is structural)', () => {
  it('MARGIN_FAMILY = every resolver writing a margin declaration, minus the base-lane-only props', () => {
    // Probe each resolver with a px number (legal for every prop at runtime)
    // and read which CSS declarations it writes — the resolver map IS the
    // margin channel's source of truth, so a new margin prop that skips
    // MARGIN_FAMILY (silently skipping the pool hoist) fails here.
    const marginWriters = (Object.keys(ICON_CSS_LANE_RESOLVERS) as IconCssLaneProp[]).filter((prop) => {
      const style: IconInlineStyle = {}
      ;(ICON_CSS_LANE_RESOLVERS[prop] as (value: unknown, style: IconInlineStyle) => void)(8, style)
      return Object.keys(style).some((declaration) => declaration.startsWith('margin'))
    })
    const baseLaneOnly = new Set<string>(ICON_BASE_LANE_ONLY_PROPS)
    expect(marginWriters.filter((prop) => !baseLaneOnly.has(prop)).sort()).toEqual([...MARGIN_FAMILY].sort())
    // The subtraction is not vacuous: marginEnd IS a margin writer, excluded
    // on purpose (base-lane-only — see the MARGIN_FAMILY docstring).
    expect(marginWriters).toContain('marginEnd')
  })
})
