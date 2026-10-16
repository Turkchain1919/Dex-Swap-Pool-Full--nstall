import { ProtocolVersion } from '@uniswap/client-data-api/dist/data/v1/poolTypes_pb'
import { PoolInformation } from '@uniswap/client-liquidity/dist/uniswap/liquidity/v1/types_pb'
import { Currency, CurrencyAmount, Token } from '@uniswap/sdk-core'
import { Pair } from '@uniswap/v2-sdk'
import { FeeAmount, Pool as V3Pool } from '@uniswap/v3-sdk'
import { Pool as V4Pool } from '@uniswap/v4-sdk'
import { ZERO_ADDRESS } from 'uniswap/src/constants/misc'
import { DEFAULT_TICK_SPACING } from 'uniswap/src/constants/pools'
import { logger } from 'utilities/src/logger/logger'

/** A served v3 fee, or undefined when it isn't one of the four canonical v3 tiers. */
function parseV3FeeAmount(feeTier: number | string | undefined): FeeAmount | undefined {
  const parsedFee = Number(feeTier || '')

  return parsedFee in FeeAmount ? parsedFee : undefined
}

export function getSDKPoolFromPoolInformation({
  poolOrPair,
  token0,
  token1,
  protocolVersion,
}: {
  poolOrPair?: PoolInformation
  token0?: Token
  token1?: Token
  protocolVersion: ProtocolVersion.V2
}): Pair | undefined
export function getSDKPoolFromPoolInformation({
  poolOrPair,
  token0,
  token1,
  protocolVersion,
}: {
  poolOrPair?: PoolInformation
  token0?: Token
  token1?: Token
  protocolVersion: ProtocolVersion.V3
}): V3Pool | undefined
export function getSDKPoolFromPoolInformation({
  poolOrPair,
  token0,
  token1,
  protocolVersion,
  hooks,
}: {
  poolOrPair?: PoolInformation
  token0: Maybe<Currency>
  token1: Maybe<Currency>
  protocolVersion: ProtocolVersion.V4
  hooks: string
}): V4Pool | undefined
export function getSDKPoolFromPoolInformation({
  poolOrPair,
  token0,
  token1,
  protocolVersion,
  hooks,
}:
  | {
      poolOrPair?: PoolInformation
      token0?: Token
      token1?: Token
      protocolVersion: ProtocolVersion.V2
      hooks?: undefined
    }
  | {
      poolOrPair?: PoolInformation
      token0?: Token
      token1?: Token
      protocolVersion: ProtocolVersion.V3
      hooks?: undefined
    }
  | {
      poolOrPair?: PoolInformation
      token0: Maybe<Currency>
      token1: Maybe<Currency>
      protocolVersion: ProtocolVersion.V4
      hooks: string
    }): V3Pool | V4Pool | Pair | undefined {
  if (!poolOrPair || !token0 || !token1) {
    return undefined
  }
  if (protocolVersion === ProtocolVersion.V2) {
    return new Pair(
      CurrencyAmount.fromRawAmount(token0, poolOrPair.token0Reserves ?? '0'),
      CurrencyAmount.fromRawAmount(token1, poolOrPair.token1Reserves ?? '0'),
    )
  }

  try {
    if (protocolVersion === ProtocolVersion.V3) {
      return new V3Pool(
        token0 as Token,
        token1 as Token,
        parseV3FeeAmount(poolOrPair.fee) ?? FeeAmount.MEDIUM,
        poolOrPair.sqrtRatioX96 ?? '0',
        poolOrPair.poolLiquidity ?? '0',
        poolOrPair.currentTick ?? 0,
      )
    }

    return new V4Pool(
      token0,
      token1,
      poolOrPair.fee ?? FeeAmount.MEDIUM,
      poolOrPair.tickSpacing ?? DEFAULT_TICK_SPACING,
      hooks || ZERO_ADDRESS,
      poolOrPair.sqrtRatioX96 ?? '0',
      poolOrPair.poolLiquidity ?? '0',
      poolOrPair.currentTick ?? 0,
    )
  } catch (e) {
    logger.error(e, {
      tags: {
        file: 'positions/getSDKPoolFromPoolInformation.ts',
        function: 'getSDKPoolFromPoolInformation',
      },
      extra: {
        poolOrPair: JSON.stringify(poolOrPair),
      },
    })
    // Return undefined instead of throwing to enable retry logic with manual refetch.
    // The UI will show an error message with a retry button.
    return undefined
  }
}
