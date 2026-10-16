import { renderHook } from '@testing-library/react'
import { UniverseChainId } from '@universe/chains'
import { useNetworkFee } from 'uniswap/src/features/activity/hooks/useNetworkFee'
import { getChainInfo } from 'uniswap/src/features/chains/chainInfo'
import { ValueType } from 'uniswap/src/features/tokens/getCurrencyAmount'
import { useCurrencyInfo } from 'uniswap/src/features/tokens/useCurrencyInfo'
import { TransactionDetails } from 'uniswap/src/features/transactions/types/transactionDetails'
import { ETH_CURRENCY_INFO } from 'uniswap/src/test/fixtures/wallet/currencies'
import { finalizedTransactionDetails } from 'uniswap/src/test/fixtures/wallet/transactions'

const mocks = vi.hoisted(() => ({
  useUSDCValueWithStatus: vi.fn((): { value: null; isLoading: boolean } => ({ value: null, isLoading: false })),
}))

vi.mock('uniswap/src/features/tokens/useCurrencyInfo', () => ({
  useCurrencyInfo: vi.fn(),
}))

vi.mock('uniswap/src/features/transactions/hooks/useUSDCPrice', () => ({
  useUSDCValueWithStatus: mocks.useUSDCValueWithStatus,
}))

vi.mock('uniswap/src/features/language/LocalizationContext', () => ({
  useLocalizationContext: () => ({
    formatCurrencyAmount: ({ value }: { value: { toExact(): string } | null | undefined }) =>
      value ? value.toExact() : '-',
    convertFiatAmountFormatted: (value: number) => `$${value}`,
    formatNumberOrString: ({ value }: { value: number }) => `${value}`,
  }),
}))

describe('useNetworkFee', () => {
  beforeEach(() => {
    vi.mocked(useCurrencyInfo).mockReturnValue(ETH_CURRENCY_INFO)
  })

  it('returns the receipt-derived fee amount for a finalized tx with networkFee', () => {
    const tx: TransactionDetails = finalizedTransactionDetails({
      chainId: UniverseChainId.Mainnet,
      networkFee: {
        quantity: '0.000042',
        tokenSymbol: 'ETH',
        tokenAddress: getChainInfo(UniverseChainId.Mainnet).nativeCurrency.address,
        chainId: UniverseChainId.Mainnet,
        valueType: ValueType.Exact,
      },
    })

    const { result } = renderHook(() => useNetworkFee(tx))

    expect(result.current.amount).toBe('0.000042')
    expect(result.current.amount).not.toBe('0')
  })

  it('coerces a finalized tx without networkFee to a zero amount', () => {
    const tx: TransactionDetails = finalizedTransactionDetails({
      chainId: UniverseChainId.Mainnet,
      networkFee: undefined,
    })

    const { result } = renderHook(() => useNetworkFee(tx))

    expect(result.current.amount).toBe('0')
  })
})
