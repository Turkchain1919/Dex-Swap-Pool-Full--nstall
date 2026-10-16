import { describe, expect, it } from 'vitest'
import { getAnimationOffsets } from './types'

/**
 * Offset table transcribed from the legacy `getAnimationOffsets`
 * (ui/src/animations/components/AnimatePresencePager.tsx): enter comes from
 * where the page travels FROM, exit goes the same way the motion continues.
 */
describe('getAnimationOffsets', () => {
  it.each([
    ['forward', { x: 10, y: 0 }, { x: -10, y: 0 }],
    ['backward', { x: -10, y: 0 }, { x: 10, y: 0 }],
    ['up', { x: 0, y: 10 }, { x: 0, y: -10 }],
    ['down', { x: 0, y: -10 }, { x: 0, y: 10 }],
    ['fade', { x: 0, y: 0 }, { x: 0, y: 0 }],
  ] as const)('%s matches the legacy variant', (animationType, enterOffset, exitOffset) => {
    expect(getAnimationOffsets(animationType, 10)).toEqual({ enterOffset, exitOffset })
  })

  it('scales with distance', () => {
    expect(getAnimationOffsets('forward', 25)).toEqual({
      enterOffset: { x: 25, y: 0 },
      exitOffset: { x: -25, y: 0 },
    })
  })
})
