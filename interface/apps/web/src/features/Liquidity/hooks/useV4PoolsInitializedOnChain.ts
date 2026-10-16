import { LBP_STRATEGY_ABI } from '@uniswap/liquidity-launcher-sdk'
import { CHAIN_TO_ADDRESSES_MAP, Currency } from '@uniswap/sdk-core'
import { Pool as V4Pool } from '@uniswap/v4-sdk'
import { useMemo } from 'react'
import { ZERO_ADDRESS } from 'uniswap/src/constants/misc'
import { useReadContracts } from 'wagmi'
import { assume0xAddress } from '~/chains'
import { lbpStrategiesForChain } from '~/features/Liquidity/supersededLbpStrategies'
import { getFeeTierKey } from '~/features/Liquidity/utils/feeTiers'

const STATE_VIEW_GET_SLOT0_ABI = [
  {
    type: 'function',
    name: 'getSlot0',
    stateMutability: 'view',
    inputs: [{ name: 'poolId', type: 'bytes32' }],
    outputs: [
      { name: 'sqrtPriceX96', type: 'uint160' },
      { name: 'tick', type: 'int24' },
      { name: 'protocolFee', type: 'uint24' },
      { name: 'lpFee', type: 'uint24' },
    ],
  },
] as const

// A poolId is bytes32, so ZERO_ADDRESS (20 bytes) is the wrong width for this arg.
const ZERO_POOL_ID: `0x${string}` = `0x${'0'.repeat(64)}`

interface FeeTierCandidate {
  feeAmount: number
  tickSpacing: number
  isDynamic?: boolean
}

function getV4StateViewAddress(chainId?: number): string | undefined {
  if (!chainId) {
    return undefined
  }
  return CHAIN_TO_ADDRESSES_MAP[chainId as keyof typeof CHAIN_TO_ADDRESSES_MAP]?.v4StateView
}

/**
 * A fee tier is unavailable to a new CCA launch if its pool is already initialized (`sqrtPriceX96 != 0`)
 * or reserved by a live auction (`registeredPoolIds != 0`) on ANY strategy generation.
 *
 * `reservedBy` holds one initializer per strategy read for this pool id, and a non-zero from any of
 * them takes the tier: reservations live on whichever strategy created the auction and survive until
 * it migrates, so the current generation returning zero does not mean the tier is free. Empty or
 * `undefined` means the reservation wasn't checked (chain without a launcher deployment).
 */
export function isFeeTierPoolUnavailable(p: { sqrtPriceX96?: bigint; reservedBy?: readonly string[] }): boolean {
  if (p.sqrtPriceX96 !== undefined && p.sqrtPriceX96 !== 0n) {
    return true
  }
  if (p.reservedBy?.some((initializer) => initializer !== ZERO_ADDRESS) === true) {
    return true
  }
  return false
}

/**
 * Returns the fee-tier keys a new CCA pool can't use, checking both conditions the launcher enforces
 * on-chain: the v4 pool is already initialized (`getSlot0.sqrtPriceX96 != 0`), or the pool id is reserved
 * by a live auction (`LBPStrategy.registeredPoolIds != 0`). On-chain because the indexed `listPools` data
 * omits the abandoned/zero-liquidity pools the launcher still rejects. The reservation read is skipped on
 * chains without a launcher deployment.
 *
 * The reservation is read on EVERY strategy generation the chain has had, not just the current
 * one — see {@link lbpStrategiesForChain}.
 */
export function useV4PoolsInitializedOnChain({
  chainId,
  sdkCurrencies,
  hook = ZERO_ADDRESS,
  feeTiers,
  enabled = true,
}: {
  chainId?: number
  sdkCurrencies: { TOKEN0: Maybe<Currency>; TOKEN1: Maybe<Currency> }
  hook?: string
  feeTiers: FeeTierCandidate[]
  enabled?: boolean
}): { unavailableFeeTierKeys: Set<string>; isLoading: boolean; isError: boolean } {
  const { TOKEN0, TOKEN1 } = sdkCurrencies
  const stateViewAddress = getV4StateViewAddress(chainId)
  const lbpStrategies = useMemo(() => lbpStrategiesForChain(chainId), [chainId])

  // Dynamic-fee tiers have no fixed (fee, tickSpacing) poolId, so they can't be checked this way.
  const candidates = useMemo(() => feeTiers.filter((tier) => !tier.isDynamic), [feeTiers])

  const poolIds = useMemo(() => {
    if (!TOKEN0 || !TOKEN1) {
      return []
    }
    return candidates.map((tier) => {
      try {
        return V4Pool.getPoolId(TOKEN0, TOKEN1, tier.feeAmount, tier.tickSpacing, hook)
      } catch {
        return undefined
      }
    })
  }, [TOKEN0, TOKEN1, candidates, hook])

  const queryEnabled = Boolean(enabled && stateViewAddress && TOKEN0 && TOKEN1 && candidates.length > 0)

  const {
    data: slot0Data,
    isLoading: isSlot0Loading,
    isError: isSlot0Error,
  } = useReadContracts({
    contracts: useMemo(
      () =>
        poolIds.map(
          (poolId) =>
            ({
              address: assume0xAddress(stateViewAddress) ?? '0x',
              abi: STATE_VIEW_GET_SLOT0_ABI,
              functionName: 'getSlot0',
              args: [assume0xAddress(poolId) ?? ZERO_POOL_ID],
              chainId,
            }) as const,
        ),
      [poolIds, stateViewAddress, chainId],
    ),
    query: { enabled: queryEnabled },
  })

  // Second gate (CCA): is the pool id reserved by a live auction, on any strategy generation? Skipped
  // where the launcher isn't deployed. Flattened pool-id-major, so candidate `i` owns the
  // `lbpStrategies.length` results starting at `i * lbpStrategies.length`.
  const {
    data: reservedData,
    isLoading: isReservedLoading,
    isError: isReservedError,
  } = useReadContracts({
    contracts: useMemo(
      () =>
        poolIds.flatMap((poolId) =>
          lbpStrategies.map(
            (strategy) =>
              ({
                address: assume0xAddress(strategy),
                abi: LBP_STRATEGY_ABI,
                functionName: 'registeredPoolIds',
                args: [assume0xAddress(poolId) ?? ZERO_POOL_ID],
                chainId,
              }) as const,
          ),
        ),
      [poolIds, lbpStrategies, chainId],
    ),
    query: { enabled: queryEnabled && lbpStrategies.length > 0 },
  })

  return useMemo(() => {
    const unavailableFeeTierKeys = new Set<string>()
    // Fail closed: a read error means we can't confirm the pool is free, so surface an error and keep
    // the UI gated rather than defaulting the tier to "available" and re-exposing the launch-time revert.
    let isError = isSlot0Error || isReservedError
    const isLoading = isSlot0Loading || isReservedLoading
    const checkReserved = lbpStrategies.length > 0
    // Compute only once both enabled reads have data; a lone dataset is a transient loading state.
    if (!slot0Data || (checkReserved && !reservedData)) {
      return { unavailableFeeTierKeys, isLoading, isError }
    }
    candidates.forEach((candidate, i) => {
      const slot0 = slot0Data.at(i)
      const sqrtPriceX96 = slot0?.status === 'success' ? slot0.result[0] : undefined
      if (slot0?.status !== 'success') {
        isError = true
      }

      let reservedBy: string[] | undefined
      if (checkReserved) {
        reservedBy = []
        for (let strategyIndex = 0; strategyIndex < lbpStrategies.length; strategyIndex++) {
          const reserved = reservedData?.at(i * lbpStrategies.length + strategyIndex)
          if (reserved?.status === 'success') {
            reservedBy.push(reserved.result)
          } else {
            // Fail closed per strategy: one unreadable generation can be the one holding the
            // reservation, so the tier is not confirmed free even if the others return zero.
            isError = true
          }
        }
      }

      if (isFeeTierPoolUnavailable({ sqrtPriceX96, reservedBy })) {
        const key = getFeeTierKey({ feeTier: candidate.feeAmount, tickSpacing: candidate.tickSpacing })
        if (key) {
          unavailableFeeTierKeys.add(key)
        }
      }
    })
    return { unavailableFeeTierKeys, isLoading, isError }
  }, [
    slot0Data,
    reservedData,
    lbpStrategies,
    isSlot0Loading,
    isReservedLoading,
    isSlot0Error,
    isReservedError,
    candidates,
  ])
}
