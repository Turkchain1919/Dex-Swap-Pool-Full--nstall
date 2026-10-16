import { RwaCategory } from '@uniswap/client-data-api/dist/data/v1/api_pb'
import type { UniverseChainId } from '@universe/chains'
import { GatedFeature, useGatedFeatures } from '@universe/compliance'
import { useEffect } from 'react'
import type { RWAMatch } from 'uniswap/src/features/rwa/rwaMatch'
import { UniswapEventName } from 'uniswap/src/features/telemetry/constants'
import { sendAnalyticsEvent } from 'uniswap/src/features/telemetry/send'
import { useEvent } from 'utilities/src/react/hooks'

/**
 * Fires `RWA Token Details Viewed` once per RWA TDP view, after the match resolves.
 * No-op when `rwaMatch` is undefined (non-RWA token).
 *
 * The send waits for the compliance region lookup so `geogated` never logs a stale pending `false`.
 */
export function useLogRWATokenDetailsViewed({
  rwaMatch,
  tokenAddress,
  tokenSymbol,
  chainId,
}: {
  rwaMatch: RWAMatch | undefined
  tokenAddress?: string
  tokenSymbol?: string
  chainId?: UniverseChainId
}): void {
  const matchedAddress = rwaMatch?.token.address
  const { features: gatedFeatures, isPending: isRegionPending } = useGatedFeatures()
  const isRwaRegionBlocked = gatedFeatures.includes(GatedFeature.ISSUER_SPECIFIC_RWA)

  // Stable callback so the effect keys on viewed-token identity, not on every input change.
  const logViewed = useEvent((): void => {
    if (!rwaMatch) {
      return
    }
    sendAnalyticsEvent(UniswapEventName.RWATokenDetailsViewed, {
      tokenAddress,
      tokenSymbol,
      chainId,
      stocks: rwaMatch.asset.category === RwaCategory.STOCKS,
      issuer: rwaMatch.token.issuer,
      geogated: isRwaRegionBlocked,
    })
  })

  useEffect(() => {
    if (!matchedAddress || isRegionPending) {
      return
    }
    logViewed()
  }, [matchedAddress, chainId, tokenAddress, isRegionPending, logViewed])
}
