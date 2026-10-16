import { checkTypeGuard } from '@universe/gating/src/hooks'
import { describe, expect, it } from 'vitest'

describe('checkTypeGuard', () => {
  describe('without a custom guard', () => {
    it('accepts a value matching the default value type', () => {
      expect(checkTypeGuard({ value: 'configured', defaultValue: 'fallback' })).toBe('configured')
    })

    it('falls back when the type differs', () => {
      expect(checkTypeGuard({ value: 42 as never, defaultValue: 'fallback' })).toBe('fallback')
    })
  })

  describe('with a custom guard', () => {
    const isNumberArray = (x: unknown): x is number[] => Array.isArray(x) && x.every((n) => typeof n === 'number')

    it('accepts a value the guard admits', () => {
      expect(checkTypeGuard({ value: [1, 2], defaultValue: [3], customTypeGuard: isNumberArray })).toEqual([1, 2])
    })

    // `typeof` is 'object' for null, plain objects, and arrays alike, so a guard that rejects one of
    // those has to be authoritative — otherwise the value reaches callers that treat it as an array.
    it.each([
      ['null', null],
      ['a plain object', {}],
      ['an array of the wrong element type', ['1', '2']],
    ])('falls back on %s even though typeof matches the default', (_label, value) => {
      expect(checkTypeGuard({ value: value as never, defaultValue: [3], customTypeGuard: isNumberArray })).toEqual([3])
    })

    it('does not fall back to the loose typeof check when the guard rejects', () => {
      const guard = (x: unknown): x is string => x === 'allowed'

      expect(checkTypeGuard({ value: 'other', defaultValue: 'fallback', customTypeGuard: guard })).toBe('fallback')
    })
  })
})
