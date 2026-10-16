import { ProtocolVersion } from '@uniswap/client-data-api/dist/data/v1/poolTypes_pb'
import { Currency, V3_CORE_FACTORY_ADDRESSES } from '@uniswap/sdk-core'
import { Pair } from '@uniswap/v2-sdk'
import { computePoolAddress, Pool as V3Pool } from '@uniswap/v3-sdk'
import { Pool as V4Pool } from '@uniswap/v4-sdk'
import { getWrappedTokenIfExists } from 'uniswap/src/utils/currency'

export function getPoolIdOrAddressFromCreatePositionInfo({
  protocolVersion,
  poolOrPair,
  sdkCurrencies,
}: {
  protocolVersion: ProtocolVersion
  poolOrPair: V3Pool | V4Pool | Pair | undefined
  sdkCurrencies: { TOKEN0: Maybe<Currency>; TOKEN1: Maybe<Currency> }
}): string | undefined {
  if (!poolOrPair) {
    return undefined
  }

  switch (protocolVersion) {
    case ProtocolVersion.V2: {
      if ('liquidityToken' in poolOrPair) {
        return poolOrPair.liquidityToken.address
      }
      return undefined
    }
    case ProtocolVersion.V3: {
      if ('fee' in poolOrPair && 'chainId' in poolOrPair) {
        const tokenA = getWrappedTokenIfExists(sdkCurrencies.TOKEN0)
        const tokenB = getWrappedTokenIfExists(sdkCurrencies.TOKEN1)
        return poolOrPair.chainId && tokenA && tokenB
          ? computePoolAddress({
              factoryAddress: V3_CORE_FACTORY_ADDRESSES[poolOrPair.chainId],
              tokenA,
              tokenB,
              fee: poolOrPair.fee,
              chainId: poolOrPair.chainId,
            })
          : undefined
      }
      return undefined
    }
    case ProtocolVersion.V4:
    default: {
      if ('poolId' in poolOrPair) {
        return poolOrPair.poolId
      }
      return undefined
    }
  }
}
