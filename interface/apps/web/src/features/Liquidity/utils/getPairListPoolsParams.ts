import type { PartialMessage } from '@bufbuild/protobuf'
import type { ProtocolVersion } from '@uniswap/client-data-api/dist/data/v1/poolTypes_pb'
import type { ListPoolsRequest } from '@uniswap/client-data-api/dist/data/v2/api_pb'
import { PoolsOrderBy, PoolTokenLogicalOperator } from '@uniswap/client-data-api/dist/data/v2/types_pb'
import { Platform, getValidAddress } from '@universe/chains'

/**
 * Shared data.v2 `ListPools` params for "pools containing this unordered pair" queries
 * (TVL-sorted). PoolTokenFilter documents checksummed addresses; the input addresses may arrive
 * lowercased (e.g. the permissioned-adapter mapping), so this checksums them.
 *
 * Returns undefined while either side of the pair is missing, so an incomplete pair can never
 * degrade into an unfiltered chain-wide query — the query layer throws on enabled-but-absent
 * params instead of firing the request. Callers still gate `enabled` on both addresses.
 */
export function getPairListPoolsParams({
  chainId,
  addresses,
  protocolVersions,
}: {
  chainId: number | undefined
  addresses: readonly [string | undefined, string | undefined]
  protocolVersions: ProtocolVersion[]
}): Omit<PartialMessage<ListPoolsRequest>, 'page'> | undefined {
  const [address0, address1] = addresses
  if (!address0 || !address1) {
    return undefined
  }
  const tokens = [address0, address1].map(
    (address) => getValidAddress({ address, withEVMChecksum: true, platform: Platform.EVM }) ?? address,
  )
  return {
    chainIds: chainId ? [chainId] : [],
    sort: { orderBy: PoolsOrderBy.TVL },
    filter: {
      protocolVersions,
      tokenFilter: { tokens, logicalOperator: PoolTokenLogicalOperator.AND },
      // v1 parity: spam is included there, and permissioned adapter tokens may be flagged non-benign.
      includeSpam: true,
      applyTopLevelFilters: false,
    },
  }
}
