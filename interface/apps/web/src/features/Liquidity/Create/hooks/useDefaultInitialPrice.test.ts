import { Price, Token } from '@uniswap/sdk-core'
import JSBI from 'jsbi'
import { USDC } from 'uniswap/src/constants/tokens'
import { useUSDCPrice } from 'uniswap/src/features/transactions/hooks/useUSDCPrice'
import { ETH } from 'uniswap/src/test/fixtures/lib/sdk'
import { logger } from 'utilities/src/logger/logger'
import { useDefaultInitialPrice } from '~/features/Liquidity/Create/hooks/useDefaultInitialPrice'
import { renderHook } from '~/test-utils/render'
import { PositionField } from '~/types/position'

vi.mock('uniswap/src/features/transactions/hooks/useUSDCPrice', async (importOriginal) => {
  const actual = await importOriginal<typeof import('uniswap/src/features/transactions/hooks/useUSDCPrice')>()
  return { ...actual, useUSDCPrice: vi.fn(() => ({ price: undefined, isLoading: false, isStaleRefreshing: false })) }
})

const useUSDCPriceMock = vi.mocked(useUSDCPrice)

/** USD per whole token, as useUSDCPrice returns it (Price<token, stablecoin>). */
function usdcPrice(token: Token, usdPerToken: number): Price<Token, Token> {
  return new Price(
    token,
    USDC,
    JSBI.BigInt(10 ** token.decimals),
    JSBI.BigInt(Math.round(usdPerToken * 10 ** USDC.decimals)),
  )
}

describe('useDefaultInitialPrice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useUSDCPriceMock.mockReturnValue({ price: undefined, isLoading: false, isStaleRefreshing: false })
  })

  it('derives token1-per-token0 from each token USD price', () => {
    useUSDCPriceMock.mockImplementation((currency) => {
      if (currency?.equals(ETH)) {
        return { price: usdcPrice(ETH, 2000), isLoading: false, isStaleRefreshing: false }
      }
      if (currency?.equals(USDC)) {
        return { price: usdcPrice(USDC, 1), isLoading: false, isStaleRefreshing: false }
      }
      return { price: undefined, isLoading: false, isStaleRefreshing: false }
    })

    const currencies = {
      [PositionField.TOKEN0]: ETH,
      [PositionField.TOKEN1]: USDC,
    }

    const { result } = renderHook(() => useDefaultInitialPrice({ currencies }))

    expect(result.current.price?.toSignificant(8)).toEqual('2000')
    expect(result.current.price?.invert().toSignificant(8)).toEqual('0.0005')
    expect(result.current.isLoading).toEqual(false)
  })

  it('inverts orientation when token0/token1 are swapped', () => {
    useUSDCPriceMock.mockImplementation((currency) => {
      if (currency?.equals(ETH)) {
        return { price: usdcPrice(ETH, 2000), isLoading: false, isStaleRefreshing: false }
      }
      if (currency?.equals(USDC)) {
        return { price: usdcPrice(USDC, 1), isLoading: false, isStaleRefreshing: false }
      }
      return { price: undefined, isLoading: false, isStaleRefreshing: false }
    })

    const currencies = {
      [PositionField.TOKEN0]: USDC,
      [PositionField.TOKEN1]: ETH,
    }

    const { result } = renderHook(() => useDefaultInitialPrice({ currencies }))

    expect(result.current.price?.toSignificant(8)).toEqual('0.0005')
    expect(result.current.price?.invert().toSignificant(8)).toEqual('2000')
  })

  it('reports loading while a leg is still fetching', () => {
    useUSDCPriceMock.mockImplementation((currency) => {
      if (currency?.equals(ETH)) {
        return { price: usdcPrice(ETH, 2000), isLoading: false, isStaleRefreshing: false }
      }
      return { price: undefined, isLoading: true, isStaleRefreshing: false }
    })

    const currencies = {
      [PositionField.TOKEN0]: ETH,
      [PositionField.TOKEN1]: USDC,
    }

    const { result } = renderHook(() => useDefaultInitialPrice({ currencies }))

    expect(result.current.price).toBeUndefined()
    expect(result.current.isLoading).toEqual(true)
  })

  it('settles with no price when a token has no USD price', () => {
    useUSDCPriceMock.mockReturnValue({ price: undefined, isLoading: false, isStaleRefreshing: false })

    const currencies = {
      [PositionField.TOKEN0]: ETH,
      [PositionField.TOKEN1]: USDC,
    }

    const { result } = renderHook(() => useDefaultInitialPrice({ currencies }))

    expect(result.current).toEqual({ price: undefined, isLoading: false })
  })

  it('returns undefined and warns when the ratio math throws on mismatched currencies', () => {
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => undefined)
    // usdPriceIn's base is USDC, not ETH, so usdPriceIn.quote(1 ETH) throws a currency mismatch —
    // the "both legs share the pool's chain" invariant failing, which the catch must swallow to
    // undefined (and warn) rather than crash the range step.
    useUSDCPriceMock.mockImplementation((currency) => {
      if (currency?.equals(ETH)) {
        return { price: usdcPrice(USDC, 1), isLoading: false, isStaleRefreshing: false }
      }
      if (currency?.equals(USDC)) {
        return { price: usdcPrice(USDC, 1), isLoading: false, isStaleRefreshing: false }
      }
      return { price: undefined, isLoading: false, isStaleRefreshing: false }
    })

    const currencies = {
      [PositionField.TOKEN0]: ETH,
      [PositionField.TOKEN1]: USDC,
    }

    const { result } = renderHook(() => useDefaultInitialPrice({ currencies }))

    expect(result.current).toEqual({ price: undefined, isLoading: false })
    expect(warnSpy).toHaveBeenCalledWith(
      'useDefaultInitialPrice',
      'useDefaultInitialPrice',
      expect.any(String),
      expect.objectContaining({ token0ChainId: ETH.chainId, token1ChainId: USDC.chainId }),
    )
  })

  it('does not fetch when skipped', () => {
    useUSDCPriceMock.mockImplementation((currency) => {
      if (currency?.equals(ETH)) {
        return { price: usdcPrice(ETH, 2000), isLoading: false, isStaleRefreshing: false }
      }
      if (currency?.equals(USDC)) {
        return { price: usdcPrice(USDC, 1), isLoading: false, isStaleRefreshing: false }
      }
      return { price: undefined, isLoading: false, isStaleRefreshing: false }
    })

    const currencies = {
      [PositionField.TOKEN0]: ETH,
      [PositionField.TOKEN1]: USDC,
    }

    const { result } = renderHook(() => useDefaultInitialPrice({ currencies, skip: true }))

    expect(result.current).toEqual({ price: undefined, isLoading: false })
    // both legs are called with `undefined` so no subscription is opened
    expect(useUSDCPriceMock).toHaveBeenCalledWith(undefined)
    expect(useUSDCPriceMock).not.toHaveBeenCalledWith(ETH)
  })
})
