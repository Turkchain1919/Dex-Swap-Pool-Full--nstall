import { describe, expect, it } from 'vitest'
import { domTestId } from './dom-test-id'

/**
 * Pins the ambient-preservation contract stated on the helper: conditional +
 * last, so an explicit testID beats an ambient data-testid while an absent
 * testID never wipes one.
 */
describe('domTestId', () => {
  it('asserts data-testid when testID is set', () => {
    expect(domTestId('save-button')).toEqual({ 'data-testid': 'save-button' })
  })

  it('contributes no key at all when testID is absent', () => {
    expect(domTestId(undefined)).toBeUndefined()
    // The spread form every leg uses: no 'data-testid' key may appear, even
    // as undefined — that is the wipe the helper exists to prevent.
    expect(Object.keys({ ...domTestId(undefined) })).toEqual([])
  })

  it('spread last: explicit testID beats an ambient data-testid, absent testID preserves it', () => {
    const ambient = { 'data-testid': 'from-spread' }
    expect({ ...ambient, ...domTestId('explicit') }).toEqual({ 'data-testid': 'explicit' })
    expect({ ...ambient, ...domTestId(undefined) }).toEqual({ 'data-testid': 'from-spread' })
  })
})
