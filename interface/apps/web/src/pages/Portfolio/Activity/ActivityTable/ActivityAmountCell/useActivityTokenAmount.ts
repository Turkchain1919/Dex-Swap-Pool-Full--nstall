import { useFormattedCurrencyAmountAndUSDValue } from 'uniswap/src/components/activity/hooks/useFormattedCurrencyAmountAndUSDValue'
import { PollingInterval } from 'uniswap/src/constants/misc'
import { CurrencyInfo } from 'uniswap/src/features/dataApi/types'
import { useLocalizationContext } from 'uniswap/src/features/language/LocalizationContext'
import { getSymbolDisplayText } from 'uniswap/src/utils/currency'

export interface ActivityTokenAmount {
  currencyInfo: Maybe<CurrencyInfo>
  amountText: string
  formattedAmount: string | null
  usdValue: string | null
}

function formatAmountWithSymbol(amount: string | undefined, symbol: string | undefined): string | null {
  if (!amount) {
    return null
  }
  const displaySymbol = getSymbolDisplayText(symbol)
  return displaySymbol ? `${amount} ${displaySymbol}` : amount
}

function getUsdValue(value: string | undefined): string | null {
  return value !== '-' ? (value ?? null) : null
}

export function useActivityTokenAmount({
  currencyInfo,
  amountRaw,
  isApproximateAmount = false,
}: {
  currencyInfo: Maybe<CurrencyInfo>
  amountRaw: string | undefined
  isApproximateAmount?: boolean
}): ActivityTokenAmount {
  const formatter = useLocalizationContext()
  // Slow: historical activity is not a live-price surface.
  const data = useFormattedCurrencyAmountAndUSDValue({
    currency: currencyInfo?.currency,
    currencyAmountRaw: amountRaw ?? '',
    formatter,
    isApproximateAmount,
    pollInterval: PollingInterval.Slow,
  })
  const amountText = data.amount ? `${data.tilde}${data.amount}` : ''

  return {
    currencyInfo,
    amountText,
    formattedAmount: formatAmountWithSymbol(amountText, currencyInfo?.currency.symbol),
    usdValue: getUsdValue(data.value),
  }
}
