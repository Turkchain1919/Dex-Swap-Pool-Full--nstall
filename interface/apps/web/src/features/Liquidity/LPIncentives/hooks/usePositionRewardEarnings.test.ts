import type { PlainMessage } from '@bufbuild/protobuf'
import { RewardBalance, Token } from '@uniswap/client-data-api/dist/data/v1/poolTypes_pb'
import { Token as SdkToken } from '@uniswap/sdk-core'
import { UniverseChainId } from '@universe/chains'
import { ZERO_ADDRESS } from 'uniswap/src/constants/misc'
import { getPrimaryStablecoin } from 'uniswap/src/features/chains/utils'
import type { CurrencyInfo } from 'uniswap/src/features/dataApi/types'
import { buildCurrencyInfo } from 'uniswap/src/features/dataApi/utils/buildCurrency'
import { useCurrencyInfos } from 'uniswap/src/features/tokens/useCurrencyInfo'
import { currencyId } from 'uniswap/src/utils/currencyId'
import type { PositionRewardBalance } from '~/features/Liquidity/LPIncentives/hooks/usePositionRewardEarnings'
import {
  selectPositionRewardBalances,
  usePositionRewardEarnings,
} from '~/features/Liquidity/LPIncentives/hooks/usePositionRewardEarnings'
import { mocked } from '~/test-utils/mocked'
import { renderHook } from '~/test-utils/render'

vi.mock('uniswap/src/features/tokens/useCurrencyInfo', async (importOriginal) => ({
  ...(await importOriginal<typeof import('uniswap/src/features/tokens/useCurrencyInfo')>()),
  useCurrencyInfos: vi.fn(),
}))

const UNI_MAINNET = '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984'
const USDC_MAINNET = getPrimaryStablecoin(UniverseChainId.Mainnet).address
const USDC_BASE = getPrimaryStablecoin(UniverseChainId.Base).address

// Real protobuf messages, not literals: `unclaimed_amount_usd` is `optional` in the proto, so an
// omitted price has to stay `undefined` rather than deserializing to a `0` the ordering would then
// rank as priced. A cast would hide a regression there.
function balance({
  chainId = UniverseChainId.Mainnet,
  address = UNI_MAINNET,
  unclaimedAmount = '1000000000000000000',
  unclaimedAmountUsd,
  isNative = false,
  decimals = 18,
}: {
  chainId?: number
  address?: string
  unclaimedAmount?: string
  unclaimedAmountUsd?: number
  isNative?: boolean
  decimals?: number
}): PlainMessage<RewardBalance> {
  return new RewardBalance({
    token: new Token({ chainId, address, decimals, symbol: 'TKN', name: 'Token', isNative }),
    unclaimedAmount,
    unclaimedAmountUsd,
  }) as PlainMessage<RewardBalance>
}

function listedToken(decimals: number): CurrencyInfo {
  const currency = new SdkToken(UniverseChainId.Mainnet, UNI_MAINNET, decimals, 'UNI', 'Uniswap')
  return buildCurrencyInfo({ currency, currencyId: currencyId(currency), logoUrl: null, isSpam: false })
}

describe('selectPositionRewardBalances', () => {
  it('keeps one entry per reward denomination', () => {
    const result = selectPositionRewardBalances([
      balance({ address: UNI_MAINNET, unclaimedAmountUsd: 10 }),
      balance({ address: USDC_MAINNET, unclaimedAmountUsd: 52.34 }),
      balance({ chainId: UniverseChainId.Base, address: USDC_BASE, unclaimedAmountUsd: 81.48 }),
    ])

    expect(result.map((entry) => entry.token.address)).toEqual([USDC_BASE, USDC_MAINNET, UNI_MAINNET])
  })

  it('orders by USD value so a reordered response does not reshuffle the rows', () => {
    const ascending = selectPositionRewardBalances([
      balance({ address: UNI_MAINNET, unclaimedAmountUsd: 1 }),
      balance({ address: USDC_MAINNET, unclaimedAmountUsd: 99 }),
    ])
    const descending = selectPositionRewardBalances([
      balance({ address: USDC_MAINNET, unclaimedAmountUsd: 99 }),
      balance({ address: UNI_MAINNET, unclaimedAmountUsd: 1 }),
    ])

    expect(ascending.map((entry) => entry.token.address)).toEqual([USDC_MAINNET, UNI_MAINNET])
    expect(descending).toEqual(ascending)
  })

  it('breaks value ties on address so equal-value rewards keep a stable order', () => {
    const result = selectPositionRewardBalances([
      balance({ address: USDC_MAINNET, unclaimedAmountUsd: 5 }),
      balance({ address: UNI_MAINNET, unclaimedAmountUsd: 5 }),
    ])

    // Passed high-address-first, so a stable tie-break has to reorder them.
    expect(result.map((entry) => entry.token.address)).toEqual(
      [USDC_MAINNET, UNI_MAINNET].sort((a, b) => a.localeCompare(b)),
    )
  })

  it('keeps unpriced rewards but sorts them last', () => {
    const result = selectPositionRewardBalances([
      balance({ address: USDC_MAINNET }),
      balance({ address: UNI_MAINNET, unclaimedAmountUsd: 0.5 }),
    ])

    expect(result.map((entry) => entry.token.address)).toEqual([UNI_MAINNET, USDC_MAINNET])
    expect(result[1].unclaimedAmountUsd).toBeUndefined()
  })

  it('keeps sub-cent rewards — this is what was earned, not what is worth claiming', () => {
    const result = selectPositionRewardBalances([balance({ unclaimedAmount: '1', unclaimedAmountUsd: 0.000001 })])

    expect(result).toHaveLength(1)
  })

  it('drops zero balances', () => {
    expect(selectPositionRewardBalances([balance({ unclaimedAmount: '0', unclaimedAmountUsd: 0 })])).toEqual([])
  })

  it('drops balances with no token or an unknown chain', () => {
    const noToken = new RewardBalance({ unclaimedAmount: '1' }) as PlainMessage<RewardBalance>
    const unknownChain = balance({ chainId: 999999 })

    expect(selectPositionRewardBalances([noToken, unknownChain])).toEqual([])
  })

  it('drops a non-numeric amount rather than throwing through the render', () => {
    expect(selectPositionRewardBalances([balance({ unclaimedAmount: 'not-a-number' })])).toEqual([])
  })

  // Both of these are rejected here rather than downstream on purpose: the earnings headline sums
  // this list while the rows and bar segments are built from it, so a balance dropped later would
  // land in the total with nothing to account for it.
  it('drops an amount over MaxUint256, which no CurrencyAmount can hold', () => {
    expect(selectPositionRewardBalances([balance({ unclaimedAmount: '1'.padEnd(100, '0') })])).toEqual([])
  })

  it('drops a token whose address no Currency can be built from', () => {
    // buildCurrency throws rather than returning undefined on a malformed address, so an unchecked
    // one blanks the position page.
    expect(selectPositionRewardBalances([balance({ address: '0xbbb' })])).toEqual([])
    expect(selectPositionRewardBalances([balance({ address: 'not-an-address' })])).toEqual([])
  })

  it('returns an empty list when the position carries no reward balances', () => {
    expect(selectPositionRewardBalances(undefined)).toEqual([])
    expect(selectPositionRewardBalances([])).toEqual([])
  })
})

// The liquidity service reports a native reward token at the zero address. Both halves of resolving
// it are covered here: the id handed to the token list, and the currency built when the list misses.
describe('usePositionRewardEarnings', () => {
  const nativeBalance = balance({ address: ZERO_ADDRESS, isNative: true, unclaimedAmountUsd: 5 })

  it('looks the token up under the chain native id, not the served zero address', () => {
    mocked(useCurrencyInfos).mockReturnValue([undefined])

    renderHook(() => usePositionRewardEarnings([nativeBalance as PositionRewardBalance]))

    const [currencyIds] = mocked(useCurrencyInfos).mock.calls[0]
    expect(currencyIds[0].toLowerCase()).toBe(`${UniverseChainId.Mainnet}-0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee`)
  })

  it('falls back to the chain native currency when the token list has no entry', () => {
    mocked(useCurrencyInfos).mockReturnValue([undefined])

    const { result } = renderHook(() => usePositionRewardEarnings([nativeBalance as PositionRewardBalance]))

    // Built from the served zero address this was an ERC-20 at 0x000…0, which mislabels the row and
    // makes its amount a token amount rather than a native one.
    expect(result.current[0].currencyInfo.currency.isNative).toBe(true)
    expect(result.current[0].currencyAmount.currency.isNative).toBe(true)
  })

  it('scales by the token list decimals when the served token reports 0', () => {
    mocked(useCurrencyInfos).mockReturnValue([listedToken(18)])

    const { result } = renderHook(() => usePositionRewardEarnings([balance({ decimals: 0 }) as PositionRewardBalance]))

    // A presence-less uint32 arrives as 0 when omitted, and taking it at face value renders the raw
    // integer beside a correct USD figure.
    expect(result.current[0].currencyAmount.toExact()).toBe('1')
  })

  it('keeps the served decimals when the token list has no entry to defer to', () => {
    mocked(useCurrencyInfos).mockReturnValue([undefined])

    const { result } = renderHook(() =>
      usePositionRewardEarnings([balance({ unclaimedAmount: '7', decimals: 0 }) as PositionRewardBalance]),
    )

    expect(result.current[0].currencyAmount.toExact()).toBe('7')
  })

  it('drops an amount over MaxUint256 rather than throwing through the render', () => {
    mocked(useCurrencyInfos).mockReturnValue([listedToken(18)])
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    // BigInt parses this fine, so `selectPositionRewardBalances` passes it through; the SDK's own
    // invariant is what rejects it.
    const oversized = balance({ unclaimedAmount: '1'.padEnd(100, '0') })

    const { result } = renderHook(() => usePositionRewardEarnings([oversized as PositionRewardBalance]))

    expect(result.current).toEqual([])
    expect(warn).toHaveBeenCalled()
  })
})
