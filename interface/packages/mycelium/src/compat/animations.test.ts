import { describe, expect, it } from 'vitest'
import { curveToAnimationTiming, SPORE_ANIMATION_CURVE_CSS } from './animations'

/** A single CSS timing-function component: a keyword or one function call — never two space-joined values. */
const SINGLE_TIMING_FUNCTION_REGEX = /^(?:[a-z-]+|[a-z-]+\([^)]*\))$/i
// Fraction spelled as a top-level alternative rather than `\d+(?:\.\d+)?`: the
// nested quantifier trips `security(detect-unsafe-regex)`'s star-height check.
const TIME_VALUE_REGEX = /^(?:\d+\.\d+|\d+)m?s$/

describe('curveToAnimationTiming', () => {
  it('splits a curve shorthand into duration and timing function', () => {
    expect(curveToAnimationTiming('300ms ease-in-out')).toEqual({
      animationDuration: '300ms',
      animationTimingFunction: 'ease-in-out',
    })
  })

  it('keeps a multi-word easing intact', () => {
    expect(curveToAnimationTiming('120ms cubic-bezier(0.17, 0.67, 0.45, 1)')).toEqual({
      animationDuration: '120ms',
      animationTimingFunction: 'cubic-bezier(0.17, 0.67, 0.45, 1)',
    })
  })

  it('returns a three-part shorthand delay as animationDelay, not folded into the easing', () => {
    expect(curveToAnimationTiming('125ms ease-in-out 250ms')).toEqual({
      animationDuration: '125ms',
      animationTimingFunction: 'ease-in-out',
      animationDelay: '250ms',
    })
  })

  it('throws on a space-less input', () => {
    expect(() => curveToAnimationTiming('300ms')).toThrow(/expects/)
  })

  it('throws on more than three components', () => {
    expect(() => curveToAnimationTiming('300ms ease-in-out 250ms forwards')).toThrow(/expects/)
  })

  it('round-trips every SPORE_ANIMATION_CURVE_CSS entry with each field a single well-formed component', () => {
    for (const curve of Object.values(SPORE_ANIMATION_CURVE_CSS)) {
      const { animationDuration, animationTimingFunction, animationDelay } = curveToAnimationTiming(curve)
      // per-field shape assertions so a bad split can't hide in re-concatenation
      // (e.g. a delay folded into animationTimingFunction would fail here)
      expect(animationDuration).toMatch(TIME_VALUE_REGEX)
      expect(animationTimingFunction).toMatch(SINGLE_TIMING_FUNCTION_REGEX)
      if (animationDelay !== undefined) {
        expect(animationDelay).toMatch(TIME_VALUE_REGEX)
      }
      expect([animationDuration, animationTimingFunction, animationDelay].filter(Boolean).join(' ')).toBe(curve)
    }
  })
})
