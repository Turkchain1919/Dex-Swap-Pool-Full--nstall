import { migration64 } from '~/state/migrations/64'

describe('migration64', () => {
  it('returns undefined when state is undefined', () => {
    expect(migration64(undefined)).toBeUndefined()
  })

  it('bumps the persisted version to 64 and marks the pools coachmark eligible, overwriting the old default', () => {
    const previousState = {
      _persist: { version: 63, rehydrated: true },
      uniswapBehaviorHistory: {
        hasDismissedPoolsBalanceCoachmark: true,
        hasViewedBridgingBanner: true,
      },
    }
    const result: any = migration64(previousState as any)
    expect(result._persist.version).toBe(64)
    expect(result.uniswapBehaviorHistory.hasDismissedPoolsBalanceCoachmark).toBe(false)
    expect(result.uniswapBehaviorHistory.hasViewedBridgingBanner).toBe(true)
  })

  it('keeps state intact when uniswapBehaviorHistory is missing', () => {
    const previousState = {
      _persist: { version: 63, rehydrated: true },
      user: { something: true },
    }
    const result: any = migration64(previousState as any)
    expect(result._persist.version).toBe(64)
    expect(result.user).toEqual({ something: true })
  })
})
