import { Currency, CurrencyAmount } from '@uniswap/sdk-core'
import { Flex, iconSizes, Text } from '@universe/mycelium'
import { CurrencyLogo } from 'uniswap/src/components/CurrencyLogo/CurrencyLogo'
import { useLocalizationContext } from 'uniswap/src/features/language/LocalizationContext'
import { useCurrencyInfo } from 'uniswap/src/features/tokens/useCurrencyInfo'
import { getSymbolDisplayText } from 'uniswap/src/utils/currency'
import { currencyId } from 'uniswap/src/utils/currencyId'
import { NumberType } from 'utilities/src/format/types'

export function TokenInfo({
  currencyAmount,
  currencyUSDAmount,
}: {
  currencyAmount: Maybe<CurrencyAmount<Currency>>
  currencyUSDAmount: Maybe<CurrencyAmount<Currency>>
}) {
  const { formatCurrencyAmount } = useLocalizationContext()
  const currency = currencyAmount?.currency
  const currencyInfo = useCurrencyInfo(currencyId(currency))

  return (
    <Flex row alignItems="center">
      <Flex grow>
        <Text variant="heading2">
          {formatCurrencyAmount({
            value: currencyAmount,
            type: NumberType.TokenNonTx,
          })}{' '}
          {getSymbolDisplayText(currency?.symbol)}
        </Text>
        <Text variant="body3" color="$neutral2">
          {formatCurrencyAmount({
            value: currencyUSDAmount,
            type: NumberType.FiatStandard,
          })}
        </Text>
      </Flex>
      <CurrencyLogo currencyInfo={currencyInfo} size={iconSizes.icon36} />
    </Flex>
  )
}
