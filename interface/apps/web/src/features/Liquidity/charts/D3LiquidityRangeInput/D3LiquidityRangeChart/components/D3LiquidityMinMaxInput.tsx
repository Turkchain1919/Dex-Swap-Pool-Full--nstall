import { ProtocolVersion } from '@uniswap/client-data-api/dist/data/v1/poolTypes_pb'
import { Token } from '@uniswap/sdk-core'
import { Flex } from '@universe/mycelium'
import { useCallback, useMemo, useState } from 'react'
import { D3RangeAmountInput } from '~/features/Liquidity/charts/D3LiquidityRangeInput/D3LiquidityRangeChart/components/D3RangeAmountInput'
import {
  useChartCurrentPrice,
  useChartPriceState,
} from '~/features/Liquidity/charts/D3LiquidityRangeInput/D3LiquidityRangeChart/store/selectors/priceSelectors'
import {
  useLiquidityChartStorePriceDifferences,
  useLiquidityChartStoreRenderingContext,
} from '~/features/Liquidity/charts/D3LiquidityRangeInput/D3LiquidityRangeChart/store/selectors/viewSelectors'
import { TickNavigationParams } from '~/features/Liquidity/charts/D3LiquidityRangeInput/D3LiquidityRangeChart/store/types'
import { useLiquidityChartStoreActions } from '~/features/Liquidity/charts/D3LiquidityRangeInput/D3LiquidityRangeChart/store/useLiquidityChartStore'
import { RangeSelectionInput } from '~/features/Liquidity/Create/RangeAmountInput'
import { RangeAmountInputPriceMode } from '~/features/Liquidity/Create/types'
import { getBaseAndQuoteCurrencies } from '~/features/Liquidity/utils/currency'
import { getTicksAtLimit, tryParseV4Tick } from '~/features/Liquidity/utils/priceRangeInfo'
import { useCreateLiquidityContext } from '~/pages/CreatePosition/CreateLiquidityContextProvider'
import { tryParseTick } from '~/state/mint/v3/utils'

// Convert user input to price based on the input mode
function usePercentageToPrice() {
  return useCallback(
    ({
      value,
      inputMode,
      currentPrice,
      fallbackPrice,
    }: {
      value: string
      inputMode: RangeAmountInputPriceMode
      currentPrice: number | undefined
      fallbackPrice: number | undefined
    }): number | undefined => {
      if (inputMode === RangeAmountInputPriceMode.PERCENTAGE && currentPrice) {
        const percent = parseFloat(value)
        if (!isNaN(percent)) {
          const calculatedPrice = currentPrice * (1 + percent / 100)
          return calculatedPrice
        }
        return fallbackPrice
      }

      return value && Number(value) ? Number(value) : fallbackPrice
    },
    [],
  )
}

export function D3LiquidityMinMaxInput() {
  const { priceRangeState, positionState, currencies } = useCreateLiquidityContext()
  const [typedValue, setTypedValue] = useState({ [RangeSelectionInput.MIN]: '', [RangeSelectionInput.MAX]: '' })
  const percentageToPrice = usePercentageToPrice()
  const [displayUserTypedValue, setDisplayUserTypedValue] = useState({
    [RangeSelectionInput.MIN]: false,
    [RangeSelectionInput.MAX]: false,
  })

  const { minPrice, maxPrice, isFullRange, inputMode } = useChartPriceState()
  const priceDifferences = useLiquidityChartStorePriceDifferences()
  const { liquidityData } = useLiquidityChartStoreRenderingContext() ?? {}
  const {
    setChartState,
    handleTickRangeChange,
    decrementMin,
    incrementMin,
    decrementMax,
    incrementMax,
    toggleInputMode,
  } = useLiquidityChartStoreActions()

  // Shared with the %-delta selector: the displayed delta and the value typed against it
  // have to anchor on the same price. Without a mounted chart only the store has one.
  const currentPrice = useChartCurrentPrice()
  // Undefined for a pool being created, which has no distribution to bound the range by
  const absoluteMinPrice = liquidityData?.at(0)?.price0
  const absoluteMaxPrice = liquidityData?.at(-1)?.price0

  // Navigation params for increment/decrement actions
  const tickNavigationParams: TickNavigationParams | undefined = useMemo(() => {
    if (!positionState.fee?.tickSpacing || !currencies.sdk.TOKEN0 || !currencies.sdk.TOKEN1) {
      return undefined
    }

    const { baseCurrency, quoteCurrency } = getBaseAndQuoteCurrencies(currencies.sdk, priceRangeState.priceInverted)

    return {
      tickSpacing: positionState.fee.tickSpacing,
      feeAmount: positionState.fee.feeAmount,
      baseCurrency,
      quoteCurrency,
      protocolVersion: positionState.protocolVersion,
    }
  }, [positionState.fee, currencies.sdk, priceRangeState.priceInverted, positionState.protocolVersion])

  const ticksAtLimit = useMemo(() => {
    return getTicksAtLimit({
      tickSpacing: positionState.fee?.tickSpacing,
      lowerTick: priceRangeState.minTick,
      upperTick: priceRangeState.maxTick,
      fullRange: isFullRange,
    })
  }, [positionState.fee?.tickSpacing, priceRangeState.minTick, priceRangeState.maxTick, isFullRange])

  // Get display value based on input mode
  const getDisplayValue = useCallback(
    (input: RangeSelectionInput) => {
      if (displayUserTypedValue[input]) {
        return typedValue[input]
      }

      if (inputMode === RangeAmountInputPriceMode.PERCENTAGE) {
        const priceDiff =
          input === RangeSelectionInput.MIN ? priceDifferences?.minPriceDiff : priceDifferences?.maxPriceDiff
        return priceDiff !== undefined ? priceDiff.toFixed(2) : ''
      }

      const price = input === RangeSelectionInput.MIN ? minPrice : maxPrice

      if (input === RangeSelectionInput.MIN && ticksAtLimit[0] && !positionState.migratingPosition) {
        return '0'
      }
      if (input === RangeSelectionInput.MAX && ticksAtLimit[1] && !positionState.migratingPosition) {
        return '∞'
      }

      return price?.toString() ?? ''
    },
    [
      displayUserTypedValue,
      typedValue,
      inputMode,
      priceDifferences,
      minPrice,
      maxPrice,
      ticksAtLimit,
      positionState.migratingPosition,
    ],
  )

  // Sets chart state but does not update liquidity context
  const handlePriceRangeInput = useCallback(
    (input: RangeSelectionInput, value: string) => {
      const fallbackPrice = input === RangeSelectionInput.MIN ? absoluteMinPrice : absoluteMaxPrice
      const priceToSet = percentageToPrice({ value, inputMode, currentPrice, fallbackPrice })

      if (input === RangeSelectionInput.MIN) {
        // @ts-expect-error: minPrice can be set here
        setChartState({ minPrice: priceToSet })
      } else {
        // @ts-expect-error: maxPrice can be set here
        setChartState({ maxPrice: priceToSet })
      }

      setTypedValue((prev) => ({ ...prev, [input]: value }))
      setDisplayUserTypedValue((prev) => ({ ...prev, [input]: true }))
    },
    [setChartState, percentageToPrice, absoluteMinPrice, absoluteMaxPrice, inputMode, currentPrice],
  )

  // Updates liquidity context
  const onBlur = useCallback(
    (input: RangeSelectionInput, value: string) => {
      if (!tickNavigationParams) {
        return
      }

      let tickToSet: number | undefined
      if (positionState.protocolVersion === ProtocolVersion.V4) {
        tickToSet = tryParseV4Tick({
          baseToken: tickNavigationParams.baseCurrency,
          quoteToken: tickNavigationParams.quoteCurrency,
          value,
          tickSpacing: tickNavigationParams.tickSpacing,
        })
      } else {
        tickToSet = tryParseTick({
          baseToken: tickNavigationParams.baseCurrency as Token,
          quoteToken: tickNavigationParams.quoteCurrency as Token,
          value,
          feeAmount: tickNavigationParams.feeAmount,
        })
      }

      // Route through handleTickRangeChange (not a raw setPriceRangeState) so the edit re-detects the
      // strategy, the same as the drag and increment paths. A typed range that no longer matches the
      // selected preset clears the (now stale) label — otherwise a later streamed re-seed that crosses
      // a typed bound would re-anchor the preset over the range the user typed.
      if (input === RangeSelectionInput.MIN) {
        handleTickRangeChange({ minTick: tickToSet, maxTick: priceRangeState.maxTick })
      } else {
        handleTickRangeChange({ minTick: priceRangeState.minTick, maxTick: tickToSet })
      }

      setDisplayUserTypedValue((prev) => ({ ...prev, [input]: false }))
    },
    [handleTickRangeChange, priceRangeState.minTick, priceRangeState.maxTick, tickNavigationParams, positionState],
  )

  return (
    // The group rounds its outer bottom corners; which child owns them follows
    // the flex direction, so clip once here instead of restating it per input.
    <Flex
      row
      gap="$gap4"
      $lg={{ row: false }}
      borderBottomLeftRadius="$rounded20"
      borderBottomRightRadius="$rounded20"
      overflow="hidden"
    >
      <D3RangeAmountInput
        isDisabled={isFullRange}
        input={RangeSelectionInput.MIN}
        handleDecrement={() => tickNavigationParams && decrementMin(tickNavigationParams)}
        handleIncrement={() => tickNavigationParams && incrementMin(tickNavigationParams)}
        showIncrementButtons={!isFullRange}
        value={getDisplayValue(RangeSelectionInput.MIN)}
        handlePriceRangeInput={handlePriceRangeInput}
        onBlur={() => onBlur(RangeSelectionInput.MIN, minPrice?.toString() ?? '')}
        typedValue={typedValue[RangeSelectionInput.MIN]}
        displayUserTypedValue={displayUserTypedValue[RangeSelectionInput.MIN]}
        handleInputModeToggle={toggleInputMode}
        price={minPrice}
        priceDifference={isFullRange ? undefined : priceDifferences?.minPriceDiffFormatted}
        inputMode={inputMode}
      />
      <D3RangeAmountInput
        isDisabled={isFullRange}
        input={RangeSelectionInput.MAX}
        handleDecrement={() => tickNavigationParams && decrementMax(tickNavigationParams)}
        handleIncrement={() => tickNavigationParams && incrementMax(tickNavigationParams)}
        showIncrementButtons={!isFullRange}
        value={getDisplayValue(RangeSelectionInput.MAX)}
        handlePriceRangeInput={handlePriceRangeInput}
        onBlur={() => onBlur(RangeSelectionInput.MAX, maxPrice?.toString() ?? '')}
        typedValue={typedValue[RangeSelectionInput.MAX]}
        displayUserTypedValue={displayUserTypedValue[RangeSelectionInput.MAX]}
        handleInputModeToggle={toggleInputMode}
        price={maxPrice}
        priceDifference={isFullRange ? undefined : priceDifferences?.maxPriceDiffFormatted}
        inputMode={inputMode}
      />
    </Flex>
  )
}
