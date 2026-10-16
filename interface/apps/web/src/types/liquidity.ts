import { Currency, CurrencyAmount, Percent } from '@uniswap/sdk-core'
import type { ReactNode } from 'react'
import type { FeeBreakdown } from 'uniswap/src/features/fees/types'
import type { FeeData, PositionRewardApr } from 'uniswap/src/features/positions/types'
import { PositionField } from '~/types/position'

export type CurrencyAmountMap = { [field in PositionField]?: Maybe<CurrencyAmount<Currency>> }

export interface DepositState {
  exactField: PositionField
  exactAmounts: {
    [field in PositionField]?: string
  }
}

export interface DepositInfo {
  formattedAmounts?: { [field in PositionField]?: string }
  currencyBalances?: { [field in PositionField]?: CurrencyAmount<Currency> }
  currencyAmounts?: { [field in PositionField]?: Maybe<CurrencyAmount<Currency>> }
  currencyAmountsUSDValue?: { [field in PositionField]?: Maybe<CurrencyAmount<Currency>> }
  currencyMaxAmounts?: { [field in PositionField]?: Maybe<CurrencyAmount<Currency>> }
  error?: ReactNode
}

export type FeeTierData = {
  id?: string
  fee: FeeData
  formattedFee: string
  totalLiquidityUsd: number
  percentage: Percent
  tvl: string
  created: boolean
  boostedApr?: number
  // The tokens `boostedApr` is paid in, one entry per token, as the pool serves them. Empty when the
  // tier runs no live campaign.
  rewards?: PositionRewardApr[]
  // Backend per-pool protocol fee (pips, same unit as `fee.feeAmount`); undefined when not served.
  protocolFee?: number
  // v4 create-flow fee breakdown (LP / protocol / effective) for the `FeeDisplay` hover tooltip; set by
  // `getCreateFeeTierSearchData`, undefined elsewhere.
  feeBreakdown?: FeeBreakdown
}
