import { renderHook } from '@testing-library/react'
import { Token } from '@uniswap/sdk-core'
import { UniverseChainId } from '@universe/chains'
import { MultichainTokenOption, OnchainItemListOptionType } from 'uniswap/src/components/lists/items/types'
import { useAddToSearchHistory } from 'uniswap/src/components/TokenSelector/hooks/useAddToSearchHistory'
import { buildCurrencyInfo } from 'uniswap/src/features/dataApi/utils/buildCurrency'
import { SearchHistoryResult, SearchHistoryResultType } from 'uniswap/src/features/search/SearchHistoryResult'
import {
  addToSearchHistory,
  initialSearchHistoryState,
  searchHistoryReducer,
} from 'uniswap/src/features/search/searchHistorySlice'
import { benignSafetyInfo } from 'uniswap/src/test/fixtures/wallet/currencies'
import { currencyId } from 'uniswap/src/utils/currencyId'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockDispatch = vi.fn()
vi.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
}))

const TOKEN_ADDRESS = '0x0000000000000000000000000000000000000001'
const token = new Token(UniverseChainId.ArbitrumOne, TOKEN_ADDRESS, 18, 'TK', 'Token')
const currencyInfo = buildCurrencyInfo({
  currencyId: currencyId(token),
  currency: token,
  logoUrl: null,
  safetyInfo: benignSafetyInfo,
})

function multichainOption(id: string): MultichainTokenOption {
  return {
    type: OnchainItemListOptionType.MultichainToken,
    multichainResult: {
      id,
      name: 'Token',
      symbol: 'TK',
      logoUrl: undefined,
      tokens: [currencyInfo],
      safetyInfo: benignSafetyInfo,
    },
    primaryCurrencyInfo: currencyInfo,
  }
}

function dispatchedSearchResult(): SearchHistoryResult {
  expect(mockDispatch).toHaveBeenCalledTimes(1)
  return mockDispatch.mock.calls[0]?.[0].payload.searchResult
}

describe('useAddToSearchHistory', () => {
  beforeEach(() => {
    mockDispatch.mockClear()
  })

  it('stores a grouped multichain row as a multichain history entry', () => {
    const { result } = renderHook(() => useAddToSearchHistory())

    result.current.registerSearchItem(multichainOption('mc:tk'), { tdpChainFilter: null })

    expect(dispatchedSearchResult()).toMatchObject({
      type: SearchHistoryResultType.MultichainToken,
      multichainId: 'mc:tk',
      tokenCurrencyIds: [currencyInfo.currencyId],
    })
  })

  it('stores a Search V2 ungrouped row (empty multichainId) as a single-chain token the slice accepts', () => {
    const { result } = renderHook(() => useAddToSearchHistory())

    result.current.registerSearchItem(multichainOption(''), { tdpChainFilter: null })

    const searchResult = dispatchedSearchResult()
    expect(searchResult).toEqual({
      type: SearchHistoryResultType.Token,
      chainId: UniverseChainId.ArbitrumOne,
      address: TOKEN_ADDRESS,
    })

    const state = searchHistoryReducer(initialSearchHistoryState, addToSearchHistory({ searchResult }))
    expect(state.results).toHaveLength(1)
  })
})
