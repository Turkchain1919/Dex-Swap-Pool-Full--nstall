import { ProtocolVersion } from '@uniswap/client-data-api/dist/data/v1/poolTypes_pb'
import { PositionStatus } from '@uniswap/client-liquidity/dist/uniswap/liquidity/v2/types_pb'
import { AddressStringFormat, normalizeAddress, type UniverseChainId } from '@universe/chains'
import { useCallback, useMemo } from 'react'
import { useLiquidityServiceWalletPositions } from 'uniswap/src/features/positions/hooks/useLiquidityServiceWalletPositions'
import type { PositionInfo } from 'uniswap/src/features/positions/types'
import { toLiquidityChainId } from 'uniswap/src/features/positions/utils'
import { positionSortToRequest } from '~/features/Liquidity/hooks/usePositionSort'
import type { PositionSort } from '~/features/Liquidity/PositionsTableColumns'

const PROTOCOL_VERSIONS = [ProtocolVersion.V2, ProtocolVersion.V3, ProtocolVersion.V4]
// Lifecycle only, no range filter: the pool page shows every position the wallet holds here, open
// or closed.
const LIFECYCLE_STATUSES = [PositionStatus.OPEN, PositionStatus.CLOSED]
const PAGE_SIZE = 25

export interface UsePoolPositionsResult {
  positions: PositionInfo[]
  isPlaceholderData: boolean
}

/**
 * The connected wallet's positions in a single pool, from the liquidity service's
 * `GetWalletPositions`. Pages are drained, so the returned list is the wallet's complete holding in
 * the pool and can be counted directly.
 *
 * Spam-flagged pools are excluded server-side (no modifier is sent), matching what this page showed
 * on the data-api endpoint. The user's own portfolio hides are deliberately not sent either: a
 * position hidden from the wallet-wide list still belongs on its own pool's page.
 */
export function usePoolPositions({
  account,
  chainId,
  poolIdOrAddress,
  sort,
}: {
  account?: string
  chainId: UniverseChainId
  poolIdOrAddress: string
  sort?: PositionSort
}): UsePoolPositionsResult {
  const { sortBy, ascending } = useMemo(() => positionSortToRequest(sort), [sort])
  // The request rejects an empty chain set, and an unmappable chain maps to exactly that, so a pool
  // on a chain the liquidity service doesn't serve must skip the query rather than send a 400.
  const isServedChain = toLiquidityChainId(chainId) !== undefined

  // allPositions, not the visible/hidden split: this table shows the pool's positions as one list,
  // and only allPositions preserves the order the server sorted them in.
  const { allPositions, isPlaceholderData } = useLiquidityServiceWalletPositions({
    account: account ?? '',
    chainIds: [chainId],
    protocolVersions: PROTOCOL_VERSIONS,
    requestStatuses: LIFECYCLE_STATUSES,
    // GetWalletPositions has no pool filter. `search` is the closest thing the request offers — a
    // case-insensitive substring over the position's pool id/address plus both tokens'
    // address/symbol/name — so it narrows the response to this pool server-side, and the exact
    // match below is what actually scopes the list.
    search: poolIdOrAddress,
    sortBy,
    ascending,
    pageSize: PAGE_SIZE,
    disabled: !account || !poolIdOrAddress || !isServedChain,
  })

  const normalizedPoolId = normalizeAddress(poolIdOrAddress, AddressStringFormat.Lowercase)
  const matchesPool = useCallback(
    (position: PositionInfo) => normalizeAddress(position.poolId, AddressStringFormat.Lowercase) === normalizedPoolId,
    [normalizedPoolId],
  )

  return useMemo(
    () => ({ positions: allPositions.filter(matchesPool), isPlaceholderData }),
    [allPositions, isPlaceholderData, matchesPool],
  )
}
