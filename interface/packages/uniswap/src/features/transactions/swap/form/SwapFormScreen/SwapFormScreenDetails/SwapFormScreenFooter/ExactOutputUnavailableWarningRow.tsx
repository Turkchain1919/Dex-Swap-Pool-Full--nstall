import { isSVMChain } from '@universe/chains'
import { isWebPlatform } from '@universe/environment'
import { cn, Flex, Text } from '@universe/mycelium'
import { curveToAnimationTiming, ENTER_EXIT_PRESET_CLASSES } from '@universe/mycelium/compat'
import { SPORE_ANIMATION_CURVE_CSS } from '@universe/tailwind/animations'
import { type ComponentRef, forwardRef } from 'react'
import { useTranslation } from 'react-i18next'
import { toSupportedChainId } from 'uniswap/src/features/chains/utils'
import type { DerivedSwapInfo } from 'uniswap/src/features/transactions/swap/types/derivedSwapInfo'
import { CurrencyField } from 'uniswap/src/types/currency'

type ExactOutputUnavailableWarningRowProps = {
  currencies: DerivedSwapInfo['currencies']
  outputTokenHasBuyTax: boolean
  isCrossChain: boolean
  /**
   * Merged onto the animated node rather than dropped: `Presence` clones its child with an
   * overlay `className` (its `getExitProps` channel, and the `initial={false}` enter strip), so a
   * child that ignores this prop silently loses whatever the wrapper injected.
   */
  className?: string
}

// Timing of the legacy `quick` animation preset. Applied inline so both keyframes below run on
// the legacy curve instead of the presets' pinned `200ms ease-out` default.
const ANIMATION_TIMING = curveToAnimationTiming(SPORE_ANIMATION_CURVE_CSS.quick)

// Enter and exit both run as CSS keyframes on web, armed by the `Presence` wrapper in
// SwapFormScreenFooter; the ref must reach the DOM node for Presence to arm the exit. The element
// carries no Tamagui animation props at all, so on native `Presence.native` owns the whole
// lifecycle and there is no second animation to compound with (INFRA-3289).
export const ExactOutputUnavailableWarningRow = forwardRef<
  ComponentRef<typeof Flex>,
  ExactOutputUnavailableWarningRowProps
>(function ExactOutputUnavailableWarningRow(
  { currencies, outputTokenHasBuyTax, isCrossChain, className },
  ref,
): JSX.Element {
  const { t } = useTranslation()

  const warningMessage = getWarningMessage({ currencies, outputTokenHasBuyTax, isCrossChain, t })

  return (
    <Flex
      ref={ref}
      {...(isWebPlatform
        ? { className: cn(ENTER_EXIT_PRESET_CLASSES.fadeInOut, className), style: ANIMATION_TIMING }
        : {})}
    >
      <Text color="$statusCritical" textAlign="center" variant="body3">
        {warningMessage}
      </Text>
    </Flex>
  )
})

function getWarningMessage({
  currencies,
  outputTokenHasBuyTax,
  isCrossChain,
  t,
}: ExactOutputUnavailableWarningRowProps & { t: ReturnType<typeof useTranslation>['t'] }): string {
  if (isCrossChain) {
    return t('swap.form.warning.output.crossChain')
  }

  const inputChainId = toSupportedChainId(currencies[CurrencyField.INPUT]?.currency.chainId)
  const outputChainId = toSupportedChainId(currencies[CurrencyField.OUTPUT]?.currency.chainId)
  const hasSolanaToken = (inputChainId && isSVMChain(inputChainId)) || (outputChainId && isSVMChain(outputChainId))

  if (hasSolanaToken) {
    return t('swap.form.warning.output.solana')
  }

  const fotCurrencySymbol = outputTokenHasBuyTax
    ? currencies[CurrencyField.OUTPUT]?.currency.symbol
    : currencies[CurrencyField.INPUT]?.currency.symbol

  return fotCurrencySymbol
    ? t('swap.form.warning.output.fotFees', { fotCurrencySymbol })
    : t('swap.form.warning.output.fotFees.fallback')
}
