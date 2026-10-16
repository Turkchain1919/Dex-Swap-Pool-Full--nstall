import { FormattedUniswapXGasFeeInfo, GasFeeResult, TradingApi } from '@universe/api'
import { UniverseChainId } from '@universe/chains'

export type GasInfo = {
  gasFee: GasFeeResult
  fiatPriceFormatted?: string
  uniswapXGasFeeInfo?: FormattedUniswapXGasFeeInfo
  isHighRelativeToValue: boolean
  isLoading: boolean
  chainId: UniverseChainId
  sponsorshipInfo?: TradingApi.SponsorshipInfo
}
