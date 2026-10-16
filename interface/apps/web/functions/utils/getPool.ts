import { GraphQLApi } from '@universe/api'
import { Data } from 'functions/utils/cache'
import {
  formatLiquidityFeeTier,
  type LiquidityTokenMetadata,
  liquidityServicePost,
} from 'functions/utils/liquidityService'
import { URL_PARAM_TO_CHAIN_ID } from 'uniswap/src/features/chains/chainUrlParam'

// Liquidity `Protocols` enum names (connect-JSON serializes enums by name) → the GraphQL
// ProtocolVersion the OG `Data` shape carries. Only V2 drives a downstream badge. `Protocols.V2` is
// the zero value, so if the backend ever omits it (protojson drops zero-valued enums) an absent
// version means V2 — which is also the sensible default for the one badge that matters.
const PROTOCOL_TO_GQL_VERSION: Record<string, GraphQLApi.ProtocolVersion> = {
  V2: GraphQLApi.ProtocolVersion.V2,
  V3: GraphQLApi.ProtocolVersion.V3,
  V4: GraphQLApi.ProtocolVersion.V4,
}

interface LiquidityPoolSummary {
  protocolVersion?: string
  feeTier?: number
  isDynamicFee?: boolean
  token0Metadata?: LiquidityTokenMetadata
  token1Metadata?: LiquidityTokenMetadata
}

export default async function getPool({
  networkName,
  poolAddress,
  url,
}: {
  networkName: string
  poolAddress: string
  url: string
}): Promise<Data | undefined> {
  const chainId = URL_PARAM_TO_CHAIN_ID[networkName.toLowerCase()]
  if (!chainId) {
    return undefined
  }

  // GetPool resolves the protocol version from chain + identifier, so the request omits `version`
  // and takes only the pool reference — one call returns the tokens (with logos), fee, and version.
  const result = await liquidityServicePost<{ pool?: LiquidityPoolSummary }>('GetPool', {
    pool: { chainId, addressOrId: poolAddress },
  })
  const pool = result?.pool
  if (!pool) {
    return undefined
  }

  const protocolVersion = PROTOCOL_TO_GQL_VERSION[pool.protocolVersion || 'V2'] ?? GraphQLApi.ProtocolVersion.V2
  const origin = new URL(url).origin
  const image = origin + '/api/image/pools/' + networkName + '/' + poolAddress
  const feeTier = formatLiquidityFeeTier({
    feeTier: pool.feeTier,
    isDynamicFee: pool.isDynamicFee,
    isV2: protocolVersion === GraphQLApi.ProtocolVersion.V2,
  })
  const name = `${pool.token0Metadata?.symbol ?? 'Unknown'}/${pool.token1Metadata?.symbol ?? 'Unknown'}`
  const title = `${name} on Uniswap`

  return {
    title,
    image,
    url,
    name,
    poolData: {
      token0Symbol: pool.token0Metadata?.symbol,
      token1Symbol: pool.token1Metadata?.symbol,
      feeTier,
      protocolVersion,
      token0Image: pool.token0Metadata?.logoUrl,
      token1Image: pool.token1Metadata?.logoUrl,
    },
  }
}
