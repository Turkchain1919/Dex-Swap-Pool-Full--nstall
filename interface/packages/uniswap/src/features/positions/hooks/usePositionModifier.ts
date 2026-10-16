import type { PartialMessage } from '@bufbuild/protobuf'
import type { PoolRef, PositionModifier } from '@uniswap/client-liquidity/dist/uniswap/liquidity/v2/types_pb'
import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { toLiquidityChainId } from 'uniswap/src/features/positions/utils'
import { selectPositionsVisibility } from 'uniswap/src/features/visibility/selectors'
import { parsePositionId } from 'uniswap/src/features/visibility/utils'

/**
 * Builds the `PositionModifier` for a GetWalletPositions request from the user's Redux visibility
 * state so the backend — not the client — decides which positions come back.
 *
 * The per-pool overrides shape both views: a pool the user hid joins `poolExcludeOverrides`, one
 * they force-showed joins `poolIncludeOverrides`. `hiddenOnly` flips the result between the visible
 * set (toggle off) and its exact complement — spam-flagged plus the user's hides (toggle on).
 */
export function usePositionModifier({ includeHidden }: { includeHidden: boolean }): PartialMessage<PositionModifier> {
  const positionsVisibility = useSelector(selectPositionsVisibility)

  return useMemo(() => {
    const poolIncludeOverrides: PartialMessage<PoolRef>[] = []
    const poolExcludeOverrides: PartialMessage<PoolRef>[] = []
    // Legacy persisted entries lack chainId/poolId/tokenId on the value; parsePositionId recovers
    // them from the key. positionId targets a single V3/V4 position; V2 omits it so the BE falls
    // back to pool matching.
    for (const [positionId, positionVisibility] of Object.entries(positionsVisibility)) {
      const parsedFromId = parsePositionId(positionId)
      const chainId = toLiquidityChainId(positionVisibility.chainId ?? parsedFromId?.chainId)
      const poolId = positionVisibility.poolId ?? parsedFromId?.poolId
      const tokenId = positionVisibility.tokenId ?? parsedFromId?.tokenId
      if (chainId === undefined || !poolId) {
        continue
      }
      const poolRef: PartialMessage<PoolRef> = { chainId, poolId, positionId: tokenId }
      if (positionVisibility.isVisible) {
        poolIncludeOverrides.push(poolRef)
      } else {
        poolExcludeOverrides.push(poolRef)
      }
    }

    return { hiddenOnly: includeHidden, poolIncludeOverrides, poolExcludeOverrides }
  }, [positionsVisibility, includeHidden])
}
