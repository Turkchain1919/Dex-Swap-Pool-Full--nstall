import { Currency, CurrencyAmount } from '@uniswap/sdk-core'
import { Flex, Text } from '@universe/mycelium'
import { BREAKPOINT_PX, useDeviceDimensions } from '@universe/mycelium/theme-hooks-compat'
import { type ComponentProps, PropsWithChildren, ReactNode } from 'react'
import { CurrencyLogo } from 'uniswap/src/components/CurrencyLogo/CurrencyLogo'
import { useLocalizationContext } from 'uniswap/src/features/language/LocalizationContext'
import { useCurrencyInfo } from 'uniswap/src/features/tokens/useCurrencyInfo'
import { CurrencyField } from 'uniswap/src/types/currency'
import { currencyId } from 'uniswap/src/utils/currencyId'
import { NumberType } from 'utilities/src/format/types'
import { MouseoverTooltip } from '~/components/Tooltip'

type ResponsiveHeadlineProps = PropsWithChildren<ComponentProps<typeof Text>>

const ResponsiveHeadline = ({ children, color, ...rest }: ResponsiveHeadlineProps) => {
  const { fullWidth: width } = useDeviceDimensions()
  const variant = width && width < BREAKPOINT_PX.xs ? 'heading3' : 'heading2'

  return (
    <Text variant={variant} color={color ?? '$neutral1'} {...rest}>
      {children}
    </Text>
  )
}

export interface AmountHeaderProps {
  isLoading: boolean
  field: CurrencyField
  tooltipText?: ReactNode
  label: ReactNode
  amount: CurrencyAmount<Currency>
  usdAmount?: string
  headerTextProps?: ComponentProps<typeof Text>
  // The currency used here can be different than the currency denoted in the `amount` prop
  // (e.g., for some trade types or display preferences)
  currency: Currency
}

export function AmountHeader({
  tooltipText,
  label,
  amount,
  usdAmount,
  field,
  currency,
  isLoading,
  headerTextProps,
}: AmountHeaderProps) {
  const { formatCurrencyAmount, convertFiatAmountFormatted } = useLocalizationContext()
  const currencyInfo = useCurrencyInfo(currencyId(currency))

  return (
    <Flex row alignItems="center" justifyContent="space-between" gap="$gap12">
      <Flex gap="$spacing4">
        {label && (
          <Text variant="body2" color="$neutral2">
            <MouseoverTooltip text={tooltipText} disabled={!tooltipText}>
              <Text
                tag="span"
                variant="body3"
                color="$neutral2"
                mr="$spacing8"
                cursor={tooltipText ? 'help' : undefined}
              >
                {label}
              </Text>
            </MouseoverTooltip>
          </Text>
        )}
        <Flex gap="$spacing4">
          <ResponsiveHeadline
            data-testid={`${field}-amount`}
            color={isLoading ? '$neutral2' : '$neutral1'}
            {...headerTextProps}
          >
            {formatCurrencyAmount({
              value: amount,
              type: NumberType.TokenTx,
            })}{' '}
            {currency.symbol}
          </ResponsiveHeadline>
          <Text variant="body4" color="$neutral2">
            {convertFiatAmountFormatted(usdAmount, NumberType.FiatTokenQuantity)}
          </Text>
        </Flex>
      </Flex>
      <CurrencyLogo currencyInfo={currencyInfo} size={36} />
    </Flex>
  )
}
