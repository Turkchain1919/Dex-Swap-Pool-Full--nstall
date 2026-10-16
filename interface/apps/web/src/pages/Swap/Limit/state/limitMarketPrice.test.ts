import { Currency, CurrencyAmount, Percent, Price, Token } from '@uniswap/sdk-core'
import { TradingApi } from '@universe/api'
import { UniverseChainId } from '@universe/chains'
import { nativeOnChain } from 'uniswap/src/constants/tokens'
import { SwapFee, Trade } from 'uniswap/src/features/transactions/swap/types/trade'
import { CurrencyField } from 'uniswap/src/types/currency'
import { logger } from 'utilities/src/logger/logger'
import {
  computeLimitMarketPrice,
  MarketPriceCheckLog,
  useLogMarketPriceReferenceChecks,
} from '~/pages/Swap/Limit/state/limitMarketPrice'
import { renderHook } from '~/test-utils/render'

const ETH = nativeOnChain(UniverseChainId.Mainnet)
const WETH = ETH.wrapped
const TOKEN_A = new Token(UniverseChainId.Mainnet, '0x0000000000000000000000000000000000000001', 18, 'TKA', 'Token A')
const TOKEN_B = new Token(UniverseChainId.Mainnet, '0x0000000000000000000000000000000000000002', 18, 'TKB', 'Token B')
const STABLE = new Token(UniverseChainId.Mainnet, '0x0000000000000000000000000000000000000003', 6, 'USDS', 'Stable')

const ONE_E18 = '1000000000000000000'

// Scenario: TOKEN_A = $10, ETH = $2000, TOKEN_B = $1 → market price TOKEN_A/TOKEN_B = 10
const USD_PRICE_IN = new Price(TOKEN_A, STABLE, ONE_E18, '10000000')
const USD_PRICE_OUT = new Price(TOKEN_B, STABLE, ONE_E18, '1000000')
const USD_PRICE_WETH = new Price(WETH, STABLE, ONE_E18, '2000000000')

function mockSwapFee(bips: number): SwapFee {
  return { percent: new Percent(bips, 10000), amount: '1', feeField: CurrencyField.OUTPUT }
}

function mockClassicLeg({
  inputCurrency,
  outputCurrency,
  executionPrice,
  priceDifference,
  swapFee,
}: {
  inputCurrency: Currency
  outputCurrency: Currency
  executionPrice: Price<Currency, Currency>
  priceDifference?: Percent
  swapFee?: SwapFee
}): Trade {
  return {
    routing: TradingApi.Routing.CLASSIC,
    inputAmount: CurrencyAmount.fromRawAmount(inputCurrency, 1),
    outputAmount: CurrencyAmount.fromRawAmount(outputCurrency, 1),
    executionPrice,
    priceDifference,
    swapFee,
  } as unknown as Trade
}

// tokenIn → ETH leg: 1 TOKEN_A = 0.005 ETH
function createTradeA(priceDifference?: Percent, swapFee?: SwapFee): Trade {
  return mockClassicLeg({
    inputCurrency: TOKEN_A,
    outputCurrency: ETH,
    executionPrice: new Price(TOKEN_A, ETH, '1000', '5'),
    priceDifference,
    swapFee,
  })
}

// ETH → tokenOut leg: 1 ETH = 2000 TOKEN_B
function createTradeB(priceDifference?: Percent, swapFee?: SwapFee): Trade {
  return mockClassicLeg({
    inputCurrency: ETH,
    outputCurrency: TOKEN_B,
    executionPrice: new Price(ETH, TOKEN_B, '1', '2000'),
    priceDifference,
    swapFee,
  })
}

const HEALTHY_IMPACT = new Percent(10, 10000) // 0.1%
const POISONED_IMPACT = new Percent(9824, 10000) // 98.24%, the SWAP-3319 incident leg

function baseArgs(): Parameters<typeof computeLimitMarketPrice>[0] {
  return {
    inputCurrency: TOKEN_A,
    outputCurrency: TOKEN_B,
    tradeA: createTradeA(HEALTHY_IMPACT),
    tradeB: createTradeB(HEALTHY_IMPACT),
    usdPriceIn: USD_PRICE_IN,
    usdPriceOut: USD_PRICE_OUT,
  }
}

function reasons(checkLogs: MarketPriceCheckLog[]): string[] {
  return checkLogs.map((log) => log.reason)
}

describe('computeLimitMarketPrice', () => {
  it('composes the two healthy legs into a market price', () => {
    const result = computeLimitMarketPrice(baseArgs())

    expect(result.marketPrice?.toSignificant(6)).toBe('10')
    expect(result.referenceRejected).toBe(false)
    expect(result.checkLogs).toHaveLength(0)
  })

  it('reports legs that are still loading as unavailable, not rejected', () => {
    const result = computeLimitMarketPrice({ ...baseArgs(), tradeA: undefined, tradeB: undefined })

    expect(result.marketPrice).toBeUndefined()
    expect(result.referenceRejected).toBe(false)
  })

  it('rejects a poisoned tradeA (the incident tokenIn → ETH leg)', () => {
    const result = computeLimitMarketPrice({ ...baseArgs(), tradeA: createTradeA(POISONED_IMPACT) })

    expect(result.marketPrice).toBeUndefined()
    expect(result.referenceRejected).toBe(true)
    expect(result.checkLogs).toContainEqual(
      expect.objectContaining({
        reason: 'leg_price_difference_exceeded',
        chainId: UniverseChainId.Mainnet,
        tokenInAddress: TOKEN_A.address,
        tokenOutAddress: TOKEN_B.address,
      }),
    )
  })

  it('rejects a poisoned tradeB (the ETH → tokenOut leg)', () => {
    const result = computeLimitMarketPrice({ ...baseArgs(), tradeB: createTradeB(POISONED_IMPACT) })

    expect(result.marketPrice).toBeUndefined()
    expect(result.referenceRejected).toBe(true)
  })

  it('uses the single tradeB leg when input is WETH, and rejects it when poisoned', () => {
    const singleLegArgs = {
      ...baseArgs(),
      inputCurrency: WETH,
      tradeA: undefined,
      usdPriceIn: USD_PRICE_WETH,
    }

    expect(computeLimitMarketPrice(singleLegArgs).marketPrice?.toSignificant(6)).toBe('2000')

    const poisoned = computeLimitMarketPrice({ ...singleLegArgs, tradeB: createTradeB(POISONED_IMPACT) })
    expect(poisoned.marketPrice).toBeUndefined()
    expect(poisoned.referenceRejected).toBe(true)
  })

  it('uses the single tradeA leg when output is WETH, and rejects it when poisoned', () => {
    const singleLegArgs = {
      ...baseArgs(),
      outputCurrency: WETH,
      tradeB: undefined,
      usdPriceOut: USD_PRICE_WETH,
    }

    expect(computeLimitMarketPrice(singleLegArgs).marketPrice?.toSignificant(6)).toBe('0.005')

    const poisoned = computeLimitMarketPrice({ ...singleLegArgs, tradeA: createTradeA(POISONED_IMPACT) })
    expect(poisoned.marketPrice).toBeUndefined()
    expect(poisoned.referenceRejected).toBe(true)
  })

  it('passes a leg at exactly 5% impact and rejects one just above it', () => {
    expect(
      computeLimitMarketPrice({ ...baseArgs(), tradeA: createTradeA(new Percent(5, 100)) }).marketPrice,
    ).toBeDefined()
    expect(
      computeLimitMarketPrice({ ...baseArgs(), tradeA: createTradeA(new Percent(501, 10000)) }).marketPrice,
    ).toBeUndefined()
  })

  it('passes legs with undefined priceDifference (fail-open) but reports them', () => {
    const result = computeLimitMarketPrice({
      ...baseArgs(),
      tradeA: createTradeA(undefined),
      tradeB: createTradeB(undefined),
    })

    expect(result.marketPrice?.toSignificant(6)).toBe('10')
    expect(result.checkLogs).toContainEqual(expect.objectContaining({ reason: 'leg_price_difference_undefined' }))
    // The USD cross-check still validated the reference, so the combined reason does not fire.
    expect(reasons(result.checkLogs)).not.toContain('reference_unvalidated_no_checks_available')
  })

  it('still rejects an undefined-impact composition when it diverges from the USD spot ratio', () => {
    // Legs report no impact but compose to 5 TKB per TKA while USD spot implies 10.
    const result = computeLimitMarketPrice({
      ...baseArgs(),
      tradeA: createTradeA(undefined),
      tradeB: mockClassicLeg({
        inputCurrency: ETH,
        outputCurrency: TOKEN_B,
        executionPrice: new Price(ETH, TOKEN_B, '1', '1000'),
        priceDifference: undefined,
      }),
    })

    expect(result.marketPrice).toBeUndefined()
    expect(result.referenceRejected).toBe(true)
    expect(result.checkLogs).toContainEqual(expect.objectContaining({ reason: 'usd_spot_deviation_exceeded' }))
  })

  it('rejects a composed price more than 10% away from the USD spot ratio, in both directions', () => {
    // Composed = 12 (20% above the USD-implied 10)
    const above = computeLimitMarketPrice({
      ...baseArgs(),
      tradeB: mockClassicLeg({
        inputCurrency: ETH,
        outputCurrency: TOKEN_B,
        executionPrice: new Price(ETH, TOKEN_B, '1', '2400'),
        priceDifference: HEALTHY_IMPACT,
      }),
    })
    // Composed = 8 (20% below — the incident direction: reference far below real market)
    const below = computeLimitMarketPrice({
      ...baseArgs(),
      tradeB: mockClassicLeg({
        inputCurrency: ETH,
        outputCurrency: TOKEN_B,
        executionPrice: new Price(ETH, TOKEN_B, '1', '1600'),
        priceDifference: HEALTHY_IMPACT,
      }),
    })

    expect(above.marketPrice).toBeUndefined()
    expect(above.referenceRejected).toBe(true)
    expect(below.marketPrice).toBeUndefined()
    expect(below.referenceRejected).toBe(true)
  })

  it('passes a composed price at or within 10% of the USD spot ratio', () => {
    // Composed = 11 (exactly 10% above the implied 10; the gate is strictly greater-than)
    const atBoundary = computeLimitMarketPrice({
      ...baseArgs(),
      tradeB: mockClassicLeg({
        inputCurrency: ETH,
        outputCurrency: TOKEN_B,
        executionPrice: new Price(ETH, TOKEN_B, '1', '2200'),
        priceDifference: HEALTHY_IMPACT,
      }),
    })

    expect(atBoundary.marketPrice?.toSignificant(6)).toBe('11')
  })

  it('skips the USD cross-check when a USD price has resolved as missing, but reports it', () => {
    // Mispriced composition (5 vs implied 10) sails through because usdPriceIn is unavailable.
    const result = computeLimitMarketPrice({
      ...baseArgs(),
      usdPriceIn: undefined,
      usdPriceInLoading: false,
      tradeB: mockClassicLeg({
        inputCurrency: ETH,
        outputCurrency: TOKEN_B,
        executionPrice: new Price(ETH, TOKEN_B, '1', '1000'),
        priceDifference: HEALTHY_IMPACT,
      }),
    })

    expect(result.marketPrice?.toSignificant(6)).toBe('5')
    expect(result.referenceRejected).toBe(false)
    expect(result.checkLogs).toContainEqual(
      expect.objectContaining({ reason: 'usd_spot_check_skipped_missing_usd_price' }),
    )
  })

  it('defers the reference while a missing USD price is still loading, instead of failing open', () => {
    const loadingIn = computeLimitMarketPrice({ ...baseArgs(), usdPriceIn: undefined, usdPriceInLoading: true })
    const loadingOut = computeLimitMarketPrice({ ...baseArgs(), usdPriceOut: undefined, usdPriceOutLoading: true })

    for (const result of [loadingIn, loadingOut]) {
      // Same shape as legs still loading: no reference yet, but not a rejection (no prefill, no
      // clearing, no banner) — and no skip is reported since the check is pending, not skipped.
      expect(result.marketPrice).toBeUndefined()
      expect(result.referenceRejected).toBe(false)
      expect(result.checkLogs).toHaveLength(0)
    }
  })

  it('does not defer on a loading flag once the USD price is available', () => {
    const result = computeLimitMarketPrice({ ...baseArgs(), usdPriceInLoading: true, usdPriceOutLoading: true })

    expect(result.marketPrice?.toSignificant(6)).toBe('10')
  })

  it('skips the USD cross-check on a stale USD price (base currency mismatch) instead of falsely rejecting', () => {
    // A WETH price left over from a token switch: comparing its raw fraction against TOKEN_A's
    // market price would imply a 20x divergence and falsely reject the healthy reference.
    const result = computeLimitMarketPrice({ ...baseArgs(), usdPriceIn: USD_PRICE_WETH })

    expect(result.marketPrice?.toSignificant(6)).toBe('10')
    expect(result.referenceRejected).toBe(false)
    expect(result.checkLogs).toContainEqual(
      expect.objectContaining({ reason: 'usd_spot_check_skipped_stale_usd_price' }),
    )
  })

  it('skips the USD cross-check on a stale usdPriceOut as well', () => {
    const result = computeLimitMarketPrice({
      ...baseArgs(),
      usdPriceOut: new Price(TOKEN_A, STABLE, ONE_E18, '1000000'),
    })

    expect(result.marketPrice?.toSignificant(6)).toBe('10')
    expect(result.referenceRejected).toBe(false)
    expect(result.checkLogs).toContainEqual(
      expect.objectContaining({ reason: 'usd_spot_check_skipped_stale_usd_price' }),
    )
  })

  it('skips the USD cross-check when the USD prices quote against different stablecoins, but reports it', () => {
    const OTHER_STABLE = new Token(
      UniverseChainId.Mainnet,
      '0x0000000000000000000000000000000000000004',
      6,
      'USDT',
      'Other Stable',
    )
    const result = computeLimitMarketPrice({
      ...baseArgs(),
      usdPriceOut: new Price(TOKEN_B, OTHER_STABLE, ONE_E18, '1000000'),
    })

    expect(result.marketPrice?.toSignificant(6)).toBe('10')
    expect(result.checkLogs).toContainEqual(
      expect.objectContaining({ reason: 'usd_spot_check_skipped_mismatched_usd_quotes' }),
    )
  })

  it('skips the USD cross-check on a zero usdPriceOut instead of passing it silently, and reports it', () => {
    // Before the guard, a zero usdPriceOut inverted into a zero denominator: the deviation math
    // resolved 0/0 and greaterThan returned false, so even a mispriced composition passed silently.
    const result = computeLimitMarketPrice({
      ...baseArgs(),
      usdPriceOut: new Price(TOKEN_B, STABLE, ONE_E18, '0'),
      tradeB: mockClassicLeg({
        inputCurrency: ETH,
        outputCurrency: TOKEN_B,
        executionPrice: new Price(ETH, TOKEN_B, '1', '1000'),
        priceDifference: HEALTHY_IMPACT,
      }),
    })

    expect(result.marketPrice?.toSignificant(6)).toBe('5')
    expect(result.referenceRejected).toBe(false)
    expect(result.checkLogs).toContainEqual(
      expect.objectContaining({ reason: 'usd_spot_check_skipped_zero_usd_price' }),
    )
  })

  it('skips the USD cross-check on a zero usdPriceIn (zero implied price), and reports it', () => {
    const result = computeLimitMarketPrice({
      ...baseArgs(),
      usdPriceIn: new Price(TOKEN_A, STABLE, ONE_E18, '0'),
    })

    expect(result.marketPrice?.toSignificant(6)).toBe('10')
    expect(result.checkLogs).toContainEqual(
      expect.objectContaining({ reason: 'usd_spot_check_skipped_zero_usd_price' }),
    )
  })

  describe('low-precision USD prices (sub-$0.0001 tokens)', () => {
    // A $0.0000089 token: useUSDCPrice truncates to the stablecoin's 6 decimals, so the USD
    // price arrives quantized to 8 raw units (~11% below the true price — beyond the 10% gate).
    const QUANTIZED_TINY_USD_PRICE_IN = new Price(TOKEN_A, STABLE, ONE_E18, '8')
    // Legs composing the true market price 0.0000089 TKB/TKA: 1 TKA = 4.45e-9 ETH, 1 ETH = 2000 TKB.
    const tinyTradeA = mockClassicLeg({
      inputCurrency: TOKEN_A,
      outputCurrency: ETH,
      executionPrice: new Price(TOKEN_A, ETH, '100000000000', '445'),
      priceDifference: HEALTHY_IMPACT,
    })

    it('skips the cross-check instead of rejecting a healthy pair whose USD price is quantized low, and reports it', () => {
      // Pre-guard, the quantized $0.000008 vs true $0.0000089 read as an 11.25% deviation and
      // falsely rejected the healthy reference whenever the live price sat between grid points.
      const result = computeLimitMarketPrice({
        ...baseArgs(),
        tradeA: tinyTradeA,
        usdPriceIn: QUANTIZED_TINY_USD_PRICE_IN,
      })

      expect(result.marketPrice?.toSignificant(6)).toBe('0.0000089')
      expect(result.referenceRejected).toBe(false)
      expect(result.checkLogs).toContainEqual(
        expect.objectContaining({ reason: 'usd_spot_check_skipped_low_precision_usd_price' }),
      )
    })

    it('skips on a low-precision usdPriceOut as well', () => {
      const result = computeLimitMarketPrice({
        ...baseArgs(),
        usdPriceOut: new Price(TOKEN_B, STABLE, ONE_E18, '8'),
      })

      expect(result.marketPrice?.toSignificant(6)).toBe('10')
      expect(result.referenceRejected).toBe(false)
      expect(reasons(result.checkLogs)).toContain('usd_spot_check_skipped_low_precision_usd_price')
    })

    it('still cross-checks (and rejects a divergent reference) at exactly 100 raw units', () => {
      // $0.0001 token stored as exactly 100 raw units, but legs composing 2x that price: the
      // precision floor is met, so the genuine divergence is still rejected.
      const result = computeLimitMarketPrice({
        ...baseArgs(),
        tradeA: mockClassicLeg({
          inputCurrency: TOKEN_A,
          outputCurrency: ETH,
          executionPrice: new Price(TOKEN_A, ETH, '10000000', '1'),
          priceDifference: HEALTHY_IMPACT,
        }),
        usdPriceIn: new Price(TOKEN_A, STABLE, ONE_E18, '100'),
      })

      expect(result.marketPrice).toBeUndefined()
      expect(result.referenceRejected).toBe(true)
      expect(result.checkLogs).toContainEqual(expect.objectContaining({ reason: 'usd_spot_deviation_exceeded' }))
    })

    it('skips the same divergent reference at 99 raw units (just under the precision floor)', () => {
      const result = computeLimitMarketPrice({
        ...baseArgs(),
        tradeA: mockClassicLeg({
          inputCurrency: TOKEN_A,
          outputCurrency: ETH,
          executionPrice: new Price(TOKEN_A, ETH, '10000000', '1'),
          priceDifference: HEALTHY_IMPACT,
        }),
        usdPriceIn: new Price(TOKEN_A, STABLE, ONE_E18, '99'),
      })

      expect(result.marketPrice).toBeDefined()
      expect(result.referenceRejected).toBe(false)
      expect(reasons(result.checkLogs)).toContain('usd_spot_check_skipped_low_precision_usd_price')
    })

    it('keeps rejecting a divergent pair whose USD prices carry plenty of precision', () => {
      // Same 2x divergence shape as the incident tests, USD prices at 1e7/1e6 raw units.
      const result = computeLimitMarketPrice({
        ...baseArgs(),
        tradeB: mockClassicLeg({
          inputCurrency: ETH,
          outputCurrency: TOKEN_B,
          executionPrice: new Price(ETH, TOKEN_B, '1', '4000'),
          priceDifference: HEALTHY_IMPACT,
        }),
      })

      expect(result.marketPrice).toBeUndefined()
      expect(result.referenceRejected).toBe(true)
      expect(result.checkLogs).toContainEqual(expect.objectContaining({ reason: 'usd_spot_deviation_exceeded' }))
    })
  })

  it('reports the combined no-checks-available reason when the leg gate and the USD cross-check both fail open', () => {
    // Quickroute-shaped legs (no priceDifference) on a pair whose USD price resolved as missing:
    // the reference gets zero validation — still fail-open by design, but reported distinctly.
    const result = computeLimitMarketPrice({
      ...baseArgs(),
      tradeA: createTradeA(undefined),
      tradeB: createTradeB(undefined),
      usdPriceIn: undefined,
      usdPriceInLoading: false,
    })

    expect(result.marketPrice?.toSignificant(6)).toBe('10')
    expect(result.referenceRejected).toBe(false)
    expect(reasons(result.checkLogs)).toEqual(
      expect.arrayContaining([
        'leg_price_difference_undefined',
        'usd_spot_check_skipped_missing_usd_price',
        'reference_unvalidated_no_checks_available',
      ]),
    )
  })

  it('does not report the combined reason when the legs were validated and only the USD check skipped', () => {
    const result = computeLimitMarketPrice({ ...baseArgs(), usdPriceIn: undefined })

    expect(result.marketPrice?.toSignificant(6)).toBe('10')
    expect(reasons(result.checkLogs)).not.toContain('reference_unvalidated_no_checks_available')
  })

  describe('swapFee selection', () => {
    const FEE_A = mockSwapFee(10)
    const FEE_B = mockSwapFee(15)

    it('selects the output leg fee on the two-leg path when both legs are fee-eligible', () => {
      const result = computeLimitMarketPrice({
        ...baseArgs(),
        tradeA: createTradeA(HEALTHY_IMPACT, FEE_A),
        tradeB: createTradeB(HEALTHY_IMPACT, FEE_B),
      })

      expect(result.swapFee).toBe(FEE_B)
    })

    it('selects no fee on the two-leg path when either leg is not fee-eligible', () => {
      const zeroFee = mockSwapFee(0)
      const result = computeLimitMarketPrice({
        ...baseArgs(),
        tradeA: createTradeA(HEALTHY_IMPACT, zeroFee),
        tradeB: createTradeB(HEALTHY_IMPACT, FEE_B),
      })

      expect(result.marketPrice).toBeDefined()
      expect(result.swapFee).toBeUndefined()
    })

    it('selects the single leg fee on the native-input and native-output paths', () => {
      const inputNative = computeLimitMarketPrice({
        ...baseArgs(),
        inputCurrency: WETH,
        tradeA: undefined,
        tradeB: createTradeB(HEALTHY_IMPACT, FEE_B),
        usdPriceIn: USD_PRICE_WETH,
      })
      const outputNative = computeLimitMarketPrice({
        ...baseArgs(),
        outputCurrency: WETH,
        tradeA: createTradeA(HEALTHY_IMPACT, FEE_A),
        tradeB: undefined,
        usdPriceOut: USD_PRICE_WETH,
      })

      expect(inputNative.swapFee).toBe(FEE_B)
      expect(outputNative.swapFee).toBe(FEE_A)
    })

    it('selects no fee when the reference is rejected', () => {
      const result = computeLimitMarketPrice({ ...baseArgs(), tradeA: createTradeA(POISONED_IMPACT) })

      expect(result.swapFee).toBeUndefined()
    })
  })
})

describe('useLogMarketPriceReferenceChecks', () => {
  beforeEach(() => {
    vi.spyOn(logger, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function checkLog(reason: MarketPriceCheckLog['reason']): MarketPriceCheckLog {
    return {
      chainId: UniverseChainId.Mainnet,
      tokenInAddress: TOKEN_A.address,
      tokenOutAddress: TOKEN_B.address,
      reason,
    }
  }

  it('logs each distinct (pair, reason) state once, not once per recomputation', () => {
    const { rerender } = renderHook((logs: MarketPriceCheckLog[]) => useLogMarketPriceReferenceChecks(logs), {
      initialProps: [checkLog('leg_price_difference_undefined')],
    })

    // A fresh array with the same content models the memo recomputing on a quote poll.
    rerender([checkLog('leg_price_difference_undefined')])
    rerender([checkLog('leg_price_difference_undefined')])

    expect(logger.warn).toHaveBeenCalledTimes(1)
    expect(logger.warn).toHaveBeenCalledWith(
      'limitMarketPrice',
      'computeLimitMarketPrice',
      'limit market price reference check',
      expect.objectContaining({ reason: 'leg_price_difference_undefined' }),
    )
  })

  it('logs again when the check state changes', () => {
    const { rerender } = renderHook((logs: MarketPriceCheckLog[]) => useLogMarketPriceReferenceChecks(logs), {
      initialProps: [checkLog('leg_price_difference_undefined')],
    })

    rerender([checkLog('usd_spot_check_skipped_missing_usd_price')])

    expect(logger.warn).toHaveBeenCalledTimes(2)
    expect(logger.warn).toHaveBeenLastCalledWith(
      'limitMarketPrice',
      'computeLimitMarketPrice',
      'limit market price reference check',
      expect.objectContaining({ reason: 'usd_spot_check_skipped_missing_usd_price' }),
    )
  })

  it('logs nothing on the healthy path', () => {
    const { rerender } = renderHook((logs: MarketPriceCheckLog[]) => useLogMarketPriceReferenceChecks(logs), {
      initialProps: [] as MarketPriceCheckLog[],
    })

    rerender([])

    expect(logger.warn).not.toHaveBeenCalled()
  })
})
