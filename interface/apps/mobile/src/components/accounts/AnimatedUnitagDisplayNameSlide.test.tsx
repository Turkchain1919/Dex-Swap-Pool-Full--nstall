// Lives in apps/mobile with an explicit .native import: wallet's vitest config resolves the web leg, so a wallet-package test would exercise the wrong platform.
import { getUnitagSlideConfig } from 'wallet/src/components/accounts/AnimatedUnitagDisplayName.native'

const SUFFIX_WIDTH = 162

// Pins the reveal geometry; the animation itself is not assertable with Reanimated mocked.
describe('getUnitagSlideConfig', () => {
  describe('when the name is short enough to slide', () => {
    it('carries the whole reveal on the transform and holds the margin constant', () => {
      const hidden = getUnitagSlideConfig({
        shouldAnimateSlide: true,
        unitagSuffixTextWidth: SUFFIX_WIDTH,
        showUnitagSuffix: false,
      })
      const revealed = getUnitagSlideConfig({
        shouldAnimateSlide: true,
        unitagSuffixTextWidth: SUFFIX_WIDTH,
        showUnitagSuffix: true,
      })

      expect(hidden.unitagSlideX).toBe(0)
      expect(revealed.unitagSlideX).toBe(SUFFIX_WIDTH)
      expect(revealed.unitagOffset).toBe(hidden.unitagOffset)
    })
  })

  describe('when the name is too long to slide', () => {
    it('pins the transform at zero and carries the whole reveal on the margin', () => {
      const hidden = getUnitagSlideConfig({
        shouldAnimateSlide: false,
        unitagSuffixTextWidth: SUFFIX_WIDTH,
        showUnitagSuffix: false,
      })
      const revealed = getUnitagSlideConfig({
        shouldAnimateSlide: false,
        unitagSuffixTextWidth: SUFFIX_WIDTH,
        showUnitagSuffix: true,
      })

      expect(hidden.unitagSlideX).toBe(0)
      expect(revealed.unitagSlideX).toBe(0)
      expect(hidden.unitagOffset).toBe(-SUFFIX_WIDTH)
      expect(revealed.unitagOffset).toBe(0)
    })
  })
})
