import { FeatureFlags, useFeatureFlagWithExposureLoggingDisabled, useStatsigClientStatus } from '@universe/gating'
import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { PersistState } from 'redux-persist'
import { selectPoolsBalanceCoachmarkDismissed } from 'uniswap/src/features/behaviorHistory/selectors'
import { initializePoolsBalanceCoachmarkDismissed } from 'uniswap/src/features/behaviorHistory/slice'
import type { UniswapState } from 'uniswap/src/state/uniswapReducer'

const selectIsRehydrated = (state: UniswapState & { _persist?: PersistState }): boolean =>
  state._persist?.rehydrated === true

/**
 * Classifies fresh persisted state for the pools-balance coachmark, once per install.
 *
 * A migration marks installs that predate the pools-balances launch as eligible (`false`). State
 * created after that migration shipped (fresh installs, cleared web storage, post-reset) has no
 * value, so on startup we initialize it from the flag: flag already on → the user joined after launch,
 * never show (`true`); flag still off → pre-launch cohort, eligible (`false`).
 *
 * Both guards are load-bearing: dispatching before rehydration would make autoMergeLevel1 discard
 * the persisted slice, and reading the flag before Statsig is ready returns the default (`false`),
 * which would mis-classify post-launch installs as eligible.
 */
export function usePoolsBalanceCoachmarkStateInit(): void {
  const dispatch = useDispatch()
  // Read without logging; the pools exposure is logged only where the feature is actually shown.
  const portfolioPoolsBalancesEnabled = useFeatureFlagWithExposureLoggingDisabled(FeatureFlags.PortfolioPoolsBalances)
  const { isStatsigReady } = useStatsigClientStatus()
  const isRehydrated = useSelector(selectIsRehydrated)
  const isInitialized = useSelector(selectPoolsBalanceCoachmarkDismissed) !== undefined

  useEffect(() => {
    if (isStatsigReady && isRehydrated && !isInitialized) {
      dispatch(initializePoolsBalanceCoachmarkDismissed(portfolioPoolsBalancesEnabled))
    }
  }, [isStatsigReady, isRehydrated, isInitialized, portfolioPoolsBalancesEnabled, dispatch])
}
