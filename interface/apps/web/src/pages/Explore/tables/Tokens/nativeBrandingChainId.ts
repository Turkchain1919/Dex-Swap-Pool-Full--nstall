import type { RankedMultichainToken } from '@uniswap/client-data-api/dist/data/v2/types_pb'
import { UniverseChainId, areAddressesEqual } from '@universe/chains'
import { WRAPPED_NATIVE_CURRENCY } from 'uniswap/src/constants/tokens'
import { isNativeCurrencyAddress } from 'uniswap/src/utils/currencyId'

/**
 * The chain whose native-currency branding an Explore row's unwrapToken call should use.
 *
 * L2s brand their native ETH differently ("Optimistic ETH") but it's the same asset. Chain-filtered
 * pages keep the filtered chain's own branding — the backend returns the grouping's full addresses
 * map (mainnet leg included) even when chain-filtered, so the mainnet-leg probe can't decide that.
 * The unfiltered page prefers mainnet's canonical "Ethereum"/"ETH" branding when the grouping has a
 * mainnet native leg; otherwise (e.g. Polygon's POL — no mainnet leg) keep the primary chain's own.
 */
export function getNativeBrandingChainId({
  multichainToken,
  chainId,
  exploreChainId,
}: {
  multichainToken: NonNullable<RankedMultichainToken['multichainToken']>
  chainId: number
  exploreChainId: UniverseChainId | undefined
}): number {
  // Raw addresses read is safe here: it only probes the mainnet leg for native-currency
  // branding, and mainnet is always registered and never flag-gated.
  const mainnetAddress = multichainToken.addresses[String(UniverseChainId.Mainnet)]
  // The backend is migrating native tokens from wrapped-native addresses to the zero address — accept both
  const mainnetIsNative = Boolean(
    mainnetAddress &&
    (areAddressesEqual({
      addressInput1: { address: mainnetAddress, chainId: UniverseChainId.Mainnet },
      addressInput2: {
        address: WRAPPED_NATIVE_CURRENCY[UniverseChainId.Mainnet]?.address,
        chainId: UniverseChainId.Mainnet,
      },
    }) ||
      isNativeCurrencyAddress(UniverseChainId.Mainnet, mainnetAddress)),
  )
  return exploreChainId === undefined && mainnetIsNative ? UniverseChainId.Mainnet : chainId
}
