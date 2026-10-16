import { type PlainMessage } from '@bufbuild/protobuf'
import { useQuery } from '@tanstack/react-query'
import type { GetTokenMarketsResponse } from '@uniswap/client-data-api/dist/data/v2/api_pb'
import { HistoryDuration } from '@uniswap/client-data-api/dist/data/v2/types_pb'
import { type UniverseChainId } from '@universe/chains'
import { useMemo } from 'react'
import { useTokenDetailsContext } from 'src/components/TokenDetails/TokenDetailsContext'
import { useBalances } from 'uniswap/src/data/apiClients/dataApiService/balances/hooks/useBalances'
import { getGetTokenMarketsQueryOptions } from 'uniswap/src/data/apiClients/dataApiService/tokens/queries'
import { nativeAddressForRest } from 'uniswap/src/features/dataApi/utils/currencyIdToContractInput'
import { getChainGasToken } from 'uniswap/src/features/gas/hooks/useChainGasToken'
import { currencyId as getCurrencyId } from 'uniswap/src/utils/currencyId'

interface HighestTvlChainResult {
  chainId: UniverseChainId | null
  address: string | null
}

interface SortedChainEntry {
  chainId: UniverseChainId
  address: string | null
}

interface MarketTokenEntry {
  chainId: UniverseChainId
  address?: string
}

function selectTvlUsdByChainId(
  data: PlainMessage<GetTokenMarketsResponse> | undefined,
): Record<number, number> | undefined {
  if (!data) {
    return undefined
  }
  const tvlByChainId: Record<number, number> = {}
  for (const market of data.markets) {
    const tvl = market.stats?.totalValueLockedUsd
    if (tvl !== undefined) {
      tvlByChainId[market.chainId] = tvl
    }
  }
  return tvlByChainId
}

export function useTDPHighestTvlChain({ accountAddress }: { accountAddress?: Address }): HighestTvlChainResult {
  const { multichainTokens } = useTokenDetailsContext()

  // Natives carry a null address in the context; GetTokenMarkets indexes them by address.
  const marketTokens = useMemo<MarketTokenEntry[]>(
    () =>
      multichainTokens.map(({ chainId, address }) => ({ chainId, address: address ?? nativeAddressForRest(chainId) })),
    [multichainTokens],
  )

  const { data: tvlUsdByChainId } = useQuery(
    getGetTokenMarketsQueryOptions({
      params: marketTokens.length ? { tokens: marketTokens, duration: HistoryDuration.DAY } : undefined,
      select: selectTvlUsdByChainId,
    }),
  )

  const sortedChains = useMemo<SortedChainEntry[]>(() => {
    if (!tvlUsdByChainId) {
      return []
    }
    const entries: Array<SortedChainEntry & { tvl: number }> = []
    for (const { chainId, address } of multichainTokens) {
      const tvl = tvlUsdByChainId[chainId] ?? 0
      if (tvl <= 0) {
        continue
      }
      entries.push({ chainId, address, tvl })
    }
    entries.sort((a, b) => b.tvl - a.tvl)
    return entries.map(({ chainId, address }) => ({ chainId, address }))
  }, [tvlUsdByChainId, multichainTokens])

  const gasCurrencyIds = useMemo(() => {
    if (!accountAddress) {
      return []
    }
    return sortedChains.map(({ chainId }) => getCurrencyId(getChainGasToken(chainId)))
  }, [accountAddress, sortedChains])

  const gasBalances = useBalances({ evmAddress: accountAddress, currencies: gasCurrencyIds })

  return useMemo(() => {
    if (!sortedChains.length) {
      return { chainId: null, address: null }
    }

    if (!accountAddress || !gasBalances?.length) {
      return sortedChains[0] ?? { chainId: null, address: null }
    }

    const chainsWithGas = new Set<UniverseChainId>()
    for (const balance of gasBalances) {
      if (balance.quantity > 0) {
        chainsWithGas.add(balance.currencyInfo.currency.chainId)
      }
    }
    const chainWithGas = sortedChains.find(({ chainId }) => chainsWithGas.has(chainId))

    return chainWithGas ?? sortedChains[0] ?? { chainId: null, address: null }
  }, [sortedChains, accountAddress, gasBalances])
}
