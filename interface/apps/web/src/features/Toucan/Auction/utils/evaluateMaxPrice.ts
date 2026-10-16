import { Currency, CurrencyAmount } from '@uniswap/sdk-core'
import { priceToQ96WithDecimals, q96ToPriceString } from '~/features/Toucan/Auction/BidDistributionChart/utils/q96'
import { computeBidMaxPriceResult } from '~/features/Toucan/Auction/utils/bidMaxPrice'

export interface MinValuationErrorDetails {
  inputValueDecimal: number
  minValueDecimal: number
}

export interface EvaluateMaxPriceResult {
  sanitizedQ96?: bigint
  sanitizedDisplayValue?: string
  error?: string
  errorDetails?: MinValuationErrorDetails
  /** The entry itself was over the ceiling and got pulled down to the highest legal tick. */
  cappedToMax?: boolean
}

interface EvaluateMaxPriceParams {
  bidTokenDecimals: number | undefined
  auctionTokenDecimals: number | undefined
  maxValuationCurrencyAmount: CurrencyAmount<Currency> | undefined
  tickSizeQ96: bigint | undefined
  clearingPriceQ96: bigint | undefined
  floorPriceQ96: bigint | undefined
  minMaxPriceQ96: bigint | undefined
  minValidPriceDisplay: string | undefined
  minValidPriceDisplayFormatted: string | undefined
  /** The hook's raw ceiling, in Q96, when a validation hook imposes one. */
  maxBidPriceQ96?: bigint
  bidTokenSymbol: string
  shouldAutoCorrectMin?: boolean
  /** Error copy for a price below the minimum valid bid, the only bound that still errors. */
  formatMinError: (params: { value: string; symbol: string }) => string
}

export function evaluateMaxPrice({
  bidTokenDecimals,
  auctionTokenDecimals,
  maxValuationCurrencyAmount,
  tickSizeQ96,
  clearingPriceQ96,
  floorPriceQ96,
  minMaxPriceQ96,
  minValidPriceDisplay,
  minValidPriceDisplayFormatted,
  maxBidPriceQ96,
  bidTokenSymbol,
  shouldAutoCorrectMin,
  formatMinError,
}: EvaluateMaxPriceParams): EvaluateMaxPriceResult {
  if (
    bidTokenDecimals === undefined ||
    auctionTokenDecimals === undefined ||
    !maxValuationCurrencyAmount ||
    !tickSizeQ96 ||
    !clearingPriceQ96 ||
    !floorPriceQ96 ||
    !minMaxPriceQ96
  ) {
    return {}
  }

  const rawAmount = BigInt(maxValuationCurrencyAmount.quotient.toString())
  if (rawAmount === 0n) {
    return {}
  }

  const inputQ96 = priceToQ96WithDecimals({ priceRaw: rawAmount, auctionTokenDecimals })

  // Use the correctly calculated minimum from useMinValidBid hook
  // instead of the simplified (and incorrect) clearingPriceQ96 + tickSizeQ96
  if (inputQ96 < minMaxPriceQ96) {
    if (shouldAutoCorrectMin) {
      const sanitizedDisplayValue = q96ToPriceString({
        q96Value: minMaxPriceQ96,
        bidTokenDecimals,
        auctionTokenDecimals,
      })
      return { sanitizedQ96: minMaxPriceQ96, sanitizedDisplayValue }
    }
    const inputDisplay = q96ToPriceString({ q96Value: inputQ96, bidTokenDecimals, auctionTokenDecimals })
    const minDisplay = minValidPriceDisplay ?? ''
    return {
      error: formatMinError({
        value: minValidPriceDisplayFormatted ?? minDisplay,
        symbol: bidTokenSymbol ? ` ${bidTokenSymbol}` : '',
      }),
      errorDetails: {
        inputValueDecimal: Number(inputDisplay),
        minValueDecimal: Number(minDisplay),
      },
    }
  }

  // The ceiling caps rather than rejects, so there is no over-ceiling state to report. It
  // must also be judged after snapping: the field round-trips through a decimal string and
  // both q96 conversions round half-up, so the highest legal tick reconstructs slightly
  // heavier than it left and a raw comparison rejects the tick the slider's max selects.
  const { q96: snappedQ96, cappedToMax } = computeBidMaxPriceResult({
    rawAmount,
    auctionTokenDecimals,
    clearingPriceQ96,
    floorPriceQ96,
    tickSizeQ96,
    maxBidPriceQ96,
  })
  if (snappedQ96 === undefined) {
    return {}
  }

  const sanitizedDisplayValue = q96ToPriceString({ q96Value: snappedQ96, bidTokenDecimals, auctionTokenDecimals })

  return { sanitizedQ96: snappedQ96, sanitizedDisplayValue, cappedToMax }
}
