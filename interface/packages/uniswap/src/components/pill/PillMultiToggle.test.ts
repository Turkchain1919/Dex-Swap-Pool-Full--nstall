import { SPORE_ANIMATION_CURVE_CSS } from '@universe/tailwind/animations'
import { getPillIndicatorWebStyle } from 'uniswap/src/components/pill/PillMultiToggle'

const FAST = SPORE_ANIMATION_CURVE_CSS.fast

describe('getPillIndicatorWebStyle', () => {
  it('hides the indicator until the selected pill has a layout', () => {
    expect(getPillIndicatorWebStyle(undefined, false)).toEqual({ opacity: 0 })
  })

  it('fades in place on first placement: geometry seeded, transition scoped to opacity', () => {
    const style = getPillIndicatorWebStyle({ x: 12, y: 4, width: 80, height: 32 }, false)
    expect(style).toEqual({
      opacity: 1,
      width: 80,
      height: 32,
      transform: 'translate(12px, 4px)',
      transition: `opacity ${FAST}`,
    })
  })

  it('slides/resizes on selection once placed: geometry joins the fast-curve transition', () => {
    const style = getPillIndicatorWebStyle({ x: 12, y: 4, width: 80, height: 32 }, true)
    expect(style).toEqual({
      opacity: 1,
      width: 80,
      height: 32,
      transform: 'translate(12px, 4px)',
      transition: `opacity ${FAST}, width ${FAST}, height ${FAST}, transform ${FAST}`,
    })
  })
})
