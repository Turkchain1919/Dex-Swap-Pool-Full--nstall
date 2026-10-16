import { renderHook } from '@testing-library/react'
import { TradeType } from '@uniswap/sdk-core'
import { TradingApi } from '@universe/api/src'
import { useTransactionDetailSeparatorsRenderState } from 'uniswap/src/components/activity/details/getTransactionDetailSeparatorsRenderState'
import { useCurrencyInfo } from 'uniswap/src/features/tokens/useCurrencyInfo'
import {
  TransactionDetails,
  TransactionOriginType,
  TransactionStatus,
  TransactionType,
} from 'uniswap/src/features/transactions/types/transactionDetails'
import { ETH_CURRENCY_INFO, SAMPLE_SEED_ADDRESS_1 } from 'uniswap/src/test/fixtures'

vi.mock('uniswap/src/features/tokens/useCurrencyInfo', () => ({
  useCurrencyInfo: vi.fn(),
}))

function buildTransaction(typeInfo: TransactionDetails['typeInfo']): TransactionDetails {
  return {
    id: '9920dbad-ff24-47c8-814a-094566fc45ff',
    chainId: 1,
    routing: TradingApi.Routing.CLASSIC,
    from: SAMPLE_SEED_ADDRESS_1,
    transactionOriginType: TransactionOriginType.Internal,
    typeInfo,
    status: TransactionStatus.Success,
    addedTime: 1719911758204,
    options: { request: {} },
    hash: 'b568a9e9-bbe7-42fc-ab00-5070186c0600',
  }
}

const swapTypeInfo: TransactionDetails['typeInfo'] = {
  type: TransactionType.Swap,
  inputCurrencyId: '1-0x0000000000000000000000000000000000000000',
  outputCurrencyId: '1-0x2e8b8dafe7faa3aa2bbcd27cda50ebcdfbd8710c',
  inputCurrencyAmountRaw: '1000000000000000000',
  expectedOutputCurrencyAmountRaw: '1000000',
  minimumOutputCurrencyAmountRaw: '900000',
  tradeType: TradeType.EXACT_INPUT,
}

const nftMintTypeInfo: TransactionDetails['typeInfo'] = {
  type: TransactionType.NFTMint,
  nftSummaryInfo: {
    address: '0x2e8b8dafe7faa3aa2bbcd27cda50ebcdfbd8710c',
    collectionName: 'Test Collection',
    imageURL: 'https://example.com/image.png',
    name: 'Test NFT',
    tokenId: '1',
  },
  purchaseCurrencyId: '1-0x0000000000000000000000000000000000000000',
  purchaseCurrencyAmountRaw: '1000000000000000000',
}

const unknownTypeInfo: TransactionDetails['typeInfo'] = {
  type: TransactionType.Unknown,
  tokenAddress: '0x2e8b8dafe7faa3aa2bbcd27cda50ebcdfbd8710c',
}

// Unresolvable token metadata (the Revoke.cash / Permit2Approve scenario that produced the
// double-divider bug) — ApproveTransactionDetails renders nothing for this, so the top separator
// needs to hide as well.
const unresolvedPermit2ApproveTypeInfo: TransactionDetails['typeInfo'] = {
  type: TransactionType.Permit2Approve,
  tokenAddress: '0x2e8b8dafe7faa3aa2bbcd27cda50ebcdfbd8710c',
  spender: '0xf097e7bed97db1bccd9b067a564aca3d4e5da1f4',
  amount: '0.0',
  dappInfo: { name: 'Revoke.cash' },
}

describe('useTransactionDetailSeparatorsRenderState', () => {
  beforeEach(() => {
    vi.mocked(useCurrencyInfo).mockReturnValue(ETH_CURRENCY_INFO)
  })

  it('shows both separators for a regular transaction with resolved content', () => {
    const { result } = renderHook(() => useTransactionDetailSeparatorsRenderState(buildTransaction(swapTypeInfo)))

    expect(result.current).toEqual({ hideTopSeparator: false, hideBottomSeparator: false })
  })

  it('hides both separators for an NFT transaction', () => {
    const { result } = renderHook(() => useTransactionDetailSeparatorsRenderState(buildTransaction(nftMintTypeInfo)))

    expect(result.current).toEqual({ hideTopSeparator: true, hideBottomSeparator: true })
  })

  it('hides only the top separator for an unknown transaction type', () => {
    const { result } = renderHook(() => useTransactionDetailSeparatorsRenderState(buildTransaction(unknownTypeInfo)))

    expect(result.current).toEqual({ hideTopSeparator: true, hideBottomSeparator: false })
  })

  it('hides only the top separator when the Permit2 approval content is empty', () => {
    vi.mocked(useCurrencyInfo).mockReturnValue(undefined)

    const { result } = renderHook(() =>
      useTransactionDetailSeparatorsRenderState(buildTransaction(unresolvedPermit2ApproveTypeInfo)),
    )

    expect(result.current).toEqual({ hideTopSeparator: true, hideBottomSeparator: false })
  })
})
