/**
 * The compat long-tail token boundary, pinned (INFRA-3339): supported ∪
 * rejected = universe, exactly.
 *
 * The universe is DERIVED from the live long-tail prop tables (the shared
 * `LONG_TAIL_STYLE_PROPS` plus Text's extras) — never hand-transcribed — so a
 * new long-tail prop cannot ship without an explicit boundary decision: it
 * must land in a token-family set (and resolve like its shorthand) or in the
 * rejected ledger (with a written reason). Removing either side's entry fails
 * the union gate by name.
 */
import { describe, expect, it } from 'vitest'
// Text re-derives its long tail from the shared table; its extras join the
// census universe so the Text-only surface cannot drift boundary-less either.
import { LONG_TAIL_STYLE_PROPS as TEXT_LONG_TAIL_STYLE_PROPS } from '../text-compat/style-props'
import { REJECTED_LONG_TAIL_TOKEN_PROPS, TOKEN_PROPS_HANDLED_ON_SHORTHAND_LANE } from './long-tail-token-coverage'
import {
  COLOR_LONG_TAIL_PROPS,
  LONG_TAIL_STYLE_PROPS,
  RADIUS_LONG_TAIL_PROPS,
  SIZE_LONG_TAIL_PROPS,
  SPACE_LONG_TAIL_PROPS,
} from './style-props'

const FAMILY_SETS: ReadonlyArray<[string, ReadonlySet<string>]> = [
  ['radius', RADIUS_LONG_TAIL_PROPS],
  ['color', COLOR_LONG_TAIL_PROPS],
  ['space', SPACE_LONG_TAIL_PROPS],
  ['size', SIZE_LONG_TAIL_PROPS],
]

const supported = (): string[] => FAMILY_SETS.flatMap(([, set]) => [...set])

const universe = (): Set<string> => new Set([...LONG_TAIL_STYLE_PROPS, ...TEXT_LONG_TAIL_STYLE_PROPS])

describe('long-tail token boundary census', () => {
  it('supported ∪ rejected = the long-tail prop universe, exactly', () => {
    const expected = [...universe()].sort()
    const actual = [...supported(), ...Object.keys(REJECTED_LONG_TAIL_TOKEN_PROPS)].sort()
    expect(actual).toEqual(expected)
  })

  it('supported ∩ rejected = ∅, and the family sets are pairwise disjoint', () => {
    const rejectedSet = new Set(Object.keys(REJECTED_LONG_TAIL_TOKEN_PROPS))
    for (const prop of supported()) {
      expect(rejectedSet.has(prop), `${prop} is in a token family AND the rejected ledger`).toBe(false)
    }
    const seen = new Map<string, string>()
    for (const [family, set] of FAMILY_SETS) {
      for (const prop of set) {
        expect(seen.get(prop), `${prop} is in the ${family} family AND the ${seen.get(prop)} family`).toBeUndefined()
        seen.set(prop, family)
      }
    }
  })

  it('pins the partition sizes', () => {
    expect({
      universe: universe().size,
      supported: supported().length,
      rejected: Object.keys(REJECTED_LONG_TAIL_TOKEN_PROPS).length,
      families: Object.fromEntries(FAMILY_SETS.map(([family, set]) => [family, set.size])),
    }).toEqual({
      universe: 159,
      supported: 43,
      rejected: 116,
      families: { radius: 12, color: 15, space: 10, size: 6 },
    })
  })

  it('every rejection reason is real prose, not a placeholder', () => {
    for (const [prop, reason] of Object.entries(REJECTED_LONG_TAIL_TOKEN_PROPS)) {
      expect(reason.length, prop).toBeGreaterThan(30)
    }
  })

  it('the shorthand-lane longhands stay OUT of the long-tail tables (handled in visualClasses)', () => {
    const props = universe()
    for (const [prop, reason] of Object.entries(TOKEN_PROPS_HANDLED_ON_SHORTHAND_LANE)) {
      expect(props.has(prop), `${prop} must stay on the shorthand lane, not the long tail`).toBe(false)
      expect(reason.length, prop).toBeGreaterThan(30)
    }
    expect(Object.keys(TOKEN_PROPS_HANDLED_ON_SHORTHAND_LANE).sort()).toEqual([
      'borderBottomWidth',
      'borderLeftWidth',
      'borderRightWidth',
      'borderTopWidth',
    ])
  })
})
