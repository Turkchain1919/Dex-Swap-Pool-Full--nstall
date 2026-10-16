import { Hook, ProtocolVersion } from '@uniswap/client-data-api/dist/data/v1/poolTypes_pb'
import { ChainId, PoolInformation } from '@uniswap/client-liquidity/dist/uniswap/liquidity/v1/types_pb'
import { FeeAmount, TICK_SPACINGS, Pool as V3Pool } from '@uniswap/v3-sdk'
import { Pool as V4Pool } from '@uniswap/v4-sdk'
import { USDT } from 'uniswap/src/constants/tokens'
import { getSDKPoolFromPoolInformation } from 'uniswap/src/features/positions/getSDKPoolFromPoolInformation'
import { WETH } from 'uniswap/src/test/fixtures/lib/sdk'
import { describe, expect, it } from 'vitest'

describe('getSDKPoolFromPoolInformation', () => {
  const HOOK_ADDRESS = '0x09DEA99D714A3a19378e3D80D1ad22Ca46085080'
  const token0 = WETH
  const token1 = USDT
  const hooks = { address: HOOK_ADDRESS } as Hook

  class MockPoolInformation extends PoolInformation {
    fee = FeeAmount.MEDIUM
    sqrtRatioX96 = '4054976535745954444738484'
    poolLiquidity = '7201247293608325509'
    currentTick = -197613
    tickSpacing = TICK_SPACINGS[FeeAmount.MEDIUM]
    poolReferenceIdentifier = '12345'
    tokenAddressA = token0.address
    tokenAddressB = token1.address
    chainId = ChainId.MAINNET
    token0Reserves = '1000000000000000000'
    token1Reserves = '2000000000000000000'
    hookAddress = hooks.address
    constructor(readonly protocolVersion: ProtocolVersion) {
      super()
    }
  }

  const MOCK_V3_POOL_INFORMATION = new MockPoolInformation(ProtocolVersion.V3)
  const MOCK_V4_POOL_INFORMATION = new MockPoolInformation(ProtocolVersion.V4)

  const V3_POOL = new V3Pool(
    token0,
    token1,
    MOCK_V3_POOL_INFORMATION.fee,
    MOCK_V3_POOL_INFORMATION.sqrtRatioX96,
    MOCK_V3_POOL_INFORMATION.poolLiquidity,
    MOCK_V3_POOL_INFORMATION.currentTick,
  )

  const V4_POOL = new V4Pool(
    token0,
    token1,
    MOCK_V4_POOL_INFORMATION.fee,
    MOCK_V4_POOL_INFORMATION.tickSpacing,
    MOCK_V4_POOL_INFORMATION.hookAddress,
    MOCK_V4_POOL_INFORMATION.sqrtRatioX96,
    MOCK_V4_POOL_INFORMATION.poolLiquidity,
    MOCK_V4_POOL_INFORMATION.currentTick,
  )

  it('returns undefined if poolOrPair, token0, or token1 is missing', () => {
    expect(
      getSDKPoolFromPoolInformation({ poolOrPair: undefined, token0, token1, protocolVersion: ProtocolVersion.V3 }),
    ).toBeUndefined()
    expect(
      getSDKPoolFromPoolInformation({
        poolOrPair: MOCK_V3_POOL_INFORMATION,
        token0: undefined,
        token1,
        protocolVersion: ProtocolVersion.V3,
      }),
    ).toBeUndefined()
    expect(
      getSDKPoolFromPoolInformation({
        poolOrPair: MOCK_V3_POOL_INFORMATION,
        token0,
        token1: undefined,
        protocolVersion: ProtocolVersion.V3,
      }),
    ).toBeUndefined()
  })

  it('returns V3Pool for ProtocolVersion.V3', () => {
    const result = getSDKPoolFromPoolInformation({
      poolOrPair: MOCK_V3_POOL_INFORMATION,
      token0,
      token1,
      protocolVersion: ProtocolVersion.V3,
    })
    expect(result).toEqual(V3_POOL)
  })

  it('returns V4Pool for ProtocolVersion.V4', () => {
    const result = getSDKPoolFromPoolInformation({
      poolOrPair: MOCK_V4_POOL_INFORMATION,
      token0,
      token1,
      protocolVersion: ProtocolVersion.V4,
      hooks: hooks.address,
    })
    expect(result).toEqual(V4_POOL)
  })
})
