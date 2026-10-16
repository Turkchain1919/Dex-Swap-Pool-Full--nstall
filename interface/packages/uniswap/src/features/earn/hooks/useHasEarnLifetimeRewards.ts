import { useMemo } from 'react'
import { useEarnLifetimeEarningsUsd } from 'uniswap/src/features/earn/hooks/useEarnLifetimeEarningsUsd'
import { useEarnVaults } from 'uniswap/src/features/earn/hooks/useEarnVaults'
import { hasEarnPosition } from 'uniswap/src/features/earn/utils'

export function useHasEarnLifetimeRewards(walletAddress: string | undefined): boolean {
  const enabled = !!walletAddress

  const { positionsByVaultId, vaults } = useEarnVaults({ account: walletAddress, enabled })
  const vaultsWithActivePosition = useMemo(
    () => vaults.filter((vault) => hasEarnPosition(positionsByVaultId.get(vault.id))),
    [vaults, positionsByVaultId],
  )
  const { lifetimeEarningsUsd } = useEarnLifetimeEarningsUsd({
    walletAddress,
    vaults: vaultsWithActivePosition,
    enabled,
  })

  return enabled && lifetimeEarningsUsd > 0
}
