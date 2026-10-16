import { parseUnits } from '@ethersproject/units'
import { Currency, CurrencyAmount, Price } from '@uniswap/sdk-core'
import { normalizeToken, usePrice } from '@universe/prices'
import { useMemo } from 'react'
import { PollingInterval } from 'uniswap/src/constants/misc'
import { getPrimaryStablecoin, isUniverseChainId } from 'uniswap/src/features/chains/utils'
import { isRemotePriceServiceSupportedChain } from 'uniswap/src/features/prices/isRemotePriceServiceSupportedChain'
import { useSolanaUSDCPrice } from 'uniswap/src/features/transactions/hooks/useSolanaUSDCPrice'
import { areCurrencyIdsEqual, currencyId } from 'uniswap/src/utils/currencyId'
import { convertScientificNotationToNumber } from 'utilities/src/format/convertScientificNotation'
import { truncateToMaxDecimals } from 'utilities/src/format/truncateToMaxDecimals'
import { logger } from 'utilities/src/logger/logger'

const MAX_TINY_PRICE_SCALING_DECIMALS = 36

export function useUSDCPrice(
  currency?: Currency,
  pollInterval: PollingInterval = PollingInterval.Fast,
): {
  price: Price<Currency, Currency> | undefined
  isLoading: boolean
  // True while the underlying price is withheld as stale with a refetch in flight (see usePrice):
  // `price` is undefined but provisional, not settled-missing. Callers whose missing-price
  // handling fails open should defer while this is true. Always false on the Solana quote path,
  // which has no persisted cache to rehydrate stale entries from.
  isStaleRefreshing: boolean
} {
  const { chainId, address } = currency ? normalizeToken(currency) : { chainId: undefined, address: undefined }

  const isRemoteSupported = chainId !== undefined && isRemotePriceServiceSupportedChain(chainId)
  const stablecoin = useMemo(() => (isUniverseChainId(chainId) ? getPrimaryStablecoin(chainId) : undefined), [chainId])
  const currencyIsStablecoin = Boolean(
    stablecoin && currency && areCurrencyIdsEqual(currencyId(currency), currencyId(stablecoin)),
  )

  // Remote pricing no-ops when disabled or when the input is the chain's primary stablecoin.
  const {
    price: livePrice,
    isLoading: livePriceLoading,
    isStaleRefreshing: livePriceStaleRefreshing,
  } = usePrice({
    chainId: isRemoteSupported && !currencyIsStablecoin ? chainId : undefined,
    address: isRemoteSupported && !currencyIsStablecoin ? address : undefined,
  })

  const solanaResult = useSolanaUSDCPrice(currency, pollInterval)
  const solanaResultWithRefreshState = useMemo(() => ({ ...solanaResult, isStaleRefreshing: false }), [solanaResult])

  const remoteResult = useMemo(() => {
    if (!currency || !stablecoin || !isUniverseChainId(chainId)) {
      return { price: undefined, isLoading: false, isStaleRefreshing: false }
    }

    if (currencyIsStablecoin) {
      return { price: new Price(stablecoin, stablecoin, '1', '1'), isLoading: false, isStaleRefreshing: false }
    }

    if (livePrice === undefined || !Number.isFinite(livePrice)) {
      // Distinguish "still fetching" from "settled with no price" so callers
      // don't treat a cold-cache miss as a confirmed absence of price — and surface
      // the withheld-stale-mid-refetch state so callers can defer instead of failing open.
      return { price: undefined, isLoading: livePriceLoading, isStaleRefreshing: livePriceStaleRefreshing }
    }

    try {
      // Parse human-readable amounts: 1 unit of token, and livePrice (USD per token) in stablecoin.
      // Truncate price to stablecoin decimals so parseUnits doesn't throw (e.g. USDC has 6 decimals).
      const getQuoteAmountRaw = (price: number): string =>
        parseUnits(
          truncateToMaxDecimals({
            value: convertScientificNotationToNumber(price.toString()),
            maxDecimals: stablecoin.decimals,
          }),
          stablecoin.decimals,
        ).toString()

      let baseAmountRaw = parseUnits('1', currency.decimals).toString()
      let quoteAmountRaw = getQuoteAmountRaw(livePrice)

      if (quoteAmountRaw === '0' && livePrice > 0) {
        baseAmountRaw = parseUnits(`1${'0'.repeat(MAX_TINY_PRICE_SCALING_DECIMALS)}`, currency.decimals).toString()
        quoteAmountRaw = getQuoteAmountRaw(livePrice * 10 ** MAX_TINY_PRICE_SCALING_DECIMALS)
      }

      const baseAmount = CurrencyAmount.fromRawAmount(currency, baseAmountRaw)
      const quoteAmount = CurrencyAmount.fromRawAmount(stablecoin, quoteAmountRaw)

      return {
        price: quoteAmountRaw === '0' ? undefined : new Price({ baseAmount, quoteAmount }),
        isLoading: false,
        isStaleRefreshing: false,
      }
    } catch (error) {
      logger.debug('useUSDCPrice', 'remoteResult', 'parse price failed', { error, livePrice })
      return { price: undefined, isLoading: false, isStaleRefreshing: false }
    }
  }, [currency, stablecoin, chainId, currencyIsStablecoin, livePrice, livePriceLoading, livePriceStaleRefreshing])

  return isRemoteSupported ? remoteResult : solanaResultWithRefreshState
}

export function useUSDCValue(
  currencyAmount: CurrencyAmount<Currency> | undefined | null,
  pollInterval: PollingInterval = PollingInterval.Fast,
): CurrencyAmount<Currency> | null {
  const { price } = useUSDCPrice(currencyAmount?.currency, pollInterval)

  return useMemo(() => {
    if (!price || !currencyAmount) {
      return null
    }
    try {
      return price.quote(currencyAmount)
    } catch (error) {
      logger.debug('useUSDCPrice', 'useUSDCValue', 'price.quote failed', { error })
      return null
    }
  }, [currencyAmount, price])
}

export function useUSDCValueWithStatus(
  currencyAmount: CurrencyAmount<Currency> | undefined | null,
  pollInterval: PollingInterval = PollingInterval.Fast,
): {
  value: CurrencyAmount<Currency> | null
  isLoading: boolean
} {
  const { price, isLoading } = useUSDCPrice(currencyAmount?.currency, pollInterval)

  return useMemo(() => {
    if (!price || !currencyAmount) {
      return { value: null, isLoading }
    }
    try {
      return { value: price.quote(currencyAmount), isLoading }
    } catch (error) {
      logger.debug('useUSDCPrice', 'useUSDCValueWithStatus', 'price.quote failed', { error })
      return { value: null, isLoading: false }
    }
  }, [currencyAmount, isLoading, price])
}
