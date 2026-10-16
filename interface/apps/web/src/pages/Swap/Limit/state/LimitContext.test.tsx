const mocks = vi.hoisted(() => ({ marketPriceRejected: false }))

vi.mock('~/pages/Swap/Limit/state/hooks', () => ({
  useDerivedLimitInfo: () => ({
    currencyBalances: {},
    parsedAmounts: {},
    marketPrice: undefined,
    marketPriceRejected: mocks.marketPriceRejected,
  }),
}))

import { ReactElement } from 'react'
import { LimitContextProvider, useLimitContext } from '~/pages/Swap/Limit/state/LimitContext'
import { LimitContextType } from '~/pages/Swap/Limit/state/types'
import { act, render } from '~/test-utils/render'

let latestContext: LimitContextType | undefined

function ContextProbe() {
  latestContext = useLimitContext()
  return null
}

function renderProvider() {
  return render(
    <LimitContextProvider>
      <ContextProbe />
    </LimitContextProvider>,
  )
}

function rerenderProvider(rerender: (ui: ReactElement) => void) {
  rerender(
    <LimitContextProvider>
      <ContextProbe />
    </LimitContextProvider>,
  )
}

describe('LimitContextProvider limit price clearing', () => {
  beforeEach(() => {
    mocks.marketPriceRejected = false
    latestContext = undefined
  })

  it('clears a prefilled limit price when the market-price reference is rejected', () => {
    const { rerender } = renderProvider()

    // Simulate the market-price prefill, which does not mark the price as user-edited
    act(() => latestContext?.setLimitState((prev) => ({ ...prev, limitPrice: '100' })))
    expect(latestContext?.limitState.limitPrice).toBe('100')

    mocks.marketPriceRejected = true
    rerenderProvider(rerender)

    expect(latestContext?.limitState.limitPrice).toBe('')
  })

  it('leaves the limit price alone while the reference is merely unavailable (loading)', () => {
    const { rerender } = renderProvider()

    act(() => latestContext?.setLimitState((prev) => ({ ...prev, limitPrice: '100' })))
    rerenderProvider(rerender)

    expect(latestContext?.limitState.limitPrice).toBe('100')
  })

  it('keeps a user-typed price entered after the reference was rejected', () => {
    mocks.marketPriceRejected = true
    renderProvider()

    // Simulate the user typing a price, which marks it as edited
    act(() => latestContext?.setLimitState((prev) => ({ ...prev, limitPrice: '105', limitPriceEdited: true })))

    expect(latestContext?.limitState.limitPrice).toBe('105')
  })
})
