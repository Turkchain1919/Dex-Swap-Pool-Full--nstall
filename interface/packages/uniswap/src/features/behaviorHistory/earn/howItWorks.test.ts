import { selectHasAcknowledgedEarnHowItWorks } from 'uniswap/src/features/behaviorHistory/selectors'
import {
  initialUniswapBehaviorHistoryState,
  setHasAcknowledgedEarnHowItWorks,
  uniswapBehaviorHistoryReducer,
} from 'uniswap/src/features/behaviorHistory/slice'
import type { UniswapState } from 'uniswap/src/state/uniswapReducer'

describe('Earn How it works behavior history', () => {
  it('defaults to not acknowledged for existing persisted state', () => {
    const { earnHowItWorksAcknowledgedByVaultId: _newField, ...legacyBehaviorHistory } =
      initialUniswapBehaviorHistoryState
    const state = {
      uniswapBehaviorHistory: legacyBehaviorHistory,
    } as UniswapState

    expect(selectHasAcknowledgedEarnHowItWorks(state)).toBe(false)
  })

  it('treats an acknowledgement for any vault as a global acknowledgement', () => {
    const behaviorHistory = uniswapBehaviorHistoryReducer(
      initialUniswapBehaviorHistoryState,
      setHasAcknowledgedEarnHowItWorks({ vaultId: 'vault-a' }),
    )
    const state = { uniswapBehaviorHistory: behaviorHistory } as UniswapState

    expect(selectHasAcknowledgedEarnHowItWorks(state)).toBe(true)
  })
})
