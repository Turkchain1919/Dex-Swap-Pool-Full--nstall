import { TFunction } from 'i18next'
import type { ParsedToken } from 'uniswap/src/features/dataApi/utils/parsedToken'
import { v2TokenToCurrency } from 'uniswap/src/features/dataApi/utils/parsedToken'
import { shouldReverseForWaterfall } from 'uniswap/src/features/tokens/waterfallPriority'

export const getPoolDetailPageTitle = (t: TFunction, tokens?: { token0?: ParsedToken; token1?: ParsedToken }) => {
  const baseTitle = t('common.buyAndSell')
  const { token0, token1 } = tokens ?? {}
  if (!token0?.symbol || !token1?.symbol) {
    return baseTitle
  }

  const currency0 = v2TokenToCurrency(token0)
  const currency1 = v2TokenToCurrency(token1)
  const reverse = currency0 && currency1 ? shouldReverseForWaterfall(currency0, currency1) : false
  const [baseSymbol, quoteSymbol] = reverse ? [token1.symbol, token0.symbol] : [token0.symbol, token1.symbol]

  return `${baseSymbol}/${quoteSymbol}: ${baseTitle}`
}
