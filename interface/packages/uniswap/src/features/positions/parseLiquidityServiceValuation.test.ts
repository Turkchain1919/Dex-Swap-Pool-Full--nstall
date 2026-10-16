import { ProtocolVersion } from '@uniswap/client-data-api/dist/data/v1/poolTypes_pb'
import type { Position as LiquidityServicePosition } from '@uniswap/client-liquidity/dist/uniswap/liquidity/v2/types_pb'
import { Token } from '@uniswap/sdk-core'
import { parseUncollectedFees } from 'uniswap/src/features/positions/parseLiquidityServiceValuation'
import { describe, expect, it, vi } from 'vitest'

vi.mock('utilities/src/logger/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const USDC = new Token(1, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 6, 'USDC', 'USD Coin')
const WETH = new Token(1, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 18, 'WETH', 'Wrapped Ether')

function feePosition(overrides: Partial<LiquidityServicePosition> = {}): LiquidityServicePosition {
  return overrides as LiquidityServicePosition
}

describe('parseUncollectedFees', () => {
  const args = { version: ProtocolVersion.V3, token0: USDC, token1: WETH, hasTokenIdentity: true }

  it('builds CurrencyAmounts from the raw fee strings using each token decimals', () => {
    const fees = parseUncollectedFees({
      ...args,
      position: feePosition({
        token0UncollectedFees: '2500000',
        token1UncollectedFees: '1000000000000000',
        uncollectedFeesUsd: 4.5,
      }),
    })

    expect(fees.token0UncollectedFees).toBe('2500000')
    expect(fees.token1UncollectedFees).toBe('1000000000000000')
    expect(fees.fee0Amount?.toExact()).toBe('2.5')
    expect(fees.fee1Amount?.toExact()).toBe('0.001')
    expect(fees.uncollectedFeesUsd).toBe(4.5)
  })

  it('maps each side independently when only one fee field is served', () => {
    const fees = parseUncollectedFees({ ...args, position: feePosition({ token0UncollectedFees: '2500000' }) })

    expect(fees.fee0Amount?.toExact()).toBe('2.5')
    expect(fees.fee1Amount).toBeUndefined()
    expect(fees.token1UncollectedFees).toBeUndefined()
    expect(fees.uncollectedFeesUsd).toBeUndefined()
  })

  it('passes raw strings and USD through without CurrencyAmounts when token identity is unresolved', () => {
    const fees = parseUncollectedFees({
      ...args,
      hasTokenIdentity: false,
      position: feePosition({
        token0UncollectedFees: '2500000',
        token1UncollectedFees: '1000000000000000',
        uncollectedFeesUsd: 4.5,
      }),
    })

    expect(fees.token0UncollectedFees).toBe('2500000')
    expect(fees.uncollectedFeesUsd).toBe(4.5)
    expect(fees.fee0Amount).toBeUndefined()
    expect(fees.fee1Amount).toBeUndefined()
  })

  it('returns all-undefined when the response serves no fee fields', () => {
    const fees = parseUncollectedFees({ ...args, position: feePosition() })

    expect(fees).toEqual({
      token0UncollectedFees: undefined,
      token1UncollectedFees: undefined,
      fee0Amount: undefined,
      fee1Amount: undefined,
      uncollectedFeesUsd: undefined,
      token0UncollectedFeesUsd: undefined,
      token1UncollectedFeesUsd: undefined,
    })
  })

  it('derives per-token fee USD from the backend token prices, summing to the total', () => {
    // Mirrors the LP-1616 repro: fees priced at the backend token prices must sum to
    // uncollectedFeesUsd, so the PDP breakdown can't recompute with a divergent live oracle.
    const fees = parseUncollectedFees({
      ...args,
      position: feePosition({
        token0UncollectedFees: '2500000', // 2.5 USDC
        token1UncollectedFees: '1000000000000000', // 0.001 WETH
        token0PriceUsd: '1',
        token1PriceUsd: '2000',
        uncollectedFeesUsd: 4.5,
      }),
    })

    expect(fees.token0UncollectedFeesUsd).toBe(2.5) // 2.5 × 1
    expect(fees.token1UncollectedFeesUsd).toBe(2) // 0.001 × 2000
    expect((fees.token0UncollectedFeesUsd ?? 0) + (fees.token1UncollectedFeesUsd ?? 0)).toBeCloseTo(
      fees.uncollectedFeesUsd ?? 0,
    )
  })

  it('leaves per-token fee USD undefined when a token price is not served', () => {
    const fees = parseUncollectedFees({
      ...args,
      position: feePosition({
        token0UncollectedFees: '2500000',
        token1UncollectedFees: '1000000000000000',
        token0PriceUsd: '1',
        uncollectedFeesUsd: 4.5,
      }),
    })

    expect(fees.token0UncollectedFeesUsd).toBe(2.5)
    expect(fees.token1UncollectedFeesUsd).toBeUndefined()
  })

  it('returns all-undefined for a V2 pair even when fee fields are served', () => {
    const fees = parseUncollectedFees({
      ...args,
      version: ProtocolVersion.V2,
      position: feePosition({ token0UncollectedFees: '2500000', uncollectedFeesUsd: 4.5 }),
    })

    expect(fees.token0UncollectedFees).toBeUndefined()
    expect(fees.fee0Amount).toBeUndefined()
    expect(fees.uncollectedFeesUsd).toBeUndefined()
  })

  it('degrades a malformed raw string to an undefined CurrencyAmount instead of throwing', () => {
    const fees = parseUncollectedFees({
      ...args,
      position: feePosition({
        token0UncollectedFees: '2.5',
        token1UncollectedFees: '1000000000000000',
        uncollectedFeesUsd: 4.5,
      }),
    })

    expect(fees.fee0Amount).toBeUndefined()
    expect(fees.fee1Amount?.toExact()).toBe('0.001')
    expect(fees.token0UncollectedFees).toBe('2.5')
    expect(fees.uncollectedFeesUsd).toBe(4.5)
  })
})
