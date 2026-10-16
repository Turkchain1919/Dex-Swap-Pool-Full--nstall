import { Flex } from '@universe/mycelium'
import { ArrowRight } from '@universe/mycelium/icons/ArrowRight'
import { CurrencyInfo } from 'uniswap/src/features/dataApi/types'
import { EmptyCell } from '~/pages/Portfolio/Activity/ActivityTable/ActivityAmountCell/EmptyCell'
import { AMOUNT_COLUMN_WIDTH } from '~/pages/Portfolio/Activity/ActivityTable/ActivityAmountCell/utils'
import { TokenAmountDisplay } from '~/pages/Portfolio/Activity/ActivityTable/TokenAmountDisplay'

const AMOUNT_COLUMN_SEPARATOR_WIDTH = 24

interface DualTokenLayoutProps {
  inputCurrency: CurrencyInfo | null | undefined
  outputCurrency: CurrencyInfo | null | undefined
  inputFormattedAmount: string | null
  outputFormattedAmount: string | null
  inputUsdValue: string | null
  outputUsdValue: string | null
  separator?: React.ReactNode
}

export function DualTokenLayout({
  inputCurrency,
  outputCurrency,
  inputFormattedAmount,
  outputFormattedAmount,
  inputUsdValue,
  outputUsdValue,
  separator = <ArrowRight size={16} color="$neutral2" />,
}: DualTokenLayoutProps): JSX.Element {
  const hasInput = inputCurrency && inputFormattedAmount
  const hasOutput = outputCurrency && outputFormattedAmount

  if (!hasInput && !hasOutput) {
    return <EmptyCell />
  }

  return (
    <Flex row alignItems="center" width="100%" gap="$gap8">
      {/* Input side */}
      <Flex row alignItems="center" gap="$gap8" justifyContent="flex-start" minWidth={AMOUNT_COLUMN_WIDTH}>
        {hasInput && (
          <TokenAmountDisplay
            currencyInfo={inputCurrency}
            formattedAmount={inputFormattedAmount}
            usdValue={inputUsdValue}
          />
        )}
      </Flex>

      {/* Separator - always reserve space for alignment */}
      <Flex minWidth={AMOUNT_COLUMN_SEPARATOR_WIDTH} centered>
        {separator && hasInput && hasOutput && (
          <Flex justifyContent="center" alignItems="center" pt="$spacing2">
            {separator}
          </Flex>
        )}
      </Flex>

      {/* Output side */}
      <Flex
        row
        alignItems="center"
        gap="$gap8"
        pl="$spacing16"
        justifyContent="flex-start"
        minWidth={AMOUNT_COLUMN_WIDTH}
      >
        {hasOutput && (
          <TokenAmountDisplay
            currencyInfo={outputCurrency}
            formattedAmount={outputFormattedAmount}
            usdValue={outputUsdValue}
          />
        )}
      </Flex>
    </Flex>
  )
}
