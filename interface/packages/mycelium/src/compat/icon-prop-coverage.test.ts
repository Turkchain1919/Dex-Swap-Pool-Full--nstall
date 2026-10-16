import { describe, expect, it } from 'vitest'
import { REJECTED_ICON_PROPS } from './icon-prop-coverage'
import { SUPPORTED_ICON_STYLE_PROPS } from './icon-props'

/**
 * The mycelium icon style-prop boundary, pinned against the INFRA-3320
 * census (the #38336 supported ∪ rejected pattern).
 *
 * The universe is the census of every style prop found on the 1,396 ui/src
 * icon call sites repo-wide (2026-08-05, published with occurrence counts on
 * INFRA-3320 — the issue comment is the decision record). It is a LITERAL
 * here on purpose: the supported half derives from the runtime maps
 * (icon-props.ts) and the rejected half from the ledger
 * (icon-prop-coverage.ts), so the universe must come from neither — a matrix
 * derived from the subject under test grows correctly and shrinks silently
 * (the INFRA-3241 lesson).
 *
 * KNOW WHAT THIS PIN IS: a SNAPSHOT of the 2026-08-05 census with NO
 * forward-drift protection. Unlike a universe derived live from the theme,
 * where a new token forces a decision here and now, nothing
 * regenerates this literal — a style prop that starts appearing on icon call
 * sites after the census date never surfaces in this file. What the gate
 * DOES guarantee: the supported and rejected halves stay internally
 * consistent (exact partition, no overlap, reasoned rejections), and any
 * code change that moves the boundary shows up as a red count. Re-running
 * the census (and reconciling this literal) is a manual step; deriving the
 * universe from a generated census artifact is the stronger upgrade if the
 * icon surface keeps moving.
 */
const CENSUS_STYLE_PROP_UNIVERSE: readonly string[] = [
  // sorted by census usage count (size 1277 … style 1)
  'size',
  'color',
  'strokeWidth',
  'flexShrink',
  'fill',
  '$group-hover',
  'hoverColor',
  'rotate',
  'ml',
  'animation',
  'alignSelf',
  'transform',
  'pointerEvents',
  'transition',
  'opacity',
  'cursor',
  'mr',
  '$xs',
  'mt',
  'display',
  'verticalAlign',
  'height',
  'width',
  'mx',
  'padding',
  'margin',
  'minWidth',
  'backgroundColor',
  'borderRadius',
  '$sm',
  'x',
  'strokeLinecap',
  'maxWidth',
  '$group-item-hover',
  'rotateZ',
  'position',
  'left',
  'fillOpacity',
  'animateOnly',
  'marginEnd',
  'style',
  // Not from the 2026-08-05 style-prop census (testID is behavioral, not
  // style) — added INFRA-2962: the same partition ledger gates it since the
  // factory's supported/rejected boundary is the single source of truth for
  // "does this JSX prop typecheck on a generated icon", style or not.
  'testID',
]

describe('mycelium icon style-prop coverage ↔ the INFRA-3320 census (the standing partition gate)', () => {
  const universe = [...CENSUS_STYLE_PROP_UNIVERSE].sort()
  const supported = [...SUPPORTED_ICON_STYLE_PROPS].sort()
  const rejected = Object.keys(REJECTED_ICON_PROPS).sort()

  it('supported ∪ rejected = the census style-prop universe, exactly', () => {
    expect([...supported, ...rejected].sort()).toEqual(universe)
  })

  it('supported ∩ rejected = ∅', () => {
    const overlap = supported.filter((prop) => Object.hasOwn(REJECTED_ICON_PROPS, prop))
    expect(overlap).toEqual([])
  })

  it('the partition equation holds (a widening cannot pass silently)', () => {
    expect(supported.length + rejected.length).toBe(universe.length)
    // The absolute counts, so a review sees the boundary move as a number.
    expect({ supported: supported.length, rejected: rejected.length, universe: universe.length }).toEqual({
      supported: 35,
      rejected: 7,
      universe: 42,
    })
  })

  it('every rejection carries a real reason', () => {
    for (const [prop, reason] of Object.entries(REJECTED_ICON_PROPS)) {
      expect(reason.length, `${prop} has a placeholder reason`).toBeGreaterThan(30)
    }
  })

  it('the supported set has no duplicates (it is assembled from three runtime maps)', () => {
    expect(supported.length).toBe(new Set(supported).size)
  })
})
