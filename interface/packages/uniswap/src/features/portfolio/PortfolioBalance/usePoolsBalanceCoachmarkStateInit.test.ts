import { configureStore, type EnhancedStore } from '@reduxjs/toolkit'
import { FeatureFlags } from '@universe/gating'
import type { AnyAction } from 'redux'
import type { PersistState } from 'redux-persist'
import { initialUniswapBehaviorHistoryState } from 'uniswap/src/features/behaviorHistory/slice'
import { usePoolsBalanceCoachmarkStateInit } from 'uniswap/src/features/portfolio/PortfolioBalance/usePoolsBalanceCoachmarkStateInit'
import { uniswapReducer, type UniswapState } from 'uniswap/src/state/uniswapReducer'
import { renderHookWithProviders } from 'uniswap/src/test/render'

const { mockUseFeatureFlag, mockUseStatsigClientStatus } = vi.hoisted(() => ({
  mockUseFeatureFlag: vi.fn(),
  mockUseStatsigClientStatus: vi.fn(),
}))

vi.mock('@universe/gating', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@universe/gating')>()),
  useFeatureFlag: mockUseFeatureFlag,
  useFeatureFlagWithExposureLoggingDisabled: mockUseFeatureFlag,
  useStatsigClientStatus: mockUseStatsigClientStatus,
}))

type StateWithPersist = UniswapState & { _persist: PersistState }

/** Builds a store whose state carries `_persist`, which the plain combined test reducer strips. */
const makeStore = ({
  rehydrated,
  hasDismissedPoolsBalanceCoachmark,
}: {
  rehydrated: boolean
  hasDismissedPoolsBalanceCoachmark?: boolean
}): EnhancedStore<UniswapState> => {
  const persist: PersistState = { version: 1, rehydrated }
  const reducer = (state: UniswapState | undefined, action: AnyAction): UniswapState => {
    // Strip `_persist` before delegating so combineReducers doesn't warn about the unknown key.
    let uniswapState: UniswapState | undefined
    if (state) {
      const { _persist: _stripped, ...rest } = state as StateWithPersist
      uniswapState = rest
    }
    const nextState: StateWithPersist = { ...uniswapReducer(uniswapState, action), _persist: persist }
    return nextState
  }
  const preloadedState: StateWithPersist = {
    ...uniswapReducer(undefined, { type: 'test/init' }),
    uniswapBehaviorHistory: {
      ...initialUniswapBehaviorHistoryState,
      hasDismissedPoolsBalanceCoachmark,
    },
    _persist: persist,
  }
  return configureStore({ reducer, preloadedState })
}

const setStatsigReady = (isStatsigReady: boolean) => {
  mockUseStatsigClientStatus.mockReturnValue({
    isStatsigReady,
    isStatsigLoading: !isStatsigReady,
    isStatsigUninitialized: false,
  })
}

const getInitializedValue = (store: EnhancedStore<UniswapState>): boolean | undefined =>
  store.getState().uniswapBehaviorHistory.hasDismissedPoolsBalanceCoachmark

describe(usePoolsBalanceCoachmarkStateInit, () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setStatsigReady(true)
    mockUseFeatureFlag.mockImplementation((flag) => flag === FeatureFlags.PortfolioPoolsBalances)
  })

  it('initializes fresh state as never-show when the flag is already on', () => {
    const store = makeStore({ rehydrated: true })
    renderHookWithProviders(() => usePoolsBalanceCoachmarkStateInit(), { store })
    expect(getInitializedValue(store)).toBe(true)
  })

  it('initializes fresh state as eligible when the flag is still off', () => {
    mockUseFeatureFlag.mockReturnValue(false)
    const store = makeStore({ rehydrated: true })
    renderHookWithProviders(() => usePoolsBalanceCoachmarkStateInit(), { store })
    expect(getInitializedValue(store)).toBe(false)
  })

  it('never overwrites an existing value', () => {
    const store = makeStore({ rehydrated: true, hasDismissedPoolsBalanceCoachmark: false })
    renderHookWithProviders(() => usePoolsBalanceCoachmarkStateInit(), { store })
    expect(getInitializedValue(store)).toBe(false)
  })

  it('does not initialize before rehydration', () => {
    const store = makeStore({ rehydrated: false })
    renderHookWithProviders(() => usePoolsBalanceCoachmarkStateInit(), { store })
    expect(getInitializedValue(store)).toBeUndefined()
  })

  it('does not initialize before Statsig is ready', () => {
    setStatsigReady(false)
    const store = makeStore({ rehydrated: true })
    renderHookWithProviders(() => usePoolsBalanceCoachmarkStateInit(), { store })
    expect(getInitializedValue(store)).toBeUndefined()
  })
})
