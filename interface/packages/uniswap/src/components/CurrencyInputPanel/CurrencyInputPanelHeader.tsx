import type { Currency, CurrencyAmount } from '@uniswap/sdk-core'
import { isExtensionApp, isWebAppDesktop } from '@universe/environment'
import { Flex, spacing, Text } from '@universe/mycelium'
import { useCallback } from 'react'
import {
  AmountInputPresets,
  PRESET_BUTTON_PROPS,
} from 'uniswap/src/components/CurrencyInputPanel/AmountInputPresets/AmountInputPresets'
import { PresetAmountButton } from 'uniswap/src/components/CurrencyInputPanel/AmountInputPresets/PresetAmountButton'
import type { PresetPercentage } from 'uniswap/src/components/CurrencyInputPanel/AmountInputPresets/types'
import { PRESET_PERCENTAGES } from 'uniswap/src/components/CurrencyInputPanel/AmountInputPresets/utils'
import { QuickSelectDefaultTokenOptions } from 'uniswap/src/components/CurrencyInputPanel/DefaultTokenOptions/QuickSelectDefaultTokenOptions'
import type { CurrencyInfo } from 'uniswap/src/features/dataApi/types'
import { ElementName } from 'uniswap/src/features/telemetry/constants'
import { CurrencyField } from 'uniswap/src/types/currency'

interface CurrencyInputPanelHeaderProps {
  headerLabel?: string
  currencyField: CurrencyField
  currencyBalance: Maybe<CurrencyAmount<Currency>>
  currencyAmount: Maybe<CurrencyAmount<Currency>>
  currencyInfo: Maybe<CurrencyInfo>
  onSetPresetValue: (amount: string, percentage: PresetPercentage) => void
  showDefaultTokenOptions: boolean
  hidePresets?: boolean
  actualGasFee?: string
  isGasCovered?: boolean
}

export function CurrencyInputPanelHeader({
  headerLabel,
  currencyField,
  currencyBalance,
  currencyAmount,
  currencyInfo: _currencyInfo,
  onSetPresetValue,
  showDefaultTokenOptions,
  hidePresets,
  actualGasFee,
  isGasCovered,
}: CurrencyInputPanelHeaderProps): JSX.Element | null {
  const renderPreset = useCallback(
    (preset: PresetPercentage) => (
      <PresetAmountButton
        percentage={preset}
        currencyAmount={currencyAmount}
        currencyBalance={currencyBalance}
        currencyField={currencyField}
        elementName={ElementName.PresetPercentage}
        buttonProps={PRESET_BUTTON_PROPS}
        actualGasFee={actualGasFee}
        isGasCovered={isGasCovered}
        onSetPresetValue={onSetPresetValue}
      />
    ),
    [currencyAmount, currencyBalance, currencyField, onSetPresetValue, actualGasFee, isGasCovered],
  )

  if (!headerLabel && !showDefaultTokenOptions) {
    return null
  }

  const showInputPresets =
    (isWebAppDesktop || isExtensionApp) && !hidePresets && currencyField === CurrencyField.INPUT && currencyBalance

  return (
    <Flex row justifyContent="space-between">
      {/* $small (16px) everywhere: $subHeading has no micro size — legacy web silently dropped the
          invalid `font-size: $micro` and inherited 16px, so this matches the legacy render on both
          platforms, while TextCompat throws on unresolvable tokens instead of dropping them */}
      <Text color="$neutral2" variant="subheading2" fontSize="$small">
        {headerLabel}
      </Text>
      {showInputPresets && (
        <Flex position="absolute" right={0} top={-spacing.spacing2}>
          <AmountInputPresets presets={PRESET_PERCENTAGES} renderPreset={renderPreset} />
        </Flex>
      )}
      {showDefaultTokenOptions && <QuickSelectDefaultTokenOptions />}
    </Flex>
  )
}
