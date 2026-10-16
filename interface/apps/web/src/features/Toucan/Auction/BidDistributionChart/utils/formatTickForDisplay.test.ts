import { formatTickForDisplay } from '~/features/Toucan/Auction/BidDistributionChart/utils/utils'
import type { BidTokenInfo } from '~/features/Toucan/Auction/store/types'

const bidTokenInfo: BidTokenInfo = { symbol: 'USDC', decimals: 6, priceFiat: 2, isStablecoin: true, logoUrl: null }

function formatTick(tokenTotalSupply: string | undefined): string {
  return formatTickForDisplay({
    tickValue: 1.5,
    bidTokenInfo,
    tokenTotalSupply,
    auctionTokenDecimals: 18,
    formatter: (amount: number) => `$${amount.toFixed(2)}`,
  })
}

describe('formatTickForDisplay', () => {
  it('multiplies the tick price by the total supply to get an FDV', () => {
    expect(formatTick((1000n * 10n ** 18n).toString())).toBe('$3000.00')
  })

  // Every label built from this is an FDV, so a supply-less tick has only a per-token price to state.
  it('states no FDV when the total supply is absent', () => {
    expect(formatTick(undefined)).toBe('--')
  })

  // `'0'` is a truthy string, so a falsiness-only guard let it through and relabeled the tick's
  // per-token price as a $0.00 valuation.
  it('states no FDV when the total supply is zero', () => {
    expect(formatTick('0')).toBe('--')
  })
})
