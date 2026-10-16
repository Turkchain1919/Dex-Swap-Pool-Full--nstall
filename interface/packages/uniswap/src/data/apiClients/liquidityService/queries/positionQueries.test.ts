import { ChainId } from '@uniswap/client-liquidity/dist/uniswap/liquidity/v1/types_pb'
import type { V2LiquidityServiceClient } from 'uniswap/src/data/apiClients/liquidityService/LiquidityServiceClient'
import { getGetWalletPositionsBalanceQueryOptions } from 'uniswap/src/data/apiClients/liquidityService/queries/positionQueries'
import { WALLET_POSITIONS_QUERY_KEY_PREFIX } from 'uniswap/src/data/apiClients/liquidityService/queryKeys'
import { describe, expect, it, vi } from 'vitest'

describe(getGetWalletPositionsBalanceQueryOptions, () => {
  it('keys under the getWalletPositions prefix so existing positions invalidations cover it', () => {
    const client = { getWalletPositionsBalance: vi.fn() } as unknown as typeof V2LiquidityServiceClient

    const options = getGetWalletPositionsBalanceQueryOptions(client, {
      params: { walletAddress: '0xabc', chainIds: [ChainId.MAINNET] },
    })

    // Prefix-matching is element-wise, so the existing refetch/invalidate sites hit this entry
    // without a second call site to keep in sync.
    expect(options.queryKey.slice(0, WALLET_POSITIONS_QUERY_KEY_PREFIX.length)).toEqual([
      ...WALLET_POSITIONS_QUERY_KEY_PREFIX,
    ])
  })
})
