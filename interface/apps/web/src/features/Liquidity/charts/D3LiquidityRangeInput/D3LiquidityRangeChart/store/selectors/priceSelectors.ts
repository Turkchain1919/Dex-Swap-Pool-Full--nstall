import { useContext } from 'react'
import { useStore } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { LiquidityChartStoreContext } from '~/features/Liquidity/charts/D3LiquidityRangeInput/D3LiquidityRangeChart/store/LiquidityChartStoreContext'
import type { ChartStoreState } from '~/features/Liquidity/charts/D3LiquidityRangeInput/D3LiquidityRangeChart/store/types'

function useLiquidityChartStore() {
  const store = useContext(LiquidityChartStoreContext)
  if (!store) {
    throw new Error('useLiquidityChartStore must be used within a LiquidityChartStoreProvider')
  }
  return store
}

export const useChartPriceState = () => {
  const store = useLiquidityChartStore()
  return useStore(
    store,
    useShallow((s) => ({
      defaultMinPrice: s.defaultMinPrice,
      defaultMaxPrice: s.defaultMaxPrice,
      isFullRange: s.isFullRange,
      maxPrice: s.maxPrice,
      minPrice: s.minPrice,
      minTick: s.minTick,
      maxTick: s.maxTick,
      selectedHistoryDuration: s.selectedHistoryDuration,
      selectedPriceStrategy: s.selectedPriceStrategy,
      inputMode: s.inputMode,
      tickSpacing: s.tickSpacing,
    })),
  )
}

/**
 * The current price that the min/max %-deltas and percent-mode input both anchor to. Single
 * definition so the number shown and the number typed against can't drift apart.
 *
 * The store's own value wins; the chart's last price point is only a fallback for when none was
 * passed in. `Number.isFinite` rather than `??`, because the parent passes
 * `Number(price?.toSignificant())` — NaN while the initial price is unset — and NaN is not
 * nullish, so `??` would let it shadow the fallback and then read falsy downstream.
 */
export function getChartCurrentPrice(
  s: Pick<ChartStoreState, 'currentPrice' | 'renderingContext'>,
): number | undefined {
  if (Number.isFinite(s.currentPrice)) {
    return s.currentPrice
  }
  const priceData = s.renderingContext?.priceData
  return priceData?.[priceData.length - 1]?.value
}

export const useChartCurrentPrice = (): number | undefined => {
  const store = useLiquidityChartStore()
  return useStore(store, getChartCurrentPrice)
}
