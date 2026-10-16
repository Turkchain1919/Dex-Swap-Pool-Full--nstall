import { Currency } from '@uniswap/sdk-core'
import { UniverseChainId } from '@universe/chains'
import { isMobileApp } from '@universe/environment'
import { Flex, zIndexes } from '@universe/mycelium'
import { styled } from '@universe/mycelium/styled'
import { useColorSchemeFromSeed } from '@universe/mycelium/theme-hooks-compat'
import { type ComponentPropsWithoutRef, type CSSProperties, memo, useMemo } from 'react'
import { STATUS_RATIO } from 'uniswap/src/components/CurrencyLogo/constants'
import { NetworkLogo } from 'uniswap/src/components/CurrencyLogo/NetworkLogo'
import { SplitLogo } from 'uniswap/src/components/CurrencyLogo/SplitLogo'
import { TokenLogo } from 'uniswap/src/components/CurrencyLogo/TokenLogo'
import { getCommonBase } from 'uniswap/src/constants/routing'
import { CurrencyInfo } from 'uniswap/src/features/dataApi/types'
import { buildCurrencyInfo } from 'uniswap/src/features/dataApi/utils/buildCurrency'
import { useCurrencyInfo } from 'uniswap/src/features/tokens/useCurrencyInfo'
import { areCurrencyIdsEqual, buildCurrencyId, currencyAddress } from 'uniswap/src/utils/currencyId'

const MissingImageLogoFrame = styled('div', {
  platform: 'web',
  base: 'rounded-[100px] [font-size:calc(var(--size,24px)/3)] font-[535] text-center flex items-center justify-center relative',
})

function MissingImageLogo({
  size,
  textColor,
  backgroundColor,
  style,
  ...rest
}: { size?: string; textColor: string; backgroundColor: string } & ComponentPropsWithoutRef<
  typeof MissingImageLogoFrame
>): JSX.Element {
  const resolvedSize = size ?? '24px'
  return (
    <MissingImageLogoFrame
      style={
        {
          '--size': resolvedSize,
          color: textColor,
          backgroundColor,
          height: resolvedSize,
          lineHeight: resolvedSize,
          width: resolvedSize,
          ...style,
        } as CSSProperties
      }
      {...rest}
    />
  )
}

function LogolessPlaceholder({
  currency,
  size,
  includeNetwork = true,
}: {
  currency?: Currency
  size: number
  includeNetwork?: boolean
}) {
  const { foreground, background } = useColorSchemeFromSeed(currency?.name ?? currency?.symbol ?? '')

  const chainId = currency?.chainId
  const showNetworkLogo = includeNetwork && chainId && chainId !== UniverseChainId.Mainnet
  const networkLogoSize = Math.round(size * STATUS_RATIO)
  const networkLogoBorderWidth = isMobileApp ? 2 : 1.5

  return (
    <MissingImageLogo size={size + 'px'} textColor={foreground} backgroundColor={background}>
      {currency?.symbol?.toUpperCase().replace('$', '').replace(/\s+/g, '').slice(0, 3)}
      {showNetworkLogo && (
        <Flex bottom={-2} position="absolute" right={-3} zIndex={zIndexes.mask}>
          <NetworkLogo borderWidth={networkLogoBorderWidth} chainId={chainId} size={networkLogoSize} />
        </Flex>
      )}
    </MissingImageLogo>
  )
}

/** A logo the caller already holds for one of the `currencies`, tied to the currency it belongs to. */
export interface ServedLogo {
  currency: Currency | undefined
  logoUrl: string | undefined
}

function servedLogoUrlFor(currencyId: string, servedLogos: ServedLogo[] | undefined): string | undefined {
  return servedLogos?.find(
    ({ currency }) =>
      currency && areCurrencyIdsEqual(buildCurrencyId(currency.chainId, currencyAddress(currency)), currencyId),
  )?.logoUrl
}

/**
 * Resolves the CurrencyInfo a logo slot renders from. A served logo is enough to build it locally,
 * which skips the per-token lookup (a GetToken per token otherwise); a slot without one falls back
 * to the lookup. Native legs ignore the served URL: list endpoints serve the wrapped token's logo
 * for an unwrapped native leg, and the bundled native asset is what the lookup returns for natives
 * anyway (see the native carve-out in useCurrencyInfo).
 */
function useLogoCurrencyInfo(
  currency: Currency | undefined,
  servedLogos: ServedLogo[] | undefined,
): Maybe<CurrencyInfo> {
  const address = currency ? currencyAddress(currency) : undefined
  const currencyId = currency && address ? buildCurrencyId(currency.chainId, address) : undefined
  const logoUrl = currencyId ? servedLogoUrlFor(currencyId, servedLogos) : undefined

  const localCurrencyInfo = useMemo((): CurrencyInfo | undefined => {
    if (!currency || !address || !currencyId || !logoUrl) {
      return undefined
    }
    if (currency.isNative) {
      const commonBase = getCommonBase(currency.chainId, address)
      return commonBase && { ...commonBase, currencyId }
    }
    return buildCurrencyInfo({ currency, currencyId, logoUrl, isSpam: false })
  }, [currency, address, currencyId, logoUrl])

  const fetchedCurrencyInfo = useCurrencyInfo(currencyId, { skip: !!localCurrencyInfo })
  return localCurrencyInfo ?? fetchedCurrencyInfo
}

export const DoubleCurrencyLogo = memo(function DoubleCurrencyLogo({
  currencies,
  servedLogos,
  size = 32,
  customIcon,
  includeNetwork = true,
  orientation = 'split',
}: {
  currencies: Array<Currency | undefined>
  /**
   * Logos the caller already holds for some of `currencies` (e.g. served on a ListPools row), in any
   * order. A currency with one renders without the per-token lookup that resolves the others.
   */
  servedLogos?: ServedLogo[]
  size?: number
  customIcon?: React.ReactNode
  // When false, no network is threaded to the logo, so no network badge renders. Use when the surrounding layout already shows the network.
  includeNetwork?: boolean
  /** Passed through to SplitLogo; 'stacked' shows two full logos side by side, overlapping horizontally. Only affects the two-logo path. */
  orientation?: 'split' | 'stacked'
}) {
  const currencyInfos = [
    useLogoCurrencyInfo(currencies[0], servedLogos),
    useLogoCurrencyInfo(currencies[1], servedLogos),
  ]
  const invalidCurrencyLogo0 = !currencyInfos[0]?.logoUrl
  const invalidCurrencyLogo1 = !currencyInfos[1]?.logoUrl
  const chainId = includeNetwork ? (currencyInfos[0]?.currency.chainId ?? null) : null

  if (invalidCurrencyLogo0 && invalidCurrencyLogo1) {
    return <LogolessPlaceholder currency={currencies[0]} size={size} includeNetwork={Boolean(chainId)} />
  }
  if (invalidCurrencyLogo0 && currencyInfos[1]?.logoUrl) {
    return <TokenLogo url={currencyInfos[1].logoUrl} size={size} chainId={chainId} />
  }
  if (invalidCurrencyLogo1 && currencyInfos[0]?.logoUrl) {
    return <TokenLogo url={currencyInfos[0]?.logoUrl} size={size} chainId={chainId} />
  }
  return (
    <SplitLogo
      chainId={chainId}
      inputCurrencyInfo={currencyInfos[0]}
      outputCurrencyInfo={currencyInfos[1]}
      customIcon={customIcon}
      size={size}
      orientation={orientation}
    />
  )
})
