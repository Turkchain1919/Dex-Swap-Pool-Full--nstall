import type { UniverseChainId } from '@universe/chains'
import type { RWAMatch } from 'uniswap/src/features/rwa/rwaMatch'
import { UniswapEventName } from 'uniswap/src/features/telemetry/constants'
import { sendAnalyticsEvent } from 'uniswap/src/features/telemetry/send'
import { useEvent } from 'utilities/src/react/hooks'

/**
 * Returns the toggle handler for the issuer-variant module's "N more" row, which fires
 * `RWA Sibling Expanded` on open. Collapse is deliberately not instrumented — the event
 * counts expansions only.
 *
 * `variantCount` is the module's total sibling count, not the number the expansion reveals.
 */
export function useExpandRWASiblingHandler({
  rwaMatch,
  variantCount,
  isExpanded,
  setIsExpanded,
}: {
  rwaMatch: RWAMatch | undefined
  variantCount: number
  isExpanded: boolean
  setIsExpanded: (expanded: boolean) => void
}): () => void {
  return useEvent((): void => {
    const expanded = !isExpanded
    if (expanded && rwaMatch) {
      sendAnalyticsEvent(UniswapEventName.RWASiblingExpanded, {
        tokenAddress: rwaMatch.token.address,
        tokenSymbol: rwaMatch.token.symbol,
        chainId: rwaMatch.token.chainId as UniverseChainId,
        issuer: rwaMatch.token.issuer,
        variantCount,
      })
    }
    setIsExpanded(expanded)
  })
}
