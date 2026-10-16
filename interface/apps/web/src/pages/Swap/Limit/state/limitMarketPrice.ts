import { Currency, Fraction, Percent, Price } from '@uniswap/sdk-core'
import { useEffect } from 'react'
import { nativeOnChain } from 'uniswap/src/constants/tokens'
import { SwapFee, Trade } from 'uniswap/src/features/transactions/swap/types/trade'
import { isClassic } from 'uniswap/src/features/transactions/swap/utils/routing'
import { logger } from 'utilities/src/logger/logger'
import { NATIVE_CHAIN_ID } from '~/constants/tokens'

export function isNativeOrWrappedNative(currency: Currency): boolean {
  return currency.isNative || nativeOnChain(currency.chainId).wrapped.equals(currency)
}

// A reference leg routed through broken/exotic liquidity (e.g. a 1-ETH leg with 98% price impact
// through a ~100%-fee pool) poisons the composed market price, mis-anchors the prefilled limit
// price, and re-centers the below-market guardrail on the bad anchor. 5% matches
// PRICE_DIFFERENCE_WARNING_THRESHOLD and is well above healthy 1-ETH-leg noise; kept as a local
// constant because the shared constant tunes swap warnings while this one gates a safety reference.
const MAX_MARKET_PRICE_LEG_IMPACT = new Percent(5, 100)

// The per-leg impact gate only catches broken-pool poisonings — a deep-but-mispriced pool shows
// ~0% impact while executing far from the real market. As a second line of defense, the composed
// reference is cross-checked against the ratio of the two tokens' USD spot prices and rejected on
// >10% divergence: wide enough for spot-vs-executable drift on thin-but-legit pairs, far below
// the divergence of a poisoned reference.
const MAX_MARKET_PRICE_USD_SPOT_DEVIATION = new Fraction(10, 100)

// The USD prices feeding the cross-check are quantized: useUSDCPrice truncates the float price
// to the stablecoin's decimals (6 for mainnet USDC), so a stored price only resolves multiples
// of one raw stablecoin unit. Below 100 raw units per whole token the worst-case truncation
// error exceeds 1% of the price — at 8 units (a $0.0000089 token) it reaches ~12%, swamping the
// 10% deviation gate and flapping healthy sub-$0.00001 pairs in and out of rejection as the live
// price drifts across the quantization grid. 100 units caps quantization noise at a tenth of the
// gate while still cross-checking any token from ~$0.0001 up (on a 6-decimal stablecoin).
const MIN_USD_PRICE_SIGNIFICANT_RAW_UNITS = 100

// Raw quote-currency (stablecoin) units per whole base token — the resolution the USD price was
// stored at. Exact: asFraction is quoteRaw/baseRaw, and ×10^baseDecimals converts the base side
// to one whole token.
function usdPriceRawUnits(price: Price<Currency, Currency>): Fraction {
  return price.asFraction.multiply(new Fraction(`1${'0'.repeat(price.baseCurrency.decimals)}`))
}

type MarketPriceCheckReason =
  | 'leg_price_difference_exceeded'
  | 'leg_price_difference_undefined'
  | 'usd_spot_deviation_exceeded'
  | 'usd_spot_check_skipped_missing_usd_price'
  | 'usd_spot_check_skipped_mismatched_usd_quotes'
  | 'usd_spot_check_skipped_zero_usd_price'
  | 'usd_spot_check_skipped_stale_usd_price'
  | 'usd_spot_check_skipped_low_precision_usd_price'
  // Neither line of defense could evaluate this reference: the leg gate passed on an undefined
  // priceDifference AND the USD cross-check was skipped — the correlated fail-open intersection
  // (long-tail tokens are both the most likely to be quickroute-served and the least likely to
  // have a USD price), logged under its own reason so DD shows that population directly.
  | 'reference_unvalidated_no_checks_available'

export interface MarketPriceCheckLog {
  chainId: number
  tokenInAddress: string
  tokenOutAddress: string
  reason: MarketPriceCheckReason
  priceDifference?: string
  deviation?: string
}

function buildCheckLog({
  inputCurrency,
  outputCurrency,
  reason,
  priceDifference,
  deviation,
}: {
  inputCurrency: Currency
  outputCurrency: Currency
  reason: MarketPriceCheckReason
  priceDifference?: Percent
  deviation?: Fraction
}): MarketPriceCheckLog {
  return {
    chainId: inputCurrency.chainId,
    tokenInAddress: inputCurrency.isToken ? inputCurrency.address : NATIVE_CHAIN_ID,
    tokenOutAddress: outputCurrency.isToken ? outputCurrency.address : NATIVE_CHAIN_ID,
    reason,
    priceDifference: priceDifference?.toSignificant(6),
    deviation: deviation?.multiply(100).toSignificant(6),
  }
}

// Emits the reference-check warns collected by computeLimitMarketPrice, deduped: the caller's
// memo recomputes on every quote poll, so raw emission would scale DD volume with refresh
// cadence per form session rather than with distinct degenerate states. Keying the effect on the
// (pair, reason) signature logs each state once, and again only when the state changes.
export function useLogMarketPriceReferenceChecks(checkLogs: MarketPriceCheckLog[]): void {
  const dedupeSignature = checkLogs
    .map((log) => `${log.chainId}|${log.tokenInAddress}|${log.tokenOutAddress}|${log.reason}`)
    .join(';')

  useEffect(() => {
    for (const log of checkLogs) {
      logger.warn('limitMarketPrice', 'computeLimitMarketPrice', 'limit market price reference check', log)
    }
    // Depending on `checkLogs` itself would re-emit each persisting state on every poll (its
    // identity changes per recomputation); the numeric details ride along from whichever
    // recomputation changed the signature.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [dedupeSignature])
}

// `priceDifference` is the quote's value-lost percentage (positive when value is lost, negative
// on improvement, see getQuotePriceDifference) — not routing's pool-based `priceImpact`, though
// for this gate's purpose (a leg executing far from market) it is the right signal either way.
// An undefined value passes: the field is routing-api-only (quickroute-served quotes lack it)
// and its absence is not evidence of a bad route — but it is logged (and reported as
// `unvalidated`, feeding the combined no-checks-available reason) so the fail-open gap stays
// visible.
function checkReferenceLeg({
  trade,
  inputCurrency,
  outputCurrency,
  logs,
}: {
  trade: Trade
  inputCurrency: Currency
  outputCurrency: Currency
  logs: MarketPriceCheckLog[]
}): { usable: boolean; unvalidated: boolean } {
  if (trade.priceDifference === undefined) {
    logs.push(buildCheckLog({ inputCurrency, outputCurrency, reason: 'leg_price_difference_undefined' }))
    return { usable: true, unvalidated: true }
  }

  if (trade.priceDifference.greaterThan(MAX_MARKET_PRICE_LEG_IMPACT)) {
    logs.push(
      buildCheckLog({
        inputCurrency,
        outputCurrency,
        reason: 'leg_price_difference_exceeded',
        priceDifference: trade.priceDifference,
      }),
    )
    return { usable: false, unvalidated: false }
  }

  return { usable: true, unvalidated: false }
}

type UsdSpotCrossCheckOutcome = 'passed' | 'rejected' | 'skipped' | 'deferred'

function runUsdSpotCrossCheck({
  marketPrice,
  inputCurrency,
  outputCurrency,
  usdPriceIn,
  usdPriceOut,
  usdPriceInLoading,
  usdPriceOutLoading,
  logs,
}: {
  marketPrice: Price<Currency, Currency>
  inputCurrency: Currency
  outputCurrency: Currency
  usdPriceIn?: Price<Currency, Currency>
  usdPriceOut?: Price<Currency, Currency>
  usdPriceInLoading: boolean
  usdPriceOutLoading: boolean
  logs: MarketPriceCheckLog[]
}): UsdSpotCrossCheckOutcome {
  // Both USD prices quote against the chain's primary stablecoin. A degenerate input — a missing
  // price (long-tail token, price service outage), a stale price for a previously selected token,
  // mismatched quote currencies, or a zero price — skips the cross-check rather than blocking the
  // pair (the per-leg gate still applies), with each cause logged under its own reason so the
  // fail-open gaps stay individually visible.
  //
  // A USD price whose base currency no longer matches the leg currency (stale across a token
  // switch) must never enter the comparison: the raw fractions would compare mismatched decimal
  // scalars and falsely reject a healthy reference — treat it as missing instead.
  const staleIn = usdPriceIn !== undefined && !usdPriceIn.baseCurrency.equals(inputCurrency)
  const staleOut = usdPriceOut !== undefined && !usdPriceOut.baseCurrency.equals(outputCurrency)
  const effectiveUsdPriceIn = staleIn ? undefined : usdPriceIn
  const effectiveUsdPriceOut = staleOut ? undefined : usdPriceOut

  // While a price hook is still resolving, "missing" is indistinguishable from "not yet loaded" —
  // defer rather than fail open, so a mispriced reference can't prefill in the loading window.
  // Once the hook settles with no price, the skip paths below keep the pair usable.
  if ((!effectiveUsdPriceIn && usdPriceInLoading) || (!effectiveUsdPriceOut && usdPriceOutLoading)) {
    return 'deferred'
  }

  if (staleIn || staleOut) {
    logs.push(buildCheckLog({ inputCurrency, outputCurrency, reason: 'usd_spot_check_skipped_stale_usd_price' }))
    return 'skipped'
  }

  if (!effectiveUsdPriceIn || !effectiveUsdPriceOut) {
    logs.push(buildCheckLog({ inputCurrency, outputCurrency, reason: 'usd_spot_check_skipped_missing_usd_price' }))
    return 'skipped'
  }

  if (!effectiveUsdPriceIn.quoteCurrency.equals(effectiveUsdPriceOut.quoteCurrency)) {
    logs.push(buildCheckLog({ inputCurrency, outputCurrency, reason: 'usd_spot_check_skipped_mismatched_usd_quotes' }))
    return 'skipped'
  }

  // A zero usdPriceOut inverts into a zero denominator: `equalTo(0)` on the implied price is then
  // false and the deviation math resolves 0/0, so `greaterThan` passes silently — guard it before
  // the invert like the other degenerate cases.
  if (effectiveUsdPriceOut.equalTo(0)) {
    logs.push(buildCheckLog({ inputCurrency, outputCurrency, reason: 'usd_spot_check_skipped_zero_usd_price' }))
    return 'skipped'
  }

  // USD-implied price of inputCurrency in outputCurrency: (USD per unit in) / (USD per unit out)
  const usdImpliedPrice = effectiveUsdPriceIn.multiply(effectiveUsdPriceOut.invert())
  if (usdImpliedPrice.equalTo(0)) {
    logs.push(buildCheckLog({ inputCurrency, outputCurrency, reason: 'usd_spot_check_skipped_zero_usd_price' }))
    return 'skipped'
  }

  // A USD price stored with only a handful of raw stablecoin units cannot judge a 10% deviation
  // (see MIN_USD_PRICE_SIGNIFICANT_RAW_UNITS) — skip rather than reject on representation noise;
  // the per-leg gate still applies.
  if (
    usdPriceRawUnits(effectiveUsdPriceIn).lessThan(MIN_USD_PRICE_SIGNIFICANT_RAW_UNITS) ||
    usdPriceRawUnits(effectiveUsdPriceOut).lessThan(MIN_USD_PRICE_SIGNIFICANT_RAW_UNITS)
  ) {
    logs.push(
      buildCheckLog({ inputCurrency, outputCurrency, reason: 'usd_spot_check_skipped_low_precision_usd_price' }),
    )
    return 'skipped'
  }

  // Both prices share base/quote currencies, so their raw fractions are directly comparable.
  const market = marketPrice.asFraction
  const implied = usdImpliedPrice.asFraction
  const deviation = market.greaterThan(implied)
    ? market.subtract(implied).divide(implied)
    : implied.subtract(market).divide(implied)

  if (deviation.greaterThan(MAX_MARKET_PRICE_USD_SPOT_DEVIATION)) {
    logs.push(buildCheckLog({ inputCurrency, outputCurrency, reason: 'usd_spot_deviation_exceeded', deviation }))
    return 'rejected'
  }

  return 'passed'
}

export interface LimitMarketPriceResult {
  marketPrice?: Price<Currency, Currency>
  // True when a reference was rejected by a safety gate (per-leg impact or USD spot cross-check),
  // as opposed to trade legs still loading — lets the form clear a stale prefilled price.
  referenceRejected: boolean
  // Swap fee of the trade the composition selected (single source of truth for which trade drives
  // each branch — the fee memo in hooks.ts consumes this instead of re-deriving the branch).
  // Only set alongside marketPrice.
  swapFee?: SwapFee
  // Structured payloads for the reference-check warns; emit via useLogMarketPriceReferenceChecks
  // so each distinct state logs once instead of on every quote poll.
  checkLogs: MarketPriceCheckLog[]
}

interface ComposedMarketPrice {
  marketPrice?: Price<Currency, Currency>
  referenceRejected: boolean
  swapFee?: SwapFee
  // True when the per-leg gate accepted a leg it could not evaluate (undefined priceDifference).
  legGateUnvalidated: boolean
}

function composeMarketPrice({
  inputCurrency,
  outputCurrency,
  tradeA,
  tradeB,
  logs,
}: {
  inputCurrency: Currency
  outputCurrency: Currency
  tradeA: Trade | null | undefined
  tradeB: Trade | null | undefined
  logs: MarketPriceCheckLog[]
}): ComposedMarketPrice {
  // if one of the currencies is ETH or WETH, just use the spot price from one of the Trade objects
  if (isNativeOrWrappedNative(inputCurrency)) {
    if (!tradeB?.outputAmount.currency.equals(outputCurrency) || !isClassic(tradeB)) {
      return { referenceRejected: false, legGateUnvalidated: false }
    }

    const leg = checkReferenceLeg({ trade: tradeB, inputCurrency, outputCurrency, logs })
    if (!leg.usable) {
      return { referenceRejected: true, legGateUnvalidated: false }
    }

    const referencePrice = tradeB.executionPrice
    // reconstruct Price object using correct currency between ETH or WETH
    return {
      marketPrice: new Price(inputCurrency, outputCurrency, referencePrice.denominator, referencePrice.numerator),
      referenceRejected: false,
      swapFee: tradeB.swapFee,
      legGateUnvalidated: leg.unvalidated,
    }
  }

  // same thing but for output currency being ETH or WETH
  if (isNativeOrWrappedNative(outputCurrency)) {
    if (!tradeA?.inputAmount.currency.equals(inputCurrency) || !isClassic(tradeA)) {
      return { referenceRejected: false, legGateUnvalidated: false }
    }

    const leg = checkReferenceLeg({ trade: tradeA, inputCurrency, outputCurrency, logs })
    if (!leg.usable) {
      return { referenceRejected: true, legGateUnvalidated: false }
    }

    const referencePrice = tradeA.executionPrice
    return {
      marketPrice: new Price(inputCurrency, outputCurrency, referencePrice.denominator, referencePrice.numerator),
      referenceRejected: false,
      swapFee: tradeA.swapFee,
      legGateUnvalidated: leg.unvalidated,
    }
  }

  // trade objects are still loading
  if (!tradeA?.inputAmount.currency.equals(inputCurrency) || !tradeB?.outputAmount.currency.equals(outputCurrency)) {
    return { referenceRejected: false, legGateUnvalidated: false }
  }

  if (!isClassic(tradeA) || !isClassic(tradeB)) {
    return { referenceRejected: false, legGateUnvalidated: false }
  }

  const legA = checkReferenceLeg({ trade: tradeA, inputCurrency, outputCurrency, logs })
  const legB = checkReferenceLeg({ trade: tradeB, inputCurrency, outputCurrency, logs })
  if (!legA.usable || !legB.usable) {
    return { referenceRejected: true, legGateUnvalidated: false }
  }

  // This currency pair is only eligible for fees iff both legs are eligible for fees; the fee is
  // then taken from the output leg.
  const canTakeFees = tradeA.swapFee?.percent.greaterThan(0) && tradeB.swapFee?.percent.greaterThan(0)

  // Combine spot prices of A -> ETH and ETH -> B to get a price for A -> B
  return {
    marketPrice: tradeA.executionPrice.multiply(tradeB.executionPrice),
    referenceRejected: false,
    swapFee: canTakeFees ? tradeB.swapFee : undefined,
    legGateUnvalidated: legA.unvalidated || legB.unvalidated,
  }
}

// Exported for tests. Composes the limit page's market-price reference from the two 1-ETH legs
// and rejects references built from poisoned legs (per-leg price impact gate) or diverging from
// the USD spot ratio (cross-check) so the form fails closed to the existing
// "Market price not available" state. `referenceRejected` separates a rejection from legs that
// are still loading, so the form only clears a prefilled price on an actual rejection; USD prices
// still loading likewise defer the reference (not yet available) rather than skipping the
// cross-check. Pure: warn payloads are returned as `checkLogs` for the hook to emit deduped.
export function computeLimitMarketPrice({
  inputCurrency,
  outputCurrency,
  tradeA,
  tradeB,
  usdPriceIn,
  usdPriceOut,
  usdPriceInLoading = false,
  usdPriceOutLoading = false,
}: {
  inputCurrency: Currency
  outputCurrency: Currency
  tradeA: Trade | null | undefined
  tradeB: Trade | null | undefined
  usdPriceIn?: Price<Currency, Currency>
  usdPriceOut?: Price<Currency, Currency>
  usdPriceInLoading?: boolean
  usdPriceOutLoading?: boolean
}): LimitMarketPriceResult {
  const checkLogs: MarketPriceCheckLog[] = []
  const composed = composeMarketPrice({ inputCurrency, outputCurrency, tradeA, tradeB, logs: checkLogs })

  if (!composed.marketPrice) {
    return { referenceRejected: composed.referenceRejected, checkLogs }
  }

  const crossCheckOutcome = runUsdSpotCrossCheck({
    marketPrice: composed.marketPrice,
    inputCurrency,
    outputCurrency,
    usdPriceIn,
    usdPriceOut,
    usdPriceInLoading,
    usdPriceOutLoading,
    logs: checkLogs,
  })

  if (crossCheckOutcome === 'deferred') {
    return { referenceRejected: false, checkLogs }
  }

  if (crossCheckOutcome === 'rejected') {
    return { referenceRejected: true, checkLogs }
  }

  if (crossCheckOutcome === 'skipped' && composed.legGateUnvalidated) {
    checkLogs.push(
      buildCheckLog({ inputCurrency, outputCurrency, reason: 'reference_unvalidated_no_checks_available' }),
    )
  }

  return {
    marketPrice: composed.marketPrice,
    referenceRejected: false,
    swapFee: composed.swapFee,
    checkLogs,
  }
}
