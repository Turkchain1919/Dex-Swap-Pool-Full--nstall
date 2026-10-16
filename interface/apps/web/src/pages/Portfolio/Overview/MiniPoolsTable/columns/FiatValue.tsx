import { memo } from 'react'
import AnimatedNumber from 'uniswap/src/components/AnimatedNumber/AnimatedNumber'
import { useLocalizationContext } from 'uniswap/src/features/language/LocalizationContext'
import { NumberType } from 'utilities/src/format/types'
import { EmptyTableCell } from '~/pages/Portfolio/EmptyTableCell'

export const PoolFiatValueCell = memo(function PoolFiatValueCell({ value }: { value?: number }) {
  const { convertFiatAmountFormatted } = useLocalizationContext()

  if (value === undefined) {
    return <EmptyTableCell />
  }

  return (
    <AnimatedNumber
      value={convertFiatAmountFormatted(value, NumberType.FiatTokenPrice)}
      numericValue={value}
      textVariant="$body3"
    />
  )
})
PoolFiatValueCell.displayName = 'PoolFiatValueCell'
