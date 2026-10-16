import type { MultichainTokenEntry } from 'uniswap/src/components/MultichainTokenDetails/useOrderedMultichainEntries'
import type { MultiChainMap } from '~/pages/TokenDetails/context/TDPContext'

/** Returns the multichain entry whose chain has the highest user balance (USD), or undefined when no balances exist. */
export function getHighestBalanceChain(
  multiChainMap: MultiChainMap,
  multichainEntries: MultichainTokenEntry[],
): MultichainTokenEntry | undefined {
  if (!multichainEntries.length) {
    return undefined
  }

  let bestEntry: MultichainTokenEntry | undefined
  let bestBalance = 0

  for (const entry of multichainEntries) {
    const balanceUSD = multiChainMap[entry.chainId]?.balance?.balanceUSD
    if (balanceUSD !== undefined && balanceUSD !== null && balanceUSD > bestBalance) {
      bestBalance = balanceUSD
      bestEntry = entry
    }
  }

  return bestEntry
}
