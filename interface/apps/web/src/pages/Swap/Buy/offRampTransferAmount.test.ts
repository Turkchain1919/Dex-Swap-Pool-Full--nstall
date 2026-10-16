import { Token } from '@uniswap/sdk-core'
import { UniverseChainId } from '@universe/chains'
import { getOffRampTransferCurrencyAmount } from '~/pages/Swap/Buy/offRampTransferAmount'

const TOKEN_18 = new Token(UniverseChainId.Mainnet, '0x0000000000000000000000000000000000000001', 18, 'TKN', 'Token')
const TOKEN_8 = new Token(
  UniverseChainId.Mainnet,
  '0x0000000000000000000000000000000000000003',
  8,
  'WBTC',
  'Wrapped BTC',
)
const TOKEN_6 = new Token(UniverseChainId.Mainnet, '0x0000000000000000000000000000000000000002', 6, 'USDC', 'USD Coin')
const TOKEN_0 = new Token(
  UniverseChainId.Mainnet,
  '0x0000000000000000000000000000000000000004',
  0,
  'ZERO',
  'Zero Decimals',
)

describe('getOffRampTransferCurrencyAmount', () => {
  it('converts an 18-decimal amount whose float product is not an integer', () => {
    // Precondition: `amount * 10 ** decimals` lands on 4033250000000000.5 for this amount, which
    // CurrencyAmount.fromRawAmount rejects with a RangeError.
    expect(Number.isInteger(0.00403325 * 10 ** 18)).toBe(false)

    const amount = getOffRampTransferCurrencyAmount({ baseCurrencyAmount: 0.00403325, currency: TOKEN_18 })

    expect(amount.quotient.toString()).toBe('4033250000000000')
    expect(amount.toExact()).toBe('0.00403325')
  })

  it('converts a second 18-decimal amount whose float product is not an integer', () => {
    expect(Number.isInteger(0.0039437 * 10 ** 18)).toBe(false)

    const amount = getOffRampTransferCurrencyAmount({ baseCurrencyAmount: 0.0039437, currency: TOKEN_18 })

    expect(amount.quotient.toString()).toBe('3943700000000000')
  })

  it('converts an amount whose float product is already an integer', () => {
    const amount = getOffRampTransferCurrencyAmount({ baseCurrencyAmount: 1.5, currency: TOKEN_18 })

    expect(amount.quotient.toString()).toBe('1500000000000000000')
  })

  it('converts an amount for a 6-decimal token', () => {
    const amount = getOffRampTransferCurrencyAmount({ baseCurrencyAmount: 123.456789, currency: TOKEN_6 })

    expect(amount.quotient.toString()).toBe('123456789')
    expect(amount.toExact()).toBe('123.456789')
  })

  it('converts an amount small enough to stringify as exponential notation', () => {
    expect(String(1e-7)).toBe('1e-7')

    const amount = getOffRampTransferCurrencyAmount({ baseCurrencyAmount: 1e-7, currency: TOKEN_18 })

    expect(amount.quotient.toString()).toBe('100000000000')
  })

  it('converts an exponential-notation amount whose mantissa has a fraction', () => {
    // '1.5e-7' takes a different expansion path in `convertScientificNotationToNumber` than '1e-7'.
    expect(String(1.5e-7)).toBe('1.5e-7')

    const amount = getOffRampTransferCurrencyAmount({ baseCurrencyAmount: 1.5e-7, currency: TOKEN_18 })

    expect(BigInt(amount.quotient.toString())).toBe(150000000000n)
  })

  it('converts an amount large enough to stringify as positive exponential notation', () => {
    expect(String(1e21)).toBe('1e+21')

    const amount = getOffRampTransferCurrencyAmount({ baseCurrencyAmount: 1e21, currency: TOKEN_18 })

    expect(amount.quotient.toString()).toBe('1000000000000000000000000000000000000000')
  })

  describe('produces the exact decimal the provider sent', () => {
    // `toFixed(18)` prints the double's binary expansion, so these would come out a few hundred
    // units short of the decimal amount; the raw amount must be the exact decimal instead.
    it.each<[number, bigint]>([
      [0.1, 100000000000000000n],
      [0.2, 200000000000000000n],
      [0.3, 300000000000000000n],
      [1.1, 1100000000000000000n],
      [2.34, 2340000000000000000n],
      [2.675, 2675000000000000000n],
      [6.3, 6300000000000000000n],
      [8.8, 8800000000000000000n],
      [12345.6789, 12345678900000000000000n],
      [0.00403325, 4033250000000000n],
      [999000000000000000000, 999000000000000000000000000000000000000n],
    ])('%s at 18 decimals', (baseCurrencyAmount, expectedRawAmount) => {
      const amount = getOffRampTransferCurrencyAmount({ baseCurrencyAmount, currency: TOKEN_18 })

      expect(BigInt(amount.quotient.toString())).toBe(expectedRawAmount)
    })

    it('96252769.1 at 8 decimals', () => {
      const amount = getOffRampTransferCurrencyAmount({ baseCurrencyAmount: 96252769.1, currency: TOKEN_8 })

      expect(BigInt(amount.quotient.toString())).toBe(9625276910000000n)
    })

    it('does not reproduce the float products the old multiply path returned for short decimals', () => {
      expect(1.1 * 10 ** 18).toBe(1100000000000000128)
      expect(8.8 * 10 ** 18).toBe(8800000000000001024)

      const amount = getOffRampTransferCurrencyAmount({ baseCurrencyAmount: 8.8, currency: TOKEN_18 })

      expect(amount.quotient.toString()).toBe('8800000000000000000')
    })
  })

  describe('throws rather than substituting a value', () => {
    it('for an amount that is not a number, naming the rejected type rather than throwing a TypeError', () => {
      expect(() =>
        getOffRampTransferCurrencyAmount({ baseCurrencyAmount: undefined as unknown as number, currency: TOKEN_18 }),
      ).toThrow('Off-ramp transfer amount must be a positive finite number, received undefined')
      expect(() =>
        getOffRampTransferCurrencyAmount({ baseCurrencyAmount: undefined as unknown as number, currency: TOKEN_18 }),
      ).not.toThrow(TypeError)
    })

    it.each([NaN, Infinity, -Infinity, 0, -1, -0.5])('for %s', (baseCurrencyAmount) => {
      expect(() => getOffRampTransferCurrencyAmount({ baseCurrencyAmount, currency: TOKEN_18 })).toThrow(
        'must be a positive finite number',
      )
    })

    it('for an amount below the smallest unit of the token instead of transferring zero', () => {
      expect((4e-7).toFixed(6)).toBe('0.000000')

      expect(() => getOffRampTransferCurrencyAmount({ baseCurrencyAmount: 4e-7, currency: TOKEN_6 })).toThrow(
        'has 7 fraction digits but the token only has 6 decimals',
      )
    })

    it('for an exponential-notation amount whose expansion exceeds the token decimals', () => {
      expect(() => getOffRampTransferCurrencyAmount({ baseCurrencyAmount: 2.5e-7, currency: TOKEN_6 })).toThrow(
        'has 8 fraction digits but the token only has 6 decimals',
      )
    })

    it('for more fraction digits than the token has decimals instead of rounding', () => {
      expect(() => getOffRampTransferCurrencyAmount({ baseCurrencyAmount: 123.4567891, currency: TOKEN_6 })).toThrow(
        'has 7 fraction digits but the token only has 6 decimals',
      )
    })

    it('for a fraction of a 0-decimal token instead of rounding up to a whole unit', () => {
      expect(() => getOffRampTransferCurrencyAmount({ baseCurrencyAmount: 0.5, currency: TOKEN_0 })).toThrow(
        'has 1 fraction digits but the token only has 0 decimals',
      )
    })
  })
})
