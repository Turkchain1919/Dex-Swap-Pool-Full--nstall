import { ProtocolVersion } from '@uniswap/client-data-api/dist/data/v1/poolTypes_pb'
import { CurrencyAmount } from '@uniswap/sdk-core'
import { UniverseChainId } from '@universe/chains'
import { DAI, USDC_MAINNET } from 'uniswap/src/constants/tokens'
import { useWalletPositions } from 'uniswap/src/features/positions/hooks/useWalletPositions'
import type { PositionInfo } from 'uniswap/src/features/positions/types'
import { mocked } from '~/test-utils/mocked'

/** Minimal PositionInfo for fee-surface specs (fees panel, Your fees modal). */
export function buildFeePosition(overrides: {
  poolId: string
  tokenId?: string
  uncollectedFeesUsd?: number
  version?: ProtocolVersion
}): PositionInfo {
  const { poolId, tokenId = `${poolId}-1`, uncollectedFeesUsd, version = ProtocolVersion.V3 } = overrides

  return {
    poolId,
    tokenId,
    chainId: UniverseChainId.Mainnet,
    version,
    status: 1,
    currency0Amount: CurrencyAmount.fromRawAmount(USDC_MAINNET, '0'),
    currency1Amount: CurrencyAmount.fromRawAmount(DAI, '0'),
    uncollectedFeesUsd,
  } as unknown as PositionInfo
}

/** Requires the spec to have vi.mock'ed 'uniswap/src/features/positions/hooks/useWalletPositions'. */
export function mockUseWalletPositions(
  positions: PositionInfo[],
  opts: { isLoading?: boolean; hasNextPage?: boolean; isFetchingNextPage?: boolean; error?: Error } = {},
): void {
  mocked(useWalletPositions).mockReturnValue({
    positions,
    hiddenPositions: [],
    allPositions: positions,
    isLoading: opts.isLoading ?? false,
    isFetching: false,
    isFetchingNextPage: opts.isFetchingNextPage ?? false,
    isPlaceholderData: false,
    hasNextPage: opts.hasNextPage ?? false,
    hasData: !opts.isLoading,
    error: opts.error ?? null,
    refetch: vi.fn(),
    fetchNextPage: vi.fn(),
  } as unknown as ReturnType<typeof useWalletPositions>)
}
