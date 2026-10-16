import { iconSizes } from '@universe/mycelium'
import { SplitLogo } from 'uniswap/src/components/CurrencyLogo/SplitLogo'
import { PoolOption } from 'uniswap/src/components/lists/items/types'
import { Pill, PillPressProps } from 'uniswap/src/features/search/SearchModal/RecentSearchPills/Pill'

export function PoolPill({ option, ...pressProps }: PillPressProps & { option: PoolOption }): JSX.Element {
  const { token0CurrencyInfo, token1CurrencyInfo, chainId } = option
  return (
    <Pill
      label={`${token0CurrencyInfo.currency.symbol}/${token1CurrencyInfo.currency.symbol}`}
      leading={
        <SplitLogo
          chainId={chainId}
          inputCurrencyInfo={token0CurrencyInfo}
          outputCurrencyInfo={token1CurrencyInfo}
          size={iconSizes.icon24}
        />
      }
      {...pressProps}
    />
  )
}
