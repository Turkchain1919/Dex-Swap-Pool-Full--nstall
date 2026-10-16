import type { UTCTimestamp } from 'lightweight-charts'
import { describe, expect, it } from 'vitest'
import type { BidTokenInfo } from '~/features/Toucan/Auction/store/types'
import { ClearingPriceTooltipBody } from '~/features/Toucan/ToucanChart/clearingPrice/components/ClearingPriceTooltipBody'
import type { ClearingPriceChartPoint } from '~/features/Toucan/ToucanChart/clearingPrice/types'
import { render, screen } from '~/test-utils/render'

const FDV_LABEL = 'FDV'
const AUCTION_TOKEN_DECIMALS = 18
// 1B tokens at 18 decimals — the shape a launched token's supply arrives in.
const TOKEN_TOTAL_SUPPLY = '1000000000000000000000000000'

const BID_TOKEN_INFO: BidTokenInfo = {
  symbol: 'ETH',
  decimals: 18,
  priceFiat: 2000,
  isStablecoin: false,
  logoUrl: null,
}

const POINT: ClearingPriceChartPoint = {
  time: 1_755_000_000 as UTCTimestamp,
  value: 0.000_04,
  q96: '3169126500570573503741758013',
}

function renderTooltip(tokenTotalSupply?: string): void {
  render(
    <ClearingPriceTooltipBody
      data={POINT}
      bidTokenInfo={BID_TOKEN_INFO}
      scaleFactor={1}
      tokenTotalSupply={tokenTotalSupply}
      auctionTokenDecimals={AUCTION_TOKEN_DECIMALS}
    />,
  )
}

describe('ClearingPriceTooltipBody', () => {
  it('renders the FDV line for a real total supply', () => {
    renderTooltip(TOKEN_TOTAL_SUPPLY)

    expect(screen.getByText(`${FDV_LABEL}:`)).toBeInTheDocument()
  })

  // A raw supply is a decimal string, so '0' is truthy — it must still read as absent rather
  // than render a $0 valuation.
  it.each([undefined, '0'])('omits the FDV line when the total supply is %s', (tokenTotalSupply) => {
    renderTooltip(tokenTotalSupply)

    expect(screen.queryByText(`${FDV_LABEL}:`)).not.toBeInTheDocument()
  })
})
