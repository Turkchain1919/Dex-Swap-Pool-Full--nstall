import { RwaCategory } from '@uniswap/client-data-api/dist/data/v1/api_pb'
import { useExpandRWASiblingHandler } from 'uniswap/src/features/rwa/hooks/useExpandRWASiblingHandler'
import type { RWAMatch } from 'uniswap/src/features/rwa/rwaMatch'
import { UniswapEventName } from 'uniswap/src/features/telemetry/constants'
import { sendAnalyticsEvent } from 'uniswap/src/features/telemetry/send'
import { renderHook } from 'uniswap/src/test/test-utils'
import type { Mock } from 'vitest'

vi.mock('uniswap/src/features/telemetry/send')

const MAINNET_CHAIN_ID = 1
const TSLA_ADDRESS = '0xf6b1117ec07684D3958caD8BEb1b302bfD21103f'

function match({ issuer = 'ondo' } = {}): RWAMatch {
  return {
    asset: { symbol: 'TSLA', name: 'Tesla', icon: 'icon.png', category: RwaCategory.STOCKS, tokens: [] },
    token: {
      chainId: MAINNET_CHAIN_ID,
      address: TSLA_ADDRESS,
      issuer,
      name: 'Ondo',
      symbol: 'TSLA.on',
      logoUrl: 'logo.png',
    },
  }
}

describe(useExpandRWASiblingHandler, () => {
  const mockSendAnalyticsEvent = sendAnalyticsEvent as Mock

  beforeEach(() => {
    mockSendAnalyticsEvent.mockClear()
  })

  it('expands and fires with the viewed TDP token identity and the total sibling variant count', () => {
    const setIsExpanded = vi.fn()
    const { result } = renderHook(() =>
      useExpandRWASiblingHandler({ rwaMatch: match(), variantCount: 3, isExpanded: false, setIsExpanded }),
    )

    result.current()

    expect(setIsExpanded).toHaveBeenCalledWith(true)
    expect(mockSendAnalyticsEvent).toHaveBeenCalledTimes(1)
    expect(mockSendAnalyticsEvent).toHaveBeenCalledWith(UniswapEventName.RWASiblingExpanded, {
      tokenAddress: TSLA_ADDRESS,
      tokenSymbol: 'TSLA.on',
      chainId: MAINNET_CHAIN_ID,
      issuer: 'ondo',
      variantCount: 3,
    })
  })

  it('collapses without firing', () => {
    const setIsExpanded = vi.fn()
    const { result } = renderHook(() =>
      useExpandRWASiblingHandler({ rwaMatch: match(), variantCount: 3, isExpanded: true, setIsExpanded }),
    )

    result.current()

    expect(setIsExpanded).toHaveBeenCalledWith(false)
    expect(mockSendAnalyticsEvent).not.toHaveBeenCalled()
  })

  it('does not fire when there is no RWA match', () => {
    const setIsExpanded = vi.fn()
    const { result } = renderHook(() =>
      useExpandRWASiblingHandler({ rwaMatch: undefined, variantCount: 3, isExpanded: false, setIsExpanded }),
    )

    result.current()

    expect(setIsExpanded).toHaveBeenCalledWith(true)
    expect(mockSendAnalyticsEvent).not.toHaveBeenCalled()
  })

  it('does not fire until the returned handler is invoked', () => {
    renderHook(() =>
      useExpandRWASiblingHandler({ rwaMatch: match(), variantCount: 3, isExpanded: false, setIsExpanded: vi.fn() }),
    )

    expect(mockSendAnalyticsEvent).not.toHaveBeenCalled()
  })
})
