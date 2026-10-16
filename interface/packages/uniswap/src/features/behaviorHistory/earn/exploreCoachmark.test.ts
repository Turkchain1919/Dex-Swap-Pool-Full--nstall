import { selectHasDismissedExploreEarnCoachmark } from 'uniswap/src/features/behaviorHistory/selectors'
import {
  initialUniswapBehaviorHistoryState,
  setExploreEarnCoachmarkDismissed,
  uniswapBehaviorHistoryReducer,
} from 'uniswap/src/features/behaviorHistory/slice'
import type { UniswapState } from 'uniswap/src/state/uniswapReducer'

describe('Explore Earn coachmark behavior history', () => {
  it('defaults to not dismissed for existing persisted state', () => {
    const { hasDismissedExploreEarnCoachmark: _newField, ...legacyBehaviorHistory } = initialUniswapBehaviorHistoryState
    const state = {
      uniswapBehaviorHistory: legacyBehaviorHistory,
    } as UniswapState

    expect(selectHasDismissedExploreEarnCoachmark(state)).toBe(false)
  })

  it('persists dismissal and supports explicitly resetting it', () => {
    const dismissedBehaviorHistory = uniswapBehaviorHistoryReducer(
      initialUniswapBehaviorHistoryState,
      setExploreEarnCoachmarkDismissed(),
    )

    expect(
      selectHasDismissedExploreEarnCoachmark({
        uniswapBehaviorHistory: dismissedBehaviorHistory,
      } as UniswapState),
    ).toBe(true)

    const resetBehaviorHistory = uniswapBehaviorHistoryReducer(
      dismissedBehaviorHistory,
      setExploreEarnCoachmarkDismissed(false),
    )

    expect(
      selectHasDismissedExploreEarnCoachmark({
        uniswapBehaviorHistory: resetBehaviorHistory,
      } as UniswapState),
    ).toBe(false)
  })
})
