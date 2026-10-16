import { SharedQueryClient } from '@universe/api'
import { getPortfolioQuery } from 'uniswap/src/data/apiClients/dataApiService/balances/getPortfolio'
import { selectActiveAccountAddress } from 'wallet/src/features/wallet/selectors'
import { type WalletState } from 'wallet/src/state/walletReducer'

/**
 * Fetches the active account's portfolio value for backup-reminder gating.
 * getPortfolioQuery has a one-minute stale time, so the five-second trigger poll reads the cache
 * while it is fresh and only performs a network refetch after that minute expires.
 */
export async function getBackupReminderPortfolioValue(state: WalletState): Promise<number> {
  const evmAddress = selectActiveAccountAddress(state)

  if (!evmAddress) {
    return 0
  }

  const queryOptions = getPortfolioQuery({ input: { evmAddress } })
  const portfolioData = await SharedQueryClient.fetchQuery(queryOptions)
  return portfolioData?.portfolio?.totalValueUsd ?? 0
}
